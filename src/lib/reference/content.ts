import { DESMOS_STRATEGIES } from '@/lib/desmos/strategies/catalog'
import { ENGLISH_STRATEGIES } from '@/lib/questions/english-strategies'

export type ReferenceCard = {
  title: string
  rule: string
  steps: string[]
  detail: string
  href?: string
}

export const QUICK_TIPS: ReferenceCard[] = [
  {
    title: 'Predict before you look',
    rule: 'Cover the choices, answer in your own words, then match.',
    steps: ['Read the question stem first.', 'Say the answer in plain words.', 'Find the choice that says the same thing.', 'Do not pick a choice just because it uses a passage word.'],
    detail: 'Wrong answers are written to feel familiar. A prediction keeps you from falling for a recycled phrase.',
  },
  {
    title: 'Eliminate hard, then guess once',
    rule: 'Cross out anything you can prove is wrong. Then pick and move.',
    steps: ['Kill extremes and new facts.', 'Kill choices that answer a different question.', 'If two remain, pick the more specific supported one.', 'Mark and move. Do not stare.'],
    detail: 'A 50/50 guess is better than a three-minute stall. Come back only if time is left.',
  },
  {
    title: 'Plug in numbers on variables',
    rule: 'If the answer choices are expressions in a variable, pick an easy number.',
    steps: ['Pick a legal value (avoid 0, 1, and the same number twice).', 'Evaluate the original story with that number.', 'Test each choice with the same number.', 'The choice that matches is right. Recheck if two match.'],
    detail: 'This turns abstract algebra into arithmetic and catches setup mistakes.',
  },
  {
    title: 'Backsolve from the choices',
    rule: 'If choices are nice numbers, start with B or C and test.',
    steps: ['Start in the middle choice.', 'Plug it into the story.', 'If too small or too big, you know which way to go.', 'Stop at the first choice that works.'],
    detail: 'Faster than writing the equation when the question is “which value.”',
  },
  {
    title: 'Name what the question wants',
    rule: 'Circle the requested quantity before you compute.',
    steps: ['Underline “what is the value of…”', 'Note units, x vs y, area vs side, mean vs median.', 'Do the work.', 'Check you reported the asked quantity, not the first number you found.'],
    detail: 'Hard questions often hide a last conversion. Students solve for x and the question wanted 2x.',
  },
  {
    title: 'Skip the time sink',
    rule: 'If you have no start after 20 seconds, mark it and leave.',
    steps: ['Try one clean setup.', 'If you are rewriting the same line, skip.', 'Answer easier items to bank points.', 'Return with leftover time.'],
    detail: 'SAT and ACT both reward completed easy items more than a heroic miss on one hard item.',
  },
]

export const DESMOS_TRICKS: ReferenceCard[] = DESMOS_STRATEGIES.filter((item) => item.approved).map((item) => ({
  title: item.title,
  rule: item.recognition_rule,
  steps: item.student_steps,
  detail: `${item.when_to_use} Type: ${item.desmos_input_template.join('  ·  ')}`,
  href: `/desmos/${item.slug}`,
}))

const VOCAB_FROM_ENGLISH: ReferenceCard[] = ENGLISH_STRATEGIES.map((item) => ({
  title: item.title,
  rule: item.recognition_rule,
  steps: item.student_steps,
  detail: `${item.when_to_use} ${item.example}`,
}))

