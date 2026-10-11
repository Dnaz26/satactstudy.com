import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyBankItem, templateSignature } from './classify'

test('skill-set stamps and number swaps are duplicates', () => {
  const swapped = classifyBankItem({
    testType: 'ACT',
    section: 'Math',
    prompt: 'Skill set 707. If g(x)=x^2+4x, what is g(11)?',
    choices: ['125', '121', '44', '165', '15'],
    passageSharedCount: 0,
    templateSiblingCount: 4,
  })
  assert.equal(swapped.disposition, 'DUPLICATE')
  assert.match(swapped.reasons[0], /Skill set/)
  assert.equal(
    templateSignature('If g(x)=x^2+4x, what is g(5)?'),
    templateSignature('If g(x)=x^2+4x, what is g(11)?'),
  )
})

test('legacy five-choice ACT math and shared SAT stimuli are replacements', () => {
  const legacy = classifyBankItem({
    testType: 'ACT',
    section: 'Math',
    prompt: 'A bag has 3 red and 5 blue marbles. One marble is drawn at random. What is P(red)?',
    choices: ['3/8', '1/2', '5/8', '3/9', '3/5'],
    passageSharedCount: 0,
    templateSiblingCount: 1,
  })
  assert.equal(legacy.disposition, 'REPLACE')
  assert.match(legacy.reasons[0], /four answer choices/)

  const shared = classifyBankItem({
    testType: 'SAT',
    section: 'Reading and Writing',
    prompt: 'Which choice best states the main idea of the passage?',
    choices: ['A noisy signal can still warn a crew.', 'Sensors never work near water.', 'Airports should close.', 'Salt is the only problem.'],
    passageSharedCount: 65,
    templateSiblingCount: 1,
  })
  assert.equal(shared.disposition, 'REPLACE')
  assert.match(shared.reasons[0], /own text/)
})

test('generator marks are revisions and a clean unique stem is kept', () => {
  const marked = classifyBankItem({
    testType: 'ACT',
    section: 'Math',
    prompt: 'What is the mean of 17, 20, 23, 26, 29?',
    choices: ['26', '115', '29', '23 (1)'],
    passageSharedCount: 0,
    templateSiblingCount: 1,
  })
  assert.equal(marked.disposition, 'REVISE')

  const kept = classifyBankItem({
    testType: 'SAT',
    section: 'Math',
    prompt: 'A repair shop charges a fixed inspection fee plus a constant hourly labor fee. A 2-hour repair costs 95 dollars, and a 5-hour repair costs 200 dollars. What is the inspection fee, in dollars?',
    choices: ['70', '25', '60', '35'],
    passageSharedCount: 0,
    templateSiblingCount: 1,
  })
  assert.equal(kept.disposition, 'KEEP')
})
