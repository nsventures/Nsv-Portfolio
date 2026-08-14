# Session context — 2026-08-05 to 2026-08-13

Handoff notes for resuming this work in a new Claude Code session. Paste/reference this file
so the next session has full context without re-deriving it.

**Important:** this file only documents what happened. It does **not** carry the actual
uncommitted code changes to a new machine/environment — see "Uncommitted changes" at the
bottom for what to do about that before you switch systems.

---

## 1. Supabase egress investigation (DONE, committed, pushed)

**Starting point:** Supabase Free Plan Cached Egress usage was climbing toward/over the 5GB
monthly quota despite very low public site traffic (Vercel Analytics showed ~7 visitors/day).

**Root cause found:** the admin Tours list (`/admin/tours`) has **1,265 tours** in it, and its
`<img>` thumbnails had no `loading="lazy"` — every time anyone opened that page, the browser
eagerly downloaded **all 1,265 thumbnails** at once. Confirmed via raw Supabase Storage request
logs (hundreds of sequential GETs to `tour-thumbs/*.webp` in a ~20s window, same browser
session) and later confirmed live via a temporary `onLoad` console logger (removed after
verification) — lazy loading now correctly loads only ~60 images on initial render.

**Fixes applied (commit `52dd5f8`, pushed to `origin/main`):**
- `loading="lazy" decoding="async"` added to the thumbnail `<img>` in
  `src/admin/pages/ToursPage.tsx`
- `cacheControl: '31536000'` (1 year, was defaulting to Supabase's 1-hour default) added to
  every `tour-thumbs` upload call site:
  - `src/admin/api/adminPortfolio.ts` (`uploadTourThumbnail`, `duplicateTour`)
  - `server/bulk-import.mjs`
  - `scripts/compress-thumbnails.mjs`
- `fetchPortfolioStats()` in `src/admin/api/adminPortfolio.ts` rewritten from "fetch every row
  and count client-side" to four `head: true, count: 'exact'` queries — near-zero bytes
  transferred instead of the full table.

**Explicitly decided NOT to do:** true server-side pagination for `fetchAdminTours()` (used by
the Tours list). At 1,265 rows it's a bigger dataset than first assumed, but the user said
"leave it" — the search-as-you-type / drag-reorder UX cost wasn't worth it. Table still loads
all 1,265 rows into the DOM per visit (cheap in bytes — small columns — just heavier on
render/scroll).

**Status as of last dashboard check (05 Aug):** Cached Egress was at 5.23GB / 5GB quota (0.23GB
over) for the 16 Jul–16 Aug billing cycle. The fixes had *just* been deployed, so that number
still mostly reflects pre-fix behavior. **Recommended next step: check Project Settings → Usage
→ Cached Egress daily trend now — several days have passed since deploy, this is the first real
signal of whether the fix worked.** Expectation was a large drop given the fix targets the
dominant contributor.

**Recommendation given:** stay on the Free plan; don't upgrade to Pro (unlocks Smart CDN) until
you've confirmed via the dashboard that the bug fix — not real usage — was actually the driver.

**Unrelated bug fixed in passing:** reCAPTCHA "Security check expired or invalid" error on a
new domain (`projects.nsventures.in`) — was a domain-not-registered issue in the Google
reCAPTCHA admin console (google.com/recaptcha/admin), not a code bug. User handled adding the
domain there directly.

---

## 2. WhatsApp OTP: Authyo → Meta WhatsApp Cloud API (CODE DONE, credentials pending, UNCOMMITTED)

**Why:** user wants to drop Authyo as WhatsApp OTP provider and use Meta's WhatsApp Cloud API
directly, since they have a verified Meta Business Portfolio + existing WhatsApp Business
Account (WABA).

**Reference doc (pre-existing in repo, still accurate):** `docs/WHATSAPP_CLOUD_API_SETUP.md` —
full checklist for what's needed from Business Manager, Meta for Developers, and template
approval. Section 11 ("NSV path") matches this exact scenario (existing WABA, new Developer
app).

### Code changes made (all in working tree, **not yet committed** — user said "hold it")

- **New:** `sendWhatsappOtpViaMeta()` in `supabase/functions/_shared/portfolio-otp.ts` — calls
  `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` with a template message.
  Reads `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`,
  `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_DEV_MODE` from env. Gracefully no-ops (`sent: false`) if
  not configured — doesn't throw, doesn't break email.
  - **Note:** only sends the required `body` template component (the OTP text). If the
    approved template also has a "Copy code" button, a matching `button` component needs
    adding — there's a comment in the code showing the exact shape, left out because we don't
    yet know if the approved template includes it.
- **Wired in:** `supabase/functions/portfolio-otp-send/index.ts` — after email OTP sends
  successfully, best-effort calls `sendWhatsappOtpViaMeta()` (try/catch, logs a warning on
  failure, never rolls back the already-sent email). Updates `whatsapp_sent_at` in
  `portfolio_otp_challenges` table (column already existed from old Authyo-era migration
  `012_otp_delivery_metadata.sql`). Response now includes `whatsappSent: boolean`.
- **Client wrapper simplified:** `src/api/portfolioOtp.ts` — removed the whole Authyo relay
  dispatch-token client logic (`dispatchWhatsappOtp`, `authyoRelayUrl`); Meta doesn't need a
  browser relay since Cloud API is called directly from the Supabase edge function
  server-side. `PortfolioOtpSendResult` now has `whatsappSent: boolean`.
- **Authyo fully removed:**
  - Deleted: `api/authyo/send-otp.mjs`, `server/lib/authyo-client.mjs`,
    `server/lib/whatsapp-dispatch.mjs`, `supabase/functions/_shared/whatsapp-dispatch.ts`,
    `scripts/debug-authyo.mjs`, `scripts/test-authyo.mjs`
  - Removed all Authyo functions from `supabase/functions/_shared/portfolio-otp.ts`
    (`sendWhatsappOtpViaAuthyo`, `collectAuthyoOrigins`, `resolveAuthyoOrigin`,
    `authyoSendOtpRequest`, etc.)
  - Removed Authyo relay route/handler/imports from `server/bulk-import.mjs`
  - Removed `/api/authyo` dev proxy from `vite.config.ts`
  - Removed `test:authyo` script from `package.json`
  - Removed `VITE_AUTHYO_RELAY_URL` from `src/vite-env.d.ts`
  - Removed dead Authyo-specific comment block from
    `src/components/ui/PortfolioAccessGateModal.tsx`
  - Updated `.env.example` — Authyo sections replaced with `WHATSAPP_*` placeholders
  - Updated `docs/WHATSAPP_CLOUD_API_SETUP.md` intro to reflect current implementation state
- **Verified clean:** `tsc --noEmit` passes, `node --check server/bulk-import.mjs` passes, no
  remaining `authyo`/`Authyo`/`AUTHYO` references anywhere in `src/`, `supabase/functions/`,
  `server/`.
- **Known gap, not done:** `README.md`, `supabase/README.md`, `docs/DOCUMENTATION.md` still have
  old Authyo prose (architecture diagrams, env var tables, setup instructions) — not rewritten
  yet, deliberately deprioritized in favor of the functional code.

### Credentials status

User received these from a contact ("Prince Sir Nsv") via chat, generated **from the Developer
app's WhatsApp → API setup screen** (confirmed via Meta's Access Token Debugger — token showed
**Type: User**, **already expired**):

