import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { saveSmartBatch } from './smart-batch-lib.mjs'

const SHOPS = [
  'bindery', 'foundry', 'aviary', 'tannery', 'observatory', 'darkroom', 'planetarium', 'smithy',
  'sail loft', 'glass studio', 'puppet loft', 'dye house', 'canoe shed', 'map depot', 'spice vault',
  'bell tower', 'wool shed', 'lens bench', 'ticket booth', 'radio booth',
]
const FACTORS = [
  'hinge oil', 'wick length', 'shelf spacing', 'cloth dampness', 'ticket tension', 'lens cloth',
  'paste thickness', 'stack weight', 'label ink', 'door seal', 'tray size', 'lamp height',
  'salt dose', 'string gauge', 'glass thickness', 'reed gap', 'brush width', 'pin length', 'mat edge', 'vent opening',
]
const OUTCOMES = [
  'fewer warped boards', 'fewer torn tickets', 'clearer lenses', 'fewer curled pages', 'fewer stuck hinges',
  'fewer faded labels', 'fewer cracked trays', 'steadier lamps', 'fewer loose pins', 'fewer fogged panes',
]
const SAMES = [
  'room temperature', 'crew size', 'supplier', 'shift length', 'tool brand', 'weekday',
]

const TOPICS = [
  ['boundaries', '870efd4e-1ace-4e33-a88d-1238f9dda63f', 'Reading and Writing', 'Standard English Conventions', 'Boundaries', 41],
  ['form', '3e2f1c86-de13-4afd-a3bd-4653bf74a9a9', 'Reading and Writing', 'Standard English Conventions', 'Form, Structure, and Sense', 41],
  ['structure', 'd85bb3f4-d84f-4d16-96a7-4365ffc1856e', 'Reading and Writing', 'Craft and Structure', 'Text Structure and Purpose', 41],
  ['cross', 'fc951534-cf36-49c7-af23-dc92306f7255', 'Reading and Writing', 'Craft and Structure', 'Cross-Text Connections', 41],
  ['central', '822996df-a40d-4099-bcbc-67926c7db4bb', 'Reading and Writing', 'Information and Ideas', 'Central Ideas and Details', 33],
  ['textual', '1b786c44-60fc-4847-a4b8-e6720bb19ca2', 'Reading and Writing', 'Information and Ideas', 'Command of Evidence \u2014 Textual', 33],
  ['quant', 'f370851a-c940-482a-b7e4-1955f9bb38aa', 'Reading and Writing', 'Information and Ideas', 'Command of Evidence \u2014 Quantitative', 33],
  ['inferences', '3799e6f5-5b66-4f97-a1d3-b8e5f8a7c8ea', 'Reading and Writing', 'Information and Ideas', 'Inferences', 33],
  ['synthesis', 'd1000000-0000-0000-0000-000000000032', 'Reading and Writing', 'Expression of Ideas', 'Rhetorical Synthesis', 2],
  ['linearOne', '0ec77160-829a-4dae-a4b8-4b2deb7ce0d3', 'Math', 'Algebra', 'Linear equations in one variable', 34],
  ['linearFn', '4af6e28e-b347-42b2-9002-9c61b0cc2b3d', 'Math', 'Algebra', 'Linear functions', 30],
  ['linearTwo', 'ba7665a1-42b8-418b-be66-c622fdb5dab7', 'Math', 'Algebra', 'Linear equations in two variables', 30],
  ['systems', '7e5397f6-600c-463c-bf94-1d2decb326ac', 'Math', 'Algebra', 'Systems of two linear equations in two variables', 29],
  ['inequalities', 'db0442da-37c4-405c-9fd1-596961ef885b', 'Math', 'Algebra', 'Linear inequalities in one or two variables', 27],
  ['equivalent', '5bd48af1-4c30-4e4f-90c9-f3a089465b34', 'Math', 'Advanced Math', 'Equivalent expressions', 21],
  ['nonlinearEq', '8fa0c827-17a1-4818-8f8b-c8548138aa77', 'Math', 'Advanced Math', 'Nonlinear equations in one variable and systems of equations in two variables', 31],
  ['nonlinearFn', '996d94ff-c108-434e-99b2-1ac9ebde5c8b', 'Math', 'Advanced Math', 'Nonlinear functions', 22],
  ['ratios', 'c2943bee-e5c8-4abb-a01e-804f2821dc91', 'Math', 'Problem-Solving and Data Analysis', 'Ratios, rates, proportional relationships, and units', 33],
  ['percentages', 'd1000000-0000-0000-0000-000000000014', 'Math', 'Problem-Solving and Data Analysis', 'Percentages', 17],
  ['oneVar', '8b14721b-dbbf-46a5-83e7-7cd0d5f46ef0', 'Math', 'Problem-Solving and Data Analysis', 'One-variable data: distributions and measures of center and spread', 33],
  ['scatter', 'f05315c9-e062-4710-8bcd-532ab48d6296', 'Math', 'Problem-Solving and Data Analysis', 'Two-variable data: models and scatterplots', 34],
  ['probability', 'cf2a63b6-90ae-4029-8e84-e6be5811d2e9', 'Math', 'Problem-Solving and Data Analysis', 'Probability and conditional probability', 34],
  ['margin', '5922a7e3-02f4-43d6-b57c-9d38607b8f01', 'Math', 'Problem-Solving and Data Analysis', 'Inference from sample statistics and margin of error', 34],
  ['claims', 'ae792ea1-a18b-464a-99c3-90988d3830c1', 'Math', 'Problem-Solving and Data Analysis', 'Evaluating statistical claims: observational studies and experiments', 34],
  ['area', '49ee6272-d5e3-4459-ba69-03f113c49779', 'Math', 'Geometry and Trigonometry', 'Area and volume', 34],
  ['lines', 'b6a6ef1a-b9e8-4319-877b-c61e82b8e322', 'Math', 'Geometry and Trigonometry', 'Lines, angles, and triangles', 34],
  ['trig', '9d7afe8b-a998-4814-9707-d815674d0322', 'Math', 'Geometry and Trigonometry', 'Right triangles and trigonometry', 35],
  ['circles', 'd1000000-0000-0000-0000-000000000021', 'Math', 'Geometry and Trigonometry', 'Circles', 3],
].map(([key, id, section, domain, topic, gap]) => ({
  key, id, exam: 'SAT', section, domain, topic, gap,
}))

function hashSeed(text) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

