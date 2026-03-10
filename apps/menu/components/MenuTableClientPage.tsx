'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { MenuItem, Modifier, ModifierGroup, Restaurant, SelectedModifier, Table } from '@bite/types'
import CartSheet from '@/components/CartSheet'
import CategorySidebar from '@/components/CategorySidebar'
import FloatingCartBar from '@/components/FloatingCartBar'
import ItemDetailSheet from '@/components/ItemDetailSheet'
import MenuHeader from '@/components/MenuHeader'
import MenuItemCard from '@/components/MenuItemCard'
import OrderConfirmation from '@/components/OrderConfirmation'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'

type MenuCategory = {
  id: string
  restaurant_id: string
  name: string
  display_order: number
  is_available: boolean
}

type InitialMenuData = {
  restaurant: Restaurant
  table: Table
  categories: MenuCategory[]
  menuItems: MenuItem[]
  modifierGroupsByItem: Record<string, ModifierGroup[]>
  modifiersByGroup: Record<string, Modifier[]>
}

type CreateOrderResponse = {
  order_id: string
  ticket_number: number
  subtotal: number
  tax: number
  total: number
}

interface MenuTableClientPageProps {
  initialData: InitialMenuData
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
  const existing = window.sessionStorage.getItem(key)
  if (existing) {
    return existing
  }

  const created = window.crypto.randomUUID()
  window.sessionStorage.setItem(key, created)
  return created
}

export default function MenuTableClientPage({ initialData }: MenuTableClientPageProps) {
  const supabase = useMemo(() => createClient(), [])
  const cart = useCartStore()

  const restaurant = initialData.restaurant
  const table = initialData.table
  const categories = initialData.categories
  const menuItems = initialData.menuItems
  const modifierGroupsByItem = initialData.modifierGroupsByItem
  const modifiersByGroup = initialData.modifiersByGroup

  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
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
    cart.setContext(restaurant.id, table.id, restaurant.name)
  }, [cart, restaurant.id, restaurant.name, table.id])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return menuItems
    }

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

  const hasModifiers = useCallback(
    (itemId: string) => {
      const groups = modifierGroupsByItem[itemId] ?? []
      return groups.length > 0
    },
    [modifierGroupsByItem]
  )

  const getModifierGroups = useCallback(
    (itemId: string): ModifierGroup[] => {
      return modifierGroupsByItem[itemId] ?? []
    },
    [modifierGroupsByItem]
  )

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingFromClickRef.current) {
          return
        }

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const categoryId = entry.target.getAttribute('data-category-id')
            if (categoryId) {
              setActiveCategory(categoryId)
            }
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
      if (element) {
        observer.observe(element)
      }
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

    window.setTimeout(() => {
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
    if (cart.items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setPlacingOrder(true)
    setOrderError(null)

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

    const { data, error } = await supabase.rpc('create_order', {
      p_session_id: sessionId,
      p_restaurant_id: restaurant.id,
      p_table_id: table.id,
      p_special_instructions: cart.specialInstructions || undefined,
      p_items: itemsPayload,
    })

    if (error) {
      setOrderError(error.message || 'Failed to place order')
      setPlacingOrder(false)
      return
    }

    const parsed = parseCreateOrderResponse(data)
    if (!parsed) {
      setOrderError(getErrorMessage(data) ?? 'Unexpected order response')
      setPlacingOrder(false)
      return
    }

    setConfirmedItems([...cart.items])
    setConfirmedTotal(parsed.total)
    setTicketNumber(String(parsed.ticket_number))
    setCartOpen(false)
    cart.clearCart()
    setConfirmed(true)
    setPlacingOrder(false)
  }, [cart, restaurant.id, supabase, table.id])

  const handleOrderMore = useCallback(() => {
    setConfirmed(false)
  }, [])

  const visibleCategories = categories.filter((category) => (itemsByCategory[category.id] || []).length > 0)

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

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-24">
          {visibleCategories.map((category) => {
            const items = itemsByCategory[category.id] || []
            if (items.length === 0) {
              return null
            }

            return (
              <div
                key={category.id}
                ref={(element) => {
                  sectionRefs.current[category.id] = element
                }}
                data-category-id={category.id}
              >
                <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm px-3 py-2 border-b border-border">
                  <h2 className="text-[13px] font-semibold text-ink uppercase tracking-wider">{category.name}</h2>
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
              <p className="text-[13px] text-muted mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      <FloatingCartBar count={cart.getCount()} total={cart.getTotal()} onOpen={() => setCartOpen(true)} bounceKey={bounceKey} />

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
          <div className="bg-surface2 border border-border rounded px-5 py-3 text-sm text-ink">Sending order...</div>
        </div>
      )}

      <AnimatePresence>
        {orderError && (
          <div className="fixed inset-0 z-[70] bg-ink/35 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-[360px] bg-surface2 border border-border rounded p-5">
              <h2 className="font-display font-bold text-lg text-ink">Order Failed</h2>
              <p className="text-sm text-muted mt-2">{orderError}</p>
              <div className="mt-5 flex items-center gap-2">
                <button
                  className="flex-1 bg-ink text-surface rounded-full py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                  onClick={() => {
                    void handlePlaceOrder()
                  }}
                >
                  Retry
                </button>
                <button
                  className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
                  onClick={() => setOrderError(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { InitialMenuData, MenuCategory }
