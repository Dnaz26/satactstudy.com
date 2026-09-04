import { writeFileSync } from 'node:fs'
import { DESMOS_STRATEGIES } from '../src/lib/desmos/strategies/catalog'

const rows = DESMOS_STRATEGIES.map((s) => ({
  id: s.id,
  slug: s.slug,
  title: s.title,
  category: s.category,
  mode: s.mode,
  description: s.description,
  when_to_use: s.when_to_use,
  when_not_to_use: s.when_not_to_use,
  recognition_rule: s.recognition_rule,
  desmos_capability: s.desmos_capability,
  desmos_input_template: s.desmos_input_template,
  student_steps: s.student_steps,
  what_to_look_for: s.what_to_look_for,
  why_it_works: s.why_it_works,
  common_mistakes: s.common_mistakes,
  sat_applicable: s.sat_applicable,
  act_applicable: s.act_applicable,
  difficulty: s.difficulty,
  desmos_only_possible: s.desmos_only_possible,
  desmos_first_recommended: s.desmos_first_recommended,
  hybrid_recommended: s.hybrid_recommended,
  estimated_time_savings: s.estimated_time_savings,
  example_problem: s.example_problem,
  example_desmos_input: s.example_desmos_input,
  example_result: s.example_result,
  explanation: s.explanation,
  try_it_prompt: s.try_it_prompt,
  keywords: s.keywords,
  source_reference: s.source_reference,
  agent_actions: s.agent_actions,
  active: true,
  approved: s.approved,
}))

writeFileSync('/tmp/desmos-rows.json', JSON.stringify(rows))
console.log(rows.length, Buffer.byteLength(JSON.stringify(rows)))
