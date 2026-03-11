# Bite

QR table-side ordering for restaurants. Customers scan, order, and track ticket status from their phone. Restaurants manage menus, tables, and live orders from the admin portal.

## Apps

| App | Workspace | Local URL | Purpose |
|---|---|---|---|
| Web | `@bite/web` | http://localhost:3000 | Marketing site |
| Menu | `@bite/menu` | http://localhost:3001 | Customer ordering app |
| Admin | `@bite/admin` | http://localhost:3002 | Restaurant operations portal |

## Stack

- Next.js 14 (App Router), TypeScript (strict), Tailwind CSS
- Turborepo monorepo
- Zustand for client state
- Supabase (Postgres, Auth, Storage, Edge Functions)

## Quick Start

```bash
npm install
npm run dev
```

Run one app only:

```bash
npm run dev:web
npm run dev:menu
npm run dev:admin
```

Typecheck:

```bash
npm run typecheck
```

## Environment

Each app uses its own `.env.local` copied from `.env.example`.

### `apps/web/.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### `apps/menu/.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### `apps/admin/.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MENU_BASE_URL=
```

## Supabase (Phase 2)

Supabase is fully wired for menu/admin runtime data.

- Project ref: `ltswdtctfrelzomozmme`
- MCP config: `.claude/settings.json`
- Typed client models: `packages/types/supabase.ts`
- Migrations: `supabase/migrations`
- Edge Functions:
  - `supabase/functions/parse-menu`
  - `supabase/functions/trigger-print`
- Keep a `deno.json` import map inside each function directory (for example `supabase/functions/parse-menu/deno.json`) so `supabase functions deploy` can resolve bare imports like `@supabase/supabase-js`.
- Admin menu upload uses local PDF extraction (`/api/extract-pdf`) with position-based line reconstruction and detached-price reordering; both admin and `parse-menu` use `pdfjs-dist@5.5.207` with cMap and standard-font config to reduce custom-font garbling.
- Admin menu upload supports image inputs (`.png/.jpg/.jpeg/.webp`) via local OCR (`/api/extract-image`, Tesseract.js), then sends OCR text to `parse-menu` as `rawText`.
- Admin menu upload also has a local deterministic text fallback if `parse-menu` invocation fails, to avoid hard-stop parser failures in the review flow.
- Admin upload keeps users on the upload step (with a clear error) when parser output has zero items, instead of opening an empty review state.
- `parse-menu` uses the same position-based PDF text reconstruction path server-side for consistency with admin local extraction.
- `parse-menu` is deterministic-only text parsing (PDF/TXT text plus OCR-provided image text) with confidence gating and `needs_review` fallback when confidence is low.
- If PDF extraction yields no text, `parse-menu` now returns an empty parse result instead of decoding PDF bytes as text.
- `parse-menu` rejects symbol-heavy/corrupted extracted text and returns an empty parse result with review guidance.
- If an image reaches `parse-menu` without `rawText` (OCR failure path), parser returns an empty result with retry guidance.
- Migration strategy doc: `docs/migration_strategy.md`
- Security hardening applied:
  - fixed function `search_path` settings
  - tightened public order insert RLS checks
  - optimized RLS policies to remove advisor warnings

### Database

The schema includes 11 tables:

- `restaurants`
- `staff`
- `tables`
- `menu_categories`
- `menu_items`
- `modifier_groups`
- `modifiers`
- `orders`
- `order_items`
- `order_item_modifiers`
- `menu_uploads`

DB functions:

- `get_next_ticket_number(restaurant_id uuid)`
- `create_order(...)`
- `update_updated_at()` trigger function
- `get_user_restaurant_ids()` (RLS helper)

Storage buckets:

- `qr-codes` (public)
- `menu-uploads` (private)
- `menu-images` (public)

## Docker / CI

- `docker-compose.yml` injects Supabase env vars into all three app containers.
- `.github/workflows/deploy.yml` passes Supabase secrets as build args.

Required GitHub repo secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- One-command setup (uses `GH_TOKEN`/`GITHUB_TOKEN` or git credential helper, and updates whichever `SUPABASE_*` vars you export): `.github/scripts/set-supabase-secrets.sh`

Edge Function secrets:

- optional `PRINT_WEBHOOK_SECRET` (for secured webhook calls)

## Current Status

### Phase 1 (Frontend MVP)
- [x] All three apps and core UI
- [x] Shared design system and components

### Phase 2 (Backend Wiring)
- [x] Supabase project + MCP setup
- [x] Schema + RLS + storage buckets
- [x] Security/performance advisor warnings resolved to info-only
- [x] Real admin auth + onboarding
- [x] Menu/admin migrated off mock runtime data
- [x] Real order creation via RPC
- [x] Menu parser edge function
- [x] Print trigger edge function

### Remaining External Blockers
- [x] Added GitHub secret `SUPABASE_SERVICE_ROLE_KEY` in `brightwill-ai/bite`
- [x] Verified remote `parse-menu` function matches local deterministic parser implementation

### Phase 3+
- [ ] KDS + realtime operational tooling
- [ ] Payments and payouts

## Repo Layout

```text
bite/
├── apps/
│   ├── web/
│   ├── menu/
│   └── admin/
├── packages/
│   ├── ui/
│   ├── types/
│   └── config/
├── supabase/
│   ├── migrations/
│   └── functions/
├── .claude/
│   └── skills/
├── AGENTS.md
└── turbo.json
```
