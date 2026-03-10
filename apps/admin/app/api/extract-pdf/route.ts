import { NextRequest, NextResponse } from 'next/server'

type TextEntry = { str: string; x: number; y: number }

function reconstructTextFromItems(items: unknown[]): string {
  const entries: TextEntry[] = []

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    const rec = item as Record<string, unknown>
    if (typeof rec.str !== 'string' || !rec.str) continue
    const t = rec.transform
    if (!Array.isArray(t) || t.length < 6 || typeof t[4] !== 'number' || typeof t[5] !== 'number') continue
    entries.push({ str: rec.str, x: t[4], y: t[5] })
  }

  if (entries.length === 0) {
    return items
      .map((item) => {
        if (typeof item !== 'object' || item === null) return ''
        const rec = item as Record<string, unknown>
        return typeof rec.str === 'string' ? rec.str : ''
      })
      .join(' ')
  }

  const LINE_TOLERANCE = 5

  const lineYs: number[] = []
  for (const entry of entries) {
    if (!lineYs.some((y) => Math.abs(y - entry.y) <= LINE_TOLERANCE)) {
      lineYs.push(entry.y)
    }
  }
  lineYs.sort((a, b) => b - a)

  const lineMap = new Map<number, TextEntry[]>()
  for (const y of lineYs) lineMap.set(y, [])

  for (const entry of entries) {
    let bestY = lineYs[0]
    let bestDist = Infinity
    for (const y of lineYs) {
      const dist = Math.abs(entry.y - y)
      if (dist < bestDist) {
        bestDist = dist
        bestY = y
      }
    }
    lineMap.get(bestY)!.push(entry)
  }

  return lineYs
    .map((y) =>
      lineMap
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((e) => e.str)
        .join(' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n')
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
