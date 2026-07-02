# Supabase setup

## Step 1 — Database (done)

1. **SQL Editor** → run `supabase/migrations/001_initial.sql`
2. **SQL Editor** → run `supabase/migrations/002_portfolio_category.sql` (video categories from bulk upload)
3. **SQL Editor** → run `supabase/migrations/003_portfolio_category_filter.sql` (category filter on live site)
4. **SQL Editor** → run `supabase/migrations/004_category_counts_by_media_type.sql` (category counts per videos / VR page)
5. **SQL Editor** → run `supabase/migrations/005_add_state_to_cities.sql`
6. **SQL Editor** → run `supabase/migrations/006_state_counts_all_cities.sql`
7. **SQL Editor** → run `supabase/migrations/007_portfolio_state_labels.sql` (state + builder/project/city on items)
8. **SQL Editor** → run `supabase/migrations/008_hide_portfolio_links.sql` (hide links from public API)
9. **SQL Editor** → run `supabase/migrations/009_portfolio_whatsapp_otp.sql` (OTP challenges table)
10. **SQL Editor** → run `supabase/migrations/010_portfolio_otp_email_index.sql` (email lookup index)
11. **SQL Editor** → run `supabase/migrations/011_protect_portfolio_viewer.sql` (links only via session token)
12. **SQL Editor** → run `supabase/migrations/012_otp_delivery_metadata.sql` (WhatsApp delivery metadata)
13. Add `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

13. Restart `npm run dev`

---

## Step 1b — Portfolio OTP (Resend email + Authyo WhatsApp) + session

**Email** OTP is sent via **[Resend](https://resend.com)**. **WhatsApp** OTP uses the **same 6-digit code** via **[Authyo](https://authyo.io)**. After verification, the server issues a **30-day session token** (JWT). Video/VR links are only returned by the `portfolio-viewer` edge function when a valid token is sent.

### A. Resend setup

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain (or use `onboarding@resend.dev` for testing to your own inbox only)
3. Create an API key under **API Keys**

### B. Supabase secrets

Dashboard → **Edge Functions** → **Secrets**:

| Secret | Required | Example |
|--------|----------|---------|
| `OTP_HASH_SECRET` | Yes | Random 32+ char string (also used to sign session tokens) |
| `ACCESS_TOKEN_SECRET` | No | Optional separate secret for JWT signing |
| `RESEND_API_KEY` | Yes* | `re_...` |
| `RESEND_FROM_EMAIL` | Yes* | `NS Ventures <hello@nsventures.in>` |
| `RESEND_DEV_MODE` | No | `true` = log OTP only (testing) |
| `AUTHYO_CLIENT_ID` | Yes* | From Authyo application |
| `AUTHYO_CLIENT_SECRET` | Yes* | From Authyo application |
| `AUTHYO_ORIGIN` | Yes* | Site URL users open (e.g. `http://localhost:5173`) — also add in Authyo **Authorized endpoint** |
| `AUTHYO_DEV_MODE` | No | `true` = log WhatsApp OTP only (testing) |
| `CALLBACK_NOTIFY_EMAIL` | No | Callback form recipient (default `prateek@nsventures.in`) |

\*Email: not required when `RESEND_DEV_MODE=true`. WhatsApp: skipped when Authyo secrets missing; use `AUTHYO_DEV_MODE=true` for local logs.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on deploy.

### C. Deploy edge functions

