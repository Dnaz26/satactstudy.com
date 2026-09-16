import type { GuidedLesson, LessonStepId } from './lesson-flow'
import { isNearDuplicate } from '@/lib/tutor/anti-repeat'

export type TeachMood = 'idle' | 'talk' | 'point' | 'cheer' | 'think'

export type TeachBeat = {
  say: string
  highlight?: string
  mood: TeachMood
  focusLabel?: string
  focusSide?: 'yes' | 'no' | 'equation'
  /** Internal agent checklist label — never shown as a student checklist UI. */
  checklistLabel?: string
}

export { isNearDuplicate }

export function dedupeTeachBeats(beats: TeachBeat[]): TeachBeat[] {
  const out: TeachBeat[] = []
  for (const beat of beats) {
    const say = beat.say.trim()
    if (!say) continue
    if (out.some((prev) => isNearDuplicate(prev.say, say))) continue
    out.push(beat)
  }
  return out
}

/** Agent teaching beats. Student phases handle their own UI. */
export function buildTeachBeats(lesson: GuidedLesson, stepId: LessonStepId): TeachBeat[] {
  const yes = lesson.examples.yes
  const no = lesson.examples.no
  const title = lesson.title

  if (stepId === 'definition') {
    return dedupeTeachBeats([
      {
        mood: 'talk',
        say: lesson.whatItIs,
        checklistLabel: 'Definition',
      },
    ])
  }

  if (stepId === 'irlExample') {
    return dedupeTeachBeats([
      {
        mood: 'cheer',
        say: lesson.irlExample,
        checklistLabel: 'Real-world example',
      },
    ])
  }

  if (stepId === 'breakdown') {
    return dedupeTeachBeats([
      {
        mood: 'point',
        say: lesson.breakdown,
        checklistLabel: 'Breakdown',
      },
      {
        mood: 'talk',
        say: `When you see a new ${title} item, name each part, say what it controls, then check one tiny example before you answer.`,
        checklistLabel: 'How to analyze it',
      },
    ])
  }

  if (stepId === 'build') {
    return [{
      mood: 'point',
      say: `I built this ${title} example for you: ${lesson.translateExample}. Translate it — say what each part means and what you would analyze first.`,
      checklistLabel: 'Build & translate',
      focusSide: 'equation',
      focusLabel: lesson.translateExample,
    }]
  }

  if (stepId === 'yesExamples') {
    const beats: TeachBeat[] = []
    const items = yes.slice(0, 5)
    if (items[0]) {
      beats.push({
        mood: 'cheer',
        say: `Correct uses of ${title}. I will show each good example on the board while I explain why it works.`,
        focusSide: 'yes',
        focusLabel: items[0].label,
        highlight: items[0].label,
        checklistLabel: 'Intro correct examples',
      })
    }
    for (const item of items) {
      beats.push({
        mood: 'point',
        say: `Look at “${item.label}”. ${item.why || `This follows the rule for ${title}.`}`,
        focusSide: 'yes',
        focusLabel: item.label,
        highlight: item.label,
        checklistLabel: `Correct: ${item.label.slice(0, 28)}`,
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
        checklistLabel: 'Intro incorrect examples',
      })
    }
    for (const item of items) {
      beats.push({
        mood: 'point',
        say: `Look at “${item.label}”. ${item.why || `This breaks the ${title} rule.`}`,
        focusSide: 'no',
        focusLabel: item.label,
        highlight: item.label,
        checklistLabel: `Trap: ${item.label.slice(0, 28)}`,
      })
    }
    return dedupeTeachBeats(beats)
  }

  if (stepId === 'explainBack') {
    return [{
      mood: 'point',
      say: `Your turn — explain ${title} in your own words. I will score it out of 100. You need 85+ to keep going.`,
      checklistLabel: 'Explain in your words',
    }]
  }

  if (stepId === 'practice') {
    return [{
      mood: 'talk',
      say: `Practice together: 5 multiple-choice questions, one at a time, easy to hard. Miss one and I give you another at the same level.`,
      checklistLabel: 'Practice five questions',
    }]
  }

  return [{
    mood: 'cheer',
    say: `Finale — write your own ${title} question, the correct answer, and a short analysis. Score 95+ and we save it as a bank example.`,
    checklistLabel: 'Build your own question',
  }]
}

/** Kept for older imports — copilot phases no longer use equation part prompts. */
export function copilotParts(lesson: GuidedLesson) {
  return [
    { key: 'idea', label: lesson.title, prompt: `Explain ${lesson.title} in your own words.` },
  ]
}
