import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Info, Flame, Calculator, Target, History, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

// --- GENERIC HELMET ICON (SVG) ---
// This replaces the broken 404 images
export const HelmetIcon = ({ borderColor }) => (
  <div className={`w-12 h-12 rounded-full bg-slate-800 border-2 flex items-center justify-center shrink-0 ${borderColor || 'border-slate-600'}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-500">
      {/* Helmet Shell */}
      <path d="M20 13v-3a8 8 0 1 0-16 0v3" />
      {/* Facemask Bar */}
      <path d="M4 13h16" />
      {/* Facemask Jaw */}
      <path d="M4 13v2a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-2" />
      {/* Vertical Bars */}
      <line x1="12" y1="13" x2="12" y2="19" />
      <line x1="8" y1="13" x2="8" y2="18" />
      <line x1="16" y1="13" x2="16" y2="18" />
    </svg>
  </div>
);

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

// --- SORTABLE HEADER ---
// tipAlign="right" for the last columns, so the (hidden) tip never pokes past the table edge
export const HeaderCell = ({ label, description, avg, sortKey, currentSort, onSort, tipAlign = 'center' }) => {
  const tipRight = tipAlign === 'right';
  const isActive = !!sortKey && currentSort?.key === sortKey;   // columns without a sort never light up
  
  return (
    <th onClick={() => onSort && onSort(sortKey)} className={`px-2 py-3 text-center align-middle group relative cursor-pointer leading-tight min-w-[90px] select-none hover:bg-slate-800/80 transition-colors ${isActive ? 'bg-slate-800/50' : ''}`}>
      <div className="flex flex-col items-center justify-center h-full gap-0.5">
        <div className="flex items-center gap-1 mt-0.5"><span className={isActive ? "text-blue-400" : "text-slate-300"}>{label}</span>{onSort && (isActive ? (currentSort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />) : (<ArrowUpDown className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />))}</div>
        <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors flex-shrink-0" />
      </div>
      <div className={`absolute top-full ${tipRight ? 'right-0' : 'left-1/2 -translate-x-1/2'} mt-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded shadow-xl text-xs normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal text-left cursor-auto`}>
        <div className="text-white font-semibold mb-1">{description}</div>
        {avg !== undefined && <div className="text-blue-300">League Avg: {Number(avg).toFixed(1)}</div>}
        <div className={`absolute top-[-4px] ${tipRight ? 'right-6' : 'left-1/2 -translate-x-1/2'} w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45`}></div>
      </div>
    </th>
  );
};

export const HistoryBars = ({ games }) => {
  if (!games || games.length === 0) return <div className="text-xs text-slate-500">No recent data</div>;
  return (
    <div className="space-y-3">
      {games.map((g, i) => {
        if (g.status === 'BYE' || g.status === 'DNS') return <div key={i} className="text-[11px]"><div className="text-slate-500 mb-0.5">Wk {g.week}: {g.status}</div><div className="w-full bg-slate-800/50 h-4 rounded-full relative"><div className="bg-slate-700 h-full rounded-full" style={{width: '100%'}}></div></div></div>;
        const projRounded = Math.round(g.proj); const diff = g.act - projRounded; const maxVal = Math.max(20, projRounded, g.act); const projPct = (projRounded / maxVal) * 100; const actPct = (g.act / maxVal) * 100;
        return (
          <div key={i} className="text-[11px]">
            <div className="flex justify-between text-slate-400 mb-0.5 font-bold"><span>Wk {g.week} vs {g.opp}</span><span className={g.act >= projRounded ? "text-green-400" : "text-red-400"}>{g.act >= projRounded ? "+" : ""}{diff}</span></div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full mb-1 relative"><div className="bg-slate-600 h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2" style={{ width: `${projPct}%` }}><span className="text-[11px] text-white font-bold leading-none">Projection {projRounded}</span></div></div>
            <div className="w-full bg-slate-800/50 h-4 rounded-full relative"><div className={`${g.act >= projRounded ? "bg-green-500" : "bg-red-500"} h-full rounded-full overflow-hidden whitespace-nowrap flex items-center px-2`} style={{ width: `${actPct}%` }}><span className="text-[11px] text-white font-bold leading-none">Actual {g.act}</span></div></div>
          </div>
        );
      })}
    </div>
  );
};

// Hover (or tap/focus) tip for an emoji, badge or number. A named Tailwind group, so it
// works inside other hover groups (table rows, the kicker cell).
const HINT_SIDE = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
};
export const Hint = ({ text, children, side = 'top', className = '' }) => (
  <span tabIndex={0} aria-label={typeof text === 'string' ? text : undefined} className={`relative inline-flex group/hint cursor-help outline-none ${className}`}>
    {children}
    <span role="tooltip" className={`absolute ${HINT_SIDE[side]} z-50 w-max max-w-[220px] px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[11px] leading-snug font-normal normal-case tracking-normal text-slate-200 text-left whitespace-normal shadow-xl opacity-0 pointer-events-none transition-opacity group-hover/hint:opacity-100 group-focus/hint:opacity-100`}>
      {text}
    </span>
  </span>
);

const SLEEPER_BADGES = {
  MY_TEAM: ['MY TEAM', 'bg-purple-500/20 text-purple-300 border-purple-500/50', 'On your roster in your active Sleeper league'],
  TAKEN: ['TAKEN', 'bg-slate-700/50 text-slate-400 border-slate-600/50', 'On another team in your active Sleeper league'],
  FREE_AGENT: ['FREE AGENT', 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50', 'Available to pick up in your active Sleeper league'],
};

// practice_status text -> { injury, practice }. The engine writes "Limited practice (Hip)"
// (official NFL report); CBS may give "Did Not Practice on Thursday" or just "Knee".
export const splitReport = (details) => {
  const d = String(details || '').trim();
  const m = d.match(/^(.+?)\s\((.+)\)$/);
  if (m) return { practice: m[1], injury: m[2] };
  return /practice/i.test(d) ? { practice: d, injury: '' } : { practice: '', injury: d };
};

// Photo ring + text colour from the board row's injury_color (yellow = Questionable,
// red = Doubtful/Out, dark red = IR and co.)
export const injuryStyle = (player) => {
  const c = player.injury_color || 'slate-600';
  if (c.includes('yellow')) return { ring: 'border-yellow-500', text: 'text-yellow-400' };
  if (c.includes('red-500')) return { ring: 'border-red-500', text: 'text-red-400' };
  if (c.includes('red-700')) return { ring: 'border-red-700', text: 'text-red-500' };
  if (c.includes('green')) return { ring: 'border-green-500', text: 'text-green-400' };
  return { ring: 'border-slate-600', text: 'text-slate-400' };
};
const photoUrl = (player) => (player.kicker_player_name?.includes('Aubrey') ? '/assets/aubrey_custom.png' : player.headshot_url);

// --- PHONE: one card per kicker (the Week Model table is ~1,200px wide) ---
const MiniStat = ({ label, value, className = 'text-slate-200' }) => (
  <div className="min-w-0">
    <div className="text-[11px] text-slate-500 leading-none mb-0.5">{label}</div>
    <div className={`text-xs font-mono font-semibold truncate ${className}`}>{value}</div>
  </div>
);
export const KickerCard = ({ row, rank, expanded, onToggle, highlight, children }) => {
  const [imgError, setImgError] = useState(false);
  const { ring, text } = injuryStyle(row);
  const badge = SLEEPER_BADGES[row.sleeperStatus];
  const report = splitReport(row.injury_details);
  const url = photoUrl(row);
  const f1 = (x) => (x == null || Number.isNaN(Number(x)) ? '–' : Number(x).toFixed(1));
  const l3Good = (row.l3_act_sum ?? 0) >= (row.l3_proj_sum ?? 0);
  const rz = (kp, stall) => (kp != null ? f1(kp) : `${stall ?? '–'}%`);
  return (
    <div className={`${highlight ? 'bg-purple-950' : 'bg-slate-900'} ${expanded ? 'sm:col-span-2' : ''} ${row.final_pts != null && !expanded ? 'opacity-60' : ''}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full text-left px-3 py-3 flex gap-3 active:bg-slate-800/60 transition-colors">
        <div className="flex flex-col items-center gap-1 w-12 shrink-0">
          {imgError || !url ? <HelmetIcon borderColor={ring} /> : <img src={url} alt={row.kicker_player_name} className={`w-12 h-12 rounded-full border-2 object-cover ${ring}`} onError={() => setImgError(true)} />}
          <span className="text-[11px] font-mono text-slate-500">#{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white text-sm">{row.kicker_player_name}</span>
            {row.isTop5 && <span className="text-xs" aria-label="Top 5 scorer this season">🔥</span>}
            {badge && <span className={`text-[11px] border px-1 rounded font-bold ${badge[1]}`}>{badge[0]}</span>}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{row.team} vs {row.opponent} · {row.weather_desc}</div>
          {(row.injury_status || report.practice || report.injury) && (
            <div className={`text-[11px] truncate ${row.injury_status ? text : 'text-sky-300'}`}>{[row.injury_status, report.injury].filter(Boolean).join(': ')}{report.practice ? ` · ${report.practice}` : ''}</div>
          )}
          <div className="text-[11px] text-slate-500">{row.season_games ? `#${row.ytdRank} this season · ${f1(row.season_avg)} pts/game` : 'No games yet this season'}</div>
          <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5">
            <MiniStat label="Grade" value={row.grade} className={row.grade > 100 ? 'text-purple-300' : 'text-white'} />
            <MiniStat label="Vegas" value={f1(row.vegas)} className="text-amber-400" />
            <MiniStat label="Last 3" value={`${row.l3_act_sum ?? 0}/${row.l3_proj_sum ?? 0}`} className={l3Good ? 'text-green-400' : 'text-red-400'} />
            <MiniStat label="Off RZ" value={rz(row.off_rz_kp, row.off_stall_rate)} className="text-blue-300" />
            <MiniStat label="Opp RZ" value={rz(row.def_rz_kp, row.def_stall_rate)} />
            <MiniStat label="PF / PA" value={`${Math.round(row.off_ppg)}${row.off_ppg < 15 ? '❄️' : ''} / ${Math.round(row.def_pa)}${row.def_pa < 17 ? '🛡️' : ''}`} />
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          {row.final_pts != null ? (
            // his game is over: what he scored, with the projection underneath
            <>
              <span className="text-[11px] font-bold uppercase text-slate-400 leading-none">Final</span>
              <span className="text-2xl font-black leading-none text-white">{Math.round(row.final_pts * 10) / 10}</span>
              <span className="text-[11px] text-slate-500 mt-0.5">proj {row.proj}</span>
            </>
          ) : (
            <>
              <span className={`text-2xl font-black leading-none ${row.proj === 0 ? 'text-red-500' : 'text-emerald-400'}`}>{row.proj}</span>
              <span className="text-[11px] uppercase text-slate-500 mt-0.5">proj</span>
            </>
          )}
          <span className="mt-2 text-slate-600">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </button>
      {expanded && <div className="px-2 pb-3">{children}</div>}
    </div>
  );
};

