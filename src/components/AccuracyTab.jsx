import React, { useState, useMemo } from 'react';
import { PlayCircle, CheckCircle2, Clock, Calendar, Target, TrendingUp, Activity, ArrowUp, ArrowDown, Minus, Bot, BarChart3, Users, User, Flag, ChevronDown } from 'lucide-react';
import { calculateLiveScore, getGameStatus } from '../utils/scoring';
import { FootballIcon } from './KickerComponents';

const AccuracyTab = ({ players, scoring, week, sleeperLeagueId }) => {
  const [filter, setFilter] = useState('ALL');
  const [selectedWeek, setSelectedWeek] = useState(week);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- DATA PREPARATION ---
  const { activeGames, isHistorical } = useMemo(() => {
      // Since historical data backend isn't ready, we just use current players for now
      // This structure is ready for when we add the history switch logic
      const games = players.filter(p => {
          if (p.proj <= 0) return false;
          
          const statusVal = p.roster_status || p.status;
          if (statusVal === 'INA') return false;
          if (['OUT', 'IR', 'Inactive', 'Doubtful'].includes(p.injury_status)) return false;
          
          const status = getGameStatus(p.game_dt);
          return status === 'LIVE' || status === 'FINISHED';
      });
      return { activeGames: games, isHistorical: false };
  }, [players, week, selectedWeek]);

  const totalKickers = activeGames.length;

  // Calculate differentials (Actual - Projected)
  const diffs = activeGames.map(p => calculateLiveScore(p, scoring) - p.proj).sort((a, b) => a - b);
  
  const totalActual = activeGames.reduce((acc, p) => acc + calculateLiveScore(p, scoring), 0);
  const totalProj = activeGames.reduce((acc, p) => acc + p.proj, 0);
  const overallDiff = totalActual - totalProj;
  const overallDiffSign = overallDiff >= 0 ? '+' : '';
  
  // Metric 1: Win Rate
  const wins = diffs.filter(d => Math.abs(d) <= 3).length;
  const winRate = totalKickers > 0 ? Math.round((wins / totalKickers) * 100) : 0;

  // Metric 2: Smash vs Bust Rate
  const smashes = diffs.filter(d => d > 3).length;
  const busts = diffs.filter(d => d < -3).length;
  const met = diffs.filter(d => Math.abs(d) <= 3).length;

  const smashRate = totalKickers > 0 ? Math.round((smashes / totalKickers) * 100) : 0;
  const bustRate = totalKickers > 0 ? Math.round((busts / totalKickers) * 100) : 0;
  const metRate = totalKickers > 0 ? Math.round((met / totalKickers) * 100) : 0; 

  // Metric 3: Kicker Quartile Character Lineup
  // Helper to safely format numbers
  const safeFmt = (n) => {
      if (typeof n !== 'number' || isNaN(n)) return "0";
      return n > 0 ? `+${n.toFixed(0)}` : n.toFixed(0);
  };

  // Initialize with numeric defaults
  let minVal = 0, maxVal = 0, q1Val = 0, medianVal = 0, q3Val = 0;
  let q1Range = "0 to 0", q2Range = "0 to 0", q3Range = "0 to 0", q4Range = "0 to 0";
  let startHighlightIndex = 2; 

  // Only calculate if we have enough data
  if (diffs.length >= 4) {
      minVal = diffs[0];
      maxVal = diffs[diffs.length - 1];
      
      const getPercentileValue = (pct) => {
          const n = diffs.length;
          const k = (n - 1) * pct / 100;
          const f = Math.floor(k);
          const c = Math.ceil(k);
          if (f === c) return diffs[f];
          return (diffs[f] * (c - k)) + (diffs[c] * (k - f));
      };

      q1Val = getPercentileValue(25);
      medianVal = getPercentileValue(50);
      q3Val = getPercentileValue(75);
      
      q1Range = `${safeFmt(minVal)} to ${safeFmt(q1Val)}`;
      q2Range = `${safeFmt(q1Val)} to ${safeFmt(medianVal)}`;
      q3Range = `${safeFmt(medianVal)} to ${safeFmt(q3Val)}`;
      q4Range = `${safeFmt(q3Val)} to ${safeFmt(maxVal)}`;

      if (maxVal !== minVal) {
          const relativePos = (medianVal - minVal) / (maxVal - minVal);
          const rawIndex = Math.floor(relativePos * 10) - 2; 
          startHighlightIndex = Math.max(0, Math.min(5, rawIndex));
      }
  }

  const quartileIcons = Array(10).fill(null).map((_, i) => {
      const isMiddle = i >= startHighlightIndex && i < (startHighlightIndex + 5);
      const isQ1 = i === startHighlightIndex;
      const isMedian = i === startHighlightIndex + 2;
      const isQ3 = i === startHighlightIndex + 4;
      const isMin = i === 0;
      const isMax = i === 9;
      return { isMiddle, isMedian, isQ1, isQ3, isMin, isMax };
  });

  // --- 2. FILTER & SORT FOR DISPLAY ---
  const displayPlayers = activeGames.sort((a, b) => {
      const scoreA = calculateLiveScore(a, scoring);
      const scoreB = calculateLiveScore(b, scoring);
      // Always sort by live score desc for leaderboard
      return scoreB - scoreA; 
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* HEADER ROW: Week Selector & Sleeper Sync Note */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* WEEK SELECTOR */}
            <div className="relative">
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors w-32 justify-between"
                >
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="font-bold">Wk {selectedWeek}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                
                {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                        {/* Generate weeks 1 to current week in reverse */}
                        {Array.from({ length: week }, (_, i) => i + 1).reverse().map((w) => (
                            <button 
                                key={w} 
                                onClick={() => { setSelectedWeek(w); setIsDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-800 ${w === selectedWeek ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-300'}`}
                            >
                                Week {w}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sleeper Note */}
            {!sleeperLeagueId && !isHistorical && (
                <div className="bg-blue-900/20 border border-blue-800 p-2 px-4 rounded-lg flex items-center gap-2 text-xs text-blue-200 flex-1 justify-center md:justify-start">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span>Sync Sleeper for live scoring updates.</span>
                </div>
            )}
             {isHistorical && (
                <div className="bg-amber-900/20 border border-amber-800 p-2 px-4 rounded-lg flex items-center gap-2 text-xs text-amber-200 flex-1 justify-center md:justify-start">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Viewing Historical Data (Final Scores)</span>
                </div>
            )}
        </div>

        {/* --- LIVE MODEL PERFORMANCE TRACKER --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
             {/* Card 1: Total Score */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-blue-500"/> Total Points ({totalKickers})</div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{totalActual}</span>
                    <span className="text-sm text-slate-400">vs {totalProj.toFixed(0)} Proj</span>
                 </div>
                 <div className={`text-[10px] font-bold ${overallDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {overallDiffSign}{overallDiff.toFixed(1)} Diff
                 </div>
            </div>

            {/* Card 2: Accuracy Rate */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-emerald-500"/> Accuracy Rate</div>
                 <div className="text-3xl font-black text-white">{winRate}%</div>
                 <div className="text-[10px] text-slate-400">{wins} of {totalKickers} within +/- 3 pts</div>
            </div>

            {/* Card 3: Performance (With Counts) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-purple-500"/> Performance</div>
                 <div className="flex justify-between items-end text-xs font-bold w-full px-1">
                    <div className="text-emerald-400 flex flex-col items-center"><span>{smashes}</span><span className="text-[8px] text-slate-500 font-normal">SMASH</span></div>
                    <div className="text-slate-200 flex flex-col items-center"><span>{met}</span><span className="text-[8px] text-slate-500 font-normal">MET</span></div>
                    <div className="text-red-400 flex flex-col items-center"><span>{busts}</span><span className="text-[8px] text-slate-500 font-normal">BUST</span></div>
                 </div>
                 <div className="w-full h-2 bg-slate-800 rounded-full mt-1 flex overflow-hidden relative">
                    <div className="bg-emerald-500 h-full" style={{width: `${smashRate}%`}}></div>
                    <div className="bg-slate-400 h-full" style={{width: `${metRate}%`}}></div>
                    <div className="bg-red-500 h-full" style={{width: `${bustRate}%`}}></div>
                    {smashRate > 0 && metRate > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-950 z-10" style={{left: `${smashRate}%`}}></div>}
                    {(smashRate + metRate) < 100 && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-950 z-10" style={{left: `${smashRate + metRate}%`}}></div>}
                 </div>
                 <div className="flex justify-between text-[8px] text-slate-600 mt-0.5 w-full"><span>&gt;+3</span><span className="text-center">+/-3</span><span>&lt;-3</span></div>
            </div>

             {/* Card 4: Kicker Quartile (Character Lineup with Markers) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Users className="w-3 h-3 text-amber-500"/> Kicker Quartile</div>
                 
                 <div className="flex justify-between items-end relative h-8 px-1">
                    {quartileIcons[0].isMin && <div className="absolute left-0 top-0 text-[8px] text-white font-bold transform -translate-x-1/2 -translate-y-full">Min: {safeFmt(minVal)}</div>}
                    {quartileIcons[9].isMax && <div className="absolute right-0 top-0 text-[8px] text-white font-bold transform translate-x-1/2 -translate-y-full">Max: {safeFmt(maxVal)}</div>}

                    {quartileIcons.map((q, i) => (
                        <div key={i} className="relative flex flex-col items-center group">
                            {q.isQ3 && <div className="absolute -top-5 bg-blue-600 text-white text-[8px] px-1 py-0.5 rounded shadow-md whitespace-nowrap z-30 transform -translate-x-1/2 left-1/2">Q3: {safeFmt(q3Val)}</div>}
                            {q.isMedian && (
                                <div className="absolute -top-7 bg-amber-500 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap z-40 transform -translate-x-1/2 left-1/2">
                                    Med: {safeFmt(medianVal)}
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-500"></div>
                                </div>
                            )}
                            {q.isQ1 && <div className="absolute -top-5 bg-red-600 text-white text-[8px] px-1 py-0.5 rounded shadow-md whitespace-nowrap z-30 transform -translate-x-1/2 left-1/2">Q1: {safeFmt(q1Val)}</div>}
                            <User className={`w-4 h-4 transition-colors ${q.isMiddle ? 'text-blue-400 scale-110' : 'text-slate-600 scale-90'} ${q.isMedian ? 'text-amber-400 scale-125 z-10' : ''}`} strokeWidth={q.isMiddle ? 3 : 2}/>
                        </div>
                    ))}
                 </div>
                 
                 <div className="text-[8px] text-slate-500 text-center mt-1 w-full flex justify-center gap-3">
                     <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Q1 Outliers</span>
                     <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Middle 50%</span>
                     <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Q4 Outliers</span>
                 </div>
            </div>
        </div>

        {/* --- PLAYER CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPlayers.map((p, i) => {
                const liveScore = calculateLiveScore(p, scoring);
                const proj = p.proj;
                
                const performancePct = proj > 0 ? Math.round((liveScore / proj) * 100) : 0;

                const isBeat = liveScore >= proj;
                const isSmashed = liveScore >= proj + 3;
                const status = isHistorical ? 'FINISHED' : getGameStatus(p.game_dt);
                
                let statusColor = "bg-slate-800 text-slate-400";
                let StatusIcon = Calendar;
                if (status === 'LIVE') { statusColor = "bg-red-900/50 text-red-400 animate-pulse"; StatusIcon = PlayCircle; }
                if (status === 'FINISHED') { statusColor = "bg-emerald-900/30 text-emerald-400"; StatusIcon = CheckCircle2; }
                if (status === 'UPCOMING') { statusColor = "bg-blue-900/30 text-blue-400"; StatusIcon = Clock; }

                const isSpecial = p.kicker_player_name.includes('Aubrey') || p.team === 'DAL';
                const borderClass = isSpecial ? "border-blue-500 shadow-lg shadow-blue-900/20" : "border-slate-800";
                const glowClass = isSmashed ? "shadow-[0_0_15px_rgba(59,130,246,0.5)] border-blue-400" : "";
                const visualPct = Math.min(100, Math.max(5, performancePct));

                const usingSleeperData = !isHistorical && p.sleeper_live_score !== undefined && p.sleeper_live_score !== null;

                return (
                    <div key={i} className={`bg-slate-900 border rounded-xl p-4 relative overflow-hidden ${borderClass} ${glowClass}`}>
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <img src={p.headshot_url} className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover bg-slate-950"/>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-white text-sm truncate">{p.kicker_player_name}</div>
                                <div className="text-xs text-slate-500">{p.team} vs {p.opponent}</div>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${statusColor}`}><StatusIcon className="w-3 h-3" /> {status}</div>
                        </div>

                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <div className="text-left">
                                <span className={`text-3xl font-black ${isSmashed ? 'text-blue-400' : isBeat ? 'text-emerald-400' : 'text-white'}`}>{liveScore}</span>
                                <span className="text-xs text-slate-500 ml-1">pts</span>
                            </div>
                            <div className="text-xs text-slate-400 font-bold text-right">
                                PROJECTED: <span className="text-white text-base">{proj}</span>
                            </div>
                        </div>

                        {/* FOOTBALL FIELD PROGRESS BAR */}
                        <div className="h-8 w-full bg-emerald-900 rounded-md relative mb-4 border-2 border-emerald-800 overflow-hidden mt-2 shadow-inner group">
                             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800 to-emerald-950 opacity-80"></div>
                             <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/90 z-0"></div>
                             <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/90 z-0"></div>
                             <div className="absolute inset-0 flex justify-between px-4 items-center pointer-events-none z-0">
                                 {[...Array(9)].map((_, idx) => {
                                     const isMidfield = idx === 4;
                                     return (
                                         <div 
                                            key={idx} 
                                            className={`${isMidfield ? 'h-full w-0.5 bg-white/80' : 'h-[60%] w-px bg-white/40'}`}
                                         ></div>
                                     );
                                 })}
                             </div>
                             <img src="/assets/logo.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 object-contain opacity-40 pointer-events-none" alt="logo"/>

                             <div className={`h-full transition-all duration-1000 ease-out z-10 relative ${isSmashed ? 'bg-blue-500/60' : isBeat ? 'bg-emerald-500/60' : 'bg-yellow-500/50'}`} style={{ width: `${visualPct}%` }}></div>
                             
                             <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 transition-all duration-1000 ease-out z-30 flex items-center justify-center filter drop-shadow-lg" 
                                style={{ left: `calc(${visualPct}% - 16px)` }}>
                                 <FootballIcon isFire={isSmashed} />
                             </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 relative z-10">
                            {/* SLEEPER BADGE */}
                            {usingSleeperData && (
                                <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700 flex items-center gap-1">
                                    <Bot className="w-3 h-3" /> Sleeper Data
                                </span>
                            )}
                            
                            {proj > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${performancePct >= 100 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {performancePct}% of Proj
                                </span>
                            )}
                            
                            {/* Show breakdown only if NOT using Sleeper (since Sleeper is total only) OR if Historical */}
                            {(!usingSleeperData || isHistorical) && (
                                <>
                                {(p.wk_fg_50_59 > 0 || p.wk_fg_60_plus > 0) && <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">{p.wk_fg_50_59 + p.wk_fg_60_plus}x 50+</span>}
                                {(p.wk_fg_40_49 > 0) && <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">{p.wk_fg_40_49}x 40-49</span>}
                                {(p.wk_fg_0_19 + p.wk_fg_20_29 + p.wk_fg_30_39 > 0) && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_fg_0_19 + p.wk_fg_20_29 + p.wk_fg_30_39}x Short FG</span>}
                                {(p.wk_xp_made > 0) && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_xp_made}x XP</span>}
                                {(p.wk_fg_miss > 0 || p.wk_xp_miss > 0) && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-800/50 line-through decoration-red-500/50">{p.wk_fg_miss + p.wk_xp_miss} Miss</span>}
                                </>
                            )}
                            
                            {liveScore === 0 && status !== 'UPCOMING' && <span className="text-[10px] text-slate-600 italic px-1">No points yet</span>}
                        </div>
                        
                        {isSmashed && <div className="absolute inset-0 bg-blue-500/5 z-0 animate-pulse pointer-events-none"></div>}
                    </div>
                );
            })}
        </div>
        {displayPlayers.length === 0 && <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900">No games found for this filter.</div>}
    </div>
  );
};

export default AccuracyTab;