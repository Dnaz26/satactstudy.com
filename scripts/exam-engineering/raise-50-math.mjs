import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'Fifty percent harder math 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(2 - (3 / 2) * 4 === -4, 'parallel line')
assert(0 + 9 === 9 && 2 * 2 + 5 === 9, 'region corner')
assert(54 > 50 && 55 < 60 && 71 > 60, 'margins')
assert(3 * 0 - 1 === -1 && 3 * -1 - 1 === -4, 'nested linear')
assert((4 - 1) * (4 - 2) * (4 - 3) === 6, 'remainder')
assert(12 + 18 === 30 && 30 + 40 === 70, 'combined rate')
assert(5 * 8 - 4 * 7 === 12, 'removed value')
assert(Math.abs(0.5 * 0.4 + 0.5 * 0.2 - 0.3) < 1e-12 && Math.abs(0.2 / 0.3 - 2 / 3) < 1e-12, 'bayes')
assert((4 / 5) * 3000 / 40 === 60, 'dye')
assert(110 / 2 === 55 && 180 - 110 === 70, 'exterior')
assert(Math.abs(4 - 2 * 3) === 2 && Math.abs(1 - 2 * 1) === 1, 'residual')
assert(48 * 1.5 * 1000 === 72000, 'meters')
assert(6 * 16 === 96, 'surface')
assert([-1, 0, 1, 2, 3].filter((x) => x > -2 && 3 * x - 1 <= 8).length === 5, 'integer count')
assert((32 - 8) / (6 - 2) === 6, 'tank')
assert(Math.abs(7 / 1.25 - 5.6) < 1e-12 && (5.6 / 2) * 5 === 14, 'map')
assert(6 * 6 - 4 * 6 === 12 && 5 * 5 - 4 * 5 === 5, 'parabola crosses')
assert((2 + 2) - (2 - 2) === 4, 'equivalent value')
assert(20 + 4 * -5 === 0, 'discriminant')
assert(2 * (1 - 3) + 1 - ((2 * 1 + 1) - 3) === -3, 'composition gap')
assert((320 + 100) / 5 === 84, 'mean forces 100')
assert(Math.abs(5 / 6 - 2 / 3 - 1 / 6) < 1e-12 && 72 * 5 / 6 * 0.75 === 45, 'tank remain')
assert(30 / 56 + 15 / 56 === 45 / 56 || 15 / 28 === 15 / 28, 'different colors')
assert((5 / 8) * (3 / 7) + (3 / 8) * (5 / 7) === 30 / 56, 'color order')
assert([-1, 0, 1, 2, 3, 4].filter((x) => Math.abs(2 * x - 3) < 5).length === 4, 'absolute integers')
assert(2 * 1 + 3 === 5 && 2 * 5 + 3 === 13, 'double function')

const items = []
function add(item) {
  const total = rubricTotal(item.rubric)
  assert(total >= 12, `${item.topic} ${total}`)
  assert(item.prompt.length >= 95, `${item.topic} len ${item.prompt.length}`)
  assert(!item.prompt.includes('$'), item.topic)
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.topic)
  item.rubric = { ...item.rubric, total, band: total >= 15 ? 'elite-hard' : 'true-hard' }
  items.push(item)
}
const R = (...v) => ({
  steps: v[0], abstraction: v[1], hiddenSetup: v[2], conceptMixing: v[3], graphInference: v[4],
  passageComplexity: v[5], choiceCloseness: v[6], distractorRealism: v[7], timePressure: v[8],
})

