import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'
import { Badge } from './badge'

interface ScoreCardProps {
  predicted: number | null
  target: number | null
  testType: 'SAT' | 'ACT' | 'Both' | 'both'
  confidence?: string | number | null
  scoreLow?: number | null
  scoreHigh?: number | null
  className?: string
}

export function ScoreCard({
  predicted,
  target,
  testType,
  confidence,
  scoreLow,
  scoreHigh,
  className,
}: ScoreCardProps) {
  const gap = predicted != null && target != null ? target - predicted : null
  const ahead = gap != null && gap <= 0
  const confidenceLabel =
    typeof confidence === 'string'
      ? confidence
      : confidence == null
      ? null
      : confidence >= 0.7
      ? 'high'
      : confidence >= 0.4
      ? 'medium'
      : 'low'

  const testLabel = testType === 'both' || testType === 'Both' ? 'SAT & ACT' : testType

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">Predicted</p>
          <p className="mt-1 font-display text-3xl leading-none text-paper">
            {predicted != null ? predicted.toLocaleString() : '—'}
          </p>
          {scoreLow != null && scoreHigh != null && (
            <p className="mt-2 font-mono text-xs text-fog">
              Range {scoreLow}–{scoreHigh}
            </p>
          )}
          {confidenceLabel && (
            <Badge variant="secondary" className="mt-3">
              {confidenceLabel} confidence
            </Badge>
          )}
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">Target</p>
          <p className="mt-1 font-display text-2xl leading-none">{target != null ? target.toLocaleString() : '—'}</p>
          <p className="mt-2 text-xs text-fog">{testLabel} estimate — not an official score</p>
        </div>
        {gap != null && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">Gap</p>
            <p className={cn('mt-1 font-display text-2xl leading-none', ahead ? 'text-ok' : gap <= 50 ? 'text-warn' : 'text-bad')}>
              {ahead ? 'On target' : `${gap} pts`}
            </p>
            <p className="mt-2 text-xs text-fog">
              {ahead ? 'Maintain timing and hard questions.' : 'Likely high-impact areas are next.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
