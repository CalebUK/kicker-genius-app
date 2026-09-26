import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircleQuestionMark, Search, Snowflake, CloudRain, Sun, Wind, House, Warehouse, Plane, Loader2, AlertTriangle, Info } from 'lucide-react';
import { calcFPts } from '../utils/scoring';
import { HelmetIcon } from './KickerComponents';
import { TEAMS, TEAM_BY_ABBR, EMPTY_FILTERS, parseQuestion, matchesFilters, isComparable, hasAnyFilter, describeFilters } from '../utils/askParser';

// Ask tab: "How does Bass do in the snow?" -- no AI. The question is parsed into
// a subject + filters (utils/askParser.js), shown as editable dropdowns, and
// scored with the user's league settings. Subjects:
//   kicker / team -> that game log (/api/ask/games), split in the browser
//   all kickers   -> league-wide scenario (/api/ask/split), split + summed in the DB

const EXAMPLES = [
  'How does Bass do in the snow?',
  'Butker vs the Titans',
  'Aubrey in domes',
  'Titans vs the Jaguars',
  'All kickers at the Broncos stadium',
  'Kickers in the snow in Buffalo',
];

const BUCKET_KEYS = ['fg_att', 'fg_made', 'fg_miss', 'xp_att', 'xp_made', 'xp_miss',
  'fg_0_19', 'fg_20_29', 'fg_30_39', 'fg_40_49', 'fg_50_59', 'fg_60_plus',
  'fg_miss_0_19', 'fg_miss_20_29', 'fg_miss_30_39', 'fg_miss_40_49', 'fg_miss_50_59', 'fg_miss_60_plus'];
const pct = (made, att) => (att > 0 ? `${Math.round((made / att) * 100)}%` : '–');
const one = (x) => (Math.round(x * 10) / 10).toFixed(1);
// a single game's score: whole number unless the league's scoring really makes a fraction
const gamePts = (x) => (Number.isInteger(x) ? String(x) : one(x));

// games -> one row of summed kick buckets (+ n), the same shape /api/ask/split returns
function totals(games) {
  const t = { n: games.length };
  for (const k of BUCKET_KEYS) t[k] = games.reduce((acc, g) => acc + (Number(g[k]) || 0), 0);
  return t;
}

// Fantasy points are a sum over kicks, so scoring the summed buckets gives the
// same total as scoring game by game.
function statsFromTotals(t, scoring) {
  const n = Number(t.n) || 0;
  const v = (k) => Number(t[k]) || 0;
  const bucket = (makes, misses) => {
    const made = makes.reduce((a, k) => a + v(k), 0);
    return { made, att: made + misses.reduce((a, k) => a + v(k), 0) };
  };
  const pts = n ? calcFPts(t, scoring) : 0;
  return {
    n, pts, ptsPerGame: n ? pts / n : 0,
    fgMade: v('fg_made'), fgAtt: v('fg_att'), xpMade: v('xp_made'), xpAtt: v('xp_att'),
    short: bucket(['fg_0_19', 'fg_20_29', 'fg_30_39'], ['fg_miss_0_19', 'fg_miss_20_29', 'fg_miss_30_39']),
    mid: bucket(['fg_40_49'], ['fg_miss_40_49']),
    long: bucket(['fg_50_59', 'fg_60_plus'], ['fg_miss_50_59', 'fg_miss_60_plus']),
  };
}
const summarize = (games, scoring) => statsFromTotals(totals(games), scoring);

function addTotals(a, b) {
  const t = { n: (Number(a.n) || 0) + (Number(b.n) || 0) };
  for (const k of BUCKET_KEYS) t[k] = (Number(a[k]) || 0) + (Number(b[k]) || 0);
  return t;
}

// the filters as /api/ask/split query parameters
function splitQuery(f) {
  const q = new URLSearchParams();
  const map = { opponent: 'opponent', stadium: 'stadium', venue: 'venue', weather: 'weather', wind: 'wind',
    temp: 'temp', homeAway: 'homeAway', fromSeason: 'from', toSeason: 'to' };
  for (const [key, param] of Object.entries(map)) if (f[key]) q.set(param, f[key]);
  return q.toString();
}

