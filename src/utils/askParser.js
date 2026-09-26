// Ask tab: turns a typed question ("How does Bass do in the snow?", "Butker vs
// Titans", "Aubrey in domes since 2023") into a kicker + filters, WITHOUT AI --
// plain keyword matching. The tab shows what it understood as editable
// dropdowns, so anything this misses can be fixed by hand.

export const TEAMS = [
  { abbr: 'ARI', nick: 'Cardinals', names: ['cardinals', 'cards', 'arizona'] },
  { abbr: 'ATL', nick: 'Falcons', names: ['falcons', 'atlanta'] },
  { abbr: 'BAL', nick: 'Ravens', names: ['ravens', 'baltimore'] },
  { abbr: 'BUF', nick: 'Bills', names: ['bills', 'buffalo'] },
  { abbr: 'CAR', nick: 'Panthers', names: ['panthers', 'carolina'] },
  { abbr: 'CHI', nick: 'Bears', names: ['bears', 'chicago'] },
  { abbr: 'CIN', nick: 'Bengals', names: ['bengals', 'cincinnati'] },
  { abbr: 'CLE', nick: 'Browns', names: ['browns', 'cleveland'] },
  { abbr: 'DAL', nick: 'Cowboys', names: ['cowboys', 'dallas'] },
  { abbr: 'DEN', nick: 'Broncos', names: ['broncos', 'denver'] },
  { abbr: 'DET', nick: 'Lions', names: ['lions', 'detroit'] },
  { abbr: 'GB', nick: 'Packers', names: ['packers', 'green bay', 'lambeau'] },
  { abbr: 'HOU', nick: 'Texans', names: ['texans', 'houston'] },
  { abbr: 'IND', nick: 'Colts', names: ['colts', 'indianapolis', 'indy'] },
  { abbr: 'JAX', nick: 'Jaguars', names: ['jaguars', 'jags', 'jacksonville'] },
  { abbr: 'KC', nick: 'Chiefs', names: ['chiefs', 'kansas city', 'arrowhead'] },
  { abbr: 'LV', nick: 'Raiders', names: ['raiders', 'las vegas', 'vegas'] },
  { abbr: 'LAC', nick: 'Chargers', names: ['chargers'] },
  { abbr: 'LA', nick: 'Rams', names: ['rams'] },
  { abbr: 'MIA', nick: 'Dolphins', names: ['dolphins', 'miami'] },
  { abbr: 'MIN', nick: 'Vikings', names: ['vikings', 'minnesota'] },
  { abbr: 'NE', nick: 'Patriots', names: ['patriots', 'pats', 'new england', 'foxborough'] },
  { abbr: 'NO', nick: 'Saints', names: ['saints', 'new orleans'] },
  { abbr: 'NYG', nick: 'Giants', names: ['giants'] },
  { abbr: 'NYJ', nick: 'Jets', names: ['jets'] },
  { abbr: 'PHI', nick: 'Eagles', names: ['eagles', 'philadelphia', 'philly'] },
  { abbr: 'PIT', nick: 'Steelers', names: ['steelers', 'pittsburgh'] },
  { abbr: 'SF', nick: '49ers', names: ['49ers', 'niners', 'san francisco'] },
  { abbr: 'SEA', nick: 'Seahawks', names: ['seahawks', 'seattle'] },
  { abbr: 'TB', nick: 'Buccaneers', names: ['buccaneers', 'bucs', 'tampa bay', 'tampa'] },
  { abbr: 'TEN', nick: 'Titans', names: ['titans', 'tennessee'] },
  { abbr: 'WAS', nick: 'Commanders', names: ['commanders', 'washington'] },
];
export const TEAM_BY_ABBR = Object.fromEntries(TEAMS.map((t) => [t.abbr, t]));

