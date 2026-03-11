import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ParsedCategory = {
  name: string
  display_order?: number
}

type ParsedItem = {
  name: string
  description?: string
  price: number
  category_name?: string
  category_index?: number
  emoji?: string
  is_popular?: boolean
  is_new?: boolean
  needs_review?: boolean
}

type ParsedMenu = {
  categories: ParsedCategory[]
  items: ParsedItem[]
}

type ParseRequest = {
  uploadId?: string
  filePath?: string
  fileName?: string
  mimeType?: string
  rawText?: string
}

type DeterministicParseResult = {
  menu: ParsedMenu
  priceMatches: number
  parsedItems: number
}

type StoredUpload = {
  bytes: Uint8Array
  contentType: string
}

type PositionedPdfEntry = {
  str: string
  x: number
  y: number
  width: number
  height: number
}

type PositionedPdfLine = {
  y: number
  entries: PositionedPdfEntry[]
}

type InlinePriceMatch = {
  prefix: string
  price: string
}

type CategoryHeadingMatch = {
  name: string
  endIndex: number
}

type UploadKind = 'pdf' | 'image' | 'text' | 'unknown'

type ParsedFromClaude = {
  menu: ParsedMenu
  inputItems: number
  droppedItems: number
  lowConfidence: boolean
}

type ParsedMenuCandidate = {
  menu: ParsedMenu
  warning: string | null
}

type AnthropicConfig = {
  apiKey: string
  model: string
  timeoutMs: number
}

const ANTHROPIC_API_BASE = 'https://api.anthropic.com'
const ANTHROPIC_VERSION = '2023-06-01'
const ANTHROPIC_FILES_BETA = 'files-api-2025-04-14'
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const FALLBACK_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_ANTHROPIC_TIMEOUT_MS = 25_000
const RETRY_BACKOFF_MS = 700

const MAX_SYNC_UPLOAD_BYTES = 20 * 1024 * 1024
const MIN_TEXT_LENGTH_FOR_DETERMINISTIC = 20

const MENU_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confidence: {
      type: 'number',
    },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          display_order: { type: 'integer' },
        },
        required: ['name'],
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          category_name: { type: 'string' },
          category_index: { type: 'integer' },
          emoji: { type: 'string' },
          is_popular: { type: 'boolean' },
          is_new: { type: 'boolean' },
          needs_review: { type: 'boolean' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['categories', 'items'],
}

const CLAUDE_PARSE_PROMPT =
  'Parse this menu file into categories and items. Keep names concise, include prices as numbers, and set needs_review=true when uncertain.'
const CLAUDE_JSON_ONLY_PROMPT =
  'Return only JSON with keys confidence, categories, and items. Do not add markdown or prose.'

