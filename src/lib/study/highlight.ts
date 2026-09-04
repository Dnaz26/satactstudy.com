export type StudyStep = {
  text: string
  highlight?: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function longestShared(source: string, bullet: string): string | undefined {
  const hay = bullet.toLowerCase()
  let best = ''
  for (let start = 0; start < source.length; start++) {
    for (let end = start + 3; end <= source.length; end++) {
      const slice = source.slice(start, end).trim()
      if (slice.length < 3 || slice.length <= best.length) continue
      if (hay.includes(slice.toLowerCase())) best = slice
    }
  }
  return best || undefined
}

export function pickHighlight(source: string, bullet: string): string | undefined {
  const marked = bullet.match(/\*\*([^*]+)\*\*/)
  if (marked?.[1]?.trim()) return marked[1].trim()

  const equation = source.match(/[A-Za-z]\s*=\s*[^\n.,?!]+/)?.[0]?.trim()
  if (equation && /mx\s*\+\s*b|linear|form|equation|function/i.test(bullet)) return equation

  const slopeBit = source.match(/([+-]?\d+)\s*x/i)?.[0]
  if (slopeBit && /slope|\bm\b|rise|run|steep/i.test(bullet)) return slopeBit

  const interceptBit = source.match(/[+-]\s*\d+(?!\s*x)/)?.[0]?.replace(/\s+/g, '')
  if (interceptBit && /intercept|\bb\b|y-axis|hits y|when x is 0/i.test(bullet)) return interceptBit.replace('+', '+ ')

  const shared = longestShared(source, bullet.replace(/\*\*/g, ''))
  if (shared && shared.length >= 3) return shared
  return equation
}

export function asSteps(items: unknown, fallback: string[]): StudyStep[] {
  if (Array.isArray(items) && items.length) {
    return items.map((item) => {
      if (typeof item === 'string') return { text: item }
      const row = item as { text?: string; highlight?: string }
      return { text: row.text ?? '', highlight: row.highlight }
    }).filter((item) => item.text.trim())
  }
  return fallback.map((text) => ({ text }))
}

export function highlightPattern(highlight: string): RegExp {
  return new RegExp(`(${escapeRegExp(highlight)})`, 'ig')
}
