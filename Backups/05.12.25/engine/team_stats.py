import pandas as pd
import numpy as np

def calculate_team_stats(schedule_df, current_week, window=4):
    """
    Calculates Offensive PPG (Points Per Game) and Defensive PA (Points Allowed)
    for each team over the last `window` weeks. Used for the main engine logic.
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

def get_weekly_team_stats(schedule_df, current_week):
    """
    Generates a dictionary of weekly stats for every team up to the current week.
    Returns: { "DAL": [{ "week": 1, "pts": 33, "pa": 17, "vegas": 44.5 }, ...], ... }
    """
    if schedule_df.empty:
        return {}
        
    # Filter for all completed games or games with lines up to current week
    # We include current week to show vegas lines even if score isn't final
    games = schedule_df[schedule_df['week'] <= current_week].copy()
    
    team_stats = {}
    
    # Initialize dict for all teams found in schedule
    all_teams = set(games['home_team'].unique()) | set(games['away_team'].unique())
    for team in all_teams:
        if pd.notna(team):
            team_stats[team] = []

    for _, game in games.iterrows():
        wk = int(game['week'])
        home = game['home_team']
        away = game['away_team']
        
        # Vegas Implied Totals
        total = game['total_line'] if pd.notna(game['total_line']) else 0
        spread = game['spread_line'] if pd.notna(game['spread_line']) else 0
        
        # Calculate implied points (approximated based on spread)
        # If spread is -3 for Home, Home is favored by 3.
        # Home Implied = (Total / 2) + (Spread / 2) ? No, spread is usually negative for favorite.
        # Standard formula: Favorite = (Total - Spread)/2 ? No.
        # If Spread is -3 (Home Favored), Home Score > Away Score.
        # Home = (Total - Spread) / 2  -- e.g. (45 - (-3))/2 = 24
        # Away = (Total + Spread) / 2  -- e.g. (45 + (-3))/2 = 21
        # NOTE: nflreadpy spread_line is usually "Home Team Spread". Negative means Home is favorite.
        
        home_implied = (total - spread) / 2
        away_implied = (total + spread) / 2
        
        # Actual Scores (if available)
        home_score = game['home_score'] if pd.notna(game['home_score']) else None
        away_score = game['away_score'] if pd.notna(game['away_score']) else None
        
        # Add Home Record
        if home in team_stats:
            team_stats[home].append({
                "week": wk,
                "pts": home_score,
                "pa": away_score,
                "vegas_implied": round(home_implied, 1),
                "opponent": away,
                "is_home": True
            })
            
        # Add Away Record
        if away in team_stats:
            team_stats[away].append({
                "week": wk,
                "pts": away_score,
                "pa": home_score,
                "vegas_implied": round(away_implied, 1),
                "opponent": home,
                "is_home": False
            })
            
    return team_stats