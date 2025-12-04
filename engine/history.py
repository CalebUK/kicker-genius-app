import pandas as pd
import json
import os
from engine.data import get_kicker_scores_for_week

def load_history(file_path="public/kicker_data.json"):
    """Loads existing history from the JSON file if it exists."""
    try:
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                data = json.load(f)
                return data.get("history", {})
    except Exception as e:
        print(f"⚠️ Could not load existing history: {e}")
    return {}

def update_history(history, pbp_data, current_week):
    """
    Checks if the previous week's data is saved. If not, calculates and saves it.
    """
    last_week = current_week - 1
    week_key = str(last_week)
    
    # If Week 1, there is no history to save
    if last_week < 1:
        return history

    # If we already saved this week, skip recalculation to save time
    if week_key in history:
        print(f"✅ History for Week {last_week} already exists.")
        return history

    print(f"💾 Generating historical data for Week {last_week}...")
    
    # Calculate actual scores for the previous week
    scores = get_kicker_scores_for_week(pbp_data, last_week)
    
    if not scores.empty:
        # Convert to list of dicts for JSON storage
        # We store: { id: '...', act: 14.0 } 
        # In a full implementation, we'd also merge the *projected* score from last week 
        # if we had saved it. Since we didn't save snapshots before, 
        # we will just save the Actuals for now.
        history[week_key] = scores.to_dict(orient='records')
        print(f"   - Saved {len(history[week_key])} player records for Week {last_week}.")
    else:
        print(f"   ⚠️ No data found for Week {last_week}. Game processing might be incomplete.")

    return history