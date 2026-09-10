'use client'

import * as React from 'react'
import { Highlighter, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TextNote = {
  id: string
  text: string
  note: string
  createdAt: number
}

export function useHighlightNotes(containerRef: React.RefObject<HTMLElement | null>) {
  const [pending, setPending] = React.useState<{ text: string; x: number; y: number } | null>(null)
  const [notes, setNotes] = React.useState<TextNote[]>([])
  const [draft, setDraft] = React.useState('')

  const onMouseUp = React.useEffectEvent(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) return
    const text = sel.toString().trim()
    if (text.length < 2) return
    if (!containerRef.current.contains(sel.anchorNode)) return
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const parent = containerRef.current.getBoundingClientRect()
    setPending({
      text,
      x: Math.min(Math.max(rect.left - parent.left + rect.width / 2, 80), parent.width - 80),
      y: Math.max(rect.top - parent.top - 10, 8),
    })
    setDraft('')
  })

  function highlightOnly() {
    if (!pending) return
    setNotes((prev) => [...prev, { id: crypto.randomUUID(), text: pending.text, note: '', createdAt: Date.now() }])
    setPending(null)
    window.getSelection()?.removeAllRanges()
  }

  function saveNote() {
    if (!pending) return
    setNotes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: pending.text, note: draft.trim() || 'Note', createdAt: Date.now() },
    ])
    setPending(null)
    setDraft('')
    window.getSelection()?.removeAllRanges()
  }

  return {
    pending,
    notes,
    draft,
    setDraft,
    onMouseUp,
    highlightOnly,
    saveNote,
    clearPending: () => setPending(null),
  }
}

export function HighlightNoteChrome({
  pending,
  draft,
  setDraft,
  onHighlight,
  onSave,
  onClose,
  notes,
  className,
}: {
  pending: { text: string; x: number; y: number } | null
  draft: string
  setDraft: (v: string) => void
  onHighlight: () => void
  onSave: () => void
  onClose: () => void
  notes: TextNote[]
  className?: string
}) {
  return (
    <>
      {pending && (
        <div
          className="cast-note absolute z-30 w-60 -translate-x-1/2 p-3"
          style={{ left: pending.x, top: pending.y }}
        >
          <p className="line-clamp-2 text-[11px] text-fog">&ldquo;{pending.text}&rdquo;</p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a note…"
            className="mt-2 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-signal/30"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={onHighlight} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold">
              <Highlighter className="h-3 w-3" /> Highlight
            </button>
            <button type="button" onClick={onSave} className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-[11px] font-semibold text-white">
              <NotebookPen className="h-3 w-3" /> Note
            </button>
            <button type="button" onClick={onClose} className="px-1 text-[11px] text-fog">✕</button>
          </div>
        </div>
      )}
      {notes.length > 0 && (
        <div className={cn('mt-3 space-y-1.5', className)}>
          {notes.slice(-6).map((n) => (
            <div key={n.id} className="rounded-xl neu-sm px-3 py-2 text-xs">
              <span className="font-semibold text-signal">{n.text}</span>
              {n.note ? <span className="ml-2 text-fog">— {n.note}</span> : <span className="ml-2 text-fog">highlighted</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
