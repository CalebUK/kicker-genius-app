import { Pool, types } from 'pg';

/**
 * Read-only connection to the cloud database (Neon). Server-side only: used by
 * the route handlers in src/app/api, never shipped to the browser.
 *
 * NEON_READONLY_URL = the kg_reader login (SELECT-only, 10s statement timeout,
 * see nas_engine/kickerapi/databse/neon_setup_1_reader_role.sql). The NAS pushes
 * the data there after every engine run; the website never talks to the NAS.
 */

// Same value shapes the website got from the old NAS API: numeric / bigint as JS
// numbers, DATE as a plain 'YYYY-MM-DD' string (not a JS Date).
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));
types.setTypeParser(types.builtins.DATE, (v) => v);

let pool: Pool | null = null;

function getPool(): Pool {
    const connectionString = process.env.NEON_READONLY_URL;
    if (!connectionString) throw new Error('NEON_READONLY_URL is not set');
    if (!pool) pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10_000 });
    return pool;
}

export type Row = Record<string, unknown>;

/** Parameterised query ($1, $2, ...) -> rows. */
export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
    const res = await getPool().query(text, params);
    return res.rows as T[];
}

// Data changes at most every few hours (each NAS push), so let Vercel's CDN serve
// cached responses: fast pages, and far fewer wake-ups of the free-tier database.
export const CACHE_HEADERS = { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' };
