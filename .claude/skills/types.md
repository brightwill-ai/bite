# Skill: Types in Bite

Read this before adding or modifying any TypeScript types.

---

## Where Types Live

All shared types are in `packages/types/index.ts` and exported as named exports.

```
packages/types/
├── index.ts     — All type definitions
└── mock.ts      — All mock data (uses the types from index.ts)
```

Import in apps:
```tsx
import type { MenuItem, CartItem, Order } from '@bite/types'
import { mockItems, mockRestaurant } from '@bite/types/mock'
```

---

## Adding a New Type

1. Add to `packages/types/index.ts`
2. Run `npm run typecheck` from repo root to verify no breakage
3. Add corresponding mock data to `packages/types/mock.ts`
4. Update any Zustand stores that need the new shape

---

## Type Conventions

```typescript
// Use `type` for data shapes (what comes from DB / API)
export type MenuItem = {
  id: string
  name: string
  price: number
  // ...
}

// Use `interface` for component props
interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem) => void
}

// Use discriminated unions for status/state types
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered'

// Use optional `?` for fields that may not always be present
export type MenuItem = {
  id: string
  name: string
  image_url?: string   // optional — may not have an image
  emoji?: string       // optional — used as image placeholder
}
```

---

## ID Conventions

All IDs are strings. In mock data, use readable prefixes:

```
Restaurant:       rest-001
Table:            tbl-1, tbl-2
Menu Category:    cat-1, cat-2
Menu Item:        item-1, item-2
Modifier Group:   mg-1, mg-2
Modifier:         mod-1, mod-2
Order:            ord-1, ord-2
Session:          sess-1, sess-2
```

When generating new IDs dynamically (in stores):
```typescript
id: `item-${Date.now()}`   // good enough for mock/localStorage
```

In Phase 2, all IDs become UUIDs from Supabase — the string type handles both.

---

## Phase 2 Type Notes

When Supabase is wired in, the types stay the same — they already match the database schema. The only additions will be:

- `created_at: string` (ISO timestamp) on most types — already on `Order`, add to others as needed
- `updated_at?: string` — optional, add if needed
- Supabase returns `null` for missing fields, not `undefined` — update optionals from `field?: T` to `field: T | null` when integrating

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
