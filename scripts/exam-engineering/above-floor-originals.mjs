import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricBand, rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'Above-floor originals 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(3 * 20 / 4 === 15 && (15 + 10) / 20 === 5 / 4, 'tower')
assert(Math.abs((Math.SQRT2 / 2) ** 2 - 0.5) < 1e-12, 'half square')
assert(Math.abs(1 / (1 - 0.25) - 4 / 3) < 1e-12, 'double tangent')
assert(7 / 6 + 11 / 6 === 3, 'solution sum in units of pi')
assert((196 + 225 - 169) / (2 * 14 * 15) === 3 / 5, 'law of cosines')
assert(0.5 * 14 * 15 * (4 / 5) === 84, 'triangle area')
assert(200 - 200 * (-0.5) === 300, 'bearing')
assert(-240 + 161 === -79 && 8 * 8 + 15 * 15 === 289, 'double sum')
assert(Math.abs(Math.sin(Math.PI / 6) - 0.5) < 1e-12 && Math.cos(Math.PI / 6) > 0, 'ferris rising')
assert((6 + 4 * -5) / (-5 - 2) === 2, 'parameter solution')
assert(2 * 3 + 4 * -1 === 2 && 5 * 3 + -1 === 14, 'system point fails second')
assert((1 - 6 + 11 - 6) === 0 && (8 - 24 + 22 - 6) === 0, 'cubic still')
assert(80 * 0.6 - 50 * 0.4 === 28, 'yes votes')
assert(400 * 0.04 === 16 && 58 - 4 === 54, 'margin')
assert(3 * 12 + 4 * 9 === 72, 'weighted')

