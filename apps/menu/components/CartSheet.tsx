'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Minus } from 'lucide-react'
import type { CartItem, SelectedModifier } from '@bite/types'
import { normalizeMenuEmoji } from '@/lib/emoji'
import { cn } from '@/lib/utils'

interface CartSheetProps {
  items: CartItem[]
  tableId: string
  subtotal: number
  specialInstructions: string
  onUpdateQuantity: (menuItemId: string, selectedModifiers: SelectedModifier[], quantity: number) => void
  onSetInstructions: (text: string) => void
  onPlaceOrder: () => void
  onClose: () => void
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

const springConfig = { type: 'spring' as const, stiffness: 300, damping: 30 }

export default function CartSheet({
  items,
  tableId,
  subtotal,
  specialInstructions,
  onUpdateQuantity,
  onSetInstructions,
  onPlaceOrder,
  onClose,
}: CartSheetProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Sheet */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-sheet-title"
        className="relative w-full max-w-[430px] max-h-[85vh] bg-surface2 rounded-t-[20px] overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springConfig}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 150) onClose()
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-3">
            <h2 id="cart-sheet-title" className="font-display text-[20px] font-bold text-ink">Your Order</h2>
            <div className="bg-ink text-surface text-[11px] font-medium px-2.5 py-0.5 rounded-full">
              Table {tableId}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-bg flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ink" />
          </button>
        </div>

        {/* Items */}
        <div className="overflow-y-auto flex-1 px-4">
          {items.map((item, idx) => {
            const modTotal = item.selectedModifiers.reduce((s, m) => s + m.price_delta, 0)
            const lineTotal = (item.price + modTotal) * item.quantity
            return (
              <div key={`${item.menuItemId}-${idx}`} className="py-3 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px]">{normalizeMenuEmoji(item.emoji) || '🍽️'}</span>
                      <h3 className="text-[14px] font-semibold text-ink truncate">
                        {item.name}
                      </h3>
                    </div>
                    {item.selectedModifiers.length > 0 && (
                      <p className="text-[12px] text-muted mt-0.5 ml-7">
                        {item.selectedModifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-display text-[14px] font-bold text-ink ml-2 flex-shrink-0">
                    {formatPrice(lineTotal)}
                  </span>
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center gap-2.5 mt-2 ml-7">
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.menuItemId, item.selectedModifiers, item.quantity - 1)
                    }
                    className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center"
                  >
                    <Minus className="w-3 h-3 text-ink" />
                  </button>
                  <span className="text-[14px] font-semibold text-ink w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(item.menuItemId, item.selectedModifiers, item.quantity + 1)
                    }
                    className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3 text-ink" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Special instructions */}
          <div className="py-4">
            <label className="text-[13px] font-medium text-ink block mb-1.5">
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => onSetInstructions(e.target.value)}
              placeholder="Allergies, preferences..."
              rows={2}
              className="w-full bg-surface border border-border rounded-[10px] px-3 py-2.5 text-[14px] text-ink placeholder:text-faint outline-none focus:ring-1 focus:ring-ink/20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border bg-surface2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] text-muted">Subtotal</span>
            <span className="font-display text-[18px] font-bold text-ink">
              {formatPrice(subtotal)}
            </span>
          </div>
          <button
            onClick={onPlaceOrder}
            disabled={items.length === 0}
            className={cn(
              'w-full py-3.5 rounded-[10px] text-[16px] font-semibold transition-opacity',
              items.length > 0
                ? 'bg-ink text-surface'
                : 'bg-ink/40 text-surface/60 cursor-not-allowed'
            )}
          >
            Place Order
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
