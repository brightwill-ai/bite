import { NextRequest, NextResponse } from 'next/server'

type PositionedTextEntry = {
  str: string
  x: number
  y: number
  width: number
  height: number
}

type PositionedLine = {
  y: number
  entries: PositionedTextEntry[]
}

type InlinePriceMatch = {
  prefix: string
  price: string
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

function toPositionedTextEntry(item: unknown): PositionedTextEntry | null {
  if (typeof item !== 'object' || item === null) {
    return null
  }

  const rec = item as Record<string, unknown>
  if (typeof rec.str !== 'string') {
    return null
  }

  const str = rec.str.replace(/\s+/g, ' ').trim()
  if (!str) {
    return null
  }

  const t = rec.transform
  if (!Array.isArray(t) || t.length < 6 || typeof t[4] !== 'number' || typeof t[5] !== 'number') {
    return null
  }

  const width = typeof rec.width === 'number' && Number.isFinite(rec.width)
    ? rec.width
    : Math.max(str.length * 3, 1)
  const height = typeof rec.height === 'number' && Number.isFinite(rec.height)
    ? rec.height
    : 0

  return {
    str,
    x: t[4],
    y: t[5],
    width,
    height,
  }
}

function joinLineEntries(entries: PositionedTextEntry[]): string {
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

function reconstructTextFromItems(items: unknown[]): string {
  const positionedEntries = items
    .map((item) => toPositionedTextEntry(item))
    .filter((entry): entry is PositionedTextEntry => entry !== null)

  if (positionedEntries.length === 0) {
    return items
      .map((item) => {
        if (typeof item !== 'object' || item === null) {
          return ''
        }
        const rec = item as Record<string, unknown>
        return typeof rec.str === 'string' ? rec.str : ''
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
  const lines: PositionedLine[] = []

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
    .map((line) => joinLineEntries(line.entries))
    .map((line) => line.trim())
    .filter(Boolean)

  return repositionPriceLines(lineTexts).join('\n')
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const pdf = await pdfjs.getDocument({ data: bytes }).promise
    const pageTexts: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      pageTexts.push(reconstructTextFromItems(content.items))
    }

    return NextResponse.json({ text: pageTexts.join('\n') })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract PDF text'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
