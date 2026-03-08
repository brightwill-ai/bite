# Skill: Supabase Integration (Phase 2)

⚠️ This skill is for Phase 2. Do not implement anything in this file during Phase 1 (frontend MVP).

When Phase 2 begins, this file will be the guide for wiring up Supabase. It is here now so the patterns are documented before implementation starts.

---

## Overview

Supabase replaces all mock data and localStorage persistence. The component interfaces stay the same — only the data sources change.

```
Phase 1:  mockItems → component
Phase 2:  Supabase query → same component (no component changes)
```

---

## What Supabase Handles

| Feature | Supabase Service |
|---|---|
| All data storage | PostgreSQL |
| Auth (admin login) | Supabase Auth |
| Live order updates to KDS | Realtime |
| Menu PDF + food images | Storage |
| Menu parser, print trigger | Edge Functions |

---

## Setup (When Starting Phase 2)

```bash
# Install in both apps/menu and apps/admin
npm install @supabase/supabase-js @supabase/ssr --workspace=apps/menu
npm install @supabase/supabase-js @supabase/ssr --workspace=apps/admin
```

Add to `.env.local` in each app:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

---

## Client Setup

`apps/[app]/lib/supabase/client.ts` — browser client:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`apps/[app]/lib/supabase/server.ts` — server component client:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )
}
```

---

## Swapping Mock Data → Supabase

### Menu app (customer-facing)

The menu page becomes a Server Component that fetches at request time:

```typescript
// Before (Phase 1 — mock)
import { mockRestaurant, mockCategories, mockItems } from '@bite/types/mock'

// After (Phase 2 — Supabase)
const supabase = createServerClient()

const { data: restaurant } = await supabase
  .from('restaurants')
  .select('*')
  .eq('slug', params.slug)
  .single()

const { data: categories } = await supabase
  .from('menu_categories')
  .select(`
    *,
    menu_items (
      *,
      modifier_groups (
        *,
        modifiers (*)
      )
    )
  `)
  .eq('restaurant_id', restaurant.id)
  .eq('is_available', true)
  .order('display_order')
```

### Admin store (replace localStorage with Supabase)

Replace `persist` middleware with Supabase queries:

```typescript
// Before (Phase 1 — localStorage persist)
export const useMenuStore = create<MenuStore>()(
  persist(
    (set) => ({
      items: mockItems,
      updateItem: (id, updates) => set(state => ({ ... })),
    }),
    { name: 'bite-menu-store' }
  )
)

// After (Phase 2 — Supabase)
export const useMenuStore = create<MenuStore>()((set) => ({
  items: [],

  loadItems: async (restaurantId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('display_order')
    if (data) set({ items: data })
  },

  updateItem: async (id, updates) => {
    const supabase = createClient()
    await supabase.from('menu_items').update(updates).eq('id', id)
    set(state => ({
      items: state.items.map(i => i.id === id ? { ...i, ...updates } : i)
    }))
  },
}))
```

---

## RLS Policies Needed

Every table needs Row Level Security enabled. Key policies:

```sql
-- Anyone can read menu items (customers browsing)
CREATE POLICY "Public read menu items"
ON menu_items FOR SELECT
USING (true);

-- Only authenticated staff can modify their restaurant's data
CREATE POLICY "Staff manage own items"
ON menu_items FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE id = auth.uid()
  )
);

-- Orders readable by restaurant staff
CREATE POLICY "Staff read own orders"
ON orders FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM staff WHERE id = auth.uid()
  )
);
```

---

## Realtime (Orders → KDS)

When Phase 3 adds the Kitchen Display System:

```typescript
// Subscribe to new orders for a restaurant
const supabase = createClient()

const channel = supabase
  .channel('orders')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`,
    },
    (payload) => {
      // New order arrived — update KDS
      addNewTicket(payload.new as Order)
      playChime()
    }
  )
  .subscribe()

// Cleanup
return () => supabase.removeChannel(channel)
```

---

## Edge Functions

Two Edge Functions needed in Phase 2:

**`supabase/functions/parse-menu/`** — Called from admin upload page
- Receives extracted PDF text
- Calls Claude API to parse into JSON menu structure
- Returns categories + items JSON

**`supabase/functions/trigger-print/`** — Database webhook on `orders` INSERT
- Fetches full order details
- Formats printer ticket
- Calls PrintNode API

Deploy:
```bash
supabase functions deploy parse-menu
supabase functions deploy trigger-print
```

---

## Auth Migration (Phase 2)

Replace mock auth store with Supabase Auth:

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// Logout
await supabase.auth.signOut()

// Get current user (server component)
const { data: { user } } = await supabase.auth.getUser()
```

Protect routes with `middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```
