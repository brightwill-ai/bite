'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ElementType } from 'react'
import { motion } from 'framer-motion'
import type { QueryData } from '@supabase/supabase-js'
import { DollarSign, ShoppingBag, Armchair, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import type { OrderStatus } from '@bite/types'

interface StatItem {
  label: string
  value: string
  icon: ElementType
  change: string
}

interface RecentOrder {
  id: string
  ticket: string
  table: string
  items: string
  total: string
  status: OrderStatus
  time: string
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return 'just now'
  }
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) {
    return `${diffMinutes}m`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours}h`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

function normalizeStatus(value: string): OrderStatus {
  if (value === 'confirmed' || value === 'preparing' || value === 'ready' || value === 'delivered') {
    return value
  }
  return 'pending'
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending: 'bg-bg text-faint',
    confirmed: 'bg-surface border border-border text-muted',
    preparing: 'bg-amber-50 text-amber-700 border border-amber-200',
    ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    delivered: 'bg-bg text-faint line-through',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)

  const [stats, setStats] = useState<StatItem[]>([
    { label: "Today's Revenue", value: '$0.00', icon: DollarSign, change: '' },
    { label: 'Orders Today', value: '0', icon: ShoppingBag, change: '' },
    { label: 'Active Tables', value: '0/0', icon: Armchair, change: '' },
    { label: 'Avg Order Size', value: '$0.00', icon: TrendingUp, change: '' },
  ])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [allTables, setAllTables] = useState<number[]>([])
  const [activeTables, setActiveTables] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadDashboard = async () => {
      if (!restaurantId) {
        return
      }
      setLoading(true)

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const [ordersResult, tablesResult] = await Promise.all([
        supabase
          .from('orders')
          .select(
            `
              id,
              table_id,
              ticket_number,
              status,
              total,
              table:tables(table_number, label),
              created_at,
              order_items(item_name, quantity)
            `
          )
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('tables')
          .select('id, table_number, is_active')
          .eq('restaurant_id', restaurantId)
          .order('table_number', { ascending: true }),
      ])

      const allOrders = ordersResult.data ?? []
      const todayOrders = allOrders.filter((order) => {
        if (!order.created_at) {
          return false
        }
        return new Date(order.created_at) >= startOfDay
      })

      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total ?? 0), 0)
      const avgOrder = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0

      const tableRows = tablesResult.data ?? []
      const tableNumberById = new Map(
        tableRows.map((table) => [table.id, Number.parseInt(table.table_number, 10)])
      )
      const tableNumbers = tableRows
        .map((table) => Number.parseInt(table.table_number, 10))
        .filter((value) => Number.isFinite(value))

      const activeOrderStatuses = new Set(['pending', 'confirmed', 'preparing', 'ready'])
      const enabledTables = Array.from(
        new Set(
          allOrders
            .filter((order) => activeOrderStatuses.has(order.status))
            .map((order) => tableNumberById.get(order.table_id))
            .filter((value): value is number => Number.isFinite(value))
        )
      )

      setAllTables(tableNumbers)
      setActiveTables(enabledTables)

      setStats([
        {
          label: "Today's Revenue",
          value: `$${todayRevenue.toFixed(2)}`,
          icon: DollarSign,
          change: '',
        },
        {
          label: 'Orders Today',
          value: String(todayOrders.length),
          icon: ShoppingBag,
          change: '',
        },
        {
          label: 'Active Tables',
          value: `${enabledTables.length}/${tableRows.length}`,
          icon: Armchair,
          change: '',
        },
        {
          label: 'Avg Order Size',
          value: `$${avgOrder.toFixed(2)}`,
          icon: TrendingUp,
          change: '',
        },
      ])

      const query = supabase
        .from('orders')
        .select(
          `
            id,
            ticket_number,
            status,
            total,
            created_at,
            table:tables(table_number, label),
            order_items(item_name, quantity)
          `
        )
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5)

      type RecentOrderRow = QueryData<typeof query>[number]
      const { data: recentRows } = await query
      const normalizedRecent: RecentOrder[] = (recentRows ?? []).map((order: RecentOrderRow) => ({
        id: order.id,
        ticket: `#${String(order.ticket_number).padStart(3, '0')}`,
        table: `T-${order.table?.label ?? order.table?.table_number ?? '?'}`,
        items: (order.order_items ?? [])
          .map((item) => `${item.quantity}x ${item.item_name}`)
          .join(', '),
        total: `$${(order.total ?? 0).toFixed(2)}`,
        status: normalizeStatus(order.status),
        time: formatRelativeTime(order.created_at),
      }))
      setRecentOrders(normalizedRecent)
      setLoading(false)
    }

    void loadDashboard()
  }, [restaurantId, supabase])

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of today's activity" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.35 }}
              className="bg-surface2 border border-border rounded p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted text-sm">{stat.label}</span>
                <Icon size={16} className="text-faint" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display font-bold text-2xl text-ink">{stat.value}</span>
                {stat.change && (
                  <span className="text-success text-xs font-medium mb-1">{stat.change}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface2 border border-border rounded p-5">
          <h2 className="font-display font-bold text-lg text-ink mb-4">Active Tables</h2>
          <div className="grid grid-cols-5 gap-2">
            {allTables.map((table) => {
              const isActive = activeTables.includes(table)
              return (
                <div
                  key={table}
                  className={`aspect-square rounded-sm flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-ink text-surface'
                      : 'bg-surface border border-border text-faint'
                  }`}
                >
                  {table}
                </div>
              )
            })}
            {!loading && allTables.length === 0 && (
              <p className="text-xs text-muted col-span-5">No tables configured yet.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface2 border border-border rounded p-5">
          <h2 className="font-display font-bold text-lg text-ink mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-sm font-semibold text-ink w-12 shrink-0">
                    {order.ticket}
                  </span>
                  <span className="text-sm text-muted w-10 shrink-0">{order.table}</span>
                  <span className="text-sm text-ink truncate">{order.items}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="font-mono text-sm font-medium text-ink">{order.total}</span>
                  <StatusBadge status={order.status} />
                  <span className="text-xs text-faint w-16 text-right">{order.time}</span>
                </div>
              </div>
            ))}
            {!loading && recentOrders.length === 0 && (
              <p className="text-sm text-muted">No recent orders yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
