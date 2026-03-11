import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, Staff } from '@bite/types'

interface AuthStore {
  isAuthenticated: boolean
  isLoading: boolean
  restaurant: Restaurant | null
  staff: Staff | null
  userId: string | null
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  restaurant: null,
  staff: null,
  userId: null,

  initialize: async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }

    const { data: staffRow } = await supabase
      .from('staff')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    if (staffRow) {
      set({
        isAuthenticated: true,
        isLoading: false,
        userId: session.user.id,
        staff: {
          id: staffRow.id,
          user_id: staffRow.user_id,
          restaurant_id: staffRow.restaurant_id,
          name: staffRow.name,
          email: staffRow.email,
          role: staffRow.role,
        },
        restaurant: staffRow.restaurant as Restaurant,
      })
    } else {
      // User exists but no staff row — needs onboarding
      set({
        isAuthenticated: true,
        isLoading: false,
        userId: session.user.id,
        staff: null,
        restaurant: null,
      })
    }
  },

  login: async (email, password) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { success: false, error: error.message }
    }

    await get().initialize()
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

    // Auto sign-in after signup
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      set({
        isAuthenticated: true,
        isLoading: false,
        userId: session.user.id,
        staff: null,
        restaurant: null,
      })
    }

    return { success: true }
  },

  logout: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({
      isAuthenticated: false,
      isLoading: false,
      restaurant: null,
      staff: null,
      userId: null,
    })
  },
}))
