'use client'

import type { MenuCategory } from '@bite/types'
import { cn } from '@/lib/utils'

// Map category names to emoji for display
const categoryEmoji: Record<string, string> = {
  Starters: '🥗',
  Mains: '🍽️',
  Sides: '🥖',
  Drinks: '🥤',
  Desserts: '🍰',
  Pizza: '🍕',
  Pasta: '🍝',
}

interface CategorySidebarProps {
  categories: MenuCategory[]
  activeCategory: string
  onCategoryClick: (categoryId: string) => void
}

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryClick,
}: CategorySidebarProps) {
  return (
    <div className="w-[80px] bg-surface border-r border-border overflow-y-auto flex-shrink-0 scrollbar-hide">
      <div className="py-2">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryClick(cat.id)}
              aria-pressed={isActive}
              aria-label={cat.name}
              className={cn(
                'w-full py-3 px-1 flex flex-col items-center gap-1 text-center transition-colors relative',
                isActive
                  ? 'bg-bg text-ink font-semibold border-l-2 border-ink'
                  : 'text-muted border-l-2 border-transparent hover:bg-bg/50'
              )}
            >
              <span className="text-[20px] leading-none">
                {categoryEmoji[cat.name] || '🍽️'}
              </span>
              <span className="text-[11px] leading-tight font-sans">{cat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
