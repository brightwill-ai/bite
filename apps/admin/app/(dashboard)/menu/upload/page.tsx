'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Check, Loader2, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useMenuStore } from '@/store/menu'
import type { MenuCategory, MenuItem } from '@bite/types'

const PARSED_CATEGORIES: MenuCategory[] = [
  { id: 'p-cat-1', restaurant_id: 'rest-001', name: 'Appetizers', display_order: 1, is_available: true },
  { id: 'p-cat-2', restaurant_id: 'rest-001', name: 'Entrees', display_order: 2, is_available: true },
  { id: 'p-cat-3', restaurant_id: 'rest-001', name: 'Desserts', display_order: 3, is_available: true },
]

const PARSED_ITEMS: MenuItem[] = [
  { id: 'p-item-1', restaurant_id: 'rest-001', category_id: 'p-cat-1', name: 'Caesar Salad', description: 'Romaine, croutons, parmesan, house dressing', price: 14, emoji: '🥗', is_available: true, is_popular: false, display_order: 1 },
  { id: 'p-item-2', restaurant_id: 'rest-001', category_id: 'p-cat-1', name: 'Soup of the Day', description: 'Chef selection, served with bread', price: 10, emoji: '🍲', is_available: true, is_popular: false, display_order: 2 },
  { id: 'p-item-3', restaurant_id: 'rest-001', category_id: 'p-cat-2', name: 'Grilled Chicken', description: 'Free-range chicken, seasonal vegetables, jus', price: 28, emoji: '🍗', is_available: true, is_popular: true, needs_review: true, display_order: 1 },
  { id: 'p-item-4', restaurant_id: 'rest-001', category_id: 'p-cat-2', name: 'Pasta Primavera', description: 'Fresh pasta, market vegetables, light cream sauce', price: 22, emoji: '🍝', is_available: true, is_popular: false, display_order: 2 },
  { id: 'p-item-5', restaurant_id: 'rest-001', category_id: 'p-cat-3', name: 'Chocolate Cake', description: 'Rich dark chocolate, berry compote, whipped cream', price: 14, emoji: '🍫', is_available: true, is_popular: true, needs_review: true, display_order: 1 },
]

const parsingSteps = [
  'Reading PDF document...',
  'Detecting menu structure...',
  'Extracting categories...',
  'Parsing menu items...',
  'Identifying prices...',
  'Building menu tree...',
]

