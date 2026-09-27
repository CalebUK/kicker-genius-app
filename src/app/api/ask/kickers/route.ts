import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS, safeErrorCode } from '../../../../lib/db';
import { franchiseSql, kickerNameSql } from '../../../../lib/franchise';

export const dynamic = 'force-dynamic';

/**
 * Ask tab: every kicker with at least 2 games in the database (name lookup for
 * the question box and the kicker dropdowns). One row per kicker: his latest
 * name, team (`team` = today's franchise code, `team_code` = the code used
 * that season, e.g. OAK), the seasons he appears in and his game count.
 */
export async function GET() {
    try {
        const kickers = await query(`
            WITH games AS (
                SELECT * FROM kicker_stats_weekly WHERE fg_att + xp_att > 0
            ),
            latest AS (
                SELECT DISTINCT ON (gsis_id) gsis_id, ${kickerNameSql('name')} AS name, team, season
                FROM games ORDER BY gsis_id, season DESC, week DESC
            ),
            totals AS (
                SELECT gsis_id, COUNT(*) AS games, MIN(season) AS first_season, MAX(season) AS last_season
                FROM games GROUP BY gsis_id
            ),
            spans AS (   -- each team he kicked for, with its seasons (season-accurate codes, e.g. OAK)
                SELECT gsis_id, team, MIN(season) AS s1, MAX(season) AS s2, MIN(season * 100 + week) AS first_game
                FROM games GROUP BY gsis_id, team
            ),
            history AS (
                SELECT gsis_id,
                    STRING_AGG(team, ', ' ORDER BY first_game) AS teams,
                    STRING_AGG(team || ' ' || s1 || CASE WHEN s2 > s1 THEN '–' || s2 ELSE '' END, ' · ' ORDER BY first_game) AS team_history
                FROM spans GROUP BY gsis_id
            )
            SELECT l.gsis_id, l.name, l.team AS team_code, ${franchiseSql('l.team')} AS team,
                hi.teams, hi.team_history,
                t.games, t.first_season, t.last_season, h.headshot_url
            FROM latest l
            JOIN totals t ON t.gsis_id = l.gsis_id
            JOIN history hi ON hi.gsis_id = l.gsis_id
            LEFT JOIN kicker_headshots h ON h.gsis_id = l.gsis_id
            WHERE t.games >= 2
            ORDER BY t.last_season DESC, t.games DESC;
        `);
        return NextResponse.json({ kickers }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/ask/kickers error:', error);
        return NextResponse.json({ error: 'Could not load kickers.', code: safeErrorCode(error) }, { status: 502 });
    }
}
