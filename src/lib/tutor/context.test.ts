import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildFastTutorContext } from './context'

test('fast tutor context stays short and uses the request payload', () => {
  const ctx = buildFastTutorContext('user-1', {
    trigger: 'wrong_answer',
    questionText: 'If 2x + 4 = 10, what is x?',
    topicName: 'Linear equations',
    selectedAnswer: 'C',
    correctAnswer: 'B',
    submitted: true,
    choices: [
      { key: 'A', text: '2' },
      { key: 'B', text: '3' },
      { key: 'C', text: '4' },
    ],
  })

  assert.equal(ctx.trigger, 'wrong_answer')
  assert.match(ctx.compactPrompt, /2x \+ 4/)
  assert.match(ctx.compactPrompt, /Student: C/)
  assert.match(ctx.compactPrompt, /Canonical: B/)
  assert.match(ctx.compactPrompt, /4 easy numbered steps/)
  assert.ok(ctx.compactPrompt.length < 800)
})
