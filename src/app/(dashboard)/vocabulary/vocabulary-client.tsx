'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

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

export function VocabularyClient({ words }: VocabularyClientProps) {
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
      <div className="mx-auto w-full max-w-md pt-2">
        <h1 className="font-display text-2xl">Vocab</h1>
        <p className="mt-4 text-sm text-fog">Caught up. Come back tomorrow.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 pt-8 text-center">
        <h1 className="font-display text-2xl">Done</h1>
        <p className="text-fog">{completed} words.</p>
        <Button onClick={() => router.push('/dashboard')}>Home</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Vocab</h1>
        <span className="font-mono text-xs text-fog">{currentIndex + 1}/{words.length}</span>
      </div>
      <Progress value={(currentIndex / words.length) * 100} color="#8B5CF6" />
      <button
        type="button"
        className="flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl neu p-5 text-center"
        onClick={() => setFlipped(!flipped)}
      >
        {!flipped ? (
          <h2 className="font-display text-2xl">{currentWord?.word}</h2>
        ) : (
          <div className="space-y-3">
            <h2 className="font-display text-2xl">{currentWord?.word}</h2>
            <p className="text-fog">{currentWord?.definition}</p>
            {currentWord?.example_sentence && (
              <p className="text-sm italic text-fog">&ldquo;{currentWord.example_sentence}&rdquo;</p>
            )}
          </div>
        )}
      </button>
      {flipped ? (
        <div className="flex gap-3">
          <Button variant="destructive" className="flex-1" onClick={() => handleAnswer(false)} loading={loading}>
            Miss
          </Button>
          <Button variant="success" className="flex-1" onClick={() => handleAnswer(true)} loading={loading}>
            Know
          </Button>
        </div>
      ) : (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Tap</p>
      )}
    </div>
  )
}
