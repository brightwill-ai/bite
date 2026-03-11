import { notFound } from 'next/navigation'
import type { MenuItem, Modifier, ModifierGroup, Restaurant, Table } from '@bite/types'
import MenuTableClientPage, { type InitialMenuData, type MenuCategory } from '@/components/MenuTableClientPage'
import { normalizeMenuEmoji } from '@/lib/emoji'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: { slug: string; tableId: string }
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
  const subscriptionTier =
    subscription === 'starter' || subscription === 'pro' || subscription === 'enterprise'
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
    subscription_tier: subscriptionTier,
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
    emoji: normalizeMenuEmoji(row.emoji),
    is_available: row.is_available ?? true,
    is_popular: row.is_popular ?? false,
    is_new: row.is_new ?? false,
    needs_review: row.needs_review ?? false,
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
    emoji: normalizeMenuEmoji(row.emoji),
  }
}

export default async function MenuPage({ params }: PageProps) {
  const supabase = createClient()

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
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (restaurantError || !restaurantRow) {
    notFound()
  }

  const restaurant = toRestaurant(restaurantRow)

  const { data: tableRow, error: tableError } = await supabase
    .from('tables')
    .select('id, restaurant_id, table_number, label, qr_code_url, is_active, created_at, updated_at')
    .eq('restaurant_id', restaurant.id)
    .eq('table_number', params.tableId)
    .single()

  if (tableError || !tableRow) {
    notFound()
  }

  const table = toTable(tableRow)

  const { data: categoryRows, error: categoryError } = await supabase
    .from('menu_categories')
    .select('id, restaurant_id, name, display_order, is_available')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .order('display_order', { ascending: true })

  if (categoryError) {
    throw new Error(categoryError.message)
  }

  const categories = (categoryRows ?? []).map(toCategory)

  const { data: itemRows, error: itemError } = await supabase
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
        display_order,
        modifier_groups(
          id,
          item_id,
          name,
          selection_type,
          is_required,
          min_selections,
          max_selections,
          display_order,
          modifiers(
            id,
            group_id,
            name,
            price_delta,
            is_available,
            display_order,
            emoji
          )
        )
      `
    )
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .order('display_order', { ascending: true })

  if (itemError) {
    throw new Error(itemError.message)
  }

  const menuItems = (itemRows ?? []).map(toMenuItem)
  const modifierGroupsByItem: Record<string, ModifierGroup[]> = {}
  const modifiersByGroup: Record<string, Modifier[]> = {}

  for (const itemRow of itemRows ?? []) {
    const groupRows = Array.isArray(itemRow.modifier_groups) ? itemRow.modifier_groups : []
    for (const groupRow of groupRows) {
      const group = toModifierGroup(groupRow)
      if (!modifierGroupsByItem[group.item_id]) {
        modifierGroupsByItem[group.item_id] = []
      }
      modifierGroupsByItem[group.item_id].push(group)

      const modifierRows = Array.isArray(groupRow.modifiers) ? groupRow.modifiers : []
      const mappedModifiers = modifierRows.map(toModifier).filter((modifier) => modifier.is_available)
      if (mappedModifiers.length > 0) {
        modifiersByGroup[group.id] = mappedModifiers
      }
    }
  }

  const initialData: InitialMenuData = {
    restaurant,
    table,
    categories,
    menuItems,
    modifierGroupsByItem,
    modifiersByGroup,
  }

  return <MenuTableClientPage initialData={initialData} />
}
