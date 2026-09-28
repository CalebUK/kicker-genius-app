import React, { useState } from 'react';
import { Settings, RotateCcw, Gamepad2, Loader2, RefreshCw, Check, Save, History, Search, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { SCORING_CONFIG } from '../data/constants';

const ago = (ms) => {
  if (!ms) return 'not synced yet';
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'synced just now';
  if (min < 60) return `synced ${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `synced ${h}h ago` : `synced ${Math.round(h / 24)} days ago`;
};

// Saved Sleeper leagues: switch, re-sync, remove -- and add more (by username or league ID)
const LeaguesPanel = ({ lg, season }) => {
  const [username, setUsername] = useState(() => lg.leagues.find((l) => l.username)?.username || '');
  const [found, setFound] = useState(null);   // { user, leagues } from "Find my leagues"
  const [leagueId, setLeagueId] = useState('');
  const savedIds = new Set(lg.leagues.map((l) => l.id));
  const find = async () => { const r = await lg.findLeagues(username, season); setFound(r); };
  const me = found ? { userId: found.user.user_id, username: found.user.username } : { username };
  const btn = 'text-xs px-2.5 py-1 rounded border flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 text-lg font-bold text-white mb-1"><Gamepad2 className="w-5 h-5 text-purple-400"/> Sleeper Leagues</div>
      <p className="text-xs text-slate-400 mb-4">Save your leagues once, then switch between them from the top of the page. Each league keeps its own scoring and rosters (saved in this browser).</p>

      {lg.error && <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded text-xs text-red-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0"/> {lg.error}</div>}

      {/* saved leagues */}
      <div className="space-y-2 mb-6">
        <button onClick={() => lg.switchLeague('')} className={`w-full text-left p-3 rounded-lg border transition-all ${!lg.activeId ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-950/50 border-slate-700 hover:border-slate-600'}`}>
          <div className="flex items-center gap-2 text-sm font-bold text-white">{!lg.activeId && <Check className="w-4 h-4 text-emerald-400"/>} Custom scoring <span className="text-[11px] font-normal text-slate-500">no league: set the points yourself below</span></div>
        </button>
        {lg.leagues.map((l) => {
          const isActive = l.id === lg.activeId, syncing = lg.busy === l.id;
          return (
            <div key={l.id} className={`p-3 rounded-lg border flex flex-wrap items-center gap-3 transition-all ${isActive ? 'bg-emerald-600/20 border-emerald-500' : 'bg-slate-950/50 border-slate-700'}`}>
              <button onClick={() => lg.switchLeague(l.id)} className="flex-1 min-w-[200px] text-left">
                <div className="flex items-center gap-2 text-sm font-bold text-white">{isActive && <Check className="w-4 h-4 text-emerald-400"/>} {l.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {l.teams ? `${l.teams} teams · ` : ''}
                  {l.myKickers?.length ? <span className="text-purple-300">your kicker{l.myKickers.length > 1 ? 's' : ''}: {l.myKickers.join(', ')}</span> : (l.userId || l.username ? 'no kicker on your roster' : 'your team not linked')}
                  {' · '}{syncing ? 'syncing…' : ago(l.syncedAt)}
                </div>
              </button>
              <button onClick={() => lg.resync(l.id)} disabled={!!lg.busy} className={`${btn} bg-slate-800 border-slate-700 text-slate-300 hover:text-white`}>{syncing ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>} Re-sync</button>
              <button onClick={() => lg.removeLeague(l.id)} disabled={syncing} className={`${btn} bg-red-900/20 border-red-800/50 text-red-400 hover:bg-red-900/40`}><Trash2 className="w-3 h-3"/> Remove</button>
            </div>
          );
        })}
      </div>

      {/* add: find all of a user's leagues */}
      <div className="border-t border-slate-800 pt-4">
        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Add leagues: your Sleeper username</label>
        <div className="flex gap-2 max-w-lg">
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && username.trim() && find()} className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder:text-slate-600" placeholder="e.g. kickerfan123" />
          <button onClick={find} disabled={!!lg.busy || !username.trim()} className="px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded flex items-center gap-2 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">{lg.busy === 'find' ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>} Find my leagues</button>
        </div>
        {found && (
          <div className="mt-3 space-y-2 max-w-lg">
            <div className="text-xs text-slate-400">{found.user.display_name || found.user.username}&apos;s {season} leagues:</div>
            {found.leagues.map((f) => {
              const saved = savedIds.has(String(f.league_id)), adding = lg.busy === String(f.league_id);
              return (
                <div key={f.league_id} className="flex items-center justify-between gap-3 p-2 rounded border border-slate-800 bg-slate-950/50">
                  <div className="text-sm text-white">{f.name} <span className="text-[11px] text-slate-500">{f.total_rosters} teams</span></div>
                  {saved
                    ? <span className="text-xs text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3"/> Saved</span>
                    : <button onClick={() => lg.addLeague(f.league_id, me, f)} disabled={!!lg.busy} className={`${btn} bg-purple-600/20 border-purple-500/50 text-purple-200 hover:bg-purple-600/40`}>{adding ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>} Add</button>}
                </div>
              );
            })}
          </div>
        )}

        {/* or add one by league id */}
        <label className="block text-xs uppercase text-slate-500 font-bold mb-1 mt-5">Or add by league ID</label>
        <div className="flex gap-2 max-w-lg">
          <input type="text" value={leagueId} onChange={(e) => setLeagueId(e.target.value.trim())} className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded p-2 text-white placeholder:text-slate-600" placeholder="e.g. 104837..." />
          <button onClick={() => { lg.addLeague(leagueId, { username }); setLeagueId(''); }} disabled={!!lg.busy || !leagueId} className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded flex items-center gap-2 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">{lg.busy === leagueId && leagueId ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Add</button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Uses the username above (if filled in) to find your team in that league.</p>
      </div>
    </div>
  );
};

const SettingsTab = ({ lg, season, windowMode, setWindowMode }) => {
  const { scoring, updateScoring, resetScoring, active } = lg;
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* MODEL WINDOW */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1"><History className="w-5 h-5 text-emerald-400"/> Model Window</h2>
            <p className="text-xs text-slate-400 mb-4">Base matchup grades &amp; projections on recent form — the last 3 or last 5 games.</p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
                {[{ key: 'l3', label: 'Last 3 Games', sub: 'More reactive to hot/cold streaks' }, { key: 'l5', label: 'Last 5 Games', sub: 'Smoother, more stable · recommended' }].map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => setWindowMode(opt.key)}
                        className={`text-left p-3 rounded-lg border transition-all ${windowMode === opt.key ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            {windowMode === opt.key && <Check className="w-4 h-4 text-emerald-400"/>}
                            {opt.label} <span className="text-[11px] font-mono opacity-70">({opt.key.toUpperCase()})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{opt.sub}</div>
                    </button>
                ))}
            </div>
        </div>

        {/* SLEEPER LEAGUES (they set the scoring below) */}
        <LeaguesPanel lg={lg} season={season} />

        {/* SCORING */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5"/> Scoring Settings <span className="text-sm font-normal text-slate-400">· {active ? active.name : 'Custom'}</span></h2>
                <button onClick={resetScoring} className="text-xs bg-red-900/30 text-red-400 px-3 py-1 rounded border border-red-800/50 hover:bg-red-900/50 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> {active ? 'Reset to league scoring' : 'Reset to Default'}</button>
            </div>
            
            {/* NEW GROUPED LAYOUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {SCORING_CONFIG.map((group, idx) => (
                    <div key={idx} className="bg-slate-950/50 p-3 rounded border border-slate-800">
                        <div className="text-xs font-bold text-blue-400 uppercase mb-3 border-b border-slate-800 pb-1">{group.label}</div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1">Make</label>
                                <input 
                                    type="number" 
                                    value={scoring[group.makeKey]} 
                                    onChange={(e) => updateScoring(group.makeKey, e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-emerald-500 focus:outline-none text-center" 
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[11px] uppercase text-slate-500 font-bold mb-1">Miss</label>
                                <input 
                                    type="number" 
                                    value={scoring[group.missKey]} 
                                    onChange={(e) => updateScoring(group.missKey, e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-red-500 focus:outline-none text-center text-red-300" 
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded text-sm text-blue-300 flex items-center gap-2">
          <Save className="w-4 h-4" /> Changes save automatically and update all projections instantly.
        </div>
      </div>
  );
};

export default SettingsTab;