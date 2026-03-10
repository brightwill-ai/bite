# Skill: Building Admin Pages

Use this when creating or editing pages in `apps/admin`.

## Routing Model

- `(auth)` group: `login`, `signup`
- `(onboarding)` group: onboarding wizard at `/onboarding` (`app/(onboarding)/onboarding/page.tsx`)
- `(dashboard)` group: protected admin shell pages (`dashboard`, `menu`, `tables`, `orders`, `settings`)

`apps/admin/middleware.ts` enforces auth redirects.

## Data Pattern (Phase 2)

- Admin pages should read/write Supabase data.
- Avoid runtime mock imports.
- Use app-local Supabase client helpers in `apps/admin/lib/supabase`.

## Auth + Restaurant Context

- `useAuthStore` initializes session, staff row, and restaurant.
- If authenticated but no staff/restaurant assignment, route to `/onboarding`.
- New restaurants should start with `is_active = false` and complete onboarding:
  - Step 1: create restaurant
  - Step 2: menu upload (`/menu/upload?onboarding=1`)
  - Step 3: tables setup + go-live toggle (`/tables?onboarding=1`)
- Page mutations should scope by `restaurant_id` from auth context.

## Page Checklist

1. Use `PageHeader` for title/actions.
2. Handle loading and empty states explicitly.
3. Handle mutation errors without crashing UI.
4. Keep styles aligned with design tokens.
5. Keep writes in store actions or localized mutation handlers.

## Common Pitfalls

- Mutating records before Supabase confirms success.
- Forgetting to refresh state after upload/import flows.
- Querying without restaurant scope.
- During onboarding, inserting `restaurants` with `is_active=false` and chaining `.select()` can fail due RLS on `RETURNING` before a staff row exists. Insert without returning rows, create owner staff row, then read.
- Failing hard on local PDF extraction; keep upload resilient by falling back to `parse-menu` edge extraction when `/api/extract-pdf` fails.

## After Changes

Update docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
