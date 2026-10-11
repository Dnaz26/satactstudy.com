import assert from 'node:assert/strict'
import test from 'node:test'
import { isChallengeQuestion, lessonTitleWords, pickHardest, questionComplexity, templateSignature } from './complexity'

test('challenge gate rejects mislabeled one-step templates and weak ACT passages', () => {
  const base = {
    difficulty: 'Hard', difficulty_score: 0.85, question_type: 'multiple_choice',
    correct_answer: 'B', official_explanation: 'The second choice follows from the evidence.',
    choice_a: 'One', choice_b: 'Two', choice_c: 'Three', choice_d: 'Four',
  }
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: 'What value of x satisfies 4x + 7 = 31?' }), false)
  assert.equal(isChallengeQuestion({ ...base, test_type: 'ACT', section_name: 'Reading', question_text: 'Which conclusion is supported by the passage?', passage_content: 'A short note.' }), false)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: 'A model predicts that y changes after each batch. Given 3(4y - 7x + 5) = 8(2y + 3x - 4), how much does y change when x rises by 1?' }), true)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', exam_name: 'StudentQuest PDF-skill original bank', question_text: 'Skill set 1311. Given two constraints on x and y, what must be true about their sum when both change?' }), false)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', exam_name: 'StudentQuest May-2023-skill-map original bank', question_text: 'A model predicts that y changes after each batch. Given 3(4y - 7x + 5) = 8(2y + 3x - 4), how much does y change when x rises by 1?' }), false)
  const monument = 'A surveyor stands on level ground. The tangent of the angle of elevation to the top of a monument is 3/4. She walks 20 meters straight toward the monument, and the tangent of the new angle of elevation is 3/2. How many meters tall is the monument?'
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: 'A ladder leans against a wall. The sine of the angle between the ladder and the ground is 3/5, and the ladder is 15 feet long. How many feet is the base of the ladder from the wall?' }), false)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: monument }), true)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: 'Two parallel lines are cut by a transversal. A same-side interior pair measures 2x + 10 degrees and 3x - 5 degrees. What is the measure, in degrees, of the smaller of those two angles?' }), false)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Reading and Writing', question_text: 'The set of measurements, together with the field sketch, ____ stored in one folder. Which choice completes the sentence?' }), false)
  assert.equal(isChallengeQuestion({ ...base, section_name: 'Math', question_text: 'The function f is defined by f(x) = 3x - 1 for every real number x. What is the value of f(f(0))?' }), false)
})

test('multi-step reasoning outranks one-step templates at equal bank scores', () => {
  const oneStep = {
    question_text: 'Which number is a multiple of 3?',
    choice_a: '6', choice_b: '7', choice_c: '8', choice_d: '9',
    difficulty_score: 0.83,
  }
  const multiStep = {
    question_text: 'If x + y = 14 and 2(x − 3) = y, which system gives x, and what is the value of x + 2y?',
    choice_a: '20', choice_b: '22', choice_c: '24', choice_d: '26',
    difficulty_score: 0.83,
  }
  assert.ok(questionComplexity(multiStep) > questionComplexity(oneStep))
  const same = { question_text: 'A revised profit model must change the coefficient so a four-step increase in workshops raises profit by a stated amount.', difficulty_score: 1 }
  assert.ok(questionComplexity({ ...same, exam_name: 'Elite hard pool 2026-10-06' }) > questionComplexity({ ...same, exam_name: 'Fifty percent harder math 2026-10-06' }))
})

test('passages and longer stems add complexity', () => {
  const short = { question_text: 'What is 1/2 + 1/3?', difficulty_score: 0.7 }
  const withPassage = {
    question_text: 'Based on the passage, which claim is best supported by both studies?',
    difficulty_score: 0.7,
    passage_content: 'Study 1 measured growth under lamps. Study 2 measured growth in darkness. '.repeat(4),
  }
  assert.ok(questionComplexity(withPassage) > questionComplexity(short))
})

test('same template with different numbers collapses', () => {
  assert.equal(templateSignature('Which number is a multiple of 3?'), templateSignature('Which number is a multiple of 7?'))
  assert.notEqual(templateSignature('Which number is a multiple of 3?'), templateSignature('What is the least common multiple of 4 and 7?'))
})

test('pickHardest caps repeats and keeps the hardest variety', () => {
  const items = [
    { question_text: 'Which number is a multiple of 3?', difficulty_score: 0.83 },
    { question_text: 'Which number is a multiple of 4?', difficulty_score: 0.83 },
    { question_text: 'Which number is a multiple of 5?', difficulty_score: 0.83 },
    { question_text: 'Which number is a multiple of 6?', difficulty_score: 0.83 },
    { question_text: 'What is the least common multiple of 4 and 7?', difficulty_score: 0.82 },
  ]
  const picked = pickHardest(items, 4)
  assert.equal(picked.length, 4)
  assert.ok(picked.some((q) => (q.question_text ?? '').includes('least common multiple')))
  const multiples = picked.filter((q) => (q.question_text ?? '').includes('is a multiple of'))
  assert.ok(multiples.length <= 3)
})

test('lesson wording bonus sinks obvious strays', () => {
  const words = lessonTitleWords('Exponents and Radicals')
  const stray = {
    question_text: 'An account starts at $40. After how many whole years does it pass $80?',
    difficulty_score: 0.6,
    lessonTitleWords: words,
  }
  const topical = {
    question_text: 'Which is equivalent to 16^{3/2}?',
    difficulty_score: 0.6,
    lessonTitleWords: words,
  }
  assert.ok(questionComplexity(topical) > questionComplexity(stray))
})
