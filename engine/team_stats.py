import pandas as pd

def calculate_team_stats(schedule_df, current_week, window=4):
    """
    Calculates Offensive PPG (Points Per Game) and Defensive PA (Points Allowed)
    for each team over the last `window` weeks.
    """
    if schedule_df.empty:
        return pd.DataFrame(), pd.DataFrame()

    # Filter for completed games in the window leading up to current week
    # We look at games from (current_week - window) to (current_week - 1)
    start_week = max(1, current_week - window)
    completed = schedule_df[
        (schedule_df['week'] >= start_week) & 
        (schedule_df['week'] < current_week) & 
        (schedule_df['home_score'].notnull())
    ].copy()

    if completed.empty:
        # Return empty dataframes with correct columns if no data
        return pd.DataFrame(columns=['team', 'off_ppg']), pd.DataFrame(columns=['team', 'def_pa'])

    # 1. Calculate Offensive Points (PPG)
    # We need to stack home and away scores to get a single list of (Team, Points Scored)
    home_scores = completed[['home_team', 'home_score']].rename(columns={'home_team': 'team', 'home_score': 'pts'})
    away_scores = completed[['away_team', 'away_score']].rename(columns={'away_team': 'team', 'away_score': 'pts'})
    all_scores = pd.concat([home_scores, away_scores])
    
    off_ppg = all_scores.groupby('team')['pts'].mean().reset_index().rename(columns={'pts': 'off_ppg'})
    off_ppg['off_ppg'] = off_ppg['off_ppg'].round(1)

    # 2. Calculate Defensive Points Allowed (PA)
    # We need to stack home (allowed away score) and away (allowed home score)
    home_allowed = completed[['home_team', 'away_score']].rename(columns={'home_team': 'team', 'away_score': 'pts_allowed'})
    away_allowed = completed[['away_team', 'home_score']].rename(columns={'away_team': 'team', 'home_score': 'pts_allowed'})
    all_allowed = pd.concat([home_allowed, away_allowed])
    
    def_pa = all_allowed.groupby('team')['pts_allowed'].mean().reset_index().rename(columns={'pts_allowed': 'def_pa'})
    def_pa['def_pa'] = def_pa['def_pa'].round(1)

    return off_ppg, def_pa