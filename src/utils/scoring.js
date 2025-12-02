export const calcFPts = (p, scoring) => {
  if (!p || !scoring) return 0;
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

    // Misses - Granular (Future Proofing) + General Fallback
    ((p.fg_miss_0_19||0) * scoring.fg_miss_0_19) +
    ((p.fg_miss_20_29||0) * scoring.fg_miss_20_29) +
    ((p.fg_miss_30_39||0) * scoring.fg_miss_30_39) +
    ((p.fg_miss_40_49||0) * scoring.fg_miss_40_49) +
    ((p.fg_miss_50_59||0) * scoring.fg_miss_50_59) +
    ((p.fg_miss_60_plus||0) * scoring.fg_miss_60_plus) +
    
    // Use General Miss if granular not available/applicable
    ((p.fg_miss||0) * scoring.fg_miss) + 
    
    ((p.xp_miss||0) * scoring.xp_miss)
  );
};

export const calcProj = (p, grade) => {
  if (grade === 0) return 0;
  const avgPts = p.fpts_ytd / (p.games || 1);
  const base = avgPts * (grade / 90);
  const scaleFactor = (p.avg_pts && p.avg_pts > 0) ? (avgPts / p.avg_pts) : 1.0;
  const off_cap_scaled = (p.off_cap_val || 0) * scaleFactor;
  const def_cap_scaled = (p.def_cap_val || 0) * scaleFactor;
  const weighted_proj = (base * 0.50) + (off_cap_scaled * 0.30) + (def_cap_scaled * 0.20);
  const proj = weighted_proj > 1.0 ? weighted_proj : base;
  return Math.round(proj); 
};

export const calculateLiveScore = (p, scoring) => {
  // 1. Check for Sleeper Override (Real-time)
  if (p.sleeper_live_score !== undefined && p.sleeper_live_score !== null) {
      return p.sleeper_live_score;
  }

  // 2. Fallback to Python Engine Data
  return (
      ((p.wk_fg_0_19 || 0) * scoring.fg0_19) +
      ((p.wk_fg_20_29 || 0) * scoring.fg20_29) +
      ((p.wk_fg_30_39 || 0) * scoring.fg30_39) +
      ((p.wk_fg_40_49 || 0) * scoring.fg40_49) +
      ((p.wk_fg_50_59 || 0) * scoring.fg50_59) +
      ((p.wk_fg_60_plus || 0) * scoring.fg60_plus) +
      ((p.wk_xp_made || 0) * scoring.xp_made) +
      
      // Granular Misses
      ((p.wk_fg_miss_0_19 || 0) * scoring.fg_miss_0_19) +
      ((p.wk_fg_miss_20_29 || 0) * scoring.fg_miss_20_29) +
      ((p.wk_fg_miss_30_39 || 0) * scoring.fg_miss_30_39) +
      ((p.wk_fg_miss_40_49 || 0) * scoring.fg_miss_40_49) +
      ((p.wk_fg_miss_50_59 || 0) * scoring.fg_miss_50_59) +
      ((p.wk_fg_miss_60_plus || 0) * scoring.fg_miss_60_plus) +
      
      // General Miss Fallback
      ((p.wk_fg_miss || 0) * scoring.fg_miss) +
      
      ((p.wk_xp_miss || 0) * scoring.xp_miss)
  );
};

export const getGameStatus = (gameDtStr) => {
  if (!gameDtStr) return 'UPCOMING';
  try {
      // Force Eastern Time interpretation
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

// --- NEW SLEEPER LIVE FETCH ---
export const fetchSleeperScores = async (leagueId, week) => {
    if (!leagueId || !week) return {};
    try {
        const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
        if (!res.ok) return {};
        const matchups = await res.json();
        
        // Extract points map: { sleeper_player_id: points }
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