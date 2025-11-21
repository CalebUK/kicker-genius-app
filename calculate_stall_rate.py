import nflreadpy as nfl
import pandas as pd
import requests
import json
import warnings
from datetime import datetime
import numpy as np

# Suppress warnings
warnings.simplefilter(action='ignore', category=RuntimeWarning)
warnings.simplefilter(action='ignore', category=FutureWarning)

# --- CONFIGURATION ---
CURRENT_SEASON = 2025

# --- STADIUM COORDINATES ---
STADIUM_COORDS = {
    'ARI': (33.5276, -112.2626), 'ATL': (33.7554, -84.4010), 'BAL': (39.2780, -76.6227),
    'BUF': (42.7738, -78.7870), 'CAR': (35.2258, -80.8528), 'CHI': (41.8623, -87.6167),
    'CIN': (39.0955, -84.5161), 'CLE': (41.5061, -81.6995), 'DAL': (32.7473, -97.0945),
    'DEN': (39.7439, -105.0201), 'DET': (42.3400, -83.0456), 'GB': (44.5013, -88.0622),
    'HOU': (29.6847, -95.4107), 'IND': (39.7601, -86.1639), 'JAX': (30.3240, -81.6373),
    'KC': (39.0489, -94.4839), 'LA': (33.9534, -118.3390), 'LAC': (33.9534, -118.3390),
    'LV': (36.0909, -115.1833), 'MIA': (25.9580, -80.2389), 'MIN': (44.9735, -93.2575),
    'NE': (42.0909, -71.2643), 'NO': (29.9511, -90.0812), 'NYG': (40.8135, -74.0745),
    'NYJ': (40.8135, -74.0745), 'PHI': (39.9008, -75.1675), 'PIT': (40.4468, -80.0158),
    'SEA': (47.5952, -122.3316), 'SF': (37.4023, -121.9690), 'TB': (27.9759, -82.5033),
    'TEN': (36.1665, -86.7713), 'WAS': (38.9076, -76.8645)
}

def get_current_nfl_week():
    try:
        schedule = nfl.load_schedules(seasons=[CURRENT_SEASON])
        if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()
        today = datetime.now().strftime('%Y-%m-%d')
        upcoming = schedule[schedule['gameday'] >= today]
        return int(upcoming['week'].min()) if not upcoming.empty else 18
    except:
        return 1

def get_weather_forecast(home_team, game_dt_str, is_dome=False):
    if is_dome: return 0, "Dome"
    coords = STADIUM_COORDS.get(home_team)
    if not coords: return 0, "Unknown"
    
    lat, lon = coords
    try:
        # FIX: Removed the incorrect markdown link brackets from the URL string
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York"
        data = requests.get(url, timeout=10).json()
        target = game_dt_str.replace(" ", "T")[:13]
        times = data['hourly']['time']
        match_index = -1
        for i, t in enumerate(times):
            if t.startswith(target):
                match_index = i
                break
        
        if match_index == -1: return 0, "No Data"
        
        wind = data['hourly']['wind_speed_10m'][match_index]
        precip = data['hourly']['precipitation_probability'][match_index]
        temp = data['hourly']['temperature_2m'][match_index]
        
        cond = f"{int(wind)}mph"
        if precip > 40: cond += " 🌨️" if temp <= 32 else " 🌧️"
        elif wind > 15: cond += " 🌬️"
        else: cond += " ☀️"
        return wind, cond
    
    # Catch timeout errors specifically
    except requests.exceptions.Timeout:
        return 0, "Timeout"
    except Exception:
        return 0, "API Error"

