import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { calculateLiveScore, getGameStatus } from '../utils/scoring';
import { FootballIcon } from './KickerComponents';

const AccuracyTab = ({ players, scoring, week }) => {
  const [filter, setFilter] = useState('ALL');

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
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-lg border border-slate-800 w-fit mx-auto">
            {['ALL', 'LIVE', 'FINISHED', 'UPCOMING'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{f}</button>
            ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayPlayers.map((p, i) => {
                const liveScore = calculateLiveScore(p, scoring);
                const proj = p.proj;
                const pct = Math.min(100, Math.max(5, (liveScore / proj) * 100)); 
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

                        {/* SCOREBOARD (FLIPPED: Actual Left, Projected Right) */}
                        <div className="flex justify-between items-end mb-2 relative z-10">
                            <div className="text-left">
                                <span className={`text-3xl font-black ${isSmashed ? 'text-blue-400' : isBeat ? 'text-emerald-400' : 'text-white'}`}>{liveScore}</span>
                                <span className="text-xs text-slate-500 ml-1">pts</span>
                            </div>
                            <div className="text-xs text-slate-400 font-bold text-right">
                                PROJECTED: <span className="text-white text-base">{proj}</span>
                            </div>
                        </div>

                        {/* REALISTIC FOOTBALL FIELD */}
                        <div className="h-10 w-full bg-emerald-700 rounded-md relative mb-4 border-2 border-white overflow-hidden mt-2 shadow-inner group">
                             
                             {/* Endzones (Left and Right) - Solid White */}
                             <div className="absolute left-0 top-0 bottom-0 w-3 bg-white z-10 border-r border-slate-300/50"></div>
                             <div className="absolute right-0 top-0 bottom-0 w-3 bg-white z-10 border-l border-slate-300/50"></div>

                             {/* Field Markings */}
                             <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none z-0">
                                 {/* 10 Segments = 9 Internal Lines */}
                                 {[...Array(9)].map((_, idx) => {
                                     const isMidfield = idx === 4; // 50 yard line (5th line)
                                     return (
                                         <div 
                                            key={idx} 
                                            className={`${isMidfield ? 'h-full w-0.5 bg-white' : 'h-[60%] w-px bg-white'}`}
                                         ></div>
                                     );
                                 })}
                             </div>
                             
                             {/* Center Field Logo (Fully Opaque, On top of lines) */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                 <img src="/assets/logo.png" className="w-8 h-8 object-contain drop-shadow-md" alt="logo"/>
                             </div>

                             {/* Progress Fill (Semi-Transparent Blue/Green/Yellow) */}
                             <div 
                                className={`h-full transition-all duration-1000 ease-out z-20 relative ${isSmashed ? 'bg-blue-600/70' : isBeat ? 'bg-emerald-600/70' : 'bg-yellow-500/60'}`} 
                                style={{ width: `${pct}%` }}
                             ></div>
                             
                             {/* Ball Icon (On Top of Everything) */}
                             <div 
                                className="absolute top-1/2 -translate-y-1/2 w-10 h-10 transition-all duration-1000 ease-out z-30 flex items-center justify-center filter drop-shadow-xl" 
                                style={{ left: `calc(${pct}% - 20px)` }}
                             >
                                 <FootballIcon isFire={isSmashed} />
                             </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 relative z-10">
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