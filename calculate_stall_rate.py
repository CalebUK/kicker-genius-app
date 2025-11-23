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
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York"
        data = requests.get(url, timeout=5).json()
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
    except:
        return 0, "API Error"

def scrape_cbs_injuries():
    print("   🌐 Scraping CBS Sports for live injury data...")
    url = "https://www.cbssports.com/nfl/injuries/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers)
        dfs = pd.read_html(response.text)
        if not dfs: return pd.DataFrame()
        combined = pd.concat(dfs, ignore_index=True)
        combined.columns = [c.lower().strip() for c in combined.columns]
        col_map = {}
        for col in combined.columns:
            if 'player' in col: col_map[col] = 'full_name'
            elif 'status' in col: col_map[col] = 'report_status'
            elif 'injury' in col: col_map[col] = 'practice_status'
        combined.rename(columns=col_map, inplace=True)
        
        if 'full_name' not in combined.columns: return pd.DataFrame()
        if 'report_status' not in combined.columns: combined['report_status'] = 'Questionable'
        if 'practice_status' not in combined.columns: combined['practice_status'] = 'Unknown'

        def clean_name(val):
            if not isinstance(val, str): return val
            return val.split(' (')[0].strip()
        combined['full_name'] = combined['full_name'].apply(clean_name)
        combined['gsis_id'] = None 
        return combined[['full_name', 'report_status', 'practice_status']]
    except Exception as e:
        print(f"   ⚠️ Scraping failed: {e}")
        return pd.DataFrame()

def scrape_fantasy_ownership():
    print("   🌐 Scraping FantasyPros (Stats Page) for Ownership data...")
    url = "https://www.fantasypros.com/nfl/stats/k.php"
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
    try:
        response = requests.get(url, headers=headers, timeout=15)
        dfs = pd.read_html(response.text)
        if not dfs: return pd.DataFrame()
        df = dfs[0].copy()
        df.columns = [str(c).lower() for c in df.columns]
        player_col = next((c for c in df.columns if 'player' in c), None)
        rost_col = next((c for c in df.columns if 'rost' in c or 'own' in c), None)
        if not player_col or not rost_col: return pd.DataFrame()
        df = df[[player_col, rost_col]].rename(columns={player_col: 'full_name', rost_col: 'own_pct'})
        def clean_name_to_match(val):
            if not isinstance(val, str): return val
            name_part = val.split('(')[0].strip()
            parts = name_part.split(' ')
            if len(parts) >= 2: return f"{parts[0][0]}.{parts[1]}"
            return name_part
        df['match_name'] = df['full_name'].apply(clean_name_to_match)
        def clean_pct(val):
            if not isinstance(val, str): return 0.0 if not isinstance(val, (int, float)) else float(val)
            return float(val.replace('%', '').strip())
        df['own_pct'] = df['own_pct'].apply(clean_pct)
        return df[['match_name', 'own_pct']]
    except Exception:
        return pd.DataFrame()

def load_injury_data_safe(season, target_week):
    print("🏥 Fetching Injury Data...")
    try:
        injuries = nfl.load_injuries(seasons=[season])
        if hasattr(injuries, "to_pandas"): injuries = injuries.to_pandas()
        return injuries[injuries['week'] == target_week][['gsis_id', 'report_status', 'practice_status']].copy()
    except Exception: pass
    try:
        url = f"https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{season}.csv"
        injuries = pd.read_csv(url)
        return injuries[injuries['week'] == target_week][['gsis_id', 'report_status', 'practice_status']].copy()
    except Exception: pass
    scraped = scrape_cbs_injuries()
    if not scraped.empty: return scraped
    return pd.DataFrame(columns=['gsis_id', 'report_status', 'practice_status', 'full_name'])

def clean_nan(val):
    if isinstance(val, float):
        if pd.isna(val) or np.isinf(val): return None
    return val

