export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/calebhill";

// Stats Legend (GlossaryTab), grouped by the tab each number appears on. Keep in step
// with MODEL_SPEC.md: every number, badge and emoji on the site should be defined here.
export const GLOSSARY_SECTIONS = [
  { section: 'Week Model', intro: "This week's projections. Click a kicker for his worksheet; hover him for his season numbers.", items: [
    { header: 'Projection', title: 'Projected Points', desc: "What we expect him to score this week in YOUR league's scoring: 50% Base + 30% Offense + 20% Defense (see The Worksheet below), then pulled toward the average kicker. Whole numbers only — kickers don't score 9.4 points, so 9.4 → 9 and 9.5 → 10.", source: 'KickerGenius model' },
    { header: 'Matchup Grade', title: 'Matchup Grade', desc: "How good this week's matchup is: Offense score + Defense score (each 40 for a league-average team, from red-zone kicker points) + bonuses (Dome +10, Cold −20). 80 = an average matchup; purple = over 100. Grade ÷ 90 = the multiplier on his average.", source: 'KickerGenius model' },
    { header: 'Weather', title: 'Weather', desc: "Kickoff forecast before the game, actual conditions once it's played: sky, wind and temperature. A dome or closed roof adds 10 to the grade; outdoors at 40°F or below takes 20 off.", source: 'Open-Meteo · nflverse' },
    { header: 'Offense Red Zone', title: 'Offense Red Zone (L3/L5)', desc: "Red-zone kicker points per game. Every drive that reaches the opponent's 25 is worth kicker points: one that stalls = 3 (a field-goal try), any other trip = 1 (almost always a TD, so an extra point). It counts how often his team gets there AND how the trips end. Underneath: trips per game and stall rate (% of red-zone trips that didn't end in a TD).", source: 'nflverse play-by-play' },
    { header: 'Opponent Red Zone', title: 'Opponent Red Zone (L3/L5)', desc: "The same red-zone kicker points, for what the opponent's defense ALLOWS per game: red-zone trips allowed, and how often it makes them stall.", source: 'nflverse play-by-play' },
    { header: 'Projection Accuracy', title: 'Projection Accuracy (L3)', desc: 'His last 3 games played: total points scored vs total projected (your scoring). Green = he scored at least what we projected.', source: 'KickerGenius weekly snapshots' },
    { header: 'Vegas', title: 'Implied Vegas Score', desc: "Points Vegas expects his team to score: (game total ± spread) ÷ 2. It's 70% of the expected team points in the Offense part; the other 30% is his team's recent scoring.", source: 'nflverse betting lines' },
    { header: 'Offensive PF ❄️', title: 'Offense Points For (L3/L5)', desc: "His team's average points scored over its last 3 or 5 games. ❄️ = under 15 per game (a cold offense).", source: 'nflverse schedules' },
    { header: 'Opponent PA 🛡️', title: 'Opponent Points Allowed (L3/L5)', desc: 'Points the opponent allowed per game over its last 3 or 5 games. 🛡️ = under 17 per game (a tough defense).', source: 'nflverse schedules' },
    { header: 'L3 / L5', title: 'Model Window', desc: "Last 3 or last 5 games played (byes skipped) — choose in League Settings. L5 is the default: it tested better. Early in the season the team windows are filled with last season's games.", source: 'KickerGenius model' },
    { header: '🔥 · Badges', title: 'Kicker Badges', desc: '🔥 = a top-5 scorer this season (your scoring). MY TEAM / TAKEN / FREE AGENT = his status in your active Sleeper league. The ring round his photo is his injury status: yellow = Questionable, red = Doubtful or Out, dark red = IR. Hover any kicker for his season rank, points and average.', source: 'Sleeper · CBS Sports' },
    { header: 'Hide taken', title: 'Hide Taken Kickers', desc: 'With a Sleeper league active, hides kickers already on other teams in that league — so you only see yours (listed first) and free agents.', source: 'Sleeper' },
  ] },
  { section: 'The Worksheet', intro: "Click any kicker on the Week Model to see his projection worked out step by step.", items: [
    { header: 'Kicker Avg', title: 'Kicker Average', desc: "His average fantasy points per game (your scoring) over his last 34 games: all of this season plus his most recent earlier games — about two seasons. Kicking is so random that ~2 seasons predicts best. Rookies with fewer than 4 games are topped up with league-average games.", source: 'nflverse play-by-play' },
    { header: 'Multiplier', title: 'Matchup Multiplier', desc: 'Matchup Grade ÷ 90. An average matchup (80) gives 0.89; a great one (110) gives 1.22.', source: 'KickerGenius model' },
    { header: 'Base (50%)', title: 'Base', desc: 'Kicker Avg × Multiplier: what he usually scores, adjusted for this matchup.', source: 'KickerGenius model' },
    { header: 'Offense (30%)', title: 'Offense Part', desc: "Expected team points (70% Vegas implied + 30% his team's L3/L5 scoring) × his share of his team's points (his real points ÷ team points, L3/L5, capped at 80%) × Fan/Real ratio.", source: 'KickerGenius model' },
    { header: 'Defense (20%)', title: 'Defense Part', desc: "Expected points the opponent gives up (70% Vegas implied + 30% its L3/L5 points allowed) × the share of those points kickers score against it × Fan/Real ratio.", source: 'KickerGenius model' },
    { header: 'Fan/Real', title: 'Fantasy / Real Ratio', desc: "Turns real NFL kicker points (3 per field goal, 1 per extra point) into your league's fantasy points, using his Kicker Avg games — so long-range kickers get more fantasy points per real point in leagues that reward distance.", source: 'KickerGenius model' },
    { header: 'Bonuses', title: 'Grade Bonuses', desc: 'Added to the Matchup Grade: Dome or closed roof +10; Cold −20 (outdoors, 40°F or below at kickoff). We also tested wind, snow, altitude, 4th-down aggression, elite defenses and more — none reliably helped, so they are not used.', source: 'KickerGenius model' },
    { header: 'League Pull', title: 'League Pull', desc: "The last step: keeps 60% of the gap between the model and the average kicker-game (the 3 previous seasons, your scoring). Kicker scoring is very random, so this stops extreme projections without changing the order.", source: 'KickerGenius model' },
    { header: 'Last 3 Trend', title: 'Last 3 Trend', desc: 'His last 3 games: what we projected at the time (rebuilt in your scoring) vs what he scored.', source: 'KickerGenius weekly snapshots' },
    { header: 'Matchup History', title: 'Matchup History & News', desc: "How kickers have scored at this stadium since 2000 in conditions like this week's — a dome, or the forecast's snow, rain or clear skies, cold or warmth and wind — narrowed only as far as there are still 15+ games, compared with an average kicker-game. Then how HE has done in those conditions (5+ games) vs his other games, and his latest news. 'See them' opens those games in the Ask tab.", source: 'nflverse · RotoWire' },
  ] },
  { section: 'Week Accuracy', intro: 'How the projections did, for finished games only, in your scoring.', items: [
    { header: 'Total Points', title: 'Total Points', desc: 'Actual points vs projected points, added up over the finished games.', source: 'KickerGenius weekly snapshots' },
    { header: 'Accuracy Rate', title: 'Accuracy Rate', desc: '% of finished games where the kicker landed within ±3 points of his projection.', source: 'KickerGenius weekly snapshots' },
    { header: 'Smash · Met · Bust', title: 'Performance', desc: 'Smash = more than 3 points over the projection; Met = within ±3; Bust = more than 3 under.', source: 'KickerGenius weekly snapshots' },
    { header: 'Kicker Quartile', title: 'Kicker Quartile', desc: 'The spread of (actual − projected): the lowest and highest, the median (M), and the middle half of kickers highlighted. Needs 4+ finished games.', source: 'KickerGenius weekly snapshots' },
    { header: 'Avg Miss', title: 'Average Miss', desc: 'The average size of the miss, |actual − projected|, in points. Kicker scoring is noisy: even a model that knew the final score would miss by about 3.4 on average.', source: 'KickerGenius weekly snapshots' },
    { header: 'Model vs Baseline', title: 'Model vs His Average', desc: "Average miss of our projection vs simply guessing each kicker's Kicker Avg. Lower is better — the model should win.", source: 'KickerGenius weekly snapshots' },
    { header: 'Sleeper Live', title: 'Live Scores', desc: 'During games, live points from your active Sleeper league, in that league’s own scoring.', source: 'Sleeper' },
  ] },
  { section: 'Historical YTD', intro: "This season's real totals (not the Kicker Avg), in your scoring.", items: [
    { header: 'Fantasy Points', title: 'Fantasy Points', desc: 'Total fantasy points this season.', source: 'nflverse play-by-play' },
    { header: 'Avg Fantasy Pts', title: 'Average Fantasy Points', desc: 'Fantasy points per game played this season.', source: 'nflverse play-by-play' },
    { header: 'FG (Made/Att)', title: 'Field Goals', desc: 'Field goals made / attempted this season, and the percentage made.', source: 'nflverse play-by-play' },
    { header: '50+ FGs', title: 'Long Field Goals', desc: 'Field goals made from 50 yards or more.', source: 'nflverse play-by-play' },
    { header: 'Dome Games (%)', title: 'Dome Games', desc: 'Share of his games played in a dome or under a closed roof.', source: 'nflverse schedules' },
    { header: 'Red Zone Trips', title: 'Red Zone Trips', desc: "His team's drives that reached the opponent's 25, in his games this season.", source: 'nflverse play-by-play' },
    { header: 'Offense Stall %', title: 'Offense Stall Rate (Season)', desc: "% of those red-zone trips that didn't end in a touchdown — usually a field-goal try for him.", source: 'nflverse play-by-play' },
    { header: 'Opponent Stall %', title: 'Opponent Stall Rate (Season)', desc: "Strength of schedule: the season-long rate at which the defenses he has faced made red-zone trips stall.", source: 'nflverse play-by-play' },
  ] },
  { section: 'Ask', intro: 'Questions about any kicker, team or all kickers — no AI, just the stats.', items: [
    { header: 'Ask', title: 'Asking a Question', desc: "Type it in plain English, e.g. “How does Aubrey do in domes?” or “All kickers in snow in Buffalo”. Covers regular-season games from 2000 to today. The answer compares the matching games with his other games, in your scoring.", source: 'nflverse' },
    { header: 'FG / Game', title: 'FG Attempts & Makes per Game', desc: 'Field-goal attempts and makes per game in the matching games; the distance rows show made / attempted from 0–39, 40–49 and 50+ yards.', source: 'nflverse play-by-play' },
    { header: 'Conditions', title: 'Game Conditions', desc: 'Dome or outdoors, and the weather on the day — snow, rain or clear — plus wind and temperature where recorded.', source: 'nflverse' },
  ] },
  { section: 'Injuries & Settings', items: [
    { header: 'Injury Status', title: 'Injury Report', desc: 'Game status (Questionable, Doubtful, Out, IR…) from CBS Sports, refreshed every 3 hours, plus practice participation from the official NFL injury report — DNP (did not practice), Limited or Full — updated about daily. Early in the week a kicker can be on the practice report before he has a game status. Kickers on IR, the practice squad or inactive are hidden from the Week Model.', source: 'CBS Sports · NFL report (nflverse)' },
    { header: 'Scoring · Leagues', title: 'Your Scoring', desc: 'Custom scoring, or your saved Sleeper leagues — switch at the top of the page. Every projection, trend and accuracy number uses the active league’s scoring.', source: 'Sleeper' },
  ] },
];