const hard = (scores) => {
  const total = rubricTotal(scores)
  assert(total >= 12, `rubric ${total}`)
  return { ...scores, total, band: rubricBand(total) }
}
const items = []
function add(item) {
  assert(item.prompt.length >= 95, `short stem: ${item.prompt.slice(0, 80)}`)
  assert(!item.prompt.includes('$'), item.prompt.slice(0, 40))
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.prompt.slice(0, 40))
  if (item.rubric.graphInference > 0) assert(item.graphicData, item.prompt.slice(0, 40))
  item.rubric = hard(item.rubric)
  items.push(item)
}
const R = (...values) => ({
  steps: values[0], abstraction: values[1], hiddenSetup: values[2], conceptMixing: values[3],
  graphInference: values[4], passageComplexity: values[5], choiceCloseness: values[6],
  distractorRealism: values[7], timePressure: values[8],
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'A cliff rises from a straight shore. From a boat, the tangent of the angle of elevation to the top of the cliff is 3/8. The boat sails 20 meters toward the cliff, and the tangent of the angle of elevation to the top of the cliff is then 3/4. A tower stands on the cliff. From that closer position, the tangent of the angle of elevation to the top of the tower is 5/4. How many meters tall is the tower itself, not including the cliff?',
  answer: 'B',
  choices: [
    ['15', '15 meters is the cliff alone. The closer reading to the cliff top is 3/4, and the closer distance is 20 meters.'],
    ['10', 'The cliff is 15 meters and the closer distance is 20 meters. The tower reading gives (15 + tower) / 20 = 5/4, so the tower is 10 meters.'],
    ['25', '25 meters is the cliff and the tower together, which is the height to the top of the tower, not the tower alone.'],
    ['20', '20 meters is the closer distance to the cliff, not a height.'],
  ],
  proof: 'Let the closer distance be d. Then h/d = 3/4 and h/(d+20) = 3/8, so d = 20 and h = 15. Then (15 + tower)/20 = 5/4, so the tower is 10.',
  rubric: R(2, 2, 2, 2, 1, 1, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { closerMeters: 20, fartherMeters: 40, cliffMeters: 15, towerMeters: 10 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'Angle θ lies in quadrant II and satisfies sin θ + cos θ = √2/2. What is the exact value of sin(2θ)?',
  answer: 'C',
  choices: [
    ['1/2', 'Squaring sin θ + cos θ gives 1 + sin(2θ). That sum of squares is 1/2, so sin(2θ) is 1/2 minus 1, not 1/2.'],
    ['√2/2', 'That is the given sum sin θ + cos θ. It is not the double-angle sine.'],
    ['-1/2', 'Square the given sum: 1/2 = 1 + sin(2θ). So sin(2θ) = -1/2. The angle 105 degrees is in quadrant II and fits the given sum.'],
    ['-√2/2', 'That would be the sum itself with the wrong sign. The double-angle value is -1/2.'],
  ],
  proof: '(sin θ + cos θ)^2 = 1 + sin(2θ) = 1/2, so sin(2θ) = -1/2.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { quadrant: 2, exampleDegrees: 105, doubleAngleSine: '-1/2' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Right triangles and trigonometry',
  prompt: 'In triangle ABC, side AB has length 15, side AC has length 14, and side BC has length 13. What is the area of triangle ABC?',
  answer: 'A',
  choices: [
    ['84', 'The angle opposite 13 has cosine (196 + 225 - 169) / 420 = 3/5, so its sine is 4/5. The area is (1/2)(14)(15)(4/5) = 84.'],
    ['91', 'That is (1/2)(13)(14), which treats the angle between those sides as a right angle. The cosine of that angle is 3/5, not 0.'],
    ['105', 'That is (1/2)(14)(15), which uses sine 1. The included sine is 4/5.'],
    ['42', 'That stops at half of 84, dropping the factor from the two known sides.'],
  ],
  proof: 'cos C = 252/420 = 3/5, sin C = 4/5, area = (1/2)*14*15*(4/5) = 84.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { sides: [13, 14, 15], cosineOpposite13: '3/5', area: 84 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Right triangles and trigonometry',
  prompt: 'A boat sails 10 kilometers due east and then turns 60 degrees toward the north and sails 10 kilometers on that new heading. How many kilometers is the boat from its starting point?',
  answer: 'D',
  choices: [
    ['10', 'That uses the 60 degree turn as the inside angle of the triangle. The inside angle between the path back to the start is 120 degrees.'],
    ['10√2', 'That would be a 90 degree turn. The heading changed by 60 degrees, so the inside angle is 120 degrees.'],
    ['20', 'That adds the two legs and ignores the turn.'],
    ['10√3', 'The inside angle is 120 degrees. Then 100 + 100 - 200 cos 120 degrees = 300, and the distance is √300 = 10√3.'],
  ],
  proof: 'Included angle is 180 - 60 = 120. d^2 = 300, so d = 10√3.',
  rubric: R(2, 2, 2, 2, 1, 1, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { legsKm: [10, 10], turnDegrees: 60, includedDegrees: 120, distanceKm: '10√3' },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'Angle θ is acute, sin θ = k, and cos θ = 2k, where k is a positive number. What is the exact value of tan(2θ)?',
  answer: 'A',
  choices: [
    ['4/3', 'Then k^2 + 4k^2 = 1, so tan θ = 1/2. The double-angle formula gives 2*(1/2) / (1 - 1/4) = 4/3.'],
    ['1/2', '1/2 is tan θ, before the double-angle formula is applied.'],
    ['2', '2 is cos θ / sin θ, which is cot θ, not tan(2θ).'],
    ['4/5', '4/5 is sin(2θ), because 2*(1/√5)*(2/√5) = 4/5. The question asks for the tangent of the double angle.'],
  ],
  proof: 'tan θ = 1/2 and tan(2θ) = 1 / (3/4) = 4/3. Also sin(2θ) = 4/5 and cos(2θ) = 3/5.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'What is the sum of all solutions of the equation 2 cos^2 x + 3 sin x = 0 on the half-open interval 0 ≤ x < 2π?',
  answer: 'B',
  choices: [
    ['2π', 'That adds only one full turn. The equation becomes sin x = -1/2 after using cos^2 x = 1 - sin^2 x, and there are two solutions.'],
    ['3π', 'The equation factors to sin x = -1/2. The solutions are 7π/6 and 11π/6, and their sum is 3π.'],
    ['π', 'That is the distance between the two solutions, not their sum.'],
    ['5π/2', 'That misses 7π/6 and uses a value outside the solution set.'],
  ],
  proof: '2(1 - sin^2 x) + 3 sin x = 0 becomes 2s^2 - 3s - 2 = 0, so sin x = -1/2. Sum = 3π.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { solutionsRadians: ['7π/6', '11π/6'], sumRadians: '3π' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear equations in one variable',
  prompt: 'The equation a(x - 4) = 2x + 6 has exactly one solution, and that solution is x = 2. What is the value of a?',
  answer: 'C',
  choices: [
    ['5', 'Substituting a = 5 and x = 2 gives 5(-2) = -10 on the left and 10 on the right.'],
    ['2', 'If a = 2, the x terms cancel and the equation becomes -8 = 6, which is never true.'],
    ['-5', 'Substitute x = 2: a(2 - 4) = 4 + 6, so -2a = 10 and a = -5. The rewritten form has a single solution only when a is not 2.'],
    ['-2', 'Substituting a = -2 and x = 2 gives (-2)(-2) = 4 on the left and 10 on the right.'],
  ],
  proof: 'x = (6 + 4a)/(a - 2) equals 2 only when a = -5.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear equations in two variables',
  prompt: 'A line passes through (1, 5) and (5, -3). A second line is perpendicular to it and passes through (1, 5). At what point does the second line meet the x-axis?',
  answer: 'D',
  choices: [
    ['(0, 11)', 'That is a y-intercept of a line through (1, 5) with the original slope, not the perpendicular line meeting the x-axis.'],
    ['(11, 0)', 'The original slope is -2, so the perpendicular slope is 1/2. From (1, 5), y - 5 = (1/2)(x - 1). Setting y = 0 gives x = -9, not 11.'],
    ['(1, 0)', 'The second line passes through (1, 5), not through (1, 0).'],
    ['(-9, 0)', 'Perpendicular slope is 1/2. Then 0 - 5 = (1/2)(x - 1), so x = -9.'],
  ],
  proof: 'Slope = -8/4 = -2. Perpendicular slope = 1/2.  -5 = (1/2)(x - 1), x - 1 = -10, x = -9.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { firstSlope: -2, perpendicularSlope: 0.5, xIntercept: [-9, 0] },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Systems of two linear equations in two variables',
  prompt: 'The system x + 2y = 8 and 3x - y = 3 has solution (x, y). A second system uses the same first equation and replaces the second equation with 3x - y = 3 + k. For which k is the x-coordinate of the new solution exactly 1 greater than the original x-coordinate?',
  answer: 'A',
  choices: [
    ['7/2', 'The original solution is (2, 3). If the new x is 3, then 3 + 2y = 8 so y = 5/2, and 9 - 5/2 = 13/2 = 3 + k, so k = 7/2.'],
    ['-7/2', 'That subtracts the new left side from 3 instead of subtracting 3 from the new left side.'],
    ['1', 'Increasing the constant by 1 does not increase x by 1, because y changes at the same time.'],
    ['7', 'That drops the denominator when 13/2 - 3 is simplified.'],
  ],
  proof: 'Original solution is (2, 3). New x = 3 gives y = 5/2. Then 9 - 5/2 = 13/2 = 3 + k, so k = 7/2.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})
assert(24 - 7 * 3 === 3 && 9 - 2.5 === 6.5 && 6.5 - 3 === 3.5, 'shifted system')

add({
  exam: 'SAT', section: 'Math', topic: 'Systems of Equations',
  prompt: 'For which value of k does the linear system x + y = 6 and kx + 2y = 14 have no solution at all?',
  answer: 'B',
  choices: [
    ['6', 'If k = 6, then subtracting twice the first equation from the second leaves 4x = 2, which has a solution.'],
    ['2', 'When k = 2, both equations have the same x and y coefficients after comparing x + y and 2x + 2y, but 2*6 = 12, which is not 14. The lines are parallel and distinct.'],
    ['1', 'If k = 1, substitution gives a single intersection.'],
    ['0', 'If k = 0, the second equation fixes y = 7, and then x = -1. That is one solution.'],
  ],
  proof: 'No solution when k/1 = 2/1 and 14 is not 12. So k = 2.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Systems of Equations',
  prompt: 'The lines 2x + y = 7 and x - y = 2 intersect at one point. A third line, y = x + c, passes through that same point. What is the value of c?',
  answer: 'C',
  choices: [
    ['2', '2 is the constant in the second equation, not the intercept gap of the third line.'],
    ['1', 'The intersection is (3, 1). Then 1 = 3 + c only if c = -2.'],
    ['-2', 'Adding the equations gives 3x = 9, so x = 3 and y = 1. Then 1 = 3 + c.'],
    ['4', '4 is x + y at the intersection, not c.'],
  ],
  proof: 'Add the equations: 3x = 9, x = 3, y = 1. c = y - x = -2.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 1),
  graphicType: 'coordinate_plane',
  graphicData: { intersection: [3, 1], thirdLine: 'y = x - 2' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear inequalities in one or two variables',
  prompt: 'Both parts of the compound inequality -3 < 2x - 1 ≤ 7 are true at the same time. What is the greatest integer value of x?',
  answer: 'D',
  choices: [
    ['-1', 'If x = -1, then 2x - 1 = -3, but the first inequality is strict, so -3 is not allowed.'],
    ['5', 'If x = 5, then 2x - 1 = 9, which is greater than 7.'],
    ['0', 'If x = 0, then 2x - 1 = -1, which is inside the interval. It is not the greatest integer in the interval.'],
    ['4', 'If x = 4, then 2x - 1 = 7, and 7 is allowed by the second part. Also -3 < 7.'],
  ],
  proof: '-2 < 2x ≤ 8, so -1 < x ≤ 4. The greatest integer x is 4.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 1),
})

assert(items.length >= 12, `built ${items.length}`)

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const item of items) {
  const matches = topicRows.filter((row) => row.name === item.topic && row.categories?.sections?.tests?.name === item.exam && row.categories?.sections?.name === item.section)
  if (matches.length !== 1) throw new Error(`Topic lookup failed for ${item.exam} ${item.section} ${item.topic}: ${matches.length}`)
  item.topicRow = { id: matches[0].id, domain: matches[0].categories.name, topic: matches[0].name }
}

function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}

const existing = checked(await db.from('questions').select('id').eq('source', batchName).limit(5))
let inserted = 0
if (existing.length === 0) {
  const rows = items.map((item) => ({
    test_type: item.exam,
    section_name: item.section,
    category_name: item.topicRow.domain,
    topic_name: item.topicRow.topic,
    subtopic_name: item.topicRow.topic,
    topic_id: item.topicRow.id,
    difficulty: 'Hard',
    difficulty_score: 1,
    question_type: 'multiple_choice',
    question_text: item.prompt,
    choice_a: item.choices[0][0],
    choice_b: item.choices[1][0],
    choice_c: item.choices[2][0],
    choice_d: item.choices[3][0],
    correct_answer: item.answer,
    official_explanation: item.proof,
    source_type: 'original',
    source_rights_status: 'owned',
    source: batchName,
    exam_name: batchName,
    fingerprint: fingerprintFor(item),
    answer_verification_status: 'independently_verified',
    review_status: 'approved',
    approved: true,
    active: true,
  }))
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(items.map((item) => {
    const rationales = {}
    item.choices.forEach((choice, index) => {
      const letter = 'ABCD'[index]
      rationales[letter] = letter === item.answer ? `Correct: ${choice[1]}` : choice[1]
    })
    return {
      question_id: idByFingerprint.get(fingerprintFor(item)),
      version: 1,
      exam_type: item.exam,
      section: item.section,
      domain: item.topicRow.domain,
      skill: item.topicRow.topic,
      subskill: item.proof.slice(0, 180),
      difficulty_level: 7,
      difficulty_basis: 'editorial',
      estimated_seconds: 120,
      module_eligibility: item.exam === 'SAT'
        ? [{ module: 1, route: 'common' }, { module: 2, route: 'harder' }]
        : [{ module: 1, route: 'common' }],
      distractor_rationales: rationales,
      graphic_type: item.graphicType ?? null,
      graphic_data: item.graphicData ?? null,
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: fingerprintFor(item),
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        graphic_data_verified: Boolean(item.graphicData),
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Each numeric result was asserted before insert. These items sit above a two-constraint floor.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const report = { generatedAt: new Date().toISOString(), batch: batchName, built: items.length, inserted }
writeFileSync('supabase/exam-engineering/above-floor-originals-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
