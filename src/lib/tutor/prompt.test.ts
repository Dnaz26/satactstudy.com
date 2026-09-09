import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_TUTOR_PREFERENCES } from './types'
import { buildTutorSystemPrompt } from './prompt'
import { NOVA_SPEC_VERSION } from './spec'

test('wrong answers get easy numbered steps instead of dense algebra', () => {
  const prompt = buildTutorSystemPrompt({
    preferences: { ...DEFAULT_TUTOR_PREFERENCES, user_id: 'user-1', explanation_level: 'advanced' },
    trigger: 'wrong_answer',
    desmosAvailable: false,
    submitted: true,
    isCorrect: false,
  })

  assert.match(prompt, /EXACTLY 4 numbered steps/)
  assert.match(prompt, /14 words or fewer/)
  assert.match(prompt, /Never use LaTeX/)
  assert.match(prompt, /Ignore advanced wording/)
  assert.match(prompt, new RegExp(NOVA_SPEC_VERSION))
  assert.match(prompt, /Tutoring loop/)
  assert.match(prompt, /Security/)
})

test('nova prompt includes score goal without guaranteeing 1600', () => {
  const prompt = buildTutorSystemPrompt({
    preferences: { ...DEFAULT_TUTOR_PREFERENCES, user_id: 'user-1' },
    trigger: 'chat',
    desmosAvailable: true,
    submitted: false,
  })

  assert.match(prompt, /1600/)
  assert.match(prompt, /Never guarantee/)
  assert.match(prompt, /Desmos/)
})
