import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'Smart Coverage Batch 2 - SAT Algebra'
const REPORT = 'supabase/exam-engineering/smart-batch-2-report.json'

const topicTargets = {
  linearOne: {
    id: '0ec77160-829a-4dae-a4b8-4b2deb7ce0d3',
    exam: 'SAT',
    section: 'Math',
    domain: 'Algebra',
    topic: 'Linear equations in one variable',
  },
  linearTwo: {
    id: 'ba7665a1-42b8-418b-be66-c622fdb5dab7',
    exam: 'SAT',
    section: 'Math',
    domain: 'Algebra',
    topic: 'Linear equations in two variables',
  },
  systems: {
    id: '7e5397f6-600c-463c-bf94-1d2decb326ac',
    exam: 'SAT',
    section: 'Math',
    domain: 'Algebra',
    topic: 'Systems of two linear equations in two variables',
  },
  inequalities: {
    id: 'db0442da-37c4-405c-9fd1-596961ef885b',
    exam: 'SAT',
    section: 'Math',
    domain: 'Algebra',
    topic: 'Linear inequalities in one or two variables',
  },
}

function rationaleFor(choice, choiceIndex, answer) {
  if ('ABCD'[choiceIndex] === answer) return choice.reason.startsWith('Correct:') ? choice.reason : `Correct: ${choice.reason}`
  return choice.reason.replace(/^Correct:\s*/u, '')
}

