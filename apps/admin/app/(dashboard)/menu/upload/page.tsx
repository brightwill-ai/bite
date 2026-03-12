'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Check, Loader2, ChevronRight, Pencil, Trash2, X } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@bite/types'
import { PageHeader } from '@/components/PageHeader'
import { ModifierGroupEditor } from '@/components/ModifierGroupEditor'
import type { TempModifierGroup, TempModifier } from '@/store/menu'
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

type ParseFunctionResult = {
  status: number
  data: unknown | null
  errorMessage: string | null
}

function extractFunctionErrorMessage(data: unknown, status: number): string {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string' &&
    data.error.trim()
  ) {
    return data.error.trim()
  }

  return `Parser request failed (${status})`
}

async function invokeParseMenuFunction(params: {
  accessToken: string
  body: Record<string, unknown>
}): Promise<ParseFunctionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return {
      status: 0,
      data: null,
      errorMessage: 'Supabase client environment is not configured.',
    }
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/parse-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify(params.body),
    })

    let data: unknown | null = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      return {
        status: response.status,
        data,
        errorMessage: extractFunctionErrorMessage(data, response.status),
      }
    }

    return {
      status: response.status,
      data,
      errorMessage: null,
    }
  } catch (error) {
    return {
      status: 0,
      data: null,
      errorMessage: error instanceof Error ? error.message : 'Failed to reach parser service',
    }
  }
}

async function getFreshAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const {
    data: { session: initialSession },
    error: initialSessionError,
  } = await supabase.auth.getSession()

  if (initialSessionError) {
    return null
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expiresAt = initialSession?.expires_at ?? null
  const needsRefresh = !initialSession?.access_token || (typeof expiresAt === 'number' && expiresAt <= nowSeconds + 30)

  if (!needsRefresh && initialSession?.access_token) {
    const { data: userData, error: userError } = await supabase.auth.getUser(initialSession.access_token)
    if (!userError && userData.user) {
      return initialSession.access_token
    }
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshData.session?.access_token) {
    return null
  }

  return refreshData.session.access_token
}

async function forceRefreshAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshData.session?.access_token) {
    return null
  }
  return refreshData.session.access_token
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

// ─── Item edit panel (slide-in, replaces inline rows) ───────────────────────

interface ItemEditPanelProps {
  item: MenuItem
  categories: MenuCategory[]
  groups: TempModifierGroup[]
  modifiersByGroup: Record<string, TempModifier[]>
  onSave: (id: string, updates: Partial<MenuItem>) => void
  onClose: () => void
  onAddGroup: (itemId: string) => void
  onUpdateGroup: (tempId: string, updates: Partial<TempModifierGroup>) => void
  onDeleteGroup: (tempId: string) => void
  onAddModifier: (groupTempId: string) => void
  onUpdateModifier: (tempId: string, updates: Partial<TempModifier>) => void
  onDeleteModifier: (tempId: string) => void
}

