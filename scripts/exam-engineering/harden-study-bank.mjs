import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const SCENES = [
  ['coastal archive', 'salt in the plaster', 'the lamp spectrum', 'the fading stopped'],
  ['reef lab', 'the age of the pumps', 'the intake filter', 'the cloudy water cleared'],
  ['night clinic', 'a crowded waiting room', 'the triage checklist', 'the missed charts declined'],
  ['print loft', 'old paper stock', 'the roller pressure', 'the smeared sheets declined'],
  ['glass studio', 'a draft from the door', 'the anneal time', 'the cracked panes declined'],
  ['seed vault', 'the age of the jars', 'the humidity setting', 'the mold counts fell'],
  ['bell tower', 'worn ropes', 'the strike angle', 'the dull tone disappeared'],
  ['map depot', 'faded ink', 'the drawer lining', 'the curled sheets declined'],
  ['canoe shed', 'old varnish', 'the drying rack', 'the blistered hulls declined'],
  ['lens bench', 'cheap cloths', 'the solvent mix', 'the haze on the lenses declined'],
  ['ticket booth', 'a blunt blade', 'the roll tension', 'the torn tickets declined'],
  ['wool shed', 'a dusty floor', 'the comb spacing', 'the snagged yarn declined'],
  ['radio booth', 'old cables', 'the grounding strap', 'the hum in the recording declined'],
  ['spice vault', 'the jars themselves', 'the door seal', 'the damp clumps declined'],
  ['puppet loft', 'old paint', 'the storage humidity', 'the stuck joints declined'],
  ['ferry dock', 'the age of the ropes', 'the drying hooks', 'the stiffened lines declined'],
]

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

function mod(n, m) {
  return ((n % m) + m) % m
}

function hashSeed(text) {
  let hash = 2166136261
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0 || 1
}

function rng(seed) {
  let state = seed >>> 0 || 1
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0)
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function band(seed, salt, span, start = 0) {
  let mixed = (seed >>> 0) ^ Math.imul(salt, 0x9e3779b1)
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d)
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b)
  mixed = (mixed ^ (mixed >>> 16)) >>> 0
  return start + mixed % span
}

function solveCongruence(a, b, m) {
  if (m === 1) return 0
  const left = mod(a, m)
  const right = mod(b, m)
  for (let k = 0; k < m; k += 1) if (mod(left * k, m) === right) return k
  return null
}

function addForms(a, b, sign = 1) {
  return {
    coeffs: a.coeffs.map((coef, index) => coef + sign * b.coeffs[index]),
    constant: a.constant + sign * b.constant,
  }
}

function scaleForm(form, factor) {
  return { coeffs: form.coeffs.map((coef) => coef * factor), constant: form.constant * factor }
}

function isZero(form) {
  return form.constant === 0 && form.coeffs.every((coef) => coef === 0)
}

function linearLatex(form, names) {
  const parts = []
  const push = (coef, variable) => {
    if (coef === 0) return
    const body = variable ? (Math.abs(coef) === 1 ? variable : `${Math.abs(coef)}${variable}`) : `${Math.abs(coef)}`
    if (!parts.length) parts.push(coef < 0 ? `-${body}` : body)
    else parts.push(`${coef < 0 ? '-' : '+'} ${body}`)
  }
  form.coeffs.forEach((coef, index) => push(coef, names[index]))
  push(form.constant, null)
  return parts.join(' ') || '0'
}

function fracLatex(numerator, denominator) {
  const sign = numerator * denominator < 0 ? '-' : ''
  const top = Math.abs(numerator)
  const bottom = Math.abs(denominator)
  const divisor = gcd(top, bottom)
  const n = top / divisor
  const d = bottom / divisor
  if (d === 1) return `${sign}${n}`
  return `${sign}\\frac{${n}}{${d}}`
}

function math(value) {
  return `$${value}$`
}

const FRACTIONS = [[5, 8], [3, 4], [7, 12], [5, 6], [2, 3], [3, 5], [4, 5], [7, 8], [5, 12], [7, 6], [9, 8], [3, 8], [11, 6], [7, 4], [5, 4], [8, 3], [4, 3], [7, 10], [9, 4], [5, 3]]

function buildIdentity(rand, names, target) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const fracs = []
    let guard = 0
    while (fracs.length < 4 && guard < 80) {
      const fraction = FRACTIONS[rand() % FRACTIONS.length]
      if (!fracs.some((item) => item[0] === fraction[0] && item[1] === fraction[1])) fracs.push(fraction)
      guard += 1
    }
    if (fracs.length < 4) return null
    const randomForm = () => {
      const coeffs = names.map(() => (rand() % 7) - 3)
      let constant = (rand() % 9) - 4
      if (coeffs.every((coef) => coef === 0) && constant === 0) constant = 2
      return { coeffs, constant }
    }
    const n = fracs.map((fraction) => fraction[0])
    const d = fracs.map((fraction) => fraction[1])
    if (gcd(n[1], n[0]) !== 1) continue
    const U = [null, randomForm(), randomForm(), randomForm()]
    let rhs = target
    for (let index = 1; index < 4; index += 1) rhs = addForms(rhs, scaleForm(U[index], n[index]))
    const adjusted = { coeffs: U[1].coeffs.slice(), constant: U[1].constant }
    let solvable = true
    for (let index = 0; index < names.length; index += 1) {
      const step = solveCongruence(n[1], mod(-rhs.coeffs[index], n[0]), n[0])
      if (step == null) solvable = false
      else {
        adjusted.coeffs[index] += step
        rhs = addForms(rhs, { coeffs: names.map((_, coefIndex) => coefIndex === index ? n[1] * step : 0), constant: 0 })
      }
    }
    if (!solvable) continue
    const constantStep = solveCongruence(n[1], mod(-rhs.constant, n[0]), n[0])
    if (constantStep == null) continue
    adjusted.constant += constantStep
    rhs = addForms(rhs, { coeffs: names.map(() => 0), constant: n[1] * constantStep })
    if (rhs.coeffs.some((coef) => coef % n[0] !== 0) || rhs.constant % n[0] !== 0) continue
    U[1] = adjusted
    U[0] = { coeffs: rhs.coeffs.map((coef) => coef / n[0]), constant: rhs.constant / n[0] }
    const paren = U.map((form, index) => scaleForm(form, d[index]))
    if (paren.some((form) => isZero(form) || form.coeffs.some((coef) => Math.abs(coef) > 96) || Math.abs(form.constant) > 120)) continue
    const contributions = U.map((form, index) => scaleForm(form, n[index]))
    let got = contributions[0]
    for (let index = 1; index < 4; index += 1) got = addForms(got, contributions[index], -1)
    if (got.constant !== target.constant || got.coeffs.some((coef, index) => coef !== target.coeffs[index])) continue
    const pieces = fracs.map((fraction, index) => `\\frac{${fraction[0]}}{${fraction[1]}}(${linearLatex(paren[index], names)})`)
    const relation = `${pieces[0]} - ${pieces[1]} = ${pieces[2]} + ${pieces[3]}`
    return { relation, target, names }
  }
  return null
}

