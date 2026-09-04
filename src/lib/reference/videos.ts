import { DESMOS_STRATEGIES } from '@/lib/desmos/strategies/catalog'
import {
  HARD_QUESTION_TIPS,
  MATH_FORMULAS,
  QUICK_TIPS,
  VOCABULARY_TRICKS,
  type ReferenceCard,
} from '@/lib/reference/content'
import { sceneForKind, shortBlurb, type PreviewScene } from '@/lib/reference/preview'

export type VideoKind = 'desmos' | 'vocab' | 'formula' | 'tip'

export type VideoBeat = {
  say: string
  headline: string
  lines: string[]
  parts?: Array<{ text: string; meaning: string }>
}

export type ReferenceVideo = {
  id: string
  title: string
  rule: string
  blurb: string
  kind: VideoKind
  scene: PreviewScene
  durationSec: number
  href?: string
  beats: VideoBeat[]
}

const WORD_BREAKDOWNS: Record<string, { whole: string; parts: Array<{ text: string; meaning: string }> }> = {
  'Split prefix, root, and suffix': {
    whole: 'untenable',
    parts: [
      { text: 'un-', meaning: 'not' },
      { text: 'ten', meaning: 'hold' },
      { text: '-able', meaning: 'can be' },
    ],
  },
  'Break the word into prefix, root, and suffix': {
    whole: 'untenable',
    parts: [
      { text: 'un-', meaning: 'not' },
      { text: 'ten', meaning: 'hold' },
      { text: '-able', meaning: 'can be' },
    ],
  },
  'Context beats the flashcard definition': {
    whole: 'qualify',
    parts: [
      { text: 'qual', meaning: 'of what kind' },
      { text: '-ify', meaning: 'to make' },
    ],
  },
  'Tone words are the real test': {
    whole: 'skeptical',
    parts: [
      { text: 'skept', meaning: 'look / doubt' },
      { text: '-ical', meaning: 'having that quality' },
    ],
  },
  'Word parts': {
    whole: 'revisit',
    parts: [
      { text: 're-', meaning: 'again' },
      { text: 'visit', meaning: 'go see' },
    ],
  },
}

function durationFromBeats(beats: VideoBeat[]): number {
  return Math.max(28, beats.reduce((sum, beat) => sum + Math.max(4, Math.ceil(beat.say.length / 18)), 0))
}

function tipBeats(card: ReferenceCard, kind: VideoKind): VideoBeat[] {
  const breakdown = WORD_BREAKDOWNS[card.title]
  const beats: VideoBeat[] = [
    { say: card.rule, headline: card.title, lines: [card.rule], parts: breakdown?.parts },
  ]
  card.steps.forEach((step, index) => {
    beats.push({
      say: step,
      headline: `Step ${index + 1}`,
      lines: card.steps.slice(0, index + 1),
      parts: breakdown?.parts,
    })
  })
  beats.push({
    say: card.detail,
    headline: kind === 'vocab' && breakdown ? breakdown.whole : 'On the real test',
    lines: [card.detail],
    parts: breakdown?.parts,
  })
  return beats
}

function fromCards(cards: ReferenceCard[], kind: VideoKind, prefix: string): ReferenceVideo[] {
  return cards.map((card, index) => {
    const beats = tipBeats(card, kind)
    return {
      id: `${prefix}-${index}-${card.title}`,
      title: card.title,
      rule: card.rule,
      blurb: shortBlurb(kind === 'vocab' ? 'Watch Nova break the word apart, then plug it back into the sentence.' : card.rule),
      kind,
      scene: sceneForKind(kind, card.title),
      durationSec: durationFromBeats(beats),
      href: card.href,
      beats,
    }
  })
}

export function tipVideos(): ReferenceVideo[] {
  return fromCards(QUICK_TIPS, 'tip', 'tip')
}

export function hardVideos(): ReferenceVideo[] {
  return fromCards(HARD_QUESTION_TIPS, 'tip', 'hard')
}

export function vocabVideos(): ReferenceVideo[] {
  return fromCards(VOCABULARY_TRICKS, 'vocab', 'vocab')
}

export function desmosVideos(): ReferenceVideo[] {
  return DESMOS_STRATEGIES.filter((item) => item.approved).map((item) => {
    const beats: VideoBeat[] = [
      {
        say: `Watch what I type in Desmos. ${item.when_to_use}`,
        headline: item.example_problem,
        lines: [],
      },
      ...item.example_desmos_input.map((line, index) => ({
        say: index === 0
          ? `Type this first: ${line}. That is the first graph.`
          : `Now type ${line}. Watch both sit on the same screen.`,
        headline: 'Desmos',
        lines: item.example_desmos_input.slice(0, index + 1),
      })),
      {
        say: item.example_result,
        headline: 'What you should see',
        lines: item.example_desmos_input,
      },
      {
        say: item.student_steps.join(' '),
        headline: 'Do this on the test',
        lines: item.student_steps,
      },
    ]
    return {
      id: `desmos-${item.slug}`,
      title: item.title,
      rule: item.recognition_rule,
      blurb: shortBlurb(item.when_to_use),
      kind: 'desmos' as const,
      scene: sceneForKind('desmos', item.slug),
      durationSec: durationFromBeats(beats),
      href: `/desmos/${item.slug}`,
      beats,
    }
  })
}

export function formulaVideos(): ReferenceVideo[] {
  return MATH_FORMULAS.flatMap((group) =>
    group.items.map((item) => {
      const beats: VideoBeat[] = [
        {
          say: `${item.name} is one of the ${group.title.toLowerCase()} formulas you need on SAT and ACT.`,
          headline: item.name,
          lines: [],
        },
        {
          say: `Write it like this: ${item.formula}`,
          headline: item.name,
          lines: [item.formula],
        },
        {
          say: group.note || `If a question names ${item.name.toLowerCase()}, this is the line you write first.`,
          headline: 'On the real test',
          lines: [item.formula, group.note ?? 'Write it before you plug numbers.'],
        },
      ]
      return {
        id: `formula-${group.title}-${item.name}`,
        title: item.name,
        rule: group.title,
        blurb: shortBlurb(item.formula),
        kind: 'formula' as const,
        scene: 'formula',
        durationSec: durationFromBeats(beats),
        beats,
      }
    }),
  )
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}