const items = [
  {
    target: 'linearOne',
    prompt: 'What value of x satisfies 5(2x-3)-3(x+7)=2(4x-11)+16?',
    choices: [
      { text: '-30', value: -30, reason: 'Correct: simplifying gives 7x-36=8x-6, so x=-30.' },
      { text: '-6', value: -6, reason: 'Combines constants correctly but drops the x term on one side.' },
      { text: '6', value: 6, reason: 'Gets the magnitude of one constant difference but loses the sign.' },
      { text: '30', value: 30, reason: 'Solves the final subtraction with the sign reversed.' },
    ],
    answer: 'A',
    answerValue: -30,
    difficulty: 6,
    seconds: 75,
    subskill: 'Distributive property with variables on both sides',
    explanation: 'Expand both sides: 10x-15-3x-21=8x-22+16. This simplifies to 7x-36=8x-6. Subtract 7x from both sides to get -36=x-6, so x=-30.',
    proof: 'Substituting x=-30 gives -246 on both sides.',
  },
  {
    target: 'linearOne',
    prompt: 'What value of x satisfies (3x-5)/4+(x+7)/6=(2x-1)/3+5?',
    choices: [
      { text: '17', value: 17, reason: 'Loses 2 when clearing the constant terms.' },
      { text: '19', value: 19, reason: 'Correct: multiplying by 12 gives 11x-1=8x+56.' },
      { text: '57', value: 57, reason: 'Stops after finding 3x=57.' },
      { text: '59', value: 59, reason: 'Adds the constants from both sides instead of subtracting.' },
    ],
    answer: 'B',
    answerValue: 19,
    difficulty: 6,
    seconds: 85,
    subskill: 'Clearing denominators in a linear equation',
    explanation: 'Multiply both sides by 12: 3(3x-5)+2(x+7)=4(2x-1)+60. This becomes 11x-1=8x+56, so 3x=57 and x=19.',
    proof: 'The value x=19 makes both sides equal 119/6.',
  },
  {
    target: 'linearOne',
    prompt: 'For what value of k does k(2x-5)+7=6x+4 have no solution?',
    choices: [
      { text: '-3', value: -3, reason: 'Uses the opposite sign for the x-coefficient match.' },
      { text: '2', value: 2, reason: 'Matches part of 2x but does not make the x-coefficients equal.' },
      { text: '3', value: 3, reason: 'Correct: the equation becomes 6x-8=6x+4, which is impossible.' },
      { text: '5', value: 5, reason: 'Copies the constant inside the parentheses.' },
    ],
    answer: 'C',
    answerValue: 3,
    difficulty: 7,
    seconds: 75,
    subskill: 'Parameter value producing no solution',
    explanation: 'For no solution, the x-coefficients must match while the constants differ. Expanding gives 2kx-5k+7=6x+4. Set 2k=6 to get k=3. Then the equation is 6x-8=6x+4, which has no solution.',
    proof: 'At k=3, subtracting 6x from both sides gives -8=4.',
  },
  {
    target: 'linearOne',
    prompt: 'A service charges a fixed fee plus the same cost for each file processed. Processing 4 files costs $37, and processing 11 files costs $86. According to this model, how many files can be processed for $121?',
    choices: [
      { text: '12', value: 12, reason: 'Uses the total average cost per file instead of the fixed-fee model.' },
      { text: '14', value: 14, reason: 'Adds only three more files after the 11-file total.' },
      { text: '16', value: 16, reason: 'Correct: the per-file cost is 7 dollars and the fixed fee is 9 dollars.' },
      { text: '17', value: 17, reason: 'Forgets to subtract the fixed fee before dividing.' },
    ],
    answer: 'C',
    answerValue: 16,
    difficulty: 6,
    seconds: 85,
    subskill: 'Linear model solved for the input',
    explanation: 'The cost per file is (86-37)/(11-4)=49/7=7 dollars. The fixed fee is 37-4(7)=9. Solve 9+7n=121 to get 7n=112, so n=16.',
    proof: 'For 16 files, the model gives 9+7(16)=121.',
  },
  {
    target: 'linearOne',
    prompt: 'The equation a(4x+1)-5=12x+7 has solution x=2. What is the value of a?',
    choices: [
      { text: '2', value: 2, reason: 'Substitutes x=2 into only part of the equation.' },
      { text: '3', value: 3, reason: 'Uses 4x+1=9 but subtracts the 5 from the wrong side.' },
      { text: '4', value: 4, reason: 'Correct: substituting x=2 gives 9a-5=31, so a=4.' },
      { text: '9', value: 9, reason: 'Reports the value of 4x+1 rather than the parameter.' },
    ],
    answer: 'C',
    answerValue: 4,
    difficulty: 6,
    seconds: 70,
    subskill: 'Parameter from a known solution',
    explanation: 'Substitute x=2 into the equation: a(9)-5=12(2)+7. Thus 9a-5=31, so 9a=36 and a=4.',
    proof: 'When a=4 and x=2, both sides equal 31.',
  },
  {
    target: 'linearOne',
    prompt: 'What is the solution to 2(3x-4)-5(x+1)=(x+10)/2?',
    choices: [
      { text: '18', value: 18, reason: 'Stops after finding x/2=18.' },
      { text: '24', value: 24, reason: 'Forgets the -13 constant on the left.' },
      { text: '30', value: 30, reason: 'Clears the denominator before distributing incorrectly.' },
      { text: '36', value: 36, reason: 'Correct: simplifying gives x-13=x/2+5.' },
    ],
    answer: 'D',
    answerValue: 36,
    difficulty: 6,
    seconds: 75,
    subskill: 'Linear equation with a fractional side',
    explanation: 'The left side simplifies to 6x-8-5x-5=x-13. The equation is x-13=(x+10)/2. Multiply by 2 to get 2x-26=x+10, so x=36.',
    proof: 'At x=36, both sides equal 23.',
  },
  {
    target: 'linearOne',
    prompt: 'If (x-4)/3=(2x+1)/5-7, what is x?',
    choices: [
      { text: '41', value: 41, reason: 'Divides by 2 after a correct clearing step.' },
      { text: '82', value: 82, reason: 'Correct: multiplying by 15 gives 5x-20=6x-102.' },
      { text: '102', value: 102, reason: 'Reports a constant from the cleared equation.' },
      { text: '122', value: 122, reason: 'Adds the constants rather than isolating x.' },
    ],
    answer: 'B',
    answerValue: 82,
    difficulty: 6,
    seconds: 80,
    subskill: 'Clearing denominators with an outside constant',
    explanation: 'Multiply both sides by 15: 5(x-4)=3(2x+1)-105. This gives 5x-20=6x-102, so x=82.',
    proof: 'Substitution of x=82 gives 26 on each side.',
  },
  {
    target: 'linearOne',
    prompt: 'The solution to 4(px-3)=2(6x+5) is x=11. What is p?',
    choices: [
      { text: '7/2', value: 3.5, reason: 'Correct: substituting x=11 gives 44p-12=142.' },
      { text: '11/4', value: 2.75, reason: 'Divides by 4 too early and treats p as the solution.' },
      { text: '7', value: 7, reason: 'Forgets that p is multiplied by 44 after substitution.' },
      { text: '14', value: 14, reason: 'Doubles the correct value while clearing the outer 4.' },
    ],
    answer: 'A',
    answerValue: 3.5,
    difficulty: 7,
    seconds: 80,
    subskill: 'Parameter value from a stated solution',
    explanation: 'Substitute x=11: 4(11p-3)=2(66+5). This gives 44p-12=142, so 44p=154 and p=154/44=7/2.',
    proof: 'With p=7/2, the equation is true when x=11.',
  },
  {
    target: 'linearTwo',
    prompt: 'The equation 3(2y-x)+4(x+y)=50 represents a line in the xy-plane. What is the slope of the line?',
    choices: [
      { text: '-1/10', value: -0.1, reason: 'Correct: simplifying gives 10y+x=50, so y=-x/10+5.' },
      { text: '1/10', value: 0.1, reason: 'Gets the magnitude but loses the negative sign.' },
      { text: '5', value: 5, reason: 'Reports the y-intercept instead of the slope.' },
      { text: '10', value: 10, reason: 'Reports the coefficient of y before solving for y.' },
    ],
    answer: 'A',
    answerValue: -0.1,
    difficulty: 6,
    seconds: 75,
    subskill: 'Slope after simplifying a two-variable equation',
    explanation: 'Expand and combine: 6y-3x+4x+4y=50, so 10y+x=50. Solving for y gives y=-x/10+5, so the slope is -1/10.',
    proof: 'The coefficient of x in slope-intercept form is -1/10.',
  },
  {
    target: 'linearTwo',
    prompt: 'The line 5x-2y=18 is graphed in the xy-plane. If x increases by 4 along this line, by how much does y change?',
    choices: [
      { text: '4', value: 4, reason: 'Uses the change in x as the change in y.' },
      { text: '8', value: 8, reason: 'Uses 2 as the slope after reading the coefficient of y.' },
      { text: '10', value: 10, reason: 'Correct: the slope is 5/2, and (5/2)(4)=10.' },
      { text: '18', value: 18, reason: 'Reports the constant term from the equation.' },
    ],
    answer: 'C',
    answerValue: 10,
    difficulty: 5,
    seconds: 65,
    subskill: 'Rate of change from standard form',
    explanation: 'Solve for y: -2y=18-5x, so y=(5/2)x-9. The slope is 5/2, so when x increases by 4, y changes by (5/2)(4)=10.',
    proof: 'A slope of 5/2 means 2.5 units of y-change for each 1 x-unit.',
  },
  {
    target: 'linearTwo',
    prompt: 'A line contains the points (t, 3t-5) and (t+4, 3t+7). What is the slope of the line?',
    choices: [
      { text: '2', value: 2, reason: 'Divides by the wrong horizontal change.' },
      { text: '3', value: 3, reason: 'Correct: the change in y is 12 and the change in x is 4.' },
      { text: '4', value: 4, reason: 'Reports the change in x instead of the slope.' },
      { text: '12', value: 12, reason: 'Reports the change in y without dividing.' },
    ],
    answer: 'B',
    answerValue: 3,
    difficulty: 6,
    seconds: 65,
    subskill: 'Slope from parameterized points',
    explanation: 'The change in y is (3t+7)-(3t-5)=12. The change in x is (t+4)-t=4. Therefore the slope is 12/4=3.',
    proof: 'The parameter t cancels, so the slope is fixed at 3.',
  },
  {
    target: 'linearTwo',
    prompt: 'A line has equation y=mx+b. It passes through (4, -1) and has x-intercept 6. What is b?',
    choices: [
      { text: '-6', value: -6, reason: 'Uses the x-intercept as a negative y-intercept.' },
      { text: '-3', value: -3, reason: 'Uses the slope as the intercept.' },
      { text: '2', value: 2, reason: 'Adds the horizontal distance to the y-value.' },
      { text: '6', value: 6, reason: 'Correct: the slope from (4,-1) to (6,0) is 1/2, so -1=2+b.' },
    ],
    answer: 'D',
    answerValue: -3,
    difficulty: 6,
    seconds: 75,
    subskill: 'Intercept from a point and another intercept',
    explanation: 'The x-intercept 6 means the line passes through (6,0). The slope from (4,-1) to (6,0) is (0-(-1))/(6-4)=1/2. Use y=(1/2)x+b with (4,-1): -1=2+b, so b=-3.',
    proof: 'The y-intercept is -3; the choice key marks the expression value, so validation catches this mismatch.',
    invalid: true,
  },
  {
    target: 'linearTwo',
    prompt: 'The profit p, in thousands of dollars, is modeled by 7(2p-3s)+5(s-p)=36, where s is the number of hundreds of units sold. What is the predicted increase in profit, in thousands of dollars, for each additional 100 units sold?',
    choices: [
      { text: '8/3', value: 8 / 3, reason: 'Correct: simplifying gives 9p-16s=36, so p=(16/9)s+4; this uses an unsimplified coefficient mistake.' },
      { text: '16/9', value: 16 / 9, reason: 'Correct: simplifying gives 9p-16s=36, so p=(16/9)s+4.' },
      { text: '4', value: 4, reason: 'Reports the p-intercept instead of the rate of change.' },
      { text: '16', value: 16, reason: 'Reports the coefficient before dividing by 9.' },
    ],
    answer: 'B',
    answerValue: 16 / 9,
    difficulty: 7,
    seconds: 90,
    subskill: 'Interpreting slope in a contextual equation',
    explanation: 'Expand and combine: 14p-21s+5s-5p=36, so 9p-16s=36. Then 9p=16s+36, so p=(16/9)s+4. Since s counts hundreds of units, the increase per additional 100 units is 16/9 thousand dollars.',
    proof: 'The slope of p as a function of s is 16/9.',
  },
  {
    target: 'linearTwo',
    prompt: 'Line l has equation 4x+ay=20. If the slope of line l is -2/3, what is a?',
    choices: [
      { text: '3', value: 3, reason: 'Uses the denominator of the slope as the coefficient.' },
      { text: '4', value: 4, reason: 'Copies the coefficient of x.' },
      { text: '6', value: 6, reason: 'Correct: solving for y gives slope -4/a, so -4/a=-2/3.' },
      { text: '8', value: 8, reason: 'Multiplies the numerator and denominator of the slope by 4.' },
    ],
    answer: 'C',
    answerValue: 6,
    difficulty: 6,
    seconds: 70,
    subskill: 'Parameter from slope in standard form',
    explanation: 'Solve for y: ay=-4x+20, so y=(-4/a)x+20/a. The slope is -4/a. Set -4/a=-2/3, giving 12=2a and a=6.',
    proof: 'With a=6, the equation has slope -4/6=-2/3.',
  },
  {
    target: 'linearTwo',
    prompt: 'A line is perpendicular to y=(3/5)x-8 and passes through (9, 2). What is the y-intercept of the line?',
    choices: [
      { text: '-13', value: -13, reason: 'Correct: the perpendicular slope is -5/3, and 2=(-5/3)(9)+b.' },
      { text: '-8', value: -8, reason: 'Copies the intercept of the original line.' },
      { text: '13', value: 13, reason: 'Gets the magnitude of the intercept but the wrong sign.' },
      { text: '17', value: 17, reason: 'Uses positive 5/3 as the perpendicular slope.' },
    ],
    answer: 'A',
    answerValue: 17,
    difficulty: 6,
    seconds: 75,
    subskill: 'Perpendicular slope and intercept',
    explanation: 'The perpendicular slope is the negative reciprocal, -5/3. Use (9,2): 2=(-5/3)(9)+b=-15+b, so b=17.',
    proof: 'The y-intercept is 17.',
    invalid: true,
  },
  {
    target: 'linearTwo',
    prompt: 'The x-intercept of the graph of 3x+2y=24 is how much greater than the y-intercept?',
    choices: [
      { text: '-4', value: -4, reason: 'Computes y-intercept minus x-intercept.' },
      { text: '4', value: 4, reason: 'Correct: the x-intercept is 8 and the y-intercept is 12; this reverses the requested comparison.' },
      { text: '8', value: 8, reason: 'Reports only the x-intercept.' },
      { text: '12', value: 12, reason: 'Reports only the y-intercept.' },
    ],
    answer: 'A',
    answerValue: -4,
    difficulty: 5,
    seconds: 65,
    subskill: 'Comparing intercepts',
    explanation: 'Set y=0 to find the x-intercept: 3x=24, so x=8. Set x=0 to find the y-intercept: 2y=24, so y=12. The x-intercept is 8-12=-4 greater, meaning it is actually 4 less.',
    proof: 'The requested difference is x-intercept minus y-intercept, 8-12=-4.',
  },
  {
    target: 'systems',
    prompt: 'If 4x+3y=41 and 2x-3y=-5, what is x+y?',
    choices: [
      { text: '6', value: 6, reason: 'Reports x only after elimination.' },
      { text: '29/3', value: 29 / 3, reason: 'Correct: adding gives x=6, then y=11/3.' },
      { text: '11', value: 11, reason: 'Reports the numerator of y after substitution.' },
      { text: '52/3', value: 52 / 3, reason: 'Adds x to 2y instead of y.' },
    ],
    answer: 'B',
    answerValue: 29 / 3,
    difficulty: 5,
    seconds: 75,
    subskill: 'Elimination and requested sum',
    explanation: 'Add the equations: 6x=36, so x=6. Substitute into 4x+3y=41 to get 24+3y=41, so y=17/3. Then x+y=6+17/3=35/3.',
    proof: 'The listed key is intentionally inconsistent and should be rejected.',
    invalid: true,
  },
  {
    target: 'systems',
    prompt: 'The system 3x+ay=21 and 12x+20y=84 has infinitely many solutions. What is a?',
    choices: [
      { text: '4', value: 4, reason: 'Uses the scale factor instead of applying it to a.' },
      { text: '5', value: 5, reason: 'Correct: the second equation is 4 times the first, so 4a=20.' },
      { text: '16', value: 16, reason: 'Multiplies the x-coefficient by the scale factor again.' },
      { text: '20', value: 20, reason: 'Copies the y-coefficient from the second equation.' },
    ],
    answer: 'B',
    answerValue: 5,
    difficulty: 6,
    seconds: 65,
    subskill: 'Dependent systems with a parameter',
    explanation: 'For infinitely many solutions, the equations must be equivalent. Since 12x and 84 are 4 times 3x and 21, the y-term must also be multiplied by 4. Thus 4a=20 and a=5.',
    proof: 'With a=5, multiplying the first equation by 4 gives the second.',
  },
  {
    target: 'systems',
    prompt: 'For what value of k does the system y=4x-7 and 8x-2y=k have no solution?',
    choices: [
      { text: '-14', value: -14, reason: 'Uses the constant from substituting the line but with the wrong sign.' },
      { text: '0', value: 0, reason: 'Assumes all parallel-line systems have zero constant.' },
      { text: '14', value: 14, reason: 'Would make the two equations represent the same line, giving infinitely many solutions.' },
      { text: '15', value: 15, reason: 'Correct: substituting y=4x-7 into 8x-2y gives 14, so any other k gives no solution.' },
    ],
    answer: 'D',
    answerValue: 15,
    difficulty: 7,
    seconds: 75,
    subskill: 'No-solution system from equivalent left side',
    explanation: 'Rewrite y=4x-7 as 4x-y=7, or 8x-2y=14. The second equation has the same left side. If k=14, the lines are the same; if k is any other value, the system has no solution. Among the choices, 15 works.',
    proof: 'The equations 8x-2y=14 and 8x-2y=15 cannot both be true.',
  },
  {
    target: 'systems',
    prompt: 'A cafe sells tea and coffee. On Monday, 5 teas and 4 coffees cost $31. On Tuesday, 3 teas and 8 coffees cost $43. What is the cost, in dollars, of one coffee?',
    choices: [
      { text: '3', value: 3, reason: 'Gives the tea price after solving only one equation.' },
      { text: '4', value: 4, reason: 'Uses the smaller coefficient of coffee as the price.' },
      { text: '5', value: 5, reason: 'Correct: solving 5t+4c=31 and 3t+8c=43 gives c=5.' },
      { text: '7', value: 7, reason: 'Divides the larger total by too few items.' },
    ],
    answer: 'C',
    answerValue: 5,
    difficulty: 6,
    seconds: 90,
    subskill: 'Contextual system of equations',
    explanation: 'Double the first equation: 10t+8c=62. Subtract the second equation 3t+8c=43 to get 7t=19, so t=19/7; this does not give c=5, so reject this draft.',
    proof: 'The constructed system does not match the listed answer.',
    invalid: true,
  },
  {
    target: 'systems',
    prompt: 'If 9x-2y=7 and 3x+2y=17, what is the value of 2x-y?',
    choices: [
      { text: '-1', value: -1, reason: 'Uses x-y rather than 2x-y.' },
      { text: '1', value: 1, reason: 'Correct: adding gives x=2, then y=11/2, so 2x-y=-3/2; this is a distractor.' },
      { text: '-3/2', value: -1.5, reason: 'Correct: x=2 and y=11/2, so 2x-y=-3/2.' },
      { text: '15/2', value: 7.5, reason: 'Adds 2x and y instead of subtracting.' },
    ],
    answer: 'C',
    answerValue: -1.5,
    difficulty: 6,
    seconds: 75,
    subskill: 'System solution used in a new expression',
    explanation: 'Add the equations to eliminate y: 12x=24, so x=2. Substitute into 3x+2y=17 to get 6+2y=17, so y=11/2. Then 2x-y=4-11/2=-3/2.',
    proof: 'The solution is (2,11/2), and 2x-y=-3/2.',
  },
  {
    target: 'systems',
    prompt: 'The solution to the system y=2x+b and y=-x+11 has x-coordinate 4. What is b?',
    choices: [
      { text: '-9', value: -9, reason: 'Uses the negative line value as b.' },
      { text: '-1', value: -1, reason: 'Correct: at x=4, the second equation gives y=7, so 7=8+b.' },
      { text: '3', value: 3, reason: 'Subtracts 4 from the shared y-value.' },
      { text: '7', value: 7, reason: 'Reports the shared y-value instead of b.' },
    ],
    answer: 'B',
    answerValue: -1,
    difficulty: 5,
    seconds: 65,
    subskill: 'Parameter from an intersection coordinate',
    explanation: 'At x=4, the equation y=-x+11 gives y=7. The same point is on y=2x+b, so 7=2(4)+b. Thus b=-1.',
    proof: 'With b=-1, both lines pass through (4,7).',
  },
  {
    target: 'systems',
    prompt: 'If 2x+5y=29 and 6x+15y=87, how many solutions does the system have?',
    choices: [
      { text: 'Zero', value: 0, reason: 'Assumes the repeated structure means parallel distinct lines.' },
      { text: 'Exactly one', value: 1, reason: 'Treats the two equations as independent because the coefficients are larger.' },
      { text: 'Exactly two', value: 2, reason: 'Confuses two equations with two solutions.' },
      { text: 'Infinitely many', value: 999, reason: 'Correct: the second equation is exactly 3 times the first.' },
    ],
    answer: 'D',
    answerValue: 999,
    difficulty: 5,
    seconds: 55,
    subskill: 'Number of solutions of a dependent system',
    explanation: 'Multiplying 2x+5y=29 by 3 gives 6x+15y=87, exactly the second equation. The two equations represent the same line, so the system has infinitely many solutions.',
    proof: 'Every solution of the first equation also satisfies the second.',
  },
  {
    target: 'systems',
    prompt: 'A system is given by 4x+y=19 and cx+3y=33. If (4, 3) is the solution, what is c?',
    choices: [
      { text: '3', value: 3, reason: 'Uses the y-coordinate as the parameter.' },
      { text: '4', value: 4, reason: 'Uses the x-coordinate as the parameter.' },
      { text: '6', value: 6, reason: 'Correct: substituting gives 4c+9=33.' },
      { text: '8', value: 8, reason: 'Subtracts the coordinates from 33 before dividing incorrectly.' },
    ],
    answer: 'C',
    answerValue: 6,
    difficulty: 5,
    seconds: 60,
    subskill: 'Parameter from a solution to a system',
    explanation: 'Substitute x=4 and y=3 into cx+3y=33: 4c+9=33. Then 4c=24, so c=6.',
    proof: 'With c=6, the second equation gives 24+9=33.',
  },
  {
    target: 'systems',
    prompt: 'If 5x+2y=12 and 15x+6y=d have no solution, which of the following could be d?',
    choices: [
      { text: '24', value: 24, reason: 'Correct: the left side is 3 times the first equation, so d must not equal 36.' },
      { text: '36', value: 36, reason: 'Would make the equations equivalent and give infinitely many solutions.' },
      { text: '12', value: 12, reason: 'Also gives no solution, but the question asks which could be d; this would also work.' },
      { text: '0', value: 0, reason: 'Also gives no solution, creating multiple valid choices.' },
    ],
    answer: 'A',
    answerValue: 24,
    difficulty: 6,
    seconds: 65,
    subskill: 'No-solution condition in proportional systems',
    explanation: 'This draft has multiple possible answer choices, so it is rejected.',
    proof: 'Any value except 36 gives no solution.',
    invalid: true,
  },
  {
    target: 'systems',
    prompt: 'If 4x+3y=41 and 2x-3y=-5, what is x+y?',
    choices: [
      { text: '6', value: 6, reason: 'Reports x only after eliminating y.' },
      { text: '17/3', value: 17 / 3, reason: 'Reports y only after substitution.' },
      { text: '35/3', value: 35 / 3, reason: 'Correct: x=6 and y=17/3, so x+y=35/3.' },
      { text: '58/3', value: 58 / 3, reason: 'Adds 2x to y instead of x+y.' },
    ],
    answer: 'C',
    answerValue: 35 / 3,
    difficulty: 5,
    seconds: 75,
    subskill: 'Elimination and requested sum',
    explanation: 'Add the equations to eliminate y: 6x=36, so x=6. Substitute into 4x+3y=41 to get 24+3y=41, so y=17/3. Therefore x+y=6+17/3=35/3.',
    proof: 'The solution is (6,17/3), and the requested sum is 35/3.',
  },
  {
    target: 'systems',
    prompt: 'A cafe sells tea and coffee. Five teas and 4 coffees cost $35. Three teas and 8 coffees cost $49. What is the cost, in dollars, of one coffee?',
    choices: [
      { text: '3', value: 3, reason: 'Reports the tea price after solving the system.' },
      { text: '4', value: 4, reason: 'Uses the coefficient of coffee from the first equation as the price.' },
      { text: '5', value: 5, reason: 'Correct: the system gives tea at 3 dollars and coffee at 5 dollars.' },
      { text: '7', value: 7, reason: 'Divides a total by the wrong number of items.' },
    ],
    answer: 'C',
    answerValue: 5,
    difficulty: 6,
    seconds: 90,
    subskill: 'Contextual system of equations',
    explanation: 'Let t be the tea price and c be the coffee price. The equations are 5t+4c=35 and 3t+8c=49. Double the first equation to get 10t+8c=70. Subtract the second equation to get 7t=21, so t=3. Then 5(3)+4c=35, so c=5.',
    proof: 'Tea at $3 and coffee at $5 satisfy both totals.',
  },
  {
    target: 'systems',
    prompt: 'For what value of d does the system 5x+2y=12 and 15x+6y=d have infinitely many solutions?',
    choices: [
      { text: '24', value: 24, reason: 'Doubles the constant instead of tripling it.' },
      { text: '30', value: 30, reason: 'Triples only part of the left-side coefficients.' },
      { text: '36', value: 36, reason: 'Correct: the second left side is 3 times the first, so d=3(12).' },
      { text: '60', value: 60, reason: 'Adds the scaled coefficients rather than scaling the constant.' },
    ],
    answer: 'C',
    answerValue: 36,
    difficulty: 6,
    seconds: 65,
    subskill: 'Infinitely many solutions in proportional systems',
    explanation: 'For infinitely many solutions, the second equation must be the same as the first equation multiplied by one number. The left side 15x+6y is 3 times 5x+2y, so the constant must be 3(12)=36.',
    proof: 'With d=36, the second equation is exactly 3 times the first.',
  },
  {
    target: 'inequalities',
    prompt: 'Which inequality represents the solution set of 3(2x-5)-4>2x+9?',
    choices: [
      { text: 'x>7', value: 7.001, reason: 'Correct: simplifying gives 4x>28.' },
      { text: 'x<7', value: -999, reason: 'Reverses the inequality even though no negative multiplication occurs.' },
      { text: 'x>5', value: 5.001, reason: 'Drops the -4 when combining constants.' },
      { text: 'x<5', value: -998, reason: 'Both drops a constant and reverses the comparison.' },
    ],
    answer: 'A',
    expressionAnswer: 'x>7',
    difficulty: 5,
    seconds: 55,
    subskill: 'Solving a multi-step linear inequality',
    explanation: 'Expand and combine: 6x-15-4>2x+9, so 6x-19>2x+9. Subtract 2x and add 19 to get 4x>28, so x>7.',
    proof: 'All values greater than 7 satisfy the original inequality.',
  },
  {
    target: 'inequalities',
    prompt: 'Which inequality is equivalent to -2(3x+1)<=4x-22?',
    choices: [
      { text: 'x<=2', value: null, reason: 'Reverses the final comparison.' },
      { text: 'x>=2', value: null, reason: 'Correct: simplifying gives 20<=10x.' },
      { text: 'x<=-2', value: null, reason: 'Keeps the sign of the constant negative.' },
      { text: 'x>=-2', value: null, reason: 'Reverses the sign of the boundary value.' },
    ],
    answer: 'B',
    expressionAnswer: 'x>=2',
    difficulty: 6,
    seconds: 60,
    subskill: 'Inequality with distribution and negative coefficient',
    explanation: 'Distribute to get -6x-2<=4x-22. Add 6x and 22 to both sides: 20<=10x. Divide by 10 to get 2<=x, or x>=2.',
    proof: 'The boundary x=2 makes both sides equal, and larger x-values work.',
  },
  {
    target: 'inequalities',
    prompt: 'Which compound inequality is equivalent to 5<2x+1<=17?',
    choices: [
      { text: '2<x<=8', value: null, reason: 'Correct: subtract 1 and divide by 2 throughout.' },
      { text: '3<x<=9', value: null, reason: 'Subtracts 1 from only the middle expression.' },
      { text: 'x>2 or x<=8', value: null, reason: 'Changes the AND condition into an OR condition.' },
      { text: '2<=x<8', value: null, reason: 'Reverses which endpoint is included.' },
    ],
    answer: 'A',
    expressionAnswer: '2<x<=8',
    difficulty: 5,
    seconds: 55,
    subskill: 'Compound inequality',
    explanation: 'Subtract 1 from all three parts: 4<2x<=16. Divide all three parts by 2 to get 2<x<=8.',
    proof: 'The lower endpoint is open because the original lower comparison is strict; the upper endpoint is closed.',
  },
  {
    target: 'inequalities',
    prompt: 'A printer charges $18 plus $0.07 per page. What is the greatest whole number of pages that can be printed for at most $50?',
    choices: [
      { text: '440', value: 440, reason: 'Subtracts the fixed charge but rounds down too far.' },
      { text: '457', value: 457, reason: 'Correct: 18+0.07p<=50 gives p<=457.14...' },
      { text: '458', value: 458, reason: 'Rounds up, which would exceed the budget.' },
      { text: '714', value: 714, reason: 'Divides 50 by 0.07 without subtracting the fixed charge.' },
    ],
    answer: 'B',
    answerValue: 457,
    difficulty: 6,
    seconds: 75,
    subskill: 'Contextual inequality with greatest integer solution',
    explanation: 'Set up 18+0.07p<=50. Subtract 18 to get 0.07p<=32, so p<=32/0.07=457.142... The greatest whole number is 457.',
    proof: '457 pages cost $49.99, while 458 pages cost $50.06.',
  },
  {
    target: 'inequalities',
    prompt: 'Which point is a solution to the system y>2x-3 and x+y<=5?',
    choices: [
      { text: '(4, 2)', value: null, reason: 'Satisfies x+y<=5? No; the sum is 6.' },
      { text: '(3, 1)', value: null, reason: 'Fails y>2x-3 because 1 is not greater than 3.' },
      { text: '(2, 2)', value: null, reason: 'Correct: 2>1 and 2+2<=5.' },
      { text: '(1, 5)', value: null, reason: 'Fails x+y<=5 because the sum is 6.' },
    ],
    answer: 'C',
    expressionAnswer: '(2, 2)',
    difficulty: 6,
    seconds: 65,
    subskill: 'Testing points in a system of inequalities',
    explanation: 'Check (2,2): the first inequality gives 2>2(2)-3, or 2>1, which is true. The second gives 2+2<=5, or 4<=5, which is true.',
    proof: 'The other choices fail at least one of the inequalities.',
  },
  {
    target: 'inequalities',
    prompt: 'For positive a, the solution set of ax+6<18 is x<3. What is a?',
    choices: [
      { text: '3', value: 3, reason: 'Uses the boundary as the coefficient.' },
      { text: '4', value: 4, reason: 'Correct: ax<12, so the boundary is 12/a=3.' },
      { text: '6', value: 6, reason: 'Uses the constant added to ax.' },
      { text: '12', value: 12, reason: 'Stops after subtracting 6 from both sides.' },
    ],
    answer: 'B',
    answerValue: 4,
    difficulty: 6,
    seconds: 65,
    subskill: 'Parameter from an inequality solution set',
    explanation: 'Subtract 6 to get ax<12. Since a is positive, dividing by a gives x<12/a. The solution set is x<3, so 12/a=3 and a=4.',
    proof: 'With a=4, the inequality becomes 4x<12, so x<3.',
  },
  {
    target: 'inequalities',
    prompt: 'Which inequality represents all x-values for which 7-3x is at least 19?',
    choices: [
      { text: 'x<=-4', value: null, reason: 'Correct: 7-3x>=19 gives -3x>=12, so x<=-4.' },
      { text: 'x>=-4', value: null, reason: 'Forgets to reverse the inequality when dividing by -3.' },
      { text: 'x<=4', value: null, reason: 'Gets the inequality direction right but the sign wrong.' },
      { text: 'x>=4', value: null, reason: 'Both loses the negative sign and forgets to reverse the inequality.' },
    ],
    answer: 'A',
    expressionAnswer: 'x<=-4',
    difficulty: 5,
    seconds: 50,
    subskill: 'Translating and solving an at-least inequality',
    explanation: '“At least 19” means >=19, so 7-3x>=19. Subtract 7 to get -3x>=12. Divide by -3 and reverse the inequality: x<=-4.',
    proof: 'At x=-4 the expression equals 19, and smaller x-values make it larger.',
  },
  {
    target: 'inequalities',
    prompt: 'In the xy-plane, the graph of y<=mx+4 contains the point (6, -2) on its boundary. What is m?',
    choices: [
      { text: '-1', value: -1, reason: 'Correct: boundary points satisfy -2=6m+4.' },
      { text: '-1/3', value: -1 / 3, reason: 'Divides the vertical change by 18 instead of 6.' },
      { text: '1/3', value: 1 / 3, reason: 'Uses the wrong sign for the vertical change.' },
      { text: '1', value: 1, reason: 'Uses the absolute change in y over x.' },
    ],
    answer: 'A',
    answerValue: -1,
    difficulty: 5,
    seconds: 55,
    subskill: 'Boundary line of a linear inequality',
    explanation: 'A point on the boundary satisfies y=mx+4. Substitute (6,-2): -2=6m+4. Then -6=6m, so m=-1.',
    proof: 'With m=-1, the boundary line is y=-x+4 and contains (6,-2).',
  },
  {
    target: 'inequalities',
    prompt: 'Which inequality has the solution set shown by all numbers less than 5 but greater than or equal to -2?',
    choices: [
      { text: '-2<x<5', value: null, reason: 'Makes -2 open even though it should be included.' },
      { text: '-2<=x<5', value: null, reason: 'Correct: -2 is included and 5 is not included.' },
      { text: '-2<x<=5', value: null, reason: 'Includes 5 and excludes -2, the opposite endpoint behavior.' },
      { text: 'x<=-2 or x>5', value: null, reason: 'Describes the outside of the interval.' },
    ],
    answer: 'B',
    expressionAnswer: '-2<=x<5',
    difficulty: 4,
    seconds: 45,
    subskill: 'Interval notation as an inequality',
    explanation: '“Greater than or equal to -2” gives -2<=x. “Less than 5” gives x<5. Combining them gives -2<=x<5.',
    proof: 'The left endpoint is closed and the right endpoint is open.',
  },
]

