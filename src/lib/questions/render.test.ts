import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyLatexSymbols, normalizeInequalitySymbols, parseMath, renderPromptSegments } from './render'
import { officialChoiceLabel } from '../schema'

describe('parseMath', () => {
  it('turns latex frac into a stacked fraction tree', () => {
    const parts = parseMath('\\frac{2x}{5}')
    assert.equal(parts[0]?.kind, 'frac')
    if (parts[0]?.kind !== 'frac') return
    assert.deepEqual(parts[0].num, [{ kind: 'text', value: '2x' }])
    assert.deepEqual(parts[0].den, [{ kind: 'text', value: '5' }])
  })

  it('turns numeric slashes into fractions', () => {
    const parts = parseMath('8^{2/3}')
    assert.equal(parts[0]?.kind, 'text')
    assert.equal(parts[1]?.kind, 'sup')
  })

  it('renders short latex inequalities as Unicode', () => {
    const parts = parseMath('x \\le 5')
    assert.deepEqual(parts, [{ kind: 'text', value: 'x ≤ 5' }])
    const partsGe = parseMath('y \\ge 2x')
    assert.deepEqual(partsGe, [{ kind: 'text', value: 'y ≥ 2x' }])
  })
})

describe('renderPromptSegments', () => {
  it('splits dollar math from prose', () => {
    const segs = renderPromptSegments('Solve $\\frac{1}{2}$ now')
    assert.equal(segs.length, 3)
    assert.equal(segs[1]?.math, true)
  })

  it('keeps compound inequalities readable', () => {
    const segs = renderPromptSegments('Solve $-1 < x \\le 5$')
    assert.equal(segs[1]?.math, true)
    if (!segs[1] || !segs[1].math) return
    assert.deepEqual(segs[1].parts, [{ kind: 'text', value: '-1 < x ≤ 5' }])
  })
})

describe('applyLatexSymbols', () => {
  it('turns \\circ into a degree sign', () => {
    assert.equal(applyLatexSymbols('118 \\circ'), '118°')
  })
})

describe('normalizeInequalitySymbols', () => {
  it('converts le/ge latex and ascii forms', () => {
    assert.equal(normalizeInequalitySymbols('x \\le 5'), 'x ≤ 5')
    assert.equal(normalizeInequalitySymbols('x \\ge 5'), 'x ≥ 5')
    assert.equal(normalizeInequalitySymbols('x \\leq 5'), 'x ≤ 5')
    assert.equal(normalizeInequalitySymbols('x \\geq 5'), 'x ≥ 5')
    assert.equal(normalizeInequalitySymbols('x <= 5'), 'x ≤ 5')
    assert.equal(normalizeInequalitySymbols('x >= 5'), 'x ≥ 5')
    assert.equal(normalizeInequalitySymbols('x \\lt 5'), 'x < 5')
    assert.equal(normalizeInequalitySymbols('x \\gt 5'), 'x > 5')
  })

  it('does not corrupt \\left when converting \\le', () => {
    assert.equal(normalizeInequalitySymbols('\\left(x\\right)'), '\\left(x\\right)')
  })

  it('decodes HTML entities and double escapes', () => {
    assert.equal(normalizeInequalitySymbols('x &le; 5 and y &ge; 2'), 'x ≤ 5 and y ≥ 2')
    assert.equal(normalizeInequalitySymbols('x &lt; 5'), 'x < 5')
    assert.equal(normalizeInequalitySymbols('x &gt; 1'), 'x > 1')
    assert.equal(normalizeInequalitySymbols('x \\\\le 5'), 'x ≤ 5')
  })

  it('preserves already-correct Unicode inequalities', () => {
    assert.equal(normalizeInequalitySymbols('−1 < x ≤ 5 and y ≥ 0'), '−1 < x ≤ 5 and y ≥ 0')
  })
})

describe('officialChoiceLabel', () => {
  it('keeps SAT letters', () => {
    assert.equal(officialChoiceLabel('C', 'SAT', 2), 'C')
  })

  it('uses ACT even-question letters', () => {
    assert.equal(officialChoiceLabel('A', 'ACT', 2), 'F')
    assert.equal(officialChoiceLabel('D', 'ACT', 2), 'J')
    assert.equal(officialChoiceLabel('E', 'ACT', 2), 'K')
    assert.equal(officialChoiceLabel('A', 'ACT', 1), 'A')
  })
})
