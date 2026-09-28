"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Stethoscope, BookOpen, Settings, AlertTriangle, Loader2, Search, Target, ChevronDown, ChevronUp, Gamepad2, MessageCircleQuestionMark, Clock } from 'lucide-react';

import { BUY_ME_A_COFFEE_URL } from '../data/constants';
import useLeagues from '../utils/useLeagues';
import { buildInsight } from '../utils/insights';
import { TEAMS } from '../utils/askParser';
import { calcFPts, calcProjection, weekKicks, fetchSleeperScores } from '../utils/scoring';
import { HeaderCell, PlayerCell, DeepDiveRow, Hint, KickerCard, MathCard, YtdCard, resultBand, RESULT_STYLE } from '../components/KickerComponents';
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
  <td className="px-4 py-4 text-center">
    {kp != null
      ? <><div className={`font-mono ${className}`}>{Number(kp).toFixed(1)}</div><div className="text-[11px] text-slate-500 whitespace-nowrap">{Number(trips).toFixed(1)} trips · {stall}%</div></>
      : <span className={className}>{stall}%</span>}
  </td>
);

// "2026-09-28 06:00 UTC" -> "Sep 28 06:00 UTC" (header's last-update chip)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortStamp = (s) => {
  const m = /^\d{4}-(\d{2})-(\d{2}) (.*)$/.exec(s || '');
  return m ? `${MONTHS[Number(m[1]) - 1]} ${Number(m[2])} ${m[3]}` : s;
};

// ISO time -> "Sep 28, 5:25 AM" in the visitor's own time zone
const localStamp = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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

// Each tab sorts by its own columns. A key left over from the other tab (after Back /
// Forward, or opening ?tab=ytd directly) falls back to that tab's default.
const BOARD_SORT_KEYS = ['proj', 'grade', 'off_rz_kp', 'def_rz_kp', 'proj_acc', 'vegas', 'off_ppg', 'def_pa'];
const YTD_SORT_KEYS = ['fpts', 'avg_fpts', 'pct', 'longs', 'dome_pct', 'rz_trips', 'off_stall_rate_ytd', 'def_stall_rate_ytd'];
const sortFor = (tab, s) => {
  const [keys, fallback] = tab === 'ytd' ? [YTD_SORT_KEYS, 'fpts'] : [BOARD_SORT_KEYS, 'proj'];
  return keys.includes(s.key) ? s : { key: fallback, direction: 'desc' };
};

