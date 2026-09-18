import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ENGLISH_LEVELS, MATH_LEVELS } from './levels'

const SCOPES = ['sat', 'act', 'both', 'sat_strategy', 'act_strategy', 'both_strategy']

test('every lesson carries tags, subcategory, tested, prereqs, objectives, problems', () => {
  for (const level of [...MATH_LEVELS, ...ENGLISH_LEVELS]) {
    assert.ok(SCOPES.includes(level.scope), `${level.track}:${level.index} scope ${level.scope}`)
    assert.ok(level.subcategory.length > 0, `${level.track}:${level.index} subcategory`)
    assert.ok(['direct', 'prereq', 'strategy'].includes(level.tested), `${level.track}:${level.index} tested`)
    assert.equal(level.sat, ['sat', 'both', 'sat_strategy', 'both_strategy'].includes(level.scope))
    assert.equal(level.act, ['act', 'both', 'act_strategy', 'both_strategy'].includes(level.scope))
    assert.ok(level.objectives.length > 0, `${level.track}:${level.index} objectives`)
    assert.ok(level.problems.length >= 3, `${level.track}:${level.index} problems`)
    for (const problem of level.problems) {
      assert.equal(problem.choices.length, 4, `${level.track}:${level.index} choices`)
    }
    const ids = new Set((level.track === 'math' ? MATH_LEVELS : ENGLISH_LEVELS).map((l) => l.index))
    for (const pre of level.prereqs) {
      assert.ok(ids.has(pre), `${level.track}:${level.index} prereq ${pre} missing`)
      assert.notEqual(pre, level.index, 'self prereq')
    }
  }
})

test('math lesson #1 is Numerical Identity & Number Systems', () => {
  assert.equal(MATH_LEVELS[0]?.title, 'Numerical Identity & Number Systems')
})

test('no duplicate titles within a track', () => {
  for (const [name, levels] of [['math', MATH_LEVELS], ['english', ENGLISH_LEVELS]] as const) {
    const seen = new Map<string, number>()
    for (const level of levels) {
      const key = level.title.toLowerCase()
      assert.ok(!seen.has(key), `duplicate ${name} title: ${level.title} (${seen.get(key)}, ${level.index})`)
      seen.set(key, level.index)
    }
  }
})

test('indices unique within a track', () => {
  for (const levels of [MATH_LEVELS, ENGLISH_LEVELS]) {
    const ids = levels.map((l) => l.index)
    assert.equal(new Set(ids).size, ids.length)
  }
})

test('curriculum census', () => {
  const mathCore = MATH_LEVELS.filter((l) => !l.scope.endsWith('_strategy'))
  const mathStrat = MATH_LEVELS.filter((l) => l.scope.endsWith('_strategy'))
  const engCore = ENGLISH_LEVELS.filter((l) => !l.scope.endsWith('_strategy'))
  const engStrat = ENGLISH_LEVELS.filter((l) => l.scope.endsWith('_strategy'))
  const all = [...MATH_LEVELS, ...ENGLISH_LEVELS]
  const count = (s: string) => all.filter((l) => l.scope === s).length
  console.log(JSON.stringify({
    mathCore: mathCore.length,
    mathStrategy: mathStrat.length,
    mathTotal: MATH_LEVELS.length,
    engCore: engCore.length,
    engStrategy: engStrat.length,
    engTotal: ENGLISH_LEVELS.length,
    grandTotal: all.length,
    sat: count('sat'),
    act: count('act'),
    both: count('both'),
    satStrategy: count('sat_strategy'),
    actStrategy: count('act_strategy'),
    bothStrategy: count('both_strategy'),
    strategyTotal: mathStrat.length + engStrat.length,
    sharedSatAct: all.filter((l) => l.sat && l.act && !l.scope.endsWith('_strategy')).length,
  }))
})