export const EMPTY_FILTERS = {
  opponent: '',     // team abbr he played against
  stadium: '',      // team abbr whose stadium the game was in
  venue: '',        // 'dome' | 'outdoors'
  weather: '',      // 'snow' | 'rain' | 'clear'
  wind: '',         // 'windy' (15+ mph, outdoors)
  temp: '',         // 'cold' (<=40F) | 'freezing' (<=32F) | 'warm' (>=70F)
  homeAway: '',     // 'home' | 'away'
  fromSeason: '',
  toSeason: '',
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lastName = (name) => (name.includes('.') ? name.slice(name.indexOf('.') + 1) : name);
const has = (text, re) => re.test(text);

// "vs Titans" / "against the Titans" -> opponent; "at Buffalo" / "in Denver" -> stadium
const OPP_WORDS = /(?:\bvs\.?|\bversus|\bagainst|\bfac(?:e|es|ed|ing)|\bplay(?:s|ed|ing)?|\bmeets?|\bv\.?)\s+(?:the\s+)?$/;
const AT_WORDS = /(?:\bat|\bin|@)\s+(?:the\s+)?$/;

// -> [{ abbr, role: 'opponent' | 'stadium' | 'plain', index }] in the order typed
function findTeams(raw) {
  const text = raw.toLowerCase();
  const found = [];
  for (const t of TEAMS) {
    // nicknames / cities, e.g. "titans", "green bay"
    for (const name of t.names) {
      const re = new RegExp(`\\b${escapeRe(name)}\\b`, 'g');
      let m;
      while ((m = re.exec(text)) !== null) {
        const before = text.slice(Math.max(0, m.index - 14), m.index);
        const role = OPP_WORDS.test(before) ? 'opponent' : AT_WORDS.test(before) ? 'stadium' : 'plain';
        found.push({ abbr: t.abbr, role, index: m.index });
      }
    }
    // abbreviations only in capitals right after vs/at ("vs KC", "@ BUF"),
    // so ordinary words like "no" or "la" never count as teams
    const abbrRe = new RegExp(`(vs\\.?|versus|against|at|@)\\s+${t.abbr}\\b`, 'g');
    let m;
    while ((m = abbrRe.exec(raw)) !== null) {
      const role = /^(at|@)$/i.test(m[1]) ? 'stadium' : 'opponent';
      found.push({ abbr: t.abbr, role, index: m.index });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

// Levenshtein edit distance (typos: "Aubry" -> "Aubrey" = 1)
function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Everyday words in questions that must never be read as a misspelled name.
const NOT_NAMES = new Set(('when what with does play plays played playing against versus home road away game games ' +
  'snow snowy rain rainy cold colder wind windy dome domes indoor outdoor outdoors weather season seasons year years ' +
  'since this last kick kicks kicker field goal goals points point week weeks good well look looks their there ' +
  'have been does doing warm hard easy mile miles yard yards long short ever from into over under').split(' '));

const newestFirst = (a, b) => b.last_season - a.last_season || b.games - a.games;

// -> { kicker, fuzzy } ; fuzzy = true when found through a typo match
function findKicker(raw, kickers) {
  const candidates = kickers.filter((k) => new RegExp(`\\b${escapeRe(lastName(k.name))}\\b`, 'i').test(raw));
  if (candidates.length === 1) return { kicker: candidates[0], fuzzy: false };
  if (candidates.length > 1) {
    // same surname: prefer the one whose first initial was typed ("Brandon ...")
    const byInitial = candidates.filter((k) =>
      new RegExp(`\\b${escapeRe(k.name[0])}[a-z]*\\.?\\s+${escapeRe(lastName(k.name))}`, 'i').test(raw));
    return { kicker: [...(byInitial.length ? byInitial : candidates)].sort(newestFirst)[0], fuzzy: false };
  }
  // no exact surname: allow a small typo (1 letter for short names, 2 for 7+ letters)
  const teamWords = new Set(TEAMS.flatMap((t) => t.names));
  const words = (raw.toLowerCase().match(/[a-z']+/g) || [])
    .map((w) => w.replace(/'s$/, '').replace(/'/g, ''))
    .filter((w) => w.length >= 4 && !NOT_NAMES.has(w) && !teamWords.has(w));
  let best = null;
  for (const k of kickers) {
    const surname = lastName(k.name).toLowerCase();
    if (surname.length < 4) continue;
    const allowed = surname.length >= 7 ? 2 : 1;
    for (const w of words) {
      const d = editDistance(w, surname);
      if (d <= allowed && (!best || d < best.d || (d === best.d && newestFirst(k, best.k) < 0))) best = { k, d };
    }
  }
  return { kicker: best ? best.k : null, fuzzy: !!best };
}

/**
 * -> { kicker, filters, notes }
 *   kicker: a row from /api/ask/kickers (or null)
 *   filters: EMPTY_FILTERS shape
 *   notes: things worth telling the user (e.g. "used the Cowboys' current kicker")
 */
export function parseQuestion(raw, kickers, currentSeason) {
  const text = raw.toLowerCase();
  const filters = { ...EMPTY_FILTERS };
  const notes = [];

  const found = findKicker(raw, kickers);
  let kicker = found.kicker;
  if (found.fuzzy) notes.push(`Assumed you meant ${kicker.name}.`);
  const teams = findTeams(raw);

  for (const t of teams) {
    if (t.role === 'opponent') filters.opponent = t.abbr;
    else if (t.role === 'stadium') filters.stadium = t.abbr;
  }
  const plain = teams.filter((t) => t.role === 'plain');
  if (!kicker && plain.length) {
    // "Cowboys kicker in domes" -> the team's current kicker
    const team = plain[0].abbr;
    kicker = [...kickers].filter((k) => k.team === team)
      .sort((a, b) => b.last_season - a.last_season || b.games - a.games)[0] || null;
    if (kicker) notes.push(`Used the ${TEAM_BY_ABBR[team].nick}' current kicker.`);
    plain.shift();
  }
  // "Butker Titans" (no vs/at): a team that isn't his own is the opponent
  if (!filters.opponent && kicker) {
    const other = plain.find((t) => t.abbr !== kicker.team);
    if (other) filters.opponent = other.abbr;
  }

  if (has(text, /\bsnow(y|ing|fall)?\b|\bblizzard|\bflurr/)) filters.weather = 'snow';
  else if (has(text, /\brain(y|ing)?\b|\bwet\b|\bshowers?\b|\bdownpour/)) filters.weather = 'rain';
  else if (has(text, /\bclear\b|\bsunny\b|\b(nice|good|dry) weather\b/)) filters.weather = 'clear';

  if (has(text, /\bdomes?\b|\bindoors?\b|\binside\b|\b(closed|under a) roof\b/)) filters.venue = 'dome';
  else if (has(text, /\boutdoors?\b|\boutside\b|\bopen[- ]air\b|\bthe elements\b/)) filters.venue = 'outdoors';

  if (has(text, /\bwind(y|s)?\b|\bgust(y|s)?\b|\bbreezy\b/)) filters.wind = 'windy';

  if (has(text, /\bfreez(e|ing)\b|\bbelow 32\b/)) filters.temp = 'freezing';
  else if (has(text, /\bcold(er|est)?\b|\bchilly\b|\bwinter\b|\bfrigid\b/)) filters.temp = 'cold';
  else if (has(text, /\bwarm\b|\bhot\b|\bheat\b/)) filters.temp = 'warm';

  if (has(text, /\bat home\b|\bhome games?\b|\bhome\b/)) filters.homeAway = 'home';
  else if (has(text, /\baway\b|\bon the road\b|\broad games?\b|\broad\b/)) filters.homeAway = 'away';

  const range = raw.match(/\b(20\d{2})\s*(?:-|–|to|through|thru)\s*(20\d{2})\b/i);
  const since = raw.match(/\bsince\s+(20\d{2})\b/i);
  const years = [...raw.matchAll(/\b(20\d{2})\b/g)].map((m) => +m[1]);
  if (range) { filters.fromSeason = String(Math.min(+range[1], +range[2])); filters.toSeason = String(Math.max(+range[1], +range[2])); }
  else if (since) { filters.fromSeason = since[1]; filters.toSeason = String(currentSeason); }
  else if (years.length) { filters.fromSeason = String(Math.min(...years)); filters.toSeason = String(Math.max(...years)); }
  else if (has(text, /\bthis (season|year)\b/)) { filters.fromSeason = filters.toSeason = String(currentSeason); }
  else if (has(text, /\blast (season|year)\b/)) { filters.fromSeason = filters.toSeason = String(currentSeason - 1); }

  if (/\bplayoffs?\b|\bpostseason\b/.test(text)) notes.push('Playoff games are not in the data yet: showing regular season.');

  return { kicker, filters, notes };
}

/** Does one game (a row from /api/ask/games) match the filters? */
export function matchesFilters(g, f) {
  const stadium = g.is_home ? g.team : g.opponent;
  if (f.opponent && g.opponent !== f.opponent) return false;
  if (f.stadium && stadium !== f.stadium) return false;
  if (f.venue === 'dome' && !g.is_dome) return false;
  if (f.venue === 'outdoors' && g.is_dome) return false;
  if (f.weather && g.game_conditions !== f.weather) return false;
  if (f.wind === 'windy' && (g.is_dome || g.wind == null || g.wind < 15)) return false;
  if (f.temp) {
    if (g.game_temp == null) return false;
    if (f.temp === 'cold' && g.game_temp > 40) return false;
    if (f.temp === 'freezing' && g.game_temp > 32) return false;
    if (f.temp === 'warm' && g.game_temp < 70) return false;
  }
  if (f.homeAway === 'home' && !g.is_home) return false;
  if (f.homeAway === 'away' && g.is_home) return false;
  if (f.fromSeason && g.season < +f.fromSeason) return false;
  if (f.toSeason && g.season > +f.toSeason) return false;
  return true;
}

export const hasAnyFilter = (f) => Object.values(f).some(Boolean);

/** "in the snow vs the Titans at home in 2023" */
export function describeFilters(f) {
  const parts = [];
  if (f.weather === 'snow') parts.push('in the snow');
  if (f.weather === 'rain') parts.push('in the rain');
  if (f.weather === 'clear') parts.push('in clear weather');
  if (f.venue === 'dome') parts.push('in domes');
  if (f.venue === 'outdoors') parts.push('outdoors');
  if (f.wind === 'windy') parts.push('in windy games (15+ mph)');
  if (f.temp === 'cold') parts.push('in cold games (40°F or below)');
  if (f.temp === 'freezing') parts.push('below freezing');
  if (f.temp === 'warm') parts.push('in warm games (70°F+)');
  if (f.opponent) parts.push(`vs the ${TEAM_BY_ABBR[f.opponent]?.nick || f.opponent}`);
  if (f.stadium) parts.push(`at the ${TEAM_BY_ABBR[f.stadium]?.nick || f.stadium}' stadium`);
  if (f.homeAway === 'home') parts.push('at home');
  if (f.homeAway === 'away') parts.push('on the road');
  if (f.fromSeason && f.toSeason && f.fromSeason === f.toSeason) parts.push(`in ${f.fromSeason}`);
  else if (f.fromSeason || f.toSeason) parts.push(`in ${f.fromSeason || '…'}–${f.toSeason || '…'}`);
  return parts.join(' ');
}
