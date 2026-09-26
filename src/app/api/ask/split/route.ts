import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS, safeErrorCode } from '../../../../lib/db';
import { franchiseSql, kickerNameSql, TEAM_CODES } from '../../../../lib/franchise';

export const dynamic = 'force-dynamic';

/**
 * Ask tab, ALL KICKERS mode (league-wide scenarios: "kickers in the snow in
 * Buffalo", "all kickers at the Broncos' stadium"). There are ~14k kicker-games
 * since 2000 -- too many for the browser -- so the filtering and SUMMING happen
 * here. Kick buckets come back as sums (fg_0_19, xp_made, ...) so the browser
 * can still score them with the user's league settings (fantasy points are a
 * sum over kicks, so summed buckets score the same as game-by-game).
 *
 * Filters (all optional, same meaning as the single-kicker mode):
 *   opponent, stadium (team codes) · venue dome|outdoors · weather snow|rain|clear
 *   wind windy · temp cold|freezing|warm · homeAway home|away · from, to (seasons)
 * Returns:
 *   matched / others -> { n, ...bucket sums }   ("others" = games that could
 *                       have matched but didn't; no-data games left out)
 *   kickers          -> per-kicker sums within the matched games (leaderboard)
 *   games            -> the 50 most recent matched games
 */
const BUCKETS = `
    COUNT(*)::int AS n,
    SUM(fg_att)::int AS fg_att, SUM(fg_made)::int AS fg_made, SUM(fg_miss)::int AS fg_miss,
    SUM(xp_att)::int AS xp_att, SUM(xp_made)::int AS xp_made, SUM(xp_miss)::int AS xp_miss,
    SUM(fg_make_0_19)::int AS fg_0_19, SUM(fg_make_20_29)::int AS fg_20_29, SUM(fg_make_30_39)::int AS fg_30_39,
    SUM(fg_make_40_49)::int AS fg_40_49, SUM(fg_make_50_59)::int AS fg_50_59, SUM(fg_make_60_plus)::int AS fg_60_plus,
    SUM(fg_miss_0_19)::int AS fg_miss_0_19, SUM(fg_miss_20_29)::int AS fg_miss_20_29, SUM(fg_miss_30_39)::int AS fg_miss_30_39,
    SUM(fg_miss_40_49)::int AS fg_miss_40_49, SUM(fg_miss_50_59)::int AS fg_miss_50_59, SUM(fg_miss_60_plus)::int AS fg_miss_60_plus`;

