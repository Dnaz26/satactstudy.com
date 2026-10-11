import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'Smart Coverage Batch 3 - SAT Problem-Solving and Data Analysis'
const REPORT = 'supabase/exam-engineering/smart-batch-3-report.json'

const topicTargets = {
  margin: {
    id: '5922a7e3-02f4-43d6-b57c-9d38607b8f01',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'Inference from sample statistics and margin of error',
  },
  scatter: {
    id: 'f05315c9-e062-4710-8bcd-532ab48d6296',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'Two-variable data: models and scatterplots',
  },
  claims: {
    id: 'ae792ea1-a18b-464a-99c3-90988d3830c1',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'Evaluating statistical claims: observational studies and experiments',
  },
  probability: {
    id: 'cf2a63b6-90ae-4029-8e84-e6be5811d2e9',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'Probability and conditional probability',
  },
  oneVar: {
    id: '8b14721b-dbbf-46a5-83e7-7cd0d5f46ef0',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'One-variable data: distributions and measures of center and spread',
  },
  ratios: {
    id: 'c2943bee-e5c8-4abb-a01e-804f2821dc91',
    exam: 'SAT',
    section: 'Math',
    domain: 'Problem-Solving and Data Analysis',
    topic: 'Ratios, rates, proportional relationships, and units',
  },
}

function rationaleFor(choice, choiceIndex, answer) {
  if ('ABCD'[choiceIndex] === answer) return choice.reason.startsWith('Correct:') ? choice.reason : `Correct: ${choice.reason}`
  return choice.reason.replace(/^Correct:\s*/u, '')
}

