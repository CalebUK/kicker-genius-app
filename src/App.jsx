import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Wind, Calendar, Info, MapPin, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Calculator, RefreshCw, AlertTriangle, Loader2, Stethoscope, Database, UserMinus, Settings, Save, RotateCcw, Filter, Target, ArrowUpDown, ArrowUp, ArrowDown, Search, BrainCircuit } from 'lucide-react';

// --- GLOSSARY DATA ---
const GLOSSARY_DATA = [
  { header: "Grade", title: "Matchup Grade", desc: "Composite score (Baseline 90) combining Stall Rates, Weather, and History. >100 is elite.", why: "Predictive Model", source: "Kicker Genius Model" },
  { header: "Proj Pts", title: "Projected Points", desc: "Forecasted score based on Kicker's Average adjusted by Grade, Vegas lines, and Scoring Caps.", why: "Start/Sit Decision", source: "Kicker Genius Model" },
  { header: "Rounding", title: "No Fractional Points", desc: "At Kicker Genius we don't believe in fractional points for Kickers. If a kicker can't get 9.4 points we shouldn't project it. .4 and below will be rounded down and .5 and above will be rounded up.", why: "Realism", source: "Kicker Genius Model" },
  { header: "Proj Acc", title: "Projection Accuracy (L3)", desc: "Total Actual Points vs Total Projected Points over the last 3 weeks.", why: "Model Trust Check", source: "Historical Backtest" },
  { header: "Injury", title: "Injury Status", desc: "Live tracking of game designation (Out, Doubtful, Questionable) and Practice Squad status.", why: "Availability Risk", source: "NFL Official + CBS Scraper" },
  { header: "Avg FPts", title: "Average Fantasy Points", desc: "Average points scored per game played this season.", why: "Consistency Metric", source: "nflreadpy (Play-by-Play)" },
  { header: "L4 Off %", title: "Offensive Stall Rate (L4)", desc: "% of drives inside the 25 that fail to score a TD over the last 4 weeks.", why: "Recent Trend Volume", source: "nflreadpy (Play-by-Play)" },
  { header: "L4 Def %", title: "Opponent Force Rate (L4)", desc: "% of opponent drives allowed inside the 25 that resulted in FGs (Last 4 weeks).", why: "Matchup Difficulty", source: "nflreadpy (Play-by-Play)" },
  { header: "Off Stall (YTD)", title: "Season Offense Stall Rate", desc: "Percentage of the kicker's team drives inside the 25 that ended in a FG attempt (Full Season).", why: "Long Term Efficiency", source: "nflreadpy (Season)" },
  { header: "Def Stall (YTD)", title: "Season Defense Stall Rate", desc: "Percentage of the kicker's team defense forcing FG attempts inside the 25 (Full Season).", why: "Game Script Indicator", source: "nflreadpy (Season)" },
  { header: "Vegas", title: "Implied Team Total", desc: "Points Vegas expects this team to score (derived from Spread & Total).", why: "Reality Check", source: "nflreadpy (Lee Sharpe)" },
  { header: "Weather", title: "Live Forecast", desc: "Wind speed, temperature, and precipitation conditions at kickoff time.", why: "Accuracy Impact", source: "Open-Meteo API" },
  { header: "Off PF", title: "Offense Points For", desc: "Average points scored by the kicker's team over the last 4 weeks.", why: "Scoring Ceiling", source: "nflreadpy (Schedule)" },
  { header: "Opp PA", title: "Opponent Points Allowed", desc: "Average points allowed by the opponent over the last 4 weeks.", why: "Defensive Ceiling", source: "nflreadpy (Schedule)" },
  { header: "FPts", title: "Fantasy Points (YTD)", desc: "Standard Scoring: 3 pts (0-39 yds), 4 pts (40-49 yds), 5 pts (50+ yds). -1 for Misses.", why: "Season Production", source: "nflreadpy (Play-by-Play)" },
  { header: "Dome %", title: "Dome Percentage", desc: "Percentage of kicks attempted in a Dome or Closed Roof stadium.", why: "Environment Safety", source: "nflreadpy (Stadiums)" },
  { header: "FG RZ Trips", title: "FG Red Zone Trips", desc: "Number of drives reaching the Red Zone that resulted in a Field Goal attempt.", why: "Volume Opportunity", source: "nflreadpy (Play-by-Play)" }
];

