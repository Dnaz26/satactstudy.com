import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findTemplateSiblings } from './validate'

function loadForm() {
  const path = join(process.cwd(), 'supabase/exam-engineering/act-flagship-v1/form.json')
  return JSON.parse(readFileSync(path, 'utf8')) as {
    form: string
    spec_version: string
    status: string
    sections: Record<string, { ids: string[]; field: string[]; modeling?: string[] }>
    blueprint: {
      counts: Record<string, number>
      operational: Record<string, number>
      timingSeconds: Record<string, number>
      units: Array<{ section: string; counts: number[] }>
      questionIds: string[]
      fieldTestIds: string[]
    }
    texts: Record<string, string>
    siblingAdjudications: Array<{ indexes: number[]; verdict: string; reason: string }>
    audit: {
      all_critical_categories_pass: boolean
      all_applicable_categories_measured: boolean
      operational_domain_counts: Record<string, Record<string, number>>
    }
  }
}

test('flagship form artifact exists with exact structure', () => {
  const form = loadForm()
  assert.equal(form.form, 'ACT Flagship v1')
  assert.equal(form.spec_version, 'enhanced-act-2026')
  assert.equal(form.blueprint.counts.English, 50)
  assert.equal(form.blueprint.counts.Math, 45)
  assert.equal(form.blueprint.counts.Reading, 36)
  assert.equal(form.blueprint.counts.total, 131)
  assert.deepEqual(form.blueprint.timingSeconds, { English: 2100, Math: 3000, Reading: 2400 })
  const units = Object.fromEntries(form.blueprint.units.map((u) => [u.section, u.counts]))
  assert.deepEqual(units.English, [10, 10, 10, 5, 5, 10])
  assert.deepEqual(units.Math, [45])
  assert.deepEqual(units.Reading, [9, 9, 9, 9])
})

test('operational counts exclude exactly the field-test slots', () => {
  const form = loadForm()
  assert.deepEqual(form.blueprint.operational, { English: 40, Math: 41, Reading: 27, total: 108 })
  assert.equal(form.sections.English?.field.length, 10)
  assert.equal(form.sections.Math?.field.length, 4)
  assert.equal(form.sections.Reading?.field.length, 9)
  assert.equal(form.blueprint.fieldTestIds.length, 23)
  const all = [
    ...(form.sections.English?.ids ?? []),
    ...(form.sections.Math?.ids ?? []),
    ...(form.sections.Reading?.ids ?? []),
  ]
  assert.equal(all.length, 131)
  assert.equal(new Set(all).size, 131)
  for (const id of form.blueprint.fieldTestIds) {
    assert.ok(all.includes(id), `field-test id ${id} not in form`)
  }
})

test('operational domain bands hold per section', () => {
  const form = loadForm()
  const op = form.audit.operational_domain_counts
  const pct = (part: number, whole: number) => (100 * part) / whole
  const e = op.english ?? {}
  assert.ok(pct(e['P'] ?? 0, 40) >= 38 && pct(e['P'] ?? 0, 40) <= 43, `english P ${JSON.stringify(e)}`)
  assert.ok(pct(e['K'] ?? 0, 40) >= 18 && pct(e['K'] ?? 0, 40) <= 23, `english K ${JSON.stringify(e)}`)
  assert.ok(pct(e['C'] ?? 0, 40) >= 38 && pct(e['C'] ?? 0, 40) <= 43, `english C ${JSON.stringify(e)}`)
  const m = op.math ?? {}
  const sumM = Object.values(m).reduce((a, b) => a + b, 0)
  assert.equal(sumM, 41)
  assert.ok(pct(m['Number and Quantity'] ?? 0, 41) <= 12.5, `math NQ ${JSON.stringify(m)}`)
  assert.ok(pct(m['Algebra'] ?? 0, 41) >= 17 && pct(m['Algebra'] ?? 0, 41) <= 20, `math Alg ${JSON.stringify(m)}`)
  assert.ok(pct(m['Functions'] ?? 0, 41) >= 17 && pct(m['Functions'] ?? 0, 41) <= 20, `math Func ${JSON.stringify(m)}`)
  assert.ok(pct(m['Geometry'] ?? 0, 41) >= 17 && pct(m['Geometry'] ?? 0, 41) <= 20, `math Geo ${JSON.stringify(m)}`)
  assert.ok(pct(m['Statistics and Probability'] ?? 0, 41) >= 12 && pct(m['Statistics and Probability'] ?? 0, 41) <= 15, `math Stats ${JSON.stringify(m)}`)
  const r = op.reading ?? {}
  assert.ok(pct(r['Key Ideas and Details'] ?? 0, 27) >= 44 && pct(r['Key Ideas and Details'] ?? 0, 27) <= 52, `reading KID ${JSON.stringify(r)}`)
  assert.ok(pct(r['Craft and Structure'] ?? 0, 27) >= 26 && pct(r['Craft and Structure'] ?? 0, 27) <= 33, `reading Craft ${JSON.stringify(r)}`)
  assert.ok(pct(r['Integration of Knowledge and Ideas'] ?? 0, 27) >= 19 && pct(r['Integration of Knowledge and Ideas'] ?? 0, 27) <= 26, `reading Intl ${JSON.stringify(r)}`)
})

test('form never claims published or validated status', () => {
  const form = loadForm()
  assert.ok(!['published', 'validated'].includes(form.status), form.status)
  assert.equal(form.audit.all_critical_categories_pass, false)
  assert.equal(form.audit.all_applicable_categories_measured, false)
})

test('math modeling representation meets the 20 percent floor', () => {
  const form = loadForm()
  const modeling = form.sections.Math?.modeling ?? []
  assert.ok(modeling.length >= 9, `modeling items: ${modeling.length}`)
})

test('every detected template-sibling group has a recorded adjudication', () => {
  const form = loadForm()
  const ids: string[] = form.blueprint.questionIds
  const texts = ids.map((id) => form.texts[id] ?? '')
  assert.equal(texts.filter(Boolean).length, ids.length)
  const groups = findTemplateSiblings(texts)
  const key = (indexes: number[]) => [...indexes].sort((a, b) => a - b).join(',')
  const adjudicated = new Set(form.siblingAdjudications.map((a) => key(a.indexes)))
  for (const group of groups) {
    assert.ok(
      adjudicated.has(key(group.indexes)),
      `unadjudicated sibling group: ${group.indexes.join(',')}`,
    )
  }
  for (const adj of form.siblingAdjudications) {
    assert.ok(adj.verdict && adj.reason, 'adjudication must state verdict and reason')
  }
})
