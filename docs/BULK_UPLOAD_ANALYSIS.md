# Bulk Sheet Upload — Full Analysis

How CSV/Excel bulk import works in the NS Ventures portfolio admin: architecture, parsing rules, per-row server logic, outcomes, site visibility, and why sheet counts often differ from on-site counts.

**Last verified against codebase:** July 2026  
**Primary code paths:**

| Layer | Path |
|-------|------|
| Admin UI | `src/admin/pages/BulkUploadPage.tsx`, `src/admin/components/BulkUploadPanel.tsx` |
| Job orchestration | `src/admin/context/BulkImportContext.tsx` |
| Client API / SSE | `src/admin/lib/bulkImport.ts` |
| Sheet parsing | `src/admin/lib/parseBulkSheet.ts` |
| Batches / drafts | `src/admin/lib/bulkBatches.ts`, `src/admin/lib/bulkUploadDraft.ts` |
| Import server | `server/bulk-import.mjs` |
| YouTube thumb / metadata | `scripts/lib/youtube-screenshot.mjs`, `scripts/lib/youtube-metadata.mjs` |
| ID / link helpers | `scripts/lib/tour-import-utils.mjs` |
| Public listing | `get_portfolio_page` RPC + `src/hooks/usePortfolio.ts` |

---

## 1. Purpose

Admins can import many portfolio items at once by uploading one or more sheets, optionally assigning each sheet (batch) to an Indian state. The system:

1. Parses the sheet in the **browser**
2. Sends valid rows to a dedicated **bulk-import server**
3. For each row: checks duplicates, captures a thumbnail, writes to **Supabase**
4. Streams live progress back to the admin UI (Server-Sent Events)

Imported items are published immediately (`is_published: true`) and appear on the public portfolio according to their `state` value.

---

## 2. Architecture overview

```
┌─────────────────────┐     parse CSV/XLSX      ┌──────────────────────┐
│  Admin Bulk Upload  │ ───────────────────────► │  BulkRow[] in browser │
│  (React / Vite)     │                          └──────────┬───────────┘
└─────────┬───────────┘                                     │
          │ POST /api/bulk-import                           │
          │ Authorization: Bearer <admin JWT>               │
          │ { state, rows, skipExisting, mediaType }        ▼
          ▼                                      ┌──────────────────────┐
┌─────────────────────┐                          │  Import server       │
│  Vite proxy (local) │ ──► or remote URL ─────► │  server/bulk-import  │
│  / VITE_BULK_…_URL  │     (SSE stream)         │  .mjs                │
└─────────────────────┘                          └──────────┬───────────┘
                                                            │
                     ┌──────────────────────────────────────┼──────────────┐
                     ▼                                      ▼              ▼
            YouTube CDN / Playwright              Supabase Storage   portfolio_items
            (thumbnail WebP)                      (tour-thumbs)      (+ optional meta)
```

### Where the import API runs

| Environment | How |
|-------------|-----|
| **Local** | `npm run dev:all` — Vite + import server (default `:3001`, proxied as `/api/bulk-import`) |
| **Production** | Not on Vercel alone. Needs a long-running host (e.g. Railway/Render + Docker) and `VITE_BULK_IMPORT_API_URL` on the frontend |

Health check: `GET /api/bulk-import/health` → `{ configured: true }` when Supabase service role is present.

### Auth

Every import requires a valid **admin** Supabase JWT (`Authorization: Bearer …`). The server verifies the user against admin rules before processing.

### Limits

- **Max 500 rows** per HTTP import request (one batch file’s parsed rows)
- Multiple batches in one UI job are sent **sequentially** (one request per batch)

---

## 3. Admin UI flow

### 3.1 Tabs / media types

| UI kind | `mediaType` sent to server | Typical sheet |
|---------|----------------------------|---------------|
| Virtual tours | `virtual-tour` | Name + Link (tour URLs) |
| YouTube videos | `video` | Category, Builder, Project, City, Youtube Link |

**Override:** if the link is a YouTube URL, the server always stores `media_type = video`, even if the VR tab was used.

### 3.2 Batches

You can add multiple batches. Each batch has:

| Field | Role |
|-------|------|
| **State** (optional) | Applied to **every row** in that file. Blank = `state: null` (“No state / All states only”) |
| **File** | `.csv`, `.xlsx`, or `.xls` |
| **Parsed rows** | Only rows that survive client-side parsing |

Important: the sheet’s own **State** column (if present) is **not** used to assign portfolio state. Only the dropdown value is applied.

Drafts (file names, states, skip flag, parsed row payloads) are kept in `localStorage` so a refresh does not wipe the form mid-setup.

### 3.3 “Skip existing links”

