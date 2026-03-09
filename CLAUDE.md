# CLAUDE.md — Bite Agent Instructions

This file is read automatically by Claude Code at the start of every session. It tells you everything you need to know about this codebase, how to work in it, and what the rules are. Read it fully before writing a single line of code.

---

## What Is Bite?

Bite is a QR code table-side ordering SaaS for restaurants. Customers scan a QR code at their table, browse the menu on their phone, and place orders that route directly to the kitchen — no app download, no waiter required.

There are three distinct products in this monorepo:
- **`apps/web`** — Marketing landing page (bite.so)
- **`apps/menu`** — Customer-facing QR ordering app (menu.bite.so)
- **`apps/admin`** — Restaurant admin portal (admin.bite.so)

---

## Monorepo Structure

```
bite/
├── apps/
│   ├── web/           @bite/web      — Next.js 14, landing page
│   ├── menu/          @bite/menu     — Next.js 14, customer QR app
│   └── admin/         @bite/admin    — Next.js 14, admin portal
├── packages/
│   ├── ui/            @bite/ui       — Shared React components
│   ├── types/         @bite/types    — Shared TypeScript types + mock data
│   └── config/        @bite/config   — Shared Tailwind + ESLint configs
├── .claude/
│   └── skills/                       — Agent skill files (read before relevant tasks)
├── CLAUDE.md                          — This file
├── README.md
├── turbo.json
└── package.json
```

---

## Skills System

Before working on any task, check `.claude/skills/` for a relevant skill file. Skills contain distilled patterns, gotchas, and implementation guides specific to this codebase. **Always read the relevant skill before starting work.**

```
.claude/skills/
├── component.md       — How to build UI components in this repo
├── animation.md       — Framer Motion patterns we use
├── state.md           — Zustand store patterns
├── admin-page.md      — How to build a new admin page
├── menu-feature.md    — How to add features to the customer menu app
├── types.md           — Adding/modifying shared types
├── mock-data.md       — How to extend mock data
└── supabase.md        — (Future) Supabase integration patterns
```

To read a skill: `cat .claude/skills/component.md`

---

## Commands

```bash
# Run all apps simultaneously
npm run dev

# Run a single app
npm run dev:web
npm run dev:menu
npm run dev:admin

# Build all
npm run build

# Build a single app
turbo build --filter=@bite/web

# Lint all
npm run lint

# Type check all
npm run typecheck

# Add a dependency to a specific app
npm install <package> --workspace=apps/menu

# Add a dependency to a shared package
npm install <package> --workspace=packages/ui
```

**Dev ports:**
- `apps/web`   → http://localhost:3000
- `apps/menu`  → http://localhost:3001
- `apps/admin` → http://localhost:3002

---

## Design System — Non-Negotiable

Every component must use these exact values. Do not deviate.

### Colors
```
bg:        #EDECEA   warm off-white — page backgrounds
surface:   #F5F4F1   slightly lighter — sidebar, card backgrounds  
surface2:  #FFFFFF   pure white — sheets, modals, elevated UI
border:    #E0DDD9   warm gray — all dividers and card borders
ink:       #1A1816   near-black — primary text, all CTA buttons
muted:     #6B6760   secondary text
faint:     #A8A49F   placeholder, disabled, captions
popular:   #D4622A   warm orange — "popular" badge, highlights
success:   #3A7D52   forest green — "new" badge, success states
error:     #C0392B   error states
```

### Fonts
```
font-display  →  Fraunces (serif)   — prices, page titles, hero text, ticket numbers
font-sans     →  DM Sans            — everything else: body, labels, buttons, nav
font-mono     →  JetBrains Mono     — order/ticket numbers, codes
```

