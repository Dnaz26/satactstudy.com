export interface EnglishStrategySeed {
  id: string
  slug: string
  title: string
  category: string
  recognition_rule: string
  description: string
  student_steps: string[]
  when_to_use: string
  why_it_works: string
  example: string
  sat_applicable: boolean
  act_applicable: boolean
}

function id(n: number): string {
  return `f3200000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`
}

export const ENGLISH_STRATEGIES: EnglishStrategySeed[] = [
  {
    id: id(1),
    slug: 'prefix_root_suffix',
    title: 'Break the word into prefix, root, and suffix',
    category: 'vocabulary',
    recognition_rule: 'Unknown word in context → split the word, then test the sentence.',
    description: 'Use morphology plus the sentence to pick the meaning that actually fits.',
    student_steps: ['Split the word.', 'Guess a meaning family.', 'Plug that meaning into the sentence.', 'Eliminate choices that break tone or logic.'],
    when_to_use: 'Words-in-context or vocabulary-in-context items.',
    why_it_works: 'The tested meaning is the one that keeps the sentence true, not the flashiest dictionary sense.',
    example: 'If a plan is “untenable,” un- + tenable points to “cannot be held,” so the sentence needs “cannot be defended.”',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(2),
    slug: 'transition_relationship',
    title: 'Name the relationship before reading choices',
    category: 'transitions',
    recognition_rule: 'Blank between two claims → contrast, cause, example, or addition.',
    description: 'Decide what the second sentence does to the first, then pick the transition that names that job.',
    student_steps: ['Cover the choices.', 'Say the relationship in plain words.', 'Match that job to one transition.', 'Reject synonyms that change the logic.'],
    when_to_use: 'Transition or conjunctive-adverb questions.',
    why_it_works: 'Wrong transitions are usually grammatical but logically backwards.',
    example: 'If sentence 2 reverses sentence 1, you need however/instead, not therefore.',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(3),
    slug: 'remove_interrupter',
    title: 'Remove the interrupting phrase and match subject to verb',
    category: 'grammar',
    recognition_rule: 'Extra phrase between subject and verb → ignore it, then agree.',
    description: 'Cross out prepositional phrases and appositives so the true subject is visible.',
    student_steps: ['Find the verb.', 'Cross out the extra phrase.', 'Name the real subject.', 'Make the verb match number and tense.'],
    when_to_use: 'Subject-verb agreement with long middle phrases.',
    why_it_works: 'The nearest noun is often a trap, not the subject.',
    example: '“The box of samples is missing,” not “are,” because box is singular.',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(4),
    slug: 'must_be_supported',
    title: 'Choose what the passage must support',
    category: 'inference',
    recognition_rule: 'Inference / implication → pick the claim the text forces, not a maybe.',
    description: 'An inference is a necessary next step, not a creative extra.',
    student_steps: ['Underline the relevant lines.', 'Ask what those lines require.', 'Cut choices that add new facts.', 'Keep the smallest supported claim.'],
    when_to_use: 'Inference, implication, or “the author suggests” questions.',
    why_it_works: 'Attractive wrong answers are possible, but the passage never proves them.',
    example: 'If a study found a correlation in one city, you cannot conclude a nationwide cause.',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(5),
    slug: 'punctuation_job',
    title: 'Give the punctuation a job',
    category: 'punctuation',
    recognition_rule: 'Comma/semicolon/colon question → decide if you are joining, listing, or introducing.',
    description: 'Each mark does one job. If the sentence does not need that job, the mark is wrong.',
    student_steps: ['Read the sentence without extra marks.', 'Decide if two complete sentences are present.', 'Use a period or semicolon only if both sides can stand alone.', 'Use a colon only to introduce an explanation or list.'],
    when_to_use: 'Standard English Conventions punctuation items.',
    why_it_works: 'Most SAT/ACT punctuation errors are two complete sentences glued with a comma, or a colon with no setup.',
    example: '“The result was clear: the bridge held.” The first clause is complete and the second explains it.',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(6),
    slug: 'main_idea_whole',
    title: 'The main idea must cover the whole passage',
    category: 'reading',
    recognition_rule: 'Main idea / purpose → if a choice only fits one paragraph, cut it.',
    description: 'A title-level claim has to survive the beginning, middle, and end.',
    student_steps: ['Skim the first and last sentences.', 'Note the repeated concern.', 'Reject detail-only choices.', 'Pick the claim that still works after the last paragraph.'],
    when_to_use: 'Main idea, primary purpose, or central claim questions.',
    why_it_works: 'Wrong answers are true details wearing a main-idea costume.',
    example: 'A passage that compares two theories is not “about one experiment.”',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(7),
    slug: 'concision_no_repeat',
    title: 'Delete the words that repeat the same idea',
    category: 'concision',
    recognition_rule: 'Wordy underlined phrase → keep the shortest version that does not lose meaning.',
    description: 'Redundancy is the most common SAT/ACT style error.',
    student_steps: ['Ask if two words say the same thing.', 'Keep one.', 'Check that the remaining sentence is still grammatical.'],
    when_to_use: 'Concision, style, or “which choice is most effective” items.',
    why_it_works: '“Each and every,” “past history,” and “completely finish” add no information.',
    example: '“The final outcome was success” becomes “The outcome was success.”',
    sat_applicable: true,
    act_applicable: true,
  },
  {
    id: id(8),
    slug: 'science_read_the_axes',
    title: 'Read the axes before the answer choices',
    category: 'science',
    recognition_rule: 'Graph or table → name the units, then find the exact cell or point.',
    description: 'Most ACT Science misses come from reading the wrong series or the wrong axis.',
    student_steps: ['Read the title.', 'Name x and y units.', 'Find the requested trial or year.', 'Compare only the values the question named.'],
    when_to_use: 'ACT Science data questions and SAT data-interpretation items.',
    why_it_works: 'The figure already contains the answer; the trap is looking at a neighboring line.',
    example: 'If Study 2 used 20°C, do not read the 10°C column.',
    sat_applicable: true,
    act_applicable: true,
  },
]
