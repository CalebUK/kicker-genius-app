"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Stethoscope, BookOpen, Settings, AlertTriangle, Loader2, Search, Filter, Target, ArrowUpDown, Calculator, Database, ChevronDown, ChevronUp, Gamepad2, BrainCircuit, MessageCircleQuestionMark, ShieldAlert, UserMinus, PlayCircle, CheckCircle2, Clock, Bot } from 'lucide-react';
// import { Analytics } from '@vercel/analytics/react';

import { BUY_ME_A_COFFEE_URL } from '../data/constants';
import useLeagues from '../utils/useLeagues';
import { calcFPts, calcProjection, weekKicks, fetchSleeperScores } from '../utils/scoring';
import { HeaderCell, PlayerCell, DeepDiveRow, InjuryCard } from '../components/KickerComponents';
import AccuracyTab from '../components/AccuracyTab';
import SettingsTab from '../components/SettingsTab';
import InjuryReportTab from '../components/InjuryReportTab';
import GlossaryTab from '../components/GlossaryTab';
import AskTab from '../components/AskTab';

const INJURY_COLORS = {
  Questionable: 'yellow', Doubtful: 'red-500', OUT: 'red-500',
  IR: 'red-700', PUP: 'red-700', Inactive: 'red-700', 'Practice Squad': 'red-700',
};

// Maps an API row (matchup_inputs_weekly / historical_projections) onto the field
// names the board + worksheet read. Windowed values arrive with _l3 / _l5 suffixes;
// this picks the selected window, so switching L3 <-> L5 in Settings updates the
// whole board instantly.
const toBoardRow = (r, w) => {
  // nflverse spread_line is from the home side (+ = home favored); show it betting-style
  const spread = r.spread_line == null ? null : (r.is_home ? -r.spread_line : r.spread_line);
  return {
    ...r,
    win_label: w.toUpperCase(),
    kicker_player_name: r.kicker_name,
    join_name: r.kicker_name,
    games: r.games_played,
    grade: r[`grade_${w}`],
    off_score_val: r[`off_score_${w}`],
    def_score_val: r[`def_score_${w}`],
    off_stall_rate: r[`off_stall_${w}`],
    def_stall_rate: r[`opp_def_stall_${w}`],
    lg_off_stall: r[`lg_off_stall_${w}`],
    lg_def_stall: r[`lg_def_stall_${w}`],
    // red-zone kicker points per game (stalled trip = FG try, other trip = XP): what the grade is built on
    off_rz_trips: r[`off_rz_trips_${w}`],
    off_rz_kp: r[`off_rz_kp_${w}`],
    def_rz_trips: r[`opp_def_rz_trips_${w}`],
    def_rz_kp: r[`opp_def_rz_kp_${w}`],
    lg_off_rz_kp: r[`lg_off_rz_kp_${w}`],
    lg_def_rz_kp: r[`lg_def_rz_kp_${w}`],
    off_ppg: r[`team_pts_${w}`],
    def_pa: r[`opp_pts_allowed_${w}`],
    exp_team_pts: r[`exp_team_pts_${w}`],
    exp_opp_allowed: r[`exp_opp_allowed_${w}`],
    off_share: r[`off_share_${w}`],
    def_share: r[`def_share_${w}`],
    team_prior_games: r[`team_prior_games_${w}`] || 0,
    opp_prior_games: r[`opp_prior_games_${w}`] || 0,
    vegas: r.vegas_implied,
    // kickoff temperature (forecast before the game, actual after) -- drives the cold penalty
    weather_desc: `${r.weather_desc || (r.is_dome ? 'Dome' : '—')}${!r.is_dome && r.temp_f != null ? ` ${r.temp_f}°F` : ''}`,
    details_vegas_total: r.total_line,
    details_vegas_spread: spread == null ? '' : `${spread > 0 ? '+' : ''}${Number(spread).toFixed(1)}`,
    injury_details: r.practice_status || '',
    injury_color: INJURY_COLORS[r.injury_status] || (r.injury_status ? 'yellow' : ''),
  };
};

