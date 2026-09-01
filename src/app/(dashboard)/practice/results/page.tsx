'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Companion } from '@/components/ui/companion'
import { LayoutDashboard, RotateCcw, TrendingUp } from 'lucide-react'

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const correct = Number(searchParams.get('correct') ?? 0)
  const total = Number(searchParams.get('total') ?? 0)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  const companionMode =
    accuracy >= 80 ? 'success' :
    accuracy >= 60 ? 'studying' :
    accuracy >= 40 ? 'warning' : 'struggling'

  const accuracyColor = accuracy >= 70 ? '#22C55E' : accuracy >= 40 ? '#EAB308' : '#EF4444'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            <div className="text-7xl font-bold mb-2" style={{ color: accuracyColor }}>
              {accuracy}%
            </div>
            <p className="text-fog">{correct} of {total} correct</p>
          </div>

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

export default function PracticeResultsPage() {
  return (
    <React.Suspense fallback={<div className="text-fog text-sm p-8">Loading results…</div>}>
      <ResultsContent />
    </React.Suspense>
  )
}
