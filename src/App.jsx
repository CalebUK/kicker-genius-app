import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Activity, Wind, Calendar, Info, MapPin, ShieldAlert, BookOpen, ChevronDown, ChevronUp, Calculator, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

// --- DATA FROM YOUR PYTHON SCRIPT ---
// NOTE: When deploying to Vercel, you can remove this constant and uncomment the useEffect hook below
// to fetch the live 'kicker_data.json' file dynamically.
const GENERATED_DATA = {
  "meta": {
    "week": 12,
    "updated": "2025-11-21 16:45",
    "league_avgs": {
      "fpts": 76.1,
      "off_stall": 41.5,
      "def_stall": 40.2,
      "l4_off_ppg": 22.8,
      "l4_def_pa": 23.2
    }
  },
  "rankings": [
    {
      "kicker_player_name": "B.Aubrey",
      "team": "DAL",
      "fpts": 106,
      "made": 18,
      "att": 19,
      "longs": 6,
      "dome_kicks": 31,
      "total_kicks": 52,
      "games": 10,
      "posteam_x": "DAL",
      "rz_trips": 52,
      "acc": 94.7,
      "dome_pct": 60.0,
      "avg_pts": 10.6,
      "opponent": "PHI",
      "roof": "closed",
      "gameday": "2025-11-23",
      "gametime": "16:25",
      "spread_line": -3.0,
      "total_line": 47.5,
      "game_dt": "2025-11-23 16:25",
      "vegas": 25.25,
      "away_imp": 22.25,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "DAL",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "DAL",
      "off_stall_rate": 60.0,
      "off_ppg": 25.0,
      "off_share": 0.4304812834224599,
      "defteam": "PHI",
      "def_stall_rate": 50.0,
      "def_pa": 8.0,
      "def_share": 0.6507936507936507,
      "grade": 127.6,
      "proj": 13.0,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game",
        "+5 Elite Talent"
      ],
      "off_score_val": 57.8,
      "def_score_val": 49.7,
      "w_team_score": 25.2,
      "w_def_allowed": 20.1,
      "off_cap_val": 13.0,
      "def_cap_val": 15.7
    },
    {
      "kicker_player_name": "J.Moody",
      "team": "CHI",
      "fpts": 37,
      "made": 9,
      "att": 12,
      "longs": 0,
      "dome_kicks": 0,
      "total_kicks": 17,
      "games": 3,
      "posteam_x": "CHI",
      "rz_trips": 52,
      "acc": 75.0,
      "dome_pct": 0.0,
      "avg_pts": 12.3,
      "opponent": "PIT",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 2.5,
      "total_line": 45.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 21.5,
      "away_imp": 24.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "CHI",
      "is_dome": false,
      "weather_data": [
        5.2,
        "5mph \u2600\ufe0f"
      ],
      "wind": 5.2,
      "weather_desc": "5mph \u2600\ufe0f",
      "posteam_y": "CHI",
      "off_stall_rate": 33.3,
      "off_ppg": 30.0,
      "off_share": 0.5405935050391938,
      "defteam": "PIT",
      "def_stall_rate": 54.5,
      "def_pa": 19.0,
      "def_share": 0.6755555555555555,
      "grade": 91.3,
      "proj": 12.5,
      "grade_details": [
        "+5 Tight Game"
      ],
      "off_score_val": 32.1,
      "def_score_val": 54.2,
      "w_team_score": 24.0,
      "w_def_allowed": 20.8,
      "off_cap_val": 15.6,
      "def_cap_val": 16.8
    },
    {
      "kicker_player_name": "C.Santos",
      "team": "CHI",
      "fpts": 98,
      "made": 16,
      "att": 20,
      "longs": 3,
      "dome_kicks": 14,
      "total_kicks": 41,
      "games": 8,
      "posteam_x": "CHI",
      "rz_trips": 52,
      "acc": 80.0,
      "dome_pct": 34.0,
      "avg_pts": 12.2,
      "opponent": "PIT",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 2.5,
      "total_line": 45.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 21.5,
      "away_imp": 24.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "CHI",
      "is_dome": false,
      "weather_data": [
        5.2,
        "5mph \u2600\ufe0f"
      ],
      "wind": 5.2,
      "weather_desc": "5mph \u2600\ufe0f",
      "posteam_y": "CHI",
      "off_stall_rate": 33.3,
      "off_ppg": 30.0,
      "off_share": 0.5405935050391938,
      "defteam": "PIT",
      "def_stall_rate": 54.5,
      "def_pa": 19.0,
      "def_share": 0.6755555555555555,
      "grade": 91.3,
      "proj": 12.4,
      "grade_details": [
        "+5 Tight Game"
      ],
      "off_score_val": 32.1,
      "def_score_val": 54.2,
      "w_team_score": 24.0,
      "w_def_allowed": 20.8,
      "off_cap_val": 15.6,
      "def_cap_val": 16.8
    },
    {
      "kicker_player_name": "B.McManus",
      "team": "GB",
      "fpts": 79,
      "made": 11,
      "att": 17,
      "longs": 2,
      "dome_kicks": 7,
      "total_kicks": 34,
      "games": 7,
      "posteam_x": "GB",
      "rz_trips": 45,
      "acc": 64.7,
      "dome_pct": 21.0,
      "avg_pts": 11.3,
      "opponent": "MIN",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 6.5,
      "total_line": 41.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 17.5,
      "away_imp": 24.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "GB",
      "is_dome": false,
      "weather_data": [
        9.6,
        "9mph \u2600\ufe0f"
      ],
      "wind": 9.6,
      "weather_desc": "9mph \u2600\ufe0f",
      "posteam_y": "GB",
      "off_stall_rate": 36.4,
      "off_ppg": 15.666666666666666,
      "off_share": 0.5810609143942477,
      "defteam": "MIN",
      "def_stall_rate": 53.8,
      "def_pa": 23.333333333333332,
      "def_share": 0.7382228719948017,
      "grade": 88.6,
      "proj": 11.1,
      "grade_details": [],
      "off_score_val": 35.1,
      "def_score_val": 53.5,
      "w_team_score": 16.9,
      "w_def_allowed": 19.2,
      "off_cap_val": 11.8,
      "def_cap_val": 17.1
    },
    {
      "kicker_player_name": "J.Myers",
      "team": "SEA",
      "fpts": 130,
      "made": 21,
      "att": 26,
      "longs": 5,
      "dome_kicks": 12,
      "total_kicks": 59,
      "games": 10,
      "posteam_x": "SEA",
      "rz_trips": 48,
      "acc": 80.8,
      "dome_pct": 20.0,
      "avg_pts": 13.0,
      "opponent": "TEN",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": -13.5,
      "total_line": 39.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 13.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 26.5,
      "home_field": "TEN",
      "is_dome": false,
      "weather_data": [
        3.5,
        "3mph \u2600\ufe0f"
      ],
      "wind": 3.5,
      "weather_desc": "3mph \u2600\ufe0f",
      "posteam_y": "SEA",
      "off_stall_rate": 43.8,
      "off_ppg": 33.666666666666664,
      "off_share": 0.5434609250398724,
      "defteam": "TEN",
      "def_stall_rate": 55.6,
      "def_pa": 21.5,
      "def_share": 0.5787037037037037,
      "grade": 102.5,
      "proj": 10.8,
      "grade_details": [
        "+5 Elite Talent"
      ],
      "off_score_val": 42.2,
      "def_score_val": 55.3,
      "w_team_score": 19.2,
      "w_def_allowed": 15.6,
      "off_cap_val": 12.5,
      "def_cap_val": 10.8
    },
    {
      "kicker_player_name": "C.Boswell",
      "team": "PIT",
      "fpts": 112,
      "made": 19,
      "att": 22,
      "longs": 7,
      "dome_kicks": 3,
      "total_kicks": 47,
      "games": 10,
      "posteam_x": "PIT",
      "rz_trips": 41,
      "acc": 86.4,
      "dome_pct": 6.0,
      "avg_pts": 11.2,
      "opponent": "CHI",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 2.5,
      "total_line": 45.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 24.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 21.5,
      "home_field": "CHI",
      "is_dome": false,
      "weather_data": [
        5.2,
        "5mph \u2600\ufe0f"
      ],
      "wind": 5.2,
      "weather_desc": "5mph \u2600\ufe0f",
      "posteam_y": "PIT",
      "off_stall_rate": 57.1,
      "off_ppg": 23.666666666666668,
      "off_share": 0.5548293391430646,
      "defteam": "CHI",
      "def_stall_rate": 37.5,
      "def_pa": 26.333333333333332,
      "def_share": 0.35835667600373483,
      "grade": 102.3,
      "proj": 10.6,
      "grade_details": [
        "+5 Tight Game",
        "+5 Elite Talent"
      ],
      "off_score_val": 55.0,
      "def_score_val": 37.3,
      "w_team_score": 23.9,
      "w_def_allowed": 24.7,
      "off_cap_val": 15.9,
      "def_cap_val": 10.6
    },
    {
      "kicker_player_name": "K.Fairbairn",
      "team": "HOU",
      "fpts": 122,
      "made": 25,
      "att": 28,
      "longs": 5,
      "dome_kicks": 28,
      "total_kicks": 42,
      "games": 9,
      "posteam_x": "HOU",
      "rz_trips": 50,
      "acc": 89.3,
      "dome_pct": 67.0,
      "avg_pts": 13.6,
      "opponent": "BUF",
      "roof": "closed",
      "gameday": "2025-11-20",
      "gametime": "20:15",
      "spread_line": -5.5,
      "total_line": 43.5,
      "game_dt": "2025-11-20 20:15",
      "vegas": 24.5,
      "away_imp": 19.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "HOU",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "HOU",
      "off_stall_rate": 66.7,
      "off_ppg": 22.5,
      "off_share": 0.7290458937198068,
      "defteam": "BUF",
      "def_stall_rate": 36.8,
      "def_pa": 26.5,
      "def_share": 0.33817287784679084,
      "grade": 115.9,
      "proj": 10.2,
      "grade_details": [
        "+10 Dome",
        "+5 Elite Talent"
      ],
      "off_score_val": 64.3,
      "def_score_val": 36.6,
      "w_team_score": 23.9,
      "w_def_allowed": 25.1,
      "off_cap_val": 20.9,
      "def_cap_val": 10.2
    },
    {
      "kicker_player_name": "C.Little",
      "team": "JAX",
      "fpts": 99,
      "made": 16,
      "att": 20,
      "longs": 3,
      "dome_kicks": 11,
      "total_kicks": 45,
      "games": 10,
      "posteam_x": "JAX",
      "rz_trips": 47,
      "acc": 80.0,
      "dome_pct": 24.0,
      "avg_pts": 9.9,
      "opponent": "ARI",
      "roof": "closed",
      "gameday": "2025-11-23",
      "gametime": "16:05",
      "spread_line": -3.0,
      "total_line": 47.5,
      "game_dt": "2025-11-23 16:05",
      "vegas": 22.25,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 25.25,
      "home_field": "ARI",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "JAX",
      "off_stall_rate": 31.2,
      "off_ppg": 31.333333333333332,
      "off_share": 0.3637110016420361,
      "defteam": "ARI",
      "def_stall_rate": 47.1,
      "def_pa": 34.0,
      "def_share": 0.4072757706186687,
      "grade": 91.9,
      "proj": 10.1,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game"
      ],
      "off_score_val": 30.1,
      "def_score_val": 46.8,
      "w_team_score": 25.0,
      "w_def_allowed": 25.8,
      "off_cap_val": 10.9,
      "def_cap_val": 12.6
    },
    {
      "kicker_player_name": "A.Szmyt",
      "team": "CLE",
      "fpts": 74,
      "made": 15,
      "att": 18,
      "longs": 2,
      "dome_kicks": 3,
      "total_kicks": 34,
      "games": 10,
      "posteam_x": "CLE",
      "rz_trips": 32,
      "acc": 83.3,
      "dome_pct": 9.0,
      "avg_pts": 7.4,
      "opponent": "LV",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "16:05",
      "spread_line": 3.5,
      "total_line": 36.5,
      "game_dt": "2025-11-23 16:05",
      "vegas": 20.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 16.5,
      "home_field": "LV",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "CLE",
      "off_stall_rate": 75.0,
      "off_ppg": 18.0,
      "off_share": 0.56875,
      "defteam": "LV",
      "def_stall_rate": 38.5,
      "def_pa": 24.333333333333332,
      "def_share": 0.5575757575757576,
      "grade": 120.6,
      "proj": 9.9,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 72.3,
      "def_score_val": 38.3,
      "w_team_score": 19.4,
      "w_def_allowed": 21.3,
      "off_cap_val": 13.2,
      "def_cap_val": 14.3
    },
    {
      "kicker_player_name": "J.Elliott",
      "team": "PHI",
      "fpts": 78,
      "made": 11,
      "att": 13,
      "longs": 3,
      "dome_kicks": 5,
      "total_kicks": 40,
      "games": 10,
      "posteam_x": "PHI",
      "rz_trips": 39,
      "acc": 84.6,
      "dome_pct": 12.0,
      "avg_pts": 7.8,
      "opponent": "DAL",
      "roof": "closed",
      "gameday": "2025-11-23",
      "gametime": "16:25",
      "spread_line": -3.0,
      "total_line": 47.5,
      "game_dt": "2025-11-23 16:25",
      "vegas": 22.25,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 25.25,
      "home_field": "DAL",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "PHI",
      "off_stall_rate": 50.0,
      "off_ppg": 13.0,
      "off_share": 0.54375,
      "defteam": "DAL",
      "def_stall_rate": 50.0,
      "def_pa": 21.5,
      "def_share": 0.5289351851851851,
      "grade": 112.9,
      "proj": 9.8,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game"
      ],
      "off_score_val": 48.2,
      "def_score_val": 49.7,
      "w_team_score": 19.5,
      "w_def_allowed": 22.0,
      "off_cap_val": 12.7,
      "def_cap_val": 14.0
    },
    {
      "kicker_player_name": "D.Carlson",
      "team": "LV",
      "fpts": 84,
      "made": 15,
      "att": 19,
      "longs": 3,
      "dome_kicks": 23,
      "total_kicks": 32,
      "games": 9,
      "posteam_x": "LV",
      "rz_trips": 33,
      "acc": 78.9,
      "dome_pct": 72.0,
      "avg_pts": 9.3,
      "opponent": "CLE",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "16:05",
      "spread_line": 3.5,
      "total_line": 36.5,
      "game_dt": "2025-11-23 16:05",
      "vegas": 16.5,
      "away_imp": 20.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "LV",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "LV",
      "off_stall_rate": 40.0,
      "off_ppg": 17.333333333333332,
      "off_share": 0.5132389162561576,
      "defteam": "CLE",
      "def_stall_rate": 54.5,
      "def_pa": 25.0,
      "def_share": 0.427536231884058,
      "grade": 102.8,
      "proj": 9.8,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 38.6,
      "def_score_val": 54.2,
      "w_team_score": 16.8,
      "w_def_allowed": 19.0,
      "off_cap_val": 10.3,
      "def_cap_val": 9.8
    },
    {
      "kicker_player_name": "T.Loop",
      "team": "BAL",
      "fpts": 100,
      "made": 19,
      "att": 21,
      "longs": 1,
      "dome_kicks": 6,
      "total_kicks": 47,
      "games": 10,
      "posteam_x": "BAL",
      "rz_trips": 50,
      "acc": 90.5,
      "dome_pct": 13.0,
      "avg_pts": 10.0,
      "opponent": "NYJ",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 13.5,
      "total_line": 44.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 15.5,
      "away_imp": 29.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "BAL",
      "is_dome": false,
      "weather_data": [
        8.0,
        "8mph \u2600\ufe0f"
      ],
      "wind": 8.0,
      "weather_desc": "8mph \u2600\ufe0f",
      "posteam_y": "BAL",
      "off_stall_rate": 40.0,
      "off_ppg": 26.0,
      "off_share": 0.4560999923318764,
      "defteam": "NYJ",
      "def_stall_rate": 44.4,
      "def_pa": 23.5,
      "def_share": 0.4842592592592593,
      "grade": 82.7,
      "proj": 9.2,
      "grade_details": [],
      "off_score_val": 38.6,
      "def_score_val": 44.2,
      "w_team_score": 18.6,
      "w_def_allowed": 17.9,
      "off_cap_val": 10.2,
      "def_cap_val": 10.4
    },
    {
      "kicker_player_name": "S.Shrader",
      "team": "IND",
      "fpts": 62,
      "made": 13,
      "att": 14,
      "longs": 1,
      "dome_kicks": 20,
      "total_kicks": 28,
      "games": 5,
      "posteam_x": "IND",
      "rz_trips": 55,
      "acc": 92.9,
      "dome_pct": 71.0,
      "avg_pts": 12.4,
      "opponent": "KC",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 3.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 27.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 23.5,
      "home_field": "KC",
      "is_dome": false,
      "weather_data": [
        4.0,
        "4mph \u2600\ufe0f"
      ],
      "wind": 4.0,
      "weather_desc": "4mph \u2600\ufe0f",
      "posteam_y": "IND",
      "off_stall_rate": 22.2,
      "off_ppg": 25.5,
      "off_share": 0.4935483870967742,
      "defteam": "KC",
      "def_stall_rate": 44.4,
      "def_pa": 25.0,
      "def_share": 0.5698051948051949,
      "grade": 65.6,
      "proj": 9.0,
      "grade_details": [],
      "off_score_val": 21.4,
      "def_score_val": 44.2,
      "w_team_score": 26.5,
      "w_def_allowed": 26.4,
      "off_cap_val": 15.7,
      "def_cap_val": 18.1
    },
    {
      "kicker_player_name": "C.Ryland",
      "team": "ARI",
      "fpts": 94,
      "made": 16,
      "att": 19,
      "longs": 2,
      "dome_kicks": 35,
      "total_kicks": 41,
      "games": 10,
      "posteam_x": "ARI",
      "rz_trips": 47,
      "acc": 84.2,
      "dome_pct": 85.0,
      "avg_pts": 9.4,
      "opponent": "JAX",
      "roof": "closed",
      "gameday": "2025-11-23",
      "gametime": "16:05",
      "spread_line": -3.0,
      "total_line": 47.5,
      "game_dt": "2025-11-23 16:05",
      "vegas": 25.25,
      "away_imp": 22.25,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "ARI",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "ARI",
      "off_stall_rate": 31.2,
      "off_ppg": 23.666666666666668,
      "off_share": 0.29012345679012347,
      "defteam": "JAX",
      "def_stall_rate": 33.3,
      "def_pa": 23.666666666666668,
      "def_share": 0.5274584929757343,
      "grade": 78.2,
      "proj": 8.2,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game"
      ],
      "off_score_val": 30.1,
      "def_score_val": 33.1,
      "w_team_score": 24.8,
      "w_def_allowed": 24.8,
      "off_cap_val": 8.6,
      "def_cap_val": 15.7
    },
    {
      "kicker_player_name": "C.McLaughlin",
      "team": "TB",
      "fpts": 109,
      "made": 20,
      "att": 24,
      "longs": 8,
      "dome_kicks": 14,
      "total_kicks": 45,
      "games": 10,
      "posteam_x": "TB",
      "rz_trips": 44,
      "acc": 83.3,
      "dome_pct": 31.0,
      "avg_pts": 10.9,
      "opponent": "LA",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "20:20",
      "spread_line": 6.5,
      "total_line": 49.5,
      "game_dt": "2025-11-23 20:20",
      "vegas": 28.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 21.5,
      "home_field": "LA",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "TB",
      "off_stall_rate": 30.0,
      "off_ppg": 27.5,
      "off_share": 0.23369565217391303,
      "defteam": "LA",
      "def_stall_rate": 46.2,
      "def_pa": 18.333333333333332,
      "def_share": 0.49703103913630226,
      "grade": 89.9,
      "proj": 7.8,
      "grade_details": [
        "+10 Dome",
        "+5 Elite Talent"
      ],
      "off_score_val": 28.9,
      "def_score_val": 45.9,
      "w_team_score": 27.8,
      "w_def_allowed": 25.1,
      "off_cap_val": 7.8,
      "def_cap_val": 15.0
    },
    {
      "kicker_player_name": "G.Gano",
      "team": "NYG",
      "fpts": 43,
      "made": 9,
      "att": 10,
      "longs": 1,
      "dome_kicks": 7,
      "total_kicks": 19,
      "games": 5,
      "posteam_x": "NYG",
      "rz_trips": 50,
      "acc": 90.0,
      "dome_pct": 37.0,
      "avg_pts": 8.6,
      "opponent": "DET",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 10.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 30.5,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 20.0,
      "home_field": "DET",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "NYG",
      "off_stall_rate": 35.7,
      "off_ppg": 21.333333333333332,
      "off_share": 0.2888888888888889,
      "defteam": "DET",
      "def_stall_rate": 36.4,
      "def_pa": 21.666666666666668,
      "def_share": 0.4407267115600449,
      "grade": 80.6,
      "proj": 7.7,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 34.4,
      "def_score_val": 36.2,
      "w_team_score": 27.7,
      "w_def_allowed": 27.8,
      "off_cap_val": 9.6,
      "def_cap_val": 14.7
    },
    {
      "kicker_player_name": "H.Butker",
      "team": "KC",
      "fpts": 90,
      "made": 16,
      "att": 19,
      "longs": 3,
      "dome_kicks": 4,
      "total_kicks": 47,
      "games": 10,
      "posteam_x": "KC",
      "rz_trips": 47,
      "acc": 84.2,
      "dome_pct": 9.0,
      "avg_pts": 9.0,
      "opponent": "IND",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 3.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 23.5,
      "away_imp": 27.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "KC",
      "is_dome": false,
      "weather_data": [
        4.0,
        "4mph \u2600\ufe0f"
      ],
      "wind": 4.0,
      "weather_desc": "4mph \u2600\ufe0f",
      "posteam_y": "KC",
      "off_stall_rate": 37.5,
      "off_ppg": 20.0,
      "off_share": 0.3483709273182957,
      "defteam": "IND",
      "def_stall_rate": 40.0,
      "def_pa": 26.0,
      "def_share": 0.30518518518518517,
      "grade": 75.9,
      "proj": 7.6,
      "grade_details": [],
      "off_score_val": 36.2,
      "def_score_val": 39.8,
      "w_team_score": 22.4,
      "w_def_allowed": 24.2,
      "off_cap_val": 9.4,
      "def_cap_val": 8.9
    },
    {
      "kicker_player_name": "N.Folk",
      "team": "NYJ",
      "fpts": 86,
      "made": 19,
      "att": 19,
      "longs": 5,
      "dome_kicks": 0,
      "total_kicks": 33,
      "games": 10,
      "posteam_x": "NYJ",
      "rz_trips": 38,
      "acc": 100.0,
      "dome_pct": 0.0,
      "avg_pts": 8.6,
      "opponent": "BAL",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 13.5,
      "total_line": 44.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 29.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 15.5,
      "home_field": "BAL",
      "is_dome": false,
      "weather_data": [
        8.0,
        "8mph \u2600\ufe0f"
      ],
      "wind": 8.0,
      "weather_desc": "8mph \u2600\ufe0f",
      "posteam_y": "NYJ",
      "off_stall_rate": 50.0,
      "off_ppg": 20.5,
      "off_share": 0.23809523809523808,
      "defteam": "BAL",
      "def_stall_rate": 75.0,
      "def_pa": 13.666666666666666,
      "def_share": 0.7759502923976608,
      "grade": 122.8,
      "proj": 7.6,
      "grade_details": [],
      "off_score_val": 48.2,
      "def_score_val": 74.6,
      "w_team_score": 26.4,
      "w_def_allowed": 24.4,
      "off_cap_val": 7.6,
      "def_cap_val": 22.7
    },
    {
      "kicker_player_name": "B.Grupe",
      "team": "NO",
      "fpts": 95,
      "made": 17,
      "att": 23,
      "longs": 3,
      "dome_kicks": 24,
      "total_kicks": 37,
      "games": 10,
      "posteam_x": "NO",
      "rz_trips": 36,
      "acc": 73.9,
      "dome_pct": 65.0,
      "avg_pts": 9.5,
      "opponent": "ATL",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "16:25",
      "spread_line": 2.5,
      "total_line": 40.5,
      "game_dt": "2025-11-23 16:25",
      "vegas": 19.0,
      "away_imp": 21.5,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "NO",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "NO",
      "off_stall_rate": 50.0,
      "off_ppg": 13.5,
      "off_share": 0.34705882352941175,
      "defteam": "ATL",
      "def_stall_rate": 38.9,
      "def_pa": 28.333333333333332,
      "def_share": 0.3234767025089606,
      "grade": 101.9,
      "proj": 7.2,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game"
      ],
      "off_score_val": 48.2,
      "def_score_val": 38.7,
      "w_team_score": 17.3,
      "w_def_allowed": 21.8,
      "off_cap_val": 7.2,
      "def_cap_val": 8.5
    },
    {
      "kicker_player_name": "M.Wright",
      "team": "HOU",
      "fpts": 22,
      "made": 5,
      "att": 5,
      "longs": 0,
      "dome_kicks": 4,
      "total_kicks": 9,
      "games": 4,
      "posteam_x": "HOU",
      "rz_trips": 50,
      "acc": 100.0,
      "dome_pct": 44.0,
      "avg_pts": 5.5,
      "opponent": "BUF",
      "roof": "closed",
      "gameday": "2025-11-20",
      "gametime": "20:15",
      "spread_line": -5.5,
      "total_line": 43.5,
      "game_dt": "2025-11-20 20:15",
      "vegas": 24.5,
      "away_imp": 19.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "HOU",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "HOU",
      "off_stall_rate": 66.7,
      "off_ppg": 22.5,
      "off_share": 0.7290458937198068,
      "defteam": "BUF",
      "def_stall_rate": 36.8,
      "def_pa": 26.5,
      "def_share": 0.33817287784679084,
      "grade": 110.9,
      "proj": 6.8,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 64.3,
      "def_score_val": 36.6,
      "w_team_score": 23.9,
      "w_def_allowed": 25.1,
      "off_cap_val": 20.9,
      "def_cap_val": 10.2
    },
    {
      "kicker_player_name": "E.Pineiro",
      "team": "SF",
      "fpts": 100,
      "made": 22,
      "att": 22,
      "longs": 6,
      "dome_kicks": 19,
      "total_kicks": 44,
      "games": 10,
      "posteam_x": "SF",
      "rz_trips": 48,
      "acc": 100.0,
      "dome_pct": 43.0,
      "avg_pts": 10.0,
      "opponent": "CAR",
      "roof": "outdoors",
      "gameday": "2025-11-24",
      "gametime": "20:15",
      "spread_line": 7.0,
      "total_line": 49.5,
      "game_dt": "2025-11-24 20:15",
      "vegas": 21.25,
      "away_imp": 28.25,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "SF",
      "is_dome": false,
      "weather_data": [
        5.6,
        "5mph \u2600\ufe0f"
      ],
      "wind": 5.6,
      "weather_desc": "5mph \u2600\ufe0f",
      "posteam_y": "SF",
      "off_stall_rate": 18.8,
      "off_ppg": 33.666666666666664,
      "off_share": 0.2280285472537983,
      "defteam": "CAR",
      "def_stall_rate": 46.2,
      "def_pa": 19.0,
      "def_share": 0.5538796715267303,
      "grade": 64.1,
      "proj": 6.8,
      "grade_details": [],
      "off_score_val": 18.1,
      "def_score_val": 45.9,
      "w_team_score": 25.0,
      "w_def_allowed": 20.6,
      "off_cap_val": 6.8,
      "def_cap_val": 13.7
    },
    {
      "kicker_player_name": "M.Badgley",
      "team": "IND",
      "fpts": 46,
      "made": 7,
      "att": 8,
      "longs": 2,
      "dome_kicks": 21,
      "total_kicks": 25,
      "games": 5,
      "posteam_x": "IND",
      "rz_trips": 55,
      "acc": 87.5,
      "dome_pct": 84.0,
      "avg_pts": 9.2,
      "opponent": "KC",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 3.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 27.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 23.5,
      "home_field": "KC",
      "is_dome": false,
      "weather_data": [
        4.0,
        "4mph \u2600\ufe0f"
      ],
      "wind": 4.0,
      "weather_desc": "4mph \u2600\ufe0f",
      "posteam_y": "IND",
      "off_stall_rate": 22.2,
      "off_ppg": 25.5,
      "off_share": 0.4935483870967742,
      "defteam": "KC",
      "def_stall_rate": 44.4,
      "def_pa": 25.0,
      "def_share": 0.5698051948051949,
      "grade": 65.6,
      "proj": 6.7,
      "grade_details": [],
      "off_score_val": 21.4,
      "def_score_val": 44.2,
      "w_team_score": 26.5,
      "w_def_allowed": 26.4,
      "off_cap_val": 15.7,
      "def_cap_val": 18.1
    },
    {
      "kicker_player_name": "L.Havrisik",
      "team": "GB",
      "fpts": 20,
      "made": 4,
      "att": 4,
      "longs": 1,
      "dome_kicks": 5,
      "total_kicks": 13,
      "games": 3,
      "posteam_x": "GB",
      "rz_trips": 45,
      "acc": 100.0,
      "dome_pct": 38.0,
      "avg_pts": 6.7,
      "opponent": "MIN",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 6.5,
      "total_line": 41.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 17.5,
      "away_imp": 24.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "GB",
      "is_dome": false,
      "weather_data": [
        9.6,
        "9mph \u2600\ufe0f"
      ],
      "wind": 9.6,
      "weather_desc": "9mph \u2600\ufe0f",
      "posteam_y": "GB",
      "off_stall_rate": 36.4,
      "off_ppg": 15.666666666666666,
      "off_share": 0.5810609143942477,
      "defteam": "MIN",
      "def_stall_rate": 53.8,
      "def_pa": 23.333333333333332,
      "def_share": 0.7382228719948017,
      "grade": 88.6,
      "proj": 6.6,
      "grade_details": [],
      "off_score_val": 35.1,
      "def_score_val": 53.5,
      "w_team_score": 16.9,
      "w_def_allowed": 19.2,
      "off_cap_val": 11.8,
      "def_cap_val": 17.1
    },
    {
      "kicker_player_name": "Y.Koo",
      "team": "NYG",
      "fpts": 22,
      "made": 4,
      "att": 5,
      "longs": 0,
      "dome_kicks": 5,
      "total_kicks": 12,
      "games": 3,
      "posteam_x": "NYG",
      "rz_trips": 50,
      "acc": 80.0,
      "dome_pct": 42.0,
      "avg_pts": 7.3,
      "opponent": "DET",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 10.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 30.5,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 20.0,
      "home_field": "DET",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "NYG",
      "off_stall_rate": 35.7,
      "off_ppg": 21.333333333333332,
      "off_share": 0.2888888888888889,
      "defteam": "DET",
      "def_stall_rate": 36.4,
      "def_pa": 21.666666666666668,
      "def_share": 0.4407267115600449,
      "grade": 80.6,
      "proj": 6.5,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 34.4,
      "def_score_val": 36.2,
      "w_team_score": 27.7,
      "w_def_allowed": 27.8,
      "off_cap_val": 9.6,
      "def_cap_val": 14.7
    },
    {
      "kicker_player_name": "M.Prater",
      "team": "BUF",
      "fpts": 87,
      "made": 15,
      "att": 17,
      "longs": 1,
      "dome_kicks": 6,
      "total_kicks": 51,
      "games": 11,
      "posteam_x": "BUF",
      "rz_trips": 57,
      "acc": 88.2,
      "dome_pct": 12.0,
      "avg_pts": 7.9,
      "opponent": "HOU",
      "roof": "closed",
      "gameday": "2025-11-20",
      "gametime": "20:15",
      "spread_line": -5.5,
      "total_line": 43.5,
      "game_dt": "2025-11-20 20:15",
      "vegas": 19.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 24.5,
      "home_field": "HOU",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "BUF",
      "off_stall_rate": 20.0,
      "off_ppg": 26.0,
      "off_share": 0.23714772070035228,
      "defteam": "HOU",
      "def_stall_rate": 46.7,
      "def_pa": 19.75,
      "def_share": 0.5214819209828284,
      "grade": 75.7,
      "proj": 6.0,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 19.3,
      "def_score_val": 46.4,
      "w_team_score": 21.1,
      "w_def_allowed": 19.2,
      "off_cap_val": 6.0,
      "def_cap_val": 12.0
    },
    {
      "kicker_player_name": "W.Reichard",
      "team": "MIN",
      "fpts": 101,
      "made": 19,
      "att": 21,
      "longs": 6,
      "dome_kicks": 30,
      "total_kicks": 40,
      "games": 10,
      "posteam_x": "MIN",
      "rz_trips": 37,
      "acc": 90.5,
      "dome_pct": 75.0,
      "avg_pts": 10.1,
      "opponent": "GB",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 6.5,
      "total_line": 41.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 24.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 17.5,
      "home_field": "GB",
      "is_dome": false,
      "weather_data": [
        9.6,
        "9mph \u2600\ufe0f"
      ],
      "wind": 9.6,
      "weather_desc": "9mph \u2600\ufe0f",
      "posteam_y": "MIN",
      "off_stall_rate": 41.7,
      "off_ppg": 21.0,
      "off_share": 0.39173642166418227,
      "defteam": "GB",
      "def_stall_rate": 18.2,
      "def_pa": 15.333333333333334,
      "def_share": 0.2333333333333333,
      "grade": 63.3,
      "proj": 6.0,
      "grade_details": [
        "+5 Elite Talent"
      ],
      "off_score_val": 40.2,
      "def_score_val": 18.1,
      "w_team_score": 23.1,
      "w_def_allowed": 21.4,
      "off_cap_val": 10.9,
      "def_cap_val": 6.0
    },
    {
      "kicker_player_name": "E.McPherson",
      "team": "CIN",
      "fpts": 92,
      "made": 15,
      "att": 18,
      "longs": 1,
      "dome_kicks": 2,
      "total_kicks": 41,
      "games": 10,
      "posteam_x": "CIN",
      "rz_trips": 39,
      "acc": 83.3,
      "dome_pct": 5.0,
      "avg_pts": 9.2,
      "opponent": "NE",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": -5.5,
      "total_line": 51.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 28.5,
      "away_imp": 23.0,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "CIN",
      "is_dome": false,
      "weather_data": [
        7.5,
        "7mph \u2600\ufe0f"
      ],
      "wind": 7.5,
      "weather_desc": "7mph \u2600\ufe0f",
      "posteam_y": "CIN",
      "off_stall_rate": 41.7,
      "off_ppg": 27.0,
      "off_share": 0.5238095238095237,
      "defteam": "NE",
      "def_stall_rate": 27.3,
      "def_pa": 20.0,
      "def_share": 0.17805383022774326,
      "grade": 67.4,
      "proj": 5.5,
      "grade_details": [],
      "off_score_val": 40.2,
      "def_score_val": 27.2,
      "w_team_score": 28.0,
      "w_def_allowed": 25.9,
      "off_cap_val": 17.6,
      "def_cap_val": 5.5
    },
    {
      "kicker_player_name": "A.Borregales",
      "team": "NE",
      "fpts": 89,
      "made": 15,
      "att": 17,
      "longs": 2,
      "dome_kicks": 3,
      "total_kicks": 50,
      "games": 11,
      "posteam_x": "NE",
      "rz_trips": 54,
      "acc": 88.2,
      "dome_pct": 6.0,
      "avg_pts": 8.1,
      "opponent": "CIN",
      "roof": "outdoors",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": -5.5,
      "total_line": 51.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 23.0,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 28.5,
      "home_field": "CIN",
      "is_dome": false,
      "weather_data": [
        7.5,
        "7mph \u2600\ufe0f"
      ],
      "wind": 7.5,
      "weather_desc": "7mph \u2600\ufe0f",
      "posteam_y": "NE",
      "off_stall_rate": 21.4,
      "off_ppg": 26.333333333333332,
      "off_share": 0.3037918871252205,
      "defteam": "CIN",
      "def_stall_rate": 38.5,
      "def_pa": 40.5,
      "def_share": 0.30663329161451813,
      "grade": 58.9,
      "proj": 5.3,
      "grade_details": [],
      "off_score_val": 20.6,
      "def_score_val": 38.3,
      "w_team_score": 24.0,
      "w_def_allowed": 28.2,
      "off_cap_val": 8.7,
      "def_cap_val": 10.4
    },
    {
      "kicker_player_name": "J.Bates",
      "team": "DET",
      "fpts": 99,
      "made": 13,
      "att": 17,
      "longs": 3,
      "dome_kicks": 25,
      "total_kicks": 52,
      "games": 10,
      "posteam_x": "DET",
      "rz_trips": 49,
      "acc": 76.5,
      "dome_pct": 48.0,
      "avg_pts": 9.9,
      "opponent": "NYG",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "13:00",
      "spread_line": 10.5,
      "total_line": 50.5,
      "game_dt": "2025-11-23 13:00",
      "vegas": 20.0,
      "away_imp": 30.5,
      "is_home": true,
      "home_imp": 0.0,
      "home_field": "DET",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "DET",
      "off_stall_rate": 38.5,
      "off_ppg": 25.666666666666668,
      "off_share": 0.3918350168350168,
      "defteam": "NYG",
      "def_stall_rate": 15.4,
      "def_pa": 28.333333333333332,
      "def_share": 0.18863471314451707,
      "grade": 62.4,
      "proj": 5.1,
      "grade_details": [
        "+10 Dome"
      ],
      "off_score_val": 37.1,
      "def_score_val": 15.3,
      "w_team_score": 21.7,
      "w_def_allowed": 22.5,
      "off_cap_val": 10.2,
      "def_cap_val": 5.1
    },
    {
      "kicker_player_name": "Z.Gonzalez",
      "team": "ATL",
      "fpts": 18,
      "made": 3,
      "att": 3,
      "longs": 1,
      "dome_kicks": 8,
      "total_kicks": 8,
      "games": 2,
      "posteam_x": "ATL",
      "rz_trips": 37,
      "acc": 100.0,
      "dome_pct": 100.0,
      "avg_pts": 9.0,
      "opponent": "NO",
      "roof": "dome",
      "gameday": "2025-11-23",
      "gametime": "16:25",
      "spread_line": 2.5,
      "total_line": 40.5,
      "game_dt": "2025-11-23 16:25",
      "vegas": 21.5,
      "away_imp": 0.0,
      "is_home": false,
      "home_imp": 19.0,
      "home_field": "NO",
      "is_dome": true,
      "weather_data": [
        0,
        "Dome"
      ],
      "wind": 0.0,
      "weather_desc": "Dome",
      "posteam_y": "ATL",
      "off_stall_rate": 18.2,
      "off_ppg": 25.0,
      "off_share": 0.28611916264090176,
      "defteam": "NO",
      "def_stall_rate": 12.5,
      "def_pa": 20.5,
      "def_share": 0.3865546218487395,
      "grade": 45.0,
      "proj": 4.5,
      "grade_details": [
        "+10 Dome",
        "+5 Tight Game"
      ],
      "off_score_val": 17.5,
      "def_score_val": 12.4,
      "w_team_score": 22.5,
      "w_def_allowed": 21.2,
      "off_cap_val": 7.7,
      "def_cap_val": 9.8
    }
  ],
  "ytd": [
    {
      "kicker_player_name": "J.Myers",
      "team": "SEA",
      "fpts": 130,
      "made": 21,
      "att": 26,
      "longs": 5,
      "dome_kicks": 12,
      "total_kicks": 59,
      "games": 10,
      "posteam": "SEA",
      "rz_trips": 48,
      "acc": 80.8,
      "dome_pct": 20.0,
      "avg_pts": 13.0
    },
    {
      "kicker_player_name": "K.Fairbairn",
      "team": "HOU",
      "fpts": 122,
      "made": 25,
      "att": 28,
      "longs": 5,
      "dome_kicks": 28,
      "total_kicks": 42,
      "games": 9,
      "posteam": "HOU",
      "rz_trips": 50,
      "acc": 89.3,
      "dome_pct": 67.0,
      "avg_pts": 13.6
    },
    {
      "kicker_player_name": "C.Dicker",
      "team": "LAC",
      "fpts": 121,
      "made": 25,
      "att": 27,
      "longs": 3,
      "dome_kicks": 34,
      "total_kicks": 50,
      "games": 11,
      "posteam": "LAC",
      "rz_trips": 51,
      "acc": 92.6,
      "dome_pct": 68.0,
      "avg_pts": 11.0
    },
    {
      "kicker_player_name": "C.Boswell",
      "team": "PIT",
      "fpts": 112,
      "made": 19,
      "att": 22,
      "longs": 7,
      "dome_kicks": 3,
      "total_kicks": 47,
      "games": 10,
      "posteam": "PIT",
      "rz_trips": 41,
      "acc": 86.4,
      "dome_pct": 6.0,
      "avg_pts": 11.2
    },
    {
      "kicker_player_name": "C.McLaughlin",
      "team": "TB",
      "fpts": 109,
      "made": 20,
      "att": 24,
      "longs": 8,
      "dome_kicks": 14,
      "total_kicks": 45,
      "games": 10,
      "posteam": "TB",
      "rz_trips": 44,
      "acc": 83.3,
      "dome_pct": 31.0,
      "avg_pts": 10.9
    },
    {
      "kicker_player_name": "J.Slye",
      "team": "TEN",
      "fpts": 109,
      "made": 19,
      "att": 24,
      "longs": 7,
      "dome_kicks": 10,
      "total_kicks": 35,
      "games": 9,
      "posteam": "TEN",
      "rz_trips": 25,
      "acc": 79.2,
      "dome_pct": 29.0,
      "avg_pts": 12.1
    },
    {
      "kicker_player_name": "B.Aubrey",
      "team": "DAL",
      "fpts": 106,
      "made": 18,
      "att": 19,
      "longs": 6,
      "dome_kicks": 31,
      "total_kicks": 52,
      "games": 10,
      "posteam": "DAL",
      "rz_trips": 52,
      "acc": 94.7,
      "dome_pct": 60.0,
      "avg_pts": 10.6
    },
    {
      "kicker_player_name": "W.Reichard",
      "team": "MIN",
      "fpts": 101,
      "made": 19,
      "att": 21,
      "longs": 6,
      "dome_kicks": 30,
      "total_kicks": 40,
      "games": 10,
      "posteam": "MIN",
      "rz_trips": 37,
      "acc": 90.5,
      "dome_pct": 75.0,
      "avg_pts": 10.1
    },
    {
      "kicker_player_name": "T.Loop",
      "team": "BAL",
      "fpts": 100,
      "made": 19,
      "att": 21,
      "longs": 1,
      "dome_kicks": 6,
      "total_kicks": 47,
      "games": 10,
      "posteam": "BAL",
      "rz_trips": 50,
      "acc": 90.5,
      "dome_pct": 13.0,
      "avg_pts": 10.0
    },
    {
      "kicker_player_name": "E.Pineiro",
      "team": "SF",
      "fpts": 100,
      "made": 22,
      "att": 22,
      "longs": 6,
      "dome_kicks": 19,
      "total_kicks": 44,
      "games": 10,
      "posteam": "SF",
      "rz_trips": 48,
      "acc": 100.0,
      "dome_pct": 43.0,
      "avg_pts": 10.0
    },
    {
      "kicker_player_name": "C.Little",
      "team": "JAX",
      "fpts": 99,
      "made": 16,
      "att": 20,
      "longs": 3,
      "dome_kicks": 11,
      "total_kicks": 45,
      "games": 10,
      "posteam": "JAX",
      "rz_trips": 47,
      "acc": 80.0,
      "dome_pct": 24.0,
      "avg_pts": 9.9
    },
    {
      "kicker_player_name": "J.Bates",
      "team": "DET",
      "fpts": 99,
      "made": 13,
      "att": 17,
      "longs": 3,
      "dome_kicks": 25,
      "total_kicks": 52,
      "games": 10,
      "posteam": "DET",
      "rz_trips": 49,
      "acc": 76.5,
      "dome_pct": 48.0,
      "avg_pts": 9.9
    },
    {
      "kicker_player_name": "C.Santos",
      "team": "CHI",
      "fpts": 98,
      "made": 16,
      "att": 20,
      "longs": 3,
      "dome_kicks": 14,
      "total_kicks": 41,
      "games": 8,
      "posteam": "CHI",
      "rz_trips": 52,
      "acc": 80.0,
      "dome_pct": 34.0,
      "avg_pts": 12.2
    },
    {
      "kicker_player_name": "M.Gay",
      "team": "WAS",
      "fpts": 98,
      "made": 13,
      "att": 19,
      "longs": 4,
      "dome_kicks": 12,
      "total_kicks": 41,
      "games": 10,
      "posteam": "WAS",
      "rz_trips": 42,
      "acc": 68.4,
      "dome_pct": 29.0,
      "avg_pts": 9.8
    },
    {
      "kicker_player_name": "W.Lutz",
      "team": "DEN",
      "fpts": 97,
      "made": 17,
      "att": 20,
      "longs": 3,
      "dome_kicks": 12,
      "total_kicks": 44,
      "games": 11,
      "posteam": "DEN",
      "rz_trips": 47,
      "acc": 85.0,
      "dome_pct": 27.0,
      "avg_pts": 8.8
    },
    {
      "kicker_player_name": "B.Grupe",
      "team": "NO",
      "fpts": 95,
      "made": 17,
      "att": 23,
      "longs": 3,
      "dome_kicks": 24,
      "total_kicks": 37,
      "games": 10,
      "posteam": "NO",
      "rz_trips": 36,
      "acc": 73.9,
      "dome_pct": 65.0,
      "avg_pts": 9.5
    },
    {
      "kicker_player_name": "C.Ryland",
      "team": "ARI",
      "fpts": 94,
      "made": 16,
      "att": 19,
      "longs": 2,
      "dome_kicks": 35,
      "total_kicks": 41,
      "games": 10,
      "posteam": "ARI",
      "rz_trips": 47,
      "acc": 84.2,
      "dome_pct": 85.0,
      "avg_pts": 9.4
    },
    {
      "kicker_player_name": "E.McPherson",
      "team": "CIN",
      "fpts": 92,
      "made": 15,
      "att": 18,
      "longs": 1,
      "dome_kicks": 2,
      "total_kicks": 41,
      "games": 10,
      "posteam": "CIN",
      "rz_trips": 39,
      "acc": 83.3,
      "dome_pct": 5.0,
      "avg_pts": 9.2
    },
    {
      "kicker_player_name": "H.Butker",
      "team": "KC",
      "fpts": 90,
      "made": 16,
      "att": 19,
      "longs": 3,
      "dome_kicks": 4,
      "total_kicks": 47,
      "games": 10,
      "posteam": "KC",
      "rz_trips": 47,
      "acc": 84.2,
      "dome_pct": 9.0,
      "avg_pts": 9.0
    },
    {
      "kicker_player_name": "A.Borregales",
      "team": "NE",
      "fpts": 89,
      "made": 15,
      "att": 17,
      "longs": 2,
      "dome_kicks": 3,
      "total_kicks": 50,
      "games": 11,
      "posteam": "NE",
      "rz_trips": 54,
      "acc": 88.2,
      "dome_pct": 6.0,
      "avg_pts": 8.1
    },
    {
      "kicker_player_name": "M.Prater",
      "team": "BUF",
      "fpts": 87,
      "made": 15,
      "att": 17,
      "longs": 1,
      "dome_kicks": 6,
      "total_kicks": 51,
      "games": 11,
      "posteam": "BUF",
      "rz_trips": 57,
      "acc": 88.2,
      "dome_pct": 12.0,
      "avg_pts": 7.9
    },
    {
      "kicker_player_name": "R.Patterson",
      "team": "MIA",
      "fpts": 86,
      "made": 17,
      "att": 19,
      "longs": 0,
      "dome_kicks": 6,
      "total_kicks": 43,
      "games": 10,
      "posteam": "MIA",
      "rz_trips": 45,
      "acc": 89.5,
      "dome_pct": 14.0,
      "avg_pts": 8.6
    },
    {
      "kicker_player_name": "N.Folk",
      "team": "NYJ",
      "fpts": 86,
      "made": 19,
      "att": 19,
      "longs": 5,
      "dome_kicks": 0,
      "total_kicks": 33,
      "games": 10,
      "posteam": "NYJ",
      "rz_trips": 38,
      "acc": 100.0,
      "dome_pct": 0.0,
      "avg_pts": 8.6
    },
    {
      "kicker_player_name": "D.Carlson",
      "team": "LV",
      "fpts": 84,
      "made": 15,
      "att": 19,
      "longs": 3,
      "dome_kicks": 23,
      "total_kicks": 32,
      "games": 9,
      "posteam": "LV",
      "rz_trips": 33,
      "acc": 78.9,
      "dome_pct": 72.0,
      "avg_pts": 9.3
    },
    {
      "kicker_player_name": "R.Fitzgerald",
      "team": "CAR",
      "fpts": 81,
      "made": 17,
      "att": 20,
      "longs": 2,
      "dome_kicks": 6,
      "total_kicks": 39,
      "games": 11,
      "posteam": "CAR",
      "rz_trips": 41,
      "acc": 85.0,
      "dome_pct": 15.0,
      "avg_pts": 7.4
    },
    {
      "kicker_player_name": "B.McManus",
      "team": "GB",
      "fpts": 79,
      "made": 11,
      "att": 17,
      "longs": 2,
      "dome_kicks": 7,
      "total_kicks": 34,
      "games": 7,
      "posteam": "GB",
      "rz_trips": 45,
      "acc": 64.7,
      "dome_pct": 21.0,
      "avg_pts": 11.3
    },
    {
      "kicker_player_name": "J.Elliott",
      "team": "PHI",
      "fpts": 78,
      "made": 11,
      "att": 13,
      "longs": 3,
      "dome_kicks": 5,
      "total_kicks": 40,
      "games": 10,
      "posteam": "PHI",
      "rz_trips": 39,
      "acc": 84.6,
      "dome_pct": 12.0,
      "avg_pts": 7.8
    },
    {
      "kicker_player_name": "A.Szmyt",
      "team": "CLE",
      "fpts": 74,
      "made": 15,
      "att": 18,
      "longs": 2,
      "dome_kicks": 3,
      "total_kicks": 34,
      "games": 10,
      "posteam": "CLE",
      "rz_trips": 32,
      "acc": 83.3,
      "dome_pct": 9.0,
      "avg_pts": 7.4
    },
    {
      "kicker_player_name": "S.Shrader",
      "team": "IND",
      "fpts": 62,
      "made": 13,
      "att": 14,
      "longs": 1,
      "dome_kicks": 20,
      "total_kicks": 28,
      "games": 5,
      "posteam": "IND",
      "rz_trips": 55,
      "acc": 92.9,
      "dome_pct": 71.0,
      "avg_pts": 12.4
    },
    {
      "kicker_player_name": "J.Karty",
      "team": "LA",
      "fpts": 61,
      "made": 10,
      "att": 15,
      "longs": 1,
      "dome_kicks": 18,
      "total_kicks": 41,
      "games": 8,
      "posteam": "LA",
      "rz_trips": 53,
      "acc": 66.7,
      "dome_pct": 44.0,
      "avg_pts": 7.6
    }
  ]
};
// --- END GENERATED DATA ---