const KNOWN_CATEGORY_WORDS = new Set([
  'appetizer',
  'appetizers',
  'burger',
  'burgers',
  'dessert',
  'desserts',
  'drink',
  'drinks',
  'entree',
  'entrees',
  'fries',
  'main',
  'mains',
  'pizza',
  'pizzas',
  'salad',
  'salads',
  'sandwich',
  'sandwiches',
  'shake',
  'shakes',
  'side',
  'sides',
  'special',
  'specials',
  'starter',
  'starters',
  'sushi',
  'taco',
  'tacos',
  'wrap',
  'wraps',
])

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeInlineText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLikelyCorruptedText(value: string): boolean {
  const normalized = normalizeInlineText(value)
  if (normalized.length < 80) {
    return false
  }

  const compact = normalized.replace(/\s+/g, '')
  if (!compact) {
    return false
  }

  const suspiciousChars = compact.match(/[^A-Za-z0-9$.,&'()\-/:+%]/g) ?? []
  const symbolRatio = suspiciousChars.length / compact.length

  const longNoisyTokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 18)
    .filter((token) => {
      const letterCount = (token.match(/[A-Za-z]/g) ?? []).length
      const suspiciousCount = (token.match(/[^A-Za-z0-9$.,&'()\-/:+%]/g) ?? []).length
      return suspiciousCount / token.length > 0.25 || letterCount / token.length < 0.35
    })

  return symbolRatio > 0.2 || longNoisyTokens.length >= 2
}

function startsWithUppercase(token: string): boolean {
  return /^[A-Z]/.test(token)
}

function startsWithLowercase(token: string): boolean {
  return /^[a-z]/.test(token)
}

function normalizeCategoryName(value: string): string {
  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9&/\- ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return 'Uncategorized'
  }

  return words
    .map((word) => {
      if (word.length <= 3 && /^[a-z]+$/.test(word)) {
        return word.toUpperCase()
      }
      return word[0]?.toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function isLikelyCategoryName(value: string): boolean {
  const cleaned = value
    .replace(/[^A-Za-z0-9&/\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) {
    return false
  }

  const lowered = cleaned.toLowerCase()
  if (
    lowered.includes('est') ||
    lowered.includes('downtown') ||
    lowered.includes('smash') ||
    lowered.includes('burn')
  ) {
    return false
  }

  const words = cleaned.split(' ')
  if (words.length === 0 || words.length > 4) {
    return false
  }

  const alphaWords = words
    .map((word) => word.toLowerCase())
    .filter((word) => /^[a-z]+$/.test(word))

  if (alphaWords.length === 0) {
    return false
  }

  const knownWordCount = alphaWords.filter((word) => KNOWN_CATEGORY_WORDS.has(word)).length
  return knownWordCount > 0 && knownWordCount === alphaWords.length
}

function findLastCategoryHeading(chunk: string): CategoryHeadingMatch | null {
  const headingRegex = /(?:^|[\s·|])(?:n\s+)?([A-Z][A-Z&/+\- ]{2,30})(?=\s+(?:\[[^\]]+\]\s+)?[A-Z][a-z])/g
  let match: RegExpExecArray | null = headingRegex.exec(chunk)
  let found: CategoryHeadingMatch | null = null

  while (match) {
    const candidate = match[1]?.replace(/\s+/g, ' ').trim() ?? ''
    if (candidate && isLikelyCategoryName(candidate)) {
      found = {
        name: normalizeCategoryName(candidate),
        endIndex: match.index + match[0].length,
      }
    }
    match = headingRegex.exec(chunk)
  }

  return found
}

function parseDeterministicItemChunk(
  chunk: string,
  currentCategory: string
): { name?: string; description?: string; nextCategory: string } {
  let nextCategory = currentCategory
  let itemText = chunk.trim()
  if (!itemText) {
    return { nextCategory }
  }

  const heading = findLastCategoryHeading(itemText)
  if (heading) {
    nextCategory = heading.name
    if (heading.endIndex < itemText.length) {
      itemText = itemText.slice(heading.endIndex).trim()
    }
  }

  const lastTagEndIndex = itemText.lastIndexOf(']')
  if (lastTagEndIndex !== -1 && lastTagEndIndex < itemText.length - 1) {
    itemText = itemText.slice(lastTagEndIndex + 1).trim()
  }

  itemText = itemText
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!itemText) {
    return { nextCategory }
  }

  const tokens = itemText.split(' ').filter(Boolean)
  if (tokens.length === 0) {
    return { nextCategory }
  }

  let splitIndex = -1
  for (let index = 1; index < tokens.length - 1; index += 1) {
    if (startsWithUppercase(tokens[index]) && startsWithLowercase(tokens[index + 1])) {
      splitIndex = index - 1
      break
    }
  }

  if (splitIndex < 0) {
    const firstLowerIndex = tokens.findIndex(
      (token, index) => index > 0 && startsWithLowercase(token)
    )
    if (firstLowerIndex > 1) {
      splitIndex = firstLowerIndex - 1
    }
  }

  if (splitIndex < 0) {
    splitIndex = Math.min(tokens.length - 1, 1)
  }

  const name = tokens.slice(0, splitIndex + 1).join(' ').trim()
  const description = tokens.slice(splitIndex + 1).join(' ').trim()

  if (!name || name.length < 2 || isLikelyCategoryName(name)) {
    return { nextCategory }
  }

  return {
    name,
    description: description || undefined,
    nextCategory,
  }
}

function parseMenuDeterministically(rawText: string): DeterministicParseResult {
  const normalizedText = normalizeInlineText(rawText)
  const priceRegex = /\$((?:\d\s*){1,3}(?:\.\s*(?:\d\s*){2})?)/g
  let cursor = 0
  let currentCategory = 'Uncategorized'
  let priceMatches = 0

  const categoriesByName = new Map<string, number>()
  const items: ParsedItem[] = []

  let match: RegExpExecArray | null = priceRegex.exec(normalizedText)
  while (match) {
    const compactPrice = match[1].replace(/\s+/g, '')
    const hasDecimals = compactPrice.includes('.')
    const isIntegerWithEnoughDigits = /^\d{2,3}$/.test(compactPrice)
    const isDecimalPrice = /^\d{1,3}\.\d{2}$/.test(compactPrice)
    const isValidPrice = isDecimalPrice || (!hasDecimals && isIntegerWithEnoughDigits)

    const chunk = normalizedText.slice(cursor, match.index).trim()
    cursor = match.index + match[0].length

    if (!isValidPrice) {
      match = priceRegex.exec(normalizedText)
      continue
    }

    priceMatches += 1
    const parsed = parseDeterministicItemChunk(chunk, currentCategory)
    currentCategory = parsed.nextCategory
    if (!parsed.name) {
      match = priceRegex.exec(normalizedText)
      continue
    }

    if (!categoriesByName.has(currentCategory)) {
      categoriesByName.set(currentCategory, categoriesByName.size)
    }

    const categoryIndex = categoriesByName.get(currentCategory) ?? 0
    items.push({
      name: parsed.name,
      description: parsed.description,
      price: Number.parseFloat(compactPrice.replace(/,/g, '')),
      category_name: currentCategory,
      category_index: categoryIndex,
      needs_review: false,
    })

    match = priceRegex.exec(normalizedText)
  }

  const categories: ParsedCategory[] = categoriesByName.size > 0
    ? Array.from(categoriesByName.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([name, index]) => ({ name, display_order: index + 1 }))
    : [{ name: 'Uncategorized', display_order: 1 }]

  return {
    menu: { categories, items },
    priceMatches,
    parsedItems: items.length,
  }
}

function shouldUseDeterministicResult(result: DeterministicParseResult): boolean {
  if (result.priceMatches === 0 || result.parsedItems === 0) {
    return false
  }

  const minimumExpectedItems = result.priceMatches <= 3
    ? result.priceMatches
    : Math.ceil(result.priceMatches * 0.75)

  if (result.parsedItems < minimumExpectedItems) {
    return false
  }

  const describedItems = result.menu.items.filter((item) => !!item.description && item.description.length >= 6).length
  if (result.parsedItems >= 5 && describedItems / result.parsedItems < 0.5) {
    return false
  }

  return true
}

function withAllItemsNeedingReview(menu: ParsedMenu): ParsedMenu {
  return {
    categories: menu.categories,
    items: menu.items.map((item) => ({
      ...item,
      needs_review: true,
    })),
  }
}

function toPositivePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Number.parseFloat(value.toFixed(2))
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/[^0-9.]/g, '').trim()
  if (!normalized) {
    return null
  }

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Number.parseFloat(parsed.toFixed(2))
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }
  return undefined
}

function toOptionalInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) ? parsed : undefined
}