export const DEFAULT_SCORING = {
  // Makes
  fg0_19: 3, fg20_29: 3, fg30_39: 3, fg40_49: 4, fg50_59: 5, fg60_plus: 5,
  xp_made: 1,
  
  // Misses 
  fg_miss: -1, 
  fg_miss_0_19: -1, fg_miss_20_29: -1, fg_miss_30_39: -1, 
  fg_miss_40_49: -1, fg_miss_50_59: -1, fg_miss_60_plus: -1,
  xp_miss: -1
};

export const SCORING_CONFIG = [
  { label: "0-19 Yards", makeKey: "fg0_19", missKey: "fg_miss_0_19" },
  { label: "20-29 Yards", makeKey: "fg20_29", missKey: "fg_miss_20_29" },
  { label: "30-39 Yards", makeKey: "fg30_39", missKey: "fg_miss_30_39" },
  { label: "40-49 Yards", makeKey: "fg40_49", missKey: "fg_miss_40_49" },
  { label: "50-59 Yards", makeKey: "fg50_59", missKey: "fg_miss_50_59" },
  { label: "60+ Yards", makeKey: "fg60_plus", missKey: "fg_miss_60_plus" },
  { label: "PAT", makeKey: "xp_made", missKey: "xp_miss" }
];

export const SETTING_LABELS = {
  // Kept for legacy support if needed
};