import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyLatexSymbols, parseMath, renderPromptSegments } from './render'
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
})

describe('renderPromptSegments', () => {
  it('splits dollar math from prose', () => {
    const segs = renderPromptSegments('Solve $\\frac{1}{2}$ now')
    assert.equal(segs.length, 3)
    assert.equal(segs[1]?.math, true)
  })
})

describe('applyLatexSymbols', () => {
  it('turns \\circ into a degree sign', () => {
    assert.equal(applyLatexSymbols('118 \\circ'), '118°')
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
