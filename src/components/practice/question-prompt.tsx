'use client'

import { applyLatexSymbols, renderPromptSegments, splitNumericFractions, type MathPart } from '@/lib/questions/render'

function MathNodes({ parts }: { parts: MathPart[] }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === 'text') return <span key={index}>{part.value}</span>
        if (part.kind === 'sup') {
          return (
            <sup key={index} className="ml-0.5 text-[0.7em]">
              <MathNodes parts={part.value} />
            </sup>
          )
        }
        return (
          <span key={index} className="mx-1 inline-flex flex-col items-center align-middle text-[0.85em] leading-none">
            <span className="border-b border-current px-1 pb-0.5">
              <MathNodes parts={part.num} />
            </span>
            <span className="px-1 pt-0.5">
              <MathNodes parts={part.den} />
            </span>
          </span>
        )
      })}
    </>
  )
}

export function QuestionPrompt({
  text,
  className,
  as: Tag = 'p',
}: {
  text: string
  className?: string
  as?: 'p' | 'span'
}) {
  const segments = renderPromptSegments(text)
  return (
    <Tag className={className ?? 'mb-6 whitespace-pre-wrap text-base leading-relaxed text-paper'}>
      {segments.map((segment, index) =>
        segment.math ? (
          <span key={index} className="whitespace-nowrap text-paper">
            <MathNodes parts={segment.parts} />
          </span>
        ) : (
          <span key={index}>
            {segment.value.includes('/')
              ? <MathNodes parts={splitNumericFractions(applyLatexSymbols(segment.value))} />
              : applyLatexSymbols(segment.value)}
          </span>
        )
      )}
    </Tag>
  )
}

export function TutorRichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4
        const value = bold ? part.slice(2, -2) : part
        return (
          <QuestionPrompt
            key={index}
            as="span"
            text={value}
            className={bold ? 'mb-0 font-semibold text-paper' : 'mb-0 text-inherit'}
          />
        )
      })}
    </span>
  )
}

export function HighlightedText({
  text,
  highlight,
  className,
}: {
  text: string
  highlight?: string
  className?: string
}) {
  const focus = highlight?.trim()
  if (!focus) return <TutorRichText text={text} className={className} />
  const escaped = focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'))
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const hit = part.toLowerCase() === focus.toLowerCase()
        if (!hit) return <TutorRichText key={`${part}-${index}`} text={part} />
        return (
          <mark key={`${part}-${index}`} className="rounded-md bg-signal/30 px-1 font-semibold text-paper">
            <TutorRichText text={part} />
          </mark>
        )
      })}
    </span>
  )
}
