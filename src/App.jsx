import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Wind, Calendar, Info, MapPin, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Calculator, RefreshCw, AlertTriangle, Loader2, Stethoscope } from 'lucide-react';

// --- GLOSSARY DATA (Static) ---
const GLOSSARY_DATA = [
  {
    header: "Grade",
    title: "Matchup Grade",
    desc: "Composite score (0-100) combining Stall Rates, Weather, and History.",
    why: "Predictive Model. 100+ is a 'Smash Spot'. <75 is a 'Sit'."
  },
  {
    header: "Proj Pts",
    title: "Projected Points",
    desc: "Forecasted score based on Kicker's Average adjusted by the Matchup Grade.",
    why: "The bottom line. Use this to make Start/Sit decisions."
  },
  {
    header: "L4 Off %",
    title: "Offensive Stall Rate (L4)",
    desc: "Last 4 Weeks: % of drives inside the 25 that fail to score a TD.",
    why: "Recent Trend. A high number means the offense is moving but struggling to finish. (Good for Kickers)."
  },
  {
    header: "L4 Def %",
    title: "Opponent Force Rate (L4)",
    desc: "Last 4 Weeks: % of drives allowed inside the 25 that resulted in FGs.",
    why: "Matchup. Does the opponent bend but don't break?"
  },
  {
    header: "Vegas",
    title: "Implied Team Total",
    desc: "Points Vegas expects this team to score (based on Spread/Total).",
    why: "Reality Check. If Vegas predicts 28 points, the kicker has a high ceiling."
  },
  {
    header: "Off PF",
    title: "Offense Points For (L4)",
    desc: "Average points scored by the kicker's team over the last 4 weeks.",
    why: "Current Form. ❄️ indicates a cold offense (<15 PPG)."
  },
  {
    header: "Opp PA",
    title: "Opponent Points Allowed (L4)",
    desc: "Average points allowed by the opponent over the last 4 weeks.",
    why: "Defense Quality. 🛡️ indicates an elite defense (<17 PPG allowed)."
  }
];

// --- COMPONENT: HEADER CELL ---
const HeaderCell = ({ label, description, avg }) => (
  <th className="px-3 py-3 text-center group relative cursor-help">
    <div className="flex items-center justify-center gap-1">
      {label}
      <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl text-xs normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      <div className="text-white font-semibold mb-1">{description}</div>
      {avg !== undefined && <div className="text-blue-300">League Avg: {Number(avg).toFixed(1)}</div>}
      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
    </div>
  </th>
);