function normalizeItemName(value: unknown): string {
  return toString(value).replace(/\s+/g, ' ').trim()
}

function normalizeDescription(value: unknown): string | undefined {
  const description = toString(value).replace(/\s+/g, ' ').trim()
  return description || undefined
}

function normalizeEmoji(value: unknown): string | undefined {
  const emoji = toString(value).trim()
  if (!emoji || emoji.length > 8) {
    return undefined
  }
  return emoji
}

function toOptionalConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  if (value < 0 || value > 1) {
    return null
  }
  return value
}

function inferUploadKind(params: {
  fileName?: string
  filePath?: string
  mimeType?: string
}): UploadKind {
  const mimeType = params.mimeType?.toLowerCase() ?? ''
  if (mimeType.includes('pdf')) {
    return 'pdf'
  }
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  if (mimeType.startsWith('text/')) {
    return 'text'
  }

  const suffix = `${params.filePath ?? ''} ${params.fileName ?? ''}`.toLowerCase()
  if (suffix.match(/\.pdf(\?|$)/)) {
    return 'pdf'
  }
  if (suffix.match(/\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff)(\?|$)/)) {
    return 'image'
  }
  if (suffix.match(/\.txt(\?|$)/)) {
    return 'text'
  }

  return 'unknown'
}

function isSupportedUploadKind(kind: UploadKind): boolean {
  return kind === 'pdf' || kind === 'image' || kind === 'text'
}

function getAnthropicConfig(): AnthropicConfig {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim() ?? ''
  const configuredModel = Deno.env.get('ANTHROPIC_MODEL')?.trim() ?? ''
  const timeoutRaw = Deno.env.get('ANTHROPIC_TIMEOUT_MS')?.trim() ?? ''
  const parsedTimeout = Number.parseInt(timeoutRaw, 10)

  return {
    apiKey,
    model: configuredModel || DEFAULT_ANTHROPIC_MODEL,
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout >= 5_000
        ? parsedTimeout
        : DEFAULT_ANTHROPIC_TIMEOUT_MS,
  }
}

function buildDeterministicCandidate(rawText: string): ParsedMenuCandidate | null {
  const normalizedRawText = rawText.trim()
  if (!normalizedRawText || normalizedRawText.length < MIN_TEXT_LENGTH_FOR_DETERMINISTIC) {
    return null
  }

  if (isLikelyCorruptedText(normalizedRawText)) {
    return null
  }

  const deterministicResult = parseMenuDeterministically(normalizedRawText)
  if (deterministicResult.menu.items.length === 0) {
    return null
  }

  if (shouldUseDeterministicResult(deterministicResult)) {
    return {
      menu: deterministicResult.menu,
      warning: null,
    }
  }

  return {
    menu: withAllItemsNeedingReview(deterministicResult.menu),
    warning: 'Deterministic parser confidence is low. Review menu manually.',
  }
}

function withFallbackWarning(message: string, fallback: ParsedMenuCandidate): string {
  if (!fallback.warning) {
    return message
  }
  return `${message} ${fallback.warning}`
}

function isImageMimeType(value: string | undefined): boolean {
  return !!value && value.toLowerCase().startsWith('image/')
}

function isImagePath(value: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif|bmp|tif|tiff)$/i.test(value)
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function markUpload(
  admin: SupabaseClient | null,
  uploadId: string | undefined,
  payload: { status: 'processing' | 'completed' | 'failed'; parsed_data?: unknown; error_message?: string | null }
) {
  if (!admin || !uploadId) {
    return
  }

  await admin
    .from('menu_uploads')
    .update(payload)
    .eq('id', uploadId)
}

