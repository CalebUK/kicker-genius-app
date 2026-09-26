import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS, safeErrorCode } from '../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * Historical YTD tab: one row per kicker, season totals (WEBSITE_SPEC.md §3),
 * from the raw tables in the cloud DB. Kick buckets are returned raw -- the
 * browser scores them with the user's settings. Team columns are averaged
 * over the games HE kicked in (so a mid-season move is handled).
 *   dome_pct            -> % of his games in a dome / closed roof
 *   rz_trips            -> his team's drives reaching FG range, in his games
 *   off_stall_rate_ytd  -> his team's offensive stall rate, in his games
 *   def_stall_rate_ytd  -> strength of schedule: each opponent's SEASON-LONG
 *                          defensive stall rate (all their games), averaged over
 *                          his games. Not the opponent's rate in the game vs him:
 *                          per game that's the same drives as his offense's rate,
 *                          so it would just copy the offense column.
 * ?season= defaults to the season the site is showing.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get('season');
    const season = requested ? parseInt(requested, 10) : null;
    if (requested && (!Number.isInteger(season) || season! < 2000 || season! > 2100)) {
        return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
    }

    try {
        const ytd = await query(`
            WITH s AS (
                SELECT COALESCE($1::int, (SELECT season FROM site_meta LIMIT 1)) AS season
            ),
            k AS (
                SELECT k.* FROM kicker_stats_weekly k, s
                WHERE k.season = s.season AND k.fg_att + k.xp_att > 0
            ),
            games AS (
                SELECT g.season, g.week, g.home_team AS team, g.away_team AS opponent, g.roof
                FROM game_metadata g, s WHERE g.season = s.season
                UNION ALL
                SELECT g.season, g.week, g.away_team, g.home_team, g.roof
                FROM game_metadata g, s WHERE g.season = s.season
            ),
            opp_season AS (   -- every defense's season-long stall rate (all its games)
                SELECT ts.team, AVG(ts.def_stall_rate) AS def_stall_season
                FROM team_stats_weekly ts, s WHERE ts.season = s.season
                GROUP BY ts.team
            ),
            latest AS (   -- his current team = the team of his most recent game
                SELECT DISTINCT ON (gsis_id) gsis_id, name, team FROM k ORDER BY gsis_id, week DESC
            )
            SELECT
                l.gsis_id, l.name AS kicker_player_name, l.name AS join_name, l.team,
                (SELECT season FROM s) AS season,
                COUNT(*) AS games,
                SUM(k.fg_att) AS fg_att, SUM(k.fg_made) AS fg_made, SUM(k.fg_miss) AS fg_miss,
                SUM(k.xp_att) AS xp_att, SUM(k.xp_made) AS xp_made, SUM(k.xp_miss) AS xp_miss,
                SUM(k.fg_make_0_19) AS fg_0_19,   SUM(k.fg_make_20_29) AS fg_20_29, SUM(k.fg_make_30_39) AS fg_30_39,
                SUM(k.fg_make_40_49) AS fg_40_49, SUM(k.fg_make_50_59) AS fg_50_59, SUM(k.fg_make_60_plus) AS fg_60_plus,
                SUM(k.fg_miss_0_19) AS fg_miss_0_19,   SUM(k.fg_miss_20_29) AS fg_miss_20_29, SUM(k.fg_miss_30_39) AS fg_miss_30_39,
                SUM(k.fg_miss_40_49) AS fg_miss_40_49, SUM(k.fg_miss_50_59) AS fg_miss_50_59, SUM(k.fg_miss_60_plus) AS fg_miss_60_plus,
                ROUND(100.0 * AVG(CASE WHEN LOWER(COALESCE(g.roof, '')) IN ('dome', 'closed') THEN 1 ELSE 0 END), 0) AS dome_pct,
                COALESCE(SUM(ts.off_rz_trips), 0)       AS rz_trips,
                ROUND(AVG(ts.off_stall_rate)::numeric, 1)  AS off_stall_rate_ytd,
                ROUND(AVG(os.def_stall_season)::numeric, 1) AS def_stall_rate_ytd,
                MAX(h.headshot_url)                     AS headshot_url
            FROM k
            JOIN latest l ON l.gsis_id = k.gsis_id
            LEFT JOIN games g ON g.season = k.season AND g.week = k.week AND g.team = k.team
            LEFT JOIN team_stats_weekly ts  ON ts.season = k.season  AND ts.week = k.week  AND ts.team = k.team
            LEFT JOIN opp_season os ON os.team = g.opponent
            LEFT JOIN kicker_headshots h ON h.gsis_id = l.gsis_id
            GROUP BY l.gsis_id, l.name, l.team
            ORDER BY l.name;
        `, [season]);
        return NextResponse.json({ ytd }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/ytd error:', error);
        return NextResponse.json({ error: 'Could not load season totals.', code: safeErrorCode(error) }, { status: 502 });
    }
}