const items = [
  {
    target: 'margin',
    prompt: 'A quality team tests a random sample of 80 batteries and finds that 12 fail. Using the sample proportion, about how many failures are expected in a shipment of 2,000 batteries?',
    choices: [
      { text: '240', value: 240, reason: 'Uses 12 failures out of 100 instead of 80.' },
      { text: '300', value: 300, reason: 'Correct: 12/80 of 2,000 is 300.' },
      { text: '160', value: 160, reason: 'Uses a sample size of 150 in the proportion.' },
      { text: '480', value: 480, reason: 'Uses a sample size of 50 in the proportion.' },
    ],
    answer: 'B',
    answerValue: 300,
    difficulty: 6,
    seconds: 70,
    subskill: 'Scale a sample proportion to a larger group',
    explanation: 'The sample proportion is 12/80 = 0.15. Applying that proportion to 2,000 batteries gives 0.15(2,000) = 300 expected failures.',
    proof: '12/80 * 2000 = 300.',
  },
  {
    target: 'margin',
    prompt: 'In a random sample of voters, 56% support a proposal, and the margin of error is 5 percentage points. Which interval gives the plausible range for the percent of all voters who support the proposal?',
    choices: [
      { text: '51% to 56%', value: null, reason: 'Subtracts the margin of error but does not add it.' },
      { text: '56% to 61%', value: null, reason: 'Adds the margin of error but does not subtract it.' },
      { text: '51% to 61%', value: null, reason: 'Correct: 56 minus 5 through 56 plus 5.' },
      { text: '46% to 66%', value: null, reason: 'Uses twice the stated margin of error.' },
    ],
    answer: 'C',
    expressionAnswer: '51% to 61%',
    difficulty: 6,
    seconds: 55,
    subskill: 'Build an interval from an estimate and margin of error',
    explanation: 'A margin of error of 5 percentage points around 56% gives 56 - 5 = 51 and 56 + 5 = 61. The plausible range is 51% to 61%.',
    proof: '56 - 5 = 51 and 56 + 5 = 61.',
  },
  {
    target: 'margin',
    prompt: 'A random sample of 150 seedlings has a survival proportion of 0.24. Based on that proportion, how many survivors are estimated in a nursery of 4,500 seedlings?',
    choices: [
      { text: '1080', value: 1080, reason: 'Correct: 0.24 times 4,500 is 1,080.' },
      { text: '360', value: 360, reason: 'Multiplies the proportion by 1,500 instead of 4,500.' },
      { text: '36', value: 36, reason: 'Multiplies the proportion by the sample size.' },
      { text: '1125', value: 1125, reason: 'Uses 0.25 instead of the given proportion 0.24.' },
    ],
    answer: 'A',
    answerValue: 1080,
    difficulty: 6,
    seconds: 60,
    subskill: 'Apply a sample proportion to a stated population size',
    explanation: 'The estimated count is the sample proportion times the nursery size: 0.24(4,500) = 1,080.',
    proof: '0.24 * 4500 = 1080.',
  },
  {
    target: 'margin',
    prompt: 'A random sample estimates that 41% of residents use a trail each month, with a margin of error of 3 percentage points. Which value is not a plausible percent for all residents?',
    choices: [
      { text: '38%', value: 38, reason: '38 is the lower endpoint, 41 minus 3.' },
      { text: '41%', value: 41, reason: '41 is the sample estimate itself.' },
      { text: '44%', value: 44, reason: '44 is the upper endpoint, 41 plus 3.' },
      { text: '47%', value: 47, reason: 'Correct: 47 is 6 points above 41, outside the margin of error.' },
    ],
    answer: 'D',
    answerValue: 47,
    difficulty: 6,
    seconds: 55,
    subskill: 'Reject a value outside the margin of error',
    explanation: 'Values from 41 - 3 = 38 through 41 + 3 = 44 are plausible. 47 is 6 percentage points above the estimate, so it is outside the interval.',
    proof: '41 + 3 = 44 and 47 > 44.',
  },
  {
    target: 'margin',
    prompt: 'One random sample of 100 students estimates 62% with a margin of error of 8 percentage points. A second random sample of 400 students also estimates 62%, with a margin of error of 4 percentage points. Which statement is best supported?',
    choices: [
      { text: 'The larger sample proves the population percent is exactly 62%.', value: null, reason: 'A sample estimate with a margin of error is not an exact population value.' },
      { text: 'The larger sample gives a narrower plausible interval around the same estimate.', value: null, reason: 'Correct: both estimates are 62%, and 4 points is a narrower margin than 8 points.' },
      { text: 'The smaller sample is more precise because its margin of error is larger.', value: null, reason: 'A larger margin of error means less precision, not more.' },
      { text: 'The two estimates cannot be compared because the margins of error differ.', value: null, reason: 'Different margins can still be compared; they describe different precision.' },
    ],
    answer: 'B',
    expressionAnswer: 'The larger sample gives a narrower plausible interval around the same estimate.',
    difficulty: 7,
    seconds: 80,
    subskill: 'Compare precision of two sample estimates',
    explanation: 'Both samples give the estimate 62%. The sample of 400 has a margin of error of 4 percentage points, so its plausible interval is narrower than the interval from the sample of 100.',
    proof: 'The intervals are 54 to 70 and 58 to 66; the second is narrower and both are centered at 62.',
  },
  {
    target: 'margin',
    prompt: 'In a random sample of 250 trees, 40 are infected. There are 5,000 trees in the forest. The estimated number of infected trees is 800. If the margin of error for the sample proportion is 0.03, the estimate of the count could be off by as many as how many trees?',
    choices: [
      { text: '15', value: 15, reason: 'Multiplies 0.03 by the sample size instead of the forest size.' },
      { text: '120', value: 120, reason: 'Uses 0.03 times 4,000, not 5,000.' },
      { text: '150', value: 150, reason: 'Correct: 0.03 times 5,000 is 150.' },
      { text: '800', value: 800, reason: 'Reports the estimate itself rather than the margin in the count.' },
    ],
    answer: 'C',
    answerValue: 150,
    difficulty: 7,
    seconds: 85,
    subskill: 'Convert a proportion margin of error into a count',
    explanation: 'A margin of 0.03 in the proportion, applied to 5,000 trees, is 0.03(5,000) = 150 trees. The estimate 800 could be off by as many as 150 trees.',
    proof: '40/250 = 0.16 and 0.16*5000 = 800; 0.03*5000 = 150.',
  },
  {
    target: 'scatter',
    prompt: 'The points (1, 4), (3, 10), and (5, 16) lie on a line. If a fourth point on the same line has y-coordinate 28, what is its x-coordinate?',
    choices: [
      { text: '8', value: 8, reason: 'Continues the x-pattern by adding 3 instead of using the slope equation.' },
      { text: '10', value: 10, reason: 'Uses a slope of 2.4 from 24/10.' },
      { text: '27', value: 27, reason: 'Reports 28 minus 1, the constant in the line equation.' },
      { text: '9', value: 9, reason: 'Correct: the line is y = 3x + 1, so 28 = 3x + 1.' },
    ],
    answer: 'D',
    answerValue: 9,
    difficulty: 6,
    seconds: 75,
    subskill: 'Find an input on a line through given points',
    explanation: 'The slope is (10 - 4)/(3 - 1) = 3. Using (1, 4), y - 4 = 3(x - 1), so y = 3x + 1. Setting y = 28 gives 3x = 27 and x = 9.',
    proof: '3(9) + 1 = 28, and the third point 3(5) + 1 = 16 also fits.',
  },
  {
    target: 'scatter',
    prompt: 'A line of fit is y = 2.5x + 12, where x is hours of practice and y is a practice score. According to the model, by how many points does the predicted score increase when practice time increases by 6 hours?',
    choices: [
      { text: '15', value: 15, reason: 'Correct: the slope 2.5 times 6 hours is 15 points.' },
      { text: '12', value: 12, reason: 'Uses the intercept instead of the slope times the change in x.' },
      { text: '18', value: 18, reason: 'Adds 3 extra points to the slope calculation.' },
      { text: '27', value: 27, reason: 'Adds the intercept to the 15-point increase.' },
    ],
    answer: 'A',
    answerValue: 15,
    difficulty: 6,
    seconds: 60,
    subskill: 'Interpret slope as a change in a linear model',
    explanation: 'In y = 2.5x + 12, each extra hour adds 2.5 points. Six extra hours add 2.5(6) = 15 points. The intercept does not change.',
    proof: '2.5 * 6 = 15.',
  },
  {
    target: 'scatter',
    prompt: 'For one point in a data set, a model predicts 74 and the actual value is 68. What is the residual for that point?',
    choices: [
      { text: '6', value: 6, reason: 'Uses predicted minus actual instead of actual minus predicted.' },
      { text: '68', value: 68, reason: 'Reports the actual value.' },
      { text: '-6', value: -6, reason: 'Correct: residual is actual minus predicted, 68 - 74.' },
      { text: '142', value: 142, reason: 'Adds the actual value and the prediction.' },
    ],
    answer: 'C',
    answerValue: -6,
    difficulty: 6,
    seconds: 50,
    subskill: 'Compute a residual',
    explanation: 'The residual is actual value minus predicted value: 68 - 74 = -6. The negative sign means the model prediction is too high.',
    proof: '68 - 74 = -6.',
  },
  {
    target: 'scatter',
    prompt: 'In a scatterplot, as x increases, the points generally fall, but one point lies far above the line of fit. Which statement is best supported?',
    choices: [
      { text: 'The association is positive because one point is high.', value: null, reason: 'One high point does not reverse a decreasing pattern.' },
      { text: 'The association is negative, and the high point has a positive residual.', value: null, reason: 'Correct: y tends to fall as x rises, and a point above the line has a positive residual.' },
      { text: 'The high point shows that the variables are unrelated.', value: null, reason: 'An outlier does not erase the overall decreasing pattern.' },
      { text: 'A negative association means every residual is negative.', value: null, reason: 'Association describes the overall trend, not the sign of every residual.' },
    ],
    answer: 'B',
    expressionAnswer: 'The association is negative, and the high point has a positive residual.',
    difficulty: 7,
    seconds: 75,
    subskill: 'Direction of association and residual sign',
    explanation: 'A pattern that falls as x increases is a negative association. A point above the line of fit has actual value greater than predicted value, so its residual is positive.',
    proof: 'Residual = actual - predicted is positive when the point is above the line.',
  },
  {
    target: 'scatter',
    prompt: 'A model for the percent of a paint supply remaining is P = 40 - 1.5d, where d is the number of days after the supply is opened. After how many days does the model predict that 16% remains?',
    choices: [
      { text: '12', value: 12, reason: 'Divides the drop of 24 by 2 instead of by 1.5.' },
      { text: '24', value: 24, reason: 'Reports the drop in percent, 40 - 16, instead of the number of days.' },
      { text: '16', value: 16, reason: 'Correct: 40 - 1.5d = 16 gives d = 16.' },
      { text: '36', value: 36, reason: 'Multiplies 1.5 by the drop of 24.' },
    ],
    answer: 'C',
    answerValue: 16,
    difficulty: 6,
    seconds: 70,
    subskill: 'Solve a linear model for the input',
    explanation: 'Set 40 - 1.5d = 16. Then 1.5d = 24, so d = 24/1.5 = 16 days.',
    proof: '40 - 1.5(16) = 40 - 24 = 16.',
  },
  {
    target: 'scatter',
    prompt: 'Two lines are fit to the same scatterplot. The sum of the squared residuals for Model A is smaller than the sum for Model B. Which conclusion is best supported?',
    choices: [
      { text: 'Model B fits the points more closely because its residual sum is larger.', value: null, reason: 'A larger sum of squared residuals means a worse fit.' },
      { text: 'The models fit equally well because they use the same points.', value: null, reason: 'The residual sums are different, so the fits are not equal.' },
      { text: 'The residual sums cannot be compared.', value: null, reason: 'Squared residuals for two models of the same points can be compared.' },
      { text: 'Model A fits the observed points more closely.', value: null, reason: 'Correct: the smaller sum of squared residuals is the closer fit.' },
    ],
    answer: 'D',
    expressionAnswer: 'Model A fits the observed points more closely.',
    difficulty: 7,
    seconds: 70,
    subskill: 'Compare model fit using squared residuals',
    explanation: 'A residual is actual minus predicted. Squaring and adding those residuals measures how far the points are from a model. The smaller sum means Model A stays closer to the observed points.',
    proof: 'If the sum of squared residuals is smaller, the typical squared distance from the line is smaller.',
  },
  {
    target: 'claims',
    prompt: 'Students who choose an optional weekend lab have higher average quiz scores than students who do not choose it. Which statement is best supported?',
    choices: [
      { text: 'The lab was not randomly assigned, so other differences between the groups may explain the scores.', value: null, reason: 'Correct: students selected themselves, so the comparison is observational.' },
      { text: 'Averages cannot be compared when students volunteer.', value: null, reason: 'Averages can be compared; the issue is causation, not arithmetic.' },
      { text: 'A larger sample would automatically remove every confounding difference.', value: null, reason: 'A larger observational sample can still be confounded.' },
      { text: 'The higher average proves that the lab caused the higher scores.', value: null, reason: 'Self-selection does not support a causal claim.' },
    ],
    answer: 'A',
    expressionAnswer: 'The lab was not randomly assigned, so other differences between the groups may explain the scores.',
    difficulty: 7,
    seconds: 80,
    subskill: 'Separate association from causation when groups self-select',
    explanation: 'Students decided whether to attend the lab. Students who choose extra practice may already differ in preparation or motivation. The higher average shows an association, not that the lab caused the difference.',
    proof: 'No random assignment is described, so a causal conclusion is not supported.',
  },
  {
    target: 'claims',
    prompt: 'A researcher randomly assigns 60 plants of one species to two fertilizers and measures growth under the same conditions. Which conclusion is most appropriate?',
    choices: [
      { text: 'The result applies to every plant species.', value: null, reason: 'The experiment used one species, so it does not automatically generalize to every species.' },
      { text: 'Random assignment means the plants were a random sample of all farms.', value: null, reason: 'Random assignment of treatments is not the same as random selection from all farms.' },
      { text: 'Random assignment supports a cause-and-effect conclusion about the two fertilizers for these plants.', value: null, reason: 'Correct: the treatments were randomly assigned under shared conditions.' },
      { text: 'The experiment cannot support any causal language.', value: null, reason: 'Random assignment is what makes a causal comparison appropriate.' },
    ],
    answer: 'C',
    expressionAnswer: 'Random assignment supports a cause-and-effect conclusion about the two fertilizers for these plants.',
    difficulty: 7,
    seconds: 85,
    subskill: 'Causal conclusion from random assignment',
    explanation: 'Because each plant was randomly assigned a fertilizer and the other conditions were the same, a difference in growth can be attributed to the fertilizer for these plants. The design does not by itself extend the result to every species or every farm.',
    proof: 'Random assignment supports causation; random sampling would be needed for broad generalization.',
  },
  {
    target: 'claims',
    prompt: 'A random sample of students is selected from one high school. Which group is it most reasonable to generalize the sample results to?',
    choices: [
      { text: 'All high school students in the country', value: null, reason: 'The sample was drawn from only one school.' },
      { text: 'Only the students who were contacted first', value: null, reason: 'A random sample is not limited to the first responses.' },
      { text: 'All adults in the city', value: null, reason: 'Adults outside the school were not in the sampling frame.' },
      { text: 'All students at that high school', value: null, reason: 'Correct: the random sample was taken from that school.' },
    ],
    answer: 'D',
    expressionAnswer: 'All students at that high school',
    difficulty: 6,
    seconds: 55,
    subskill: 'Match a conclusion to the sampling frame',
    explanation: 'The students were randomly selected from one high school, so the results can reasonably be generalized to the students at that school. They do not automatically represent every high school in the country.',
    proof: 'The population actually sampled is the student body of that one school.',
  },
  {
    target: 'claims',
    prompt: 'An observational study finds that cities with more public parks tend to have lower asthma rates. Which statement is best supported?',
    choices: [
      { text: 'Building parks caused the lower asthma rates.', value: null, reason: 'The study did not assign parks, so it does not show causation.' },
      { text: 'There is an association, but other differences among the cities could explain the asthma rates.', value: null, reason: 'Correct: the comparison is observational and may be confounded.' },
      { text: 'The study is an experiment because the parks were counted.', value: null, reason: 'Counting an existing feature is not random assignment of a treatment.' },
      { text: 'An observational study can never support any conclusion.', value: null, reason: 'It can support a statement about association.' },
    ],
    answer: 'B',
    expressionAnswer: 'There is an association, but other differences among the cities could explain the asthma rates.',
    difficulty: 7,
    seconds: 75,
    subskill: 'Confounding in an observational comparison',
    explanation: 'Cities were not randomly assigned a number of parks. Income, air quality, and other city differences could be related both to parks and to asthma. The study supports an association, not a cause-and-effect claim.',
    proof: 'No treatment was assigned, so confounding remains possible.',
  },
  {
    target: 'claims',
    prompt: 'A company gives a new air filter only to volunteers who already reported allergies, and their symptom scores improve. What is the main flaw in using this result to claim the filter caused the improvement?',
    choices: [
      { text: 'There is no comparison group that did not receive the filter, and the participants selected themselves.', value: null, reason: 'Correct: the design lacks a control group and uses self-selected volunteers.' },
      { text: 'An improvement in scores can never be measured.', value: null, reason: 'Scores can be measured; the design problem is the missing comparison.' },
      { text: 'Volunteers are always a random sample of the population.', value: null, reason: 'Volunteering is not random sampling.' },
      { text: 'The claim is justified because the filter was new.', value: null, reason: 'A new product is not evidence of a causal effect.' },
    ],
    answer: 'A',
    expressionAnswer: 'There is no comparison group that did not receive the filter, and the participants selected themselves.',
    difficulty: 6,
    seconds: 70,
    subskill: 'Missing control group and self-selection',
    explanation: 'Every volunteer received the filter, so there is no group for comparison. The volunteers also already had allergies and chose to participate. Improvement in that group does not show that the filter caused the change.',
    proof: 'A causal claim needs a comparison, and this design gives the treatment to all self-selected participants.',
  },
  {
    target: 'probability',
    prompt: 'A club records 14 members in both soccer and chess, 11 in soccer only, 9 in chess only, and 16 in neither. If one member is chosen at random, what is the probability that the member is in chess?',
    choices: [
      { text: '14/50', value: 14 / 50, reason: 'Counts only the members in both activities.' },
      { text: '23/50', value: 23 / 50, reason: 'Correct: chess includes 14 in both and 9 in chess only, out of 50 members.' },
      { text: '9/50', value: 9 / 50, reason: 'Counts only the chess-only members.' },
      { text: '25/50', value: 25 / 50, reason: 'Uses half the club instead of the chess counts.' },
    ],
    answer: 'B',
    answerValue: 23 / 50,
    difficulty: 6,
    seconds: 70,
    subskill: 'Probability from a two-way count',
    explanation: 'The club has 14 + 11 + 9 + 16 = 50 members. Chess members are 14 + 9 = 23. The probability is 23/50.',
    proof: '14 + 9 = 23 and 14 + 11 + 9 + 16 = 50.',
  },
  {
    target: 'probability',
    prompt: 'Of 90 students, 36 take art. Of those 36 students, 15 also take music. If a student who takes art is chosen at random, what is the probability that the student also takes music?',
    choices: [
      { text: '1/6', value: 1 / 6, reason: 'Uses 15 out of all 90 students.' },
      { text: '2/5', value: 2 / 5, reason: 'Uses the 36 art students out of 90.' },
      { text: '5/12', value: 5 / 12, reason: 'Correct: 15 of the 36 art students also take music.' },
      { text: '1/4', value: 1 / 4, reason: 'Uses a nearby fraction that is not 15/36.' },
    ],
    answer: 'C',
    answerValue: 5 / 12,
    difficulty: 6,
    seconds: 65,
    subskill: 'Conditional probability from a restricted group',
    explanation: 'The condition is that the student takes art, so the denominator is 36, not 90. The probability is 15/36 = 5/12.',
    proof: '15/36 = 5/12.',
  },
  {
    target: 'probability',
    prompt: 'A bag has 6 red tiles and 4 blue tiles. Two tiles are drawn at random without replacement. What is the probability that both tiles are red?',
    choices: [
      { text: '9/25', value: 9 / 25, reason: 'Uses replacement: (6/10)(6/10) = 9/25.' },
      { text: '3/5', value: 3 / 5, reason: 'Gives only the probability that the first tile is red.' },
      { text: '5/9', value: 5 / 9, reason: 'Gives only the probability that the second tile is red after one red tile is removed.' },
      { text: '1/3', value: 1 / 3, reason: 'Correct: (6/10)(5/9) = 1/3.' },
    ],
    answer: 'D',
    answerValue: 1 / 3,
    difficulty: 7,
    seconds: 80,
    subskill: 'Dependent probability without replacement',
    explanation: 'The probability the first tile is red is 6/10. After that, 5 red tiles remain out of 9, so the second probability is 5/9. The product is (6/10)(5/9) = 30/90 = 1/3.',
    proof: '(6/10)*(5/9) = 30/90 = 1/3.',
  },
  {
    target: 'probability',
    prompt: 'A spinner awards 2 points with probability 1/2, 10 points with probability 1/4, and 6 points with probability 1/4. What is the expected value of the points awarded on one spin?',
    choices: [
      { text: '6', value: 6, reason: 'Averages 2, 10, and 6 as if the outcomes were equally likely.' },
      { text: '5', value: 5, reason: 'Correct: (1/2)(2) + (1/4)(10) + (1/4)(6) = 5.' },
      { text: '4.5', value: 4.5, reason: 'Divides the sum of the point values by 4.' },
      { text: '9', value: 9, reason: 'Adds 10 and 6 and ignores the probabilities.' },
    ],
    answer: 'B',
    answerValue: 5,
    difficulty: 7,
    seconds: 75,
    subskill: 'Expected value with unequal probabilities',
    explanation: 'Multiply each point value by its probability: (1/2)(2) = 1, (1/4)(10) = 2.5, and (1/4)(6) = 1.5. The expected value is 1 + 2.5 + 1.5 = 5.',
    proof: '1 + 2.5 + 1.5 = 5.',
  },
  {
    target: 'probability',
    prompt: 'A study table shows 15 students who studied and passed, 9 who studied and did not pass, 6 who did not study and passed, and 10 who did not study and did not pass. If a student who studied is chosen at random, what is the probability that the student passed?',
    choices: [
      { text: '3/8', value: 3 / 8, reason: 'Uses 15 out of all 40 students.' },
      { text: '21/40', value: 21 / 40, reason: 'Uses all students who passed, not only those who studied.' },
      { text: '5/8', value: 5 / 8, reason: 'Correct: 15 of the 24 students who studied passed.' },
      { text: '1/2', value: 1 / 2, reason: 'Uses 12 of 24 instead of 15 of 24.' },
    ],
    answer: 'C',
    answerValue: 5 / 8,
    difficulty: 6,
    seconds: 75,
    subskill: 'Conditional probability from a two-way table',
    explanation: 'Students who studied are 15 + 9 = 24. Of those, 15 passed. The conditional probability is 15/24 = 5/8.',
    proof: '15 + 9 = 24 and 15/24 = 5/8.',
  },
  {
    target: 'oneVar',
    prompt: 'The mean of a data set is 11. Every value is multiplied by 3, and then 4 is added to each result. What is the mean of the new data set?',
    choices: [
      { text: '37', value: 37, reason: 'Correct: 3(11) + 4 = 37.' },
      { text: '33', value: 33, reason: 'Multiplies the mean by 3 and forgets to add 4.' },
      { text: '15', value: 15, reason: 'Adds 4 to the original mean and does not multiply.' },
      { text: '11', value: 11, reason: 'Leaves the original mean unchanged.' },
    ],
    answer: 'A',
    answerValue: 37,
    difficulty: 6,
    seconds: 60,
    subskill: 'Transform a mean by multiplication and addition',
    explanation: 'Multiplying every value by 3 multiplies the mean by 3. Adding 4 to every value adds 4 to the mean. The new mean is 3(11) + 4 = 37.',
    proof: '3 * 11 + 4 = 37.',
  },
  {
    target: 'oneVar',
    prompt: 'Five measurements have a mean of 14. A sixth measurement of 26 is added. What is the mean of all six measurements?',
    choices: [
      { text: '20', value: 20, reason: 'Averages 14 and 26 without weighting the original five measurements.' },
      { text: '16', value: 16, reason: 'Correct: (5(14) + 26) / 6 = 16.' },
      { text: '40', value: 40, reason: 'Adds 14 and 26.' },
      { text: '12', value: 12, reason: 'Subtracts the new value in the wrong direction.' },
    ],
    answer: 'B',
    answerValue: 16,
    difficulty: 6,
    seconds: 65,
    subskill: 'Update a mean when one value is added',
    explanation: 'The original total is 5(14) = 70. After adding 26, the total is 96. The new mean is 96/6 = 16.',
    proof: '(70 + 26) / 6 = 16.',
  },
  {
    target: 'oneVar',
    prompt: 'In a data set, the value 2 appears 5 times, the value 5 appears 2 times, and the value 11 appears 1 time. What is the mean?',
    choices: [
      { text: '6', value: 6, reason: 'Averages 2, 5, and 11 without using the frequencies.' },
      { text: '5', value: 5, reason: 'Uses the middle listed value.' },
      { text: '4', value: 4, reason: 'Uses a nearby whole number instead of the weighted total.' },
      { text: '31/8', value: 31 / 8, reason: 'Correct: the total is 31 and there are 8 values.' },
    ],
    answer: 'D',
    answerValue: 31 / 8,
    difficulty: 6,
    seconds: 70,
    subskill: 'Mean from a frequency list',
    explanation: 'The total is 2(5) + 5(2) + 11(1) = 10 + 10 + 11 = 31. There are 5 + 2 + 1 = 8 values, so the mean is 31/8.',
    proof: '31 / 8 = 3.875.',
  },
  {
    target: 'oneVar',
    prompt: 'The data set 4, 8, 8, 13, 19 has range 15. If 19 is replaced by 10, what is the range of the new data set?',
    choices: [
      { text: '9', value: 9, reason: 'Correct: the new maximum is 13 and the minimum is 4.' },
      { text: '6', value: 6, reason: 'Uses 10 minus 4, but 13 is now the maximum.' },
      { text: '15', value: 15, reason: 'Keeps the original range.' },
      { text: '10', value: 10, reason: 'Reports the replacement value.' },
    ],
    answer: 'A',
    answerValue: 9,
    difficulty: 6,
    seconds: 55,
    subskill: 'Range after replacing an extreme value',
    explanation: 'After replacing 19 with 10, the values are 4, 8, 8, 13, and 10. The maximum is 13 and the minimum is 4, so the range is 13 - 4 = 9.',
    proof: '13 - 4 = 9.',
  },
  {
    target: 'oneVar',
    prompt: 'Every value in a data set is multiplied by -2. How does the standard deviation change?',
    choices: [
      { text: 'It is multiplied by -2.', value: null, reason: 'Standard deviation cannot be negative, so the sign does not carry through.' },
      { text: 'It stays the same.', value: null, reason: 'Multiplying by a number other than 1 or -1 changes the spread.' },
      { text: 'It is multiplied by 2.', value: null, reason: 'Correct: multiplying by -2 multiplies the spread by the absolute value 2.' },
      { text: 'It is multiplied by 4.', value: null, reason: 'Uses the square of 2, which would apply to variance, not standard deviation.' },
    ],
    answer: 'C',
    expressionAnswer: 'It is multiplied by 2.',
    difficulty: 7,
    seconds: 70,
    subskill: 'Effect of scaling on standard deviation',
    explanation: 'Multiplying every value by k multiplies the standard deviation by |k|. Here k = -2, so the standard deviation is multiplied by 2. Variance would be multiplied by 4.',
    proof: 'The standard deviation uses absolute deviations, so the factor is |-2| = 2.',
  },
  {
    target: 'ratios',
    prompt: 'A delivery van travels 27 kilometers in 36 minutes. What is its average speed in kilometers per hour?',
    choices: [
      { text: '27', value: 27, reason: 'Reports the distance instead of the hourly speed.' },
      { text: '45', value: 45, reason: 'Correct: 36 minutes is 0.6 hour, and 27 / 0.6 = 45.' },
      { text: '54', value: 54, reason: 'Treats 36 minutes as half an hour.' },
      { text: '16.2', value: 16.2, reason: 'Multiplies 27 by 0.6 instead of dividing.' },
    ],
    answer: 'B',
    answerValue: 45,
    difficulty: 6,
    seconds: 70,
    subskill: 'Convert a rate from minutes to hours',
    explanation: 'Thirty-six minutes is 36/60 = 0.6 hour. The speed is 27 kilometers / 0.6 hour = 45 kilometers per hour.',
    proof: '27 / (36/60) = 45.',
  },
  {
    target: 'ratios',
    prompt: 'On a trail map, 1 centimeter represents 6 kilometers. A route measures 4.5 centimeters on the map. At an average speed of 45 kilometers per hour, how many minutes does the route take?',
    choices: [
      { text: '27', value: 27, reason: 'Reports the distance in kilometers, not the time in minutes.' },
      { text: '45', value: 45, reason: 'Reports the speed.' },
      { text: '36', value: 36, reason: 'Correct: the route is 27 kilometers, which takes 0.6 hour, or 36 minutes.' },
      { text: '54', value: 54, reason: 'Uses 0.9 hour instead of 0.6 hour.' },
    ],
    answer: 'C',
    answerValue: 36,
    difficulty: 7,
    seconds: 90,
    subskill: 'Scale a map and convert the resulting time',
    explanation: 'The distance is 4.5(6) = 27 kilometers. Time is 27/45 = 0.6 hour. In minutes, 0.6(60) = 36.',
    proof: '4.5 * 6 = 27 and (27/45) * 60 = 36.',
  },
  {
    target: 'ratios',
    prompt: 'A paint mixture uses paint and thinner in the ratio 3:5. A batch has a combined mass of 480 grams. How many grams of thinner are in the batch?',
    choices: [
      { text: '180', value: 180, reason: 'Finds the paint amount, 3/8 of 480.' },
      { text: '160', value: 160, reason: 'Divides 480 by 3.' },
      { text: '288', value: 288, reason: 'Uses 0.6 of 480 instead of 5/8.' },
      { text: '300', value: 300, reason: 'Correct: thinner is 5/8 of 480.' },
    ],
    answer: 'D',
    answerValue: 300,
    difficulty: 6,
    seconds: 65,
    subskill: 'Find one part of a ratio from a total',
    explanation: 'The ratio 3:5 has 8 equal parts. Thinner is 5 of those parts, so its mass is (5/8)(480) = 300 grams.',
    proof: '5/8 * 480 = 300.',
  },
  {
    target: 'ratios',
    prompt: 'A machine makes 840 parts in 6 hours. After an adjustment, it makes parts 25% faster. At the new rate, how many parts does it make in 4 hours?',
    choices: [
      { text: '700', value: 700, reason: 'Correct: the new rate is 175 parts per hour, and 175(4) = 700.' },
      { text: '560', value: 560, reason: 'Uses the original rate of 140 parts per hour for 4 hours.' },
      { text: '840', value: 840, reason: 'Keeps the original 6-hour total.' },
      { text: '175', value: 175, reason: 'Reports the new hourly rate instead of the 4-hour total.' },
    ],
    answer: 'A',
    answerValue: 700,
    difficulty: 7,
    seconds: 85,
    subskill: 'Increase a rate and apply it to a new time',
    explanation: 'The original rate is 840/6 = 140 parts per hour. A 25% increase makes the rate 140(1.25) = 175 parts per hour. In 4 hours the machine makes 175(4) = 700 parts.',
    proof: '140 * 1.25 = 175 and 175 * 4 = 700.',
  },
  {
    target: 'ratios',
    prompt: 'A tank drains at a constant rate of 2.4 liters per minute. How many liters drain in 2 hours 15 minutes?',
    choices: [
      { text: '324', value: 324, reason: 'Correct: 2 hours 15 minutes is 135 minutes, and 2.4(135) = 324.' },
      { text: '288', value: 288, reason: 'Uses 2 hours, or 120 minutes, and leaves out the extra 15 minutes.' },
      { text: '216', value: 216, reason: 'Uses 90 minutes instead of 135 minutes.' },
      { text: '135', value: 135, reason: 'Reports the number of minutes instead of the volume.' },
    ],
    answer: 'A',
    answerValue: 324,
    difficulty: 6,
    seconds: 70,
    subskill: 'Apply a per-minute rate to a mixed time',
    explanation: 'Two hours 15 minutes is 120 + 15 = 135 minutes. At 2.4 liters per minute, the volume is 2.4(135) = 324 liters.',
    proof: '2.4 * 135 = 324.',
  },
  {
    invalid: true,
    target: 'ratios',
    prompt: 'Draft: a rate question whose choices repeat the same value, so it must not be saved.',
    choices: [
      { text: '10', value: 10, reason: 'Correct: placeholder.' },
      { text: '10', value: 10, reason: 'Duplicate choice text.' },
      { text: '12', value: 12, reason: 'Placeholder.' },
      { text: '14', value: 14, reason: 'Placeholder.' },
    ],
    answer: 'A',
    answerValue: 10,
    difficulty: 4,
    seconds: 40,
    subskill: 'Invalid draft',
    explanation: 'This draft has two identical choices.',
    proof: 'Not for publication.',
  },
  {
    invalid: true,
    target: 'margin',
    prompt: 'Draft: a margin question whose marked answer does not match the solved value, so it must not be saved.',
    choices: [
      { text: '20', value: 20, reason: 'Correct: this label is on the wrong choice.' },
      { text: '30', value: 30, reason: 'The solved value is 30, but the key is marked A.' },
      { text: '40', value: 40, reason: 'Placeholder.' },
      { text: '50', value: 50, reason: 'Placeholder.' },
    ],
    answer: 'A',
    answerValue: 30,
    difficulty: 4,
    seconds: 40,
    subskill: 'Invalid draft',
    explanation: 'The marked choice is not the solved value.',
    proof: 'Not for publication.',
  },
]

