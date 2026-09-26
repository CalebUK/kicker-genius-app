# Kicker Genius

Fantasy football kicker projections at [kickergenius.com](https://www.kickergenius.com), built by 16BitHill.

Every kicker gets a weekly matchup grade (his offense's red-zone stall rate vs. the league, plus the opponent's defense) and a 50/30/20 projection that blends his season average, Vegas-implied team totals and his share of team scoring. Projections are scored in **your** league's settings, and you can link a Sleeper league.

## How it fits together

```
NAS (private, home network)                     Cloud
┌──────────────────────────────┐   push   ┌──────────────┐   read-only   ┌──────────────┐
│ Python engine + scrapers     │ ───────▶ │ Neon Postgres│ ◀──────────── │ This Next.js │
│ Postgres: stats, model views,│ outbound │ (plain table │               │ site (Vercel)│
│ weekly projection snapshots  │   only   │  copies)     │               │              │
└──────────────────────────────┘          └──────────────┘               └──────────────┘
```

- The NAS runs all the model logic and pushes finished results out after every scheduled run. Nothing connects in to it.
- This site only reads the cloud copy, using a SELECT-only database login.
- The browser applies the user's scoring to raw kick counts, so one set of data serves every league's settings.

## Tabs

| Tab | What it shows |
|---|---|
| Week Model | This week's projections, grades, Vegas lines and weather, with a worksheet per kicker |
| Accuracy | Projected vs. actual for every kicker and week, in your scoring, compared with a season-average baseline |
| Historical YTD | Season totals: fantasy points, FG %, 50+ makes, dome games, red-zone trips |
| Injury Report | Kicker injury designations and practice status |
| Stats Legend | How every number is calculated |

## Running locally

Needs Node 24 and a `.env.local` with the read-only database URL:

```
NEON_READONLY_URL=postgresql://kg_reader:<password>@<host>/neondb?sslmode=verify-full
```

```bash
npm install
npm run dev
```

The API routes (`/api/dashboard`, `/api/projections`, `/api/ytd`) run server-side; the database URL never reaches the browser.
