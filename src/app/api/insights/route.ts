import { NextResponse } from 'next/server';
import { query, Row, CACHE_HEADERS, safeErrorCode } from '../../../lib/db';
import { franchiseSql } from '../../../lib/franchise';

export const dynamic = 'force-dynamic';

/**
 * The worksheet's "Matchup History & News" box, for every kicker on this week's board:
 *   venue -> every kicker-game since 2000 at this game's stadium, in conditions like this
 *            week's (dome, or the forecast's snow/rain/clear + cold/warm + wind), narrowed
 *            only as far as the history still has MIN_VENUE games
 *   own   -> the kicker's own games in those conditions (any stadium) vs his other games
 *   news  -> his latest notes (kicker_notes, scraped from RotoWire), last NEWS_DAYS days
 * Filters use the Ask tab's meanings (weather snow|rain|clear, venue dome|outdoors,
 * wind windy = 15+ mph, temp cold <=40 / freezing <=32 / warm >=70), so each line links
 * to the same games in the Ask tab. Kick buckets come back SUMMED: the browser scores
 * them in the user's league settings.
 */
const MIN_VENUE = 15;   // kicker-games needed for a stadium line
const MIN_OWN = 5;      // his own games needed for his line
const NEWS_DAYS = 21;

const BUCKET_KEYS = ['fg_att', 'fg_made', 'fg_miss', 'xp_att', 'xp_made', 'xp_miss',
    'fg_0_19', 'fg_20_29', 'fg_30_39', 'fg_40_49', 'fg_50_59', 'fg_60_plus',
    'fg_miss_0_19', 'fg_miss_20_29', 'fg_miss_30_39', 'fg_miss_40_49', 'fg_miss_50_59', 'fg_miss_60_plus'] as const;

type Filters = { stadium?: string; venue?: 'dome' | 'outdoors'; weather?: 'snow' | 'rain' | 'clear'; temp?: 'cold' | 'freezing' | 'warm'; wind?: 'windy' };
type Sums = Record<string, number>;

// same keyword rules as the engine's classify_conditions (base_stats.py)
const classify = (desc: string | null): Filters['weather'] | undefined => {
    const t = (desc || '').toLowerCase();
    if (!t) return undefined;
    if (/snow|flurr|sleet|blizzard/.test(t)) return 'snow';
    if (/rain|shower|drizzle|storm|thunder/.test(t)) return 'rain';
    return 'clear';
};

const tempBand = (t: number | null): Filters['temp'] | undefined =>
    t == null ? undefined : t <= 32 ? 'freezing' : t <= 40 ? 'cold' : t >= 70 ? 'warm' : undefined;

// does a past kicker-game match? (Ask-tab semantics: no data = no match)
const matches = (g: Row, f: Filters) => {
    if (f.stadium && g.stadium !== f.stadium) return false;
    if (f.venue === 'dome' && !g.is_dome) return false;
    if (f.venue === 'outdoors' && g.is_dome) return false;
    if (f.weather && (g.is_dome || g.game_conditions !== f.weather)) return false;
    if (f.wind === 'windy' && (g.is_dome || g.wind == null || Number(g.wind) < 15)) return false;
    if (f.temp) {
        const t = g.game_temp == null ? null : Number(g.game_temp);
        if (t == null || g.is_dome) return false;
        if (f.temp === 'cold' && t > 40) return false;
        if (f.temp === 'freezing' && t > 32) return false;
        if (f.temp === 'warm' && t < 70) return false;
    }
    return true;
};

const sum = (games: Row[]) => {
    const s: Sums = { n: games.length };
    for (const k of BUCKET_KEYS) s[k] = games.reduce((a, g) => a + (Number(g[k]) || 0), 0);
    return s;
};

