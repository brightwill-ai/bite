# Skill: Types in Bite

Use this when adding or changing shared TypeScript types.

## Type Locations

- Shared app domain types: `packages/types/index.ts`
- Mock fixtures: `packages/types/mock.ts`
- Supabase generated DB typing: `packages/types/supabase.ts`

Exports are configured in `packages/types/package.json`.

## Rules

- Use `type` for data models.
- Use `interface` for component props.
- No `any`.
- Keep Supabase nullable fields (`T | null`) mapped carefully when transforming to app types.

## When DB Schema Changes

1. Add migration under `supabase/migrations`.
2. Regenerate/update `packages/types/supabase.ts`.
3. Update mapping helpers in menu/admin stores/pages.
4. Run `npm run typecheck`.

## Runtime Guidance

- `packages/types/index.ts` represents app-level domain shapes.
- `packages/types/supabase.ts` represents raw DB row/insert/update contracts.
- Keep conversion helpers explicit (`toRestaurant`, `toMenuItem`, etc.).

## After Changes

Update docs in the same task:

1. `AGENTS.md`
2. `README.md`
3. This skill file
