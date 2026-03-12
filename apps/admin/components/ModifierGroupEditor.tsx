'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import type { TempModifierGroup, TempModifier } from '@/store/menu'

// Re-export for convenience
export type { TempModifierGroup, TempModifier }

interface ModifierRowProps {
  modifier: TempModifier
  onUpdate: (tempId: string, updates: Partial<TempModifier>) => void
  onDelete: (tempId: string) => void
}

function ModifierRow({ modifier, onUpdate, onDelete }: ModifierRowProps) {
  const [name, setName] = useState(modifier.name)
  const [emoji, setEmoji] = useState(modifier.emoji ?? '')
  const [priceDelta, setPriceDelta] = useState(String(modifier.price_delta))

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        onBlur={() => onUpdate(modifier.tempId, { emoji: emoji || undefined })}
        placeholder="🍔"
        className="w-10 px-1 py-1.5 bg-bg border border-border rounded-sm text-center text-sm focus:outline-none focus:border-ink transition-colors"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onUpdate(modifier.tempId, { name })}
        placeholder="Option name"
        className="flex-1 px-2.5 py-1.5 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
      />
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-xs text-muted pointer-events-none">+$</span>
        <input
          type="number"
          step="0.01"
          value={priceDelta}
          onChange={(e) => setPriceDelta(e.target.value)}
          onBlur={() => onUpdate(modifier.tempId, { price_delta: parseFloat(priceDelta) || 0 })}
          className="w-20 pl-7 pr-2 py-1.5 bg-bg border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
        />
      </div>
      <button
        onClick={() => onDelete(modifier.tempId)}
        className="p-1 hover:text-error transition-colors text-faint shrink-0"
        aria-label="Remove option"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface GroupSectionProps {
  group: TempModifierGroup
  modifiers: TempModifier[]
  onUpdateGroup: (tempId: string, updates: Partial<TempModifierGroup>) => void
  onDeleteGroup: (tempId: string) => void
  onAddModifier: (groupTempId: string) => void
  onUpdateModifier: (tempId: string, updates: Partial<TempModifier>) => void
  onDeleteModifier: (tempId: string) => void
}

function GroupSection({
  group,
  modifiers,
  onUpdateGroup,
  onDeleteGroup,
  onAddModifier,
  onUpdateModifier,
  onDeleteModifier,
}: GroupSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [name, setName] = useState(group.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="border border-border rounded-sm overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-muted hover:text-ink transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => onUpdateGroup(group.tempId, { name })}
          placeholder="Group name"
          className="flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none min-w-0"
        />

        <div className="flex items-center gap-2 shrink-0">
          {/* Single / Multiple */}
          <select
            value={group.selection_type}
            onChange={(e) =>
              onUpdateGroup(group.tempId, {
                selection_type: e.target.value as 'single' | 'multiple',
                max_selections: e.target.value === 'single' ? 1 : 10,
              })
            }
            className="text-xs bg-bg border border-border rounded-sm px-1.5 py-0.5 focus:outline-none"
          >
            <option value="single">Pick one</option>
            <option value="multiple">Pick many</option>
          </select>

          {/* Required toggle */}
          <button
            type="button"
            onClick={() => onUpdateGroup(group.tempId, { is_required: !group.is_required })}
            className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
              group.is_required
                ? 'bg-ink text-surface border-ink'
                : 'bg-transparent border-border text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {group.is_required ? 'Required' : 'Optional'}
          </button>

          {/* Delete */}
          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteGroup(group.tempId)}
                className="text-xs text-error hover:opacity-80 font-medium"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-muted hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-0.5 text-faint hover:text-error transition-colors"
              aria-label="Delete group"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Modifiers */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pt-1 border-t border-border space-y-0.5">
              {modifiers.map((mod) => (
                <ModifierRow
                  key={mod.tempId}
                  modifier={mod}
                  onUpdate={onUpdateModifier}
                  onDelete={onDeleteModifier}
                />
              ))}
              <button
                type="button"
                onClick={() => onAddModifier(group.tempId)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mt-1 py-1"
              >
                <Plus size={12} />
                Add option
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export interface ModifierGroupEditorProps {
  groups: TempModifierGroup[]
  modifiersByGroup: Record<string, TempModifier[]>
  onAddGroup: () => void
  onUpdateGroup: (tempId: string, updates: Partial<TempModifierGroup>) => void
  onDeleteGroup: (tempId: string) => void
  onAddModifier: (groupTempId: string) => void
  onUpdateModifier: (tempId: string, updates: Partial<TempModifier>) => void
  onDeleteModifier: (tempId: string) => void
}

export function ModifierGroupEditor({
  groups,
  modifiersByGroup,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddModifier,
  onUpdateModifier,
  onDeleteModifier,
}: ModifierGroupEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">Modifier Groups</span>
        <button
          type="button"
          onClick={onAddGroup}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
        >
          <Plus size={12} />
          Add group
        </button>
      </div>

      <div className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-xs text-faint py-2">
            No modifier groups yet. Add one to let customers customize this item (e.g. "Choose your cheese", "Add-ons").
          </p>
        ) : (
          groups.map((group) => (
            <GroupSection
              key={group.tempId}
              group={group}
              modifiers={modifiersByGroup[group.tempId] ?? []}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
              onAddModifier={onAddModifier}
              onUpdateModifier={onUpdateModifier}
              onDeleteModifier={onDeleteModifier}
            />
          ))
        )}
      </div>
    </div>
  )
}
