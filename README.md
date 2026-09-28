# Kicker Genius

Fantasy football kicker projections at [kickergenius.com](https://www.kickergenius.com), built by 16BitHill.

Every kicker gets a weekly matchup grade (red-zone kicker points for his offense and allowed by the opponent, plus dome / cold bonuses) and a 50/30/20 projection that blends his kicker average (his last 34 games), Vegas-implied team totals and his share of team scoring, pulled 40% toward the average kicker. Projections are scored in **your** league's settings, and you can save several Sleeper leagues. The full model is in `MODEL_SPEC.md` in the engine repo.

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
| Week Model | This week's projections, grades, Vegas lines and weather; a worksheet per kicker with matchup history + news; finished games shown as FINAL |
| Accuracy | Projected vs. actual for every kicker and week, in your scoring, compared with just using his kicker average |
| Historical YTD | Season totals: fantasy points, FG %, 50+ makes, dome games, red-zone trips |
| Ask | Plain-English questions about any kicker, team or all kickers since 2000 (no AI) |
| Injury Report | Game status (CBS) + official NFL practice participation |
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

The API routes (`/api/dashboard`, `/api/projections`, `/api/ytd`, `/api/insights`, `/api/ask/*`) run server-side; the database URL never reaches the browser. Phones get card layouts (under 768px); tablets and computers get the tables.
