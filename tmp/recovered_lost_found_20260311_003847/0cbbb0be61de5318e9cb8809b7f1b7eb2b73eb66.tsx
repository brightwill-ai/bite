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
  const fileName = body.fileName ?? 'menu file'
  const filePath = toString(body.filePath)
  let mimeType = toString(body.mimeType).trim().toLowerCase() || undefined

  await markUpload(admin, uploadId, { status: 'processing', error_message: null })

  let rawText = toString(body.rawText).trim()

  const inputLooksLikeImage = () =>
    isImageMimeType(mimeType) || isImagePath(filePath) || isImagePath(fileName)

  if (!rawText && filePath) {
    try {
      if (!admin) {
        throw new Error('Parser storage access is unavailable')
      }
      const storedUpload = await downloadStoredUpload({ admin, filePath })

      if (!mimeType && storedUpload.contentType) {
        mimeType = storedUpload.contentType
      }

      rawText = (await extractTextFromStoredUpload({
        upload: storedUpload,
        filePath,
        mimeType,
      })).trim()
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Could not load menu file'
      await markUpload(admin, uploadId, {
        status: 'completed',
        parsed_data: buildEmptyMenu(),
        error_message: `${message}. Review menu manually.`,
      })
      return jsonResponse(buildEmptyMenu())
    }
  }

  if (inputLooksLikeImage() && !rawText) {
    const message = 'Could not extract text from that image. Try again with a clearer image or upload a PDF/TXT file.'
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: buildEmptyMenu(),
      error_message: message,
    })
    return jsonResponse(buildEmptyMenu())
  }

  if (!rawText || rawText.length < 20) {
    const fallback = buildEmptyMenu()
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: fallback,
      error_message: 'Could not extract enough text. Review menu manually.',
    })
    return jsonResponse(fallback)
  }

  if (isLikelyCorruptedText(rawText)) {
    const fallback = buildEmptyMenu()
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: fallback,
      error_message: 'Extracted text appears corrupted. Upload a text-based PDF/TXT and review manually.',
    })
    return jsonResponse(fallback)
  }

  const deterministicResult = parseMenuDeterministically(rawText)
  if (deterministicResult.menu.items.length === 0) {
    const fallback = buildEmptyMenu()
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: fallback,
      error_message: 'Could not extract enough structured menu items. Review menu manually.',
    })
    return jsonResponse(fallback)
  }

  if (shouldUseDeterministicResult(deterministicResult)) {
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: deterministicResult.menu,
      error_message: null,
    })
    return jsonResponse(deterministicResult.menu)
  }

  const bestEffort = withAllItemsNeedingReview(deterministicResult.menu)
  await markUpload(admin, uploadId, {
    status: 'completed',
    parsed_data: bestEffort,
    error_message: 'Deterministic parser confidence is low. Review menu manually.',
  })
  return jsonResponse(bestEffort)
})
