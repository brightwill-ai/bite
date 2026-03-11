# Skill: Adding Features to the Customer Menu App

Use this when touching `apps/menu`.

## Architecture Constraints

- Main customer flow stays in `app/[slug]/table/[tableId]/page.tsx`.
- Keep interactions as overlays/sheets, not route transitions.
- Mobile-first layout only.
- Keep `app/page.tsx` as a stable generic entry point (instructional/neutral state), not a hardcoded redirect to seeded demo data.

## Data Source (Phase 2)

Do not import `@bite/types/mock` in runtime menu flow.

Menu page now loads from Supabase:

- `restaurants` by `slug`
- `tables` by `restaurant_id` + `table_number` (do not hard-fail on stale `is_active=false` table flags)
- `menu_categories`, `menu_items`
- `modifier_groups`, `modifiers`
- Normalize `menu_items.emoji` and `modifiers.emoji` before render; DB/parser values may arrive as shortcodes (`:burger:`) or token text (`hot_pepper`).

## Order Flow

- Cart state comes from Zustand (`apps/menu/store/cart.ts`).
- Place order via `create_order` RPC.
- Use persistent per-table `session_id` in sessionStorage.
- After order success:
  - show confirmation ticket number from DB response
  - printing is triggered server-side via DB webhook on `orders` insert

## UI/Interaction Rules

- Keep left category rail + scroll sync behavior.
- Keep modifier selection inside `ItemDetailSheet`.
- Keep bottom sheet cart flow (`CartSheet`).
- Keep loading/error states for Supabase fetches.

## Performance

- Avoid expensive derived state in render loops.
- Use `useMemo` for filtered/menu-grouped datasets.
- Use narrow Zustand selectors in child components.

## If Adding New Menu Features

1. Add/extend shared types in `packages/types/index.ts` if needed.
2. Keep Supabase query shapes aligned with types.
3. Update this skill if architecture or flow changes.

## After Changes

Update docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
