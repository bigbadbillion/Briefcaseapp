# Briefcase — Replit → Off-Replit Migration Guide

Official migration checklist. Work through tasks **in order**. When every task is checked off, the app runs fully off Replit.

---

## What stays on Replit today

| Component | Replit dependency |
|-----------|-------------------|
| PostgreSQL | All users, sessions, holdings, settings |
| Backend hosting | Express API + landing page (Replit also served static Expo bundles — **not used** for App Store / Xcode Archive builds) |
| Domain | `briefcaseapp.replit.app` (production), `*.picard.replit.dev` (dev) |
| Secrets | API keys stored in Replit Secret store |
| Build/deploy | `.replit` `[deployment]` runs `expo:static:build` + `server:build` on Cloud Run |

## What is already portable

- React Native / Expo client (`client/`)
- Express API (`server/`)
- Drizzle schema (`shared/schema.ts`)
- External APIs: CoinGecko, Finnhub, Gemini, Resend, RevenueCat

---

## Environment variables reference

Copy these from Replit Secrets into your new host and local `.env`:

| Variable | Required | Used by |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Auto-built from `SUPABASE_DB_PASSWORD` via `scripts/load-env.sh` |
| `GEMINI_API_KEY` | Yes (AI features) | `server/services/geminiService.ts` |
| `FINNHUB_API_KEY` | Yes (stock/ETF prices) | `server/services/assetSearchService.ts`, `server/routes.ts` |
| `RESEND_API_KEY` | Yes (email verification) | `server/services/emailService.ts` |
| `EXPO_PUBLIC_DOMAIN` | Yes | Client API base URL, email links, **baked into iOS build at Xcode Archive time** |
| `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` | Dev only | Expo Go / test purchases (`app.config.js`) |
| `PORT` | Optional | Defaults to `5000` (use `5001` if macOS AirPlay occupies 5000) |
| `ALLOWED_ORIGINS` | Optional | Extra CORS origins, comma-separated |

**Not used (ignore):** `SESSION_SECRET`, `ALPHA_VANTAGE_API_KEY` — listed in old docs only.

Crypto prices use **CoinGecko** (no API key). Stocks use **Finnhub**.

RevenueCat production key is in `app.config.js` (`revenueCatApiKey`) — not an env var today.

---

## Migration tasks

### Task 1 — Export Replit **production** PostgreSQL data

**Why first:** Replit holds all production user data. Export before you shut anything down.

**Important:** Replit has **two separate databases**:
- **Development** — what `$DATABASE_URL` points to in the Replit Shell (test data, agent work)
- **Production** — live App Store user data (`briefcaseapp.replit.app`), hosted on Neon

If you ran `pg_dump "$DATABASE_URL"` in the Shell, you almost certainly got the **dev** database (small row counts). You need the **production** connection string instead.

**Do:**
1. Open your Replit project → **Database** tool (left sidebar).
2. Use the dropdown at the top and select **Production** (not Development).
3. Open **My data** and sanity-check row counts (e.g. `users` should reflect real App Store signups since January).
4. Open the **Settings** tab (gear icon) and copy the **production** `DATABASE_URL`.
   - Production URLs usually contain `neon.tech` (dev uses `helium` / `heliumdb`).
   - Do **not** paste this URL in chat or commit it anywhere.
5. In the Replit Shell, dump using the **production URL explicitly** (do not use bare `$DATABASE_URL`):

```bash
pg_dump "PASTE_PRODUCTION_DATABASE_URL_HERE" --no-owner --no-acl -F c -f briefcase_production_backup.dump
```

   Replace `PASTE_PRODUCTION_DATABASE_URL_HERE` with the full string from step 4 (keep the quotes).

6. Verify the dump looks substantial:

```bash
ls -lh briefcase_production_backup.dump
pg_restore -l briefcase_production_backup.dump | grep "TABLE DATA"
```

   You should see `TABLE DATA` rows for `users`, `sessions`, `holdings`, `user_settings`.

7. Download `briefcase_production_backup.dump` to your Mac (same folder as this repo) and store it safely.

**If Settings doesn't show a production URL:** open **Publishing** → **Adjust settings** → **Secrets** and look for a production-scoped `DATABASE_URL`. Some projects only expose prod credentials there.

