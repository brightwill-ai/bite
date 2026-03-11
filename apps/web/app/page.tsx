'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
  Menu,
  X,
  QrCode,
  Sparkles,
  CreditCard,
  BarChart3,
  Bell,
  ArrowRight,
  Check,
  ChevronDown,
  Upload,
  Cpu,
  Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function removeTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
}

function resolveAdminUrl(): string {
  const configured = process.env.NEXT_PUBLIC_ADMIN_URL?.trim()
  if (configured) {
    return removeTrailingSlash(configured)
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    if (isLocalHostname(hostname)) {
      return 'http://localhost:3002'
    }

    const normalizedHost = hostname.startsWith('www.') ? hostname.slice(4) : hostname
    if (normalizedHost.startsWith('admin.')) {
      return `${protocol}//${normalizedHost}`
    }
    if (normalizedHost.startsWith('web.')) {
      return `${protocol}//admin.${normalizedHost.slice(4)}`
    }
    if (normalizedHost.startsWith('menu.')) {
      return `${protocol}//admin.${normalizedHost.slice(5)}`
    }
    return `${protocol}//admin.${normalizedHost}`
  }

  return 'https://admin.trybite.us'
}

/* ─────────────── DATA ─────────────── */

const navLinks = ['Features', 'How it Works', 'Pricing']

