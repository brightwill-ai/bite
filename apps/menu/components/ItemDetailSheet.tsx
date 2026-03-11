'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Minus, Check } from 'lucide-react'
import type { MenuItem, ModifierGroup, Modifier, SelectedModifier } from '@bite/types'
import { normalizeMenuEmoji } from '@/lib/emoji'
import { cn } from '@/lib/utils'

interface ItemDetailSheetProps {
  item: MenuItem
  modifierGroups: ModifierGroup[]
  modifiers: Record<string, Modifier[]>
  onClose: () => void
  onAddToCart: (
    item: MenuItem,
    selectedModifiers: SelectedModifier[],
    quantity: number
  ) => void
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

const springConfig = { type: 'spring' as const, stiffness: 300, damping: 30 }

export default function ItemDetailSheet({
  item,
  modifierGroups,
  modifiers,
  onClose,
  onAddToCart,
}: ItemDetailSheetProps) {
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [activeGroupTab, setActiveGroupTab] = useState(modifierGroups[0]?.id || '')
  const displayItemEmoji = normalizeMenuEmoji(item.emoji) ?? '🍽️'

  const handleSelectModifier = (group: ModifierGroup, modifierId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] || []
      if (group.selection_type === 'single') {
        return { ...prev, [group.id]: [modifierId] }
      }
      // multiple
      if (current.includes(modifierId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== modifierId) }
      }
      if (current.length >= group.max_selections) return prev
      return { ...prev, [group.id]: [...current, modifierId] }
    })
  }

  const isValid = useMemo(() => {
    return modifierGroups.every((group) => {
      if (!group.is_required) return true
      const sel = selected[group.id] || []
      return sel.length >= group.min_selections
    })
  }, [modifierGroups, selected])

  const calculatedPrice = useMemo(() => {
    let total = item.price
    Object.entries(selected).forEach(([groupId, modIds]) => {
      const groupMods = modifiers[groupId] || []
      modIds.forEach((modId) => {
        const mod = groupMods.find((m) => m.id === modId)
        if (mod) total += mod.price_delta
      })
    })
    return total * quantity
  }, [item.price, selected, quantity, modifiers])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAdd = () => {
    if (!isValid) return
    const selectedMods: SelectedModifier[] = []
    Object.entries(selected).forEach(([groupId, modIds]) => {
      const groupMods = modifiers[groupId] || []
      modIds.forEach((modId) => {
        const mod = groupMods.find((m) => m.id === modId)
        if (mod) {
          selectedMods.push({
            modifier_id: mod.id,
            name: mod.name,
            price_delta: mod.price_delta,
          })
        }
      })
    })
    onAddToCart(item, selectedMods, quantity)
    onClose()
  }

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
        aria-labelledby="item-detail-title"
        className="relative w-full max-w-[430px] max-h-[90vh] bg-surface2 rounded-t-[20px] overflow-hidden flex flex-col"
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

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg flex items-center justify-center z-10"
        >
          <X className="w-4 h-4 text-ink" />
        </button>

          {/* Content - scrollable */}
          <div className="overflow-y-auto flex-1 pb-4">
            {/* Emoji area */}
            <div className="h-[220px] bg-surface flex items-center justify-center text-[80px]">
              {displayItemEmoji}
            </div>

            {/* Item info */}
            <div className="px-4 pt-4">
              <h2 id="item-detail-title" className="font-display text-[22px] font-bold text-ink">{item.name}</h2>
              <p className="text-[14px] text-muted mt-1">{item.description}</p>
              <p className="font-display text-[20px] font-bold text-ink mt-2">
                {formatPrice(item.price)}
              </p>
            </div>

            {/* Modifier group tabs */}
            {modifierGroups.length > 0 && (
              <div className="px-4 mt-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {modifierGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setActiveGroupTab(group.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors',
                        activeGroupTab === group.id
                          ? 'bg-ink text-surface'
                          : 'bg-surface text-muted border border-border'
                      )}
                    >
                      {group.name}
                      {group.is_required && (
                        <span className="text-[10px] ml-1 opacity-60">*</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active group modifiers */}
            {modifierGroups.map((group) => {
              if (group.id !== activeGroupTab) return null
              const groupMods = (modifiers[group.id] || []).filter((m) => m.is_available)
              const selectedInGroup = selected[group.id] || []

              return (
                <div key={group.id} className="px-4 mt-3">
                  <p className="text-[12px] text-muted mb-2">
                    {group.is_required ? 'Required' : 'Optional'}
                    {group.selection_type === 'multiple' &&
                      ` · Up to ${group.max_selections}`}
                  </p>
                  <div className="space-y-2">
                    {groupMods.map((mod) => {
                      const isSelected = selectedInGroup.includes(mod.id)
                      return (
                        <button
                          key={mod.id}
                          onClick={() => handleSelectModifier(group, mod.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-[10px] border transition-colors',
                            isSelected
                              ? 'border-ink bg-bg'
                              : 'border-border bg-surface2 hover:bg-surface'
                          )}
                        >
                          <div className="w-[52px] h-[52px] rounded-[8px] bg-surface flex items-center justify-center text-[28px] flex-shrink-0">
                            {normalizeMenuEmoji(mod.emoji) || '🔘'}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-[14px] font-medium text-ink">{mod.name}</p>
                            {mod.price_delta > 0 && (
                              <p className="text-[12px] text-muted">
                                +{formatPrice(mod.price_delta)}
                              </p>
                            )}
                          </div>
                          <div
                            className={cn(
                              'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                              isSelected
                                ? 'bg-ink border-ink'
                                : 'border-border'
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-surface" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-surface2">
            <div className="flex items-center gap-4">
              {/* Quantity stepper */}
              <div className="flex items-center gap-3 bg-surface rounded-[10px] px-2 py-1.5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-full bg-bg flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5 text-ink" />
                </button>
                <span className="text-[16px] font-semibold text-ink w-5 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-7 h-7 rounded-full bg-bg flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5 text-ink" />
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={handleAdd}
                disabled={!isValid}
                className={cn(
                  'flex-1 py-3 rounded-[10px] text-[15px] font-semibold transition-opacity',
                  isValid
                    ? 'bg-ink text-surface'
                    : 'bg-ink/40 text-surface/60 cursor-not-allowed'
                )}
              >
                {isValid
                  ? `Add to Order · ${formatPrice(calculatedPrice)}`
                  : 'Select required options'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
  )
}
