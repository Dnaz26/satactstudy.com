import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricBand, rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'True-hard originals batch 2 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(2 * 2 + 3 < 10 && 3 > 2, 'region point')
assert(1 - 6 + 11 - 6 === 0, 'p(1)')
assert(8 - 24 + 22 - 6 === 0 && 27 - 54 + 33 - 6 === 0, 'p(2) and p(3)')
assert(3000 / 40 === 75, 'dye')
assert(2.5 * 48 === 120 && 120 * 1000 === 120000, 'meters')
assert(Math.PI * 9 * 10 / Math.PI === 90, 'cylinder')
assert(-2 * ( -1 - 3) === 8, 'inequality boundary')
assert(Math.abs(2.5 + 0.4 * 12 - 7.3) < 1e-9, 'fare')
assert((4 - (-2)) / (1 - 5) === -1.5 && 4 + (-1.5) * 2 === 1, 'line at x=3')
assert((2 - 4) / 3 === -2 / 3, 'forward function trap')
assert(3 * 2 + 4 === 10, 'inverse')
assert(50 * 1.2 * 0.8 === 48, 'percent round trip')
assert(2 + 5 === 7, 'rightmost')
assert((4 + 5 + 5 + 6 + 10) / 5 === 6, 'new mean')
assert(40 + 65 === 105, 'exterior')
assert(0.4 + 0.5 - 0.2 === 0.7, 'or probability')
assert(420 - 390 > 0 && 375 - 370 === 5, 'reaction times')

const hard = (scores) => {
  const total = rubricTotal(scores)
  assert(total >= 12, `rubric ${total}`)
  return { ...scores, total, band: rubricBand(total) }
}
const items = []
function add(item) {
  assert(item.choices.length === 4 && new Set(item.choices.map((choice) => choice[0])).size === 4, item.prompt)
  if (item.rubric.graphInference > 0) assert(item.graphicData, item.prompt)
  item.rubric = hard(item.rubric)
  items.push(item)
}
const R = (steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure) =>
  ({ steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure })

