'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Download, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageHeader } from '@/components/PageHeader'

interface TableData {
  id: string
  number: number
  active: boolean
}

const initialTables: TableData[] = Array.from({ length: 15 }, (_, i) => ({
  id: `table-${i + 1}`,
  number: i + 1,
  active: [1, 2, 3, 5, 7, 9, 11, 14].includes(i + 1),
}))

export default function TablesPage() {
  const [tables, setTables] = useState<TableData[]>(initialTables)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTableCount, setNewTableCount] = useState('1')

  const handleAddTables = () => {
    const count = parseInt(newTableCount, 10)
    if (isNaN(count) || count < 1) return

    const maxNum = Math.max(...tables.map((t) => t.number), 0)
    const newTables: TableData[] = Array.from({ length: count }, (_, i) => ({
      id: `table-${maxNum + i + 1}`,
      number: maxNum + i + 1,
      active: false,
    }))

    setTables([...tables, ...newTables])
    setShowAddModal(false)
    setNewTableCount('1')
  }

  const handleDownloadQR = (tableNumber: number) => {
    const svg = document.getElementById(`qr-${tableNumber}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `table-${tableNumber}-qr.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description="Manage tables and QR codes"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add Tables
          </button>
        }
      />

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface2 border border-border rounded p-4 flex flex-col items-center"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <span className="font-display font-bold text-lg text-ink">T-{table.number}</span>
              {table.active ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  Active
                </span>
              ) : (
                <span className="text-xs text-faint">Inactive</span>
              )}
            </div>

            <div className="bg-white p-3 rounded-sm mb-3">
              <QRCodeSVG
                id={`qr-${table.number}`}
                value={`https://bite.so/the-oakwood/table/${table.number}`}
                size={120}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1A1816"
              />
            </div>

            <button
              onClick={() => handleDownloadQR(table.number)}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
            >
              <Download size={12} />
              Download QR
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add Tables Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-ink z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-surface2 border border-border rounded-lg p-6 z-50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-lg text-ink">Add Tables</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-bg rounded-sm transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Number of tables to add
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddTables}
                  className="flex-1 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Add {newTableCount} Table{parseInt(newTableCount) !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-sm text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
