import { create } from 'zustand'
import type { CartItem, SelectedModifier } from '@bite/types'

interface CartStore {
  items: CartItem[]
  restaurantId: string | null
  tableId: string | null
  restaurantName: string | null
  specialInstructions: string
  setContext: (restaurantId: string, tableId: string, restaurantName: string) => void
  setInstructions: (text: string) => void
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  updateQuantity: (menuItemId: string, selectedModifiers: SelectedModifier[], quantity: number) => void
  removeItem: (menuItemId: string, selectedModifiers: SelectedModifier[]) => void
  clearCart: () => void
  getTotal: () => number
  getCount: () => number
}

function modifiersMatch(a: SelectedModifier[], b: SelectedModifier[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  restaurantId: null,
  tableId: null,
  restaurantName: null,
  specialInstructions: '',

  setContext: (restaurantId, tableId, restaurantName) =>
    set({ restaurantId, tableId, restaurantName }),

  setInstructions: (text) => set({ specialInstructions: text }),

  addItem: (newItem) =>
    set((state) => {
      const quantity = newItem.quantity ?? 1
      const existing = state.items.find(
        (i) =>
          i.menuItemId === newItem.menuItemId &&
          modifiersMatch(i.selectedModifiers, newItem.selectedModifiers)
      )
      if (existing) {
        return {
          items: state.items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + quantity } : i
          ),
        }
      }
      return { items: [...state.items, { ...newItem, quantity }] }
    }),

  updateQuantity: (menuItemId, selectedModifiers, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter(
              (i) => !(i.menuItemId === menuItemId && modifiersMatch(i.selectedModifiers, selectedModifiers))
            )
          : state.items.map((i) =>
              i.menuItemId === menuItemId && modifiersMatch(i.selectedModifiers, selectedModifiers)
                ? { ...i, quantity }
                : i
            ),
    })),

  removeItem: (menuItemId, selectedModifiers) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.menuItemId === menuItemId && modifiersMatch(i.selectedModifiers, selectedModifiers))
      ),
    })),

  clearCart: () => set({ items: [], specialInstructions: '' }),

  getTotal: () =>
    get().items.reduce((sum, item) => {
      const modifierTotal = item.selectedModifiers.reduce(
        (s, m) => s + m.price_delta,
        0
      )
      return sum + (item.price + modifierTotal) * item.quantity
    }, 0),

  getCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}))