export async function GET(request: Request) {
    const p = new URL(request.url).searchParams;
    const params: unknown[] = [];
    const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
    const match: string[] = [];
    const comparable: string[] = [];

    const team = (key: string) => {
        const v = p.get(key);
        if (!v) return null;
        if (!TEAM_CODES.has(v)) throw new Error(`bad ${key}`);
        return v;
    };
    const oneOf = (key: string, allowed: string[]) => {
        const v = p.get(key);
        if (!v) return null;
        if (!allowed.includes(v)) throw new Error(`bad ${key}`);
        return v;
    };
    const season = (key: string) => {
        const v = p.get(key);
        if (!v) return null;
        const n = parseInt(v, 10);
        if (!Number.isInteger(n) || n < 1999 || n > 2100) throw new Error(`bad ${key}`);
        return n;
    };

    try {
        const opponent = team('opponent');
        if (opponent) match.push(`opp = ${add(opponent)}`);
        const stadium = team('stadium');
        if (stadium) match.push(`stadium = ${add(stadium)}`);
        const venue = oneOf('venue', ['dome', 'outdoors']);
        if (venue) match.push(venue === 'dome' ? 'is_dome' : 'NOT is_dome');
        const weather = oneOf('weather', ['snow', 'rain', 'clear']);
        if (weather) { match.push(`game_conditions = ${add(weather)}`); comparable.push('game_conditions IS NOT NULL'); }
        if (oneOf('wind', ['windy'])) { match.push('(NOT is_dome AND wind >= 15)'); comparable.push('(is_dome OR wind IS NOT NULL)'); }
        const temp = oneOf('temp', ['cold', 'freezing', 'warm']);
        if (temp) {
            match.push(temp === 'cold' ? 'game_temp <= 40' : temp === 'freezing' ? 'game_temp <= 32' : 'game_temp >= 70');
            comparable.push('(is_dome OR game_temp IS NOT NULL)');
        }
        const homeAway = oneOf('homeAway', ['home', 'away']);
        if (homeAway) match.push(homeAway === 'home' ? 'is_home' : 'NOT is_home');
        const from = season('from');
        if (from) match.push(`season >= ${add(from)}`);
        const to = season('to');
        if (to) match.push(`season <= ${add(to)}`);
    } catch (e) {
        return NextResponse.json({ error: String((e as Error).message) }, { status: 400 });
    }

    const matchSql = match.length ? `COALESCE(${match.join(' AND ')}, FALSE)` : 'TRUE';
    const comparableSql = comparable.length ? comparable.join(' AND ') : 'TRUE';
    const base = `
        WITH sides AS (
            SELECT game_id, season, week, home_team AS team, away_team AS opponent, TRUE AS is_home FROM game_metadata
            UNION ALL
            SELECT game_id, season, week, away_team, home_team, FALSE FROM game_metadata
        ),
        games AS (
            SELECT k.*, ${kickerNameSql('k.name')} AS kname, ${franchiseSql('k.team')} AS fteam, ${franchiseSql('s.opponent')} AS opp,
                s.is_home, ${franchiseSql('CASE WHEN s.is_home THEN k.team ELSE s.opponent END')} AS stadium,
                (LOWER(COALESCE(g.roof, '')) IN ('dome', 'closed')) AS is_dome,
                g.game_conditions, g.game_temp, g.wind
            FROM kicker_stats_weekly k
            JOIN sides s ON s.season = k.season AND s.week = k.week AND s.team = k.team
            LEFT JOIN game_metadata g ON g.game_id = s.game_id
            WHERE k.fg_att + k.xp_att > 0
        ),
        flagged AS (
            SELECT games.*, ${matchSql} AS matched, (${comparableSql}) AS comparable FROM games
        )`;

    try {
        const [sides, kickers, games] = await Promise.all([
            query(`${base} SELECT matched, ${BUCKETS} FROM flagged WHERE matched OR comparable GROUP BY matched;`, params),
            query(`${base}
                SELECT gsis_id, (ARRAY_AGG(kname ORDER BY season DESC, week DESC))[1] AS name,
                    (ARRAY_AGG(fteam ORDER BY season DESC, week DESC))[1] AS team,
                    MIN(season) AS first_season, MAX(season) AS last_season, ${BUCKETS}
                FROM flagged WHERE matched GROUP BY gsis_id;`, params),
            query(`${base}
                SELECT season, week, kname AS kicker, fteam AS team, opp AS opponent, is_home, is_dome,
                    game_conditions, game_temp, wind, fg_att, fg_made, xp_att, xp_made, xp_miss, fg_miss,
                    fg_make_0_19 AS fg_0_19, fg_make_20_29 AS fg_20_29, fg_make_30_39 AS fg_30_39,
                    fg_make_40_49 AS fg_40_49, fg_make_50_59 AS fg_50_59, fg_make_60_plus AS fg_60_plus,
                    fg_miss_0_19, fg_miss_20_29, fg_miss_30_39, fg_miss_40_49, fg_miss_50_59, fg_miss_60_plus
                FROM flagged WHERE matched ORDER BY season DESC, week DESC LIMIT 50;`, params),
        ]);
        const pick = (m: boolean) => sides.find((r) => r.matched === m) || { n: 0 };
        return NextResponse.json({ matched: pick(true), others: pick(false), kickers, games }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/ask/split error:', error);
        return NextResponse.json({ error: 'Could not load games.', code: safeErrorCode(error) }, { status: 502 });
    }
}
