'use client'

import { cn } from '@/lib/utils'
import { officialChoiceLabel } from '@/lib/schema'
import { isStudentProduced } from '@/lib/questions/render'
import { QuestionPrompt } from './question-prompt'
import { MathDiagram } from './math-diagram'
import type { QuestionCalculatorConfig } from '@/types/desmos'

export type BookletQuestion = {
  id: string
  question_text: string
  choices: Array<{ key: string; text: string }>
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic_id: string | null
  topic_name: string | null
  section_name?: string | null
  test_type?: string | null
  question_type?: string | null
  passage_title?: string | null
  passage_content?: string | null
  image_url?: string | null
  official_explanation?: string | null
  ai_explanation?: string | null
  calculator_config?: QuestionCalculatorConfig | null
}

export type BookletMark = {
  correct: boolean
  why?: string
}

type Group = {
  key: string
  title: string | null
  passage: string | null
  items: Array<{ question: BookletQuestion; number: number }>
}

function groupQuestions(questions: BookletQuestion[]): Group[] {
  const groups: Group[] = []
  for (const [index, question] of questions.entries()) {
    const passage = question.passage_content?.trim() || null
    const last = groups[groups.length - 1]
    if (last && last.passage === passage) {
      last.items.push({ question, number: index + 1 })
      continue
    }
    groups.push({
      key: `${passage ? 'passage' : 'sheet'}-${index}`,
      title: question.passage_title ?? null,
      passage,
      items: [{ question, number: index + 1 }],
    })
  }
  return groups
}

