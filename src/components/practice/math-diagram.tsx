'use client'

import type { ReactNode } from 'react'
import { detectMathDiagram, type MathDiagram } from '@/lib/questions/diagram'
import { cn } from '@/lib/utils'

function ParallelTransversal({ angle }: { angle: number }) {
  return (
    <svg viewBox="0 0 220 120" className="h-28 w-full" aria-hidden>
      <line x1="16" y1="38" x2="204" y2="38" stroke="#1c2740" strokeWidth="2" />
      <line x1="16" y1="86" x2="204" y2="86" stroke="#1c2740" strokeWidth="2" />
      <line x1="70" y1="12" x2="150" y2="108" stroke="#ff6b57" strokeWidth="2" />
      <path d="M88 38 L104 38 L108 58" fill="none" stroke="#2b9ed9" strokeWidth="1.5" />
      <text x="112" y="52" fontSize="10" fill="#1c2740">{angle}°</text>
      <text x="18" y="32" fontSize="9" fill="#5f7190">ℓ₁</text>
      <text x="18" y="80" fontSize="9" fill="#5f7190">ℓ₂</text>
    </svg>
  )
}

function CircleFigure({ radius, focus }: { radius: number; focus?: string }) {
  const hit = /radius|\br\b|circum|area/i.test(focus ?? '')
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-full" aria-hidden>
      <circle cx="80" cy="60" r="36" fill={hit ? 'rgba(255,107,87,0.12)' : 'none'} stroke="#1c2740" strokeWidth={hit ? 3 : 2} />
      <line x1="80" y1="60" x2="116" y2="60" stroke="#ff6b57" strokeWidth={hit ? 3 : 1.5} />
      <circle cx="80" cy="60" r="2" fill="#1c2740" />
      <text x="88" y="54" fontSize="10" fill="#1c2740">r = {radius}</text>
    </svg>
  )
}

function RightTriangle({ a, b, c }: { a: number; b: number; c?: number }) {
  return (
    <svg viewBox="0 0 180 130" className="h-28 w-full" aria-hidden>
      <polygon points="28,108 148,108 28,28" fill="rgba(255,107,87,0.08)" stroke="#1c2740" strokeWidth="2" />
      <rect x="28" y="96" width="12" height="12" fill="none" stroke="#1c2740" strokeWidth="1.2" />
      <text x="80" y="122" fontSize="10" fill="#1c2740">{b}</text>
      <text x="8" y="72" fontSize="10" fill="#1c2740">{a}</text>
      {c != null && <text x="96" y="60" fontSize="10" fill="#1c2740">{c}</text>}
    </svg>
  )
}

function TriangleFigure() {
  return (
    <svg viewBox="0 0 180 120" className="h-28 w-full" aria-hidden>
      <polygon points="90,18 160,104 20,104" fill="rgba(43,158,217,0.08)" stroke="#1c2740" strokeWidth="2" />
      <text x="84" y="14" fontSize="10" fill="#1c2740">A</text>
      <text x="162" y="110" fontSize="10" fill="#1c2740">C</text>
      <text x="10" y="110" fontSize="10" fill="#1c2740">B</text>
    </svg>
  )
}

function Axes({ children }: { children?: ReactNode }) {
  return (
    <svg viewBox="0 0 180 130" className="h-28 w-full" aria-hidden>
      <line x1="20" y1="110" x2="168" y2="110" stroke="#1c2740" strokeWidth="1.2" />
      <line x1="24" y1="16" x2="24" y2="114" stroke="#1c2740" strokeWidth="1.2" />
      {children}
    </svg>
  )
}

