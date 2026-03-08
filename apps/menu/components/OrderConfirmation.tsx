'use client'

import { motion } from 'framer-motion'
import type { CartItem } from '@bite/types'

interface OrderConfirmationProps {
  ticketNumber: string
  items: CartItem[]
  total: number
  onOrderMore: () => void
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

export default function OrderConfirmation({
  ticketNumber,
  items,
  total,
  onOrderMore,
}: OrderConfirmationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-bg flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-[430px] px-6 flex flex-col items-center text-center">
        {/* Animated checkmark */}
        <motion.div
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            className="text-success"
          >
            <motion.path
              d="M10 20L17 27L30 13"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        <motion.h1
          className="font-display text-[28px] font-bold text-ink"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Order Sent!
        </motion.h1>

        <motion.p
          className="text-[14px] text-muted mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Your order is being prepared
        </motion.p>

        {/* Ticket number */}
        <motion.div
          className="mt-6 bg-surface2 border border-border rounded-[12px] px-6 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-[12px] text-muted uppercase tracking-wider">Ticket</p>
          <p className="font-mono text-[28px] font-semibold text-ink mt-0.5">
            #{ticketNumber}
          </p>
        </motion.div>

        {/* Summary card */}
        <motion.div
          className="mt-6 w-full bg-surface2 border border-border rounded-[12px] p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {items.map((item, idx) => (
            <div
              key={`${item.menuItemId}-${idx}`}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-[13px] text-ink">
                {item.quantity}x {item.name}
              </span>
              <span className="text-[13px] text-muted">
                {formatPrice(
                  (item.price +
                    item.selectedModifiers.reduce((s, m) => s + m.price_delta, 0)) *
                    item.quantity
                )}
              </span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink">Total</span>
            <span className="font-display text-[16px] font-bold text-ink">
              {formatPrice(total)}
            </span>
          </div>
        </motion.div>

        {/* Order more button */}
        <motion.button
          onClick={onOrderMore}
          className="mt-8 px-8 py-3 rounded-[10px] border-2 border-ink text-ink text-[15px] font-semibold hover:bg-ink hover:text-surface transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Order More Items
        </motion.button>
      </div>
    </motion.div>
  )
}
