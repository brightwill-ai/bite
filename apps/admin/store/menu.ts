import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { MenuCategory, MenuItem, ModifierGroup, Modifier } from '@bite/types'

// Temp types used during upload review before items have real DB IDs
export type TempModifierGroup = Omit<ModifierGroup, 'id'> & { tempId: string }
export type TempModifier = Omit<Modifier, 'id' | 'group_id'> & {
  tempId: string
  groupTempId: string
}

interface MenuStore {
  restaurantId: string | null
  isLoading: boolean
  categories: MenuCategory[]
  items: MenuItem[]
  modifierGroups: Record<string, ModifierGroup[]>
  modifiers: Record<string, Modifier[]>
  loadMenu: (restaurantId: string) => Promise<void>
  addCategory: (name: string) => Promise<void>
  updateCategory: (id: string, updates: Partial<MenuCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addItem: (item: Omit<MenuItem, 'id'>) => Promise<void>
  updateItem: (id: string, updates: Partial<MenuItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleAvailability: (id: string) => Promise<void>
  reorderItems: (categoryId: string, orderedIds: string[]) => Promise<void>
  importParsedMenu: (
    categories: MenuCategory[],
    items: MenuItem[],
    tempGroups?: TempModifierGroup[],
    tempModifiers?: TempModifier[]
  ) => Promise<void>
  addModifierGroup: (group: Omit<ModifierGroup, 'id'>) => Promise<ModifierGroup | null>
  updateModifierGroup: (id: string, updates: Partial<ModifierGroup>) => Promise<void>
  deleteModifierGroup: (id: string) => Promise<void>
  addModifier: (modifier: Omit<Modifier, 'id'>) => Promise<Modifier | null>
  updateModifier: (id: string, updates: Partial<Modifier>) => Promise<void>
  deleteModifier: (id: string) => Promise<void>
}

function toMenuCategory(row: {
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

function toModifierGroupsByItem(groups: ModifierGroup[]): Record<string, ModifierGroup[]> {
  const grouped: Record<string, ModifierGroup[]> = {}
  for (const group of groups) {
    if (!grouped[group.item_id]) {
      grouped[group.item_id] = []
    }
    grouped[group.item_id].push(group)
  }
  return grouped
}

function toModifiersByGroup(modifierRows: Modifier[]): Record<string, Modifier[]> {
  const grouped: Record<string, Modifier[]> = {}
  for (const modifier of modifierRows) {
    if (!grouped[modifier.group_id]) {
      grouped[modifier.group_id] = []
    }
    grouped[modifier.group_id].push(modifier)
  }
  return grouped
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  restaurantId: null,
  isLoading: false,
  categories: [],
  items: [],
  modifierGroups: {},
  modifiers: {},

  loadMenu: async (restaurantId) => {
    const supabase = createClient()
    set({ isLoading: true, restaurantId })

    const [{ data: categoryRows, error: categoryError }, { data: itemRows, error: itemError }] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, restaurant_id, name, display_order, is_available')
        .eq('restaurant_id', restaurantId)
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
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true }),
    ])

    if (categoryError || itemError) {
      set({ isLoading: false })
      return
    }

    const categories = (categoryRows ?? []).map(toMenuCategory)
    const items = (itemRows ?? []).map(toMenuItem)
    const itemIds = items.map((item) => item.id)

    if (itemIds.length === 0) {
      set({
        isLoading: false,
        categories,
        items,
        modifierGroups: {},
        modifiers: {},
      })
      return
    }

    const { data: modifierGroupRows, error: modifierGroupError } = await supabase
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

    if (modifierGroupError) {
      set({
        isLoading: false,
        categories,
        items,
        modifierGroups: {},
        modifiers: {},
      })
      return
    }

    const groups = (modifierGroupRows ?? []).map(toModifierGroup)
    const groupIds = groups.map((group) => group.id)

    if (groupIds.length === 0) {
      set({
        isLoading: false,
        categories,
        items,
        modifierGroups: toModifierGroupsByItem(groups),
        modifiers: {},
      })
      return
    }

    const { data: modifierRows, error: modifierError } = await supabase
      .from('modifiers')
      .select('id, group_id, name, price_delta, is_available, display_order, emoji')
      .in('group_id', groupIds)
      .order('display_order', { ascending: true })

    if (modifierError) {
      set({
        isLoading: false,
        categories,
        items,
        modifierGroups: toModifierGroupsByItem(groups),
        modifiers: {},
      })
      return
    }

    const modifiers = (modifierRows ?? []).map(toModifier)

    set({
      isLoading: false,
      categories,
      items,
      modifierGroups: toModifierGroupsByItem(groups),
      modifiers: toModifiersByGroup(modifiers),
    })
  },

