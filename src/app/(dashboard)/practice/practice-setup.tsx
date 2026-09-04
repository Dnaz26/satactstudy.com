'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PLAN_LIMITS } from '@/lib/constants'
import { Play } from 'lucide-react'

interface Topic {
  id: string
  name: string
  category_id: string
  categories?: {
    name: string
    sections?: {
      name: string
      tests?: { name: string } | { name: string }[] | null
    } | null
  } | null
}

function testNamesOf(topic: Topic): string[] {
  const tests = topic.categories?.sections?.tests
  if (!tests) return []
  if (Array.isArray(tests)) return tests.map((t) => t.name)
  return [tests.name]
}

interface PracticeSetupProps {
  topics: Topic[]
  plan: string
  questionsUsedToday: number
  defaultTestType: 'SAT' | 'ACT'
}

export function PracticeSetup({ topics, plan, questionsUsedToday, defaultTestType }: PracticeSetupProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [testType, setTestType] = React.useState<'SAT' | 'ACT'>(defaultTestType)
  const [section, setSection] = React.useState('all')
  const [topicId, setTopicId] = React.useState('all')
  const [difficulty, setDifficulty] = React.useState('mixed')
  const [questionCount, setQuestionCount] = React.useState('10')
  const [secondsPerQuestion, setSecondsPerQuestion] = React.useState('90')
  const [timed, setTimed] = React.useState(false)
  const [adaptive, setAdaptive] = React.useState(false)
  const [unattempted, setUnattempted] = React.useState(false)
  const [calculator, setCalculator] = React.useState(true)
  const [fromMistakes, setFromMistakes] = React.useState(false)
  const [shuffle, setShuffle] = React.useState(true)
  const [categoryName, setCategoryName] = React.useState('')

  React.useEffect(() => {
    const urlTopic = searchParams.get('topicId') ?? searchParams.get('topic') ?? ''
    const urlCategory = searchParams.get('categoryId') ?? ''
    if (urlTopic) setTopicId(urlTopic)
    if (searchParams.get('timed') === '1') setTimed(true)
    const count = searchParams.get('count')
    if (count) setQuestionCount(count)
    setCategoryName(topics.find((t) => t.category_id === urlCategory)?.categories?.name ?? '')
  }, [searchParams, topics])

  const planKey = plan as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[planKey]?.questions_per_day ?? 0
  const remaining = Math.max(0, limit - questionsUsedToday)
  const isUnlimited = limit >= 999999
  const locked = !isUnlimited && remaining === 0

  const filteredTopics = topics.filter((t) => {
    const testNames = testNamesOf(t)
    const matchesTest = testNames.includes(testType) || testNames.length === 0
    const sectionName = t.categories?.sections?.name ?? ''
    const matchesSection = section === 'all' || sectionName === section
    return matchesTest && matchesSection
  })

  function handleStart() {
    const params = new URLSearchParams({
      testType,
      difficulty,
      count: questionCount,
      timed: timed ? '1' : '0',
      adaptive: adaptive ? '1' : '0',
      unattempted: unattempted ? '1' : '0',
      calculator: calculator ? '1' : '0',
      shuffle: shuffle ? '1' : '0',
      pace: secondsPerQuestion,
    })
    if (topicId !== 'all') params.set('topicId', topicId)
    if (categoryName) params.set('categoryName', categoryName)
    if (section !== 'all') params.set('sectionName', section)
    if (fromMistakes) params.set('fromMistakes', '1')
    router.push(`/practice/session?${params.toString()}`)
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pt-2 pb-8">
      <h1 className="font-display text-2xl">Practice</h1>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Test</p>
        <div className="flex gap-2">
          {(['SAT', 'ACT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTestType(t)}
              className={`flex-1 rounded-2xl py-2 text-sm font-semibold ${
                testType === t ? 'neu-raised text-white' : 'neu-sm text-paper'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Section</p>
        <div className="flex flex-wrap gap-2">
          {['all', 'Math', 'Reading and Writing', 'English', 'Reading', 'Science'].map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`rounded-xl px-3 py-2 text-sm ${section === s ? 'neu-raised text-white' : 'neu-sm text-paper'}`}
            >
              {s === 'all' ? 'All' : s === 'Reading and Writing' ? 'R&W' : s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Topic</p>
        <Select value={topicId} onValueChange={setTopicId}>
          <SelectTrigger>
            <SelectValue placeholder="All topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {filteredTopics.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Difficulty</p>
        <div className="flex flex-wrap gap-2">
          {['mixed', 'easy', 'medium', 'hard'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-xl px-3 py-2 text-sm capitalize ${difficulty === d ? 'neu-raised text-white' : 'neu-sm text-paper'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Questions</p>
        <div className="flex flex-wrap gap-2">
          {['5', '10', '15', '20', '30', '44'].map((n) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              disabled={!isUnlimited && Number(n) > remaining}
              className={`rounded-xl px-3 py-2 text-sm disabled:opacity-40 ${
                questionCount === n ? 'neu-raised text-white' : 'neu-sm text-paper'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Seconds per question</p>
        <div className="flex flex-wrap gap-2">
          {['45', '60', '75', '90', '120'].map((n) => (
            <button
              key={n}
              onClick={() => setSecondsPerQuestion(n)}
              className={`rounded-xl px-3 py-2 text-sm ${secondsPerQuestion === n ? 'neu-raised text-white' : 'neu-sm text-paper'}`}
            >
              {n}s
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="accent-[#ff6b57]" />
          Timed
        </label>
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} className="accent-[#ff6b57]" />
          Adaptive
        </label>
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={unattempted} onChange={(e) => setUnattempted(e.target.checked)} className="accent-[#ff6b57]" />
          New only
        </label>
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={calculator} onChange={(e) => setCalculator(e.target.checked)} className="accent-[#ff6b57]" />
          Calculator
        </label>
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={fromMistakes} onChange={(e) => setFromMistakes(e.target.checked)} className="accent-[#ff6b57]" />
          From misses
        </label>
        <label className="flex cursor-pointer items-center gap-2 neu-sm px-3 py-2">
          <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="accent-[#ff6b57]" />
          Shuffle
        </label>
      </div>

      {locked && (
        <a href="/pricing" className="block text-center text-sm text-signal">Upgrade for more</a>
      )}

      <Button className="w-full" onClick={handleStart} disabled={locked}>
        <Play className="mr-2 h-4 w-4" />
        {locked ? 'Limit reached' : 'Start'}
      </Button>
    </div>
  )
}
