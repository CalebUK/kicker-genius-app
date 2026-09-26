import { NextResponse } from 'next/server';
import { query, Row, CACHE_HEADERS } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// Kickers with these statuses aren't going to kick -> hidden from the Week Model
// (they still appear in `injuries` for the Injury Report tab). WEBSITE_SPEC.md §4.
const HIDDEN_STATUSES = new Set(['IR', 'Practice Squad', 'Inactive']);

/**
 * Week Model payload, read from the cloud DB (the NAS pushes it there):
 *   rankings/injuries -> this week's projection ingredients (matchup_inputs_weekly)
 *   history           -> the season's locked weekly snapshots + actuals
 *                        (projection_results_weekly), for trends + the Accuracy tab
 *   meta              -> week, last update, league averages, model_settings
 * The browser applies the user's scoring and finishes the 50/30/20 (MODEL_SPEC.md).
 */
export async function GET() {
    try {
        const [site] = await query<{ pushed_at: Date; season: number; week: number }>(
            'SELECT pushed_at, season, week FROM site_meta LIMIT 1;');
        if (!site) throw new Error('site_meta is empty (no cloud push yet)');
        const { season, week } = site;

        const [rows, settingsRows, history] = await Promise.all([
            query('SELECT * FROM matchup_inputs_weekly WHERE season = $1 AND week = $2 ORDER BY kicker_name;', [season, week]),
            query<{ key: string; value: number }>('SELECT key, value FROM model_settings;'),
            query('SELECT * FROM projection_results_weekly WHERE season = $1 ORDER BY week, kicker_name;', [season]),
        ]);

        const leagueAvgs = (sfx: string) => {
            const r0: Row | undefined = rows[0];
            if (!r0) return {};
            return {
                off_stall: r0[`lg_off_stall_${sfx}`],
                def_stall: r0[`lg_def_stall_${sfx}`],
                pts: r0[`lg_pts_${sfx}`],
                share: r0[`lg_share_${sfx}`],
            };
        };

        return NextResponse.json({
            season,
            week,
            meta: {
                week,
                updated: `${site.pushed_at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
                league_avgs_l3: leagueAvgs('l3'),
                league_avgs_l5: leagueAvgs('l5'),
                model_settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
            },
            rankings: rows.filter((r) => !HIDDEN_STATUSES.has(r.injury_status as string)),
            injuries: rows.filter((r) => r.injury_status),
            history,
        }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/dashboard error:', error);
        return NextResponse.json({ error: 'Could not load the kicker data.' }, { status: 502 });
    }
}
