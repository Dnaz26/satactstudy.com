import assert from 'node:assert/strict'
import test from 'node:test'
import {
  actComposite,
  actScaledScore,
  actScoreSummary,
  actStemScore,
  ACT_ADMINISTERED_COUNTS,
  ACT_FIELD_TEST_COUNTS,
  ACT_SCALES,
  ACT_SCORED_COUNTS,
} from './act-scale'

test('perfect papers scale to 36 and blanks to 1', () => {
  for (const section of Object.keys(ACT_ADMINISTERED_COUNTS) as Array<keyof typeof ACT_ADMINISTERED_COUNTS>) {
    assert.equal(actScaledScore(section, ACT_ADMINISTERED_COUNTS[section]), 36)
    assert.equal(actScaledScore(section, 0), 1)
  }
})

test('scales are monotonic and bounded', () => {
  for (const section of Object.keys(ACT_ADMINISTERED_COUNTS) as Array<keyof typeof ACT_ADMINISTERED_COUNTS>) {
    let prev = 1
    for (let raw = 0; raw <= ACT_ADMINISTERED_COUNTS[section]; raw++) {
      const s = actScaledScore(section, raw)
      assert.ok(s >= 1 && s <= 36, `${section} raw ${raw} -> ${s}`)
      assert.ok(s >= prev, `${section} raw ${raw} regressed ${prev} -> ${s}`)
      prev = s
    }
  }
})

test('administered equals scored plus field-test per section', () => {
  for (const section of Object.keys(ACT_ADMINISTERED_COUNTS) as Array<keyof typeof ACT_ADMINISTERED_COUNTS>) {
    assert.equal(
      ACT_SCORED_COUNTS[section] + ACT_FIELD_TEST_COUNTS[section],
      ACT_ADMINISTERED_COUNTS[section],
      section,
    )
    assert.equal(ACT_SCALES['act-flagship-v1-estimate'][section].length, ACT_ADMINISTERED_COUNTS[section] + 1)
  }
})

test('core composite uses English Math Reading only, halves up', () => {
  assert.equal(actComposite({ english: 36, math: 36, reading: 36 }), 36)
  // Science must not move the composite: same EMR, different science.
  const a = actScoreSummary({ english: 40, math: 30, reading: 28, science: 0 })
  const b = actScoreSummary({ english: 40, math: 30, reading: 28, science: 36 })
  assert.equal(a.composite, b.composite)
  assert.notEqual(a.scaled.science, b.scaled.science)
  assert.equal(actComposite({ english: 20, math: 20, reading: 20 }), 20)
  assert.equal(actComposite({ english: 20, math: 20, reading: 21 }), 20)
  assert.equal(actComposite({ english: 20, math: 21, reading: 21 }), 21)
})

test('stem averages math and science only', () => {
  assert.equal(actStemScore(36, 36), 36)
  assert.equal(actStemScore(20, 22), 21)
  assert.equal(actStemScore(20, 21), 21)
})

test('summary bundles scaled sections, composite, and stem', () => {
  const summary = actScoreSummary({ english: 50, math: 0, reading: 36, science: 0 })
  assert.equal(summary.scaled.english, 36)
  assert.equal(summary.scaled.math, 1)
  assert.ok(summary.composite >= 1 && summary.composite <= 36)
  assert.equal(summary.stem, actStemScore(summary.scaled.math, summary.scaled.science))
})
