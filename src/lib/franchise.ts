/**
 * Relocated / renamed franchise codes -> today's code, as a SQL expression.
 * Raw data keeps the code a team used that season (OAK 2019, LV 2020); the
 * Ask tab compares by franchise, so "Raiders" covers both. JAC / LAR cover
 * spellings some older sources use.
 */
export const FRANCHISE_CODES: Record<string, string> = {
    OAK: 'LV',
    SD: 'LAC',
    STL: 'LA',
    LAR: 'LA',
    JAC: 'JAX',
};

export const TEAM_CODES = new Set([
    'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
    'LV', 'LAC', 'LA', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS',
]);

/** Kicker names as "F.Last": 2001-2003 play-by-play has "S. Janikowski" (space). */
export function kickerNameSql(column: string): string {
    return `REGEXP_REPLACE(${column}, '\\.\\s+', '.')`;
}

/** `franchiseSql('k.team')` -> CASE k.team WHEN 'OAK' THEN 'LV' ... ELSE k.team END */
export function franchiseSql(column: string): string {
    const whens = Object.entries(FRANCHISE_CODES).map(([from, to]) => `WHEN '${from}' THEN '${to}'`).join(' ');
    return `(CASE ${column} ${whens} ELSE ${column} END)`;
}
