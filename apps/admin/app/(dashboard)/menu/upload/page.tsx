'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Check, Loader2, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@bite/types'
import { PageHeader } from '@/components/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useMenuStore } from '@/store/menu'

type ParsedCategory = {
  name: string
  display_order?: number
}

type ParsedItem = {
  name: string
  description?: string
  price: number
  emoji?: string
  category_name?: string
  category_index?: number
  is_popular?: boolean
  is_new?: boolean
  needs_review?: boolean
}

type ParseMenuResponse = {
  categories: ParsedCategory[]
  items: ParsedItem[]
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

function isSupportedMenuFile(file: File): boolean {
  const fileName = file.name.toLowerCase()
  return (
    fileName.endsWith('.pdf') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.webp')
  )
}

function getUploadValidationError(file: File): string | null {
  if (!isSupportedMenuFile(file)) {
    return 'Only PDF, image, and TXT files are supported.'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File is too large for synchronous parsing. Keep uploads under 20MB.'
  }
  return null
}

const parsingSteps = [
  'Uploading menu file...',
  'Submitting to parser...',
  'Parsing with Claude...',
  'Normalizing categories...',
  'Preparing review data...',
]

function normalizeParsedMenu(
  restaurantId: string,
  payload: ParseMenuResponse
): { categories: MenuCategory[]; items: MenuItem[] } {
  const safeCategories = payload.categories.length > 0
    ? payload.categories
    : [{ name: 'Uncategorized', display_order: 1 }]

  const categories: MenuCategory[] = safeCategories.map((category, index) => ({
    id: `parsed-cat-${index + 1}`,
    restaurant_id: restaurantId,
    name: category.name,
    display_order: category.display_order ?? index + 1,
    is_available: true,
  }))

  const categoryNameToId = new Map<string, string>()
  categories.forEach((category) => {
    categoryNameToId.set(category.name.toLowerCase(), category.id)
  })

  const firstCategoryId = categories[0]?.id ?? 'parsed-cat-1'

  const items: MenuItem[] = payload.items.map((item, index) => {
    const byName = item.category_name
      ? categoryNameToId.get(item.category_name.toLowerCase())
      : undefined
    const byIndex = typeof item.category_index === 'number'
      ? categories[item.category_index]?.id
      : undefined
    const categoryId = byName ?? byIndex ?? firstCategoryId

    return {
      id: `parsed-item-${index + 1}`,
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: item.name,
      description: item.description,
      price: item.price,
      emoji: item.emoji ?? '🍽️',
      is_available: true,
      is_popular: item.is_popular ?? false,
      is_new: item.is_new ?? false,
      needs_review: item.needs_review ?? false,
      display_order: index + 1,
    }
  })

  return { categories, items }
}

export default function MenuUploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const restaurantId = useAuthStore((state) => state.restaurant?.id ?? null)
  const importParsedMenu = useMenuStore((state) => state.importParsedMenu)
  const isOnboardingFlow = searchParams.get('onboarding') === '1'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [fileName, setFileName] = useState('')
  const [parsingStep, setParsingStep] = useState(0)
  const [parsedCategories, setParsedCategories] = useState<MenuCategory[]>([])
  const [parsedItems, setParsedItems] = useState<MenuItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)

  const reviewCount = parsedItems.filter((item) => item.needs_review).length

  const parseFile = useCallback(
    async (file: File) => {
      if (!restaurantId) {
        setError('Restaurant context not ready. Try again in a moment.')
        return
      }

      setError('')
      setStep(2)
      setParsingStep(0)

      let uploadId: string | null = null
      const filePath = `${restaurantId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`

      const progressTimer = window.setInterval(() => {
        setParsingStep((prev) => {
          if (prev >= parsingSteps.length - 1) {
            return prev
          }
          return prev + 1
        })
      }, 450)

      try {
        const { error: uploadError } = await supabase.storage
          .from('menu-uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const { data: uploadRow, error: uploadRowError } = await supabase
          .from('menu_uploads')
          .insert({
            restaurant_id: restaurantId,
            file_url: filePath,
            status: 'processing',
          })
          .select('id')
          .single()

        if (uploadRowError || !uploadRow) {
          throw new Error(uploadRowError?.message ?? 'Could not create upload row')
        }

        uploadId = uploadRow.id

        const mimeType = file.type || 'application/octet-stream'

        const { data, error: invokeError } = await supabase.functions.invoke('parse-menu', {
          body: {
            uploadId,
            filePath,
            fileName: file.name,
            mimeType,
          },
        })

        const parserError =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string'
            ? data.error
            : null

        if (invokeError) {
          throw new Error(parserError ?? invokeError.message)
        }

        const payload = data as ParseMenuResponse | null
        if (!payload || !Array.isArray(payload.categories) || !Array.isArray(payload.items)) {
          throw new Error('Parser returned an invalid payload')
        }

        if (payload.items.length === 0) {
          let message =
            'Could not extract enough readable content from that file. Upload a text-based PDF, clearer image, or TXT file, or enter items manually.'

          const { data: uploadRecord } = await supabase
            .from('menu_uploads')
            .select('error_message')
            .eq('id', uploadId)
            .maybeSingle()

          const parserMessage =
            typeof uploadRecord?.error_message === 'string'
              ? uploadRecord.error_message.trim()
              : ''
          if (parserMessage) {
            message = parserMessage
          }

          setError(message)
          setStep(1)
          return
        }

        const normalized = normalizeParsedMenu(restaurantId, payload)
        setParsedCategories(normalized.categories)
        setParsedItems(normalized.items)
        setStep(3)
        setParsingStep(parsingSteps.length)

        await supabase
          .from('menu_uploads')
          .update({
            status: 'completed',
            parsed_data: payload,
            error_message: null,
          })
          .eq('id', uploadId)
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : 'Failed to parse menu'
        setError(message)
        setStep(1)

        if (uploadId) {
          await supabase
            .from('menu_uploads')
            .update({
              status: 'failed',
            })
            .eq('id', uploadId)
        }
      } finally {
        window.clearInterval(progressTimer)
      }
    },
    [restaurantId, supabase]
  )

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const validationError = getUploadValidationError(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setFileName(file.name)
    await parseFile(file)
  }

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (!file) {
      return
    }
    const validationError = getUploadValidationError(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setFileName(file.name)
    await parseFile(file)
  }

  const handlePublish = async () => {
    if (parsedCategories.length === 0 || parsedItems.length === 0) {
      setError('Nothing to publish yet.')
      return
    }

    setPublishing(true)
    setError('')
    await importParsedMenu(parsedCategories, parsedItems)
    setPublishing(false)
    router.push(isOnboardingFlow ? '/tables?onboarding=1' : '/menu')
  }

  const removeItem = (id: string) => {
    setParsedItems((items) => items.filter((item) => item.id !== id))
  }

  const updateItemField = (id: string, field: keyof MenuItem, value: string | number) => {
    setParsedItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Menu"
        description={
          isOnboardingFlow
            ? 'Step 2 of 3. Import your menu from a PDF, image, or text document.'
            : 'Import your menu from a PDF, image, or text document'
        }
      />

      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Parsing', 'Review'].map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3
          const isActive = step === stepNumber
          const isDone = step > stepNumber
          return (
            <div key={label} className="flex items-center gap-2">
              {index > 0 && <ChevronRight size={14} className="text-faint" />}
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

      {error && (
        <div className="bg-error/10 border border-error/30 text-error rounded-[10px] px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-lg bg-surface2 hover:border-muted transition-colors cursor-pointer"
            >
              <Upload size={32} className="text-faint mb-4" />
              <p className="text-sm font-medium text-ink mb-1">Drop your menu file here</p>
              <p className="text-xs text-muted mb-4">PDF, images, and TXT files are supported</p>
              <input
                type="file"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={(event) => {
                  void handleFileSelect(event)
                }}
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
              {parsingSteps.map((stepText, index) => {
                const isDone = parsingStep > index
                const isCurrent = parsingStep === index
                return (
                  <div key={stepText} className="flex items-center gap-3">
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
                  </div>
                )
              })}
            </div>

            <div className="mt-6 h-1.5 bg-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-ink rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${(Math.min(parsingStep + 1, parsingSteps.length) / parsingSteps.length) * 100}%` }}
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

            <div className="bg-surface2 border border-border rounded-lg p-6">
              <h3 className="font-display font-bold text-base text-ink mb-4">Parsed Menu</h3>
              <p className="text-xs text-muted mb-4">{parsedCategories.length} categories, {parsedItems.length} items</p>
              <div className="space-y-4">
                {parsedCategories.map((category) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-ink">{category.name}</span>
                    </div>
                    <div className="ml-4 space-y-2">
                      {parsedItems
                        .filter((item) => item.category_id === category.id)
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
                                  onChange={(event) => updateItemField(item.id, 'name', event.target.value)}
                                  className="flex-1 px-2 py-1 bg-bg border border-border rounded text-xs focus:outline-none"
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(event) => updateItemField(item.id, 'price', parseFloat(event.target.value) || 0)}
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
                onClick={() => {
                  void handlePublish()
                }}
                disabled={publishing}
                className="w-full mt-6 bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {publishing ? 'Publishing...' : 'Publish Menu'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
