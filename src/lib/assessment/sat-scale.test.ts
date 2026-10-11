import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateSatMathScore, estimateUnroutedSatSection, pickModule2Questions, routeSatModule2, routeSatMathModule2 } from './sat-scale'

test('a strong module 1 opens the harder module 2, a weak one opens the easier one, and the middle stays in the middle', () => {
  assert.equal(routeSatMathModule2(16, 22), 'harder')
  assert.equal(routeSatMathModule2(15, 22), 'medium')
  assert.equal(routeSatMathModule2(10, 22), 'medium')
  assert.equal(routeSatMathModule2(9, 22), 'easier')
  assert.equal(routeSatModule2(19, 27), 'harder')
  assert.equal(routeSatModule2(18, 27), 'medium')
  assert.equal(routeSatModule2(13, 27), 'medium')
  assert.equal(routeSatModule2(12, 27), 'easier')
  assert.equal(routeSatModule2(0, 22), 'easier')
  assert.equal(routeSatModule2(22, 22), 'harder')
})

test('module 2 picks spread across topics and skip questions already used', () => {
  const pool = [
    { id: 'a1', topic_name: 'Lines', difficulty_score: 0.9 },
    { id: 'a2', topic_name: 'Lines', difficulty_score: 0.91 },
    { id: 'b1', topic_name: 'Algebra', difficulty_score: 0.92 },
    { id: 'c1', topic_name: 'Data', difficulty_score: 0.93 },
  ]
  assert.deepEqual(pickModule2Questions(pool, 3, new Set(['a1'])), ['b1', 'c1', 'a2'])
})

test('a perfect easier module cannot reach the harder ceiling', () => {
  const easy = estimateSatMathScore({
    module1Correct: 22, module1Count: 22, module2Correct: 22, module2Count: 22, path: 'easier',
  })
  const middle = estimateSatMathScore({
    module1Correct: 22, module1Count: 22, module2Correct: 22, module2Count: 22, path: 'medium',
  })
  const hard = estimateSatMathScore({
    module1Correct: 22, module1Count: 22, module2Correct: 22, module2Count: 22, path: 'harder',
  })
  assert.equal(easy.score, 650)
  assert.equal(middle.score, 720)
  assert.equal(hard.score, 800)
  assert.ok(easy.score < middle.score && middle.score < hard.score)
  assert.equal(easy.officialEquating, false)
})

test('the same raw total scores higher on the harder path because those items weigh more', () => {
  const shared = { module1Correct: 16, module1Count: 22, module2Correct: 10, module2Count: 22 }
  const easy = estimateSatMathScore({ ...shared, path: 'easier' })
  const hard = estimateSatMathScore({ ...shared, path: 'harder' })
  assert.ok(hard.score > easy.score)
  assert.ok(easy.score <= 650)
  assert.ok(hard.score <= 800)
})

test('unrouted reading and writing does not pretend to have a second-module ceiling', () => {
  const section = estimateUnroutedSatSection(54, 54)
  assert.equal(section.score, 800)
  assert.equal(section.routed, false)
  assert.equal(estimateUnroutedSatSection(0, 54).score, 200)
})
