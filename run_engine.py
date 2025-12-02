import re
import nflreadpy as nfl
import pandas as pd
import json
import sys
import traceback
import random
import numpy as np
import os
from datetime import datetime

# Import our new modules
from engine.config import CURRENT_SEASON
from engine.data import (
    load_data_with_retry, get_current_nfl_week, scrape_cbs_injuries, 
    scrape_fantasy_ownership, clean_nan, calculate_stall_metrics, 
    analyze_past_3_weeks_strict, get_kicker_scores_for_week 
)
from engine.weather import get_weather_forecast

# --- NARRATIVE ENGINE (Keep existing function) ---
def generate_narrative(row):
    if row['injury_status'] != 'Healthy':
        return f"Monitor status closely as they are currently listed as {row['injury_status']}. This significantly impacts their viability for Week {row.get('week', '')}."

    name = row['kicker_player_name'].split('.')[-1]
    grade = row['grade']
    vegas = row['vegas_implied']
    off_stall = row['off_stall_rate']
    def_stall = row['def_stall_rate']
    wind = row['wind']
    is_dome = row['is_dome']
    
    s1_options = []
    if grade >= 100:
        s1_options = [
            f"{name} is a locked-and-loaded RB1 of kickers this week with an elite Grade of {grade}.",
            f"Fire up {name} with confidence; his Matchup Grade of {grade} is in the elite tier."
        ]
    elif grade >= 90:
        s1_options = [
            f"{name} is a strong play this week, sitting comfortably with a Grade of {grade}.",
            f"You can trust {name} in your lineup given his solid Grade of {grade}."
        ]
    elif grade >= 80:
        s1_options = [
            f"{name} is a viable streaming option with a respectable Grade of {grade}.",
            f"Consider {name} if you need a fill-in; his Grade is a decent {grade}."
        ]
    else:
        s1_options = [
            f"{name} is a risky option this week with a below-average Grade of {grade}.",
            f"Fade {name} if possible; his Grade of {grade} suggests low upside."
        ]
    
    s1 = random.choice(s1_options)

    s2_options = []
    if vegas > 27:
        s2_options = [f"The offense has a massive implied total of {vegas:.1f}, offering a high ceiling."]
    elif wind > 15 and not is_dome:
        s2_options = [f"However, heavy winds ({wind} mph) could severely limit kicking opportunities."]
    elif is_dome:
        s2_options = [f"Playing in a dome guarantees perfect kicking conditions."]
    elif off_stall > 40:
        s2_options = [f"His offense has a high stall rate ({off_stall}%), which often leads to FG attempts."]
    elif def_stall > 40:
        s2_options = [f"The matchup is favorable against a defense that forces FGs ({def_stall}%) in the red zone."]
    elif vegas < 18:
        s2_options = [f"Be cautious, as the team has a low implied total ({vegas:.1f}), limiting chances."]
    else:
        s2_options = [f"They face a neutral matchup with standard scoring expectations."]

    s2 = random.choice(s2_options)
    return f"{s1} {s2}"