export const VOCABULARY_TRICKS: ReferenceCard[] = [
  {
    title: 'Context beats the flashcard definition',
    rule: 'The SAT/ACT meaning is the one that keeps the sentence true.',
    steps: ['Cover the word.', 'Read the full sentence and the one before it.', 'Invent a simple synonym that fits the tone.', 'Pick the choice closest to your synonym, not the rarest dictionary sense.'],
    detail: '“Qualify” often means “limit,” not “be eligible.” “Reservations” often means “doubts.”',
  },
  {
    title: 'Split prefix, root, and suffix',
    rule: 'Unknown word → cut it into pieces, then test the sentence.',
    steps: ['Mark un-, in-, re-, -tion, -able, -ous.', 'Guess the family (not, again, full of, able to).', 'Plug that family into the sentence.', 'Drop choices that break tone or logic.'],
    detail: 'untenable = un + tenable = cannot be held, so “cannot be defended.”',
  },
  {
    title: 'Tone words are the real test',
    rule: 'If the passage is critical, the blank is not “admiring.”',
    steps: ['Label the author’s attitude: positive, negative, or mixed.', 'Cross choices with the opposite charge.', 'Prefer precise words over dramatic ones.', 'Check that the sentence still makes sense aloud.'],
    detail: 'A scholar who “questions” a theory is skeptical, not “dismissive,” unless the text attacks it.',
  },
  {
    title: 'Signal words tell you the job',
    rule: 'However, therefore, for example, and indeed each do one job.',
    steps: ['Cover the transition.', 'Say how sentence 2 treats sentence 1.', 'Name the job: contrast, cause, example, or add-on.', 'Pick the transition that names that job.'],
    detail: 'If sentence 2 reverses sentence 1, you need however or instead, not therefore.',
  },
  {
    title: 'Eliminate the extra meaning',
    rule: 'Wrong vocab choices add a fact the sentence never earned.',
    steps: ['Ask what must be true for the sentence to work.', 'Cut words that change who did what.', 'Cut words that are too strong (always, never, unique).', 'Keep the smallest meaning that fits.'],
    detail: 'If a result is “surprising,” do not upgrade it to “impossible.”',
  },
  {
    title: 'Pairs and opposites',
    rule: 'A blank next to but, although, or rather wants the opposite of the nearby idea.',
    steps: ['Find the contrast word.', 'Name the idea on the other side.', 'The blank is the reverse (or a concession).', 'Match charge and intensity.'],
    detail: '“Although the plan was ____, the team stayed optimistic” wants a negative word.',
  },
  {
    title: 'ACT English: shortest correct sentence',
    rule: 'If two choices are grammatical, the shorter one usually wins.',
    steps: ['Drop repeated ideas (“past history,” “each and every”).', 'Keep required grammar.', 'Prefer DELETE / OMIT when the extra words add nothing.', 'Reread the sentence with your choice only.'],
    detail: 'Redundancy is the most common ACT English trap.',
  },
  ...VOCAB_FROM_ENGLISH,
]

export type FormulaGroup = {
  title: string
  note?: string
  items: Array<{ name: string; formula: string }>
}