function BookletItem({
  question,
  number,
  answer,
  mark,
  focused,
  onFocus,
  onAnswer,
  onCheck,
}: {
  question: BookletQuestion
  number: number
  answer: string
  mark?: BookletMark
  focused: boolean
  onFocus: () => void
  onAnswer: (value: string) => void
  onCheck: () => void
}) {
  const spr = isStudentProduced(question.question_type, question.choices)
  const choices = question.choices ?? []

  return (
    <article
      id={`q-${question.id}`}
      onClick={onFocus}
      className={cn(
        'break-inside-avoid space-y-2 border-b border-[#1c2740]/10 pb-4',
        focused && 'outline outline-1 outline-[#ff6b57]/50 outline-offset-4'
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-xs font-bold">{number}.</span>
        <QuestionPrompt text={question.question_text} className="mb-0 flex-1 text-[13px] leading-5 text-[#1c2740]" />
      </div>
      <MathDiagram text={question.question_text} imageUrl={question.image_url} />

      {spr ? (
        <input
          value={answer}
          onFocus={onFocus}
          onChange={(event) => onAnswer(event.target.value)}
          disabled={Boolean(mark)}
          inputMode="decimal"
          placeholder="Write your answer"
          className="ml-6 w-[min(100%,12rem)] border-b border-[#1c2740] bg-transparent px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <div className="ml-6 space-y-1.5">
          {choices.map(({ key, text }) => {
            const label = officialChoiceLabel(key, question.test_type, number)
            const filled = answer === key
            return (
              <button
                key={key}
                type="button"
                disabled={Boolean(mark)}
                onClick={() => {
                  onFocus()
                  onAnswer(key)
                }}
                className="flex w-full items-start gap-2 text-left text-[13px] leading-5 disabled:opacity-80"
              >
                <span
                  className="test-bubble mt-0.5 shrink-0"
                  data-filled={filled && !mark ? 'true' : undefined}
                  data-ok={mark && key === question.correct_answer ? 'true' : undefined}
                  data-bad={mark && filled && key !== question.correct_answer ? 'true' : undefined}
                >
                  {label}
                </span>
                <QuestionPrompt
                  text={text}
                  className={cn(
                    'mb-0 flex-1 text-[13px] leading-5 text-[#1c2740]',
                    mark && key === question.correct_answer && 'text-ok',
                    mark && filled && key !== question.correct_answer && 'text-bad'
                  )}
                />
              </button>
            )
          })}
        </div>
      )}

      {!mark && answer && (
        <button type="button" onClick={onCheck} className="ml-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c45a3c]">
          Check
        </button>
      )}
      {mark && (
        <div className="ml-6 text-[12px] leading-5">
          <p className={mark.correct ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
            {mark.correct ? 'Correct' : `Correct answer: ${officialChoiceLabel(question.correct_answer, question.test_type, number)}`}
          </p>
          {mark.why ? (
            <QuestionPrompt
              text={mark.why}
              className="mt-1 mb-0 whitespace-pre-wrap text-[12px] leading-5 text-[#1c2740]/80"
            />
          ) : null}
        </div>
      )}
    </article>
  )
}

export function TestBooklet({
  testType,
  sectionLabel,
  questions,
  answers,
  marks,
  focusedId,
  onFocus,
  onAnswer,
  onCheck,
}: {
  testType: string
  sectionLabel: string
  questions: BookletQuestion[]
  answers: Record<string, string>
  marks: Record<string, BookletMark>
  focusedId: string | null
  onFocus: (id: string) => void
  onAnswer: (id: string, value: string) => void
  onCheck: (id: string) => void
}) {
  const groups = groupQuestions(questions)
  const marked = Object.keys(marks).length
  const filled = Object.values(answers).filter(Boolean).length

  return (
    <div className="test-sheet overflow-hidden rounded-sm">
      <header className="flex items-end justify-between gap-3 border-b-2 border-[#1c2740] px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1c2740]/60">Practice test</p>
          <h1 className="font-display text-lg leading-none">{testType} · {sectionLabel}</h1>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#1c2740]/70">
          {questions.length} questions · {filled} marked · {marked} scored
        </p>
      </header>

      <div className="border-b border-[#1c2740]/20 px-5 py-2 text-[11px] leading-4 text-[#1c2740]/75">
        Work every question on this sheet. Fill one bubble per question. You can jump around and score a question when you want the answer.
      </div>

      <div className="test-sheet-lines space-y-6 px-5 py-5">
        {groups.map((group) => (
          group.passage ? (
            <section key={group.key} className="grid gap-5 md:grid-cols-2">
              <aside className="border border-[#1c2740]/15 bg-[#fffdf7] p-3">
                {group.title ? <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#1c2740]/55">{group.title}</p> : null}
                <p className="whitespace-pre-wrap text-[13px] leading-6 text-[#1c2740]">{group.passage}</p>
              </aside>
              <div className="space-y-4">
                {group.items.map(({ question, number }) => (
                  <BookletItem
                    key={question.id}
                    question={question}
                    number={number}
                    answer={answers[question.id] ?? ''}
                    mark={marks[question.id]}
                    focused={focusedId === question.id}
                    onFocus={() => onFocus(question.id)}
                    onAnswer={(value) => onAnswer(question.id, value)}
                    onCheck={() => onCheck(question.id)}
                  />
                ))}
              </div>
            </section>
          ) : (
            <section key={group.key} className="grid gap-x-6 gap-y-5 md:grid-cols-2">
              {group.items.map(({ question, number }) => (
                <div key={question.id}>
                  <BookletItem
                    question={question}
                    number={number}
                    answer={answers[question.id] ?? ''}
                    mark={marks[question.id]}
                    focused={focusedId === question.id}
                    onFocus={() => onFocus(question.id)}
                    onAnswer={(value) => onAnswer(question.id, value)}
                    onCheck={() => onCheck(question.id)}
                  />
                </div>
              ))}
            </section>
          )
        ))}
      </div>
    </div>
  )
}

export function AnswerSheet({
  questions,
  answers,
  marks,
  focusedId,
  onJump,
}: {
  questions: BookletQuestion[]
  answers: Record<string, string>
  marks: Record<string, BookletMark>
  focusedId: string | null
  onJump: (id: string) => void
}) {
  return (
    <aside className="test-sheet h-fit p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#1c2740]/60">Answer sheet</p>
      <ol className="space-y-1.5">
        {questions.map((question, index) => {
          const number = index + 1
          const spr = isStudentProduced(question.question_type, question.choices)
          const mark = marks[question.id]
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onJump(question.id)}
                className={cn('flex w-full items-center gap-1.5 text-left', focusedId === question.id && 'bg-[#ff6b57]/10')}
              >
                <span className="w-5 font-mono text-[10px] font-bold">{number}</span>
                {spr ? (
                  <span className="truncate font-mono text-[10px]">{answers[question.id] || '—'}</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {(question.choices ?? []).map(({ key }) => (
                      <span
                        key={key}
                        className="test-bubble"
                        data-filled={!mark && answers[question.id] === key ? 'true' : undefined}
                        data-ok={mark && key === question.correct_answer ? 'true' : undefined}
                        data-bad={mark && answers[question.id] === key && key !== question.correct_answer ? 'true' : undefined}
                      >
                        {officialChoiceLabel(key, question.test_type, number)}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
