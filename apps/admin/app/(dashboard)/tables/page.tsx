'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { Plus, Download, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { PageHeader } from '@/components/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

interface TableData {
  id: string
  number: number
  active: boolean
  qrUrl: string
}

function resolveMenuBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MENU_BASE_URL
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('localhost')) {
      return 'http://localhost:3001'
    }
  }
  return 'https://menu.trybite.us'
}

function buildQrUrl(slug: string, tableNumber: number): string {
  return `${resolveMenuBaseUrl()}/${slug}/table/${tableNumber}`
}

export default function TablesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const restaurant = useAuthStore((state) => state.restaurant)
  const [tables, setTables] = useState<TableData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTableCount, setNewTableCount] = useState('1')
  const [isGoingLive, setIsGoingLive] = useState(false)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const isOnboardingFlow = searchParams.get('onboarding') === '1'

  useEffect(() => {
    const loadTables = async () => {
      if (!restaurant) {
        setTables([])
        return
      }
      setIsLoading(true)
      const { data, error } = await supabase
        .from('tables')
        .select('id, table_number, is_active, qr_code_url')
        .eq('restaurant_id', restaurant.id)
        .order('table_number', { ascending: true })

      if (error || !data) {
        setIsLoading(false)
        return
      }

      const normalized = data.map((table) => {
        const tableNumber = Number.parseInt(table.table_number, 10)
        return {
          id: table.id,
          number: Number.isFinite(tableNumber) ? tableNumber : 0,
          active: table.is_active ?? false,
          qrUrl: table.qr_code_url || buildQrUrl(restaurant.slug, tableNumber),
        }
      })

      setTables(normalized.filter((table) => table.number > 0))
      setIsLoading(false)
    }

    void loadTables()
  }, [restaurant, supabase])

  const handleAddTables = async () => {
    const count = Number.parseInt(newTableCount, 10)
    if (!restaurant || !Number.isFinite(count) || count < 1) {
      return
    }

    const maxNumber = tables.reduce((max, table) => Math.max(max, table.number), 0)
    const inserts = Array.from({ length: count }, (_, index) => {
      const tableNumber = maxNumber + index + 1
      return {
        restaurant_id: restaurant.id,
        table_number: String(tableNumber),
        label: null,
        qr_code_url: buildQrUrl(restaurant.slug, tableNumber),
        is_active: false,
      }
    })

    const { data, error } = await supabase
      .from('tables')
      .insert(inserts)
      .select('id, table_number, is_active, qr_code_url')

    if (error || !data) {
      return
    }

    const created = data.map((table) => ({
      id: table.id,
      number: Number.parseInt(table.table_number, 10),
      active: table.is_active ?? false,
      qrUrl: table.qr_code_url || buildQrUrl(restaurant.slug, Number.parseInt(table.table_number, 10)),
    }))

    setTables((previous) =>
      [...previous, ...created].sort((a, b) => a.number - b.number)
    )
    setShowAddModal(false)
    setNewTableCount('1')
  }

  const svgToPngBlob = (svgElement: Element): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const context = canvas.getContext('2d')
      const image = new Image()
      image.onload = () => {
        context?.drawImage(image, 0, 0, 512, 512)
        canvas.toBlob((blob) => resolve(blob), 'image/png')
      }
      image.onerror = () => resolve(null)
      image.src = `data:image/svg+xml;base64,${btoa(svgData)}`
    })
  }

  const handleDownloadQR = (tableNumber: number) => {
    const svg = document.getElementById(`qr-${tableNumber}`)
    if (!svg) return
    void svgToPngBlob(svg).then((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `table-${tableNumber}-qr.png`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  const handleDownloadAllQRs = async () => {
    if (tables.length === 0) return
    setIsDownloadingAll(true)

    const zip = new JSZip()
    await Promise.all(
      tables.map(async (table) => {
        const svg = document.getElementById(`qr-${table.number}`)
        if (!svg) return
        const blob = await svgToPngBlob(svg)
        if (blob) {
          zip.file(`table-${table.number}-qr.png`, blob)
        }
      })
    )

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.download = 'all-qr-codes.zip'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)

    setIsDownloadingAll(false)
  }

  const handleGoLive = async () => {
    if (!restaurant) {
      return
    }

    setIsGoingLive(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: true })
      .eq('id', restaurant.id)

    setIsGoingLive(false)
    if (error) {
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description={
          isOnboardingFlow
            ? 'Step 3 of 3. Add tables, then set your restaurant live.'
            : 'Manage tables and QR codes'
        }
        action={
          <div className="flex items-center gap-2">
            {isOnboardingFlow && (
              <button
                onClick={() => {
                  void handleGoLive()
                }}
                disabled={isGoingLive}
                className="px-4 py-2 border border-border rounded-full text-sm font-medium text-ink hover:bg-bg transition-colors disabled:opacity-50"
              >
                {isGoingLive ? 'Going Live...' : 'Go Live'}
              </button>
            )}
            {tables.length > 0 && (
              <button
                onClick={() => {
                  void handleDownloadAllQRs()
                }}
                disabled={isDownloadingAll}
                className="flex items-center gap-2 px-4 py-2 border border-border text-ink rounded-full text-sm font-medium hover:bg-bg transition-colors disabled:opacity-50"
              >
                <Download size={14} />
                {isDownloadingAll ? 'Downloading...' : 'Download All QRs'}
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ink text-surface rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Add Tables
            </button>
          </div>
        }
      />

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
                value={table.qrUrl}
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

      {isLoading && (
        <div className="text-sm text-muted">Loading tables...</div>
      )}

      {!isLoading && tables.length === 0 && (
        <div className="bg-surface2 border border-border rounded p-5 text-sm text-muted">
          No tables created yet. Add your first batch to generate QR codes.
        </div>
      )}

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
                  onChange={(event) => setNewTableCount(event.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    void handleAddTables()
                  }}
                  className="flex-1 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Add {newTableCount} Table{Number.parseInt(newTableCount, 10) !== 1 ? 's' : ''}
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
