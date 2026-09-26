export const calcFPts = (p, scoring) => {
  if (!p || !scoring) return 0;
  
  // Calculate Granular Miss Penalty
  const granularMissPenalty = 
    ((p.fg_miss_0_19||0) * scoring.fg_miss_0_19) +
    ((p.fg_miss_20_29||0) * scoring.fg_miss_20_29) +
    ((p.fg_miss_30_39||0) * scoring.fg_miss_30_39) +
    ((p.fg_miss_40_49||0) * scoring.fg_miss_40_49) +
    ((p.fg_miss_50_59||0) * scoring.fg_miss_50_59) +
    ((p.fg_miss_60_plus||0) * scoring.fg_miss_60_plus);
    
  // Calculate General Penalty (Fallback)
  // Only use general penalty if granular data is missing (0) but total misses exist
  const totalMisses = p.fg_miss || 0;
  const hasGranularData = (
      (p.fg_miss_0_19||0) + (p.fg_miss_20_29||0) + (p.fg_miss_30_39||0) + 
      (p.fg_miss_40_49||0) + (p.fg_miss_50_59||0) + (p.fg_miss_60_plus||0)
  ) > 0;

  const missPenalty = hasGranularData ? granularMissPenalty : (totalMisses * scoring.fg_miss);

  return (
    // Makes
    ((p.fg_0_19||0) * scoring.fg0_19) + 
    ((p.fg_20_29||0) * scoring.fg20_29) + 
    ((p.fg_30_39||0) * scoring.fg30_39) + 
    ((p.fg_40_49||0) * scoring.fg40_49) + 
    ((p.fg_50_59||0) * scoring.fg50_59) + 
    ((p.fg_60_plus||0) * scoring.fg60_plus) + 
    
    // XP
    ((p.xp_made||0) * scoring.xp_made) + 
    ((p.xp_miss||0) * scoring.xp_miss) +

    // Smart Miss Penalty
    missPenalty
  );
};

// Real NFL points from a kick-bucket row: 3 per FG made + 1 per XP made.
export const calcRealPts = (p) => 3 * (p.fg_made || 0) + (p.xp_made || 0);

// A projection_results_weekly row's actual kicks that week (wk_*) as a plain
// bucket row, so calcFPts can score it.
export const weekKicks = (r) => ({
  fg_made: r.wk_fg_made, fg_miss: r.wk_fg_miss, xp_made: r.wk_xp_made, xp_miss: r.wk_xp_miss,
  fg_0_19: r.wk_fg_0_19, fg_20_29: r.wk_fg_20_29, fg_30_39: r.wk_fg_30_39,
  fg_40_49: r.wk_fg_40_49, fg_50_59: r.wk_fg_50_59, fg_60_plus: r.wk_fg_60_plus,
  fg_miss_0_19: r.wk_fg_miss_0_19, fg_miss_20_29: r.wk_fg_miss_20_29, fg_miss_30_39: r.wk_fg_miss_30_39,
  fg_miss_40_49: r.wk_fg_miss_40_49, fg_miss_50_59: r.wk_fg_miss_50_59, fg_miss_60_plus: r.wk_fg_miss_60_plus,
});

/**
 * The 50/30/20 projection in the USER's scoring -- MODEL_SPEC.md §2.
 * `p` is a matchup_inputs_weekly or historical_projections row: the database's
 * scoring-independent ingredients (multiplier, real-point offense/defense) plus
 * season-to-date kick buckets. `w` is 'l3' | 'l5'. `settings` = model_settings.
 *   Base    = season avg fantasy pts x multiplier
 *   Offense = expected team pts x real-point share x fantasy/real ratio
 *   Defense = expected opp pts allowed x real-point share x fantasy/real ratio
 */
