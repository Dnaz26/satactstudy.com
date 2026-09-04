import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectMathDiagram } from './diagram'

test('detects parallel lines cut by a transversal', () => {
  const diagram = detectMathDiagram('Parallel lines are cut by a transversal. If one interior angle is 118 \\circ, what is the consecutive interior angle?')
  assert.equal(diagram?.kind, 'parallel_transversal')
  if (diagram?.kind === 'parallel_transversal') assert.equal(diagram.angle, 118)
})

test('detects a circle with radius', () => {
  const diagram = detectMathDiagram('A circle has radius 5. What is its area?')
  assert.equal(diagram?.kind, 'circle')
  if (diagram?.kind === 'circle') assert.equal(diagram.radius, 5)
})

test('detects a right triangle with labeled sides', () => {
  const diagram = detectMathDiagram('In a right triangle, the legs are 6 and 8 and the hypotenuse is 10. What is sin of the angle opposite the side of length 6?')
  assert.equal(diagram?.kind, 'right_triangle')
  if (diagram?.kind === 'right_triangle') {
    assert.equal(diagram.a, 6)
    assert.equal(diagram.b, 8)
    assert.equal(diagram.c, 10)
  }
})

test('builds a function table', () => {
  const diagram = detectMathDiagram('If f(x) = 5x + 12, what is f(8)?')
  assert.equal(diagram?.kind, 'table')
  if (diagram?.kind === 'table') {
    assert.deepEqual(diagram.headers, ['x', 'f(x)'])
    assert.ok(diagram.rows.some((row) => row[0] === '8' && row[1] === '52'))
  }
})

test('skips questions that do not need a figure', () => {
  assert.equal(detectMathDiagram('What is the median of 4, 6, 8, 10, 12?'), null)
})
