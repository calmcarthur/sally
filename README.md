# Sally — Group Fitness Tracker

Shared accountability board for a small group: log daily activities, compare yearly/lifetime stats, track PRs. Built to run for years with almost no maintenance.

**Deploy steps (Turso, Vercel, domain):** see [DEPLOY.md](./DEPLOY.md).

**Before first deploy:** commit + push this whole tree (pages, APIs, `DEPLOY.md`, `.env.example`). `origin/main` must include Sally — not a blank Next.js starter. Then follow DEPLOY.md.

---

## What it is

Three pages, one shared roster, four activity types per day:

| Page | Purpose |
|---|---|
| **Activities** | Log what someone did + shared month colour grid |
| **Stats** | Charts, tables, streaks, head-to-head (yearly + lifetime) |
| **PRs** | Personal records + Sally record holders |

Activity types (multi-select per day):

| Type | Colour |
|---|---|
| Weight Training | Dark forest green `#1B4332` |
| Cardio | `#08814A` |
| Sport | `#BCB381` |
| Active Recovery | Grey |

A day “counts” if **any** type is checked (AR-only is fine).

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command | What it does |
|---|---|
| `npm run dev` | Local server |
| `npm run build` / `npm start` | Production build locally |
| `npm run db:seed` | Wipe local DB + load 2025/2026 demo data |
| `npm run db:reset` | Wipe local DB only |

**Local defaults** (if env unset): group PIN `sally` · admin password `sally-admin`

---

## Program overview

### Architecture

```
Browser (phone / Mac / Windows)
    │
    ▼
Next.js (App Router) on Vercel
    │  /activities  /stats  /prs
    │  /api/*  (dynamic, always fresh)
    ▼
Turso (libSQL / SQLite at the edge)
    people · activity_logs · personal_records
```

- **Frontend:** React + Tailwind, responsive (horizontal exercise bars on mobile).
- **Backend:** Next.js route handlers (no separate server).
- **Database:** Turso in production; `data/sally.db` file locally.
- **Auth:** No user accounts. Anyone with the URL can **view**. Logging/PRs need the **group PIN**. Adding/removing people needs a separate **admin password**.

### Data model

```
people
  id, name, code (UNIQUE), join_date, created_at, active (0|1)

activity_logs
  one row per person per date
  flags: weight_training, cardio, sport, active_recovery

personal_records
  one row per person per exercise_key
  value (text), recorded_on
```

**Code** is the permanent identity. Soft-remove sets `active = 0`; logs and PRs stay. Re-add with the same code → full history returns.

**Name order** is always alphabetical (A→Z) everywhere: dropdowns, month grid, charts, tables, PR boards.

### Pages in detail

**Activities**
- Log panel: who, date, multi-select types → Save (PIN).
- Month grid: one row per active person; stacked colours per day; blank = Nothing.
- Tap a day to edit. Streak badge (🔥) when current streak ≥ 5.

**Stats**
- Yearly (default) or Lifetime.
- Year picker: `APP_START_YEAR` (2025) through the current calendar year (grows automatically — no yearly code change).
- Exercise count bars, % days pies, detail table, category mix, 24-week consistency (≥4 active days/week), month-over-month, compact head-to-head.

**PRs**
- Lifting, calisthenics, other, running (same set as the old spreadsheet).
- Higher/lower-is-better handled per exercise; times as `m:ss` / `h:mm:ss`.
- Sally Record Holder = best among **active** people.

### People admin (hidden)

1. On the **Activities** page, click the **Activities** title **5 times quickly**.
2. Enter the **administrator password** (not the group PIN).
3. **Add** new person (name, code, join date) or **restore** by same code.
4. **Remove** = soft-hide (two confirms). Data kept. Restore anytime.

Friends only need the group PIN for day-to-day logging. Keep the admin password to yourself (or whoever manages the roster).

---

## How stats work

### Yearly vs lifetime

| | Yearly | Lifetime |
|---|---|---|
| Activity counts, best streak, % days, monthly trends | Selected year | All time |
| Current streak | Always live (full history) | Same |
| Sally records held | Current #1s among active people | Same |

