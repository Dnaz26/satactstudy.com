'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const SPARK = [1180, 1195, 1210, 1235, 1260, 1288, 1310, 1342, 1368, 1390, 1410, 1430]

export function HeroPreview() {
  const reduce = useReducedMotion()
  const [tick, setTick] = useState(0)
  const max = Math.max(...SPARK)
  const min = Math.min(...SPARK)
  const points = SPARK.map((value, index) => {
    const x = (index / (SPARK.length - 1)) * 280
    const y = 72 - ((value - min) / (max - min)) * 58
    return `${x},${y}`
  }).join(' ')
  const area = `0,72 ${points} 280,72`

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), 2000)
    return () => window.clearInterval(id)
  }, [reduce])

  const feed = ['+40% learning', '+240 SAT path', '19 topics locked', 'Rapid Fire 12s'][tick]

  return (
    <motion.aside
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="land-drift relative overflow-hidden rounded-[2rem] neu p-5 sm:p-6"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(420px 200px at 100% 0%, rgba(255,107,87,0.2), transparent 60%), radial-gradient(360px 200px at 0% 100%, rgba(43,158,217,0.18), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between">
        <p className="font-display text-xl leading-none">Score path</p>
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ok">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-ok/50" />
            <span className="relative h-2 w-2 rounded-full bg-ok" />
          </span>
          Live
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Mini label="Now" value="1430" />
        <Mini label="Start" value="1180" />
        <Mini label="Gain" value="+250" hot />
      </div>

      <div className="relative mt-4 neu-inset p-3">
        <svg viewBox="0 0 280 72" className="h-16 w-full" aria-hidden="true">
          <defs>
            <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b9ed9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2b9ed9" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#heroFill)" points={area} />
          <polyline fill="none" stroke="#2b9ed9" strokeWidth="3.5" strokeLinecap="round" points={points} />
          <polyline fill="none" stroke="#7b8fad" strokeWidth="2" strokeDasharray="5 5" points="0,68 280,58" />
        </svg>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Mini label="Learning" value="+40%" hot />
        <Mini label="Topics" value="19" />
        <Mini label="Speed" value="38s" />
        <Mini label="From" value="$10" />
      </div>

      <div className="relative mt-4 neu-inset px-3 py-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">Nova</p>
        <p className="mt-1 font-display text-lg text-paper">{feed}</p>
      </div>
    </motion.aside>
  )
}

function Mini({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="neu-sm px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog">{label}</p>
      <p className={`mt-1 font-display text-xl leading-none ${hot ? 'text-signal' : 'text-paper'}`}>{value}</p>
    </div>
  )
}