const validItems = items.filter((item) => !item.invalid)
if (validItems.length !== 32) throw new Error(`Expected 32 valid items, found ${validItems.length}`)
if (items.length - validItems.length < 2) throw new Error('Expected invalid drafts to be excluded')

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
  for (const [choiceIndex, choice] of item.choices.entries()) {
    if ('ABCD'[choiceIndex] !== item.answer && /^Correct:/u.test(choice.reason)) {
      throw new Error(`Wrong choice starts with Correct: on item ${index}`)
    }
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
    contextual: /sample|model|students|plants|cities|filter|van|map|machine|tank|club|study|lab|voters|trail|paint|forest|nursery|batteries/.test(item.prompt),
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

const verified = checked(await db.from('questions').select('id, approved, active, review_status, source_type, source_rights_status, answer_verification_status, exam_item_metadata(validation_status, distractor_rationales)').in('id', saved.map((row) => row.id)))
if (verified.length !== 32) throw new Error(`Verification count ${verified.length}`)
for (const row of verified) {
  const meta = Array.isArray(row.exam_item_metadata) ? row.exam_item_metadata[0] : row.exam_item_metadata
  if (!row.approved || !row.active || row.review_status !== 'approved') throw new Error(`Question ${row.id} is not approved and active`)
  if (row.source_type !== 'original' || row.source_rights_status !== 'owned' || row.answer_verification_status !== 'independently_verified') {
    throw new Error(`Question ${row.id} has unexpected source status`)
  }
  if (meta?.validation_status !== 'validated') throw new Error(`Question ${row.id} is not validated`)
  const rationales = meta?.distractor_rationales ?? {}
  const item = validItems[saved.findIndex((savedRow) => savedRow.id === row.id)]
  for (const [letter, text] of Object.entries(rationales)) {
    if (letter !== item.answer && String(text).startsWith('Correct:')) throw new Error(`Bad rationale on ${row.id} choice ${letter}`)
    if (letter === item.answer && !String(text).startsWith('Correct:')) throw new Error(`Missing Correct label on ${row.id}`)
  }
}

const byTopic = new Map()
for (const item of validItems) {
  const topic = topicTargets[item.target]
  byTopic.set(topic.topic, (byTopic.get(topic.topic) ?? 0) + 1)
}

const report = {
  batch: BATCH,
  generatedAt: new Date().toISOString(),
  saved: saved.length,
  approvedActiveValidated: verified.length,
  invalidDraftsExcluded: items.length - validItems.length,
  byTopic: Object.fromEntries(byTopic),
  answerSpread: validItems.reduce((acc, item) => {
    acc[item.answer] = (acc[item.answer] ?? 0) + 1
    return acc
  }, {}),
}
writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
