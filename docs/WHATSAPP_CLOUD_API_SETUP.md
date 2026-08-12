# WhatsApp Cloud API setup guide (Meta)

Setup checklist **before** we wire OTP into the NS Ventures portfolio app.

**Goal:** Send one-time passwords (OTP) via **Meta WhatsApp Cloud API** (official Business API), not Authyo.

**Current app state:** Portfolio gate uses **email OTP (Resend)**. WhatsApp (Authyo) code exists but is disabled. This guide covers Meta setup only.

---

## What you need overall

| Layer | What |
|--------|------|
| Meta **Business Manager** | Company identity, WhatsApp Business Account, phone number, payment method |
| Meta **for Developers** (app) | App + WhatsApp product + API credentials (token, Phone Number ID) |
| Meta **template** | Approved OTP / authentication message template |
| Later (code) | Env vars + send OTP from our edge function |

Business Manager and the Developer app are **different places**, then linked.

- Business Manager: [business.facebook.com](https://business.facebook.com)
- Developers: [developers.facebook.com](https://developers.facebook.com)

---

## 1. Business Manager — what should be ready

Log in as someone who can manage the business (Admin).

### 1.1 Business account

- [ ] Business Manager created (you already have this)
- [ ] Correct business name / legal details
- [ ] You (and any tech person) have **Admin** or adequate access

### 1.2 WhatsApp Business Account (WABA)

Under **Business settings → Accounts → WhatsApp accounts** (wording can vary):

- [ ] A **WhatsApp Business Account** exists (or is created)
- [ ] Account is not locked / restricted
- [ ] You know which WABA will send OTPs (one business can have more than one)

### 1.3 Phone number for WhatsApp

- [ ] A phone number is **added and verified** on that WABA
- [ ] Number is **not** already registered on WhatsApp personal in a conflicting way (Meta will walk you through migration if needed)
- [ ] Prefer a dedicated business / virtual number for production OTP
- [ ] In WhatsApp Manager you can see the number status as connected / active

### 1.4 Payments (required for real users)

Outside Meta’s free test quotas, messaging bills to the business:

- [ ] **Payment method** added on the Business / WhatsApp billing
- [ ] Understand India / your region **conversation** pricing for utility / authentication templates

Without billing, production sends to customers outside the allowed test numbers will fail.

### 1.5 People & partners (optional but useful)

- [ ] Developers who will create the app are added to Business Manager
- [ ] App will later be able to access this WABA (see §2)

**Business Manager output (save these names):**

| Item | Your value |
|------|------------|
| Business name | |
| WhatsApp Business Account name | |
| Display name on WhatsApp | |
| Phone number (E.164, e.g. `+9198…`) | |

---

## 2. Meta for Developers — what to create

Open [developers.facebook.com](https://developers.facebook.com) with a user that belongs to the Business Manager.

### 2.1 Create the Meta app

1. **My Apps → Create App**
2. Choose use case aimed at **Business** / business integrations (labels change over time — pick the option that allows **WhatsApp**)
3. Select / link your **Business Manager** when asked
4. Name the app clearly, e.g. `NS Ventures Portfolio OTP`

- [ ] App created
- [ ] App is linked to the correct Business Manager

### 2.2 Add WhatsApp product

Inside the app:

1. **Add product → WhatsApp → Set up**
2. Open **WhatsApp → API Setup** (or **WhatsApp → Getting started**)

- [ ] WhatsApp product added
- [ ] Correct **WhatsApp Business Account** selected for this app

### 2.3 Credentials to copy (do not commit to git)

From **WhatsApp → API Setup**:

| Credential | Where it appears | Used for |
|------------|------------------|----------|
| **Phone number ID** | Selected phone number card | API path: `/{phone-number-id}/messages` |
| **WhatsApp Business Account ID** | WABA section | Admin / webhooks / reporting |
| **Temporary access token** | API Setup (short-lived) | Quick tests only |
| **App ID** | App settings → Basic | Dashboard / some Meta tools |
| **App Secret** | App settings → Basic | Webhook verification / security — keep private |

For production OTP you need a **long-lived / permanent** token, not only the temporary one:

### 2.4 Production access token (recommended path)

Typical permanent approach (names in UI change slightly):

1. Business Manager → **Users → System users**
2. Create a **System user** (e.g. `nsv-whatsapp-otp`)
3. Assign assets:
   - The **Meta app**
   - The **WhatsApp Business Account** / phone number
4. Generate token with WhatsApp permissions, commonly including:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Store the token in a password manager / secret store (never in the frontend)

- [ ] System user created
- [ ] Permanent token generated
- [ ] Token tested with a sample send (Meta “Send message” or Graph API Explorer)

### 2.5 App mode: Development vs Live

- **Development:** Can message only numbers added as **test recipients**
- **Live:** Required for real customers after Business verification / requirements Meta shows for your app

- [ ] Know which mode you are in
- [ ] For go-live: complete any **Business verification** / App Review steps Meta requests for your use case

**Developer account output (save securely):**

| Item | Your value |
|------|------------|
| App name | |
| App ID | |
| Phone number ID | |
| WhatsApp Business Account ID | |
| Permanent access token | *(secret — do not paste into git)* |
| App Secret | *(secret)* |

---

## 3. OTP message template (required)

Cloud API **cannot** send free-form “Your OTP is 123456” to users who have not opted in / started a chat the way personal WhatsApp does.

You must use an **approved template**, preferably an **Authentication** template (built for OTP).

### 3.1 Create the template

In **WhatsApp Manager → Message templates** (or via Business Suite / Meta Business):

1. Create template category: **Authentication** (preferred) or **Utility** if Authentication is not available in your flow
2. Language: e.g. **English** (`en` / `en_US` — match exactly what you will send in API)
3. Body: Meta’s auth templates usually inject the code as a variable; follow their OTP template builder
4. Optional: button “Copy code” (supported on auth templates)
5. Submit for **approval**

- [ ] Template created
- [ ] Status = **Approved** (not Pending / Rejected)
- [ ] You noted exact **template name** and **language code**

Example (illustrative only — your approved name may differ):

| Field | Example |
|-------|---------|
| Template name | `portfolio_access_otp` |
| Language | `en` |
| Body variable | `{{1}}` = 6-digit OTP |

### 3.2 Template rules that affect our app

- OTP expiry shown in template should match our app (**5 minutes** today)
- Keep body short; don’t put marketing copy in authentication templates
- If rejected, fix wording and resubmit before coding against that name

---

## 4. Test numbers (Development mode)

While the app is in Development:

- [ ] Add your personal WhatsApp number as a **test recipient** in the WhatsApp API Setup
- [ ] Accept the invite / join if Meta asks
- [ ] Send a test template message from the dashboard to that number

Until Live mode + billing + approved template work together, customer phones outside the test list will fail.

---

## 5. What we will put in the project later (env — do not add yet unless ready)

These will map into Supabase Edge / server secrets (names can be finalized at implementation):

```bash
# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=EAAB...                 # permanent system user token
WHATSAPP_PHONE_NUMBER_ID=1234567890    # from API Setup
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321 # optional for some ops
WHATSAPP_TEMPLATE_NAME=portfolio_access_otp
WHATSAPP_TEMPLATE_LANG=en

# Already used by OTP today (keep)
OTP_HASH_SECRET=...
# Email remains available as fallback unless we decide WhatsApp-only
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

**Never** put `WHATSAPP_TOKEN` or `App Secret` in `VITE_*` frontend env vars.

---

## 6. How this fits our portfolio OTP (after Meta is ready)

Today:

```
User → gate modal → email OTP (Resend) → verify by email → 24h session
```

Target (to implement only after this checklist):

```
User → gate modal → WhatsApp Cloud API template OTP
                 → (optional) email fallback
                 → verify by phone (and/or email) → 24h session
```

Code touch points later (not this doc’s job):

- `supabase/functions/portfolio-otp-send` — call Meta Graph API instead of Authyo
- `src/components/ui/PortfolioAccessGateModal.tsx` — WhatsApp copy
- Disable / keep commented Authyo relay (`api/authyo/send-otp`)

Meta send endpoint (for implementers):

```http
POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_TOKEN}
Content-Type: application/json
```

Body shape: `type: "template"` with template name, language, and OTP as the template component parameter.

---

## 7. Ready-for-implementation checklist

Do **not** start coding until:

### Business Manager

- [ ] WABA active  
- [ ] Phone number connected  
- [ ] Payment method added (for production)  

### Developer app

- [ ] App created and linked to business  
- [ ] WhatsApp product added  
- [ ] **Phone number ID** copied  
- [ ] **Permanent token** working  

### Template

- [ ] Authentication (or utility) OTP template **Approved**  
- [ ] Exact **name** + **language** known  

### Test

- [ ] Test WhatsApp number receives a **dashboard / API** template message successfully  

Then share (in a private channel, not in a public git commit):

1. Phone number ID  
2. Template name + language  
3. Confirm token is stored somewhere we can add as a Supabase secret  
4. Preference: **WhatsApp only** / **WhatsApp + email fallback** / **user chooses**

---

## 8. Common pitfalls

| Issue | Why |
|-------|-----|
| “User is not a valid WhatsApp user” | Wrong country code / number format — use E.164 digits for Cloud API |
| Template not found | Name or language code mismatch vs approval |
| (#131030) Recipient not in allowed list | App still in Development; add test number |
| Token expired | Used temporary token instead of system user token |
| Paid messaging blocked | No payment method on business |
| Confused Authyo vs Meta | Old repo path used Authyo; this guide is **Meta Cloud API only** |

---

## 9. Quick map: Business vs Developer

| Responsibility | Business Manager | Meta for Developers |
|----------------|------------------|---------------------|
| Company / legal business | Yes | No |
| WhatsApp Business Account | Yes | Selected / linked |
| Phone number ownership | Yes | Shown as Phone number ID |
| Billing / payment | Yes | No |
| Create app + WhatsApp API product | No | Yes |
| Access token / App secret | System user often from BM | App settings + token UI |
| Message templates | WhatsApp Manager (business) | Used by API via app |
| Call Graph API to send OTP | No | Yes (via app credentials) |

---

## 10. Suggested order of work (you)

1. Confirm WABA + phone number in Business Manager  
2. Add payment method  
3. Create Developer app → add WhatsApp → link WABA  
4. Create System user + permanent token  
5. Create & get **OTP template approved**  
6. Send one successful test message to your phone  
7. Tell the team you’re ready → we implement in the portfolio OTP send path  

Until step 6 works in Meta’s own tools, fixing code will not help.

---

## 11. NSV path — existing WABA + NEW Developer app (current plan)

**Your situation**

- WABA + business portfolio already exist (working account / Business Suite).
- An earlier Developer app (same login) could **not** show / add WhatsApp product — abandon that broken app.
- Now: create a **new Developer app** while logged in as a Facebook user that is **associated with the Business** and has **full Admin access**.

**Do not recreate** WABA, phone number, or business portfolio. Only create a new app and connect it.

### Phase A — Before you start (Business Suite)

Log into [business.facebook.com](https://business.facebook.com) with the **Admin** Facebook user.

1. Confirm you see the correct **business portfolio**.
2. **Business settings → Accounts → WhatsApp accounts**  
   - Confirm the **WABA** is there.  
   - Confirm the **phone number** is connected.
3. **Business settings → Users → People**  
   - Confirm the Facebook user you’ll use for Developers is listed as **Admin**.
4. (Optional but recommended) Confirm an **Authentication / OTP template** already exists and is **Approved**. If not, create it later in WhatsApp Manager.
5. Confirm a **payment method** exists if you will message real customers (not only test numbers).

### Phase B — Create the new Developer app

Log into [developers.facebook.com](https://developers.facebook.com) with that **same Admin** Facebook user.

1. **My Apps → Create App**
2. Use case: select **only**  
   **Connect with customers through WhatsApp**  
   (do not select Messenger / Instagram)
3. **Next** → when asked for business / portfolio, select the **existing verified business portfolio** (the one that already owns the WABA)
4. Finish all remaining create steps (Requirements / Overview) until the app is created
5. Open the new app dashboard  
   - Left sidebar should show **WhatsApp** under Products  
   - If WhatsApp is missing again: stop and recreate once more with only the WhatsApp use case + correct portfolio; do not continue with an app that shows **App type: None**

### Phase C — Connect existing WABA / phone (Developer → WhatsApp)

In the app: **WhatsApp → Quick-start** or **API setup**

1. If Meta asks to create a business portfolio → choose **existing** portfolio (do not create a duplicate)
2. Select / connect the **existing WhatsApp Business Account**
3. Select the **existing phone number** (or finish Meta’s “add phone” only if it asks to attach the same number — do not register a brand-new production number unless intended)
4. On **API setup**, copy and save:
   - **Phone number ID**
   - **WhatsApp Business Account ID**
   - Temporary token is OK for a quick test only (expires ~24h)

### Phase D — Permanent token (Business Suite — System User)

Still use the Admin user on [business.facebook.com](https://business.facebook.com):

1. **Business settings → Users → System users → Add**
2. Name example: `nsv-whatsapp-otp`
3. Role: **Admin**
4. Open that system user → **Add assets**
   - Add the **new Developer app** → allow control  
   - Add the **WhatsApp Business Account** → allow control  
   - Include the phone number asset if Meta shows it separately
5. **Generate token**
   - Select the **new app**
   - Enable permissions:
     - `whatsapp_business_messaging` (send messages / OTP)
     - `whatsapp_business_management` (manage WhatsApp account access Meta often requires)
6. Generate → **copy the token once** → store in a password manager  
   This is the production token (not the temporary API-setup token).

### Phase E — OTP template (Business / WhatsApp Manager)

If not already approved:

1. Open WhatsApp Manager for that WABA  
2. **Message templates** → create **Authentication** (OTP) template  
3. Wait until status = **Approved**  
4. Note exact **template name** + **language code** (e.g. `en`)

### Phase F — Prove it works (before any coding)

1. In Developer **API setup**, add your personal WhatsApp as a **test number** (while app is in Development)
2. Send a test template / hello message from Meta’s UI or API tools
3. Confirm the message arrives on your phone
4. Only then hand credentials to engineering

### Hand-off checklist (what engineering needs)

| Item | From |
|------|------|
| Phone Number ID | Developer → WhatsApp → API setup |
| WhatsApp Business Account ID | Developer → WhatsApp → API setup |
| Permanent access token | Business Suite → System user |
| Template name + language | WhatsApp Manager |
| App ID | Developer → App settings → Basic |
| App Secret | Developer → App settings → Basic (server only) |

### CEO / Admin one-liner

“We keep the existing WhatsApp Business Account and number. We only create a new Developer app under an Admin user, attach that app to the existing WABA, then create a System User token so the website can send OTPs.”