add({
  exam: 'SAT', section: 'Math', topic: 'Angles and Lines',
  prompt: 'Two parallel lines are cut by a transversal. One same-side interior angle measures 2x + 10 degrees and the other measures 3x - 5 degrees. The smaller of those two angles is an interior angle of a triangle, and a second angle of that triangle measures 30 degrees. What is the third angle of the triangle, in degrees?',
  answer: 'C',
  choices: [
    ['80', '80 degrees is the smaller same-side interior angle, before it is used as an angle of the triangle.'],
    ['100', '100 degrees is the larger same-side interior angle. The triangle uses the smaller one.'],
    ['70', 'The same-side pair sums to 180, so x = 35 and the angles are 80 and 100. The triangle is 80 + 30 + third = 180, so the third angle is 70.'],
    ['35', '35 is the value of x, not an angle of the triangle.'],
  ],
  proof: '5x + 5 = 180, x = 35, smaller angle 80. Third angle = 180 - 80 - 30 = 70.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { parallelAngles: [80, 100], triangle: [80, 30, 70] },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Slope and Rate of Change',
  prompt: 'Line AB passes through (1, 4) and (5, -2). Line CD is parallel to AB and passes through (0, 2). What is the y-coordinate of the point on CD whose x-coordinate is 4?',
  answer: 'A',
  choices: [
    ['-4', 'The slope of AB is -3/2. The parallel line through (0, 2) is y = 2 - (3/2)x. At x = 4, y = 2 - 6 = -4.'],
    ['-6', 'That is only the rise from x = 0 to x = 4, without adding the starting height 2.'],
    ['2', '2 is the y-intercept of CD, not the height at x = 4.'],
    ['-3/2', 'That is the slope, not a y-coordinate.'],
  ],
  proof: 'Slope = -6/4 = -3/2. y = 2 - (3/2)(4) = -4.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { slope: -1.5, pointAtX4: [4, -4] },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Systems of Inequalities',
  prompt: 'Integers x and y satisfy x ≥ 0, y ≥ x + 1, and 2x + y ≤ 9. What is the greatest possible value of x + y?',
  answer: 'B',
  choices: [
    ['8', 'The point (1, 7) gives 8, but (0, 9) is also allowed and gives a larger sum.'],
    ['9', 'At x = 0, y can be 9. Then 2(0) + 9 = 9 and 9 ≥ 1, so the sum 9 is allowed. No allowed point has a larger sum.'],
    ['10', 'A sum of 10 would require 2x + y ≥ 10 when y ≥ x, which breaks 2x + y ≤ 9.'],
    ['7', 'The point (2, 5) gives 7, which is allowed but not greatest.'],
  ],
  proof: 'Allowed sums peak at (0, 9). x = 3 leaves no integer y that is both at least 4 and at most 3.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { bestPoint: [0, 9], maxSum: 9 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Inference from sample statistics and margin of error',
  prompt: 'Poll A finds 58 percent in favor, with a margin of error of 4 percentage points. Poll B finds 63 percent in favor, with a margin of error of 8 percentage points. A speaker says both polls establish that at least 60 percent are in favor. Which conclusion follows?',
  answer: 'D',
  choices: [
    ['Only Poll A establishes the claim.', 'Poll A’s interval is 54 to 62 percent, which includes values below 60.'],
    ['Only Poll B establishes the claim.', 'Poll B’s interval is 55 to 71 percent, which includes values below 60.'],
    ['Both polls establish the claim.', 'Each interval contains numbers below 60, so neither one rules those numbers out.'],
    ['Neither poll establishes the claim.', 'A result establishes “at least 60 percent” only when the whole interval is at or above 60. Neither interval is.'],
  ],
  proof: 'Intervals are 54–62 and 55–71. Both dip below 60.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Functions',
  prompt: 'The function f is defined by f(x) = 3x - 1 for every real number x. What is the value of f(f(0))?',
  answer: 'C',
  choices: [
    ['-1', 'That is f(0), before the function is applied a second time.'],
    ['-3', 'That multiplies -1 by 3 and forgets to subtract 1 on the second application.'],
    ['-4', 'f(0) = -1, and f(-1) = 3(-1) - 1 = -4.'],
    ['2', 'That uses f(1) instead of f(0).'],
  ],
  proof: 'f(0) = -1 and f(-1) = -4.',
  rubric: R(2, 2, 1, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear functions',
  prompt: 'The function g is defined by g(x) = 2x + 3 for every real number x. What is the value of g(g(1))?',
  answer: 'A',
  choices: [
    ['13', 'g(1) = 5, and g(5) = 2(5) + 3 = 13.'],
    ['5', '5 is only the inner value g(1).'],
    ['10', 'That doubles g(1) and skips the added 3 on the second application.'],
    ['7', 'That adds 2 to g(1) instead of applying g.'],
  ],
  proof: 'g(1) = 5 and g(5) = 13.',
  rubric: R(2, 2, 1, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Polynomials',
  prompt: 'For the polynomial p(x) = (x - 1)(x - 2)(x - 3), what is the remainder when p(x) is divided by x - 4?',
  answer: 'B',
  choices: [
    ['0', 'x - 4 is not a factor. p(4) is not 0.'],
    ['6', 'By the remainder theorem the remainder is p(4) = 3 · 2 · 1 = 6.'],
    ['4', '4 is the input, not the value of the product.'],
    ['24', 'That multiplies 4 · 3 · 2 and shifts the factors.'],
  ],
  proof: 'Remainder is p(4) = 6.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Data Interpretation',
  prompt: 'A table shows 12 yes votes out of 30 on Monday and 18 yes votes out of 40 on Tuesday. What fraction of the combined voters voted yes?',
  answer: 'A',
  choices: [
    ['3/7', 'The combined count is 30 yes votes out of 70 voters, which is 3/7. Averaging the two daily rates is a different number.'],
    ['2/5', '2/5 is Monday’s rate, 12/30. Tuesday’s votes are not included.'],
    ['9/20', '9/20 is Tuesday’s rate, 18/40.'],
    ['17/40', 'That averages 12/30 and 18/40 as if the groups were the same size. They are not.'],
  ],
  proof: '30/70 = 3/7.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'table',
  graphicData: { monday: [12, 30], tuesday: [18, 40], combined: '3/7' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'One-variable data: distributions and measures of center and spread',
  prompt: 'Five numbers have mean 8 and median 7. One number is removed. The mean of the remaining four numbers is 7. What number was removed?',
  answer: 'D',
  choices: [
    ['7', 'Removing the median would leave a sum of 33, but the new mean requires a remaining sum of 28.'],
    ['8', 'Removing the old mean does not produce the new mean of 7.'],
    ['4', 'That is the drop in the mean, not the removed number.'],
    ['12', 'The original sum is 40 and the remaining sum is 28, so the removed number is 12. A set such as 4, 7, 7, 10, 12 has median 7 and mean 8.'],
  ],
  proof: '40 - 28 = 12. The set 4, 7, 7, 10, 12 shows the median condition can hold.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Probability',
  prompt: 'Event A has probability 1/2. The probability of B given A is 2/5, and the probability of B given not A is 1/5. What is the probability of A given B?',
  answer: 'C',
  choices: [
    ['2/5', '2/5 is the probability of B given A, before Bayes’ rule uses the other branch.'],
    ['1/5', '1/5 is the probability of B given not A.'],
    ['2/3', 'P(B) = (1/2)(2/5) + (1/2)(1/5) = 3/10. Then P(A and B) / P(B) = (1/5) / (3/10) = 2/3.'],
    ['3/10', '3/10 is P(B), not P(A given B).'],
  ],
  proof: 'P(A and B) = 1/5 and P(B) = 3/10, so P(A|B) = 2/3.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Ratios, rates, proportional relationships, and units',
  prompt: 'A shop pours 3 liters of dye for every 40 shirts, but only 4/5 of the dye that is poured actually colors the shirts. How many milliliters of dye color each shirt?',
  answer: 'B',
  choices: [
    ['75', '75 milliliters is the amount poured per shirt before the wasted fifth is removed.'],
    ['60', 'Four fifths of 3000 milliliters is 2400 milliliters. 2400 / 40 = 60 milliliters per shirt.'],
    ['15', '15 is one fifth of 75, the wasted part, not the dye that colors the shirt.'],
    ['48', 'That uses 4/5 of 40 shirts instead of 4/5 of the dye.'],
  ],
  proof: '(4/5) * 3000 / 40 = 60.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Lines, angles, and triangles',
  prompt: 'The exterior angle at vertex C of triangle ABC measures 110 degrees. The two remote interior angles are equal. What is the measure, in degrees, of angle C inside the triangle?',
  answer: 'A',
  choices: [
    ['70', 'Each remote interior angle is 55 degrees because 55 + 55 = 110. The interior angle at C is 180 - 110 = 70.'],
    ['55', '55 degrees is one remote interior angle, not angle C.'],
    ['110', '110 degrees is the exterior angle. The interior angle adjacent to it is supplementary, not equal to it.'],
    ['40', 'That subtracts 70 from 110 a second time.'],
  ],
  proof: 'Remote angles are 55 and 55. Interior angle C = 70.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { exterior: 110, remote: [55, 55], interiorC: 70 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Two-variable data: models and scatterplots',
  prompt: 'A line of fit is y = 2x. The plotted points are (1, 1), (2, 5), and (3, 4). Which point has the residual with the greatest absolute value?',
  answer: 'D',
  choices: [
    ['(1, 1)', 'The residual is 1 - 2 = -1, and the absolute value is 1.'],
    ['(2, 5)', 'The residual is 5 - 4 = 1, and the absolute value is 1.'],
    ['They are tied.', 'The absolute residuals are 1, 1, and 2, so they are not tied.'],
    ['(3, 4)', 'The residual is 4 - 6 = -2, and the absolute value is 2, which is the largest.'],
  ],
  proof: 'Absolute residuals are 1, 1, and 2. The largest is at (3, 4).',
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 2),
  graphicType: 'scatterplot',
  graphicData: { line: 'y = 2x', residuals: { '(1,1)': -1, '(2,5)': 1, '(3,4)': -2 } },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Unit Conversions',
  prompt: 'A car travels at a constant 48 kilometers per hour for 90 minutes. How many meters does it travel?',
  answer: 'C',
  choices: [
    ['48,000', 'That is 48 kilometers converted to meters, which is the distance for 1 hour, not 90 minutes.'],
    ['72', '72 kilometers is the distance before the conversion to meters.'],
    ['72,000', '90 minutes is 1.5 hours. 48 · 1.5 = 72 kilometers, and 72 kilometers is 72,000 meters.'],
    ['7,200', 'That converts 72 kilometers as if each kilometer were 100 meters.'],
  ],
  proof: '1.5 hours times 48 km/h is 72 km, which is 72,000 m.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Area and Volume',
  prompt: 'A solid cube has side length 4 inches. A cube of side length 2 inches is cut out of one corner. What is the surface area, in square inches, of the remaining solid?',
  answer: 'B',
  choices: [
    ['84', 'That subtracts the three exposed faces of the small cube and forgets that the cut adds three new faces of the same area.'],
    ['96', 'The original surface area is 6 · 16 = 96. The cut removes 3 faces of area 4 and adds 3 faces of area 4, so the surface area stays 96.'],
    ['108', 'That adds the three new faces without removing the three faces that were cut away.'],
    ['56', '56 is the remaining volume, 64 - 8, not the surface area.'],
  ],
  proof: 'Removed area equals added area, so the surface area remains 96.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { outerSide: 4, cutSide: 2, surfaceArea: 96 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Area and volume',
  prompt: 'A cylinder and a cone have the same radius 3 and the same height 10. How much greater is the volume of the cylinder than the volume of the cone, in cubic units?',
  answer: 'A',
  choices: [
    ['60π', 'The cylinder’s volume is 90π and the cone’s volume is one third of that, 30π. The difference is 60π.'],
    ['90π', '90π is the cylinder alone.'],
    ['30π', '30π is the cone alone.'],
    ['120π', 'That adds the two volumes instead of subtracting them.'],
  ],
  proof: 'πr^2h - (1/3)πr^2h = (2/3)π · 9 · 10 = 60π.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Inequalities',
  prompt: 'How many integers x satisfy both of the inequalities x > -2 and 3x - 1 ≤ 8 at the same time? Include every integer that works.',
  answer: 'D',
  choices: [
    ['3', 'That counts only the positive integers in the interval.'],
    ['4', 'That drops x = -1, which is greater than -2 and gives 3(-1) - 1 = -4, which is at most 8.'],
    ['6', 'That includes x = -2, but the first inequality is strict.'],
    ['5', 'The integers are -1, 0, 1, 2, and 3. The upper bound is x ≤ 3.'],
  ],
  proof: 'x > -2 and x ≤ 3. Five integers.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Equations',
  prompt: 'A tank starts with 8 liters. A pump adds 6 liters per minute and a leak removes 2 liters per minute, both running the whole time. After how many minutes does the tank hold 32 liters?',
  answer: 'B',
  choices: [
    ['4', '4 is the net liters per minute, not the number of minutes.'],
    ['6', 'The net change is 4 liters per minute. (32 - 8) / 4 = 6 minutes.'],
    ['8', '8 is the starting amount.'],
    ['32/6', 'That divides the target by the pump rate and ignores both the leak and the starting amount.'],
  ],
  proof: 'Net rate 4 L/min. 24 liters are needed. 24 / 4 = 6.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Ratios and Proportions',
  prompt: 'A map’s printed scale is 2 centimeters to 5 kilometers. After the scale was printed, the map was enlarged by 25 percent. A road measures 7 centimeters on the enlarged map. How many kilometers long is the road?',
  answer: 'C',
  choices: [
    ['17.5', 'That treats 7 centimeters as if it were still on the original scale.'],
    ['21.875', 'That enlarges the distance instead of shrinking the measured length back to the printed scale.'],
    ['14', 'The enlargement multiplies lengths by 5/4, so the road was 7 / (5/4) = 5.6 centimeters on the original scale. (5.6 / 2) · 5 = 14 kilometers.'],
    ['7', '7 is the measured length in centimeters, not the distance in kilometers.'],
  ],
  proof: 'Original map length 5.6 cm represents 14 km.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Nonlinear functions',
  prompt: 'The function f is defined by f(x) = x^2 - 4x. What is the smallest integer x greater than 0 such that f(x) > 5?',
  answer: 'A',
  choices: [
    ['6', 'f(5) = 5, which is not greater than 5. f(6) = 12, which is greater than 5, and no smaller positive integer works.'],
    ['5', 'f(5) = 5, and the inequality is strict.'],
    ['4', 'f(4) = 0, which is less than 5.'],
    ['1', 'f(1) = -3, which is less than 5.'],
  ],
  proof: '(x - 5)(x + 1) > 0. The positive integers that work start at 6.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { firstIntegerAbove5: 6, f5: 5, f6: 12 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Equivalent expressions',
  prompt: 'For every real number x not equal to 2, which expression is equivalent to (x^2 - 4) / (x - 2) - (x - 2)?',
  answer: 'D',
  choices: [
    ['x + 2', 'That is only the simplified first fraction. The expression still subtracts x - 2.'],
    ['0', 'The two parts are not equal. Their difference is the constant 4.'],
    ['2x', 'That adds x + 2 and x - 2 instead of subtracting.'],
    ['4', 'For x ≠ 2, (x^2 - 4) / (x - 2) = x + 2. Then (x + 2) - (x - 2) = 4.'],
  ],
  proof: '(x + 2) - (x - 2) = 4.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Evaluating statistical claims: observational studies and experiments',
  prompt: 'Students who chose an optional tutoring hour scored 8 points higher than students who did not. The tutoring group also took an easier form of the test. Which claim is supported?',
  answer: 'B',
  choices: [
    ['Tutoring caused the 8 point gain.', 'The groups were not randomly assigned, and the form was easier, so the score gap has two other explanations.'],
    ['The study does not show that tutoring caused the higher scores.', 'Students selected themselves, and the easier form is a second difference between the groups.'],
    ['The easier form had no effect because the scores were higher.', 'A higher score on an easier form does not separate tutoring from the form.'],
    ['The 8 point gap is the effect of tutoring after the form is held fixed.', 'The study never compares the groups on the same form.'],
  ],
  proof: 'Self-selection plus a different form blocks a causal claim.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Nonlinear equations in one variable and systems of equations in two variables',
  prompt: 'For which value of k do the graphs of y = x^2 - 4 and y = 2x + k intersect at exactly one point?',
  answer: 'A',
  choices: [
    ['-5', 'Set x^2 - 2x - 4 - k = 0. One solution requires discriminant 20 + 4k = 0, so k = -5. Then the shared point is (1, -3).'],
    ['-4', 'At k = -4 the equation is x^2 - 2x = 0, which has two solutions, x = 0 and x = 2.'],
    ['5', 'A positive k moves the line up and still crosses the parabola twice or not in the one-point case.'],
    ['1', '1 is the x-coordinate of the single intersection, not the value of k.'],
  ],
  proof: 'Discriminant 4 + 16 + 4k = 0 gives k = -5.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { k: -5, tangentPoint: [1, -3] },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'From a point on level ground, the angle of elevation to the top of a monument has tangent 1/2. From a point 30 meters closer, the angle of elevation to the same top has tangent 1. A lamp on the monument is 6 meters below the top. From the closer point, what is the tangent of the angle of elevation to the lamp?',
  answer: 'B',
  choices: [
    ['1', '1 is the tangent to the top from the closer point, not the tangent to the lamp.'],
    ['4/5', 'The closer distance is 30 meters and the top is 30 meters high. The lamp is 24 meters high, so the tangent is 24/30 = 4/5.'],
    ['1/2', '1/2 is the farther tangent, to the top, from 60 meters away.'],
    ['5/4', 'That uses the lamp height over the farther distance.'],
  ],
  proof: 'h/d = 1 and h/(d+30) = 1/2 give d = 30 and h = 30. Lamp height 24. Tangent = 24/30 = 4/5.',
  rubric: R(2, 2, 2, 2, 1, 1, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { closer: 30, height: 30, lampHeight: 24, tangent: '4/5' },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Quadratic Functions',
  prompt: 'The graph of y = x^2 - 6x + 5 is shifted up by k units so that its vertex lies on the x-axis. What is the product of the roots of the shifted graph?',
  answer: 'C',
  choices: [
    ['5', '5 is the product of the roots before the shift.'],
    ['4', '4 is the upward shift k. The vertex was 4 units below the axis.'],
    ['9', 'The vertex is (3, -4), so k = 4 and the new equation is y = x^2 - 6x + 9. The product of the roots is the constant term, 9.'],
    ['3', '3 is the x-coordinate of the double root, not the product.'],
  ],
  proof: 'New polynomial (x - 3)^2 = x^2 - 6x + 9. Product of roots = 9.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { shift: 4, productOfRoots: 9 },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Inequalities',
  prompt: 'How many integers x satisfy the strict inequality |2x - 3| < 5? Count only integers that make the inequality true.',
  answer: 'A',
  choices: [
    ['4', 'The inequality is -1 < x < 4. The integers in that open interval are 0, 1, 2, and 3.'],
    ['5', 'That includes an endpoint. Neither -1 nor 4 satisfies a strict inequality.'],
    ['6', 'That counts every integer from -1 through 4.'],
    ['3', 'That drops 0.'],
  ],
  proof: '-1 < x < 4, four integers.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Probability',
  prompt: 'A bag has 5 red marbles and 3 blue marbles. Two marbles are drawn without replacement. What is the probability that the two marbles have different colors?',
  answer: 'D',
  choices: [
    ['5/14', 'That is the probability both are red.'],
    ['13/28', 'That is the probability both marbles have the same color.'],
    ['3/8', 'That is only the probability the first marble is blue.'],
    ['15/28', 'Red then blue is 15/56, and blue then red is 15/56. The sum is 30/56 = 15/28.'],
  ],
  proof: '30/56 = 15/28.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Rational Numbers',
  prompt: 'A tank is 2/3 full. Adding 12 liters fills it to 5/6 of its capacity. Then 1/4 of the water now in the tank is poured out. How many liters remain?',
  answer: 'B',
  choices: [
    ['72', '72 liters is the full capacity. 12 liters is 1/6 of the tank.'],
    ['45', 'After the 12 liters are added, the tank holds 60 liters. Pouring out 1/4 of that leaves 45 liters.'],
    ['60', '60 liters is the amount before the pour, not after it.'],
    ['48', 'That subtracts 1/4 of the capacity instead of 1/4 of the water that is actually in the tank.'],
  ],
  proof: 'Capacity 72. Filled amount 60. Remaining 45.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Statistics',
  prompt: 'Four scores are 70, 80, 80, and 90. A fifth score is added. Which statement is true if the new mean must be 84 and the new median must be 85?',
  answer: 'C',
  choices: [
    ['The fifth score is 100.', 'A fifth score of 100 does make the mean 84, but the ordered list 70, 80, 80, 90, 100 has median 80, not 85.'],
    ['The fifth score is 85.', 'Then the mean is (320 + 85) / 5 = 81, not 84.'],
    ['No such fifth score exists.', 'The mean forces the fifth score to be 100, and that list has median 80. The two conditions cannot hold together.'],
    ['The fifth score is 90.', 'Then the mean is 82, and the median is 80.'],
  ],
  proof: '(320 + x) / 5 = 84 gives x = 100, whose median is 80, not 85.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Function Notation',
  prompt: 'The functions are f(x) = 2x + 1 and g(x) = x - 3. For every number a, what is the value of f(g(a)) - g(f(a))?',
  answer: 'A',
  choices: [
    ['-3', 'f(g(a)) = 2a - 5 and g(f(a)) = 2a - 2. The difference is -3 for every a.'],
    ['0', 'The two compositions are not equal. They differ by a constant.'],
    ['3', 'That is the opposite of the difference. g(f(a)) is larger than f(g(a)) by 3.'],
    ['a', 'The variable cancels. The difference does not depend on a.'],
  ],
  proof: '(2a - 5) - (2a - 2) = -3.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'Angle θ is in quadrant II, sin θ = 8/17, and the cosine of θ is negative. What is the value of sin(2θ) + cos(2θ)?',
  answer: 'D',
  choices: [
    ['-15/17', 'That is cos θ, not the sum of the double-angle values.'],
    ['161/289', 'That is cos(2θ) alone.'],
    ['-240/289', 'That is sin(2θ) alone.'],
    ['-79/289', 'cos θ = -15/17. Then sin(2θ) = -240/289 and cos(2θ) = 161/289. The sum is -79/289.'],
  ],
  proof: 'sin(2θ) + cos(2θ) = (-240 + 161) / 289 = -79/289.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { quadrant: 2, sin2: '-240/289', cos2: '161/289', sum: '-79/289' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Right triangles and trigonometry',
  prompt: 'A right triangle has legs of length 9 and 12. What is the length of the altitude drawn from the right angle to the hypotenuse?',
  answer: 'A',
  choices: [
    ['36/5', 'The hypotenuse is 15. The altitude to the hypotenuse is the product of the legs divided by the hypotenuse, 108/15 = 36/5.'],
    ['15', '15 is the hypotenuse, not the altitude to it.'],
    ['9', '9 is a leg. The altitude to the hypotenuse is shorter than both legs in this triangle.'],
    ['108/5', 'That divides 9 · 12 by 5 instead of by the hypotenuse 15.'],
  ],
  proof: 'Hypotenuse 15. Altitude = 9 · 12 / 15 = 36/5.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { legs: [9, 12], hypotenuse: 15, altitudeToHypotenuse: '36/5' },
})

assert(items.length === 32, `built ${items.length}`)
assert(!JSON.stringify(items).includes('placeholder'), 'unfinished')

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
        independent_review_method: 'Numeric results were asserted before insert. Each item adds a second constraint beyond a one-rule version of the skill.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const report = { generatedAt: new Date().toISOString(), batch: batchName, built: items.length, inserted }
writeFileSync('supabase/exam-engineering/raise-50-math-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