def run_analysis():
    target_week = get_current_nfl_week()
    print(f"🚀 Starting Analysis for Week {target_week}...")
    
    pbp = nfl.load_pbp(seasons=[CURRENT_SEASON])
    schedule = nfl.load_schedules(seasons=[CURRENT_SEASON])
    players = nfl.load_players()
    injury_report = load_injury_data_safe(CURRENT_SEASON, target_week)
    ownership_data = scrape_fantasy_ownership()

    try:
        rosters = nfl.load_rosters(seasons=[CURRENT_SEASON])
        if hasattr(rosters, "to_pandas"): rosters = rosters.to_pandas()
        if rosters.empty:
             rosters = nfl.load_rosters(seasons=[CURRENT_SEASON-1])
             if hasattr(rosters, "to_pandas"): rosters = rosters.to_pandas()
        inactive_codes = ['RES', 'NON', 'SUS', 'PUP', 'WAIVED', 'REL', 'CUT', 'RET', 'DEV']
        inactive_roster = rosters[rosters['status'].isin(inactive_codes)][['gsis_id', 'status']].copy()
        inactive_roster.rename(columns={'status': 'roster_status', 'gsis_id': 'kicker_player_id'}, inplace=True)
    except Exception:
        inactive_roster = pd.DataFrame(columns=['kicker_player_id', 'roster_status'])

    if hasattr(pbp, "to_pandas"): pbp = pbp.to_pandas()
    if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()
    if hasattr(players, "to_pandas"): players = players.to_pandas()

    # --- RAW STATS AGGREGATION ---
    kick_plays = pbp[pbp['play_type'].isin(['field_goal', 'extra_point'])].copy()
    kick_plays = kick_plays.dropna(subset=['kicker_player_name'])
    
    kick_plays['is_fg'] = kick_plays['play_type'] == 'field_goal'
    kick_plays['is_xp'] = kick_plays['play_type'] == 'extra_point'
    kick_plays['made'] = ((kick_plays['is_fg'] & (kick_plays['field_goal_result'] == 'made')) | 
                          (kick_plays['is_xp'] & (kick_plays['extra_point_result'] == 'good')))
    
    kick_plays['fg_0_19'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'] < 20)
    kick_plays['fg_20_29'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'].between(20, 29))
    kick_plays['fg_30_39'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'].between(30, 39))
    kick_plays['fg_40_49'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'].between(40, 49))
    kick_plays['fg_50_59'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'].between(50, 59))
    kick_plays['fg_60_plus'] = (kick_plays['is_fg']) & (kick_plays['made']) & (kick_plays['kick_distance'] >= 60)
    
    kick_plays['fg_miss'] = (kick_plays['is_fg']) & (~kick_plays['made'])
    kick_plays['xp_made'] = (kick_plays['is_xp']) & (kick_plays['made'])
    kick_plays['xp_miss'] = (kick_plays['is_xp']) & (~kick_plays['made'])
    kick_plays['real_pts'] = (kick_plays['is_fg'] & kick_plays['made']) * 3 + (kick_plays['is_xp'] & kick_plays['made']) * 1
    
    kick_plays['is_dome'] = kick_plays['roof'].isin(['dome', 'closed'])
    
    rz_drives = pbp[(pbp['yardline_100'] <= 25) & (pbp['yardline_100'].notnull())][['game_id', 'drive', 'posteam']].drop_duplicates()
    rz_counts = rz_drives.groupby('posteam').size().reset_index(name='rz_trips')

    stats = kick_plays.groupby(['kicker_player_name', 'kicker_player_id']).agg(
        team=('posteam', 'last'),
        fg_made=('is_fg', lambda x: (x & kick_plays.loc[x.index, 'made']).sum()),
        fg_att=('is_fg', 'sum'),
        fg_0_19=('fg_0_19', 'sum'),
        fg_20_29=('fg_20_29', 'sum'),
        fg_30_39=('fg_30_39', 'sum'),
        fg_40_49=('fg_40_49', 'sum'),
        fg_50_59=('fg_50_59', 'sum'),
        fg_60_plus=('fg_60_plus', 'sum'),
        fg_miss=('fg_miss', 'sum'),
        xp_made=('xp_made', 'sum'),
        xp_miss=('xp_miss', 'sum'),
        real_pts=('real_pts', 'sum'),
        dome_kicks=('is_dome', 'sum'),
        total_kicks=('play_id', 'count'),
        games=('game_id', 'nunique')
    ).reset_index()
    
    stats = pd.merge(stats, rz_counts, left_on='team', right_on='posteam', how='left').fillna(0)
    stats['acc'] = (stats['fg_made'] / stats['fg_att'] * 100).round(1)
    stats['dome_pct'] = (stats['dome_kicks'] / stats['total_kicks'] * 100).round(0)
    stats['fpts'] = (stats['fg_0_19']*3 + stats['fg_20_29']*3 + stats['fg_30_39']*3 + 
                     stats['fg_40_49']*4 + stats['fg_50_59']*5 + stats['fg_60_plus']*5 + 
                     stats['xp_made']*1 - stats['fg_miss']*1 - stats['xp_miss']*1)
    stats['avg_pts'] = (stats['fpts'] / stats['games']).round(1)

    headshot_col = 'headshot_url' if 'headshot_url' in players.columns else 'headshot' if 'headshot' in players.columns else None
    if headshot_col:
        player_map = players[['gsis_id', headshot_col]].rename(columns={'gsis_id': 'kicker_player_id', headshot_col: 'headshot_url'})
        stats = pd.merge(stats, player_map, on='kicker_player_id', how='left')
    else:
        stats['headshot_url'] = None
    stats['headshot_url'] = stats['headshot_url'].fillna("https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png")
    
    if not ownership_data.empty:
        stats = pd.merge(stats, ownership_data, left_on='kicker_player_name', right_on='match_name', how='left')
        stats['own_pct'] = stats['own_pct'].fillna(0.0)
    else:
        stats['own_pct'] = 0.0

    if 'full_name' in injury_report.columns:
        name_map = players[['gsis_id', 'display_name']].rename(columns={'gsis_id': 'kicker_player_id', 'display_name': 'full_name_official'})
        stats = pd.merge(stats, name_map, on='kicker_player_id', how='left')
        injury_report = injury_report.rename(columns={'full_name': 'full_name_official'})
        injury_report = injury_report.drop_duplicates(subset=['full_name_official'])
        stats = pd.merge(stats, injury_report, on='full_name_official', how='left')
    elif 'gsis_id' in injury_report.columns:
        injury_report = injury_report.rename(columns={'gsis_id': 'kicker_player_id'})
        stats = pd.merge(stats, injury_report, on='kicker_player_id', how='left')
    else:
        stats['report_status'] = None
        stats['practice_status'] = None

    stats = pd.merge(stats, inactive_roster, on='kicker_player_id', how='left')
    
    def get_injury_meta(row):
        roster_st = str(row['roster_status']) if pd.notna(row['roster_status']) else ""
        if roster_st in ['RES', 'NON', 'SUS', 'PUP']: return "OUT", "red-700", f"Roster: {roster_st}"
        if roster_st in ['WAIVED', 'REL', 'CUT', 'RET']: return "CUT", "red-700", "Released"
        if roster_st == 'DEV': return "Practice Squad", "yellow-500", "Roster: Practice Squad"

        report_st = row['report_status']
        practice = row['practice_status']
        if pd.isna(report_st):
            if roster_st and roster_st != 'ACT' and roster_st != 'nan': return roster_st, "gray-400", f"Roster: {roster_st}"
            return "Healthy", "green", "Active"
        
        report_st = str(report_st).title()
        if "Out" in report_st or "Ir" in report_st: return "OUT", "red-700", f"{report_st} ({practice})"
        elif "Doubtful" in report_st: return "Doubtful", "red-400", f"{report_st} ({practice})"
        elif "Questionable" in report_st: return "Questionable", "yellow-500", f"{report_st} ({practice})"
        else: return "Healthy", "green", "Active"

    injury_meta = stats.apply(get_injury_meta, axis=1)
    stats['injury_status'] = [x[0] for x in injury_meta]
    stats['injury_color'] = [x[1] for x in injury_meta]
    stats['injury_details'] = [x[2] for x in injury_meta]

    qualified = stats[stats['fg_att'] >= 5]
    elite_thresh = qualified['fpts'].quantile(0.80) if not qualified.empty else 100

    # --- 2. STALL METRICS (L4) ---
    max_wk = pbp['week'].max()
    start_wk = max(1, max_wk - 3)
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
    off_stall = df_drives.groupby('posteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'off_stall_rate'})
    def_stall = df_drives.groupby('defteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'def_stall_rate'})
    off_stall['off_stall_rate'] = (off_stall['off_stall_rate'] * 100).round(1)
    def_stall['def_stall_rate'] = (def_stall['def_stall_rate'] * 100).round(1)
    lg_off_avg = off_stall['off_stall_rate'].mean()
    lg_def_avg = def_stall['def_stall_rate'].mean()

    fourth_downs = recent_pbp[(recent_pbp['down'] == 4) & (recent_pbp['yardline_100'] <= 30)].copy()
    fourth_downs['is_go'] = fourth_downs['play_type'].isin(['pass', 'run'])
    aggression_stats = fourth_downs.groupby('posteam').agg(total_4th_opps=('play_id', 'count'), total_go_attempts=('is_go', 'sum')).reset_index()
    aggression_stats['aggression_pct'] = (aggression_stats['total_go_attempts'] / aggression_stats['total_4th_opps'] * 100).round(1)

    # Scoring & Share (L4)
    completed = schedule[(schedule['week'] >= start_wk) & (schedule['home_score'].notnull())].copy()
    home_scores = completed[['home_team', 'home_score']].rename(columns={'home_team': 'team', 'home_score': 'pts'})
    away_scores = completed[['away_team', 'away_score']].rename(columns={'away_team': 'team', 'away_score': 'pts'})
    all_scores = pd.concat([home_scores, away_scores])
    off_ppg = all_scores.groupby('team')['pts'].mean().reset_index().rename(columns={'pts': 'off_ppg'})
    
    home_allowed = completed[['home_team', 'away_score']].rename(columns={'home_team': 'team', 'away_score': 'pts_allowed'})
    away_allowed = completed[['away_team', 'home_score']].rename(columns={'away_team': 'team', 'home_score': 'pts_allowed'})
    all_allowed = pd.concat([home_allowed, away_allowed])
    def_pa = all_allowed.groupby('team')['pts_allowed'].mean().reset_index().rename(columns={'pts_allowed': 'def_pa', 'team': 'opponent'})

    l4_kick_plays = kick_plays[kick_plays['game_id'].isin(completed['game_id'])].copy()
    kicker_game_pts = l4_kick_plays.groupby(['game_id', 'posteam'])['real_pts'].sum().reset_index()
    kicker_game_pts.rename(columns={'real_pts': 'kicker_pts'}, inplace=True)
    home_g = completed[['game_id', 'home_team', 'home_score']].rename(columns={'home_team': 'team', 'home_score': 'total'})
    away_g = completed[['game_id', 'away_team', 'away_score']].rename(columns={'away_team': 'team', 'away_score': 'total'})
    all_g = pd.concat([home_g, away_g])
    share_df = pd.merge(all_g, kicker_game_pts, left_on=['game_id', 'team'], right_on=['game_id', 'posteam'], how='left').fillna(0)
    share_df['share'] = share_df.apply(lambda x: x['kicker_pts'] / x['total'] if x['total'] > 0 else 0, axis=1)
    off_share = share_df.groupby('team')['share'].mean().reset_index().rename(columns={'share': 'off_share'})
    matchup_lookup = schedule[['game_id', 'home_team', 'away_team']]
    share_df = pd.merge(share_df, matchup_lookup, on='game_id')
    share_df['opponent'] = share_df.apply(lambda x: x['away_team'] if x['team'] == x['home_team'] else x['home_team'], axis=1)
    def_share = share_df.groupby('opponent')['share'].mean().reset_index().rename(columns={'share': 'def_share'})

    # MATCHUPS
    matchups = schedule[schedule['week'] == target_week][['home_team', 'away_team', 'roof', 'gameday', 'gametime', 'spread_line', 'total_line']].copy()
    matchups['game_dt'] = matchups['gameday'] + ' ' + matchups['gametime']
    matchups['total_line'] = matchups['total_line'].fillna(44.0)
    matchups['spread_line'] = matchups['spread_line'].fillna(0.0)
    
    # UPDATED VEGAS LOGIC: FLIP THE SPREAD SIGN FOR IMPLIED TOTAL
    home_view = matchups[['home_team', 'away_team', 'roof', 'game_dt', 'total_line', 'spread_line']].copy()
    home_view['home_field'] = home_view['home_team']
    home_view = home_view.rename(columns={'home_team': 'team', 'away_team': 'opponent'})
    # New Formula: (Total + Spread) / 2 for Home
    home_view['vegas_implied'] = (home_view['total_line'] + home_view['spread_line']) / 2
    home_view['is_home'] = True
    home_view['spread_display'] = home_view['spread_line'].apply(lambda x: f"{x:+.1f}" if x > 0 else f"{x:.1f}")

    away_view = matchups[['away_team', 'home_team', 'roof', 'game_dt', 'total_line', 'spread_line']].copy()
    away_view['home_field'] = away_view['home_team']
    away_view = away_view.rename(columns={'away_team': 'team', 'home_team': 'opponent'})
    # New Formula: (Total - Spread) / 2 for Away
    away_view['vegas_implied'] = (away_view['total_line'] - away_view['spread_line']) / 2
    away_view['is_home'] = False
    away_view['spread_display'] = (away_view['spread_line'] * -1).apply(lambda x: f"{x:+.1f}" if x > 0 else f"{x:.1f}")
    
    model = pd.concat([home_view, away_view])
    model['is_dome'] = model['roof'].isin(['dome', 'closed'])
    
    print("🌤️ Fetching Weather...")
    model['weather_data'] = model.apply(lambda x: get_weather_forecast(x['home_field'], x['game_dt'], x['is_dome']), axis=1)
    model['wind'] = model['weather_data'].apply(lambda x: x[0])
    model['weather_desc'] = model['weather_data'].apply(lambda x: x[1])

    final = pd.merge(stats, model, on='team', how='inner')
    final = pd.merge(final, off_stall, left_on='team', right_on='posteam', how='left')
    final = pd.merge(final, off_ppg, on='team', how='left')
    final = pd.merge(final, off_share, on='team', how='left')
    final = pd.merge(final, def_stall, left_on='opponent', right_on='defteam', how='left')
    final = pd.merge(final, def_pa, on='opponent', how='left')
    final = pd.merge(final, def_share, on='opponent', how='left')
    final = pd.merge(final, aggression_stats[['posteam', 'aggression_pct']], left_on='team', right_on='posteam', how='left')
    final = final.fillna(0)

    def process_row(row):
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
        if row['aggression_pct'] > 25.0: bonus_val -= 5; bonuses.append("-5 Aggressive Coach")
        
        grade = round(off_score + def_score + bonus_val, 1)
        
        base_proj = row['avg_pts'] * (grade / 90)
        
        w_team_score = (row['vegas_implied'] * 0.7) + (row['off_ppg'] * 0.3) if row['vegas_implied'] > 0 else row['off_ppg']
        w_def_allowed = (row['vegas_implied'] * 0.7) + (row['def_pa'] * 0.3) if row['vegas_implied'] > 0 else row['def_pa']
        
        s_off = min(row['off_share'] if row['off_share'] > 0 else 0.45, 0.80)
        off_cap = w_team_score * (s_off * 1.2)
        s_def = min(row['def_share'] if row['def_share'] > 0 else 0.45, 0.80)
        def_cap = w_def_allowed * (s_def * 1.2)
        
        final_cap = min(off_cap, def_cap)
        weighted_proj = (base_proj * 0.50) + (off_cap * 0.30) + (def_cap * 0.20)
        proj = round(weighted_proj, 1) if weighted_proj > 1.0 else round(base_proj, 1)
        
        if row['injury_status'] == 'OUT' or row['injury_status'] == 'CUT' or row['injury_status'] == 'Practice Squad':
            proj = 0.0
            grade = 0.0
            bonuses.append(f"⛔ {row['injury_status'].upper()}")

        return pd.Series({
            'grade': grade,
            'proj': proj,
            'grade_details': bonuses,
            'off_score_val': round(off_score, 1),
            'def_score_val': round(def_score, 1),
            'w_team_score': round(w_team_score, 1),
            'w_def_allowed': round(w_def_allowed, 1),
            'off_cap_val': round(off_cap, 1),
            'def_cap_val': round(def_cap, 1),
            'details_vegas_total': round(row['total_line'], 1),
            'details_vegas_spread': row['spread_display']
        })

    final = final.join(final.apply(process_row, axis=1))
    final = final.sort_values('proj', ascending=False)
    final = final.replace({np.nan: None})
    ytd_sorted = stats.sort_values('fpts', ascending=False).replace({np.nan: None})
    injuries_list = stats[stats['injury_status'] != 'Healthy'].sort_values('fpts', ascending=False).replace({np.nan: None})

    # Aubrey Check
    aubrey = final[final['kicker_player_name'].str.contains("Aubrey", na=False)]
    if not aubrey.empty:
        r = aubrey.iloc[0]
        print("\n🤠 AUBREY DEEP DIVE:")
        print(f"   • Vegas Total: {r['details_vegas_total']}, Spread: {r['details_vegas_spread']}")
        print(f"   • Implied Team Score (Vegas): {r['vegas_implied']:.1f}")
        print(f"   • Grade: {r['grade']} (Multiplier: {r['grade']/90:.2f})")

    output = {
        "meta": {
            "week": int(target_week),
            "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "league_avgs": {
                "fpts": clean_nan(round(stats['fpts'].mean(), 1)),
                "off_stall": clean_nan(round(lg_off_avg, 1)),
                "def_stall": clean_nan(round(lg_def_avg, 1)),
                "l4_off_ppg": clean_nan(round(off_ppg['off_ppg'].mean(), 1)),
                "l4_def_pa": clean_nan(round(def_pa['def_pa'].mean(), 1))
            }
        },
        "rankings": final.to_dict(orient='records'),
        "ytd": ytd_sorted.to_dict(orient='records'),
        "injuries": injuries_list.to_dict(orient='records')
    }
    
    with open("public/kicker_data.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"✅ Success! Data saved.")

if __name__ == "__main__":
    run_analysis()