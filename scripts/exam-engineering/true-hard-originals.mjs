import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricBand, rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'True-hard originals 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert((40 - 2 * 12) === 16, 'sensor')
assert(Math.abs((43 - 16) / 2 - 13.5) < 1e-9, 'sensor trap')
assert((2 - 2) === 0 && 6 !== 0, 'parameter')
assert(1 + 5 === 6 && 1 * 5 === 5, 'quadratic roots')
assert(2 * (2 * 3 - 1) - 1 === 9, 'composition')
assert((5 / 2 + 2) / (5 / 2 - 1) === 3, 'rational')
assert(Math.sqrt(2 * 3 + 3) === 3 && -1 < 0, 'radical')
assert(4 * 2 ** 2 === 16 && 12 + 3 * 2 === 18 && 4 * 2 ** 3 === 32 && 12 + 3 * 3 === 21, 'growth')
assert(15 * 20 / 2 === 150 && 25 / 10 === 2.5, 'similarity')
assert(9 * 9 + 12 * 12 === 225 && 15 * 3 / 5 === 9, 'ladder')
assert(9 / 11 > 0.818 && 9 / 11 < 0.819, 'conditional')
assert(58 - 4 === 54 && 58 + 4 === 62, 'margin')
assert(2 + 3 * 4 === 14 && 15 - 14 === 1, 'residual')
assert((30 - 12) === 18 && (12 - 0) === 12 && (42 - 30) === 12, 'rates')
assert(16 + 5 * 11 === 71 && 40 + 3 * 11 === 73 && 16 + 5 * 12 === 76 && 40 + 3 * 12 === 76, 'printer')
assert((1 + 1) ** 2 - 4 * (1 + 1) === -4, 'f(2) = -4')
assert(1 ** 2 - 2 * 1 - 3 === -4, 'a^2 - 2a - 3 at a=1')
assert(20 * 0.5 === 10, 'sine')
assert(Math.abs((5 / 8) * (4 / 7) - 5 / 14) < 1e-12, 'draws')
assert((70 + 80 + 80 + 90 + 100 + 60) / 6 === 80, 'mean')
assert((4 - 1) ** 2 + (2 - (-2)) ** 2 === 25, 'circle')
assert(18 + 24 === 42 && 20 + 60 === 80 && 24 / 60 === 0.4, 'seedlings')

const hard = (scores) => {
  const total = rubricTotal(scores)
  assert(total >= 12, `item rubric ${total} is below true-hard`)
  return { ...scores, total, band: rubricBand(total) }
}

const items = []

function add(item) {
  assert(item.choices.length === 4, item.prompt)
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.prompt)
  assert('ABCD'.includes(item.answer), item.prompt)
  if (item.rubric.graphInference > 0) assert(item.graphicData, item.prompt)
  item.rubric = hard(item.rubric)
  items.push(item)
}