| Setting | Default | Behavior |
|---------|---------|----------|
| Checked | Yes | If the same `link` already exists, usually **skip**; may **light-update** labels/category/type without re-thumbnailing |
| Unchecked | — | Re-capture thumbnail and **update** the existing row (same link / id when possible) |

### 3.4 Progress UI

Statuses shown per row:

| Status | Meaning |
|--------|---------|
| `checking` | Looking up existing link |
| `thumbnail` | Fetching YouTube poster |
| `screenshot` | Playwright capture (VR) |
| `saving` | Writing to database |
| `done` | Inserted or successfully updated |
| `skipped` | Already exists; nothing required |
| `error` | Failed this row; continue with next |

Final summary aggregates: **success**, **failed**, **skipped**, **total**.

---

## 4. Sheet parsing (client)

**Entry:** `parseBulkFile(file, kind)` → `BulkRow[]`

### 4.1 File types

- **CSV** — text split by lines, RFC-style quoted fields
- **Excel** — first sheet only, via `xlsx`; converted to a matrix then same column logic

Empty lines are ignored. A BOM on CSV is fine if content still parses.

### 4.2 Header detection

A first row is treated as headers if it looks like metadata (contains `link`, `name`, `url`, `title`, `youtube`, `category`, `builder`, `project`, or `city`).

Without headers:

| Kind | Assumed columns |
|------|-----------------|
| Video | Col0 = category, Col1 = name, Col2 = link |
| Tour | Col0 = name, Col1 = link |

### 4.3 Column mapping (with headers)

Matchers are case-insensitive; first match wins.

| BulkRow field | Header matchers (priority order) |
|---------------|----------------------------------|
| `link` | exact `link` → exact `url` → header **includes** `youtube` |
| Display / fallback name | exact `name` → exact `title` → includes `project name` → exact `project` |
| `projectName` | includes `project name` → exact `project` |
| `builderName` | includes `builder` |
| `cityLabel` | includes `city name` → exact `city` |
| `category` | includes `category` or `catgor` |

Resolved project display name:

```text
projectName column  OR  name/title column  OR  slug derived from URL path
```

### 4.4 Row acceptance / rejection at parse time

For each data row:

1. Normalize link: trim, strip wrapping quotes, must `startWith('http')`, parse as `URL`, normalize to trailing `/`
2. If normalization fails → **row omitted** (silent; does not reach server)
3. If `kind === 'video'` and link is not YouTube → **row omitted**
4. Otherwise push a `BulkRow`

If zero rows remain → throw (e.g. “No valid YouTube links found”).

**Duplicates are not deduped in the parser.** The same YouTube URL listed twice produces two `BulkRow`s and two server iterations. The second typically becomes `skipped` or a label update.

### 4.5 What is *not* read from the sheet for assignment

- **State** column — ignored for `portfolio_items.state` (dropdown only)
- **Title** alone — used only if Project Name is empty (and Title often is empty in promo sheets)

---

## 5. Server processing (per row)

**Entry:** `POST /api/bulk-import` in `server/bulk-import.mjs`

Request body:

```json
{
  "state": "Haryana" | null,
  "rows": [ { "name", "link", "category?", "builderName?", "projectName?", "cityLabel?" } ],
  "skipExisting": true,
  "mediaType": "video" | "virtual-tour"
}
```

Response: **SSE** stream (`start` → many `item` → `complete`; optional `warn` / `fatal`).

### 5.1 Setup

1. Verify admin token  
2. Validate `rows` non-empty, `mediaType`, length ≤ 500  
3. Detect optional DB columns: `category`, label fields (`state`, `builder_name`, …), `video_published_at`  
4. Compute starting `sort_order` (append after current max)  
5. Emit `start` with `total: rows.length`

### 5.2 Decision tree (one row)