| Item | Value | Status |
|------|-------|--------|
| App ID | `2074773563178054` | not used by code, reference only |
| Phone Number ID | `1297455366779783` | **user confirmed this is a TEST number, not final** |
| Business/WABA ID | `1584386823091226` | not used by code, reference only |
| Access Token | (saved in `supabase-edge-secrets.env`) | **confirmed EXPIRED, wrong type — do not use** |

These were saved into `supabase-edge-secrets.env` (git-ignored, same file as
`OTP_HASH_SECRET`/`RESEND_API_KEY`) with a `TODO confirm` comment, **before** the expiry was
confirmed. They are effectively placeholder/dead values now.

### What's still needed before this can go live

1. **Real production Phone Number ID** (not the test one) — from Developer app → WhatsApp →
   API setup, once the real business number is connected there.
2. **Permanent System User access token** — must come from **Business Suite → Business
   settings → Users → System users → Generate token**, with `whatsapp_business_messaging` +
   `whatsapp_business_management` permissions, expiration set to **"Never"** if offered. The
   Developer app's own API-setup screen can only ever produce a temporary (~24h) token — this
   was the exact mistake made with the credentials above.
   - Verify with Meta's Access Token Debugger
     (https://developers.facebook.com/tools/debug/accesstoken/) — should show **Type: System
     User** (or similar) and **Expires: Never**, not "Type: User" with an expiry date.
3. **Approved OTP template name + language code** from WhatsApp Manager (Authentication
   category template). Not yet obtained as of this session.
4. Once all three are in hand: update `supabase-edge-secrets.env` with the real values, push
   secrets to Supabase (`npx supabase secrets set --env-file supabase-edge-secrets.env` or via
   Dashboard → Edge Functions → Secrets), then test end-to-end.

---

## 3. Git state

- `main` branch, up to date with `origin/main` as of the egress-fix push (commit `52dd5f8`
  "Reduce Supabase egress: long-lived thumbnail caching, lighter stats query, lazy-loaded admin
  thumbnails").
- **All WhatsApp/Authyo migration changes described in section 2 are UNCOMMITTED** — sitting in
  the working tree only, per explicit user instruction ("no hold it") to not commit yet.
- `supabase-edge-secrets.env` and `.env.local` are git-ignored — confirmed via `git check-ignore`
  earlier in the session. No secrets have been committed.

## 4. Uncommitted changes — action needed before switching systems

Since the WhatsApp/Authyo code changes are **only in this working directory**, they will **not**
travel to a different machine/environment automatically. Options, if this session's working
directory won't be the one you resume in:
- Commit them to a separate branch (not `main`) as a safety net — preserves the work without
  putting it on `main` before you're ready
- `git diff > whatsapp-meta-migration.patch` and carry the patch file
- Just make sure whatever "changing system" means, you still land in this same folder
  (`a:\nsvportfolio 1`) with the working tree intact

Ask a fresh session to run `git status` / `git diff` first to confirm whether these changes are
still present before assuming this file's description of "done" still matches reality.
