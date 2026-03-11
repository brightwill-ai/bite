# Skill: Supabase Integration (Phase 2+)

Use this skill when touching auth, database access, storage uploads, Edge Functions, or migrations.

## Current State

Supabase is live for Phase 2.

- Project ref: `ltswdtctfrelzomozmme`
- MCP config: `.claude/settings.json`
- Migrations: `supabase/migrations/`
- Edge Functions:
  - `parse-menu`
  - `trigger-print`

## Client Patterns

Use app-local helpers:

- `apps/menu/lib/supabase/client.ts`
- `apps/menu/lib/supabase/server.ts`
- `apps/admin/lib/supabase/client.ts`
- `apps/admin/lib/supabase/server.ts`

Always use the typed `Database` model from `@bite/types/supabase`.

## Runtime Data Rules

- `apps/menu` and `apps/admin` should query Supabase, not `@bite/types/mock`.
- Keep component prop shapes stable; swap data source in stores/pages, not in UI contracts.
- Prefer server fetch for read-heavy route initialization and client fetch for interactive mutations.

## Auth Rules

- Admin auth is Supabase Auth (`signInWithPassword`, `signUp`, `signOut`).
- Admin route protection uses `apps/admin/middleware.ts`.
- On first login without a staff row, route users to onboarding and create restaurant + owner staff row.

## Migrations

- Put schema and policy changes in `supabase/migrations/<timestamp>_<name>.sql`.
- Do not run DDL directly through ad-hoc SQL without adding a migration file.
- Keep migration filenames aligned with applied versions.

Current baseline migrations:

- `20260310044417_create_base_schema.sql`
- `20260310044458_create_rls_policies.sql`
- `20260310044502_create_storage_buckets.sql`
- `20260310054023_harden_order_ticketing_and_timestamps.sql`
- `20260310054123_seed_the_oakwood_demo_restaurant.sql`
- `20260310123000_harden_order_rls_and_functions.sql`
- `20260310130000_optimize_rls_policies.sql`
- `20260310133000_optimize_session_header_policies.sql`

## RLS Expectations

All 11 public tables have RLS enabled.

- Public read for customer-safe menu/table data.
- Staff-scoped write/read by `restaurant_id`.
- Customer order reads scoped by `x-session-id` header.

If you add a table, add:

1. RLS enable statement
2. Policies
3. Any helper function updates

## Edge Functions

### `parse-menu`

- Input: upload metadata + extracted menu text
- Calls OpenAI chat completions with JSON schema response format
- Updates `menu_uploads.status`, `parsed_data`, and `error_message`

Required secret:

- `OPENAI_API_KEY`

### `trigger-print`

- Modes:
  - `test` (admin settings test print)
  - `order` (print kitchen ticket for an order)
- Uses restaurant PrintNode credentials from DB
- Updates `orders.print_status` to `sent`/`failed`

Optional secret:

- `PRINT_WEBHOOK_SECRET`

## Storage

Buckets:

- `qr-codes` (public)
- `menu-uploads` (private)
- `menu-images` (public)

Keep bucket policy changes in migrations.

## Deployment / Env

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin and functions)

Required GitHub secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## When Changing This Area

Update these docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