**Tables to preserve:** `users`, `sessions`, `holdings`, `user_settings` (see `shared/schema.ts`).

**Done when:** Production dump exists, file size is clearly larger than dev-only test data, and user counts match what you see in Production → My data.

- [x] Production database exported (`briefcase_production_backup.dump`) — **17 KB** (dev dump was 9.4 KB)
- [x] Row counts verified before leaving Replit

---

### Task 2 — Create Supabase PostgreSQL project

**Why now:** Every later step needs a target database. You are doing this step.

**Do:**
1. Create a new project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database**, copy the **Connection string (URI)**.
   - Use the **Transaction pooler** URI for the Express server (port 6543).
   - Use the **Direct** URI for one-off imports / `drizzle-kit push`.
3. Note the database password — you will need it in connection strings.

**Supabase notes:**
- Schema uses `gen_random_uuid()` — enabled by default on Supabase (`pgcrypto`).
- No Supabase Auth required; the app uses its own auth in `server/services/authService.ts`.

**Done when:** Supabase project exists and you have pooler + direct connection strings saved.

- [x] Supabase project created — ref `yqzdgucrfwpjszxyhbjv`, URL `https://yqzdgucrfwpjszxyhbjv.supabase.co`, region **East US (Ohio)**
- [x] Connection strings saved (pooler + direct)

---

### Task 3 — Configure `.env.local` and link Supabase CLI

**Why now:** All database commands read credentials from one local file.

**Do:**
1. Open `.env.local` in the project root (already created).
2. Set **`SUPABASE_DB_PASSWORD`** to the password you chose when creating the Supabase project.
   - This is **not** the publishable key — it's the database password from **Settings → Database**.
3. Link the CLI to your project:

```bash
npm run supabase:link
```

4. Restore the **production** Replit dump (creates tables **and** imports data in one step):

```bash
DUMP_FILE=briefcase_production_backup.dump npm run db:restore
```

   Default is `briefcase_backup.dump` (dev). Use the production filename above after you download it.

   Your dump already includes schema + data, so you do **not** need a separate `db:push` first.

   **Alternative (empty DB, no dump):** `npm run db:push` instead.

5. Confirm tables exist in Supabase **Table Editor** (`users`, `sessions`, `holdings`, `user_settings`).

**Done when:** Tables visible in Supabase with your Replit data.

- [x] `SUPABASE_DB_PASSWORD` set in `.env.local`
- [x] `npm run supabase:link` succeeded
- [x] `npm run db:restore` succeeded (production dump, 2026-06-28)
- [x] Tables visible in Supabase dashboard

---

### Task 4 — Verify imported data

**Why now:** Confirm the restore worked before moving on.

**Do:**
1. In Supabase **Table Editor**, check row counts for `users` and `holdings`.
2. Spot-check a known user email from Replit.

**Done when:** Production data is queryable in Supabase.

- [x] Data verified in Supabase dashboard
- [ ] Spot-check passed (pick a known user email in Table Editor — optional manual step)

**Verified row counts after production restore (2026-06-28):**

| Table | Rows |
|-------|------|
| `users` | 29 |
| `holdings` | 26 |
| `sessions` | 43 |
| `user_settings` | 0 |

Note: `user_settings` empty in dump may be normal if settings were never persisted server-side (app also uses AsyncStorage client-side).

---

### Task 5 — Gather remaining secrets in `.env.local`

**Why now:** Backend must talk to Supabase + external APIs before you change hosting.

**Do:**
1. In Replit, open **Secrets** and copy every key from the environment variables table above.
2. Add them to `.env.local`:

```bash
# DATABASE_URL is built automatically from SUPABASE_DB_PASSWORD
GEMINI_API_KEY="..."
FINNHUB_API_KEY="..."
RESEND_API_KEY="..."
EXPO_PUBLIC_DOMAIN=localhost:5000        # Local dev; update before deploy (Task 10)
PORT=5000                               # Use 5001 if port 5000 is taken on macOS
```

3. `.env.local` is gitignored — never commit it.

**Done when:** `.env.local` has all required keys.

- [x] All secrets copied from Replit into `.env.local` (2026-06-28)

---

### Task 6 — Remove Replit-specific code paths (completed 2026-06-28)

