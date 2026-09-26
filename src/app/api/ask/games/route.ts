import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS, safeErrorCode } from '../../../../lib/db';
import { franchiseSql, TEAM_CODES } from '../../../../lib/franchise';

export const dynamic = 'force-dynamic';

/**
 * Ask tab game log, one row per game with its context -- opponent, home/away,
 * roof, and the ACTUAL game-day conditions (game_conditions: dome / snow /
 * rain / clear, game_temp, wind) stored by the engine's sync_game_conditions.
 *   ?gsis_id=...  one kicker's games
 *   ?team=TEN     every game ANY of that franchise's kickers kicked in (kicks
 *                 summed per game; `kickers` lists who kicked)
 * Team codes come back as TODAY's franchise code (OAK -> LV, SD -> LAC,
 * STL -> LA); `team_code` / `opponent_code` keep the code used that season.
 * Kick buckets use the usual names (fg_0_19 ...) so the browser scores them
 * with the user's settings and does all the filtering itself.
 */
export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const gsisId = params.get('gsis_id');
    const team = params.get('team');

    let where: string;
    let value: string;
    if (gsisId && /^[A-Za-z0-9-]{4,20}$/.test(gsisId)) {
        where = 'k.gsis_id = $1';
        value = gsisId;
    } else if (team && TEAM_CODES.has(team)) {
        where = `${franchiseSql('k.team')} = $1`;
        value = team;
    } else {
        return NextResponse.json({ error: 'Pass a valid gsis_id or team' }, { status: 400 });
    }

    try {
        const games = await query(`
            WITH sides AS (
                SELECT game_id, season, week, home_team AS team, away_team AS opponent, TRUE AS is_home FROM game_metadata
                UNION ALL
                SELECT game_id, season, week, away_team, home_team, FALSE FROM game_metadata
            ),
            kicks AS (   -- one row per team-game (a kicker's games, or all of a team's kickers summed)
                SELECT k.season, k.week, k.team,
                    STRING_AGG(DISTINCT k.name, ', ') AS kickers,
                    SUM(k.fg_att) AS fg_att, SUM(k.fg_made) AS fg_made, SUM(k.fg_miss) AS fg_miss,
                    SUM(k.xp_att) AS xp_att, SUM(k.xp_made) AS xp_made, SUM(k.xp_miss) AS xp_miss,
                    SUM(k.fg_make_0_19) AS fg_0_19,   SUM(k.fg_make_20_29) AS fg_20_29, SUM(k.fg_make_30_39) AS fg_30_39,
                    SUM(k.fg_make_40_49) AS fg_40_49, SUM(k.fg_make_50_59) AS fg_50_59, SUM(k.fg_make_60_plus) AS fg_60_plus,
                    SUM(k.fg_miss_0_19) AS fg_miss_0_19,   SUM(k.fg_miss_20_29) AS fg_miss_20_29, SUM(k.fg_miss_30_39) AS fg_miss_30_39,
                    SUM(k.fg_miss_40_49) AS fg_miss_40_49, SUM(k.fg_miss_50_59) AS fg_miss_50_59, SUM(k.fg_miss_60_plus) AS fg_miss_60_plus
                FROM kicker_stats_weekly k
                WHERE ${where} AND k.fg_att + k.xp_att > 0
                GROUP BY k.season, k.week, k.team
            )
            SELECT
                c.season, c.week, ${franchiseSql('c.team')} AS team, c.team AS team_code,
                ${franchiseSql('s.opponent')} AS opponent, s.opponent AS opponent_code,
                s.is_home, g.gameday, g.roof, (LOWER(COALESCE(g.roof, '')) IN ('dome', 'closed')) AS is_dome,
                g.game_conditions, g.game_temp, g.wind, c.kickers,
                c.fg_att, c.fg_made, c.fg_miss, c.xp_att, c.xp_made, c.xp_miss,
                c.fg_0_19, c.fg_20_29, c.fg_30_39, c.fg_40_49, c.fg_50_59, c.fg_60_plus,
                c.fg_miss_0_19, c.fg_miss_20_29, c.fg_miss_30_39, c.fg_miss_40_49, c.fg_miss_50_59, c.fg_miss_60_plus
            FROM kicks c
            LEFT JOIN sides s ON s.season = c.season AND s.week = c.week AND s.team = c.team
            LEFT JOIN game_metadata g ON g.game_id = s.game_id
            ORDER BY c.season DESC, c.week DESC;
        `, [value]);
        return NextResponse.json({ games }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/ask/games error:', error);
        return NextResponse.json({ error: 'Could not load games.', code: safeErrorCode(error) }, { status: 502 });
    }
}
