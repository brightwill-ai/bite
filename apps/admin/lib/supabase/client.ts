import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@bite/types/supabase'

const ADMIN_AUTH_COOKIE_NAME = 'sb-admin-auth-token'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: ADMIN_AUTH_COOKIE_NAME,
      },
    }
  )
}