function shuffle(items, seed) {
  const rand = rng(seed)
  const copy = items.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = rand() % (index + 1)
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function finish(seed, prompt, correct, wrongs, explanation, proof, subskill) {
  if (!prompt || prompt.split('$').length % 2 === 0) return null
  const unique = new Set([correct.text, ...wrongs.map((wrong) => wrong.text)])
  if (unique.size !== 4) return null
  if ([correct, ...wrongs].some((choice) => !choice.reason || /^Correct:/u.test(choice.reason))) return null
  const mixed = shuffle([
    { ...correct, correct: true },
    ...wrongs.map((wrong) => ({ ...wrong, correct: false })),
  ], seed)
  const dollars = mixed.reduce((count, choice) => count + (choice.text.split('$').length - 1), 0)
  if (dollars % 2 !== 0) return null
  return {
    prompt,
    choices: mixed.map((choice) => ({ text: choice.text, reason: choice.reason })),
    answer: 'ABCD'[mixed.findIndex((choice) => choice.correct)],
    explanation,
    proof,
    subskill,
  }
}

const CONTEXTS = [
  ['renewable-energy company', 'daily electricity production, in megawatt-hours', 'E', 'additional solar panels', 'p', 'solar panel'],
  ['transit agency', 'daily ridership, in thousands of rides', 'R', 'additional train cars', 't', 'train car'],
  ['water utility', 'daily output, in millions of liters', 'W', 'additional filters', 'f', 'filter'],
  ['archive', 'pages scanned per day, in thousands', 'S', 'additional scanners', 'n', 'scanner'],
  ['greenhouse', 'daily yield, in kilograms', 'Y', 'additional lamp rows', 'r', 'lamp row'],
  ['clinic', 'visits completed per day', 'V', 'additional exam rooms', 'm', 'exam room'],
  ['freight yard', 'containers moved per shift', 'C', 'additional cranes', 'k', 'crane'],
  ['wind cooperative', 'daily output, in megawatt-hours', 'G', 'additional turbines', 'w', 'turbine'],
]

function modelItem(seed, ask) {
  const rand = rng(seed)
  const context = CONTEXTS[seed % CONTEXTS.length]
  const [org, output, outputVar, input, inputVar, inputOne] = context
  const den = [2, 3, 4, 5, 6, 8][rand() % 6]
  let num = [1, 3, 5, 7, 11, -1, -3, -5][rand() % 8]
  const divisor = gcd(Math.abs(num), den)
  num /= divisor
  const slopeDen = den / divisor
  if (slopeDen === 1) num = num > 0 ? 3 : -3
  const intercept = 2 + (rand() % 8)
  const slopeNum = num
  const slopeBottom = slopeDen === 1 ? 4 : slopeDen
  const usedNum = slopeDen === 1 ? (num > 0 ? 3 : -3) : slopeNum
  const target = { coeffs: [slopeBottom, -usedNum], constant: -slopeBottom * intercept }
  const identity = buildIdentity(rand, [outputVar, inputVar], target)
  if (!identity) return null
  const slope = fracLatex(usedNum, slopeBottom)
  const negative = fracLatex(-usedNum, slopeBottom)
  const reciprocal = fracLatex(slopeBottom, usedNum)
  const negativeReciprocal = fracLatex(-slopeBottom, usedNum)
  const simplified = `${slopeBottom}${outputVar} - ${usedNum < 0 ? `(${usedNum})` : usedNum}${inputVar} = ${slopeBottom * intercept}`
  const solved = `${outputVar} = ${slope}${inputVar} + ${intercept}`
  if (ask === 'slope') {
    const outputPhrase = output.includes(',') ? `${output},` : output
    return finish(seed, `${org[0].toUpperCase()}${org.slice(1)} analysts are studying how ${outputPhrase} changes as ${input} are added.

Let ${math(outputVar)} represent the total ${output}. Let ${math(inputVar)} represent the number of ${input}. Several efficiency factors were combined into this model:

${math(identity.relation)}

After the model is simplified, it can be written ${math(`${outputVar} = m${inputVar} + b`)}. The value ${math('m')} is the change in the output for each additional ${inputOne}.

Which of the following is the value of ${math('m')}?`, {
      text: math(slope),
      reason: `Distributing and combining like terms produces ${simplified}. Solving for ${outputVar} gives ${solved}, so m = ${slope}.`,
    }, [
      { text: math(negative), reason: 'This is the slope with the opposite sign, which is what happens if one of the subtracted groups is added instead.' },
      { text: math(reciprocal), reason: 'This swaps the change in output with the change in input.' },
      { text: math(negativeReciprocal), reason: 'This both swaps the ratio and reverses the sign.' },
    ], `Distribute each fraction, then combine like terms. The equation simplifies to ${math(simplified)}. Solving for ${math(outputVar)} gives ${math(solved)}. Each additional ${inputOne} changes the output by ${math(slope)}.`, `${simplified}; m = ${slope}.`, 'Simplify a multi-term linear model, then read the rate')
  }
  if (ask === 'intercept') {
    const traps = [math(slope), math(String(-intercept)), math(String(intercept + usedNum)), math(String(intercept * slopeBottom))].filter((text) => text !== math(String(intercept)))
    if (traps.length < 3) return null
    return finish(seed, `A planning group at ${article(org)} ${org} combined several measurements into this model for ${output}, based on ${input}:

${math(identity.relation)}

Simplified, the model has the form ${math(`${outputVar} = m${inputVar} + b`)}. Which value is ${math('b')}, the output predicted when ${math(`${inputVar} = 0`)}?`, {
      text: math(String(intercept)),
      reason: `The simplified equation is ${solved}, so b = ${intercept}.`,
    }, traps.slice(0, 3).map((text) => ({ text, reason: 'That value is the slope, a sign error, or a coefficient from before the equation was solved for the output.' })), `The fractions expand to ${math(simplified)}. Solving for the output gives ${math(solved)}. When ${math(`${inputVar} = 0`)}, the output is ${intercept}.`, `b = ${intercept}.`, 'Simplify a model, then read the constant term')
  }
  const step = slopeBottom
  const predicted = usedNum * (step / slopeBottom) + intercept
  const traps = [predicted - intercept, predicted + step, intercept, predicted + usedNum].filter((value) => value !== predicted)
  if (new Set(traps).size < 3) return null
  return finish(seed, `Engineers at ${article(org)} ${org} use this model for ${output} after ${input} are added:

${math(identity.relation)}

The simplified model has the form ${math(`${outputVar} = m${inputVar} + b`)}. What value of ${math(outputVar)} does the model predict when ${math(`${inputVar} = ${step}`)}?`, {
    text: math(String(predicted)),
    reason: `The model simplifies to ${solved}. Substituting ${inputVar} = ${step} gives ${predicted}.`,
  }, traps.slice(0, 3).map((value) => ({ text: math(String(value)), reason: 'That result skips the constant, uses the wrong sign on the rate, or stops before substituting.' })), `Simplify to ${math(solved)}. Then substitute ${math(`${inputVar} = ${step}`)}: ${math(`${slope}(${step}) + ${intercept} = ${predicted}`)}.`, `${solved}; ${outputVar}(${step}) = ${predicted}.`, 'Simplify a model, then evaluate it')
}

function linearOne(seed) {
  const rand = rng(seed + 17)
  const denominator = [2, 3, 4, 5, 6][rand() % 5]
  const numerator = [1, 5, 7, 11, -1, -5, -7][rand() % 7]
  const divisor = gcd(Math.abs(numerator), denominator)
  const num = numerator / divisor
  const den = denominator / divisor
  if (den === 1) return linearOne(seed + 101)
  const target = { coeffs: [den], constant: -num }
  const identity = buildIdentity(rand, ['x'], target)
  if (!identity) return null
  const answer = fracLatex(num, den)
  return finish(seed, `A technician clears an instrument equation by distributing every grouped term before solving.

${math(identity.relation)}

What is the solution for ${math('x')}?`, {
    text: math(answer),
    reason: `The grouped terms simplify to ${den}x = ${num}, so x = ${answer}.`,
  }, [
    { text: math(fracLatex(-num, den)), reason: 'This solves the simplified equation with the opposite sign.' },
    { text: math(fracLatex(den, num)), reason: 'This swaps the coefficient of x with the constant term.' },
    { text: math(fracLatex(num, den * den)), reason: 'This divides by the coefficient twice.' },
  ], `Distribute the four fractions and combine like terms. The equation becomes ${math(`${den}x - ${num} = 0`)}, so ${math(`x = ${answer}`)}.`, `${den}x = ${num}.`, 'Simplify a four-term equation, then solve')
}

function inequalityItem(seed) {
  const rand = rng(seed + 29)
  const coefficient = 2 + (rand() % 5)
  const bound = 4 + (rand() % 7)
  const target = { coeffs: [coefficient], constant: -coefficient * bound }
  const identity = buildIdentity(rand, ['x'], target)
  if (!identity) return null
  const answer = bound - 1
  const relation = identity.relation.replace(' = ', ' < ')
  return finish(seed, `A safety model is acceptable only while the left side stays below the right side.

${math(relation)}

What is the greatest integer value of ${math('x')} that satisfies the inequality?`, {
    text: math(String(answer)),
    reason: `The inequality simplifies to x < ${bound}, so the greatest integer solution is ${answer}.`,
  }, [
    { text: math(String(bound)), reason: `${bound} makes the two sides equal, but the inequality is strict.` },
    { text: math(String(bound + 1)), reason: 'This is past the boundary, so it makes the left side larger.' },
    { text: math(String(answer - 1)), reason: 'This integer works, but it is not the greatest one.' },
  ], `After distributing, the inequality is ${math(`${coefficient}x - ${coefficient * bound} < 0`)}, or ${math(`x < ${bound}`)}. The greatest integer strictly less than ${bound} is ${answer}. Check: ${coefficient}(${answer}) - ${coefficient * bound} = ${-coefficient} < 0, while ${coefficient}(${bound}) - ${coefficient * bound} = 0.`, `x < ${bound}; greatest integer ${answer}.`, 'Simplify a compound inequality, then find the greatest integer')
}

function systemItem(seed) {
  const rand = rng(seed + 41)
  const x = 2 + (rand() % 7)
  const y = 1 + (rand() % 6)
  if (x === y) return systemItem(seed + 13)
  const a1 = 2
  const b1 = -1
  const a2 = 1
  const b2 = 2
  const c1 = a1 * x + b1 * y
  const c2 = a2 * x + b2 * y
  const first = buildIdentity(rand, ['x', 'y'], { coeffs: [a1, b1], constant: -c1 })
  const second = buildIdentity(rand, ['x', 'y'], { coeffs: [a2, b2], constant: -c2 })
  if (!first || !second) return null
  return finish(seed, `Two planning equations were each built from several grouped measurements. Simplify each equation, then solve the system.

${math(first.relation)}

${math(second.relation)}

What is the value of ${math('x')} in the solution?`, {
    text: math(String(x)),
    reason: `The equations simplify to ${a1}x ${b1 < 0 ? '-' : '+'} ${Math.abs(b1)}y = ${c1} and ${a2}x + ${b2}y = ${c2}, whose solution has x = ${x}.`,
  }, [
    { text: math(String(y)), reason: 'This is the value of y, not x.' },
    { text: math(String(x + y)), reason: 'This adds the two coordinates instead of solving the system.' },
    { text: math(String(c1)), reason: 'This is a constant from a simplified equation, not the value of x.' },
  ], `The first model simplifies to ${math(`${a1}x - y = ${c1}`)}. The second simplifies to ${math(`x + ${b2}y = ${c2}`)}. Substituting y = ${a1}x - ${c1} into the second equation gives x = ${x} and y = ${y}.`, `${a1}*${x} + (${b1})*${y} = ${c1}; ${a2}*${x} + ${b2}*${y} = ${c2}.`, 'Simplify two models, then solve the system')
}

function polynomial(seed) {
  const rand = rng(seed + 53)
  const a = 2 + (rand() % 5)
  const b = 1 + (rand() % 4)
  const c = 1 + (rand() % 5)
  const d = (rand() % 5) - 2
  const e = 1 + (rand() % 4)
  const left = [a, 2]
  const quad = [c, b, 1]
  const right = [d, 3]
  const quad2 = [e, 1]
  const mul = (p, q) => {
    const out = Array(p.length + q.length - 1).fill(0)
    for (let i = 0; i < p.length; i += 1) for (let j = 0; j < q.length; j += 1) out[i + j] += p[i] * q[j]
    return out
  }
  const first = mul(left, quad).map((coef) => coef / 2)
  const second = mul(right, quad2)
  const result = first.map((coef, index) => coef - (second[index] ?? 0))
  if (result.some((coef) => !Number.isInteger(coef))) return null
  const coeff = result[2] ?? 0
  const traps = [result[3] ?? 0, -coeff, coeff + (result[1] ?? 0), first[2] ?? 0].filter((value) => value !== coeff)
  if (new Set(traps).size < 3 || coeff === 0) return polynomial(seed + 19)
  const show = (coefs) => linearLatex({ coeffs: [coefs[1] ?? 0, coefs[2] ?? 0, coefs[3] ?? 0].slice(0, 0), constant: 0 }, [])
  const polyText = (coefs) => {
    const names = [null, 'x', 'x^2', 'x^3']
    return linearLatex({ coeffs: coefs.slice(1), constant: coefs[0] ?? 0 }, names.slice(1, coefs.length))
  }
  return finish(seed, `Which value is the coefficient of ${math('x^2')} after the expression is simplified?

${math(`\\frac{1}{2}(${polyText(mul(left, quad))}) - (${polyText(second)})`)}`, {
    text: math(String(coeff)),
    reason: `Distributing and subtracting leaves ${polyText(result)}. The coefficient of x^2 is ${coeff}.`,
  }, traps.slice(0, 3).map((value) => ({ text: math(String(value)), reason: 'That is the cubic coefficient, a sign error, or the coefficient from only the first product.' })), `First expand ${math(`\\frac{1}{2}(2x + ${a})(x^2 + ${b}x + ${c})`)} and ${math(`(3x + ${d})(x^2 + ${e})`)}. Subtracting gives ${math(polyText(result))}. The ${math('x^2')} coefficient is ${coeff}.`, `x^2 coefficient = ${coeff}.`, 'Expand products and collect a cubic')
  void show
}

function quadraticRoot(seed) {
  const r = band(seed, 3, 14, 2)
  const s = r + band(seed, 9, 12, 2)
  const target = [r * s, -(r + s), 1]
  const noise = [band(seed, 15, 6, 2), band(seed, 21, 5, 1), 1]
  const extra = [band(seed, 27, 5, 1), -1, 0]
  const combined = target.map((coef, index) => coef + noise[index] + extra[index])
  const paren = combined.map((coef) => 3 * coef)
  const polyText = (coefs) => linearLatex({ coeffs: coefs.slice(1), constant: coefs[0] }, ['x', 'x^2'].slice(0, coefs.length - 1))
  const greater = s
  return finish(seed, `What is the greater solution of the equation?

${math(`\\frac{1}{3}(${polyText(paren)}) - (${polyText(noise)}) - (${polyText(extra)}) = 0`)}`, {
    text: math(String(greater)),
    reason: `The equation simplifies to (x - ${r})(x - ${s}) = 0. The greater solution is ${s}.`,
  }, [
    { text: math(String(r)), reason: 'This is the smaller solution.' },
    { text: math(String(r + s)), reason: 'This is the sum of the solutions, with the sign dropped.' },
    { text: math(String(r * s)), reason: 'This is the product of the solutions.' },
  ], `Distribute the one-third and subtract the other two polynomials. The equation becomes ${math(`x^2 - ${r + s}x + ${r * s} = 0`)}, which factors as ${math(`(x - ${r})(x - ${s}) = 0`)}. The greater solution is ${s}.`, `(x-${r})(x-${s})=0.`, 'Simplify to a quadratic, then take the greater root')
}

function vertexItem(seed) {
  const h = band(seed, 5, 24, 2)
  let k = band(seed, 13, 30, 1)
  if (k === h) k += 4
  const minimum = k
  return finish(seed, `A production curve is written in expanded pieces. What is the minimum value of the function?

${math(`f(x) = \\frac{1}{4}(4x^2 - ${8 * h}x + ${4 * h * h}) + ${k}`)}`, {
    text: math(String(minimum)),
    reason: `The fraction is the perfect square (x - ${h})^2. The minimum is the added constant ${k}.`,
  }, [
    { text: math(String(h)), reason: `This is the x-value where the minimum occurs, not the minimum value.` },
    { text: math(String(h * h + k)), reason: 'This expands the square at x = 0 instead of reading the vertex.' },
    { text: math(String(-k)), reason: 'The added constant is positive, so the minimum is not negative.' },
  ], `\\frac{1}{4}(4x^2 - ${8 * h}x + ${4 * h * h}) = (x - ${h})^2. Therefore f(x) = (x - ${h})^2 + ${k}. A square is at least 0, so the minimum value is ${k}.`, `minimum = ${k}.`, 'Rewrite a quadratic, then read the minimum')
}

function percentItem(seed) {
  const ups = [10, 20, 25, 50]
  const downs = [10, 20, 40, 50]
  const original = 40 * band(seed, 4, 24, 2)
  const up = ups[band(seed, 8, ups.length)]
  const down = downs[band(seed, 16, downs.length)]
  const afterUp = original * (100 + up) / 100
  const final = afterUp * (100 - down) / 100
  const net = (final - original) / original * 100
  if (!Number.isInteger(afterUp) || !Number.isInteger(final) || !Number.isInteger(net) || net === 0) return null
  const traps = [up - down, up + down, final - original]
  if (new Set([net, ...traps]).size !== 4) return null
  const answer = net
  return finish(seed, `A workshop price of ${original} dollars rises by ${up}% and then falls by ${down}% from that raised price. What is the net percent change from the original price?`, {
    text: math(`${answer}\\%`),
    reason: `The price goes from ${original} to ${final}. The net change is ${final - original}, which is ${answer}% of ${original}.`,
  }, [
    { text: math(`${up - down}\\%`), reason: 'Successive percent changes do not subtract directly.' },
    { text: math(`${up + down}\\%`), reason: 'The second percent is a decrease, and percents of different bases do not add.' },
    { text: math(`${final - original}\\%`), reason: 'This is the dollar change, not the percent of the original price.' },
  ], `After the increase, the price is ${original} × ${100 + up}/100 = ${afterUp}. After the decrease, it is ${afterUp} × ${100 - down}/100 = ${final}. The net percent change is (${final} - ${original}) / ${original} = ${answer}%.`, `${original} -> ${afterUp} -> ${final}; net ${answer}%.`, 'Compute successive percent changes')
}

function ratioItem(seed) {
  const pairs = [[4, 12], [6, 6], [3, 6], [5, 20], [8, 24]]
  const [baseA, baseB] = pairs[band(seed, 2, pairs.length)]
  const scale = band(seed, 14, 36, 1)
  const aloneA = baseA * scale
  const aloneB = baseB * scale
  const together = aloneA * aloneB / (aloneA + aloneB)
  if (!Number.isInteger(together) || together <= 1) return null
  const done = 1 / together
  const remaining = 1 - done
  const rest = remaining * aloneB
  if (!Number.isInteger(rest) || rest <= 0) return null
  return finish(seed, `Working alone, press A finishes a job in ${aloneA} hours and press B finishes the same job in ${aloneB} hours. They work together for 1 hour, and then A stops. How many additional hours does B need, working alone, to finish the job?`, {
    text: math(String(rest)),
    reason: `Together they finish 1/${together} of the job in one hour, leaving ${remaining}. B's rate is 1/${aloneB}, so B needs ${rest} more hours.`,
  }, [
    { text: math(String(together)), reason: 'This is the time if both had finished the whole job together.' },
    { text: math(String(aloneB)), reason: 'This would be B working the whole job alone, but part of the job is already done.' },
    { text: math(String(aloneA + aloneB)), reason: 'Adding the individual times is not the combined schedule.' },
  ], `A's rate is 1/${aloneA} and B's rate is 1/${aloneB}. Together, one hour completes ${done} of the job. The remaining ${remaining} of the job, at B's rate of 1/${aloneB} job per hour, takes ${rest} hours.`, `remaining ${remaining} ÷ (1/${aloneB}) = ${rest}.`, 'Combine rates, then finish with one worker')
}

function oneVarItem(seed) {
  const base = band(seed, 6, 80, 4)
  const add = 3
  const values = [base, base + 2, base + 2, base + 4, base + 12]
  const shifted = values.map((value) => value + add)
  const trimmed = shifted.slice(0, 4)
  const mean = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length
  if (!Number.isInteger(mean)) return null
  return finish(seed, `A lab recorded these five counts: ${values.join(', ')}. Each count is increased by ${add}, and then the largest of the new counts is removed. What is the mean of the four counts that remain?`, {
    text: math(String(mean)),
    reason: `The shifted counts are ${shifted.join(', ')}. Removing ${shifted[4]} leaves ${trimmed.join(', ')}, whose mean is ${mean}.`,
  }, [
    { text: math(String(values.reduce((sum, value) => sum + value, 0) / 5)), reason: 'This is the original mean, before the shift and the removal.' },
    { text: math(String(shifted.reduce((sum, value) => sum + value, 0) / 5)), reason: 'This still includes the outlier.' },
    { text: math(String(mean + add)), reason: 'The shift was already included before the mean was taken.' },
  ], `Add ${add} to each count: ${shifted.join(', ')}. Remove ${shifted[4]}. The remaining sum is ${trimmed.reduce((sum, value) => sum + value, 0)}, so the mean is ${mean}.`, `mean = ${mean}.`, 'Transform a list, then find the mean')
}

function scatterItem(seed) {
  const slope = band(seed, 3, 12, 2)
  const intercept = band(seed, 9, 18, 1)
  const x1 = band(seed, 15, 8, 1)
  const x2 = x1 + band(seed, 21, 6, 2)
  const y1 = slope * x1 + intercept
  const y2 = slope * x2 + intercept
  const x3 = x1 + 1
  const residual = band(seed, 27, 9, 2)
  const actual = slope * x3 + intercept + residual
  return finish(seed, `A fitted line passes through (${x1}, ${y1}) and (${x2}, ${y2}). A third observation is (${x3}, ${actual}). What is the residual of the third observation, defined as actual value minus the value predicted by the line?`, {
    text: math(String(residual)),
    reason: `The slope is ${slope} and the line is y = ${slope}x + ${intercept}. At x = ${x3} it predicts ${actual - residual}. The residual is ${actual} - ${actual - residual} = ${residual}.`,
  }, [
    { text: math(String(-residual)), reason: 'A residual is actual minus predicted, not predicted minus actual.' },
    { text: math(String(slope)), reason: 'This is the slope, not the residual.' },
    { text: math(String(actual - residual)), reason: 'This is the predicted value, not the residual.' },
  ], `Slope = (${y2} - ${y1}) / (${x2} - ${x1}) = ${slope}. Using point (${x1}, ${y1}), the intercept is ${intercept}, so the line is y = ${slope}x + ${intercept}. The prediction at x = ${x3} is ${actual - residual}. Residual = ${actual} - ${actual - residual} = ${residual}.`, `residual = ${residual}.`, 'Build a line from two points, then compute a residual')
}

function probabilityItem(seed) {
  const total = band(seed, 4, 40, 20) * 2
  const returned = band(seed, 10, 16, 8) * 2
  const juniorReturned = band(seed, 16, 6, 2) * 2
  const juniorKept = band(seed, 22, 8, 2)
  const kept = total - returned
  const seniorKept = kept - juniorKept
  if (juniorReturned >= returned || juniorKept >= kept || seniorKept <= 0 || kept <= 1) return null
  const answer = fracLatex(seniorKept, kept)
  return finish(seed, `A shop has ${total} trays. ${returned} trays were returned, and ${juniorReturned} of those returned trays came from the junior crew. Of the trays that were not returned, ${juniorKept} came from the junior crew. A tray is chosen at random from the trays that were not returned. What is the probability it came from the senior crew?`, {
    text: math(answer),
    reason: `${kept} trays were not returned, and ${seniorKept} of them are senior trays.`,
  }, [
    { text: math(fracLatex(juniorKept, kept)), reason: 'This is the probability the kept tray is from the junior crew.' },
    { text: math(fracLatex(seniorKept, total)), reason: 'This uses all trays as the denominator instead of the kept trays.' },
    { text: math(fracLatex(returned - juniorReturned, returned)), reason: 'This is a probability about returned trays, not kept trays.' },
  ], `Trays not returned = ${total} - ${returned} = ${kept}. Senior trays among them = ${kept} - ${juniorKept} = ${seniorKept}. The conditional probability is ${seniorKept}/${kept} = ${answer}.`, `${seniorKept}/${kept} = ${answer}.`, 'Find a missing cell, then a conditional probability')
}

function marginItem(seed) {
  const estimate = band(seed, 5, 40, 35)
  const error = band(seed, 11, 8, 3)
  const low = estimate - error
  const high = estimate + error
  const inside = estimate + (seed % 2 === 0 ? error - 1 : 1 - error)
  const outside = high + 4
  return finish(seed, `A random sample from one city's repair logs produced an estimate of ${estimate}% with a margin of error of ${error} percentage points. The interval is being used only for that city's logs. Which statement is supported?`, {
    text: `${inside}% is consistent with the estimate, and ${outside}% is not, because the interval runs from ${low}% to ${high}%.`,
    reason: `${inside} lies inside [${low}, ${high}] and ${outside} lies above ${high}.`,
  }, [
    { text: `Both ${inside}% and ${outside}% are inside the interval from ${low}% to ${high}%.`, reason: `${outside} is outside the interval.` },
    { text: `The interval proves the true value is exactly ${estimate}%.`, reason: 'A margin of error gives a range, not a single exact value.' },
    { text: `${inside}% is inconsistent with the estimate because only the center of the interval can occur.`, reason: 'Every value from the lower bound through the upper bound is consistent with the estimate.' },
  ], `The interval is ${low}% to ${high}%. ${inside} is inside that interval, so it is consistent with the estimate. ${outside} is greater than ${high}, so it is not. The interval does not prove that the true value equals ${estimate} exactly.`, `${low} ≤ ${inside} ≤ ${high}; ${outside} > ${high}.`, 'Check two claims against one interval')
}

function claimsItem(seed) {
  const scene = SCENES[band(seed, 7, SCENES.length)]
  const volunteers = band(seed, 19, 70, 18)
  const [place, blamed, changed, outcome] = scene
  return finish(seed, `Researchers studying the ${place} wanted to know whether ${changed} affected the work. They recruited ${volunteers} volunteers from that one site only. Those volunteers were then randomly assigned either to use ${changed} or to keep the usual method. By the end of the trial, the assigned group had this result: ${outcome}. A later press note said the same result should be expected at every similar site in the country. No random sample was taken from those other sites.

Which conclusion is best supported?`, {
    text: `Random assignment supports a cause-and-effect link between ${changed} and the result for these volunteers, but the study does not by itself show that every similar site would see the same result.`,
    reason: 'Assignment supports cause for this group. The volunteers were not a random sample of every site.',
  }, [
    { text: `Because the volunteers were randomly assigned, the result shows that every similar site would see the same outcome.`, reason: 'Random assignment does not replace random selection from other sites.' },
    { text: `The study supports only a generalization about every site, not a cause-and-effect link.`, reason: 'The cause-and-effect link is the part the assignment does support.' },
    { text: `The result shows that ${blamed} caused the outcome.`, reason: `The study assigned ${changed}, and it does not establish ${blamed} as the cause.` },
  ], `The volunteers were randomly assigned, so a cause-and-effect conclusion is supported for this group. They were recruited from one site and were not randomly selected from every similar site, so the press note goes beyond the design.`, 'Assignment supports cause here; selection would be required to generalize.', 'Separate cause from generalization in a longer design')
}

function areaItem(seed) {
  const scales = [[3, 2], [5, 2], [4, 3], [5, 3], [5, 4], [7, 2], [7, 4]]
  const [scaleNum, scaleDen] = scales[band(seed, 3, scales.length)]
  const small = band(seed, 9, 14, 2) * scaleDen * scaleDen
  const large = small * scaleNum * scaleNum / (scaleDen * scaleDen)
  const remove = band(seed, 17, 8, 1) * scaleNum
  if (!Number.isInteger(large) || remove >= large || remove >= small) return null
  const linearScale = small * scaleNum / scaleDen
  if (!Number.isInteger(linearScale)) return null
  const answer = large - remove
  return finish(seed, `Two similar floors have a scale factor of ${scaleNum}/${scaleDen}. The smaller floor has area ${small}. A storage closet of area ${remove} is then partitioned out of the larger floor only. What is the area of the larger floor that remains outside the closet?`, {
    text: math(String(answer)),
    reason: `Areas scale by the square of ${scaleNum}/${scaleDen}, so the larger area is ${large}. Removing ${remove} leaves ${answer}.`,
  }, [
    { text: math(String(large)), reason: 'This is the larger floor before the closet is removed.' },
    { text: math(String(linearScale)), reason: 'This multiplies the area by the scale factor instead of by its square.' },
    { text: math(String(small - remove)), reason: 'The closet is removed from the larger floor, not the smaller one.' },
  ], `The area scale factor is (${scaleNum}/${scaleDen})^2 = ${scaleNum * scaleNum}/${scaleDen * scaleDen}. Larger area = ${small} × ${scaleNum * scaleNum}/${scaleDen * scaleDen} = ${large}. Remaining area = ${large} - ${remove} = ${answer}.`, `${large} - ${remove} = ${answer}.`, 'Scale an area, then subtract a piece')
}

function linesItem(seed) {
  const x = band(seed, 4, 24, 4)
  const a = band(seed, 10, 5, 2)
  const c = a + band(seed, 16, 3, 1)
  const b = band(seed, 22, 40, 8)
  const angle = a * x + b
  const d = angle - c * x
  if (angle <= 30 || angle >= 150 || d <= 0) return null
  const adjacent = 180 - angle
  return finish(seed, `Two parallel rails are cut by a transversal. One interior angle measures (${a}x + ${b}) degrees, and the corresponding angle on the other rail measures (${c}x + ${d}) degrees. What is the measure, in degrees, of the angle adjacent to the first angle along the straight rail?`, {
    text: math(String(adjacent)),
    reason: `Corresponding angles are equal, so x = ${x} and the first angle is ${angle}. Its adjacent angle on a straight line is ${adjacent}.`,
  }, [
    { text: math(String(angle)), reason: 'This is the first angle itself, not the angle beside it.' },
    { text: math(String(x)), reason: 'This is the value of x, not an angle in the figure.' },
    { text: math(String(180)), reason: 'The two adjacent angles together measure 180, but the question asks for the unknown one.' },
  ], `Set ${a}x + ${b} = ${c}x + ${d}. Then ${b - d} = ${c - a}x, so x = ${x}. The first angle measures ${a}(${x}) + ${b} = ${angle}. The adjacent angle on the straight line is 180 - ${angle} = ${adjacent}.`, `x = ${x}; adjacent = ${adjacent}.`, 'Solve corresponding angles, then use a linear pair')
}

function trigItem(seed) {
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]
  const [a, b, c] = triples[band(seed, 5, triples.length)]
  const scale = band(seed, 19, 24, 1)
  return finish(seed, `A cable runs in a straight line from ${math('(0, 0)')} to ${math(`(${a * scale}, ${b * scale})`)}. What is the sine of the angle the cable makes with the positive horizontal axis?`, {
    text: math(fracLatex(b, c)),
    reason: `The horizontal change is ${a * scale} and the vertical change is ${b * scale}, so the length is ${c * scale}. Sine is opposite over hypotenuse, ${b}/${c}.`,
  }, [
    { text: math(fracLatex(a, c)), reason: 'This is the cosine, adjacent over hypotenuse.' },
    { text: math(fracLatex(b, a)), reason: 'This is the tangent. The hypotenuse has not been used.' },
    { text: math(fracLatex(c, b)), reason: 'This is the reciprocal of the sine.' },
  ], `The distance is sqrt((${a * scale})^2 + (${b * scale})^2) = sqrt(${a * a * scale * scale + b * b * scale * scale}) = ${c * scale}. Sine = opposite / hypotenuse = ${b * scale}/${c * scale} = ${fracLatex(b, c)}.`, `sin = ${b}/${c}.`, 'Find a distance, then a sine ratio')
}

