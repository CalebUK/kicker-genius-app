import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Wind, Calendar, Info, MapPin, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Calculator, RefreshCw, AlertTriangle, Loader2, Stethoscope, Database, UserMinus, Settings, Save } from 'lucide-react';

// --- DEFAULT SCORING ---
const DEFAULT_SCORING = {
  fg0_19: 3, fg20_29: 3, fg30_39: 3, fg40_49: 4, fg50_59: 5, fg60_plus: 5,
  fg_miss: -1, xp_made: 1, xp_miss: -1
};

const HeaderCell = ({ label, description, avg }) => (
  <th className="px-3 py-3 text-center group relative cursor-help">
    <div className="flex items-center justify-center gap-1">
      {label}
      <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded shadow-xl text-xs normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      <div className="text-white font-semibold mb-1">{description}</div>
      {avg !== undefined && <div className="text-blue-300">League Avg: {Number(avg).toFixed(1)}</div>}
    </div>
  </th>
);

const PlayerCell = ({ player, subtext }) => {
  const borderColor = player.injury_color === 'green' ? 'border-green-500' :
                      player.injury_color === 'red-700' ? 'border-red-700' :
                      player.injury_color === 'red-500' ? 'border-red-500' :
                      player.injury_color === 'yellow-500' ? 'border-yellow-500' : 'border-slate-600';

  return (
    <td className="px-6 py-4 font-medium text-white">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <img src={player.headshot_url} alt={player.kicker_player_name}
            className={`w-10 h-10 rounded-full bg-slate-800 border-2 object-cover ${borderColor}`}
            onError={(e) => {e.target.src = 'https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png'}} 
          />
          {player.injury_status !== 'Healthy' && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-xs opacity-0 group-hover:opacity-100 z-50 shadow-xl">
                <div className={`font-bold text-${player.injury_color?.split('-')[0]}-400 mb-1`}>{player.injury_status}</div>
                <div className="text-slate-300">{player.injury_details}</div>
             </div>
          )}
        </div>
        <div>
          <div className="text-base">{player.kicker_player_name}</div>
          <div className="text-xs text-slate-500">{subtext}</div>
          {player.own_pct > 0 && (
             <div className={`text-[10px] mt-1 font-bold ${player.own_pct < 10 ? 'text-blue-400 animate-pulse' : 'text-slate-600'}`}>
               Own: {player.own_pct.toFixed(1)}%
             </div>
          )}
        </div>
      </div>
    </td>
  );
};

