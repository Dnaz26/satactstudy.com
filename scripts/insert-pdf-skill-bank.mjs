#!/usr/bin/env node
/**
 * Insert the generated original SAT/ACT skill bank into Supabase.
 * Reads /tmp/pdf-skill-bank.json (from expand-pdf-skill-bank.py).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq)
    let value = trimmed.slice(eq + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null) process.env[key] = value
  }
}

function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

loadEnv()
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const bankPath = process.argv[2] || '/tmp/pdf-skill-bank.json'
const bank = JSON.parse(readFileSync(bankPath, 'utf8'))
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

async function upsert(table, rows, onConflict) {
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true })
  if (error) throw new Error(`${table}: ${error.message}`)
}

const passages = (bank.passages || []).map((p) => ({
  id: p.id,
  title: p.title,
  author: p.author,
  content: p.content,
  source_type: 'original',
  source_rights_status: 'owned',
  active: true,
}))

console.log('passages', passages.length)
for (const group of chunk(passages, 20)) {
  await upsert('passages', group, 'id')
}

const questions = bank.questions || []
console.log('questions', questions.length)
let inserted = 0
for (const group of chunk(questions, 40)) {
  const rows = group.map((q) => ({
    id: q.id,
    topic_id: q.topic_id,
    test_type: q.test_type,
    section_name: q.section_name,
    category_name: q.category_name,
    topic_name: q.topic_name,
    difficulty: DIFF[q.difficulty] ?? q.difficulty,
    question_text: q.question_text,
    choice_a: q.choice_a ?? null,
    choice_b: q.choice_b ?? null,
    choice_c: q.choice_c ?? null,
    choice_d: q.choice_d ?? null,
    choice_e: q.choice_e ?? null,
    correct_answer: q.correct_answer,
    official_explanation: q.explanation,
    source_type: q.source_type,
    source_rights_status: q.source_rights_status,
    source: 'StudentQuest original (skills from official exam structure, not wording)',
    question_type: q.question_type,
    answer_verification_status: 'authored',
    difficulty_score: q.difficulty_score,
    calculator_allowed: q.calculator_allowed,
    desmos_useful: q.desmos_useful,
    desmos_mode: q.desmos_mode,
    reasoning_type: q.reasoning_type,
    fingerprint: q.fingerprint,
    review_status: 'approved',
    approved: true,
    active: true,
    passage_id: q.passage_id ?? null,
    exam_name: 'StudentQuest PDF-skill original bank',
    calculator_config: {
      calculator_enabled: q.calculator_allowed,
      calculator_recommended: q.desmos_useful,
    },
  }))
  await upsert('questions', rows, 'id')

  const choices = []
  const mappings = []
  for (const q of group) {
    let pos = 0
    for (const [label, key] of [['A', 'choice_a'], ['B', 'choice_b'], ['C', 'choice_c'], ['D', 'choice_d'], ['E', 'choice_e']]) {
      const content = q[key]
      if (!content) continue
      pos += 1
      choices.push({
        question_id: q.id,
        label,
        content,
        position: pos,
        is_correct: label === q.correct_answer,
      })
    }
    mappings.push({
      question_id: q.id,
      topic_id: q.topic_id,
      relationship: 'primary',
      weight: 1,
      confidence: 1,
    })
  }
  await upsert('question_choices', choices, 'question_id,label')
  await upsert('question_topic_mappings', mappings, 'question_id,topic_id')
  inserted += group.length
  if (inserted % 400 === 0 || inserted === questions.length) {
    console.log('progress', inserted, '/', questions.length)
  }
}

console.log('done', inserted)