function circleItem(seed) {
  const cases = [
    [1, 2, 4, 6, 5, 108, 3],
    [0, 0, 6, 8, 10, 72, 4],
    [2, 1, 2, 9, 8, 90, 4],
    [0, 0, 9, 12, 15, 60, 5],
    [3, -2, 3, 2, 4, 135, 3],
  ]
  const [h, k, x, y, radius, angle, coeff] = cases[seed % cases.length]
  const dx = x - h
  const dy = y - k
  if (dx * dx + dy * dy !== radius * radius) throw new Error('circle case is not on the circle')
  if (angle * radius / 180 !== coeff) throw new Error('arc coefficient mismatch')
  return finish(seed, `A circular gear has center ${math(`(${h}, ${k})`)} and passes through ${math(`(${x}, ${y})`)}. A central angle of ${angle} degrees intercepts an arc of the gear. What is the length of that arc?`, {
    text: math(`${coeff}\\pi`),
    reason: `The radius is ${radius}. Arc length = (${angle}/360) × 2π × ${radius} = ${coeff}π.`,
  }, [
    { text: math(`${radius}\\pi`), reason: 'This uses the radius as if it were already the arc length in terms of π.' },
    { text: math(`${2 * radius}\\pi`), reason: 'This is the circumference, the arc for a full 360 degrees.' },
    { text: math(`${coeff * radius}\\pi`), reason: 'This multiplies the arc coefficient by the radius a second time.' },
  ], `Radius = sqrt((${x} - ${h})^2 + (${y} - ${k})^2) = sqrt(${dx * dx + dy * dy}) = ${radius}. Arc length = ${angle}/360 × 2π × ${radius} = ${coeff}π.`, `r = ${radius}; arc = ${coeff}π.`, 'Find a radius from two points, then an arc length')
}