| File | Change |
|------|--------|
| `server/index.ts` | CORS from `EXPO_PUBLIC_DOMAIN` + `ALLOWED_ORIGINS`; removed `reusePort` (macOS fix) |
| `scripts/build.js` | `EXPO_PUBLIC_DOMAIN` only |
| `server/services/emailService.ts` | Uses `shared/publicUrl.ts` |
| `client/lib/query-client.ts` | `http://` for localhost |
| `client/screens/PaywallScreen.tsx` | Privacy link via `getApiUrl()` |
| `shared/publicUrl.ts` | **New** — shared base URL helper |
| `package.json` | `server:dev` / `expo:dev` source `load-env.sh` |

---

### Task 7 — Verify backend locally against Supabase

**Why now:** Confirm database + API work before paying for hosting.

**Do:**

```bash
npm run server:dev    # loads .env.local automatically
npm run expo:dev      # in a second terminal
```

If port 5000 is in use (common on macOS — AirPlay Receiver), add `PORT=5001` to `.env.local` and set `EXPO_PUBLIC_DOMAIN=localhost:5001`.

**Test:**
- `GET http://localhost:5000/api/health` (or status route if present)
- Register / login flow
- Create, list, delete a holding
- Price fetch for a stock and a crypto symbol
- AI endpoint (if `GEMINI_API_KEY` set)
- Email verification (if `RESEND_API_KEY` set)

**Done when:** Core API flows work locally with Supabase as the database.

- [x] Server starts without errors (port **5001** — macOS AirPlay uses 5000; use Mac LAN IP for physical device)
- [x] Auth flow works (login + holdings on physical device, `ugo.nwune@gmail.com`)
- [x] Holdings CRUD works (add holding saved to Supabase)
- [x] Market data smoke test passed (BTC/ETH via CoinGecko, AAPL via Finnhub)
- [x] AI endpoint responded (`/api/ai/chat` → Gemini)

**Verified 2026-06-28:**

```bash
curl http://localhost:5001/api/health
# → coingecko, finnhub, gemini all true

curl -X POST http://10.252.193.174:5001/api/ai/chat -H "Content-Type: application/json" \
  -d '{"message":"Say hi in one word"}'
# → {"response":"Hello!","configured":true}
```

Physical device: `EXPO_PUBLIC_DOMAIN=<Mac-LAN-IP>:5001` (not `localhost`).

---

### Task 8 — Choose and provision hosting

**Why now:** Replit hosted the Express API. You need a replacement that runs Node.js 22+ and serves `/api/*` plus the landing page.

**Recommended: Render free tier** — $0, no credit card required. Pair with a free uptime ping (below) to avoid cold starts.

**Do not run `expo:static:build` on the host.** App Store builds embed JS in the `.ipa` via Xcode Archive (Task 11). The host only needs the API.

**Render free tier — what to expect:**

| | **Render free (with keep-alive ping)** | **Render Starter ($7/mo)** |
|--|----------------------------------------|----------------------------|
| **Cost** | $0 | $7/mo |
| **Spin-down when idle?** | Yes — after **15 min** no traffic (unless pinged) | No |
| **Cold start** | **30–60 s** if spin-down happens | None |
| **Free instance hours** | **750 hrs/mo** per workspace | N/A (paid) |
| **One always-on service** | ~720 hrs/mo (24/7) — fits in 750 ✓ | Always on |

