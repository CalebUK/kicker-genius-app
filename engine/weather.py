import requests
import time
from datetime import datetime
from engine.config import STADIUM_COORDS

def get_weather_forecast(home_team, game_dt_str, is_dome=False):
    # 1. Check if Game is Finished
    try:
        game_dt = datetime.strptime(game_dt_str, '%Y-%m-%d %H:%M')
        time_diff = datetime.now() - game_dt
        if time_diff.total_seconds() > (4 * 3600): 
             return 0, "Game Finished"
    except: pass

    # 2. Check Dome Status
    if is_dome: return 0, "Dome"

    # 3. Robust API Fetch
    coords = STADIUM_COORDS.get(home_team)
    if not coords: return 0, "Outdoors ☀️" 
    
    lat, lon = coords
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York"
    
    data = None
    # Retry up to 4 times with exponential backoff (1s, 2s, 4s, 8s)
    for attempt in range(4):
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                temp_data = resp.json()
                if 'hourly' in temp_data and 'wind_speed_10m' in temp_data['hourly']:
                    data = temp_data
                    break
        except Exception as e:
            print(f"   ⚠️ Weather API attempt {attempt+1} failed for {home_team}: {e}")
        
        time.sleep(2 ** attempt)
    
    if not data: return 0, "Outdoors ☀️"
    
    try:
        target = game_dt_str.replace(" ", "T")[:13]
        times = data['hourly']['time']
        
        try:
            idx = next(i for i, t in enumerate(times) if t.startswith(target))
        except StopIteration:
            return 0, "Outdoors ☀️"
        
        wind = data['hourly']['wind_speed_10m'][idx]
        precip = data['hourly']['precipitation_probability'][idx]
        temp = data['hourly']['temperature_2m'][idx]
        
        cond = f"{int(wind)}mph"
        if precip > 40: 
            cond += " 🌨️" if temp <= 32 else " 🌧️"
        elif wind > 15: 
            cond += " 🌬️"
        else: 
            cond += " ☀️"
            
        return wind, cond
    except:
        return 0, "Outdoors ☀️"