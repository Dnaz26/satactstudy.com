import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './card'
import { MasteryBar } from './mastery-bar'
import { Badge } from './badge'
import { Button } from './button'
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'

interface TopicCardProps {
  topicName: string
  categoryName?: string
  mastery: number
  accuracy?: number
  trend?: 'improving' | 'stable' | 'declining' | 'neutral'
  totalAttempts?: number
  onPractice?: () => void
  className?: string
  compact?: boolean
}

export function TopicCard({
  topicName,
  categoryName,
  mastery,
  accuracy,
  trend,
  totalAttempts,
  onPractice,
  className,
  compact = false,
}: TopicCardProps) {
  const TrendIcon =
    trend === 'improving'
      ? TrendingUp
      : trend === 'declining'
      ? TrendingDown
      : Minus

  const trendColor =
    trend === 'improving'
      ? 'text-ok'
      : trend === 'declining'
      ? 'text-bad'
      : 'text-fog'

  return (
    <Card className={cn(compact ? 'p-3' : '', className)}>
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-semibold text-paper text-sm">{topicName}</p>
            {categoryName && (
              <p className="text-xs text-fog">{categoryName}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {trend && trend !== 'neutral' && (
              <TrendIcon className={cn('w-4 h-4', trendColor)} />
            )}
            {totalAttempts != null && (
              <span className="text-xs text-fog">{totalAttempts} attempts</span>
            )}
          </div>
        </div>

        <MasteryBar mastery={mastery} showLabel showPercent className="mb-3" />

        {accuracy != null && (
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-fog" />
            <span className="text-xs text-fog">
              Accuracy: {Math.round(accuracy * 100)}%
            </span>
          </div>
        )}

        {onPractice && (
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={onPractice}
          >
            Practice
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