function seededShuffle(list, seed) {
  let state = seed || 1
  const copy = list.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const swap = state % (index + 1)
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

function level(index) {
  return [4, 5, 6, 7, 7][index % 5]
}

function shop(index) {
  return SHOPS[index % SHOPS.length]
}

function at(list, index) {
  return list[index % list.length]
}

function axb(coefficient, constant, variable = 'x') {
  const body = coefficient === 1 ? variable : coefficient === -1 ? `-${variable}` : `${coefficient}${variable}`
  if (constant === 0) return body
  return constant > 0 ? `${body} + ${constant}` : `${body} - ${-constant}`
}

function wrongNumbers(answer, candidates) {
  const found = []
  for (const value of candidates) {
    if (!Number.isInteger(value) || value === answer || found.includes(value)) continue
    found.push(value)
    if (found.length === 3) return found
  }
  return null
}

function finish(spec) {
  if (!spec.prompt || !spec.explanation || !spec.proof || !spec.subskill) return null
  if (spec.wrongs.length !== 3) return null
  const expression = Boolean(spec.expressionAnswer)
  const correct = {
    text: String(spec.correctText),
    value: expression ? null : spec.answerValue,
    reason: spec.correctReason,
    correct: true,
  }
  const wrongs = spec.wrongs.map((wrong) => ({
    text: String(wrong.text),
    value: expression ? null : wrong.value,
    reason: wrong.reason,
    correct: false,
  }))
  if ([correct, ...wrongs].some((choice) => !choice.reason || /^Correct:/u.test(choice.reason))) return null
  if (new Set([correct.text, ...wrongs.map((choice) => choice.text)]).size !== 4) return null
  if (expression) {
    if (correct.text !== spec.expressionAnswer) return null
  } else {
    const matched = [correct, ...wrongs].filter((choice) => typeof choice.value === 'number' && Math.abs(choice.value - spec.answerValue) < 1e-9)
    if (matched.length !== 1 || matched[0].text !== correct.text) return null
  }
  const mixed = seededShuffle([correct, ...wrongs], hashSeed(`${spec.prompt}\n${correct.text}`))
  const answer = 'ABCD'[mixed.findIndex((choice) => choice.correct)]
  const item = {
    target: spec.target,
    prompt: spec.prompt,
    choices: mixed.map((choice) => ({ text: choice.text, value: choice.value, reason: choice.reason })),
    answer,
    explanation: spec.explanation,
    proof: spec.proof,
    subskill: spec.subskill,
    difficulty: spec.difficulty,
    seconds: spec.difficulty >= 6 ? 95 : 70,
  }
  if (expression) item.expressionAnswer = spec.expressionAnswer
  else item.answerValue = spec.answerValue
  return item
}

function numeric(spec) {
  const wrongs = wrongNumbers(spec.answer, spec.candidates)
  if (!wrongs) return null
  return finish({
    ...spec,
    answerValue: spec.answer,
    correctText: String(spec.answer),
    correctReason: spec.explanation,
    wrongs: wrongs.map((value) => ({ text: String(value), value, reason: spec.why(value) })),
  })
}

function verbal(spec) {
  return finish({
    ...spec,
    answerValue: 1,
    correctReason: spec.explanation,
    wrongs: spec.wrongs.map((wrong, index) => ({ text: wrong.text, value: index + 2, reason: wrong.reason })),
  })
}

function finger(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice.text).join('\n')}`).digest('hex')
}

function collect(key, need, builder) {
  const items = []
  const seen = new Set()
  for (let index = 0; items.length < need && index < 800; index += 1) {
    const item = builder(index)
    if (!item || item.target !== key) continue
    const id = finger(item)
    if (seen.has(id)) continue
    seen.add(id)
    items.push(item)
  }
  if (items.length !== need) throw new Error(`${key} produced ${items.length} of ${need}`)
  return items
}

function validate(items) {
  for (const [index, item] of items.entries()) {
    if (item.choices.length !== 4) throw new Error(`Choice count at ${item.target} ${index}`)
    if (new Set(item.choices.map((choice) => choice.text)).size !== 4) throw new Error(`Duplicate text at ${item.target} ${index}`)
    const keyed = item.choices['ABCD'.indexOf(item.answer)]
    if (item.expressionAnswer) {
      if (keyed.text !== item.expressionAnswer) throw new Error(`Expression mismatch at ${item.target} ${index}`)
    } else {
      const matched = item.choices.filter((choice) => typeof choice.value === 'number' && Math.abs(choice.value - item.answerValue) < 1e-9)
      if (matched.length !== 1 || matched[0] !== keyed) throw new Error(`Numeric mismatch at ${item.target} ${index}`)
    }
  }
}

function linearOne(index) {
  const kind = index % 6
  const place = shop(index)
  const difficulty = level(index)
  if (kind === 0 || kind === 1) {
    const x = 2 + (index % 9)
    const a = 3 + (index % 5)
    let c = 1 + (index % 4)
    if (c === a) c = a + 2
    const b = 1 + (index % 6)
    const d = a * x + b - c * x
    const left = kind === 0 ? axb(a, b) : `${a}(${axb(1, b)})`
    const rightConstant = kind === 0 ? d : d + a * b - b
    const right = axb(c, kind === 0 ? d : a * b + (d - b))
    if (kind === 1) {
      const expandedConstant = a * b
      const solvedRight = c * x + (a * x + expandedConstant - c * x)
      if (solvedRight !== a * x + expandedConstant) return null
      const prompt = `What value of x satisfies ${a}(x + ${b}) = ${axb(c, a * x + a * b - c * x)}?`
      const answer = x
      const explanation = `Distribute to get ${axb(a, a * b)} = ${axb(c, a * x + a * b - c * x)}. Then ${a}x - ${c}x = ${a * x + a * b - c * x - a * b}, so x = ${x}.`
      return numeric({
        target: 'linearOne', prompt, answer, difficulty,
        candidates: [x + 1, x - 1, -x, a * x, b - x, c],
        subskill: 'Distribute, then solve',
        explanation,
        proof: `${a}(x + ${b}) = ${a}x + ${a * b}; solution x = ${x}.`,
        why: (value) => `Substituting ${value} does not make both sides equal.`,
      })
    }
    return numeric({
      target: 'linearOne',
      prompt: `What value of x satisfies ${axb(a, b)} = ${axb(c, d)}?`,
      answer: x,
      difficulty,
      candidates: [x + 1, x - 1, -x, b - d, a - c, d],
      subskill: 'Solve a linear equation',
      explanation: `Subtract ${c}x and ${b} to get ${(a - c)}x = ${d - b}. Dividing gives x = ${x}.`,
      proof: `${a}(${x}) + ${b} = ${a * x + b} and ${c}(${x}) + ${d} = ${c * x + d}.`,
      why: (value) => `Substituting ${value} leaves the two sides unequal.`,
    })
  }
  if (kind === 2) {
    const hours = 3 + (index % 8)
    const rate = 4 + (index % 5)
    const fee = 6 + (index % 7)
    const total = rate * hours + fee
    return numeric({
      target: 'linearOne',
      prompt: `A ${place} charges a $${fee} setup fee plus $${rate} per hour. A bill is $${total}. How many hours were billed?`,
      answer: hours,
      difficulty,
      candidates: [hours + 1, hours - 1, total / rate | 0, fee, rate, hours + fee],
      subskill: 'Solve a one-variable model',
      explanation: `Subtract the $${fee} fee to get $${total - fee}, then divide by $${rate} to get ${hours} hours.`,
      proof: `${rate}(${hours}) + ${fee} = ${total}.`,
      why: (value) => `${rate}(${value}) + ${fee} does not equal ${total}.`,
    })
  }
  if (kind === 3) {
    const a = 2 + (index % 6)
    const b = 3 + (index % 5)
    const right = a + b
    if (a * b === right) return null
    return verbal({
      target: 'linearOne',
      difficulty,
      subskill: 'Recognize no solution',
      prompt: `How many solutions does ${a}(x + ${b}) = ${a}x + ${right} have?`,
      correctText: 'no solutions',
      wrongs: [
        { text: 'exactly one solution', reason: 'The variable terms match, so the equation never reduces to one value of x.' },
        { text: 'exactly two solutions', reason: 'A linear equation does not have two solutions in this form.' },
        { text: 'infinitely many solutions', reason: 'The constants differ, so the two sides are never equal.' },
      ],
      explanation: `The left side is ${a}x + ${a * b} and the right side is ${a}x + ${right}. Since ${a * b} ≠ ${right}, there is no solution.`,
      proof: `${a * b} does not equal ${right}.`,
    })
  }
  if (kind === 4) {
    const a = 2 + (index % 6)
    const b = 2 + (index % 7)
    return verbal({
      target: 'linearOne',
      difficulty,
      subskill: 'Recognize infinitely many solutions',
      prompt: `How many solutions does ${a}(x + ${b}) = ${a}x + ${a * b} have?`,
      correctText: 'infinitely many solutions',
      wrongs: [
        { text: 'no solutions', reason: 'The two sides simplify to the same expression.' },
        { text: 'exactly one solution', reason: 'Every value of x makes the simplified sides equal.' },
        { text: 'exactly two solutions', reason: 'The equation is an identity, not a quadratic.' },
      ],
      explanation: `Distribute the left side to get ${a}x + ${a * b}, which matches the right side for every x.`,
      proof: `${a}(x + ${b}) = ${a}x + ${a * b}.`,
    })
  }
  const x = 2 + (index % 8)
  const a = 4 + (index % 4)
  const c = 1 + (index % 3)
  const d = 5 + (index % 6)
  const k = c * x + d - a * x
  return numeric({
    target: 'linearOne',
    prompt: `The equation ${axb(a, 0).replace(/x$/, 'x')} + k = ${axb(c, d)} has solution x = ${x}. What is k?`.replace(`${a}x + k`, `${a === 1 ? '' : a}x + k`),
    answer: k,
    difficulty,
    candidates: [k + x, k - a, -k, d, a * x, c * x],
    subskill: 'Solve for a parameter',
    explanation: `Substitute x = ${x}: ${a}(${x}) + k = ${c}(${x}) + ${d}. Then k = ${c * x + d} - ${a * x} = ${k}.`,
    proof: `${a}*${x} + ${k} = ${a * x + k} and ${c}*${x} + ${d} = ${c * x + d}.`,
    why: (value) => `Using k = ${value} does not make x = ${x} the solution.`,
  })
}

function linearFn(index) {
  const kind = index % 4
  const difficulty = level(index)
  const slope = 2 + (index % 6)
  const intercept = index % 7
  const input = 1 + (index % 8)
  if (kind === 0) {
    const output = slope * input + intercept
    return numeric({
      target: 'linearFn',
      prompt: `The function f is defined by f(x) = ${axb(slope, intercept)}. What is f(${input})?`,
      answer: output, difficulty,
      candidates: [output + slope, output - slope, slope * input, intercept, output + 1, slope + intercept],
      subskill: 'Evaluate a linear function',
      explanation: `f(${input}) = ${slope}(${input}) + ${intercept} = ${output}.`,
      proof: `${slope * input} + ${intercept} = ${output}.`,
      why: (value) => `${slope}(${input}) + ${intercept} is not ${value}.`,
    })
  }
  if (kind === 1) {
    const output = slope * input + intercept
    return numeric({
      target: 'linearFn',
      prompt: `The function f is defined by f(x) = ${axb(slope, intercept)}. For what value of x is f(x) = ${output}?`,
      answer: input, difficulty,
      candidates: [output, slope, intercept, input + 1, input - 1, output - intercept],
      subskill: 'Find an input from an output',
      explanation: `Set ${slope}x + ${intercept} = ${output}. Then ${slope}x = ${output - intercept}, so x = ${input}.`,
      proof: `${slope}(${input}) + ${intercept} = ${output}.`,
      why: (value) => `f(${value}) is not ${output}.`,
    })
  }
  if (kind === 2) {
    return numeric({
      target: 'linearFn',
      prompt: `A ${shop(index)} log fits the function f(t) = ${axb(slope, intercept)}, where t is the hour and f(t) is the number of items finished. By how many items does the total increase each hour?`,
      answer: slope, difficulty,
      candidates: [intercept, slope + intercept, slope - 1, slope * intercept || slope + 2, input, slope + 2],
      subskill: 'Interpret a constant rate',
      explanation: `In f(t) = ${slope}t + ${intercept}, the coefficient of t is the hourly increase, ${slope}.`,
      proof: `f(t + 1) - f(t) = ${slope}.`,
      why: (value) => `The hourly change is the coefficient ${slope}, not ${value}.`,
    })
  }
  const gap = 3 + (index % 6)
  return numeric({
    target: 'linearFn',
    prompt: `f(x) = ${axb(slope, intercept)} and g(x) = ${axb(slope, intercept + gap)}. What is g(x) - f(x) for every x?`,
    answer: gap, difficulty,
    candidates: [slope, intercept, gap + slope, gap - 1, 0, gap + intercept],
    subskill: 'Compare two linear functions',
    explanation: `Subtracting cancels ${slope}x and leaves ${intercept + gap} - ${intercept} = ${gap}.`,
    proof: `(${slope}x + ${intercept + gap}) - (${slope}x + ${intercept}) = ${gap}.`,
    why: (value) => `The x terms cancel, so the difference is ${gap}, not ${value}.`,
  })
}

function linearTwo(index) {
  const difficulty = level(index)
  const slope = 2 + (index % 7)
  const x1 = index % 9
  const y1 = 2 + (index % 8)
  const run = 2 + (index % 5)
  const x2 = x1 + run
  const y2 = y1 + slope * run
  const kind = index % 3
  if (kind === 0) {
    return numeric({
      target: 'linearTwo',
      prompt: `A line passes through (${x1}, ${y1}) and (${x2}, ${y2}). What is the slope of the line?`,
      answer: slope, difficulty,
      candidates: [run, slope + 1, slope - 1, y2 - x2, x2 - x1, y1],
      subskill: 'Compute slope from two points',
      explanation: `Slope = (${y2} - ${y1}) / (${x2} - ${x1}) = ${y2 - y1} / ${run} = ${slope}.`,
      proof: `${y2 - y1} / ${run} = ${slope}.`,
      why: (value) => `The change in y over the change in x is ${slope}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const intercept = y1 - slope * x1
    return numeric({
      target: 'linearTwo',
      prompt: `A line has slope ${slope} and passes through (${x1}, ${y1}). What is its y-intercept?`,
      answer: intercept, difficulty,
      candidates: [y1, slope, x1, intercept + slope, intercept - 1, y1 - x1],
      subskill: 'Find a y-intercept',
      explanation: `Use y = ${slope}x + b with (${x1}, ${y1}): ${y1} = ${slope}(${x1}) + b, so b = ${intercept}.`,
      proof: `${slope}*${x1} + ${intercept} = ${y1}.`,
      why: (value) => `Slope ${slope} through (${x1}, ${y1}) does not give intercept ${value}.`,
    })
  }
  const intercept = y1 - slope * x1
  if (slope === 0 || intercept % slope !== 0) return null
  const xIntercept = -intercept / slope
  return numeric({
    target: 'linearTwo',
    prompt: `A line has equation y = ${axb(slope, intercept)}. What is the x-intercept?`,
    answer: xIntercept, difficulty,
    candidates: [intercept, slope, xIntercept + 1, xIntercept - 1, -intercept, y1],
    subskill: 'Find an x-intercept',
    explanation: `Set y = 0: 0 = ${slope}x + ${intercept}, so x = ${xIntercept}.`,
    proof: `${slope}(${xIntercept}) + ${intercept} = 0.`,
    why: (value) => `${slope}(${value}) + ${intercept} is not 0.`,
  })
}

function systems(index) {
  const difficulty = level(index)
  const kind = index % 4
  const x = 2 + (index % 7)
  const y = 1 + (index % 5)
  if (kind === 0) {
    if (x === y) return null
    const c1 = 2 * x + y
    const c2 = x + 3 * y
    const correct = `(${x}, ${y})`
    const wrongs = [`(${y}, ${x})`, `(${x + 1}, ${y})`, `(${x}, ${y + 1})`]
    if (new Set([correct, ...wrongs]).size !== 4) return null
    return verbal({
      target: 'systems', difficulty,
      subskill: 'Solve a 2-by-2 system',
      prompt: `What ordered pair (x, y) satisfies both ${axb(2, 0)} + y = ${c1} and x + 3y = ${c2}?`,
      correctText: correct,
      wrongs: wrongs.map((text) => ({ text, reason: `${text} does not satisfy both equations.` })),
      explanation: `From the construction, x = ${x} and y = ${y}: 2(${x}) + ${y} = ${c1} and ${x} + 3(${y}) = ${c2}.`,
      proof: `2*${x} + ${y} = ${c1}; ${x} + 3*${y} = ${c2}.`,
    })
  }
  if (kind === 1) {
    const a = 4 + (index % 6)
    return verbal({
      target: 'systems', difficulty,
      subskill: 'No solution',
      prompt: `How many solutions does the system 2x + 3y = ${a} and 4x + 6y = ${2 * a + 3} have?`,
      correctText: 'no solutions',
      wrongs: [
        { text: 'exactly one solution', reason: 'The second equation is not a consistent multiple of the first.' },
        { text: 'infinitely many solutions', reason: 'The constants are not in the same ratio as the coefficients.' },
        { text: 'exactly two solutions', reason: 'Two distinct lines do not meet at two points.' },
      ],
      explanation: `The second left side is twice the first, but ${2 * a + 3} is not twice ${a}. The lines are parallel and distinct.`,
      proof: `2*(${a}) = ${2 * a} ≠ ${2 * a + 3}.`,
    })
  }
  if (kind === 2) {
    const a = 5 + (index % 7)
    return verbal({
      target: 'systems', difficulty,
      subskill: 'Infinitely many solutions',
      prompt: `How many solutions does the system 2x + 3y = ${a} and 4x + 6y = ${2 * a} have?`,
      correctText: 'infinitely many solutions',
      wrongs: [
        { text: 'no solutions', reason: 'The second equation is exactly twice the first, so they match.' },
        { text: 'exactly one solution', reason: 'The equations describe the same line.' },
        { text: 'exactly two solutions', reason: 'A single line has more than two points.' },
      ],
      explanation: `Multiplying 2x + 3y = ${a} by 2 gives 4x + 6y = ${2 * a}, so every point on the line is a solution.`,
      proof: `2*(2x + 3y) = 4x + 6y and 2*${a} = ${2 * a}.`,
    })
  }
  if (x === y) return null
  const small = x
  const large = y
  const count1 = 2
  const count2 = 3
  const totalItems = count1 + count2
  const cost1 = 2 * small + large
  const cost2 = small + 3 * large
  return numeric({
    target: 'systems',
    prompt: `A ${shop(index)} sold ${count1} small kits and 1 large kit for $${cost1}, and 1 small kit and ${count2} large kits for $${cost2}. What is the price, in dollars, of one small kit?`,
    answer: small, difficulty,
    candidates: [large, small + large, cost1, cost2, small + 1, large + 1],
    subskill: 'Write and solve a system',
    explanation: `Let s be the small price and L the large price. Then 2s + L = ${cost1} and s + 3L = ${cost2}. The prices s = ${small} and L = ${large} satisfy both.`,
    proof: `2*${small} + ${large} = ${cost1}; ${small} + 3*${large} = ${cost2}.`,
    why: (value) => `A small price of ${value} does not fit both bills with one large price.`,
  })
}