**Option 1 — CLI**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy portfolio-otp-send
npx supabase functions deploy portfolio-otp-verify
npx supabase functions deploy portfolio-viewer
```

**Option 2 — Supabase Dashboard (manual)**

1. **Edge Functions** → **Create function** → name `portfolio-otp-send`
2. Paste code from `supabase/functions/portfolio-otp-send/index.ts` **plus** inline the contents of `supabase/functions/_shared/portfolio-otp.ts` at the top (Dashboard does not support `_shared` imports)
3. Repeat for `portfolio-otp-verify` and `portfolio-viewer` (inline `_shared/portfolio-otp.ts` and `portfolio-session.ts` as needed)
4. For each function: disable **Enforce JWT verification** (public site has no login)

When pasting manually, copy `supabase/functions/_shared/portfolio-otp.ts` into the top of each function file and remove the `import ... from '../_shared/...'` line.

### D. Database

Run migrations `009`, `010`, `011`, and `012` in SQL Editor if not already applied.

### E. Test

1. Set `RESEND_DEV_MODE=true` → submit modal → check **portfolio-otp-send** logs for the code
2. Set `RESEND_API_KEY` + `RESEND_FROM_EMAIL` + `AUTHYO_*` secrets + dev modes `false` → code arrives by email and WhatsApp

---

## Step 2 — Admin access

### 2a. Create an admin user

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Enter email + password (e.g. your work email)
3. Copy the user's **UUID** from the users list

### 2b. Allowlist the user

**SQL Editor** → run (replace values):

```sql
insert into public.admin_users (user_id, email)
values ('PASTE-USER-UUID-HERE', 'you@nsventures.in')
on conflict (user_id) do nothing;
```

### 2c. Open admin

1. Go to **http://localhost:5173/admin/login**
2. Sign in with the email + password from step 2a
3. Add tours at **Portfolio → Add tour**

---

## Admin features

| Page | URL |
|------|-----|
| Login | `/admin/login` |
| Dashboard | `/admin` |
| Portfolio list | `/admin/tours` |
| Add tour | `/admin/tours/new` |
| Edit tour | `/admin/tours/:id/edit` |

---

## Step 3 — Deploy online

### A. Public site (Vercel)

1. Connect the repo — build: `npm run build`, output: `dist`
2. **Vercel environment variables** (Settings → Environment Variables):

| Variable | Example | Notes |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Public |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Public |
| `OTP_HASH_SECRET` | same as Supabase | **Server only** — not `VITE_` |
| `AUTHYO_CLIENT_ID` | from Authyo app | Server only |
| `AUTHYO_CLIENT_SECRET` | from Authyo app | Server only |
| `AUTHYO_AUTHORIZED_ENDPOINT` | `https://your-site.vercel.app` | Must match Authyo dashboard |

3. **Authyo dashboard** → Application → **Authorized endpoint** = your live site URL (e.g. `https://nsvportfolio.vercel.app`), no trailing slash.

4. Redeploy Vercel after adding env vars.

**WhatsApp flow on Vercel:** browser → Supabase `portfolio-otp-send` (email + token) → Vercel serverless `/api/authyo/send-otp` → Authyo.

Optional: `VITE_BULK_IMPORT_API_URL` if bulk upload uses a separate import server (see B).

### B. Bulk import server (Railway / Render — optional)

**YouTube videos** only fetch thumbnails from YouTube CDN (lightweight). **VR tours** still use Playwright in the container.

From repo root:

```bash
docker build -f server/Dockerfile -t nsv-bulk-import .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  nsv-bulk-import
```

Health check: `GET https://your-import-host/api/bulk-import/health`

On Railway / Render: deploy from `server/Dockerfile`, set the three Supabase env vars, expose port **3001**.

Then set on Vercel (redeploy):

```env
VITE_BULK_IMPORT_API_URL=https://your-import-host.railway.app
```

**Video-only (no Docker):** a small Node VM can run `npm run start:import` with env vars — YouTube bulk upload works without Playwright. VR bulk upload needs the Docker image above.

### C. Local dev

```bash
npm run dev:all
```

Uses Vite proxy to `localhost:3001` — no `VITE_BULK_IMPORT_API_URL` needed.

---

## Step 4 (next)

- Inquiry form → Supabase + email (Resend)
- Load city filters from DB instead of `metroCities.ts`
- Cities CRUD in admin
