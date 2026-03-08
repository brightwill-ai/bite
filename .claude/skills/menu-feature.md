# Skill: Adding Features to the Customer Menu App

Read this before touching `apps/menu`. The menu app has strict constraints — it's a mobile-only, single-page experience.

---

## Architecture Rules

The entire customer experience lives on **one page**: `app/[slug]/table/[tableId]/page.tsx`

There is no navigation between routes. Everything — item detail, cart, confirmation — is an overlay or sheet on top of the menu. Do not create new routes for these flows.

```
page.tsx (menu home)
├── MenuHeader          — always visible
├── CategorySidebar     — always visible, left
├── Content scroll      — always visible, right
├── FloatingCartBar     — fixed bottom, visible when cart has items
├── ItemDetailSheet     — overlay, controlled by selectedItem state
├── CartSheet           — overlay, controlled by cartOpen state
└── OrderConfirmation   — full-screen overlay, controlled by confirmed state
```

Overlay state all lives in `page.tsx`:

```tsx
const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
const [cartOpen, setCartOpen] = useState(false)
const [confirmed, setConfirmed] = useState(false)
```

---

## Mobile-Only Constraints

The menu app renders inside a max-width container to simulate a phone:

```tsx
// In app/layout.tsx or the page wrapper
<div className="min-h-screen bg-[#D8D5D0] flex items-start justify-center">
  <div className="w-full max-w-[430px] min-h-screen bg-bg relative overflow-hidden">
    {children}
  </div>
</div>
```

Never use:
- Multi-column layouts
- Hover states as primary interactions (mobile = tap)
- Fixed widths > 430px
- Desktop-only UI patterns

Always use:
- Touch-friendly tap targets (minimum 44×44px)
- Bottom sheets instead of dropdowns/popups
- Swipe-friendly interactions

---

## The Scroll Sync System

Category sidebar stays in sync with scroll position using IntersectionObserver. This is already set up — when adding a new category, just ensure the section has the right `id`:

```tsx
// Section wrapper — id must match category.id
<section id={`section-${category.id}`} key={category.id}>
  <div className="sticky top-0 bg-bg px-3 py-3 font-display font-bold text-ink text-sm z-[5] border-b border-border">
    {category.name}
  </div>
  {items.map(item => <MenuItemCard key={item.id} item={item} ... />)}
</section>
```

The IntersectionObserver in the page updates `activeCategory` as the user scrolls:

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Extract category id from section id ("section-cat-1" → "cat-1")
          const catId = entry.target.id.replace('section-', '')
          setActiveCategory(catId)
        }
      })
    },
    { threshold: 0.3, rootMargin: '-10% 0px -60% 0px' }
  )

  mockCategories.forEach(cat => {
    const el = document.getElementById(`section-${cat.id}`)
    if (el) observer.observe(el)
  })

  return () => observer.disconnect()
}, [])
```

---

## ItemDetailSheet — Modifier Tab Logic

The sheet shows one modifier group at a time, controlled by a tab index:

```tsx
const [activeGroupIndex, setActiveGroupIndex] = useState(0)
const groups = mockModifierGroups[item.id] ?? []
const activeGroup = groups[activeGroupIndex]
const modifiersForGroup = activeGroup ? mockModifiers[activeGroup.id] ?? [] : []
```

Selected modifiers are tracked locally in the sheet, then passed to `cartStore.addItem` when confirmed:

```tsx
// Key: modifier group id → selected modifier id(s)
const [selections, setSelections] = useState<Record<string, string[]>>({})

const handleSingleSelect = (groupId: string, modifierId: string) => {
  setSelections(prev => ({ ...prev, [groupId]: [modifierId] }))
}

const handleMultiToggle = (groupId: string, modifierId: string) => {
  setSelections(prev => {
    const current = prev[groupId] ?? []
    const exists = current.includes(modifierId)
    return {
      ...prev,
      [groupId]: exists
        ? current.filter(id => id !== modifierId)
        : [...current, modifierId]
    }
  })
}
```

Validation before "Add to Order" — all required groups must have a selection:

```tsx
const canAdd = groups
  .filter(g => g.is_required)
  .every(g => (selections[g.id]?.length ?? 0) > 0)
```

---

## Cart Item Price Calculation

```tsx
const getItemTotal = (cartItem: CartItem): number => {
  const modifierTotal = cartItem.selectedModifiers.reduce(
    (sum, mod) => sum + mod.price_delta, 0
  )
  return (cartItem.price + modifierTotal) * cartItem.quantity
}
```

---

## Adding a New Item Type / Feature

If adding something new to the menu page (e.g. a "featured item" carousel, a dietary filter):

1. Add any new types needed to `packages/types/index.ts`
2. Add mock data to `packages/types/mock.ts`
3. Build the component in `apps/menu/components/`
4. Add state for it in `page.tsx` (or a new store if it's complex)
5. Never add a new route — keep everything on the one page

---

## Confirmation Flow

When "Place Order" is tapped:

```tsx
const handlePlaceOrder = () => {
  setCartOpen(false)
  // Small delay so cart sheet can animate out before confirmation shows
  setTimeout(() => {
    setConfirmed(true)
  }, 300)
}

const handleOrderMore = () => {
  setConfirmed(false)
  cartStore.clearCart()
  // Scroll content back to top
  contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
}
```

The ticket number on the confirmation screen is currently mocked:
```tsx
const ticketNumber = Math.floor(Math.random() * 900) + 100 // 3-digit mock number
```

In Phase 2, this will come from the Supabase `orders` insert response.

---

## Performance Notes

- The menu page can have 50+ items. Always use `key` props correctly on lists.
- Don't use `useEffect` to filter items — filter inline during render from the store/mock data
- Images are emoji for now — when real images come in (Phase 2), use Next.js `<Image>` with proper `sizes` attribute
- The `CategorySidebar` should NOT re-render on every scroll — make sure `activeCategory` setter doesn't cause the sidebar to do expensive work

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
