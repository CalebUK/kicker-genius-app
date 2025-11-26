import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Stethoscope, BookOpen, Settings, AlertTriangle, Loader2, Search, Filter, Target, ArrowUpDown, Calculator, Database, ChevronDown, ChevronUp } from 'lucide-react';
import { Gamepad2, BrainCircuit, ShieldAlert, UserMinus, RotateCcw, AlertTriangle as AlertTriangleIcon } from 'lucide-react'; // Imports for use in functions/rendering

import { GLOSSARY_DATA, DEFAULT_SCORING } from './data/constants';
import { calcFPts, calcProj } from './utils/scoring';
import { HeaderCell, PlayerCell, DeepDiveRow, InjuryCard } from './components/KickerComponents';
import AccuracyTab from './components/AccuracyTab';
import SettingsTab from './components/SettingsTab';


// --- MAIN APP COMPONENT ---
const App = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('potential');
  const [expandedRow, setExpandedRow] = useState(null);
  const [scoring, setScoring] = useState(DEFAULT_SCORING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [sortConfig, setSortConfig] = useState({ key: 'proj', direction: 'desc' });
  const [hideHighOwn, setHideHighOwn] = useState(false);
  const [hideMedOwn, setHideMedOwn] = useState(false);
  const [search, setSearch] = useState('');

  // Sleeper State
  const [sleeperLeagueId, setSleeperLeagueId] = useState('');
  const [sleeperUser, setSleeperUser] = useState('');
  const [sleeperMyKickers, setSleeperMyKickers] = useState(new Set());
  const [sleeperTakenKickers, setSleeperTakenKickers] = useState(new Set());
  const [sleeperLoading, setSleeperLoading] = useState(false);
  const [sleeperFilter, setSleeperFilter] = useState(false);
  const [sleeperScoringUpdated, setSleeperScoringUpdated] = useState(false);

  useEffect(() => {
    // Load local storage items
    const savedScoring = localStorage.getItem('kicker_scoring');
    const savedLeagueId = localStorage.getItem('sleeper_league_id');
    const savedUser = localStorage.getItem('sleeper_username');
    
    if (savedScoring) { try { setScoring({ ...DEFAULT_SCORING, ...JSON.parse(savedScoring) }); } catch (e) { console.error(e); } }
    if (savedLeagueId) setSleeperLeagueId(savedLeagueId);
    if (savedUser) setSleeperUser(savedUser);

    // Fetch live data
    fetch('/kicker_data.json?v=' + new Date().getTime())
      .then(res => { if(!res.ok) throw new Error(res.status); return res.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const updateScoring = (key, val) => {
    const numVal = val === '' ? 0 : parseFloat(val);
    const newScoring = { ...scoring, [key]: numVal };
    setScoring(newScoring);
    localStorage.setItem('kicker_scoring', JSON.stringify(newScoring));
  };
  
  const resetScoring = () => {
    setScoring(DEFAULT_SCORING);
    localStorage.setItem('kicker_scoring', JSON.stringify(DEFAULT_SCORING));
  };

  const syncSleeper = async () => {
      if (!sleeperLeagueId) return;
      setSleeperLoading(true);
      setSleeperScoringUpdated(false);
      try {
          const leagueRes = await fetch(`https://api.sleeper.app/v1/league/${sleeperLeagueId}`);
          if (!leagueRes.ok) throw new Error("League Not Found");
          const leagueData = await leagueRes.json();
          
          if (leagueData.scoring_settings) {
             const s = leagueData.scoring_settings;
             const newScoring = { fg0_19: s.fgm_0_19 || 3, fg20_29: s.fgm_20_29 || 3, fg30_39: s.fgm_30_39 || 3, fg40_49: s.fgm_40_49 || 4, fg50_59: s.fgm_50_plus || 5, fg60_plus: s.fgm_50_plus || 5, fg_miss: s.fgmiss || 0, xp_made: s.xpm || 1, xp_miss: s.xpmiss || 0 };
             setScoring(newScoring);
             localStorage.setItem('kicker_scoring', JSON.stringify(newScoring));
             setSleeperScoringUpdated(true);
          }

          let myUserId = null;
          if (sleeperUser) {
             const usersRes = await fetch(`https://api.sleeper.app/v1/league/${sleeperLeagueId}/users`);
             const users = await usersRes.json();
             const me = users.find(u => u.display_name.toLowerCase() === sleeperUser.toLowerCase());
             if (me) myUserId = me.user_id;
          }

          const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${sleeperLeagueId}/rosters`);
          const rosters = await rostersRes.json();
          const playersRes = await fetch('https://api.sleeper.app/v1/players/nfl'); 
          const allPlayers = await playersRes.json();

          const mySet = new Set();
          const takenSet = new Set();

          rosters.forEach(roster => {
              const isMine = roster.owner_id === myUserId;
              roster.players.forEach(playerId => {
                  const player = allPlayers[playerId];
                  if (player && player.position === 'K') {
                      const first = player.first_name.charAt(0);
                      const last = player.last_name;
                      const joinName = `${first}.${last}`;
                      if (isMine) mySet.add(joinName);
                      else takenSet.add(joinName);
                  }
              });
          });

          setSleeperMyKickers(mySet);
          setSleeperTakenKickers(takenSet);
          localStorage.setItem('sleeper_league_id', sleeperLeagueId);
          localStorage.setItem('sleeper_username', sleeperUser);
          setSleeperLoading(false);
      } catch (err) {
          console.error("Sleeper Sync Failed", err);
          setSleeperLoading(false);
          alert("Failed to sync Sleeper league. Check League ID.");
      }
  };


  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (rank) => setExpandedRow(expandedRow === rank ? null : rank);

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" /><p>Loading...</p></div>;
  if (error || !data) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Data Not Found</h2><p className="text-slate-400 mb-6">{error}</p><p className="text-sm text-slate-600">Check /public/kicker_data.json on GitHub.</p></div>;

  const { rankings, ytd, injuries, meta } = data;
  const leagueAvgs = meta?.league_avgs || {};
  
  let processed = rankings.map(p => {
     const pWithVegas = { ...p, vegas: p.vegas_implied || 0 }; 
     const ytdPts = calcFPts(pWithVegas, scoring);
     const pWithYtd = { ...pWithVegas, fpts_ytd: ytdPts };
     const proj = calcProj(pWithYtd, p.grade);
     
     const l3_games = p.history?.l3_games || [];
     const l3_proj_sum = l3_games.reduce((acc, g) => acc + Math.round(Number(g.proj)), 0);
     const l3_act_sum = l3_games.reduce((acc, g) => acc + Number(g.act), 0); 

     const teamCode = p.team || '';
     let sleeperStatus = null;
     if (sleeperMyKickers.has(p.join_name)) sleeperStatus = 'MY_TEAM';
     else if (sleeperTakenKickers.has(p.join_name)) sleeperStatus = 'TAKEN';
     else if (sleeperLeagueId) sleeperStatus = 'FREE_AGENT';


     return { ...pWithYtd, proj: parseFloat(proj), l3_proj_sum, l3_act_sum, acc_diff: l3_act_sum - l3_proj_sum, sleeperStatus };
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
  
  if (sleeperFilter && sleeperLeagueId) {
      processed = processed.filter(p => p.sleeperStatus === 'MY_TEAM' || p.sleeperStatus === 'FREE_AGENT').sort((a, b) => {
          const aMine = a.sleeperStatus === 'MY_TEAM';
          const bMine = b.sleeperStatus === 'MY_TEAM';
          if (aMine && !bMine) return -1;
          if (!aMine && bMine) return 1;

          let valA = a[sortConfig.key];
          let valB = b[sortConfig.key];
          if (sortConfig.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
  } else {
     processed.sort((a, b) => {
         let valA = a[sortConfig.key];
         let valB = b[sortConfig.key];
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

  const bucketQuestionable = injuries.filter(k => k.injury_status === 'Questionable');
  const bucketOutDoubtful = injuries.filter(k => ['OUT', 'Doubtful', 'Inactive'].includes(k.injury_status));
  const bucketRest = injuries.filter(k => ['IR', 'CUT', 'Practice Squad'].includes(k.injury_status) || k.injury_status.includes('Roster'));

  const aubreyExample = processed.find(p => p.kicker_player_name.includes('Aubrey')) || processed[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2"><img src="/assets/logo.png" alt="KickerGenius" className="w-12 h-12 object-contain" /><h1 className="text-3xl md:text-4xl font-bold text-white">Kicker<span className="text-blue-500">Genius</span></h1></div>
            <p className="text-slate-400 ml-1">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setActiveTab('settings')} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 border border-slate-700 transition-colors"><Settings className="w-4 h-4" /> League Settings</button>
             <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-3 shadow-sm px-4"><div className="text-right"><div className="text-[10px] text-slate-500 uppercase font-bold">Last Update</div><div className="text-xs font-semibold text-white">{meta.updated} (Week {meta.week})</div></div></div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button onClick={() => { setActiveTab('potential'); setSortConfig({key:'proj', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'potential' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4"/> Week {meta.week} Model</button>
          <button onClick={() => { setActiveTab('accuracy'); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'accuracy' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><Target className="w-4 h-4"/> Week {meta.week} Accuracy</button>
          <button onClick={() => { setActiveTab('ytd'); setSortConfig({key:'fpts', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'ytd' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}><Activity className="w-4 h-4"/> Historical YTD</button>
          <button onClick={() => setActiveTab('injuries')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'injuries' ? 'text-white border-b-2 border-red-500' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Injury Report {injuries.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{injuries.length}</span>}</button>
          <button onClick={() => setActiveTab('glossary')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'glossary' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><BookOpen className="w-4 h-4"/> Stats Legend</button>
        </div>

        {/* TABS */}
        {activeTab === 'settings' && ( <SettingsTab scoring={scoring} updateScoring={updateScoring} resetScoring={resetScoring} sleeperLeagueId={sleeperLeagueId} setSleeperLeagueId={setSleeperLeagueId} sleeperUser={sleeperUser} setSleeperUser={setSleeperUser} syncSleeper={syncSleeper} sleeperLoading={sleeperLoading} sleeperScoringUpdated={sleeperScoringUpdated} sleeperMyKickers={sleeperMyKickers}/> )}

        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-4 justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="(e.g. Aubrey, Cowboys, Dome)" className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                <div className="flex items-center gap-4 flex-wrap">
                    {sleeperMyKickers.size > 0 && ( <button onClick={() => setSleeperFilter(!sleeperFilter)} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded border transition-all ${sleeperFilter ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}><Gamepad2 className="w-3 h-3"/> Sleeper Avail</button> )}
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
                    <th className="px-2 py-3 align-middle text-left cursor-pointer group w-full min-w-[150px]" onClick={() => handleSort('own_pct')}><div className="flex items-center gap-1"><span className={sortConfig.key === 'own_pct' ? "text-blue-400" : "text-slate-300"}>Player</span><ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" /></div></th>
                    <HeaderCell label="Projection" sortKey="proj" currentSort={sortConfig} onSort={handleSort} description="Projected Points (Custom Scoring)" />
                    <HeaderCell label="Matchup Grade" sortKey="grade" currentSort={sortConfig} onSort={handleSort} description="Matchup Grade (Baseline 90)" />
                    <th className="px-6 py-3 text-center align-middle">Weather</th>
                    <HeaderCell label="Offensive Stall % (L4)" sortKey="off_stall_rate" currentSort={sortConfig} onSort={handleSort} description="Offense Stall Rate (L4)" avg={leagueAvgs.off_stall} />
                    <HeaderCell label="Opponent Stall % (L4)" sortKey="def_stall_rate" currentSort={sortConfig} onSort={handleSort} description="Opponent Force Rate (L4)" avg={leagueAvgs.def_stall} />
                    <HeaderCell label="Projection Accuracy (L3)" sortKey="proj_acc" currentSort={sortConfig} onSort={handleSort} description="Total Actual vs Projected Points (Last 3 Games)" />
                    <HeaderCell label="Implied Vegas Score Line" sortKey="vegas" currentSort={sortConfig} onSort={handleSort} description="Implied Team Total (Vegas Line & Spread)/2" />
                    <HeaderCell label="Offensive PF (L4)" sortKey="off_ppg" currentSort={sortConfig} onSort={handleSort} description="Team Points For (L4)" avg={leagueAvgs.l4_off_ppg} />
                    <HeaderCell label="Opponent PA (L4)" sortKey="def_pa" currentSort={sortConfig} onSort={handleSort} description="Opp Points Allowed (L4)" avg={leagueAvgs.l4_def_pa} />
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {processed.map((row, idx) => {
                     let sleeperStatus = null;
                     if (sleeperMyKickers.has(row.join_name)) sleeperStatus = 'MY_TEAM';
                     else if (sleeperTakenKickers.has(row.join_name)) sleeperStatus = 'TAKEN';
                     else if (sleeperLeagueId) sleeperStatus = 'FREE_AGENT';
                     const isDimmed = sleeperFilter && sleeperStatus === 'TAKEN';
                     return (
                        <React.Fragment key={idx}>
                          <tr onClick={() => toggleRow(idx)} className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${isDimmed ? 'opacity-40 grayscale' : ''} ${sleeperStatus === 'MY_TEAM' && sleeperFilter ? 'bg-purple-900/20' : ''}`}>
                            <td className="w-10 px-2 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                            <PlayerCell player={row} subtext={`${row.team} vs ${row.opponent}`} sleeperStatus={sleeperStatus} />
                            <td className={`px-6 py-4 text-center text-lg font-bold ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.proj}</td>
                            <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${row.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>{row.grade}</span></td>
                            <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">{row.weather_desc}</td>
                            <td className="px-6 py-4 text-center text-blue-300">{row.off_stall_rate}%</td>
                            <td className="px-6 py-4 text-center text-slate-400">{row.def_stall_rate}%</td>
                            <td className="px-6 py-4 text-center"><div className={`text-sm font-bold whitespace-nowrap flex justify-center ${row.l3_act_sum >= row.l3_proj_sum ? 'text-green-400' : 'text-red-400'}`}><span>{row.l3_act_sum ?? 0}</span><span className="mx-1 text-slate-600">/</span><span className="text-slate-500">{row.l3_proj_sum ?? 0}</span></div><div className="text-[9px] text-slate-500 uppercase">Act / Proj</div></td>
                            <td className="px-6 py-4 text-center font-mono text-amber-400">{Number(row.vegas).toFixed(1)}</td>
                            <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.off_ppg).toFixed(1)} {row.off_ppg < 15 && "❄️"}</td>
                            <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.def_pa).toFixed(1)} {row.def_pa < 17 && "🛡️"}</td>
                            <td className="px-6 py-4 text-slate-600">{expandedRow === idx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                          </tr>
                          {expandedRow === idx && <DeepDiveRow player={row} leagueAvgs={leagueAvgs} week={meta.week} />}
                        </React.Fragment>
                     );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'accuracy' && <AccuracyTab players={processed} scoring={scoring} week={meta.week} />}
        
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
                    <HeaderCell label="Opponent Stall % (Season)" sortKey="def_stall_rate_ytd" currentSort={sortConfig} onSort={handleSort} description="Season-Long Defensive Stall Rate (Team's own defense)" avg={ytdAvgs.def_stall} />
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

        {activeTab === 'injuries' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {bucketQuestionable.length > 0 && ( <div className="bg-yellow-900/20 rounded-xl border border-yellow-800/50 overflow-hidden"><div className="p-4 bg-yellow-900/40 border-b border-yellow-800/50 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" /><h3 className="font-bold text-white">QUESTIONABLE (Start with Caution)</h3></div><div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">{bucketQuestionable.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-yellow-500" textColor="text-yellow-300" scoring={scoring} />)}</div></div>)}
             {(bucketOutDoubtful.length > 0) && ( <div className="bg-red-900/20 rounded-xl border border-red-800/50 overflow-hidden"><div className="p-4 bg-red-900/40 border-b border-red-800/50 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /><h3 className="font-bold text-white">OUT / DOUBTFUL (Do Not Start)</h3></div><div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">{bucketOutDoubtful.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-red-600" textColor="text-red-300" scoring={scoring} />)}</div></div>)}
             {bucketRest.length > 0 && ( <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden"><div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2"><UserMinus className="w-5 h-5 text-slate-400" /><h3 className="font-bold text-white">IR / INACTIVE / PRACTICE SQUAD / RELEASED</h3></div><div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">{bucketRest.map((k, i) => <InjuryCard key={i} k={k} borderColor="border-slate-600" textColor="text-slate-300" scoring={scoring} />)}</div></div> )}
             {(!bucketQuestionable.length && !bucketOutDoubtful.length && !bucketRest.length) && ( <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">No kickers currently listed on the injury report!</div> )}
           </div>
        )}

        {activeTab === 'glossary' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             {aubreyExample && ( <div className="p-4 border-b border-slate-800 bg-slate-900/50"><h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /> How It Works: Live Example</h3><MathCard player={aubreyExample} leagueAvgs={leagueAvgs} week={meta.week} /></div> )}
             <div className="p-4 border-b border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">This website was created by Caleb Hill. If you have any suggestions please <a href="mailto:calebthill@gmail.com" className="text-blue-400 hover:underline">email me</a>.</div>
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {GLOSSARY_DATA.map((item, idx) => ( <div key={idx} className="bg-slate-800/50 p-4 rounded border border-slate-700"><div className="flex justify-between items-start mb-2"><span className="font-mono font-bold text-blue-300">{item.header}</span><span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/50"><Database className="w-3 h-3"/> {item.source}</span></div><div className="text-sm font-semibold text-white mb-1">{item.title}</div><div className="text-xs text-slate-400">{item.desc}</div><div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-700 pt-1">Why: {item.why}</div></div> ))}
             </div>
          </div>
        )}
      </div>
      {/* <Analytics /> */}
    </div>
  );
};

export default App;