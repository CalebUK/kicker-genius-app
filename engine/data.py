import nflreadpy as nfl
import pandas as pd
import requests
import io
import time
import numpy as np
import re
from datetime import datetime, timedelta
from engine.config import CURRENT_SEASON, SEASON_START_DATE, FORCE_WEEK

def load_data_with_retry(func, name, max_retries=5, delay=5):
    for attempt in range(max_retries):
        try:
            print(f"   📥 Loading {name} (Attempt {attempt + 1}/{max_retries})...")
            return func()
        except Exception as e:
            print(f"   ⚠️ {name} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay * (2 ** attempt))
            else:
                raise e

def get_current_nfl_week():
    """Calculates current week using Calendar Math (Instant)."""
    if FORCE_WEEK is not None:
        print(f"   ⚠️ DEBUG MODE: Forcing Week {FORCE_WEEK}")
        return FORCE_WEEK
        
    today = datetime.now()
    if today < SEASON_START_DATE: return 1
    
    # FIX: Rollover on Tuesday instead of Thursday
    days_since_start = (today - SEASON_START_DATE + timedelta(days=2)).days
    
    week_num = (days_since_start // 7) + 1
    return max(1, min(18, week_num))

# --- NEW FUNCTION: GET KICKER SCORES FOR A SPECIFIC WEEK ---
def get_kicker_scores_for_week(pbp_data, target_week):
    """
    Calculates total fantasy points, FG makes, and FG misses for all kickers 
    in a given week (for historical/actual score checks).
    """
    week_plays = pbp_data[pbp_data['week'] == target_week].copy()
    week_plays = week_plays.dropna(subset=['kicker_player_name'])
    
    # Simple scoring logic needed for calculating the actual points
    def calc_simple_pts(row):
        # Using a fixed standard scoring for historical actuals to calculate total points reliably
        # The frontend will later use user settings on the granularity of makes/misses
        if row['play_type'] == 'field_goal':
            if row['field_goal_result'] == 'made': return 5 if row['kick_distance'] >= 50 else 4 if row['kick_distance'] >= 40 else 3
            return -1
        if row['play_type'] == 'extra_point': return 1 if row['extra_point_result'] == 'good' else -1
        return 0

    week_plays['pts'] = week_plays.apply(calc_simple_pts, axis=1)
    week_plays['is_fg_made'] = (week_plays['play_type'] == 'field_goal') & (week_plays['field_goal_result'] == 'made')
    week_plays['is_fg_miss'] = (week_plays['play_type'] == 'field_goal') & (week_plays['field_goal_result'] == 'missed')
    week_plays['is_xp_miss'] = (week_plays['play_type'] == 'extra_point') & (week_plays['extra_point_result'] == 'failed')
    
    scores = week_plays.groupby('kicker_player_id').agg(
        actual_fpts=('pts', 'sum'),
        fg_made=('is_fg_made', 'sum'),
        fg_miss=('is_fg_miss', 'sum'),
        xp_miss=('is_xp_miss', 'sum'),
    ).reset_index()
    
    return scores.rename(columns={'kicker_player_id': 'kicker_player_id', 'actual_fpts': 'wk_actual'})

# --- SCRAPING FUNCTIONS (OMITTED - NO CHANGES) ---

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
            total_act += act
            total_proj += proj
            
            games_list.append({'week': int(wk), 'status': 'ACTIVE', 'proj': proj, 'act': act, 'diff': round(act - proj, 1), 'opp': opp})
            
        history_data[pid] = {'l3_actual': int(total_act), 'l3_proj': round(float(total_proj), 1), 'l3_games': games_list}
    return history_data