```
link invalid?
  └─ YES → error "Invalid link" → next

resolve media type (YouTube ⇒ video)
derive id:
  video → yt-<lowercase-video-id>
  tour  → slug from URL

emit "checking"
lookup portfolio_items WHERE link = normalizedLink

┌─ found AND skipExisting ─────────────────────────────────────────┐
│ build patch if needed:                                           │
│   • media_type mismatch                                          │
│   • category changed (if column exists)                          │
│   • labels: state, builder, project, city (from this batch)      │
│                                                                  │
│ patch empty? → skipped "Already exists as …"                     │
│ patch fails? → error                                             │
│ patch ok?    → done "Updated …"  (NO new thumbnail)              │
└──────────────────────────────────────────────────────────────────┘

┌─ new OR skipExisting off ────────────────────────────────────────┐
│ id = existing.id OR uniqueTourId(baseId)                         │
│ emit thumbnail | screenshot                                      │
│ capture thumbnail → upload storage tour-thumbs/{id}.webp         │
│   fail? → error "Thumbnail failed: …"  (NO insert)               │
│                                                                  │
│ if video: fetch publishedAt (best-effort; ignore failures)       │
│ emit saving                                                      │
│ insert OR update row:                                            │
│   name, link, thumbnail_path, media_type,                        │
│   is_published=true (insert), sort_order (insert),               │
│   category, state, builder_name, project_name, city_label,       │
│   city_id=null, video_published_at?                              │
│   fail? → error "Save failed: …"                                 │
│   ok?   → done                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Labels written on save / patch

When label columns exist (`withItemLabels`):

| DB column | Source |
|-----------|--------|
| `state` | Batch dropdown (`null` if blank) |
| `builder_name` | Sheet builder (or null) |
| `project_name` / `name` | Sheet project/title/name |
| `city_label` | Sheet city (or null) |
| `city_id` | Always set to `null` on bulk label write |

So bulk import does **not** attach a `cities` FK; city is free-text `city_label`.

### 5.4 Thumbnails

| Type | Method | Failure impact |
|------|--------|----------------|
| Video | Official YouTube poster via `i.ytimg.com` → compress WebP | Row **not** created |
| VR | Playwright Chromium opens tour URL → screenshot → WebP | Row **not** created |

Private, deleted, or mistyped YouTube IDs (including case-sensitive ID issues / `khttps://` typos) commonly fail here.

### 5.5 IDs and casing

- Portfolio id for videos: `yt-` + **lowercased** video id (storage key)
- Thumbnail fetch uses the **original** casing from the URL (`youtubeVideoIdFromUrl`)
- YouTube video ids are **case-sensitive** on Google’s CDN; wrong case → 404 thumbnail → import error

### 5.6 Duplicate detection key

Matching existing rows uses the **normalized `link` string** (trailing slash form), **not** the derived `yt-…` id alone.

Within one sheet, duplicate links still produce multiple iterations; only one published card remains for that URL (second is skip/update).

---

## 6. Outcomes and counters

### 6.1 Per-row statuses

| Status | Counted as | Typical cause |
|--------|------------|---------------|
| `done` (new insert) | success | First time seeing this link |
| `done` (Updated …) | success | `skipExisting` on, patch applied (state/category/labels/type) |
| `skipped` | skipped | Link exists; skip on; nothing to patch |
| `error` | failed | Invalid link, thumbnail, or DB error |

### 6.2 Job totals

`complete` payload:

```text
success + failed + skipped = total
total = number of rows in this HTTP request (after client parse)
```

UI job across multiple batches sums those fields.

### 6.3 What “upload succeeded” does *not* mean

- It does **not** mean sheet row count = site count  
- It does **not** mean every Excel row was attempted (parse drops bad rows silently)  
- It does **not** mean duplicates created multiple cards  

---

## 7. How items appear on the public site

Public data comes from RPC `get_portfolio_page` (see migrations through `024_portfolio_no_state_count.sql`).

| Item `state` | Visible under |
|--------------|---------------|
| Specific state (e.g. `Haryana`) | That state filter **and** **All states** |
| `null` / empty (“no state”) | **All states only** — not inside any individual state |

Other filters (media type video vs VR, published only) still apply. Counts in the state dropdown are **distinct published items** for that state, not sheet lines.

Admin Tours list historically hit Supabase’s **1000-row** default cap; listing now pages past 1000 so newly imported high `sort_order` rows remain editable.

---

## 8. Worked examples (real sheets)

### 8.1 Haryana sheet — “316 links” vs site “308”

File: `Youtube Data State Wise - Haryana (2).csv`  
Batch state: **Haryana**

| Step | Count |
|------|------:|
| Non-empty data rows (approx.) | 320 |
| Valid http(s) YouTube links parsed | **316** |
| Extra rows that reuse an already-seen link | **−8** (7 duplicate URL groups) |
| Unique links / unique site capacity | **308** |
| In DB under Haryana (published) | **308** |

Also present but **not** in the 316:

- 3 rows with typo `khttps://…` (dropped at parse)
- 1 row with no link

**Duplicate URL groups in that file:**

1. `IqLLqyDdW-M` — M3M Broadway / Construction Update  
2. `st1Aur9PH6w` — M3M Corner Walk / M3M Soulitude  
3. `ClGuBRYlt6g` — Route Video / Faridabad / Faridabad Drone Route Video (×3)  
4. `5V9ArIAWVjU` — EON7 Developers (×2)  
5. `uUb3DBlf4Ag` — Craft Homes / Craft Group  
6. `SaiRSPZJDUw` — Craft Group (×2)  
7. `3XfAGKIkp_Q` — Area Wiki Video Service (×2)  

### 8.2 Promo / no-state sheet

File: `Youtube Data State Wise - Promo Video (1).csv`  
Batch state: **blank**

| Step | Approx. |
|------|--------:|
| Valid YouTube rows | 184 |
| Unique links | 178 |
| Dead/private videos (thumbnail 404/403) | −4 |
| Landed in DB with `state IS NULL` | ~174 |

