import { create } from 'zustand'
import type { QueryData } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, Staff, StaffRole, SubscriptionTier } from '@bite/types'

type RestaurantInsertInput = {
  name: string
  slug: string
  cuisineType?: string
  address?: string
  timezone?: string
}

interface AuthStore {
  isAuthenticated: boolean
  isLoading: boolean
  needsOnboarding: boolean
  userId: string | null
  restaurant: Restaurant | null
  staff: Staff | null
  restaurantName: string
  staffName: string
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  createRestaurant: (input: RestaurantInsertInput) => Promise<{ success: boolean; error?: string }>
}

function parseSubscriptionTier(value: string | null): SubscriptionTier {
  if (value === 'starter' || value === 'pro' || value === 'enterprise') {
    return value
  }
  return 'free'
}

function parseStaffRole(value: string): StaffRole {
  if (value === 'owner' || value === 'manager') {
    return value
  }
  return 'staff'
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
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url ?? undefined,
    cuisine_type: row.cuisine_type ?? undefined,
    address: row.address ?? undefined,
    timezone: row.timezone ?? undefined,
    is_active: row.is_active ?? false,
    subscription_tier: parseSubscriptionTier(row.subscription_tier),
    printnode_api_key: row.printnode_api_key ?? undefined,
    printnode_printer_id: row.printnode_printer_id ?? undefined,
    adyen_merchant_id: row.adyen_merchant_id ?? undefined,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }
}

function toStaff(row: {
  id: string
  user_id: string
  restaurant_id: string
  name: string
  email: string
  role: string
  created_at: string | null
  updated_at: string | null
}): Staff {
  return {
    id: row.id,
    user_id: row.user_id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    email: row.email,
    role: parseStaffRole(row.role),
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  }
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  needsOnboarding: false,
  userId: null,
  restaurant: null,
  staff: null,
  restaurantName: '',
  staffName: '',

  initialize: async () => {
    set({ isLoading: true })
    const supabase = createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      set({
        isAuthenticated: false,
        isLoading: false,
        needsOnboarding: false,
        userId: null,
        restaurant: null,
        staff: null,
        restaurantName: '',
        staffName: '',
      })
      return
    }

    const staffQuery = supabase
      .from('staff')
      .select(
        `
          id,
          user_id,
          restaurant_id,
          name,
          email,
          role,
          created_at,
          updated_at,
          restaurant:restaurants(
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
          )
        `
      )
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    type StaffWithRestaurantRow = QueryData<typeof staffQuery>
    const { data: staffRow, error: staffError } = await staffQuery

    if (staffError && staffError.code !== 'PGRST116') {
      set({
        isAuthenticated: false,
        isLoading: false,
        needsOnboarding: false,
        userId: null,
        restaurant: null,
        staff: null,
        restaurantName: '',
        staffName: '',
      })
      return
    }

    if (!staffRow) {
      set({
        isAuthenticated: true,
        isLoading: false,
        needsOnboarding: true,
        userId: session.user.id,
        restaurant: null,
        staff: null,
        restaurantName: '',
        staffName: typeof session.user.user_metadata?.name === 'string'
          ? session.user.user_metadata.name
          : '',
      })
      return
    }

    const typedRow: StaffWithRestaurantRow = staffRow
    const restaurantRow = typedRow.restaurant
    if (!restaurantRow) {
      set({
        isAuthenticated: true,
        isLoading: false,
        needsOnboarding: true,
        userId: session.user.id,
        restaurant: null,
        staff: toStaff(typedRow),
        restaurantName: '',
        staffName: typedRow.name,
      })
      return
    }

    const restaurant = toRestaurant(restaurantRow)
    const staff = toStaff(typedRow)
    set({
      isAuthenticated: true,
      isLoading: false,
      needsOnboarding: false,
      userId: session.user.id,
      restaurant,
      staff,
      restaurantName: restaurant.name,
      staffName: staff.name,
    })
  },

  login: async (email, password) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { success: false, error: error.message }
    }

    // Avoid blocking login navigation on an extra auth bootstrap round-trip.
    void get().initialize()
    return { success: true }
  },

  signup: async (email, password, name) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    await get().initialize()
    return { success: true }
  },

  logout: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({
      isAuthenticated: false,
      isLoading: false,
      needsOnboarding: false,
      userId: null,
      restaurant: null,
      staff: null,
      restaurantName: '',
      staffName: '',
    })
  },

  createRestaurant: async (input) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'You must be signed in.' }
    }

    const slug = sanitizeSlug(input.slug || input.name)
    if (!slug) {
      return { success: false, error: 'A valid restaurant slug is required.' }
    }

    const restaurantId =
      typeof window.crypto.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.floor(Math.random() * 16)
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })

    const { error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        id: restaurantId,
        name: input.name,
        slug,
        cuisine_type: input.cuisineType ?? null,
        address: input.address ?? null,
        timezone: input.timezone ?? 'America/New_York',
        is_active: false,
        subscription_tier: 'starter',
      })

    if (restaurantError) {
      return { success: false, error: restaurantError.message }
    }

    const staffName = typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name.trim()
      : input.name

    const { error: staffError } = await supabase.from('staff').insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      name: staffName,
      email: user.email ?? '',
      role: 'owner',
    })

    if (staffError) {
      return { success: false, error: staffError.message }
    }

    await get().initialize()
    return { success: true }
  },
}))