export const MATH_FORMULAS: FormulaGroup[] = [
  {
    title: 'Lines and coordinates',
    items: [
      { name: 'Slope', formula: 'm = (y₂ − y₁) / (x₂ − x₁)' },
      { name: 'Slope-intercept', formula: 'y = mx + b' },
      { name: 'Point-slope', formula: 'y − y₁ = m(x − x₁)' },
      { name: 'Standard form', formula: 'Ax + By = C' },
      { name: 'Parallel lines', formula: 'Equal slopes' },
      { name: 'Perpendicular lines', formula: 'Slopes are negative reciprocals: m₂ = −1/m₁' },
      { name: 'Midpoint', formula: '((x₁ + x₂)/2, (y₁ + y₂)/2)' },
      { name: 'Distance', formula: '√[(x₂ − x₁)² + (y₂ − y₁)²]' },
      { name: 'Horizontal line', formula: 'y = k, slope 0' },
      { name: 'Vertical line', formula: 'x = k, undefined slope' },
    ],
  },
  {
    title: 'Quadratics and polynomials',
    items: [
      { name: 'Standard form', formula: 'y = ax² + bx + c' },
      { name: 'Vertex form', formula: 'y = a(x − h)² + k, vertex (h, k)' },
      { name: 'Factored form', formula: 'y = a(x − r₁)(x − r₂)' },
      { name: 'Axis of symmetry', formula: 'x = −b / (2a)' },
      { name: 'Quadratic formula', formula: 'x = [−b ± √(b² − 4ac)] / (2a)' },
      { name: 'Discriminant', formula: 'D = b² − 4ac → 2, 1, or 0 real roots' },
      { name: 'Sum of roots', formula: 'r₁ + r₂ = −b/a' },
      { name: 'Product of roots', formula: 'r₁ · r₂ = c/a' },
      { name: 'Difference of squares', formula: 'a² − b² = (a − b)(a + b)' },
      { name: 'Perfect square', formula: '(a ± b)² = a² ± 2ab + b²' },
      { name: 'Remainder theorem', formula: 'p(a) is the remainder when p(x) is divided by (x − a)' },
    ],
  },
  {
    title: 'Exponents, radicals, and exponentials',
    items: [
      { name: 'Product', formula: 'aᵐ · aⁿ = aᵐ⁺ⁿ' },
      { name: 'Quotient', formula: 'aᵐ / aⁿ = aᵐ⁻ⁿ' },
      { name: 'Power of a power', formula: '(aᵐ)ⁿ = aᵐⁿ' },
      { name: 'Power of a product', formula: '(ab)ⁿ = aⁿbⁿ' },
      { name: 'Zero and negative', formula: 'a⁰ = 1, a⁻ⁿ = 1/aⁿ' },
      { name: 'Fractional', formula: 'aᵐ/ⁿ = ⁿ√(aᵐ)' },
      { name: 'Radical product', formula: '√a · √b = √(ab)' },
      { name: 'Exponential growth', formula: 'A = P(1 + r)ᵗ' },
      { name: 'Exponential decay', formula: 'A = P(1 − r)ᵗ' },
      { name: 'Compound interest', formula: 'A = P(1 + r/n)ⁿᵗ' },
    ],
  },
  {
    title: 'Percent, ratio, and rates',
    items: [
      { name: 'Percent', formula: 'part = percent × whole' },
      { name: 'Percent change', formula: '(new − old) / old × 100%' },
      { name: 'Percent of a percent', formula: 'Convert each to a decimal, then multiply' },
      { name: 'Ratio', formula: 'a:b = a/b' },
      { name: 'Direct variation', formula: 'y = kx' },
      { name: 'Inverse variation', formula: 'y = k/x' },
      { name: 'Average rate', formula: 'total distance / total time (not the mean of the speeds)' },
      { name: 'Work rate', formula: '1/t₁ + 1/t₂ = 1/t_together' },
      { name: 'Density', formula: 'density = mass / volume' },
    ],
  },
  {
    title: 'Statistics and probability',
    items: [
      { name: 'Mean', formula: 'sum of values / count' },
      { name: 'Median', formula: 'middle value when ordered' },
      { name: 'Mode', formula: 'most frequent value' },
      { name: 'Range', formula: 'max − min' },
      { name: 'IQR', formula: 'Q₃ − Q₁' },
      { name: 'Outlier fence', formula: 'below Q₁ − 1.5·IQR or above Q₃ + 1.5·IQR' },
      { name: 'Probability', formula: 'P = favorable / total equally likely outcomes' },
      { name: 'Complement', formula: 'P(not A) = 1 − P(A)' },
      { name: 'Independent events', formula: 'P(A and B) = P(A)·P(B)' },
      { name: 'Mutually exclusive', formula: 'P(A or B) = P(A) + P(B)' },
      { name: 'Combinations', formula: 'nCr = n! / [r!(n − r)!]' },
      { name: 'Permutations', formula: 'nPr = n! / (n − r)!' },
      { name: 'Expected value', formula: 'Σ (value × probability)' },
    ],
  },
  {
    title: 'Geometry — length and area',
    note: 'The digital SAT reference sheet includes several of these. Still know them cold so you do not hunt during a hard item.',
    items: [
      { name: 'Rectangle area', formula: 'A = lw' },
      { name: 'Triangle area', formula: 'A = ½bh' },
      { name: 'Circle area', formula: 'A = πr²' },
      { name: 'Circumference', formula: 'C = 2πr = πd' },
      { name: 'Parallelogram', formula: 'A = bh' },
      { name: 'Trapezoid', formula: 'A = ½(b₁ + b₂)h' },
      { name: 'Regular polygon', formula: 'A = ½ · perimeter · apothem' },
      { name: 'Arc length', formula: '(θ/360) · 2πr  or  θr in radians' },
      { name: 'Sector area', formula: '(θ/360) · πr²' },
      { name: 'Similar figures', formula: 'area scale = (side scale)²' },
    ],
  },
  {
    title: 'Geometry — 3D, angles, and triangles',
    items: [
      { name: 'Rectangular prism volume', formula: 'V = lwh' },
      { name: 'Cylinder', formula: 'V = πr²h' },
      { name: 'Sphere volume', formula: 'V = ⁴⁄₃πr³' },
      { name: 'Sphere surface', formula: 'S = 4πr²' },
      { name: 'Cone', formula: 'V = ⅓πr²h' },
      { name: 'Pyramid', formula: 'V = ⅓Bh' },
      { name: 'Pythagorean theorem', formula: 'a² + b² = c²' },
      { name: '45-45-90', formula: 'legs x, x ; hypotenuse x√2' },
      { name: '30-60-90', formula: 'sides x, x√3, 2x' },
      { name: 'Interior angle sum', formula: '(n − 2) · 180°' },
      { name: 'Circle equation', formula: '(x − h)² + (y − k)² = r²' },
      { name: 'Similar triangles', formula: 'Matching angles; sides in the same ratio' },
      { name: 'Volume scale', formula: 'volume scale = (side scale)³' },
    ],
  },
  {
    title: 'Trigonometry (SAT + ACT)',
    items: [
      { name: 'Sine', formula: 'sin θ = opposite / hypotenuse' },
      { name: 'Cosine', formula: 'cos θ = adjacent / hypotenuse' },
      { name: 'Tangent', formula: 'tan θ = opposite / adjacent' },
      { name: 'Reciprocals', formula: 'csc = 1/sin, sec = 1/cos, cot = 1/tan' },
      { name: 'Identity', formula: 'sin²θ + cos²θ = 1' },
      { name: 'Degrees to radians', formula: 'radians = degrees · π/180' },
      { name: 'Law of sines', formula: 'a/sin A = b/sin B = c/sin C' },
      { name: 'Law of cosines', formula: 'c² = a² + b² − 2ab cos C' },
      { name: 'Desmos note', formula: 'Set degree mode on SAT/ACT angle items before you type sin, cos, or tan.' },
    ],
  },
  {
    title: 'Sequences, functions, and extras',
    items: [
      { name: 'Arithmetic sequence', formula: 'aₙ = a₁ + (n − 1)d' },
      { name: 'Arithmetic sum', formula: 'Sₙ = n/2 · (a₁ + aₙ)' },
      { name: 'Geometric sequence', formula: 'aₙ = a₁ · rⁿ⁻¹' },
      { name: 'Geometric sum', formula: 'Sₙ = a₁(1 − rⁿ) / (1 − r), r ≠ 1' },
      { name: 'Function notation', formula: 'f(a) means plug x = a into f' },
      { name: 'Composition', formula: '(f ∘ g)(x) = f(g(x))' },
      { name: 'Inverse functions', formula: 'Swap x and y, then solve. Graphs reflect over y = x.' },
      { name: 'Absolute value', formula: '|x| = x if x ≥ 0, −x if x < 0' },
      { name: 'Complex numbers', formula: 'i² = −1, (a + bi)(c + di) = ac − bd + (ad + bc)i' },
      { name: 'Average of a function on a table', formula: 'Use the outputs, not the inputs, unless asked for x.' },
    ],
  },
]

