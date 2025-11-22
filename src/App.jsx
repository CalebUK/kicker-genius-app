import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Wind, Calendar, Info, MapPin, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Calculator, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

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
          {/* 1. Grade Breakdown */}
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

          {/* 2. Reality Check Caps */}
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

          {/* 3. Final Logic */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col justify-center items-center text-center">
             <div className="text-slate-400 font-semibold mb-1">FINAL PROJECTION</div>
             <div className="text-2xl font-bold text-emerald-400">{player.proj}</div>
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
    fetch('./kicker_data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to load data file");
        }
        return response.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading JSON:", err);
        setError("Could not load kicker data. Please ensure the automation script has run successfully.");
        setLoading(false);
      });
  }, []);

  const toggleRow = (rank) => {
    setExpandedRow(expandedRow === rank ? null : rank);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 animate-pulse">Loading Kicker Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Data Not Found</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <p className="text-sm text-slate-600">Run your Python script locally or via GitHub Actions to generate the JSON file.</p>
      </div>
    );
  }

  const { rankings, ytd, meta } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Kicker<span className="text-blue-500">Genius</span>
            </h1>
            <p className="text-slate-400">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-500/10 p-2 rounded-md">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last Updated</div>
              <div className="text-sm font-semibold text-white">{meta.updated} (Week {meta.week})</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('potential')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'potential' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Week {meta.week} Model
            </div>
            {activeTab === 'potential' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('ytd')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'ytd' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Historical YTD
            </div>
            {activeTab === 'ytd' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('glossary')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'glossary' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Stats Legend
            </div>
            {activeTab === 'glossary' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></div>}
          </button>
        </div>

        {/* SECTION 1: Potential Model */}
        {activeTab === 'potential' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Week {meta.week} Predictive Rankings
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Based on Matchup Roof, Stall Rates, Vegas Lines, and Scoring Trends.
                  </p>
                </div>
                <div className="text-xs text-slate-500 italic">Click row for details</div>
              </div>

              <div className="overflow-visible">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Matchup</th>
                      <HeaderCell label={`Wk ${meta.week} Roof`} description="Is this specific game in a dome?" />
                      <HeaderCell label="Proj Pts" description="Predicted Points based on Grade Multiplier" />
                      <HeaderCell label="L4 Off %" description="My Offense Stall Rate (Last 4 Weeks)" avg={meta.league_avgs.off_stall} />
                      <HeaderCell label="L4 Def %" description="Opponent's Def Stall Rate (Last 4 Weeks)" avg={meta.league_avgs.def_stall} />
                      <HeaderCell label="Vegas" description="Implied Team Total Points" />
                      <HeaderCell label="Off PF(L4)" description="My Team Avg Points Scored (Last 4)" avg={meta.league_avgs.l4_off_ppg} />
                      <HeaderCell label="Opp PA(L4)" description="Opponent Avg Points Allowed (Last 4)" avg={meta.league_avgs.l4_def_pa} />
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rankings.map((k, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => toggleRow(idx)}
                          className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${expandedRow === idx ? 'bg-slate-800/60' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${
                                k.grade >= 100 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" :
                                k.grade >= 80 ? "bg-blue-500/10 border-blue-500/50 text-blue-400" :
                                "bg-slate-700/10 border-slate-600 text-slate-400"
                            }`}>
                              {k.grade}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            <div className="text-lg">{k.kicker_player_name}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-bold text-slate-400">{k.team}</span>
                              <span>vs</span>
                              <span className="font-bold text-red-400">{k.opponent}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {k.weather_desc.includes("Dome") ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold">
                                <Wind className="w-3 h-3" /> Dome
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-xs font-mono whitespace-nowrap">
                                <MapPin className="w-3 h-3" /> {k.weather_desc}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-400 text-lg">{k.proj}</td>
                          
                          <td className="px-6 py-4 text-center font-mono text-blue-300">
                             {k.off_stall_rate}% {k.off_stall_rate > meta.league_avgs.off_stall && "🔥"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-slate-400">
                             {k.def_stall_rate}% {k.def_stall_rate > meta.league_avgs.def_stall && "🎯"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-amber-400">{k.vegas.toFixed(1)}</td>
                          <td className="px-6 py-4 text-center font-mono text-slate-300">
                             {k.off_ppg.toFixed(1)} {k.off_ppg < 15 && "❄️"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-slate-300">
                             {k.def_pa.toFixed(1)} {k.def_pa < 17 && "🛡️"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                             {expandedRow === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </td>
                        </tr>
                        {expandedRow === idx && <DeepDiveRow player={k} />}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg flex gap-3 text-sm text-emerald-300">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Matchup Logic:</span> 🔥 = High Volume Offense | 🎯 = Good Matchup (Def bends) | 🛡️ = Elite Defense (Avoid) | ❄️ = Cold Offense (Avoid)
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: YTD Leaders */}
        {activeTab === 'ytd' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800">
                <h2 className="font-bold text-white">2025 Season Leaders (Top 30)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Player</th>
                      <HeaderCell label="FPts" description="Total Fantasy Points scored (Standard Scoring)" avg={meta.league_avgs.fpts} />
                      <th className="px-4 py-3 text-center">FG (M/A)</th>
                      <HeaderCell label="Acc %" description="Field Goal Accuracy Percentage" avg="85.0" />
                      <HeaderCell label="50+ Yds" description="Field Goals made from 50+ yards" avg="-" />
                      <HeaderCell label="Dome %" description="% of games played in a Dome/Closed Roof" avg="-" />
                      <HeaderCell label="FG RZ Trips" description="Drives reaching the 25-yard line (FG Range)" avg="-" />
                      <HeaderCell label="Off Stall %" description="% of RZ Trips that end in a FG attempt (YTD)" avg="-" />
                      <HeaderCell label="Avg Opp Stall %" description="Avg Stall Rate of all opponents faced (Schedule Strength)" avg="-" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ytd.map((k, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">
                          {k.kicker_player_name} <span className="text-xs text-slate-500 ml-1">{k.team}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">{k.fpts}</td>
                        <td className="px-4 py-3 text-center text-slate-300">{k.made}/{k.att}</td>
                        <td className="px-4 py-3 text-center">{k.acc}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded ${k.longs >= 5 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}>
                            {k.longs}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {k.dome_pct > 50 ? (
                            <span className="text-blue-400 flex items-center justify-center gap-1"><Wind className="w-3 h-3"/> {k.dome_pct}%</span>
                          ) : (
                            <span className="text-slate-500">{k.dome_pct}%</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">{k.rz_trips}</td>
                        <td className="px-4 py-3 text-center font-mono text-blue-300">{k.off_stall_rate}%</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-400">{k.avg_opp_stall_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: GLOSSARY */}
        {activeTab === 'glossary' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Stats Legend & Definitions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-6 py-4 w-32">Metric</th>
                      <th className="px-6 py-4 w-64">Definition</th>
                      <th className="px-6 py-4">Fantasy Impact (Why it Matters)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {GLOSSARY_DATA.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-300 whitespace-nowrap">{item.header}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{item.title}</td>
                        <td className="px-6 py-4 text-slate-400 leading-relaxed">
                          <div className="mb-1">{item.desc}</div>
                          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {item.why}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;