const DEFAULT_SCORING = {
  fg0_19: 3, fg20_29: 3, fg30_39: 3, fg40_49: 4, fg50_59: 5, fg60_plus: 5,
  fg_miss: -1, xp_made: 1, xp_miss: -1
};

const SETTING_LABELS = {
  fg0_19: "FG (0-19 yds)",
  fg20_29: "FG (20-29 yds)",
  fg30_39: "FG (30-39 yds)",
  fg40_49: "FG (40-49 yds)",
  fg50_59: "FG (50-59 yds)",
  fg60_plus: "FG (60+ yds)",
  fg_miss: "Missed FG",
  xp_made: "PAT Made",
  xp_miss: "PAT Missed"
};

const HeaderCell = ({ label, description, avg, sortKey, currentSort, onSort }) => {
  const isActive = currentSort?.key === sortKey;
  
  return (
    <th 
      onClick={() => onSort && onSort(sortKey)}
      className={`px-2 py-3 text-center align-middle group relative cursor-pointer leading-tight min-w-[90px] select-none hover:bg-slate-800/80 transition-colors ${isActive ? 'bg-slate-800/50' : ''}`}
    >
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <div className="flex items-center gap-1">
          <span className={isActive ? "text-blue-400" : "text-slate-300"}>{label}</span>
          {onSort && (
            isActive ? (
              currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            )
          )}
        </div>
        <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded shadow-xl text-xs normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal text-left cursor-auto">
        <div className="text-white font-semibold mb-1">{description}</div>
        {avg !== undefined && <div className="text-blue-300">League Avg: {Number(avg).toFixed(1)}</div>}
        <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
      </div>
    </th>
  );
};

