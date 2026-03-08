'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import type { OrderStatus } from '@bite/types'

interface MockOrder {
  id: string
  ticket_number: string
  table: string
  items: { name: string; quantity: number; price: number }[]
  status: OrderStatus
  time: string
  total: number
  special_instructions: string
}

const mockOrders: MockOrder[] = [
  {
    id: 'ord-001',
    ticket_number: '#047',
    table: 'T-3',
    items: [
      { name: 'Margherita', quantity: 1, price: 1800 },
      { name: 'Truffle Fries', quantity: 2, price: 900 },
    ],
    status: 'preparing',
    time: '2 min ago',
    total: 3600,
    special_instructions: 'Extra crispy fries please',
  },
  {
    id: 'ord-002',
    ticket_number: '#046',
    table: 'T-7',
    items: [
      { name: 'Grilled Ribeye', quantity: 1, price: 3800 },
      { name: 'House Red Wine', quantity: 2, price: 1400 },
    ],
    status: 'confirmed',
    time: '5 min ago',
    total: 6600,
    special_instructions: '',
  },
  {
    id: 'ord-003',
    ticket_number: '#045',
    table: 'T-1',
    items: [
      { name: 'Cacio e Pepe', quantity: 1, price: 1900 },
      { name: 'Tiramisu', quantity: 1, price: 1400 },
      { name: 'Espresso', quantity: 1, price: 450 },
    ],
    status: 'ready',
    time: '8 min ago',
    total: 3750,
    special_instructions: 'Nut allergy - no walnuts',
  },
  {
    id: 'ord-004',
    ticket_number: '#044',
    table: 'T-11',
    items: [
      { name: 'Pan-Seared Salmon', quantity: 1, price: 2900 },
      { name: 'Sparkling Water', quantity: 1, price: 600 },
    ],
    status: 'delivered',
    time: '15 min ago',
    total: 3500,
    special_instructions: '',
  },
  {
    id: 'ord-005',
    ticket_number: '#043',
    table: 'T-5',
    items: [
      { name: 'Burrata & Heirloom Tomato', quantity: 1, price: 1650 },
      { name: 'Pepperoni', quantity: 1, price: 2000 },
    ],
    status: 'delivered',
    time: '22 min ago',
    total: 3650,
    special_instructions: '',
  },
  {
    id: 'ord-006',
    ticket_number: '#042',
    table: 'T-9',
    items: [
      { name: 'Mushroom Risotto', quantity: 2, price: 2200 },
      { name: 'Garlic Bread', quantity: 1, price: 750 },
    ],
    status: 'pending',
    time: '1 min ago',
    total: 5150,
    special_instructions: 'One risotto extra truffle oil',
  },
  {
    id: 'ord-007',
    ticket_number: '#041',
    table: 'T-2',
    items: [
      { name: 'Lobster Linguine', quantity: 1, price: 3400 },
      { name: 'Fresh Lemonade', quantity: 2, price: 750 },
    ],
    status: 'preparing',
    time: '4 min ago',
    total: 4900,
    special_instructions: '',
  },
]

const filterTabs: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Delivered', value: 'delivered' },
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

function OrderDetailDrawer({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: MockOrder
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
          <p className="text-xs text-muted mt-0.5">{order.table} &middot; {order.time}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-bg rounded-sm transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status */}
        <div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Status</span>
          <div className="mt-1.5">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Items */}
        <div>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">Items</span>
          <div className="mt-2 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{item.quantity}x</span>
                  <span className="text-sm text-ink">{item.name}</span>
                </div>
                <span className="font-mono text-sm text-muted">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Instructions */}
        {order.special_instructions && (
          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Special Instructions</span>
            <p className="mt-1.5 text-sm text-ink bg-surface border border-border rounded-sm p-3">
              {order.special_instructions}
            </p>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="font-display font-bold text-lg text-ink">
            ${(order.total / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action */}
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
  const [orders, setOrders] = useState<MockOrder[]>(mockOrders)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null)

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const handleUpdateStatus = (id: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    )
    setSelectedOrder((prev) => (prev?.id === id ? { ...prev, status } : prev))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Track and manage incoming orders" />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-ink text-surface'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
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
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="border-b border-border last:border-0 hover:bg-bg/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono text-sm font-semibold text-ink">
                  {order.ticket_number}
                </td>
                <td className="px-4 py-3 text-sm text-muted">{order.table}</td>
                <td className="px-4 py-3 text-sm text-ink truncate max-w-[250px]">
                  {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
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
                <td className="px-4 py-3 text-right font-mono text-sm font-medium text-ink">
                  ${(order.total / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredOrders.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">
            No orders match this filter
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
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
              onUpdateStatus={handleUpdateStatus}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
