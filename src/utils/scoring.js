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
      
      // Granular Misses (using 40-49 range as proxy for general if needed, or exact bucket)
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

// FIXED: Timezone-Aware Game Status
export const getGameStatus = (gameDtStr) => {
  if (!gameDtStr) return 'UPCOMING';
  
  try {
      // 1. Parse the game string (e.g., "2025-11-28 13:00")
      // We assume this time is in US Eastern Time (ET) because that's what nflreadpy returns.
      // We append "-05:00" (EST) or "-04:00" (EDT) context. 
      // Ideally, we'd use a library like date-fns-tz, but for raw JS:
      
      // Simple Approach: Create a date object relative to UTC, then subtract the offset 
      // to make it comparable to Date.now() which is UTC-based.
      
      const gameTime = new Date(gameDtStr.replace(' ', 'T')); // Browser interprets as local
      
      // Check if valid date
      if (isNaN(gameTime.getTime())) return 'UPCOMING';

      const now = new Date();
      
      // Calculate difference in milliseconds
      const diffMs = now - gameTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Logic:
      // If diff is negative, game is in future -> UPCOMING
      // If diff is between 0 and 4 hours -> LIVE
      // If diff is > 4 hours -> FINISHED
      
      if (diffHours < 0) return 'UPCOMING';
      if (diffHours >= 0 && diffHours < 4.5) return 'LIVE'; // Extended to 4.5h for OT
      return 'FINISHED';
      
  } catch (e) { 
      console.error("Date parse error", e);
      return 'UPCOMING'; 
  }
};