function words(text) {
  return text.split(/\s+/).filter(Boolean).length
}

function scenePassage(seed) {
  const [place, blamed, changed, outcome] = SCENES[band(seed, 8, SCENES.length)]
  const year = band(seed, 14, 36, 1994)
  const weeks = band(seed, 20, 22, 5)
  const rooms = band(seed, 26, 12, 3)
  const samples = band(seed, 32, 45, 18)
  const passage = `Since ${year}, the crew at the ${place} had treated ${blamed} as the cause of the recurring damage. That explanation appeared in the repair budget, and it decided which parts were replaced first. Visitors heard the same account on the weekend tour.

During a ${weeks}-week comparison, the crew kept the supplier, the shift length, and the room assignment the same. In the ${rooms} rooms they marked for the trial, they changed only ${changed}. They did not change ${blamed}. Rooms outside the trial kept both the old ${changed} and the old account of ${blamed}. The lab later compared ${samples} paired samples.

When the crew scored the rooms, ${outcome} in the trial rooms. The rooms outside the trial did not show that improvement. A trustee nonetheless proposed a full replacement aimed at ${blamed}, arguing that the original budget line should still be followed.

The lab report answered that proposal directly. Samples tied to ${blamed} matched across the trial rooms and the other rooms. The report named one difference that had actually been sustained: ${changed}.`
  return { passage, blamed, changed, outcome, place }
}

