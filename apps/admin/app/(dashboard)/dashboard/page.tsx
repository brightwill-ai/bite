'use client'

import { motion } from 'framer-motion'
import { DollarSign, ShoppingBag, Armchair, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import type { OrderStatus } from '@bite/types'

const stats = [
  { label: "Today's Revenue", value: '$1,840', icon: DollarSign, change: '+12%' },
  { label: 'Orders Today', value: '47', icon: ShoppingBag, change: '+8%' },
  { label: 'Active Tables', value: '8/15', icon: Armchair, change: '' },
  { label: 'Avg Order Size', value: '$39.15', icon: TrendingUp, change: '+3%' },
]

const activeTables = [1, 2, 3, 5, 7, 9, 11, 14]
const allTables = Array.from({ length: 15 }, (_, i) => i + 1)

const recentOrders: {
  id: string
  ticket: string
  table: string
  items: string
  total: string
  status: OrderStatus
  time: string
}[] = [
  { id: '1', ticket: '#047', table: 'T-3', items: 'Margherita, Truffle Fries', total: '$27.00', status: 'preparing', time: '2 min ago' },
  { id: '2', ticket: '#046', table: 'T-7', items: 'Grilled Ribeye, House Red Wine', total: '$52.00', status: 'confirmed', time: '5 min ago' },
  { id: '3', ticket: '#045', table: 'T-1', items: 'Cacio e Pepe, Tiramisu, Espresso', total: '$37.50', status: 'ready', time: '8 min ago' },
  { id: '4', ticket: '#044', table: 'T-11', items: 'Pan-Seared Salmon, Sparkling Water', total: '$35.00', status: 'delivered', time: '15 min ago' },
  { id: '5', ticket: '#043', table: 'T-5', items: 'Burrata & Heirloom Tomato, Pepperoni', total: '$36.50', status: 'delivered', time: '22 min ago' },
]

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
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of today's activity" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
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
        {/* Active Tables */}
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
          </div>
        </div>

        {/* Recent Orders */}
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
          </div>
        </div>
      </div>
    </div>
  )
}
