'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { MenuItem, ModifierGroup, Modifier, SelectedModifier } from '@bite/types'
import {
  mockRestaurant,
  mockCategories,
  mockItems,
  mockModifierGroups,
  mockModifiers,
} from '@bite/types/mock'
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

export default function MenuPage({ params }: PageProps) {
  const { slug, tableId } = params
  const restaurant = mockRestaurant
  const categories = mockCategories
    .filter((c) => c.is_available)
    .sort((a, b) => a.display_order - b.display_order)
  const menuItems = mockItems.sort((a, b) => a.display_order - b.display_order)

  // Cart store
  const cart = useCartStore()

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || '')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedItems, setConfirmedItems] = useState<typeof cart.items>([])
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [ticketNumber, setTicketNumber] = useState('')
  const [bounceKey, setBounceKey] = useState(0)
  const [isScrollingFromClick, setIsScrollingFromClick] = useState(false)

  // Refs for intersection observer
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Set cart context on mount
  useEffect(() => {
    cart.setContext(restaurant.id, tableId, restaurant.name)
  }, [restaurant.id, tableId, restaurant.name])

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems
    const q = searchQuery.toLowerCase()
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
    )
  }, [menuItems, searchQuery])

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {}
    categories.forEach((cat) => {
      map[cat.id] = filteredItems.filter((item) => item.category_id === cat.id)
    })
    return map
  }, [categories, filteredItems])

  // Check if item has modifiers
  const hasModifiers = useCallback((itemId: string) => {
    return !!(mockModifierGroups[itemId] && mockModifierGroups[itemId].length > 0)
  }, [])

  // Get modifier groups for an item
  const getModifierGroups = useCallback((itemId: string): ModifierGroup[] => {
    return mockModifierGroups[itemId] || []
  }, [])

  // IntersectionObserver to sync scroll with sidebar
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingFromClick) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const catId = entry.target.getAttribute('data-category-id')
            if (catId) setActiveCategory(catId)
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

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [filteredItems, isScrollingFromClick])

  // Handle sidebar category click
  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory(categoryId)
    setIsScrollingFromClick(true)

    const el = sectionRefs.current[categoryId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    setTimeout(() => setIsScrollingFromClick(false), 800)
  }, [])

  // Handle add to cart (no modifiers)
  const handleAddSimple = useCallback(
    (item: MenuItem) => {
      cart.addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        selectedModifiers: [],
      })
      setBounceKey((k) => k + 1)
      toast.success(`${item.name} added`, { duration: 1500 })
    },
    [cart]
  )

  // Handle add to cart from detail sheet (with modifiers)
  const handleAddWithModifiers = useCallback(
    (item: MenuItem, selectedMods: SelectedModifier[], quantity: number) => {
      cart.addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        selectedModifiers: selectedMods,
        quantity,
      })
      setBounceKey((k) => k + 1)
      toast.success(`${item.name} added`, { duration: 1500 })
    },
    [cart]
  )

  // Handle place order
  const handlePlaceOrder = useCallback(() => {
    const items = [...cart.items]
    const total = cart.getTotal()
    const ticket = String(Math.floor(Math.random() * 900) + 100)

    setConfirmedItems(items)
    setConfirmedTotal(total)
    setTicketNumber(ticket)
    setCartOpen(false)
    cart.clearCart()
    setConfirmed(true)
  }, [cart])

  // Handle order more
  const handleOrderMore = useCallback(() => {
    setConfirmed(false)
  }, [])

  // Visible categories (those with items after filter)
  const visibleCategories = categories.filter(
    (cat) => (itemsByCategory[cat.id] || []).length > 0
  )

  return (
    <div className="flex flex-col h-screen">
      <MenuHeader
        restaurantName={restaurant.name}
        tableId={tableId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar
          categories={visibleCategories}
          activeCategory={activeCategory}
          onCategoryClick={handleCategoryClick}
        />

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pb-24"
        >
          {visibleCategories.map((cat) => {
            const items = itemsByCategory[cat.id] || []
            if (items.length === 0) return null
            return (
              <div
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el
                }}
                data-category-id={cat.id}
              >
                {/* Sticky category label */}
                <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm px-3 py-2 border-b border-border">
                  <h2 className="text-[13px] font-semibold text-ink uppercase tracking-wider">
                    {cat.name}
                  </h2>
                </div>

                {/* Items */}
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

          {/* Empty state */}
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

      {/* Floating cart bar */}
      <FloatingCartBar
        count={cart.getCount()}
        total={cart.getTotal()}
        onOpen={() => setCartOpen(true)}
        bounceKey={bounceKey}
      />

      {/* Item detail sheet */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailSheet
            item={selectedItem}
            modifierGroups={getModifierGroups(selectedItem.id)}
            modifiers={mockModifiers}
            onClose={() => setSelectedItem(null)}
            onAddToCart={handleAddWithModifiers}
          />
        )}
      </AnimatePresence>

      {/* Cart sheet */}
      <AnimatePresence>
        {cartOpen && (
          <CartSheet
            items={cart.items}
            tableId={tableId}
            subtotal={cart.getTotal()}
            specialInstructions={cart.specialInstructions}
            onUpdateQuantity={cart.updateQuantity}
            onSetInstructions={cart.setInstructions}
            onPlaceOrder={handlePlaceOrder}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Order confirmation */}
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
    </div>
  )
}
