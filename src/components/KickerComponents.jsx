import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Flame, Calculator, Target, BrainCircuit, Shield, User } from 'lucide-react';
import { calcFPts } from '../utils/scoring';

// --- SAFE IMAGE COMPONENT ---
export const PlayerAvatar = ({ src, alt, borderColor = "border-slate-600", size = "w-12 h-12" }) => {
  const [error, setError] = useState(false);

  // 1. Handle Aubrey Custom Image
  let finalSrc = src;
  if (alt && (alt.includes('Aubrey') || alt === 'B.Aubrey') && !error) {
     // Try custom first, fallback to src if it fails (handled by onError)
     finalSrc = '/assets/aubrey_custom.png';
  }

  if (error) {
    // Fallback UI: A simple shield/helmet icon
    return (
      <div className={`${size} rounded-full border-2 ${borderColor} bg-slate-800 flex items-center justify-center shrink-0`}>
         <Shield className="w-1/2 h-1/2 text-slate-500" />
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={`${size} rounded-full border-2 object-cover shrink-0 ${borderColor} bg-slate-950`}
      onError={(e) => {
          // If custom aubrey fails, try the real src. If that fails (or if we were already using real src), show icon.
          if (finalSrc.includes('aubrey_custom.png') && src) {
              e.target.src = src; // Try original URL
          } else {
              setError(true); // Switch to Icon
          }
      }}
    />
  );
};

// --- FOOTBALL ICON ---
export const FootballIcon = ({ isFire }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    {isFire && (
      <div className="absolute -top-3 -right-1 text-orange-500 animate-pulse">
        <Flame className="w-6 h-6 fill-orange-500 text-yellow-400" />
      </div>
    )}
    <svg viewBox="0 0 100 60" className={`w-full h-full drop-shadow-md transform transition-transform ${isFire ? 'rotate-12' : '-rotate-12'}`}>
      <ellipse cx="50" cy="30" rx="48" ry="28" fill="#8B4513" stroke="#3E2723" strokeWidth="2" />
      <path d="M 25 10 Q 35 30 25 50" stroke="white" strokeWidth="3" fill="none" opacity="0.9" />
      <path d="M 75 10 Q 65 30 75 50" stroke="white" strokeWidth="3" fill="none" opacity="0.9" />
      <path d="M 35 30 L 65 30" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M 40 25 L 40 35" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M 50 25 L 50 35" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M 60 25 L 60 35" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </div>
);

export const HeaderCell = ({ label, description, avg, sortKey, currentSort, onSort }) => {
  const isActive = currentSort?.key === sortKey;
  return (
    <th onClick={() => onSort && onSort(sortKey)} className={`px-2 py-3 text-center align-middle group relative cursor-pointer leading-tight min-w-[90px] select-none hover:bg-slate-800/80 transition-colors ${isActive ? 'bg-slate-800/50' : ''}`}>
      <div className="flex flex-col items-center justify-center h-full gap-0.5">
        <div className="flex items-center gap-1 mt-0.5">
          <span className={isActive ? "text-blue-400" : "text-slate-300"}>{label}</span>
          {onSort && (isActive ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />)}
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

export const HistoryBars = ({ games }) => {
  if (!games || games.length === 0) return <div className="text-xs text-slate-500">No recent data</div>;
  return (
    <div className="space-y-3">
      {games.map((g, i) => {
        if (g.status === 'BYE' || g.status === 'DNS') return <div key={i} className="text-[10px]"><div className="text-slate-500 mb-0.5">Wk {g.week}: {g.status}</div><div className="w-full bg-slate-800/50 h-4 rounded-full relative"><div className="bg-slate-700 h-full rounded-full" style={{width: '100%'}}></div></div></div>;
        const projRounded = Math.round(g.proj); const diff = g.act - projRounded; const maxVal = Math.max(20, projRounded, g.act); const projPct = (projRounded / maxVal) * 100; const actPct = (g.act / maxVal) * 100;
        return (
          <div key={i} className="text-[10px]">
            <div className="flex justify-between text-slate-400 mb-0.5 font-bold"><span>Wk {g.week} vs {g.opp}</span><span className={g.act >= projRounded ? "text-green-400" : "text-red-400"}>{g.act >= projRounded ? "+" : ""}{diff}</span></div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full mb-1 relative"><div className="bg-slate-600 h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2" style={{ width: `${projPct}%` }}><span className="text-[9px] text-white font-bold leading-none">Projection {projRounded}</span></div></div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full relative"><div className={`${g.act >= projRounded ? "bg-green-500" : "bg-red-500"} h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2`} style={{ width: `${actPct}%` }}><span className="text-[9px] text-white font-bold leading-none">Actual {g.act}</span></div></div>
          </div>
        );
      })}
    </div>
  );
};

export const PlayerCell = ({ player, subtext, sleeperStatus }) => {
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

  // Parse Injury
  const details = player.injury_details || '';
  const match = details.match(/^(.+?)\s\((.+)\)$/);
  let displayInjury = '', displayStatus = '';
  if (match) { const reportStatus = match[1]; const injuryType = match[2]; displayInjury = `${player.injury_status}: ${injuryType}`; displayStatus = reportStatus; } 
  else { displayInjury = details; }

  return (
    <td className="px-3 py-4 font-medium text-white">
      <div className="flex flex-col justify-center">
          <div className="text-xs md:text-sm font-bold text-white leading-tight mb-2 whitespace-normal break-words flex items-center gap-1">
            {player.kicker_player_name}
            {player.isTop5 && <span title="Top 5 Scorer (Season)" className="text-sm">🔥</span>}
          </div>
          
          <div className="flex items-center gap-3">
              <div className="relative group flex-shrink-0">
                {/* NEW AVATAR COMPONENT */}
                <PlayerAvatar 
                  src={player.headshot_url} 
                  alt={player.kicker_player_name}
                  borderColor={borderColor.replace('border', 'border-')} 
                  size="w-10 h-10"
                />
                
                {statusText !== '' && (
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-auto whitespace-nowrap p-2 bg-slate-900 border border-slate-700 rounded text-xs opacity-0 group-hover:opacity-100 z-50 shadow-xl pointer-events-none">
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
                <div className="text-xs text-slate-400 truncate">{subtext}</div>
                {player.own_pct > 0 && ( <div className={`text-[9px] mt-0.5 font-bold ${ownColor}`}>Own: {player.own_pct.toFixed(1)}%</div> )}
                {/* SLEEPER BADGES MOVED HERE FOR COMPACTNESS */}
                {sleeperStatus === 'MY_TEAM' && <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/50 px-1 py-0.5 rounded mt-1 inline-block">My Team</span>}
                {sleeperStatus === 'TAKEN' && <span className="text-[9px] bg-slate-700/50 text-slate-400 border border-slate-600/50 px-1 py-0.5 rounded mt-1 inline-block">Taken</span>}
                {sleeperStatus === 'FREE_AGENT' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-1 py-0.5 rounded mt-1 inline-block">Free Agent</span>}
              </div>
          </div>
      </div>
    </td>
  );
};

export const MathCard = ({ player, leagueAvgs, week }) => {
  if (!player) return null;
  const l3_proj = player.l3_proj_sum !== undefined ? player.l3_proj_sum : Math.round(player.history?.l3_proj || 0);
  const l3_act = player.l3_act_sum !== undefined ? player.l3_act_sum : (player.history?.l3_actual || 0);
  const l3_diff = l3_act - l3_proj;
  let trendColor = "text-slate-500"; let trendSign = "";
  if (l3_diff > 2.5) { trendColor = "text-green-400"; trendSign = "+"; } else if (l3_diff < -2.5) { trendColor = "text-red-400"; }
  const lgOffStall = leagueAvgs?.off_stall || 40; const lgDefStall = leagueAvgs?.def_stall || 40;
  const baseRaw = (player.avg_pts * (player.grade / 90)); const baseMult = (player.grade / 90).toFixed(2);
  const offRaw = player.off_cap_val; const offShare = ((player.off_share || 0.35)*100).toFixed(0); const defRaw = player.def_cap_val; 

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3"><Calculator className="w-4 h-4 text-emerald-400" /><h3 className="font-bold text-white text-sm">Math Worksheet: {player.kicker_player_name}</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <div className="text-blue-300 font-bold mb-1 pb-1 border-b border-slate-800">MATCHUP GRADE</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Offense Score</span><span className="font-mono text-white">{player.off_score_val}</span></div><div className="text-[9px] text-slate-500">({player.off_stall_rate}% / {lgOffStall}%) × 40</div></div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Defense Score</span><span className="font-mono text-white">{player.def_score_val}</span></div><div className="text-[9px] text-slate-500">({player.def_stall_rate}% / {lgDefStall}%) × 40</div></div>
            <div className="border-t border-slate-800 pt-1"><div className="text-[10px] text-slate-400 mb-0.5">Bonuses:</div><div className="text-emerald-400 text-[10px] space-y-0.5">{player.grade_details && player.grade_details.length > 0 ? player.grade_details.map((d, i) => <div key={i} className="flex justify-between"><span>{d}</span></div>) : <div className="text-slate-600 italic">None</div>}</div></div>
            <div className="mt-auto pt-2 border-t border-slate-700"><div className="flex justify-between font-bold text-white"><span>Total Grade</span><span>{player.grade}</span></div><div className="flex justify-between text-[10px] text-blue-400 mt-1"><span>Week {week} Multiplier (÷90)</span><span className="font-mono font-bold">{(player.grade / 90).toFixed(2)}x</span></div></div>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <div className="text-amber-400 font-bold mb-1 pb-1 border-b border-slate-800">WEIGHTED PROJECTION</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Base (50%)</span><span className="font-mono text-white">{(baseRaw * 0.5).toFixed(1)}</span></div><div className="text-[9px] text-slate-500 leading-tight">{player.avg_pts} (Avg) × {baseMult} (Grd) = {baseRaw.toFixed(1)}</div></div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Offense (30%)</span><span className="font-mono text-white">{(offRaw * 0.3).toFixed(1)}</span></div><div className="text-[9px] text-slate-500 leading-tight">{player.w_team_score} (Exp) × {offShare}% (Share) × 1.2 = {offRaw}</div></div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Defense (20%)</span><span className="font-mono text-white">{(defRaw * 0.2).toFixed(1)}</span></div><div className="text-[9px] text-slate-500 leading-tight">{player.w_def_allowed} (Allow) × 35% (Share) × 1.2 = {defRaw}</div></div>
            <div className="mt-auto pt-2 border-t border-slate-700"><div className="flex justify-between font-bold text-white text-[11px]"><span>Week {week} Projection</span><span className="text-emerald-400 text-lg">{player.proj}</span></div><div className="text-[9px] text-right text-slate-500">(Rounded)</div></div>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50"><div className="font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between"><div className="flex items-center gap-2 text-purple-400"><Target className="w-3 h-3"/> Last 3 Trend</div><span className={`text-[10px] font-mono ${trendColor}`}>{trendSign}{l3_diff.toFixed(1)}</span></div><HistoryBars games={player.history?.l3_games} /></div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col"><div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-slate-800 flex items-center gap-2"><BrainCircuit className="w-3 h-3" /> KICKERGENIUS INSIGHT</div><div className="text-xs text-slate-300 leading-relaxed h-full flex items-center">{player.narrative || "No specific analysis available for this player yet."}</div></div>
        </div>
        <div className="mt-3 bg-slate-800/40 p-2 rounded border border-slate-800 text-[10px] text-slate-400 flex gap-6 justify-center"><span><strong className="text-slate-200">Vegas:</strong> {player.details_vegas_spread} / {player.details_vegas_total} Total</span><span><strong className="text-slate-200">Implied Score:</strong> {player.vegas ? Number(player.vegas).toFixed(1) : '--'} pts</span><span><strong className="text-slate-200">L4 Team PF:</strong> {player.off_ppg ? Number(player.off_ppg).toFixed(1) : '--'} pts</span><span><strong className="text-slate-200">L4 Opp PA:</strong> {player.def_pa ? Number(player.def_pa).toFixed(1) : '--'} pts</span></div>
    </div>
  );
};

export const DeepDiveRow = ({ player, leagueAvgs, week, sleeperStatus }) => (
  <tr className="bg-slate-900/50 border-b border-slate-800">
    <td colSpan="11" className="p-4">
      <MathCard player={player} leagueAvgs={leagueAvgs} week={week} />
    </td>
  </tr>
);

export const InjuryCard = ({ k, borderColor, textColor, scoring }) => {
     const match = (k.injury_details || '').match(/^(.+?)\s\((.+)\)$/);
     return (
         <div className={`flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border ${borderColor}`}>
             {/* Use Avatar Here Too */}
            <PlayerAvatar src={k.headshot_url} alt={k.kicker_player_name} borderColor={borderColor.replace('border', 'border-')} />
            <div>
               <div className="font-bold text-white">{k.kicker_player_name} ({k.team})</div>
               {match ? ( <> <div className={`text-xs font-bold ${textColor}`}>{k.injury_status}: {match[2]}</div> <div className="text-xs text-slate-400 italic">{match[1]}</div> </> ) : ( <div className={`text-xs ${textColor}`}>{k.injury_details}</div> )}
               <div className="text-xs text-slate-500 mt-1">Total FPts: {calcFPts(k, scoring)}</div>
            </div>
         </div>
     );
};