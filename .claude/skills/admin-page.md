# Skill: Building Admin Pages

Read this before creating any new page in `apps/admin`.

---

## How Admin Routing Works

Admin uses Next.js App Router with two route groups:

```
app/
├── (auth)/           — Unauthenticated routes (no shell)
│   └── login/
│       └── page.tsx
└── (dashboard)/      — Authenticated routes (get the sidebar shell)
    ├── layout.tsx    ← Shell lives here
    ├── dashboard/
    ├── menu/
    ├── tables/
    ├── orders/
    └── settings/
```

Any page inside `(dashboard)/` automatically gets the sidebar + topbar from `(dashboard)/layout.tsx`. You never need to import the shell — it wraps your page automatically.

---

## Creating a New Admin Page — Checklist

1. Create `apps/admin/app/(dashboard)/[page-name]/page.tsx`
2. Add nav item to `apps/admin/components/Sidebar.tsx`
3. Follow the page template below
4. Add mock data to the page or pull from the relevant store
5. Add loading skeleton (500ms delay)
6. Add empty state

---

## Page Template

```tsx
// apps/admin/app/(dashboard)/[page-name]/page.tsx
'use client'  // only add if needed — prefer server component

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { SomeSkeleton } from '@/components/[page-name]/SomeSkeleton'

export default function PageNamePage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header — title + primary action */}
      <PageHeader
        title="Page Name"
        description="Optional subtitle explaining this section"
        action={
          <button className="bg-ink text-surface font-sans font-semibold text-sm px-4 py-2 rounded-full">
            Primary Action
          </button>
        }
      />

      {loading ? <SomeSkeleton /> : <PageContent />}
    </div>
  )
}
```

---

## PageHeader Component

Create this once in `apps/admin/components/PageHeader.tsx` and use everywhere:

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-display font-bold text-ink text-2xl tracking-tight">{title}</h1>
        {description && (
          <p className="font-sans text-muted text-sm mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
```

---

## StatCard Component

Used on dashboard. Create in `apps/admin/components/StatCard.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  trend?: { value: string; positive: boolean }
  icon?: string
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <div className="bg-surface2 border border-border rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans text-[11px] font-semibold text-faint uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="font-display font-bold text-ink text-3xl tracking-tight mb-1">
        {value}
      </div>
      {trend && (
        <div className={cn(
          'font-sans text-xs font-medium',
          trend.positive ? 'text-success' : 'text-error'
        )}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  )
}
```

---

## Data Table Pattern

For Orders and other list pages:

```tsx
// Filter tabs
<div className="flex gap-1 border-b border-border mb-4">
  {['All', 'Pending', 'Preparing', 'Ready', 'Delivered'].map(tab => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cn(
        'font-sans text-sm px-3 py-2 rounded-t transition-colors',
        activeTab === tab
          ? 'bg-ink text-surface font-semibold'
          : 'text-muted hover:text-ink'
      )}
    >
      {tab}
    </button>
  ))}
</div>

// Table
<div className="bg-surface2 border border-border rounded overflow-hidden">
  <table className="w-full">
    <thead className="border-b border-border bg-surface">
      <tr>
        {columns.map(col => (
          <th key={col} className="font-sans text-[11px] font-semibold text-faint uppercase tracking-wider text-left px-4 py-3">
            {col}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr
          key={row.id}
          className="border-b border-border last:border-0 hover:bg-surface cursor-pointer transition-colors"
          onClick={() => setSelectedRow(row)}
        >
          {/* cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Status Badge Pattern

Used for order statuses throughout admin:

```tsx
const STATUS_STYLES = {
  pending:    'bg-surface border border-border text-muted',
  confirmed:  'bg-surface border border-border text-ink',
  preparing:  'bg-[#FEF3C7] text-[#92400E]',
  ready:      'bg-[#D1FAE5] text-[#065F46]',
  delivered:  'bg-surface border border-border text-faint line-through',
} as const

type OrderStatus = keyof typeof STATUS_STYLES

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn(
      'font-sans text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize',
      STATUS_STYLES[status]
    )}>
      {status}
    </span>
  )
}
```

---

## Right Drawer Pattern

For item editor, order detail, etc. — see `skills/component.md` for the motion wrapper. Page-level state manages which row is selected:

```tsx
// In page component
const [selectedId, setSelectedId] = useState<string | null>(null)
const selectedItem = items.find(i => i.id === selectedId)

// Render drawer alongside main content (not inside table)
<AnimatePresence>
  {selectedItem && (
    <ItemEditDrawer
      item={selectedItem}
      onClose={() => setSelectedId(null)}
      onSave={(updates) => {
        menuStore.updateItem(selectedItem.id, updates)
        setSelectedId(null)
        toast.success('Item saved')
      }}
    />
  )}
</AnimatePresence>
```

---

## Modal / Dialog Pattern

For confirmation dialogs, "add tables", "invite staff" etc.:

```tsx
// Simple modal — use this rather than installing a library
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-surface2 rounded-xl w-full max-w-md shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-display font-bold text-ink text-lg">{title}</h2>
              </div>
              <div className="px-6 py-5">{children}</div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

---

## Form Input Pattern

Consistent input styling across all admin forms:

```tsx
// Text input
<div className="space-y-1.5">
  <label className="font-sans text-sm font-medium text-ink">{label}</label>
  <input
    type="text"
    className="w-full bg-surface border border-border rounded-[10px] px-3 py-2.5 font-sans text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink transition-colors"
    placeholder={placeholder}
    value={value}
    onChange={e => onChange(e.target.value)}
  />
  {error && <p className="font-sans text-xs text-error">{error}</p>}
</div>

// Textarea
<textarea className="w-full bg-surface border border-border rounded-[10px] px-3 py-2.5 font-sans text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink resize-none transition-colors" rows={3} />

// Toggle switch
<button
  role="switch"
  aria-checked={enabled}
  onClick={() => setEnabled(!enabled)}
  className={cn(
    'relative w-10 h-6 rounded-full transition-colors duration-200',
    enabled ? 'bg-ink' : 'bg-border'
  )}
>
  <div className={cn(
    'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
    enabled ? 'translate-x-5' : 'translate-x-1'
  )} />
</button>
```

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