// most specific first; drop wind, then temperature, then weather until there's enough history
const tiers = (base: Filters, cond: Filters): Filters[] => {
    const out: Filters[] = [];
    const push = (f: Filters) => { if (!out.some((o) => JSON.stringify(o) === JSON.stringify(f))) out.push(f); };
    push({ ...base, ...cond });
    push({ ...base, ...cond, wind: undefined });
    push({ ...base, ...cond, wind: undefined, temp: undefined });
    push({ ...base, venue: cond.venue === 'dome' ? 'dome' : undefined });
    return out.map((f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Filters);
};

export async function GET() {
    try {
        const [site] = await query<{ season: number; week: number }>('SELECT season, week FROM site_meta LIMIT 1;');
        if (!site) throw new Error('site_meta is empty');
        const { season, week } = site;

        const [games, kickers, history, news] = await Promise.all([
            // this week's games; retractable roofs are blank until game day -> the stadium's last known roof
            query(`SELECT g.home_team, g.away_team, COALESCE(NULLIF(g.roof, ''), r.roof) AS roof,
                          g.weather_desc, COALESCE(g.game_temp, g.forecast_temp) AS temp, g.wind
                   FROM game_metadata g
                   LEFT JOIN LATERAL (SELECT roof FROM game_metadata h WHERE h.home_team = g.home_team AND NULLIF(h.roof, '') IS NOT NULL
                                      ORDER BY h.season DESC, h.week DESC LIMIT 1) r ON TRUE
                   WHERE g.season = $1 AND g.week = $2;`, [season, week]),
            query('SELECT gsis_id, kicker_name, team FROM matchup_inputs_weekly WHERE season = $1 AND week = $2;', [season, week]),
            // every played kicker-game before this week
            query(`SELECT k.gsis_id, k.fg_att, k.fg_made, k.fg_miss, k.xp_att, k.xp_made, k.xp_miss,
                          k.fg_make_0_19 AS fg_0_19, k.fg_make_20_29 AS fg_20_29, k.fg_make_30_39 AS fg_30_39,
                          k.fg_make_40_49 AS fg_40_49, k.fg_make_50_59 AS fg_50_59, k.fg_make_60_plus AS fg_60_plus,
                          k.fg_miss_0_19, k.fg_miss_20_29, k.fg_miss_30_39, k.fg_miss_40_49, k.fg_miss_50_59, k.fg_miss_60_plus,
                          ${franchiseSql('g.home_team')} AS stadium,
                          (LOWER(COALESCE(g.roof, '')) IN ('dome', 'closed')) AS is_dome,
                          g.game_conditions, g.game_temp, g.wind
                   FROM kicker_stats_weekly k
                   JOIN game_metadata g ON g.season = k.season AND g.week = k.week AND k.team IN (g.home_team, g.away_team)
                   WHERE k.fg_att + k.xp_att > 0 AND (k.season < $1 OR (k.season = $1 AND k.week < $2));`, [season, week]),
            query(`SELECT kicker_name, headline, body, post_date FROM kicker_notes
                   WHERE post_date >= CURRENT_DATE - ${NEWS_DAYS} ORDER BY post_date DESC, id DESC;`).catch(() => []),
        ]);

        const byKicker = new Map<string, Row[]>();
        for (const g of history) {
            const id = String(g.gsis_id);
            if (!byKicker.has(id)) byKicker.set(id, []);
            byKicker.get(id)!.push(g);
        }

        const insights: Record<string, unknown> = {};
        for (const k of kickers) {
            const game = games.find((g) => g.home_team === k.team || g.away_team === k.team);
            const notes = news.filter((n) => n.kicker_name === k.kicker_name).slice(0, 3);
            if (!game) { insights[String(k.gsis_id)] = { news: notes }; continue; }

            const isDome = ['dome', 'closed'].includes(String(game.roof || '').toLowerCase());
            const weather = isDome ? undefined : classify(game.weather_desc as string | null);
            const cond: Filters = isDome ? { venue: 'dome' } : {
                weather,
                venue: weather ? undefined : 'outdoors',   // no forecast yet -> just "outdoors"
                temp: tempBand(game.temp == null ? null : Number(game.temp)),
                wind: game.wind != null && Number(game.wind) >= 15 ? 'windy' : undefined,
            };
            const stadium = String(game.home_team);   // this week's codes are today's (history is mapped to match)

            let venue = null;
            for (const f of tiers({ stadium }, cond)) {
                const m = history.filter((g) => matches(g, f));
                if (m.length >= MIN_VENUE || !f.venue && !f.weather && !f.temp && !f.wind) {
                    venue = { filters: f, sums: sum(m) };
                    break;
                }
            }

            let own = null;
            const mine = byKicker.get(String(k.gsis_id)) || [];
            for (const f of tiers({}, cond)) {
                if (!Object.keys(f).length) break;   // no conditions left: nothing to compare
                const m = mine.filter((g) => matches(g, f));
                if (m.length >= MIN_OWN) {
                    own = { filters: f, sums: sum(m), others: sum(mine.filter((g) => !matches(g, f))) };
                    break;
                }
            }
            insights[String(k.gsis_id)] = { venue, own, news: notes };
        }

        return NextResponse.json({ season, week, all: sum(history), insights }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/insights error:', error);
        return NextResponse.json({ error: 'Could not load the matchup insights.', code: safeErrorCode(error) }, { status: 502 });
    }
}