export default function MenuUploadPage() {
  const router = useRouter()
  const { importParsedMenu } = useMenuStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [fileName, setFileName] = useState('')
  const [parsingStep, setParsingStep] = useState(0)
  const [parsedCategories] = useState<MenuCategory[]>(PARSED_CATEGORIES)
  const [parsedItems, setParsedItems] = useState<MenuItem[]>(PARSED_ITEMS)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const reviewCount = parsedItems.filter(i => i.needs_review).length

  const simulateParsing = useCallback(() => {
    setStep(2)
    let stepIndex = 0
    const interval = setInterval(() => {
      stepIndex++
      setParsingStep(stepIndex)
      if (stepIndex >= parsingSteps.length) {
        clearInterval(interval)
        setTimeout(() => setStep(3), 500)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      simulateParsing()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setFileName(file.name)
      simulateParsing()
    }
  }

  const handlePublish = () => {
    importParsedMenu(parsedCategories, parsedItems)
    router.push('/menu')
  }

  const removeItem = (id: string) => {
    setParsedItems((items) => items.filter((i) => i.id !== id))
  }

  const updateItemField = (id: string, field: string, value: string | number) => {
    setParsedItems((items) =>
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Menu"
        description="Import your menu from a PDF document"
      />

      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Parsing', 'Review'].map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const isActive = step === stepNum
          const isDone = step > stepNum
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={14} className="text-faint" />}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isActive ? 'bg-ink text-surface' : isDone ? 'bg-success/10 text-success' : 'bg-bg text-faint'
                }`}
              >
                {isDone && <Check size={12} />}
                {label}
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-lg bg-surface2 hover:border-muted transition-colors cursor-pointer"
            >
              <Upload size={32} className="text-faint mb-4" />
              <p className="text-sm font-medium text-ink mb-1">Drop your menu PDF here</p>
              <p className="text-xs text-muted mb-4">or click to browse</p>
              <input
                type="file"
                accept=".pdf,.jpg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="px-4 py-2 bg-ink text-surface rounded-full text-sm font-medium">
                Choose File
              </span>
            </label>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="parsing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-surface2 border border-border rounded-lg p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <FileText size={20} className="text-ink" />
              <span className="text-sm font-medium text-ink">{fileName}</span>
            </div>

            <div className="space-y-3">
              {parsingSteps.map((stepText, i) => {
                const isDone = parsingStep > i
                const isCurrent = parsingStep === i
                return (
                  <motion.div
                    key={stepText}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    {isDone ? (
                      <Check size={16} className="text-success shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 size={16} className="text-ink animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className={`text-sm ${isDone ? 'text-muted' : isCurrent ? 'text-ink font-medium' : 'text-faint'}`}>
                      {stepText}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-6 h-1.5 bg-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-ink rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(parsingStep / parsingSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {reviewCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-[10px] px-4 py-3 text-sm mb-4">
                {reviewCount} item{reviewCount > 1 ? 's' : ''} need your review
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface2 border border-border rounded-lg p-6">
                <h3 className="font-display font-bold text-base text-ink mb-4">PDF Preview</h3>
                <div className="bg-white border border-border rounded p-6 space-y-6 font-serif">
                  <div className="text-center border-b border-gray-200 pb-4">
                    <p className="text-xl font-bold">THE OAKWOOD</p>
                    <p className="text-xs text-gray-400 mt-1">MENU</p>
                  </div>
                  {parsedCategories.map((cat) => (
                    <div key={cat.id}>
                      <p className="font-bold text-sm uppercase tracking-wider mb-2">{cat.name}</p>
                      {parsedItems
                        .filter((i) => i.category_id === cat.id)
                        .map((item) => (
                          <div key={item.id} className="flex justify-between text-xs mb-1.5">
                            <span>{item.name}</span>
                            <span className="font-mono">${item.price.toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface2 border border-border rounded-lg p-6">
                <h3 className="font-display font-bold text-base text-ink mb-4">Parsed Menu</h3>
                <p className="text-xs text-muted mb-4">{parsedCategories.length} categories, {parsedItems.length} items</p>
                <div className="space-y-4">
                  {parsedCategories.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-ink">{cat.name}</span>
                      </div>
                      <div className="ml-4 space-y-2">
                        {parsedItems
                          .filter((i) => i.category_id === cat.id)
                          .map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between bg-surface border rounded-sm px-3 py-2 ${
                                item.needs_review ? 'border-l-4 border-l-amber-400 border-border' : 'border-border'
                              }`}
                            >
                              {editingItemId === item.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    value={item.name}
                                    onChange={(e) => updateItemField(item.id, 'name', e.target.value)}
                                    className="flex-1 px-2 py-1 bg-bg border border-border rounded text-xs focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => updateItemField(item.id, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 bg-bg border border-border rounded text-xs focus:outline-none"
                                  />
                                  <button
                                    onClick={() => setEditingItemId(null)}
                                    className="text-xs text-success font-medium"
                                  >
                                    Done
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{item.emoji}</span>
                                    <span className="text-sm text-ink">{item.name}</span>
                                    {item.needs_review && (
                                      <span className="text-amber-500 text-xs">&#9888;</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-display text-xs font-bold text-muted">
                                      ${item.price.toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => setEditingItemId(item.id)}
                                      className="p-1 hover:bg-bg rounded transition-colors"
                                      aria-label="Edit"
                                    >
                                      <Pencil size={12} className="text-muted" />
                                    </button>
                                    <button
                                      onClick={() => removeItem(item.id)}
                                      className="p-1 hover:bg-bg rounded transition-colors"
                                      aria-label="Remove"
                                    >
                                      <Trash2 size={12} className="text-error" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handlePublish}
                  className="w-full mt-6 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  Publish Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
