import assert from 'node:assert/strict'
import test from 'node:test'
import { productBand, reclassifyLabel, routingScore, scoreBankQuestion } from './product-rubric.mjs'

test('product bands match the 18-point scale', () => {
  assert.equal(productBand(5), 'foundation')
  assert.equal(productBand(6), 'easy')
  assert.equal(productBand(8), 'easy')
  assert.equal(productBand(9), 'medium')
  assert.equal(productBand(11), 'medium')
  assert.equal(productBand(12), 'hard')
  assert.equal(productBand(14), 'hard')
  assert.equal(productBand(15), 'elite-hard')
  assert.equal(productBand(18), 'elite-hard')
})

test('routing scores land in the SAT module bands', () => {
  assert.ok(routingScore(8) <= 0.45)
  assert.ok(routingScore(9) >= 0.5 && routingScore(11) <= 0.79)
  assert.ok(routingScore(12) >= 0.85)
  assert.ok(routingScore(18) <= 1)
})

test('one-step and template items cannot remain hard', () => {
  const median = scoreBankQuestion({
    questionText: 'Five quiz scores are 70, 80, 80, 90, and 100. A sixth score of 60 is added. What is the new mean?',
    explanation: 'Add the new score and divide.',
    choices: ['80', '82', '84', '86'],
  })
  assert.ok(median.total < 12)
  assert.equal(reclassifyLabel('Hard', median).difficulty === 'Hard', false)

  const frame = scoreBankQuestion({
    questionText: 'Which choice punctuates the report from the pottery shed correctly? Which statement follows?',
    choices: ['A lamps.', 'B lamps,', 'C lamps;', 'D lamps:'],
    explanation: 'The clause needs a comma.',
  })
  assert.ok(frame.total < 12)
  assert.equal(frame.template, true)
})

test('former medium items at or above 6 become easy', () => {
  const scored = { total: 11, scores: { steps: 2 }, oneStep: false, template: false, reasons: [] }
  const next = reclassifyLabel('Medium', scored)
  assert.equal(next.difficulty, 'Easy')
  assert.equal(next.band, 'easy')
})

test('a stored elite label does not keep a short geometry item elite', () => {
  const scored = scoreBankQuestion({
    questionText: 'A triangle has base 12 and height 9. A line parallel to the base meets the two sides at a height of 3 from the vertex, forming a smaller similar triangle. What is the area of the trapezoid between that line and the base?',
    explanation: 'Area scales by the square of the height ratio. 54 - 6 = 48.',
    choices: ['42', '48', '36', '18'],
  })
  assert.ok(scored.total < 15)
  assert.notEqual(reclassifyLabel('Hard', scored).band, 'elite-hard')
})

test('a 12-point item with two reasoning stages stays hard', () => {
  const next = reclassifyLabel('Hard', { total: 13, scores: { steps: 2 }, reasons: [] })
  assert.equal(next.difficulty, 'Hard')
  assert.equal(next.band, 'hard')
})
