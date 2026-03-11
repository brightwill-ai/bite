import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AuthBootstrap } from '@/components/AuthBootstrap'
import { DashboardShell } from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: staffRow, error: staffError } = await supabase
    .from('staff')
    .select('id, restaurant:restaurants(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (staffError && staffError.code !== 'PGRST116') {
    redirect('/login')
  }

  const restaurantName = staffRow?.restaurant?.name
  if (!restaurantName) {
    redirect('/onboarding')
  }

  return (
    <>
      <AuthBootstrap />
      <DashboardShell restaurantName={restaurantName}>{children}</DashboardShell>
    </>
  )
}
