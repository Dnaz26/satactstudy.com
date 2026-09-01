'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UsageCounter } from '@/components/ui/usage-counter'
import { PLAN_LIMITS } from '@/lib/constants'
import { Play, BookOpen, Clock } from 'lucide-react'

interface Topic {
  id: string
  name: string
  category_id: string
  categories?: {
    name: string
    sections?: {
      name: string
      tests?: { name: string }[] | null
    } | null
  } | null
}

interface PracticeSetupProps {
  topics: Topic[]
  plan: string
  questionsUsedToday: number
  defaultTestType: 'SAT' | 'ACT'
}

export function PracticeSetup({ topics, plan, questionsUsedToday, defaultTestType }: PracticeSetupProps) {
  const router = useRouter()
  const [testType, setTestType] = React.useState<'SAT' | 'ACT'>(defaultTestType)
  const [topicId, setTopicId] = React.useState<string>('all')
  const [difficulty, setDifficulty] = React.useState<string>('mixed')
  const [questionCount, setQuestionCount] = React.useState('10')
  const [timed, setTimed] = React.useState(false)
  const [adaptive, setAdaptive] = React.useState(false)

  const planKey = plan as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[planKey]?.questions_per_day ?? 5
  const remaining = Math.max(0, limit - questionsUsedToday)
  const isUnlimited = limit >= 999999

  const filteredTopics = topics.filter((t) => {
    const testNames = t.categories?.sections?.tests?.map((ts) => ts.name) ?? []
    return testNames.includes(testType) || testNames.length === 0
  })

  function handleStart() {
    const params = new URLSearchParams({
      testType,
      topicId: topicId !== 'all' ? topicId : '',
      difficulty,
      count: questionCount,
      timed: timed ? '1' : '0',
      adaptive: adaptive ? '1' : '0',
    })
    router.push(`/practice/session?${params.toString()}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper mb-1">Practice</h1>
        <p className="text-fog">Configure your session and start practicing.</p>
      </div>

      <UsageCounter
        label="Questions used today"
        used={questionsUsedToday}
        limit={limit}
      />

      {!isUnlimited && remaining === 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-400">
          You&apos;ve reached your daily question limit. Upgrade your plan for more practice.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-signal" />
            Session Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="text-sm font-medium text-fog block mb-2">Test</label>
            <div className="flex gap-2">
              {(['SAT', 'ACT'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTestType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    testType === t
                      ? 'neu-raised text-white'
                      : 'border-transparent neu-inset text-paper hover:opacity-90'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-fog block mb-2">Topic</label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics (mixed)</SelectItem>
                {filteredTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.categories?.name && ` — ${t.categories.name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-fog block mb-2">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-fog block mb-2">Number of Questions</label>
            <div className="flex gap-2 flex-wrap">
              {['5', '10', '15', '20', '30'].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  disabled={!isUnlimited && Number(n) > remaining}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    questionCount === n
                      ? 'neu-raised text-white'
                      : 'border-transparent neu-inset text-paper hover:opacity-90'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
                className="h-4 w-4 rounded border-transparent neu-inset accent-[#ff6b57]"
              />
              <span className="text-sm text-paper flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-fog" />
                Timed
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={adaptive}
                onChange={(e) => setAdaptive(e.target.checked)}
                className="h-4 w-4 rounded border-transparent neu-inset accent-[#ff6b57]"
              />
              <span className="text-sm text-paper">Adaptive difficulty</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Button
        size="xl"
        className="w-full"
        onClick={handleStart}
        disabled={!isUnlimited && remaining === 0}
      >
        <Play className="w-5 h-5 mr-2" />
        Start Practice
      </Button>
    </div>
  )
}
