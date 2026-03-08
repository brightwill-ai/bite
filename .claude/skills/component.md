# Skill: Building Components in Bite

Read this before creating any new React component.

---

## Decision: Where Does This Component Live?

Ask: "Will this component be used in more than one app?"

- **Yes** → `packages/ui/ComponentName.tsx`, export from `packages/ui/index.ts`
- **Only in menu app** → `apps/menu/components/ComponentName.tsx`
- **Only in admin** → `apps/admin/components/ComponentName.tsx`
- **Only on landing** → `apps/web/components/ComponentName.tsx`

---

## Component Template

Every component in this repo follows this exact structure:

```tsx
// apps/[app]/components/ExampleCard.tsx

import { cn } from '@/lib/utils'
import type { MenuItem } from '@bite/types'

// 1. Props interface — always explicit, never inlined
interface ExampleCardProps {
  item: MenuItem
  onAdd: (id: string) => void
  className?: string        // always accept className for composability
}

// 2. Named export — not default (except pages)
export function ExampleCard({ item, onAdd, className }: ExampleCardProps) {
  return (
    <div className={cn(
      'bg-surface2 border border-border rounded p-4',  // design tokens only
      className
    )}>
      <span className="font-display text-ink">{item.name}</span>
    </div>
  )
}
```

### Rules
- Named exports everywhere except `page.tsx` and `layout.tsx` (Next.js requires default)
- Props interface defined above the component, never inline
- `className` prop accepted on every component for composability
- Use `cn()` from `@/lib/utils` for conditional classes — never string concatenation

---

## Design Token Usage

Never hardcode values. Always use Tailwind tokens from the config:

```tsx
// ✅ Correct
<div className="bg-surface2 border border-border text-ink rounded px-4 py-3">

// ❌ Wrong — hardcoded
<div style={{ background: '#FFFFFF', border: '1px solid #E0DDD9' }}>

// ❌ Wrong — Tailwind arbitrary values when a token exists
<div className="bg-[#FFFFFF] border-[#E0DDD9]">
```

### Common Patterns

```tsx
// Primary CTA button
<button className="bg-ink text-surface font-sans font-semibold px-4 py-3 rounded-full">

// Secondary / ghost button  
<button className="border border-border text-ink bg-transparent font-sans font-semibold px-4 py-3 rounded-full">

// Card
<div className="bg-surface2 border border-border rounded p-4 shadow-sm">

// Badge — Popular
<span className="bg-[#FAE8DF] text-popular text-[10px] font-semibold px-2 py-0.5 rounded-full">

// Badge — New
<span className="bg-[#E3EFE8] text-success text-[10px] font-semibold px-2 py-0.5 rounded-full">

// Price display
<span className="font-display font-bold text-ink">$24.00</span>

// Section label / page title
<h1 className="font-display font-bold text-ink tracking-tight">

// Body text
<p className="font-sans text-muted text-sm leading-relaxed">

// Ticket / order number
<span className="font-mono font-semibold text-ink">#042</span>
```

---

## Bottom Sheet Pattern

Used for ItemDetailSheet and CartSheet in `apps/menu`. Use this exact pattern:

```tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-surface2 rounded-t-xl z-50 max-h-[88vh] flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Drag handle */}
            <div className="w-9 h-1 bg-border rounded-full mx-auto mt-2.5 mb-0 flex-shrink-0" />
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

---

## Right-Side Drawer Pattern

Used in admin for item editor, order detail panels:

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        className="fixed inset-0 bg-black/30 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface2 border-l border-border z-50 flex flex-col shadow-xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

## Skeleton Loading Pattern

Show a 500ms skeleton on mount before displaying mock data. Makes the app feel like it's fetching:

```tsx
'use client'
import { useState, useEffect } from 'react'

export function SomeComponent() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(t)
  }, [])

  if (loading) return <SomeComponentSkeleton />
  return <SomeComponentContent />
}

function SomeComponentSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-4 bg-border rounded w-3/4" />
      <div className="h-4 bg-border rounded w-1/2" />
      <div className="h-4 bg-border rounded w-5/6" />
    </div>
  )
}
```

---

## Empty State Pattern

Every list needs an empty state:

```tsx
function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-sans font-semibold text-ink mb-2">{title}</h3>
      <p className="font-sans text-muted text-sm mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  )
}

// Usage
<EmptyState
  icon="🍽️"
  title="No menu items yet"
  description="Upload a menu PDF or add items manually to get started."
  action={<button className="bg-ink text-surface ...">Add Your First Item</button>}
/>
```

---

## Accessibility Checklist

Before finishing any component:
- [ ] All `<button>` elements have descriptive `aria-label` if text isn't self-describing
- [ ] All interactive elements reachable via keyboard (`Tab`)
- [ ] Modals/sheets trap focus and close on `Escape`
- [ ] Color is not the only indicator of state (badges have text too)
- [ ] Images have `alt` text (or `alt=""` if decorative)