export const calcProjection = (p, w, scoring, settings) => {
  const fptsSeason = calcFPts(p, scoring);
  const realSeason = calcRealPts(p);
  const games = Number(p.games_played) || 0;
  const avg = games > 0 ? fptsSeason / games : 0;
  const ratio = realSeason > 0 ? fptsSeason / realSeason : 1;   // replaces the old flat x1.2
  const mult = Number(p[`multiplier_${w}`]) || 0;
  const base = avg * mult;
  const off = (Number(p[`off_real_pts_${w}`]) || 0) * ratio;
  const def = (Number(p[`def_real_pts_${w}`]) || 0) * ratio;
  const wb = Number(settings?.weight_base ?? 0.5);
  const wo = Number(settings?.weight_offense ?? 0.3);
  const wd = Number(settings?.weight_defense ?? 0.2);
  const raw = wb * base + wo * off + wd * def;
  return { proj: Math.round(raw), raw, avg, ratio, mult, base, off, def, fptsSeason, wb, wo, wd };
};

export const calculateLiveScore = (p, scoring) => {
  // 1. Check for Sleeper Override (Real-time)
  if (p.sleeper_live_score !== undefined && p.sleeper_live_score !== null) {
      return p.sleeper_live_score;
  }

  // 2. Fallback to Python Engine Data
  
  // Calculate Granular Miss Penalty
  const granularMissPenalty = 
    ((p.wk_fg_miss_0_19||0) * scoring.fg_miss_0_19) +
    ((p.wk_fg_miss_20_29||0) * scoring.fg_miss_20_29) +
    ((p.wk_fg_miss_30_39||0) * scoring.fg_miss_30_39) +
    ((p.wk_fg_miss_40_49||0) * scoring.fg_miss_40_49) +
    ((p.wk_fg_miss_50_59||0) * scoring.fg_miss_50_59) +
    ((p.wk_fg_miss_60_plus||0) * scoring.fg_miss_60_plus);

  // Calculate General Penalty (Fallback)
  const totalMisses = p.wk_fg_miss || 0;
  const hasGranularData = (
      (p.wk_fg_miss_0_19||0) + (p.wk_fg_miss_20_29||0) + (p.wk_fg_miss_30_39||0) + 
      (p.wk_fg_miss_40_49||0) + (p.wk_fg_miss_50_59||0) + (p.wk_fg_miss_60_plus||0)
  ) > 0;

  const missPenalty = hasGranularData ? granularMissPenalty : (totalMisses * scoring.fg_miss);

  return (
      // Makes
      ((p.wk_fg_0_19 || 0) * scoring.fg0_19) +
      ((p.wk_fg_20_29 || 0) * scoring.fg20_29) +
      ((p.wk_fg_30_39 || 0) * scoring.fg30_39) +
      ((p.wk_fg_40_49 || 0) * scoring.fg40_49) +
      ((p.wk_fg_50_59 || 0) * scoring.fg50_59) +
      ((p.wk_fg_60_plus || 0) * scoring.fg60_plus) +
      
      // XP
      ((p.wk_xp_made || 0) * scoring.xp_made) +
      ((p.wk_xp_miss || 0) * scoring.xp_miss) +
      
      // Miss Penalty (Smart Logic)
      missPenalty
  );
};

export const getGameStatus = (gameDtStr) => {
  if (!gameDtStr) return 'UPCOMING';
  try {
      const gameDate = new Date(`${gameDtStr.replace(' ', 'T')}-05:00`);
      if (isNaN(gameDate.getTime())) return 'UPCOMING';

      const now = new Date();
      const diffMs = now - gameDate;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 0) return 'UPCOMING';
      if (diffHours >= 0 && diffHours < 4.5) return 'LIVE'; 
      return 'FINISHED';
  } catch (e) { return 'UPCOMING'; }
};

// --- SLEEPER LIVE FETCH ---
export const fetchSleeperScores = async (leagueId, week) => {
    if (!leagueId || !week) return {};
    try {
        const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
        if (!res.ok) return {};
        const matchups = await res.json();
        
        const scores = {};
        matchups.forEach(m => {
            if (m.players_points) {
                Object.assign(scores, m.players_points);
            }
        });
        return scores;
    } catch (e) {
        console.error("Sleeper Fetch Error", e);
        return {};
    }
};