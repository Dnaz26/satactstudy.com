import type { VideoKind } from './videos'

export type PreviewScene =
  | 'lines'
  | 'parabola'
  | 'function'
  | 'shade'
  | 'scatter'
  | 'circle'
  | 'wave'
  | 'exponential'
  | 'table'
  | 'points'
  | 'bars'
  | 'word'
  | 'formula'
  | 'tip'

export function sceneForDesmos(slug: string): PreviewScene {
  if (/quadratic|polynomial|vertex/.test(slug)) return 'parabola'
  if (/function_notation|slider/.test(slug)) return 'function'
  if (/table|list_min/.test(slug)) return 'table'
  if (/inequal/.test(slug)) return 'shade'
  if (/scatter|regression/.test(slug)) return 'scatter'
  if (/circle/.test(slug)) return 'circle'
  if (/trig/.test(slug)) return 'wave'
  if (/exponential/.test(slug)) return 'exponential'
  if (/plot_points|distance|midpoint/.test(slug)) return 'points'
  if (/stats|visual|combination|inference/.test(slug)) return 'bars'
  return 'lines'
}

export function sceneForKind(kind: VideoKind, slugOrTitle: string): PreviewScene {
  if (kind === 'desmos') return sceneForDesmos(slugOrTitle)
  if (kind === 'vocab') return 'word'
  if (kind === 'formula') return 'formula'
  return 'tip'
}

export function shortBlurb(text: string, max = 78): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}
