import { NextResponse } from 'next/server';
import { query, CACHE_HEADERS } from '../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * A season's locked weekly projection snapshots + actuals (projection_results_weekly),
 * read from the cloud DB. The Accuracy tab loads past seasons from here on demand
 * (the current season comes with /api/dashboard).
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get('season') || '', 10);
    if (!Number.isInteger(season) || season < 2000 || season > 2100) {
        return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
    }

    try {
        const data = await query(
            'SELECT * FROM projection_results_weekly WHERE season = $1 ORDER BY week, kicker_name;', [season]);
        return NextResponse.json({ season, data }, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('API /api/projections error:', error);
        return NextResponse.json({ error: 'Could not load projections.' }, { status: 502 });
    }
}
