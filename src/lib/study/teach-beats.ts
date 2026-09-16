import type { GuidedLesson, LessonStepId } from './lesson-flow'

export type TeachMood = 'idle' | 'talk' | 'point' | 'cheer' | 'think'

export type TeachBeat = {
  say: string
  highlight?: string
  mood: TeachMood
  focusLabel?: string
  focusSide?: 'yes' | 'no' | 'equation'
}

function normalizeSay(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function dedupeTeachBeats(beats: TeachBeat[]): TeachBeat[] {
  const seen = new Set<string>()
  const out: TeachBeat[] = []
  for (const beat of beats) {
    const key = normalizeSay(beat.say)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(beat)
  }
  return out
}

/** Agent-only teaching beats. Student phases handle their own UI. */
export function buildTeachBeats(lesson: GuidedLesson, stepId: LessonStepId): TeachBeat[] {
  const yes = lesson.examples.yes
  const no = lesson.examples.no
  const title = lesson.title

  if (stepId === 'what') {
    return dedupeTeachBeats([
      {
        mood: 'talk',
        say: lesson.whatItIs,
      },
      {
        mood: 'point',
        say: lesson.breakdown,
      },
    ])
  }

  if (stepId === 'yesExamples') {
    const beats: TeachBeat[] = []
    const items = yes.slice(0, 5)
    if (items[0]) {
      beats.push({
        mood: 'cheer',
        say: `Here is ${title} used correctly. I will show each good example on the board while I explain why it works.`,
        focusSide: 'yes',
        focusLabel: items[0].label,
        highlight: items[0].label,
      })
    }
    for (const item of items) {
      beats.push({
        mood: 'point',
        say: `Look at “${item.label}”. ${item.why || `This follows the rule for ${title}.`}`,
        focusSide: 'yes',
        focusLabel: item.label,
        highlight: item.label,
      })
    }
    return dedupeTeachBeats(beats)
  }

  if (stepId === 'noExamples') {
    const beats: TeachBeat[] = []
    const items = no.slice(0, 5)
    if (items[0]) {
      beats.push({
        mood: 'think',
        say: `Now the traps — these are NOT ${title}. The board will show each one while I explain why it fails.`,
        focusSide: 'no',
        focusLabel: items[0].label,
        highlight: items[0].label,
      })
    }
    for (const item of items) {
      beats.push({
        mood: 'point',
        say: `Look at “${item.label}”. ${item.why || `This breaks the ${title} rule.`}`,
        focusSide: 'no',
        focusLabel: item.label,
        highlight: item.label,
      })
    }
    return dedupeTeachBeats(beats)
  }

  if (stepId === 'explainBack') {
    return [{
      mood: 'point',
      say: `Your turn — explain ${title} in your own words. I will score it out of 100. You need 85+ to keep going.`,
    }]
  }

  if (stepId === 'practice') {
    return [{
      mood: 'talk',
      say: `Practice together: 5 SAT/ACT-style questions, one at a time, easy to hard. Miss one and I give you another at the same level.`,
    }]
  }

  return [{
    mood: 'cheer',
    say: `Copilot finale — write your own ${title} question like a real test item. Score 95+ and we save it as a bank example.`,
  }]
}

export function isNearDuplicate(a: string, b: string): boolean {
  const na = normalizeSay(a)
  const nb = normalizeSay(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

/** Kept for older imports — copilot phases no longer use equation part prompts. */
export function copilotParts(lesson: GuidedLesson) {
  return [
    { key: 'idea', label: lesson.title, prompt: `Explain ${lesson.title} in your own words.` },
  ]
}
