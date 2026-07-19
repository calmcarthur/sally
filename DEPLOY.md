# Deploy Sally (step by step)

Do this once. Afterward you only maintain Turso + Vercel the usual way (almost never).

Estimated time: **30–45 minutes**.

---

## What you’ll end up with

- App at something like `https://sally.yourdomain.com` (or `*.vercel.app`)
- Database on **Turso** (free tier is enough)
- Hosting on **Vercel** (Hobby / free is enough)
- A shared **write PIN** you text to the group

---

## 0. Prerequisites

- A [GitHub](https://github.com) account
- **This full Sally app committed and pushed** to GitHub (private is fine) — not just an empty create-next-app stub. Confirm the repo has `DEPLOY.md`, `src/app/activities/`, `src/app/stats/`, `src/app/prs/`, and `.env.example` before importing into Vercel.
- A phone number / email for Turso + Vercel signup

Optional later: a custom domain you already own (Namecheap, Cloudflare, Google Domains, etc.)

### Confirm local build before push

```bash
npm install
cp .env.example .env.local   # local defaults: sally / sally-admin
npm run build
```

If `build` fails, fix that first. Then commit + push, then continue below.

---

## 1. Create the Turso database

1. Go to [https://turso.tech](https://turso.tech) and sign up / log in.
2. Create a new database (any name, e.g. `sally`).
3. Open the database → find:
   - **LibSQL URL** — looks like `libsql://sally-xxxx.turso.io`
   - **Auth token** — create one if needed (“Create Token”), copy it once
4. Keep both somewhere safe (password manager). You’ll paste them into Vercel next.

You do **not** need to create tables by hand. Sally creates them on first request.

---

## 2. Choose two secrets

| Secret | Env var | Who gets it | Used for |
|---|---|---|---|
| **Group PIN** | `SALLY_WRITE_PIN` | Everyone in the group | Log activities, edit PRs |
| **Admin password** | `SALLY_ADMIN_PIN` | Just you (roster manager) | Add / restore / remove people |

- Prefer long random values (10+ characters), not `1234`
- Text only the **group PIN** to the crew
- Keep the **admin password** private

---

## 3. Push the code to GitHub

If you haven’t already:

```bash
cd /path/to/sally
git add .
git commit -m "Sally fitness tracker ready to deploy"
git remote add origin https://github.com/YOUR_USER/sally.git   # if needed
git push -u origin main
```

Use a **private** repo if you want.

---

## 4. Deploy on Vercel

1. Go to [https://vercel.com](https://vercel.com) → log in (GitHub is easiest).
2. **Add New… → Project** → import the `sally` repo.
3. Framework preset should detect **Next.js**. Leave build settings default:
   - Build command: `next build`
   - Output: Next.js default
4. **Before** clicking Deploy, open **Environment Variables** and add:

| Name | Value | Environments |
|---|---|---|
| `SALLY_WRITE_PIN` | group PIN (shared) | Production, Preview, Development |
| `SALLY_ADMIN_PIN` | admin password (you only) | Production, Preview, Development |
| `TURSO_DATABASE_URL` | `libsql://…` from Turso | Production, Preview, Development |
| `TURSO_AUTH_TOKEN` | token from Turso | Production, Preview, Development |
| `SALLY_TIMEZONE` | `Europe/London` | Production, Preview, Development |

Optional:

| Name | Value | When |
|---|---|---|
| `SALLY_SEED_ON_EMPTY` | `1` | Only if you want the 7 demo people auto-created on first empty DB hit (usually skip — add real people via admin) |

5. Click **Deploy**. Wait for the build to go green.
6. Open the `.vercel.app` URL Vercel gives you.

### Smoke check

Visit:

```
https://YOUR-APP.vercel.app/api/health
```

You want JSON like:

```json
{
  "ok": true,
  "today": "2026-07-19",
  "timezone": "Europe/London",
  "activePeople": 0,
  "hasTurso": true,
  "writePinConfigured": true,
  "adminPinConfigured": true
}
```

If `ok` is false, read `error` — almost always a missing Turso env var.

Then open the site:

1. You should see Activities (empty roster if you didn’t seed).
2. On Activities, click the **Activities** title five times → enter **admin password** → add people (or set `SALLY_SEED_ON_EMPTY=1` and redeploy / hit the site once).
3. Log a day with the **group PIN** → confirm it appears on the month grid.
4. Check Stats + PRs.

---

## 5. Add people (first time)

If the DB is empty and you did **not** set `SALLY_SEED_ON_EMPTY`:

1. On Activities, click the **Activities** title ×5 → enter **admin password**
2. Add each person: Name, Code (e.g. `CM003`), Join date
3. Use real join dates so % days stays fair

Suggested codes (from the old sheet):

| Name | Code |
|---|---|
| Arya | AM001 |
| Bilal | BA002 |
| Cal | CM003 |
| Jasper | JC004 |
| Logan | LL005 |
| Martin | MG006 |
| Sebastian | SM007 |

---

## 6. Custom domain (optional)

1. In Vercel → your project → **Settings → Domains**
2. Add e.g. `sally.yourdomain.com` (or apex `yourdomain.com`)
3. Vercel shows DNS records to create:
   - Usually a **CNAME** to `cname.vercel-dns.com` for a subdomain
   - Or A/ALIAS records for an apex domain
4. In your DNS host (Cloudflare, Namecheap, etc.), add those records.
5. Wait for DNS (often minutes; sometimes up to 24h).
6. Vercel auto-provisions HTTPS.

**Obscure domain tip:** A random subdomain helps a little against random visitors, but the **PIN** is what protects writes. Don’t rely on obscurity alone.

---

## 7. Tell the group

Send them:

1. The URL
2. The **group PIN** only (not the admin password)
3. Optionally: how people admin works — only if someone else should manage the roster (needs admin password)

Viewing needs nothing. Logging / PRs need the group PIN. People changes need admin.

---

## 8. Ongoing maintenance (rare)

| Cadence | Task |
|---|---|
| First week | Confirm everyone can log; fix PIN typos |
| Yearly | Log into Turso + Vercel once; confirm DB still there; optional backup |
| When Node/Next go EOL | `npm outdated`, bump Next, `npm run build`, redeploy |
| If group PIN leaks | Change `SALLY_WRITE_PIN` in Vercel → Redeploy → tell the group |
| If admin password leaks | Change `SALLY_ADMIN_PIN` in Vercel → Redeploy |

### Back up the database (recommended once a year)

With [Turso CLI](https://docs.turso.tech/cli):

```bash
turso db shell sally ".dump" > sally-backup-$(date +%Y%m%d).sql
```

Or use Turso’s dashboard export/snapshot features if available on your plan.

Store the file in a private Drive/iCloud folder.

---

## 9. Local development after deploy

Keep using the local file DB for experiments:

```bash
npm run dev          # uses data/sally.db
npm run db:seed      # optional demo data
```

Point `.env.local` at Turso **only if** you intentionally want to edit production data from your laptop (usually avoid this).

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `/api/health` → `TURSO_DATABASE_URL is required` | Set Turso env vars on Vercel; redeploy |
| Writes always “Invalid PIN” | `SALLY_WRITE_PIN` missing/mismatched; clear site data and unlock again |
| People admin rejects password | `SALLY_ADMIN_PIN` missing/mismatched (not the group PIN) |
| Empty site, no people | Click Activities title ×5 (admin), or set `SALLY_SEED_ON_EMPTY=1` |
| Streaks / “today” feel wrong | Confirm `SALLY_TIMEZONE=Europe/London` |
| Build fails on Vercel | Check build log; usually env typo or Node version — use Vercel’s default Node |
| Data “disappeared” after redeploy | You were on file DB without Turso — set Turso; old Vercel disk data is gone |

---

## Checklist (print / tick)

- [ ] Turso DB created; URL + token copied  
- [ ] Repo on GitHub  
- [ ] Vercel project linked  
- [ ] Env vars set: `SALLY_WRITE_PIN`, `SALLY_ADMIN_PIN`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SALLY_TIMEZONE`  
- [ ] Deploy green  
- [ ] `/api/health` → `ok: true`  
- [ ] People added (or seeded) with admin password  
- [ ] Test log + Stats + PR with group PIN  
- [ ] (Optional) Custom domain  
- [ ] Group PIN + URL sent to the crew (not admin password)  
- [ ] (Optional) First backup saved  

You’re done. Day-to-day: open the site, log what you did, argue about Stats.
