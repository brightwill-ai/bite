'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

interface DashboardShellProps {
  children: ReactNode
  restaurantName: string
}

export function DashboardShell({ children, restaurantName }: DashboardShellProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumb = segments.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' / ')

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar restaurantName={restaurantName} />
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-surface2 border-b border-border flex items-center justify-between px-6 shrink-0">
          <span className="text-sm text-muted">{breadcrumb}</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-ink">{restaurantName}</span>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
