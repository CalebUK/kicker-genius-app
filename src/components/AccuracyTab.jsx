import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, Clock, Calendar, Target, TrendingUp, Activity } from 'lucide-react';
import { calculateLiveScore, getGameStatus } from '../utils/scoring';
import { FootballIcon } from './KickerComponents';

const AccuracyTab = ({ players, scoring, week }) => {
  const [filter, setFilter] = useState('ALL');

  // --- 1. CALCULATE SITE ACCURACY (LIVE/FINISHED ONLY) ---
  const activeGames = players.filter(p => {
      // Exclude players with 0 projection (likely bye week or backup)
      if (p.proj <= 0) return false;
      
      const status = getGameStatus(p.game_dt);
      // ONLY count games that have started
      return status === 'LIVE' || status === 'FINISHED';
  });

  // Sum up the Actual Points and Projected Points for all active games
  const totalActual = activeGames.reduce((acc, p) => acc + calculateLiveScore(p, scoring), 0);
  const totalProj = activeGames.reduce((acc, p) => acc + p.proj, 0);
  
  const diff = totalActual - totalProj;
  // Avoid division by zero
  const accuracyPct = totalProj > 0 ? ((totalActual / totalProj) * 100).toFixed(1) : '0.0';
  
  const diffSign = diff >= 0 ? '+' : '';
  const diffColor = diff >= 0 ? 'text-emerald-400' : 'text-red-400';

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
        
        {/* --- LIVE ACCURACY TRACKER (NFL WIDE) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl flex items-center justify-between shadow-lg relative overflow-hidden group col-span-1 md:col-span-2">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-slate-900/0 z-0"></div>
                 <div className="relative z-10">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-400" /> Model Accuracy (Week {week})
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                        <span className={`text-2xl md:text-3xl font-black text-white`}>
                            {totalActual} <span className="text-lg font-normal text-slate-500">vs</span> {totalProj.toFixed(1)}
                        </span>
                        <span className={`text-sm font-bold ${diffColor} bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800`}>
                            {diffSign}{diff.toFixed(1)} ({accuracyPct}%)
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                        Tracking {activeGames.length} Live/Finished games. (Upcoming games excluded)
                    </div>
                 </div>
            </div>
            
             {/* Filter Buttons */}
             <div className="flex items-center justify-center md:justify-end">
                <div className="flex gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
                    {['ALL', 'LIVE', 'FINISHED', 'UPCOMING'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-md text-[10px] font-bold transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{f}</button>
                    ))}
                </div>
             </div>
        </div>

        {/* --- PLAYER CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPlayers.map((p, i) => {
                const liveScore = calculateLiveScore(p, scoring);
                const proj = p.proj;
                
                // 50% = halfway, 100% = met projection, >100% = exceeding
                const pct = proj > 0 ? Math.min(100, Math.max(5, (liveScore / proj) * 100)) : 0; 
                
                const isBeat = liveScore >= proj;
                const isSmashed = liveScore >= proj + 3;
                const status = getGameStatus(p.game_dt);
                
                // Calculate Performance % (Actual / Projected)
                const performancePct = proj > 0 ? Math.round((liveScore / proj) * 100) : 0;
                
                let statusColor = "bg-slate-800 text-slate-400";
                let StatusIcon = Calendar;
                if (status === 'LIVE') { statusColor = "bg-red-900/50 text-red-400 animate-pulse"; StatusIcon = PlayCircle; }
                if (status === 'FINISHED') { statusColor = "bg-emerald-900/30 text-emerald-400"; StatusIcon = CheckCircle2; }
                if (status === 'UPCOMING') { statusColor = "bg-blue-900/30 text-blue-400"; StatusIcon = Clock; }

                const isSpecial = p.kicker_player_name.includes('Aubrey') || p.team === 'DAL';
                const borderClass = isSpecial ? "border-blue-500 shadow-lg shadow-blue-900/20" : "border-slate-800";
                const glowClass = isSmashed ? "shadow-[0_0_15px_rgba(59,130,246,0.5)] border-blue-400" : "";

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

                        {/* SCOREBOARD (Actual Left, Projected Right) */}
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
                        <div className="h-10 w-full bg-emerald-800 rounded-md relative mb-4 border-2 border-emerald-900 overflow-hidden mt-2 shadow-inner group">
                             
                             {/* Endzones (Left and Right) - Solid White */}
                             <div className="absolute left-0 top-0 bottom-0 w-3 bg-white z-10 border-r border-slate-300/50"></div>
                             <div className="absolute right-0 top-0 bottom-0 w-3 bg-white z-10 border-l border-slate-300/50"></div>

                             {/* Field Markings */}
                             <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none z-0">
                                 {[...Array(9)].map((_, idx) => {
                                     const isMidfield = idx === 4; // 50 yard line
                                     const isYardLine = idx % 2 === 0; // Every 20% is a "Yard Line"
                                     
                                     return (
                                         <div 
                                            key={idx} 
                                            className={`
                                                ${isMidfield ? 'h-full w-1 bg-white' : ''} 
                                                ${!isMidfield && isYardLine ? 'h-full w-px bg-white/60' : ''}
                                                ${!isMidfield && !isYardLine ? 'h-[40%] w-px bg-white/40' : ''}
                                            `}
                                         ></div>
                                     );
                                 })}
                             </div>
                             
                             {/* Center Field Logo */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                 <img src="/assets/logo.png" className="w-6 h-6 object-contain drop-shadow-md" alt="logo"/>
                             </div>

                             {/* Progress Fill */}
                             <div 
                                className={`h-full transition-all duration-1000 ease-out z-20 relative ${isSmashed ? 'bg-blue-600/70' : isBeat ? 'bg-emerald-600/70' : 'bg-yellow-500/60'}`} 
                                style={{ width: `${pct}%` }}
                             ></div>
                             
                             {/* Ball Icon */}
                             <div 
                                className="absolute top-1/2 -translate-y-1/2 w-10 h-10 transition-all duration-1000 ease-out z-30 flex items-center justify-center filter drop-shadow-xl" 
                                style={{ left: `calc(${pct}% - 20px)` }}
                             >
                                 <FootballIcon isFire={isSmashed} />
                             </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 relative z-10">
                            
                            {/* NEW: PERFORMANCE BADGE (Actual / Proj %) */}
                            {proj > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${performancePct >= 100 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {performancePct}% of Proj
                                </span>
                            )}

                            {/* DETAILED KICK LOG */}
                            {(p.wk_fg_60_plus > 0) && <span className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700">{p.wk_fg_60_plus}x 60+</span>}
                            {(p.wk_fg_50_59 > 0) && <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">{p.wk_fg_50_59}x 50-59</span>}
                            {(p.wk_fg_40_49 > 0) && <span className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/50">{p.wk_fg_40_49}x 40-49</span>}
                            {(p.wk_fg_30_39 > 0) && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_fg_30_39}x 30-39</span>}
                            {(p.wk_fg_20_29 > 0) && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_fg_20_29}x 20-29</span>}
                            {(p.wk_fg_0_19 > 0) && <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_fg_0_19}x 0-19</span>}
                            
                            {(p.wk_xp_made > 0) && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{p.wk_xp_made}x XP</span>}
                            
                            {(p.wk_fg_miss > 0 || p.wk_xp_miss > 0) && (
                                <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-800/50 line-through decoration-red-500/50">
                                    {(p.wk_fg_miss || 0) + (p.wk_xp_miss || 0)} Miss
                                </span>
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