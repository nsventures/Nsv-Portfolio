# Supabase setup

Quick-start for a fresh Supabase project. Full reference: [docs/DOCUMENTATION.md](../docs/DOCUMENTATION.md).

## Step 1 — Database

In **SQL Editor**, run every file in `supabase/migrations/` in number order, `001` → `029`.

- Both `016_*` files are needed (run either one first).
- **Skip `026_vr_tab_follows_sort_order.sql`.** It breaks the public site. `028` and `029` replace it.
- Several files redefine `get_portfolio_page`; the last one you run wins. On an existing project, only run what's new (currently **028** and **029**).

Then add to `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Step 2 — Portfolio OTP (email + WhatsApp) and session

- **Email** (Resend) is required. If it fails, no code is issued.
- **WhatsApp** (Meta Cloud API) sends the same 6-digit code on a best-effort basis. It is skipped until its secrets are set. Setup: [docs/WHATSAPP_CLOUD_API_SETUP.md](../docs/WHATSAPP_CLOUD_API_SETUP.md).
- After verifying, the visitor gets a **24-hour** session token. Links are only returned by `portfolio-viewer` with that token.

### Secrets

Dashboard → **Edge Functions** → **Secrets**:

| Secret | Required | Notes |
|--------|----------|-------|
| `OTP_HASH_SECRET` | Yes | Random 32+ characters; also signs sessions |
| `ACCESS_TOKEN_SECRET` | No | Separate session-signing secret |
| `RESEND_API_KEY` | Yes | |
| `RESEND_FROM_EMAIL` | Yes | e.g. `NS Ventures <noreply@nsventures.in>` |
| `RESEND_DEV_MODE` | No | `true` = log the code instead of emailing |
| `CALLBACK_NOTIFY_EMAIL` | No | Callback recipient |
| `WHATSAPP_TOKEN` | For WhatsApp | Meta access token |
| `WHATSAPP_PHONE_NUMBER_ID` | For WhatsApp | |
| `WHATSAPP_TEMPLATE_NAME` | For WhatsApp | Approved authentication template |
| `WHATSAPP_TEMPLATE_LANG` | No | Default `en_US` |
| `WHATSAPP_DEV_MODE` | No | `true` = log instead of sending |
| `RECAPTCHA_SECRET_KEY` | Recommended | Unset = captcha skipped |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### Deploy edge functions

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy portfolio-otp-send --no-verify-jwt
npx supabase functions deploy portfolio-otp-verify --no-verify-jwt
npx supabase functions deploy portfolio-viewer --no-verify-jwt
npx supabase functions deploy portfolio-callback --no-verify-jwt
```

If you paste code into the Dashboard instead, inline the needed files from `supabase/functions/_shared/` at the top of each function, remove the `../_shared/` imports, and turn off **Enforce JWT verification**.

### Test

Set `RESEND_DEV_MODE=true` (and `WHATSAPP_DEV_MODE=true`), request a code on the site, and read it from the **portfolio-otp-send** logs.

## Step 3 — Admin access

1. **Authentication** → **Users** → **Add user** (email + password). Copy the user's UUID.
2. **SQL Editor**:

```sql
insert into public.admin_users (user_id, email)
values ('PASTE-USER-UUID-HERE', 'you@nsventures.in')
on conflict (user_id) do nothing;
```

3. **Authentication** → **URL Configuration** → add `https://projects.nsventures.in/admin/login` (and `http://localhost:5173/admin/login` for local) to Redirect URLs.
4. Sign in at `/admin/login`.

## Step 4 — Hosting

**Vercel** (auto-deploys `nsventures/Nsv-Portfolio` `main`): set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_IS_PRODUCTION=true`, `VITE_ADMIN_GATE_PASSWORD`, `VITE_RECAPTCHA_SITE_KEY`, and optionally `YOUTUBE_API_KEY` and `VITE_BULK_IMPORT_API_URL`. Redeploy after changes.

**Bulk import server** (optional, for bulk upload in production):

```bash
docker build -f server/Dockerfile -t nsv-bulk-import .
docker run -p 3001:3001 \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  nsv-bulk-import
```

Health check: `GET https://your-import-host/api/bulk-import/health`. Then set `VITE_BULK_IMPORT_API_URL` on Vercel. Video-only imports can run on plain Node with `npm run start:import`; VR screenshots need the Docker image.

Locally, `npm run dev:all` runs everything with no extra config.
