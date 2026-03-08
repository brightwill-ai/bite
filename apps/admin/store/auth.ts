import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const DEMO_EMAIL = 'admin@bite.so'
const DEMO_PASSWORD = 'demo1234'

interface AuthStore {
  isAuthenticated: boolean
  restaurantName: string
  staffName: string
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      restaurantName: 'The Oakwood',
      staffName: 'Marco',

      login: (email, password) => {
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
          set({ isAuthenticated: true })
          return { success: true }
        }
        return { success: false, error: 'Invalid email or password' }
      },

      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'bite-auth-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