// Week Model red-zone column: kicker points per game, with trips + stall rate underneath.
// (Rows from before the red-zone grade have no kicker points -> just the stall rate.)
const RedZoneCell = ({ kp, trips, stall, className }) => (
  <td className="px-6 py-4 text-center">
    {kp != null
      ? <><div className={`font-mono ${className}`}>{Number(kp).toFixed(1)}</div><div className="text-[9px] text-slate-500 whitespace-nowrap">{Number(trips).toFixed(1)} trips · {stall}%</div></>
      : <span className={className}>{stall}%</span>}
  </td>
);

// "2026-09-28 06:00 UTC" -> "Sep 28 06:00 UTC" (header's last-update chip)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortStamp = (s) => {
  const m = /^\d{4}-(\d{2})-(\d{2}) (.*)$/.exec(s || '');
  return m ? `${MONTHS[Number(m[1]) - 1]} ${Number(m[2])} ${m[3]}` : s;
};

// Both read the cloud DB: /api/dashboard = Week Model + weekly snapshots
// (Accuracy tab, trends); /api/ytd = Historical YTD season totals.
const loadSiteData = async () => {
  const fetchJson = async (url) => {
    // No cache-buster: the API routes set short CDN cache headers, so most
    // visits are served from Vercel's cache instead of waking the database.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} failed (${res.status}): ${await res.text()}`);
    return res.json();
  };
  const [dashboard, seasonTotals] = await Promise.all([
    fetchJson('/api/dashboard'),
    fetchJson('/api/ytd').catch(() => ({ ytd: [] })),
  ]);
  return { ...dashboard, ytd: seasonTotals.ytd || [] };
};

const TABS = ['potential', 'accuracy', 'ytd', 'ask', 'injuries', 'glossary', 'settings'];
function tabFromUrl() {
  if (typeof window === 'undefined') return 'potential';
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TABS.includes(tab) ? tab : 'potential';
}

// Just a snapshot's actual kicks that week (wk_* fields).
const wkFields = (h) => Object.fromEntries(Object.entries(h).filter(([k]) => k.startsWith('wk_')));

