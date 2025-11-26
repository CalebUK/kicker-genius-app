export const GLOSSARY_DATA = [
  { header: "Grade", title: "Matchup Grade", desc: "Composite score (Baseline 90) combining Stall Rates, Weather, and History. >100 is elite.", why: "Predictive Model", source: "Kicker Genius Model" },
  { header: "Proj Pts", title: "Projected Points", desc: "Forecasted score based on Kicker's Average adjusted by Grade, Vegas lines, and Scoring Caps.", why: "Start/Sit Decision", source: "Kicker Genius Model" },
  { header: "Rounding", title: "No Fractional Points", desc: "At Kicker Genius we don't believe in fractional points for Kickers. If a kicker can't get 9.4 points we shouldn't project it. .4 and below will be rounded down and .5 and above will be rounded up.", why: "Realism", source: "Kicker Genius Model" },
  { header: "Proj Acc", title: "Projection Accuracy (L3)", desc: "Total Actual Points vs Total Projected Points over the last 3 weeks.", why: "Model Trust Check", source: "Historical Backtest" },
  { header: "Injury", title: "Injury Status", desc: "Live tracking of game designation (Out, Doubtful, Questionable) and Practice Squad status.", why: "Availability Risk", source: "NFL Official + CBS Scraper" },
  { header: "Avg FPts", title: "Average Fantasy Points", desc: "Average points scored per game played this season.", why: "Consistency Metric", source: "nflreadpy (Play-by-Play)" },
  { header: "L4 Off %", title: "Offensive Stall Rate (L4)", desc: "% of drives inside the 25 that fail to score a TD over the last 4 weeks.", why: "Recent Trend Volume", source: "nflreadpy (Play-by-Play)" },
  { header: "L4 Def %", title: "Opponent Force Rate (L4)", desc: "% of opponent drives allowed inside the 25 that resulted in FGs (Last 4 weeks).", why: "Matchup Difficulty", source: "nflreadpy (Play-by-Play)" },
  { header: "Off Stall (YTD)", title: "Season Offense Stall Rate", desc: "Percentage of the kicker's team drives inside the 25 that ended in a FG attempt (Full Season).", why: "Long Term Efficiency", source: "nflreadpy (Season)" },
  { header: "Def Stall (YTD)", title: "Season Defense Stall Rate", desc: "Percentage of the kicker's team defense forcing FG attempts inside the 25 (Full Season).", why: "Game Script Indicator", source: "nflreadpy (Season)" },
  { header: "Vegas", title: "Implied Team Total", desc: "Points Vegas expects this team to score (derived from Spread & Total).", why: "Reality Check", source: "nflreadpy (Lee Sharpe)" },
  { header: "Weather", title: "Live Forecast", desc: "Wind speed, temperature, and precipitation conditions at kickoff time.", why: "Accuracy Impact", source: "Open-Meteo API" },
  { header: "Off PF", title: "Offense Points For", desc: "Average points scored by the kicker's team over the last 4 weeks.", why: "Scoring Ceiling", source: "nflreadpy (Schedule)" },
  { header: "Opp PA", title: "Opponent Points Allowed", desc: "Average points allowed by the opponent over the last 4 weeks.", why: "Defensive Ceiling", source: "nflreadpy (Schedule)" },
  { header: "FPts", title: "Fantasy Points (YTD)", desc: "Standard Scoring: 3 pts (0-39 yds), 4 pts (40-49 yds), 5 pts (50+ yds). -1 for Misses.", why: "Season Production", source: "nflreadpy (Play-by-Play)" },
  { header: "Dome %", title: "Dome Percentage", desc: "Percentage of kicks attempted in a Dome or Closed Roof stadium.", why: "Environment Safety", source: "nflreadpy (Stadiums)" },
  { header: "FG RZ Trips", title: "FG Red Zone Trips", desc: "Number of drives reaching the 25 yard line that resulted in a Field Goal attempt.", why: "Volume Opportunity", source: "nflreadpy (Play-by-Play)" }
];

export const DEFAULT_SCORING = {
  // Makes
  fg0_19: 3, fg20_29: 3, fg30_39: 3, fg40_49: 4, fg50_59: 5, fg60_plus: 5,
  xp_made: 1,
  
  // Misses (Default to 0 or -1 depending on preference, set to -1 for standard)
  fg_miss_0_19: -1, fg_miss_20_29: -1, fg_miss_30_39: -1, 
  fg_miss_40_49: -1, fg_miss_50_59: -1, fg_miss_60_plus: -1,
  xp_miss: -1
};

// Config for the UI Generator (Grouped for cleaner Settings Tab)
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
  // Kept for legacy support if needed, but SCORING_CONFIG drives the UI now
};