const conditionsLabel = (g) => {
  if (g.is_dome) return { Icon: Warehouse, text: 'Dome', cls: 'text-slate-400' };
  const temp = g.game_temp != null ? ` ${g.game_temp}°F` : '';
  const wind = g.wind >= 15 ? `, wind ${g.wind} mph` : '';
  if (g.game_conditions === 'snow') return { Icon: Snowflake, text: `Snow${temp}${wind}`, cls: 'text-sky-300' };
  if (g.game_conditions === 'rain') return { Icon: CloudRain, text: `Rain${temp}${wind}`, cls: 'text-blue-300' };
  if (g.game_conditions === 'clear') return { Icon: g.wind >= 15 ? Wind : Sun, text: `Clear${temp}${wind}`, cls: 'text-amber-300/80' };
  return { Icon: Info, text: 'No weather report', cls: 'text-slate-600' };
};

const Select = ({ label, value, onChange, options }) => (
  <label className="flex flex-col gap-1 text-[10px] uppercase font-bold text-slate-500">
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`bg-slate-900 border rounded-lg px-2 py-1.5 text-xs normal-case font-semibold focus:outline-none focus:border-blue-500 ${value ? 'border-blue-500/60 text-white' : 'border-slate-700 text-slate-400'}`}>
      {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
    </select>
  </label>
);

