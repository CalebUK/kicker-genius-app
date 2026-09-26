import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircleQuestionMark, Search, Snowflake, CloudRain, Sun, Wind, House, Warehouse, Plane, Loader2, AlertTriangle, Info } from 'lucide-react';
import { calcFPts } from '../utils/scoring';
import { HelmetIcon } from './KickerComponents';
import { TEAMS, TEAM_BY_ABBR, EMPTY_FILTERS, parseQuestion, matchesFilters, hasAnyFilter, describeFilters } from '../utils/askParser';

// Ask tab: "How does Bass do in the snow?" -- no AI. The question is parsed into
// a kicker + filters (utils/askParser.js), shown as editable dropdowns, and the
// kicker's game log (/api/ask/games) is split into matching vs other games and
// scored with the user's league settings.

const EXAMPLES = [
  'How does Bass do in the snow?',
  'Butker vs the Titans',
  'Aubrey in domes',
  'Folk in cold games',
  'McPherson on the road since 2024',
  'Titans vs the Jaguars',
];

const sum = (games, keys) => games.reduce((acc, g) => acc + keys.reduce((a, k) => a + (Number(g[k]) || 0), 0), 0);
const pct = (made, att) => (att > 0 ? `${Math.round((made / att) * 100)}%` : '–');
const one = (x) => (Math.round(x * 10) / 10).toFixed(1);