function ItemEditPanel({
  item,
  categories,
  groups,
  modifiersByGroup,
  onSave,
  onClose,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddModifier,
  onUpdateModifier,
  onDeleteModifier,
}: ItemEditPanelProps) {
  const [name, setName] = useState(item.name)
  const [emoji, setEmoji] = useState(item.emoji ?? '')
  const [description, setDescription] = useState(item.description ?? '')
  const [price, setPrice] = useState(String(item.price))
  const [categoryId, setCategoryId] = useState(item.category_id)

  const handleSave = () => {
    onSave(item.id, {
      name,
      emoji,
      description,
      price: parseFloat(price) || 0,
      category_id: categoryId,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 w-[520px] h-screen bg-surface2 border-l border-border z-50 flex flex-col shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="font-display font-bold text-base text-ink">{item.name}</h2>
          <p className="text-xs text-muted mt-0.5">Edit before publishing</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-bg rounded-sm transition-colors"
          aria-label="Close"
        >
          <X size={18} className="text-muted" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Emoji</label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-2 py-2 bg-surface border border-border rounded-sm text-center text-lg focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What's in it?"
            className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink resize-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-sm text-sm focus:outline-none focus:border-ink transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Modifier groups */}
        <ModifierGroupEditor
          groups={groups}
          modifiersByGroup={modifiersByGroup}
          onAddGroup={() => onAddGroup(item.id)}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
          onAddModifier={onAddModifier}
          onUpdateModifier={onUpdateModifier}
          onDeleteModifier={onDeleteModifier}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <button
          onClick={handleSave}
          className="w-full bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity"
        >
          Save Item
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

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
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Modifier state — held locally until publish
  const [tempGroups, setTempGroups] = useState<TempModifierGroup[]>([])
  const [tempModifiers, setTempModifiers] = useState<TempModifier[]>([])

  const reviewCount = parsedItems.filter((item) => item.needs_review).length

  // ── Modifier handlers ──────────────────────────────────────────────────────

  const handleAddGroup = (itemId: string) => {
    const itemGroupCount = tempGroups.filter((g) => g.item_id === itemId).length
    const newGroup: TempModifierGroup = {
      tempId: crypto.randomUUID(),
      item_id: itemId,
      name: 'New group',
      selection_type: 'single',
      is_required: false,
      min_selections: 0,
      max_selections: 1,
      display_order: itemGroupCount + 1,
    }
    setTempGroups((prev) => [...prev, newGroup])
  }

  const handleUpdateGroup = (tempId: string, updates: Partial<TempModifierGroup>) => {
    setTempGroups((prev) =>
      prev.map((g) => (g.tempId === tempId ? { ...g, ...updates } : g))
    )
  }

  const handleDeleteGroup = (tempId: string) => {
    setTempGroups((prev) => prev.filter((g) => g.tempId !== tempId))
    setTempModifiers((prev) => prev.filter((m) => m.groupTempId !== tempId))
  }

  const handleAddModifier = (groupTempId: string) => {
    const groupModCount = tempModifiers.filter((m) => m.groupTempId === groupTempId).length
    const newMod: TempModifier = {
      tempId: crypto.randomUUID(),
      groupTempId,
      name: 'New option',
      price_delta: 0,
      is_available: true,
      display_order: groupModCount + 1,
    }
    setTempModifiers((prev) => [...prev, newMod])
  }

  const handleUpdateModifier = (tempId: string, updates: Partial<TempModifier>) => {
    setTempModifiers((prev) =>
      prev.map((m) => (m.tempId === tempId ? { ...m, ...updates } : m))
    )
  }

  const handleDeleteModifier = (tempId: string) => {
    setTempModifiers((prev) => prev.filter((m) => m.tempId !== tempId))
  }

  // ── Item field updates ─────────────────────────────────────────────────────

  const updateItem = (id: string, updates: Partial<MenuItem>) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const removeItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id))
    // Also clean up any modifier groups for this item
    const groupTempIds = tempGroups
      .filter((g) => g.item_id === id)
      .map((g) => g.tempId)
    setTempGroups((prev) => prev.filter((g) => g.item_id !== id))
    setTempModifiers((prev) => prev.filter((m) => !groupTempIds.includes(m.groupTempId)))
  }

  // ── Parse flow ─────────────────────────────────────────────────────────────

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
        const invokeBody = {
          uploadId,
          filePath,
          fileName: file.name,
          mimeType,
        }
        const anonToken = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

        let result: ParseFunctionResult | null = null
        const initialAccessToken = await getFreshAccessToken(supabase)
        if (initialAccessToken) {
          result = await invokeParseMenuFunction({
            accessToken: initialAccessToken,
            body: invokeBody,
          })
        }

        if (result?.status === 401) {
          const retryAccessToken = await forceRefreshAccessToken(supabase)
          if (retryAccessToken) {
            result = await invokeParseMenuFunction({
              accessToken: retryAccessToken,
              body: invokeBody,
            })
          }
        }

        if (!result || result.status === 401) {
          if (!anonToken) {
            throw new Error('Your admin session expired. Sign in again, then retry upload.')
          }
          result = await invokeParseMenuFunction({
            accessToken: anonToken,
            body: invokeBody,
          })
        }

        if (result.status < 200 || result.status >= 300) {
          throw new Error(result.errorMessage ?? 'Failed to parse menu')
        }

        const data = result.data

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
        setTempGroups([])
        setTempModifiers([])
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
    await importParsedMenu(parsedCategories, parsedItems, tempGroups, tempModifiers)
    setPublishing(false)
    router.push(isOnboardingFlow ? '/tables?onboarding=1' : '/menu')
  }

  // Build modifiersByGroup for the panel (filters to current item's groups)
  const editingItemGroups = editingItem
    ? tempGroups.filter((g) => g.item_id === editingItem.id)
    : []

  const editingModifiersByGroup: Record<string, TempModifier[]> = {}
  for (const group of editingItemGroups) {
    editingModifiersByGroup[group.tempId] = tempModifiers.filter(
      (m) => m.groupTempId === group.tempId
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
                {reviewCount} item{reviewCount > 1 ? 's' : ''} flagged for review — click the pencil to fix them
              </div>
            )}

            <div className="bg-surface2 border border-border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="font-display font-bold text-base text-ink">Parsed Menu</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {parsedCategories.length} {parsedCategories.length === 1 ? 'category' : 'categories'} ·{' '}
                    {parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'} ·{' '}
                    Click <Pencil size={10} className="inline" /> to edit details and add modifiers
                  </p>
                </div>
              </div>

              {/* Item list */}
              <div className="divide-y divide-border">
                {parsedCategories.map((category) => {
                  const catItems = parsedItems.filter((item) => item.category_id === category.id)
                  if (catItems.length === 0) return null
                  return (
                    <div key={category.id}>
                      {/* Category header */}
                      <div className="px-5 py-2 bg-surface">
                        <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                          {category.name}
                        </span>
                      </div>

                      {/* Items */}
                      {catItems.map((item) => {
                        const itemGroupCount = tempGroups.filter((g) => g.item_id === item.id).length
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 px-5 py-3 hover:bg-bg/40 transition-colors ${
                              item.needs_review ? 'border-l-4 border-l-amber-400' : ''
                            }`}
                          >
                            {/* Emoji */}
                            <span className="text-base shrink-0 w-6 text-center">{item.emoji}</span>

                            {/* Name + description */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-ink truncate">{item.name}</span>
                                {item.needs_review && (
                                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                                    REVIEW
                                  </span>
                                )}
                                {itemGroupCount > 0 && (
                                  <span className="text-[10px] text-muted shrink-0">
                                    {itemGroupCount} modifier{itemGroupCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted truncate max-w-md mt-0.5">{item.description}</p>
                              )}
                            </div>

                            {/* Price */}
                            <span className="font-display text-sm font-bold text-ink shrink-0">
                              ${item.price.toFixed(2)}
                            </span>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1.5 hover:bg-surface rounded-sm transition-colors"
                                aria-label="Edit item"
                              >
                                <Pencil size={13} className="text-muted" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 hover:bg-surface rounded-sm transition-colors"
                                aria-label="Remove item"
                              >
                                <Trash2 size={13} className="text-error/60 hover:text-error" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Publish footer */}
              <div className="px-5 py-4 border-t border-border bg-surface">
                <button
                  onClick={() => { void handlePublish() }}
                  disabled={publishing}
                  className="w-full bg-ink text-surface font-medium text-sm py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {publishing && <Loader2 size={14} className="animate-spin" />}
                  {publishing ? 'Publishing...' : 'Publish Menu'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-in item edit panel */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-ink z-40"
            />
            <ItemEditPanel
              item={editingItem}
              categories={parsedCategories}
              groups={editingItemGroups}
              modifiersByGroup={editingModifiersByGroup}
              onSave={updateItem}
              onClose={() => setEditingItem(null)}
              onAddGroup={handleAddGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onAddModifier={handleAddModifier}
              onUpdateModifier={handleUpdateModifier}
              onDeleteModifier={handleDeleteModifier}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