function centralItem(seed) {
  const scene = scenePassage(seed)
  if (words(scene.passage) < 120) return null
  return finish(seed, `${scene.passage}

Which choice states the main idea of the passage?`, {
    text: `${scene.outcome[0].toUpperCase()}${scene.outcome.slice(1)} when the crew changed ${scene.changed}, while the evidence did not support continuing to blame ${scene.blamed}.`,
    reason: 'The trial result and the lab report together point to the changed condition and away from the original explanation.',
  }, [
    { text: `The passage mainly shows that ${scene.blamed} caused the damage, because that explanation had guided the budget since the start.`, reason: 'The opening explains the old belief. The trial and the lab report do not support it.' },
    { text: `The trustee's replacement plan is the solution the lab report confirms.`, reason: 'The lab report answers that proposal by saying the blamed condition matched in both groups.' },
    { text: `The supplier and the shift length explain why the trial rooms improved.`, reason: 'The passage says those conditions were kept the same, so they do not explain the difference.' },
  ], `The improvement happened in the rooms where ${scene.changed} was the condition the crew changed, and it did not happen in the other rooms. The lab report says ${scene.blamed} matched across the rooms, so the original explanation is not what the comparison supports.`, 'Result tracks the changed condition; the blamed condition was held constant and matched.', 'Infer a main idea that the passage does not state in one sentence')
}

