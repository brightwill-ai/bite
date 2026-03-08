# Skill: State Management in Bite

All global state uses Zustand. Read this before creating or modifying any store.

---

## Rules

- **Only Zustand** for global state — no Redux, no React Context for global state
- **`apps/menu`** stores: in-memory only, no persistence (cart clears when page closes — intentional)
- **`apps/admin`** stores: persist to localStorage via Zustand `persist` middleware
- **No cross-app state sharing** — each app manages its own stores independently
- Stores live in `[app]/store/[name].ts`

---

## Store Template — Basic (no persistence)

```typescript
// apps/menu/store/cart.ts
import { create } from 'zustand'
import type { CartItem } from '@bite/types'

// 1. Define the full interface — state + actions together
interface CartStore {
  // State
  items: CartItem[]
  restaurantId: string | null
  tableId: string | null
  specialInstructions: string

  // Actions — verb names
  setContext: (restaurantId: string, tableId: string) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  setInstructions: (text: string) => void
  clearCart: () => void

  // Derived values — computed getters
  getTotal: () => number
  getCount: () => number
}

// 2. Create the store
export const useCartStore = create<CartStore>((set, get) => ({
  // Initial state
  items: [],
  restaurantId: null,
  tableId: null,
  specialInstructions: '',

  // Actions
  setContext: (restaurantId, tableId) =>
    set({ restaurantId, tableId }),

  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find(i => i.menuItemId === newItem.menuItemId)
      if (existing) {
        return {
          items: state.items.map(i =>
            i.menuItemId === newItem.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        }
      }
      return { items: [...state.items, { ...newItem, quantity: 1 }] }
    }),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => ({
      items: quantity <= 0
        ? state.items.filter(i => i.menuItemId !== menuItemId)
        : state.items.map(i =>
            i.menuItemId === menuItemId ? { ...i, quantity } : i
          )
    })),

  setInstructions: (text) => set({ specialInstructions: text }),

  clearCart: () => set({ items: [], specialInstructions: '' }),

  // Derived — use get() to access current state
  getTotal: () =>
    get().items.reduce((sum, item) => {
      const modifierTotal = item.selectedModifiers.reduce(
        (s, m) => s + m.price_delta, 0
      )
      return sum + (item.price + modifierTotal) * item.quantity
    }, 0),

  getCount: () =>
    get().items.reduce((sum, item) => sum + item.quantity, 0),
}))
```

---

## Store Template — With Persistence (admin)

```typescript
// apps/admin/store/menu.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockCategories, mockItems, mockModifierGroups, mockModifiers } from '@bite/types/mock'
import type { MenuCategory, MenuItem, ModifierGroup, Modifier } from '@bite/types'

interface MenuStore {
  categories: MenuCategory[]
  items: MenuItem[]
  modifierGroups: Record<string, ModifierGroup[]>
  modifiers: Record<string, Modifier[]>

  // CRUD
  addCategory: (name: string) => void
  updateCategory: (id: string, updates: Partial<MenuCategory>) => void
  deleteCategory: (id: string) => void
  addItem: (item: Omit<MenuItem, 'id'>) => void
  updateItem: (id: string, updates: Partial<MenuItem>) => void
  deleteItem: (id: string) => void
  toggleAvailability: (id: string) => void
  reorderItems: (categoryId: string, orderedIds: string[]) => void
  importParsedMenu: (categories: MenuCategory[], items: MenuItem[]) => void
}

export const useMenuStore = create<MenuStore>()(
  persist(
    (set, get) => ({
      categories: mockCategories,
      items: mockItems,
      modifierGroups: mockModifierGroups,
      modifiers: mockModifiers,

      addCategory: (name) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: `cat-${Date.now()}`,
              restaurant_id: 'rest-001',
              name,
              display_order: state.categories.length + 1,
              is_available: true,
            }
          ]
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter(c => c.id !== id),
          items: state.items.filter(i => i.category_id !== id),
        })),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: `item-${Date.now()}` }]
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map(i => i.id === id ? { ...i, ...updates } : i)
        })),

      deleteItem: (id) =>
        set((state) => ({ items: state.items.filter(i => i.id !== id) })),

      toggleAvailability: (id) =>
        set((state) => ({
          items: state.items.map(i =>
            i.id === id ? { ...i, is_available: !i.is_available } : i
          )
        })),

      reorderItems: (categoryId, orderedIds) =>
        set((state) => ({
          items: state.items.map(item => {
            const newOrder = orderedIds.indexOf(item.id)
            return item.category_id === categoryId && newOrder !== -1
              ? { ...item, display_order: newOrder + 1 }
              : item
          })
        })),

      importParsedMenu: (categories, items) =>
        set({ categories, items }),
    }),
    {
      name: 'bite-menu-store',   // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

---

## Consuming Stores in Components

### Select only what you need (prevents unnecessary re-renders)

```tsx
// ✅ Select specific values — component only re-renders when these change
const itemCount = useCartStore(state => state.getCount())
const total = useCartStore(state => state.getTotal())
const addItem = useCartStore(state => state.addItem)

// ❌ Selecting the whole store — re-renders on ANY state change
const store = useCartStore()
```

### Calling store actions outside React (e.g. in event handlers)

```tsx
// Access store state/actions without a hook (no re-render subscription)
useCartStore.getState().clearCart()
useCartStore.getState().addItem(item)
```

### Resetting store to initial state

```typescript
// Add to store definition
const initialState = { items: [], restaurantId: null, ... }

reset: () => set(initialState),
```

---

## Auth Store (Admin — Mock)

```typescript
// apps/admin/store/auth.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const DEMO_EMAIL = 'admin@bite.so'
const DEMO_PASSWORD = 'demo1234'

interface AuthStore {
  isAuthenticated: boolean
  restaurantName: string
  staffName: string
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      restaurantName: 'The Oakwood',
      staffName: 'Marco',

      login: (email, password) => {
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          set({ isAuthenticated: true })
          return { success: true }
        }
        return { success: false, error: 'Invalid credentials' }
      },

      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'bite-auth-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

---

## Zustand + SSR Gotcha

Zustand with `persist` can cause hydration mismatches in Next.js. Use this pattern for components that read persisted store values:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  useEffect(() => setHydrated(true), [])

  // Prevent render until client has hydrated (avoids mismatch)
  if (!hydrated) return null
  if (!isAuthenticated) redirect('/login')

  return <>{children}</>
}
```

---

## When to Use Local State vs Store

| Scenario | Use |
|---|---|
| UI toggle (open/closed, hover) | `useState` |
| Form input values | `useState` |
| Cart items | Zustand store |
| Menu data | Zustand store (admin) |
| Auth state | Zustand store |
| Selected item for a sheet | `useState` in parent page |
| Tab active state | `useState` |
| Loading/skeleton state | `useState` |

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
