import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, Clock, Calendar, Target, TrendingUp, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { calculateLiveScore, getGameStatus } from '../utils/scoring';
import { FootballIcon } from './KickerComponents';

const AccuracyTab = ({ players, scoring, week }) => {
  const [filter, setFilter] = useState('ALL');

  // --- 1. CALCULATE SITE METRICS (LIVE/FINISHED ONLY) ---
  const activeGames = players.filter(p => {
      if (p.proj <= 0) return false;
      const status = getGameStatus(p.game_dt);
      return status === 'LIVE' || status === 'FINISHED';
  });

  // Calculate differences for active games
  const diffs = activeGames.map(p => calculateLiveScore(p, scoring) - p.proj);
  const totalActual = activeGames.reduce((acc, p) => acc + calculateLiveScore(p, scoring), 0);
  const totalProj = activeGames.reduce((acc, p) => acc + p.proj, 0);
  const overallDiff = totalActual - totalProj;
  const overallDiffSign = overallDiff >= 0 ? '+' : '';
  
  // Metric 1: Win Rate (Within +/- 3 points)
  const wins = diffs.filter(d => Math.abs(d) <= 3).length;
  const winRate = activeGames.length > 0 ? Math.round((wins / activeGames.length) * 100) : 0;

  // Metric 2: Smash vs Bust Rate
  const smashes = diffs.filter(d => d > 3).length;
  const busts = diffs.filter(d => d < -3).length;
  const smashRate = activeGames.length > 0 ? Math.round((smashes / activeGames.length) * 100) : 0;
  const bustRate = activeGames.length > 0 ? Math.round((busts / activeGames.length) * 100) : 0;
  const metRate = activeGames.length > 0 ? Math.round((wins / activeGames.length) * 100) : 0; 

  // Metric 3: Adjusted Median % (Rounded to nearest 10%)
  // Step A: Calculate % for each kicker and round to nearest 10
  const roundedPcts = activeGames.map(p => {
      const live = calculateLiveScore(p, scoring);
      const proj = p.proj;
      if (proj === 0) return 0; 
      const rawPct = (live / proj) * 100;
      return Math.round(rawPct / 10) * 10; 
  }).sort((a, b) => a - b);

  // Step B: Find the median of these rounded values
  const mid = Math.floor(roundedPcts.length / 2);
  const medianPct = roundedPcts.length > 0 
    ? (roundedPcts.length % 2 !== 0 ? roundedPcts[mid] : (roundedPcts[mid - 1] + roundedPcts[mid]) / 2)
    : 0;
    
  // Step C: Count how many kickers fell into this median bucket
  const kickersAtMedian = roundedPcts.filter(p => p === medianPct).length;


  // --- 2. FILTER & SORT FOR DISPLAY ---
  const displayPlayers = players.filter(p => {
      if (p.proj <= 0) return false;
      const status = getGameStatus(p.game_dt);
      if (filter === 'ALL') return true;
      return filter === status;
  }).sort((a, b) => {
      const scoreA = calculateLiveScore(a, scoring);
      const scoreB = calculateLiveScore(b, scoring);
      if (filter === 'UPCOMING') return b.proj - a.proj;
      return scoreB - scoreA; 
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* --- LIVE MODEL PERFORMANCE TRACKER --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
             {/* Card 1: Total Score (Win/Loss) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-blue-500"/> Total Points</div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{totalActual}</span>
                    <span className="text-sm text-slate-400">vs {totalProj.toFixed(0)} Proj</span>
                 </div>
                 <div className={`text-[10px] font-bold ${overallDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {overallDiffSign}{overallDiff.toFixed(1)} Diff
                 </div>
            </div>

            {/* Card 2: Win Rate */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-emerald-500"/> Accuracy Rate</div>
                 <div className="text-3xl font-black text-white">{winRate}%</div>
                 <div className="text-[10px] text-slate-400">Within +/- 3 pts</div>
            </div>

            {/* Card 3: Smash/Met/Bust */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-purple-500"/> Performance</div>
                 <div className="flex justify-between items-end text-xs font-bold w-full px-1">
                    <div className="text-emerald-400 flex flex-col items-center"><span>{smashRate}%</span><span className="text-[8px] text-slate-500 font-normal">SMASH</span></div>
                    <div className="text-slate-200 flex flex-col items-center"><span>{metRate}%</span><span className="text-[8px] text-slate-500 font-normal">MET</span></div>
                    <div className="text-red-400 flex flex-col items-center"><span>{bustRate}%</span><span className="text-[8px] text-slate-500 font-normal">BUST</span></div>
                 </div>
                 {/* Mini Bar Chart with Defined Ticks */}
                 <div className="w-full h-2 bg-slate-800 rounded-full mt-1 flex overflow-hidden relative">
                    <div className="bg-emerald-500 h-full" style={{width: `${smashRate}%`}}></div>
                    <div className="bg-slate-400 h-full" style={{width: `${metRate}%`}}></div>
                    <div className="bg-red-500 h-full" style={{width: `${bustRate}%`}}></div>
                    
                    {/* Tick Marks for Visual Clarity */}
                    {smashRate > 0 && metRate > 0 && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-950 z-10" style={{left: `${smashRate}%`}}></div>}
                    {(smashRate + metRate) < 100 && <div className="absolute top-0 bottom-0 w-0.5 bg-slate-950 z-10" style={{left: `${smashRate + metRate}%`}}></div>}
                 </div>
                 {/* Labels for Thresholds */}
                 <div className="flex justify-between text-[8px] text-slate-600 mt-0.5 w-full">
                     <span>&gt;+3</span>
                     <span className="text-center">+/-3</span>
                     <span>&lt;-3</span>
                 </div>
            </div>

             {/* Card 4: Adjusted Median (UPDATED WITH DEBUG INFO) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center shadow-lg relative overflow-hidden">
                 <div className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-amber-500"/> Adjusted Median</div>
                 <div className="text-3xl font-black text-white">{medianPct}%</div>
                 <div className="text-[10px] text-slate-400">
                    {kickersAtMedian} of {activeGames.length} kickers
                 </div>
                 {/* NEW: Debug line showing the calculated median value */}
                 <div className="text-[9px] text-slate-600 mt-1 border-t border-slate-800 pt-1">
                    Median Value: {medianPct}%
                 </div>
            </div>
            
             {/* Filter Buttons Row */}
             <div className="flex justify-end mb-4">
                <div className="flex gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
                    {['ALL', 'LIVE', 'FINISHED', 'UPCOMING'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{f}</button>
                    ))}
                </div>
             </div>
        </div>

        {/* --- PLAYER CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPlayers.map((p, i) => {
                const liveScore = calculateLiveScore(p, scoring);
                const proj = p.proj;
                
                // Performance % Calculation
                const performancePct = proj > 0 ? Math.round((liveScore / proj) * 100) : 0;

                const isBeat = liveScore >= proj;
                const isSmashed = liveScore >= proj + 3;
                const status = getGameStatus(p.game_dt);
                
                let statusColor = "bg-slate-800 text-slate-400";
                let StatusIcon = Calendar;
                if (status === 'LIVE') { statusColor = "bg-red-900/50 text-red-400 animate-pulse"; StatusIcon = PlayCircle; }
                if (status === 'FINISHED') { statusColor = "bg-emerald-900/30 text-emerald-400"; StatusIcon = CheckCircle2; }
                if (status === 'UPCOMING') { statusColor = "bg-blue-900/30 text-blue-400"; StatusIcon = Clock; }

                const isSpecial = p.kicker_player_name.includes('Aubrey') || p.team === 'DAL';
                const borderClass = isSpecial ? "border-blue-500 shadow-lg shadow-blue-900/20" : "border-slate-800";
                const glowClass = isSmashed ? "shadow-[0_0_15px_rgba(59,130,246,0.5)] border-blue-400" : "";

                // Visual % for Bar Width (Capped at 100% so bar doesn't overflow)
                const visualPct = Math.min(100, Math.max(5, performancePct));

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
                             {/* Field Markings */}
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

                             {/* Fill Bar */}
                             <div 
                                className={`h-full transition-all duration-1000 ease-out z-10 relative ${isSmashed ? 'bg-blue-500/60' : isBeat ? 'bg-emerald-500/60' : 'bg-yellow-500/50'}`} 
                                style={{ width: `${visualPct}%` }}
                             ></div>
                             
                             {/* Ball Icon */}
                             <div 
                                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 transition-all duration-1000 ease-out z-30 flex items-center justify-center filter drop-shadow-lg" 
                                style={{ left: `calc(${visualPct}% - 16px)` }}
                             >
                                 <FootballIcon isFire={isSmashed} />
                             </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 relative z-10">
                            {/* PERFORMANCE % BADGE */}
                            {proj > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${performancePct >= 100 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {performancePct}% of Proj
                                </span>
                            )}

                            {(p.wk_fg_50_59 > 0 || p.wk_fg_60_plus > 0) && <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">{p.wk_fg_50_59 + p.wk_fg_60_plus}x 50+</span>}
                            {(p.wk_fg_40_49 > 0) && <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">{p.wk_fg_40_49}x 40-49</span>}
                            {(p.wk_fg_0_19 + p.wk_fg_20_29 + p.wk_fg_30_39 > 0) && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_fg_0_19 + p.wk_fg_20_29 + p.wk_fg_30_39}x Short FG</span>}
                            {(p.wk_xp_made > 0) && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_xp_made}x XP</span>}
                            {(p.wk_fg_miss > 0 || p.wk_xp_miss > 0) && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-800/50 line-through decoration-red-500/50">{p.wk_fg_miss + p.wk_xp_miss} Miss</span>}
                            
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