function buildEmptyMenu(): ParsedMenu {
  return {
    categories: [{ name: 'Uncategorized', display_order: 1 }],
    items: [],
  }
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

function toPositionedPdfEntry(item: unknown): PositionedPdfEntry | null {
  if (!isRecord(item) || typeof item.str !== 'string') {
    return null
  }

  const str = item.str.replace(/\s+/g, ' ').trim()
  if (!str) {
    return null
  }

  const transform = item.transform
  if (
    !Array.isArray(transform) ||
    transform.length < 6 ||
    typeof transform[4] !== 'number' ||
    typeof transform[5] !== 'number'
  ) {
    return null
  }

  const width = typeof item.width === 'number' && Number.isFinite(item.width)
    ? item.width
    : Math.max(str.length * 3, 1)
  const height = typeof item.height === 'number' && Number.isFinite(item.height)
    ? item.height
    : 0

  return {
    str,
    x: transform[4],
    y: transform[5],
    width,
    height,
  }
}

function joinPdfLineEntries(entries: PositionedPdfEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.x - b.x)
  let output = ''
  let previousRightEdge: number | null = null

  for (const entry of sorted) {
    if (!entry.str) {
      continue
    }

    if (!output) {
      output = entry.str
      previousRightEdge = entry.x + Math.max(entry.width, entry.str.length * 3)
      continue
    }

    const gap = previousRightEdge === null ? entry.x : entry.x - previousRightEdge
    const needsSpace = gap > 1 && !output.endsWith('-')
    output += `${needsSpace ? ' ' : ''}${entry.str}`
    previousRightEdge = Math.max(previousRightEdge ?? 0, entry.x + Math.max(entry.width, entry.str.length * 3))
  }

  return output.trim()
}

function isLikelyHeadingLine(value: string): boolean {
  const cleaned = value
    .replace(/^n\s+/i, '')
    .replace(/[^A-Za-z&/\- ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return false
  }

  const words = cleaned.split(' ')
  if (words.length === 0 || words.length > 4) {
    return false
  }

  const letters = cleaned.replace(/[^A-Za-z]/g, '')
  return !!letters && letters === letters.toUpperCase()
}

function isTagLine(value: string): boolean {
  return /^\[[^\]]+\]$/.test(value.trim())
}

function isStandalonePriceLine(value: string): boolean {
  return /^\$\s*\d{1,3}(?:\.\d{2})?$/.test(value.trim())
}

function looksLikeDescriptionLine(value: string): boolean {
  const line = value.trim()
  if (!line || line.includes('$')) {
    return false
  }
  if (isStandalonePriceLine(line) || isLikelyHeadingLine(line) || isTagLine(line)) {
    return false
  }

  if (/^[a-z]/.test(line)) {
    return true
  }
  if (line.includes(',')) {
    return true
  }

  const words = line.split(/\s+/).filter(Boolean)
  if (words.length >= 5) {
    return true
  }

  return words.length >= 2 && words.some((word) => /^[a-z]/.test(word))
}

function extractTrailingPrice(value: string): InlinePriceMatch | null {
  const match = value.trim().match(/^(.*?)(\$\s*\d{1,3}(?:\.\d{2})?)$/)
  if (!match) {
    return null
  }

  const prefix = match[1]?.trim() ?? ''
  if (!prefix) {
    return null
  }

  return {
    prefix,
    price: match[2].replace(/\s+/g, ''),
  }
}

function repositionPriceLines(lines: string[]): string[] {
  const movedStandalone = [...lines]
  const removeIndexes = new Set<number>()

  for (let index = 0; index < movedStandalone.length; index += 1) {
    const current = movedStandalone[index]?.trim() ?? ''
    if (!isStandalonePriceLine(current)) {
      continue
    }

    let target = index + 1
    while (target < movedStandalone.length) {
      const candidate = movedStandalone[target]?.trim() ?? ''
      if (!candidate) {
        target += 1
        continue
      }
      if (isLikelyHeadingLine(candidate) || isTagLine(candidate)) {
        target += 1
        continue
      }
      break
    }

    if (target >= movedStandalone.length) {
      continue
    }

    let blockEnd = target
    while (blockEnd + 1 < movedStandalone.length && looksLikeDescriptionLine(movedStandalone[blockEnd + 1] ?? '')) {
      blockEnd += 1
    }

    movedStandalone[blockEnd] = `${movedStandalone[blockEnd]} ${current}`.trim()
    removeIndexes.add(index)
  }

  const withStandaloneRepositioned = movedStandalone
    .filter((_, index) => !removeIndexes.has(index))
    .map((line) => line.trim())
    .filter(Boolean)

  for (let index = 0; index < withStandaloneRepositioned.length; index += 1) {
    const match = extractTrailingPrice(withStandaloneRepositioned[index] ?? '')
    if (!match) {
      continue
    }

    const nextLine = withStandaloneRepositioned[index + 1] ?? ''
    if (!looksLikeDescriptionLine(nextLine)) {
      continue
    }

    let blockEnd = index + 1
    while (
      blockEnd + 1 < withStandaloneRepositioned.length &&
      looksLikeDescriptionLine(withStandaloneRepositioned[blockEnd + 1] ?? '')
    ) {
      blockEnd += 1
    }

    withStandaloneRepositioned[index] = match.prefix
    withStandaloneRepositioned[blockEnd] = `${withStandaloneRepositioned[blockEnd]} ${match.price}`.trim()
  }

  return withStandaloneRepositioned
    .map((line) => line.trim())
    .filter(Boolean)
}