def run_analysis():
    try:
        target_week = get_current_nfl_week()
        print(f"🚀 Starting Analysis for Week {target_week}...")
        
        # Load existing data to preserve history
        history = {}
        try:
            if os.path.exists("public/kicker_data.json"):
                with open("public/kicker_data.json", "r") as f:
                    existing_data = json.load(f)
                    history = existing_data.get("history", {})
        except Exception as e:
            print(f"⚠️ Could not load existing history: {e}")

        pbp = load_data_with_retry(lambda: nfl.load_pbp(seasons=[CURRENT_SEASON]), "PBP")
        schedule = load_data_with_retry(lambda: nfl.load_schedules(seasons=[CURRENT_SEASON]), "Schedule")
        players = load_data_with_retry(lambda: nfl.load_players(), "Players")
        
        if hasattr(pbp, "to_pandas"): pbp = pbp.to_pandas()
        if hasattr(schedule, "to_pandas"): schedule = schedule.to_pandas()
        if hasattr(players, "to_pandas"): players = players.to_pandas()
        
        # --- HISTORICAL DATA CAPTURE (Last Week) ---
        last_week = target_week - 1
        if last_week > 0 and str(last_week) not in history:
            print(f"💾 Caching results for Week {last_week}...")
            # Calculate actual scores for last week
            last_week_scores = get_kicker_scores_for_week(pbp, last_week)
            
            # We need the projections for last week to compare against. 
            # Ideally, we would have saved the full object, but if we are just starting, 
            # we can try to reconstruct or check if they exist in the 'rankings' of the loaded JSON 
            # IF the loaded JSON was from last week. 
            
            # For now, let's save what we can: The Actuals. 
            # The frontend can use current week's 'l3_games' history to find the projection.
            history[str(last_week)] = last_week_scores.to_dict(orient='records')
        
        
        cbs_injuries = scrape_cbs_injuries()
        ownership_data = scrape_fantasy_ownership()
        
        # --- USE ROSTERS TO CORRECT TEAM ---
        print("   📥 Loading Rosters for Team Updates...")
        try:
            rosters = load_data_with_retry(lambda: nfl.load_rosters(seasons=[CURRENT_SEASON]), "Rosters")
            if hasattr(rosters, "to_pandas"): rosters = rosters.to_pandas()
            
            full_roster = rosters[['gsis_id', 'team', 'status', 'position']].copy()
            full_roster.rename(columns={'gsis_id': 'kicker_player_id', 'team': 'roster_team'}, inplace=True)
            
            inactive_codes = ['RES', 'NON', 'SUS', 'PUP', 'WAIVED', 'REL', 'CUT', 'RET', 'DEV']
            inactive_roster = rosters[rosters['status'].isin(inactive_codes)][['gsis_id', 'status']].copy()
            inactive_roster.rename(columns={'status': 'roster_status', 'gsis_id': 'kicker_player_id'}, inplace=True)
        except: 
            full_roster = pd.DataFrame(columns=['kicker_player_id', 'roster_team', 'position'])
            inactive_roster = pd.DataFrame(columns=['kicker_player_id', 'roster_status'])


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
        
        # GRANULAR MISSES
        kick_plays['fg_miss_0_19'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'] < 20)
        kick_plays['fg_miss_20_29'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'].between(20, 29))
        kick_plays['fg_miss_30_39'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'].between(30, 39))
        kick_plays['fg_miss_40_49'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'].between(40, 49))
        kick_plays['fg_miss_50_59'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'].between(50, 59))
        kick_plays['fg_miss_60_plus'] = (kick_plays['is_fg']) & (~kick_plays['made']) & (kick_plays['kick_distance'] >= 60)
        
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
            
            fg_miss=('fg_miss', 'sum'), 
            fg_miss_0_19=('fg_miss_0_19', 'sum'), fg_miss_20_29=('fg_miss_20_29', 'sum'), fg_miss_30_39=('fg_miss_30_39', 'sum'),
            fg_miss_40_49=('fg_miss_40_49', 'sum'), fg_miss_50_59=('fg_miss_50_59', 'sum'), fg_miss_60_plus=('fg_miss_60_plus', 'sum'),
            
            xp_made=('xp_made', 'sum'), xp_miss=('xp_miss', 'sum'),
            real_pts=('real_pts', 'sum'), dome_kicks=('is_dome', 'sum'),
            total_kicks=('play_id', 'count'), games=('game_id', 'nunique')
        ).reset_index()
        
        # --- FIX TEAM USING ROSTER DATA & FILTER BY POSITION ---
        if not full_roster.empty:
            stats = pd.merge(stats, full_roster, on='kicker_player_id', how='left')
            stats['team'] = np.where(stats['roster_team'].notna(), stats['roster_team'], stats['team'])
            
            stats = stats[
                (stats['position'] == 'K') | (stats['position'].isna())
            ]
            
            stats.drop(columns=['roster_team', 'position'], inplace=True)
        
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
        live_cols = [
            'wk_fg_0_19', 'wk_fg_20_29', 'wk_fg_30_39', 'wk_fg_40_49', 'wk_fg_50_59', 'wk_fg_60_plus', 
            'wk_fg_miss', 'wk_xp_made', 'wk_xp_miss',
            'wk_fg_miss_0_19', 'wk_fg_miss_20_29', 'wk_fg_miss_30_39', 'wk_fg_miss_40_49',
            'wk_fg_miss_50_59', 'wk_fg_miss_60_plus'
        ]
        
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
                wk_xp_miss=('xp_miss', 'sum'),
                wk_fg_miss_0_19=('fg_miss_0_19', 'sum'),
                wk_fg_miss_20_29=('fg_miss_20_29', 'sum'),
                wk_fg_miss_30_39=('fg_miss_30_39', 'sum'),
                wk_fg_miss_40_49=('fg_miss_40_49', 'sum'),
                wk_fg_miss_50_59=('fg_miss_50_59', 'sum'),
                wk_fg_miss_60_plus=('fg_miss_60_plus', 'sum')
            ).reset_index()
        else:
            live_stats = pd.DataFrame(columns=['kicker_player_id'] + live_cols)
            
        for c in live_cols:
             if c not in live_stats.columns: live_stats[c] = 0

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
        
        for c in live_cols:
            if c in final.columns: final[c] = final[c].fillna(0)
            
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
                # NO DUPLICATE LIVE COLS HERE
            })

        final = final.join(final.apply(process_row, axis=1))
        final = final.sort_values('proj', ascending=False)
        
        # Fix: Generate narratives AFTER process_row has added 'grade' and 'proj'
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
                },
                # ADDED HISTORY KEY TO SAVE PREVIOUS WEEKS
                "history": history 
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