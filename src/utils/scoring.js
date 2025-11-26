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
  return (
      ((p.wk_fg_0_19 || 0) * scoring.fg0_19) +
      ((p.wk_fg_20_29 || 0) * scoring.fg20_29) +
      ((p.wk_fg_30_39 || 0) * scoring.fg30_39) +
      ((p.wk_fg_40_49 || 0) * scoring.fg40_49) +
      ((p.wk_fg_50_59 || 0) * scoring.fg50_59) +
      ((p.wk_fg_60_plus || 0) * scoring.fg60_plus) +
      ((p.wk_xp_made || 0) * scoring.xp_made) +
      
      // Granular Misses (Future Proof)
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
      const gameTime = new Date(gameDtStr.replace(' ', 'T'));
      const now = new Date();
      const diffHours = (now - gameTime) / (1000 * 60 * 60);
      
      if (diffHours < 0) return 'UPCOMING';
      if (diffHours >= 0 && diffHours < 4) return 'LIVE';
      return 'FINISHED';
  } catch (e) { return 'UPCOMING'; }
};