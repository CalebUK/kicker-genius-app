import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Flame, Calculator, Target, BrainCircuit, AlertTriangle, ShieldAlert, UserMinus } from 'lucide-react';
import { calcFPts } from '../utils/scoring';

// ... (FootballIcon, HeaderCell, HistoryBars, PlayerCell, MathCard, DeepDiveRow remain unchanged) ...
// Ensure you copy them or I can provide the full file if needed, but only InjuryCard is changing below.

// --- INJURY CARD (FIXED BLEEDING) ---
export const InjuryCard = ({ k, borderColor, textColor, scoring }) => {
     const match = (k.injury_details || '').match(/^(.+?)\s\((.+)\)$/);
     return (
         <div className={`flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border ${borderColor} overflow-hidden`}>
            <img src={k.headshot_url} className={`w-12 h-12 rounded-full border-2 object-cover flex-shrink-0 ${borderColor.replace('border', 'border-')}`} onError={(e) => { e.target.onerror = null; e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'; }} />
            <div className="min-w-0 flex-1">
               <div className="font-bold text-white truncate">{k.kicker_player_name} ({k.team})</div>
               {match ? ( 
                 <> 
                   <div className={`text-xs font-bold ${textColor} truncate`}>{k.injury_status}: {match[2]}</div> 
                   <div className="text-xs text-slate-400 italic truncate">{match[1]}</div> 
                 </> 
               ) : ( 
                 <div className={`text-xs ${textColor} break-words`}>{k.injury_details}</div> 
               )}
               <div className="text-xs text-slate-500 mt-1">Total FPts: {calcFPts(k, scoring)}</div>
            </div>
         </div>
     );
};

// Re-export everything
export { FootballIcon, HeaderCell, HistoryBars, PlayerCell, MathCard, DeepDiveRow };