'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CheckCircle, Play, Calendar, Zap, RefreshCw } from 'lucide-react'

interface StudyPlan {
  id: string
  ai_explanation: string | null
  test_type: string
  target_score: number
  start_date: string
  end_date: string
}

interface StudyPlanTask {
  id: string
  date: string
  task_type: string
  topic_name: string | null
  duration_minutes: number
  question_count: number | null
  completed: boolean
  topic_id: string | null
}

interface Profile {
  target_score: number | null
  target_test: string | null
  test_date: string | null
  daily_study_minutes: number | null
  available_days: string[] | null
  baseline_score: number | null
}

interface StudyPlanClientProps {
  plan: StudyPlan
  tasks: StudyPlanTask[]
  profile: Profile | null
}

const TASK_TYPE_COLORS: Record<string, string> = {
  practice: 'neu-sm text-signal',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  vocabulary: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  timed: 'bg-green-500/20 text-ok border-green-500/30',
}

export function StudyPlanClient({ plan, tasks, profile }: StudyPlanClientProps) {
  const router = useRouter()
  const [completingId, setCompletingId] = React.useState<string | null>(null)
  const [generating, setGenerating] = React.useState(false)

  const today = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter((t) => t.date === today)
  const weekTasks = tasks

  const completedToday = todayTasks.filter((t) => t.completed).length
  const totalToday = todayTasks.length

  const days = [...new Set(weekTasks.map((t) => t.date))].sort()

  async function markComplete(taskId: string) {
    setCompletingId(taskId)
    await fetch(`/api/schedule/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    }).catch(() => {})
    router.refresh()
    setCompletingId(null)
  }

  async function regenerate() {
    if (!profile) return
    setGenerating(true)
    await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testDate: profile.test_date,
        testType: (profile.target_test === 'Both' ? 'both' : profile.target_test) ?? 'SAT',
        targetScore: profile.target_score ?? 1400,
        baselineScore: profile.baseline_score,
        dailyMinutes: profile.daily_study_minutes ?? 30,
        availableDays: profile.available_days ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      }),
    })
    setGenerating(false)
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-paper mb-1">Study Plan</h1>
          <p className="text-fog">
            {plan.test_type} · Target: {plan.target_score} · {formatDate(plan.start_date)} – {formatDate(plan.end_date)}
          </p>
        </div>
        <Button variant="secondary" onClick={regenerate} loading={generating}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>

      {plan.ai_explanation && (
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Zap className="w-5 h-5 text-signal flex-shrink-0 mt-0.5" />
            <p className="text-sm text-paper leading-relaxed">{plan.ai_explanation}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today&apos;s Tasks</CardTitle>
            <span className="text-sm text-fog">{completedToday}/{totalToday}</span>
          </div>
          <Progress
            value={totalToday > 0 ? (completedToday / totalToday) * 100 : 0}
            color="#3B82F6"
          />
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-fog text-sm text-center py-4">No tasks for today. Enjoy your rest day!</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all',
                    task.completed
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-transparent neu-inset'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {task.completed ? (
                      <CheckCircle className="w-4 h-4 text-ok" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-transparent" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-paper">{task.topic_name}</p>
                      <p className="text-xs text-fog">
                        {task.duration_minutes} min
                        {task.question_count != null && ` · ${task.question_count} Qs`}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      TASK_TYPE_COLORS[task.task_type] ?? 'bg-panel-2 text-fog border-transparent'
                    )}>
                      {task.task_type}
                    </span>
                  </div>
                  {!task.completed && (
                    <div className="flex gap-2">
                      <Link href={`/practice?topicId=${task.topic_id ?? ''}&count=${task.question_count ?? 10}`}>
                        <Button size="sm">
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markComplete(task.id)}
                        loading={completingId === task.id}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-paper mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-signal" />
          This Week
        </h2>
        <div className="space-y-4">
          {days.map((day) => {
            const dayTasks = weekTasks.filter((t) => t.date === day)
            const isToday = day === today
            const completedDay = dayTasks.filter((t) => t.completed).length
            return (
              <Card key={day} className={isToday ? 'ring-2 ring-signal/30' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{formatDate(day)}</CardTitle>
                      {isToday && <Badge variant="default">Today</Badge>}
                    </div>
                    <span className="text-xs text-fog">{completedDay}/{dayTasks.length}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded-lg border',
                          task.completed
                            ? 'border-green-500/30 bg-green-500/10 text-ok line-through opacity-70'
                            : TASK_TYPE_COLORS[task.task_type] ?? 'border-transparent text-fog'
                        )}
                      >
                        {task.topic_name} · {task.duration_minutes}m
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
