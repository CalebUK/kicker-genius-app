import nflreadpy as nfl
import pandas as pd
import requests
import json
import warnings
from datetime import datetime, timedelta
import numpy as np
import time
import traceback
import io
import math
import sys
import re 

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

# --- RETRY HELPER ---
def load_data_with_retry(func, name, max_retries=5, delay=5):
    """Helper to load NFL data with exponential backoff for 503 errors."""
    for attempt in range(max_retries):
        try:
            print(f"   📥 Loading {name} (Attempt {attempt + 1}/{max_retries})...")
            return func()
        except Exception as e:
            print(f"   ⚠️ {name} failed: {e}")
            if attempt < max_retries - 1:
                sleep_time = delay * (2 ** attempt) 
                print(f"   ⏳ Waiting {sleep_time}s before retry...")
                time.sleep(sleep_time)
            else:
                raise e

def get_current_nfl_week():
    try:
        schedule = load_data_with_retry(lambda: nfl.load_schedules(seasons=[CURRENT_SEASON]), "Schedule Check")
        if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()
        today = datetime.now().strftime('%Y-%m-%d')
        upcoming = schedule[schedule['gameday'] >= today]
        return int(upcoming['week'].min()) if not upcoming.empty else 18
    except:
        return 1

def get_weather_forecast(home_team, game_dt_str, is_dome=False):
    # 1. Check if Game is Finished (Current Time > Game Time + 4 hours)
    try:
        game_dt = datetime.strptime(game_dt_str, '%Y-%m-%d %H:%M')
        time_diff = datetime.now() - game_dt
        if time_diff.total_seconds() > (4 * 3600): 
             return 0, "Game Finished"
    except: pass

    if is_dome: return 0, "Dome"
    coords = STADIUM_COORDS.get(home_team)
    if not coords: return 0, "Unknown"
    
    lat, lon = coords
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York"
        data = None
        for i in range(3):
            try:
                resp = requests.get(url, timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    break
            except: 
                time.sleep(1)
        
        if not data: return 0, "API Error"
        
        target = game_dt_str.replace(" ", "T")[:13]
        times = data['hourly']['time']
        idx = next((i for i, t in enumerate(times) if t.startswith(target)), -1)
        if idx == -1: return 0, "No Data"
        
        return data['hourly']['wind_speed_10m'][idx], f"{int(data['hourly']['wind_speed_10m'][idx])}mph"
    except:
        return 0, "API Error"

def scrape_cbs_injuries():
    print("   🌐 Scraping CBS Sports for live injury data...")
    url = "https://www.cbssports.com/nfl/injuries/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        dfs = pd.read_html(io.StringIO(response.text), flavor='html5lib')
        if not dfs: return pd.DataFrame()
        combined = pd.concat(dfs, ignore_index=True)
        combined.columns = [c.lower().strip() for c in combined.columns]
        col_map = {}
        for col in combined.columns:
            if 'player' in col: col_map[col] = 'full_name'
            elif 'status' in col: col_map[col] = 'cbs_status'   # DISTINCT NAME
            elif 'injury' in col: col_map[col] = 'cbs_injury'   # DISTINCT NAME
        combined.rename(columns=col_map, inplace=True)
        
        if 'full_name' not in combined.columns: return pd.DataFrame()

        def clean_name(val):
            if not isinstance(val, str): return val
            return val.split(' (')[0].strip()
        combined['full_name'] = combined['full_name'].apply(clean_name)
        
        # Create normalized name for joining
        def normalize_for_join(val):
             parts = val.split(' ')
             if len(parts) >= 2: return f"{parts[0][0]}.{parts[-1]}"
             return val
        combined['join_name'] = combined['full_name'].apply(normalize_for_join)
        return combined[['join_name', 'cbs_status', 'cbs_injury']]
    except Exception as e:
        print(f"   ⚠️ Scraping failed: {e}")
        return pd.DataFrame()

def scrape_fantasy_ownership():
    try:
        url = "https://www.fantasypros.com/nfl/stats/k.php"
        headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}
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
    except:
        return pd.DataFrame()

def load_injury_data_safe(season, target_week):
    # We rely on CBS Scraper + Roster Data now.
    return pd.DataFrame(columns=['gsis_id', 'report_status', 'practice_status', 'full_name'])

