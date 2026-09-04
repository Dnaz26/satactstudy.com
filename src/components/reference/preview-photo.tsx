import type { ReactNode } from 'react'
import type { PreviewScene } from '@/lib/reference/preview'
import type { ReferenceVideo } from '@/lib/reference/videos'

const PALETTES = [
  { bg: '#102033', paper: '#163048', ink: '#e8f4ff', a: '#7dd3fc', b: '#fb923c', c: '#ff6b57' },
  { bg: '#1a1430', paper: '#261d44', ink: '#f3e8ff', a: '#c4b5fd', b: '#f9a8d4', c: '#fb7185' },
  { bg: '#13261c', paper: '#1b3326', ink: '#e8fff3', a: '#6ee7b7', b: '#fbbf24', c: '#34d399' },
  { bg: '#2a1c12', paper: '#3a2819', ink: '#fff4e8', a: '#fdba74', b: '#fcd34d', c: '#fb7185' },
  { bg: '#121826', paper: '#1c2436', ink: '#eef2ff', a: '#93c5fd', b: '#a5b4fc', c: '#f472b6' },
]

function palette(seed: string) {
  let n = 0
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i) * (i + 3)) % 997
  return PALETTES[n % PALETTES.length]
}

function GraphFrame({
  seed,
  children,
  label,
}: {
  seed: string
  children: ReactNode
  label?: string
}) {
  const c = palette(seed)
  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
      <rect width="320" height="320" fill={c.bg} />
      <rect x="18" y="28" width="284" height="246" rx="18" fill={c.paper} />
      <path d="M46 248 H276 M161 46 V260" stroke="#4b5d78" strokeWidth="1.2" />
      {children}
      {label && (
        <text x="34" y="300" fill={c.ink} fontSize="13" fontFamily="ui-sans-serif, system-ui">
          {label}
        </text>
      )}
    </svg>
  )
}