const App = () => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('potential');
  const [expandedRow, setExpandedRow] = useState(null);
  const [scoring, setScoring] = useState(DEFAULT_SCORING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedScoring = localStorage.getItem('kicker_scoring');
    if (savedScoring) setScoring(JSON.parse(savedScoring));

    fetch('kicker_data.json').then(res => res.json()).then(json => {
      setData(json); setLoading(false);
    }).catch(e => setLoading(false));
  }, []);

  const updateScoring = (key, val) => {
    const newScoring = { ...scoring, [key]: parseFloat(val) };
    setScoring(newScoring);
    localStorage.setItem('kicker_scoring', JSON.stringify(newScoring));
  };

  // --- DYNAMIC CALCULATION ENGINE ---
  const calcFPts = (p) => {
    return (p.fg_0_19 * scoring.fg0_19) + (p.fg_20_29 * scoring.fg20_29) + 
           (p.fg_30_39 * scoring.fg30_39) + (p.fg_40_49 * scoring.fg40_49) + 
           (p.fg_50_59 * scoring.fg50_59) + (p.fg_60_plus * scoring.fg60_plus) + 
           (p.fg_miss * scoring.fg_miss) + (p.xp_made * scoring.xp_made) + 
           (p.xp_miss * scoring.xp_miss);
  };

  const calcGrade = (p, avgOff, avgDef) => {
    if (p.injury_status === 'OUT' || p.injury_status === 'CUT') return 0;
    let score = ((p.off_stall_rate / avgOff) * 40) + ((p.def_stall_rate / avgDef) * 40);
    if (p.is_dome) score += 10;
    else if (p.wind > 15 || p.weather_desc.includes('Snow')) score -= 10;
    else if (p.wind > 10 || p.weather_desc.includes('Rain')) score -= 5;
    if (p.home_field === 'DEN') score += 5;
    if (p.fpts_ytd > 100) score += 5; // Dynamic threshold handled in python mostly, simplify here
    return Math.round(score);
  };

  const calcProj = (p, grade) => {
    if (grade === 0) return 0;
    const avgPts = p.fpts_ytd / p.games;
    const base = avgPts * (grade / 90);
    
    const w_score = (p.vegas > 0) ? (p.vegas * 0.7 + p.off_ppg * 0.3) : p.off_ppg;
    const w_allowed = (p.vegas > 0) ? (p.vegas * 0.7 + p.def_pa * 0.3) : p.def_pa;
    
    const off_cap = w_score * (Math.min(p.off_share || 0.45, 0.8) * 1.2); // Share is based on real pts, proxy for vol
    const def_cap = w_allowed * (Math.min(p.def_share || 0.45, 0.8) * 1.2);
    
    const cap = Math.min(off_cap, def_cap);
    // Adjust cap to match fantasy scoring scale (rough conversion if custom scoring is wild)
    // Ratio: Custom Score / Standard Score (approx 3.0 per FG)
    // For simplicity, we assume the Caps (volume based) scale linearly with PPG
    
    return (cap < 1) ? base.toFixed(1) : Math.min(base, cap).toFixed(1);
  };

  if (loading) return <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!data) return <div className="bg-slate-950 min-h-screen text-white p-10 text-center">Data Load Failed</div>;

  // Process Data with Custom Scoring
  const processed = data.rankings.map(p => {
    const ytdPts = calcFPts(p);
    const grade = calcGrade(p, data.meta.league_avgs.off_stall, data.meta.league_avgs.def_stall);
    // Inject calculated YTD into object for projection use
    const pWithYtd = { ...p, fpts_ytd: ytdPts }; 
    const proj = calcProj(pWithYtd, grade);
    return { ...pWithYtd, grade, proj, fpts: ytdPts };
  }).sort((a, b) => b.proj - a.proj);

  const ytdSorted = [...processed].sort((a, b) => b.fpts - a.fpts);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" /> Kicker<span className="text-blue-500">Genius</span>
            </h1>
            <p className="text-slate-400">Custom Scoring & Projections | Week {data.meta.week}</p>
          </div>
          <button onClick={() => setActiveTab('settings')} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded flex items-center gap-2">
            <Settings className="w-4 h-4" /> League Settings
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button onClick={() => setActiveTab('potential')} className={`pb-3 px-4 font-bold ${activeTab==='potential' ? 'text-white border-b-2 border-emerald-500': 'text-slate-500'}`}>Projections</button>
          <button onClick={() => setActiveTab('ytd')} className={`pb-3 px-4 font-bold ${activeTab==='ytd' ? 'text-white border-b-2 border-blue-500': 'text-slate-500'}`}>YTD Stats</button>
          <button onClick={() => setActiveTab('injuries')} className={`pb-3 px-4 font-bold ${activeTab==='injuries' ? 'text-white border-b-2 border-red-500': 'text-slate-500'}`}>Injuries</button>
        </div>

        {/* VIEW: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5"/> Scoring Settings</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(scoring).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{key.replace(/_/g, ' ')}</label>
                  <input type="number" value={val} onChange={(e) => updateScoring(key, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300">
              Changes save automatically and update all projections instantly.
            </div>
          </div>
        )}

        {/* VIEW: PROJECTIONS */}
        {activeTab === 'potential' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                <tr>
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Player</th>
                  <HeaderCell label="Proj" description="Projected Points (Custom Scoring)" />
                  <HeaderCell label="Grade" description="Matchup Grade (0-100)" />
                  <th className="px-6 py-3 text-center">Weather</th>
                  <HeaderCell label="Off Stall" description="Offensive Stall Rate" />
                  <HeaderCell label="Def Stall" description="Opponent Force Rate" />
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {processed.map((p, idx) => (
                  <React.Fragment key={idx}>
                    <tr onClick={() => setExpandedRow(expandedRow === idx ? null : idx)} className="hover:bg-slate-800/50 cursor-pointer">
                      <td className="px-6 py-4 font-mono text-slate-500">#{idx + 1}</td>
                      <PlayerCell player={p} subtext={`${p.team} vs ${p.opponent}`} />
                      <td className="px-6 py-4 text-center text-xl font-bold text-emerald-400">{p.proj}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded font-bold ${p.grade > 100 ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800'}`}>{p.grade}</span></td>
                      <td className="px-6 py-4 text-center text-xs">{p.weather_desc}</td>
                      <td className="px-6 py-4 text-center text-blue-300">{p.off_stall_rate}%</td>
                      <td className="px-6 py-4 text-center text-slate-400">{p.def_stall_rate}%</td>
                      <td className="px-6 py-4 text-slate-600">{expandedRow === idx ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                    </tr>
                    {expandedRow === idx && (
                      <tr className="bg-slate-950/50">
                         <td colSpan="8" className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                  <div className="font-bold text-white mb-2">SCORING BREAKDOWN (YTD)</div>
                                  <div className="flex justify-between"><span>0-39 yds:</span> <span>{p.fg_0_19 + p.fg_20_29 + p.fg_30_39}</span></div>
                                  <div className="flex justify-between"><span>40-49 yds:</span> <span>{p.fg_40_49}</span></div>
                                  <div className="flex justify-between"><span>50+ yds:</span> <span>{p.fg_50_59 + p.fg_60_plus}</span></div>
                                  <div className="flex justify-between border-t border-slate-800 mt-1 pt-1 text-emerald-400 font-bold"><span>Total FPts:</span> <span>{p.fpts}</span></div>
                               </div>
                               <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                  <div className="font-bold text-white mb-2">MATCHUP CONTEXT</div>
                                  <div className="flex justify-between"><span>Vegas Total:</span> <span>{p.vegas}</span></div>
                                  <div className="flex justify-between"><span>Team L4 Score:</span> <span>{p.off_ppg}</span></div>
                                  <div className="flex justify-between"><span>Opp L4 Allowed:</span> <span>{p.def_pa}</span></div>
                               </div>
                            </div>
                         </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW: YTD */}
        {activeTab === 'ytd' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950">
                <tr>
                  <th className="px-6 py-3">Rank</th>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3 text-right">Total FPts</th>
                  <th className="px-6 py-3 text-center">FG (M/A)</th>
                  <th className="px-6 py-3 text-center">50+</th>
                  <th className="px-6 py-3 text-center">XPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ytdSorted.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono text-slate-500">#{idx + 1}</td>
                    <PlayerCell player={p} subtext={p.team} />
                    <td className="px-6 py-4 text-right font-bold text-emerald-400">{p.fpts}</td>
                    <td className="px-6 py-4 text-center">{p.fg_made}/{p.fg_att}</td>
                    <td className="px-6 py-4 text-center">{p.fg_50_59 + p.fg_60_plus}</td>
                    <td className="px-6 py-4 text-center">{p.xp_made}/{p.xp_made + p.xp_miss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;