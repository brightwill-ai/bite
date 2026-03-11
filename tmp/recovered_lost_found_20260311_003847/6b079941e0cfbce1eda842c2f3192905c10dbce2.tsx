'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { MenuItem, ModifierGroup, Modifier, SelectedModifier, Restaurant, Table } from '@bite/types'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import MenuHeader from '@/components/MenuHeader'
import CategorySidebar from '@/components/CategorySidebar'
import MenuItemCard from '@/components/MenuItemCard'
import ItemDetailSheet from '@/components/ItemDetailSheet'
import FloatingCartBar from '@/components/FloatingCartBar'
import CartSheet from '@/components/CartSheet'
import OrderConfirmation from '@/components/OrderConfirmation'

interface PageProps {
  params: { slug: string; tableId: string }
}

type MenuCategory = {
  id: string
  restaurant_id: string
  name: string
  display_order: number
  is_available: boolean
}

type CreateOrderResponse = {
  order_id: string
  ticket_number: number
  subtotal: number
  tax: number
  total: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  return typeof value.message === 'string' ? value.message : null
}

function toRestaurant(row: {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cuisine_type: string | null
  address: string | null
  timezone: string | null
  is_active: boolean | null
  subscription_tier: string | null
  printnode_api_key: string | null
  printnode_printer_id: string | null
  adyen_merchant_id: string | null
  created_at: string | null
  updated_at: string | null
}): Restaurant {
  const subscription = row.subscription_tier
  const subscription_tier = subscription === 'starter' || subscription === 'pro' || subscription === 'enterprise'
    ? subscription
    : 'free'

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url ?? undefined,
    cuisine_type: row.cuisine_type ?? undefined,
    address: row.address ?? undefined,
    timezone: row.timezone ?? undefined,
    is_active: row.is_active ?? true,
    subscription_tier,
    printnode_api_key: row.printnode_api_key ?? undefined,
    printnode_printer_id: row.printnode_printer_id ?? undefined,
    adyen_merchant_id: row.adyen_merchant_id ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }
}

function toTable(row: {
  id: string
  restaurant_id: string
  table_number: string
  label: string | null
  qr_code_url: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}): Table {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    table_number: row.table_number,
    label: row.label ?? undefined,
    qr_code_url: row.qr_code_url ?? undefined,
    is_active: row.is_active ?? true,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }
}

function toCategory(row: {
  id: string
  restaurant_id: string
  name: string
  display_order: number | null
  is_available: boolean | null
}): MenuCategory {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    display_order: row.display_order ?? 0,
    is_available: row.is_available ?? true,
  }
}

function toMenuItem(row: {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  emoji: string | null
  is_available: boolean | null
  is_popular: boolean | null
  is_new: boolean | null
  needs_review: boolean | null
  display_order: number | null
}): MenuItem {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    category_id: row.category_id,
    name: row.name,
    description: row.description ?? undefined,
    price: row.price,
    image_url: row.image_url ?? undefined,
    emoji: row.emoji ?? undefined,
    is_available: row.is_available ?? true,
    is_popular: row.is_popular ?? false,
    is_new: row.is_new ?? undefined,
    needs_review: row.needs_review ?? undefined,
    display_order: row.display_order ?? 0,
  }
}

function toModifierGroup(row: {
  id: string
  item_id: string
  name: string
  selection_type: string
  is_required: boolean | null
  min_selections: number | null
  max_selections: number | null
  display_order: number | null
}): ModifierGroup {
  return {
    id: row.id,
    item_id: row.item_id,
    name: row.name,
    selection_type: row.selection_type === 'multiple' ? 'multiple' : 'single',
    is_required: row.is_required ?? false,
    min_selections: row.min_selections ?? 0,
    max_selections: row.max_selections ?? 1,
    display_order: row.display_order ?? 0,
  }
}

function toModifier(row: {
  id: string
  group_id: string
  name: string
  price_delta: number | null
  is_available: boolean | null
  display_order: number | null
  emoji: string | null
}): Modifier {
  return {
    id: row.id,
    group_id: row.group_id,
    name: row.name,
    price_delta: row.price_delta ?? 0,
    is_available: row.is_available ?? true,
    display_order: row.display_order ?? 0,
    emoji: row.emoji ?? undefined,
  }
}

