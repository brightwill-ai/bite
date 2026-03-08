'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface FloatingCartBarProps {
  count: number
  total: number
  onOpen: () => void
  bounceKey: number
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

const springConfig = { type: 'spring' as const, stiffness: 300, damping: 30 }

export default function FloatingCartBar({
  count,
  total,
  onOpen,
  bounceKey,
}: FloatingCartBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          exit={{ y: 80 }}
          transition={springConfig}
        >
          <motion.button
            key={bounceKey}
            onClick={onOpen}
            className="w-full max-w-[398px] mx-4 mb-4 bg-ink text-surface rounded-[14px] px-4 py-3.5 flex items-center justify-between pointer-events-auto"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-surface text-ink text-[13px] font-bold flex items-center justify-center">
                {count}
              </div>
              <span className="text-[15px] font-medium">View Order</span>
            </div>
            <span className="font-display text-[17px] font-bold">
              {formatPrice(total)}
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