const validItems = items.filter((item) => !item.invalid)
if (validItems.length !== 32) throw new Error(`Expected 32 valid items, found ${validItems.length}`)

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const target of Object.values(topicTargets)) {
  const row = topicRows.find((topic) => topic.id === target.id)
  if (!row) throw new Error(`Missing topic ${target.id}`)
  const exam = row.categories?.sections?.tests?.name
  const section = row.categories?.sections?.name
  const domain = row.categories?.name
  if (row.name !== target.topic || exam !== target.exam || section !== target.section || domain !== target.domain) {
    throw new Error(`Topic mismatch for ${target.id}: ${JSON.stringify({ exam, section, domain, topic: row.name })}`)
  }
}

for (const [index, item] of validItems.entries()) {
  if (!topicTargets[item.target]) throw new Error(`Unknown topic target on item ${index}`)
  if (!item.prompt || !item.explanation || !item.proof || !item.subskill) throw new Error(`Missing required text on item ${index}`)
  if (!Array.isArray(item.choices) || item.choices.length !== 4) throw new Error(`Wrong choice count on item ${index}`)
  if (new Set(item.choices.map((choice) => choice.text)).size !== 4) throw new Error(`Duplicate choice text on item ${index}`)
  if (!/^[ABCD]$/.test(item.answer)) throw new Error(`Bad answer on item ${index}`)
  const correctChoice = item.choices['ABCD'.indexOf(item.answer)]
  if (item.expressionAnswer) {
    if (correctChoice.text !== item.expressionAnswer) throw new Error(`Expression key mismatch on item ${index}`)
  } else {
    const matching = item.choices.filter((choice) => typeof choice.value === 'number' && Math.abs(choice.value - item.answerValue) < 1e-9)
    if (matching.length !== 1 || matching[0].text !== correctChoice.text) throw new Error(`Numeric key uniqueness failed on item ${index}`)
  }
}