function parseCreateOrderResponse(value: unknown): CreateOrderResponse | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.order_id !== 'string' ||
    typeof value.ticket_number !== 'number' ||
    typeof value.subtotal !== 'number' ||
    typeof value.tax !== 'number' ||
    typeof value.total !== 'number'
  ) {
    return null
  }

  return {
    order_id: value.order_id,
    ticket_number: value.ticket_number,
    subtotal: value.subtotal,
    tax: value.tax,
    total: value.total,
  }
}

function getSessionId(restaurantId: string, tableId: string): string {
  const key = `bite-session:${restaurantId}:${tableId}`
  const existing = window.localStorage.getItem(key)
  if (existing) {
    return existing
  }
  const created = window.crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export default function MenuPage({ params }: PageProps) {
  const { slug, tableId } = params
  const supabase = useMemo(() => createClient(), [])

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [modifierGroupsByItem, setModifierGroupsByItem] = useState<Record<string, ModifierGroup[]>>({})
  const [modifiersByGroup, setModifiersByGroup] = useState<Record<string, Modifier[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  const cart = useCartStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedItems, setConfirmedItems] = useState<typeof cart.items>([])
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [ticketNumber, setTicketNumber] = useState('')
  const [bounceKey, setBounceKey] = useState(0)

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isScrollingFromClickRef = useRef(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setLoadingError('')

      const { data: restaurantRow, error: restaurantError } = await supabase
        .from('restaurants')
        .select(
          `
            id,
            name,
            slug,
            logo_url,
            cuisine_type,
            address,
            timezone,
            is_active,
            subscription_tier,
            printnode_api_key,
            printnode_printer_id,
            adyen_merchant_id,
            created_at,
            updated_at
          `
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (restaurantError || !restaurantRow) {
        setLoadingError('Restaurant not found.')
        setLoading(false)
        return
      }

      const restaurantData = toRestaurant(restaurantRow)
      setRestaurant(restaurantData)

      const { data: tableRow, error: tableError } = await supabase
        .from('tables')
        .select('id, restaurant_id, table_number, label, qr_code_url, is_active, created_at, updated_at')
        .eq('restaurant_id', restaurantData.id)
        .eq('table_number', tableId)
        .eq('is_active', true)
        .single()

      if (tableError || !tableRow) {
        setLoadingError(`Table ${tableId} not found.`)
        setLoading(false)
        return
      }

      const tableData = toTable(tableRow)
      setTable(tableData)

      const [{ data: categoryRows, error: categoryError }, { data: itemRows, error: itemError }] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('id, restaurant_id, name, display_order, is_available')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_available', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('menu_items')
          .select(
            `
              id,
              restaurant_id,
              category_id,
              name,
              description,
              price,
              image_url,
              emoji,
              is_available,
              is_popular,
              is_new,
              needs_review,
              display_order
            `
          )
          .eq('restaurant_id', restaurantData.id)
          .eq('is_available', true)
          .order('display_order', { ascending: true }),
      ])

      if (categoryError || itemError) {
        setLoadingError('Failed to load menu.')
        setLoading(false)
        return
      }

      const loadedCategories = (categoryRows ?? []).map(toCategory)
      const loadedItems = (itemRows ?? []).map(toMenuItem)
      setCategories(loadedCategories)
      setMenuItems(loadedItems)
      setActiveCategory(loadedCategories[0]?.id ?? '')

      const itemIds = loadedItems.map((item) => item.id)
      if (itemIds.length === 0) {
        setModifierGroupsByItem({})
        setModifiersByGroup({})
        setLoading(false)
        return
      }

      const { data: groupRows, error: groupError } = await supabase
        .from('modifier_groups')
        .select(
          `
            id,
            item_id,
            name,
            selection_type,
            is_required,
            min_selections,
            max_selections,
            display_order
          `
        )
        .in('item_id', itemIds)
        .order('display_order', { ascending: true })

      if (groupError) {
        setLoading(false)
        return
      }

      const loadedGroups = (groupRows ?? []).map(toModifierGroup)
      const groupedByItem: Record<string, ModifierGroup[]> = {}
      loadedGroups.forEach((group) => {
        if (!groupedByItem[group.item_id]) {
          groupedByItem[group.item_id] = []
        }
        groupedByItem[group.item_id].push(group)
      })
      setModifierGroupsByItem(groupedByItem)

      const groupIds = loadedGroups.map((group) => group.id)
      if (groupIds.length === 0) {
        setModifiersByGroup({})
        setLoading(false)
        return
      }

      const { data: modifierRows, error: modifierError } = await supabase
        .from('modifiers')
        .select('id, group_id, name, price_delta, is_available, display_order, emoji')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('display_order', { ascending: true })

      if (modifierError) {
        setLoading(false)
        return
      }

      const loadedModifiers = (modifierRows ?? []).map(toModifier)
      const groupedModifiers: Record<string, Modifier[]> = {}
      loadedModifiers.forEach((modifier) => {
        if (!groupedModifiers[modifier.group_id]) {
          groupedModifiers[modifier.group_id] = []
        }
        groupedModifiers[modifier.group_id].push(modifier)
      })
      setModifiersByGroup(groupedModifiers)

      setLoading(false)
    }

    void fetchData()
  }, [slug, tableId, supabase])

  useEffect(() => {
    if (!restaurant || !table) {
      return
    }
    cart.setContext(restaurant.id, table.id, restaurant.name)
  }, [restaurant, table, cart])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems
    const query = searchQuery.toLowerCase()
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false)
    )
  }, [menuItems, searchQuery])

  const itemsByCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {}
    categories.forEach((category) => {
      map[category.id] = filteredItems.filter((item) => item.category_id === category.id)
    })
    return map
  }, [categories, filteredItems])

  const hasModifiers = useCallback((itemId: string) => {
    const groups = modifierGroupsByItem[itemId] ?? []
    return groups.length > 0
  }, [modifierGroupsByItem])

  const getModifierGroups = useCallback((itemId: string): ModifierGroup[] => {
    return modifierGroupsByItem[itemId] ?? []
  }, [modifierGroupsByItem])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingFromClickRef.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const categoryId = entry.target.getAttribute('data-category-id')
            if (categoryId) setActiveCategory(categoryId)
            break
          }
        }
      },
      {
        root: container,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    )

    Object.values(sectionRefs.current).forEach((element) => {
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [filteredItems])

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId)
    isScrollingFromClickRef.current = true

    const element = sectionRefs.current[categoryId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    setTimeout(() => {
      isScrollingFromClickRef.current = false
    }, 800)
  }, [])

  const handleAddSimple = useCallback(
    (item: MenuItem) => {
      cart.addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        selectedModifiers: [],
      })
      setBounceKey((key) => key + 1)
      toast.success(`${item.name} added`, { duration: 1500 })
    },
    [cart]
  )

  const handleAddWithModifiers = useCallback(
    (item: MenuItem, selectedModifiers: SelectedModifier[], quantity: number) => {
      cart.addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        selectedModifiers,
        quantity,
      })
      setBounceKey((key) => key + 1)
      toast.success(`${item.name} added`, { duration: 1500 })
    },
    [cart]
  )

  const handlePlaceOrder = useCallback(async () => {
    if (!restaurant || !table) {
      toast.error('Missing table context')
      return
    }
    if (cart.items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setPlacingOrder(true)
    const itemsPayload = cart.items.map((item) => ({
      menu_item_id: item.menuItemId,
      item_name: item.name,
      item_price: item.price,
      quantity: item.quantity,
      modifiers: item.selectedModifiers.map((modifier) => ({
        modifier_id: modifier.modifier_id,
        name: modifier.name,
        price_delta: modifier.price_delta,
      })),
    }))

    const sessionId = getSessionId(restaurant.id, table.id)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/create_order`,
      {
        method: 'POST',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_session_id: sessionId,
          p_restaurant_id: restaurant.id,
          p_table_id: table.id,
          p_special_instructions: cart.specialInstructions || undefined,
          p_items: itemsPayload,
        }),
      }
    )

    let responseData: unknown = null
    try {
      responseData = await response.json()
    } catch {
      responseData = null
    }

    if (!response.ok) {
      toast.error(getErrorMessage(responseData) ?? 'Failed to place order')
      setPlacingOrder(false)
      return
    }

    const parsed = parseCreateOrderResponse(responseData)
    if (!parsed) {
      toast.error('Unexpected order response')
      setPlacingOrder(false)
      return
    }

    void supabase
      .functions
      .invoke('trigger-print', {
        body: {
          mode: 'order',
          orderId: parsed.order_id,
        },
      })
      .then(({ error: printError }) => {
        if (printError) {
          console.error('Failed to trigger kitchen print', printError)
        }
      })

    setConfirmedItems([...cart.items])
    setConfirmedTotal(parsed.total)
    setTicketNumber(String(parsed.ticket_number))
    setCartOpen(false)
    cart.clearCart()
    setConfirmed(true)
    setPlacingOrder(false)
  }, [cart, restaurant, supabase, table])

  const handleOrderMore = useCallback(() => {
    setConfirmed(false)
  }, [])

  const visibleCategories = categories.filter(
    (category) => (itemsByCategory[category.id] || []).length > 0
  )

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <p className="text-sm text-muted">Loading menu...</p>
      </div>
    )
  }

  if (loadingError || !restaurant || !table) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center px-6">
        <div className="bg-surface2 border border-border rounded p-5 text-center max-w-[360px]">
          <p className="text-sm font-medium text-ink">
            {loadingError || 'Unable to load menu'}
          </p>
          <p className="text-xs text-muted mt-2">
            Please ask restaurant staff to verify this QR code.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <MenuHeader
        restaurantName={restaurant.name}
        tableId={table.table_number}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar
          categories={visibleCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pb-24"
        >
          {visibleCategories.map((category) => {
            const items = itemsByCategory[category.id] || []
            if (items.length === 0) return null
            return (
              <div
                key={category.id}
                ref={(element) => {
                  sectionRefs.current[category.id] = element
                }}
                data-category-id={category.id}
              >
                <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm px-3 py-2 border-b border-border">
                  <h2 className="text-[13px] font-semibold text-ink uppercase tracking-wider">
                    {category.name}
                  </h2>
                </div>

                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    hasModifiers={hasModifiers(item.id)}
                    onAdd={handleAddSimple}
                    onOpenDetail={setSelectedItem}
                  />
                ))}
              </div>
            )
          })}

          {visibleCategories.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <span className="text-[40px] mb-3">🔍</span>
              <p className="text-[15px] font-medium text-ink">No items found</p>
              <p className="text-[13px] text-muted mt-1">
                Try a different search term
              </p>
            </div>
          )}
        </div>
      </div>

      <FloatingCartBar
        count={cart.getCount()}
        total={cart.getTotal()}
        onOpen={() => setCartOpen(true)}
        bounceKey={bounceKey}
      />

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailSheet
            item={selectedItem}
            modifierGroups={getModifierGroups(selectedItem.id)}
            modifiers={modifiersByGroup}
            onClose={() => setSelectedItem(null)}
            onAddToCart={handleAddWithModifiers}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <CartSheet
            items={cart.items}
            tableId={table.table_number}
            subtotal={cart.getTotal()}
            specialInstructions={cart.specialInstructions}
            onUpdateQuantity={cart.updateQuantity}
            onSetInstructions={cart.setInstructions}
            onPlaceOrder={() => {
              void handlePlaceOrder()
            }}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmed && (
          <OrderConfirmation
            ticketNumber={ticketNumber}
            items={confirmedItems}
            total={confirmedTotal}
            onOrderMore={handleOrderMore}
          />
        )}
      </AnimatePresence>

      {placingOrder && (
        <div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-surface2 border border-border rounded px-5 py-3 text-sm text-ink">
            Sending order...
          </div>
        </div>
      )}
    </div>
  )
}
