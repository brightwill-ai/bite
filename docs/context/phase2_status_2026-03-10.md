# Phase 2 Status (2026-03-10)

## Implemented

- Supabase project wired with MCP config in `.claude/settings.json`.
- Env examples added in all apps with Supabase keys; admin includes `SUPABASE_SERVICE_ROLE_KEY`.
- Docker and GitHub deploy workflow pass Supabase env/build args.
- Menu and admin apps use Supabase clients (`@supabase/supabase-js`, `@supabase/ssr`).
- Full 11-table schema + functions + RLS + storage buckets are in `supabase/migrations`.
- Menu runtime flow is server/client split and reads real Supabase menu/table data.
- Order submission uses `create_order` RPC with retry UX and delayed cart clear.
- Admin auth uses Supabase (`login`, `signup`, middleware, server-side dashboard guard).
- Onboarding flow now runs as 3-step sequence:
  - create restaurant (`is_active=false`)
  - menu upload (`/menu/upload?onboarding=1`)
  - tables setup + go-live (`/tables?onboarding=1`)
- Admin dashboard/menu/orders/tables/settings pages are Supabase-backed.
- Staff invite API route implemented at `apps/admin/app/api/invite-staff/route.ts`.
- PrintNode edge function + DB insert webhook trigger implemented.
- Oakwood seed expanded via migration to include richer categories/items/modifiers/tables/sample orders.

## Latest Migration Set (local + remote-aligned names)

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

## RLS Verification Run (2026-03-10)

- Anonymous without `x-session-id` sees `0` orders.
- Anonymous with `x-session-id=seed-session-1` sees only `1` order.
- Authenticated user without staff row sees `0` orders.
- Authenticated staff user scoped to one restaurant:
  - can read own restaurant orders (`own_orders_visible=5` in test)
  - cannot read other restaurant orders (`other_orders_visible=0`)
  - cannot update other restaurant record (`other_restaurant_update_rows=0`)

## Current Blockers

1. GitHub secret `SUPABASE_SERVICE_ROLE_KEY` is still not set from this environment.
   - Service role key value is not available here.
   - `gh` auth is not configured in this environment.
2. Remote redeploy of updated large edge functions via MCP returned internal deploy errors.
   - Local file updates are present, but remote redeploy of `parse-menu` (and test redeploy of `trigger-print`) failed via MCP.
3. Temporary test function `ping-test` was created to verify deploy-path health and is currently active.

## Validation

- `npm run typecheck`: pass
- `npm run lint`: pass