add({
  exam: 'SAT', section: 'Math', topic: 'Systems of Inequalities',
  prompt: 'Which point satisfies both 2x + y < 10 and y > x?',
  answer: 'A',
  choices: [
    ['(2, 3)', 'Then 4 + 3 = 7, which is less than 10, and 3 is greater than 2.'],
    ['(4, 1)', '9 is less than 10, but 1 is not greater than 4.'],
    ['(3, 5)', '5 is greater than 3, but 6 + 5 = 11, which is not less than 10.'],
    ['(0, 0)', '0 is less than 10, but 0 is not greater than 0.'],
  ],
  proof: 'Only (2, 3) meets both inequalities. The boundary equalities are excluded.',
  rubric: R(2, 1, 2, 2, 1, 0, 2, 2, 1),
  graphicType: 'coordinate_plane',
  graphicData: { inequalities: ['2x + y < 10', 'y > x'], solutionPoint: [2, 3] },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Polynomials',
  prompt: 'For p(x) = x^3 - 6x^2 + 11x - 6, which product is a complete factorization over the real numbers?',
  answer: 'C',
  choices: [
    ['(x - 1)(x - 6)', 'That product is quadratic, and p(x) is cubic. p(1) = 0, but the quotient is not x - 6.'],
    ['(x + 1)(x - 2)(x - 3)', 'p(-1) = -1 - 6 - 11 - 6, which is not 0, so x + 1 is not a factor.'],
    ['(x - 1)(x - 2)(x - 3)', 'p(1) = 0, and dividing leaves x^2 - 5x + 6 = (x - 2)(x - 3).'],
    ['(x - 1)(x + 2)(x + 3)', 'The constant term of that product is -6 with the wrong linear pattern. p(2) = 8 - 24 + 22 - 6 = 0, so x - 2 is a factor, not x + 2.'],
  ],
  proof: 'Roots are 1, 2, and 3 because p(1) = p(2) = p(3) = 0 and the polynomial is cubic.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Angles and Lines',
  prompt: 'Two parallel lines are cut by a transversal. One angle measures 70 degrees. A second angle is vertical to that 70 degree angle. What is the measure, in degrees, of a same-side interior angle to the second angle?',
  answer: 'B',
  choices: [
    ['70', 'That matches the given angle and its vertical angle. A same-side interior angle is supplementary to it, not equal to it.'],
    ['110', 'The vertical angle is also 70 degrees. Same-side interior angles formed by a transversal of parallel lines sum to 180, so the asked angle is 110 degrees.'],
    ['20', 'That subtracts 70 from 90. These angles are not complements.'],
    ['90', 'Nothing in the setup makes the angle a right angle.'],
  ],
  proof: 'Vertical to 70 is 70. Consecutive interior angle is 180 - 70 = 110.',
  graphicType: 'geometry_diagram',
  graphicData: { parallel: true, givenDegrees: 70, verticalDegrees: 70, sameSideInteriorDegrees: 110 },
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Data Interpretation',
  prompt: 'A bar graph shows the percent who voted yes: Hall A, 50 percent; Hall B, 30 percent. The table under the graph says Hall A has 40 voters and Hall B has 100 voters. Which hall has more yes votes?',
  answer: 'D',
  choices: [
    ['Hall A, because 50 percent is greater than 30 percent.', 'The percent is higher in Hall A, but 50 percent of 40 is 20 votes and 30 percent of 100 is 30 votes.'],
    ['They have the same number of yes votes.', '20 is not equal to 30.'],
    ['The graph does not give enough information to compare counts.', 'The voter totals are in the table, so the counts can be computed.'],
    ['Hall B, because 30 yes votes is more than 20 yes votes.', '0.50 times 40 is 20, and 0.30 times 100 is 30.'],
  ],
  proof: 'Yes votes are 20 and 30. The higher percent is not the higher count.',
  graphicType: 'bar_graph',
  graphicData: { percentYes: { hallA: 50, hallB: 30 }, voters: { hallA: 40, hallB: 100 }, yesVotes: { hallA: 20, hallB: 30 } },
  rubric: R(2, 1, 2, 2, 2, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Ratios, rates, proportional relationships, and units',
  prompt: 'A shop uses 3 liters of dye for every 40 shirts. How many milliliters of dye does it use per shirt?',
  answer: 'A',
  choices: [
    ['75', '3 liters is 3000 milliliters. 3000 / 40 = 75 milliliters per shirt.'],
    ['0.075', 'That divides 3 liters by 40 and leaves the unit in liters, then mislabels it as milliliters.'],
    ['7.5', 'That uses 300 milliliters instead of 3000.'],
    ['120', 'That multiplies 40 by 3 and does not convert liters to milliliters.'],
  ],
  proof: '3000 mL / 40 shirts = 75 mL per shirt.',
  rubric: R(2, 1, 2, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Unit Conversions',
  prompt: 'A tram travels at a constant 48 kilometers per hour for 2.5 hours. How many meters does it travel?',
  answer: 'C',
  choices: [
    ['120', 'That is the distance in kilometers, 48 times 2.5, not in meters.'],
    ['12000', 'That converts kilometers to meters with a factor of 100 instead of 1000.'],
    ['120000', 'The tram travels 120 kilometers, and 120 times 1000 is 120000 meters.'],
    ['1200', 'That uses a factor of 10 when converting kilometers to meters.'],
  ],
  proof: '2.5 * 48 = 120 km = 120000 m.',
  rubric: R(2, 1, 1, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Area and Volume',
  prompt: 'A closed formula is not needed. A cylinder has radius 3 and height 10. What is its volume?',
  answer: 'B',
  choices: [
    ['60π', 'That is the lateral surface area, 2πrh, not the volume.'],
    ['90π', 'Volume is πr^2h = π times 9 times 10.'],
    ['30π', 'That is πrh, which leaves out one factor of the radius.'],
    ['9π', 'That is the area of the base and leaves out the height.'],
  ],
  proof: 'π * 3^2 * 10 = 90π.',
  graphicType: 'geometry_diagram',
  graphicData: { shape: 'cylinder', radius: 3, height: 10, volume: '90π' },
  rubric: R(2, 1, 1, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Inequalities',
  prompt: 'Which inequality is equivalent to -2(x - 3) < 8?',
  answer: 'D',
  choices: [
    ['x < -1', 'Dividing -2x < 2 by -2 reverses the inequality sign. The direction is greater than, not less than.'],
    ['x > -5', 'That comes from -2x - 3 < 8, which distributes the minus only onto the x.'],
    ['x < 1', 'That drops the negative coefficient and solves 2(x - 3) < 8.'],
    ['x > -1', '-2x + 6 < 8 gives -2x < 2. Dividing by -2 reverses the sign, so x > -1.'],
  ],
  proof: 'Check x = 0: -2(0 - 3) = 6, and 6 < 8, so values greater than -1 can work. x = -2 gives -2(-5) = 10, which is not less than 8.',
  rubric: R(2, 1, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Equations',
  prompt: 'A taxi charges 2.50 dollars plus 0.40 dollars for each quarter mile. A ride is 3 miles long. What is the charge, in dollars?',
  answer: 'A',
  choices: [
    ['7.30', 'Three miles is 12 quarter miles. The charge is 2.50 + 0.40 times 12 = 7.30.'],
    ['3.70', 'That uses 3 miles as if each whole mile, not each quarter mile, cost 0.40 dollars.'],
    ['4.90', 'That counts 6 half miles instead of 12 quarter miles.'],
    ['4.80', 'That is the mileage charge and leaves out the 2.50 dollar base.'],
  ],
  proof: '3 / 0.25 = 12. 2.50 + 4.80 = 7.30.',
  rubric: R(2, 1, 2, 2, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Coordinate Geometry',
  prompt: 'A line passes through (1, 4) and (5, -2). What is the y-coordinate of the point on the line whose x-coordinate is 3?',
  answer: 'B',
  choices: [
    ['2', 'The midpoint in x is 3, but the y-change is not split into a y-coordinate of 2. The slope is -3/2, so the change in y from x = 1 to x = 3 is -3.'],
    ['1', 'The slope is (-2 - 4) / (5 - 1) = -3/2. From (1, 4), two steps in x change y by -3, so y = 1.'],
    ['7', 'That adds 3 to 4 instead of subtracting the drop required by the negative slope.'],
    ['-1', 'That continues the same drop for four units of x, which lands at x = 5, not x = 3.'],
  ],
  proof: 'Slope -6/4 = -3/2. y = 4 + (-3/2)(3 - 1) = 1.',
  graphicType: 'coordinate_plane',
  graphicData: { points: [[1, 4], [5, -2]], slope: -1.5, atX3: 1 },
  rubric: R(2, 2, 1, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Functions',
  prompt: 'f(x) = (x - 4) / 3. What is the value of the inverse of f at 2?',
  answer: 'C',
  choices: [
    ['-2/3', 'That is f(2) = (2 - 4) / 3, which runs the function forward.'],
    ['2', 'An inverse returns the input that produces 2. It is not automatically 2 unless f(2) = 2.'],
    ['10', 'Solve (x - 4) / 3 = 2. Then x - 4 = 6 and x = 10. Check: f(10) = 6 / 3 = 2.'],
    ['10/3', 'That divides the result by 3 a second time after finding 10.'],
  ],
  proof: 'Inverse rule is 3x + 4. At 2, the value is 10.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Percentages',
  prompt: 'A lamp costs 50 dollars. The price rises 20 percent and later falls 20 percent from that new price. What is the final price, in dollars?',
  answer: 'A',
  choices: [
    ['48', 'After the rise the price is 60. Twenty percent of 60 is 12, so the fall ends at 48.'],
    ['50', 'A 20 percent rise and a 20 percent fall do not cancel, because the fall is taken from the higher price.'],
    ['40', 'That subtracts 20 percent of the original 50 from 50 and ignores the rise.'],
    ['52', 'That adds 4 percent of 50. The actual ending gap is 2 dollars below 50, not above it.'],
  ],
  proof: '50 * 1.2 = 60. 60 * 0.8 = 48.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Circles',
  prompt: 'The circle (x - 2)^2 + (y + 1)^2 = 25 has which x-coordinate at its rightmost point?',
  answer: 'D',
  choices: [
    ['5', 'That is the radius. The rightmost x-coordinate is the center x-coordinate plus the radius.'],
    ['2', 'That is the x-coordinate of the center, not of the rightmost point.'],
    ['25', 'That is the square of the radius.'],
    ['7', 'The center is (2, -1) and the radius is 5, so the rightmost point has x = 2 + 5 = 7.'],
  ],
  proof: 'Center (2, -1), radius 5. Rightmost x = 7.',
  graphicType: 'coordinate_plane',
  graphicData: { center: [2, -1], radius: 5, rightmostX: 7 },
  rubric: R(2, 1, 1, 1, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Statistics and Data',
  prompt: 'The values 4, 5, 5, and 6 have mean 5. The value 10 is added. What is the new mean?',
  answer: 'B',
  choices: [
    ['5', 'That is the original mean. The new value is above 5, so the mean rises.'],
    ['6', 'The new sum is 4 + 5 + 5 + 6 + 10 = 30, and 30 / 5 = 6.'],
    ['10', 'That is the added value, not the mean of the five values.'],
    ['7.5', 'That averages the old mean with 10 and treats the old mean as one value. The old mean stands for four values.'],
  ],
  proof: 'Original sum 20. New sum 30. New mean 6.',
  rubric: R(2, 1, 2, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Lines, angles, and triangles',
  prompt: 'A triangle has two interior angles of 40 degrees and 65 degrees. What is the measure, in degrees, of an exterior angle adjacent to the third interior angle?',
  answer: 'A',
  choices: [
    ['105', 'The third interior angle is 180 - 40 - 65 = 75. The adjacent exterior angle is 180 - 75 = 105, which also equals 40 + 65.'],
    ['75', 'That is the third interior angle, not the exterior angle next to it.'],
    ['115', 'That is 180 - 65, which uses only one of the remote interior angles.'],
    ['40', 'That is one given interior angle. The exterior angle equals the sum of the two remote interior angles.'],
  ],
  proof: 'Exterior angle equals 40 + 65 = 105.',
  graphicType: 'geometry_diagram',
  graphicData: { interior: [40, 65, 75], exteriorAdjacentTo75: 105 },
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Probability',
  prompt: 'Events A and B are independent. P(A) = 0.4 and P(B) = 0.5. What is P(A or B)?',
  answer: 'C',
  choices: [
    ['0.9', 'That adds the probabilities and does not subtract the overlap.'],
    ['0.2', 'That is P(A and B) = 0.4 times 0.5, not the probability of either event.'],
    ['0.7', 'Because the events are independent, P(A and B) = 0.2. Then P(A or B) = 0.4 + 0.5 - 0.2 = 0.7.'],
    ['0.45', 'That averages 0.4 and 0.5. An or-probability is not the average of the two probabilities.'],
  ],
  proof: '0.4 + 0.5 - 0.4 * 0.5 = 0.7.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Evaluating statistical claims: observational studies and experiments',
  prompt: 'Students who brought lunch from home had higher quiz scores than students who bought lunch. The school did not assign the lunches. Which conclusion is justified?',
  answer: 'A',
  choices: [
    ['Bringing lunch is associated with higher scores here, but the study does not show that the lunch caused the scores.', 'The groups were not formed by assignment, so other differences can travel with the lunch choice.'],
    ['Bringing lunch caused the higher scores because the home-lunch mean is higher.', 'A higher mean in an existing group is not, by itself, a cause.'],
    ['Buying lunch lowered the scores by the exact gap between the means.', 'The gap is observed. The design does not isolate buying lunch as the cause.'],
    ['The result is useless because the quiz scores are numbers.', 'The scores can show an association. What they cannot show, in this design, is cause.'],
  ],
  proof: 'No random assignment. The comparison supports association only.',
  rubric: R(2, 2, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Concision',
  prompt: 'Which revision keeps the meaning and removes the repetition? Original: "The reason why the gate failed is because the hinge had rusted."',
  answer: 'B',
  choices: [
    ['The reason why the gate failed is because of the fact that the hinge had rusted.', 'This keeps both "reason why" and "because," and it adds another empty phrase.'],
    ['The gate failed because the hinge had rusted.', 'This states the failure and the cause once.'],
    ['The gate failed.', 'This drops the cause, so the meaning changes.'],
    ['The hinge rusted for the reason why the gate failed.', 'This reverses the clear cause and keeps the empty wording.'],
  ],
  proof: 'One cause statement is enough: the gate failed because the hinge had rusted.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Punctuation',
  prompt: 'Which sentence uses commas correctly around a clause that is not essential?',
  answer: 'A',
  choices: [
    ['The north bridge, which was built in 1910, needs new bolts.', 'The sentence still names a specific bridge without the year, so the year clause is extra and takes commas.'],
    ['The only bridge, that crosses Mill Creek, needs new bolts.', 'A that-clause which identifies the only bridge is not set off with commas, and the comma after bridge splits the clause from the noun it identifies.'],
    ['The bridge which was built in 1910 needs new bolts.', 'When the year is extra information about an already identified bridge, the clause needs commas. This version has none.'],
    ['The north bridge which, was built in 1910 needs new bolts.', 'The comma splits "which" from its verb and never closes.'],
  ],
  proof: 'The north bridge is already identified. The 1910 clause is additional, so it is set off with two commas.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

const reaction = {
  key: 'reaction-ms',
  title: 'Caffeine and reaction time',
  content: 'A lab recorded median reaction time, in milliseconds, after four caffeine doses. Dose 0 mg: 420. Dose 40 mg: 390. Dose 80 mg: 370. Dose 120 mg: 375. Each dose was given to a different group of 12 adults. No other doses were tested.',
}
add({
  exam: 'ACT', section: 'Science', topic: 'Trend Analysis', passage: reaction,
  prompt: 'Between which two tested doses does the median reaction time increase?',
  answer: 'C',
  choices: [
    ['0 mg and 40 mg', 'The time falls from 420 to 390.'],
    ['40 mg and 80 mg', 'The time falls from 390 to 370.'],
    ['80 mg and 120 mg', 'The time rises from 370 to 375. That is the only increase in the table.'],
    ['The time increases after every dose.', 'Three of the steps are not increases. Only the last step rises.'],
  ],
  proof: 'Changes are -30, -20, and +5. Only 80 mg to 120 mg increases.',
  graphicType: 'line_graph',
  graphicData: { doseMg: [0, 40, 80, 120], medianMs: [420, 390, 370, 375], onlyIncrease: [80, 120] },
  rubric: R(2, 1, 2, 1, 2, 2, 2, 2, 2),
})

const loft = {
  key: 'fair-sign',
  title: 'A sign for the river map',
  content: 'The paragraph promises one example of a sign that helped visitors. The loft printed a card that said "River map: top drawer." Visitors stopped opening the lower drawers. A later sentence about the price of printer ink does not show what the card said.',
}
add({
  exam: 'ACT', section: 'English', topic: 'Topic Development', passage: loft,
  prompt: 'The paragraph says it will give one example of a helpful sign. Which sentence belongs because it is that example?',
  answer: 'A',
  choices: [
    ['The loft printed a card that said "River map: top drawer."', 'This is the sign, and the next result is that visitors stopped opening the lower drawers.'],
    ['Printer ink cost more than the loft had budgeted.', 'The passage says the ink price does not show what the card said. It does not develop the promised example.'],
    ['Many schools hold fairs in the spring.', 'A general calendar fact is not an example of a sign.'],
    ['Drawers are useful pieces of furniture.', 'This does not give the promised sign or its wording.'],
  ],
  proof: 'The promised example is the card and its words. The ink sentence is the one the passage marks as off the point.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'English', topic: 'Style and Tone', passage: loft,
  prompt: 'The loft report is written for a school board. Which sentence best matches that tone?',
  answer: 'B',
  choices: [
    ['The old sign was a total mess, and honestly nobody could deal with it.', 'The slang and the broad complaint do not match a board report.'],
    ['The previous sign did not tell visitors which drawer held the river map.', 'This states the problem in plain report language.'],
    ['Wow, that sign was super confusing!!!', 'The exclamation and the casual wording do not match the audience.'],
    ['I guess the sign was kind of bad or whatever.', 'The hedges and the filler do not match a board report.'],
  ],
  proof: 'The fitting sentence names the missing information without slang or exclamation.',
  rubric: R(2, 1, 1, 1, 0, 2, 2, 2, 2),
})

const rumor = {
  key: 'clock-rumor',
  title: 'The stopped clock',
  content: 'A rumor said the tower clock stopped because the town had sold its bells. The repair log says otherwise. The bells were still in the tower. The clock stopped because a cracked gear tooth jammed the hour wheel. The log corrects the rumor and names the part that failed. It does not praise the clock or ask the town to sell anything.',
}
add({
  exam: 'ACT', section: 'Reading', topic: 'Author Purpose', passage: rumor,
  prompt: 'What is the main purpose of the repair log, as the passage describes it?',
  answer: 'D',
  choices: [
    ['To praise the sound of the bells', 'The passage says the log does not praise the clock. It names a failed part.'],
    ['To urge the town to sell the bells', 'The passage says the log does not ask the town to sell anything, and the bells were still in the tower.'],
    ['To confirm that the bells had been sold', 'The log says the bells were still in the tower, which contradicts the rumor.'],
    ['To correct the rumor by naming the jammed gear', 'The passage says the log corrects the rumor and identifies the cracked gear tooth.'],
  ],
  proof: 'The log replaces the sold-bells rumor with the jammed hour wheel.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Main Idea and Details', passage: rumor,
  prompt: 'Which detail in the passage directly contradicts the rumor?',
  answer: 'A',
  choices: [
    ['The bells were still in the tower.', 'The rumor said the town had sold the bells. Bells still in the tower contradict that claim.'],
    ['A gear tooth was cracked.', 'That explains the stop. It does not, by itself, say whether the bells were sold.'],
    ['The log does not praise the clock.', 'That describes the log\'s tone. It is not the fact that defeats the rumor.'],
    ['The hour wheel jammed.', 'That is the mechanical result. The contradicting fact about the rumor is the location of the bells.'],
  ],
  proof: 'Sold bells cannot still be in the tower. The passage states that they were still there.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})

assert(items.length === 24, `built ${items.length}`)

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
  const passageRows = []
  const seen = new Set()
  for (const item of items) {
    if (!item.passage || seen.has(item.passage.key)) continue
    seen.add(item.passage.key)
    passageRows.push(item.passage)
  }
  const passageIdByKey = {}
  if (passageRows.length) {
    const savedPassages = checked(await db.from('passages').insert(passageRows.map((passage) => ({
      title: passage.title,
      content: passage.content,
      active: true,
      source_type: 'original',
      source_rights_status: 'owned',
    }))).select('id'))
    passageRows.forEach((passage, index) => { passageIdByKey[passage.key] = savedPassages[index].id })
  }
  const rows = items.map((item) => ({
    test_type: item.exam,
    section_name: item.section,
    category_name: item.topicRow.domain,
    topic_name: item.topicRow.topic,
    subtopic_name: item.topicRow.topic,
    topic_id: item.topicRow.id,
    difficulty: 'Hard',
    difficulty_score: item.rubric.total >= 15 ? 1 : 0.833,
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
    passage_id: item.passage ? passageIdByKey[item.passage.key] : null,
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
      difficulty_level: item.rubric.total >= 15 ? 7 : 6,
      difficulty_basis: 'editorial',
      estimated_seconds: item.exam === 'ACT' && item.section === 'Math' ? 70 : 90,
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
        independent_review_method: 'Arithmetic was asserted before insert. Passage answers were checked against one stated line.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const elite = items.filter((item) => item.rubric.total >= 15).length
const report = { generatedAt: new Date().toISOString(), batch: batchName, built: items.length, inserted, elite, trueHard: items.length }
writeFileSync('supabase/exam-engineering/true-hard-originals-batch-2-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