const App = () => {
  const [data, setData] = useState(null);
  // The open tab lives in the URL (?tab=ask) so the browser's Back/Forward
  // buttons move between tabs and links reopen the right one. Reading it here
  // is hydration-safe: the first render is the loading screen either way.
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [expandedRow, setExpandedRow] = useState(null);
  // Saved Sleeper leagues + the active one's scoring (or custom scoring) -- utils/useLeagues.js
  const lg = useLeagues();
  const { scoring } = lg;
  // 'l3' | 'l5' model window. L5 is the default: in the 2021–2025 backtest it beat
  // the season-average baseline at every stage of the season; L3 never did.
  // (Read in the initializer: the first render is the loading screen, so it's hydration-safe.)
  const [windowMode, setWindowMode] = useState(() => {
    try { const w = localStorage.getItem('kicker_window'); return w === 'l3' || w === 'l5' ? w : 'l5'; } catch { return 'l5'; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'proj', direction: 'desc' });
  const [hideHighOwn, setHideHighOwn] = useState(false);
  const [hideMedOwn, setHideMedOwn] = useState(false);
  const [search, setSearch] = useState('');

  // Sleeper: "my team + free agents" filter, and live scores for the active league
  const [sleeperFilter, setSleeperFilter] = useState(false);
  const [liveScores, setLiveScores] = useState({ league: null, scores: {} });


  // NOTE: the loading guard lives AFTER all hooks (see the `if (loading ...)`
  // return below). An early return here would skip the useEffect hooks and the
  // app would never load the data — leaving it stuck on the loading screen.
  useEffect(() => {   // load the data once, on mount
      let cancelled = false;
      loadSiteData()
          .then((d) => { if (!cancelled) setData(d); })
          .catch((err) => { console.error("Detailed Fetch Error:", err); if (!cancelled) setError(err.message); })
          .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
  }, []);

  // Back / Forward: follow the tab in the URL
  useEffect(() => {
    const onPop = () => setActiveTab(tabFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Switch tab and add a history entry (so Back returns to the previous tab)
  const goTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    window.history.pushState(null, '', tab === 'potential' ? window.location.pathname : `?tab=${tab}`);
  };

  // --- POLLING FOR LIVE SCORES (the active league's own scoring) ---
  const activeLeagueId = lg.activeId;
  useEffect(() => {
      if (!activeLeagueId || !data?.meta?.week || loading) return;
      const pollScores = async () => {
          const scores = await fetchSleeperScores(activeLeagueId, data.meta.week);
          if (scores && Object.keys(scores).length > 0) {
              // tagged with the league, so switching leagues never shows another league's points
              setLiveScores(prev => ({ league: activeLeagueId, scores: { ...(prev.league === activeLeagueId ? prev.scores : {}), ...scores } }));
          }
      };
      pollScores();
      const interval = setInterval(pollScores, 30000);
      return () => clearInterval(interval);
  }, [activeLeagueId, data?.meta?.week, loading]);

  const changeWindow = (mode) => {
    setWindowMode(mode);
    try { localStorage.setItem('kicker_window', mode); } catch { /* ignore */ }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (rank) => setExpandedRow(expandedRow === rank ? null : rank);

  // error first: when loading fails, data stays null and the spinner would never end
  if (error) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Data Error</h2><p className="text-slate-400 mb-6">{error}</p><p className="text-sm text-slate-600">Could not load the kicker data.</p></div>;
  if (loading || !data) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" /><p>Loading...</p></div>;

  const { rankings, ytd, injuries, meta, history = [] } = data;
  const settings = meta?.model_settings || {};
  const baselines = meta?.league_baselines || {};   // average kicker-game per season (league pull)
  const winLabel = windowMode.toUpperCase();
  const leagueAvgs = meta?.[`league_avgs_${windowMode}`] || {};

  const boardRows = rankings.filter(r => !r.is_bye).map(r => toBoardRow(r, windowMode));

  const ytdRankMap = new Map();
  [...boardRows].sort((a, b) => calcFPts(b, scoring) - calcFPts(a, scoring)).forEach((p, i) => ytdRankMap.set(p.kicker_player_name, i + 1));

  const ppgRankMap = new Map();
  const gamesThreshold = (meta.week - 1) * 0.5;
  [...boardRows]
    .filter(p => p.games > 0 && p.games >= gamesThreshold)
    .sort((a, b) => (calcFPts(b, scoring) / b.games) - (calcFPts(a, scoring) / a.games))
    .forEach((p, i) => ppgRankMap.set(p.kicker_player_name, i + 1));

  // Locked weekly snapshots (projection_results_weekly), grouped by kicker.
  const snapshotsByKicker = new Map();
  for (const h of history) {
    if (!snapshotsByKicker.has(h.gsis_id)) snapshotsByKicker.set(h.gsis_id, []);
    snapshotsByKicker.get(h.gsis_id).push(h);
  }
  // Last-3 trend: the kicker's 3 most recent played weeks before this one. Each
  // projection is rebuilt in the USER's scoring from its locked ingredients, with
  // the model_settings that were in force that week.
  const lastGames = (gsisId) => (snapshotsByKicker.get(gsisId) || [])
    .filter(h => h.played && h.week < meta.week)
    .sort((a, b) => b.week - a.week)
    .slice(0, 3)
    .reverse()
    .map(h => ({
      week: h.week,
      opp: h.opponent,
      proj: calcProjection(h, windowMode, scoring, h.model_settings || settings, baselines[h.season]).proj,
      act: calcFPts(weekKicks(h), scoring),
    }));

  const { active } = lg;
  const myKickers = new Set(active?.myKickers || []);
  const takenKickers = new Set(active?.takenKickers || []);
  const live = liveScores.league === lg.activeId ? liveScores.scores : {};

  let processed = boardRows.map((p) => {
     const calc = calcProjection(p, windowMode, scoring, settings, baselines[p.season]);
     // this week's kicks so far (for the Accuracy tab's live view)
     const thisWeek = (snapshotsByKicker.get(p.gsis_id) || []).find(h => h.week === meta.week);

     const l3_games = lastGames(p.gsis_id);
     const l3_proj_sum = l3_games.reduce((acc, g) => acc + g.proj, 0);
     const l3_act_sum = l3_games.reduce((acc, g) => acc + g.act, 0);

     // his status in the ACTIVE league (none when no league is active)
     let sleeperStatus = null;
     const joinName = p.join_name;
     if (myKickers.has(joinName)) sleeperStatus = 'MY_TEAM';
     else if (takenKickers.has(joinName)) sleeperStatus = 'TAKEN';
     else if (active) sleeperStatus = 'FREE_AGENT';

     // MERGE LIVE SLEEPER SCORE
     let sleeperLive = null;
     const sleeperId = active?.idMap?.[joinName];
     if (sleeperId && live[sleeperId] !== undefined) {
         sleeperLive = live[sleeperId];
     }

     return {
         ...p,
         ...(thisWeek ? wkFields(thisWeek) : {}),
         calc,
         fpts_ytd: calc.fptsSeason,
         avg_pts: calc.avg,
         proj: calc.proj,
         history: { l3_games },
         l3_proj_sum,
         l3_act_sum, 
         acc_diff: l3_act_sum - l3_proj_sum, 
         sleeperStatus,
         ytdRank: ytdRankMap.get(p.kicker_player_name),
         ppgRank: ppgRankMap.get(p.kicker_player_name),
         sleeper_live_score: sleeperLive 
     };
  }).filter(p => p.proj > 0); 

  if (search) {
      const q = search.toLowerCase();
      processed = processed.filter(p => 
          p.kicker_player_name.toLowerCase().includes(q) || 
          (p.team && p.team.toLowerCase().includes(q)) ||
          (q === 'dome' && p.is_dome) ||
          (q === 'cowboys' && p.team === 'DAL') 
      );
  }

  if (sleeperFilter && active) {
      processed = processed.filter(p => p.sleeperStatus === 'MY_TEAM' || p.sleeperStatus === 'FREE_AGENT').sort((a, b) => {
          const aMine = a.sleeperStatus === 'MY_TEAM';
          const bMine = b.sleeperStatus === 'MY_TEAM';
          if (aMine && !bMine) return -1;
          if (!aMine && bMine) return 1;
          
          let valA = sortConfig.key === 'proj' ? (a.calc?.raw ?? a.proj) : a[sortConfig.key];
          let valB = sortConfig.key === 'proj' ? (b.calc?.raw ?? b.proj) : b[sortConfig.key];
          if (sortConfig.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  } else {
     processed.sort((a, b) => {
         let valA = sortConfig.key === 'proj' ? (a.calc?.raw ?? a.proj) : a[sortConfig.key];
         let valB = sortConfig.key === 'proj' ? (b.calc?.raw ?? b.proj) : b[sortConfig.key];
         if (sortConfig.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
         if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
         if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
         return 0;
     });
  }

  if (hideHighOwn) processed = processed.filter(p => (p.own_pct || 0) <= 80);
  if (hideMedOwn) processed = processed.filter(p => (p.own_pct || 0) <= 60);
  
  const calculateLeagueAvg = (arr, key) => {
      if (!arr || arr.length === 0) return 0;
      const sum = arr.reduce((acc, curr) => acc + (parseFloat(curr[key]) || 0), 0);
      return sum / arr.length;
  };

  const top5Ytd = ytd.map(p => ({ ...p, fpts_calc: calcFPts(p, scoring) })).sort((a, b) => b.fpts_calc - a.fpts_calc).slice(0, 5).map(p => p.kicker_player_name);
  processed = processed.map(p => ({ ...p, isTop5: top5Ytd.includes(p.kicker_player_name) }));

  const ytdSorted = ytd.map(p => {
      const pts = calcFPts(p, scoring);
      const pct = (p.fg_att > 0 ? (p.fg_made / p.fg_att * 100) : 0);
      const longMakes = (p.fg_50_59 || 0) + (p.fg_60_plus || 0);
      return { ...p, fpts: pts, avg_fpts: (p.games > 0 ? (pts/p.games) : 0), pct_val: pct, pct: pct.toFixed(1), longs: longMakes };
  }).sort((a, b) => {
      let key = sortConfig.key;
      if (key === 'pct') key = 'pct_val';
      if (key === 'avg_fpts') key = 'avg_fpts';
      let valA = a[key];
      let valB = b[key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const ytdAvgs = { fpts: calculateLeagueAvg(ytdSorted, 'fpts'), avg_fpts: calculateLeagueAvg(ytdSorted, 'avg_fpts'), pct: calculateLeagueAvg(ytdSorted, 'pct_val'), longs: calculateLeagueAvg(ytdSorted, 'longs'), dome_pct: calculateLeagueAvg(ytdSorted, 'dome_pct'), rz_trips: calculateLeagueAvg(ytdSorted, 'rz_trips'), off_stall: calculateLeagueAvg(ytdSorted, 'off_stall_rate_ytd'), def_stall: calculateLeagueAvg(ytdSorted, 'def_stall_rate_ytd') };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2"><img src="/assets/logo.png" alt="KickerGenius" className="w-12 h-12 object-contain" /><h1 className="text-3xl md:text-4xl font-bold text-white">Kicker<span className="text-blue-500">Genius</span></h1></div>
            <p className="text-slate-400 ml-1">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          {/* compact controls: one line (beside the title on wide screens, under it otherwise) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
             <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="h-8 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 rounded flex items-center gap-1.5 border border-amber-500/40 transition-colors font-semibold whitespace-nowrap">☕ Buy me a coffee</a>
             {/* league switcher: every tab uses the active league's scoring + rosters */}
             {lg.leagues.length > 0 && (
               <label className="h-8 bg-slate-800 border border-slate-700 rounded flex items-center gap-1.5 pl-2.5 pr-1 text-white">
                 <Gamepad2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                 <span className="sr-only">Active league</span>
                 <select value={lg.activeId} onChange={(e) => lg.switchLeague(e.target.value)} className="bg-transparent pr-1 font-semibold focus:outline-none max-w-[160px] cursor-pointer">
                   {lg.leagues.map((l) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                   <option value="" className="bg-slate-900">Custom scoring</option>
                 </select>
                 {lg.busy === lg.activeId && lg.activeId && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
               </label>
             )}
             <button onClick={() => goTab('settings')} className="h-8 bg-slate-800 hover:bg-slate-700 text-white px-3 rounded flex items-center gap-1.5 border border-slate-700 transition-colors font-semibold whitespace-nowrap"><Settings className="w-3.5 h-3.5" /> {lg.leagues.length ? 'League Settings' : 'Add your Sleeper league'}</button>
             <div title={`Data last updated ${meta.updated}`} className="h-8 bg-slate-900 border border-slate-800 rounded px-3 flex items-center gap-1.5 whitespace-nowrap text-white font-semibold"><Clock className="w-3.5 h-3.5 text-slate-500" />{shortStamp(meta.updated)} · Wk {meta.week}</div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button onClick={() => { goTab('potential'); setSortConfig({key:'proj', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'potential' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4"/> Week {meta.week} Model</button>
          <button onClick={() => goTab('accuracy')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'accuracy' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><Target className="w-4 h-4"/> Week {meta.week} Accuracy</button>
          <button onClick={() => { goTab('ytd'); setSortConfig({key:'fpts', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'ytd' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}><Activity className="w-4 h-4"/> Historical YTD</button>
          <button onClick={() => goTab('ask')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'ask' ? 'text-white border-b-2 border-sky-400' : 'text-slate-500'}`}><MessageCircleQuestionMark className="w-4 h-4"/> Ask</button>
          <button onClick={() => goTab('injuries')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'injuries' ? 'text-white border-b-2 border-red-500' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Injury Report {injuries.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{injuries.length}</span>}</button>
          <button onClick={() => goTab('glossary')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'glossary' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><BookOpen className="w-4 h-4"/> Stats Legend</button>
        </div>

        {activeTab === 'settings' && ( <SettingsTab lg={lg} season={data.season} windowMode={windowMode} setWindowMode={changeWindow}/> )}

        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-4 justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="(e.g. Aubrey, Cowboys, Dome)" className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="flex items-center gap-4 flex-wrap">
                    {active && ( <button onClick={() => setSleeperFilter(!sleeperFilter)} title={`Only your kicker(s) and free agents in ${active.name}`} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded border transition-all ${sleeperFilter ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}><Bot className="w-3 h-3"/> My team + free agents</button> )}
                    <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white"><input type="checkbox" checked={hideHighOwn} onChange={(e) => setHideHighOwn(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" /> Hide {'>'} 80% Own</label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white"><input type="checkbox" checked={hideMedOwn} onChange={(e) => setHideMedOwn(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" /> Hide {'>'} 60% Own</label>
                </div>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="w-10 px-2 py-3 align-middle text-center">Rank</th>
                    <th 
                      className="px-2 py-3 align-middle text-left cursor-pointer group w-full min-w-[150px]"
                      onClick={() => handleSort('own_pct')}
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortConfig.key === 'own_pct' ? "text-blue-400" : "text-slate-300"}>Player</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </th>
                    <HeaderCell label="Projection" sortKey="proj" currentSort={sortConfig} onSort={handleSort} description="Projected Points (Custom Scoring)" />
                    <HeaderCell label="Matchup Grade" sortKey="grade" currentSort={sortConfig} onSort={handleSort} description={`Offense + Defense (avg ${settings.grade_scale ?? 40} each) + bonuses. Multiplier = grade ÷ ${settings.grade_divisor ?? 90}`} />
                    <th className="px-6 py-3 text-center align-middle">Weather</th>
                    <HeaderCell label={`Offense Red Zone (${winLabel})`} sortKey="off_rz_kp" currentSort={sortConfig} onSort={handleSort} description={`Red-zone kicker points per game (${winLabel}): each red-zone trip that stalls = 3 (a field-goal try), each other trip = 1 (the extra point). Below: trips per game and stall rate.`} avg={leagueAvgs.off_rz_kp} />
                    <HeaderCell label={`Opponent Red Zone (${winLabel})`} sortKey="def_rz_kp" currentSort={sortConfig} onSort={handleSort} description={`Red-zone kicker points per game the opponent ALLOWS (${winLabel}): stalled trip = 3, other trip = 1. Below: trips allowed per game and stall rate forced.`} avg={leagueAvgs.def_rz_kp} />
                    <HeaderCell label="Projection Accuracy (L3)" sortKey="proj_acc" currentSort={sortConfig} onSort={handleSort} description="Total Actual vs Projected Points (Last 3 Games)" />
                    <HeaderCell label="Implied Vegas Score Line" sortKey="vegas" currentSort={sortConfig} onSort={handleSort} description="Implied Team Total (Vegas Line & Spread)/2" />
                    <HeaderCell label={`Offensive PF (${winLabel})`} sortKey="off_ppg" currentSort={sortConfig} onSort={handleSort} description={`Team Points For (${winLabel})`} avg={leagueAvgs.pts} />
                    <HeaderCell label={`Opponent PA (${winLabel})`} sortKey="def_pa" currentSort={sortConfig} onSort={handleSort} description={`Opp Points Allowed (${winLabel})`} avg={leagueAvgs.pts} />
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {processed.map((row, idx) => {
                     const { sleeperStatus } = row;
                     const isDimmed = sleeperFilter && sleeperStatus === 'TAKEN';
                     return (
                        <React.Fragment key={idx}>
                          <tr onClick={() => toggleRow(idx)} className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${isDimmed ? 'opacity-40 grayscale' : ''} ${sleeperStatus === 'MY_TEAM' && sleeperFilter ? 'bg-purple-900/20' : ''}`}>
                            <td className="w-10 px-2 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                            <PlayerCell player={row} subtext={`${row.team} vs ${row.opponent}`} sleeperStatus={sleeperStatus} />
                            <td className={`px-6 py-4 text-center text-lg font-bold ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.proj}</td>
                            <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${row.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>{row.grade}</span></td>
                            <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">{row.weather_desc}</td>
                            <RedZoneCell kp={row.off_rz_kp} trips={row.off_rz_trips} stall={row.off_stall_rate} className="text-blue-300" />
                            <RedZoneCell kp={row.def_rz_kp} trips={row.def_rz_trips} stall={row.def_stall_rate} className="text-slate-300" />
                            <td className="px-6 py-4 text-center"><div className={`text-sm font-bold whitespace-nowrap flex justify-center ${row.l3_act_sum >= row.l3_proj_sum ? 'text-green-400' : 'text-red-400'}`}><span>{row.l3_act_sum ?? 0}</span><span className="mx-1 text-slate-600">/</span><span className="text-slate-500">{row.l3_proj_sum ?? 0}</span></div><div className="text-[9px] text-slate-500 uppercase">Act / Proj</div></td>
                            <td className="px-6 py-4 text-center font-mono text-amber-400">{Number(row.vegas).toFixed(1)}</td>
                            <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.off_ppg).toFixed(1)} {row.off_ppg < 15 && "❄️"}</td>
                            <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.def_pa).toFixed(1)} {row.def_pa < 17 && "🛡️"}</td>
                            <td className="px-6 py-4 text-slate-600">{expandedRow === idx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                          </tr>
                          {expandedRow === idx && <DeepDiveRow player={row} leagueAvgs={leagueAvgs} week={meta.week} settings={settings} sleeperStatus={sleeperStatus}/>}
                        </React.Fragment>
                     );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'accuracy' && <AccuracyTab history={history} season={data.season} week={meta.week} players={processed} scoring={scoring} windowMode={windowMode} sleeperLeagueId={lg.activeId} leagueBaselines={baselines} />}
        
        {activeTab === 'ytd' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-6 py-3 align-middle text-center">Rank</th>
                    <th className="px-6 py-3 align-middle text-left">Player</th>
                    <HeaderCell label="Fantasy Points" sortKey="fpts" currentSort={sortConfig} onSort={handleSort} description="Total Fantasy Points (Custom Scoring)" avg={ytdAvgs.fpts} />
                    <HeaderCell label="Average Fantasy Points" sortKey="avg_fpts" currentSort={sortConfig} onSort={handleSort} description="Average Fantasy Points per Game" avg={ytdAvgs.avg_fpts} />
                    <HeaderCell label="FG (Made/Attempts)" sortKey="pct" currentSort={sortConfig} onSort={handleSort} description="Field Goal Accuracy" avg={ytdAvgs.pct} />
                    <HeaderCell label="50+ FGs" sortKey="longs" currentSort={sortConfig} onSort={handleSort} description="Long Distance Makes" avg={ytdAvgs.longs} />
                    <HeaderCell label="Dome Games (%)" sortKey="dome_pct" currentSort={sortConfig} onSort={handleSort} description="Dome Games Played" avg={ytdAvgs.dome_pct} />
                    <HeaderCell label="FG Red Zone Trips" sortKey="rz_trips" currentSort={sortConfig} onSort={handleSort} description="Drives reaching FG Range" avg={ytdAvgs.rz_trips} />
                    <HeaderCell label="Offense Stall % (Season)" sortKey="off_stall_rate_ytd" currentSort={sortConfig} onSort={handleSort} description="Season-Long Offensive Stall Rate" avg={ytdAvgs.off_stall} />
                    <HeaderCell label="Opponent Stall % (Season)" sortKey="def_stall_rate_ytd" currentSort={sortConfig} onSort={handleSort} description="Strength of schedule: the season-long defensive stall rate of the opponents he has faced" avg={ytdAvgs.def_stall} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ytdSorted.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                      <PlayerCell player={row} subtext={row.team} />
                      <td className="px-6 py-4 text-center font-bold text-emerald-400 text-lg">{row.fpts}</td>
                      <td className="px-6 py-4 text-center"><div className="font-bold text-white">{Number(row.avg_fpts).toFixed(1)}</div><div className="text-[10px] text-slate-500 uppercase font-bold">Games: {row.games}</div></td>
                      <td className="px-6 py-4 text-center"><div className="text-slate-300">{row.fg_made}/{row.fg_att}</div><div className="text-[10px] text-blue-400 font-mono">{row.pct}%</div></td>
                      <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded ${row.longs >= 4 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}>{row.longs}</span></td>
                      <td className="px-6 py-4 text-center text-blue-300">{row.dome_pct}%</td>
                      <td className="px-6 py-4 text-center text-slate-300">{row.rz_trips}</td>
                      <td className="px-6 py-4 text-center font-mono text-blue-300">{row.off_stall_rate_ytd ?? 0}%</td>
                      <td className="px-6 py-4 text-center font-mono text-slate-400">{row.def_stall_rate_ytd ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ask' && <AskTab scoring={scoring} currentSeason={data.season} />}

        {activeTab === 'injuries' && <InjuryReportTab injuries={injuries.map(r => toBoardRow(r, windowMode))} scoring={scoring} />}

        {activeTab === 'glossary' && <GlossaryTab processed={processed} leagueAvgs={leagueAvgs} meta={meta} />}
      </div>
    </div>
  );
};

export default App;