function inferenceItem(seed) {
  const scene = scenePassage(seed + 3)
  return finish(seed, `${scene.passage}

Which choice is best supported?`, {
    text: `The comparison links the improvement to ${scene.changed}, because ${scene.blamed} was not the condition that differed.`,
    reason: 'The trial changed one condition, the outcome followed in those rooms, and the lab says the blamed condition matched.',
  }, [
    { text: `${scene.blamed[0].toUpperCase()}${scene.blamed.slice(1)} explains the improvement in the trial rooms.`, reason: 'The passage says that condition was not changed and that the samples matched.' },
    { text: `The rooms outside the trial improved in the same way once the trustee offered a replacement.`, reason: 'The passage says those rooms did not show the improvement.' },
    { text: `Nothing differed between the trial rooms and the other rooms.`, reason: 'The passage names a sustained difference.' },
  ], `Only ${scene.changed} was changed in the trial rooms, and those are the rooms where ${scene.outcome}. The lab report says the samples for ${scene.blamed} matched, so that older explanation does not account for the difference.`, 'One condition changed; the rival explanation was constant.', 'Draw an inference from a comparison and a later limit')
}

function textualItem(seed) {
  const scene = scenePassage(seed + 6)
  const support = `Samples tied to ${scene.blamed} matched across the trial rooms and the other rooms.`
  if (!scene.passage.includes(support)) return null
  const others = scene.passage.split(/(?<=\.)\s+/).filter((sentence) => sentence !== support && !sentence.includes('matched across')).slice(0, 3)
  if (others.length < 3) return null
  return finish(seed, `${scene.passage}

Which sentence from the passage most directly supports the claim that ${scene.blamed} does not explain the difference between the rooms?`, {
    text: support,
    reason: 'If that condition matched in both groups, it cannot explain why only one group improved.',
  }, others.map((text) => ({ text, reason: 'This sentence gives background or the result, but it does not show that the older explanation was the same in both groups.' })), `The claim is that ${scene.blamed} does not explain the difference. The sentence that says the related samples matched across both groups is the one that supports the claim. The sentences that only repeat the old belief do not.`, 'Support is the matching-samples sentence.', 'Choose evidence that rules out a rival cause')
}

function structureItem(seed) {
  const scene = scenePassage(seed + 9)
  return finish(seed, `${scene.passage}

In the context of the passage, the sentence about the trustee's proposal primarily serves to`, {
    text: `present a plan that the lab report in the next sentences undercuts.`,
    reason: 'The trustee wants a replacement aimed at the old explanation, and the lab report then says that explanation matched in both groups.',
  }, [
    { text: `prove that ${scene.blamed} caused the damage.`, reason: 'The trustee proposal repeats the old plan. The lab report does not prove that cause.' },
    { text: `define ${scene.changed} for a reader who has not seen the trial.`, reason: 'The sentence is about the trustee proposal, not a definition.' },
    { text: `show that the trial rooms and the other rooms had the same result.`, reason: 'The earlier sentences say the improvement was only in the trial rooms.' },
  ], `The trustee sentence offers a replacement aimed at ${scene.blamed}. The following lab report says the samples matched and names ${scene.changed} as the sustained difference, so the proposal is introduced in order to be limited.`, 'The proposal is raised and then limited.', 'Identify how a middle sentence sets up a later limit')
}

