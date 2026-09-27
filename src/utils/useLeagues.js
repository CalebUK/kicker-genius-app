// Saved Sleeper leagues, kept in this browser (no accounts): each league has its
// own scoring + rosters, and one is ACTIVE (or none = "Custom scoring").
//   localStorage kg_leagues        -> [{ id, name, season, teams, userId, username,
//                                       scoring, myKickers, takenKickers, idMap, syncedAt }]
//   localStorage kg_active_league  -> the active league id ('' = custom scoring)
//   localStorage kicker_scoring    -> the custom scoring
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_SCORING } from '../data/constants';
import { store, syncLeague, findSleeperUser, fetchUserLeagues } from './sleeper';

const LEAGUES = 'kg_leagues';
const ACTIVE = 'kg_active_league';
const CUSTOM = 'kicker_scoring';
const STALE_MS = 6 * 3600 * 1000;   // re-sync the active league's rosters after 6 hours (waivers, trades)

const rawGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

// First load: the saved list -- or, once, the OLD single-league keys moved into it.
// (Runs in the lazy state initializers: the page's first render is the loading
// screen on the server and the client alike, so reading localStorage here is hydration-safe.)
const loadLeagues = () => {
  if (typeof window === 'undefined') return [];
  const saved = store.get(LEAGUES, null);
  if (Array.isArray(saved)) return saved;
  const oldId = rawGet('sleeper_league_id');   // stored as a raw string (ids are too long for JSON numbers)
  const leagues = oldId ? [{
    id: oldId,
    name: rawGet('sleeper_league_name') || 'My league',
    season: null, teams: null, userId: null,
    username: rawGet('sleeper_username') || '',
    scoring: { ...DEFAULT_SCORING, ...store.get(CUSTOM, {}) },
    myKickers: store.get('sleeper_my_kickers', []),
    takenKickers: store.get('sleeper_taken_kickers', []),
    idMap: store.get('sleeper_id_map', {}),
    syncedAt: 0,   // -> refreshed from Sleeper on the first visit
  }] : [];
  store.set(LEAGUES, leagues);
  if (oldId) store.set(ACTIVE, oldId);
  return leagues;
};
const loadActive = () => (typeof window === 'undefined' ? '' : store.get(ACTIVE, ''));
const loadCustom = () => (typeof window === 'undefined' ? DEFAULT_SCORING : { ...DEFAULT_SCORING, ...store.get(CUSTOM, {}) });

export default function useLeagues() {
  const [leagues, setLeaguesState] = useState(loadLeagues);
  const [activeId, setActiveIdState] = useState(loadActive);
  const [customScoring, setCustomScoring] = useState(loadCustom);
  const [busy, setBusy] = useState(null);     // league id being synced, or 'find'
  const [error, setError] = useState(null);

  const setLeagues = useCallback((update) => {
    setLeaguesState((prev) => { const next = typeof update === 'function' ? update(prev) : update; store.set(LEAGUES, next); return next; });
  }, []);
  const switchLeague = useCallback((id) => { setActiveIdState(id); store.set(ACTIVE, id); }, []);

  const active = useMemo(() => leagues.find((l) => l.id === activeId) || null, [leagues, activeId]);
  const scoring = useMemo(() => (active ? { ...DEFAULT_SCORING, ...active.scoring } : customScoring), [active, customScoring]);

  // add or refresh one league (keeps its place in the list)
  const upsert = useCallback((league) => setLeagues((prev) => (prev.some((l) => l.id === league.id)
    ? prev.map((l) => (l.id === league.id ? league : l)) : [...prev, league])), [setLeagues]);

  // re-sync from Sleeper. The button refreshes rosters AND scoring; the automatic
  // (quiet) refresh only touches rosters, so scoring edits made here survive.
  const resync = useCallback(async (id, { quiet = false } = {}) => {
    const l = leagues.find((x) => x.id === id);
    if (!l) return;
    setBusy(id); if (!quiet) setError(null);
    try {
      const fresh = await syncLeague(id, { userId: l.userId, username: l.username });
      upsert(quiet ? { ...fresh, scoring: l.scoring } : fresh);
    }
    catch (e) { if (!quiet) setError(`${l.name}: ${e.message}`); }
    finally { setBusy(null); }
  }, [leagues, upsert]);

  // the active league refreshes itself when its rosters are stale (e.g. after waivers)
  const activeSyncedAt = active ? active.syncedAt || 0 : null;
  useEffect(() => {
    if (activeSyncedAt == null || Date.now() - activeSyncedAt < STALE_MS) return undefined;
    const t = setTimeout(() => resync(activeId, { quiet: true }), 0);
    return () => clearTimeout(t);
  }, [activeId, activeSyncedAt, resync]);

  // username -> { user, leagues } for the picker (nothing saved yet)
  const findLeagues = useCallback(async (username, season) => {
    setBusy('find'); setError(null);
    try {
      const user = await findSleeperUser(username);
      if (!user) throw new Error(`No Sleeper user called "${username.trim()}"`);
      const found = await fetchUserLeagues(user.user_id, season);
      if (!found.length) throw new Error(`${user.display_name || user.username} has no ${season} NFL leagues on Sleeper`);
      return { user, leagues: found };
    } catch (e) { setError(e.message); return null; }
    finally { setBusy(null); }
  }, []);

  // save a league: from the picker (league object + user) or by id (+ optional username)
  const addLeague = useCallback(async (leagueId, me = {}, leagueObj = null) => {
    const id = String(leagueId).trim();
    if (!id) return;
    setBusy(id); setError(null);
    try {
      const saved = await syncLeague(id, me, leagueObj);
      upsert(saved);
      if (!activeId) switchLeague(saved.id);   // the first league becomes active
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }, [upsert, activeId, switchLeague]);

  const removeLeague = useCallback((id) => {
    setLeagues((prev) => prev.filter((l) => l.id !== id));
    if (id === activeId) switchLeague('');
  }, [setLeagues, activeId, switchLeague]);

  // scoring edits go to whatever is active: the league, or the custom scoring
  const updateScoring = useCallback((key, val) => {
    const num = val === '' ? 0 : parseFloat(val);
    if (active) setLeagues((prev) => prev.map((l) => (l.id === active.id ? { ...l, scoring: { ...scoring, [key]: num } } : l)));
    else { const next = { ...customScoring, [key]: num }; setCustomScoring(next); store.set(CUSTOM, next); }
  }, [active, scoring, customScoring, setLeagues]);

  // reset: a league goes back to its Sleeper scoring (re-sync); custom goes back to the defaults
  const resetScoring = useCallback(() => {
    if (active) resync(active.id);
    else { setCustomScoring(DEFAULT_SCORING); store.set(CUSTOM, DEFAULT_SCORING); }
  }, [active, resync]);

  return { leagues, active, activeId, scoring, busy, error, setError, switchLeague, findLeagues, addLeague, removeLeague, resync, updateScoring, resetScoring };
}