### Rules
- Page backgrounds: always `bg-bg`, never `bg-white`
- Primary CTAs: `bg-ink text-surface` — dark fill, light text
- Secondary CTAs: `border border-border text-ink bg-transparent`
- Cards: `bg-surface2 border border-border rounded` — shadow-sm maximum
- Bottom sheets: `bg-surface2 rounded-t-xl` (20px top corners, 0 bottom)
- Never use purple, blue gradients, or Inter/Roboto/Arial fonts
- Spacing: 8pt grid only — 4, 8, 12, 16, 24, 32, 48, 64, 96px

---

## Architecture Decisions

### State Management
- **Customer app** (`apps/menu`): Zustand, in-memory only, no persistence
- **Admin portal** (`apps/admin`): Zustand with `persist` middleware → localStorage
- **No Redux, no Context API for global state** — Zustand only

### Data Flow (Current: MVP Phase)
- All data is mock — imported from `@bite/types/mock`
- No API calls, no database connections in Phase 1
- Admin state persists across refresh via localStorage
- When adding Supabase later, swap the store's data sources — component interfaces stay identical

### Component Location Rules
| Type | Location |
|---|---|
| Used in 2+ apps | `packages/ui/` |
| Only in menu app | `apps/menu/components/` |
| Only in admin | `apps/admin/components/` |
| Only on landing | `apps/web/components/` |

### 'use client' Rules
- Default to Server Components — do NOT add `'use client'` unless the component uses:
  - `useState`, `useEffect`, `useRef`, or other React hooks
  - Browser APIs (`window`, `document`, `localStorage`)
  - Framer Motion animations
  - Zustand stores
  - Event handlers that can't be passed as server actions

---

## Deployment & CI/CD

### Infrastructure
- **Server**: Single host (`47.251.113.72`), SSH as `root`
- **Containers**: Docker Compose runs 3 Next.js apps (standalone output)
  - `bite-web` → port 3000
  - `bite-menu` → port 3001
  - `bite-admin` → port 3002
- **Reverse proxy**: Nginx on the host maps subdomains to container ports
  - `trybite.us` / `www.trybite.us` → :3000
  - `menu.trybite.us` → :3001
  - `admin.trybite.us` → :3002
- **Nginx config**: `nginx/bite.conf` (symlinked into `/etc/nginx/sites-enabled/` on server)

### Auto-Deploy
- **Workflow**: `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` branch
- **What it does**: SSHs into server → `git pull` → `docker compose up --build -d` → prunes old images
- **Secrets** (in GitHub repo Settings → Secrets → Actions):
  - `SERVER_HOST` — server IP
  - `SERVER_USER` — SSH user
  - `SERVER_PASSWORD` — SSH password

### Key Files
```
Dockerfile              — Multi-stage build, takes APP and PORT args
docker-compose.yml      — Orchestrates web, menu, admin services
nginx/bite.conf         — Nginx reverse proxy config
.github/workflows/deploy.yml — Auto-deploy on push to main
```

---

## Phase Map

Understand which phase we're in. Do not build things from future phases.

```
Phase 1 — Frontend MVP (CURRENT)
  ✓ All three apps, fully navigable
  ✓ Mock data only
  ✓ All UI interactions working
  ✓ No backend

Phase 2 — Backend Wiring
  → Supabase project setup
  → Database schema + RLS
  → Replace mock data with real Supabase queries
  → Real auth (Supabase Auth)
  → LLM menu parser (Claude API Edge Function)
  → Order submission to DB
  → PrintNode print trigger

Phase 3 — Operations
  → Kitchen Display System (KDS)
  → Supabase Realtime for live order updates
  → QR code generation + Storage
  → Email notifications

Phase 4 — Payments
  → Adyen for Platforms integration
  → Sub-merchant onboarding
  → Payment flow in customer app
  → Payout dashboard in admin
```

---

## File Conventions

```
PascalCase.tsx         — React components
useCamelCase.ts        — Custom hooks
camelCase.ts           — Utilities, stores, non-component modules
page.tsx               — Next.js pages (required name)
layout.tsx             — Next.js layouts (required name)
*.test.ts(x)           — Tests (co-located with component)
```

