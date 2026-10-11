import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findTemplateSiblings,
  semanticSimilarity,
  validateItem,
  type AssessmentItem,
} from './validate'
import { REGRESSION_FIXTURES } from './fixtures'
import { examQuestion } from '../practice/exam-questions'
import { questionChoices } from '../schema'

test('all 11 known-bad regression fixtures fail with their documented codes', () => {
  assert.equal(REGRESSION_FIXTURES.length, 11)
  for (const fixture of REGRESSION_FIXTURES) {
    const result = validateItem({ ...fixture.item, expected: fixture.expected })
    assert.equal(result.pass, false, `${fixture.id} unexpectedly passed`)
    for (const code of fixture.mustFail) {
      assert.ok(
        result.failures.includes(code),
        `${fixture.id} missing failure ${code} (got ${result.failures.join(',')})`,
      )
    }
  }
})

test('clean items pass across sections', () => {
  const clean: AssessmentItem[] = [
    {
      section: 'Math',
      prompt: 'What is the least common multiple of 4 and 6?',
      choices: ['24', '6', '2', '12'],
      answer: 'D',
      expected: '12',
    },
    {
      section: 'English',
      passage: 'The library stayed open late. [1] Patrons filled every chair. [2] Staff served cocoa.',
      prompt: 'Which revision of the marked portion [1] is best?',
      choices: [
        'Patrons filled every chair.',
        'Patrons filling every chair.',
        'Patrons, filled every chair.',
        'Patrons filled, every chair.',
      ],
      answer: 'A',
      span: 'Patrons filled every chair.',
    },
    {
      section: 'Reading',
      passage: 'Ants navigate by light and stride.',
      prompt: 'The ants navigate primarily by:',
      choices: ['Scent trails', 'Light and stride', 'Memory alone', 'Random walking'],
      answer: 'B',
      evidence: ['Ants navigate by light and stride.'],
    },
  ]
  for (const item of clean) {
    const result = validateItem(item)
    assert.deepEqual(result.failures, [], `${item.prompt}: ${result.failures.join(',')}`)
  }
})

test('english span must exist exactly once', () => {
  const base: AssessmentItem = {
    section: 'English',
    passage: 'Dogs bark. Cats nap.',
    prompt: 'Fix it.',
    choices: ['Dogs bark loudly.', 'Dogs barking loudly.', 'Dogs, bark loudly.', 'Dogs bark; loudly.'],
    answer: 'A',
    span: 'Hamsters run.',
  }
  assert.ok(validateItem(base).failures.includes('span_missing'))
  const twice: AssessmentItem = {
    ...base,
    passage: 'Dogs bark. Dogs bark.',
    span: 'Dogs bark.',
  }
  assert.ok(validateItem(twice).failures.includes('span_multiple'))
})

test('reading without evidence fails', () => {
  const result = validateItem({
    section: 'Reading',
    passage: 'Ants navigate.',
    prompt: 'How do ants navigate?',
    choices: ['By light', 'By smell', 'By memory', 'At random'],
    answer: 'A',
  })
  assert.ok(result.failures.includes('evidence_missing'))
})

test('short math stems with different numbers are not siblings', () => {
  const texts = [
    'If 3x - 7 = 11, what is the value of x? A) 2 B) 6 C) 18 D) 4',
    'If 2(x - 3) + 5 = 13, what is the value of x? A) 6 B) 7 C) 8 D) 9',
    'What is the value of 3^2 - 2^3? A) 0 B) 1 C) 5 D) 17',
  ]
  const groups = findTemplateSiblings(texts)
  assert.equal(groups.length, 0)
  assert.ok(semanticSimilarity(texts[0] ?? '', texts[1] ?? '') < 0.8)
})

test('template siblings are detected by signature and similarity', () => {
  const texts = [
    'Which number is a multiple of 3?',
    'Which number is a multiple of 7?',
    'What is the least common multiple of 4 and 7?',
    'The author compares the brothers to grafted trees in the orchard passage.',
  ]
  const groups = findTemplateSiblings(texts)
  const flat = groups.flatMap((g) => g.indexes)
  assert.ok(flat.includes(0) && flat.includes(1), 'number-swapped clones grouped')
  assert.ok(!flat.includes(3), 'unrelated item not grouped')
  assert.ok(semanticSimilarity(texts[0] ?? '', texts[1] ?? '') > 0.8)
  assert.ok(semanticSimilarity(texts[0] ?? '', texts[3] ?? '') < 0.5)
})

test('exam payloads never leak answers or explanations pre-completion', () => {
  const out = examQuestion({
    id: 'q1',
    question_text: 'What is 2+2?',
    choice_a: '3',
    choice_b: '4',
    choice_c: '5',
    choice_d: '6',
    correct_answer: 'B',
    official_explanation: 'secret',
    ai_explanation: 'secret',
    difficulty: 'easy',
  })
  assert.equal(out.correct_answer, '')
  assert.equal(out.official_explanation, null)
  assert.equal(out.ai_explanation, null)
  assert.deepEqual(new Set(out.choices.map((c) => c.key)), new Set(['A', 'B', 'C', 'D']))
  assert.deepEqual(out.choices.map((c) => c.label), ['A', 'B', 'C', 'D'])
})


test('visible answer positions vary while stored scoring keys stay stable', () => {
  const counts = { A: 0, B: 0, C: 0, D: 0 }
  for (let index = 0; index < 1000; index++) {
    const row = { id: `question-${index}`, choice_a: 'right', choice_b: 'wrong 1', choice_c: 'wrong 2', choice_d: 'wrong 3' }
    const choices = questionChoices(row)
    assert.deepEqual(questionChoices(row), choices)
    assert.deepEqual(choices.map((choice) => choice.label), ['A', 'B', 'C', 'D'])
    counts[choices.find((choice) => choice.key === 'A')!.label as keyof typeof counts]++
  }
  for (const count of Object.values(counts)) assert.ok(count > 170 && count < 330)
})