def clean_nan(val):
    if isinstance(val, float):
        if pd.isna(val) or np.isinf(val): return None
    return val

def calculate_stall_metrics(df_pbp):
    """Calculates stall rates using VECTORIZED operations for speed."""
    rz_drives = df_pbp[(df_pbp['yardline_100'] <= 25) & (df_pbp['yardline_100'].notnull())]
    drives = rz_drives[['game_id', 'drive', 'posteam', 'defteam']].drop_duplicates()
    
    if drives.empty:
        return pd.DataFrame(columns=['posteam', 'off_stall_rate']), pd.DataFrame(columns=['defteam', 'def_stall_rate'])

    drive_outcomes = rz_drives.groupby(['game_id', 'drive', 'posteam', 'defteam']).agg(
        td=('touchdown', 'max'),
        int=('interception', 'max'),
        fum=('fumble_lost', 'max')
    ).reset_index()
    
    drive_outcomes['stalled'] = ~((drive_outcomes['td'] == 1) | (drive_outcomes['int'] == 1) | (drive_outcomes['fum'] == 1))
    
    off = drive_outcomes.groupby('posteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'off_stall_rate'})
    defs = drive_outcomes.groupby('defteam')['stalled'].mean().reset_index().rename(columns={'stalled': 'def_stall_rate'})
    
    off['off_stall_rate'] = (off['off_stall_rate'] * 100).round(1)
    defs['def_stall_rate'] = (defs['def_stall_rate'] * 100).round(1)
    
    return off, defs

def analyze_past_3_weeks_strict(target_week, pbp, schedule, current_stats):
    print(f"🔙 Analyzing Last 3 Weeks...")
    weeks_to_analyze = [w for w in [target_week-1, target_week-2, target_week-3] if w >= 1]
    
    def calc_simple_pts(row):
        if row['play_type'] == 'field_goal':
            if row['field_goal_result'] == 'made': return 5 if row['kick_distance'] >= 50 else 4 if row['kick_distance'] >= 40 else 3
            return -1
        if row['play_type'] == 'extra_point': return 1 if row['extra_point_result'] == 'good' else -1
        return 0
    
    relevant_pbp = pbp[pbp['week'].isin(weeks_to_analyze)].copy()
    relevant_pbp['pts'] = relevant_pbp.apply(calc_simple_pts, axis=1)
    actuals_map = relevant_pbp.groupby(['week', 'kicker_player_id'])['pts'].sum().to_dict()

    history_data = {}
    for _, kicker in current_stats.iterrows():
        pid = kicker['kicker_player_id']
        team = kicker['team']
        # FIX: Ensure variable is team_schedule to match usage in loop
        team_schedule = schedule[(schedule['week'].isin(weeks_to_analyze)) & 
                                 ((schedule['home_team'] == team) | (schedule['away_team'] == team))].copy()
        games_list = []
        total_act = 0
        total_proj = 0
        
        for wk in weeks_to_analyze:
            game = team_schedule[team_schedule['week'] == wk]
            if game.empty:
                games_list.append({'week': int(wk), 'status': 'BYE', 'proj': 0, 'act': 0, 'diff': 0, 'opp': 'BYE'})
                continue
            game = game.iloc[0]
            is_home = (game['home_team'] == team)
            opp = game['away_team'] if is_home else game['home_team']
            
            player_played = not relevant_pbp[(relevant_pbp['week'] == wk) & (relevant_pbp['kicker_player_id'] == pid)].empty
            if not player_played:
                games_list.append({'week': int(wk), 'status': 'DNS', 'proj': 0, 'act': 0, 'diff': 0, 'opp': opp})
                continue
            
            total_line = game['total_line'] if pd.notna(game['total_line']) else 44.0
            spread_line = game['spread_line'] if pd.notna(game['spread_line']) else 0.0
            
            if is_home: vegas_implied = (total_line + spread_line) / 2
            else: vegas_implied = (total_line - spread_line) / 2
                
            base = kicker['avg_pts']
            mult = 1.15 if vegas_implied > 24 else (0.85 if vegas_implied < 18 else 1.0)
            proj = round(base * mult, 1)
            act = int(actuals_map.get((wk, pid), 0))
            
            games_list.append({'week': int(wk), 'status': 'ACTIVE', 'proj': proj, 'act': act, 'diff': round(act - proj, 1), 'opp': opp})
            
        history_data[pid] = {'l3_actual': int(total_act), 'l3_proj': round(float(total_proj), 1), 'l3_games': games_list}
    return history_data

# --- NARRATIVE ENGINE ---
def generate_narrative(row):
    """Generates a 2-sentence 'AI' analysis for the kicker."""
    
    if row['injury_status'] != 'Healthy':
        return f"Monitor status closely as they are currently listed as {row['injury_status']}. This significantly impacts their viability for Week {row.get('week', '')}."

    name = row['kicker_player_name'].split('.')[-1]
    grade = row['grade']
    vegas = row['vegas_implied']
    off_stall = row['off_stall_rate']
    
    s1 = ""
    if grade >= 100: s1 = f"{name} is a must-start option this week with an elite Matchup Grade of {grade}."
    elif grade >= 90: s1 = f"{name} is a strong play this week, boasting a solid Grade of {grade}."
    elif grade >= 80: s1 = f"{name} is a viable streaming option with a respectable Grade of {grade}."
    else: s1 = f"{name} is a risky option this week with a below-average Grade of {grade}."
    
    s2 = ""
    if vegas > 27: s2 = f"The offense has a massive implied total of {vegas:.1f} points, offering a high ceiling."
    elif row['wind'] > 15: s2 = f"However, heavy winds ({row['wind']} mph) could severely limit kicking opportunities."
    elif off_stall > 40: s2 = f"The offense has a high stall rate ({off_stall}%), which often leads to field goal attempts."
    elif row['def_stall_rate'] > 40: s2 = f"The matchup is favorable against a defense that frequently forces field goals in the red zone."
    elif vegas < 18: s2 = f"Be cautious, as the team has a low implied total ({vegas:.1f}), limiting scoring chances."
    else: s2 = f"They face a neutral matchup with standard scoring expectations."
        
    return f"{s1} {s2}"

def run_analysis():
    try:
        target_week = get_current_nfl_week()
        print(f"🚀 Starting Analysis for Week {target_week}...")
        
        pbp = load_data_with_retry(lambda: nfl.load_pbp(seasons=[CURRENT_SEASON]), "PBP")
        schedule = load_data_with_retry(lambda: nfl.load_schedules(seasons=[CURRENT_SEASON]), "Schedule")
        players = load_data_with_retry(lambda: nfl.load_players(), "Players")
        
        cbs_injuries = scrape_cbs_injuries()
        ownership_data = scrape_fantasy_ownership()
        
        try:
            rosters = load_data_with_retry(lambda: nfl.load_rosters(seasons=[CURRENT_SEASON]), "Rosters")
            if hasattr(rosters, "to_pandas"): rosters = rosters.to_pandas()
            if rosters.empty: rosters = nfl.load_rosters(seasons=[CURRENT_SEASON-1]).to_pandas()
            
            inactive_codes = ['RES', 'NON', 'SUS', 'PUP', 'WAIVED', 'REL', 'CUT', 'RET', 'DEV']
            inactive_roster = rosters[rosters['status'].isin(inactive_codes)][['gsis_id', 'status']].copy()
            inactive_roster.rename(columns={'status': 'roster_status', 'gsis_id': 'kicker_player_id'}, inplace=True)
        except: 
            inactive_roster = pd.DataFrame(columns=['kicker_player_id', 'roster_status'])

        if hasattr(pbp, "to_pandas"): pbp = pbp.to_pandas()
        if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()
        if hasattr(players, "to_pandas"): players = players.to_pandas()

        # --- RAW STATS ---
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
            fg_0_19=('fg_0_19', 'sum'), fg_20_29=('fg_20_29', 'sum'), fg_30_39=('fg_30_39', 'sum'),
            fg_40_49=('fg_40_49', 'sum'), fg_50_59=('fg_50_59', 'sum'), fg_60_plus=('fg_60_plus', 'sum'),
            fg_miss=('fg_miss', 'sum'), xp_made=('xp_made', 'sum'), xp_miss=('xp_miss', 'sum'),
            real_pts=('real_pts', 'sum'), dome_kicks=('is_dome', 'sum'),
            total_kicks=('play_id', 'count'), games=('game_id', 'nunique')
        ).reset_index()
        
        stats = pd.merge(stats, rz_counts, left_on='team', right_on='posteam', how='left').fillna(0)
        stats['acc'] = (stats['fg_made'] / stats['fg_att'] * 100).round(1)
        stats['dome_pct'] = (stats['dome_kicks'] / stats['total_kicks'] * 100).round(0)
        stats['fpts'] = (stats['fg_0_19']*3 + stats['fg_20_29']*3 + stats['fg_30_39']*3 + 
                         stats['fg_40_49']*4 + stats['fg_50_59']*5 + stats['fg_60_plus']*5 + 
                         stats['xp_made']*1 - stats['fg_miss']*1 - stats['xp_miss']*1)
        stats['avg_pts'] = (stats['fpts'] / stats['games']).round(1)

        def normalize_name(val):
            if not isinstance(val, str): return val
            clean = re.sub(r'\s+(Jr\.?|Sr\.?|III|II|IV)$', '', val, flags=re.IGNORECASE)
            parts = clean.split(' ')
            if len(parts) >= 2: return f"{parts[0][0]}.{parts[-1]}"
            return clean
            
        stats['join_name'] = stats['kicker_player_name'].apply(normalize_name)

        off_stall_seas, def_stall_seas = calculate_stall_metrics(pbp)
        off_stall_seas.rename(columns={'off_stall_rate': 'off_stall_rate_ytd'}, inplace=True)
        def_stall_seas.rename(columns={'def_stall_rate': 'def_stall_rate_ytd'}, inplace=True)
        
        if 'posteam' in off_stall_seas.columns: off_stall_seas = off_stall_seas.rename(columns={'posteam': 'team'})
        if 'defteam' in def_stall_seas.columns: def_stall_seas = def_stall_seas.rename(columns={'defteam': 'team'}) 
        
        stats = pd.merge(stats, off_stall_seas, on='team', how='left')
        stats = pd.merge(stats, def_stall_seas, on='team', how='left')
        stats['off_stall_rate_ytd'] = stats['off_stall_rate_ytd'].fillna(0)
        stats['def_stall_rate_ytd'] = stats['def_stall_rate_ytd'].fillna(0)

        history_data = analyze_past_3_weeks_strict(target_week, pbp, schedule, stats)

        # --- NEW: CURRENT WEEK LIVE SCORING (RAW BUCKETS) ---
        current_week_pbp = kick_plays[kick_plays['week'] == target_week].copy()
        
        if not current_week_pbp.empty:
            live_stats = current_week_pbp.groupby('kicker_player_id').agg(
                wk_fg_0_19=('fg_0_19', 'sum'),
                wk_fg_20_29=('fg_20_29', 'sum'),
                wk_fg_30_39=('fg_30_39', 'sum'),
                wk_fg_40_49=('fg_40_49', 'sum'),
                wk_fg_50_59=('fg_50_59', 'sum'),
                wk_fg_60_plus=('fg_60_plus', 'sum'),
                wk_fg_miss=('fg_miss', 'sum'),
                wk_xp_made=('xp_made', 'sum'),
                wk_xp_miss=('xp_miss', 'sum')
            ).reset_index()
        else:
            live_stats = pd.DataFrame(columns=[
                'kicker_player_id', 
                'wk_fg_0_19', 'wk_fg_20_29', 'wk_fg_30_39', 'wk_fg_40_49', 'wk_fg_50_59', 'wk_fg_60_plus', 
                'wk_fg_miss', 'wk_xp_made', 'wk_xp_miss'
            ])

        headshot_col = 'headshot_url' if 'headshot_url' in players.columns else 'headshot' if 'headshot' in players.columns else None
        if headshot_col:
            player_map = players[['gsis_id', headshot_col]].rename(columns={'gsis_id': 'kicker_player_id', headshot_col: 'headshot_url'})
            stats = pd.merge(stats, player_map, on='kicker_player_id', how='left')
        else:
            stats['headshot_url'] = None
        stats['headshot_url'] = stats['headshot_url'].fillna("https://static.www.nfl.com/image/private/f_auto,q_auto/league/nfl-placeholder.png")
        
        # OWNERSHIP
        if not ownership_data.empty:
            stats = pd.merge(stats, ownership_data, left_on='kicker_player_name', right_on='match_name', how='left')
            stats['own_pct'] = stats['own_pct'].fillna(0.0)
        else:
            stats['own_pct'] = 0.0

        # INJURIES
        if 'join_name' in cbs_injuries.columns:
            stats = pd.merge(stats, cbs_injuries, left_on='join_name', right_on='join_name', how='left')
        else:
            stats['cbs_status'] = None
            stats['cbs_injury'] = None
            
        stats = pd.merge(stats, inactive_roster, on='kicker_player_id', how='left')
        
        def get_injury_meta(row):
            roster_st = str(row.get('roster_status', '')) if pd.notna(row.get('roster_status', '')) else ""
            if roster_st in ['RES', 'NON', 'SUS', 'PUP']: return "IR", "red-700", f"Roster: {roster_st}"
            if roster_st in ['WAIVED', 'REL', 'CUT', 'RET']: return "CUT", "red-700", "Released"
            if roster_st == 'DEV': return "Practice Squad", "yellow-500", "Roster: Practice Squad"
            
            cbs_st = str(row.get('cbs_status', '')).title()
            cbs_det = str(row.get('cbs_injury', ''))
            
            if "Out" in cbs_st or "Ir" in cbs_st or "Inactive" in cbs_st: 
                return "OUT", "red-700", f"{cbs_st} ({cbs_det})"
            if "Doubtful" in cbs_st: 
                return "Doubtful", "red-400", f"{cbs_st} ({cbs_det})"
            if "Questionable" in cbs_st: 
                return "Questionable", "yellow-500", f"{cbs_st} ({cbs_det})"
            
            return "Healthy", "green", "Active"

        injury_meta = stats.apply(get_injury_meta, axis=1)
        stats['injury_status'] = [x[0] for x in injury_meta]
        stats['injury_color'] = [x[1] for x in injury_meta]
        stats['injury_details'] = [x[2] for x in injury_meta]

        qualified = stats[stats['fg_att'] >= 5]
        elite_thresh = qualified['fpts'].quantile(0.80) if not qualified.empty else 100

        max_wk = pbp['week'].max()
        start_wk = max(1, max_wk - 3)
        recent_pbp = pbp[pbp['week'] >= start_wk].copy()
        off_stall_l4, def_stall_l4 = calculate_stall_metrics(recent_pbp)
        lg_off_avg = off_stall_l4['off_stall_rate'].mean()
        lg_def_avg = def_stall_l4['def_stall_rate'].mean()

        fourth_downs = recent_pbp[(recent_pbp['down'] == 4) & (recent_pbp['yardline_100'] <= 30)].copy()
        fourth_downs['is_go'] = fourth_downs['play_type'].isin(['pass', 'run'])
        aggression_stats = fourth_downs.groupby('posteam').agg(total_4th_opps=('play_id', 'count'), total_go_attempts=('is_go', 'sum')).reset_index()
        aggression_stats['aggression_pct'] = (aggression_stats['total_go_attempts'] / aggression_stats['total_4th_opps'] * 100).round(1)

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

        matchups = schedule[schedule['week'] == target_week][['home_team', 'away_team', 'roof', 'gameday', 'gametime', 'spread_line', 'total_line']].copy()
        matchups['game_dt'] = matchups['gameday'] + ' ' + matchups['gametime']
        matchups['total_line'] = matchups['total_line'].fillna(44.0)
        matchups['spread_line'] = matchups['spread_line'].fillna(0.0)
        
        home_view = matchups[['home_team', 'away_team', 'roof', 'game_dt', 'total_line', 'spread_line']].copy()
        home_view['home_field'] = home_view['home_team']
        home_view = home_view.rename(columns={'home_team': 'team', 'away_team': 'opponent'})
        home_view['vegas_implied'] = (home_view['total_line'] + home_view['spread_line']) / 2
        home_view['is_home'] = True
        home_view['spread_display'] = home_view['spread_line'].apply(lambda x: f"{x*-1:+.1f}")

        away_view = matchups[['away_team', 'home_team', 'roof', 'game_dt', 'total_line', 'spread_line']].copy()
        away_view['home_field'] = away_view['home_team']
        away_view = away_view.rename(columns={'away_team': 'team', 'home_team': 'opponent'})
        away_view['vegas_implied'] = (away_view['total_line'] - away_view['spread_line']) / 2
        away_view['is_home'] = False
        away_view['spread_display'] = away_view['spread_line'].apply(lambda x: f"{x:+.1f}")
        
        model = pd.concat([home_view, away_view])
        model['is_dome'] = model['roof'].isin(['dome', 'closed'])
        
        print("🌤️ Fetching Weather...")
        model['weather_data'] = model.apply(lambda x: get_weather_forecast(x['home_field'], x['game_dt'], x['is_dome']), axis=1)
        model['wind'] = model['weather_data'].apply(lambda x: x[0])
        model['weather_desc'] = model['weather_data'].apply(lambda x: x[1])

        if 'posteam' in off_stall_l4.columns: off_stall_l4 = off_stall_l4.rename(columns={'posteam': 'team'})
        if 'defteam' in def_stall_l4.columns: def_stall_l4 = def_stall_l4.rename(columns={'defteam': 'opponent'})
        if 'posteam' in aggression_stats.columns: aggression_stats = aggression_stats.rename(columns={'posteam': 'team'})
        
        final = pd.merge(stats, model, on='team', how='inner')
        
        # MERGE LIVE STATS
        final = pd.merge(final, live_stats, on='kicker_player_id', how='left')
        
        final = pd.merge(final, off_stall_l4, on='team', how='left')
        final = pd.merge(final, off_ppg, on='team', how='left')
        final = pd.merge(final, off_share, on='team', how='left')
        final = pd.merge(final, def_stall_l4, on='opponent', how='left')
        final = pd.merge(final, def_pa, on='opponent', how='left')
        final = pd.merge(final, def_share, on='opponent', how='left')
        final = pd.merge(final, aggression_stats[['team', 'aggression_pct']], on='team', how='left')
        
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
            if abs(float(row['spread_display'])) < 3.5: bonus_val += 5; bonuses.append("+5 Tight Game")
            elif abs(float(row['spread_display'])) > 9.5: bonus_val -= 5; bonuses.append("-5 Blowout Risk")
            
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
            
            if row['injury_status'] in ['OUT', 'CUT', 'Practice Squad', 'IR', 'Inactive']:
                proj = 0.0
                grade = 0.0
                bonuses.append(f"⛔ {row['injury_status'].upper()}")
            
            history_obj = history_data.get(row['kicker_player_id'], {'l3_actual': 0, 'l3_proj': 0, 'l3_games': []})

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
                'details_vegas_spread': row['spread_display'],
                'history': history_obj,
                # LIVE STATS PASSTHROUGH
                'wk_fg_0_19': row['wk_fg_0_19'], 'wk_fg_20_29': row['wk_fg_20_29'],
                'wk_fg_30_39': row['wk_fg_30_39'], 'wk_fg_40_49': row['wk_fg_40_49'],
                'wk_fg_50_59': row['wk_fg_50_59'], 'wk_fg_60_plus': row['wk_fg_60_plus'],
                'wk_fg_miss': row['wk_fg_miss'], 'wk_xp_made': row['wk_xp_made'],
                'wk_xp_miss': row['wk_xp_miss']
            })

        final = final.join(final.apply(process_row, axis=1))
        final = final.sort_values('proj', ascending=False)
        
        final['narrative'] = final.apply(generate_narrative, axis=1)
        
        final = final.replace([np.inf, -np.inf, np.nan], None)
        final = final.where(pd.notnull(final), None)
        ytd_sorted = stats.sort_values('fpts', ascending=False).replace([np.inf, -np.inf, np.nan], None)
        ytd_sorted = ytd_sorted.where(pd.notnull(ytd_sorted), None)
        injuries_list = stats[stats['injury_status'] != 'Healthy'].sort_values('fpts', ascending=False).replace([np.inf, -np.inf, np.nan], None)
        injuries_list = injuries_list.where(pd.notnull(injuries_list), None)

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
    
    except Exception as e:
        print(f"❌ Fatal Error: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_analysis()