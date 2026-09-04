'use client'

import { Calculator, Lightbulb, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PracticeTools({
  chatOpen,
  calculatorOpen,
  onChat,
  onCalculator,
  onHint,
}: {
  chatOpen?: boolean
  calculatorOpen?: boolean
  onChat: () => void
  onCalculator: () => void
  onHint: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-1">
      <button
        type="button"
        onClick={onChat}
        className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', chatOpen ? 'neu-raised text-white' : 'neu-sm text-paper')}
        aria-label="Chat with Nova"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onCalculator}
        className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', calculatorOpen ? 'neu-raised text-white' : 'neu-sm text-paper')}
        aria-label="Open calculator"
      >
        <Calculator className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onHint}
        className="flex h-12 w-12 items-center justify-center rounded-2xl neu-sm text-paper"
        aria-label="Hint"
      >
        <Lightbulb className="h-5 w-5" />
      </button>
    </div>
  )
}