function inequalities(index) {
  const difficulty = level(index)
  const boundary = 4 + (index % 8)
  const a = 2 + (index % 4)
  const b = 1 + (index % 5)
  const c = a * boundary + b
  const answer = boundary - 1
  const place = shop(index)
  const prompt = index % 2 === 0
    ? `What is the greatest integer x that satisfies ${axb(a, b)} < ${c}?`
    : `A ${place} charges a $${b} fee plus $${a} per hour. A group can spend less than $${c}. What is the greatest whole number of hours the group can buy?`
  return numeric({
    target: 'inequalities', prompt, answer, difficulty,
    candidates: [boundary, boundary + 1, answer - 1, c, a, b],
    subskill: 'Solve and interpret an inequality',
    explanation: `${axb(a, b)} < ${c} gives ${a}x < ${c - b}, so x < ${boundary}. The greatest integer is ${answer}.`,
    proof: `${a}(${answer}) + ${b} = ${a * answer + b} < ${c}, and ${a}(${boundary}) + ${b} = ${c}.`,
    why: (value) => `${value} is not the greatest integer strictly less than ${boundary}.`,
  })
}

function equivalent(index) {
  const difficulty = level(index)
  const kind = index % 4
  const p = 2 + (index % 11)
  const q = 2 + ((index + 3) % 9)
  if (p === q) return null
  if (kind === 0) {
    const correct = `x^2 + ${p + q}x + ${p * q}`
    const wrongs = [`x^2 + ${p * q}x + ${p + q}`, `x^2 + ${p + q}x + ${p * q + p}`, `x^2 + ${p}x + ${q}`]
    if (new Set([correct, ...wrongs]).size !== 4) return null
    return finish({
      target: 'equivalent', difficulty, expressionAnswer: correct,
      subskill: 'Expand a product',
      prompt: `Which expression is equivalent to (x + ${p})(x + ${q})?`,
      correctText: correct,
      correctReason: `(x + ${p})(x + ${q}) = x^2 + ${p + q}x + ${p * q}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'This expansion swaps or changes a term from the product.' })),
      explanation: `Use FOIL: x^2 + ${q}x + ${p}x + ${p * q} = ${correct}.`,
      proof: `x^2 + ${p + q}x + ${p * q}.`,
    })
  }
  if (kind === 1) {
    const correct = `(x + ${p})(x + ${q})`
    const wrongs = [`(x + ${p * q})(x + 1)`, `(x - ${p})(x - ${q})`, `(x + ${p + q})(x + 1)`]
    return finish({
      target: 'equivalent', difficulty, expressionAnswer: correct,
      subskill: 'Factor a quadratic',
      prompt: `Which expression is equivalent to x^2 + ${p + q}x + ${p * q}?`,
      correctText: correct,
      correctReason: `${p} and ${q} multiply to ${p * q} and add to ${p + q}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'Those factors do not multiply back to the quadratic.' })),
      explanation: `The factor pairs of ${p * q} that add to ${p + q} are ${p} and ${q}.`,
      proof: `(x + ${p})(x + ${q}) = x^2 + ${p + q}x + ${p * q}.`,
    })
  }
  if (kind === 2) {
    const correct = `x + ${p}`
    const wrongs = [`x - ${p}`, `x + ${p * p}`, `x^2 + ${p}`]
    return finish({
      target: 'equivalent', difficulty, expressionAnswer: correct,
      subskill: 'Simplify a rational expression',
      prompt: `For x ≠ ${p}, which expression is equivalent to (x^2 - ${p * p})/(x - ${p})?`,
      correctText: correct,
      correctReason: `x^2 - ${p * p} = (x - ${p})(x + ${p}), and x ≠ ${p}, so the quotient is x + ${p}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That expression is not the canceled quotient.' })),
      explanation: `Factor the numerator as (x - ${p})(x + ${p}) and cancel the shared factor x - ${p}.`,
      proof: `(x - ${p})(x + ${p}) / (x - ${p}) = x + ${p}.`,
    })
  }
  const k = 2 + (index % 13)
  const correct = `${k * k}x^2`
  const wrongs = [`${k}x^2`, `${2 * k}x^2`, `${k * k}x`]
  return finish({
    target: 'equivalent', difficulty, expressionAnswer: correct,
    subskill: 'Apply an exponent rule',
    prompt: `Which expression is equivalent to (${k}x)^2?`,
    correctText: correct,
    correctReason: `Square both the coefficient and x: ${k}^2 x^2 = ${k * k}x^2.`,
    wrongs: wrongs.map((text) => ({ text, reason: 'Squaring a product squares each factor.' })),
    explanation: `(${k}x)^2 = ${k}^2 x^2 = ${correct}.`,
    proof: `${k}*${k} = ${k * k}.`,
  })
}

function nonlinearEq(index) {
  const difficulty = level(index)
  const kind = index % 4
  const p = 1 + (index % 12)
  const q = p + 2 + (index % 9)
  if (kind === 0) {
    return numeric({
      target: 'nonlinearEq',
      prompt: `What is the greater solution of (x - ${p})(x - ${q}) = 0?`,
      answer: q, difficulty,
      candidates: [p, p + q, p * q, q + 1, 0, -q],
      subskill: 'Solve a factored quadratic',
      explanation: `A product is zero when x = ${p} or x = ${q}. The greater solution is ${q}.`,
      proof: `(${q} - ${p})(${q} - ${q}) = 0, and ${q} > ${p}.`,
      why: (value) => `${value} is not the greater root.`,
    })
  }
  if (kind === 1) {
    return numeric({
      target: 'nonlinearEq',
      prompt: `The solutions of (x - ${p})(x - ${q}) = 0 are ${p} and ${q}. What is the sum of the solutions?`,
      answer: p + q, difficulty,
      candidates: [p * q, q - p, p, q, p + q + 1, Math.abs(q - p)],
      subskill: 'Use the sum of roots',
      explanation: `Add the solutions from the factors: ${p} + ${q} = ${p + q}.`,
      proof: `${p} + ${q} = ${p + q}.`,
      why: (value) => `The sum of ${p} and ${q} is ${p + q}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const n = 3 + (index % 15)
    const other = 1 - n
    const k = n * (n - 1)
    return numeric({
      target: 'nonlinearEq',
      prompt: `The graphs of y = x^2 and y = x + ${k} intersect at two points. What is the greater x-coordinate of intersection?`,
      answer: n, difficulty,
      candidates: [other, k, 1, n + 1, 0, n - 1],
      subskill: 'Solve a line-parabola system',
      explanation: `Set x^2 = x + ${k}, so x^2 - x - ${k} = 0. The integer solutions are x = ${n} and x = ${other}. The greater is ${n}.`,
      proof: `${n}^2 = ${n * n} and ${n} + ${k} = ${n + k}. ${other}^2 = ${other * other} and ${other} + ${k} = ${other + k}.`,
      why: (value) => `${value} is not the greater intersection x-coordinate.`,
    })
  }
  const n = 2 + (index % 15)
  const c = n * n - n
  const extra = 1 - n
  return numeric({
    target: 'nonlinearEq',
    prompt: `What is the solution of sqrt(x + ${c}) = x?`,
    answer: n, difficulty,
    candidates: [extra, c, 0, n + 1, -n, c - n],
    subskill: 'Reject an extraneous radical solution',
    explanation: `Squaring gives x + ${c} = x^2, or x^2 - x - ${c} = 0, with candidates ${n} and ${extra}. Only ${n} satisfies the original equation because the square root cannot equal a negative number.`,
    proof: `sqrt(${n} + ${c}) = sqrt(${n + c}) = ${n}, and ${extra} < 0.`,
    why: (value) => `${value} does not check in the original radical equation as the solution.`,
  })
}

function nonlinearFn(index) {
  const difficulty = level(index)
  const kind = index % 4
  const h = 1 + (index % 6)
  const k = 2 + (index % 8)
  if (kind === 0) {
    return numeric({
      target: 'nonlinearFn',
      prompt: `The function f is defined by f(x) = (x - ${h})^2 + ${k}. What is the minimum value of f?`,
      answer: k, difficulty,
      candidates: [h, h + k, -k, 0, k + 1, h * h],
      subskill: 'Read a minimum from vertex form',
      explanation: `A square is at least 0, so the minimum is the added constant ${k}, at x = ${h}.`,
      proof: `(x - ${h})^2 >= 0, so f(x) >= ${k}.`,
      why: (value) => `The minimum of this vertex form is ${k}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const n = 1 + (index % 5)
    const b = 1 + (index % 4)
    const c = 2 + (index % 3)
    const value = n * n + b * n + c
    return numeric({
      target: 'nonlinearFn',
      prompt: `f(x) = x^2 + ${b}x + ${c}. What is f(${n})?`,
      answer: value, difficulty,
      candidates: [n * n, b * n + c, value + n, value - b, n + b + c, value + 1],
      subskill: 'Evaluate a quadratic',
      explanation: `f(${n}) = ${n}^2 + ${b}(${n}) + ${c} = ${n * n} + ${b * n} + ${c} = ${value}.`,
      proof: `${n * n} + ${b * n} + ${c} = ${value}.`,
      why: (valueWrong) => `The evaluated quadratic is ${value}, not ${valueWrong}.`,
    })
  }
  if (kind === 2) {
    const start = 3 + (index % 5)
    const days = 2 + (index % 3)
    const value = start * 2 ** days
    return numeric({
      target: 'nonlinearFn',
      prompt: `A ${shop(index)} culture starts at ${start} cells and doubles every day. How many cells are there after ${days} days?`,
      answer: value, difficulty,
      candidates: [start * days, start + days, start * 2 * days, value / 2, start ** days, value + start],
      subskill: 'Evaluate exponential growth',
      explanation: `After ${days} doublings, the count is ${start} * 2^${days} = ${value}.`,
      proof: `${start} * ${2 ** days} = ${value}.`,
      why: (wrong) => `Doubling ${days} times is multiplication by ${2 ** days}, not a result of ${wrong}.`,
    })
  }
  const intercept = h * h + k
  return numeric({
    target: 'nonlinearFn',
    prompt: `f(x) = (x - ${h})^2 + ${k}. What is the y-intercept of the graph?`,
    answer: intercept, difficulty,
    candidates: [k, h, h + k, intercept + 1, h * h, -h],
    subskill: 'Find a y-intercept',
    explanation: `The y-intercept is f(0) = (0 - ${h})^2 + ${k} = ${h * h} + ${k} = ${intercept}.`,
    proof: `${h * h} + ${k} = ${intercept}.`,
    why: (value) => `f(0) equals ${intercept}, not ${value}.`,
  })
}

function ratios(index) {
  const difficulty = level(index)
  const kind = index % 4
  const place = shop(index)
  if (kind === 0) {
    const hours = 2 + (index % 6)
    const rate = 12 + (index % 8)
    const miles = rate * hours
    return numeric({
      target: 'ratios',
      prompt: `A delivery from the ${place} travels ${miles} miles in ${hours} hours at a constant speed. What is the speed in miles per hour?`,
      answer: rate, difficulty,
      candidates: [miles, hours, rate + hours, miles - hours, rate * hours, rate - 1],
      subskill: 'Compute a unit rate',
      explanation: `Divide distance by time: ${miles} / ${hours} = ${rate} miles per hour.`,
      proof: `${rate} * ${hours} = ${miles}.`,
      why: (value) => `${value} miles per hour for ${hours} hours is not ${miles} miles.`,
    })
  }
  if (kind === 1) {
    const feet = 3 + (index % 9)
    return numeric({
      target: 'ratios',
      prompt: `A rail at the ${place} is ${feet} feet long. How many inches long is the rail? (1 foot = 12 inches.)`,
      answer: feet * 12, difficulty,
      candidates: [feet, feet + 12, feet * 10, 12, feet * 12 + 1, feet * 6],
      subskill: 'Convert units',
      explanation: `Multiply by 12 inches per foot: ${feet} * 12 = ${feet * 12}.`,
      proof: `${feet} * 12 = ${feet * 12}.`,
      why: (value) => `${feet} feet is ${feet * 12} inches, not ${value}.`,
    })
  }
  if (kind === 2) {
    const a = 2 + (index % 4)
    const b = 5 + (index % 5)
    const c = a * (2 + (index % 3))
    const x = b * c / a
    return numeric({
      target: 'ratios',
      prompt: `On a drawing at the ${place}, ${a} centimeters represent ${b} meters. How many meters do ${c} centimeters represent at the same scale?`,
      answer: x, difficulty,
      candidates: [c, b, a * b, x + a, c * a, b + c],
      subskill: 'Solve a proportion',
      explanation: `${a} / ${b} = ${c} / x, so x = ${b} * ${c} / ${a} = ${x}.`,
      proof: `${a} * ${x} = ${a * x} and ${b} * ${c} = ${b * c}.`,
      why: (value) => `${a} * ${value} does not equal ${b * c}.`,
    })
  }
  const pairs = [[6, 3], [4, 12], [6, 12], [3, 6], [4, 4], [6, 6], [8, 8], [8, 24], [5, 20], [4, 6]]
  const [left, right] = pairs[index % pairs.length]
  const together = left * right / (left + right)
  if (!Number.isInteger(together)) return null
  return numeric({
    target: 'ratios',
    prompt: `Working alone, one clerk at the ${place} finishes a job in ${left} hours and another finishes the same job in ${right} hours. Working together at those rates, how many hours do they need to finish one job?`,
    answer: together, difficulty,
    candidates: [left + right, left, right, together + 1, Math.min(left, right), left * right],
    subskill: 'Combine work rates',
    explanation: `Their combined rate is 1/${left} + 1/${right} = ${left + right}/${left * right}, so the time is ${together} hours.`,
    proof: `${left} * ${right} / (${left} + ${right}) = ${together}.`,
    why: (value) => `The combined time is ${together} hours, not ${value}.`,
  })
}

function percentages(index) {
  const difficulty = level(index)
  const kind = index % 4
  const place = shop(index)
  if (kind === 0) {
    const percents = [10, 20, 25, 40, 50]
    const bases = [40, 60, 80, 120, 160]
    const percent = percents[index % percents.length]
    const base = bases[(index + 2) % bases.length]
    const answer = base * percent / 100
    return numeric({
      target: 'percentages',
      prompt: `A ${place} order has ${base} items, and ${percent}% of them need a reprint. How many items need a reprint?`,
      answer, difficulty,
      candidates: [percent, base, answer + percent, base - answer, answer * 2, base / percent | 0],
      subskill: 'Find a percent of a number',
      explanation: `${percent}% of ${base} is ${percent / 100} * ${base} = ${answer}.`,
      proof: `${base} * ${percent} / 100 = ${answer}.`,
      why: (value) => `${percent}% of ${base} is ${answer}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const old = 40 * (1 + (index % 4))
    const increase = [10, 20, 25, 50][index % 4]
    const next = old + old * increase / 100
    return numeric({
      target: 'percentages',
      prompt: `A ${place} count rose from ${old} to ${next}. By what percent did it increase?`,
      answer: increase, difficulty,
      candidates: [next - old, old, next, increase + 10, increase - 5, 100],
      subskill: 'Find a percent change',
      explanation: `The change is ${next - old}. Divide by the original ${old}: ${next - old}/${old} = ${increase}%.`,
      proof: `${old} * ${increase} / 100 = ${next - old}.`,
      why: (value) => `The percent increase is ${increase}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const original = 40 + (index % 6) * 20
    const off = [10, 20, 25, 50][index % 4]
    const paid = original * (100 - off) / 100
    return numeric({
      target: 'percentages',
      prompt: `A ${place} kit costs $${original}. During a ${off}% discount, what is the sale price in dollars?`,
      answer: paid, difficulty,
      candidates: [original - off, off, original, paid + off, original / 2 | 0, paid - 1],
      subskill: 'Apply a percent discount',
      explanation: `The buyer pays ${100 - off}% of $${original}, which is ${paid}.`,
      proof: `${original} * ${100 - off} / 100 = ${paid}.`,
      why: (value) => `The sale price is ${paid}, not ${value}.`,
    })
  }
  const off = [20, 25, 10, 50][index % 4]
  const original = 40 + (index % 5) * 20
  const paid = original * (100 - off) / 100
  return numeric({
    target: 'percentages',
    prompt: `After a ${off}% discount, a ${place} tool costs $${paid}. What was the price in dollars before the discount?`,
    answer: original, difficulty,
    candidates: [paid, paid + off, original - off, paid * off, original + off, paid + paid],
    subskill: 'Recover an original price',
    explanation: `$${paid} is ${100 - off}% of the original price, so the original price is ${paid} / ${(100 - off) / 100} = ${original}.`,
    proof: `${original} * ${100 - off} / 100 = ${paid}.`,
    why: (value) => `${off}% off ${value} is not ${paid}.`,
  })
}

function oneVar(index) {
  const difficulty = level(index)
  const base = 4 + (index % 6)
  const k = 4 + (index % 3)
  const outlier = base + 1 + 5 * k
  const values = [base, base + 1, base + 1, base + 2, outlier]
  const kind = index % 4
  const list = values.join(', ')
  if (kind === 0) {
    const median = base + 1
    return numeric({
      target: 'oneVar',
      prompt: `A ${shop(index)} recorded these five counts: ${list}. What is the median?`,
      answer: median, difficulty,
      candidates: [outlier, base, values.reduce((sum, value) => sum + value, 0) / 5, outlier - base, base + 2, median + k],
      subskill: 'Find a median',
      explanation: `Ordered, the middle of the five counts is ${median}. The outlier ${outlier} does not change the middle position.`,
      proof: `Sorted list middle = ${median}.`,
      why: (value) => `The middle value is ${median}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const mean = base + 1 + k
    return numeric({
      target: 'oneVar',
      prompt: `A ${shop(index)} recorded these five counts: ${list}. What is the mean?`,
      answer: mean, difficulty,
      candidates: [base + 1, outlier, base, mean + 1, k, outlier - base],
      subskill: 'Find a mean',
      explanation: `The sum is ${values.reduce((sum, value) => sum + value, 0)}. Dividing by 5 gives ${mean}.`,
      proof: `5 * ${mean} = ${5 * mean}.`,
      why: (value) => `The mean of the five counts is ${mean}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const range = outlier - base
    return numeric({
      target: 'oneVar',
      prompt: `A ${shop(index)} recorded these five counts: ${list}. What is the range?`,
      answer: range, difficulty,
      candidates: [outlier, base, base + 1, range - 1, k, values.reduce((sum, value) => sum + value, 0)],
      subskill: 'Find a range',
      explanation: `Range = largest - smallest = ${outlier} - ${base} = ${range}.`,
      proof: `${outlier} - ${base} = ${range}.`,
      why: (value) => `The range is ${range}, not ${value}.`,
    })
  }
  const reduced = base + 1
  return numeric({
    target: 'oneVar',
    prompt: `A ${shop(index)} recorded these five counts: ${list}. If the outlier ${outlier} is removed, what is the mean of the remaining four counts?`,
    answer: reduced, difficulty,
    candidates: [base + 1 + k, outlier, base, reduced + 1, k, rangeOr(outlier, base)],
    subskill: 'See how an outlier affects the mean',
    explanation: `The remaining sum is ${4 * reduced}. Dividing by 4 gives ${reduced}. The original mean was ${base + 1 + k}.`,
    proof: `(${base} + ${base + 1} + ${base + 1} + ${base + 2}) / 4 = ${reduced}.`,
    why: (value) => `The mean without ${outlier} is ${reduced}, not ${value}.`,
  })
}

function rangeOr(outlier, base) {
  return outlier - base
}

function scatter(index) {
  const difficulty = level(index)
  const slope = 2 + (index % 5)
  const intercept = 3 + (index % 6)
  const x1 = 1 + (index % 4)
  const x2 = x1 + 2
  const y1 = slope * x1 + intercept
  const y2 = slope * x2 + intercept
  const kind = index % 4
  if (kind === 0) {
    return numeric({
      target: 'scatter',
      prompt: `On a scatterplot for a ${shop(index)}, two points on the fitted line are (${x1}, ${y1}) and (${x2}, ${y2}). What is the slope of the fitted line?`,
      answer: slope, difficulty,
      candidates: [x2 - x1, intercept, slope + 1, y1, slope - 1, y2 - x2],
      subskill: 'Find a model slope',
      explanation: `Slope = (${y2} - ${y1}) / (${x2} - ${x1}) = ${y2 - y1} / 2 = ${slope}.`,
      proof: `${y2 - y1} / 2 = ${slope}.`,
      why: (value) => `The fitted slope is ${slope}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const x = x2 + 2
    const predicted = slope * x + intercept
    return numeric({
      target: 'scatter',
      prompt: `A fitted line for a ${shop(index)} is y = ${axb(slope, intercept)}. Using the line, what value of y is predicted when x = ${x}?`,
      answer: predicted, difficulty,
      candidates: [x, intercept, slope * x, predicted + slope, predicted - intercept, slope],
      subskill: 'Use a linear model',
      explanation: `Substitute x = ${x}: ${slope}(${x}) + ${intercept} = ${predicted}.`,
      proof: `${slope * x} + ${intercept} = ${predicted}.`,
      why: (value) => `The line predicts ${predicted}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const x = x1 + 1
    const predicted = slope * x + intercept
    const residual = 3 + (index % 4)
    const actual = predicted + residual
    return numeric({
      target: 'scatter',
      prompt: `A fitted line is y = ${axb(slope, intercept)}. A point at x = ${x} has actual y-value ${actual}. What is the residual, actual minus predicted?`,
      answer: residual, difficulty,
      candidates: [predicted, actual, -residual, residual + 1, slope, intercept],
      subskill: 'Compute a residual',
      explanation: `The line predicts ${slope}(${x}) + ${intercept} = ${predicted}. The residual is ${actual} - ${predicted} = ${residual}.`,
      proof: `${actual} - ${predicted} = ${residual}.`,
      why: (value) => `Actual minus predicted is ${residual}, not ${value}.`,
    })
  }
  return verbal({
    target: 'scatter', difficulty,
    subskill: 'Interpret a slope',
    prompt: `For a ${shop(index)}, the fitted line is y = ${axb(slope, intercept)}, where x is the number of hours and y is the number of items finished. Which statement interprets the slope?`,
    correctText: `The model predicts ${slope} additional items for each additional hour.`,
    wrongs: [
      { text: `The model predicts ${intercept} additional items for each additional hour.`, reason: `${intercept} is the intercept, the prediction at 0 hours.` },
      { text: `The model predicts ${slope} items in total, no matter how many hours pass.`, reason: `${slope} is a rate per hour, not a fixed total.` },
      { text: `The model predicts the item count decreases by ${slope} for each additional hour.`, reason: 'The slope is positive, so the prediction increases.' },
    ],
    explanation: `The coefficient of x is ${slope}, so each extra hour adds ${slope} items in the model.`,
    proof: `(y at x + 1) - (y at x) = ${slope}.`,
  })
}

function probability(index) {
  const difficulty = level(index)
  const kind = index % 4
  const place = shop(index)
  if (kind === 0) {
    const red = 2 + (index % 11)
    const blue = 3 + (index % 13)
    const correct = frac(red, red + blue)
    const wrongs = [frac(blue, red + blue), frac(red, blue), frac(red, red + blue + 1), `${red}/${red + blue}`].filter((text, position, list) => list.indexOf(text) === position && text !== correct)
    if (wrongs.length < 3) return null
    return finish({
      target: 'probability', difficulty, expressionAnswer: correct,
      subskill: 'Find a simple probability',
      prompt: `A drawer at the ${place} has ${red} red tags and ${blue} blue tags. One tag is drawn at random. What is the probability it is red?`,
      correctText: correct,
      correctReason: `There are ${red} red tags out of ${red + blue} tags.`,
      wrongs: wrongs.slice(0, 3).map((text) => ({ text, reason: 'That fraction does not compare red tags with the total.' })),
      explanation: `The probability is ${red} / ${red + blue} = ${correct}.`,
      proof: `${red} favorable outcomes and ${red + blue} equally likely outcomes.`,
    })
  }
  if (kind === 1) {
    const juniorReturn = 3 + (index % 11)
    const seniorReturn = 4 + (index % 9)
    const correct = frac(juniorReturn, juniorReturn + seniorReturn)
    const other = frac(seniorReturn, juniorReturn + seniorReturn)
    const all = frac(juniorReturn, juniorReturn + seniorReturn + 5)
    const flipped = frac(juniorReturn + 3, juniorReturn + seniorReturn)
    const wrongs = [other, all, flipped].filter((text) => text !== correct)
    if (new Set([correct, ...wrongs]).size !== 4) return null
    return finish({
      target: 'probability', difficulty, expressionAnswer: correct,
      subskill: 'Find a conditional probability',
      prompt: `Returned trays at the ${place}: ${juniorReturn} came from the junior crew and ${seniorReturn} came from the senior crew. A returned tray is chosen at random. What is the probability it came from the junior crew?`,
      correctText: correct,
      correctReason: `The condition is that the tray was returned, so the denominator is ${juniorReturn + seniorReturn}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That fraction uses the wrong part of the returned group.' })),
      explanation: `Among returned trays, ${juniorReturn} of ${juniorReturn + seniorReturn} are from the junior crew, which is ${correct}.`,
      proof: `${juniorReturn} / ${juniorReturn + seniorReturn} = ${correct}.`,
    })
  }
  if (kind === 2) {
    const a = 1 + (index % 3)
    const b = a + 2 + (index % 4)
    const c = 1 + (index % 2)
    const d = c + 2 + (index % 5)
    const miss = frac((b - a) * (d - c), b * d)
    const hit = subtractFraction(1, 1, (b - a) * (d - c), b * d)
    if (!hit) return null
    const wrongs = [frac(a, b), frac(c, d), miss].filter((text) => text !== hit)
    if (new Set([hit, ...wrongs]).size !== 4) return null
    return finish({
      target: 'probability', difficulty, expressionAnswer: hit,
      subskill: 'Find the probability of at least one event',
      prompt: `Two independent checks at the ${place} succeed with probabilities ${a}/${b} and ${c}/${d}. What is the probability that at least one check succeeds?`,
      correctText: hit,
      correctReason: `Subtract the probability that both fail from 1.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That is only one piece of the at-least-one calculation.' })),
      explanation: `Both fail with probability ${b - a}/${b} * ${d - c}/${d} = ${miss}. At least one succeeds with probability 1 - ${miss} = ${hit}.`,
      proof: `1 - ${miss} = ${hit}.`,
    })
  }
  const trials = 20 * (2 + (index % 8))
  const numerator = 1 + (index % 4)
  const denominator = 5
  if (trials * numerator % denominator !== 0) return null
  const answer = trials * numerator / denominator
  return numeric({
    target: 'probability',
    prompt: `Each item at the ${place} has a ${numerator}/${denominator} chance of needing a repair, independently. In a batch of ${trials} items, how many repairs are expected?`,
    answer, difficulty,
    candidates: [trials, numerator * denominator, answer + denominator, trials / denominator, answer - numerator, numerator * trials],
    subskill: 'Find an expected count',
    explanation: `Expected count = probability times batch size = ${numerator}/${denominator} * ${trials} = ${answer}.`,
    proof: `${trials} * ${numerator} / ${denominator} = ${answer}.`,
    why: (value) => `The expected count is ${answer}, not ${value}.`,
  })
}

function gcd(a, b) {
  let left = Math.abs(a)
  let right = Math.abs(b)
  while (right) {
    const next = left % right
    left = right
    right = next
  }
  return left
}

function frac(numerator, denominator) {
  const divisor = gcd(numerator, denominator)
  return `${numerator / divisor}/${denominator / divisor}`
}

function subtractFraction(wholeNumerator, wholeDenominator, numerator, denominator) {
  const valueNumerator = wholeNumerator * denominator - numerator * wholeDenominator
  const valueDenominator = wholeDenominator * denominator
  if (valueNumerator <= 0 || valueDenominator <= 0) return null
  return frac(valueNumerator, valueDenominator)
}

function margin(index) {
  const difficulty = level(index)
  const estimate = 42 + (index % 20)
  const error = 3 + (index % 5)
  const sample = 80 + (index % 9) * 10
  const place = shop(index)
  const kind = index % 3
  if (kind === 0) {
    return numeric({
      target: 'margin',
      prompt: `A random sample of ${sample} records from the ${place} gave an estimate of ${estimate}% with a margin of error of ${error} percentage points. What is the lower bound of the interval, in percent?`,
      answer: estimate - error, difficulty,
      candidates: [estimate + error, estimate, estimate - 2 * error, estimate + 2 * error, error, sample],
      subskill: 'Build an interval from a margin',
      explanation: `Subtract the margin from the estimate: ${estimate} - ${error} = ${estimate - error}.`,
      proof: `${estimate} - ${error} = ${estimate - error}.`,
      why: (value) => `The lower bound is ${estimate - error}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const inside = estimate
    const outside = estimate + error + 6
    return verbal({
      target: 'margin', difficulty,
      subskill: 'Read a claim from an interval',
      prompt: `A random sample from the ${place} produced the interval from ${estimate - error}% to ${estimate + error}%. Which statement is supported?`,
      correctText: `${inside}% is inside the interval, so it is consistent with the estimate.`,
      wrongs: [
        { text: `The interval proves the true value is exactly ${estimate}%.`, reason: 'An interval is a range, not a proof of one exact value.' },
        { text: `${outside}% is inside the interval from ${estimate - error}% to ${estimate + error}%.`, reason: `${outside} is outside that interval.` },
        { text: `The interval describes a different population from the ${place} records that were sampled.`, reason: 'The prompt says the sample came from the place named in the interval.' },
      ],
      explanation: `${inside} is between ${estimate - error} and ${estimate + error}, so it is consistent with the estimate. The interval does not prove an exact value.`,
      proof: `${estimate - error} ≤ ${inside} ≤ ${estimate + error}, and ${outside} > ${estimate + error}.`,
    })
  }
  return verbal({
    target: 'margin', difficulty,
    subskill: 'Connect sample size and margin',
    prompt: `A random sample of ${sample} records from the ${place} had a margin of error of ${error} percentage points. Which statement is best supported by the idea of margin of error?`,
    correctText: `A larger random sample from the same ${place} records would be expected to have a margin smaller than ${error} percentage points.`,
    wrongs: [
      { text: `A larger random sample would be expected to have a margin larger than ${error} percentage points.`, reason: 'A larger random sample is expected to shrink the margin.' },
      { text: `The margin stays at ${error} percentage points no matter how large the random sample is.`, reason: 'Sample size changes the expected margin.' },
      { text: `The margin of ${error} percentage points is the same quantity as the sample size ${sample}.`, reason: 'The margin and the sample size measure different things.' },
    ],
    explanation: `For a random sample, increasing the sample size is expected to decrease the margin of error.`,
    proof: `The given margin is ${error} points for n = ${sample}; a larger n is expected to reduce it.`,
  })
}

function claims(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index + 3)
  const assigned = index % 2 === 0
  if (assigned) {
    return verbal({
      target: 'claims', difficulty,
      subskill: 'Separate cause from generalization',
      prompt: `Record ${index + 1}: at one ${place}, workers were randomly assigned to use ${factor} or not. The assigned group had ${outcome}. Workers were not randomly selected from other sites. Which conclusion is best supported?`,
      correctText: `The assignment supports a cause-and-effect link between ${factor} and ${outcome} for these workers, not a generalization to every ${place}.`,
      wrongs: [
        { text: `The result shows every ${place} would have ${outcome} if it used ${factor}.`, reason: 'The workers were not a random sample of every site.' },
        { text: `The study supports only a generalization about every ${place}, not a cause-and-effect link.`, reason: 'Random assignment is what supports the cause-and-effect link here.' },
        { text: `The study shows ${factor} had no relationship to ${outcome}.`, reason: 'The assigned group did show the outcome difference described.' },
      ],
      explanation: `Random assignment supports a cause-and-effect conclusion for this group. Without random selection from other sites, the result does not by itself generalize to every ${place}.`,
      proof: `Design flag: random assignment, no random selection from other sites.`,
    })
  }
  return verbal({
    target: 'claims', difficulty,
    subskill: 'Separate generalization from cause',
    prompt: `Record ${index + 1}: a random sample of trays from every ${place} in one city was observed. Trays that already used ${factor} also had ${outcome}. Nothing was randomly assigned. Which conclusion is best supported?`,
    correctText: `The sample can support a generalization about trays in that city, but it does not by itself show that ${factor} caused ${outcome}.`,
    wrongs: [
      { text: `Random sampling shows that ${factor} caused ${outcome}.`, reason: 'Random sampling supports generalization, not cause and effect.' },
        { text: `The result applies only to the one tray that was measured last.`, reason: 'A random sample of that city supports a statement about that city, not about one tray.' },
      { text: `The study shows ${factor} cannot be related to ${outcome}.`, reason: 'The sample found them together; it just cannot prove the cause.' },
    ],
    explanation: `Random sampling supports a generalization to the sampled population. Because the factor was not assigned, the study does not establish cause and effect.`,
    proof: `Design flag: random sample, no random assignment.`,
  })
}

function area(index) {
  const difficulty = level(index)
  const kind = index % 6
  const place = shop(index)
  if (kind === 0) {
    const border = 1 + (index % 3)
    const width = 8 + (index % 4)
    const length = width + 4
    const inner = (length - 2 * border) * (width - 2 * border)
    if (inner <= 0) return null
    return numeric({
      target: 'area',
      prompt: `A rectangular sign at the ${place} is ${length} by ${width}. A border ${border} unit thick is removed on all four sides. What is the area of the inner rectangle?`,
      answer: inner, difficulty,
      candidates: [length * width, (length - border) * (width - border), 2 * (length + width), inner + border, length * border, width * border],
      subskill: 'Find a composite rectangle area',
      explanation: `Each dimension loses two borders: ${length - 2 * border} by ${width - 2 * border}. The inner area is ${inner}.`,
      proof: `(${length} - ${2 * border})(${width} - ${2 * border}) = ${inner}.`,
      why: (value) => `The inner area is ${inner}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const base = 6 + (index % 7) * 2
    const height = 4 + (index % 5) * 2
    const answer = base * height / 2
    return numeric({
      target: 'area',
      prompt: `A triangular panel at the ${place} has base ${base} and height ${height}. What is its area?`,
      answer, difficulty,
      candidates: [base * height, base + height, answer + base, base * height / 4, answer - height, height],
      subskill: 'Find a triangle area',
      explanation: `Area = base * height / 2 = ${base} * ${height} / 2 = ${answer}.`,
      proof: `${base} * ${height} / 2 = ${answer}.`,
      why: (value) => `The triangle area is ${answer}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const length = 3 + (index % 5)
    const width = 2 + (index % 4)
    const height = 4 + (index % 3)
    const answer = length * width * height
    return numeric({
      target: 'area',
      prompt: `A storage box at the ${place} is ${length} by ${width} by ${height}. What is its volume?`,
      answer, difficulty,
      candidates: [2 * (length * width + length * height + width * height), length * width, answer + height, length + width + height, answer / 2, width * height],
      subskill: 'Find a prism volume',
      explanation: `Volume = length * width * height = ${length} * ${width} * ${height} = ${answer}.`,
      proof: `${length} * ${width} * ${height} = ${answer}.`,
      why: (value) => `The volume is ${answer}, not ${value}.`,
    })
  }
  if (kind === 3) {
    const radius = 2 + (index % 5)
    const height = 3 + (index % 6)
    if (radius * height === radius * radius || radius * radius * height === 2 * radius * radius * height) return null
    const correct = `${radius * radius * height}π`
    const wrongs = [`${radius * height}π`, `${radius * radius}π`, `${2 * radius * radius * height}π`]
    if (new Set([correct, ...wrongs]).size !== 4) return null
    return finish({
      target: 'area', difficulty, expressionAnswer: correct,
      subskill: 'Find a cylinder volume',
      prompt: `A cylindrical jar at the ${place} has radius ${radius} and height ${height}. What is its volume?`,
      correctText: correct,
      correctReason: `Volume = π r^2 h = π * ${radius}^2 * ${height} = ${correct}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That expression drops or doubles a factor in π r^2 h.' })),
      explanation: `Square the radius, multiply by the height, and keep π: ${correct}.`,
      proof: `${radius}^2 * ${height} = ${radius * radius * height}.`,
    })
  }
  if (kind === 4) {
    const scale = 2 + (index % 3)
    const small = 6 + (index % 5)
    return numeric({
      target: 'area',
      prompt: `Two similar panels at the ${place} have scale factor ${scale}. The smaller area is ${small}. What is the larger area?`,
      answer: small * scale * scale, difficulty,
      candidates: [small * scale, small + scale, small * scale * scale * scale, small, scale, small * scale + scale],
      subskill: 'Scale an area',
      explanation: `Areas scale by the square of the scale factor: ${small} * ${scale}^2 = ${small * scale * scale}.`,
      proof: `${small} * ${scale * scale} = ${small * scale * scale}.`,
      why: (value) => `The larger area is ${small * scale * scale}, not ${value}.`,
    })
  }
  const scale = 2 + (index % 3)
  const small = 4 + (index % 4)
  return numeric({
    target: 'area',
    prompt: `Two similar boxes at the ${place} have scale factor ${scale}. The smaller volume is ${small}. What is the larger volume?`,
    answer: small * scale ** 3, difficulty,
    candidates: [small * scale, small * scale * scale, small + scale, small, scale ** 3, small * scale ** 3 + scale],
    subskill: 'Scale a volume',
    explanation: `Volumes scale by the cube of the scale factor: ${small} * ${scale}^3 = ${small * scale ** 3}.`,
    proof: `${small} * ${scale ** 3} = ${small * scale ** 3}.`,
    why: (value) => `The larger volume is ${small * scale ** 3}, not ${value}.`,
  })
}

function lines(index) {
  const difficulty = level(index)
  const kind = index % 5
  const place = shop(index)
  if (kind === 0) {
    const a = 30 + (index % 8) * 5
    const b = 40 + (index % 6) * 5
    const c = 180 - a - b
    if (c <= 0) return null
    return numeric({
      target: 'lines',
      prompt: `A triangle on a ${place} brace has two angles of ${a}° and ${b}°. What is the third angle, in degrees?`,
      answer: c, difficulty,
      candidates: [a + b, 180, 90, c + a, a, b],
      subskill: 'Use the triangle angle sum',
      explanation: `The angles sum to 180, so the third is 180 - ${a} - ${b} = ${c}.`,
      proof: `${a} + ${b} + ${c} = 180.`,
      why: (value) => `The missing angle is ${c}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const vertex = 20 + (index % 8) * 10
    if ((180 - vertex) % 2 !== 0) return null
    const base = (180 - vertex) / 2
    if (base <= 0) return null
    return numeric({
      target: 'lines',
      prompt: `An isosceles triangle at the ${place} has a vertex angle of ${vertex}°. What is each base angle, in degrees?`,
      answer: base, difficulty,
      candidates: [vertex, 180 - vertex, base + vertex, base - 10, 90, vertex / 2],
      subskill: 'Use base angles of an isosceles triangle',
      explanation: `The two base angles share 180 - ${vertex} = ${180 - vertex}, so each is ${base}.`,
      proof: `2 * ${base} + ${vertex} = 180.`,
      why: (value) => `Each base angle is ${base}, not ${value}.`,
    })
  }
  if (kind === 2) {
    const remoteA = 35 + (index % 6) * 5
    const remoteB = 25 + (index % 5) * 5
    const exterior = remoteA + remoteB
    if (exterior >= 180) return null
    return numeric({
      target: 'lines',
      prompt: `An exterior angle of a triangle at the ${place} is adjacent to a third angle, and the two remote interior angles are ${remoteA}° and ${remoteB}°. What is the exterior angle, in degrees?`,
      answer: exterior, difficulty,
      candidates: [180 - exterior, remoteA, remoteB, exterior + 10, 180, Math.abs(remoteA - remoteB)],
      subskill: 'Use an exterior angle',
      explanation: `An exterior angle equals the sum of the two remote interior angles: ${remoteA} + ${remoteB} = ${exterior}.`,
      proof: `${remoteA} + ${remoteB} = ${exterior}.`,
      why: (value) => `The exterior angle is ${exterior}, not ${value}.`,
    })
  }
  if (kind === 3) {
    const given = 40 + (index % 10) * 7
    if (given >= 180) return null
    return numeric({
      target: 'lines',
      prompt: `Two parallel rails at the ${place} are cut by a transversal. One angle measures ${given}°. What is the measure, in degrees, of the adjacent angle on the straight line?`,
      answer: 180 - given, difficulty,
      candidates: [given, 90, given / 2 | 0, 180, 360 - given, given + 10],
      subskill: 'Use a linear pair',
      explanation: `Adjacent angles on a straight line sum to 180, so the other angle is 180 - ${given} = ${180 - given}.`,
      proof: `${given} + ${180 - given} = 180.`,
      why: (value) => `The supplement of ${given} is ${180 - given}, not ${value}.`,
    })
  }
  const sides = [5, 6, 8, 9, 10, 12]
  const n = sides[index % sides.length]
  const angle = (n - 2) * 180 / n
  return numeric({
    target: 'lines',
    prompt: `A regular ${n}-sided frame at the ${place} has equal interior angles. What is the measure of one interior angle, in degrees?`,
    answer: angle, difficulty,
    candidates: [(n - 2) * 180, 180, n, angle - 10, 360 / n, angle + n],
    subskill: 'Find a regular polygon angle',
    explanation: `The interior sum is (${n} - 2) * 180 = ${(n - 2) * 180}. One angle is that sum divided by ${n}, which is ${angle}.`,
    proof: `${(n - 2) * 180} / ${n} = ${angle}.`,
    why: (value) => `One interior angle is ${angle}, not ${value}.`,
  })
}

function trig(index) {
  const difficulty = level(index)
  const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15], [9, 40, 41], [20, 21, 29]]
  const [a, b, c] = triples[index % triples.length]
  const kind = index % 5
  const place = shop(index)
  if (kind === 0) {
    return numeric({
      target: 'trig',
      prompt: `A right triangle at the ${place} has legs ${a} and ${b}. What is the hypotenuse?`,
      answer: c, difficulty,
      candidates: [a + b, a * b, c + 1, c - 1, a, b],
      subskill: 'Use the Pythagorean theorem',
      explanation: `The hypotenuse is sqrt(${a}^2 + ${b}^2) = sqrt(${a * a + b * b}) = ${c}.`,
      proof: `${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}.`,
      why: (value) => `The hypotenuse is ${c}, not ${value}.`,
    })
  }
  if (kind === 1) {
    return numeric({
      target: 'trig',
      prompt: `A right triangle at the ${place} has hypotenuse ${c} and one leg ${a}. What is the other leg?`,
      answer: b, difficulty,
      candidates: [c - a, a, c, b + a, c + a, b - 1],
      subskill: 'Find a missing leg',
      explanation: `The missing leg is sqrt(${c}^2 - ${a}^2) = sqrt(${c * c - a * a}) = ${b}.`,
      proof: `${a}^2 + ${b}^2 = ${c}^2.`,
      why: (value) => `${a}^2 + ${value}^2 is not ${c}^2.`,
    })
  }
  if (kind === 2) {
    const short = 2 + (index % 8)
    const correct = `${short}√3`
    const wrongs = [`${short * 2}√3`, `${short}√2`, `${short * 2}`]
    return finish({
      target: 'trig', difficulty, expressionAnswer: correct,
      subskill: 'Use a 30-60-90 triangle',
      prompt: `A 30-60-90 brace at the ${place} has short leg ${short}, opposite the 30° angle. What is the length of the side opposite the 60° angle?`,
      correctText: correct,
      correctReason: `The side opposite 60° is the short leg times √3.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That uses the hypotenuse relationship or a 45-45-90 ratio.' })),
      explanation: `In a 30-60-90 triangle the sides are x, x√3, and 2x. Here x = ${short}, so the longer leg is ${correct}.`,
      proof: `x√3 = ${short}√3.`,
    })
  }
  if (kind === 3) {
    const leg = 3 + (index % 8)
    const correct = `${leg}√2`
    const wrongs = [`${leg}√3`, `${leg * 2}`, `${leg}`]
    return finish({
      target: 'trig', difficulty, expressionAnswer: correct,
      subskill: 'Use a 45-45-90 triangle',
      prompt: `A 45-45-90 brace at the ${place} has a leg of length ${leg}. What is the hypotenuse?`,
      correctText: correct,
      correctReason: `The hypotenuse of a 45-45-90 triangle is the leg times √2.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That misses the √2 relationship or uses a 30-60-90 ratio.' })),
      explanation: `For a 45-45-90 triangle, hypotenuse = leg * √2 = ${correct}.`,
      proof: `${leg} * √2 = ${correct}.`,
    })
  }
  const correct = frac(a, c)
  const wrongs = [frac(b, c), frac(a, b), frac(c, a)]
  if (new Set([correct, ...wrongs]).size !== 4) return null
  return finish({
    target: 'trig', difficulty, expressionAnswer: correct,
    subskill: 'Use a sine ratio',
    prompt: `A right triangle at the ${place} has opposite side ${a} for an acute angle, adjacent side ${b}, and hypotenuse ${c}. What is the sine of that acute angle?`,
    correctText: correct,
    correctReason: `Sine is opposite over hypotenuse, ${a}/${c}.`,
    wrongs: wrongs.map((text) => ({ text, reason: 'That ratio is cosine, tangent, or the reciprocal of sine.' })),
    explanation: `sin = opposite / hypotenuse = ${a}/${c} = ${correct}.`,
    proof: `${a}/${c} simplifies to ${correct}.`,
  })
}

function circles(index) {
  const difficulty = level(index)
  const kind = index % 3
  const place = shop(index)
  if (kind === 0) {
    const radius = 3 + (index % 8)
    return numeric({
      target: 'circles',
      prompt: `A circle painted at the ${place} has equation (x - 1)^2 + (y + 2)^2 = ${radius * radius}. What is the radius?`,
      answer: radius, difficulty,
      candidates: [radius * radius, radius * 2, 1, 2, radius + 1, radius - 1],
      subskill: 'Read a radius from an equation',
      explanation: `The equation is (x - h)^2 + (y - k)^2 = r^2, so r^2 = ${radius * radius} and r = ${radius}.`,
      proof: `${radius}^2 = ${radius * radius}.`,
      why: (value) => `The radius is ${radius}, not ${value}.`,
    })
  }
  if (kind === 1) {
    const radius = 3 + (index % 7)
    const correct = `${2 * radius}π`
    const wrongs = [`${radius * radius}π`, `${radius}π`, `${radius * 4}π`]
    return finish({
      target: 'circles', difficulty, expressionAnswer: correct,
      subskill: 'Find a circumference',
      prompt: `A circular window at the ${place} has radius ${radius}. What is its circumference?`,
      correctText: correct,
      correctReason: `Circumference = 2πr = 2π(${radius}) = ${correct}.`,
      wrongs: wrongs.map((text) => ({ text, reason: 'That expression uses the area formula or only part of 2πr.' })),
      explanation: `Multiply the radius by 2π: ${correct}.`,
      proof: `2 * ${radius} = ${2 * radius}.`,
    })
  }
  const radius = 4 + (index % 5)
  const correct = `${radius * radius}π`
  const wrongs = [`${2 * radius}π`, `${radius}π`, `${radius * radius * radius}π`]
  return finish({
    target: 'circles', difficulty, expressionAnswer: correct,
    subskill: 'Find a circle area',
    prompt: `A circular mat at the ${place} has radius ${radius}. What is its area?`,
    correctText: correct,
    correctReason: `Area = πr^2 = π(${radius})^2 = ${correct}.`,
    wrongs: wrongs.map((text) => ({ text, reason: 'That expression uses the circumference or the wrong power of the radius.' })),
    explanation: `Square the radius and multiply by π: ${correct}.`,
    proof: `${radius}^2 = ${radius * radius}.`,
  })
}

function boundaries(index) {
  const difficulty = level(index)
  const place = shop(index)
  const crew = ['apprentices', 'night crew', 'weekend clerks', 'student volunteers', 'inventory team'][index % 5]
  const mode = index % 3
  const left = `The ${place} logged the evening count`
  const right = `the ${crew} still sealed bin ${1 + (index % 9)}`
  let correct
  let wrongs
  if (mode === 0) {
    correct = `${left}; ${right}.`
    wrongs = [
      `${left}, ${right}.`,
      `${left} ${right}.`,
      `${left}, however, ${right}.`,
    ]
  } else if (mode === 1) {
    correct = `${left}; however, ${right}.`
    wrongs = [
      `${left}, ${right}.`,
      `${left}, however, ${right}.`,
      `${left} however ${right}.`,
    ]
  } else {
    correct = `The ${place} set out three tools: a brush, a knife, and a ${1 + (index % 9)}-inch cloth.`
    wrongs = [
      `The ${place} set out three tools; a brush, a knife, and a ${1 + (index % 9)}-inch cloth.`,
      `The ${place} set out three tools: and a brush, a knife, and a ${1 + (index % 9)}-inch cloth.`,
      `The ${place} set out three tools a brush, a knife, and a ${1 + (index % 9)}-inch cloth.`,
    ]
  }
  const rule = mode === 2
    ? 'A colon can introduce a list. A semicolon would require a full clause after it.'
    : mode === 1
      ? 'When however joins two independent clauses, put a semicolon before it and a comma after it.'
      : 'Two independent clauses need a semicolon, or a comma with a conjunction. A comma alone is a splice.'
  return verbal({
    target: 'boundaries', difficulty,
    subskill: mode === 2 ? 'Punctuate a list' : 'Join independent clauses',
    prompt: 'Which choice is punctuated correctly?',
    correctText: correct,
    wrongs: wrongs.map((text) => ({ text, reason: rule })),
    explanation: `${rule} The correct sentence is: ${correct}`,
    proof: rule,
  })
}

function form(index) {
  const difficulty = level(index)
  const kind = index % 5
  const place = shop(index)
  const singular = ['lamp', 'ledger', 'stool', 'cloth', 'crate', 'key']
  const plural = ['lamps', 'ledgers', 'stools', 'cloths', 'crates', 'keys']
  if (kind === 0) {
    const nearerPlural = index % 2 === 0
    const nearer = at(nearerPlural ? plural : singular, index)
    const far = at(nearerPlural ? singular : plural, index + 1)
    const verb = nearerPlural ? 'were' : 'was'
    const correct = `Neither the ${far} nor the ${nearer} ${verb} packed before the ${place} opened.`
    const wrongs = ['was', 'were', 'is', 'be'].filter((choice) => choice !== verb).map((choice) => (
      `Neither the ${far} nor the ${nearer} ${choice} packed before the ${place} opened.`
    ))
    return verbal({
      target: 'form', difficulty,
      subskill: 'Make the verb agree with the nearer subject',
      prompt: 'Which choice follows the conventions of Standard English?',
      correctText: correct,
      wrongs: wrongs.map((text) => ({ text, reason: `With neither/nor, the verb agrees with the nearer subject, ${nearer}.` })),
      explanation: `The subject nearer the verb is ${nearer}, so the verb is ${verb}.`,
      proof: `Nearer subject ${nearer} takes ${verb}.`,
    })
  }
  if (kind === 1) {
    const noun = at(plural, index)
    const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][index % 5]
    const correct = `The number of ${noun} was higher at the ${place} on ${day}.`
    const wrongs = ['were', 'are', 'be'].map((verb) => `The number of ${noun} ${verb} higher at the ${place} on ${day}.`)
    return verbal({
      target: 'form', difficulty,
      subskill: 'Treat "the number of" as singular',
      prompt: 'Which choice follows the conventions of Standard English?',
      correctText: correct,
      wrongs: wrongs.map((text) => ({ text, reason: 'The subject is the singular noun number, not the plural noun in the of-phrase.' })),
      explanation: `"The number of ${noun}" is singular, so the verb is was.`,
      proof: 'The number of + plural noun takes a singular verb.',
    })
  }
  if (kind === 2) {
    const actor = ['clerk', 'guide', 'editor', 'keeper'][index % 4]
    const object = ['drawers', 'lenses', 'tickets', 'labels'][index % 4]
    const correct = `While labeling the ${object}, the ${actor} at the ${place} found a missing card.`
    const wrongs = [
      `While labeling the ${object}, a missing card was found at the ${place}.`,
      `While labeling the ${object}, the cabinet at the ${place} found a missing card.`,
      `While labeling the ${object}, it found a missing card at the ${place}.`,
    ]
    return verbal({
      target: 'form', difficulty,
      subskill: 'Attach a modifier to the actor',
      prompt: 'Which choice follows the conventions of Standard English?',
      correctText: correct,
      wrongs: wrongs.map((text) => ({ text, reason: `The opening phrase names the action of the ${actor}, so the ${actor} must be the subject.` })),
      explanation: `The person labeling the ${object} is the ${actor}, so the ${actor} should be the subject.`,
      proof: `Modifier "labeling the ${object}" attaches to the ${actor}.`,
    })
  }
  if (kind === 3) {
    const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index % 6]
    const correct = `Yesterday the ${place} crew sealed bin ${1 + (index % 8)} before noon on ${day}.`
    const wrongs = ['seals', 'seal', 'sealing'].map((verb) => `Yesterday the ${place} crew ${verb} bin ${1 + (index % 8)} before noon on ${day}.`)
    return verbal({
      target: 'form', difficulty,
      subskill: 'Match a past-time verb',
      prompt: 'Which choice follows the conventions of Standard English?',
      correctText: correct,
      wrongs: wrongs.map((text) => ({ text, reason: 'Yesterday requires a simple past verb.' })),
      explanation: `Yesterday places the action in the past, so the verb is sealed.`,
      proof: 'Past adverb yesterday agrees with sealed.',
    })
  }
  const task = ['a tray', 'a drawer', 'a lens', 'a label'][index % 4]
  const correct = `After a volunteer at the ${place} finishes ${task}, the volunteer logs ${task}.`
  const wrongs = [
    `After a volunteer at the ${place} finishes ${task}, they logs ${task}.`,
    `After a volunteer at the ${place} finishes ${task}, them logs ${task}.`,
    `After a volunteer at the ${place} finishes ${task}, it log ${task}.`,
  ]
  return verbal({
    target: 'form', difficulty,
    subskill: 'Keep a pronoun agreement clear',
    prompt: 'Which choice follows the conventions of Standard English?',
    correctText: correct,
    wrongs: wrongs.map((text) => ({ text, reason: 'The repeated noun volunteer avoids a verb that does not agree.' })),
    explanation: `Repeating "the volunteer" keeps the subject singular and the verb logs agrees with it.`,
    proof: 'Singular subject volunteer takes logs.',
  })
}

function structure(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index)
  const frame = index % 3
  if (frame === 0) {
    const passage = `Record ${index + 1}: the ${place} had been losing work. For two weeks the crew changed only the ${factor}. After that change, the crew saw ${outcome}.`
    return verbal({
      target: 'structure', difficulty,
      subskill: 'Identify a result sentence',
      prompt: `${passage}\n\nThe last sentence primarily serves to`,
      correctText: `report the result of changing the ${factor}.`,
      wrongs: [
        { text: `define the term "${factor}" for a general reader.`, reason: 'The sentence gives a result, not a definition.' },
        { text: `introduce an unrelated visit to a different shop.`, reason: 'The sentence stays with this shop and this change.' },
        { text: `argue that the ${factor} should never be used.`, reason: 'The sentence reports an improvement, not a rejection.' },
      ],
      explanation: `The last sentence tells what happened after the change: ${outcome}.`,
      proof: 'Last sentence is a result of the stated change.',
    })
  }
  if (frame === 1) {
    const passage = `Record ${index + 1}: the ${place} crew recommends the ${factor} because it produced ${outcome}. The crew also notes that the comparison covered only two weeks.`
    return verbal({
      target: 'structure', difficulty,
      subskill: 'Identify a limit',
      prompt: `${passage}\n\nThe second sentence primarily serves to`,
      correctText: 'note a limit of the comparison.',
      wrongs: [
        { text: `give the definition of ${factor}.`, reason: 'The sentence does not define the term.' },
        { text: 'repeat the recommendation without adding information.', reason: 'The sentence adds the two-week limit.' },
        { text: `report that the ${factor} failed.`, reason: 'The first sentence says it produced an improvement.' },
      ],
      explanation: 'The second sentence limits the claim by saying the comparison lasted only two weeks.',
      proof: 'Sentence function: concede the scope of the evidence.',
    })
  }
  const passage = `Record ${index + 1}: changing the ${factor} can affect the work at a ${place}. For example, after the crew changed it, they saw ${outcome}.`
  return verbal({
    target: 'structure', difficulty,
    subskill: 'Identify an example',
    prompt: `${passage}\n\nThe second sentence primarily serves to`,
    correctText: 'give an example of the opening claim.',
    wrongs: [
      { text: 'contradict the opening claim.', reason: 'The example illustrates the claim rather than opposing it.' },
      { text: `define "${outcome}" in scientific language.`, reason: 'The sentence is an example, not a definition.' },
      { text: 'change the subject to a different shop.', reason: 'The example stays with the same change.' },
    ],
    explanation: 'The phrase "for example" marks the second sentence as support by example.',
    proof: 'Sentence function: example of the first claim.',
  })
}

function cross(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index)
  const claimed = at(SAMES, index)
  const frame = index % 2
  if (frame === 0) {
    const text1 = `Text 1, record ${index + 1}: a specialist argues that ${outcome} at a ${place} happened because of the ${claimed}.`
    const text2 = `Text 2: Pieces with the same ${claimed} did not show ${outcome} when the crew changed only the ${factor}.`
    return verbal({
      target: 'cross', difficulty,
      subskill: 'See how one text limits another',
      prompt: `${text1}\n${text2}\n\nBased on the texts, which choice is best supported?`,
      correctText: `Text 2 limits Text 1: the same ${claimed} did not produce ${outcome} after the ${factor} changed, so the ${claimed} may not be the full explanation.`,
      wrongs: [
        { text: `Text 2 proves that the ${claimed} is the only cause of ${outcome}.`, reason: 'Text 2 describes a case where that claimed cause was not enough.' },
        { text: `Text 2 agrees that the ${claimed} always produces ${outcome}.`, reason: 'Text 2 says the outcome did not appear in that case.' },
        { text: 'Text 2 discusses an unrelated problem and does not bear on Text 1.', reason: 'Both texts discuss the same outcome.' },
      ],
      explanation: `Text 2 holds the ${claimed} the same and still does not get ${outcome} after changing the ${factor}, so it limits Text 1's explanation.`,
      proof: 'Text 2 keeps the claimed cause and removes the outcome when another factor changes.',
    })
  }
  const text1 = `Text 1, record ${index + 1}: a specialist suggests that changing the ${factor} at a ${place} may lead to ${outcome}.`
  const text2 = `Text 2: When the ${factor} was changed and the ${claimed} was kept the same, the crew later recorded ${outcome}. When the ${factor} was not changed, they did not.`
  return verbal({
    target: 'cross', difficulty,
    subskill: 'See how one text supports another',
    prompt: `${text1}\n${text2}\n\nBased on the texts, which choice is best supported?`,
    correctText: `Text 2 supports Text 1's suggestion by describing ${outcome} when the ${factor} changed and not when it stayed the same.`,
    wrongs: [
      { text: `Text 2 refutes Text 1 by showing that the ${factor} never changes the outcome.`, reason: 'Text 2 records the outcome when the factor changed.' },
      { text: `Text 2 shows that the ${claimed} was the only thing that changed.`, reason: 'Text 2 says that condition was kept the same.' },
      { text: 'Text 2 is about a different outcome from Text 1.', reason: 'Both texts name the same outcome.' },
    ],
    explanation: `Text 2 supplies a comparison that matches Text 1's suggestion about the ${factor}.`,
    proof: 'Outcome appears with the change and does not appear without it, with the other condition held constant.',
  })
}

function central(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index)
  const expected = at(SAMES, index)
  const frame = index % 2
  if (frame === 0) {
    const thesis = `Changing the ${factor}, not the ${expected}, came with ${outcome}.`
    const passage = `Record ${index + 1}: at the ${place}, people expected the ${expected} to explain the trouble. The log instead showed that the crew had changed the ${factor}. After that change, the crew saw ${outcome}. ${thesis}`
    return verbal({
      target: 'central', difficulty,
      subskill: 'Identify a main idea',
      prompt: `${passage}\n\nWhich choice states the main idea of the passage?`,
      correctText: thesis,
      wrongs: [
        { text: `People expected the ${expected} to explain the trouble.`, reason: 'That is the opening expectation, not the main point.' },
        { text: `The log showed that the crew had changed the ${factor}.`, reason: 'That is a supporting detail.' },
        { text: `The ${place} keeps a log.`, reason: 'The passage uses the log as evidence; keeping a log is not the main point.' },
      ],
      explanation: `The passage contrasts the expected explanation with the change that accompanied ${outcome}. The last sentence states that contrast as the main point.`,
      proof: 'The thesis sentence is the only choice that states the contrast rather than one detail.',
    })
  }
  const thesis = `The main point is that the two-week change in ${factor} at the ${place} was followed by ${outcome}.`
  const passage = `Record ${index + 1}: for two weeks, the ${place} changed the ${factor} and left other habits in place. During those weeks, the crew recorded ${outcome}. ${thesis}`
  return verbal({
    target: 'central', difficulty,
    subskill: 'Identify a main idea',
    prompt: `${passage}\n\nWhich choice states the main idea of the passage?`,
    correctText: thesis,
    wrongs: [
      { text: `The ${place} left other habits in place.`, reason: 'That detail sets up the comparison; it is not the whole point.' },
      { text: `The crew recorded ${outcome}.`, reason: 'That is the result detail inside the larger point.' },
      { text: `Two weeks is the only length of time a ${place} can study.`, reason: 'The passage does not make that general claim.' },
    ],
    explanation: 'The closing sentence combines the change and the result, which is the main idea.',
    proof: 'The thesis is broader than either detail choice and is stated in the passage.',
  })
}

function textual(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index)
  const support = `Record ${index + 1} says the crew changed only the ${factor} before they saw ${outcome}.`
  const sentences = [
    `The ${place} opens before sunrise.`,
    `Volunteers sign the paper log.`,
    support,
    `Last year's labels remain in the closet.`,
  ]
  if (sentences.filter((sentence) => sentence.includes(`changed only the ${factor}`)).length !== 1) return null
  return verbal({
    target: 'textual', difficulty,
    subskill: 'Match a claim to a sentence',
    prompt: `${sentences.join(' ')}\n\nWhich sentence from the passage most directly supports the claim that the crew changed only the ${factor}?`,
    correctText: support,
    wrongs: sentences.filter((sentence) => sentence !== support).map((text) => ({
      text,
      reason: 'This sentence does not say what the crew changed.',
    })),
    explanation: `The supporting sentence is the only one that states the crew changed only the ${factor}.`,
    proof: `Unique support sentence contains "changed only the ${factor}".`,
  })
}

function quant(index) {
  const difficulty = level(index)
  const names = [shop(index), shop(index + 7), shop(index + 13)]
  if (new Set(names).size !== 3) return null
  const frame = index % 2
  if (frame === 0) {
    const totals = [30 + (index % 8), 44 + (index % 6), 58 + (index % 7)]
    const hits = [4 + (index % 5), 7 + (index % 6), 5 + (index % 4)]
    const groups = names.map((name, group) => ({ name, hit: hits[group], total: totals[group] }))
    if (groups.some((group) => group.hit >= group.total)) return null
    const compare = (left, right) => left.hit * right.total - right.hit * left.total
    const best = groups.reduce((winner, group) => compare(group, winner) > 0 ? group : winner)
    if (groups.filter((group) => compare(group, best) === 0).length !== 1) return null
    const others = groups.filter((group) => group !== best)
    return verbal({
      target: 'quant', difficulty,
      subskill: 'Compare rates in a table',
      prompt: `Record ${index + 1} flaw checks:\n${groups.map((group) => `${group.name}: ${group.hit} flaws in ${group.total} checks`).join('\n')}\n\nWhich claim is true?`,
      correctText: `The ${best.name} had the highest flaw rate: ${best.hit} out of ${best.total}.`,
      wrongs: [
        ...others.map((group) => ({
          text: `The ${group.name} had the highest flaw rate: ${group.hit} out of ${group.total}.`,
          reason: 'Another group has a higher flaws-per-check rate.',
        })),
        {
          text: `The ${best.name} had the lowest flaw rate: ${best.hit} out of ${best.total}.`,
          reason: 'That group has the highest rate, not the lowest.',
        },
      ],
      explanation: `Compare hit/total. ${best.name} has ${best.hit}/${best.total}, which is greater than the other two rates.`,
      proof: groups.map((group) => `${group.name} ${group.hit}/${group.total}`).join('; '),
    })
  }
  const lowHit = 8 + (index % 5)
  const low = { name: names[0], hit: lowHit + 2, total: (lowHit + 2) * 4 }
  const high = { name: names[1], hit: lowHit, total: lowHit * 2 }
  const mid = { name: names[2], hit: lowHit, total: lowHit * 3 }
  const lowRate = low.hit / low.total
  const highRate = high.hit / high.total
  const midRate = mid.hit / mid.total
  if (!(low.hit > high.hit && lowRate < highRate && midRate < highRate)) return null
  return verbal({
    target: 'quant', difficulty,
    subskill: 'Separate a count from a rate',
    prompt: `Record ${index + 1} flaw checks:\n${[low, high, mid].map((group) => `${group.name}: ${group.hit} flaws in ${group.total} checks`).join('\n')}\n\nWhich claim is true?`,
    correctText: `The ${low.name} recorded more flaws than the ${high.name} but had a lower flaw rate.`,
    wrongs: [
      { text: `The ${low.name} had a higher flaw rate than the ${high.name} because it recorded more flaws.`, reason: 'The larger count is spread over a much larger number of checks.' },
      { text: `The ${high.name} recorded more flaws than the ${low.name}.`, reason: `${low.hit} is more than ${high.hit}.` },
      { text: `The ${mid.name} had a higher flaw rate than the ${high.name}.`, reason: `${mid.hit}/${mid.total} is less than ${high.hit}/${high.total}.` },
    ],
    explanation: `${low.name} has ${low.hit} flaws versus ${high.hit}, but ${low.hit}/${low.total} is less than ${high.hit}/${high.total}.`,
    proof: `${low.hit}/${low.total} < ${high.hit}/${high.total} even though ${low.hit} > ${high.hit}.`,
  })
}

function inferences(index) {
  const difficulty = level(index)
  const place = shop(index)
  const factor = at(FACTORS, index)
  const outcome = at(OUTCOMES, index)
  const same = at(SAMES, index)
  const frame = index % 2
  if (frame === 0) {
    const passage = `Record ${index + 1}: a ${place} compared two weeks. In both weeks, the ${same} stayed the same. The only change was the ${factor}. During the week with that change, the crew recorded ${outcome}.`
    return verbal({
      target: 'inferences', difficulty,
      subskill: 'Infer a supported link',
      prompt: `${passage}\n\nWhich choice is best supported by the passage?`,
      correctText: `The comparison links ${outcome} to the ${factor}, because the ${same} did not change.`,
      wrongs: [
        { text: `The ${same} explains ${outcome}.`, reason: 'The passage says that condition stayed the same.' },
        { text: `The ${factor} stayed the same in both weeks.`, reason: 'The passage says it was the only change.' },
        { text: `The comparison shows that nothing at the ${place} changed.`, reason: 'The passage names a change.' },
      ],
      explanation: `Only the ${factor} changed, and the outcome was recorded in that week, so the supported link is between those two.`,
      proof: 'Only one factor changed; the named condition stayed the same.',
    })
  }
  const passage = `Record ${index + 1}: the ${place} crew predicted that the ${same} would explain the trouble. Their count instead showed ${outcome} after they changed the ${factor}.`
  return verbal({
    target: 'inferences', difficulty,
    subskill: 'Infer that a prediction failed',
    prompt: `${passage}\n\nWhich choice is best supported by the passage?`,
    correctText: `The count did not support the prediction that the ${same} explained the trouble.`,
    wrongs: [
      { text: `The count confirmed that the ${same} explained the trouble.`, reason: 'The passage says the count showed something else.' },
      { text: `The crew never changed the ${factor}.`, reason: 'The passage says they changed it.' },
      { text: `The prediction was about ${outcome}, not about the ${same}.`, reason: 'The passage says the prediction was about the other condition.' },
    ],
    explanation: 'The measured result followed a different change from the one the crew predicted, so the prediction was not supported.',
    proof: 'Prediction names one condition; the count follows a different change.',
  })
}

function synthesis(index) {
  const difficulty = level(index)
  if (index % 2 === 0) {
    return verbal({
      target: 'synthesis', difficulty,
      subskill: 'Combine two notes without adding a new claim',
      prompt: `A student wants to emphasize both that the bindery's new paste cost less and that the drying time stayed the same. Notes:\n- The new paste cost less than the old paste.\n- Drying time stayed at 2 hours.\n- One apprentice preferred the old smell.\n\nWhich choice best accomplishes the goal?`,
      correctText: 'The new paste cost less, and the drying time stayed at 2 hours.',
      wrongs: [
        { text: 'The new paste cost less than the old paste.', reason: 'This leaves out the drying time.' },
        { text: 'The drying time stayed at 2 hours, but the new paste cost more.', reason: 'The notes say the new paste cost less, not more.' },
        { text: 'One apprentice preferred the old smell, so the new paste should be rejected.', reason: 'The goal does not ask for the smell note or a rejection.' },
      ],
      explanation: 'The goal requires both the lower cost and the unchanged drying time, and it does not ask for the smell note.',
      proof: 'Correct sentence uses both required notes and neither forbidden change.',
    })
  }
  return verbal({
    target: 'synthesis', difficulty,
    subskill: 'Combine two notes without adding a new claim',
    prompt: `A student wants to emphasize both that the observatory opened the side vent and that the lenses stayed clear. Notes:\n- The crew opened the side vent before the viewing.\n- The lenses stayed clear during the viewing.\n- A visitor arrived late.\n\nWhich choice best accomplishes the goal?`,
    correctText: 'The crew opened the side vent, and the lenses stayed clear during the viewing.',
    wrongs: [
      { text: 'The lenses stayed clear during the viewing.', reason: 'This leaves out the vent.' },
      { text: 'The crew opened the side vent, but the lenses fogged.', reason: 'The notes say the lenses stayed clear.' },
      { text: 'A visitor arrived late, which caused the lenses to stay clear.', reason: 'The notes do not connect the late visitor to the lenses.' },
    ],
    explanation: 'The goal requires both the opened vent and the clear lenses, without the late visitor.',
    proof: 'Correct sentence uses both required notes and does not add the visitor.',
  })
}

const BUILDERS = {
  boundaries, form, structure, cross, central, textual, quant, inferences, synthesis,
  linearOne, linearFn, linearTwo, systems, inequalities, equivalent, nonlinearEq, nonlinearFn,
  ratios, percentages, oneVar, scatter, probability, margin, claims, area, lines, trig, circles,
}

function contentKey(row) {
  const prompt = String(row.question_text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
  const choices = [row.choice_a, row.choice_b, row.choice_c, row.choice_d]
    .filter((choice) => choice != null && String(choice).trim())
    .map((choice) => String(choice).normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase())
    .sort()
  if (!prompt) return null
  return createHash('sha256').update(JSON.stringify([prompt, row.question_type ?? '', choices])).digest('hex')
}

async function liveOriginalCounts(ids) {
  const counts = new Map(ids.map((id) => [id, { seen: new Map(), original: 0 }]))
  for (let start = 0; start < 20000; start += 1000) {
    const page = checked(await db.from('questions')
      .select('topic_id, active, approved, question_text, choice_a, choice_b, choice_c, choice_d, question_type, source_type, source_rights_status')
      .in('topic_id', ids)
      .range(start, start + 999))
    for (const row of page) {
      if (!row.active || !row.approved) continue
      const bucket = counts.get(row.topic_id)
      if (!bucket) continue
      const key = contentKey(row)
      if (!key) continue
      const original = ['original', 'original_derived_reference'].includes(row.source_type)
        && ['owned', 'original'].includes(row.source_rights_status)
      if (bucket.seen.has(key)) {
        if (!bucket.seen.get(key) && original) {
          bucket.seen.set(key, true)
          bucket.original += 1
        }
        continue
      }
      bucket.seen.set(key, original)
      if (original) bucket.original += 1
    }
    if (page.length < 1000) break
  }
  return counts
}

async function filterExisting(items) {
  const fresh = []
  for (let start = 0; start < items.length; start += 40) {
    const slice = items.slice(start, start + 40)
    const found = new Set(checked(await db.from('questions').select('fingerprint').in('fingerprint', slice.map(finger))).map((row) => row.fingerprint))
    fresh.push(...slice.filter((item) => !found.has(finger(item))))
  }
  return fresh
}

async function main() {
  const dry = process.argv.includes('--dry')
  const needs = new Map()
  if (dry) {
    for (const topic of TOPICS) needs.set(topic.key, topic.gap)
  } else {
    const counts = await liveOriginalCounts(TOPICS.map((topic) => topic.id))
    for (const topic of TOPICS) {
      const have = counts.get(topic.id)?.original ?? 0
      needs.set(topic.key, Math.max(0, 50 - have))
      console.log(`${topic.topic}: ${have} original distinct, adding ${needs.get(topic.key)}`)
    }
  }
  const built = []
  for (const topic of TOPICS) {
    const need = needs.get(topic.key) ?? 0
    const items = need === 0 ? [] : collect(topic.key, need, BUILDERS[topic.key])
    validate(items)
    built.push({ topic, items })
  }
  const seen = new Set()
  for (const group of built) {
    for (const item of group.items) {
      const id = finger(item)
      if (seen.has(id)) throw new Error(`Cross-topic duplicate in ${group.topic.key}`)
      seen.add(id)
    }
  }
  const summary = built.map((group) => ({
    topic: group.topic.topic,
    added: group.items.length,
    answers: group.items.reduce((spread, item) => {
      spread[item.answer] = (spread[item.answer] ?? 0) + 1
      return spread
    }, {}),
    sample: group.items[0] ? { prompt: group.items[0].prompt, answer: group.items[0].answer, choices: group.items[0].choices.map((choice) => choice.text) } : null,
  }))
  if (dry) {
    writeFileSync('supabase/exam-engineering/smart-fill-to-fifty-preview.json', `${JSON.stringify({ total: seen.size, summary }, null, 2)}\n`)
    console.log(JSON.stringify({ total: seen.size, topics: summary.map(({ topic, added, answers }) => ({ topic, added, answers })) }, null, 2))
    return
  }
  mkdirSync('supabase/exam-engineering/smart-fill-to-fifty', { recursive: true })
  let saved = 0
  for (const group of built) {
    if (!group.items.length) continue
    const fresh = await filterExisting(group.items)
    if (!fresh.length) {
      console.log(`already saved ${group.topic.key}`)
      continue
    }
    if (fresh.length !== group.items.length) {
      throw new Error(`${group.topic.key} collided with ${group.items.length - fresh.length} existing fingerprints`)
    }
    await saveSmartBatch({
      batch: 'smart-fill-to-fifty',
      reportPath: `supabase/exam-engineering/smart-fill-to-fifty/${group.topic.key}.json`,
      topicTargets: { [group.topic.key]: group.topic },
      items: [
        ...fresh,
        { invalid: true, prompt: 'Draft excluded because two choices match.' },
        { invalid: true, prompt: 'Draft excluded because the keyed value is not unique.' },
      ],
      requiredCount: fresh.length,
    })
    saved += fresh.length
  }
  writeFileSync('supabase/exam-engineering/smart-fill-to-fifty-summary.json', `${JSON.stringify({ saved, summary }, null, 2)}\n`)
  console.log(JSON.stringify({ saved }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
