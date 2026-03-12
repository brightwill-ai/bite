'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Upload, Pencil, X, Loader2, ImageIcon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { ModifierGroupEditor } from '@/components/ModifierGroupEditor'
import type { TempModifierGroup, TempModifier } from '@/store/menu'
import { useMenuStore } from '@/store/menu'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'
import type { MenuItem, MenuCategory, ModifierGroup, Modifier } from '@bite/types'

// Convert real DB modifier groups/modifiers to the TempModifierGroup/TempModifier
// shape used by ModifierGroupEditor, treating the real DB id as the tempId.
function toEditableGroups(groups: ModifierGroup[]): TempModifierGroup[] {
  return groups.map((g) => ({ ...g, tempId: g.id }))
}

function toEditableModifiers(modifiers: Modifier[], groupId: string): TempModifier[] {
  return modifiers.map((m) => ({ ...m, tempId: m.id, groupTempId: groupId }))
}

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
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)
  const {
    modifierGroups,
    modifiers,
    addModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
    addModifier,
    updateModifier,
    deleteModifier,
  } = useMenuStore((state) => ({
    modifierGroups: state.modifierGroups,
    modifiers: state.modifiers,
    addModifierGroup: state.addModifierGroup,
    updateModifierGroup: state.updateModifierGroup,
    deleteModifierGroup: state.deleteModifierGroup,
    addModifier: state.addModifier,
    updateModifier: state.updateModifier,
    deleteModifier: state.deleteModifier,
  }))

  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description ?? '')
  const [price, setPrice] = useState(String(item.price))
  const [emoji, setEmoji] = useState(item.emoji ?? '')
  const [imageUrl, setImageUrl] = useState(item.image_url ?? '')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build the editable groups for this item using real DB IDs as tempIds
  const rawGroups = modifierGroups[item.id] ?? []
  const editableGroups = toEditableGroups(rawGroups)

  const editableModifiersByGroup: Record<string, TempModifier[]> = {}
  for (const group of rawGroups) {
    editableModifiersByGroup[group.id] = toEditableModifiers(
      modifiers[group.id] ?? [],
      group.id
    )
  }

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !restaurantId) return
    setImageUploading(true)
    setImageError('')
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${restaurantId}/${item.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('menu-item-images')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage
        .from('menu-item-images')
        .getPublicUrl(path)
      setImageUrl(urlData.publicUrl)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setImageUploading(false)
    }
  }

  // ── Modifier adapters (real DB calls via store) ────────────────────────────

  const handleAddGroup = async () => {
    await addModifierGroup({
      item_id: item.id,
      name: 'New group',
      selection_type: 'single',
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      display_order: rawGroups.length + 1,
    })
  }

  // tempId === real DB id for the menu drawer
  const handleUpdateGroup = async (tempId: string, updates: Partial<TempModifierGroup>) => {
    await updateModifierGroup(tempId, updates as Partial<ModifierGroup>)
  }

  const handleDeleteGroup = async (tempId: string) => {
    await deleteModifierGroup(tempId)
  }

  const handleAddModifier = async (groupTempId: string) => {
    await addModifier({
      group_id: groupTempId,
      name: 'New option',
      price_delta: 0,
      is_available: true,
      display_order: (modifiers[groupTempId] ?? []).length + 1,
    })
  }

  const handleUpdateModifier = async (tempId: string, updates: Partial<TempModifier>) => {
    await updateModifier(tempId, updates as Partial<Modifier>)
  }

  const handleDeleteModifier = async (tempId: string) => {
    await deleteModifier(tempId)
  }

  // ── Save basic fields ──────────────────────────────────────────────────────

  const handleSave = () => {
    onSave(item.id, {
      name,
      description,
      price: parseFloat(price) || 0,
      emoji,
      image_url: imageUrl || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 w-[520px] h-screen bg-surface2 border-l border-border z-50 flex flex-col shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <h2 className="font-display font-bold text-lg text-ink">Edit Item</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-bg rounded-sm transition-colors"
          aria-label="Close"
        >
          <X size={18} className="text-muted" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Photo */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Photo</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full h-32 bg-surface border border-border rounded overflow-hidden hover:border-ink transition-colors flex items-center justify-center group"
          >
            {imageUrl ? (
              <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex flex-col items-center gap-2 text-faint group-hover:text-muted transition-colors">
                <ImageIcon size={24} />
                <span className="text-xs">Upload photo</span>
              </div>
            )}
            {imageUploading && (
              <div className="absolute inset-0 bg-surface2/80 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-muted" />
              </div>
            )}
            {imageUrl && (
              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
                <span className="text-surface text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Change photo
                </span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
          {imageError && <p className="text-xs text-error mt-1">{imageError}</p>}
        </div>

        {/* Emoji + Name */}
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Emoji</label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-2 py-2 bg-surface border border-border rounded-sm text-center text-lg focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Modifier groups — live saved to DB */}
        <ModifierGroupEditor
          groups={editableGroups}
          modifiersByGroup={editableModifiersByGroup}
          onAddGroup={handleAddGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onAddModifier={handleAddModifier}
          onUpdateModifier={handleUpdateModifier}
          onDeleteModifier={handleDeleteModifier}
        />
      </div>

      {/* Footer — saves basic fields only; modifiers already live-saved */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <p className="text-xs text-faint mb-3">Modifier groups save automatically. Click below to save name, price, and photo.</p>
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
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)
  const {
    isLoading,
    categories,
    items,
    loadMenu,
    toggleAvailability,
    updateItem,
    addItem,
  } = useMenuStore((state) => ({
    isLoading: state.isLoading,
    categories: state.categories,
    items: state.items,
    loadMenu: state.loadMenu,
    toggleAvailability: state.toggleAvailability,
    updateItem: state.updateItem,
    addItem: state.addItem,
  }))
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemCategoryId, setNewItemCategoryId] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  useEffect(() => {
    if (!restaurantId) {
      return
    }
    void loadMenu(restaurantId)
  }, [restaurantId, loadMenu])

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice || !newItemCategoryId || !restaurantId) return
    void addItem({
      restaurant_id: restaurantId,
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

      {isLoading && (
        <div className="bg-surface2 border border-border rounded p-5 text-sm text-muted">
          Loading menu...
        </div>
      )}

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
        {!isLoading && categories.length === 0 && (
          <div className="bg-surface2 border border-border rounded p-6 text-sm text-muted">
            No menu categories yet. Upload a PDF or add your first item.
          </div>
        )}
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