export const HARD_QUESTION_TIPS: ReferenceCard[] = [
  {
    title: 'Translate the story into one equation',
    rule: 'Hard word problems are easy equations hiding in English.',
    steps: ['Name one variable.', 'Write every sentence as math.', 'Watch “of,” “less than,” and “per.”', 'Solve, then answer the asked quantity.'],
    detail: '“5 less than twice n” is 2n − 5, not 5 − 2n.',
  },
  {
    title: 'Systems: intersection, not intercept',
    rule: 'Two equations → the shared point, not where one line hits an axis.',
    steps: ['Graph both in Desmos or substitute.', 'Read the crossing.', 'Check which coordinate the question wants.', 'If lines never meet, no solution. If they are the same line, infinitely many.'],
    detail: 'A common trap is reporting a y-intercept because it is labeled.',
  },
  {
    title: 'Functions on a graph',
    rule: 'f(a) is the y-value at x = a. f(x) = b asks for the x that produces b.',
    steps: ['Decide if you are given x or y.', 'Move vertically for an input, horizontally for an output.', 'For f(g(a)), do the inside graph first.', 'For inverses, swap the coordinates.'],
    detail: 'If the graph of f goes through (2, 5), then f(2) = 5 and f⁻¹(5) = 2.',
  },
  {
    title: 'Student-produced responses',
    rule: 'Grid exactly what they asked. Fractions and decimals are both fine when equivalent.',
    steps: ['Do not grid a mixed number as 1½. Use 3/2 or 1.5.', 'If a range is allowed, any correct value works.', 'Negative signs and decimals must be in the right slots.', 'Reread units.'],
    detail: 'The machine does not award method points. The bubbled value has to match.',
  },
  {
    title: 'Reading: the line must support it',
    rule: 'Hard reading items punish extra assumptions.',
    steps: ['Find the cited lines plus one sentence of context.', 'Ask what those lines force.', 'Cut choices that need outside knowledge.', 'Cut choices that are true of the world but not of this passage.'],
    detail: '“The author implies” still has to be proven by the text.',
  },
  {
    title: 'ACT Science: read the figure, not the paragraph first',
    rule: 'Most points sit in the table or graph.',
    steps: ['Read the title and axis units.', 'Find the exact trial, temperature, or year named.', 'Compare only the series the question named.', 'Use the passage only when the figure cannot answer it.'],
    detail: 'A neighboring column is the usual trap.',
  },
  {
    title: 'Inequalities and absolute value',
    rule: 'Flip the inequality when you multiply or divide by a negative.',
    steps: ['Isolate the variable carefully.', 'For |x| < a, use −a < x < a.', 'For |x| > a, use x < −a or x > a.', 'Graph on a number line if the choices are intervals.'],
    detail: 'Shading in Desmos is faster when two inequalities must both be true.',
  },
  {
    title: 'Data and scatterplots',
    rule: 'A strong r does not prove cause. An outlier can move the line.',
    steps: ['Name the axes.', 'Read slope as “for each extra x, y changes by m.”', 'Use the line, not a stray point, for a prediction.', 'If asked for a residual, it is actual − predicted.'],
    detail: 'The SAT loves “association, not causation” wording.',
  },
  {
    title: 'Calculator last mile',
    rule: 'Desmos finds the number. You still have to interpret it.',
    steps: ['Type the expression exactly.', 'Read the point of interest, not a nearby intercept.', 'Convert to the asked form (percent, integer, coordinate).', 'Estimate first so a window error is obvious.'],
    detail: 'If the graph looks empty, zoom out before you redo the algebra.',
  },
  {
    title: 'Pacing snapshot',
    rule: 'Leave no easy point on the table.',
    steps: ['SAT Math: keep moving; later items are often harder.', 'SAT Reading and Writing: short passages, one question each — do not reread the whole text for one blank.', 'ACT English: about 36 seconds per item.', 'ACT Math: skip long geometry until the end if you are slow there.', 'ACT Science: figures first.', 'ACT Reading: one passage you hate can wait until last.'],
    detail: 'Finished + guessed beats unfinished + perfect on the first half.',
  },
]
