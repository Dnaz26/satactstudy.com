import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'node:fs/promises'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const fields = 'id,question_text,choice_a,choice_b,choice_c,choice_d,choice_e,difficulty,difficulty_score,category_name,topic_name,passage_id,passages(id,title,content)'
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]))
const passageOf = (q) => Array.isArray(q.passages) ? q.passages[0] : q.passages
const choices = (q) => ['choice_a', 'choice_b', 'choice_c', 'choice_d', 'choice_e']
  .map((key, i) => q[key] ? `<li><b>${'ABCDE'[i]}.</b> ${esc(q[key])}</li>` : '').join('')
const question = (q, number) => `<article class="question"><h4>${number}. ${esc(q.question_text)}</h4><ol>${choices(q)}</ol><small>${esc(q.category_name || '')}${q.topic_name ? ` · ${esc(q.topic_name)}` : ''} · ${esc(q.difficulty || 'unrated')}</small></article>`

async function load(section) {
  const { data, error } = await db.from('questions').select(fields)
    .eq('test_type', 'ACT').eq('section_name', section).eq('approved', true).eq('active', true).limit(2000)
  if (error) throw error
  return data
}

const [englishBank, mathBank, readingBank] = await Promise.all(['English', 'Math', 'Reading'].map(load))

function passageGroups(bank, perGroup, groupCount) {
  const grouped = new Map()
  for (const q of bank) {
    if (!q.passage_id || !passageOf(q)?.content) continue
    const list = grouped.get(q.passage_id) || []
    list.push(q)
    grouped.set(q.passage_id, list)
  }
  return [...grouped.values()]
    .filter((group) => group.length >= perGroup)
    .sort((a, b) => (passageOf(b[0]).content.length - passageOf(a[0]).content.length) || a[0].passage_id.localeCompare(b[0].passage_id))
    .slice(0, groupCount)
    .map((group) => group.sort((a, b) => a.id.localeCompare(b.id)).slice(0, perGroup))
}

const englishGroups = passageGroups(englishBank, 10, 5)
if (englishGroups.length !== 5) throw new Error('Supabase does not contain five English passages with ten approved questions each.')
const readingGroups = passageGroups(readingBank, 12, 3)
if (readingGroups.length !== 3) throw new Error('Supabase does not contain three Reading passages with twelve approved questions each.')

const rankedMath = [...mathBank].sort((a, b) => (a.difficulty_score ?? 0.5) - (b.difficulty_score ?? 0.5) || a.id.localeCompare(b.id))
const math = Array.from({ length: 45 }, (_, i) => rankedMath[Math.round(i * (rankedMath.length - 1) / 44)])
if (new Set(math.map((q) => q.id)).size !== 45) throw new Error('Math selection contains duplicates.')

let englishNumber = 0
let readingNumber = 0
const sectionGroups = (groups, kind) => groups.map((group, index) => {
  const p = passageOf(group[0])
  const questionHtml = group.map((q) => question(q, kind === 'English' ? ++englishNumber : ++readingNumber)).join('')
  return `<section class="passage"><div class="passage-text"><p class="eyebrow">${kind} passage ${index + 1}</p><h3>${esc(p.title)}</h3><p>${esc(p.content)}</p></div><div>${questionHtml}</div></section>`
}).join('')

const generated = new Date().toISOString()
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACT Supabase Full-Test Sample</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui;color:#182136;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}.top{position:sticky;top:0;background:#10182c;color:white;padding:18px 5vw;z-index:2}.top h1{margin:0;font-size:22px}.top p{margin:6px 0 0;color:#bdc8df}.wrap{max-width:1050px;margin:auto;padding:32px 24px 80px}.notice{background:#fff4d6;border:1px solid #e8c76a;border-radius:16px;padding:16px;margin-bottom:28px}.section-head{display:flex;justify-content:space-between;align-items:end;border-bottom:3px solid #3d58db;padding:36px 0 12px}.passage{display:grid;grid-template-columns:minmax(260px,1fr) minmax(320px,1.2fr);gap:28px;margin:28px 0 48px}.passage-text{position:sticky;top:96px;align-self:start;background:white;border:1px solid #dce2ee;border-radius:18px;padding:24px;line-height:1.65}.question{background:white;border:1px solid #dce2ee;border-radius:16px;padding:18px 20px;margin-bottom:14px;break-inside:avoid}.question h4{font-size:16px;line-height:1.5;margin:0 0 12px}.question ol{list-style:none;padding:0;margin:0}.question li{padding:7px 0}.question small{display:block;color:#68728a;margin-top:10px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:#3d58db;font-weight:800}.math-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}@media(max-width:760px){.passage,.math-grid{grid-template-columns:1fr}.passage-text{position:static}}@media print{.top{position:static}.passage{display:block}.passage-text{position:static;margin-bottom:16px}.section-head{break-before:page}}
</style></head><body><header class="top"><h1>ACT Full-Test Database Sample</h1><p>50 English · 45 Math · 36 Reading · generated ${esc(generated)}</p></header><main class="wrap"><div class="notice"><b>Comparison note:</b> Every passage and question below was loaded from the current Supabase bank. The stored passages are substantially shorter than current ACT passage sets, so this page is useful for auditing the bank but should not be treated as a fully authentic ACT form.</div>
<div class="section-head"><div><p class="eyebrow">Section 1</p><h2>English</h2></div><b>50 questions</b></div>${sectionGroups(englishGroups, 'English')}
<div class="section-head"><div><p class="eyebrow">Section 2</p><h2>Math</h2></div><b>45 questions</b></div><div class="math-grid">${math.map((q, i) => question(q, i + 1)).join('')}</div>
<div class="section-head"><div><p class="eyebrow">Section 3</p><h2>Reading</h2></div><b>3 passages · 36 questions</b></div>${sectionGroups(readingGroups, 'Reading')}
</main></body></html>`

await writeFile(new URL('../public/act-full-test-example.html', import.meta.url), html)
console.log(JSON.stringify({ english: englishNumber, math: math.length, reading: readingNumber, readingPassages: readingGroups.length, output: 'public/act-full-test-example.html' }))
