# Bite

**QR table-side ordering for restaurants.**  
Customers scan, order, and pay — all from their phone.

[Live Demo](https://bite.so) · [Admin Demo](https://admin.bite.so/login) · [Docs](#) · [Report Bug](#)

---

</div>

## What Is Bite?

Bite is a SaaS platform that lets restaurants offer QR code table-side ordering. Each table gets a unique QR code. Customers scan it, browse the full menu, customize items, and place orders that go directly to the kitchen — no app download, no waiting for a server.

For the restaurant: faster table turns, fewer order errors, and a real-time view of every active table.

---

## The Three Apps

| App | URL | Description |
|---|---|---|
| `apps/web` | bite.so | Marketing landing page |
| `apps/menu` | menu.bite.so/[slug]/table/[id] | Customer QR ordering app |
| `apps/admin` | admin.bite.so | Restaurant management portal |

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Setup

```bash
# Clone the repo
git clone https://github.com/yourname/bite.git
cd bite

# Install all dependencies (all workspaces)
npm install

# Start all three apps in parallel
npm run dev
```

Apps will be available at:
- Landing page → http://localhost:3000
- Customer menu → http://localhost:3001 (auto-redirects to demo restaurant)
- Admin portal  → http://localhost:3002 (login: `admin@bite.so` / `demo1234`)

### Run a single app

```bash
npm run dev:web
npm run dev:menu
npm run dev:admin
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Monorepo | Turborepo |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| QR Codes | qrcode.react |
| Database | Supabase (Phase 2) |
| Auth | Supabase Auth (Phase 2) |
| Payments | Adyen for Platforms (Phase 4) |
| Printing | PrintNode (Phase 2) |
| AI | Claude API — menu parser (Phase 2) |
| Hosting | AWS ECS + ECR |
| CI/CD | GitHub Actions |

---

## Project Structure

```
bite/
├── apps/
│   ├── web/                    # Marketing site
│   │   └── app/
│   │       ├── page.tsx        # Landing page (all sections)
│   │       └── layout.tsx
│   ├── menu/                   # Customer QR app
│   │   ├── app/
│   │   │   └── [slug]/table/[tableId]/
│   │   │       └── page.tsx    # Menu home (all overlays here)
│   │   ├── components/
│   │   │   ├── MenuHeader.tsx
│   │   │   ├── CategorySidebar.tsx
│   │   │   ├── MenuItemCard.tsx
│   │   │   ├── ItemDetailSheet.tsx
│   │   │   ├── FloatingCartBar.tsx
│   │   │   ├── CartSheet.tsx
│   │   │   └── OrderConfirmation.tsx
│   │   └── store/
│   │       └── cart.ts         # Zustand cart store
│   └── admin/                  # Restaurant admin portal
│       ├── app/
│       │   ├── (auth)/login/
│       │   └── (dashboard)/
│       │       ├── dashboard/
│       │       ├── menu/
│       │       │   └── upload/ # PDF parser UI
│       │       ├── tables/
│       │       ├── orders/
│       │       └── settings/
│       ├── components/
│       └── store/
│           ├── menu.ts         # Zustand menu store (localStorage)
│           └── auth.ts         # Mock auth store
├── packages/
│   ├── ui/                     # Shared components (used in 2+ apps)
│   ├── types/
│   │   ├── index.ts            # All TypeScript types
│   │   └── mock.ts             # Mock data (The Oakwood restaurant)
│   └── config/
│       ├── tailwind.config.js  # Shared Tailwind config
│       └── eslint.config.js
├── .claude/
│   └── skills/                 # Claude Code skill files
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
├── CLAUDE.md                   # Agent instructions
└── turbo.json
```

---

## Design System

Bite uses a warm, editorial design language — off-white backgrounds, bold Fraunces serif for display text, DM Sans for UI, jet-black CTAs.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#EDECEA` | Page backgrounds |
| `surface` | `#F5F4F1` | Cards, sidebars |
| `surface2` | `#FFFFFF` | Sheets, modals |
| `border` | `#E0DDD9` | Dividers, card borders |
| `ink` | `#1A1816` | Primary text, CTAs |
| `muted` | `#6B6760` | Secondary text |
| `faint` | `#A8A49F` | Placeholders, disabled |
| `popular` | `#D4622A` | Popular badge, highlights |
| `success` | `#3A7D52` | New badge, success |
| `error` | `#C0392B` | Error states |

### Fonts
- **Fraunces** (serif) — prices, headlines, ticket numbers
- **DM Sans** — all UI text, buttons, labels
- **JetBrains Mono** — order/ticket numbers, codes

---

## Customer Flow

```
Customer scans QR at table
        ↓
Menu loads instantly (no app download, no login)
        ↓
Browse by category — left sidebar + right content scroll
        ↓
Tap item → bottom sheet with modifier options
        ↓
Add to cart → floating cart bar appears
        ↓
Review cart → Place Order
        ↓
Order confirmed (ticket #, summary)
        ↓
[Phase 2] Order fires to DB → triggers kitchen printer
        ↓
Kitchen makes food → server delivers
```

---

## Restaurant Admin Flow

```
Owner signs up → enters restaurant name
        ↓
Uploads menu PDF → AI parses items & prices
        ↓
Reviews parsed menu → makes edits → publishes
        ↓
Generates QR codes for each table → downloads & prints
        ↓
Configures kitchen printer (PrintNode)
        ↓
Goes live — orders start coming in
        ↓
Monitors orders on live dashboard
```

---

## Development Guide

### Adding a New Component

Read `.claude/skills/component.md` first, then:

1. Decide: shared (`packages/ui/`) or app-specific (`apps/[app]/components/`)?
2. Create the file in the right location
3. Export from the package's `index.ts` if shared
4. Add proper TypeScript props interface
5. Use only design system tokens (no hardcoded colors/spacing)

### Adding a New Admin Page

Read `.claude/skills/admin-page.md` first, then:

1. Create `apps/admin/app/(dashboard)/[page-name]/page.tsx`
2. Add nav item to `apps/admin/components/Sidebar.tsx`
3. Page gets the dashboard shell layout automatically

### Extending Mock Data

Read `.claude/skills/mock-data.md` first. All mock data lives in `packages/types/mock.ts`.

### Adding a Shared Type

All types live in `packages/types/index.ts`. After adding, run `npm run typecheck` to verify no breaks.

---

## Environment Variables

### `apps/web`
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### `apps/menu`
```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=           # Phase 2
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Phase 2
```

### `apps/admin`
```env
NEXT_PUBLIC_APP_URL=http://localhost:3002
NEXT_PUBLIC_SUPABASE_URL=           # Phase 2
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Phase 2
```

Copy `.env.example` to `.env.local` in each app. Never commit `.env.local`.

---

## Deployment

Each app runs in its own Docker container on AWS ECS.

### Build a Docker image

```bash
# From repo root
docker build -f apps/web/Dockerfile -t bite-web .
docker build -f apps/menu/Dockerfile -t bite-menu .
docker build -f apps/admin/Dockerfile -t bite-admin .
```

### Deploy to ECS (manual)

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag bite-web:latest <account>.dkr.ecr.us-east-1.amazonaws.com/bite-web:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/bite-web:latest

# Force ECS to pull the new image
aws ecs update-service --cluster bite --service bite-web --force-new-deployment
```

### CI/CD

Pushes to `main` automatically deploy via GitHub Actions (`.github/workflows/`). Pushes to `dev` deploy to staging.

---

## Roadmap

**Phase 1 — Frontend MVP** ← _we are here_
- [x] Monorepo scaffold
- [x] Design system
- [x] Landing page
- [x] Customer QR ordering app (mock data)
- [x] Admin portal (mock data, localStorage)

**Phase 2 — Backend**
- [ ] Supabase schema + RLS policies
- [ ] Real auth (Supabase Auth)
- [ ] Replace mock data with Supabase queries
- [ ] LLM menu parser (Claude API)
- [ ] Order submission to database
- [ ] PrintNode kitchen print trigger

**Phase 3 — Operations**
- [ ] Kitchen Display System (KDS)
- [ ] Supabase Realtime (live order updates)
- [ ] QR code generation + Supabase Storage
- [ ] Multi-table session management

**Phase 4 — Payments**
- [ ] Adyen for Platforms account setup
- [ ] Sub-merchant KYC onboarding
- [ ] Payment flow in customer app
- [ ] Payout dashboard in admin

---

## Working With Claude Code

This repo is optimized for AI-assisted development. See `CLAUDE.md` for the full agent instructions.

Key things Claude Code will do automatically:
- Read `CLAUDE.md` at the start of every session
- Check `.claude/skills/` for relevant patterns before starting tasks
- Follow the design system without being asked
- Stay in Phase 1 scope unless explicitly told to move forward
- Write TypeScript strict-mode compatible code throughout

To start a session:
```bash
cd bite
claude
```

---

## License

MIT © Bite Technologies, Inc.