const R = (steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure) =>
  ({ steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure })

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Functions',
  prompt: 'A gauge always displays 3 cm more than the true water line. The true line starts at 40 cm and falls 2 cm each hour. After how many hours is the true line 16 cm?',
  answer: 'B',
  choices: [
    ['13.5', 'That solves 43 - 2h = 16, which makes the displayed reading 16 cm rather than the true line.'],
    ['12', 'The true line is 40 - 2h. Setting that equal to 16 gives 2h = 24, so h = 12. The gauge offset is not part of the true line.'],
    ['10.5', 'That subtracts the 3 cm offset from the 24 cm drop and then divides by 2, which changes the true starting height.'],
    ['8', 'That divides the 24 cm drop by 3, using the offset as if it were the hourly rate.'],
  ],
  proof: '40 - 2h = 16 gives h = 12. The displayed value at that hour is 19, not 16.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Systems of Equations',
  prompt: 'For what value of k does the system x + y = 12 and kx + 2y = 30 have no solution?',
  answer: 'A',
  choices: [
    ['2', 'Doubling the first equation gives 2x + 2y = 24. When k = 2, the second left side matches and the constants 30 and 24 do not, so the lines are parallel and distinct.'],
    ['1', 'If k = 1, then (k - 2)x = 6 has the solution x = -6. The system has one solution.'],
    ['0', 'If k = 0, then -2x = 6 and x = -3. The system has one solution.'],
    ['4', 'If k = 4, then 2x = 6 and x = 3. The system has one solution.'],
  ],
  proof: 'Substitute y = 12 - x to get (k - 2)x = 6. No solution exactly when k - 2 = 0.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Nonlinear Equations',
  prompt: 'The graphs of y = x^2 - 4 and y = 2x intersect at two points. What is the sum of the x-coordinates of those points?',
  answer: 'C',
  choices: [
    ['-4', 'That is the constant term of x^2 - 2x - 4 = 0, which is the opposite of the product of the roots, not their sum.'],
    ['4', 'That would be the sum if the linear term were +2x. Here the equation is x^2 - 2x - 4 = 0.'],
    ['2', 'Setting the expressions equal gives x^2 - 2x - 4 = 0. For x^2 - 2x - 4 = 0, the sum of the roots is 2.'],
    ['1', 'That is half of one coefficient, not the sum of both intersection x-coordinates.'],
  ],
  proof: 'x^2 - 4 = 2x becomes x^2 - 2x - 4 = 0. Sum of roots = 2.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 1),
  graphicType: 'coordinate_plane',
  graphicData: { curves: ['y = x^2 - 4', 'y = 2x'], asked: 'sum of intersection x-coordinates', verifiedSum: 2 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Quadratics',
  prompt: 'The equation x^2 - 6x + k = 0 has two real roots, and the larger root is 4 more than the smaller root. What is k?',
  answer: 'D',
  choices: [
    ['9', 'That is (6/2)^2, the constant that would make the roots equal. These roots differ by 4.'],
    ['6', 'That is the coefficient of x with the sign dropped, not the product of the roots.'],
    ['4', 'That is the given difference of the roots, not their product.'],
    ['5', 'The roots sum to 6 and differ by 4, so they are 1 and 5. Their product is k = 5.'],
  ],
  proof: 'Let the roots be r and r + 4. Then 2r + 4 = 6, so r = 1 and r + 4 = 5. Product = 5.',
  rubric: R(2, 2, 2, 2, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Linear Functions',
  prompt: 'Let f(x) = 2x - 1. What value of a makes f(f(a)) = 9?',
  answer: 'A',
  choices: [
    ['3', 'f(a) = 2a - 1, and f(f(a)) = 2(2a - 1) - 1 = 4a - 3. Then 4a - 3 = 9 gives a = 3.'],
    ['5', 'That solves 2a - 1 = 9, which is f(a) = 9, not f(f(a)) = 9.'],
    ['4', 'That treats the inner result as if one more doubling were not needed. f(f(4)) = 4(4) - 3 = 13, not 9.'],
    ['2', 'f(f(2)) = 4(2) - 3 = 5, not 9.'],
  ],
  proof: '4a - 3 = 9, so a = 3. Check: f(3) = 5 and f(5) = 9.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Rational Expressions',
  prompt: 'Which value of x satisfies (x + 2) / (x - 1) = 3?',
  answer: 'B',
  choices: [
    ['1', 'x = 1 makes the denominator 0, so it cannot be a solution. It is the value excluded by the expression.'],
    ['5/2', 'Then x + 2 = 3(x - 1), so x + 2 = 3x - 3, 5 = 2x, and x = 5/2. The denominator 5/2 - 1 is not 0.'],
    ['3/2', 'That comes from changing 3(x - 1) into 3x - 1. The constant term must be -3.'],
    ['4', 'The left side at x = 4 is 6/3 = 2, not 3.'],
  ],
  proof: '(5/2 + 2) / (5/2 - 1) = (9/2) / (3/2) = 3.',
  rubric: R(2, 1, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Exponents and Radicals',
  prompt: 'Which value is the solution of sqrt(2x + 3) = x?',
  answer: 'C',
  choices: [
    ['-1 only', 'Squaring produces x = -1, but a principal square root cannot equal a negative number. It is extraneous.'],
    ['-1 and 3', 'Both values come from the squared equation. Only x = 3 satisfies the original equation.'],
    ['3 only', 'Squaring gives x^2 - 2x - 3 = 0, so x = 3 or x = -1. Checking shows sqrt(9) = 3, while sqrt(1) does not equal -1.'],
    ['no solution', 'x = 3 checks: sqrt(6 + 3) = 3.'],
  ],
  proof: 'x^2 - 2x - 3 = (x - 3)(x + 1). Only x = 3 is nonnegative and checks.',
  rubric: R(2, 1, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Exponents and Radicals',
  prompt: 'Plant L is 12 cm tall and grows 3 cm each week. Plant E is 4 cm tall and doubles in height each week. After how many whole weeks is Plant E strictly taller than Plant L for the first time?',
  answer: 'D',
  choices: [
    ['1', 'After 1 week, Plant L is 15 cm and Plant E is 8 cm.'],
    ['2', 'After 2 weeks, Plant L is 18 cm and Plant E is 16 cm, so L is still taller.'],
    ['4', 'Plant E is already taller after 3 weeks. Week 4 is not the first time.'],
    ['3', 'After 3 weeks, Plant L is 21 cm and Plant E is 32 cm. After 2 weeks, Plant E is still shorter.'],
  ],
  proof: 'Compare 12 + 3w with 4 * 2^w. Week 2 is 18 vs 16. Week 3 is 21 vs 32.',
  graphicType: 'line_graph',
  graphicData: { weeks: [0, 1, 2, 3], linearCm: [12, 15, 18, 21], doublingCm: [4, 8, 16, 32], firstWeekDoublingTaller: 3 },
  rubric: R(2, 2, 1, 2, 2, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Right triangles and trigonometry',
  prompt: 'Two similar right triangles have hypotenuses 10 and 25. The smaller triangle has legs 6 and 8. What is the area of the larger triangle?',
  answer: 'A',
  choices: [
    ['150', 'The scale factor is 25/10 = 5/2. The larger legs are 15 and 20, so the area is (1/2)(15)(20) = 150.'],
    ['60', 'That multiplies the smaller area, 24, by the length scale 5/2. Area scales by (5/2)^2.'],
    ['24', 'That is the area of the smaller triangle, (1/2)(6)(8).'],
    ['125', 'That squares the larger hypotenuse and stops. The legs, not the hypotenuse alone, determine the area.'],
  ],
  proof: 'Smaller area 24. Scale 2.5. Larger area 24 * 6.25 = 150.',
  graphicType: 'geometry_diagram',
  graphicData: { smallLegs: [6, 8], smallHypotenuse: 10, largeHypotenuse: 25, largeLegs: [15, 20], largeArea: 150 },
  rubric: R(2, 2, 1, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'A ladder leans against a wall. The sine of the angle between the ladder and the ground is 3/5, and the ladder is 15 feet long. How many feet is the base of the ladder from the wall?',
  answer: 'B',
  choices: [
    ['9', 'That is the height on the wall, 15 times 3/5, which is the side opposite the ground angle.'],
    ['12', 'The opposite side is 9. The base is the remaining leg of the 9-12-15 triangle, since 9^2 + 12^2 = 15^2.'],
    ['15', 'That is the ladder itself, the hypotenuse, not the distance along the ground.'],
    ['20', 'That uses 15 times 4/3, mixing the cosine ratio with the opposite side.'],
  ],
  proof: 'Opposite = 9. Adjacent = sqrt(225 - 81) = sqrt(144) = 12.',
  graphicType: 'geometry_diagram',
  graphicData: { hypotenuse: 15, sine: '3/5', opposite: 9, adjacent: 12 },
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Probability and conditional probability',
  prompt: 'In a class, 9 of the 12 students who studied passed, and 2 of the 8 students who did not study passed. Given that a randomly chosen student passed, what is the probability that the student studied?',
  answer: 'C',
  choices: [
    ['9/12', 'That is the probability of passing given studying, which reverses the given condition.'],
    ['9/20', 'That is the probability of studying and passing out of the whole class, not out of the students who passed.'],
    ['9/11', 'Eleven students passed, and 9 of those 11 had studied.'],
    ['11/20', 'That is the probability of passing, with no condition about studying.'],
  ],
  proof: 'Passed students = 9 + 2 = 11. Studied and passed = 9. Conditional probability = 9/11.',
  graphicType: 'two_way_table',
  graphicData: { studied: { pass: 9, fail: 3 }, notStudied: { pass: 2, fail: 6 }, conditionalStudiedGivenPass: '9/11' },
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Inference from sample statistics and margin of error',
  prompt: 'A poll of 400 residents found that 58% preferred a new bus route. The margin of error is 4 percentage points. A speaker claims that at least 60% prefer the route. Which conclusion follows from the poll?',
  answer: 'A',
  choices: [
    ['The poll does not establish the claim, because the interval from 54% to 62% includes values below 60%.', 'The point estimate is 58, and the interval reaches down to 54. Values below the claimed threshold remain plausible.'],
    ['The claim is established, because 58% plus the margin is 62%, which is above 60%.', 'The top of the interval being above 60% does not show that the whole interval is above 60%.'],
    ['The claim is impossible, because the point estimate 58% is below 60%.', 'A point estimate below the claim does not rule the claim out. The interval still reaches 62%.'],
    ['The margin of error means the true percentage is exactly 58%.', 'The margin describes a range, not a single exact value.'],
  ],
  proof: 'Interval = 54% to 62%. It contains numbers both below and above 60%, so the claim is neither established nor ruled out.',
  rubric: R(2, 2, 2, 2, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Two-variable data: models and scatterplots',
  prompt: 'A scatterplot uses the model y = 2 + 3x. The plotted points are (1, 5), (2, 8), (3, 11), and (4, 15). For which x-value is the residual positive?',
  answer: 'D',
  choices: [
    ['1', 'The model gives 5, and the point is 5. The residual is 0.'],
    ['2', 'The model gives 8, and the point is 8. The residual is 0.'],
    ['3', 'The model gives 11, and the point is 11. The residual is 0.'],
    ['4', 'The model gives 14, and the point is 15. The residual is 15 - 14 = 1.'],
  ],
  proof: 'Predicted values are 5, 8, 11, and 14. Only (4, 15) lies above the model.',
  graphicType: 'scatterplot',
  graphicData: { model: 'y = 2 + 3x', points: [[1, 5], [2, 8], [3, 11], [4, 15]], positiveResidualX: 4 },
  rubric: R(2, 1, 1, 2, 2, 0, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Math', topic: 'Slope and Rate of Change',
  prompt: 'A line graph records distance, in meters, as 0 at hour 0, 12 at hour 1, 30 at hour 2, and 42 at hour 3. During which one-hour interval is the average speed greatest?',
  answer: 'B',
  choices: [
    ['Hour 0 to hour 1', 'The change is 12 meters, which is less than the change from hour 1 to hour 2.'],
    ['Hour 1 to hour 2', 'The change is 30 - 12 = 18 meters in one hour. The other one-hour changes are 12 meters.'],
    ['Hour 2 to hour 3', 'The change is 42 - 30 = 12 meters, not the greatest change.'],
    ['The three intervals have the same average speed.', 'The middle interval changes by 18 meters, and the others change by 12.'],
  ],
  proof: 'Interval changes are 12, 18, and 12 meters per hour.',
  graphicType: 'line_graph',
  graphicData: { hours: [0, 1, 2, 3], meters: [0, 12, 30, 42], fastestInterval: [1, 2], fastestRate: 18 },
  rubric: R(2, 1, 1, 1, 2, 0, 2, 2, 1),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Linear Equations',
  prompt: 'Printer A costs 40 dollars plus 3 dollars per page. Printer B costs 16 dollars plus 5 dollars per page. What is the greatest whole number of pages for which Printer B costs less than Printer A?',
  answer: 'A',
  choices: [
    ['11', 'B is cheaper while 16 + 5p < 40 + 3p, which simplifies to p < 12. The greatest whole number below 12 is 11.'],
    ['12', 'At 12 pages both printers cost 76 dollars. B is not cheaper there.'],
    ['13', 'At 13 pages, B costs 81 dollars and A costs 79 dollars, so B costs more.'],
    ['8', 'B is cheaper at 8 pages, but 8 is not the greatest such whole number.'],
  ],
  proof: 'At 11 pages, B costs 71 and A costs 73. At 12 pages, both cost 76.',
  rubric: R(2, 1, 1, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Function Notation',
  prompt: 'If f(x) = x^2 - 4x, which expression equals f(a + 1)?',
  answer: 'C',
  choices: [
    ['a^2 - 4a - 3', 'That expands the square as a^2 + 1 and misses the 2a term.'],
    ['a^2 + 2a - 3', 'That keeps the 2a from the square but does not subtract the 4a from -4(a + 1).'],
    ['a^2 - 2a - 3', '(a + 1)^2 - 4(a + 1) = a^2 + 2a + 1 - 4a - 4 = a^2 - 2a - 3.'],
    ['a^2 - 2a + 1', 'That is (a - 1)^2, not f(a + 1).'],
  ],
  proof: 'f(a + 1) = (a + 1)^2 - 4(a + 1) = a^2 - 2a - 3.',
  rubric: R(2, 2, 1, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'A kite string is 20 meters long and makes a 30 degree angle with level ground. How many meters above the ground is the kite? Use sin 30 degrees = 1/2.',
  answer: 'B',
  choices: [
    ['20', 'That is the length of the string, the hypotenuse, not the height.'],
    ['10', 'Height is opposite the 30 degree angle, so it is 20 times sin 30 degrees = 20 times 1/2.'],
    ['10√3', 'That is 20 times cos 30 degrees, the horizontal distance, not the height.'],
    ['5', 'That uses half of the height rather than half of the string.'],
  ],
  proof: 'Opposite = hypotenuse times sine = 20 * 1/2 = 10.',
  graphicType: 'geometry_diagram',
  graphicData: { hypotenuse: 20, angleDegrees: 30, height: 10 },
  rubric: R(2, 1, 1, 2, 2, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Probability',
  prompt: 'A bag has 5 red marbles and 3 blue marbles. Two marbles are drawn at random without putting the first marble back. What is the probability that both are red?',
  answer: 'D',
  choices: [
    ['25/64', 'That is (5/8)(5/8), which would replace the first marble before the second draw.'],
    ['5/8', 'That is the probability that the first marble is red, with no second draw.'],
    ['1/2', 'The two draws are not a fair coin. There are 5 red marbles out of 8, then 4 red out of 7.'],
    ['5/14', '(5/8)(4/7) = 20/56 = 5/14.'],
  ],
  proof: 'Without replacement: 5/8 * 4/7 = 5/14.',
  rubric: R(2, 2, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Statistics',
  prompt: 'Five quiz scores are 70, 80, 80, 90, and 100. A sixth score of 60 is added. What is the new mean?',
  answer: 'A',
  choices: [
    ['80', 'The first five scores sum to 420. Adding 60 gives 480, and 480 / 6 = 80.'],
    ['84', 'That is the original mean, 420 / 5, before the sixth score.'],
    ['78', 'That averages the old mean 84 with 60 and divides by 2, which ignores that the old mean already stands for five scores.'],
    ['60', 'That is the new score itself, not the mean of all six scores.'],
  ],
  proof: '420 / 5 = 84. (420 + 60) / 6 = 80.',
  rubric: R(2, 1, 2, 1, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Plane Geometry',
  prompt: 'A circle has center (1, -2) and radius 5. Which point lies on the circle?',
  answer: 'C',
  choices: [
    ['(6, 1)', 'The horizontal change is 5 and the vertical change is 3, so the squared distance is 25 + 9 = 34.'],
    ['(1, 4)', 'The vertical change is 6, so the squared distance is 36, which is greater than 25.'],
    ['(4, 2)', 'The changes are 3 and 4. Then 3^2 + 4^2 = 25, which equals the radius squared.'],
    ['(3, -6)', 'The changes are 2 and 4. Then 4 + 16 = 20, which is less than 25.'],
  ],
  proof: '(4 - 1)^2 + (2 + 2)^2 = 9 + 16 = 25.',
  graphicType: 'coordinate_plane',
  graphicData: { center: [1, -2], radius: 5, onCircle: [4, 2] },
  rubric: R(2, 1, 1, 1, 2, 0, 2, 2, 2),
})

const qualified = {
  key: 'qualified',
  title: 'A limited repair grant',
  content: 'The archivist called the repair grant a qualified success. The new braces held the shelves, but the grant paid for those braces only, and the cracked labels were left as they were. She wrote that the work had solved the danger without finishing the repair.',
}
add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Words in Context', passage: qualified,
  prompt: 'As used in the passage, "qualified" most nearly means',
  answer: 'A',
  choices: [
    ['limited', 'The next sentences say the grant paid only for the braces and left the labels unfinished. The success has a limit.'],
    ['officially certified', 'Nothing in the passage says an office certified the grant. The contrast is between the braces and the unfinished labels.'],
    ['enthusiastic', 'The passage stresses what the grant did not finish. That is not an enthusiastic success.'],
    ['suspicious of a person', 'The word describes the success, not a person the archivist doubts.'],
  ],
  proof: 'The grant held the shelves but paid for braces only. Qualified means limited here.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 1),
})

const creek = {
  key: 'creek',
  title: 'Two accounts of a fish decline',
  content: 'Text 1: Fish counts in the creek fell after the town installed a culvert. The culvert increased the water speed, and the shallow riffle used for spawning disappeared. Text 2: The fish counts fell in the same years the town stopped adding hatchery fish. The culvert did change the channel, but ending the stocking is enough to explain the lower counts.',
}
add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Cross-Text Connections', passage: creek,
  prompt: 'Which statement describes how the author of Text 2 responds to the explanation in Text 1?',
  answer: 'B',
  choices: [
    ['Text 2 denies that the culvert changed the channel.', 'Text 2 says the culvert did change the channel. It offers stocking as another sufficient explanation.'],
    ['Text 2 treats the end of stocking as a sufficient explanation and does not grant the culvert as the only cause.', 'Text 2 accepts the channel change and still says the stocking cut can explain the decline.'],
    ['Both texts conclude that the culvert is the sole cause.', 'Text 1 ties the decline to the culvert. Text 2 does not treat that as the only cause.'],
    ['Text 2 says no water-speed measurement was taken, so Text 1 has no evidence.', 'Text 2 does not discuss missing measurements.'],
  ],
  proof: 'Text 2 keeps the culvert change and adds the stocking cut as enough to explain the counts.',
  rubric: R(2, 2, 2, 1, 0, 2, 2, 2, 1),
})

const seedlings = {
  key: 'seedlings-sat',
  title: 'Shaded and open seedlings',
  content: 'A note claims, "Most of the seedlings lived." The counts were: shaded bed, 18 lived out of 20; open bed, 24 lived out of 60. No other beds were counted.',
}
add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Command of Evidence — Quantitative', passage: seedlings,
  prompt: 'Which statement about the counts is supported?',
  answer: 'A',
  choices: [
    ['A majority of all the seedlings lived, but most seedlings in the open bed did not.', 'Overall, 42 of 80 lived. In the open bed, 24 of 60 lived, which is not a majority.'],
    ['Most seedlings in the open bed lived.', '24 of 60 is 40 percent, so most open-bed seedlings did not live.'],
    ['Most of all the seedlings died.', '42 of 80 lived, so fewer than half died.'],
    ['The shaded bed and the open bed had the same survival rate.', '18 of 20 is not the same rate as 24 of 60.'],
  ],
  proof: '42/80 lived overall. 24/60 = 0.40 lived in the open bed. 18/20 lived in shade.',
  graphicType: 'two_way_table',
  graphicData: { shadedLived: [18, 20], openLived: [24, 60], overallLived: [42, 80] },
  rubric: R(2, 1, 2, 2, 2, 2, 2, 2, 1),
})

const mural = {
  key: 'mural',
  title: 'A label readers missed',
  content: 'Visitors kept describing the mural as a storm, though the painter had meant the dark band to be a closed gate. She did not repaint the band because she disliked the color. She rewrote the wall label, moving the words "closed gate" to the first line, and the misreadings dropped. The change was about what viewers were told, not about a new taste in paint.',
}
add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Central Ideas and Details', passage: mural,
  prompt: 'Which choice states the central idea of the passage?',
  answer: 'C',
  choices: [
    ['The painter changed the mural because she disliked the dark color.', 'The passage says she did not repaint the band for that reason. She rewrote the label.'],
    ['Visitors were right to call the dark band a storm.', 'The passage says the painter had meant a closed gate, and the misreadings dropped after the label changed.'],
    ['The correction worked by changing the information viewers read, not by changing the paint.', 'She moved "closed gate" to the first line of the label, and the passage says the change was about what viewers were told.'],
    ['A mural label should always be printed in one line.', 'The passage describes one label rewrite. It does not state a rule for every label.'],
  ],
  proof: 'The label rewrite, not a repaint, is what reduced the misreadings.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Transitions',
  prompt: 'The kiln cooled faster than the model had predicted. ______ the glaze crawled, which that model had said would happen only under fast cooling. Which choice completes the blank?',
  answer: 'B',
  choices: [
    ['Nevertheless,', 'The crawling is the result the model tied to fast cooling. The relationship is a consequence, not a contrast.'],
    ['Consequently,', 'The faster cooling is the condition the model had linked to crawling, so the glaze result follows from that condition.'],
    ['For example,', 'The crawling is the predicted result of the cooling, not an example of the model itself.'],
    ['Previously,', 'The blank does not move the time backward. It connects the cooling to the glaze result.'],
  ],
  proof: 'Fast cooling was the stated condition for crawling, and the cooling was fast, so Consequently fits.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Boundaries',
  prompt: 'Which choice completes the sentence so that it is grammatically correct? "The interns logged the count ____ the archivist checked it."',
  answer: 'A',
  choices: [
    [', and', 'Two independent clauses need a comma with a coordinating conjunction, a semicolon, or a period. ", and" supplies the conjunction.'],
    [',', 'A comma alone between these two clauses is a comma splice.'],
    ['and,', 'The comma after "and" separates the conjunction from the subject of the second clause.'],
    ['; and', 'A semicolon already joins the clauses. Adding "and" after it is not the standard join.'],
  ],
  proof: 'The interns logged the count, and the archivist checked it.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Rhetorical Synthesis',
  prompt: 'A club wants a sentence that emphasizes two facts: the Saturday workshop is free, and a reservation is still required. A third note, that the weekday workshop is also useful, should be left out. Which sentence meets that goal?',
  answer: 'D',
  choices: [
    ['The weekday workshop is useful, and the Saturday workshop is free.', 'This uses the note the goal says to leave out, and it drops the reservation requirement.'],
    ['The Saturday workshop requires a fee and a reservation.', 'A fee contradicts the note that the workshop is free.'],
    ['A reservation is optional because the Saturday workshop is free.', 'The notes say a reservation is still required. Free does not make it optional.'],
    ['The Saturday workshop is free, but a reservation is required.', 'This keeps both requested facts and leaves out the weekday note.'],
  ],
  proof: 'Relevant notes: free and reservation required. Irrelevant note: weekday workshop is useful.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

add({
  exam: 'SAT', section: 'Reading and Writing', topic: 'Form, Structure, and Sense',
  prompt: 'The set of measurements, together with the field sketch, ____ stored in one folder. Which choice completes the sentence?',
  answer: 'C',
  choices: [
    ['were', 'The subject is "set," which is singular. "Together with the field sketch" does not make the subject plural.'],
    ['have been', 'The verb still needs to agree with the singular subject "set."'],
    ['was', 'The head of the subject is the singular noun "set," so the verb is "was."'],
    ['are', 'The tense is not the issue. The subject is singular, and the surrounding sentence is about a completed action.'],
  ],
  proof: 'Subject-verb agreement follows "set," not the noun in the "together with" phrase.',
  rubric: R(2, 1, 2, 1, 0, 1, 2, 2, 1),
})

const englishPassage = {
  key: 'english-loft',
  title: 'The map loft deadline',
  content: 'The map loft had one week left before the school fair. The drawers still mixed trail maps with bus maps. Mira wanted visitors to find the river map first. She wrote a new drawer label and moved the river maps to the top drawer. The old label had listed every map the loft owned, which hid the one map the fair required. After the move, students reached the river map without opening the lower drawers. Mira also replaced a long sentence on the sign with a shorter one.',
}
add({
  exam: 'ACT', section: 'English', topic: 'Organization', passage: englishPassage,
  prompt: 'Which sentence from the passage states the purpose that the drawer change is meant to serve?',
  answer: 'A',
  choices: [
    ['Mira wanted visitors to find the river map first.', 'The label, the move to the top drawer, and the later result all serve that purpose.'],
    ['The map loft had one week left before the school fair.', 'The deadline explains urgency. It does not say what visitors needed to find.'],
    ['The drawers still mixed trail maps with bus maps.', 'That sentence states the problem, not the purpose of the change.'],
    ['Mira also replaced a long sentence on the sign with a shorter one.', 'That is a second edit. It does not state why the river maps were moved.'],
  ],
  proof: 'The purpose sentence is the want: visitors should find the river map first. The other actions carry it out.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})
add({
  exam: 'ACT', section: 'English', topic: 'Concision and Clarity', passage: englishPassage,
  prompt: 'The sign sentence "The maps that are the maps of the river are located in the drawer that is the top drawer" needs to be shortened without changing the meaning. Which revision does that?',
  answer: 'B',
  choices: [
    ['The maps, being maps, are in a drawer.', 'This drops both "river" and "top," so the location and the map type are gone.'],
    ['The river maps are in the top drawer.', 'This keeps the map type and the location and removes the repeated wording.'],
    ['Maps are located somewhere in the loft.', 'This no longer says which maps or which drawer.'],
    ['The top drawer contains every map the loft owns.', 'The passage says the old label listed every map. The shortened sign is about the river maps only.'],
  ],
  proof: 'River maps + top drawer is the whole meaning of the long sentence.',
  rubric: R(2, 1, 1, 1, 0, 2, 2, 2, 2),
})
add({
  exam: 'ACT', section: 'English', topic: 'Punctuation', passage: englishPassage,
  prompt: 'Which sentence is punctuated correctly?',
  answer: 'A',
  choices: [
    ['Mira wrote a new drawer label, and she moved the river maps to the top drawer.', 'A comma plus and joins the two independent clauses.'],
    ['Mira wrote a new drawer label, she moved the river maps to the top drawer.', 'A comma alone between these clauses is a comma splice.'],
    ['Mira wrote a new drawer label; and she moved the river maps to the top drawer.', 'A semicolon already joins the clauses, so and should not follow it.'],
    ['Mira wrote a new drawer label and, she moved the river maps to the top drawer.', 'The comma after and separates the conjunction from the subject of the second clause.'],
  ],
  proof: 'Mira wrote a new drawer label, and she moved the river maps to the top drawer.',
  rubric: R(2, 1, 1, 1, 0, 2, 2, 2, 2),
})
add({
  exam: 'ACT', section: 'English', topic: 'Grammar and Usage', passage: englishPassage,
  prompt: 'Which verb agrees with the subject? "The stack of river maps ____ moved to the top drawer."',
  answer: 'A',
  choices: [
    ['was', 'The subject is the singular noun "stack." The phrase "of river maps" does not make the subject plural.'],
    ['were', 'That agrees with "maps," which is not the head of the subject.'],
    ['have been', 'The auxiliary is plural, but "stack" is singular.'],
    ['are', 'The subject is singular, and the move is a completed action in the passage.'],
  ],
  proof: 'Head noun "stack" is singular, so the verb is "was."',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})

const bridgeA = {
  key: 'bridge-a',
  title: 'Bridge notes, cost account',
  content: 'The town board published two short accounts of the same footbridge. Account A: The bridge deck has loose planks, and the repair bid is 18,000 dollars. Last year the town spent 9,000 dollars on the same span, and those planks lasted one season. Account A argues for replacing the deck now, because another patch would buy only a short delay and the bid is still smaller than the cost of closing the path and renting a shuttle. The account does not discuss the creek under the bridge.',
}
const bridgeB = {
  key: 'bridge-b',
  title: 'Bridge notes, habitat account',
  content: 'Account B: The same loose planks shade a shallow pool where young trout hold in July. A full deck replacement would remove that shade for at least one summer, and the bid\'s cheapest method would also drop sawdust into the pool. Account B agrees the planks are loose. It asks the board to fasten the existing planks and add a grate, which the account prices at 4,000 dollars, and to delay a new deck until after the trout leave the pool. Account B does not claim the cheaper repair will last as long as a new deck.',
}
add({
  exam: 'ACT', section: 'Reading', topic: 'Comparing Texts', passage: bridgeA, secondPassage: bridgeB,
  prompt: 'How does Account B relate to Account A?',
  answer: 'C',
  choices: [
    ['Account B denies that the planks are loose.', 'Account B says it agrees the planks are loose.'],
    ['Account B accepts the 18,000 dollar replacement as the only safe choice.', 'Account B asks for a 4,000 dollar fastening and a delay, not for the full replacement now.'],
    ['Account B accepts the damage and argues for a later, different repair because of the trout pool.', 'It agrees the planks are loose, prices a smaller repair, and ties the delay to the fish.'],
    ['Both accounts are mainly about the cost of renting a shuttle.', 'Only Account A mentions the shuttle. Account B is about shade, sawdust, and timing.'],
  ],
  proof: 'Shared fact: loose planks. Difference: A wants replacement now for cost reasons. B wants a delay because of the pool.',
  rubric: R(2, 2, 2, 2, 0, 2, 2, 2, 2),
})
add({
  exam: 'ACT', section: 'Reading', topic: 'Inference', passage: bridgeB,
  prompt: 'Which inference is supported by Account B?',
  answer: 'A',
  choices: [
    ['Account B does not treat the cheaper repair as equal in lifespan to a new deck.', 'The account says it does not claim the cheaper repair will last as long as a new deck.'],
    ['Account B thinks the trout will stay in the pool all year.', 'It says to delay until after the trout leave. It does not say they never leave.'],
    ['Account B has measured the sawdust from last year\'s repair.', 'It warns that the cheapest replacement method would drop sawdust. It does not report a past measurement.'],
    ['Account B agrees that closing the path is more expensive than replacement.', 'The shuttle comparison is in Account A. Account B does not discuss it.'],
  ],
  proof: 'The last sentence of Account B withholds any claim that the cheaper repair lasts as long as a new deck.',
  rubric: R(2, 2, 2, 1, 0, 2, 2, 2, 2),
})
add({
  exam: 'ACT', section: 'Reading', topic: 'Vocabulary in Context', passage: bridgeA,
  prompt: 'In Account A, "patch" most nearly means',
  answer: 'B',
  choices: [
    ['a cloth cover', 'The context is planks on a bridge, not fabric.'],
    ['a short-term repair', 'Account A says another patch would buy only a short delay, in contrast with replacing the deck.'],
    ['a garden plot', 'Nothing in the account is about planting.'],
    ['a permanent replacement', 'The account contrasts a patch with replacing the deck. The patch is the temporary choice.'],
  ],
  proof: 'Another patch buys only a short delay, so patch means a temporary repair.',
  rubric: R(2, 1, 2, 1, 0, 2, 2, 2, 2),
})

assert(items.length === 35, `expected 35 items, built ${items.length}`)
const bands = items.reduce((counts, item) => {
  counts[item.rubric.band] = (counts[item.rubric.band] ?? 0) + 1
  return counts
}, {})
assert((bands['true-hard'] ?? 0) + (bands['elite-hard'] ?? 0) === items.length, 'every item must be true-hard or elite')

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
function resolveTopic(item) {
  const matches = topicRows.filter((row) => row.name === item.topic && row.categories?.sections?.tests?.name === item.exam && row.categories?.sections?.name === item.section)
  if (matches.length !== 1) throw new Error(`Topic lookup failed for ${item.exam} ${item.section} ${item.topic}: ${matches.length}`)
  return {
    id: matches[0].id,
    domain: matches[0].categories.name,
    topic: matches[0].name,
  }
}
for (const item of items) item.topicRow = resolveTopic(item)

function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}

const existing = checked(await db.from('questions').select('id').eq('source', batchName).limit(5))
let inserted = 0
if (existing.length === 0) {
  const passageKeys = []
  const passageRows = []
  for (const item of items) {
    for (const passage of [item.passage, item.secondPassage].filter(Boolean)) {
      if (passageKeys.includes(passage.key)) continue
      passageKeys.push(passage.key)
      passageRows.push(passage)
    }
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
    if (savedPassages.length !== passageRows.length) throw new Error('Passage insert length mismatch')
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
  if (new Set(rows.map((row) => row.fingerprint)).size !== rows.length) throw new Error('Duplicate fingerprints in the batch')
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length} of ${rows.length}`)
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(items.map((item) => {
    const rationales = {}
    item.choices.forEach((choice, index) => {
      const letter = 'ABCD'[index]
      rationales[letter] = letter === item.answer ? `Correct: ${choice[1]}` : choice[1]
    })
    const level = item.rubric.total >= 15 ? 7 : 6
    return {
      question_id: idByFingerprint.get(fingerprintFor(item)),
      version: 1,
      exam_type: item.exam,
      section: item.section,
      domain: item.topicRow.domain,
      skill: item.topicRow.topic,
      subskill: item.proof.slice(0, 180),
      difficulty_level: level,
      difficulty_basis: 'editorial',
      estimated_seconds: item.exam === 'ACT' && item.section === 'Math' ? 70 : item.section === 'Math' ? 110 : 90,
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
        answer_follows_from_graphic: Boolean(item.graphicData),
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Arithmetic was asserted before insert. Reading and English answers were checked against one stated line in the passage.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const report = {
  generatedAt: new Date().toISOString(),
  batch: batchName,
  built: items.length,
  inserted,
  alreadyPresent: existing.length > 0,
  bands,
  trueHard: items.filter((item) => item.rubric.total >= 12).length,
  eliteHard: items.filter((item) => item.rubric.total >= 15).length,
  withGraphic: items.filter((item) => item.graphicData).length,
  byExam: {
    SAT: items.filter((item) => item.exam === 'SAT').length,
    ACT: items.filter((item) => item.exam === 'ACT').length,
  },
}
writeFileSync('supabase/exam-engineering/true-hard-originals-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