def run_analysis():
    target_week = get_current_nfl_week()
    print(f"🚀 Starting Analysis for Week {target_week}...")
    
    # Load Data
    pbp = nfl.load_pbp(seasons=[CURRENT_SEASON])
    schedule = nfl.load_schedules(seasons=[CURRENT_SEASON])
    if hasattr(pbp, "to_pandas"): pbp = pbp.to_pandas()
    if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()

    # --- 1. KICKER STATS ---
    kick_plays = pbp[pbp['play_type'].isin(['field_goal', 'extra_point'])].copy()
    kick_plays = kick_plays.dropna(subset=['kicker_player_name'])
    
    def calc_pts(row):
        if row['play_type'] == 'field_goal':
            return 5 if row['kick_distance'] >= 50 else 4 if row['kick_distance'] >= 40 else 3 if row['field_goal_result'] == 'made' else -1
        return 1 if row['extra_point_result'] == 'good' else -1
    
    kick_plays['fantasy_pts'] = kick_plays.apply(calc_pts, axis=1)
    kick_plays['is_50'] = (kick_plays['kick_distance'] >= 50) & (kick_plays['field_goal_result'] == 'made')
    kick_plays['is_dome'] = kick_plays['roof'].isin(['dome', 'closed'])
    
    # Filter for 25-yard line (True Red Zone)
    rz_drives = pbp[(pbp['yardline_100'] <= 25) & (pbp['yardline_100'].notnull())][['game_id', 'drive', 'posteam']].drop_duplicates()
    rz_counts = rz_drives.groupby('posteam').size().reset_index(name='rz_trips')

    stats = kick_plays.groupby('kicker_player_name').agg(
        team=('posteam', 'last'),
        fpts=('fantasy_pts', 'sum'),
        made=('field_goal_result', lambda x: (x=='made').sum()),
        att=('play_type', lambda x: (x=='field_goal').sum()),
        longs=('is_50', 'sum'),
        dome_kicks=('is_dome', 'sum'),
        total_kicks=('play_id', 'count'),
        games=('game_id', 'nunique')
    ).reset_index()
    
    stats = pd.merge(stats, rz_counts, left_on='team', right_on='posteam', how='left').fillna(0)
    stats['acc'] = (stats['made'] / stats['att'] * 100).round(1)
    stats['dome_pct'] = (stats['dome_kicks'] / stats['total_kicks'] * 100).round(0)
    stats['avg_pts'] = (stats['fpts'] / stats['games']).round(1)

    # Elite Threshold
    qualified = stats[stats['att'] >= 5]
    elite_thresh = qualified['fpts'].quantile(0.80) if not qualified.empty else 100

    # --- 2. STALL METRICS (L4) ---
    max_wk = pbp['week'].max()
    start_wk = max(1, max_wk - 3)
    
    # Get ALL drives inside 25 for Stall Rate
    recent_pbp = pbp[pbp['week'] >= start_wk].copy()
    rz_plays_l4 = recent_pbp[(recent_pbp['yardline_100'] <= 25) & (recent_pbp['yardline_100'].notnull())]
    drives = rz_plays_l4[['game_id', 'drive', 'posteam', 'defteam']].drop_duplicates()
    
    drive_results = []
    for _, row in drives.iterrows():
        d_plays = recent_pbp[(recent_pbp['game_id'] == row['game_id']) & (recent_pbp['drive'] == row['drive'])]
        is_td = (d_plays['touchdown'] == 1).sum() > 0
        is_to = ((d_plays['interception'] == 1).sum() > 0) or ((d_plays['fumble_lost'] == 1).sum() > 0)
        drive_results.append({'posteam': row['posteam'], 'defteam': row['defteam'], 'stalled': (not is_td and not is_to)})
        
    df_drives = pd.DataFrame(drive_results)
    
    # Calculate Rates
    off_stall = df_drives.groupby('posteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'off_stall_rate'})
    def_stall = df_drives.groupby('defteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'def_stall_rate'})
    
    off_stall['off_stall_rate'] = (off_stall['off_stall_rate'] * 100).round(1)
    def_stall['def_stall_rate'] = (def_stall['def_stall_rate'] * 100).round(1)
    
    lg_off_avg = off_stall['off_stall_rate'].mean()
    lg_def_avg = def_stall['def_stall_rate'].mean()

    # Points per Game (L4)
    completed = schedule[(schedule['week'] >= start_wk) & (schedule['home_score'].notnull())].copy()
    home_scores = completed[['home_team', 'home_score']].rename(columns={'home_team': 'team', 'home_score': 'pts'})
    away_scores = completed[['away_team', 'away_score']].rename(columns={'away_team': 'team', 'away_score': 'pts'})
    
    # Offense Scoring
    all_scores = pd.concat([home_scores, away_scores])
    off_ppg = all_scores.groupby('team')['pts'].mean().reset_index().rename(columns={'pts': 'off_ppg'})
    
    # Defense Allowed
    home_allowed = completed[['home_team', 'away_score']].rename(columns={'home_team': 'team', 'away_score': 'pts_allowed'})
    away_allowed = completed[['away_team', 'home_score']].rename(columns={'away_team': 'team', 'home_score': 'pts_allowed'})
    all_allowed = pd.concat([home_allowed, away_allowed])
    
    # RENAME HERE to prevent collision later
    def_pa = all_allowed.groupby('team')['pts_allowed'].mean().reset_index().rename(columns={'pts_allowed': 'def_pa', 'team': 'opponent'})

    # Kicker Share (L4)
    l4_kick_plays = kick_plays[kick_plays['game_id'].isin(completed['game_id'])].copy()
    kicker_game_pts = l4_kick_plays.groupby(['game_id', 'posteam'])['fantasy_pts'].sum().reset_index()
    
    home_g = completed[['game_id', 'home_team', 'home_score']].rename(columns={'home_team': 'team', 'home_score': 'total'})
    away_g = completed[['game_id', 'away_team', 'away_score']].rename(columns={'away_team': 'team', 'away_score': 'total'})
    all_g = pd.concat([home_g, away_g])
    
    share_df = pd.merge(all_g, kicker_game_pts, left_on=['game_id', 'team'], right_on=['game_id', 'posteam'], how='left').fillna(0)
    share_df['share'] = share_df.apply(lambda x: x['fantasy_pts'] / x['total'] if x['total'] > 0 else 0, axis=1)
    
    off_share = share_df.groupby('team')['share'].mean().reset_index().rename(columns={'share': 'off_share'})
    
    matchup_lookup = schedule[['game_id', 'home_team', 'away_team']]
    share_df = pd.merge(share_df, matchup_lookup, on='game_id')
    share_df['opponent'] = share_df.apply(lambda x: x['away_team'] if x['team'] == x['home_team'] else x['home_team'], axis=1)
    def_share = share_df.groupby('opponent')['share'].mean().reset_index().rename(columns={'share': 'def_share'})

    # --- 3. MATCHUP ENGINE ---
    matchups = schedule[schedule['week'] == target_week][['home_team', 'away_team', 'roof', 'gameday', 'gametime', 'spread_line', 'total_line']].copy()
    matchups['game_dt'] = matchups['gameday'] + ' ' + matchups['gametime']
    matchups['total_line'] = matchups['total_line'].fillna(44.0)
    matchups['spread_line'] = matchups['spread_line'].fillna(0.0)
    matchups['home_imp'] = (matchups['total_line'] - matchups['spread_line'])/2
    matchups['away_imp'] = (matchups['total_line'] + matchups['spread_line'])/2
    
    home = matchups.rename(columns={'home_team': 'team', 'away_team': 'opponent', 'home_imp': 'vegas'})
    home['is_home'] = True
    away = matchups.rename(columns={'away_team': 'team', 'home_team': 'opponent', 'away_imp': 'vegas'})
    away['is_home'] = False
    
    model = pd.concat([home, away])
    model['home_field'] = model.apply(lambda x: x['team'] if x['is_home'] else x['opponent'], axis=1)
    model['is_dome'] = model['roof'].isin(['dome', 'closed'])
    
    print("🌤️ Fetching Weather...")
    
    model['weather_data'] = model.apply(lambda x: get_weather_forecast(x['home_field'], x['game_dt'], x['is_dome']), axis=1)
    model['wind'] = model['weather_data'].apply(lambda x: x[0])
    model['weather_desc'] = model['weather_data'].apply(lambda x: x[1])

    # Merge All Stats
    final = pd.merge(stats, model, on='team', how='inner')
    
    final = pd.merge(final, off_stall, left_on='team', right_on='posteam', how='left')
    final = pd.merge(final, off_ppg, on='team', how='left')
    final = pd.merge(final, off_share, on='team', how='left')
    
    final = pd.merge(final, def_stall, left_on='opponent', right_on='defteam', how='left')
    final = pd.merge(final, def_pa, on='opponent', how='left')
    final = pd.merge(final, def_share, on='opponent', how='left')
    
    final = final.fillna(0)

    # --- 4. CALCULATION ENGINE ---
    def process_row(row):
        # A. Grade Calculation
        off_score = (row['off_stall_rate'] / lg_off_avg * 40) if lg_off_avg else 40
        def_score = (row['def_stall_rate'] / lg_def_avg * 40) if lg_def_avg else 40
        
        bonuses = []
        bonus_val = 0
        
        if row['is_dome']: 
            bonus_val += 10; bonuses.append("+10 Dome")
        else:
            wind = row['wind']
            weather_desc = row['weather_desc']
            if wind > 15: bonus_val -= 10; bonuses.append("-10 Heavy Wind")
            elif wind > 10: bonus_val -= 5; bonuses.append("-5 Wind")
            if "🌨️" in weather_desc: bonus_val -= 10; bonuses.append("-10 Snow")
            elif "🌧️" in weather_desc: bonus_val -= 5; bonuses.append("-5 Rain")
            
        if row['home_field'] == 'DEN': bonus_val += 5; bonuses.append("+5 Mile High")
        if abs(row['spread_line']) < 3.5: bonus_val += 5; bonuses.append("+5 Tight Game")
        if row['fpts'] >= elite_thresh: bonus_val += 5; bonuses.append("+5 Elite Talent")
        
        grade = round(off_score + def_score + bonus_val, 1)
        
        # B. Projection Calculation
        base_proj = row['avg_pts'] * (grade / 90)
        
        # Weighted Scores
        w_team_score = (row['vegas'] * 0.7) + (row['off_ppg'] * 0.3) if row['vegas'] > 0 else row['off_ppg']
        w_def_allowed = (row['vegas'] * 0.7) + (row['def_pa'] * 0.3) if row['vegas'] > 0 else row['def_pa']
        
        # Caps
        s_off = min(row['off_share'] if row['off_share'] > 0 else 0.45, 0.80)
        off_cap = w_team_score * (s_off * 1.2)
        
        s_def = min(row['def_share'] if row['def_share'] > 0 else 0.45, 0.80)
        def_cap = w_def_allowed * (s_def * 1.2)
        
        # Final Weighted Projection
        weighted_proj = (base_proj * 0.50) + (off_cap * 0.30) + (def_cap * 0.20)
        proj = round(weighted_proj, 1) if weighted_proj > 1.0 else round(base_proj, 1)
        
        return pd.Series({
            'grade': grade,
            'proj': proj,
            'grade_details': bonuses,
            'off_score_val': round(off_score, 1),
            'def_score_val': round(def_score, 1),
            'w_team_score': round(w_team_score, 1),
            'w_def_allowed': round(w_def_allowed, 1),
            'off_cap_val': round(off_cap, 1),
            'def_cap_val': round(def_cap, 1)
        })

    final = final.join(final.apply(process_row, axis=1))
    
    # Sort
    final = final.sort_values('proj', ascending=False)
    ytd_sorted = stats.sort_values('fpts', ascending=False)

    # --- EXPORT ---
    output = {
        "meta": {
            "week": int(target_week),
            "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "league_avgs": {
                "fpts": round(stats['fpts'].mean(), 1),
                "off_stall": round(lg_off_avg, 1),
                "def_stall": round(lg_def_avg, 1),
                "l4_off_ppg": round(off_ppg['off_ppg'].mean(), 1),
                "l4_def_pa": round(def_pa['def_pa'].mean(), 1)
            }
        },
        "rankings": final.head(30).to_dict(orient='records'),
        "ytd": ytd_sorted.head(30).to_dict(orient='records')
    }
    
    with open("public/kicker_data.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Success! Data saved to public/kicker_data.json")

if __name__ == "__main__":
    run_analysis()
```

The action is stuck because of a simple syntax issue in the weather URL. I have corrected the URL in `calculate_stall_rate.py` and provided the corrected version above.

You are experiencing a hang because the Python script cannot resolve the API URL (due to the bad markdown link syntax) and is stuck inside a failed request that isn't being caught immediately, causing the action to stall.

### The Fix

1.  **Commit the Updated Files:** Please commit the corrected `calculate_stall_rate.py` and the corrected `daily_update.yml` (from my previous response) to GitHub.
    ```bash
    git add .
    git commit -m "Fix: Corrected API URL and fixed GitHub Action syntax for file_pattern."
    git push origin main