// --- PHONE: Historical YTD card (this season's totals, your scoring) ---
export const YtdCard = ({ row, rank }) => {
  const [imgError, setImgError] = useState(false);
  const url = photoUrl(row);
  const n = (x) => (x == null || Number.isNaN(Number(x)) ? '–' : x);
  return (
    <div className="px-3 py-3 flex gap-3 bg-slate-900">
      <div className="flex flex-col items-center gap-1 w-12 shrink-0">
        {imgError || !url ? <HelmetIcon borderColor="border-slate-600" /> : <img src={url} alt={row.kicker_player_name} className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover" onError={() => setImgError(true)} />}
        <span className="text-[11px] font-mono text-slate-500">#{rank}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white text-sm truncate">{row.kicker_player_name}</span>
          <span className="text-[11px] text-slate-400">{row.team}</span>
        </div>
        <div className="text-[11px] text-slate-500 mb-2">{row.games} game{Number(row.games) === 1 ? '' : 's'} · {Number(row.avg_fpts).toFixed(1)} pts/game</div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          <MiniStat label="Field goals" value={`${row.fg_made}/${row.fg_att}`} />
          <MiniStat label="FG %" value={`${row.pct}%`} className="text-blue-300" />
          <MiniStat label="50+ FGs" value={row.longs} className={row.longs >= 4 ? 'text-amber-400' : 'text-slate-200'} />
          <MiniStat label="Dome games" value={`${n(row.dome_pct)}%`} />
          <MiniStat label="RZ trips" value={n(row.rz_trips)} />
          <MiniStat label="Stall off/opp" value={`${n(row.off_stall_rate_ytd ?? 0)}/${n(row.def_stall_rate_ytd ?? 0)}`} />
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-2xl font-black leading-none text-emerald-400">{Math.round(row.fpts * 10) / 10}</span>
        <span className="text-[11px] uppercase text-slate-500 mt-0.5">pts</span>
      </div>
    </div>
  );
};

// --- PLAYER CELL ---
// Hovering the kicker shows his THIS-season numbers (your scoring) + any injury news.
export const PlayerCell = ({ player, subtext, sleeperStatus }) => {
  const [imgError, setImgError] = useState(false); // Track image load errors

  const statusText = player.injury_status || '';
  const { ring: borderColor, text: textColor } = injuryStyle(player);
  const imageUrl = photoUrl(player);

  const report = splitReport(player.injury_details);

  const sGames = Number(player.season_games) || 0;
  const badge = SLEEPER_BADGES[sleeperStatus];

  return (
    <td className="px-3 py-4 font-medium text-white">
      <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="text-xs md:text-sm font-bold text-white leading-tight whitespace-normal break-words flex items-center gap-1">
                {player.kicker_player_name}
                {player.isTop5 && <Hint text="Top 5 scorer this season (your scoring)"><span className="text-sm">🔥</span></Hint>}
              </div>
              {badge && <Hint text={badge[2]}><span className={`text-[11px] border px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${badge[1]}`}>{badge[0]}</span></Hint>}
          </div>

          <div className="relative group/kicker flex items-center gap-3 w-fit">
              <div className="flex-shrink-0">
                {/* IMAGE OR FALLBACK (the ring colour = injury status) */}
                {imgError || !imageUrl ? (
                    <HelmetIcon borderColor={borderColor} />
                ) : (
                    <img
                        src={imageUrl}
                        alt={player.kicker_player_name}
                        className={`w-12 h-12 rounded-full border-2 object-cover shrink-0 ${borderColor}`}
                        onError={() => setImgError(true)}
                    />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400 truncate">{subtext}</div>
              </div>

              {/* SEASON TOOLTIP: this season's real numbers (not the kicker avg), + injury */}
              <div role="tooltip" className="absolute left-full top-0 ml-3 w-56 p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs opacity-0 group-hover/kicker:opacity-100 transition-opacity z-50 shadow-xl pointer-events-none">
                  <div className="text-[11px] uppercase text-slate-500 font-bold mb-1.5">{player.season} season · your scoring</div>
                  {sGames > 0 ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between"><span className="text-slate-400">Season rank</span><span className="text-white font-bold">#{player.ytdRank}{player.season_kickers ? <span className="text-slate-500 font-normal"> of {player.season_kickers}</span> : null}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Fantasy points</span><span className="text-white font-mono">{Math.round(player.season_pts * 10) / 10}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Avg per game</span><span className="text-emerald-400 font-mono font-bold">{player.season_avg.toFixed(1)}{player.ppgRank ? <span className="text-slate-500 font-normal"> (#{player.ppgRank})</span> : null}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Games</span><span className="text-white font-mono">{sGames}</span></div>
                      {player.isTop5 && <div className="text-amber-300 text-[11px] mt-0.5">🔥 Top 5 scorer this season</div>}
                    </div>
                  ) : <div className="text-slate-400">No games yet this season</div>}
                  {(statusText || report.injury || report.practice) && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <div className={`font-bold ${statusText ? textColor : 'text-sky-300'} mb-0.5 break-words`}>{[statusText, report.injury].filter(Boolean).join(': ') || 'On the injury report'}</div>
                      {report.practice && <div className="text-slate-400 italic">{report.practice}</div>}
                    </div>
                  )}
              </div>
          </div>
      </div>
    </td>
  );
};

// Readable names for the grade bonuses/penalties (the `bonuses` jsonb from the model view)
const bonusLabel = (name, player, settings) => {
  if (name === 'dome') return 'Dome';
  if (name === 'cold') return `Cold (${player.temp_f ?? '?'}°F, ${settings?.cold_temp_max ?? 40}°F or below)`;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Worksheet box: how kickers have done at this stadium in conditions like this week's
// (since 2000), how HE does in them, and his latest news. player.matchup_history comes
// from utils/insights.js (null while /api/insights is still loading).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const newsDate = (d) => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? `${MONTHS[Number(m[1]) - 1]} ${Number(m[2])}` : ''; };
const MatchupHistory = ({ player }) => {
  const mh = player.matchup_history;
  const f1 = (x) => (Number(x) || 0).toFixed(1);
  const signed = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;
  const note = mh?.news?.[0];
  return (
    <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2.5">
      <div className="text-emerald-400 font-bold pb-1 border-b border-slate-800 flex items-center gap-2"><History className="w-3 h-3" /> MATCHUP HISTORY &amp; NEWS</div>
      {!mh ? <div className="text-[11px] text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading history…</div> : (
        <>
          {mh.venue && (
            <div>
              <div className="text-[11px] text-slate-400 leading-tight">Kickers {mh.venue.where}{mh.venue.conditions.length ? `, ${mh.venue.conditions.join(', ')}` : ''}:</div>
              <div className="text-xs text-white mt-0.5"><span className="font-mono font-bold text-emerald-300">{f1(mh.venue.pts)}</span> pts · {f1(mh.venue.fgAtt)} FG tries a game
                {mh.venue.vsAvg != null && (Math.abs(mh.venue.vsAvg) < 0.05
                  ? <span className="ml-1 text-[11px] text-slate-400">(same as avg)</span>
                  : <span className={`ml-1 text-[11px] ${mh.venue.vsAvg > 0 ? 'text-emerald-400' : 'text-red-400'}`}>({signed(mh.venue.vsAvg)} vs avg)</span>)}</div>
              <div className="text-[11px] text-slate-500">{mh.venue.n.toLocaleString()} kicker-games since 2000 · <a href={mh.venue.link} className="text-sky-400 hover:underline">see them</a></div>
            </div>
          )}
          {mh.own && (
            <div>
              <div className="text-[11px] text-slate-400 leading-tight">{player.kicker_player_name}, {mh.own.conditions.join(', ')}:</div>
              <div className="text-xs text-white mt-0.5"><span className="font-mono font-bold text-emerald-300">{f1(mh.own.pts)}</span> pts a game
                {mh.own.others && <span className="text-[11px] text-slate-400"> vs {f1(mh.own.others.pts)} otherwise</span>}</div>
              <div className="text-[11px] text-slate-500">{mh.own.n} of his games · <a href={mh.own.link} className="text-sky-400 hover:underline">see them</a></div>
            </div>
          )}
          {note ? (
            <div className="border-t border-slate-800 pt-2">
              <div className="text-[11px] text-slate-500">{newsDate(note.post_date)} · RotoWire</div>
              <div className="text-xs font-semibold text-white leading-tight">{note.headline}</div>
              <div className="text-[11px] text-slate-400 leading-snug line-clamp-3">{note.body}</div>
            </div>
          ) : <div className="text-[11px] text-slate-600 border-t border-slate-800 pt-2">No news in the last 3 weeks.</div>}
        </>
      )}
    </div>
  );
};

// The projection worksheet (MODEL_SPEC.md): grade on the left, 50/30/20 on the right.
// Numbers come from player.calc (calcProjection) + the database's ingredients.
export const MathCard = ({ player, leagueAvgs, week, settings }) => {
  if (!player) return null;
  const l3_proj = player.l3_proj_sum ?? 0;
  const l3_act = player.l3_act_sum ?? 0;
  const l3_diff = l3_act - l3_proj;
  let trendColor = "text-slate-500"; let trendSign = "";
  if (l3_diff > 2.5) { trendColor = "text-green-400"; trendSign = "+"; } else if (l3_diff < -2.5) { trendColor = "text-red-400"; }

  const c = player.calc || {};
  const scale = settings?.grade_scale ?? 40;
  const divisor = settings?.grade_divisor ?? 90;
  const f1 = (x) => (Number(x) || 0).toFixed(1);
  const f2 = (x) => (Number(x) || 0).toFixed(2);
  const pctOf = (x) => `${((Number(x) || 0) * 100).toFixed(0)}%`;
  const wLabel = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
  const lgOffStall = player.lg_off_stall ?? leagueAvgs?.off_stall;
  const lgDefStall = player.lg_def_stall ?? leagueAvgs?.def_stall;
  // red-zone kicker points (stalled trip = 3, other trip = 1) -- the grade since 2026-09-27
  const hasRz = player.off_rz_kp != null && player.def_rz_kp != null;
  const lgOffKp = player.lg_off_rz_kp ?? leagueAvgs?.off_rz_kp;
  const lgDefKp = player.lg_def_rz_kp ?? leagueAvgs?.def_rz_kp;
  const bonuses = Object.entries(player.bonuses || {});
  const hasVegas = player.vegas_implied != null;
  const win = player.win_label || 'L5';
  // what the Kicker Avg is built on: his last N games (all of this season + his latest
  // earlier games), plus league-average games for rookies -- MODEL_SPEC §2
  const priorGames = player.prior_games_used || 0;
  const avgGames = player.games_played == null ? null : [
    `Kicker avg = his last ${player.games_played} game${player.games_played === 1 ? '' : 's'}`,
    `(${player.games_played - priorGames} in ${player.season ?? 'this season'}${priorGames ? ` + ${priorGames} before` : ''})`,
    c.lgGames > 0 ? `+ ${c.lgGames} league-average (rookie)` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3"><Calculator className="w-4 h-4 text-emerald-400" /><h3 className="font-bold text-white text-sm">Math Worksheet: {player.kicker_player_name}</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <div className="text-blue-300 font-bold mb-1 pb-1 border-b border-slate-800">MATCHUP GRADE</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Offense Score</span><span className="font-mono text-white">{f1(player.off_score_val)}</span></div>{hasRz
              ? <div className="text-[11px] text-slate-500 leading-tight">({f1(player.off_rz_kp)} RZ kicker pts / {f1(lgOffKp)} lg) × {scale}<br />{f1(player.off_rz_trips)} red-zone trips/g, {f1(player.off_stall_rate)}% stall</div>
              : <div className="text-[11px] text-slate-500">({f1(player.off_stall_rate)}% / {f1(lgOffStall)}% lg) × {scale}</div>}</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Defense Score</span><span className="font-mono text-white">{f1(player.def_score_val)}</span></div>{hasRz
              ? <div className="text-[11px] text-slate-500 leading-tight">({f1(player.def_rz_kp)} RZ kicker pts allowed / {f1(lgDefKp)} lg) × {scale}<br />{f1(player.def_rz_trips)} trips allowed/g, {f1(player.def_stall_rate)}% stall</div>
              : <div className="text-[11px] text-slate-500">({f1(player.def_stall_rate)}% / {f1(lgDefStall)}% lg) × {scale}</div>}</div>
            <div className="border-t border-slate-800 pt-1"><div className="text-[11px] text-slate-400 mb-0.5">Bonuses:</div><div className="text-[11px] space-y-0.5">{bonuses.length > 0 ? bonuses.map(([name, val]) => <div key={name} className={`flex justify-between ${val < 0 ? 'text-red-400' : 'text-emerald-400'}`}><span>{bonusLabel(name, player, settings)}</span><span className="font-mono">{val > 0 ? '+' : ''}{val}</span></div>) : <div className="text-slate-600 italic">None</div>}</div></div>
            <div className="mt-auto pt-2 border-t border-slate-700"><div className="flex justify-between font-bold text-white"><span>Total Grade</span><span>{f1(player.grade)}</span></div><div className="flex justify-between text-[11px] text-blue-400 mt-1"><span>Week {week} Multiplier (÷{divisor})</span><span className="font-mono font-bold">{f2(c.mult)}x</span></div></div>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col gap-2">
            <div className="text-amber-400 font-bold mb-1 pb-1 border-b border-slate-800">WEIGHTED PROJECTION</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Base ({wLabel(c.wb)})</span><span className="font-mono text-white">{f1(c.base * c.wb)}</span></div><div className="text-[11px] text-slate-500 leading-tight">{f1(c.avg)} (Kicker Avg) × {f2(c.mult)} (Mult) = {f1(c.base)}</div>{avgGames && <div className="text-[11px] text-sky-300/70 leading-tight">{avgGames}</div>}</div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Offense ({wLabel(c.wo)})</span><span className="font-mono text-white">{f1(c.off * c.wo)}</span></div><div className="text-[11px] text-slate-500 leading-tight">{f1(player.exp_team_pts)} (Exp Pts) × {pctOf(player.off_share)} (Share) × {f2(c.ratio)} (Fan/Real) = {f1(c.off)}</div></div>
            <div><div className="flex justify-between text-xs text-slate-300"><span>Defense ({wLabel(c.wd)})</span><span className="font-mono text-white">{f1(c.def * c.wd)}</span></div><div className="text-[11px] text-slate-500 leading-tight">{f1(player.exp_opp_allowed)} (Exp Allowed) × {pctOf(player.def_share)} (Share) × {f2(c.ratio)} (Fan/Real) = {f1(c.def)}</div></div>
            {c.lg != null && c.pull !== 1 && (
              <div className="border-t border-slate-800 pt-1">
                <div className="flex justify-between text-xs text-slate-300"><span>League pull</span><span className="font-mono text-white">{f1(c.model)} → {f1(c.raw)}</span></div>
                <div className="text-[11px] text-slate-500 leading-tight">Keeps {Math.round(c.pull * 100)}% of the gap from the average kicker ({f1(c.lg)}). Kicker scoring is very random, so this makes the points more realistic without changing the order.</div>
              </div>
            )}
            <div className="mt-auto pt-2 border-t border-slate-700"><div className="flex justify-between font-bold text-white text-[11px]"><span>Week {week} Projection</span><span className="text-emerald-400 text-lg">{player.proj}</span></div><div className="text-[11px] text-right text-slate-500">({f2(c.raw)} rounded)</div></div>
          </div>
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50"><div className="font-bold mb-2 pb-1 border-b border-slate-800 flex items-center justify-between"><div className="flex items-center gap-2 text-purple-400"><Target className="w-3 h-3"/> Last 3 Trend</div><span className={`text-[11px] font-mono ${trendColor}`}>{trendSign}{l3_diff.toFixed(1)}</span></div><HistoryBars games={player.history?.l3_games} /></div>
          <MatchupHistory player={player} />
        </div>
        <div className="mt-3 bg-slate-800/40 p-2 rounded border border-slate-800 text-[11px] text-slate-400 flex flex-wrap gap-x-6 gap-y-1 justify-center">
          {hasVegas
            ? <><span><strong className="text-slate-200">Vegas:</strong> {player.details_vegas_spread} / {f1(player.details_vegas_total)} Total</span><span><strong className="text-slate-200">Implied Score:</strong> {f1(player.vegas)} pts</span></>
            : <span className="text-amber-400/80">No Vegas line yet: expected points use {win} averages only</span>}
          <span><strong className="text-slate-200">{win} Team PF:</strong> {player.off_ppg != null ? f1(player.off_ppg) : '--'} pts</span>
          <span><strong className="text-slate-200">{win} Opp PA:</strong> {player.def_pa != null ? f1(player.def_pa) : '--'} pts</span>
        </div>
        {(player.team_prior_games > 0 || player.opp_prior_games > 0) && (() => {
          // the team windows still reach into last season early on
          const winGames = win === 'L3' ? 3 : 5;
          const form = (fromLast) => `${winGames - (fromLast || 0)} this season + ${fromLast || 0} from last season`;
          return (
            <div className="mt-2 text-[11px] text-sky-300/80 text-center">
              Early season: {win} team form uses {form(player.team_prior_games)} · Opponent: {form(player.opp_prior_games)}
            </div>
          );
        })()}
    </div>
  );
};

