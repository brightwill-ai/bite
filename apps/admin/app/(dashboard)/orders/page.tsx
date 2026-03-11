'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QueryData } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Clock, X } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import type { OrderStatus } from '@bite/types'

interface UiOrderItem {
  name: string
  quantity: number
  price: number
}

interface UiOrder {
  id: string
  ticket_number: string
  table: string
  items: UiOrderItem[]
  status: OrderStatus
  time: string
  created_at: string | null
  total: number
  special_instructions: string
}

const filterTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Delivered', value: 'delivered' },
]

const PAGE_SIZE = 25

function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return 'just now'
  }
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hr ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
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

function OrderDetailDrawer({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: UiOrder
  onClose: () => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
}) {
  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
  }
  const next = nextStatus[order.status]

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 w-[420px] h-screen bg-surface2 border-l border-border z-50 flex flex-col shadow-xl"
    >
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="font-display font-bold text-lg">Order {order.ticket_number}</h2>
          <p className="text-xs text-muted mt-0.5">
            {order.table} &middot; {order.time}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-bg rounded-sm transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Status</span>
          <div className="mt-1.5">
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Items</span>
          <div className="mt-2 space-y-2">
            {order.items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{item.quantity}x</span>
                  <span className="text-sm text-ink">{item.name}</span>
                </div>
                <span className="font-mono text-sm text-muted">${((item.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {order.special_instructions && (
          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Special Instructions</span>
            <p className="mt-1.5 text-sm text-ink bg-surface border border-border rounded-sm p-3">{order.special_instructions}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="font-display font-bold text-lg text-ink">${(order.total / 100).toFixed(2)}</span>
        </div>
      </div>

      {next && (
        <div className="p-5 border-t border-border">
          <button
            onClick={() => onUpdateStatus(order.id, next)}
            className="w-full flex items-center justify-center gap-2 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Mark as {next.charAt(0).toUpperCase() + next.slice(1)}
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default function OrdersPage() {
  const supabase = useMemo(() => createClient(), [])
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)

  const [orders, setOrders] = useState<UiOrder[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<UiOrder | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)

  const orderSelectQuery = `
    id,
    ticket_number,
    status,
    special_instructions,
    total,
    created_at,
    table:tables(table_number, label),
    order_items(
      id,
      item_name,
      item_price,
      quantity,
      subtotal,
      order_item_modifiers(name, price_delta)
    )
  `

  const normalizeRow = useCallback((row: Record<string, unknown>): UiOrder => {
    const ticket = `#${String(row.ticket_number).padStart(3, '0')}`
    const tableData = row.table as { label?: string | null; table_number?: string | null } | null
    const tableLabel =
      tableData?.label || tableData?.table_number
        ? `T-${tableData?.label ?? tableData?.table_number ?? '?'}`
        : 'T-?'

    const rawItems = (row.order_items as Array<{ item_name: string; item_price: number; quantity: number }>) ?? []
    const orderItems: UiOrderItem[] = rawItems.map((item) => ({
      name: item.item_name,
      quantity: item.quantity,
      price: Math.round(item.item_price * 100),
    }))

    const createdAt = (row.created_at as string | null) ?? null
    return {
      id: row.id as string,
      ticket_number: ticket,
      table: tableLabel,
      items: orderItems,
      status: normalizeStatus(row.status as string),
      time: formatRelativeTime(createdAt),
      created_at: createdAt,
      total: Math.round(((row.total as number) ?? 0) * 100),
      special_instructions: (row.special_instructions as string) ?? '',
    }
  }, [])

  useEffect(() => {
    const loadOrders = async () => {
      if (!restaurantId) {
        setOrders([])
        return
      }

      setIsLoading(true)
      const query = supabase
        .from('orders')
        .select(orderSelectQuery)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      type OrderQueryRow = QueryData<typeof query>[number]
      const { data, error } = await query

      if (error || !data) {
        setIsLoading(false)
        setOrders([])
        return
      }

      const normalized: UiOrder[] = data.map((row: OrderQueryRow) => normalizeRow(row as unknown as Record<string, unknown>))

      setOrders(normalized)
      setIsLoading(false)
    }

    void loadOrders()
  }, [restaurantId, supabase, orderSelectQuery, normalizeRow])

  // Realtime subscription for live order updates
  useEffect(() => {
    if (!restaurantId) return

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('orders')
            .select(orderSelectQuery)
            .eq('id', payload.new.id)
            .single()

          if (!data) return
          const newOrder = normalizeRow(data as unknown as Record<string, unknown>)
          setOrders((previous) => [newOrder, ...previous])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updatedStatus = normalizeStatus(payload.new.status as string)
          setOrders((previous) =>
            previous.map((order) =>
              order.id === payload.new.id ? { ...order, status: updatedStatus } : order
            )
          )
          setSelectedOrder((previous) => {
            if (!previous || previous.id !== (payload.new.id as string)) return previous
            return { ...previous, status: updatedStatus }
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [restaurantId, supabase, orderSelectQuery, normalizeRow])

  // Refresh relative timestamps every 60s so "just now" → "1 min ago" stays accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((previous) =>
        previous.map((order) => ({ ...order, time: formatRelativeTime(order.created_at) }))
      )
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const filteredOrders = filter === 'all' ? orders : orders.filter((order) => order.status === filter)
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) {
      return
    }

    setOrders((previous) => previous.map((order) => (order.id === id ? { ...order, status } : order)))
    setSelectedOrder((previous) => (previous?.id === id ? { ...previous, status } : previous))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Track and manage incoming orders" />

      <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.value ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-surface2 border border-border rounded overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Ticket</th>
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Table</th>
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Items</th>
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Time</th>
              <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="border-b border-border last:border-0 hover:bg-bg/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-sm font-semibold text-ink">{order.ticket_number}</td>
                <td className="px-4 py-3 text-sm text-muted">{order.table}</td>
                <td className="px-4 py-3 text-sm text-ink truncate max-w-[250px]">
                  {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs text-faint">
                    <Clock size={12} />
                    {order.time}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-medium text-ink">${(order.total / 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {isLoading && <div className="py-8 text-center text-sm text-muted">Loading orders...</div>}

        {!isLoading && filteredOrders.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">No orders match this filter</div>
        )}

        {!isLoading && filteredOrders.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface2">
            <span className="text-xs text-muted">
              Page {page} of {pageCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-border rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount}
                className="px-3 py-1.5 text-xs border border-border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-ink z-40"
            />
            <OrderDetailDrawer
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onUpdateStatus={(id, status) => {
                void handleUpdateStatus(id, status)
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