// A main tab. Below 1024px: a filled pill with a short name (all 6 always visible);
// 1024px+: the full name, underlined when active.
const TabButton = ({ active, underline, icon: Icon, short, long, badge, onClick }) => (
  <button onClick={onClick} className={`flex items-center justify-center lg:justify-start gap-1.5 lg:gap-2 py-2 lg:pt-0 lg:pb-3 px-2 lg:px-4 text-xs lg:text-sm font-bold whitespace-nowrap rounded-lg lg:rounded-none transition-colors ${active ? `text-white bg-slate-800 lg:bg-transparent lg:border-b-2 ${underline}` : 'text-slate-500 bg-slate-900/60 lg:bg-transparent hover:text-slate-300'}`}>
    <Icon className="w-4 h-4 shrink-0" />
    <span className="lg:hidden">{short}</span><span className="hidden lg:inline">{long}</span>
    {badge}
  </button>
);
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
  const [search, setSearch] = useState('');

  // Sleeper: "my team + free agents" filter, and live scores for the active league
  const [hideTaken, setHideTaken] = useState(false);   // hide kickers rostered by others in the active league
  const [liveScores, setLiveScores] = useState({ league: null, scores: {} });
  // worksheet "Matchup History & News" (/api/insights): loaded separately so it never slows the board
  const [insights, setInsights] = useState(null);


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

  useEffect(() => {   // matchup history + news, in the background
      let cancelled = false;
      fetch('/api/insights')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((j) => { if (!cancelled) setInsights(j || { insights: {}, all: null }); });
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
    const current = sortFor(activeTab, sortConfig);
    if (current.key === key && current.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (rank) => setExpandedRow(expandedRow === rank ? null : rank);

  // error first: when loading fails, data stays null and the spinner would never end
  if (error) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Data Error</h2><p className="text-slate-400 mb-6">{error}</p><p className="text-sm text-slate-600">Could not load the kicker data.</p></div>;
  if (loading || !data) return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8" aria-busy="true">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="flex items-center justify-center sm:justify-start gap-3 mb-6">
          <img src="/assets/logo.png" alt="KickerGenius" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Kicker<span className="text-blue-500">Genius</span></h1>
        </div>
        <div className="flex gap-2 mb-6 justify-center sm:justify-start">{[0, 1, 2].map(i => <div key={i} className="h-8 w-32 rounded bg-slate-800" />)}</div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="h-9 rounded-lg bg-slate-900" />)}</div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-3 w-32 rounded bg-slate-800" /><div className="h-3 w-48 rounded bg-slate-800/70" /></div>
              <div className="w-8 h-7 rounded bg-slate-800" />
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-slate-500 mt-6">Loading this week&apos;s kickers…</p>
      </div>
    </div>
  );

  const { rankings, ytd, injuries, meta, history = [] } = data;
  const settings = meta?.model_settings || {};
  const boardSort = sortFor('potential', sortConfig);
  const ytdSort = sortFor('ytd', sortConfig);
  const baselines = meta?.league_baselines || {};   // average kicker-game per season (league pull)
  const winLabel = windowMode.toUpperCase();
  const leagueAvgs = meta?.[`league_avgs_${windowMode}`] || {};

  const boardRows = rankings.filter(r => !r.is_bye).map(r => toBoardRow(r, windowMode));

  // Season Rank / Avg-per-game Rank: THIS season's real totals (/api/ytd), in the
  // user's scoring. (The board rows' kick buckets are the kicker average -- his last
  // ~34 games across seasons -- so they can't be used for season ranks.)
  const ytdRankMap = new Map();
  [...ytd].sort((a, b) => calcFPts(b, scoring) - calcFPts(a, scoring)).forEach((p, i) => ytdRankMap.set(p.gsis_id, i + 1));
  // this season's points + games per kicker (the Week Model's hover card)
  const seasonStats = new Map(ytd.map((p) => {
    const pts = calcFPts(p, scoring), games = Number(p.games) || 0;
    return [p.gsis_id, { season_pts: pts, season_games: games, season_avg: games ? pts / games : 0 }];
  }));

  const ppgRankMap = new Map();
  const gamesThreshold = (meta.week - 1) * 0.5;
  [...ytd]
    .filter(p => Number(p.games) > 0 && Number(p.games) >= gamesThreshold)
    .sort((a, b) => (calcFPts(b, scoring) / b.games) - (calcFPts(a, scoring) / a.games))
    .forEach((p, i) => ppgRankMap.set(p.gsis_id, i + 1));

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
         ytdRank: ytdRankMap.get(p.gsis_id),
         ppgRank: ppgRankMap.get(p.gsis_id),
         ...(seasonStats.get(p.gsis_id) || { season_pts: 0, season_games: 0, season_avg: 0 }),
         season_kickers: ytd.length,
         // undefined = still loading; otherwise { venue?, own?, news }
         matchup_history: insights ? (buildInsight(insights.insights?.[p.gsis_id], insights.all, scoring, p) || { news: [] }) : undefined,
         sleeper_live_score: sleeperLive,
         // his game this week is over (his kicks are in): shown as FINAL + moved to the bottom
         final_pts: thisWeek?.played ? calcFPts(weekKicks(thisWeek), scoring) : null,
     };
  }).filter(p => p.proj > 0); 

  if (search) {
      const q = search.trim().toLowerCase();
      // "Bills", "buffalo", "green bay", "BUF" -> the team (names from the Ask tab's list)
      const teams = new Set(TEAMS.filter(t => t.abbr.toLowerCase() === q ||
          (q.length >= 3 && (t.nick.toLowerCase().includes(q) || t.names.some(n => n.includes(q))))).map(t => t.abbr));
      processed = processed.filter(p =>
          p.kicker_player_name.toLowerCase().includes(q) ||
          teams.has(p.team) ||
          (q === 'dome' && p.is_dome)
      );
  }

  if (hideTaken && active) {
      processed = processed.filter(p => p.sleeperStatus === 'MY_TEAM' || p.sleeperStatus === 'FREE_AGENT').sort((a, b) => {
          const aMine = a.sleeperStatus === 'MY_TEAM';
          const bMine = b.sleeperStatus === 'MY_TEAM';
          if (aMine && !bMine) return -1;
          if (!aMine && bMine) return 1;
          
          let valA = boardSort.key === 'proj' ? (a.calc?.raw ?? a.proj) : a[boardSort.key];
          let valB = boardSort.key === 'proj' ? (b.calc?.raw ?? b.proj) : b[boardSort.key];
          if (boardSort.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
          if (valA < valB) return boardSort.direction === 'asc' ? -1 : 1;
          if (valA > valB) return boardSort.direction === 'asc' ? 1 : -1;
          return 0;
      });
  } else {
     processed.sort((a, b) => {
         let valA = boardSort.key === 'proj' ? (a.calc?.raw ?? a.proj) : a[boardSort.key];
         let valB = boardSort.key === 'proj' ? (b.calc?.raw ?? b.proj) : b[boardSort.key];
         if (boardSort.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
         if (valA < valB) return boardSort.direction === 'asc' ? -1 : 1;
         if (valA > valB) return boardSort.direction === 'asc' ? 1 : -1;
         return 0;
     });
  }
  processed = [...processed.filter(p => p.final_pts == null), ...processed.filter(p => p.final_pts != null)];

  
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
      return { ...p, fpts: pts, avg_fpts: (p.games > 0 ? (pts/p.games) : 0), pct_val: pct, pct: pct.toFixed(1), longs: longMakes,
        season_pts: pts, season_games: Number(p.games) || 0, season_avg: p.games > 0 ? pts / p.games : 0,
        ytdRank: ytdRankMap.get(p.gsis_id), ppgRank: ppgRankMap.get(p.gsis_id), season_kickers: ytd.length };
  }).sort((a, b) => {
      let key = ytdSort.key;
      if (key === 'pct') key = 'pct_val';
      if (key === 'avg_fpts') key = 'avg_fpts';
      let valA = a[key];
      let valB = b[key];
      if (valA < valB) return ytdSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return ytdSort.direction === 'asc' ? 1 : -1;
      return 0;
  });

  const ytdAvgs = { fpts: calculateLeagueAvg(ytdSorted, 'fpts'), avg_fpts: calculateLeagueAvg(ytdSorted, 'avg_fpts'), pct: calculateLeagueAvg(ytdSorted, 'pct_val'), longs: calculateLeagueAvg(ytdSorted, 'longs'), dome_pct: calculateLeagueAvg(ytdSorted, 'dome_pct'), rz_trips: calculateLeagueAvg(ytdSorted, 'rz_trips'), off_stall: calculateLeagueAvg(ytdSorted, 'off_stall_rate_ytd'), def_stall: calculateLeagueAvg(ytdSorted, 'def_stall_rate_ytd') };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-3 sm:mb-2"><img src="/assets/logo.png" alt="KickerGenius" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" /><h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Kicker<span className="text-blue-500">Genius</span></h1></div>
            <p className="hidden sm:block text-slate-400 ml-1">Kicker projections built for your league&apos;s scoring</p>
          </div>
          {/* compact controls: one line from 640px (beside the title on wide screens); on phones a centred block: coffee + settings side by side, league switcher, then the update pill */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-wrap sm:items-center">
             <a href={BUY_ME_A_COFFEE_URL} target="_blank" rel="noopener noreferrer" className="order-1 h-9 sm:h-8 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 rounded flex items-center justify-center gap-1.5 border border-amber-500/40 transition-colors font-semibold whitespace-nowrap">☕ Buy me a coffee</a>
             {/* league switcher: every tab uses the active league's scoring + rosters */}
             {lg.leagues.length > 0 && (
               <label className="order-3 sm:order-2 col-span-2 h-9 sm:h-8 bg-slate-800 border border-slate-700 rounded flex items-center justify-center gap-1.5 pl-2.5 pr-1 text-white">
                 <Gamepad2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                 <span className="sr-only">Active league</span>
                 <select value={lg.activeId} onChange={(e) => lg.switchLeague(e.target.value)} className="bg-transparent pr-1 font-semibold focus:outline-none max-w-[240px] sm:max-w-[160px] cursor-pointer">
                   {lg.leagues.map((l) => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                   <option value="" className="bg-slate-900">Custom scoring</option>
                 </select>
                 {lg.busy === lg.activeId && lg.activeId && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
               </label>
             )}
             <button onClick={() => goTab('settings')} className="order-2 sm:order-3 h-9 sm:h-8 bg-slate-800 hover:bg-slate-700 text-white px-3 rounded flex items-center justify-center gap-1.5 border border-slate-700 transition-colors font-semibold whitespace-nowrap"><Settings className="w-3.5 h-3.5" /> {lg.leagues.length ? 'League Settings' : <><span className="sm:hidden">Add Sleeper league</span><span className="hidden sm:inline">Add your Sleeper league</span></>}</button>
             <div title={`Data last updated ${meta.updated}`} className="order-4 col-span-2 justify-self-center sm:justify-self-auto h-8 bg-slate-900 border border-slate-800 rounded-full sm:rounded px-3 flex items-center gap-1.5 whitespace-nowrap text-white font-semibold"><Clock className="w-3.5 h-3.5 text-slate-500" />{localStamp(meta.updated_iso) || shortStamp(meta.updated)} · Wk {meta.week}</div>
          </div>
        </div>

        {/* tabs: short-name pills (3x2 on phones, 6 across on foldables/tablets); full underlined names from 1024px (they need ~920px) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mb-5 lg:flex lg:gap-2 lg:mb-6 lg:border-b lg:border-slate-800 lg:pb-1 lg:overflow-x-auto">
          <TabButton active={activeTab === 'potential'} underline="lg:border-emerald-500" icon={TrendingUp} short="Model" long={`Week ${meta.week} Model`} onClick={() => { goTab('potential'); setSortConfig({key:'proj', direction:'desc'}); }} />
          <TabButton active={activeTab === 'accuracy'} underline="lg:border-purple-500" icon={Target} short="Accuracy" long="Accuracy" onClick={() => goTab('accuracy')} />
          <TabButton active={activeTab === 'ytd'} underline="lg:border-blue-500" icon={Activity} short="YTD" long="Historical YTD" onClick={() => { goTab('ytd'); setSortConfig({key:'fpts', direction:'desc'}); }} />
          <TabButton active={activeTab === 'ask'} underline="lg:border-sky-400" icon={MessageCircleQuestionMark} short="Ask" long="Ask" onClick={() => goTab('ask')} />
          <TabButton active={activeTab === 'injuries'} underline="lg:border-red-500" icon={Stethoscope} short="Injuries" long="Injury Report" onClick={() => goTab('injuries')}
            badge={injuries.length > 0 && <span className="bg-red-500 text-white text-[11px] px-1.5 rounded-full">{injuries.length}</span>} />
          <TabButton active={activeTab === 'glossary'} underline="lg:border-purple-500" icon={BookOpen} short="Legend" long="Stats Legend" onClick={() => goTab('glossary')} />
        </div>

        {activeTab === 'settings' && ( <SettingsTab lg={lg} season={data.season} windowMode={windowMode} setWindowMode={changeWindow}/> )}

        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-4 justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="(e.g. Aubrey, Cowboys, Dome)" className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* phones have no column headers to tap, so sort from here */}
                    <label className="md:hidden flex items-center gap-2 text-sm text-slate-400">Sort
                      <select value={boardSort.key} onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
                        <option value="proj">Projection</option>
                        <option value="grade">Matchup grade</option>
                        <option value="vegas">Vegas implied</option>
                        <option value="off_rz_kp">Offense red zone</option>
                        <option value="def_rz_kp">Opponent red zone</option>
                        <option value="proj_acc">Last 3 vs projected</option>
                      </select>
                    </label>
                    <span className="hidden md:inline text-[11px] text-slate-500">Click a kicker for his worksheet</span>
                    <Hint side="left" text={active ? `Hide kickers on other teams in ${active.name} (yours stay, listed first)` : 'Add a Sleeper league in League Settings to hide kickers who are already taken'}>
                      <label className={`flex items-center gap-2 text-sm ${active ? 'text-slate-300 cursor-pointer hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}><input type="checkbox" disabled={!active} checked={hideTaken && !!active} onChange={(e) => setHideTaken(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" /> Hide taken</label>
                    </Hint>
                </div>
             </div>
             {/* PHONES: a card per kicker; tap for the worksheet */}
             <div className="md:hidden grid sm:grid-cols-2 gap-px bg-slate-800">
               {processed.map((row, idx) => (
                 <KickerCard key={row.gsis_id || idx} row={row} rank={idx + 1} expanded={expandedRow === idx} onToggle={() => toggleRow(idx)} highlight={row.sleeperStatus === 'MY_TEAM' && hideTaken}>
                   <MathCard player={row} leagueAvgs={leagueAvgs} week={meta.week} settings={settings} />
                 </KickerCard>
               ))}
               {processed.length === 0 && <div className="p-8 text-center text-sm text-slate-500 bg-slate-900 sm:col-span-2">No kickers match.</div>}
             </div>
             {/* TABLETS + COMPUTERS: the full table */}
             <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="w-10 px-2 py-3 align-middle text-center">Rank</th>
                    <th className="px-2 py-3 align-middle text-left min-w-[150px] text-slate-300">Player</th>
                    <HeaderCell label="Projection" sortKey="proj" currentSort={boardSort} onSort={handleSort} description="Projected fantasy points in your league's scoring (whole numbers)" />
                    <HeaderCell label="Matchup Grade" sortKey="grade" currentSort={boardSort} onSort={handleSort} description={`Offense + Defense (avg ${settings.grade_scale ?? 40} each) + bonuses. Multiplier = grade ÷ ${settings.grade_divisor ?? 90}`} />
                    <HeaderCell label="Weather" description="Kickoff forecast (actual conditions once played): sky, wind and temperature. Dome / closed roof = +10 grade; outdoors at 40°F or below = −20." />
                    <HeaderCell label={`Offense Red Zone (${winLabel})`} sortKey="off_rz_kp" currentSort={boardSort} onSort={handleSort} description={`Red-zone kicker points per game (${winLabel}): each red-zone trip that stalls = 3 (a field-goal try), each other trip = 1 (the extra point). Below: trips per game and stall rate.`} avg={leagueAvgs.off_rz_kp} />
                    <HeaderCell label={`Opponent Red Zone (${winLabel})`} sortKey="def_rz_kp" currentSort={boardSort} onSort={handleSort} description={`Red-zone kicker points per game the opponent ALLOWS (${winLabel}): stalled trip = 3, other trip = 1. Below: trips allowed per game and stall rate forced.`} avg={leagueAvgs.def_rz_kp} />
                    <HeaderCell label="Last 3: Act / Proj" sortKey="proj_acc" currentSort={boardSort} onSort={handleSort} description="His last 3 games: points scored vs what we projected (your scoring). Green = he scored at least the projection." />
                    <HeaderCell label="Vegas Team Total" sortKey="vegas" currentSort={boardSort} onSort={handleSort} description="Points Vegas expects his team to score: (game total ± spread) ÷ 2" />
                    <HeaderCell tipAlign="right" label={`Offensive PF (${winLabel})`} sortKey="off_ppg" currentSort={boardSort} onSort={handleSort} description={`His team's average points scored (${winLabel}). ❄️ = under 15 per game`} avg={leagueAvgs.pts} />
                    <HeaderCell tipAlign="right" label={`Opponent PA (${winLabel})`} sortKey="def_pa" currentSort={boardSort} onSort={handleSort} description={`Points the opponent allows per game (${winLabel}). 🛡️ = under 17 per game`} avg={leagueAvgs.pts} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {processed.map((row, idx) => {
                     const { sleeperStatus } = row;

                     return (
                        <React.Fragment key={idx}>
                          <tr onClick={() => toggleRow(idx)} tabIndex={0} aria-expanded={expandedRow === idx} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(idx); } }} className={`hover:bg-slate-800/50 focus:outline-none focus-visible:bg-slate-800/70 cursor-pointer transition-colors ${row.final_pts != null ? 'opacity-80' : ''} ${sleeperStatus === 'MY_TEAM' && hideTaken ? 'bg-purple-900/20' : ''}`}>
                            <td className="w-10 px-2 py-4 font-mono text-slate-500 text-center">#{idx + 1}<div className="flex justify-center text-slate-600 mt-1">{expandedRow === idx ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</div></td>
                            <PlayerCell player={row} subtext={`${row.team} vs ${row.opponent}`} sleeperStatus={sleeperStatus} />
                            <td className={`px-4 py-4 text-center text-lg font-bold ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.final_pts != null
                              ? <div className="leading-tight"><div className="text-[11px] font-bold uppercase text-slate-400">Final</div><div className={RESULT_STYLE[resultBand(row.final_pts, row.proj)].text} title={RESULT_STYLE[resultBand(row.final_pts, row.proj)].label}>{Math.round(row.final_pts * 10) / 10}{RESULT_STYLE[resultBand(row.final_pts, row.proj)].fire ? ' 🔥' : ''}</div><div className="text-[11px] font-normal text-slate-500">proj {row.proj}</div></div>
                              : row.proj}</td>
                            <td className="px-4 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${row.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>{row.grade}</span></td>
                            <td className="px-4 py-4 text-center text-xs font-mono text-slate-400">{row.weather_desc}</td>
                            <RedZoneCell kp={row.off_rz_kp} trips={row.off_rz_trips} stall={row.off_stall_rate} className="text-blue-300" />
                            <RedZoneCell kp={row.def_rz_kp} trips={row.def_rz_trips} stall={row.def_stall_rate} className="text-slate-300" />
                            <td className="px-4 py-4 text-center"><div className={`text-sm font-bold whitespace-nowrap flex justify-center ${row.l3_act_sum >= row.l3_proj_sum ? 'text-green-400' : 'text-red-400'}`}><span>{row.l3_act_sum ?? 0}</span><span className="mx-1 text-slate-600">/</span><span className="text-slate-500">{row.l3_proj_sum ?? 0}</span></div><div className="text-[11px] text-slate-500 uppercase">Act / Proj</div></td>
                            <td className="px-4 py-4 text-center font-mono text-amber-400">{Number(row.vegas).toFixed(1)}</td>
                            <td className="px-4 py-4 text-center font-mono text-slate-300">{Number(row.off_ppg).toFixed(1)} {row.off_ppg < 15 && <Hint side="left" text={`Cold offense: his team averages under 15 points per game (${winLabel})`}>❄️</Hint>}</td>
                            <td className="px-4 py-4 text-center font-mono text-slate-300">{Number(row.def_pa).toFixed(1)} {row.def_pa < 17 && <Hint side="left" text={`Tough defense: the opponent allows under 17 points per game (${winLabel})`}>🛡️</Hint>}</td>
                          </tr>
                          {expandedRow === idx && <DeepDiveRow player={row} leagueAvgs={leagueAvgs} week={meta.week} settings={settings}/>}
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
             {/* PHONES: a card per kicker + sort */}
             <div className="md:hidden">
               <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-sm text-slate-400">
                 <label className="flex items-center gap-2">Sort
                   <select value={ytdSort.key} onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
                     <option value="fpts">Fantasy points</option>
                     <option value="avg_fpts">Points per game</option>
                     <option value="pct">FG %</option>
                     <option value="longs">50+ FGs</option>
                     <option value="dome_pct">Dome games</option>
                     <option value="rz_trips">Red zone trips</option>
                     <option value="off_stall_rate_ytd">Offense stall %</option>
                     <option value="def_stall_rate_ytd">Opponent stall %</option>
                   </select>
                 </label>
               </div>
               <div className="grid sm:grid-cols-2 gap-px bg-slate-800">
                 {ytdSorted.map((row, idx) => <YtdCard key={row.gsis_id || idx} row={row} rank={idx + 1} />)}
               </div>
             </div>
             {/* TABLETS + COMPUTERS: the full table */}
             <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 align-middle text-center">Rank</th>
                    <th className="px-4 py-3 align-middle text-left">Player</th>
                    <HeaderCell label="Fantasy Points" sortKey="fpts" currentSort={ytdSort} onSort={handleSort} description="Total Fantasy Points (Custom Scoring)" avg={ytdAvgs.fpts} />
                    <HeaderCell label="Average Fantasy Points" sortKey="avg_fpts" currentSort={ytdSort} onSort={handleSort} description="Average Fantasy Points per Game" avg={ytdAvgs.avg_fpts} />
                    <HeaderCell label="FG (Made/Attempts)" sortKey="pct" currentSort={ytdSort} onSort={handleSort} description="Field Goal Accuracy" avg={ytdAvgs.pct} />
                    <HeaderCell label="50+ FGs" sortKey="longs" currentSort={ytdSort} onSort={handleSort} description="Long Distance Makes" avg={ytdAvgs.longs} />
                    <HeaderCell label="Dome Games (%)" sortKey="dome_pct" currentSort={ytdSort} onSort={handleSort} description="Dome Games Played" avg={ytdAvgs.dome_pct} />
                    <HeaderCell label="Red Zone Trips" sortKey="rz_trips" currentSort={ytdSort} onSort={handleSort} description="His team's drives that reached the opponent's 25, in his games this season" avg={ytdAvgs.rz_trips} />
                    <HeaderCell tipAlign="right" label="Offense Stall % (Season)" sortKey="off_stall_rate_ytd" currentSort={ytdSort} onSort={handleSort} description="Season-Long Offensive Stall Rate" avg={ytdAvgs.off_stall} />
                    <HeaderCell tipAlign="right" label="Opponent Stall % (Season)" sortKey="def_stall_rate_ytd" currentSort={ytdSort} onSort={handleSort} description="Strength of schedule: the season-long defensive stall rate of the opponents he has faced" avg={ytdAvgs.def_stall} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ytdSorted.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                      <PlayerCell player={row} subtext={row.team} />
                      <td className="px-4 py-4 text-center font-bold text-emerald-400 text-lg">{row.fpts}</td>
                      <td className="px-4 py-4 text-center"><div className="font-bold text-white">{Number(row.avg_fpts).toFixed(1)}</div><div className="text-[11px] text-slate-500 uppercase font-bold">Games: {row.games}</div></td>
                      <td className="px-4 py-4 text-center"><div className="text-slate-300">{row.fg_made}/{row.fg_att}</div><div className="text-[11px] text-blue-400 font-mono">{row.pct}%</div></td>
                      <td className="px-4 py-4 text-center"><span className={`px-2 py-1 rounded ${row.longs >= 4 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}>{row.longs}</span></td>
                      <td className="px-4 py-4 text-center text-blue-300">{row.dome_pct}%</td>
                      <td className="px-4 py-4 text-center text-slate-300">{row.rz_trips}</td>
                      <td className="px-4 py-4 text-center font-mono text-blue-300">{row.off_stall_rate_ytd ?? 0}%</td>
                      <td className="px-4 py-4 text-center font-mono text-slate-400">{row.def_stall_rate_ytd ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ask' && <AskTab scoring={scoring} currentSeason={data.season} />}

        {activeTab === 'injuries' && <InjuryReportTab injuries={injuries.map(r => ({ ...toBoardRow(r, windowMode), ...(seasonStats.get(r.gsis_id) || {}) }))} />}

        {activeTab === 'glossary' && <GlossaryTab processed={processed} leagueAvgs={leagueAvgs} meta={meta} />}
      </div>
    </div>
  );
};

export default App;