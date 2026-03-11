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

## Zustand Conventions

- Prefer selector-based subscriptions in components (`useStore((state) => state.slice)`) instead of `useStore()` full-store objects.
- Keep context setters (for example restaurant/table context) idempotent by no-oping when values are unchanged.

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
- Admin menu upload now uses a synchronous server-side parse flow: upload to storage, then invoke `parse-menu` with file metadata (`uploadId`, `filePath`, `fileName`, `mimeType`).
- Admin upload calls `parse-menu` with a direct function endpoint `fetch` (explicit `Authorization` + `apikey` headers) instead of relying only on `supabase.functions.invoke`, then retries once after token refresh on `401`.
- Admin app auth now uses a dedicated cookie name (`sb-admin-auth-token`) in browser client, server client, and middleware to avoid localhost cross-app session collisions during multi-app dev (`:3000/:3001/:3002`).
- Admin upload keeps users on the upload step (with a clear error) when parser output has zero items, instead of opening an empty review state.
- `parse-menu` is Claude-native (Files API + Messages API structured outputs) and returns the existing `categories[]`/`items[]` contract used by publish flow.
- `parse-menu` uploads the stored menu file to Anthropic (`/v1/files` with `anthropic-beta: files-api-2025-04-14`) and parses with structured output schema (`output_config.format`).
- `parse-menu` validates/normalizes model output (drops invalid items, normalizes prices/categories/booleans) and marks all items `needs_review=true` when confidence is low or too many rows are dropped.
- `parse-menu` retries transient Anthropic failures once (`429`/`5xx`) with backoff and uses request timeouts via `AbortController`.
- Deterministic parser fallback remains in `parse-menu` for Claude failures when usable text is available (request `rawText` or server-side extraction for PDF/TXT).
- Sync guardrails enforce supported file types and a 20MB upload limit.
- Menu UI normalizes emoji shortcodes/tokens (for example `:burger:`/`hot_pepper`) to Unicode emoji before rendering and falls back to defaults when invalid.
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
- `.github/workflows/deploy.yml` validates Docker builds for all three apps, then deploys over SSH on pushes to `main`.

Required GitHub repo secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PASSWORD`
- One-command setup (uses `GH_TOKEN`/`GITHUB_TOKEN` or git credential helper, and updates whichever `SUPABASE_*` vars you export): `.github/scripts/set-supabase-secrets.sh`

Edge Function secrets:

- optional `PRINT_WEBHOOK_SECRET` (for secured webhook calls)
- required `ANTHROPIC_API_KEY` (Claude API key for `parse-menu`)
- optional `ANTHROPIC_MODEL` (default: `claude-haiku-4-5`)
- optional `ANTHROPIC_TIMEOUT_MS` (default: `25000`)

Set parser secrets:

```bash
supabase secrets set \
  ANTHROPIC_API_KEY=<your_api_key> \
  ANTHROPIC_MODEL=claude-haiku-4-5 \
  ANTHROPIC_TIMEOUT_MS=25000
```

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
- [x] Verified remote `parse-menu` function matches local Claude-first parser implementation

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
├── .github/
│   └── workflows/
│       └── deploy.yml
├── Dockerfile
├── docker-compose.yml
├── AGENTS.md
├── CLAUDE.md
└── turbo.json
```
