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
  fileData?: string
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

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function normalizeInlineText(value: string): string {
  return value
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
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

function normalizeParsedMenu(raw: unknown): ParsedMenu {
  if (!isRecord(raw)) {
    return {
      categories: [{ name: 'Uncategorized', display_order: 1 }],
      items: [],
    }
  }

  const rawCategories = Array.isArray(raw.categories) ? raw.categories : []
  const rawItems = Array.isArray(raw.items) ? raw.items : []

  const categories: ParsedCategory[] = rawCategories
    .map((category, index) => {
      if (!isRecord(category)) {
        return null
      }
      const name = toString(category.name).trim()
      if (!name) {
        return null
      }
      return {
        name,
        display_order: toNumber(category.display_order, index + 1),
      }
    })
    .filter((category): category is ParsedCategory => category !== null)

  const safeCategories = categories.length > 0 ? categories : [{ name: 'Uncategorized', display_order: 1 }]

  const items: ParsedItem[] = rawItems
    .map((item) => {
      if (!isRecord(item)) {
        return null
      }

      const name = toString(item.name).trim()
      const price = toNumber(item.price, NaN)
      if (!name || !Number.isFinite(price)) {
        return null
      }

      return {
        name,
        description: toString(item.description).trim() || undefined,
        price,
        category_name: toString(item.category_name).trim() || undefined,
        category_index: Number.isFinite(toNumber(item.category_index, NaN))
          ? toNumber(item.category_index, NaN)
          : undefined,
        emoji: toString(item.emoji).trim() || undefined,
        is_popular: toBoolean(item.is_popular),
        is_new: toBoolean(item.is_new),
        needs_review: toBoolean(item.needs_review),
      }
    })
    .filter((item): item is ParsedItem => item !== null)

  return {
    categories: safeCategories,
    items,
  }
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
  admin: SupabaseClient,
  uploadId: string | undefined,
  payload: { status: 'processing' | 'completed' | 'failed'; parsed_data?: unknown; error_message?: string | null }
) {
  if (!uploadId) {
    return
  }

  await admin
    .from('menu_uploads')
    .update(payload)
    .eq('id', uploadId)
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import('https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs')
    const task = pdfjs.getDocument({
      data: bytes,
      disableWorker: true,
      useSystemFonts: true,
    })
    const pdf = await task.promise

    const pageTexts: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item: unknown) => {
          if (isRecord(item) && typeof item.str === 'string') {
            return item.str
          }
          return ''
        })
        .join(' ')
      pageTexts.push(text)
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

  if (isPdf) {
    const extractedPdfText = await extractPdfText(params.upload.bytes)
    if (extractedPdfText.trim().length > 0) {
      return extractedPdfText
    }
  }

  return new TextDecoder().decode(params.upload.bytes)
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function extractJsonText(value: string): string {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced && fenced[1]) {
    return fenced[1].trim()
  }

  const firstBrace = value.indexOf('{')
  const lastBrace = value.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return value.slice(firstBrace, lastBrace + 1).trim()
  }

  return value.trim()
}

async function parseWithClaude(params: {
  apiKey: string
  fileName: string
  rawText: string
  fileData?: string
  mimeType?: string
}): Promise<ParsedMenu> {
  const isImage = params.mimeType?.startsWith('image/')

  type TextBlock = { type: 'text'; text: string }
  type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  type ContentBlock = TextBlock | ImageBlock

  let userContent: string | ContentBlock[]

  if (isImage && params.fileData && params.mimeType) {
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: params.mimeType, data: params.fileData },
      },
      {
        type: 'text',
        text: `File: ${params.fileName}\n\nParse the restaurant menu visible in this image.`,
      },
    ]
  } else {
    userContent = `File: ${params.fileName}\n\nMenu text:\n${params.rawText.slice(0, 30000)}`
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      system:
        'You parse restaurant menus into strict JSON with this shape: {"categories":[{"name":"string","display_order":number}],"items":[{"name":"string","description":"string","price":number,"category_name":"string","category_index":number,"emoji":"string","is_popular":boolean,"is_new":boolean,"needs_review":boolean}]}. Return JSON only, no markdown.',
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    const errorMessage =
      isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string'
        ? payload.error.message
        : 'Claude parser request failed'
    throw new Error(errorMessage)
  }

  if (!isRecord(payload) || !Array.isArray(payload.content)) {
    throw new Error('Claude parser returned an invalid payload')
  }

  const textBlock = payload.content.find(
    (block: unknown) => isRecord(block) && block.type === 'text' && typeof block.text === 'string'
  )

  if (!isRecord(textBlock) || typeof textBlock.text !== 'string') {
    throw new Error('Claude parser returned empty content')
  }

  const jsonText = extractJsonText(textBlock.text)
  return normalizeParsedMenu(JSON.parse(jsonText))
}