**Keep-alive ping (free):** Render spins down after 15 minutes with no traffic. Use **[UptimeRobot](https://uptimerobot.com)** (free, no card) to hit `/api/health` every **5 minutes**. That keeps one web service awake all month within the 750-hour allowance. Alternatives: [cron-job.org](https://cron-job.org), [Healthchecks.io](https://healthchecks.io).

**Caveats:** Render may still restart free services occasionally; a missed ping can cause one slow cold start. Upgrade to Starter if users complain.

**Requirements:**
- Node 22+
- Listen on `$PORT` (Render injects this — do **not** set it yourself)
- Build: `npm install && npm run server:build`
- Start: `npm run server:prod`
- Set `EXPO_PUBLIC_DOMAIN` on the host to your public hostname (no `https://` prefix)

**Render setup (step by step):**

1. Sign up at [render.com](https://render.com) → connect GitHub → **New Web Service**.
2. Select repo **`bigbadbillion/Briefcaseapp`** (branch `main`).
3. Configure:

| Field | Value |
|-------|--------|
| **Name** | e.g. `briefcase-api` |
| **Region** | **Ohio (US East)** — closest to Supabase `aws-1-us-east-2` |
| **Runtime** | Node |
| **Instance type** | Free |
| **Build command** | `npm install && npm run server:build` |
| **Start command** | `npm run server:prod` |
| **Health check path** | `/api/health` |

4. **Environment** — add variables (Task 9 has full list; use `your-app.onrender.com` for `EXPO_PUBLIC_DOMAIN` until Task 10):

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Transaction pooler port **6543** (see Task 9) |
| `GEMINI_API_KEY` | from `.env.local` |
| `FINNHUB_API_KEY` | from `.env.local` |
| `RESEND_API_KEY` | from `.env.local` |
| `EXPO_PUBLIC_DOMAIN` | `briefcase-api.onrender.com` (your Render hostname) |
| `NODE_ENV` | `production` |

5. Click **Create Web Service** and wait for the first deploy.

6. **UptimeRobot keep-alive** (after first deploy succeeds) — see steps below. **Note:** if you set Render's **Health Check Path** to `/api/health`, Render already pings your service every few seconds internally ([Render health checks](https://render.com/docs/health-checks)). That traffic usually prevents the 15‑min spin-down — UptimeRobot is optional backup + external alerting.

**UptimeRobot setup (optional but recommended for alerts):**

1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free, no card).
2. **Add New Monitor** → type **HTTP(s)**.
3. **Friendly name:** e.g. `Briefcase API`
4. **URL:** `https://briefcase-api-ykj0.onrender.com/api/health`
5. **Monitoring interval:** **5 minutes** (not 5 seconds — free tier minimum is 5 min).
6. Save → confirm status shows **Up** / **200 OK**.

**Alternatives:** Fly.io (~$3–5/mo always-on), Railway (~$5/mo). Same build/start commands; skip `expo:static:build`.

**Done when:** Render web service created, env vars set, UptimeRobot monitor added (or skipped if relying on Render health checks).

- [x] Render web service created — **`briefcase-api-ykj0.onrender.com`** (2026-06-28)
- [x] Environment variables set on Render (`EXPO_PUBLIC_DOMAIN=briefcase-api-ykj0.onrender.com`)
- [x] UptimeRobot (or equivalent) pinging `/api/health` every 5 min (2026-06-28)

---

### Task 9 — Deploy backend to production

**Why now:** Need a live URL before Xcode Archive (Task 11) bakes `EXPO_PUBLIC_DOMAIN` into the iOS binary.

**Do:**
1. Confirm all env vars from Task 8 are set on Render — **production overrides** vs local dev:

| Variable | Local dev (`.env.local`) | Production (Render) |
|----------|--------------------------|---------------------|
| `DATABASE_URL` | Session pooler, port **5432** (via `load-env.sh`) | **Transaction pooler**, port **6543** |
| `EXPO_PUBLIC_DOMAIN` | Mac LAN IP or `localhost:5001` | **`briefcase-api-ykj0.onrender.com`** (hostname only; custom domain in Task 10) |

**Important — `DATABASE_URL` on Render is not the same as local dev.**

Use the **transaction pooler** (port **6543**), not the session pooler (5432) you use for `npm run db:restore` / local server:

```bash
DATABASE_URL=postgresql://postgres.yqzdgucrfwpjszxyhbjv:YOUR_PASSWORD@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

Copy the password from `SUPABASE_DB_PASSWORD` in `.env.local`. Host must be **`aws-1-us-east-2`** for this project (not `aws-0`).

Also set: `GEMINI_API_KEY`, `FINNHUB_API_KEY`, `RESEND_API_KEY`, `NODE_ENV=production`.

Do **not** set `PORT` — Render injects it automatically.

2. Trigger deploy (automatic on push, or **Manual Deploy** in the Render dashboard).

3. Confirm logs and health:

```bash
curl https://briefcase-api-ykj0.onrender.com/api/health
curl https://briefcase-api-ykj0.onrender.com/
```

   Logs should show `express server serving on port ...` (Render-assigned port).

   **Render health check pings:** If Health Check Path is `/api/health`, Render probes it every few seconds — this is normal and shows in logs as `GET /api/health 200`. Not UptimeRobot.

4. Confirm UptimeRobot shows **200 OK** (after Task 8 monitor is added).

**Done when:** Production URL responds (landing page at `/`, API at `/api/*`).

- [x] Production deploy succeeded (2026-06-28)
- [x] Environment variables set on Render
- [x] `/api/health` responds
- [x] UptimeRobot monitor active (2026-06-28)

---

### Task 10 — Configure custom domain

**Why now:** Replace `briefcaseapp.replit.app` with a domain you control — **before Task 11** so you Archive once with the final hostname.

**One domain for everything (not separate “backend” vs “landing”):**

Render runs a **single** Express app that serves:

| Path | What |
|------|------|
| `/` | Landing page |
| `/privacy`, `/support`, `/docs` | Static pages |
| `/api/*` | Mobile app API |

**Target domain:** **`briefcase.echovault.me`** — same hostname for the landing page in a browser **and** for API calls from the app. You do **not** need a separate `api.` subdomain unless you want one for aesthetics.

`EXPO_PUBLIC_DOMAIN=briefcase.echovault.me` means the app calls `https://briefcase.echovault.me/api/...` — the same host users visit for the marketing site.

**Do:**

1. **Render** → your web service → **Settings → Custom Domains** → add **`briefcase.echovault.me`**. Copy the **CNAME target** Render shows (usually your `*.onrender.com` hostname).

2. **Vercel DNS (dashboard — not CLI):** The API is hosted on **Render**, not Vercel. You only need a **DNS record**, not a Vercel project/deploy.
   - Vercel → **Domains** → `echovault.me` → **DNS Records**
   - Add **CNAME**: name **`briefcase`** → value = Render’s CNAME target
   - Do **not** attach this subdomain to a Vercel deployment (that would route traffic to Vercel instead of Render).

   Vercel CLI is for deploying apps on Vercel — skip it here; the dashboard is simpler for one CNAME.

3. Wait for Render to verify DNS and issue HTTPS (often 5–30 min).

4. Update **`EXPO_PUBLIC_DOMAIN`** on Render to **`briefcase.echovault.me`** → Save (redeploy).

5. Update UptimeRobot monitor URL to `https://briefcase.echovault.me/api/health`.

6. Verify:

```bash
curl https://briefcase.echovault.me/api/health
open https://briefcase.echovault.me/
```

**Also update (if applicable):**
- Resend sending domain (if using custom from-address)
- RevenueCat webhook URLs
- Apple Sign In redirect domains

**Done when:** Landing page and `/api/health` both work on `https://briefcase.echovault.me`.

- [x] CNAME `briefcase.echovault.me` → Render (Vercel DNS) (2026-06-28)
- [x] HTTPS working on Render
- [x] `EXPO_PUBLIC_DOMAIN=briefcase.echovault.me` on Render
- [x] UptimeRobot URL updated

---

### Task 11 — Build production iOS app (Xcode Archive)

**Why now:** App Store builds **embed JS in the `.ipa`** at compile time. They do **not** load JS from your server at runtime (that was Replit's `expo:static:build` flow — legacy, skip it).

The app only calls your Render host for **API requests** (`/api/auth/*`, `/api/prices/*`, etc.). Release builds minify JS automatically — no separate minify step and no Expo dev server needed in production.

**Prerequisite:** **Task 10 complete** — Archive with `briefcase.echovault.me` so you don’t ship a build pointing at `*.onrender.com`.

**Do:**
1. Set the production hostname — **must match Render `EXPO_PUBLIC_DOMAIN` exactly**:

```bash
export EXPO_PUBLIC_DOMAIN="briefcase.echovault.me"
```

   Hostname only, no `https://`. This is the same domain as the landing page; the app uses it for `/api/*` calls.

2. Generate the native iOS project (once, or after adding native plugins):

```bash
npm install
export EXPO_PUBLIC_DOMAIN="briefcase.echovault.me"
npx expo prebuild --platform ios
cd ios && pod install && cd ..
```

3. **Pin the domain for Xcode Archive** — create `ios/.xcode.env.local` (gitignored with `/ios`) so Product → Archive bakes in the correct API URL **and finds Node** (Xcode’s PATH often omits Homebrew):

```bash
cat > ios/.xcode.env.local <<'EOF'
export NODE_BINARY=/opt/homebrew/bin/node
export EXPO_PUBLIC_DOMAIN=briefcase.echovault.me
EOF
```

   If `which node` on your Mac is not Homebrew, use that path instead. **Symptom:** `ReactNativeDependencies` / `hermes-engine` → `PhaseScriptExecution failed` usually means `NODE_BINARY` was empty.

4. Open **`ios/Briefcase.xcworkspace`** in Xcode (not `.xcodeproj`).

5. Select **Any iOS Device (arm64)** → **Product → Archive**.

6. **Distribute App** → App Store Connect (TestFlight first recommended).

7. On a TestFlight device, verify login, holdings, and prices hit **`briefcase.echovault.me`** (not `briefcaseapp.replit.app`).

**Note:** `EXPO_PUBLIC_DOMAIN` is inlined at Xcode Archive time. If you change it later, Archive and submit again.

**Done when:** TestFlight build works against `https://briefcase.echovault.me/api/*`.

- [x] Task 10 done (`briefcase.echovault.me` live)
- [ ] `EXPO_PUBLIC_DOMAIN=briefcase.echovault.me` before Archive (`ios/.xcode.env.local`) — file created
- [x] `npx expo prebuild` + `pod install` succeeded (2026-06-28)
- [ ] Archive uploaded to App Store Connect / TestFlight
- [ ] TestFlight smoke test passed against live API

---

### Task 12 — End-to-end production verification

**Why now:** Final gate before App Store submit and cutting over users.

**Checklist (live `briefcase.echovault.me` + TestFlight build from Task 11):**
- [ ] Landing page, `/privacy`, `/support` load on new domain
- [ ] Email/password registration + verification email arrives
- [ ] Login persists session (holdings visible after restart)
- [ ] Apple Sign In works (TestFlight / production build)
- [ ] Real-time prices update on Dashboard
- [ ] AI chat and Insights work (premium)
- [ ] RevenueCat purchase / restore works
- [ ] Existing Replit users' data visible (if imported in Task 4)

**Done when:** All items checked on the production domain.

---

### Task 13 — Submit App Store update

**Why last:** Existing store builds have `briefcaseapp.replit.app` baked into the JS bundle from the old Replit build. They will break when Replit is decommissioned.

**Do:**
1. Confirm Task 11 TestFlight build uses the new `EXPO_PUBLIC_DOMAIN` (custom domain from Task 10 if ready).
2. Increment `version` / `ios.buildNumber` in `app.json` if needed.
3. In App Store Connect, submit the Archive from Task 11 for review.
4. Existing users **must install this update** to reach the new backend.

**Friction note:** This is the main migration pain for live App Store users — the old domain stops working when Replit is decommissioned.

**Done when:** New build is approved (or submitted) and points at Render / your custom domain.

- [ ] App Store submission created from Xcode Archive (Task 11)
- [ ] Production `EXPO_PUBLIC_DOMAIN` verified in TestFlight before submit

---

### Task 14 — Decommission Replit

**Why last:** Only after production is stable.

**Do:**
1. Confirm production traffic is on the new host for 24–48 hours.
2. Take a final Replit DB backup (archive).
3. Stop Replit deployment / cancel subscription.
4. Remove or archive `.replit` Replit-only config from active deploy pipeline.

**Done when:** Replit is no longer required for any production traffic.

- [ ] Final backup archived
- [ ] Replit deployment stopped
- [ ] No production dependency on `*.replit.app`

---

## Quick reference — local dev after migration

```bash
npm install
npm run server:dev          # API — reads .env.local
npm run expo:dev            # Expo — reads .env.local
```

---

## Remaining tasks playbook (6–14)

| Task | You do | Agent / repo |
|------|--------|--------------|
| **6** Remove Replit code | — | ✅ Done 2026-06-28 |
| **7** Verify locally | — | ✅ Done 2026-06-28 (physical device, auth, holdings, Gemini) |
| **8** Choose hosting | Render + UptimeRobot | ✅ Done 2026-06-28 |
| **9** Deploy backend | Render env vars + deploy | ✅ `briefcase-api-ykj0.onrender.com` |
| **10** Custom domain | **`briefcase.echovault.me`** → Render (Vercel DNS CNAME) | ✅ Done 2026-06-28 |
| **11** Xcode Archive | `expo prebuild`, `pod install`, Archive in Xcode | `ios/.xcode.env.local` + Archive |
| **12** Production smoke test | TestFlight + live API checklist | Task 12 |
| **13** App Store submit | Submit Archive from Task 11 | Required for users on `briefcaseapp.replit.app` |
| **14** Decommission Replit | Final prod backup; stop deployment | After 24–48h stable on new host |

**Production hostname (after Task 10):** `briefcase.echovault.me`  
**Render fallback URL:** `https://briefcase-api-ykj0.onrender.com` (until Task 10 DNS propagates)

```bash
EXPO_PUBLIC_DOMAIN=briefcase.echovault.me   # after Task 10; use on Render + Xcode Archive
DATABASE_URL=<transaction pooler URI — port 6543, see Task 9>
# Same: GEMINI_API_KEY, FINNHUB_API_KEY, RESEND_API_KEY
# Render sets PORT automatically — do not override
```

**App Store users today** still hit `briefcaseapp.replit.app` until Task 13 ships.

---

## Progress tracker

| Task | Description | Status |
|------|-------------|--------|
| 1 | Export Replit **production** PostgreSQL | ✅ |
| 2 | Create Supabase project | ✅ |
| 3 | `.env.local` + link CLI + restore dump | ✅ |
| 4 | Verify imported data | ✅ (automated counts; optional email spot-check) |
| 5 | Secrets + `.env.local` (API keys) | ✅ |
| 6 | Remove Replit code paths | ✅ |
| 7 | Verify locally | ✅ |
| 8 | Choose hosting (Render + UptimeRobot) | ✅ |
| 9 | Deploy backend | ✅ |
| 10 | Custom domain **`briefcase.echovault.me`** | ✅ |
| 11 | Xcode Archive | 🟡 in progress |
| 12 | Production verification | ⬜ |
| 13 | App Store submit | ⬜ |
| 14 | Decommission Replit | ⬜ |

---

## Migration log (files, commands, debug notes)

Track artifacts and gotchas here when debugging later tasks.

### Pre-migration (repo setup)

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-28 | Pushed repo to GitHub | [bigbadbillion/Briefcaseapp](https://github.com/bigbadbillion/Briefcaseapp.git), branch `main` |
| 2026-06-28 | Fixed `package-lock.json` | Replaced `package-firewall.replit.local` URLs with `registry.npmjs.org` |
| 2026-06-28 | Updated `.gitignore` | Added `.local/`, `.config/`, `.env`, `*.dump` |

**Commit:** `f0d000e` — Fix npm lockfile and gitignore for off-Replit development.

### Render production (Task 8–9)

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-28 | Render web service deployed | **`https://briefcase-api-ykj0.onrender.com`** |
| 2026-06-28 | Build fix: added `esbuild` to `dependencies` | Render `server:build` was failing with `esbuild: not found` |
| 2026-06-28 | `EXPO_PUBLIC_DOMAIN` | Must be **`briefcase-api-ykj0.onrender.com`** (not `briefcase-api.onrender.com`) |
| 2026-06-28 | UptimeRobot monitor | Pinging `/api/health` every 5 min |
| 2026-06-28 | Task 10 custom domain live | **`https://briefcase.echovault.me`** — landing + API |

### Files created for migration

| File | Purpose | Committed? |
|------|---------|------------|
| `.env.local` | Secrets: Supabase password, publishable key, API keys (Task 5+) | No (gitignored) |
| `scripts/load-env.sh` | Loads `.env.local`, builds `DATABASE_URL` from password | Yes |
| `scripts/restore-replit-dump.sh` | `pg_restore` into Supabase; `DUMP_FILE=` env override | Yes |
| `shared/publicUrl.ts` | Base URL helper (`http` localhost, `https` production) | Yes |
| `supabase/config.toml` | Supabase CLI project config (`supabase init`) | Yes |
| `supabase/.gitignore` | Ignores CLI temp/credentials | Yes |
| `briefcase_backup.dump` | Dev Replit export (wrong DB — keep for reference only) | No (gitignored) |
| `briefcase_production_backup.dump` | **Production** Replit export — source of truth | No (gitignored) |

### Files edited for migration

| File | Change |
|------|--------|
| `migration.md` | Official checklist (this file) |
| `drizzle.config.ts` | Loads `.env.local`; auto-builds DB URL from `SUPABASE_DB_PASSWORD` |
| `package.json` | Migration scripts; `server:dev` / `expo:dev` load `.env.local` |
| `server/index.ts` | CORS off Replit; macOS listen fix |
| `server/services/emailService.ts` | Uses `getPublicBaseUrl()` |
| `client/lib/query-client.ts` | `http://` for localhost |
| `client/screens/PaywallScreen.tsx` | Dynamic privacy URL |
| `scripts/build.js` | `EXPO_PUBLIC_DOMAIN` only |
| `.gitignore` | Replit dirs, env files, dump files |

### npm scripts reference

```bash
npm run supabase:link          # Link CLI to project yqzdgucrfwpjszxyhbjv
npm run db:restore             # Default: briefcase_backup.dump (dev)
DUMP_FILE=briefcase_production_backup.dump npm run db:restore   # Production
npm run db:push                # Drizzle schema only (if no dump)
```

### Supabase connection debug notes

| Issue | Fix |
|-------|-----|
| `db.*.supabase.co` DNS fails locally | Direct host is IPv6-only on free tier; use **session pooler** instead |
| `aws-0-us-east-2` pooler → tenant not found | This project's pooler is **`aws-1-us-east-2.pooler.supabase.com`** (not `aws-0`) |
| `DATABASE_URL` / `REPLACE_ME` in `.env.local` | Only set `SUPABASE_DB_PASSWORD` — scripts build the URL automatically |
| `load-env.sh` "Missing .env.local" when sourced | Fixed: use `${BASH_SOURCE[0]}` not `$0` |
| `ReactNativeDependencies` / `hermes-engine` `PhaseScriptExecution failed` in Xcode | Set `export NODE_BINARY=/opt/homebrew/bin/node` in `ios/.xcode.env.local` (Xcode GUI doesn’t inherit Homebrew PATH) |
| Dev vs prod Replit dump | Shell `$DATABASE_URL` = **dev** (helium). Production URL from Database → **Production** → Settings (neon.tech) |

**Auto-built connection strings** (in `scripts/load-env.sh`):

- Session pooler (restore, drizzle, local dev): `aws-1-us-east-2.pooler.supabase.com:5432`
- Transaction pooler (production Express, Task 9+): `aws-1-us-east-2.pooler.supabase.com:6543`
- Username format: `postgres.yqzdgucrfwpjszxyhbjv`

**Requires:** `brew install libpq` for `pg_restore` / `psql` on Mac (`/opt/homebrew/opt/libpq/bin/`).

### `.env.local` keys (current)

| Key | Status |
|-----|--------|
| `SUPABASE_URL` | Set |
| `SUPABASE_PROJECT_REF` | Set (`yqzdgucrfwpjszxyhbjv`) |
| `SUPABASE_PUBLISHABLE_KEY` | Set |
| `SUPABASE_DB_PASSWORD` | Set |
| `SESSION_SECRET`, `GEMINI_API_KEY`, `FINNHUB_API_KEY`, `RESEND_API_KEY`, `EXPO_PUBLIC_DOMAIN` | **Set** (Task 5, 2026-06-28) |

### GitHub remote

```bash
git remote -v
# github  https://github.com/bigbadbillion/Briefcaseapp.git
```

---

## Original Replit agent notes (preserved)

> It's more than just the database. Replit-managed: PostgreSQL, backend hosting, static bundle hosting, domain (`briefcaseapp.replit.app`). Portable: React Native/Expo codebase, Express server, external APIs (Alpha Vantage, CoinGecko, Finnhub, Gemini, Resend, RevenueCat), App Store binary (needs new domain). Main friction: existing App Store users may have `briefcaseapp.replit.app` hardcoded — requires an App Store update to redirect them.