function reconstructTextFromPdfItems(items: unknown[]): string {
  const positionedEntries = items
    .map((item) => toPositionedPdfEntry(item))
    .filter((entry): entry is PositionedPdfEntry => entry !== null)

  if (positionedEntries.length === 0) {
    return items
      .map((item) => {
        if (isRecord(item) && typeof item.str === 'string') {
          return item.str
        }
        return ''
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const heights = positionedEntries
    .map((entry) => entry.height)
    .filter((height) => height > 0)
  const medianHeight = heights.length > 0 ? median(heights) : 10
  const lineTolerance = Math.max(2, Math.min(6, medianHeight * 0.45))

  const sortedEntries = [...positionedEntries].sort((a, b) => (b.y - a.y) || (a.x - b.x))
  const lines: PositionedPdfLine[] = []

  for (const entry of sortedEntries) {
    let bestLineIndex = -1
    let bestDistance = Number.POSITIVE_INFINITY

    for (let index = 0; index < lines.length; index += 1) {
      const distance = Math.abs(lines[index].y - entry.y)
      if (distance <= lineTolerance && distance < bestDistance) {
        bestLineIndex = index
        bestDistance = distance
      }
    }

    if (bestLineIndex === -1) {
      lines.push({ y: entry.y, entries: [entry] })
      continue
    }

    lines[bestLineIndex].entries.push(entry)
  }

  const lineTexts = lines
    .sort((a, b) => b.y - a.y)
    .map((line) => joinPdfLineEntries(line.entries))
    .map((line) => line.trim())
    .filter(Boolean)

  return repositionPriceLines(lineTexts).join('\n')
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import('https://esm.sh/pdfjs-dist@5.5.207/legacy/build/pdf.mjs')
    const task = pdfjs.getDocument({
      data: bytes,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/standard_fonts/',
      useSystemFonts: true,
    })
    const pdf = await task.promise

    const pageTexts: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      pageTexts.push(reconstructTextFromPdfItems(textContent.items))
    }

    return pageTexts.join('\n')
  } catch {
    return ''
  }
}

async function downloadStoredUpload(params: {
  admin: SupabaseClient
  filePath: string
}): Promise<StoredUpload> {
  const { data, error } = await params.admin.storage
    .from('menu-uploads')
    .download(params.filePath)

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not download file from storage')
  }

  return {
    bytes: new Uint8Array(await data.arrayBuffer()),
    contentType: data.type?.toLowerCase() ?? '',
  }
}

async function extractTextFromStoredUpload(params: {
  upload: StoredUpload
  filePath: string
  mimeType?: string
}): Promise<string> {
  const contentType = params.mimeType?.toLowerCase() || params.upload.contentType || ''
  const isPdf = contentType.includes('pdf') || params.filePath.toLowerCase().endsWith('.pdf')
  const isImage = isImageMimeType(contentType) || isImagePath(params.filePath)

  if (isPdf) {
    const extractedPdfText = await extractPdfText(params.upload.bytes)
    if (extractedPdfText.trim().length > 0) {
      return extractedPdfText
    }
    return ''
  }

  if (isImage) {
    return ''
  }

  return new TextDecoder().decode(params.upload.bytes)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function isTransientRequestError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  return error.name === 'AbortError' || error instanceof TypeError
}

function buildModelCandidates(primaryModel: string): string[] {
  const candidates = [primaryModel, DEFAULT_ANTHROPIC_MODEL, FALLBACK_ANTHROPIC_MODEL]
  const unique: string[] = []

  for (const candidate of candidates) {
    const normalized = candidate.trim()
    if (!normalized || unique.includes(normalized)) {
      continue
    }
    unique.push(normalized)
  }

  return unique
}

function isModelUnavailableError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    (lower.includes('model') && lower.includes('not found')) ||
    (lower.includes('model') && lower.includes('does not exist')) ||
    (lower.includes('model') && lower.includes('retired')) ||
    lower.includes('unsupported model')
  )
}

function isStructuredOutputUnsupportedError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('output format') ||
    lower.includes('output_config') ||
    lower.includes('json_schema')
  )
}

function isStructuredOutputParsingError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('structured menu output') ||
    lower.includes('output schema could not be normalized')
  )
}

function isAuthenticationError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('api key') ||
    lower.includes('authentication') ||
    lower.includes('unauthorized')
  )
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function readAnthropicErrorMessage(response: Response): Promise<string> {
  const fallback = `Anthropic request failed (${response.status})`

  try {
    const payload = await response.json()
    if (!isRecord(payload)) {
      return fallback
    }

    const errorRecord = payload.error
    if (isRecord(errorRecord) && typeof errorRecord.message === 'string') {
      return errorRecord.message
    }

    return fallback
  } catch {
    return fallback
  }
}