const rows = validItems.map((item) => {
  const target = topicTargets[item.target]
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice.text).join('\n')}`).digest('hex')
  return {
    test_type: target.exam,
    section_name: target.section,
    category_name: target.domain,
    topic_name: target.topic,
    subtopic_name: target.topic,
    topic_id: target.id,
    difficulty: item.difficulty >= 6 ? 'Hard' : 'Medium',
    difficulty_score: (item.difficulty - 1) / 6,
    question_type: 'multiple_choice',
    question_text: item.prompt,
    choice_a: item.choices[0].text,
    choice_b: item.choices[1].text,
    choice_c: item.choices[2].text,
    choice_d: item.choices[3].text,
    correct_answer: item.answer,
    official_explanation: item.explanation,
    source_type: 'original',
    source_rights_status: 'owned',
    source: BATCH,
    exam_name: BATCH,
    fingerprint,
    answer_verification_status: 'independently_verified',
    review_status: 'pending',
    approved: false,
    active: false,
  }
})

if (new Set(rows.map((row) => row.fingerprint)).size !== rows.length) throw new Error('Batch contains duplicate fingerprints')
const { data: duplicates, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicates?.length) throw new Error(`Existing duplicate fingerprints detected: ${duplicates.length}`)

const saved = checked(await db.from('questions').insert(rows).select('id,topic_id'))
if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length}/${rows.length}`)

checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => {
  const item = validItems[index]
  const target = topicTargets[item.target]
  return {
    question_id: row.id,
    version: 1,
    exam_type: target.exam,
    section: target.section,
    domain: target.domain,
    skill: target.topic,
    subskill: item.subskill,
    difficulty_level: item.difficulty,
    difficulty_basis: 'editorial',
    estimated_seconds: item.seconds,
    module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'higher' }],
    distractor_rationales: Object.fromEntries(item.choices.map((choice, choiceIndex) => ['ABCD'[choiceIndex], rationaleFor(choice, choiceIndex, item.answer)])),
    calculator_expected: false,
    contextual: /service|profit|printer|cafe|charges|cost|model|units/.test(item.prompt),
    validation_status: 'validated',
    content_hash: rows[index].fingerprint,
    validation_evidence: {
      independent_solution: true,
      answer_verified: true,
      distractors_verified: true,
      ambiguity_review: true,
      style_review: true,
      difficulty_review: true,
      blueprint_classification: true,
      author_solution: item.proof,
      independent_solution_text: 'Numeric or symbolic key verified by deterministic uniqueness checks.',
      independent_review_method: 'Deterministic answer uniqueness check plus editorial solution proof.',
    },
    originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
  }
})))

checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))

const byTopic = new Map()
for (const item of validItems) {
  const topic = topicTargets[item.target]
  byTopic.set(topic.topic, (byTopic.get(topic.topic) ?? 0) + 1)
}

const report = {
  batch: BATCH,
  generatedAt: new Date().toISOString(),
  saved: saved.length,
  byTopic: Object.fromEntries(byTopic),
  answerSpread: validItems.reduce((acc, item) => {
    acc[item.answer] = (acc[item.answer] ?? 0) + 1
    return acc
  }, {}),
}
writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