### Import Order (enforced by ESLint)
1. React imports
2. Next.js imports  
3. Third-party packages
4. `@bite/*` internal packages
5. App-internal absolute imports (`@/components/...`)
6. Relative imports (`./`, `../`)
7. Type-only imports (`import type`)

---

## TypeScript Rules

- Strict mode enabled everywhere (`"strict": true` in all tsconfigs)
- No `any` — use `unknown` and narrow, or define a proper type
- No `// @ts-ignore` — fix the actual type issue
- No `as` type assertions unless absolutely unavoidable (add a comment explaining why)
- All component props must have an explicit interface or type alias
- Prefer `type` over `interface` for data shapes; use `interface` for component props

---

## What To Do When Stuck

1. **Type error you can't resolve** → Check `packages/types/index.ts` for the correct shape. If the type is missing, add it there first.

2. **Design question** → Refer to the Design System section above. If still unclear, match the closest existing component.

3. **Not sure if something is in scope** → Check the Phase Map. If it's Phase 2+, skip it and leave a `// TODO(phase-2): ...` comment.

4. **Component already exists somewhere** → Before building new, `grep -r "ComponentName" apps/ packages/` to check if it already exists in `packages/ui/` or another app.

5. **Mock data doesn't have what you need** → Read `.claude/skills/mock-data.md` then extend `packages/types/mock.ts`.

---

## Things That Will Break You

- **Turborepo caching**: If you change something in `packages/` and the app doesn't reflect it, run `turbo build --filter=@bite/[affected-package] --force` to bust the cache.

- **Workspace hoisting**: Some packages get hoisted to root `node_modules`, some don't. If you get "module not found" after installing, try running `npm install` from the root.

- **`'use client'` boundary**: Passing a non-serializable prop (like a function) from a Server Component to a Client Component will throw. Check the component tree before adding `'use client'`.

- **Framer Motion with Next.js**: Wrap AnimatePresence components in a client boundary. `layout` animations require `LayoutGroup` at the right level.

- **Zustand + SSR**: Zustand stores initialize on both server and client. Use the `useStore` pattern with a `useRef` check, or use `dynamic(() => import(...), { ssr: false })` for components that depend on store state that differs between server and client.

---

## Mandatory: Update Documentation After Every Change

After completing ANY code change — feature, bugfix, refactor, schema change, new page, new component, etc. — you MUST update documentation before considering the task done. This is not optional.

### What to update:
1. **`CLAUDE.md`** — Update if the change affects monorepo structure, commands, design system tokens, architecture decisions, phase status, file conventions, or any section that describes the current state of the codebase.
2. **`README.md`** — Update if the change affects project structure, tech stack, setup instructions, environment variables, roadmap status, or anything user/developer-facing.
3. **Relevant `.claude/skills/` files** — Update whichever skill file covers the area you changed:
   - Changed a component pattern? → Update `component.md`
   - Changed animation approach? → Update `animation.md`
   - Changed Zustand store patterns? → Update `state.md`
   - Added/changed an admin page? → Update `admin-page.md`
   - Added a menu feature? → Update `menu-feature.md`
   - Changed shared types? → Update `types.md`
   - Extended mock data? → Update `mock-data.md`
   - Changed Supabase integration? → Update `supabase.md`

### Rules:
- Documentation updates are part of the task, not a separate follow-up
- If you add a new file, directory, or pattern, it must be reflected in docs
- If you remove or rename something, remove/update it in docs too
- Keep docs concise and accurate — don't let them drift from reality

---

## Do Not

- Do not install a new package without checking if one already in the repo solves the problem
- Do not create a new component file in `apps/` if it could go in `packages/ui/`
- Do not write inline styles — use Tailwind classes only
- Do not use `<style>` tags in components
- Do not commit `.env.local` files
- Do not add `console.log` (use `console.error` for actual errors only)
- Do not hardcode URLs — use environment variables or config constants
- Do not bypass TypeScript with `any` or `@ts-ignore`
- Do not implement Phase 2+ features during Phase 1