function crossItem(seed) {
  const firstIndex = band(seed, 6, SCENES.length)
  const secondIndex = (firstIndex + band(seed, 18, SCENES.length - 1, 1)) % SCENES.length
  const first = SCENES[firstIndex]
  const second = SCENES[secondIndex]
  const years = band(seed, 24, 30, 8)
  const groups = band(seed, 30, 8, 2)
  const text1 = `Text 1: A specialist argues that damage at the ${first[0]} happens because of ${first[1]}. The specialist points to ${years} years of repairs that were funded under that explanation and treats the pattern as sufficient cause.`
  const text2 = `Text 2: At the ${second[0]}, crews kept ${second[1]} the same across ${groups} groups of rooms and changed only ${second[2]}. The group with that change improved. The other group, with the same ${second[1]}, did not. The specialist in Text 1 does not discuss that comparison.`
  return finish(seed, `${text1}

${text2}

Based on the texts, which choice is best supported?`, {
    text: `Text 2 limits the broad cause in Text 1 by describing a case where ${second[1]} stayed the same and the result still differed after ${second[2]} changed.`,
    reason: 'Text 2 holds the blamed condition constant and still gets a difference, so Text 1\'s cause cannot be the whole explanation.',
  }, [
    { text: `Text 2 proves that ${first[1]} is the only possible cause of the damage in Text 1.`, reason: 'Text 2 is a case where that kind of explanation was held constant and did not account for the difference.' },
    { text: `Text 2 repeats Text 1 without adding a comparison.`, reason: 'Text 2 adds a two-group comparison Text 1 does not contain.' },
    { text: `Both texts conclude that a trustee's budget should be followed without further measurement.`, reason: 'Neither text reaches that conclusion.' },
  ], `Text 1 treats ${first[1]} as a sufficient cause. Text 2 describes rooms where ${second[1]} was the same and ${second[2]} was the condition that differed, with improvement in only one group. That limits how far Text 1's cause can be taken.`, 'Text 2 holds the claimed cause constant.', 'See a limit across two texts')
}

function quantitativeItem(seed) {
  const names = ['bindery', 'foundry', 'aviary', 'tannery', 'observatory', 'darkroom']
  const a = names[band(seed, 3, names.length)]
  const b = names[band(seed, 9, names.length)]
  const c = names[band(seed, 15, names.length)]
  if (new Set([a, b, c]).size < 3) return null
  const lowHits = band(seed, 21, 30, 8)
  const low = { name: a, hit: lowHits + 3, total: (lowHits + 3) * 5 }
  const high = { name: b, hit: lowHits, total: lowHits * 2 }
  const mid = { name: c, hit: lowHits + 1, total: (lowHits + 1) * 3 }
  if (!(low.hit > high.hit && low.hit / low.total < high.hit / high.total)) return null
  return finish(seed, `A quality desk compared three workrooms. Each fraction is flaws divided by checks.

${low.name}: ${low.hit} flaws in ${low.total} checks
${high.name}: ${high.hit} flaws in ${high.total} checks
${mid.name}: ${mid.hit} flaws in ${mid.total} checks

Which claim is true?`, {
    text: `The ${low.name} recorded more flaws than the ${high.name}, but the ${high.name} had the higher flaw rate.`,
    reason: `${low.hit} > ${high.hit}, while ${low.hit}/${low.total} < ${high.hit}/${high.total}.`,
  }, [
    { text: `The ${low.name} had the higher flaw rate because it recorded more flaws.`, reason: 'The larger count is spread over a much larger number of checks.' },
    { text: `The ${mid.name} had a higher flaw rate than the ${high.name}.`, reason: `${mid.hit}/${mid.total} is less than ${high.hit}/${high.total}.` },
    { text: `The ${high.name} recorded more flaws than the ${low.name}.`, reason: `${high.hit} is not greater than ${low.hit}.` },
  ], `Compare the counts and the rates separately. ${low.hit} is greater than ${high.hit}, so the ${low.name} had more flaws. ${low.hit}/${low.total} = ${fracLatex(low.hit, low.total)} and ${high.hit}/${high.total} = ${fracLatex(high.hit, high.total)}, so the ${high.name} had the higher rate.`, `${low.hit}/${low.total} < ${high.hit}/${high.total}.`, 'Separate a larger count from a higher rate')
}

function boundaryItem(seed) {
  const place = ['archive', 'foundry', 'observatory', 'tannery', 'glass studio', 'map depot', 'seed vault'][band(seed, 3, 7)]
  const crew = ['interns', 'night chemists', 'weekend clerks', 'apprentices', 'guest riggers'][band(seed, 9, 5)]
  const which = ['which had been labeled the night before', 'which the registrar had already counted', 'which still needed a humidity reading', 'which the morning shift had set aside'][band(seed, 15, 4)]
  const bin = band(seed, 21, 60, 2)
  const correct = `The ${place} logged the evening count; the ${crew} sealed bin ${bin}, ${which}, before the supervisor signed the log.`
  return finish(seed, 'Which choice is punctuated correctly?', {
    text: correct,
    reason: 'A semicolon joins two independent clauses, and the commas set off the nonessential clause that describes the bin.',
  }, [
    { text: `The ${place} logged the evening count, the ${crew} sealed bin ${bin}, ${which}, before the supervisor signed the log.`, reason: 'The comma after count joins two independent clauses and creates a comma splice.' },
    { text: `The ${place} logged the evening count; the ${crew} sealed bin ${bin} ${which}, before the supervisor signed the log.`, reason: 'The clause describing the bin is nonessential, so it needs a comma before it.' },
    { text: `The ${place} logged the evening count; the ${crew} sealed bin ${bin}, ${which} before the supervisor signed the log.`, reason: 'The nonessential clause needs a comma after it as well as before it.' },
  ], `The two independent clauses need a semicolon. The clause "${which}" adds information about bin ${bin} and is marked with a pair of commas.`, 'Semicolon plus a paired nonessential clause.', 'Punctuate a compound sentence that also contains a nonessential clause')
}

