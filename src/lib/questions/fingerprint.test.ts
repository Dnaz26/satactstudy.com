import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mayPublishExactContent, questionFingerprint } from './fingerprint'
import { renderPromptSegments, isStudentProduced } from './render'

test('fingerprints ignore punctuation and case', () => {
  const a = questionFingerprint({
    question_text: 'What is $x$?',
    choice_a: 'Two',
    choice_b: 'Three',
    correct_answer: 'B',
  })
  const b = questionFingerprint({
    question_text: 'what is x?',
    choice_a: 'two',
    choice_b: 'three',
    correct_answer: 'b',
  })
  assert.equal(a, b)
})

test('copyrighted sources cannot be published verbatim', () => {
  assert.equal(mayPublishExactContent('reference_only'), false)
  assert.equal(mayPublishExactContent('unknown'), false)
  assert.equal(mayPublishExactContent('owned'), true)
  assert.equal(mayPublishExactContent('authorized'), true)
})

test('math segments split on dollar signs', () => {
  const parts = renderPromptSegments('Solve $2x+1=7$ now.')
  assert.equal(parts.some((p) => p.math && p.parts.some((part) => part.kind === 'text' && part.value.includes('2x'))), true)
})

test('SPR questions have no choice list', () => {
  assert.equal(isStudentProduced('spr', []), true)
  assert.equal(isStudentProduced('multiple_choice', [{ key: 'A', text: '1' }]), false)
})
