# Skill: Mock Data in Bite

Read this before adding or extending mock data.

---

## Where Mock Data Lives

All mock data is in `packages/types/mock.ts`. This is the single source of truth for Phase 1.

---

## Adding New Menu Items

Items must reference a valid `category_id` and `restaurant_id`:

```typescript
// In packages/types/mock.ts

export const mockItems: MenuItem[] = [
  // ... existing items ...

  // Add new item at the end of its category group
  {
    id: 'item-18',                    // next sequential ID
    restaurant_id: 'rest-001',        // always rest-001
    category_id: 'cat-2',             // must match a category in mockCategories
    name: 'Duck Confit Pasta',
    description: 'House-made tagliatelle, duck confit, cherry tomatoes, crispy capers',
    price: 26,
    emoji: '🍝',                      // used as image placeholder
    is_available: true,
    is_popular: false,
    is_new: true,
    needs_review: false,
    display_order: 5,                 // next in the category
  },
]
```

---

## Adding Modifier Groups for an Item

Modifier groups are keyed by item ID:

```typescript
export const mockModifierGroups: Record<string, ModifierGroup[]> = {
  'item-6': [...],    // existing
  'item-9': [...],    // existing

  // New item modifiers
  'item-18': [
    {
      id: 'mg-6',
      item_id: 'item-18',
      name: 'Pasta Temperature',
      selection_type: 'single',
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      display_order: 1,
    },
  ],
}

export const mockModifiers: Record<string, Modifier[]> = {
  // ...existing...

  'mg-6': [
    { id: 'mod-20', group_id: 'mg-6', name: 'Al dente', price_delta: 0, is_available: true, display_order: 1, emoji: '🍝' },
    { id: 'mod-21', group_id: 'mg-6', name: 'Soft', price_delta: 0, is_available: true, display_order: 2, emoji: '🥣' },
  ],
}
```

---

## Adding More Mock Orders

Orders are used in the admin Orders page:

```typescript
export const mockOrders: Order[] = [
  // ...existing...

  {
    id: 'ord-6',
    session_id: 'sess-6',
    restaurant_id: 'rest-001',
    table_id: 'tbl-5',
    ticket_number: 37,
    status: 'preparing',
    special_instructions: 'Nut allergy — please be careful',
    created_at: new Date(Date.now() - 4 * 60000).toISOString(),  // 4 min ago
  },
]
```

---

## ID Numbering

Always check the highest existing ID before adding new ones and increment:

```
Items:          item-1 through item-17 → next is item-18
Categories:     cat-1 through cat-5 → next is cat-6
Modifier Groups: mg-1 through mg-5 → next is mg-6
Modifiers:      mod-1 through mod-18 → next is mod-19
Orders:         ord-1 through ord-5 → next is ord-6
```

---

## Using Mock Data in Components

```tsx
// Import what you need
import {
  mockRestaurant,
  mockCategories,
  mockItems,
  mockModifierGroups,
  mockModifiers,
  mockOrders,
  mockTables,
} from '@bite/types/mock'

// Filter items by category
const starterItems = mockItems.filter(i => i.category_id === 'cat-1' && i.is_available)

// Get modifier groups for an item
const groups = mockModifierGroups[item.id] ?? []

// Get modifiers for a group
const options = mockModifiers[group.id] ?? []
```

---

## Simulating Data Loading

To make mock data feel like a real API call, delay it by 500ms:

```tsx
const [data, setData] = useState<MenuItem[]>([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const t = setTimeout(() => {
    setData(mockItems.filter(i => i.category_id === categoryId))
    setLoading(false)
  }, 500)
  return () => clearTimeout(t)
}, [categoryId])
```

This pattern gets swapped for a real Supabase query in Phase 2 with zero component changes.

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