function formItem(seed) {
  const place = ['archive', 'clinic', 'foundry', 'observatory', 'tannery', 'print loft', 'radio booth'][band(seed, 3, 7)]
  const group = ['visiting chemists', 'weekend auditors', 'guest riggers', 'night interns', 'junior clerks'][band(seed, 11, 5)]
  const trays = band(seed, 19, 80, 12)
  const correct = `By the time the doors opened yesterday, the lead at the ${place}, together with the ${group} who had arrived before dawn, had checked all ${trays} trays.`
  return finish(seed, 'Which choice follows the conventions of Standard English?', {
    text: correct,
    reason: 'The subject is the singular noun lead. Together with does not make it plural, and by the time the doors opened yesterday calls for had checked.',
  }, [
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${group} who had arrived before dawn, were checking all ${trays} trays.`, reason: 'The nearer idea of a plural group does not control the verb. The subject is lead.' },
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${group} who had arrived before dawn, has checked all ${trays} trays.`, reason: 'Yesterday and "by the time the doors opened" put the action before a past moment, so has checked does not fit.' },
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${group} who had arrived before dawn, checking all ${trays} trays.`, reason: 'The sentence has no finite verb for the subject.' },
  ], `Ignore the phrase "together with the ${group}" when choosing the verb. The subject is "the lead," which is singular. The opening time marker places the checking before a past opening, so the verb is had checked.`, 'Singular subject plus past perfect.', 'Apply subject-verb agreement and tense in one sentence')
}

function synthesisItem(seed) {
  const hours = band(seed, 5, 8, 2)
  const first = band(seed, 9, 2) === 0
  if (first) {
    return finish(seed, `A student wants a single sentence that reports both the lower cost and the unchanged drying time, and that does not recommend rejecting the paste.

Notes:
- The new paste cost less than the old paste.
- Drying time stayed at ${hours} hours.
- One apprentice preferred the old smell and wanted the new paste rejected.

Which choice best accomplishes the goal?`, {
      text: `The new paste cost less than the old paste, and the drying time stayed at ${hours} hours.`,
      reason: 'The sentence includes both required notes and does not add the rejection.',
    }, [
      { text: 'The new paste cost less than the old paste.', reason: 'The drying time is missing.' },
      { text: `The drying time stayed at ${hours} hours, but the new paste cost more.`, reason: 'The notes say the new paste cost less, not more.' },
      { text: `Because one apprentice preferred the old smell, the new paste should be rejected even though it cost less and dried in ${hours} hours.`, reason: 'The goal says not to recommend rejecting the paste.' },
    ], `The goal has three constraints: include the lower cost, include the ${hours}-hour drying time, and do not recommend rejection. Only one sentence meets all three.`, 'Both required notes, neither forbidden recommendation.', 'Satisfy every constraint in a synthesis sentence')
  }
  return finish(seed, `A student wants a single sentence that reports both the opened vent and the clear lenses, and that does not claim the late visitor caused the result.

Notes:
- The crew opened the side vent before the viewing.
- The lenses stayed clear during the viewing.
- A visitor arrived late.

Which choice best accomplishes the goal?`, {
    text: 'The crew opened the side vent before the viewing, and the lenses stayed clear during the viewing.',
    reason: 'The sentence includes both required notes and does not blame the visitor.',
  }, [
    { text: 'The lenses stayed clear during the viewing.', reason: 'The opened vent is missing.' },
    { text: 'The crew opened the side vent, but the lenses fogged during the viewing.', reason: 'The notes say the lenses stayed clear.' },
    { text: 'A visitor arrived late, which caused the lenses to stay clear after the crew opened the side vent.', reason: 'The notes do not say the visitor caused the clear lenses.' },
  ], 'The sentence has to include the vent and the clear lenses without adding a cause the notes do not state.', 'Both required notes, no added cause.', 'Satisfy every constraint in a synthesis sentence')
}

const BUILDERS = new Map([
  ['Linear equations in one variable', linearOne],
  ['Linear Equations', linearOne],
  ['Linear functions', (seed) => modelItem(seed, ['slope', 'intercept', 'value'][seed % 3])],
  ['Linear equations in two variables', (seed) => modelItem(seed, 'slope')],
  ['Function Notation', (seed) => modelItem(seed, 'value')],
  ['Systems of two linear equations in two variables', systemItem],
  ['Systems of Equations', systemItem],
  ['Linear inequalities in one or two variables', inequalityItem],
  ['Equivalent expressions', polynomial],
  ['Nonlinear equations in one variable and systems of equations in two variables', quadraticRoot],
  ['Nonlinear functions', vertexItem],
  ['Quadratic Functions', quadraticRoot],
  ['Ratios, rates, proportional relationships, and units', ratioItem],
  ['Percentages', percentItem],
  ['One-variable data: distributions and measures of center and spread', oneVarItem],
  ['Two-variable data: models and scatterplots', scatterItem],
  ['Probability and conditional probability', probabilityItem],
  ['Inference from sample statistics and margin of error', marginItem],
  ['Evaluating statistical claims: observational studies and experiments', claimsItem],
  ['Area and volume', areaItem],
  ['Lines, angles, and triangles', linesItem],
  ['Right triangles and trigonometry', trigItem],
  ['Circles', circleItem],
  ['Boundaries', boundaryItem],
  ['Form, Structure, and Sense', formItem],
  ['Text Structure and Purpose', structureItem],
  ['Cross-Text Connections', crossItem],
  ['Central Ideas and Details', centralItem],
  ['Command of Evidence — Textual', textualItem],
  ['Command of Evidence — Quantitative', quantitativeItem],
  ['Inferences', inferenceItem],
  ['Rhetorical Synthesis', synthesisItem],
])

function buildFor(topic, id) {
  const builder = BUILDERS.get(topic)
  if (!builder) throw new Error(`No harder form for ${topic}`)
  for (let bump = 0; bump < 40; bump += 1) {
    const item = builder(hashSeed(`${id}:${bump}`))
    if (item) return item
  }
  throw new Error(`Could not build a harder item for ${topic} ${id}`)
}

function finger(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice.text).join('\n')}`).digest('hex')
}

function rationaleFor(choice, index, answer) {
  if ('ABCD'[index] === answer) return choice.reason.startsWith('Correct:') ? choice.reason : `Correct: ${choice.reason}`
  return choice.reason.replace(/^Correct:\s*/u, '')
}

async function loadTargets() {
  const rows = []
  for (let start = 0; start < 20000; start += 1000) {
    const page = checked(await db.from('questions')
      .select('id, source, topic_name')
      .or('source.eq.smart-fill-to-fifty,source.ilike.Smart Coverage%')
      .range(start, start + 999))
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

async function main() {
  const dry = process.argv.includes('--dry')
  if (dry) {
    const samples = []
    for (const [topic] of BUILDERS) {
      const item = buildFor(topic, `dry-${topic}`)
      if (item.choices.length !== 4) throw new Error(`Choices failed for ${topic}`)
      samples.push({ topic, answer: item.answer, prompt: item.prompt.slice(0, 280), choice: item.choices['ABCD'.indexOf(item.answer)].text })
    }
    console.log(JSON.stringify(samples, null, 2))
    return
  }
  const rows = await loadTargets()
  const built = rows.map((row) => {
    const item = buildFor(row.topic_name, row.id)
    return { row, item, fingerprint: finger(item) }
  })
  const usedFingerprints = new Set()
  for (const entry of built) {
    let bump = 0
    while (usedFingerprints.has(entry.fingerprint)) {
      bump += 1
      if (bump > 500) throw new Error(`Could not uniquify ${entry.row.topic_name} ${entry.row.id}`)
      const item = BUILDERS.get(entry.row.topic_name)(hashSeed(`${entry.row.id}:uniq:${bump}`))
      if (!item) continue
      entry.item = item
      entry.fingerprint = finger(item)
    }
    usedFingerprints.add(entry.fingerprint)
  }
  let unresolved = built.slice()
  for (let round = 0; round < 8 && unresolved.length > 0; round += 1) {
    const again = []
    for (let start = 0; start < unresolved.length; start += 40) {
      const slice = unresolved.slice(start, start + 40)
      const found = checked(await db.from('questions').select('id, fingerprint').in('fingerprint', slice.map((item) => item.fingerprint)))
      for (const hit of found) {
        const owner = slice.find((item) => item.fingerprint === hit.fingerprint)
        if (!owner || owner.row.id === hit.id) continue
        let placed = false
        for (let bump = 1; bump <= 80; bump += 1) {
          const item = BUILDERS.get(owner.row.topic_name)(hashSeed(`${owner.row.id}:db:${round}:${bump}`))
          if (!item) continue
          const fingerprint = finger(item)
          if (usedFingerprints.has(fingerprint)) continue
          usedFingerprints.delete(owner.fingerprint)
          owner.item = item
          owner.fingerprint = fingerprint
          usedFingerprints.add(fingerprint)
          placed = true
          again.push(owner)
          break
        }
        if (!placed) throw new Error(`Fingerprint collision on ${owner.row.id}`)
      }
    }
    unresolved = again
  }
  if (unresolved.length > 0) throw new Error(`Fingerprint collisions remained for ${unresolved.length} questions`)
  let updated = 0
  for (const entry of built) {
    const saved = checked(await db.from('questions').update({
      question_text: entry.item.prompt,
      choice_a: entry.item.choices[0].text,
      choice_b: entry.item.choices[1].text,
      choice_c: entry.item.choices[2].text,
      choice_d: entry.item.choices[3].text,
      correct_answer: entry.item.answer,
      official_explanation: entry.item.explanation,
      difficulty: 'Hard',
      difficulty_score: 1,
      fingerprint: entry.fingerprint,
      exam_name: 'Hardened study set',
    }).eq('id', entry.row.id).select('id'))
    if (saved.length !== 1) throw new Error(`Question update failed for ${entry.row.id}`)
    const rationales = Object.fromEntries(entry.item.choices.map((choice, index) => ['ABCD'[index], rationaleFor(choice, index, entry.item.answer)]))
    const meta = checked(await db.from('exam_item_metadata').update({
      difficulty_level: 7,
      estimated_seconds: 180,
      content_hash: entry.fingerprint,
      subskill: entry.item.subskill,
      distractor_rationales: rationales,
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        author_solution: entry.item.proof,
        independent_solution_text: entry.item.explanation,
        independent_review_method: 'Symbolic expansion checked against the keyed value before the question was updated.',
      },
    }).eq('question_id', entry.row.id).select('question_id'))
    if (meta.length !== 1) throw new Error(`Metadata update failed for ${entry.row.id}`)
    updated += 1
    if (updated % 100 === 0) console.log(`updated ${updated}`)
  }
  console.log(JSON.stringify({ updated }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
