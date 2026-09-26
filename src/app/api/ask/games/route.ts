import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS, safeErrorCode } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * Ask tab: one kicker's full game log with each game's context -- opponent,
 * home/away, roof, and the ACTUAL game-day conditions (game_conditions:
 * dome / snow / rain / clear, game_temp, wind) stored by the engine's
 * sync_game_conditions. Kick buckets use the same names as everywhere else
 * (fg_0_19 ...) so the browser scores them with the user's settings and does
 * all the filtering/splitting itself.
 */
export async function GET(request: Request) {
    const gsisId = new URL(request.url).searchParams.get('gsis_id') || '';
    if (!/^[A-Za-z0-9-]{4,20}$/.test(gsisId)) {
        return NextResponse.json({ error: 'Invalid kicker id' }, { status: 400 });
    }

    try {
        const games = await query(`
            WITH sides AS (
                SELECT game_id, season, week, home_team AS team, away_team AS opponent, TRUE AS is_home FROM game_metadata
                UNION ALL
                SELECT game_id, season, week, away_team, home_team, FALSE FROM game_metadata
            )
            SELECT
                k.season, k.week, k.team, s.opponent, s.is_home, g.gameday,
                g.roof, (LOWER(COALESCE(g.roof, '')) IN ('dome', 'closed')) AS is_dome,
                g.game_conditions, g.game_temp, g.wind,
                k.fg_att, k.fg_made, k.fg_miss, k.xp_att, k.xp_made, k.xp_miss,
                k.fg_make_0_19 AS fg_0_19,   k.fg_make_20_29 AS fg_20_29, k.fg_make_30_39 AS fg_30_39,
                k.fg_make_40_49 AS fg_40_49, k.fg_make_50_59 AS fg_50_59, k.fg_make_60_plus AS fg_60_plus,
                k.fg_miss_0_19, k.fg_miss_20_29, k.fg_miss_30_39,
                k.fg_miss_40_49, k.fg_miss_50_59, k.fg_miss_60_plus
            FROM kicker_stats_weekly k
            LEFT JOIN sides s ON s.season = k.season AND s.week = k.week AND s.team = k.team
            LEFT JOIN game_metadata g ON g.game_id = s.game_id
            WHERE k.gsis_id = $1 AND k.fg_att + k.xp_att > 0
            ORDER BY k.season DESC, k.week DESC;
        `, [gsisId]);
        return NextResponse.json({ games }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/ask/games error:', error);
        return NextResponse.json({ error: 'Could not load games.', code: safeErrorCode(error) }, { status: 502 });
    }
}