They only show under **All states**, mixed by publish date / sort — not under a “No state” public filter (that option was removed from the public dropdown; admin still has a “No state” filter).

---

## 9. Case matrix (all upload cases)

| # | Case | Client | Server | Site effect |
|---|------|--------|--------|-------------|
| 1 | New YouTube + state selected | Row kept | Insert + thumb + `state=X` | Under state X + All states |
| 2 | New YouTube + state blank | Row kept | Insert + `state=null` | All states only |
| 3 | New VR tour + state | Row kept | Screenshot + insert | Same as 1 |
| 4 | Blank / missing link | Dropped | Never sent | None |
| 5 | `khttps://…` or non-URL | Dropped | Never sent | None |
| 6 | Non-YouTube on video tab | Dropped | Never sent | None |
| 7 | YouTube on VR tab | Kept | Forced `media_type=video` | Video grid |
| 8 | Duplicate link in same sheet (skip on) | Both sent | 1st insert; 2nd skip or label update | **One** card |
| 9 | Link already in DB (skip on, same labels) | Sent | `skipped` | Unchanged card |
| 10 | Link already in DB (skip on, new state/labels) | Sent | Update labels/state; no new thumb | Card moves/updates metadata |
| 11 | Link already in DB (skip off) | Sent | Re-thumb + update | Same id, refreshed thumb/meta |
| 12 | Thumbnail CDN/Playwright fails | Sent | `error`; **no row** | Missing from site |
| 13 | DB unique/constraint save error | Sent | `error` | Missing / partial |
| 14 | >500 rows in one batch | — | HTTP 400 | Import rejected |
| 15 | Import server down / not configured | — | Health fail / 503 | Nothing imports |
| 16 | Sheet State column filled, dropdown blank | State col ignored | `state=null` | All states only |
| 17 | Sheet State column filled, dropdown Haryana | State col ignored | All rows `Haryana` | All under Haryana |
| 18 | Empty Title, filled Project Name | Uses Project Name | Stored as name/project | Card shows project |
| 19 | Empty builder/city | Kept | null labels | Card shows project only |
| 20 | Same video id, different URL forms | May not match if normalization differs | Possible second insert | Rare duplicates if links don’t normalize equal |

---

## 10. Operational checklist

### Before upload

1. Run import stack (`npm run dev:all` locally, or remote import host in prod)  
2. Confirm health endpoint configured  
3. Prefer unique YouTube links; remove duplicate URLs in Excel  
4. Fix typos (`khttps` → `https`)  
5. Choose the correct **state dropdown** (or blank for no-state)  
6. Leave **Skip existing** on unless you intend to refresh thumbnails  

### After upload

1. Read the live log: count `done` / `skipped` / `error`  
2. Compare **unique links in sheet** to site state count — not raw Excel row count  
3. For failures: open the YouTube URL; if private/deleted, fix the sheet and re-import  
4. Admin → Tours → filter by state / “No state” to edit  

### Interpreting count gaps

```text
Excel rows
  − blank / invalid / non-YouTube   → parsed rows
  − duplicate URLs                  → unique links
  − thumbnail/save failures         → DB rows
  (± pre-existing items in that state)
                                  → site filter count
```

---

## 11. Key configuration

| Variable | Role |
|----------|------|
| `VITE_SUPABASE_URL` / anon key | Admin login + public site |
| `SUPABASE_SERVICE_ROLE_KEY` | Import server writes DB + storage |
| `VITE_BULK_IMPORT_API_URL` | Production URL of import API (empty = same-origin / proxy) |

Related migrations for listing behavior: state labels, video dates, sort, and no-state counting (`007+`, `013+`, `023`, `024`).

---

## 12. Source map (quick jump)

| Concern | File |
|---------|------|
| Parse & drop rules | `src/admin/lib/parseBulkSheet.ts` |
| SSE client | `src/admin/lib/bulkImport.ts` |
| Multi-batch job | `src/admin/context/BulkImportContext.tsx` |
| UI copy / skip / state | `src/admin/components/BulkUploadPanel.tsx` |
| Insert / skip / thumb | `server/bulk-import.mjs` |
| `yt-` ids | `scripts/lib/tour-import-utils.mjs` → `portfolioIdFromUrl` |
| Public counts | `supabase/migrations/024_portfolio_no_state_count.sql` |

---

## 13. Summary

Bulk upload is a **parse → stream → per-link upsert** pipeline. The sheet is a source of **links and metadata**; **state is chosen in the UI**; **uniqueness is by normalized YouTube/tour URL**; **thumbnail success is required** for new rows; the public site counts **unique published items** per filter. Differences like **316 vs 308** are expected when the sheet contains duplicate or invalid links—not a display bug.