function Art({ scene, video }: { scene: PreviewScene; video: ReferenceVideo }) {
  const c = palette(video.id)
  const word = video.beats.find((beat) => beat.parts?.length)?.parts
  const formula = video.beats.find((beat) => beat.lines[0])?.lines[0] ?? video.title

  if (scene === 'lines') {
    return (
      <GraphFrame seed={video.id} label="Intersection">
        <path d="M50 230 L270 70" stroke={c.a} strokeWidth="4" fill="none" />
        <path d="M50 80 L270 230" stroke={c.b} strokeWidth="4" fill="none" />
        <circle cx="160" cy="155" r="8" fill={c.c} />
      </GraphFrame>
    )
  }
  if (scene === 'parabola') {
    return (
      <GraphFrame seed={video.id} label="Parabola">
        <path d="M52 230 Q160 20 268 230" stroke={c.a} strokeWidth="4" fill="none" />
        <circle cx="160" cy="52" r="7" fill={c.c} />
        <circle cx="92" cy="230" r="5" fill={c.b} />
        <circle cx="228" cy="230" r="5" fill={c.b} />
      </GraphFrame>
    )
  }
  if (scene === 'function') {
    return (
      <GraphFrame seed={video.id} label="f(x)">
        <path d="M50 210 L270 90" stroke={c.a} strokeWidth="4" fill="none" />
        <circle cx="200" cy="128" r="8" fill={c.c} />
        <text x="210" y="118" fill={c.ink} fontSize="14">f(3)</text>
      </GraphFrame>
    )
  }
  if (scene === 'shade') {
    return (
      <GraphFrame seed={video.id} label="Shaded region">
        <path d="M50 90 L270 210 L270 260 L50 260 Z" fill={c.a} opacity="0.35" />
        <path d="M50 90 L270 210" stroke={c.a} strokeWidth="4" fill="none" />
      </GraphFrame>
    )
  }
  if (scene === 'scatter') {
    return (
      <GraphFrame seed={video.id} label="Best fit">
        <path d="M56 220 L264 88" stroke={c.a} strokeWidth="3" fill="none" />
        {[[70, 200], [110, 168], [148, 150], [186, 128], [230, 108], [250, 122]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="6" fill={c.b} />
        ))}
      </GraphFrame>
    )
  }
  if (scene === 'circle') {
    return (
      <GraphFrame seed={video.id} label="Center & radius">
        <circle cx="160" cy="155" r="72" fill="none" stroke={c.a} strokeWidth="4" />
        <circle cx="160" cy="155" r="6" fill={c.c} />
        <path d="M160 155 H232" stroke={c.b} strokeWidth="3" />
      </GraphFrame>
    )
  }
  if (scene === 'wave') {
    return (
      <GraphFrame seed={video.id} label="Degree mode">
        <path d="M46 155 C 80 70, 120 240, 160 155 S 240 70, 276 155" stroke={c.a} strokeWidth="4" fill="none" />
      </GraphFrame>
    )
  }
  if (scene === 'exponential') {
    return (
      <GraphFrame seed={video.id} label="Growth">
        <path d="M50 220 L270 90" stroke={c.b} strokeWidth="3" fill="none" />
        <path d="M50 230 C 120 228, 180 200, 260 60" stroke={c.a} strokeWidth="4" fill="none" />
      </GraphFrame>
    )
  }
  if (scene === 'table') {
    return (
      <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
        <rect width="320" height="320" fill={c.bg} />
        <rect x="28" y="36" width="264" height="248" rx="18" fill={c.paper} />
        {['x', '1', '2', '3', '4'].map((cell, i) => (
          <text key={`x-${cell}`} x="70" y={78 + i * 40} fill={c.ink} fontSize="18">{cell}</text>
        ))}
        {['f(x)', '5', '7', '9', '11'].map((cell, i) => (
          <text key={`y-${cell}`} x="180" y={78 + i * 40} fill={i === 0 ? c.a : c.ink} fontSize="18">{cell}</text>
        ))}
      </svg>
    )
  }
  if (scene === 'points') {
    return (
      <GraphFrame seed={video.id} label="Points">
        <circle cx="92" cy="198" r="8" fill={c.a} />
        <circle cx="230" cy="96" r="8" fill={c.b} />
        <path d="M92 198 L230 96" stroke={c.c} strokeWidth="3" strokeDasharray="6 6" fill="none" />
      </GraphFrame>
    )
  }
  if (scene === 'bars') {
    return (
      <GraphFrame seed={video.id} label="Data">
        <rect x="70" y="140" width="36" height="108" rx="6" fill={c.a} />
        <rect x="122" y="88" width="36" height="160" rx="6" fill={c.b} />
        <rect x="174" y="118" width="36" height="130" rx="6" fill={c.a} />
        <rect x="226" y="70" width="36" height="178" rx="6" fill={c.c} />
      </GraphFrame>
    )
  }
  if (scene === 'word' && word?.length) {
    return (
      <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
        <rect width="320" height="320" fill={c.bg} />
        <rect x="24" y="48" width="272" height="224" rx="22" fill={c.paper} />
        <text x="160" y="118" textAnchor="middle" fill={c.ink} fontSize="28" fontWeight="700">
          {word.map((part) => part.text).join('')}
        </text>
        {word.map((part, index) => (
          <g key={part.text}>
            <rect x={36 + index * 88} y="160" width="80" height="70" rx="14" fill={c.bg} />
            <text x={76 + index * 88} y="192" textAnchor="middle" fill={c.a} fontSize="16">{part.text}</text>
            <text x={76 + index * 88} y="214" textAnchor="middle" fill={c.ink} fontSize="11">{part.meaning}</text>
          </g>
        ))}
      </svg>
    )
  }
  if (scene === 'formula') {
    return (
      <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
        <rect width="320" height="320" fill={c.bg} />
        <rect x="22" y="40" width="276" height="240" rx="20" fill={c.paper} />
        <text x="40" y="88" fill={c.a} fontSize="14">{video.rule}</text>
        <text x="40" y="170" fill={c.ink} fontSize={formula.length > 28 ? 16 : 22} fontFamily="ui-monospace, monospace">
          {formula.length > 34 ? `${formula.slice(0, 32)}…` : formula}
        </text>
      </svg>
    )
  }

  const tip = video.title.toLowerCase()
  if (tip.includes('plug') || tip.includes('variable')) {
    return (
      <GraphFrame seed={video.id} label="Plug in">
        <text x="58" y="120" fill={c.ink} fontSize="28">x = 3</text>
        <path d="M58 150 L250 150" stroke={c.a} strokeWidth="3" />
        <text x="58" y="200" fill={c.b} fontSize="22">2x + 5 = 11</text>
      </GraphFrame>
    )
  }
  if (tip.includes('backsolve') || tip.includes('choice')) {
    return (
      <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
        <rect width="320" height="320" fill={c.bg} />
        {['A', 'B', 'C', 'D'].map((key, index) => (
          <rect key={key} x="40" y={48 + index * 62} width="240" height="50" rx="12" fill={index === 1 ? c.a : c.paper} />
        ))}
        {['A  4', 'B  6', 'C  8', 'D  10'].map((label, index) => (
          <text key={label} x="62" y={80 + index * 62} fill={c.ink} fontSize="20">{label}</text>
        ))}
      </svg>
    )
  }
  if (tip.includes('predict') || tip.includes('cover')) {
    return (
      <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
        <rect width="320" height="320" fill={c.bg} />
        <rect x="36" y="56" width="248" height="70" rx="14" fill={c.paper} />
        <rect x="36" y="146" width="248" height="118" rx="14" fill={c.paper} />
        <rect x="52" y="166" width="216" height="78" rx="10" fill={c.bg} opacity="0.85" />
        <text x="160" y="214" textAnchor="middle" fill={c.a} fontSize="18">your words first</text>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 320 320" className="h-full w-full" aria-hidden>
      <rect width="320" height="320" fill={c.bg} />
      <rect x="36" y="50" width="248" height="54" rx="12" fill={c.a} />
      <rect x="36" y="122" width="248" height="54" rx="12" fill={c.paper} />
      <rect x="36" y="194" width="248" height="54" rx="12" fill={c.paper} />
      <text x="56" y="84" fill={c.bg} fontSize="18">1  start here</text>
      <text x="56" y="156" fill={c.ink} fontSize="18">2  next move</text>
      <text x="56" y="228" fill={c.ink} fontSize="18">3  check</text>
    </svg>
  )
}

export function PreviewPhoto({ video }: { video: ReferenceVideo }) {
  return <Art scene={video.scene} video={video} />
}