// --- COMPONENT: PLAYER CELL (Headshot + Status) ---
const PlayerCell = ({ player, subtext }) => (
  <td className="px-6 py-4 font-medium text-white">
    <div className="flex items-center gap-3">
      <div className="relative group">
        <img 
          src={player.headshot_url} 
          alt={player.kicker_player_name}
          className={`w-10 h-10 rounded-full bg-slate-800 border-2 object-cover border-${player.injury_color || 'green'}-500`}
          onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}} 
        />
        {/* Injury Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-slate-900 border border-slate-700 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
           <div className={`font-bold text-${player.injury_color || 'green'}-400 mb-1`}>Status: {player.injury_status}</div>
           <div className="text-slate-400">{player.injury_details}</div>
        </div>
      </div>
      <div>
        <div className="text-base">{player.kicker_player_name}</div>
        <div className="text-xs text-slate-500">{subtext}</div>
      </div>
    </div>
  </td>
);

// --- COMPONENT: DEEP DIVE ROW ---
const DeepDiveRow = ({ player }) => (
  <tr className="bg-slate-900/50 border-b border-slate-800">
    <td colSpan="10" className="p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Math Worksheet: {player.kicker_player_name}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
            <div className="text-slate-400 font-semibold mb-2">1. GRADE CALCULATION</div>
            <div className="flex justify-between mb-1"><span>Offense Score:</span> <span className="text-blue-300">{player.off_score_val}</span></div>
            <div className="flex justify-between mb-1"><span>Defense Score:</span> <span className="text-blue-300">{player.def_score_val}</span></div>
            <div className="flex justify-between mb-1 border-b border-slate-800 pb-1">
              <span>Bonuses:</span> 
              <span className="text-emerald-400 text-[10px] text-right ml-2">
                {player.grade_details && player.grade_details.length > 0 ? player.grade_details.join(', ') : "None"}
              </span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-white">
              <span>Total Grade:</span> <span>{player.grade}</span>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
            <div className="text-slate-400 font-semibold mb-2">2. WEIGHTED PROJECTION</div>
            <div className="flex justify-between mb-1">
              <span>Base (50%):</span> 
              <span className="text-slate-300">{(player.avg_pts * (player.grade/90)).toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Offense Est (30%):</span> 
              <span className="text-amber-400">{player.off_cap_val} pts</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Defense Est (20%):</span> 
              <span className="text-amber-400">{player.def_cap_val} pts</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-800 pt-1">
              <div>Off Share: {(player.off_share * 100).toFixed(0)}% | Def Share: {(player.def_share * 100).toFixed(0)}%</div>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col justify-center items-center text-center">
             <div className="text-slate-400 font-semibold mb-1">FINAL PROJECTION</div>
             <div className="text-2xl font-bold text-emerald-400">{player.proj}</div>
             {player.injury_status === 'OUT' && <div className="text-red-500 font-bold text-xs mt-1">PLAYER IS OUT</div>}
             <div className="text-[10px] text-slate-500 mt-1">Combined Weighted Score</div>
          </div>
        </div>
      </div>
    </td>
  </tr>
);

const App = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('potential');
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LIVE DATA FETCH ---
  useEffect(() => {
    // FIXED: Removed leading slash for better relative path support
    fetch('kicker_data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return response.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading JSON:", err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  const toggleRow = (rank) => setExpandedRow(expandedRow === rank ? null : rank);

  if (loading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" /><p className="text-slate-400 animate-pulse">Loading Kicker Intelligence...</p></div>;
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Data Not Found</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <div className="text-sm text-slate-600 bg-slate-900 p-4 rounded">
          <p>Troubleshooting:</p>
          <ul className="list-disc text-left ml-4 mt-2 space-y-1">
             <li>Verify <strong>kicker_data.json</strong> exists in the <strong>public</strong> folder on GitHub.</li>
             <li>Ensure Vercel deployment has finished.</li>
             <li>Try visiting <strong>/kicker_data.json</strong> directly in your browser address bar.</li>
          </ul>
        </div>
      </div>
    );
  }

  const { rankings, ytd, injuries, meta } = data;

  const outKickers = injuries?.filter(k => k.injury_status === 'OUT') || [];
  const doubtfulKickers = injuries?.filter(k => k.injury_status === 'Doubtful') || [];
  const questionableKickers = injuries?.filter(k => k.injury_status === 'Questionable') || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Kicker<span className="text-blue-500">Genius</span>
            </h1>
            <p className="text-slate-400">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-500/10 p-2 rounded-md"><RefreshCw className="w-5 h-5 text-blue-400" /></div>
            <div><div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last Updated</div><div className="text-sm font-semibold text-white">{meta.updated} (Week {meta.week})</div></div>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button onClick={() => setActiveTab('potential')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'potential' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'}`}><TrendingUp className="w-4 h-4"/> Week {meta.week} Model</button>
          <button onClick={() => setActiveTab('ytd')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'ytd' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}><Activity className="w-4 h-4"/> Historical YTD</button>
          <button onClick={() => setActiveTab('injuries')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'injuries' ? 'text-white border-b-2 border-red-500' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Injury Report {injuries && injuries.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{injuries.length}</span>}</button>
          <button onClick={() => setActiveTab('glossary')} className={`pb-3 px-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 ${activeTab === 'glossary' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500'}`}><BookOpen className="w-4 h-4"/> Stats Legend</button>
        </div>

        {activeTab === 'injuries' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {outKickers.length > 0 && (
               <div className="bg-red-900/20 rounded-xl border border-red-800/50 overflow-hidden">
                 <div className="p-4 bg-red-900/40 border-b border-red-800/50 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-white">OUT / IR</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {outKickers.map((k, i) => (
                       <div key={i} className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                          <img src={k.headshot_url} className="w-12 h-12 rounded-full border-2 border-red-600 object-cover" onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}}/>
                          <div>
                             <div className="font-bold text-white">{k.kicker_player_name} ({k.team})</div>
                             <div className="text-xs text-red-300">{k.injury_details}</div>
                             <div className="text-xs text-slate-500 mt-1">Total FPts: {k.fpts}</div>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
             )}
             {doubtfulKickers.length > 0 && (
               <div className="bg-orange-900/20 rounded-xl border border-orange-800/50 overflow-hidden">
                 <div className="p-4 bg-orange-900/40 border-b border-orange-800/50 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-white">DOUBTFUL</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {doubtfulKickers.map((k, i) => (
                       <div key={i} className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                          <img src={k.headshot_url} className="w-12 h-12 rounded-full border-2 border-orange-500 object-cover" onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}}/>
                          <div>
                             <div className="font-bold text-white">{k.kicker_player_name} ({k.team})</div>
                             <div className="text-xs text-orange-300">{k.injury_details}</div>
                             <div className="text-xs text-slate-500 mt-1">Total FPts: {k.fpts}</div>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
             )}
             {questionableKickers.length > 0 && (
               <div className="bg-yellow-900/20 rounded-xl border border-yellow-800/50 overflow-hidden">
                 <div className="p-4 bg-yellow-900/40 border-b border-yellow-800/50 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-white">QUESTIONABLE</h3>
                 </div>
                 <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questionableKickers.map((k, i) => (
                       <div key={i} className="flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                          <img src={k.headshot_url} className="w-12 h-12 rounded-full border-2 border-yellow-500 object-cover" onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}}/>
                          <div>
                             <div className="font-bold text-white">{k.kicker_player_name} ({k.team})</div>
                             <div className="text-xs text-yellow-300">{k.injury_details}</div>
                             <div className="text-xs text-slate-500 mt-1">Total FPts: {k.fpts}</div>
                          </div>
                       </div>
                    ))}
                 </div>
               </div>
             )}
             {(!outKickers.length && !doubtfulKickers.length && !questionableKickers.length) && (
                <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                   No kickers currently listed on the injury report!
                </div>
             )}
           </div>
        )}

        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Player</th>
                    <HeaderCell label="Proj" description="Projected Points" />
                    <HeaderCell label="Grade" description="Matchup Grade (0-100)" />
                    <th className="px-6 py-3 text-center">Weather</th>
                    <HeaderCell label="Off Stall%" description="Offense Stall Rate (L4)" avg={meta.league_avgs.off_stall} />
                    <HeaderCell label="Def Stall%" description="Opponent Force Rate (L4)" avg={meta.league_avgs.def_stall} />
                    <HeaderCell label="Vegas" description="Implied Team Total" />
                    <HeaderCell label="Off PF" description="Team Points For (L4)" />
                    <HeaderCell label="Opp PA" description="Opp Points Allowed (L4)" />
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rankings.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr onClick={() => toggleRow(idx)} className="hover:bg-slate-800/50 cursor-pointer transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500">#{idx + 1}</td>
                        <PlayerCell player={row} subtext={`${row.team} vs ${row.opponent}`} />
                        <td className={`px-6 py-4 text-center text-lg font-bold ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.proj}</td>
                        <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${row.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>{row.grade}</span></td>
                        <td className="px-6 py-4 text-center text-xs font-mono text-slate-400">{row.weather_desc}</td>
                        <td className="px-6 py-4 text-center text-blue-300">{row.off_stall_rate}%</td>
                        <td className="px-6 py-4 text-center text-slate-400">{row.def_stall_rate}%</td>
                        <td className="px-6 py-4 text-center font-mono text-amber-400">{row.vegas.toFixed(1)}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-300">{row.off_ppg.toFixed(1)} {row.off_ppg < 15 && "❄️"}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-300">{row.def_pa.toFixed(1)} {row.def_pa < 17 && "🛡️"}</td>
                        <td className="px-6 py-4 text-slate-600">{expandedRow === idx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                      </tr>
                      {expandedRow === idx && <DeepDiveRow player={row} />}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ytd' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Player</th>
                    <HeaderCell label="FPts" description="Total Fantasy Points" avg={meta.league_avgs.fpts} />
                    <th className="px-6 py-3 text-center">FG (M/A)</th>
                    <HeaderCell label="50+ Yds" description="Long Distance Makes" />
                    <HeaderCell label="Dome %" description="Dome Games Played" />
                    <HeaderCell label="FG RZ Trips" description="Drives reaching FG Range" />
                    <HeaderCell label="Off Stall %" description="Season Long Stall Rate" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ytd.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">#{idx + 1}</td>
                      <PlayerCell player={row} subtext={row.team} />
                      <td className="px-6 py-4 text-center font-bold text-emerald-400">{row.fpts}</td>
                      <td className="px-6 py-4 text-center text-slate-300">{row.made}/{row.att}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded ${row.longs >= 4 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}>{row.longs}</span></td>
                      <td className="px-6 py-4 text-center text-blue-300">{row.dome_pct}%</td>
                      <td className="px-6 py-4 text-center text-slate-300">{row.rz_trips}</td>
                      <td className="px-6 py-4 text-center font-mono text-blue-300">{row.off_stall_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'glossary' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950"><tr><th className="px-6 py-4">Metric</th><th className="px-6 py-4">Definition</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {GLOSSARY_DATA.map((item, idx) => (
                      <tr key={idx}><td className="px-6 py-4 font-mono text-blue-300">{item.header}</td><td className="px-6 py-4 text-slate-400">{item.desc} <div className="text-emerald-400 text-xs mt-1">{item.why}</div></td></tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;