### % days worked on yourself

```
percent = activeDays / eligibleDays × 100
```

**Eligible days (yearly):** `max(Jan 1, joinDate)` → `min(today, Dec 31)`  
**Lifetime:** `joinDate` → `today`

Mid-year joiners are not punished for months before they joined. Jasper in the demo (`join_date = 2025-06-15`) is the example.

### Streaks

- Active day = ≥1 activity type logged.
- Current streak: consecutive days ending today, or yesterday if today is empty.
- Badge at ≥ **5** days.
- Best streak: longest run in the selected scope.

### Head-to-head

Compact chips at the bottom of Stats. Winners for: most days active, longest best streak, highest % days, most WT, most cardio, highest Act:AR ratio, most Sally records.

### Activity : AR ratio

`round((WT + Cardio + Sport) / AR) : 1` (or `N:0` if no AR).

---

## Years, calendars, timezone

- **Month grid** is real calendar math (correct day counts / leap years). Not hardcoded months.
- **Year picker** starts at 2025 and adds each new year automatically.
- **“Today”** uses `SALLY_TIMEZONE` (default `Europe/London`), not the Vercel server’s UTC clock — so streaks and % days stay correct for UK evenings.

---

## Security model (intentional)

| Action | Requirement |
|---|---|
| View activities / stats / PRs | URL only |
| Log activity, edit PR | **Group PIN** (`SALLY_WRITE_PIN`) |
| Add / restore / remove people | **Admin password** (`SALLY_ADMIN_PIN`) |

This is **security through obscurity + shared secrets**, fine for a private friend group. It is **not** bank-grade auth.

Production **requires** both `SALLY_WRITE_PIN` and `SALLY_ADMIN_PIN` (no defaults). Without Turso URL, production refuses to start (no silent ephemeral disk DB).

Use long random values. Share the group PIN with the crew; keep admin to yourself.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `SALLY_WRITE_PIN` | **Prod yes** | Group PIN (log / PRs) |
| `SALLY_ADMIN_PIN` | **Prod yes** | Admin password (people only) |
| `TURSO_DATABASE_URL` | **Prod yes** | `libsql://…` |
| `TURSO_AUTH_TOKEN` | **Prod yes** | Turso token |
| `SALLY_TIMEZONE` | No | Default `Europe/London` |
| `SALLY_SEED_ON_EMPTY` | No | Set `1` to auto-create seed people on empty prod DB |

---

## Longevity / robustness notes

Designed so you can deploy once and leave it alone for years:

- Year list grows with the calendar — no annual code edit.
- Soft-delete people — no data loss if someone leaves and returns.
- Join-date-aware % days — fair for late joiners.
- Explicit timezone for “today”.
- API validation on dates, years, exercises, active people.
- Schema bootstrap + `schema_meta` version marker; additive migrations via `PRAGMA` checks.
- Activities streak calc bounded (recent dates only) so month view stays fast as history grows.
- `/api/health` for uptime checks.

**What you should still do occasionally (ops, not code):**

1. Keep the Turso free-tier DB alive (log in once a year if needed; check Turso’s current free-tier policy).
2. Keep a backup (Turso dump / snapshot) once or twice a year.
3. When Vercel/Node major versions go EOL, bump Next.js and redeploy (same as any site).
4. Rotate the PIN if it ever leaks.

At ~5–10 people logging daily, row counts stay tiny for a decade (`~20k` activity rows). No scaling work expected.

---

## Demo data

```bash
npm run db:seed
```

Loads **7 people** (Arya, Bilal, Cal, Jasper, Logan, Martin, Sebastian) with 2025–2026 activity + sample PRs. Jasper joins mid-2025 (`2025-06-15`); Sebastian joins `2025-03-01`. Local only — wipe + reload. Refresh the browser after seeding.

Production can optionally auto-create the same roster on an empty DB with `SALLY_SEED_ON_EMPTY=1` (usually leave off and add people via admin).

---

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Turso/libSQL · Vercel Hobby