const StatBlock = ({ title, s, accent }) => (
  <div className={`bg-slate-900 border rounded-xl p-4 ${accent ? 'border-blue-500/50' : 'border-slate-800'}`}>
    <div className={`text-xs font-bold uppercase mb-3 ${accent ? 'text-blue-300' : 'text-slate-500'}`}>{title}</div>
    {s.n === 0 ? <div className="text-sm text-slate-500">No games</div> : (
      <>
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-3xl font-black ${accent ? 'text-white' : 'text-slate-300'}`}>{one(s.ptsPerGame)}</span>
          <span className="text-xs text-slate-500">fantasy pts / game · {s.n} game{s.n === 1 ? '' : 's'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-slate-500">Field goals</span><span className="text-right text-slate-200 font-mono">{s.fgMade}/{s.fgAtt} ({pct(s.fgMade, s.fgAtt)})</span>
          <span className="text-slate-500">FG made / game</span><span className="text-right text-slate-200 font-mono">{one(s.fgMade / s.n)}</span>
          <span className="text-slate-500">0–39 yds</span><span className="text-right text-slate-200 font-mono">{s.short.made}/{s.short.att}</span>
          <span className="text-slate-500">40–49 yds</span><span className="text-right text-slate-200 font-mono">{s.mid.made}/{s.mid.att}</span>
          <span className="text-slate-500">50+ yds</span><span className="text-right text-slate-200 font-mono">{s.long.made}/{s.long.att}</span>
          <span className="text-slate-500">Extra points</span><span className="text-right text-slate-200 font-mono">{s.xpMade}/{s.xpAtt} ({pct(s.xpMade, s.xpAtt)})</span>
        </div>
      </>
    )}
  </div>
);

const AskTab = ({ scoring, currentSeason }) => {
  const [kickers, setKickers] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [question, setQuestion] = useState('');
  // The subject is ONE of: a kicker (gsis id), a team (all its kickers), or
  // ALL KICKERS (league-wide scenario).
  const [kickerId, setKickerId] = useState('');
  const [teamAbbr, setTeamAbbr] = useState('');
  const [allMode, setAllMode] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [notes, setNotes] = useState([]);
  const [gamesByKey, setGamesByKey] = useState({});
  const [errorByKey, setErrorByKey] = useState({});
  const [showAll, setShowAll] = useState(false);

  // what to fetch: a game log for a kicker/team (filtered here), or the DB-side
  // split for all kickers (refetched whenever the filters change)
  const subjectKey = kickerId ? `games?gsis_id=${encodeURIComponent(kickerId)}`
    : teamAbbr ? `games?team=${teamAbbr}`
    : allMode ? `split?${splitQuery(filters)}` : '';

  useEffect(() => {
    fetch('/api/ask/kickers')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`kickers ${r.status}`))))
      .then((j) => setKickers(j.kickers || []))
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!subjectKey || gamesByKey[subjectKey]) return;
    let cancelled = false;
    fetch(`/api/ask/${subjectKey}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.code || r.status)))))
      .then((j) => { if (!cancelled) setGamesByKey((m) => ({ ...m, [subjectKey]: subjectKey.startsWith('split') ? j : (j.games || []) })); })
      .catch((e) => { if (!cancelled) setErrorByKey((m) => ({ ...m, [subjectKey]: e.message })); });
    return () => { cancelled = true; };
  }, [subjectKey, gamesByKey]);

  const chooseKicker = (id) => { setKickerId(id); setTeamAbbr(''); setAllMode(false); setShowAll(false); };
  const chooseTeam = (abbr) => { setTeamAbbr(abbr); setKickerId(''); setAllMode(false); setShowAll(false); };
  const chooseAll = () => { setAllMode(true); setKickerId(''); setTeamAbbr(''); setShowAll(false); };
  const clearAll = () => {
    setQuestion(''); setKickerId(''); setTeamAbbr(''); setAllMode(false);
    setFilters(EMPTY_FILTERS); setNotes([]); setShowAll(false);
  };

  const ask = (text) => {
    const q = (text ?? question).trim();
    if (!q || !kickers) return;
    setQuestion(q);
    const parsed = parseQuestion(q, kickers, currentSeason);
    setFilters(parsed.filters);
    setNotes(parsed.notes);
    setShowAll(false);
    if (parsed.kicker) chooseKicker(parsed.kicker.gsis_id);
    else if (parsed.team) chooseTeam(parsed.team);
    else if (parsed.allKickers) chooseAll();
    else { clearSubject(); setNotes([...parsed.notes, "Couldn't spot a kicker, team or scenario in that: pick one below."]); }
  };
  const clearSubject = () => { setKickerId(''); setTeamAbbr(''); setAllMode(false); };

  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setShowAll(false); };

  const kicker = kickers?.find((k) => k.gsis_id === kickerId) || null;
  const teamMode = !kickerId && !!teamAbbr;
  const plural = teamMode || allMode;   // "they" rather than "he"
  const subject = kicker ? kicker.name : teamMode ? `${TEAM_BY_ABBR[teamAbbr].nick} kickers` : allMode ? 'Kickers' : '';
  const loaded = gamesByKey[subjectKey];
  const games = allMode ? undefined : loaded;
  const splitData = allMode ? loaded : undefined;
  const gamesError = errorByKey[subjectKey];
  const seasons = useMemo(() => {
    const first = kickers?.length ? Math.min(...kickers.map((k) => k.first_season)) : currentSeason;
    return Array.from({ length: currentSeason - first + 1 }, (_, i) => String(currentSeason - i));
  }, [kickers, currentSeason]);

  const { matched, split, rest, all, unjudged, leaders } = useMemo(() => {
    if (splitData) {
      // ALL KICKERS: the database already split + summed the games
      const s = statsFromTotals(splitData.matched, scoring);
      const r = statsFromTotals(splitData.others, scoring);
      const both = statsFromTotals(addTotals(splitData.matched, splitData.others), scoring);
      const rows = (splitData.kickers || []).map((k) => ({ ...k, stats: statsFromTotals(k, scoring) }));
      const minGames = rows.filter((k) => k.n >= 3).length >= 5 ? 3 : 1;
      const leaderRows = rows.filter((k) => k.n >= minGames)
        .sort((a, b) => b.stats.ptsPerGame - a.stats.ptsPerGame).slice(0, 10);
      return { matched: splitData.games || [], split: s, rest: r, all: both, unjudged: 0, leaders: { rows: leaderRows, minGames, total: rows.length } };
    }
    if (!games) return {};
    const m = games.filter((g) => matchesFilters(g, filters));
    // "other games" = games that could have matched but didn't; games with no
    // weather/temp/wind data are left out of both sides (see isComparable)
    const o = games.filter((g) => !matchesFilters(g, filters) && isComparable(g, filters));
    return {
      matched: m, split: summarize(m, scoring), rest: summarize(o, scoring), all: summarize(games, scoring),
      unjudged: games.length - m.length - o.length,
    };
  }, [games, splitData, filters, scoring]);

  const filtered = hasAnyFilter(filters);
  const phrase = describeFilters(filters);
  const teamOptions = [['', 'Any'], ...[...TEAMS].sort((a, b) => a.nick.localeCompare(b.nick)).map((t) => [t.abbr, t.nick])];
  const { currentOptions, pastOptions } = useMemo(() => {
    if (!kickers) return { currentOptions: [['', 'Loading…']], pastOptions: [['', 'Loading…']] };
    const byName = [...kickers].sort((a, b) => a.name.localeCompare(b.name));
    return {
      currentOptions: [['', 'Pick…'], ...byName.filter((k) => k.last_season >= currentSeason).map((k) => [k.gsis_id, `${k.name} (${k.team})`])],
      pastOptions: [['', 'Pick…'], ...byName.filter((k) => k.last_season < currentSeason)
        .map((k) => [k.gsis_id, `${k.name} (${k.team_code || k.team}, ${k.first_season}–${k.last_season})`])],
    };
  }, [kickers, currentSeason]);
  const isCurrent = kicker ? kicker.last_season >= currentSeason : false;

  const verdict = () => {
    if (!subject || !split) return null;
    const his = plural ? 'their' : 'his';
    const s = plural ? '' : 's';
    const others = allMode ? 'all other games' : `${his} other games`;
    const since = seasons[seasons.length - 1];
    if (!filtered) return `${subject} average${s} ${one(all.ptsPerGame)} fantasy pts per game across ${all.n.toLocaleString()} games since ${since}. Add a condition to compare, like snow, domes or an opponent.`;
    if (split.n === 0) return `${subject} ${plural ? 'have' : 'has'} no games ${phrase} in the data (regular season, ${since} on).`;
    const base = `${subject} average${s} ${one(split.ptsPerGame)} fantasy pts per game ${phrase} (${split.n.toLocaleString()} game${split.n === 1 ? '' : 's'})`;
    if (rest.n === 0) return `${base}, which covers every game ${plural ? "they've" : "he's"} played.`;
    const diff = split.ptsPerGame - rest.ptsPerGame;
    if (Math.abs(diff) < 0.5) return `${base}: about the same as ${his} ${one(rest.ptsPerGame)} in ${others}.`;
    return `${base}: ${one(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than ${his} ${one(rest.ptsPerGame)} in ${others}.`;
  };

  const shown = matched ? (showAll ? matched : matched.slice(0, 25)) : [];
  const kickerCol = teamMode || allMode;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* QUESTION BOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1"><MessageCircleQuestionMark className="w-5 h-5 text-blue-400" /><h2 className="text-lg font-bold text-white">Ask about a kicker, a team or a scenario</h2></div>
        <p className="text-xs text-slate-500 mb-4">Weather, domes, opponents, home/road and seasons, using every regular-season game since {seasons[seasons.length - 1]}, scored with your league settings.</p>
        <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How does Bass do in the snow?"
              className="w-full bg-slate-950 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600" />
          </div>
          <button type="submit" disabled={!kickers} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold px-5 rounded-full">Ask</button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => ask(ex)} disabled={!kickers} className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full border border-slate-700">{ex}</button>
          ))}
        </div>
        {loadError && <div className="mt-3 text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Could not load the kicker list.</div>}
      </div>

      {/* WHAT IT UNDERSTOOD (editable) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase font-bold text-slate-500">{question ? 'Understood as (change anything)' : 'Or build a question'}</div>
          {(question || subjectKey || filtered) && (
            <button onClick={clearAll} className="text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded-full">Clear all</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 pb-3 border-b border-slate-800 items-end">
          <Select label="Current kicker" value={isCurrent ? kickerId : ''} onChange={chooseKicker} options={currentOptions} />
          <Select label="Past kicker" value={kicker && !isCurrent ? kickerId : ''} onChange={chooseKicker} options={pastOptions} />
          <Select label="Or a team (all its kickers)" value={teamMode ? teamAbbr : ''} onChange={chooseTeam}
            options={[['', 'Pick…'], ...[...TEAMS].sort((a, b) => a.nick.localeCompare(b.nick)).map((t) => [t.abbr, t.nick])]} />
          <button onClick={chooseAll}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${allMode ? 'bg-blue-600/20 border-blue-500/60 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}>
            Or all kickers (league-wide)
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Select label="Opponent" value={filters.opponent} onChange={setFilter('opponent')} options={teamOptions} />
          <Select label="Stadium" value={filters.stadium} onChange={setFilter('stadium')} options={teamOptions} />
          <Select label="Roof" value={filters.venue} onChange={setFilter('venue')} options={[['', 'Any'], ['dome', 'Dome / closed roof'], ['outdoors', 'Outdoors']]} />
          <Select label="Weather" value={filters.weather} onChange={setFilter('weather')} options={[['', 'Any'], ['snow', 'Snow'], ['rain', 'Rain'], ['clear', 'Clear / dry']]} />
          <Select label="Wind" value={filters.wind} onChange={setFilter('wind')} options={[['', 'Any'], ['windy', 'Windy (15+ mph)']]} />
          <Select label="Temperature" value={filters.temp} onChange={setFilter('temp')} options={[['', 'Any'], ['cold', 'Cold (40°F or below)'], ['freezing', 'Freezing (32°F or below)'], ['warm', 'Warm (70°F+)']]} />
          <Select label="Home / Away" value={filters.homeAway} onChange={setFilter('homeAway')} options={[['', 'Any'], ['home', 'Home'], ['away', 'Away']]} />
          <Select label="From season" value={filters.fromSeason} onChange={setFilter('fromSeason')} options={[['', 'Any'], ...[...seasons].reverse().map((s) => [s, s])]} />
          <Select label="To season" value={filters.toSeason} onChange={setFilter('toSeason')} options={[['', 'Any'], ...seasons.map((s) => [s, s])]} />
        </div>
        {filtered && <button onClick={() => setFilters(EMPTY_FILTERS)} className="mt-3 text-[11px] text-slate-400 hover:text-white underline">Clear conditions</button>}
        {notes.map((n) => <div key={n} className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1"><Info className="w-3 h-3" /> {n}</div>)}
      </div>

      {/* ANSWER */}
      {subjectKey && !loaded && !gamesError && <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading games…</div>}
      {gamesError && <div className="p-6 text-center text-red-400 border border-red-900/50 rounded-xl bg-red-950/20 text-sm">Could not load games ({gamesError}).</div>}

      {subject && split && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            {teamMode || allMode
              ? <div className="w-14 h-14 shrink-0 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center text-sm font-black text-slate-300">{allMode ? 'ALL' : teamAbbr}</div>
              : kicker.headshot_url ? <img src={kicker.headshot_url} alt={kicker.name} className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover bg-slate-950" /> : <HelmetIcon />}
            <div>
              <div className="text-base md:text-lg font-bold text-white leading-snug">{verdict()}</div>
              {filtered && split.n > 0 && split.n < 6 && <div className="text-xs text-amber-300/90 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Small sample: treat this as a hint, not a trend.</div>}
              {filtered && unjudged > 0 && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> {unjudged} game{unjudged === 1 ? '' : 's'} with no weather report left out of the comparison.</div>}
              {filters.weather === 'snow' && split.n === 0 && (
                <div className="text-xs text-slate-400 mt-2">Snow games are rare (about 3 a season, mostly in Buffalo, Denver, Chicago, Green Bay and New England).{' '}
                  <button onClick={() => setFilters((f) => ({ ...f, weather: '', temp: 'cold' }))} className="text-blue-400 underline">Try cold games instead</button>
                </div>
              )}
            </div>
          </div>

          <div className={`grid gap-4 ${filtered ? 'md:grid-cols-2' : ''}`}>
            {filtered
              ? <><StatBlock title={`Games ${phrase}`} s={split} accent /><StatBlock title={allMode ? 'All other games' : teamMode ? 'Their other games' : 'His other games'} s={rest} /></>
              : <StatBlock title="All games" s={all} accent />}
          </div>

          {allMode && leaders?.rows.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="px-4 py-3 text-xs font-bold uppercase text-slate-400 border-b border-slate-800">
                Best kickers {phrase || 'overall'}{leaders.minGames > 1 ? ` (${leaders.minGames}+ games)` : ''}
                <span className="normal-case font-normal text-slate-500 ml-2">· {leaders.total} kickers · click one for his details</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-4 py-2">#</th><th className="px-3 py-2">Kicker</th><th className="px-3 py-2 text-center">Games</th>
                    <th className="px-3 py-2 text-center">FG</th><th className="px-3 py-2 text-center">50+</th><th className="px-3 py-2 text-center">Fantasy pts / game</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leaders.rows.map((k, i) => (
                    <tr key={k.gsis_id} onClick={() => chooseKicker(k.gsis_id)} className="hover:bg-slate-800/50 cursor-pointer">
                      <td className="px-4 py-2 text-slate-500 font-mono">{i + 1}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><span className="font-bold text-white">{k.name}</span> <span className="text-[10px] text-slate-500">{k.team} · {k.first_season === k.last_season ? k.first_season : `${k.first_season}–${k.last_season}`}</span></td>
                      <td className="px-3 py-2 text-center text-slate-300">{k.n}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-200">{k.stats.fgMade}/{k.stats.fgAtt} <span className="text-slate-500 text-[10px]">{pct(k.stats.fgMade, k.stats.fgAtt)}</span></td>
                      <td className="px-3 py-2 text-center font-mono text-slate-400">{k.stats.long.att ? `${k.stats.long.made}/${k.stats.long.att}` : '–'}</td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-400">{one(k.stats.ptsPerGame)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matched.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-4 py-3">Game</th>{kickerCol && <th className="px-3 py-3">Kicker</th>}<th className="px-3 py-3">Opponent</th><th className="px-3 py-3">Conditions</th>
                    <th className="px-3 py-3 text-center">FG</th><th className="px-3 py-3 text-center">50+</th><th className="px-3 py-3 text-center">XP</th><th className="px-3 py-3 text-center">Fantasy pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {shown.map((g) => {
                    const c = conditionsLabel(g);
                    const long = (g.fg_50_59 || 0) + (g.fg_60_plus || 0);
                    const longAtt = long + (g.fg_miss_50_59 || 0) + (g.fg_miss_60_plus || 0);
                    return (
                      <tr key={`${g.season}-${g.week}-${g.kicker || g.kickers || ''}-${g.team || ''}`} className="hover:bg-slate-800/50">
                        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{g.season} · Wk {g.week}</td>
                        {kickerCol && <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-xs">{allMode ? `${g.kicker} (${g.team})` : g.kickers}</td>}
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">{g.is_home ? <House className="w-3 h-3 text-slate-500" /> : <Plane className="w-3 h-3 text-slate-500" />}{g.is_home ? 'vs' : '@'} {TEAM_BY_ABBR[g.opponent]?.nick || g.opponent || '–'}
                            {g.opponent_code && g.opponent_code !== g.opponent && <span className="text-slate-500 text-[10px]">({g.opponent_code})</span>}</span>
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap ${c.cls}`}><span className="inline-flex items-center gap-1"><c.Icon className="w-3 h-3" />{c.text}</span></td>
                        <td className="px-3 py-2 text-center font-mono text-slate-200">{g.fg_made}/{g.fg_att}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{longAtt ? `${long}/${longAtt}` : '–'}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{g.xp_made}/{g.xp_att}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-400">{gamePts(calcFPts(g, scoring))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matched.length > shown.length && (
                <button onClick={() => setShowAll(true)} className="w-full py-2 text-xs text-blue-400 hover:bg-slate-800/50">Show all {matched.length} games</button>
              )}
              {allMode && split.n > matched.length && showAll && (
                <div className="w-full py-2 text-center text-[11px] text-slate-500">Showing the {matched.length} most recent of {split.n.toLocaleString()} games.</div>
              )}
            </div>
          )}
        </>
      )}

      {!subjectKey && !question && kickers && (
        <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40 text-sm">Ask a question above, try an example, or pick a kicker, a team or all kickers.</div>
      )}
    </div>
  );
};

export default AskTab;