export const DeepDiveRow = ({ player, leagueAvgs, week, settings, sleeperStatus }) => (
  <tr className="bg-slate-900/50 border-b border-slate-800">
    <td colSpan="11" className="p-4">
      <MathCard player={player} leagueAvgs={leagueAvgs} week={week} settings={settings} />
    </td>
  </tr>
);

// Injury Report card. Points = THIS season (the kicker-avg buckets span ~2 seasons).
export const InjuryCard = ({ k, borderColor, textColor }) => {
     const [imgError, setImgError] = useState(false);
     const report = splitReport(k.injury_details);
     
     return (
         <div className={`flex items-center gap-4 p-3 bg-slate-900/80 rounded-lg border ${borderColor} overflow-hidden`}>
            {imgError || !k.headshot_url ? (
               <HelmetIcon borderColor={borderColor} />
            ) : (
               <img 
                 src={k.headshot_url} 
                 className={`w-12 h-12 rounded-full border-2 object-cover flex-shrink-0 ${borderColor.replace('border', 'border-')}`} 
                 onError={() => setImgError(true)} 
               />
            )}
            <div className="min-w-0 flex-1">
               <div className="font-bold text-white truncate">{k.kicker_player_name} ({k.team})</div>
               <div className={`text-xs font-bold ${textColor} truncate`}>{[k.injury_status, report.injury].filter(Boolean).join(': ') || 'On the injury report'}</div>
               {report.practice && <div className="text-xs text-slate-400 italic truncate">{report.practice}</div>}
               <div className="text-xs text-slate-500 mt-1">{k.season_games ? `This season: ${Math.round(k.season_pts * 10) / 10} pts in ${k.season_games} game${k.season_games === 1 ? '' : 's'}` : 'No games this season'}</div>
            </div>
         </div>
     );
};