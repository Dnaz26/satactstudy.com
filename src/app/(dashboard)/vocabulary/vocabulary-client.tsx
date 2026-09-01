'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { BookMarked, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react'

interface VocabWord {
  id: string
  word: string
  definition: string
  example_sentence: string | null
  difficulty: string | null
}

interface VocabularyClientProps {
  words: VocabWord[]
  allWords: VocabWord[]
  attemptMap: Record<string, { word_id: string; knew_it: boolean; next_review_at: string }>
}

export function VocabularyClient({ words, allWords }: VocabularyClientProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [completed, setCompleted] = React.useState(0)
  const [done, setDone] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const currentWord = words[currentIndex]

  async function handleAnswer(knew: boolean) {
    if (!currentWord || loading) return
    setLoading(true)

    await fetch('/api/vocabulary/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId: currentWord.id, knewIt: knew }),
    }).catch(() => {})

    setLoading(false)
    setCompleted(completed + 1)

    if (currentIndex + 1 >= words.length) {
      setDone(true)
    } else {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-paper mb-6">Vocabulary</h1>
        <Card>
          <CardContent>
            <EmptyState
              icon={<BookMarked className="w-8 h-8" />}
              title="All caught up!"
              description="You've reviewed all available vocabulary words. Come back tomorrow for more."
              action={{ label: 'Go to Dashboard', onClick: () => router.push('/dashboard') }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-6">
        <CheckCircle className="w-16 h-16 text-ok mx-auto" />
        <h1 className="text-2xl font-bold text-paper">Session Complete!</h1>
        <p className="text-fog">You reviewed {completed} vocabulary words.</p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-paper">Vocabulary</h1>
        <span className="text-sm text-fog">{currentIndex + 1} / {words.length}</span>
      </div>

      <Progress value={((currentIndex) / words.length) * 100} color="#8B5CF6" />

      <Card
        className="min-h-[280px] cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
      >
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[280px] text-center">
          {!flipped ? (
            <div>
              <p className="text-xs text-fog uppercase tracking-widest mb-4">Click to reveal definition</p>
              <h2 className="text-4xl font-bold text-paper">{currentWord?.word}</h2>
              <Badge
                variant={
                  currentWord?.difficulty === 'hard' ? 'danger' :
                  currentWord?.difficulty === 'medium' ? 'warning' : 'success'
                }
                className="mt-3 capitalize"
              >
                {currentWord?.difficulty}
              </Badge>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-paper">{currentWord?.word}</h2>
              <p className="text-fog text-lg leading-relaxed">{currentWord?.definition}</p>
              {currentWord?.example_sentence && (
                <p className="text-sm text-fog italic">&ldquo;{currentWord.example_sentence}&rdquo;</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {flipped && (
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1 h-14"
            onClick={() => handleAnswer(false)}
            loading={loading}
          >
            <ThumbsDown className="w-5 h-5 mr-2" />
            Didn&apos;t Know
          </Button>
          <Button
            variant="success"
            className="flex-1 h-14"
            onClick={() => handleAnswer(true)}
            loading={loading}
          >
            <ThumbsUp className="w-5 h-5 mr-2" />
            Knew It!
          </Button>
        </div>
      )}

      {!flipped && (
        <p className="text-center text-sm text-fog">Tap the card to see the definition</p>
      )}
    </div>
  )
}
