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
- `20260310060639_harden_order_rls_and_functions.sql`
- `20260310060747_optimize_rls_policies.sql`
- `20260310060819_optimize_session_header_policies.sql`
- `20260310061148_fix_order_insert_policies_for_anon.sql`
- `20260310061527_secure_create_order_rpc.sql`
- `20260310064129_add_order_insert_print_webhook.sql`
- `20260310064809_fix_print_webhook_net_signature.sql`
- `20260310065943_expand_the_oakwood_seed_data.sql`
- `20260310135135_fix_staff_policy_recursion.sql`

## RLS Expectations

All 11 public tables have RLS enabled.

- Public read for customer-safe menu/table data.
- Staff-scoped write/read by `restaurant_id`.
- Customer order reads scoped by `x-session-id` header.
- `staff` owner/manager checks must use SECURITY DEFINER helpers (not direct self-query subselects inside `staff` policies) to avoid infinite recursion.

If you add a table, add:

1. RLS enable statement
2. Policies
3. Any helper function updates

## Edge Functions

### `parse-menu`

- Input: upload metadata + extracted menu text
- Keep a function-local `deno.json` import map in `supabase/functions/parse-menu/` so CLI deploy bundling resolves `@supabase/supabase-js` correctly
- Downloads files from the private `menu-uploads` storage bucket
- Extracts PDF text via position-based ordering (line reconstruction from coordinates + detached price-line repositioning)
- Mirrors the same PDF extraction strategy used in admin `/api/extract-pdf` so local and server extraction stay consistent
- Falls back to raw byte decode for non-PDF files (failed PDF extraction returns empty text instead of decoding binary bytes)
- Rejects symbol-heavy/corrupted extracted text and returns empty parse output with manual-review guidance
- Admin upload page treats local `/api/extract-pdf` errors as non-fatal and falls back to server-side extraction in this Edge Function
- Admin upload page includes a local deterministic text fallback if `parse-menu` invocation fails, so uploads can still proceed to review
- Admin upload page should not proceed to review when parser output has zero items; keep users on upload with a clear error message
- Parser strategy:
  - deterministic text/PDF parser only
  - confidence gate returns parsed result when high-confidence
  - low-confidence parses are returned as best-effort with `needs_review=true`
  - image uploads are unsupported and return empty parse output with review guidance; upload PDF/TXT inputs instead
- Updates `menu_uploads.status`, `parsed_data`, and `error_message`

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
- Bootstrap script: `.github/scripts/set-supabase-secrets.sh` (uses `GH_TOKEN`/`GITHUB_TOKEN` or git credential helper; sets whichever `SUPABASE_*` vars are exported)

## When Changing This Area

Update these docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
