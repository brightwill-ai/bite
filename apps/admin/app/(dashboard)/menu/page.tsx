'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Upload, Pencil, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useMenuStore } from '@/store/menu'
import type { MenuItem, MenuCategory } from '@bite/types'

function AvailabilityToggle({ available, onToggle }: { available: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`relative w-10 h-5 rounded-full transition-colors ${
        available ? 'bg-success' : 'bg-border'
      }`}
      aria-label="Toggle availability"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface2 rounded-full transition-transform shadow-sm ${
          available ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function ItemEditDrawer({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem
  onClose: () => void
  onSave: (id: string, updates: Partial<MenuItem>) => void
}) {
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? '')
  const [price, setPrice] = useState(String(item.price))
  const [emoji, setEmoji] = useState(item.emoji ?? '')

  const handleSave = () => {
    onSave(item.id, {
      name,
      description,
      price: parseFloat(price) || 0,
      emoji,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 w-[420px] h-screen bg-surface2 border-l border-border z-50 flex flex-col shadow-xl"
    >
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="font-display font-bold text-lg">Edit Item</h2>
        <button onClick={onClose} className="p-1 hover:bg-bg rounded-sm transition-colors" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Emoji</label>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            className="w-16 px-3 py-2 bg-surface border border-border rounded-sm text-center text-lg focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink resize-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
          />
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <button
          onClick={handleSave}
          className="w-full bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  )
}

function CategoryAccordion({
  category,
  items,
  onToggleAvailability,
  onEditItem,
}: {
  category: MenuCategory
  items: MenuItem[]
  onToggleAvailability: (id: string) => void
  onEditItem: (item: MenuItem) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-surface2 border border-border rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-ink">{category.name}</span>
          <span className="text-xs text-faint bg-bg px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base shrink-0">{item.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${!item.is_available ? 'text-faint line-through' : 'text-ink'}`}>
                          {item.name}
                        </span>
                        {item.is_popular && (
                          <span className="text-[10px] font-semibold text-popular bg-popular/10 px-1.5 py-0.5 rounded-full">
                            POPULAR
                          </span>
                        )}
                        {item.is_new && (
                          <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted truncate max-w-[300px]">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="font-display text-sm font-bold text-ink">
                      ${item.price.toFixed(2)}
                    </span>
                    <AvailabilityToggle
                      available={item.is_available}
                      onToggle={() => onToggleAvailability(item.id)}
                    />
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-1.5 hover:bg-bg rounded-sm transition-colors"
                      aria-label="Edit item"
                    >
                      <Pencil size={14} className="text-muted" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MenuPage() {
  const router = useRouter()
  const { categories, items, toggleAvailability, updateItem, addItem, addCategory } = useMenuStore()
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemCategoryId, setNewItemCategoryId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice || !newItemCategoryId) return
    addItem({
      restaurant_id: 'rest-001',
      category_id: newItemCategoryId,
      name: newItemName,
      description: '',
      price: parseFloat(newItemPrice) || 0,
      emoji: '🍽️',
      is_available: true,
      is_popular: false,
      is_new: true,
      display_order: items.filter(i => i.category_id === newItemCategoryId).length + 1,
    })
    setShowAddItem(false)
    setNewItemName('')
    setNewItemPrice('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu"
        description="Manage your restaurant menu"
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/menu/upload')}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-full text-sm font-medium text-ink hover:bg-surface2 transition-colors"
            >
              <Upload size={14} />
              Upload PDF
            </button>
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Add Item
            </button>
          </div>
        }
      />

      <AnimatePresence>
        {showAddItem && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface2 border border-border rounded p-5 space-y-3 overflow-hidden"
          >
            <h3 className="font-medium text-sm text-ink">Add New Item</h3>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={newItemCategoryId}
                onChange={(e) => setNewItemCategoryId(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name"
                className="px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none"
              />
              <input
                type="number"
                step="0.01"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="Price"
                className="px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddItem(false)}
                className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.category_id === category.id)
          return (
            <CategoryAccordion
              key={category.id}
              category={category}
              items={categoryItems}
              onToggleAvailability={toggleAvailability}
              onEditItem={setEditingItem}
            />
          )
        })}
      </div>

      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-ink z-40"
            />
            <ItemEditDrawer
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onSave={updateItem}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