function LineFigure({ slope, intercept, focus }: { slope: number; intercept: number; focus?: string }) {
  const y = (x: number) => 110 - (slope * (x - 24) + intercept * 4)
  const slopeHit = /slope|\bm\b|\dx|steep|rate/i.test(focus ?? '')
  const interceptHit = /intercept|\bb\b|y-axis|hits y/i.test(focus ?? '')
  return (
    <Axes>
      <line x1="24" y1={y(24)} x2="160" y2={y(160)} stroke="#ff6b57" strokeWidth={slopeHit ? 4 : 2} />
      {interceptHit ? <circle cx="24" cy={y(24)} r="6" fill="#ff6b57" stroke="#1c2740" strokeWidth="1" /> : null}
      <text x="120" y="28" fontSize="10" fill="#1c2740">y = {slope}x + {intercept}</text>
    </Axes>
  )
}

function FunctionFigure({ label }: { label: string }) {
  return (
    <Axes>
      <path d="M28 96 C 60 96, 70 40, 100 40 S 150 88, 164 30" fill="none" stroke="#ff6b57" strokeWidth="2" />
      <text x="128" y="24" fontSize="10" fill="#1c2740">{label}</text>
    </Axes>
  )
}

function PointsFigure({ points }: { points: Array<{ x: number; y: number }> }) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(-1, ...xs)
  const maxX = Math.max(1, ...xs)
  const minY = Math.min(-1, ...ys)
  const maxY = Math.max(1, ...ys)
  const sx = (x: number) => 24 + ((x - minX) / (maxX - minX || 1)) * 136
  const sy = (y: number) => 110 - ((y - minY) / (maxY - minY || 1)) * 86
  return (
    <Axes>
      {points.map((point, index) => (
        <g key={`${point.x},${point.y},${index}`}>
          <circle cx={sx(point.x)} cy={sy(point.y)} r="3" fill="#ff6b57" />
          <text x={sx(point.x) + 4} y={sy(point.y) - 4} fontSize="9" fill="#1c2740">({point.x},{point.y})</text>
        </g>
      ))}
    </Axes>
  )
}

function TableFigure({ headers, rows }: { headers: [string, string]; rows: Array<[string, string]> }) {
  return (
    <table className="ml-6 w-[min(100%,12rem)] border-collapse text-[11px]">
      <thead>
        <tr>
          <th className="border border-[#1c2740]/30 px-2 py-1 text-left">{headers[0]}</th>
          <th className="border border-[#1c2740]/30 px-2 py-1 text-left">{headers[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join('-')}>
            <td className="border border-[#1c2740]/30 px-2 py-1">{row[0]}</td>
            <td className="border border-[#1c2740]/30 px-2 py-1">{row[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Figure({ diagram, focus }: { diagram: MathDiagram; focus?: string }) {
  if (diagram.kind === 'parallel_transversal') return <ParallelTransversal angle={diagram.angle} />
  if (diagram.kind === 'circle') return <CircleFigure radius={diagram.radius} focus={focus} />
  if (diagram.kind === 'right_triangle') return <RightTriangle a={diagram.a} b={diagram.b} c={diagram.c} />
  if (diagram.kind === 'triangle') return <TriangleFigure />
  if (diagram.kind === 'line') return <LineFigure slope={diagram.slope} intercept={diagram.intercept} focus={focus} />
  if (diagram.kind === 'function') return <FunctionFigure label={diagram.label} />
  if (diagram.kind === 'points') return <PointsFigure points={diagram.points} />
  return <TableFigure headers={diagram.headers} rows={diagram.rows} />
}

export function MathDiagram({
  text,
  imageUrl,
  focus,
}: {
  text: string
  imageUrl?: string | null
  focus?: string
}) {
  const diagram = detectMathDiagram(text)
  if (!diagram && !imageUrl) return null
  return (
    <div className={cn('ml-6 rounded-sm border bg-white/70 p-2', focus ? 'border-signal ring-2 ring-signal/40' : 'border-[#1c2740]/15')}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Question figure" className="mb-2 max-h-40 w-full object-contain" />
      ) : null}
      {diagram ? <Figure diagram={diagram} focus={focus} /> : null}
    </div>
  )
}