const HistoryBars = ({ games }) => {
  if (!games || games.length === 0) return <div className="text-xs text-slate-500">No recent data</div>;

  return (
    <div className="space-y-3">
      {games.map((g, i) => {
        if (g.status === 'BYE' || g.status === 'DNS') {
           return (
             <div key={i} className="text-[10px]">
               <div className="text-slate-500 mb-0.5">Wk {g.week}: {g.status}</div>
               <div className="w-full bg-slate-800/50 h-4 rounded-full relative">
                 <div className="bg-slate-700 h-full rounded-full" style={{width: '100%'}}></div>
               </div>
             </div>
           );
        }

        const maxVal = Math.max(20, g.proj, g.act); 
        const projPct = (g.proj / maxVal) * 100;
        const actPct = (g.act / maxVal) * 100;
        const isBeat = g.act >= g.proj;
        
        return (
          <div key={i} className="text-[10px]">
            <div className="flex justify-between text-slate-400 mb-0.5 font-bold">
              <span>Wk {g.week} vs {g.opp}</span>
              <span className={isBeat ? "text-green-400" : "text-red-400"}>
                {isBeat ? "+" : ""}{g.diff}
              </span>
            </div>
            
            {/* Projection Bar (Gray) */}
            <div className="w-full bg-slate-800/50 h-4 rounded-full mb-1 relative">
               <div className="bg-slate-600 h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2" style={{ width: `${projPct}%` }}>
                  <span className="text-[9px] text-white font-bold leading-none">Projection {g.proj}</span>
               </div>
            </div>

            {/* Actual Bar (Color) */}
            <div className="w-full bg-slate-800/50 h-4 rounded-full relative">
               <div className={`${isBeat ? "bg-green-500" : "bg-red-500"} h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2`} style={{ width: `${actPct}%` }}>
                  <span className="text-[9px] text-white font-bold leading-none">Actual {g.act}</span>
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PlayerCell = ({ player, subtext }) => {
  const injuryColor = player.injury_color || 'slate-600'; 
  const statusText = player.injury_status || '';
  
  let borderColor = 'border-slate-600';
  if (injuryColor.includes('green')) borderColor = 'border-green-500';
  if (injuryColor.includes('red-700')) borderColor = 'border-red-700';
  if (injuryColor.includes('red-500')) borderColor = 'border-red-500';
  if (injuryColor.includes('yellow')) borderColor = 'border-yellow-500';

  let textColor = 'text-slate-400';
  if (injuryColor.includes('green')) textColor = 'text-green-400';
  if (injuryColor.includes('red-700')) textColor = 'text-red-500';
  if (injuryColor.includes('red-500')) textColor = 'text-red-400';
  if (injuryColor.includes('yellow')) textColor = 'text-yellow-400';

  const ownPct = player.own_pct || 0;
  let ownColor = 'text-slate-500';
  if (ownPct < 10) ownColor = 'text-blue-400 font-bold'; 
  else if (ownPct > 80) ownColor = 'text-amber-500'; 

  const isAubrey = player.kicker_player_name?.includes('Aubrey') || player.kicker_player_name === 'B.Aubrey';
  const imageUrl = isAubrey 
    ? '/assets/aubrey_custom.png' 
    : (player.headshot_url || 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png');

  // --- PARSE INJURY DETAILS FOR 3-FOLD DISPLAY ---
  const details = player.injury_details || '';
  const match = details.match(/^(.+?)\s\((.+)\)$/);
  
  let displayInjury = '';
  let displayStatus = '';
  
  if (match) {
      const reportStatus = match[1];
      const injuryType = match[2];
      displayInjury = `${player.injury_status}: ${injuryType}`;
      displayStatus = reportStatus;
  } else {
      displayInjury = details; 
  }

  return (
    <td className="px-3 py-4 font-medium text-white">
      <div className="flex items-center gap-3">
        <div className="relative group flex-shrink-0">
          <img 
            src={imageUrl} 
            alt={player.kicker_player_name}
            className={`w-10 h-10 rounded-full bg-slate-800 border-2 object-cover shrink-0 ${borderColor}`}
            onError={(e) => {
                if (e.target.src.includes('aubrey_custom.png') && player.headshot_url) {
                    e.target.src = player.headshot_url;
                } else {
                    e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png';
                }
            }} 
          />
          {statusText !== 'Healthy' && statusText !== '' && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs opacity-0 group-hover:opacity-100 z-50 shadow-xl pointer-events-none">
                {/* 3-FOLD DISPLAY */}
                {match ? (
                    <>
                        <div className={`font-bold ${textColor} mb-0.5`}>{displayInjury}</div>
                        <div className="text-slate-400 italic">{displayStatus}</div>
                    </>
                ) : (
                    <div className={`font-bold ${textColor} mb-1`}>{player.injury_status} <span className="text-slate-400 font-normal">({details})</span></div>
                )}
             </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-base leading-tight truncate">{player.kicker_player_name}</div>
          <div className="text-xs text-slate-500 truncate">{subtext}</div>
          {player.own_pct > 0 && (
             <div className={`text-[10px] mt-1 font-bold ${ownColor}`}>
               Own: {player.own_pct.toFixed(1)}%
             </div>
          )}
        </div>
      </div>
    </td>
  );
};

const MathCard = ({ player, leagueAvgs, week }) => {
  if (!player) return null;

  const l3_diff = (player.history?.l3_actual || 0) - (player.history?.l3_proj || 0);
  let trendColor = "text-slate-500";
  let trendSign = "";
  if (l3_diff > 2.5) { trendColor = "text-green-400"; trendSign = "+"; }
  else if (l3_diff < -2.5) { trendColor = "text-red-400"; }

  const lgOffStall = leagueAvgs?.off_stall || 40;
  const lgDefStall = leagueAvgs?.def_stall || 40;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Math Worksheet: {player.kicker_player_name}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* 1. GRADE */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <div className="text-blue-300 font-bold mb-1 pb-1 border-b border-slate-800">1. MATCHUP GRADE</div>
            
            {/* Offense Breakdown */}
            <div>
                <div className="flex justify-between text-xs text-slate-300">
                    <span>Offense Score</span>
                    <span className="font-mono text-white">{player.off_score_val}</span>
                </div>
                <div className="text-[9px] text-slate-500">
                    ({player.off_stall_rate}% / {lgOffStall}%) × 40
                </div>
            </div>

            {/* Defense Breakdown */}
            <div>
                <div className="flex justify-between text-xs text-slate-300">
                    <span>Defense Score</span>
                    <span className="font-mono text-white">{player.def_score_val}</span>
                </div>
                <div className="text-[9px] text-slate-500">
                    ({player.def_stall_rate}% / {lgDefStall}%) × 40
                </div>
            </div>

            {/* Bonuses */}
            <div className="border-t border-slate-800 pt-1">
                <div className="text-[10px] text-slate-400 mb-0.5">Bonuses:</div>
                <div className="text-emerald-400 text-[10px] space-y-0.5">
                    {player.grade_details && player.grade_details.length > 0 
                        ? player.grade_details.map((d, i) => <div key={i} className="flex justify-between"><span>{d}</span></div>) 
                        : <div className="text-slate-600 italic">None</div>}
                </div>
            </div>

            {/* Total & Multiplier */}
            <div className="mt-auto pt-2 border-t border-slate-700">
                <div className="flex justify-between font-bold text-white">
                    <span>Total Grade</span>
                    <span>{player.grade}</span>
                </div>
                <div className="flex justify-between text-[10px] text-blue-400 mt-1">
                     <span>Week {week} Multiplier (÷90)</span>
                     <span className="font-mono font-bold">{(player.grade / 90).toFixed(2)}x</span>
                </div>
            </div>
          </div>

          {/* 2. CAPS */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
            <div className="text-amber-400 font-bold mb-2 pb-1 border-b border-slate-800">2. CAPS</div>
            <div className="flex justify-between mb-1"><span>Off Cap:</span> <span className="text-white">{player.off_cap_val}</span></div>
            <div className="text-[10px] text-slate-500 mb-2">Tm Score {player.w_team_score} x Share</div>
            <div className="flex justify-between mb-1"><span>Def Cap:</span> <span className="text-white">{player.def_cap_val}</span></div>
            <div className="text-[10px] text-slate-500">Opp Allow {player.w_def_allowed} x Share</div>
          </div>
          
          {/* 3. HISTORY */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
             <div className="font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400"><Target className="w-3 h-3"/> TREND (L3)</div>
                <span className={`text-[10px] font-mono ${trendColor}`}>{trendSign}{l3_diff.toFixed(1)}</span>
             </div>
             <HistoryBars games={player.history?.l3_games} />
          </div>

          {/* 4. NARRATIVE */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col">
             <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center gap-2">
               <BrainCircuit className="w-3 h-3" /> KICKERGENIUS INSIGHT
             </div>
             <div className="text-xs text-slate-300 leading-relaxed h-full flex items-center">
               {player.narrative || "No specific analysis available for this player yet."}
             </div>
          </div>
        </div>
        
        <div className="mt-3 bg-slate-800/40 p-2 rounded border border-slate-800 text-[10px] text-slate-400 flex gap-6 justify-center">
            <span><strong className="text-slate-200">Vegas:</strong> {player.details_vegas_spread} / {player.details_vegas_total} Total</span>
            <span><strong className="text-slate-200">Implied Score:</strong> {player.vegas ? Number(player.vegas).toFixed(1) : '--'} pts</span>
            <span><strong className="text-slate-200">L4 Team PF:</strong> {player.off_ppg ? Number(player.off_ppg).toFixed(1) : '--'} pts</span>
            <span><strong className="text-slate-200">L4 Opp PA:</strong> {player.def_pa ? Number(player.def_pa).toFixed(1) : '--'} pts</span>
        </div>
    </div>
  );
};

const DeepDiveRow = ({ player, leagueAvgs, week }) => (
  <tr className="bg-slate-900/50 border-b border-slate-800">
    <td colSpan="11" className="p-4">
      <MathCard player={player} leagueAvgs={leagueAvgs} week={week} />
    </td>
  </tr>
);

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

  useEffect(() => {
    const savedScoring = localStorage.getItem('kicker_scoring');
    if (savedScoring) {
      try { setScoring({ ...DEFAULT_SCORING, ...JSON.parse(savedScoring) }); } 
      catch (e) { console.error(e); }
    }
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

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const toggleRow = (rank) => setExpandedRow(expandedRow === rank ? null : rank);

  const calcFPts = (p) => {
    if (!p) return 0;
    return ((p.fg_0_19||0)*scoring.fg0_19) + ((p.fg_20_29||0)*scoring.fg20_29) + ((p.fg_30_39||0)*scoring.fg30_39) + 
           ((p.fg_40_49||0)*scoring.fg40_49) + ((p.fg_50_59||0)*scoring.fg50_59) + ((p.fg_60_plus||0)*scoring.fg60_plus) + 
           ((p.fg_miss||0)*scoring.fg_miss) + ((p.xp_made||0)*scoring.xp_made) + ((p.xp_miss||0)*scoring.xp_miss);
  };

  const calcProj = (p, grade) => {
    if (grade === 0) return 0;
    const avgPts = p.fpts_ytd / (p.games || 1);
    const base = avgPts * (grade / 90);
    const scaleFactor = (p.avg_pts && p.avg_pts > 0) ? (avgPts / p.avg_pts) : 1.0;
    const off_cap_scaled = (p.off_cap_val || 0) * scaleFactor;
    const def_cap_scaled = (p.def_cap_val || 0) * scaleFactor;
    const weighted_proj = (base * 0.50) + (off_cap_scaled * 0.30) + (def_cap_scaled * 0.20);
    const proj = weighted_proj > 1.0 ? weighted_proj : base;
    return Math.round(proj); // ROUNDED
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" /><p>Loading...</p></div>;
  if (error || !data) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center"><AlertTriangle className="w-12 h-12 text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Data Not Found</h2><p className="text-slate-400 mb-6">{error}</p><p className="text-sm text-slate-600">Check /public/kicker_data.json</p></div>;

  const { rankings, ytd, injuries, meta } = data;
  const leagueAvgs = meta?.league_avgs || {};
  
  let processed = rankings.map(p => {
     const pWithVegas = { ...p, vegas: p.vegas_implied || 0 }; 
     const ytdPts = calcFPts(pWithVegas);
     const pWithYtd = { ...pWithVegas, fpts_ytd: ytdPts };
     const proj = calcProj(pWithYtd, p.grade);
     return { ...pWithYtd, proj: parseFloat(proj), acc_diff: (p.history?.l3_actual||0) - (p.history?.l3_proj||0) };
  })
  .filter(p => p.proj > 0); 

  // Search Logic
  if (search) {
      const q = search.toLowerCase();
      processed = processed.filter(p => 
          p.kicker_player_name.toLowerCase().includes(q) || 
          (p.team && p.team.toLowerCase().includes(q)) ||
          (q === 'dome' && p.is_dome) ||
          (q === 'cowboys' && p.team === 'DAL') 
      );
  }

  // Sort Logic for Potential
  processed.sort((a, b) => {
     let valA = a[sortConfig.key];
     let valB = b[sortConfig.key];
     if (sortConfig.key === 'proj_acc') { valA = a.acc_diff; valB = b.acc_diff; }
     
     if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
     if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
     return 0;
  });

  if (hideHighOwn) processed = processed.filter(p => (p.own_pct || 0) <= 80);
  if (hideMedOwn) processed = processed.filter(p => (p.own_pct || 0) <= 60);
  
  const ytdSorted = ytd.map(p => {
      const pts = calcFPts(p);
      const pct = (p.fg_att > 0 ? (p.fg_made / p.fg_att * 100).toFixed(1) : '0.0');
      const longMakes = (p.fg_50_59 || 0) + (p.fg_60_plus || 0);
      return {
          ...p, 
          fpts: pts, 
          avg_fpts: (p.games > 0 ? (pts/p.games).toFixed(1) : '0.0'), 
          pct_val: pct, 
          pct: pct, 
          longs: longMakes 
      };
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

  // --- INJURY BUCKETS ---
  const bucketQuestionable = injuries.filter(k => k.injury_status === 'Questionable');
  const bucketOutDoubtful = injuries.filter(k => k.injury_status === 'OUT' || k.injury_status === 'Doubtful' || k.injury_status === 'Inactive');
  const bucketRest = injuries.filter(k => ['IR', 'CUT', 'Practice Squad'].includes(k.injury_status) || k.injury_status.includes('Roster'));

  const aubreyExample = processed.find(p => p.kicker_player_name.includes('Aubrey')) || processed[0];

  // Helper to render injury card with logic
  const renderInjuryCard = (k, i, borderColor, textColor) => {
      const details = k.injury_details || '';
      const match = details.match(/^(.+?)\s\((.+)\)$/);
      let displayInjury = k.injury_details;
      let displayStatus = '';
      
      if (match) {
          const reportStatus = match[1];
          const injuryType = match[2];
          displayInjury = `${k.injury_status}: ${injuryType}`;
          displayStatus = reportStatus;
      }

      return (
         <div key={i} className={`flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border ${borderColor}`}>
            <img 
                src={k.headshot_url} 
                className={`w-12 h-12 rounded-full border-2 object-cover ${borderColor.replace('border', 'border-')}`} 
                onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}}
            />
            <div>
               <div className="font-bold text-white">{k.kicker_player_name} ({k.team})</div>
               {match ? (
                   <>
                       <div className={`text-xs font-bold ${textColor}`}>{displayInjury}</div>
                       <div className="text-xs text-slate-400 italic">{displayStatus}</div>
                   </>
               ) : (
                   <div className={`text-xs ${textColor}`}>{displayInjury}</div>
               )}
               <div className="text-xs text-slate-500 mt-1">Total FPts: {calcFPts(k)}</div>
            </div>
         </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <img src="/assets/logo.png" alt="KickerGenius" className="w-12 h-12 object-contain" />
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Kicker<span className="text-blue-500">Genius</span>
              </h1>
            </div>
            <p className="text-slate-400 ml-1">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setActiveTab('settings')} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2 border border-slate-700 transition-colors"><Settings className="w-4 h-4" /> League Settings</button>
             <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-3 shadow-sm px-4">
               <div className="text-right">
                 <div className="text-[10px] text-slate-500 uppercase font-bold">Last Update</div>
                 <div className="text-xs font-semibold text-white">{meta.updated} (Week {meta.week})</div>
               </div>
             </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button onClick={() => { setActiveTab('potential'); setSortConfig({key:'proj', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'potential' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4"/> Week {meta.week} Model</button>
          <button onClick={() => { setActiveTab('ytd'); setSortConfig({key:'fpts', direction:'desc'}); }} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'ytd' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}><Activity className="w-4 h-4"/> Historical YTD</button>
          <button onClick={() => setActiveTab('injuries')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'injuries' ? 'text-white border-b-2 border-red-500' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Injury Report {injuries.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{injuries.length}</span>}</button>
          <button onClick={() => setActiveTab('glossary')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'glossary' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><BookOpen className="w-4 h-4"/> Stats Legend</button>
        </div>

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5"/> Scoring Settings</h2>
                <button onClick={resetScoring} className="text-xs bg-red-900/30 text-red-400 px-3 py-1 rounded border border-red-800/50 hover:bg-red-900/50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset to Default</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(scoring).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{SETTING_LABELS[key] || key}</label>
                  <input type="number" value={val} onChange={(e) => updateScoring(key, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center gap-2">
              <Save className="w-4 h-4" /> Changes save automatically and update all projections instantly.
            </div>
          </div>
        )}

        {/* POTENTIAL MODEL */}
        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             {/* SEARCH BAR */}
             <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="(e.g. Aubrey, Cowboys, Dome)" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> Filters:</div>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={hideHighOwn} onChange={(e) => setHideHighOwn(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" />
                    Hide {'>'} 80% Owned
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                    <input type="checkbox" checked={hideMedOwn} onChange={(e) => setHideMedOwn(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" />
                    Hide {'>'} 60% Owned
                    </label>
                </div>
             </div>
             
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="w-10 px-2 py-3 align-middle text-center">Rank</th>
                    <th 
                      className="px-2 py-3 align-middle text-left cursor-pointer group"
                      onClick={() => handleSort('own_pct')}
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortConfig.key === 'own_pct' ? "text-blue-400" : "text-slate-300"}>Player</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </th>
                    <HeaderCell label="Projection" sortKey="proj" currentSort={sortConfig} onSort={handleSort} description="Projected Points (Custom Scoring)" />
                    <HeaderCell label="Matchup Grade" sortKey="grade" currentSort={sortConfig} onSort={handleSort} description="Matchup Grade (Baseline 90)" />
                    <th className="px-6 py-3 text-center align-middle">Weather</th>
                    <HeaderCell label="Offensive Stall % (L4)" sortKey="off_stall_rate" currentSort={sortConfig} onSort={handleSort} description="Offense Stall Rate (L4)" avg={leagueAvgs.off_stall} />
                    <HeaderCell label="Opponent Stall % (L4)" sortKey="def_stall_rate" currentSort={sortConfig} onSort={handleSort} description="Opponent Force Rate (L4)" avg={leagueAvgs.def_stall} />
                    <HeaderCell label="Projection Accuracy (L3)" sortKey="proj_acc" currentSort={sortConfig} onSort={handleSort} description="Total Actual vs Projected Points (Last 3 Games)" />
                    <HeaderCell label="Implied Vegas Score Line" sortKey="vegas" currentSort={sortConfig} onSort={handleSort} description="Implied Team Total (Vegas Line & Spread)/2" />
                    <HeaderCell label="Offensive PF (L4)" sortKey="off_ppg" currentSort={sortConfig} onSort={handleSort} description="Team Points For (L4)" />
                    <HeaderCell label="Opponent PA (L4)" sortKey="def_pa" currentSort={sortConfig} onSort={handleSort} description="Opp Points Allowed (L4)" />
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {processed.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr onClick={() => toggleRow(idx)} className="hover:bg-slate-800/50 cursor-pointer transition-colors">
                        <td className="w-10 px-2 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                        <PlayerCell player={row} subtext={`${row.team} vs ${row.opponent}`} />
                        <td className={`px-6 py-4 text-center text-lg font-bold ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.proj}</td>
                        <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${row.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>{row.grade}</span></td>
                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">{row.weather_desc}</td>
                        <td className="px-6 py-4 text-center text-blue-300">{row.off_stall_rate}%</td>
                        <td className="px-6 py-4 text-center text-slate-400">{row.def_stall_rate}%</td>
                        
                        <td className="px-6 py-4 text-center">
                           <div className={`text-sm font-bold whitespace-nowrap flex justify-center ${row.history?.l3_actual >= row.history?.l3_proj ? 'text-green-400' : 'text-red-400'}`}>
                             <span>{row.history?.l3_actual || 0}</span>
                             <span className="mx-1 text-slate-600">/</span>
                             <span className="text-slate-500">{row.history?.l3_proj || 0}</span>
                           </div>
                           <div className="text-[9px] text-slate-500 uppercase">Act / Proj</div>
                        </td>

                        <td className="px-6 py-4 text-center font-mono text-amber-400">{Number(row.vegas).toFixed(1)}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.off_ppg).toFixed(1)} {row.off_ppg < 15 && "❄️"}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-300">{Number(row.def_pa).toFixed(1)} {row.def_pa < 17 && "🛡️"}</td>
                        <td className="px-6 py-4 text-slate-600">{expandedRow === idx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                      </tr>
                      {expandedRow === idx && <DeepDiveRow player={row} leagueAvgs={leagueAvgs} week={meta.week} />}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* YTD TABLE */}
        {activeTab === 'ytd' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-6 py-3 align-middle text-center">Rank</th>
                    <th className="px-6 py-3 align-middle text-left">Player</th>
                    <HeaderCell label="Fantasy Points" sortKey="fpts" currentSort={sortConfig} onSort={handleSort} description="Total Fantasy Points (Custom Scoring)" avg={leagueAvgs.fpts} />
                    <HeaderCell label="Average Fantasy Points" sortKey="avg_fpts" currentSort={sortConfig} onSort={handleSort} description="Average Fantasy Points per Game" />
                    <HeaderCell label="FG (Made/Attempts)" sortKey="pct" currentSort={sortConfig} onSort={handleSort} description="Field Goal Accuracy" />
                    <HeaderCell label="50+ FGs" sortKey="longs" currentSort={sortConfig} onSort={handleSort} description="Long Distance Makes" />
                    <HeaderCell label="Dome Games (%)" sortKey="dome_pct" currentSort={sortConfig} onSort={handleSort} description="Dome Games Played" />
                    <HeaderCell label="FG Red Zone Trips" sortKey="rz_trips" currentSort={sortConfig} onSort={handleSort} description="Drives reaching FG Range" />
                    <HeaderCell label="Offense Stall % (Season)" sortKey="off_stall_rate_ytd" currentSort={sortConfig} onSort={handleSort} description="Season-Long Offensive Stall Rate" />
                    <HeaderCell label="Opponent Stall % (Season)" sortKey="def_stall_rate_ytd" currentSort={sortConfig} onSort={handleSort} description="Season-Long Defensive Stall Rate (Team's own defense)" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ytdSorted.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 text-center">#{idx + 1}</td>
                      <PlayerCell player={row} subtext={row.team} />
                      
                      <td className="px-6 py-4 text-center font-bold text-emerald-400 text-lg">{row.fpts}</td>

                      <td className="px-6 py-4 text-center">
                        <div className="font-bold text-white">{Number(row.avg_fpts).toFixed(1)}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Games: {row.games}</div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="text-slate-300">{row.fg_made}/{row.fg_att}</div>
                        <div className="text-[10px] text-blue-400 font-mono">{row.pct}%</div>
                      </td>

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

        {/* INJURIES */}
        {activeTab === 'injuries' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* BUCKET 1: QUESTIONABLE (YELLOW) */}
             {bucketQuestionable.length > 0 && (
               <div className="bg-yellow-900/20 rounded-xl border border-yellow-800/50 overflow-hidden">
                 <div className="p-4 bg-yellow-900/40 border-b border-yellow-800/50 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-white">QUESTIONABLE (Start with Caution)</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bucketQuestionable.map((k, i) => renderInjuryCard(k, i, "border-yellow-500", "text-yellow-300"))}
                 </div>
               </div>
             )}

             {/* BUCKET 2: DOUBTFUL & OUT (RED) */}
             {(bucketOutDoubtful.length > 0) && (
               <div className="bg-red-900/20 rounded-xl border border-red-800/50 overflow-hidden">
                 <div className="p-4 bg-red-900/40 border-b border-red-800/50 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-white">OUT / DOUBTFUL (Do Not Start)</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bucketOutDoubtful.map((k, i) => renderInjuryCard(k, i, "border-red-600", "text-red-300"))}
                 </div>
               </div>
             )}

             {/* BUCKET 3: PRACTICE SQUAD / RESERVE (DARK RED) */}
             {bucketRest.length > 0 && (
               <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                 <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-white">IR / INACTIVE / PRACTICE SQUAD / RELEASED</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bucketRest.map((k, i) => renderInjuryCard(k, i, "border-slate-600", "text-slate-300"))}
                 </div>
               </div>
             )}

             {(!bucketQuestionable.length && !bucketOutDoubtful.length && !bucketRest.length) && (
                <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                   No kickers currently listed on the injury report!
                </div>
             )}
           </div>
        )}

        {activeTab === 'glossary' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             {/* LIVE CALCULATION EXAMPLE */}
             {aubreyExample && (
               <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" /> How It Works: Live Example
                  </h3>
                  <MathCard player={aubreyExample} leagueAvgs={leagueAvgs} week={meta.week} />
               </div>
             )}

             {/* GLOSSARY GRID LAYOUT */}
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {GLOSSARY_DATA.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/50 p-4 rounded border border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-blue-300">{item.header}</span>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/50">
                         <Database className="w-3 h-3"/> {item.source}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                    <div className="mt-2 text-[10px] text-slate-500 italic border-t border-slate-700 pt-1">
                      Why: {item.why}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;