const features = [
  {
    icon: QrCode,
    title: 'Instant QR Ordering',
    description:
      'Guests scan a QR code at their table and browse your full menu on their phone. No app download, no friction — just tap and order.',
    preview: {
      heading: 'Table 7 — Order',
      items: [
        { name: 'Smoked Brisket Tacos', price: '$16', qty: 2 },
        { name: 'Charred Caesar Salad', price: '$12', qty: 1 },
        { name: 'Sparkling Lemonade', price: '$5', qty: 3 },
      ],
      total: '$65',
    },
  },
  {
    icon: Sparkles,
    title: 'AI Menu Builder',
    description:
      'Upload a PDF or photo of your current menu. Our AI extracts every dish, description, and price — your digital menu is ready in seconds.',
    preview: {
      heading: 'AI Parsing Complete',
      items: [
        { name: 'Truffle Fries', price: '$11', qty: 0 },
        { name: 'Wagyu Burger', price: '$24', qty: 0 },
        { name: 'Matcha Tiramisu', price: '$13', qty: 0 },
      ],
      total: '23 items detected',
    },
  },
  {
    icon: CreditCard,
    title: 'Built-in Payments',
    description:
      'Accept Apple Pay, Google Pay, and cards directly through the ordering flow. Tips, split bills, and receipts — all handled automatically.',
    preview: {
      heading: 'Payment — Table 3',
      items: [
        { name: 'Subtotal', price: '$87', qty: 0 },
        { name: 'Tip (20%)', price: '$17.40', qty: 0 },
        { name: 'Total', price: '$104.40', qty: 0 },
      ],
      total: 'Paid via Apple Pay',
    },
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description:
      'See what\'s selling, when tables turn, and how revenue trends over time. Data-driven decisions made simple with dashboards built for operators.',
    preview: {
      heading: 'Today — Dashboard',
      items: [
        { name: 'Revenue', price: '$4,230', qty: 0 },
        { name: 'Orders', price: '187', qty: 0 },
        { name: 'Avg. Check', price: '$22.60', qty: 0 },
      ],
      total: '+18% vs last week',
    },
  },
  {
    icon: Bell,
    title: 'Kitchen & Server Alerts',
    description:
      'Orders flow directly to the kitchen display. Servers get notified on their device. No miscommunication, no missed orders.',
    preview: {
      heading: 'Kitchen Queue',
      items: [
        { name: 'Table 5 — 3 items', price: '2m ago', qty: 0 },
        { name: 'Table 12 — 1 item', price: 'Just now', qty: 0 },
        { name: 'Table 8 — 5 items', price: '30s ago', qty: 0 },
      ],
      total: '6 orders in queue',
    },
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: 79,
    description: 'For single-location cafes and small restaurants getting started.',
    features: [
      'Up to 50 menu items',
      'QR code ordering',
      'Basic analytics',
      'Email support',
      '1 location',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Growth',
    price: 149,
    description: 'For busy restaurants ready to optimize every table turn.',
    features: [
      'Unlimited menu items',
      'AI menu builder',
      'Built-in payments',
      'Real-time analytics',
      'Up to 3 locations',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Scale',
    price: 299,
    description: 'For multi-location groups and franchise operators.',
    features: [
      'Everything in Growth',
      'Unlimited locations',
      'Kitchen display system',
      'API access',
      'Custom branding',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

const socialProofNames = [
  'The Copper Pan',
  'Luma Kitchen',
  'Fox & Fern',
  'Basecamp Bistro',
  'Sunday Market',
  'Nori Ramen House',
]

/* ─────────────── COMPONENTS ─────────────── */

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]" aria-hidden="true">
      {/* Phone frame */}
      <div className="rounded-[36px] border-[6px] border-ink bg-surface2 p-2 shadow-2xl">
        {/* Notch */}
        <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-ink" />
        {/* Screen content */}
        <div className="space-y-3 rounded-[24px] bg-bg p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold">Bite</span>
            <span className="text-[10px] text-muted">Table 7</span>
          </div>
          {/* Search */}
          <div className="rounded-sm bg-surface px-3 py-2 text-[10px] text-faint">
            Search the menu...
          </div>
          {/* Category pills */}
          <div className="flex gap-1.5">
            {['Popular', 'Mains', 'Drinks'].map((c, i) => (
              <span
                key={c}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[9px] font-medium',
                  i === 0 ? 'bg-ink text-surface2' : 'bg-surface text-muted'
                )}
              >
                {c}
              </span>
            ))}
          </div>
          {/* Menu items */}
          {[
            { name: 'Smoked Brisket Tacos', price: '$16', tag: 'Popular' },
            { name: 'Charred Caesar Salad', price: '$12', tag: null },
            { name: 'Truffle Mac & Cheese', price: '$14', tag: 'New' },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-2 rounded-sm bg-surface p-2.5">
              <div className="h-9 w-9 flex-shrink-0 rounded-sm bg-border" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium">{item.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">{item.price}</span>
                  {item.tag && (
                    <span className="rounded-full bg-popular/10 px-1.5 py-0.5 text-[8px] font-medium text-popular">
                      {item.tag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] text-surface2">
                +
              </div>
            </div>
          ))}
          {/* Cart bar */}
          <div className="flex items-center justify-between rounded-lg bg-ink px-3 py-2.5">
            <span className="text-[10px] font-medium text-surface2">3 items — $42</span>
            <span className="text-[10px] font-semibold text-popular">View Cart</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturePreviewCard({ feature }: { feature: (typeof features)[0] }) {
  return (
    <motion.div
      key={feature.title}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-surface2 p-6 shadow-lg"
    >
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        {feature.preview.heading}
      </p>
      <div className="space-y-3">
        {feature.preview.items.map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
            <span className="text-sm font-medium">{item.name}</span>
            <span className="text-sm text-muted">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-border pt-3 text-center text-xs font-medium text-muted">
        {feature.preview.total}
      </div>
    </motion.div>
  )
}

/* ─────────────── MAIN PAGE ─────────────── */

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleEarlyAccess = () => {
    window.location.href = resolveAdminUrl()
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileNavOpen(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-surface2"
      >
        Skip to main content
      </a>

      <div className="min-h-screen">
        {/* ──── NAVBAR ──── */}
        <nav
          aria-label="Main navigation"
          className={cn(
            'fixed inset-x-0 top-0 z-50 transition-all duration-300',
            scrolled
              ? 'border-b border-border bg-bg/80 backdrop-blur-xl'
              : 'bg-transparent'
          )}
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            {/* Logo */}
            <span className="font-display text-xl font-bold tracking-tight">Bite</span>

            {/* Desktop nav links */}
            <div className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <button
                  key={link}
                  onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, '-'))}
                  className="text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  {link}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <button
              onClick={handleEarlyAccess}
              className="hidden rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface2 transition-opacity hover:opacity-90 md:inline-flex"
            >
              Get Early Access
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              className="inline-flex items-center justify-center rounded-lg p-2 text-ink md:hidden"
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile nav dropdown */}
          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                id="mobile-nav"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-b border-border bg-bg/95 backdrop-blur-xl md:hidden"
              >
                <div className="space-y-1 px-6 pb-4 pt-2">
                  {navLinks.map((link) => (
                    <button
                      key={link}
                      onClick={() => scrollTo(link.toLowerCase().replace(/\s+/g, '-'))}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      {link}
                    </button>
                  ))}
                  <button
                    onClick={handleEarlyAccess}
                    className="mt-2 w-full rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface2"
                  >
                    Get Early Access
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <main id="main-content">
          {/* ──── HERO ──── */}
          <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
                {/* Left copy */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="flex-1 text-center lg:text-left"
                >
                  <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-popular" />
                    Table-Side Ordering
                  </span>
                  <h1 className="mt-4 font-display text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-[64px]">
                    Turn every table into a{' '}
                    <em className="not-italic font-display italic text-popular">revenue machine.</em>
                  </h1>
                  <p className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg lg:mx-0">
                    Customers scan, order, and pay — all from their phone. No app
                    download. No waiting. Just faster tables and happier guests.
                  </p>
                  <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
                    <button
                      onClick={handleEarlyAccess}
                      className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-sm font-semibold text-surface2 transition-opacity hover:opacity-90"
                    >
                      Get Early Access
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => scrollTo('how-it-works')}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface"
                    >
                      See How It Works
                    </button>
                  </div>
                </motion.div>

                {/* Right phone mockup */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="flex-shrink-0"
                >
                  <PhoneMockup />
                </motion.div>
              </div>
            </div>
          </section>

          {/* ──── SOCIAL PROOF BAR ──── */}
          <section aria-label="Trusted by" className="border-y border-border bg-surface py-8">
            <div className="mx-auto max-w-6xl px-6">
              <p className="mb-5 text-center text-xs font-medium uppercase tracking-widest text-faint">
                Trusted by restaurants across the country
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                {socialProofNames.map((name) => (
                  <span key={name} className="font-display text-base font-bold text-faint/60 sm:text-lg">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ──── HOW IT WORKS ──── */}
          <section id="how-it-works" className="py-24 lg:py-32">
            <div className="mx-auto max-w-6xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-muted">
                  How it works
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Up and running in minutes
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-muted">
                  Three simple steps to transform your restaurant&apos;s ordering
                  experience — no developer required.
                </p>
              </motion.div>

              <div className="mt-16 grid gap-8 md:grid-cols-3">
                {[
                  {
                    icon: Upload,
                    step: '01',
                    title: 'Upload your menu',
                    description:
                      'Snap a photo or upload a PDF of your existing menu. Any format works.',
                  },
                  {
                    icon: Cpu,
                    step: '02',
                    title: 'AI parses everything',
                    description:
                      'Our AI extracts dishes, descriptions, prices, and categories in seconds.',
                  },
                  {
                    icon: Printer,
                    step: '03',
                    title: 'Print QR & go live',
                    description:
                      'Download branded QR codes for each table. Guests start ordering immediately.',
                  },
                ].map((step, idx) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, delay: idx * 0.12 }}
                    className="group relative rounded-xl border border-border bg-surface2 p-8 transition-shadow hover:shadow-lg"
                  >
                    <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-surface p-3">
                      <step.icon size={24} className="text-ink" />
                    </div>
                    <span className="absolute right-6 top-6 font-mono text-sm font-semibold text-faint">
                      {step.step}
                    </span>
                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ──── FEATURES ──── */}
          <section id="features" className="border-y border-border bg-surface py-24 lg:py-32">
            <div className="mx-auto max-w-6xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
                className="mb-16 text-center"
              >
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-muted">
                  Features
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Everything your restaurant needs
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-muted">
                  From ordering to analytics, Bite handles the full guest experience
                  so your team can focus on hospitality.
                </p>
              </motion.div>

              <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
                {/* Left accordion */}
                <div className="flex-1 space-y-2">
                  {features.map((feature, idx) => {
                    const isActive = activeFeature === idx
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: idx * 0.06 }}
                      >
                        <button
                          onClick={() => setActiveFeature(idx)}
                          aria-expanded={isActive}
                          aria-controls={`feature-desc-${idx}`}
                          className={cn(
                            'w-full rounded-xl border px-6 py-5 text-left transition-all',
                            isActive
                              ? 'border-ink/10 bg-surface2 shadow-sm'
                              : 'border-transparent hover:bg-surface2/60'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <feature.icon
                              size={20}
                              className={cn(
                                'flex-shrink-0',
                                isActive ? 'text-popular' : 'text-muted'
                              )}
                            />
                            <span className="flex-1 text-[15px] font-semibold">
                              {feature.title}
                            </span>
                            <ChevronDown
                              size={16}
                              className={cn(
                                'flex-shrink-0 text-muted transition-transform',
                                isActive && 'rotate-180'
                              )}
                            />
                          </div>
                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                id={`feature-desc-${idx}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <p className="mt-3 pl-8 text-sm leading-relaxed text-muted">
                                  {feature.description}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Right preview card */}
                <div className="flex flex-1 items-start justify-center lg:sticky lg:top-32 lg:self-start">
                  <div className="w-full max-w-sm">
                    <AnimatePresence mode="wait">
                      <FeaturePreviewCard feature={features[activeFeature]} />
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ──── PRICING ──── */}
          <section id="pricing" className="py-24 lg:py-32">
            <div className="mx-auto max-w-6xl px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
                className="mb-16 text-center"
              >
                <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-muted">
                  Pricing
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Simple, transparent pricing
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base text-muted">
                  No setup fees. No hidden costs. Start with a 14-day free trial on
                  any plan.
                </p>
              </motion.div>

              {/* 1-col on mobile, 2-col on tablet (md), 3-col on desktop (lg) */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pricingPlans.map((plan, idx) => (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className={cn(
                      'relative flex flex-col rounded-xl border p-8',
                      plan.popular
                        ? 'border-popular/30 bg-surface2 shadow-xl ring-1 ring-popular/10'
                        : 'border-border bg-surface2'
                    )}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-6 rounded-full bg-popular px-3 py-1 text-[11px] font-semibold text-white">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold">${plan.price}</span>
                      <span className="text-sm text-muted">/mo</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {plan.description}
                    </p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check size={16} className="mt-0.5 flex-shrink-0 text-success" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {/* TODO(phase-2): "Contact Sales" should link to a sales contact form */}
                    <button
                      onClick={handleEarlyAccess}
                      className={cn(
                        'mt-8 w-full rounded-lg px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90',
                        plan.popular
                          ? 'bg-ink text-surface2'
                          : 'border border-border bg-surface text-ink hover:bg-surface2'
                      )}
                    >
                      {plan.cta}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ──── CTA BANNER ──── */}
          <section className="border-y border-border bg-ink py-20">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="font-display text-3xl font-bold tracking-tight text-surface2 sm:text-4xl">
                  Ready to serve smarter?
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base text-faint">
                  Join the early access list and get onboarded before anyone else.
                  No credit card required.
                </p>
                <button
                  onClick={handleEarlyAccess}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-surface2 px-8 py-3.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90"
                >
                  Get Early Access
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            </div>
          </section>

          {/* ──── FOOTER ──── */}
          <footer className="py-12">
            <div className="mx-auto max-w-6xl px-6">
              <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                <div>
                  <span className="font-display text-lg font-bold">Bite</span>
                  <p className="mt-1 text-xs text-muted">
                    QR table-side ordering for modern restaurants.
                  </p>
                </div>
                <nav aria-label="Footer navigation" className="flex items-center gap-6">
                  {[
                    { label: 'How it Works', id: 'how-it-works' },
                    { label: 'Features', id: 'features' },
                    { label: 'Pricing', id: 'pricing' },
                  ].map(({ label, id }) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className="text-xs text-faint transition-colors hover:text-muted"
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <p className="text-xs text-faint">
                  &copy; {new Date().getFullYear()} Bite. All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </MotionConfig>
  )
}
