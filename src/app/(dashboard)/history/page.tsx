import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils'
import { History, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

type AttemptRow = {
  id: string
  correct: boolean | null
  selected_answer: string | null
  time_spent_seconds: number | null
  created_at: string | null
  questions: { question_text: string; topic_name: string | null; difficulty: string | null } | null
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawAttempts } = await supabase
    .from('attempts')
    .select('id, correct, selected_answer, time_spent_seconds, created_at, questions(question_text, topic_name, difficulty)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const attempts = (rawAttempts ?? []) as unknown as AttemptRow[]
  const totalCorrect = attempts.filter((a) => a.correct).length
  const accuracy = attempts.length > 0 ? Math.round((totalCorrect / attempts.length) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl">
            <History className="h-6 w-6 text-signal" />
            History
          </h1>
          <p className="mt-1 text-sm text-fog">{attempts.length} questions · {accuracy}% accuracy</p>
        </div>
        <Link href="/practice"><Button>Practice</Button></Link>
      </div>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-fog">No questions answered yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {attempt.correct ? (
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{attempt.questions?.question_text ?? 'Question not available'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-fog">{attempt.questions?.topic_name ?? 'Unknown'}</span>
                      {attempt.questions?.difficulty && <Badge variant="secondary">{attempt.questions.difficulty}</Badge>}
                      <span className="font-mono text-xs text-fog">{formatTime(attempt.time_spent_seconds ?? 0)}</span>
                      {attempt.created_at && <span className="text-xs text-fog">{formatDate(attempt.created_at)}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