// --- COMPONENT: HEADER CELL ---
const HeaderCell = ({ label, description, avg }) => (
  <th className="px-3 py-3 text-center group relative cursor-help">
    <div className="flex items-center justify-center gap-1">
      {label}
      <Info className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl text-xs normal-case font-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      <div className="text-white font-semibold mb-1">{description}</div>
      {avg !== undefined && <div className="text-blue-300">League Avg: {Number(avg).toFixed(1)}</div>}
      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
    </div>
  </th>
);

// --- COMPONENT: DEEP DIVE ROW ---
const DeepDiveRow = ({ player }) => (
  <tr className="bg-slate-900/50 border-b border-slate-800">
    <td colSpan="10" className="p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Math Worksheet: {player.kicker_player_name}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Grade Breakdown */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
            <div className="text-slate-400 font-semibold mb-2">1. GRADE CALCULATION</div>
            <div className="flex justify-between mb-1"><span>Offense Score:</span> <span className="text-blue-300">{player.off_score_val}</span></div>
            <div className="flex justify-between mb-1"><span>Defense Score:</span> <span className="text-blue-300">{player.def_score_val}</span></div>
            <div className="flex justify-between mb-1 border-b border-slate-800 pb-1">
              <span>Bonuses:</span> 
              <span className="text-emerald-400 text-[10px] text-right ml-2">
                {player.grade_details && player.grade_details.length > 0 ? player.grade_details.join(', ') : "None"}
              </span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-white">
              <span>Total Grade:</span> <span>{player.grade}</span>
            </div>
          </div>

          {/* 2. Reality Check Caps */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50">
            <div className="text-slate-400 font-semibold mb-2">2. WEIGHTED PROJECTION</div>
            <div className="flex justify-between mb-1">
              <span>Base (50%):</span> 
              <span className="text-slate-300">{((player.avg_pts * (player.grade/90))).toFixed(1)} pts</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Offense Est (30%):</span> 
              <span className="text-amber-400">{player.off_cap_val} pts</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Defense Est (20%):</span> 
              <span className="text-amber-400">{player.def_cap_val} pts</span>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-800 pt-1">
              <div>Off Share: {(player.off_share * 100).toFixed(0)}% | Def Share: {(player.def_share * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* 3. Final Logic */}
          <div className="bg-slate-900 p-3 rounded border border-slate-800/50 flex flex-col justify-center items-center text-center">
             <div className="text-slate-400 font-semibold mb-1">FINAL PROJECTION</div>
             <div className="text-2xl font-bold text-emerald-400">{player.proj}</div>
             <div className="text-[10px] text-slate-500 mt-1">Combined Weighted Score</div>
          </div>
        </div>
      </div>
    </td>
  </tr>
);

const App = () => {
  const [data, setData] = useState(GENERATED_DATA);
  const [activeTab, setActiveTab] = useState('potential');
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Uncomment this useEffect for production deployment to fetch live JSON
  /*
  useEffect(() => {
    fetch('./kicker_data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to load data file");
        }
        return response.json();
      })
      .then(jsonData => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading JSON:", err);
        setError("Could not load 'kicker_data.json'. Using backup data.");
        setLoading(false);
      });
  }, []);
  */

  const toggleRow = (rank) => {
    setExpandedRow(expandedRow === rank ? null : rank);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 animate-pulse">Loading Kicker Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Data Not Found</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <p className="text-sm text-slate-600">Run your Python script to generate the JSON file.</p>
      </div>
    );
  }

  const { rankings, ytd, meta } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Kicker<span className="text-blue-500">Genius</span>
            </h1>
            <p className="text-slate-400">Advanced Stall Rate Analytics & Fantasy Projections</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3 shadow-sm">
            <div className="bg-blue-500/10 p-2 rounded-md">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last Updated</div>
              <div className="text-sm font-semibold text-white">{meta.updated} (Week {meta.week})</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('potential')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'potential' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Week {meta.week} Model
            </div>
            {activeTab === 'potential' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('ytd')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'ytd' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Historical YTD
            </div>
            {activeTab === 'ytd' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setActiveTab('glossary')}
            className={`pb-3 px-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'glossary' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Stats Legend
            </div>
            {activeTab === 'glossary' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></div>}
          </button>
        </div>

        {/* SECTION 1: Potential Model */}
        {activeTab === 'potential' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Week {meta.week} Predictive Rankings
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Based on Matchup Roof, Stall Rates, Vegas Lines, and Scoring Trends.
                  </p>
                </div>
                <div className="text-xs text-slate-500 italic">Click row for details</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-6 py-3">Grade</th>
                      <th className="px-6 py-3">Matchup</th>
                      <HeaderCell label={`Wk ${meta.week} Roof`} description="Is this specific game in a dome?" />
                      <HeaderCell label="Proj Pts" description="Predicted Points based on Grade Multiplier" />
                      <HeaderCell label="L4 Off %" description="My Offense Stall Rate (Last 4 Weeks)" avg={meta.league_avgs.off_stall} />
                      <HeaderCell label="L4 Def %" description="Opponent's Def Stall Rate (Last 4 Weeks)" avg={meta.league_avgs.def_stall} />
                      <HeaderCell label="Vegas" description="Implied Team Total Points" />
                      <HeaderCell label="Off PF(L4)" description="My Team Avg Points Scored (Last 4)" avg={meta.league_avgs.l4_off_ppg} />
                      <HeaderCell label="Opp PA(L4)" description="Opponent Avg Points Allowed (Last 4)" avg={meta.league_avgs.l4_def_pa} />
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {rankings.map((k, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => toggleRow(idx)}
                          className={`cursor-pointer transition-colors hover:bg-slate-800/50 ${expandedRow === idx ? 'bg-slate-800/60' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${
                                k.grade >= 100 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" :
                                k.grade >= 80 ? "bg-blue-500/10 border-blue-500/50 text-blue-400" :
                                "bg-slate-700/10 border-slate-600 text-slate-400"
                            }`}>
                              {k.grade}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            <div className="text-lg">{k.kicker_player_name}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-bold text-slate-400">{k.team}</span>
                              <span>vs</span>
                              <span className="font-bold text-red-400">{k.opponent}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {k.weather_desc.includes("Dome") ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold">
                                <Wind className="w-3 h-3" /> Dome
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-xs font-mono whitespace-nowrap">
                                <MapPin className="w-3 h-3" /> {k.weather_desc}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-400 text-lg">{k.proj}</td>
                          
                          <td className="px-6 py-4 text-center font-mono text-blue-300">
                             {k.off_stall_rate}% {k.off_stall_rate > meta.league_avgs.off_stall && "🔥"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-slate-400">
                             {k.def_stall_rate}% {k.def_stall_rate > meta.league_avgs.def_stall && "🎯"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-amber-400">{k.vegas.toFixed(1)}</td>
                          <td className="px-6 py-4 text-center font-mono text-slate-300">
                             {k.off_ppg.toFixed(1)} {k.off_ppg < 15 && "❄️"}
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-slate-300">
                             {k.def_pa.toFixed(1)} {k.def_pa < 17 && "🛡️"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                             {expandedRow === idx ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </td>
                        </tr>
                        {expandedRow === idx && <DeepDiveRow player={k} />}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg flex gap-3 text-sm text-emerald-300">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Matchup Logic:</span> 🔥 = High Volume Offense | 🎯 = Good Matchup (Def bends) | 🛡️ = Elite Defense (Avoid) | ❄️ = Cold Offense (Avoid)
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: YTD Leaders */}
        {activeTab === 'ytd' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800">
                <h2 className="font-bold text-white">2025 Season Leaders (Top 30)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Player</th>
                      <HeaderCell label="FPts" description="Total Fantasy Points scored (Standard Scoring)" avg={meta.league_avgs.fpts} />
                      <th className="px-4 py-3 text-center">FG (M/A)</th>
                      <HeaderCell label="Acc %" description="Field Goal Accuracy Percentage" avg="85.0" />
                      <HeaderCell label="50+ Yds" description="Field Goals made from 50+ yards" avg="-" />
                      <HeaderCell label="Dome %" description="% of games played in a Dome/Closed Roof" avg="-" />
                      <HeaderCell label="FG RZ Trips" description="Drives reaching the 25-yard line (FG Range)" avg="-" />
                      <HeaderCell label="Off Stall %" description="% of RZ Trips that end in a FG attempt (YTD)" avg="-" />
                      <HeaderCell label="Avg Opp Stall %" description="Avg Stall Rate of all opponents faced (Schedule Strength)" avg="-" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {ytd.map((k, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">
                          {k.kicker_player_name} <span className="text-xs text-slate-500 ml-1">{k.team}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-400">{k.fpts}</td>
                        <td className="px-4 py-3 text-center text-slate-300">{k.made}/{k.att}</td>
                        <td className="px-4 py-3 text-center">{k.acc}%</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded ${k.longs >= 5 ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500'}`}>
                            {k.longs}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {k.dome_pct > 50 ? (
                            <span className="text-blue-400 flex items-center justify-center gap-1"><Wind className="w-3 h-3"/> {k.dome_pct}%</span>
                          ) : (
                            <span className="text-slate-500">{k.dome_pct}%</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">{k.rz_trips}</td>
                        <td className="px-4 py-3 text-center font-mono text-blue-300">{k.off_stall_rate}%</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-400">{k.avg_opp_stall_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: GLOSSARY */}
        {activeTab === 'glossary' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Stats Legend & Definitions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50">
                    <tr>
                      <th className="px-6 py-4 w-32">Metric</th>
                      <th className="px-6 py-4 w-64">Definition</th>
                      <th className="px-6 py-4">Fantasy Impact (Why it Matters)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {GLOSSARY_DATA.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-blue-300 whitespace-nowrap">{item.header}</td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{item.title}</td>
                        <td className="px-6 py-4 text-slate-400 leading-relaxed">
                          <div className="mb-1">{item.desc}</div>
                          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {item.why}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;