  addCategory: async (name) => {
    const supabase = createClient()
    const restaurantId = get().restaurantId
    if (!restaurantId) {
      return
    }

    const nextOrder = get().categories.length + 1
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name,
        display_order: nextOrder,
        is_available: true,
      })
      .select('id, restaurant_id, name, display_order, is_available')
      .single()

    if (error || !data) {
      return
    }

    set((state) => ({
      categories: [...state.categories, toMenuCategory(data)],
    }))
  },

  updateCategory: async (id, updates) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('menu_categories')
      .update({
        name: updates.name,
        display_order: updates.display_order,
        is_available: updates.is_available,
      })
      .eq('id', id)

    if (error) {
      return
    }

    set((state) => ({
      categories: state.categories.map((category) =>
        category.id === id ? { ...category, ...updates } : category
      ),
    }))
  },

  deleteCategory: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('menu_categories').delete().eq('id', id)

    if (error) {
      return
    }

    set((state) => ({
      categories: state.categories.filter((category) => category.id !== id),
      items: state.items.filter((item) => item.category_id !== id),
    }))
  },

  addItem: async (item) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: item.restaurant_id,
        category_id: item.category_id,
        name: item.name,
        description: item.description ?? null,
        price: item.price,
        image_url: item.image_url ?? null,
        emoji: item.emoji ?? null,
        is_available: item.is_available,
        is_popular: item.is_popular,
        is_new: item.is_new ?? false,
        needs_review: item.needs_review ?? false,
        display_order: item.display_order,
      })
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
      .single()

    if (error || !data) {
      return
    }

    set((state) => ({
      items: [...state.items, toMenuItem(data)],
    }))
  },

  updateItem: async (id, updates) => {
    const supabase = createClient()
    const payload = {
      category_id: updates.category_id,
      name: updates.name,
      description: updates.description ?? null,
      price: updates.price,
      image_url: updates.image_url ?? null,
      emoji: updates.emoji ?? null,
      is_available: updates.is_available,
      is_popular: updates.is_popular,
      is_new: updates.is_new,
      needs_review: updates.needs_review,
      display_order: updates.display_order,
    }

    const { error } = await supabase.from('menu_items').update(payload).eq('id', id)
    if (error) {
      return
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }))
  },

  deleteItem: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) {
      return
    }

    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },

  toggleAvailability: async (id) => {
    const item = get().items.find((candidate) => candidate.id === id)
    if (!item) {
      return
    }
    await get().updateItem(id, { is_available: !item.is_available })
  },

  reorderItems: async (categoryId, orderedIds) => {
    const supabase = createClient()
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('menu_items')
        .update({ display_order: index + 1 })
        .eq('id', id)
        .eq('category_id', categoryId)
    )
    await Promise.all(updates)

    set((state) => ({
      items: state.items.map((item) => {
        if (item.category_id !== categoryId) {
          return item
        }
        const newIndex = orderedIds.indexOf(item.id)
        if (newIndex === -1) {
          return item
        }
        return { ...item, display_order: newIndex + 1 }
      }),
    }))
  },

  addModifierGroup: async (group) => {
    const supabase = createClient()
    const nextOrder = (get().modifierGroups[group.item_id] ?? []).length + 1
    const { data, error } = await supabase
      .from('modifier_groups')
      .insert({
        item_id: group.item_id,
        name: group.name,
        selection_type: group.selection_type,
        is_required: group.is_required,
        min_selections: group.min_selections,
        max_selections: group.max_selections,
        display_order: nextOrder,
      })
      .select('id, item_id, name, selection_type, is_required, min_selections, max_selections, display_order')
      .single()

    if (error || !data) {
      return null
    }

    const newGroup = toModifierGroup(data)
    set((state) => ({
      modifierGroups: {
        ...state.modifierGroups,
        [group.item_id]: [...(state.modifierGroups[group.item_id] ?? []), newGroup],
      },
    }))
    return newGroup
  },

  updateModifierGroup: async (id, updates) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('modifier_groups')
      .update({
        name: updates.name,
        selection_type: updates.selection_type,
        is_required: updates.is_required,
        min_selections: updates.min_selections,
        max_selections: updates.max_selections,
        display_order: updates.display_order,
      })
      .eq('id', id)

    if (error) {
      return
    }

    set((state) => {
      const nextGroups = { ...state.modifierGroups }
      for (const itemId of Object.keys(nextGroups)) {
        nextGroups[itemId] = nextGroups[itemId].map((g) =>
          g.id === id ? { ...g, ...updates } : g
        )
      }
      return { modifierGroups: nextGroups }
    })
  },

  deleteModifierGroup: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('modifier_groups').delete().eq('id', id)

    if (error) {
      return
    }

    set((state) => {
      const nextGroups = { ...state.modifierGroups }
      const nextModifiers = { ...state.modifiers }
      delete nextModifiers[id]
      for (const itemId of Object.keys(nextGroups)) {
        nextGroups[itemId] = nextGroups[itemId].filter((g) => g.id !== id)
      }
      return { modifierGroups: nextGroups, modifiers: nextModifiers }
    })
  },

  addModifier: async (modifier) => {
    const supabase = createClient()
    const nextOrder = (get().modifiers[modifier.group_id] ?? []).length + 1
    const { data, error } = await supabase
      .from('modifiers')
      .insert({
        group_id: modifier.group_id,
        name: modifier.name,
        price_delta: modifier.price_delta,
        is_available: modifier.is_available,
        display_order: nextOrder,
        emoji: modifier.emoji ?? null,
      })
      .select('id, group_id, name, price_delta, is_available, display_order, emoji')
      .single()

    if (error || !data) {
      return null
    }

    const newModifier = toModifier(data)
    set((state) => ({
      modifiers: {
        ...state.modifiers,
        [modifier.group_id]: [...(state.modifiers[modifier.group_id] ?? []), newModifier],
      },
    }))
    return newModifier
  },

  updateModifier: async (id, updates) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('modifiers')
      .update({
        name: updates.name,
        price_delta: updates.price_delta,
        is_available: updates.is_available,
        display_order: updates.display_order,
        emoji: updates.emoji ?? null,
      })
      .eq('id', id)

    if (error) {
      return
    }

    set((state) => {
      const nextModifiers = { ...state.modifiers }
      for (const groupId of Object.keys(nextModifiers)) {
        nextModifiers[groupId] = nextModifiers[groupId].map((m) =>
          m.id === id ? { ...m, ...updates } : m
        )
      }
      return { modifiers: nextModifiers }
    })
  },

  deleteModifier: async (id) => {
    const supabase = createClient()
    const { error } = await supabase.from('modifiers').delete().eq('id', id)

    if (error) {
      return
    }

    set((state) => {
      const nextModifiers = { ...state.modifiers }
      for (const groupId of Object.keys(nextModifiers)) {
        nextModifiers[groupId] = nextModifiers[groupId].filter((m) => m.id !== id)
      }
      return { modifiers: nextModifiers }
    })
  },

  importParsedMenu: async (categories, items, tempGroups, tempModifiers) => {
    const supabase = createClient()
    const restaurantId = get().restaurantId
    if (!restaurantId) {
      return
    }

    const oldToNewCategoryId = new Map<string, string>()

    for (const category of categories) {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: category.name,
          display_order: category.display_order,
          is_available: category.is_available,
        })
        .select('id')
        .single()
      if (!error && data) {
        oldToNewCategoryId.set(category.id, data.id)
      }
    }

    for (const item of items) {
      const mappedCategoryId = oldToNewCategoryId.get(item.category_id)
      if (!mappedCategoryId) {
        continue
      }
      const { data: newItem } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurantId,
          category_id: mappedCategoryId,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          image_url: item.image_url ?? null,
          emoji: item.emoji ?? null,
          is_available: item.is_available,
          is_popular: item.is_popular,
          is_new: item.is_new ?? false,
          needs_review: item.needs_review ?? false,
          display_order: item.display_order,
        })
        .select('id')
        .single()

      if (!newItem || !tempGroups || !tempModifiers) {
        continue
      }

      // Insert modifier groups that belong to this (temp) item
      const itemTempGroups = tempGroups.filter((g) => g.item_id === item.id)
      for (const tg of itemTempGroups) {
        const { data: newGroup } = await supabase
          .from('modifier_groups')
          .insert({
            item_id: newItem.id,
            name: tg.name,
            selection_type: tg.selection_type,
            is_required: tg.is_required,
            min_selections: tg.min_selections,
            max_selections: tg.max_selections,
            display_order: tg.display_order,
          })
          .select('id')
          .single()

        if (!newGroup) {
          continue
        }

        // Insert modifiers for this group
        const groupMods = tempModifiers.filter((m) => m.groupTempId === tg.tempId)
        for (const tm of groupMods) {
          await supabase.from('modifiers').insert({
            group_id: newGroup.id,
            name: tm.name,
            price_delta: tm.price_delta,
            is_available: tm.is_available,
            display_order: tm.display_order,
            emoji: tm.emoji ?? null,
          })
        }
      }
    }

    await get().loadMenu(restaurantId)
  },
}))
