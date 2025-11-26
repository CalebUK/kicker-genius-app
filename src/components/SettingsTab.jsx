import React from 'react';
import { Settings, RotateCcw, Gamepad2, Loader2, RefreshCw, Check } from 'lucide-react';
import { SETTING_LABELS } from '../data/constants';

const SettingsTab = ({ 
    scoring, updateScoring, resetScoring, 
    sleeperLeagueId, setSleeperLeagueId, 
    sleeperUser, setSleeperUser, 
    syncSleeper, sleeperLoading, sleeperScoringUpdated, sleeperMyKickers 
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* SCORING */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5"/> Scoring Settings</h2>
                <button onClick={resetScoring} className="text-xs bg-red-900/30 text-red-400 px-3 py-1 rounded border border-red-800/50 hover:bg-red-900/50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Reset to Default</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Object.entries(scoring).map(([key, val]) => (
                    <div key={key}>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">{SETTING_LABELS[key] || key}</label>
                        <input type="number" value={val} onChange={(e) => updateScoring(key, e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-blue-500 focus:outline-none" />
                    </div>
                ))}
            </div>
        </div>
        
        {/* SLEEPER SYNC */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-lg font-bold text-white"><Gamepad2 className="w-5 h-5 text-purple-400"/> Sleeper League Sync</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">League ID</label>
                    <input type="text" value={sleeperLeagueId} onChange={(e) => setSleeperLeagueId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder:text-slate-600" placeholder="e.g. 104837..." />
                </div>
                <div>
                    <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Your Username</label>
                    <input type="text" value={sleeperUser} onChange={(e) => setSleeperUser(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder:text-slate-600" placeholder="e.g. kickerfan123" />
                </div>
            </div>
            <button 
                onClick={syncSleeper} 
                disabled={sleeperLoading || !sleeperLeagueId}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {sleeperLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                {sleeperLoading ? "Syncing League..." : "Sync with Sleeper"}
            </button>
            {sleeperScoringUpdated && <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded text-xs text-green-300 flex items-center gap-2"><Check className="w-4 h-4"/> Scoring settings auto-updated from league!</div>}
            {sleeperMyKickers.size > 0 && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-800/50 rounded text-xs text-purple-300">
                    ✅ Found team! Your kickers: <strong>{Array.from(sleeperMyKickers).join(', ')}</strong>
                </div>
            )}
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center gap-2">
          <Save className="w-4 h-4" /> Changes save automatically and update all projections instantly.
        </div>
      </div>
  );
};

export default SettingsTab;