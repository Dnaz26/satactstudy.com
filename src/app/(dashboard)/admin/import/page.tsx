'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface ParsedQuestion {
  question_text: string
  answer_choices: Record<string, string>
  correct_answer: string
  difficulty: string
  topic_name: string
  test_type: string
  status: string
}

export default function AdminImportPage() {
  const [jsonInput, setJsonInput] = React.useState('')
  const [parsed, setParsed] = React.useState<ParsedQuestion[]>([])
  const [loading, setLoading] = React.useState(false)
  const [approving, setApproving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [approved, setApproved] = React.useState(false)

  async function handleParse() {
    setError('')
    setLoading(true)

    let questions
    try {
      questions = JSON.parse(jsonInput) as ParsedQuestion[]
    } catch {
      setError('Invalid JSON format. Please check your input.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/questions/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    })

    const data = await res.json() as { questions?: ParsedQuestion[]; error?: string }

    if (!res.ok) {
      setError(data.error ?? 'Import failed')
    } else {
      setParsed(data.questions ?? [])
    }
    setLoading(false)
  }

  async function handleApprove() {
    setApproving(true)
    const res = await fetch('/api/admin/questions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: parsed }),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    if (data.success) {
      setApproved(true)
      setParsed([])
      setJsonInput('')
    } else {
      setError(data.error ?? 'Approval failed')
    }
    setApproving(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-paper">Import Questions</h1>

      {approved && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-ok">
          <CheckCircle className="w-5 h-5" />
          Questions approved and imported successfully!
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paste Questions JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-fog">
            Paste an array of question objects. Each must have: question_text, answer_choices (object), correct_answer, difficulty.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-transparent neu-inset p-4 text-sm text-paper font-mono focus:outline-none focus:ring-2 focus:ring-signal/40 resize-none"
            placeholder='[{"question_text": "...", "answer_choices": {"A": "...", "B": "..."}, "correct_answer": "A", "difficulty": "medium"}]'
          />

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-bad text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button onClick={handleParse} loading={loading} className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Parse &amp; Classify with AI
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-8">
            <LoadingSpinner size="lg" text="AI is classifying your questions..." />
          </CardContent>
        </Card>
      )}

      {parsed.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{parsed.length} Questions Ready</CardTitle>
              <Button onClick={handleApprove} loading={approving}>
                Approve All & Import
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {parsed.map((q, i) => (
                <div key={i} className="p-3 rounded-xl border border-transparent neu-inset">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{q.test_type}</Badge>
                    <Badge variant={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'success'} className="capitalize">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-fog">{q.topic_name}</span>
                  </div>
                  <p className="text-sm text-paper line-clamp-2">{q.question_text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
