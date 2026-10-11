'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Companion } from '@/components/ui/companion'
import { LayoutDashboard, RotateCcw, TrendingUp } from 'lucide-react'
import { actScoreSummary } from '@/lib/act-scale'
import { estimateSatMathFromRaw, estimateSatMathScore, estimateUnroutedSatSection } from '@/lib/assessment/sat-scale'

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const correct = Number(searchParams.get('correct') ?? 0)
  const total = Number(searchParams.get('total') ?? 0)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const math = searchParams.get('math')
  const rw = searchParams.get('rw')
  const path = searchParams.get('path')
  const mathModule1 = searchParams.get('m1')
  const mathModule2 = searchParams.get('m2')
  const eng = searchParams.get('eng')
  const read = searchParams.get('read')
  const sci = searchParams.get('sci')
  const hasScience = sci !== null && sci !== ''
  // Core flagship form (131) or core + optional Science (171).
  const isAct = (total === 131 || total === 171) && eng !== null && read !== null
  const act = isAct
    ? actScoreSummary({
      english: Number(eng ?? 0),
      math: Number(math ?? 0),
      reading: Number(read ?? 0),
      science: Number(sci ?? 0),
    })
    : null
  const actRows = act
    ? ([
      ['English', eng, act.scaled.english, 50],
      ['Math', math, act.scaled.math, 45],
      ['Reading', read, act.scaled.reading, 36],
      ...(hasScience ? [['Science', sci, act.scaled.science, 40] as const] : []),
    ] as const)
    : []

  const companionMode =
    accuracy >= 80 ? 'success' :
    accuracy >= 60 ? 'studying' :
    accuracy >= 40 ? 'warning' : 'struggling'

  const accuracyColor = accuracy >= 70 ? '#22C55E' : accuracy >= 40 ? '#EAB308' : '#EF4444'

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <Companion
        mode={companionMode}
        message={
          accuracy >= 80
            ? 'Outstanding session! Your hard work is paying off!'
            : accuracy >= 60
            ? 'Good work! Keep practicing those tricky spots.'
            : 'Every question is a learning opportunity. Let\'s review your mistakes.'
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Session Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-4">
            <div className="text-4xl font-bold mb-2" style={{ color: accuracyColor }}>
              {accuracy}%
            </div>
            <p className="text-fog">{correct} of {total} correct</p>
          </div>

          {total === 98 && math && rw && <SatScore
            mathCorrect={Number(math)}
            rwCorrect={Number(rw)}
            path={path === 'harder' || path === 'easier' || path === 'medium' ? path : null}
            module1Correct={mathModule1 === null || mathModule1 === '' ? null : Number(mathModule1)}
            module2Correct={mathModule2 === null || mathModule2 === '' ? null : Number(mathModule2)}
          />}
          {act && <div className="space-y-3">
            <p className="text-center font-display text-5xl text-paper">{act.composite}</p>
            <p className="text-center text-sm text-fog">ACT Composite — English, Math, Reading only (estimated)</p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {actRows.map(([label, raw, scaled, of]) => (
                <div key={label} className="rounded-xl neu-inset px-2 py-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">{label}</p>
                  <p className="font-display text-2xl text-paper">{scaled}</p>
                  <p className="text-xs text-fog">{raw}/{of} correct</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-fog">
              {hasScience ? `STEM ${act.stem} (Math + Science) · ` : ''}Science is reported separately and never enters the composite.
              Estimated scaled scores — official ACT scales vary by test form.
            </p>
          </div>}
          <Progress value={accuracy} color={accuracyColor} className="h-3" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl neu-inset border border-transparent">
              <div className="text-2xl font-bold text-paper">{correct}</div>
              <div className="text-xs text-ok">Correct</div>
            </div>
            <div className="p-3 rounded-xl neu-inset border border-transparent">
              <div className="text-2xl font-bold text-paper">{total - correct}</div>
              <div className="text-xs text-bad">Incorrect</div>
            </div>
            <div className="p-3 rounded-xl neu-inset border border-transparent">
              <div className="text-2xl font-bold text-paper">{total}</div>
              <div className="text-xs text-fog">Total</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => router.push('/dashboard')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => router.push('/mistakes')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Review Mistakes
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push('/practice')}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Practice More
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SatScore({
  mathCorrect,
  rwCorrect,
  path,
  module1Correct,
  module2Correct,
}: {
  mathCorrect: number
  rwCorrect: number
  path: 'easier' | 'medium' | 'harder' | null
  module1Correct: number | null
  module2Correct: number | null
}) {
  const math = path && module1Correct !== null && module2Correct !== null && Number.isFinite(module1Correct) && Number.isFinite(module2Correct)
    ? estimateSatMathScore({
      module1Correct,
      module1Count: 22,
      module2Correct,
      module2Count: 22,
      path,
    })
    : path
      ? estimateSatMathFromRaw(mathCorrect, 44, path)
      : null
  const reading = estimateUnroutedSatSection(rwCorrect, 54)
  const total = math ? math.score + reading.score : null

  return (
    <div className="space-y-2 text-sm text-fog">
      <p>Reading and Writing: {rwCorrect}/54 · estimated {reading.score}</p>
      <p>
        Math: {mathCorrect}/44
        {path ? ` · Module 2 ${path} path` : ''}
        {math ? ` · estimated ${math.score} (ceiling ${math.ceiling})` : ''}
      </p>
      {total !== null && <p>Estimated total {total} of 1600.</p>}
      <p>
        These are practice estimates. Module 2 follows Module 1: a strong Module 1 opens a harder Module 2, a weak Module 1 opens an easier one, and a middle Module 1 stays in the middle. An easier Math Module 2 cannot reach 800. This is not an official SAT score.
      </p>
    </div>
  )
}

export default function PracticeResultsPage() {
  return (
    <React.Suspense fallback={<div className="text-fog text-sm p-8">Loading results…</div>}>
      <ResultsContent />
    </React.Suspense>
  )
}
