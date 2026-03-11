const SHORTCODE_TO_EMOJI: Record<string, string> = {
  avocado: '🥑',
  bacon: '🥓',
  burger: '🍔',
  cake: '🍰',
  cheese: '🧀',
  chicken: '🍗',
  coffee: '☕',
  cocktail: '🍹',
  cookie: '🍪',
  cup_with_straw: '🥤',
  egg: '🍳',
  fries: '🍟',
  ginger_beer: '🥤',
  hot_pepper: '🌶️',
  leafy_green: '🥬',
  lemon: '🍋',
  mushroom: '🍄',
  onion: '🧅',
  onion_rings: '🧅',
  salad: '🥗',
  sweet_potato: '🍠',
  tea: '🍵',
}

function normalizeEmojiKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/^:+|:+$/g, '')
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

function isAsciiEmojiToken(value: string): boolean {
  return /^[a-z0-9_:+-]+$/i.test(value)
}

export function normalizeMenuEmoji(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const mapped = SHORTCODE_TO_EMOJI[normalizeEmojiKey(trimmed)]
  if (mapped) {
    return mapped
  }

  if (isAsciiEmojiToken(trimmed)) {
    return undefined
  }

  if (trimmed.length > 16) {
    return undefined
  }

  return trimmed
}
