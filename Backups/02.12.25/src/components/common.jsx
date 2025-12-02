import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Flame } from 'lucide-react';

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
    <th 
      onClick={() => onSort && onSort(sortKey)}
      className={`px-2 py-3 text-center align-middle group relative cursor-pointer leading-tight min-w-[90px] select-none hover:bg-slate-800/80 transition-colors ${isActive ? 'bg-slate-800/50' : ''}`}
    >
      <div className="flex flex-col items-center justify-center h-full gap-0.5">
        <div className="flex items-center gap-1 mt-0.5">
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

export const HistoryBars = ({ games }) => {
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

        const projRounded = Math.round(g.proj);
        const diff = g.act - projRounded;
        const maxVal = Math.max(20, projRounded, g.act); 
        const projPct = (projRounded / maxVal) * 100;
        const actPct = (g.act / maxVal) * 100;
        
        return (
          <div key={i} className="text-[10px]">
            <div className="flex justify-between text-slate-400 mb-0.5 font-bold">
              <span>Wk {g.week} vs {g.opp}</span>
              <span className={g.act >= projRounded ? "text-green-400" : "text-red-400"}>
                {g.act >= projRounded ? "+" : ""}{diff}
              </span>
            </div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full mb-1 relative">
               <div className="bg-slate-600 h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2" style={{ width: `${projPct}%` }}>
                  <span className="text-[9px] text-white font-bold leading-none">Projection {projRounded}</span>
               </div>
            </div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full relative">
               <div className={`${g.act >= projRounded ? "bg-green-500" : "bg-red-500"} h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2`} style={{ width: `${actPct}%` }}>
                  <span className="text-[9px] text-white font-bold leading-none">Actual {g.act}</span>
               </div>
            </div>
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

  const isAubrey = player.kicker_player_name?.includes('Aubrey') || player.kicker_player_name === 'B.Aubrey';
  const imageUrl = isAubrey 
    ? '/assets/aubrey_custom.png' 
    : (player.headshot_url || 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png');

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
      <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
              <div className="text-xs md:text-sm font-bold text-white leading-tight whitespace-normal break-words flex items-center gap-1">
                {player.kicker_player_name}
                {player.isTop5 && <span title="Top 5 Scorer (Season)" className="text-sm">🔥</span>}
              </div>
              {sleeperStatus === 'MY_TEAM' && <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/50 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">MY TEAM</span>}
              {sleeperStatus === 'TAKEN' && <span className="text-[9px] bg-slate-700/50 text-slate-400 border border-slate-600/50 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">TAKEN</span>}
              {sleeperStatus === 'FREE_AGENT' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">FREE AGENT</span>}
          </div>
          
          <div className="flex items-center gap-3">
              <div className="relative group flex-shrink-0">
                <img 
                    src={imageUrl} 
                    alt={player.kicker_player_name}
                    className={`w-10 h-10 rounded-full bg-slate-800 border-2 object-cover shrink-0 ${borderColor}`} 
                    onError={(e) => { 
                        e.target.onerror = null;
                        if (e.target.src.includes('aubrey_custom.png')) {
                            e.target.src = player.headshot_url;
                        } else {
                            e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png';
                        }
                    }} 
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
                {player.own_pct > 0 && (
                   <div className={`text-[9px] mt-0.5 font-bold ${ownColor}`}>
                     Own: {player.own_pct.toFixed(1)}%
                   </div>
                )}
              </div>
          </div>
      </div>
    </td>
  );
};