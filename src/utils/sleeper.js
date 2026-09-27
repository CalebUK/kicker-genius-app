// Sleeper API helpers for saved leagues (public API, called from the browser;
// no key needed). A saved league = its scoring + who rosters which kicker.
import { DEFAULT_SCORING } from '../data/constants';

const API = 'https://api.sleeper.app/v1';

const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sleeper said ${res.status}`);
  return res.json();
};

// localStorage can be missing or blocked (private windows) -- never let it break the page
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

// Sleeper scoring_settings -> our scoring keys
export const scoringFromSleeper = (s) => {
  if (!s) return { ...DEFAULT_SCORING };
  const genMiss = s.fgmiss || 0;
  const generic50Plus = s.fgm_50p || 5;
  const genericMiss50Plus = s.fgmiss_50_plus !== undefined ? s.fgmiss_50_plus : genMiss;
  return {
    fg0_19: s.fgm_0_19 || 3, fg20_29: s.fgm_20_29 || 3, fg30_39: s.fgm_30_39 || 3, fg40_49: s.fgm_40_49 || 4,
    fg50_59: s.fgm_50_59 !== undefined ? s.fgm_50_59 : generic50Plus,
    fg60_plus: s.fgm_60_plus !== undefined ? s.fgm_60_plus : (s.fgm_60p !== undefined ? s.fgm_60p : generic50Plus),
    xp_made: s.xpm || 1, xp_miss: s.xpmiss || 0,
    fg_miss_0_19: s.fgmiss_0_19 !== undefined ? s.fgmiss_0_19 : genMiss,
    fg_miss_20_29: s.fgmiss_20_29 !== undefined ? s.fgmiss_20_29 : genMiss,
    fg_miss_30_39: s.fgmiss_30_39 !== undefined ? s.fgmiss_30_39 : genMiss,
    fg_miss_40_49: s.fgmiss_40_49 !== undefined ? s.fgmiss_40_49 : genMiss,
    fg_miss_50_59: s.fgmiss_50_59 !== undefined ? s.fgmiss_50_59 : genericMiss50Plus,
    fg_miss_60_plus: s.fgmiss_60_plus !== undefined ? s.fgmiss_60_plus : (s.fgmiss_60p !== undefined ? s.fgmiss_60p : genericMiss50Plus),
    fg_miss: genMiss,
  };
};

// Sleeper username -> { user_id, username, display_name }, or null when there's no such user
export const findSleeperUser = async (username) => {
  const name = username.trim();
  if (!name) return null;
  return getJson(`${API}/user/${encodeURIComponent(name)}`);
};

// a user's NFL leagues for a season: [{ league_id, name, total_rosters, status, scoring_settings }]
export const fetchUserLeagues = async (userId, season) =>
  (await getJson(`${API}/user/${userId}/leagues/nfl/${season}`)) || [];

// Sleeper player id -> our "F.Last" kicker name. The full player list is ~5 MB, so only
// the kickers are kept, cached in the browser for a day.
const KICKER_CACHE = 'kg_sleeper_kickers';
export const fetchKickerNames = async () => {
  const cached = store.get(KICKER_CACHE, null);
  if (cached && Date.now() - cached.fetchedAt < 24 * 3600 * 1000) return cached.map;
  const players = await getJson(`${API}/players/nfl`);
  const map = {};
  for (const [id, p] of Object.entries(players)) {
    if (p?.position === 'K' && p.first_name && p.last_name) map[id] = `${p.first_name.charAt(0)}.${p.last_name}`;
  }
  store.set(KICKER_CACHE, { fetchedAt: Date.now(), map });
  return map;
};

/**
 * Fetch everything a saved league needs. `me` = { userId?, username? } to find
 * "my" roster (user id is exact; a username falls back to matching display names).
 * `league` = an already-fetched league object (skips one request), optional.
 */
export const syncLeague = async (leagueId, me = {}, league = null) => {
  const [info, rosters, kickerNames] = await Promise.all([
    league ? Promise.resolve(league) : getJson(`${API}/league/${leagueId}`),
    getJson(`${API}/league/${leagueId}/rosters`),
    fetchKickerNames(),
  ]);
  if (!info || !Array.isArray(rosters)) throw new Error('League not found (check the ID)');

  let userId = me.userId || null;
  if (!userId && me.username) {
    const users = await getJson(`${API}/league/${leagueId}/users`);
    const want = me.username.trim().toLowerCase();
    userId = (users || []).find((u) => (u.display_name || '').toLowerCase() === want || (u.username || '').toLowerCase() === want)?.user_id || null;
  }

  const myKickers = [], takenKickers = [], idMap = {};
  for (const roster of rosters) {
    const mine = userId && (roster.owner_id === userId || (roster.co_owners || []).includes(userId));
    for (const pid of roster.players || []) {
      const name = kickerNames[pid];
      if (!name) continue;
      idMap[name] = pid;
      (mine ? myKickers : takenKickers).push(name);
    }
  }
  return {
    id: String(leagueId),
    name: info.name || 'Unnamed league',
    season: info.season,
    teams: info.total_rosters || rosters.length,
    userId,
    username: me.username || '',
    scoring: scoringFromSleeper(info.scoring_settings),
    myKickers, takenKickers, idMap,
    syncedAt: Date.now(),
  };
};
