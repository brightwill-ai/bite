import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mockCategories, mockItems, mockModifierGroups, mockModifiers } from '@bite/types/mock'
import type { MenuCategory, MenuItem, ModifierGroup, Modifier } from '@bite/types'

interface MenuStore {
  categories: MenuCategory[]
  items: MenuItem[]
  modifierGroups: Record<string, ModifierGroup[]>
  modifiers: Record<string, Modifier[]>
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
    (set) => ({
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
            },
          ],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          items: state.items.filter((i) => i.category_id !== id),
        })),

      addItem: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, id: `item-${Date.now()}` }],
        })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),

      toggleAvailability: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, is_available: !i.is_available } : i
          ),
        })),

      reorderItems: (categoryId, orderedIds) =>
        set((state) => ({
          items: state.items.map((item) => {
            const newOrder = orderedIds.indexOf(item.id)
            return item.category_id === categoryId && newOrder !== -1
              ? { ...item, display_order: newOrder + 1 }
              : item
          }),
        })),

      importParsedMenu: (categories, items) => set({ categories, items }),
    }),
    {
      name: 'bite-menu-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
