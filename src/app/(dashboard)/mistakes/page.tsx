import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils'
import { MISTAKE_TYPE_LABELS } from '@/lib/schema'
import { AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'

type MistakeRow = {
  id: string
  selected_answer: string | null
  mistake_type: string | null
  time_spent_seconds: number | null
  created_at: string | null
  questions: {
    id: string
    question_text: string
    correct_answer: string
    official_explanation: string | null
    topic_name: string | null
    difficulty: string | null
  } | null
}

export default async function MistakesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawMistakes } = await supabase
    .from('attempts')
    .select('id, selected_answer, mistake_type, time_spent_seconds, created_at, questions(id, question_text, correct_answer, official_explanation, topic_name, difficulty)')
    .eq('user_id', user.id)
    .eq('correct', false)
    .order('created_at', { ascending: false })
    .limit(50)

  const mistakes = (rawMistakes ?? []) as unknown as MistakeRow[]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl">
            <AlertTriangle className="h-6 w-6 text-warn" />
            Mistakes
          </h1>
          <p className="mt-1 text-sm text-fog">{mistakes.length} to review</p>
        </div>
        <Link href="/practice"><Button>Practice similar</Button></Link>
      </div>

      {mistakes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-fog">No missed questions yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mistakes.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-bad" />
                  <div className="flex-1 space-y-3">
                    <p className="text-sm leading-relaxed">{m.questions?.question_text ?? 'Question not available'}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-fog">{m.questions?.topic_name ?? 'Unknown'}</span>
                      {m.questions?.difficulty && <Badge variant="secondary">{m.questions.difficulty}</Badge>}
                      {m.mistake_type && (
                        <Badge variant="warning">{MISTAKE_TYPE_LABELS[m.mistake_type] ?? m.mistake_type}</Badge>
                      )}
                      <span className="font-mono text-xs text-fog">{formatTime(m.time_spent_seconds ?? 0)}</span>
                      {m.created_at && <span className="text-xs text-fog">{formatDate(m.created_at)}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="border border-bad/30 bg-bad/10 p-2">
                        <p className="text-fog">Your answer</p>
                        <p className="font-medium text-bad">{m.selected_answer}</p>
                      </div>
                      <div className="border border-ok/30 bg-ok/10 p-2">
                        <p className="text-fog">Correct</p>
                        <p className="font-medium text-ok">{m.questions?.correct_answer ?? '—'}</p>
                      </div>
                    </div>
                    {m.questions?.official_explanation && (
                      <p className="border border-line bg-ink p-3 text-xs text-fog">{m.questions.official_explanation}</p>
                    )}
                    <Link href={`/practice?topicId=${m.questions?.id ?? ''}`}>
                      <Button size="sm" variant="secondary">Practice similar</Button>
                    </Link>
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