async function parseWithOpenAi(params: {
  apiKey: string
  baseUrl: string
  fileName: string
  rawText: string
  fileData?: string
  mimeType?: string
}): Promise<ParsedMenu> {
  const schema = {
    name: 'menu_parse',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              display_order: { type: 'number' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number' },
              category_name: { type: 'string' },
              category_index: { type: 'number' },
              emoji: { type: 'string' },
              is_popular: { type: 'boolean' },
              is_new: { type: 'boolean' },
              needs_review: { type: 'boolean' },
            },
            required: ['name', 'price'],
            additionalProperties: false,
          },
        },
      },
      required: ['categories', 'items'],
      additionalProperties: false,
    },
  }

  const isImage = params.mimeType?.startsWith('image/')

  type TextPart = { type: 'text'; text: string }
  type ImagePart = { type: 'image_url'; image_url: { url: string } }
  type UserContent = string | Array<TextPart | ImagePart>

  let userContent: UserContent
  if (isImage && params.fileData && params.mimeType) {
    userContent = [
      { type: 'image_url', image_url: { url: `data:${params.mimeType};base64,${params.fileData}` } },
      { type: 'text', text: `File: ${params.fileName}\n\nParse the restaurant menu visible in this image.` },
    ]
  } else {
    userContent = `File: ${params.fileName}\n\nMenu text:\n${params.rawText.slice(0, 30000)}`
  }

  const llmResponse = await fetch(`${params.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4.1-mini',
      temperature: 0.1,
      response_format: {
        type: 'json_schema',
        json_schema: schema,
      },
      messages: [
        {
          role: 'system',
          content:
            'You parse restaurant menus into structured JSON. Keep categories concise. Prices must be decimal numbers in dollars. If uncertain, include needs_review=true on that item.',
        },
        { role: 'user', content: userContent },
      ],
    }),
  })

  const llmData = await llmResponse.json()
  if (!llmResponse.ok) {
    const errorMessage =
      isRecord(llmData) && isRecord(llmData.error) && typeof llmData.error.message === 'string'
        ? llmData.error.message
        : 'OpenAI parser request failed'
    throw new Error(errorMessage)
  }

  if (
    !isRecord(llmData) ||
    !Array.isArray(llmData.choices) ||
    !isRecord(llmData.choices[0]) ||
    !isRecord(llmData.choices[0].message) ||
    typeof llmData.choices[0].message.content !== 'string'
  ) {
    throw new Error('OpenAI parser returned empty content')
  }

  return normalizeParsedMenu(JSON.parse(llmData.choices[0].message.content))
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

  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parser is not configured'
    return jsonResponse({ error: message }, 500)
  }

  const uploadId = body.uploadId
  const fileName = body.fileName ?? 'menu file'
  const filePath = toString(body.filePath)
  let fileData = toString(body.fileData).trim() || undefined
  let mimeType = toString(body.mimeType).trim().toLowerCase() || undefined

  await markUpload(admin, uploadId, { status: 'processing', error_message: null })

  let rawText = toString(body.rawText).trim()
  let deterministicResult: DeterministicParseResult | null = null

  const inputLooksLikeImage = () =>
    isImageMimeType(mimeType) || isImagePath(filePath) || isImagePath(fileName)

  if (!rawText && filePath) {
    try {
      const storedUpload = await downloadStoredUpload({
        admin,
        filePath,
      })

      if (!mimeType && storedUpload.contentType) {
        mimeType = storedUpload.contentType
      }

      if (inputLooksLikeImage()) {
        if (!fileData) {
          fileData = bytesToBase64(storedUpload.bytes)
        }
      } else {
        rawText = (await extractTextFromStoredUpload({
          upload: storedUpload,
          filePath,
          mimeType,
        })).trim()
      }
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Could not load menu file'
      await markUpload(admin, uploadId, {
        status: 'failed',
        error_message: message,
      })
      return jsonResponse({ error: message }, 500)
    }
  }

  if (!inputLooksLikeImage() && rawText.length >= 20) {
    deterministicResult = parseMenuDeterministically(rawText)
    if (shouldUseDeterministicResult(deterministicResult)) {
      await markUpload(admin, uploadId, {
        status: 'completed',
        parsed_data: deterministicResult.menu,
        error_message: null,
      })
      return jsonResponse(deterministicResult.menu)
    }
  }

  if ((!rawText || rawText.length < 20) && !fileData) {
    const fallback: ParsedMenu = {
      categories: [{ name: 'Uncategorized', display_order: 1 }],
      items: [],
    }
    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: fallback,
      error_message: 'Could not extract enough text. Review menu manually.',
    })
    return jsonResponse(fallback)
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const openAiBaseUrl = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1'
  if (!anthropicKey && !openAiKey) {
    if (deterministicResult && deterministicResult.menu.items.length > 0) {
      const bestEffort = withAllItemsNeedingReview(deterministicResult.menu)
      await markUpload(admin, uploadId, {
        status: 'completed',
        parsed_data: bestEffort,
        error_message: 'LLM keys missing. Returned best-effort deterministic parse.',
      })
      return jsonResponse(bestEffort)
    }

    await markUpload(admin, uploadId, {
      status: 'failed',
      error_message: 'Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set',
    })
    return jsonResponse({ error: 'Parser is not configured' }, 500)
  }

  try {
    let normalized: ParsedMenu
    if (anthropicKey) {
      try {
        normalized = await parseWithClaude({
          apiKey: anthropicKey,
          fileName,
          rawText,
          fileData,
          mimeType,
        })
      } catch (claudeError) {
        if (!openAiKey) {
          throw claudeError
        }
        normalized = await parseWithOpenAi({
          apiKey: openAiKey,
          baseUrl: openAiBaseUrl,
          fileName,
          rawText,
          fileData,
          mimeType,
        })
      }
    } else {
      normalized = await parseWithOpenAi({
        apiKey: openAiKey!,
        baseUrl: openAiBaseUrl,
        fileName,
        rawText,
        fileData,
        mimeType,
      })
    }

    await markUpload(admin, uploadId, {
      status: 'completed',
      parsed_data: normalized,
      error_message: null,
    })

    return jsonResponse(normalized)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parser error'

    if (deterministicResult && deterministicResult.menu.items.length > 0) {
      const bestEffort = withAllItemsNeedingReview(deterministicResult.menu)
      await markUpload(admin, uploadId, {
        status: 'completed',
        parsed_data: bestEffort,
        error_message: `${message}. Returned best-effort deterministic parse.`,
      })
      return jsonResponse(bestEffort)
    }

    await markUpload(admin, uploadId, {
      status: 'failed',
      error_message: message,
    })
    return jsonResponse({ error: message }, 500)
  }
})
