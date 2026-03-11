import { NextRequest, NextResponse } from 'next/server'
import Tesseract from 'tesseract.js'

const SUPPORTED_IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i

export const runtime = 'nodejs'

function isImageMimeType(value: string): boolean {
  return value.toLowerCase().startsWith('image/')
}

function isSupportedImageName(value: string): boolean {
  return SUPPORTED_IMAGE_EXTENSION.test(value)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!isImageMimeType(file.type) && !isSupportedImageName(file.name)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await Tesseract.recognize(buffer, 'eng')
    return NextResponse.json({ text: result.data.text ?? '' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract image text'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
