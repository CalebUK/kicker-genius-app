import React, { useState, useMemo, useEffect } from 'react';
import { PlayCircle, CheckCircle2, Clock, Calendar, Target, TrendingUp, Activity, Bot, Users, User, ChevronDown, BarChart3, Minus } from 'lucide-react';
import { calcFPts, calcProjection, weekKicks } from '../utils/scoring';
import { FootballIcon, HelmetIcon } from './KickerComponents';

// Accuracy tab: every kicker, every week, projected vs actual in the USER's scoring.
// Projections are rebuilt from the locked weekly snapshots (projection_results_weekly)
// with the model_settings in force that week; actuals come from that week's kicks.
// Only games actually played are scored -- upcoming / did-not-play games never count.
// "Baseline" = the kicker's season average going into the week: the model has to
// beat it to be adding anything (MODEL_SPEC.md / BEFORE_SEASON_LIVE.md "Model tuning").

const ALL = 'ALL';
const sum = (arr, f) => arr.reduce((acc, x) => acc + f(x), 0);
const mean = (arr, f) => (arr.length ? sum(arr, f) / arr.length : null);
const fmtSigned = (n, d = 0) => (n > 0 ? `+${n.toFixed(d)}` : n.toFixed(d));

const summarize = (games) => {
  const graded = games.filter(g => g.status === 'FINISHED');
  const diffs = graded.map(g => g.actual - g.proj).sort((a, b) => a - b);
  const within = diffs.filter(d => Math.abs(d) <= 3).length;
  return {
    n: graded.length,
    diffs,
    totalActual: sum(graded, g => g.actual),
    totalProj: sum(graded, g => g.proj),
    within,
    smashes: diffs.filter(d => d > 3).length,
    busts: diffs.filter(d => d < -3).length,
    maeModel: mean(graded, g => Math.abs(g.actual - g.projRaw)),
    maeBase: mean(graded, g => Math.abs(g.actual - g.baseline)),
  };
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// --- Kicker quartile lineup (spread of actual - projected) ---
const QuartileCard = ({ diffs }) => {
  const q = (p) => {
    if (!diffs.length) return 0;
    const k = (diffs.length - 1) * p;
    const f = Math.floor(k), c = Math.ceil(k);
    return f === c ? diffs[f] : diffs[f] * (c - k) + diffs[c] * (k - f);
  };
  const [minV, q1, med, q3, maxV] = [q(0), q(0.25), q(0.5), q(0.75), q(1)];
  const idx = (v) => (maxV === minV ? 5 : Math.round(((v - minV) / (maxV - minV)) * 9));
  const [q1i, medi, q3i] = [idx(q1), idx(med), idx(q3)];
  const fmt = (n) => (Math.round(n) === 0 ? '0' : fmtSigned(n));

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg">
      <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Users className="w-3 h-3 text-amber-500"/> Kicker Quartile</div>
      {diffs.length < 4 ? <div className="text-[10px] text-slate-500">Needs 4+ finished games</div> : (
        <>
          <div className="flex justify-between items-end relative h-8 px-1">
            <div className="absolute left-0 top-0 text-[8px] text-white font-bold -translate-y-full">Min: {fmt(minV)}</div>
            <div className="absolute right-0 top-0 text-[8px] text-white font-bold -translate-y-full">Max: {fmt(maxV)}</div>
            {Array.from({ length: 10 }, (_, i) => {
              const inMiddle = i >= q1i && i <= q3i;
              return (
                <div key={i} className="relative flex flex-col items-center">
                  {i === medi && <div className="absolute -top-7 bg-amber-500 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap z-40 -translate-x-1/2 left-1/2">Med: {fmt(med)}</div>}
                  <User className={`w-4 h-4 ${inMiddle ? 'text-blue-400 scale-110' : 'text-slate-600 scale-90'} ${i === medi ? 'text-amber-400 scale-125' : ''}`} strokeWidth={inMiddle ? 3 : 2}/>
                </div>
              );
            })}
          </div>
          <div className="text-[8px] text-slate-500 text-center mt-1 flex justify-center gap-3">
            <span>Q1: {fmt(q1)}</span><span className="text-blue-400">Middle 50%</span><span>Q3: {fmt(q3)}</span>
          </div>
        </>
      )}
    </div>
  );
};