async function uploadFileToAnthropic(params: {
  config: AnthropicConfig
  upload: StoredUpload
  fileName: string
  mimeType?: string
}): Promise<string> {
  const contentType = params.mimeType || params.upload.contentType || 'application/octet-stream'
  const maxAttempts = 2

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const body = new FormData()
      body.append('file', new Blob([params.upload.bytes], { type: contentType }), params.fileName)
      body.append('purpose', 'user_data')

      const response = await fetchWithTimeout(
        `${ANTHROPIC_API_BASE}/v1/files`,
        {
          method: 'POST',
          headers: {
            'x-api-key': params.config.apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'anthropic-beta': ANTHROPIC_FILES_BETA,
          },
          body,
        },
        params.config.timeoutMs
      )

      if (!response.ok) {
        const message = await readAnthropicErrorMessage(response)
        if (attempt < maxAttempts - 1 && isRetryableStatus(response.status)) {
          await wait(RETRY_BACKOFF_MS * (attempt + 1))
          continue
        }
        throw new Error(message)
      }

      const payload = await response.json()
      const fileId = isRecord(payload) && typeof payload.id === 'string' ? payload.id : ''
      if (!fileId) {
        throw new Error('Anthropic file upload did not return a file id')
      }
      return fileId
    } catch (error) {
      if (attempt < maxAttempts - 1 && isTransientRequestError(error)) {
        await wait(RETRY_BACKOFF_MS * (attempt + 1))
        continue
      }
      throw error
    }
  }

  throw new Error('Anthropic file upload failed')
}

async function deleteAnthropicFile(config: AnthropicConfig, fileId: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${ANTHROPIC_API_BASE}/v1/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          'x-api-key': config.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-beta': ANTHROPIC_FILES_BETA,
        },
      },
      Math.min(10_000, config.timeoutMs)
    )
  } catch {
    // Ignore cleanup failures.
  }
}

function parseStructuredOutputText(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    const withoutFence = trimmed
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()
    if (!withoutFence) {
      return null
    }

    try {
      return JSON.parse(withoutFence)
    } catch {
      return null
    }
  }
}

function extractStructuredOutput(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.content)) {
    return null
  }

  for (const block of payload.content) {
    if (!isRecord(block) || typeof block.type !== 'string') {
      continue
    }

    if (block.type === 'output_json' && isRecord(block.json)) {
      return block.json
    }

    if (block.type === 'text' && typeof block.text === 'string') {
      const parsed = parseStructuredOutputText(block.text)
      if (parsed !== null) {
        return parsed
      }
    }
  }

  return null
}

function normalizeClaudeMenu(payload: unknown): ParsedFromClaude | null {
  if (!isRecord(payload)) {
    return null
  }

  const rawCategories = Array.isArray(payload.categories) ? payload.categories : []
  const rawItems = Array.isArray(payload.items) ? payload.items : []

  const categories: ParsedCategory[] = []
  const categoryNameToIndex = new Map<string, number>()
  const categoryNamesByOrder: string[] = []

  const ensureCategory = (value: string): number => {
    const normalizedName = normalizeCategoryName(value)
    const key = normalizedName.toLowerCase()
    const existingIndex = categoryNameToIndex.get(key)
    if (typeof existingIndex === 'number') {
      return existingIndex
    }

    const nextIndex = categories.length
    categories.push({
      name: normalizedName,
      display_order: nextIndex + 1,
    })
    categoryNameToIndex.set(key, nextIndex)
    categoryNamesByOrder[nextIndex] = normalizedName
    return nextIndex
  }

  for (const category of rawCategories) {
    if (!isRecord(category)) {
      continue
    }
    const name = normalizeItemName(category.name)
    if (!name) {
      continue
    }
    ensureCategory(name)
  }

  if (categories.length === 0) {
    ensureCategory('Uncategorized')
  }

  const items: ParsedItem[] = []
  let droppedItems = 0

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      droppedItems += 1
      continue
    }

    const name = normalizeItemName(rawItem.name)
    const price = toPositivePrice(rawItem.price)
    if (!name || name.length < 2 || price === null) {
      droppedItems += 1
      continue
    }

    const requestedCategoryName = normalizeItemName(rawItem.category_name)
    const requestedCategoryIndex = toOptionalInteger(rawItem.category_index)

    let resolvedCategoryName = requestedCategoryName
    if (!resolvedCategoryName && typeof requestedCategoryIndex === 'number') {
      resolvedCategoryName = categoryNamesByOrder[requestedCategoryIndex] ?? ''
    }
    if (!resolvedCategoryName) {
      resolvedCategoryName = 'Uncategorized'
    }

    const resolvedCategoryIndex = ensureCategory(resolvedCategoryName)

    items.push({
      name,
      description: normalizeDescription(rawItem.description),
      price,
      category_name: categories[resolvedCategoryIndex]?.name,
      category_index: resolvedCategoryIndex,
      emoji: normalizeEmoji(rawItem.emoji),
      is_popular: toOptionalBoolean(rawItem.is_popular) ?? false,
      is_new: toOptionalBoolean(rawItem.is_new) ?? false,
      needs_review: toOptionalBoolean(rawItem.needs_review) ?? false,
    })
  }

  const confidence = toOptionalConfidence(payload.confidence)
  const dropRatio = rawItems.length > 0 ? droppedItems / rawItems.length : 0
  const lowConfidence =
    (confidence !== null && confidence < 0.65) ||
    dropRatio > 0.35 ||
    (items.length > 0 && items.length <= 2 && rawItems.length >= 4)

  const normalizedMenu: ParsedMenu = {
    categories: categories.map((category, index) => ({
      name: category.name,
      display_order: index + 1,
    })),
    items: lowConfidence
      ? items.map((item) => ({
          ...item,
          needs_review: true,
        }))
      : items,
  }

  return {
    menu: normalizedMenu,
    inputItems: rawItems.length,
    droppedItems,
    lowConfidence,
  }
}

