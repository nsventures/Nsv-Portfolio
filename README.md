# NS Ventures Portfolio

Marketing website and admin CMS for NS Ventures — property marketing films, drone cinematography, and 360° virtual tours.

Live: [projects.nsventures.in](https://projects.nsventures.in)

## Features

- Public portfolio with Videos and Virtual tours tabs, state filter, infinite scroll
- One-time-code gate (email, plus WhatsApp via Meta) before any media opens
- Callback request form with email notification and lead capture
- Admin: portfolio CRUD, sort order with site preview and confirm, cities, bulk CSV/Excel import
- YouTube thumbnails and publish dates fetched automatically, with a manual date field as fallback
- Supabase backend (Postgres, Auth, Storage, Edge Functions), hosted on Vercel

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in at least VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev       # site + admin on http://localhost:5173
npm run dev:all   # also starts the bulk import server (:3001)
```

Admin: http://localhost:5173/admin/login

## Documentation

- **[Full documentation](docs/DOCUMENTATION.md)** — architecture, OTP flow, admin, sort order, YouTube dates, database, env vars, deployment, troubleshooting
- [Bulk upload analysis](docs/BULK_UPLOAD_ANALYSIS.md)
- [WhatsApp Cloud API setup](docs/WHATSAPP_CLOUD_API_SETUP.md)
- [Supabase setup](supabase/README.md)

## Deploy

| Platform | What runs there |
|----------|-----------------|
| **Vercel** | React SPA + `/api/youtube/*` — auto-deploys from `nsventures/Nsv-Portfolio` `main` |
| **Supabase** | Database, auth, storage, edge functions (OTP, viewer, callback) |
| **Separate Node / Docker host** (optional) | Bulk import server |

Build: `npm run build` → `dist/`

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase · Resend · Meta WhatsApp Cloud API · Vercel
