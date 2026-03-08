'use client'

import { Search } from 'lucide-react'

interface MenuHeaderProps {
  restaurantName: string
  tableId: string
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function MenuHeader({
  restaurantName,
  tableId,
  searchQuery,
  onSearchChange,
}: MenuHeaderProps) {
  return (
    <div className="sticky top-0 z-30 bg-bg border-b border-border">
      <div className="h-[56px] flex items-center justify-between px-4">
        <h1 className="font-display text-[18px] font-bold text-ink">
          {restaurantName}
        </h1>
        <div className="bg-ink text-surface text-[12px] font-medium px-3 py-1 rounded-full">
          Table {tableId}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface2 border border-border rounded-[10px] pl-9 pr-4 py-2.5 text-[14px] text-ink placeholder:text-faint outline-none focus:ring-1 focus:ring-ink/20 transition-shadow"
          />
        </div>
      </div>
    </div>
  )
}
