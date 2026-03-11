'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    initialize,
    isAuthenticated,
    isLoading,
    needsOnboarding,
    restaurantName,
  } = useAuthStore((state) => ({
    initialize: state.initialize,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    needsOnboarding: state.needsOnboarding,
    restaurantName: state.restaurantName,
  }))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }
    void initialize()
  }, [hydrated, initialize])

  useEffect(() => {
    if (!hydrated || isLoading) {
      return
    }

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (needsOnboarding) {
      router.push('/onboarding')
    }
  }, [hydrated, isAuthenticated, isLoading, needsOnboarding, router])

  if (!hydrated || isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-muted text-sm">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || needsOnboarding) {
    return null
  }

  // Derive breadcrumb from pathname
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumb = segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ')

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-surface2 border-b border-border flex items-center justify-between px-6 shrink-0">
          <span className="text-sm text-muted">{breadcrumb}</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-ink">{restaurantName}</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
