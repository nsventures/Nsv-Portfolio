# NS Ventures Portfolio

Marketing website and admin CMS for NS Ventures — property marketing films, drone cinematography, and 360° virtual tours.

## Features

- Public portfolio with video and VR tour grid, state filters, infinite scroll
- Email + WhatsApp OTP gate before viewing portfolio media
- Callback request form (email + lead capture)
- Admin panel: tours, cities, bulk CSV/Excel import
- Supabase backend (Postgres, Auth, Storage, Edge Functions)
- Hosted on Vercel

## Quick start (local)

```bash
npm install
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev:all   # site + bulk-import/WhatsApp relay
```

- Public site: http://localhost:5173
- Admin: http://localhost:5173/admin/login

See [supabase/README.md](supabase/README.md) for database, edge functions, and admin user setup.

## Documentation

**[Full project documentation → docs/DOCUMENTATION.md](docs/DOCUMENTATION.md)**

Covers architecture, data flows, OTP gate, admin CMS, Supabase schema, environment variables, deployment (Vercel + Supabase), and troubleshooting.

## Deploy

| Platform | What runs there |
|----------|-----------------|
| **Vercel** | React SPA + `/api/authyo/send-otp` WhatsApp relay |
| **Supabase** | Database, auth, storage, edge functions |
| **Railway/Render** (optional) | Bulk import server with Playwright |

Build: `npm run build` → output `dist/`

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase · Resend · Authyo · Vercel
