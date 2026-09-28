// Worksheet "Matchup History & News" box. /api/insights sends SUMMED kick buckets per
// scenario (all kickers at this stadium in these conditions; this kicker in these
// conditions); this turns them into per-game numbers in the USER's scoring, readable
// labels, and links to the same games in the Ask tab.
import { calcFPts } from './scoring';
import { TEAM_BY_ABBR } from './askParser';

// the scenario's conditions in words (Ask-tab filter keys)
export const condLabels = (f = {}) => [
  f.venue === 'dome' ? 'indoors' : null,
  f.weather === 'snow' ? 'in snow' : f.weather === 'rain' ? 'in rain' : f.weather === 'clear' ? 'clear weather' : null,
  f.venue === 'outdoors' ? 'outdoors' : null,
  f.temp === 'freezing' ? 'below freezing' : f.temp === 'cold' ? '40°F or colder' : f.temp === 'warm' ? '70°F or warmer' : null,
  f.wind === 'windy' ? '15+ mph wind' : null,
].filter(Boolean);

const perGame = (s, scoring) => (s && s.n
  ? { n: s.n, pts: calcFPts(s, scoring) / s.n, fgAtt: s.fg_att / s.n, fgMade: s.fg_made / s.n }
  : null);

const askLink = (base, f, question) => {
  const p = new URLSearchParams({ tab: 'ask', q: question, ...base });
  for (const k of ['stadium', 'venue', 'weather', 'temp', 'wind']) if (f[k]) p.set(k, f[k]);
  return `?${p}`;
};

/** ins = /api/insights .insights[gsis_id]; all = its .all (every kicker-game since 2000) */
export function buildInsight(ins, all, scoring, player) {
  if (!ins) return null;
  const avg = perGame(all, scoring);
  const out = { news: ins.news || [] };

  const v = ins.venue && perGame(ins.venue.sums, scoring);
  if (v) {
    const nick = TEAM_BY_ABBR[ins.venue.filters.stadium]?.nick;
    const where = nick ? `at the ${nick}' stadium` : 'at this stadium';
    const conds = condLabels(ins.venue.filters);
    out.venue = {
      ...v, where, conditions: conds,
      vsAvg: avg ? v.pts - avg.pts : null,
      link: askLink({ all: '1' }, ins.venue.filters, `All kickers ${where}${conds.length ? ` ${conds.join(', ')}` : ''}`),
    };
  }

  const o = ins.own && perGame(ins.own.sums, scoring);
  if (o) {
    const conds = condLabels(ins.own.filters);
    out.own = {
      ...o, conditions: conds, others: perGame(ins.own.others, scoring),
      link: askLink({ kicker: player.gsis_id }, ins.own.filters, `${player.kicker_player_name} ${conds.join(', ')}`),
    };
  }
  return out;
}