// --- Model vs "just use his season average" ---
const BaselineCard = ({ s }) => {
  const beats = s.maeModel != null && s.maeModel < s.maeBase;
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg">
      <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3 text-sky-400"/> Model vs Baseline</div>
      {s.n === 0 ? <div className="text-[10px] text-slate-500">No finished games yet</div> : (
        <>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black ${beats ? 'text-emerald-400' : 'text-amber-400'}`}>{s.maeModel.toFixed(2)}</span>
            <span className="text-xs text-slate-400">vs {s.maeBase.toFixed(2)}</span>
          </div>
          <div className="text-[10px] text-slate-400">Avg miss (pts): model vs season avg</div>
          <div className={`text-[10px] font-bold mt-0.5 ${beats ? 'text-emerald-400' : 'text-amber-400'}`}>
            {beats ? `Model better by ${(s.maeBase - s.maeModel).toFixed(2)}` : `Baseline better by ${(s.maeModel - s.maeBase).toFixed(2)}`}
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCards = ({ s }) => {
  const diff = s.totalActual - s.totalProj;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg">
        <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-blue-500"/> Total Points ({s.n})</div>
        <div className="flex items-baseline gap-2"><span className="text-2xl font-black text-white">{Math.round(s.totalActual)}</span><span className="text-sm text-slate-400">vs {s.totalProj} Proj</span></div>
        <div className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtSigned(diff, 1)} Diff</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg">
        <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-emerald-500"/> Accuracy Rate</div>
        <div className="text-3xl font-black text-white">{pct(s.within, s.n)}%</div>
        <div className="text-[10px] text-slate-400">{s.within} of {s.n} within +/- 3 pts</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg">
        <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-purple-500"/> Performance</div>
        <div className="flex justify-between items-end text-xs font-bold w-full px-1">
          <div className="text-emerald-400 flex flex-col items-center"><span>{s.smashes}</span><span className="text-[8px] text-slate-500 font-normal">SMASH</span></div>
          <div className="text-slate-200 flex flex-col items-center"><span>{s.within}</span><span className="text-[8px] text-slate-500 font-normal">MET</span></div>
          <div className="text-red-400 flex flex-col items-center"><span>{s.busts}</span><span className="text-[8px] text-slate-500 font-normal">BUST</span></div>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full mt-1 flex overflow-hidden">
          <div className="bg-emerald-500 h-full" style={{ width: `${pct(s.smashes, s.n)}%` }}></div>
          <div className="bg-slate-400 h-full" style={{ width: `${pct(s.within, s.n)}%` }}></div>
          <div className="bg-red-500 h-full" style={{ width: `${pct(s.busts, s.n)}%` }}></div>
        </div>
        <div className="flex justify-between text-[8px] text-slate-600 mt-0.5"><span>&gt;+3</span><span>+/-3</span><span>&lt;-3</span></div>
      </div>
      <QuartileCard diffs={s.diffs} />
      <BaselineCard s={s} />
    </div>
  );
};

const STATUS_STYLE = {
  LIVE: { cls: 'bg-red-900/50 text-red-400 animate-pulse', Icon: PlayCircle },
  FINISHED: { cls: 'bg-emerald-900/30 text-emerald-400', Icon: CheckCircle2 },
  UPCOMING: { cls: 'bg-blue-900/30 text-blue-400', Icon: Clock },
  DNP: { cls: 'bg-slate-800 text-slate-500', Icon: Minus },
};

const GameCard = ({ g }) => {
  const [imgError, setImgError] = useState(false);
  const scored = g.actual != null;
  const perfPct = scored && g.proj > 0 ? Math.round((g.actual / g.proj) * 100) : 0;
  const isBeat = scored && g.actual >= g.proj;
  const isSmashed = scored && g.actual > g.proj + 3;
  const visualPct = Math.min(100, Math.max(5, perfPct));
  const { cls, Icon } = STATUS_STYLE[g.status];
  const shortFg = (g.wk_fg_0_19 || 0) + (g.wk_fg_20_29 || 0) + (g.wk_fg_30_39 || 0);
  const longFg = (g.wk_fg_50_59 || 0) + (g.wk_fg_60_plus || 0);
  const misses = (g.wk_fg_miss || 0) + (g.wk_xp_miss || 0);

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 relative overflow-hidden ${isSmashed ? 'shadow-[0_0_15px_rgba(59,130,246,0.5)] border-blue-400' : 'border-slate-800'} ${g.status === 'DNP' ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        {imgError || !g.headshot_url
          ? <HelmetIcon />
          : <img src={g.headshot_url} alt={g.kicker_name} className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover bg-slate-950" onError={() => setImgError(true)} />}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white text-sm truncate">{g.kicker_name}</div>
          <div className="text-xs text-slate-500">{g.team} vs {g.opponent}</div>
        </div>
        <div className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${cls}`}><Icon className="w-3 h-3" /> {g.status}</div>
      </div>

      <div className="flex justify-between items-end mb-2">
        <div>
          <span className={`text-3xl font-black ${isSmashed ? 'text-blue-400' : isBeat ? 'text-emerald-400' : 'text-white'}`}>{scored ? Math.round(g.actual * 10) / 10 : '–'}</span>
          <span className="text-xs text-slate-500 ml-1">pts</span>
        </div>
        <div className="text-xs text-slate-400 font-bold text-right">PROJECTED: <span className="text-white text-base">{g.proj}</span></div>
      </div>

      {scored && (
        <div className="h-8 w-full bg-emerald-900 rounded-md relative mb-4 border-2 border-emerald-800 overflow-hidden mt-2 shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800 to-emerald-950 opacity-80"></div>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/90"></div>
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/90"></div>
          <div className="absolute inset-0 flex justify-between px-4 items-center pointer-events-none">
            {[...Array(9)].map((_, i) => <div key={i} className={i === 4 ? 'h-full w-0.5 bg-white/80' : 'h-[60%] w-px bg-white/40'}></div>)}
          </div>
          <div className={`h-full transition-all duration-1000 ease-out z-10 relative ${isSmashed ? 'bg-blue-500/60' : isBeat ? 'bg-emerald-500/60' : 'bg-yellow-500/50'}`} style={{ width: `${visualPct}%` }}></div>
          <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 transition-all duration-1000 ease-out z-30 flex items-center justify-center drop-shadow-lg" style={{ left: `calc(${visualPct}% - 16px)` }}>
            <FootballIcon isFire={isSmashed} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {g.usingSleeper && <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700 flex items-center gap-1"><Bot className="w-3 h-3" /> Sleeper Live</span>}
        {scored && g.proj > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${perfPct >= 100 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>{perfPct}% of Proj</span>}
        {g.status === 'FINISHED' && (
          <>
            {longFg > 0 && <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">{longFg}x 50+</span>}
            {g.wk_fg_40_49 > 0 && <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">{g.wk_fg_40_49}x 40-49</span>}
            {shortFg > 0 && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{shortFg}x Short FG</span>}
            {g.wk_xp_made > 0 && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{g.wk_xp_made}x XP</span>}
            {misses > 0 && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-800/50 line-through decoration-red-500/50">{misses} Miss</span>}
          </>
        )}
        {g.status === 'DNP' && <span className="text-[10px] text-slate-500 italic">Did not play: not scored</span>}
      </div>
      {isSmashed && <div className="absolute inset-0 bg-blue-500/5 animate-pulse pointer-events-none"></div>}
    </div>
  );
};

// Season view: model accuracy week by week, vs the season-average baseline.
const ByWeekStrip = ({ byWeek }) => {
  const max = Math.max(1, ...byWeek.flatMap(w => [w.s.maeModel || 0, w.s.maeBase || 0]));
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
        <BarChart3 className="w-3 h-3 text-sky-400"/> Avg miss by week
        <span className="normal-case font-normal flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500"></span>Model</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-500"></span>Season avg</span>
        </span>
      </div>
      <div className="space-y-1.5">
        {byWeek.map(({ week, s }) => (
          <div key={week} className="flex items-center gap-2 text-[10px]">
            <span className="w-10 text-slate-400 font-bold shrink-0">Wk {week}</span>
            <div className="flex-1 space-y-0.5">
              <div className="h-1.5 bg-sky-500 rounded-full" style={{ width: `${((s.maeModel || 0) / max) * 100}%` }}></div>
              <div className="h-1.5 bg-slate-500 rounded-full" style={{ width: `${((s.maeBase || 0) / max) * 100}%` }}></div>
            </div>
            <span className={`w-20 text-right font-mono shrink-0 ${s.maeModel < s.maeBase ? 'text-emerald-400' : 'text-amber-400'}`}>{s.maeModel.toFixed(1)} / {s.maeBase.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Season view: one row per kicker, finished games only.
const SeasonTable = ({ games }) => {
  const rows = useMemo(() => {
    const byKicker = new Map();
    for (const g of games) {
      if (g.status !== 'FINISHED') continue;
      if (!byKicker.has(g.gsis_id)) byKicker.set(g.gsis_id, []);
      byKicker.get(g.gsis_id).push(g);
    }
    return [...byKicker.values()].map(gs => {
      const last = gs[gs.length - 1];
      const s = summarize(gs);
      return { gsis_id: last.gsis_id, kicker_name: last.kicker_name, team: last.team, ...s };
    }).sort((a, b) => b.totalActual - a.totalActual);
  }, [games]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-400 uppercase bg-slate-950">
          <tr>
            <th className="px-4 py-3">Kicker</th>
            <th className="px-3 py-3 text-center">Games</th>
            <th className="px-3 py-3 text-center">Actual</th>
            <th className="px-3 py-3 text-center">Projected</th>
            <th className="px-3 py-3 text-center">+/-</th>
            <th className="px-3 py-3 text-center">Within ±3</th>
            <th className="px-3 py-3 text-center">Avg Miss</th>
            <th className="px-3 py-3 text-center">vs Season Avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(r => {
            const diff = r.totalActual - r.totalProj;
            const beats = r.maeModel < r.maeBase;
            return (
              <tr key={r.gsis_id} className="hover:bg-slate-800/50">
                <td className="px-4 py-2"><div className="font-bold text-white">{r.kicker_name}</div><div className="text-[10px] text-slate-500">{r.team}</div></td>
                <td className="px-3 py-2 text-center text-slate-300">{r.n}</td>
                <td className="px-3 py-2 text-center font-bold text-white">{Math.round(r.totalActual)}</td>
                <td className="px-3 py-2 text-center text-slate-400">{r.totalProj}</td>
                <td className={`px-3 py-2 text-center font-mono ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtSigned(diff)}</td>
                <td className="px-3 py-2 text-center text-slate-300">{pct(r.within, r.n)}%</td>
                <td className="px-3 py-2 text-center font-mono text-slate-300">{r.maeModel.toFixed(1)}</td>
                <td className={`px-3 py-2 text-center font-mono ${beats ? 'text-emerald-400' : 'text-amber-400'}`}>{fmtSigned(r.maeBase - r.maeModel, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-6 text-center text-slate-500">No finished games yet.</div>}
    </div>
  );
};

const AccuracyTab = ({ history, season, week, players, scoring, windowMode, sleeperLeagueId }) => {
  const [selSeason, setSelSeason] = useState(season);
  const [selWeek, setSelWeek] = useState(week);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fetched, setFetched] = useState({});   // past seasons, loaded on demand

  useEffect(() => {
    if (selSeason === season || fetched[selSeason]) return;
    let cancelled = false;
    fetch(`/api/projections?season=${selSeason}`)
      .then(res => (res.ok ? res.json() : { data: [] }))
      .then(json => { if (!cancelled) setFetched(f => ({ ...f, [selSeason]: json.data || [] })); })
      .catch(() => { if (!cancelled) setFetched(f => ({ ...f, [selSeason]: [] })); });
    return () => { cancelled = true; };
  }, [selSeason, season, fetched]);

  const rows = selSeason === season ? history : fetched[selSeason];

  const games = useMemo(() => {
    if (!rows) return [];
    const today = new Date().toISOString().slice(0, 10);
    const live = new Map(players.map(p => [p.gsis_id, p]));
    return rows.map(h => {
      const c = calcProjection(h, windowMode, scoring, h.model_settings);
      const current = h.season === season && h.week === week ? live.get(h.gsis_id) : null;
      const sleeper = current?.sleeper_live_score;
      let status = 'UPCOMING', actual = null;
      if (h.played) { status = 'FINISHED'; actual = calcFPts(weekKicks(h), scoring); }
      else if (sleeper != null) { status = 'LIVE'; actual = sleeper; }
      else if (h.gameday ? h.gameday < today : h.season < season) { status = 'DNP'; }
      return {
        ...h,
        headshot_url: live.get(h.gsis_id)?.headshot_url,
        proj: c.proj, projRaw: c.raw, baseline: c.avg,
        actual, status, usingSleeper: status === 'LIVE',
      };
    });
  }, [rows, players, scoring, windowMode, season, week]);

  const weeks = useMemo(() => [...new Set(games.map(g => g.week))].sort((a, b) => b - a), [games]);
  const inView = selWeek === ALL ? games : games.filter(g => g.week === selWeek);
  const s = summarize(inView);
  const isBackfilled = selWeek !== ALL && inView.length > 0 && inView.every(g => g.backfilled);

  const byWeek = useMemo(() => [...weeks].reverse()
    .map(w => ({ week: w, s: summarize(games.filter(g => g.week === w)) }))
    .filter(w => w.s.n > 0), [weeks, games]);

  const order = { LIVE: 0, FINISHED: 0, UPCOMING: 1, DNP: 2 };
  const cards = [...inView].sort((a, b) =>
    order[a.status] - order[b.status] || (b.actual ?? -99) - (a.actual ?? -99) || b.proj - a.proj);

  const changeSeason = (y) => { setSelSeason(y); setSelWeek(y === season ? week : ALL); };
  const weekLabel = selWeek === ALL ? 'All Weeks' : `Wk ${selWeek}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            {[season, season - 1].map(y => (
              <button key={y} onClick={() => changeSeason(y)} className={`px-3 py-2 text-xs font-bold ${y === selSeason ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{y}</button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors w-40 justify-between whitespace-nowrap">
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" /><span className="font-bold">{weekLabel}</span></div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                {[ALL, ...weeks].map(w => (
                  <button key={w} onClick={() => { setSelWeek(w); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-800 ${w === selWeek ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-300'}`}>
                    {w === ALL ? 'All Weeks' : `Week ${w}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">Your league scoring · {windowMode.toUpperCase()} window · finished games only</span>
          {isBackfilled && <span className="bg-amber-900/20 border border-amber-800 px-3 py-1.5 rounded-lg text-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" /> Rebuilt after the fact, not shown live</span>}
          {!sleeperLeagueId && selSeason === season && selWeek === week && <span className="bg-blue-900/20 border border-blue-800 px-3 py-1.5 rounded-lg text-blue-200 flex items-center gap-1"><Bot className="w-3 h-3" /> Sync Sleeper for live scores</span>}
        </div>
      </div>

      {!rows ? (
        <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900">Loading {selSeason}…</div>
      ) : (
        <>
          <SummaryCards s={s} />
          {selWeek === ALL ? (
            <>
              {byWeek.length > 0 && <ByWeekStrip byWeek={byWeek} />}
              <SeasonTable games={games} />
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map(g => <GameCard key={`${g.week}-${g.gsis_id}`} g={g} />)}
            </div>
          )}
          {inView.length === 0 && <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900">No projections for this week.</div>}
        </>
      )}
    </div>
  );
};

export default AccuracyTab;