function summarize(games, scoring) {
  const n = games.length;
  const pts = games.reduce((acc, g) => acc + calcFPts(g, scoring), 0);
  const bucket = (makes, misses) => { const made = sum(games, makes); return { made, att: made + sum(games, misses) }; };
  return {
    n,
    pts,
    ptsPerGame: n ? pts / n : 0,
    fgMade: sum(games, ['fg_made']),
    fgAtt: sum(games, ['fg_att']),
    xpMade: sum(games, ['xp_made']),
    xpAtt: sum(games, ['xp_att']),
    short: bucket(['fg_0_19', 'fg_20_29', 'fg_30_39'], ['fg_miss_0_19', 'fg_miss_20_29', 'fg_miss_30_39']),
    mid: bucket(['fg_40_49'], ['fg_miss_40_49']),
    long: bucket(['fg_50_59', 'fg_60_plus'], ['fg_miss_50_59', 'fg_miss_60_plus']),
  };
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
          <span className="text-xs text-slate-500">pts / game · {s.n} game{s.n === 1 ? '' : 's'}</span>
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
  // The subject is ONE of: a kicker (gsis id) or a team (all its kickers).
  const [kickerId, setKickerId] = useState('');
  const [teamAbbr, setTeamAbbr] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [notes, setNotes] = useState([]);
  const [gamesByKey, setGamesByKey] = useState({});
  const [errorByKey, setErrorByKey] = useState({});
  const [showAll, setShowAll] = useState(false);

  const subjectKey = kickerId ? `gsis_id=${encodeURIComponent(kickerId)}` : teamAbbr ? `team=${teamAbbr}` : '';

  useEffect(() => {
    fetch('/api/ask/kickers')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`kickers ${r.status}`))))
      .then((j) => setKickers(j.kickers || []))
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!subjectKey || gamesByKey[subjectKey]) return;
    let cancelled = false;
    fetch(`/api/ask/games?${subjectKey}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.code || r.status)))))
      .then((j) => { if (!cancelled) setGamesByKey((m) => ({ ...m, [subjectKey]: j.games || [] })); })
      .catch((e) => { if (!cancelled) setErrorByKey((m) => ({ ...m, [subjectKey]: e.message })); });
    return () => { cancelled = true; };
  }, [subjectKey, gamesByKey]);

  const chooseKicker = (id) => { setKickerId(id); setTeamAbbr(''); setShowAll(false); };
  const chooseTeam = (abbr) => { setTeamAbbr(abbr); setKickerId(''); setShowAll(false); };

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
    else setNotes([...parsed.notes, "Couldn't spot a kicker or team in that: pick one below."]);
  };

  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setShowAll(false); };

  const kicker = kickers?.find((k) => k.gsis_id === kickerId) || null;
  const teamMode = !kickerId && !!teamAbbr;
  const subject = kicker ? kicker.name : teamMode ? `${TEAM_BY_ABBR[teamAbbr].nick} kickers` : '';
  const games = gamesByKey[subjectKey];
  const gamesError = errorByKey[subjectKey];
  const seasons = useMemo(() => {
    const first = kickers?.length ? Math.min(...kickers.map((k) => k.first_season)) : currentSeason;
    return Array.from({ length: currentSeason - first + 1 }, (_, i) => String(currentSeason - i));
  }, [kickers, currentSeason]);

  const { matched, split, rest, all } = useMemo(() => {
    if (!games) return {};
    const m = games.filter((g) => matchesFilters(g, filters));
    const o = games.filter((g) => !matchesFilters(g, filters));
    return { matched: m, split: summarize(m, scoring), rest: summarize(o, scoring), all: summarize(games, scoring) };
  }, [games, filters, scoring]);

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
    if (!subject || !games) return null;
    const his = teamMode ? 'their' : 'his';
    const since = seasons[seasons.length - 1];
    if (!filtered) return `${subject} average${teamMode ? '' : 's'} ${one(all.ptsPerGame)} pts per game across ${all.n} games since ${since}. Add a condition to compare, like snow, domes or an opponent.`;
    if (split.n === 0) return `${subject} ${teamMode ? 'have' : 'has'} no games ${phrase} in the data (regular season, ${since} on).`;
    const base = `${subject} average${teamMode ? '' : 's'} ${one(split.ptsPerGame)} pts per game ${phrase} (${split.n} game${split.n === 1 ? '' : 's'})`;
    if (rest.n === 0) return `${base}, which covers every game ${teamMode ? "they've" : "he's"} played.`;
    const diff = split.ptsPerGame - rest.ptsPerGame;
    if (Math.abs(diff) < 0.5) return `${base}: about the same as ${his} ${one(rest.ptsPerGame)} in ${his} other games.`;
    return `${base}: ${one(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than ${his} ${one(rest.ptsPerGame)} in ${his} other games.`;
  };

  const shown = matched ? (showAll ? matched : matched.slice(0, 25)) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* QUESTION BOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1"><MessageCircleQuestionMark className="w-5 h-5 text-blue-400" /><h2 className="text-lg font-bold text-white">Ask about a kicker or team</h2></div>
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
        <div className="text-[10px] uppercase font-bold text-slate-500 mb-3">{question ? 'Understood as (change anything)' : 'Or build a question'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 pb-3 border-b border-slate-800">
          <Select label="Current kicker" value={isCurrent ? kickerId : ''} onChange={chooseKicker} options={currentOptions} />
          <Select label="Past kicker" value={kicker && !isCurrent ? kickerId : ''} onChange={chooseKicker} options={pastOptions} />
          <Select label="Or a team (all its kickers)" value={teamMode ? teamAbbr : ''} onChange={chooseTeam}
            options={[['', 'Pick…'], ...[...TEAMS].sort((a, b) => a.nick.localeCompare(b.nick)).map((t) => [t.abbr, t.nick])]} />
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
      {subjectKey && !games && !gamesError && <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading games…</div>}
      {gamesError && <div className="p-6 text-center text-red-400 border border-red-900/50 rounded-xl bg-red-950/20 text-sm">Could not load games ({gamesError}).</div>}

      {subject && games && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            {teamMode
              ? <div className="w-14 h-14 shrink-0 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center text-sm font-black text-slate-300">{teamAbbr}</div>
              : kicker.headshot_url ? <img src={kicker.headshot_url} alt={kicker.name} className="w-14 h-14 rounded-full border-2 border-slate-700 object-cover bg-slate-950" /> : <HelmetIcon />}
            <div>
              <div className="text-base md:text-lg font-bold text-white leading-snug">{verdict()}</div>
              {filtered && split.n > 0 && split.n < 6 && <div className="text-xs text-amber-300/90 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Small sample: treat this as a hint, not a trend.</div>}
              {filters.weather === 'snow' && split.n === 0 && (
                <div className="text-xs text-slate-400 mt-2">Snow games are rare (about 14 since 2020, mostly in Buffalo, Denver, Chicago and New England).{' '}
                  <button onClick={() => setFilters((f) => ({ ...f, weather: '', temp: 'cold' }))} className="text-blue-400 underline">Try cold games instead</button>
                </div>
              )}
            </div>
          </div>

          <div className={`grid gap-4 ${filtered ? 'md:grid-cols-2' : ''}`}>
            {filtered
              ? <><StatBlock title={`Games ${phrase}`} s={split} accent /><StatBlock title={teamMode ? 'Their other games' : 'His other games'} s={rest} /></>
              : <StatBlock title="All games" s={all} accent />}
          </div>

          {matched.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-4 py-3">Game</th>{teamMode && <th className="px-3 py-3">Kicker</th>}<th className="px-3 py-3">Opponent</th><th className="px-3 py-3">Conditions</th>
                    <th className="px-3 py-3 text-center">FG</th><th className="px-3 py-3 text-center">50+</th><th className="px-3 py-3 text-center">XP</th><th className="px-3 py-3 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {shown.map((g) => {
                    const c = conditionsLabel(g);
                    const long = (g.fg_50_59 || 0) + (g.fg_60_plus || 0);
                    const longAtt = long + (g.fg_miss_50_59 || 0) + (g.fg_miss_60_plus || 0);
                    return (
                      <tr key={`${g.season}-${g.week}`} className="hover:bg-slate-800/50">
                        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{g.season} · Wk {g.week}</td>
                        {teamMode && <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-xs">{g.kickers}</td>}
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">{g.is_home ? <House className="w-3 h-3 text-slate-500" /> : <Plane className="w-3 h-3 text-slate-500" />}{g.is_home ? 'vs' : '@'} {TEAM_BY_ABBR[g.opponent]?.nick || g.opponent || '–'}
                            {g.opponent_code && g.opponent_code !== g.opponent && <span className="text-slate-500 text-[10px]">({g.opponent_code})</span>}</span>
                        </td>
                        <td className={`px-3 py-2 whitespace-nowrap ${c.cls}`}><span className="inline-flex items-center gap-1"><c.Icon className="w-3 h-3" />{c.text}</span></td>
                        <td className="px-3 py-2 text-center font-mono text-slate-200">{g.fg_made}/{g.fg_att}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{longAtt ? `${long}/${longAtt}` : '–'}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-400">{g.xp_made}/{g.xp_att}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-400">{one(calcFPts(g, scoring))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {matched.length > shown.length && (
                <button onClick={() => setShowAll(true)} className="w-full py-2 text-xs text-blue-400 hover:bg-slate-800/50">Show all {matched.length} games</button>
              )}
            </div>
          )}
        </>
      )}

      {!subjectKey && !question && kickers && (
        <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40 text-sm">Ask a question above, try an example, or pick a kicker or team.</div>
      )}
    </div>
  );
};

export default AskTab;
