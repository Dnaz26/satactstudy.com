export type MathDiagram =
  | { kind: 'parallel_transversal'; angle: number }
  | { kind: 'circle'; radius: number }
  | { kind: 'right_triangle'; a: number; b: number; c?: number }
  | { kind: 'triangle' }
  | { kind: 'line'; slope: number; intercept: number }
  | { kind: 'function'; label: string; slope?: number; intercept?: number }
  | { kind: 'points'; points: Array<{ x: number; y: number }> }
  | { kind: 'table'; headers: [string, string]; rows: Array<[string, string]> }

function num(match: string | undefined, fallback: number): number {
  const value = Number(match)
  return Number.isFinite(value) ? value : fallback
}

export function detectMathDiagram(text: string): MathDiagram | null {
  const raw = text.replace(/\\circ/g, '°').replace(/\s+/g, ' ')

  const parallel = raw.match(/parallel[\s\S]{0,80}transversal[\s\S]{0,80}?(\d+(?:\.\d+)?)\s*°?/i)
    ?? raw.match(/interior angle is (\d+(?:\.\d+)?)/i)
  if (/parallel/i.test(raw) && /transversal|interior angle/i.test(raw)) {
    return { kind: 'parallel_transversal', angle: num(parallel?.[1], 118) }
  }

  const circle = raw.match(/circle[^\d]{0,24}radius\s*(\d+(?:\.\d+)?)/i)
    ?? raw.match(/radius\s*(\d+(?:\.\d+)?)[^\d]{0,16}circle/i)
  if (circle || (/circle/i.test(raw) && /radius|area|circumference/i.test(raw))) {
    return { kind: 'circle', radius: num(circle?.[1], 5) }
  }

  const right = raw.match(/right triangle[\s\S]{0,80}legs are (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?)(?:[\s\S]{0,40}hypotenuse is (\d+(?:\.\d+)?))?/i)
  if (right || (/right triangle/i.test(raw) && /\blegs?\b/i.test(raw))) {
    return {
      kind: 'right_triangle',
      a: num(right?.[1], 6),
      b: num(right?.[2], 8),
      c: right?.[3] ? num(right[3], 10) : undefined,
    }
  }

  if (/\btriangle\b/i.test(raw) && /angle|side|isosceles|equilateral|similar/i.test(raw)) {
    return { kind: 'triangle' }
  }

  const points = [...raw.matchAll(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/g)]
    .map((m) => ({ x: num(m[1], 0), y: num(m[2], 0) }))
  if (points.length >= 2 && /point|coordinate|graph|satisfies|plotted/i.test(raw)) {
    return { kind: 'points', points: points.slice(0, 6) }
  }

  const line = raw.match(/y\s*=\s*(-?\d+(?:\.\d+)?)x\s*([+-]\s*\d+(?:\.\d+)?)/i)
    ?? raw.match(/linear model is y\s*=\s*(-?\d+(?:\.\d+)?)x\s*([+-]\s*\d+(?:\.\d+)?)/i)
  if (line) {
    return { kind: 'line', slope: num(line[1], 1), intercept: Number(line[2].replace(/\s/g, '')) || 0 }
  }

  const fn = raw.match(/f\s*\(\s*x\s*\)\s*=\s*(-?\d+(?:\.\d+)?)x\s*([+-]\s*\d+(?:\.\d+)?)/i)
  if (fn) {
    const slope = num(fn[1], 1)
    const intercept = Number(fn[2].replace(/\s/g, '')) || 0
    const xs = [0, 1, 2, 4, 8]
    return {
      kind: 'table',
      headers: ['x', 'f(x)'],
      rows: xs.map((x) => [String(x), String(slope * x + intercept)]),
    }
  }

  if (/function|graph of|y\s*=/i.test(raw) && /x/.test(raw)) {
    return { kind: 'function', label: 'y' }
  }

  return null
}