async function parseMenuWithClaude(params: {
  config: AnthropicConfig
  upload: StoredUpload
  fileName: string
  mimeType?: string
  uploadKind: UploadKind
}): Promise<ParsedFromClaude> {
  const fileId = await uploadFileToAnthropic({
    config: params.config,
    upload: params.upload,
    fileName: params.fileName,
    mimeType: params.mimeType,
  })

  try {
    const contentBlock = params.uploadKind === 'image'
      ? { type: 'image', source: { type: 'file', file_id: fileId } }
      : { type: 'document', source: { type: 'file', file_id: fileId } }
    const callClaude = async (model: string, useStructuredOutput: boolean): Promise<ParsedFromClaude> => {
      const maxAttempts = 2

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const userPrompt = useStructuredOutput
            ? CLAUDE_PARSE_PROMPT
            : `${CLAUDE_PARSE_PROMPT} ${CLAUDE_JSON_ONLY_PROMPT}`

          const requestBody: Record<string, unknown> = {
            model,
            max_tokens: 4096,
            system: 'You extract structured restaurant menu data from uploaded files.',
            messages: [
              {
                role: 'user',
                content: [
                  contentBlock,
                  { type: 'text', text: userPrompt },
                ],
              },
            ],
          }

          if (useStructuredOutput) {
            requestBody.output_config = {
              format: {
                type: 'json_schema',
                schema: MENU_OUTPUT_SCHEMA,
              },
            }
          }

          const response = await fetchWithTimeout(
            `${ANTHROPIC_API_BASE}/v1/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': params.config.apiKey,
                'anthropic-version': ANTHROPIC_VERSION,
                'anthropic-beta': ANTHROPIC_FILES_BETA,
              },
              body: JSON.stringify(requestBody),
            },
            params.config.timeoutMs
          )

          if (!response.ok) {
            const message = await readAnthropicErrorMessage(response)
            if (attempt < maxAttempts - 1 && isRetryableStatus(response.status)) {
              await wait(RETRY_BACKOFF_MS * (attempt + 1))
              continue
            }
            throw new Error(message)
          }

          const payload = await response.json()
          const extracted = extractStructuredOutput(payload)
          if (!extracted) {
            throw new Error('Claude response did not contain structured menu output')
          }

          const normalized = normalizeClaudeMenu(extracted)
          if (!normalized) {
            throw new Error('Claude output schema could not be normalized')
          }

          return normalized
        } catch (error) {
          if (attempt < maxAttempts - 1 && isTransientRequestError(error)) {
            await wait(RETRY_BACKOFF_MS * (attempt + 1))
            continue
          }
          throw error
        }
      }

      throw new Error('Claude parsing failed after retry')
    }

    const candidateModels = buildModelCandidates(params.config.model)
    let lastError: Error | null = null

    for (const model of candidateModels) {
      try {
        return await callClaude(model, true)
      } catch (structuredError) {
        const normalizedStructuredError =
          structuredError instanceof Error
            ? structuredError
            : new Error('Claude parsing failed')
        lastError = normalizedStructuredError

        if (isAuthenticationError(normalizedStructuredError.message)) {
          throw normalizedStructuredError
        }

        if (isModelUnavailableError(normalizedStructuredError.message)) {
          continue
        }

        if (
          isStructuredOutputUnsupportedError(normalizedStructuredError.message) ||
          isStructuredOutputParsingError(normalizedStructuredError.message)
        ) {
          try {
            return await callClaude(model, false)
          } catch (jsonError) {
            const normalizedJsonError =
              jsonError instanceof Error
                ? jsonError
                : new Error('Claude parsing failed')
            lastError = normalizedJsonError

            if (isAuthenticationError(normalizedJsonError.message)) {
              throw normalizedJsonError
            }

            if (isModelUnavailableError(normalizedJsonError.message)) {
              continue
            }
          }
        }
      }
    }

    throw lastError ?? new Error('Claude parsing failed')
  } finally {
    await deleteAnthropicFile(params.config, fileId)
  }
}

async function completeWithMenu(params: {
  admin: SupabaseClient | null
  uploadId?: string
  menu: ParsedMenu
  errorMessage: string | null
}): Promise<Response> {
  await markUpload(params.admin, params.uploadId, {
    status: 'completed',
    parsed_data: params.menu,
    error_message: params.errorMessage,
  })
  return jsonResponse(params.menu)
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: ParseRequest
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400)
  }

  let admin: SupabaseClient | null = null
  try {
    admin = createAdminClient()
  } catch {
    admin = null
  }

  const uploadId = body.uploadId
  const fileName = toString(body.fileName) || 'menu file'
  const filePath = toString(body.filePath)
  let mimeType = toString(body.mimeType).trim().toLowerCase() || undefined
  let rawText = toString(body.rawText).trim()

  await markUpload(admin, uploadId, { status: 'processing', error_message: null })

  const uploadKind = inferUploadKind({
    fileName,
    filePath,
    mimeType,
  })

  if (!isSupportedUploadKind(uploadKind)) {
    const fallback = buildDeterministicCandidate(rawText)
    if (fallback) {
      return completeWithMenu({
        admin,
        uploadId,
        menu: fallback.menu,
        errorMessage: withFallbackWarning(
          'Unsupported file type for Claude parsing. Parsed from fallback text; review before publishing.',
          fallback
        ),
      })
    }

    return completeWithMenu({
      admin,
      uploadId,
      menu: buildEmptyMenu(),
      errorMessage: 'Unsupported file type. Upload a PDF, image, or TXT file.',
    })
  }

  let upload: StoredUpload | null = null
  if (filePath) {
    try {
      if (!admin) {
        throw new Error('Parser storage access is unavailable')
      }
      upload = await downloadStoredUpload({ admin, filePath })
      if (!mimeType && upload.contentType) {
        mimeType = upload.contentType
      }
    } catch (downloadError) {
      const fallback = buildDeterministicCandidate(rawText)
      if (fallback) {
        return completeWithMenu({
          admin,
          uploadId,
          menu: fallback.menu,
          errorMessage: withFallbackWarning(
            'Could not load upload from storage. Parsed from fallback text; review before publishing.',
            fallback
          ),
        })
      }

      const message = downloadError instanceof Error ? downloadError.message : 'Could not load menu file'
      return completeWithMenu({
        admin,
        uploadId,
        menu: buildEmptyMenu(),
        errorMessage: `${message}. Retry upload or review manually.`,
      })
    }
  }

  if (upload && upload.bytes.length > MAX_SYNC_UPLOAD_BYTES) {
    return completeWithMenu({
      admin,
      uploadId,
      menu: buildEmptyMenu(),
      errorMessage: 'File is too large for synchronous parsing. Keep uploads under 20MB.',
    })
  }

  const anthropicConfig = getAnthropicConfig()
  if (!anthropicConfig.apiKey) {
    if (!rawText && upload && filePath) {
      rawText = (await extractTextFromStoredUpload({
        upload,
        filePath,
        mimeType,
      })).trim()
    }

    const fallback = buildDeterministicCandidate(rawText)
    if (fallback) {
      return completeWithMenu({
        admin,
        uploadId,
        menu: fallback.menu,
        errorMessage: withFallbackWarning(
          'Claude parser is not configured. Parsed with deterministic fallback; review before publishing.',
          fallback
        ),
      })
    }

    return completeWithMenu({
      admin,
      uploadId,
      menu: buildEmptyMenu(),
      errorMessage: 'Claude parser is not configured. Add Anthropic secrets and retry.',
    })
  }

  if (!upload) {
    const fallback = buildDeterministicCandidate(rawText)
    if (fallback) {
      return completeWithMenu({
        admin,
        uploadId,
        menu: fallback.menu,
        errorMessage: withFallbackWarning(
          'Parsed from fallback text because uploaded file bytes were unavailable.',
          fallback
        ),
      })
    }

    return completeWithMenu({
      admin,
      uploadId,
      menu: buildEmptyMenu(),
      errorMessage: 'Menu file bytes are unavailable for Claude parsing. Retry upload or review manually.',
    })
  }

  try {
    const claudeParsed = await parseMenuWithClaude({
      config: anthropicConfig,
      upload,
      fileName,
      mimeType,
      uploadKind,
    })

    if (claudeParsed.menu.items.length === 0) {
      if (!rawText && filePath) {
        rawText = (await extractTextFromStoredUpload({
          upload,
          filePath,
          mimeType,
        })).trim()
      }

      const fallback = buildDeterministicCandidate(rawText)
      if (fallback) {
        return completeWithMenu({
          admin,
          uploadId,
          menu: fallback.menu,
          errorMessage: withFallbackWarning(
            'Claude returned no items. Parsed with deterministic fallback; review before publishing.',
            fallback
          ),
        })
      }

      return completeWithMenu({
        admin,
        uploadId,
        menu: buildEmptyMenu(),
        errorMessage: 'Could not extract enough menu items. Try a clearer file or enter items manually.',
      })
    }

    const dropRatio = claudeParsed.inputItems > 0
      ? claudeParsed.droppedItems / claudeParsed.inputItems
      : 0
    const qualityMessage = claudeParsed.lowConfidence || dropRatio > 0.35
      ? 'Claude parse confidence is low. Review all items before publishing.'
      : null

    return completeWithMenu({
      admin,
      uploadId,
      menu: claudeParsed.menu,
      errorMessage: qualityMessage,
    })
  } catch (claudeError) {
    if (!rawText && filePath) {
      rawText = (await extractTextFromStoredUpload({
        upload,
        filePath,
        mimeType,
      })).trim()
    }

    const fallback = buildDeterministicCandidate(rawText)
    if (fallback) {
      return completeWithMenu({
        admin,
        uploadId,
        menu: fallback.menu,
        errorMessage: withFallbackWarning(
          'Claude parsing failed. Deterministic fallback was used; review before publishing.',
          fallback
        ),
      })
    }

    const message = claudeError instanceof Error ? claudeError.message : 'Claude parsing failed'
    return completeWithMenu({
      admin,
      uploadId,
      menu: buildEmptyMenu(),
      errorMessage: `${message}. Retry upload or enter items manually.`,
    })
  }
})
