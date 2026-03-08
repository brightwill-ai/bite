'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import type { MenuItem, ModifierGroup } from '@bite/types'
import { cn } from '@/lib/utils'

interface MenuItemCardProps {
  item: MenuItem
  hasModifiers: boolean
  onAdd: (item: MenuItem) => void
  onOpenDetail: (item: MenuItem) => void
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

export default function MenuItemCard({ item, hasModifiers, onAdd, onOpenDetail }: MenuItemCardProps) {
  const [addScale, setAddScale] = useState(false)

  const handleAdd = () => {
    if (!item.is_available) return
    if (hasModifiers) {
      onOpenDetail(item)
    } else {
      setAddScale(true)
      onAdd(item)
      setTimeout(() => setAddScale(false), 200)
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3 py-3 border-b border-border bg-bg',
        !item.is_available && 'opacity-50'
      )}
    >
      <button
        onClick={() => item.is_available && hasModifiers && onOpenDetail(item)}
        className="w-[84px] h-[84px] rounded-[8px] bg-surface flex items-center justify-center flex-shrink-0 text-[40px]"
      >
        {item.emoji || '🍽️'}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-between h-[84px]">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.is_popular && (
              <span className="text-[10px] font-semibold text-popular bg-popular/10 px-1.5 py-0.5 rounded-full">
                Popular
              </span>
            )}
            {item.is_new && (
              <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                New
              </span>
            )}
          </div>

          <h3 className="text-[14px] font-semibold text-ink leading-tight truncate">
            {item.name}
          </h3>

          <p className="text-[12px] text-muted leading-snug line-clamp-2 mt-0.5">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="font-display text-[15px] font-bold text-ink">
            {formatPrice(item.price)}
          </span>
        </div>
      </div>

      {item.is_available && (
        <div className="flex-shrink-0 flex items-end h-[84px] pb-0">
          <motion.button
            onClick={handleAdd}
            animate={addScale ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.2 }}
            className="w-[30px] h-[30px] rounded-full bg-ink text-surface flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </div>
  )
}

export { formatPrice }
