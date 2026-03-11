# Skill: Animations in Bite

All animations use Framer Motion. Read this before adding any motion to the UI.

---

## Install & Setup

```bash
npm install framer-motion --workspace=apps/[app]
```

Always wrap animated lists/conditional renders in `AnimatePresence` at the nearest common parent:

```tsx
import { motion, AnimatePresence } from 'framer-motion'
```

---

## Spring Configs

Use these exact spring configs. Do not invent new ones.

```ts
// Standard panel (sheets, drawers) — snappy but not jarring
const SPRING_PANEL = { type: 'spring', stiffness: 300, damping: 30 } as const

// Cart bar / floating elements — slightly bouncier
const SPRING_FLOAT = { type: 'spring', stiffness: 400, damping: 35 } as const

// Confirmation / success screens — gentle
const SPRING_GENTLE = { type: 'spring', stiffness: 260, damping: 25 } as const

// Quick micro-interactions (button feedback)
const SPRING_SNAP = { type: 'spring', stiffness: 500, damping: 30 } as const
```

---

## Canonical Animation Patterns

### Bottom Sheet (menu app)
```tsx
// Sheet slides up from bottom
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={SPRING_PANEL}
/>

// Backdrop fades in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2 }}
/>
```

### Right Drawer (admin)
```tsx
<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={SPRING_PANEL}
/>
```

### Floating Cart Bar
```tsx
<motion.div
  initial={{ y: 80, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: 80, opacity: 0 }}
  transition={SPRING_FLOAT}
/>
```

### Cart Bar Bounce (when item added)
```tsx
// Change the `key` prop to trigger re-animation
const [addCount, setAddCount] = useState(0)
// On add: setAddCount(c => c + 1)

<motion.div
  key={addCount}
  animate={{ scale: [1, 1.04, 1] }}
  transition={{ duration: 0.2, times: [0, 0.5, 1] }}
/>
```

### Page/Section Entrance (admin dashboard)
```tsx
// Stagger children on mount
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06, duration: 0.3 }}
  />
))}
```

### Confirmation Screen
```tsx
// Full screen overlay
<motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={SPRING_GENTLE}
/>

// Checkmark circle pops in
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ ...SPRING_SNAP, delay: 0.1 }}
/>

// Checkmark SVG path draws
<motion.path
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
  strokeDasharray="1"
/>
```

### PDF Parser Progress (admin upload)
```tsx
// Progress bar
<motion.div
  className="h-1 bg-ink rounded-full"
  initial={{ width: '0%' }}
  animate={{ width: '100%' }}
  transition={{ duration: 3, ease: 'easeInOut' }}
/>

// Status lines appearing sequentially
{[
  { label: 'PDF extracted', delay: 0.5 },
  { label: '5 categories found', delay: 1.0 },
  { label: 'Parsing 17 items...', delay: 1.5 },
  { label: 'Modifiers detected', delay: 2.5 },
].map(({ label, delay }) => (
  <motion.div
    key={label}
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    ✓ {label}
  </motion.div>
))}
```

### Button Press Feedback
```tsx
<motion.button
  whileTap={{ scale: 0.96 }}
  transition={SPRING_SNAP}
>
  Add to Order
</motion.button>
```

### Add Button Pulse (item card)
```tsx
// Quick scale pulse when item added directly (no modifier sheet)
<motion.div
  animate={justAdded ? { scale: [1, 1.25, 1] } : {}}
  transition={{ duration: 0.2 }}
>
  <PlusCircle />
</motion.div>
```

---

## AnimatePresence Rules

1. **Always** wrap conditional renders `{condition && <Component />}` in `AnimatePresence`
2. Each child of `AnimatePresence` needs a unique `key`
3. `AnimatePresence` must be outside the conditional — the condition goes on the child

```tsx
// ✅ Correct
<AnimatePresence>
  {isOpen && <motion.div key="sheet" exit={{ y: '100%' }} />}
</AnimatePresence>

// ❌ Wrong — AnimatePresence can't detect mount/unmount
{isOpen && (
  <AnimatePresence>
    <motion.div exit={{ y: '100%' }} />
  </AnimatePresence>
)}
```

---

## Performance Rules

- Never animate `width` or `height` directly — use `scaleX`/`scaleY` or layout animations instead
- Don't animate more than 3 elements simultaneously
- Use `will-change: transform` sparingly — Framer Motion handles this
- For lists >20 items, skip entrance animations — just render directly
- All bottom sheets and drawers must use `transform` (y/x) not `top`/`left` for animation

---

## Accessibility

- Add `aria-hidden="true"` to backdrop overlays
- Sheet/drawer content should be wrapped in `role="dialog"` with `aria-modal="true"`
- Animated elements must still be keyboard navigable after animation completes
- Respect `prefers-reduced-motion`. Two approaches:

**Option 1 — Page-level (preferred for whole pages/layouts):** Wrap the entire page in `MotionConfig`. All child `motion.*` components automatically skip animations if the OS setting is enabled.
```tsx
import { MotionConfig } from 'framer-motion'

// Wrap the page root
<MotionConfig reducedMotion="user">
  {/* all motion components inside respect prefers-reduced-motion */}
</MotionConfig>
```

**Option 2 — Component-level:** Use the `useReducedMotion` hook for fine-grained control.
```tsx
import { useReducedMotion } from 'framer-motion'

function AnimatedSheet({ ... }) {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ y: shouldReduce ? 0 : '100%' }}
      animate={{ y: 0 }}
      transition={shouldReduce ? { duration: 0 } : SPRING_PANEL}
    />
  )
}
```

---

## After You're Done

**You must update documentation before the task is complete.** After making any changes related to this skill area, update:
1. **`CLAUDE.md`** — if the change affects structure, patterns, or conventions described there
2. **`README.md`** — if the change affects project structure, setup, or developer-facing info
3. **This skill file** — if the change introduces new patterns, changes existing ones, or makes any part of this file outdated

Documentation updates are part of the task, not a follow-up.
