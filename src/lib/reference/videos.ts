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
    {
      say: `Here's the move: ${card.rule} I'll walk you through it slowly so you can copy it on the real test.`,
      headline: 'What this lesson solves',
      lines: [card.rule, 'Watch each step — then pause and try it yourself.'],
      parts: breakdown?.parts,
    },
  ]
  card.steps.forEach((step, index) => {
    const why =
      index === 0
        ? 'Start here so you do not thrash around.'
        : index === card.steps.length - 1
          ? 'This last check catches the trap answer.'
          : 'Do this before you look at the next choice.'
    beats.push({
      say: `Step ${index + 1}: ${step} ${why}`,
      headline: `Step ${index + 1} of ${card.steps.length}`,
      lines: card.steps.slice(0, index + 1),
      parts: breakdown?.parts,
    })
  })
  beats.push({
    say: `Why it works: ${card.detail} On test day, run this checklist in under 20 seconds.`,
    headline: kind === 'vocab' && breakdown ? `Word: ${breakdown.whole}` : 'Why this works',
    lines: [card.detail, 'Trap to avoid: rushing into a familiar-looking wrong choice.'],
    parts: breakdown?.parts,
  })
  beats.push({
    say: 'Quick recap: remember the rule, run the steps in order, then lock your answer and move. Replay anytime you get stuck on this pattern.',
    headline: 'Takeaway',
    lines: [card.rule, ...card.steps.slice(0, 2), 'Lock in → next question'],
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
      blurb: shortBlurb(
        kind === 'vocab'
          ? `Full walkthrough: break the word apart, test the sentence, avoid the trap definition.`
          : `Full walkthrough: ${card.rule}`,
      ),
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
        say: `We'll solve this in Desmos. Recognition cue: ${item.recognition_rule}. ${item.when_to_use}`,
        headline: 'When to use this',
        lines: [item.recognition_rule, item.example_problem],
      },
      {
        say: `Problem we're solving: ${item.example_problem}. Don't solve by hand yet — open Desmos and follow each line I type.`,
        headline: 'The problem',
        lines: [item.example_problem],
      },
      ...item.example_desmos_input.map((line, index) => ({
        say:
          index === 0
            ? `Line 1: type ${line}. That draws the first graph. Confirm it appears before you type anything else.`
            : `Line ${index + 1}: type ${line}. Compare both graphs. The answer is usually where they meet or where a region is shaded.`,
        headline: `Type line ${index + 1}`,
        lines: item.example_desmos_input.slice(0, index + 1),
      })),
      {
        say: `What you should see: ${item.example_result}. If your screen looks different, check parentheses and whether you are in degree mode for trig.`,
        headline: 'Read the graph',
        lines: item.example_desmos_input.concat([item.example_result]),
      },
      {
        say: `Test-day checklist: ${item.student_steps.join(' ')}`,
        headline: 'Do this on the test',
        lines: item.student_steps,
      },
      {
        say: 'Recap: recognize the pattern, type the expressions carefully, read the intersection or shaded region, then pick the matching choice. Replay if any line felt fuzzy.',
        headline: 'Takeaway',
        lines: [item.recognition_rule, 'Type carefully → read the graph → match the choice'],
      },
    ]
    return {
      id: `desmos-${item.slug}`,
      title: item.title,
      rule: item.recognition_rule,
      blurb: shortBlurb(`Step-by-step Desmos: ${item.when_to_use}`),
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
          say: `${item.name} belongs with ${group.title.toLowerCase()}. Memorize the shape of the formula first, then practice plugging numbers without rearranging blindly.`,
          headline: group.title,
          lines: [`${item.name}`, group.note || 'Write the formula before you plug numbers.'],
        },
        {
          say: `Write it exactly like this: ${item.formula}. Say each symbol out loud so you don't drop a squared or a 2.`,
          headline: item.name,
          lines: [item.formula],
        },
        {
          say: `How to use it: identify what the question gives you, circle what it asks for, write ${item.formula}, then substitute. ${group.note || 'Do not skip writing the formula — that is where careless errors start.'}`,
          headline: 'How to apply it',
          lines: [item.formula, 'Given → Asked → Formula → Substitute → Simplify'],
        },
        {
          say: `Common miss: solving for the wrong letter. If the question asks for diameter and you found radius, double it. If it asks for area and you found side length, finish the formula.`,
          headline: 'Trap to avoid',
          lines: [item.formula, 'Check: did you answer the asked quantity?'],
        },
        {
          say: `Takeaway: ${item.name} = ${item.formula}. Write it, plug carefully, verify units.`,
          headline: 'Takeaway',
          lines: [item.formula, item.name],
        },
      ]
      return {
        id: `formula-${group.title}-${item.name}`,
        title: item.name,
        rule: group.title,
        blurb: shortBlurb(`Learn ${item.name}: ${item.formula}`),
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
