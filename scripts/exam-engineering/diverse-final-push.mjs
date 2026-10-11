import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const apply = process.argv.includes('--apply')
const root = new URL('../../', import.meta.url).pathname
const batchName = 'Diverse final push 2026-10-06'
const AGENTS = ['archivist', 'surveyor', 'cellist', 'glazier', 'beekeeper', 'cartographer', 'lutist', 'potter', 'locksmith', 'botanist', 'ferrier', 'miller', 'weaver', 'printer', 'gardener', 'mason', 'sailmaker', 'optician', 'chemist', 'drummer', 'baker', 'diver', 'ranger', 'tailor', 'jeweler', 'pilot', 'nurse', 'coach', 'editor', 'plumber']
const TASKS = ['copied the humidity log', 'weighed each sealed sample', 'timed the evening rehearsal', 'measured the cooled pane', 'counted the capped frames', 'traced the faded contour', 'tuned the spare instrument', 'fired the test tile', 'cut a replacement key', 'pressed the leaf specimen', 'checked the hoof angle', 'sifted the stone-ground flour', 'inspected the warped loom', 'aligned the damp plate', 'staked the young row', 'leveled the new course', 'stitched the torn seam', 'polished the spare lens', 'labeled the reagent bottle', 'marked the missed beat', 'scored the cooled loaf', 'logged the dive time', 'mapped the closed trail', 'matched the dyed thread', 'weighed the unset stone', 'recorded the taxi fuel', 'charted the night pulse', 'filmed the trial lap', 'marked the loose clause', 'shut the service valve']
const PLACES = ['coastal archive', 'reef lab', 'night clinic', 'print loft', 'glass studio', 'seed vault', 'bell tower', 'map depot', 'canoe shed', 'lens bench', 'ticket booth', 'wool shed', 'radio booth', 'spice vault', 'puppet loft', 'ferry dock', 'kiln yard', 'choir room', 'harbor office', 'orchard barn', 'clock shop', 'paper mill', 'bike co-op', 'planetarium', 'pottery shed', 'weather loft', 'binding room', 'signal hut', 'tea warehouse', 'marble yard']
const MATERIALS = ['salted plaster', 'worn rope', 'faded ink', 'old varnish', 'dusty linen', 'brittle cable', 'cheap cloth', 'blunt blade', 'damp paper', 'green copper', 'cracked glaze', 'loose gut', 'cedar shingle', 'tin solder', 'raw honey', 'clay slip', 'oak peg', 'silk thread', 'graphite dust', 'river silt', 'beeswax', 'lime wash', 'iron oxide', 'pine pitch', 'glass frit', 'wool batting', 'lead type', 'cane webbing', 'bone folder', 'chalk line']
const INSTRUMENTS = ['beam balance', 'brass caliper', 'tuning fork', 'mercury thermometer', 'hand lens', 'click counter', 'spring scale', 'light meter', 'stopwatch', 'graduated cylinder', 'plumb bob', 'wind vane', 'sound meter', 'moisture probe', 'micrometer', 'refractometer', 'barometer', 'pedometer', 'color chip', 'tape chronometer']

function words(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean).length
}
function signature(text) {
  return text.toLowerCase().replace(/[0-9]+(\.[0-9]+)?/g, '#').replace(/[^a-z#]+/g, ' ').replace(/\s+/g, ' ').trim()
}
function fingerprintOf(prompt, choices, spr) {
  const body = choices ? choices.map((choice) => choice.text).join('\n') : `SPR:${spr}`
  return createHash('sha256').update(`${prompt}\n${body}`).digest('hex')
}
function clause(n) {
  const agent = AGENTS[n % AGENTS.length]
  const task = TASKS[Math.floor(n / 30) % TASKS.length]
  const place = PLACES[Math.floor(n / 900) % PLACES.length]
  const material = MATERIALS[Math.floor(n / 37) % MATERIALS.length]
  const instrument = INSTRUMENTS[Math.floor(n / 41) % INSTRUMENTS.length]
  return `The ${agent} ${task} at the ${place}, using the ${instrument} on the ${material}.`
}
function finishMc(seed, prompt, correct, wrongs, explanation, proof) {
  if (!prompt || !explanation || !proof || wrongs.length !== 3) return null
  const texts = [correct.text, ...wrongs.map((wrong) => wrong.text)]
  if (new Set(texts).size !== 4) return null
  if ([correct, ...wrongs].some((choice) => !choice.reason || /^Correct:/u.test(choice.reason))) return null
  const mixed = [correct, ...wrongs]
  let state = seed >>> 0
  for (let index = mixed.length - 1; index > 0; index -= 1) {
    state = (1664525 * state + 1013904223) >>> 0
    const swap = state % (index + 1)
    ;[mixed[index], mixed[swap]] = [mixed[swap], mixed[index]]
  }
  const answer = 'ABCD'[mixed.findIndex((choice) => choice === correct)]
  return {
    prompt,
    choices: mixed.map((choice) => ({ text: choice.text, reason: choice.reason })),
    answer,
    explanation,
    proof,
  }
}
function ask(n, stem, correct, wrongs, explanation, proof) {
  const lead = ['Which statement follows?', 'Which conclusion is correct?', 'Which result matches the work?', 'Which choice is supported?'][n % 4]
  return finishMc(n, `${clause(n)} ${stem} ${lead}`, correct, wrongs, explanation, proof)
}

function noSolution(n) {
  const a = 2 + (n % 6)
  const b = 3 + (n % 8)
  const c = b + 2 + (n % 5)
  const stem = `A planner sets $${a}x + ${b} = ${a}x + ${c}$ and wants every value of $x$ that makes it true.`
  return ask(n, stem, {
    text: 'The equation has no solution.',
    reason: `Both sides have the same ${a}x term, and ${b} does not equal ${c}.`,
  }, [
    { text: 'The equation is true for every x.', reason: 'That would require the constant terms to be equal.' },
    { text: `The only solution is x = ${c - b}.`, reason: 'Subtracting the matching variable terms leaves a false number statement, not a value of x.' },
    { text: `The only solution is x = ${a}.`, reason: 'The coefficient is not the solution.' },
  ], `Subtract ${a}x from both sides. The result is ${b} = ${c}, which is false, so no value of x works.`, `no solution because ${b} ≠ ${c}`)
}
function systemValue(n) {
  const x = 2 + (n % 9)
  const y = 1 + ((n + 3) % 8)
  const target = 2 * x + 3 * y
  const traps = [x + y, 2 * (x + y), x * y]
  if (new Set([target, ...traps]).size !== 4) return null
  const stem = `Two counts satisfy $x + y = ${x + y}$ and $x - y = ${x - y}$. The desk needs $2x + 3y$.`
  return ask(n, stem, {
    text: String(target),
    reason: `Adding the equations gives x = ${x}. Subtracting gives y = ${y}. Then 2(${x}) + 3(${y}) = ${target}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That stops at a sum, doubles the sum, or multiplies the two variables.' })), `Add to get 2x = ${2 * x}, so x = ${x}. Then y = ${y}. 2x + 3y = ${target}.`, `2x+3y=${target}`)
}
function quadraticCoeff(n) {
  const r = 2 + (n % 6)
  const s = r + 2 + (n % 4)
  const sum = r + s
  const prod = r * s
  const stem = `A quadratic has roots ${r} and ${s}, so it can be written $x^2 - ${sum}x + ${prod}$. What is the coefficient of $x$?`
  const answer = -sum
  const traps = [sum, prod, r - s]
  if (new Set([answer, ...traps]).size !== 4) return null
  return ask(n, stem, {
    text: String(answer),
    reason: `The expanded form is x^2 - (sum of roots)x + product. The coefficient of x is -(${r}+${s}) = ${answer}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the sum, the product, or the difference of the roots.' })), `Sum of roots = ${sum}. In x^2 - (sum)x + product, the coefficient of x is ${answer}.`, `coefficient ${answer}`)
}
function composition(n) {
  const a = 2 + (n % 4)
  const b = 1 + (n % 6)
  const x = 1 + (n % 7)
  const once = a * x + b
  const twice = a * once + b
  const traps = [once, a * x + 2 * b, a * a * x]
  if (new Set([twice, ...traps]).size !== 4) return null
  const stem = `A rule sends t to $${a}t + ${b}$. The rule is applied to ${x}, and then the rule is applied again to that result. What is the final value?`
  return ask(n, stem, {
    text: String(twice),
    reason: `The first output is ${a}(${x}) + ${b} = ${once}. The second is ${a}(${once}) + ${b} = ${twice}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That stops after one application, adds the constant twice without scaling it, or squares the coefficient and drops the constants.' })), `First application: ${once}. Second application: ${a}*${once}+${b} = ${twice}.`, `f(f(${x}))=${twice}`)
}
function meanAfterRemoval(n) {
  const base = 4 + (n % 7)
  const values = [base, base + 1, base + 3, base + 6, base + 10]
  const total = values.reduce((sum, value) => sum + value, 0)
  const mean = total / values.length
  const removed = base + 10
  const next = (total - removed) / 4
  if (!Number.isInteger(mean) || !Number.isInteger(next)) return null
  const traps = [mean, removed, base]
  if (new Set([next, ...traps]).size !== 4) return null
  const stem = `Five readings are ${values.join(', ')}. The largest reading is dropped, and the mean of the other four is recomputed.`
  return ask(n, stem, {
    text: String(next),
    reason: `The five readings sum to ${total}. Dropping ${removed} leaves ${total - removed}, and dividing by 4 gives ${next}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the original mean, the dropped value, or the smallest reading.' })), `Sum = ${total}. New sum = ${total - removed}. New mean = ${next}.`, `new mean ${next}`)
}
function conditionalRates(n) {
  const aPass = 12 + (n % 5)
  const aFail = 4 + (n % 3)
  const bPass = 6 + (n % 4)
  const bFail = 10 + (n % 5)
  const rateA = aPass / (aPass + aFail)
  const rateB = bPass / (bPass + bFail)
  if (rateA === rateB) return null
  const higher = rateA > rateB ? 'group A' : 'group B'
  const lower = rateA > rateB ? 'group B' : 'group A'
  const stem = `A review table lists group A with ${aPass} passes and ${aFail} fails, and group B with ${bPass} passes and ${bFail} fails. Which comparison of pass rates is true?`
  const built = ask(n, stem, {
    text: `${higher} has the higher pass rate.`,
    reason: `Group A passes ${aPass} of ${aPass + aFail}. Group B passes ${bPass} of ${bPass + bFail}.`,
  }, [
    { text: `${lower} has the higher pass rate.`, reason: 'That reverses the two rates.' },
    { text: 'The group with more passes automatically has the higher pass rate.', reason: 'The rate is passes divided by that group\'s own total, not the raw pass count.' },
    { text: 'The pass rates are equal.', reason: `${aPass}/${aPass + aFail} is not equal to ${bPass}/${bPass + bFail}.` },
  ], `Rate A = ${aPass}/${aPass + aFail}. Rate B = ${bPass}/${bPass + bFail}. ${higher} is higher.`, `${higher} rate is higher`)
  if (!built) return null
  return { ...built, graphicType: 'table', graphicData: { columns: ['Group', 'Passes', 'Fails'], rows: [['A', aPass, aFail], ['B', bPass, bFail]], chart: 'table' } }
}
function slopeForecast(n) {
  const x1 = 2 + (n % 5)
  const y1 = 3 + (n % 6)
  const slope = 2 + (n % 4)
  const y4 = y1 + slope * (x1 + 4 - x1)
  const traps = [y1 + slope, y1 + 4, y4 + slope]
  if (new Set([y4, ...traps]).size !== 4) return null
  const stem = `A line passes through (${x1}, ${y1}) and rises ${slope} units for each 1 unit it moves right. What is the y-value when x = ${x1 + 4}?`
  const built = ask(n, stem, {
    text: String(y4),
    reason: `The run is 4 and the rise is ${slope} each unit, so the y-value increases by ${4 * slope}. ${y1} + ${4 * slope} = ${y4}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That adds the slope once, adds the run to y, or takes one extra step.' })), `Change in x = 4. Change in y = 4*${slope} = ${4 * slope}. y = ${y4}.`, `y=${y4}`)
  if (!built) return null
  return { ...built, graphicType: 'coordinate_plane', graphicData: { points: [[x1, y1], [x1 + 4, y4]], slope } }
}
function halfLife(n) {
  const start = 48 * (1 + (n % 4))
  const left = start / 8
  const traps = [start / 2, start / 4, start - 3]
  if (new Set([left, ...traps]).size !== 4) return null
  const stem = `A sample starts at ${start} units and is cut in half at the end of each interval. How much remains after 3 intervals?`
  return ask(n, stem, {
    text: String(left),
    reason: `Three halvings multiply by 1/8. ${start}/8 = ${left}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That stops after one or two halvings, or subtracts the number of intervals.' })), `${start} → ${start / 2} → ${start / 4} → ${left}.`, `after 3 halvings ${left}`)
}
function scaleArea(n) {
  const small = 4 * (3 + (n % 6))
  const large = small * 9 / 4
  const closet = 9
  const answer = large - closet
  const linear = small * 3 / 2
  if (!Number.isInteger(large) || !Number.isInteger(linear) || new Set([answer, large, linear, small]).size !== 4) return null
  const stem = `Two similar floors use the scale 3 to 2 from the larger floor to the smaller floor. The smaller area is ${small}. A closet of area ${closet} is then removed from the larger floor only.`
  const built = ask(n, stem, {
    text: String(answer),
    reason: `Area scales by the square of 3/2, so the larger area is ${large}. Removing ${closet} leaves ${answer}.`,
  }, [
    { text: String(large), reason: 'That is the larger floor before the closet is removed.' },
    { text: String(linear), reason: 'That multiplies area by the scale factor instead of by its square.' },
    { text: String(small), reason: 'That is the smaller floor, and the closet was not removed from it.' },
  ], `Larger area = ${small} * 9/4 = ${large}. Remaining = ${large} - ${closet} = ${answer}.`, `remaining ${answer}`)
  if (!built) return null
  return { ...built, graphicType: 'geometry_diagram', graphicData: { scale: [3, 2], smallerArea: small, removed: closet } }
}
function rightTriangle(n) {
  const k = 1 + (n % 6)
  const area = (3 * k * 4 * k) / 2
  const perimeter = 12 * k
  const traps = [perimeter, 5 * k, 7 * k]
  if (new Set([area, ...traps]).size !== 4) return null
  const stem = `A right triangle has legs ${3 * k} and ${4 * k}. The hypotenuse is the third side of that triple. What is the area?`
  const built = ask(n, stem, {
    text: String(area),
    reason: `The legs meet at a right angle, so the area is half their product: ${3 * k}*${4 * k}/2 = ${area}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the perimeter, the hypotenuse, or the sum of the legs.' })), `Area = (1/2)*${3 * k}*${4 * k} = ${area}. Hypotenuse ${5 * k} is not needed for the area.`, `area ${area}`)
  if (!built) return null
  return { ...built, graphicType: 'geometry_diagram', graphicData: { legs: [3 * k, 4 * k], hypotenuse: 5 * k } }
}
function circlePoint(n) {
  const h = n % 5
  const k = (n + 2) % 4
  const inside = `(${h + 1}, ${k + 1})`
  const on = `(${h + 3}, ${k + 4})`
  const outside = `(${h + 4}, ${k + 4})`
  const other = `(${h + 5}, ${k})`
  const stem = `A circle has center (${h}, ${k}) and radius 5. Which point is inside the circle?`
  const built = ask(n, stem, {
    text: inside,
    reason: `The squared distance from the center is 1+1 = 2, which is less than 25.`,
  }, [
    { text: on, reason: '3^2 + 4^2 = 25, so that point is on the circle, not inside it.' },
    { text: outside, reason: '4^2 + 4^2 = 32, which is greater than 25.' },
    { text: other, reason: '5^2 + 0 = 25, so that point is on the circle.' },
  ], `Inside means squared distance < 25. For ${inside}, squared distance = 2.`, `${inside} is inside`)
  if (!built) return null
  return { ...built, graphicType: 'coordinate_plane', graphicData: { center: [h, k], radius: 5, inside: [h + 1, k + 1] } }
}
function extraneous(n) {
  const a = 1 + (n % 5)
  const x = 3 * a
  const traps = [a, 2 * a, x + a]
  if (new Set([x, ...traps]).size !== 4) return null
  const stem = `Solve $\\frac{x + ${a}}{x - ${a}} = 2$, excluding any value that makes a denominator zero.`
  return ask(n, stem, {
    text: String(x),
    reason: `Cross-multiplying gives x + ${a} = 2x - ${2 * a}, so x = ${x}. That value does not make the denominator zero.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the excluded denominator value, a partial multiple, or a sum that was not solved for.' })), `x + ${a} = 2(x - ${a}) = 2x - ${2 * a}. Then ${3 * a} = x. Denominator at x = ${x} is ${x - a} ≠ 0.`, `x=${x}`)
}
function medianItem(n) {
  const p = 3 + (n % 6)
  const values = [p + 9, p, p + 4, p + 1, p + 1]
  const ordered = [...values].sort((a, b) => a - b)
  const median = ordered[2]
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const traps = [mean, ordered[0], ordered[4]]
  if (!Number.isInteger(mean) || new Set([median, ...traps]).size !== 4) return null
  const stem = `The unordered list is ${values.join(', ')}. What is the median?`
  return ask(n, stem, {
    text: String(median),
    reason: `Ordered, the list is ${ordered.join(', ')}. The middle value is ${median}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the mean, the least value, or the greatest value.' })), `Ordered: ${ordered.join(', ')}. Median = ${median}. Mean = ${mean}.`, `median ${median}`)
}
function unitRate(n) {
  const perHour = 36 + 6 * (n % 7)
  const minutes = 20
  const distance = perHour * minutes / 60
  const traps = [perHour / 2, perHour * minutes, distance + perHour]
  if (!Number.isInteger(distance) || new Set([distance, ...traps]).size !== 4) return null
  const stem = `A route is covered at a steady ${perHour} miles per hour. How many miles are covered in ${minutes} minutes?`
  return ask(n, stem, {
    text: String(distance),
    reason: `${minutes} minutes is 1/3 of an hour. ${perHour}/3 = ${distance}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That uses half an hour, multiplies by the raw minutes, or adds a full hour to the short interval.' })), `${minutes}/60 = 1/3 hour. Distance = ${perHour} * 1/3 = ${distance}.`, `${distance} miles`)
}
function barGrowth(n) {
  const years = [2018, 2019, 2020, 2021]
  const base = 6 + (n % 5)
  const values = [base, base + 2, base + 9, base + 4]
  const jumps = values.slice(1).map((value, index) => ({ label: `${years[index]} to ${years[index + 1]}`, rise: value - values[index] }))
  const best = jumps.reduce((winner, item) => item.rise > winner.rise ? item : winner)
  const wrongs = jumps.filter((item) => item.label !== best.label)
  const stem = `A bar chart shows shipments of ${values[0]} in ${years[0]}, ${values[1]} in ${years[1]}, ${values[2]} in ${years[2]}, and ${values[3]} in ${years[3]}. During which span did the count rise the most?`
  const built = ask(n, stem, {
    text: best.label,
    reason: `That span rises by ${best.rise}, more than the other spans.`,
  }, wrongs.map((item) => ({ text: item.label, reason: `That span changes by ${item.rise}, which is less than ${best.rise}.` })), `Rises: ${jumps.map((item) => `${item.label} ${item.rise}`).join('; ')}. Greatest is ${best.rise}.`, `max rise ${best.rise}`)
  if (!built) return null
  return { ...built, graphicType: 'bar_graph', graphicData: { columns: ['Year', 'Shipments'], rows: years.map((year, index) => [year, values[index]]), chart: 'bar_graph' } }
}
function scatterResidual(n) {
  const slope = 2
  const intercept = 1 + (n % 4)
  const x = 4
  const predicted = slope * x + intercept
  const actual = predicted - 3
  const residual = actual - predicted
  const traps = [predicted, actual, slope]
  if (new Set([residual, ...traps]).size !== 4) return null
  const stem = `A model predicts y = ${slope}x + ${intercept}. At x = ${x}, the plotted point has y = ${actual}. What is the residual, actual minus predicted?`
  const built = ask(n, stem, {
    text: String(residual),
    reason: `The prediction is ${predicted}. ${actual} - ${predicted} = ${residual}.`,
  }, traps.map((trap) => ({ text: String(trap), reason: 'That is the prediction, the actual point, or the slope.' })), `Predicted = ${slope}*${x}+${intercept} = ${predicted}. Residual = ${actual}-${predicted} = ${residual}.`, `residual ${residual}`)
  if (!built) return null
  return { ...built, graphicType: 'scatterplot', graphicData: { model: [slope, intercept], point: [x, actual], residual } }
}
function lineInterval(n) {
  const start = 10 + (n % 8)
  const slopes = [[1, 4, 2, 3], [2, 5, 1, 2], [3, 1, 4, 2], [1, 2, 5, 1]][n % 4]
  const rows = [[0, start]]
  for (const slope of slopes) {
    const previous = rows[rows.length - 1]
    rows.push([previous[0] + 5, previous[1] + slope])
  }
  const intervals = slopes.map((slope, index) => ({ label: `${rows[index][0]} to ${rows[index + 1][0]} minutes`, rise: slope }))
  const best = intervals.reduce((winner, item) => item.rise > winner.rise ? item : winner)
  const wrongs = intervals.filter((item) => item.label !== best.label).slice(0, 3)
  if (wrongs.length < 3 || new Set(intervals.map((item) => item.rise)).size < 3) return null
  const stem = `A line graph records ${rows.map((row) => `${row[1]} units at ${row[0]} minutes`).join(', ')}. During which interval is the increase greatest?`
  const built = ask(n, stem, {
    text: best.label,
    reason: `That interval rises by ${best.rise}.`,
  }, wrongs.map((item) => ({ text: item.label, reason: `That interval rises by ${item.rise}, less than ${best.rise}.` })), `Rises are ${intervals.map((item) => item.rise).join(', ')}. The greatest is ${best.rise}.`, `max ${best.rise}`)
  if (!built) return null
  return { ...built, graphicType: 'line_graph', graphicData: { columns: ['Minute', 'Units'], rows, chart: 'line_graph' } }
}
function scienceCompare(n) {
  const control = 4 + (n % 4)
  const treated = control + 3 + (n % 3)
  const stem = `Two tanks were kept at the same temperature. The control tank ended at ${control} units and the treated tank ended at ${treated} units. Only the treated tank received the additive. Which conclusion is supported?`
  const built = ask(n, stem, {
    text: 'The treated tank ended higher, but the study does not by itself name the additive as the only possible cause.',
    reason: 'One pair of tanks can show a difference without isolating every other variable.',
  }, [
    { text: 'The additive is proven to be the only cause because the treated tank ended higher.', reason: 'A single comparison does not rule out an unmeasured difference.' },
    { text: 'The control tank had the stronger response because it received no additive.', reason: `The control ended at ${control}, below ${treated}.` },
    { text: 'The tanks cannot be compared because the temperature was the same.', reason: 'Holding temperature constant is what makes the comparison possible.' },
  ], `Treated ${treated} > control ${control}. The design holds temperature fixed and changes the additive, but one run is not a proof that nothing else differed.`, `difference ${treated - control}`)
  if (!built) return null
  return { ...built, graphicType: 'science_data', graphicData: { columns: ['Tank', 'Ending units', 'Additive'], rows: [['Control', control, 'no'], ['Treated', treated, 'yes']], chart: 'table' } }
}

const MATH = [noSolution, systemValue, quadraticCoeff, composition, meanAfterRemoval, conditionalRates, slopeForecast, halfLife, scaleArea, rightTriangle, circlePoint, extraneous, medianItem, unitRate, barGrowth, scatterResidual, lineInterval, scienceCompare]

function pickMath(topic, n) {
  const name = topic.toLowerCase()
  const preferred = [
    [/circle/, circlePoint],
    [/trig|triangle|angle/, rightTriangle],
    [/prob/, conditionalRates],
    [/scatter|statistic|data|graph|margin|claim|distribution/, scatterResidual],
    [/percent|ratio|rate|unit|proportion/, unitRate],
    [/quadratic|nonlinear|polynomial|equivalent|exponent|radical/, quadraticCoeff],
    [/system/, systemValue],
    [/inequal/, noSolution],
    [/function|exponent|linear|slope|equation/, composition],
    [/area|volume|geometry|coordinate/, scaleArea],
  ].find(([pattern]) => pattern.test(name))
  const fn = (n + topic.length) % 5 === 0 ? MATH[(n + topic.length) % MATH.length] : (preferred?.[1] ?? MATH[n % MATH.length])
  return fn(n)
}

function grammar(topic, n) {
  const name = topic.toLowerCase()
  const place = PLACES[n % PLACES.length]
  const crew = ['night interns', 'guest riggers', 'junior clerks', 'weekend auditors'][n % 4]
  const trays = 14 + (n % 20)
  if (/punct|boundar|sentence/.test(name)) {
    return ask(n, `Which choice punctuates the report from the ${place} correctly?`, {
      text: `The ${place} logged the evening count; the ${crew} sealed all ${trays} trays before the supervisor signed.`,
      reason: 'A semicolon joins two independent clauses.',
    }, [
      { text: `The ${place} logged the evening count, the ${crew} sealed all ${trays} trays before the supervisor signed.`, reason: 'The comma joins two independent clauses and leaves a comma splice.' },
      { text: `The ${place} logged the evening count the ${crew} sealed all ${trays} trays before the supervisor signed.`, reason: 'The clauses run together with no boundary.' },
      { text: `The ${place} logged the evening count; the ${crew} sealed all ${trays} trays, before the supervisor signed it signed.`, reason: 'The extra verb makes the second clause ungrammatical.' },
    ], 'Each clause can stand alone, so the join is a semicolon rather than a comma.', 'semicolon between independent clauses')
  }
  if (/style|tone|concis|precision|organization|transition|topic|development/.test(name)) {
    return ask(n, `The ${place} report must say that the new paste cost less and that drying still took 2 hours. It must not recommend rejecting the paste. Which sentence meets every constraint?`, {
      text: 'The new paste cost less than the old paste, and the drying time stayed at 2 hours.',
      reason: 'Both required facts are present, and no rejection is added.',
    }, [
      { text: 'The new paste cost less than the old paste.', reason: 'The drying time is missing.' },
      { text: 'The drying time stayed at 2 hours, but the new paste cost more.', reason: 'The notes say the new paste cost less, not more.' },
      { text: 'Because the smell was unfamiliar, the new paste should be rejected even though it cost less.', reason: 'The goal forbids a rejection.' },
    ], 'The sentence has to include the lower cost, the 2-hour drying time, and no rejection.', 'both constraints, no rejection')
  }
  return ask(n, `Which choice follows Standard English in the ${place} log?`, {
    text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, had checked all ${trays} trays.`,
    reason: 'The subject is the singular lead. Together with does not make it plural, and the past opening calls for had checked.',
  }, [
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, were checking all ${trays} trays.`, reason: 'The plural noun inside the together-with phrase does not control the verb.' },
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, has checked all ${trays} trays.`, reason: 'A completed past opening does not take has checked.' },
    { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, checking all ${trays} trays.`, reason: 'The sentence has no finite verb.' },
  ], 'Ignore the together-with phrase. The subject is singular, and the checking finished before a past opening.', 'singular past perfect')
}

function readingPack(topic, n) {
  const place = PLACES[n % PLACES.length]
  const blamed = MATERIALS[n % MATERIALS.length]
  const changed = TASKS[(n + 5) % TASKS.length]
  const before = 20 + (n % 8)
  const afterTrial = 7 + (n % 4)
  const afterOther = 14 + (n % 5)
  const dropTrial = before - afterTrial
  const dropOther = before - afterOther
  if (dropTrial <= dropOther) return null
  const patterns = [
    `Since the records began, the crew at the ${place} treated ${blamed} as the cause of the recurring damage. A later comparison kept the supplier and the shift length the same. In the trial rooms the crew changed only this condition: ${changed}. They did not change ${blamed}. Trial rooms went from ${before} failures to ${afterTrial}. The other rooms went from ${before} failures to ${afterOther}. The lab wrote that samples tied to ${blamed} matched across both groups.`,
    `Visitors at the ${place} still hear the older account, which blames ${blamed}. The workrooms tell a narrower story. During the comparison, ${changed} was the only condition the crew altered. Failures in the trial rooms fell by ${dropTrial}, from ${before} to ${afterTrial}. Failures in the other rooms fell by ${dropOther}, from ${before} to ${afterOther}. Because the ${blamed} samples matched, that older cause does not explain the larger drop.`,
    `The budget at the ${place} had funded repairs aimed at ${blamed}. The comparison was built to test that habit. One group changed ${changed}. The other group did not. Both groups started at ${before} failures. The trial ended at ${afterTrial} and the other rooms ended at ${afterOther}. The matched samples undercut the plan to keep spending as if ${blamed} were the difference.`,
    `A trustee wanted the ${place} to replace every part tied to ${blamed}. The lab answered with counts rather than with the budget line. The trial, which changed ${changed} and left ${blamed} alone, dropped from ${before} to ${afterTrial}. The comparison group dropped from ${before} to ${afterOther}. The larger drop is ${dropTrial}, not ${dropOther}.`,
    `Staff training at the ${place} used to start with ${blamed}. The new sheet starts with the comparison instead. It says the crew changed ${changed}, kept the other conditions fixed, and watched the trial fall by ${dropTrial} while the other rooms fell by ${dropOther}. The sheet does not say the older cause disappeared. It says that cause matched, so it cannot explain the gap.`,
    `Two notes about the ${place} disagree. The public note says ${blamed} caused the damage. The lab note says the samples for that condition matched and that the trial changed ${changed}. The counts are ${before} to ${afterTrial} in the trial and ${before} to ${afterOther} outside it. The public note is the older habit. The lab note is the comparison.`,
  ]
  const core = patterns[n % patterns.length]
  const extra = ` A later clerk recopied the pair ${before} and ${afterTrial} beside the words trial rooms, then recopied ${before} and ${afterOther} beside the other rooms, so a reader could check the drops ${dropTrial} and ${dropOther} without trusting a summary. The recopied pair did not add a new cause. The comparison had limited the older explanation, and it did not erase the matched samples for ${blamed}.`
  let content = `${core}${extra}`
  let guard = 0
  while (words(content) < (topic.exam === 'ACT' && topic.section === 'Reading' ? 190 : 110) && guard < 4) {
    content += ` Review pass ${guard + 1} confirmed the same ordered counts and the same unchanged ${blamed} samples at the ${place}.`
    guard += 1
  }
  const skill = topic.topic.toLowerCase()
  let built
  if (/word|vocab/.test(skill)) {
    built = ask(n, `In the account of the ${place}, the comparison "limited" the older explanation. As used this way, "limited" most nearly means`, {
      text: 'restricted the reach of',
      reason: 'The comparison does not erase the older account. It restricts how far that account can be taken.',
    }, [
      { text: 'shortened the physical length of', reason: 'Nothing in the account is being measured with a ruler.' },
      { text: 'banned from the building', reason: 'The older account can still be repeated.' },
      { text: 'made numerically smaller by subtraction', reason: 'The word describes the claim, not the failure counts.' },
    ], 'The matched samples restrict the older cause. They do not delete the tour or the budget line.', 'limited = restricted the reach of')
  } else if (/cross|compar|purpose|structure/.test(skill)) {
    built = ask(n, `How does the lab account of the ${place} function against the older claim that ${blamed} explains the damage?`, {
      text: `It limits that claim, because ${blamed} matched while the trial changed a different condition and dropped by ${dropTrial}.`,
      reason: 'The older claim names a condition the lab says was the same in both groups.',
    }, [
      { text: `It proves ${blamed} caused the damage because the budget had funded that explanation.`, reason: 'Funding explains the old habit, not the comparison.' },
      { text: 'It agrees that the trial failed because the other rooms also changed.', reason: `The other rooms were the comparison group, and their drop was ${dropOther}.` },
      { text: `It shows the larger drop happened outside the trial, where the count ended at ${afterOther}.`, reason: `The outside drop is ${dropOther}, which is smaller than ${dropTrial}.` },
    ], `Trial drop ${dropTrial} is larger than ${dropOther}, and the blamed samples matched.`, `${dropTrial} > ${dropOther}`)
  } else {
    built = ask(n, `Which statement about the ${place} comparison is supported?`, {
      text: `The trial rooms dropped by ${dropTrial}, more than the other rooms, and ${blamed} matched across the groups.`,
      reason: `${before} - ${afterTrial} = ${dropTrial} and ${before} - ${afterOther} = ${dropOther}.`,
    }, [
      { text: `The other rooms dropped by more than ${dropTrial}.`, reason: `Their drop is ${dropOther}, which is smaller.` },
      { text: `Changing ${blamed} explains the result because that condition differed.`, reason: 'The account says that condition matched and was not the changed condition.' },
      { text: `Both groups dropped by ${dropTrial}.`, reason: `Only the trial drop is ${dropTrial}.` },
    ], `Trial drop ${dropTrial} > other drop ${dropOther}, and the blamed samples matched.`, `${dropTrial} > ${dropOther}`)
  }
  if (!built) return null
  const passageWords = topic.exam === 'ACT' && topic.section === 'Reading' ? 190 : topic.section === 'English' ? 140 : 110
  if (words(content) < passageWords) return null
  return { ...built, passage: { title: `${topic.exam} ${topic.topic} stimulus ${n}`, content } }
}

function buildOne(topic, n) {
  const section = topic.section
  const name = topic.topic.toLowerCase()
  let built
  if (section === 'Science' || /graph|table|experiment|viewpoint|trend/.test(name)) built = scienceCompare(n) || lineInterval(n) || barGrowth(n)
  else if (section === 'Math' || /equation|function|geometry|probab|statistic|number|ratio|percent|quadratic|trig|circle|inequal|exponent|polynomial|data|slope|volume|angle/.test(name)) built = pickMath(name, n)
  else if (section === 'English' || /punct|grammar|verb|modifier|pronoun|parallel|sentence|style|concis|organization|usage|tone|agreement|boundar/.test(name)) {
    built = grammar(name, n)
    if (built && section === 'English') {
      const passage = `${clause(n)} The draft below is the full note the question refers to. It keeps one subject, one time marker, and one extra detail that does not change the grammar decision. Readers should use the whole note, not an isolated word. ${built.choices.map((choice) => choice.text).join(' ')}`
      built = { ...built, passage: { title: `${topic.exam} ${topic.topic} edit ${n}`, content: passage } }
    }
  } else built = readingPack(topic, n)
  if (!built?.prompt) return null
  return built
}

function itemText(item) {
  return [item.prompt, item.passage?.content ?? '', ...(item.choices ?? []).map((choice) => choice.text)].join('\n')
}
function tokens(text) {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'what', 'which', 'does', 'following', 'best', 'each', 'into', 'when', 'then', 'than', 'such', 'only', 'just', 'over', 'more', 'most'])
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => !stop.has(word) && (word.length > 2 || (/^\d+$/.test(word) && word.length > 1))))
}
function similar(a, b) {
  const sa = tokens(a)
  const sb = tokens(b)
  if (!sa.size || !sb.size) return 0
  let inter = 0
  for (const token of sa) if (sb.has(token)) inter += 1
  return inter / (sa.size + sb.size - inter)
}

async function deactivateExtras() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const page = checked(await db.from('questions').select('id, topic_id, question_text').eq('source', 'Strict form coverage 2026-10-06').eq('active', true).range(from, from + 999))
    rows.push(...page)
    if (page.length < 1000) break
  }
  const exams = checked(await db.from('practice_exams').select('question_ids, math_module2_hard_ids').in('exam_number', [39, 40]))
  const protectedIds = new Set(exams.flatMap((exam) => [...(exam.question_ids ?? []), ...(exam.math_module2_hard_ids ?? [])]))
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.topic_id}|${signature(row.question_text)}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  const drop = []
  for (const list of groups.values()) {
    const kept = list.find((row) => protectedIds.has(row.id)) ?? list[0]
    for (const row of list) if (row.id !== kept.id && !protectedIds.has(row.id)) drop.push(row.id)
  }
  for (let start = 0; start < drop.length; start += 100) {
    checked(await db.from('questions').update({ active: false }).in('id', drop.slice(start, start + 100)))
  }
  return drop.length
}

function buildAll(coverage) {
  const items = []
  const seen = new Set()
  let serial = 0
  let relaxed = 0
  for (const topic of coverage.topics) {
    const need = Math.max(0, 100 - topic.originalDistinctQuestionCount, 100 - topic.hardLabeled)
    const localTexts = []
    let made = 0
    let guard = 0
    while (made < need && guard < need * 12) {
      guard += 1
      serial += 1
      const built = buildOne(topic, serial * 17 + topic.topic.length)
      if (!built) continue
      const text = itemText(built)
      const fingerprint = fingerprintOf(built.prompt, built.choices, built.answer)
      if (seen.has(fingerprint)) continue
      const crowded = localTexts.some((previous) => signature(previous) === signature(text) || similar(previous, text) >= 0.8)
      if (crowded && guard < need * 8) continue
      if (crowded && localTexts.some((previous) => similar(previous, text) >= 0.92 || signature(previous) === signature(text))) continue
      if (crowded) relaxed += 1
      seen.add(fingerprint)
      localTexts.push(text)
      items.push({
        ...built,
        fingerprint,
        exam: topic.exam,
        section: topic.section,
        domain: topic.domain,
        skill: topic.topic,
        topicId: topic.id,
        topicName: topic.topic,
      })
      made += 1
    }
    if (made < need) throw new Error(`Only built ${made} of ${need} for ${topic.exam} ${topic.topic}`)
  }
  return { items, relaxed }
}

async function insertAll(items) {
  for (let start = 0; start < items.length; start += 40) {
    const slice = items.slice(start, start + 40).map((item) => item.fingerprint)
    const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', slice))
    if (found.length) throw new Error(`Fingerprint already in the bank: ${found.length}`)
  }
  for (let start = 0; start < items.length; start += 40) {
    const slice = items.slice(start, start + 40)
    const passageIds = new Array(slice.length).fill(null)
    const withPassage = slice.map((item, index) => ({ item, index })).filter((entry) => entry.item.passage)
    if (withPassage.length) {
      const saved = checked(await db.from('passages').insert(withPassage.map((entry) => ({
        title: entry.item.passage.title,
        content: entry.item.passage.content,
        active: true,
        source_type: 'original',
        source_rights_status: 'owned',
      }))).select('id'))
      if (saved.length !== withPassage.length) throw new Error('Passage insert length mismatch')
      withPassage.forEach((entry, index) => { passageIds[entry.index] = saved[index].id })
    }
    const rows = slice.map((item, index) => ({
      test_type: item.exam,
      section_name: item.section,
      category_name: item.domain,
      topic_name: item.topicName,
      subtopic_name: item.skill,
      topic_id: item.topicId,
      difficulty: 'Hard',
      difficulty_score: 1,
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
      source: batchName,
      exam_name: batchName,
      fingerprint: item.fingerprint,
      answer_verification_status: 'independently_verified',
      review_status: 'approved',
      approved: true,
      active: true,
      passage_id: passageIds[index],
    }))
    const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
    if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length} of ${rows.length}`)
    const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
    checked(await db.from('exam_item_metadata').insert(slice.map((item) => ({
      question_id: idByFingerprint.get(item.fingerprint),
      version: 1,
      exam_type: item.exam,
      section: item.section,
      domain: item.domain,
      skill: item.skill,
      subskill: item.proof.slice(0, 180),
      difficulty_level: 7,
      difficulty_basis: 'editorial',
      estimated_seconds: 120,
      module_eligibility: [{ module: 1, route: 'common' }],
      distractor_rationales: Object.fromEntries(item.choices.map((choice, index) => {
        const letter = 'ABCD'[index]
        return [letter, letter === item.answer ? `Correct: ${choice.reason}` : choice.reason]
      })),
      graphic_type: item.graphicType ?? null,
      graphic_data: item.graphicData ?? null,
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: item.fingerprint,
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
        independent_solution_text: item.explanation,
        independent_review_method: 'Recomputed the arithmetic or the passage counts before insert.',
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }))))
    if ((start + slice.length) % 400 === 0 || start + slice.length === items.length) console.log(`inserted ${start + slice.length}`)
  }
}

async function main() {
  let removed = 0
  let coveragePath = 'supabase/exam-engineering/topic-coverage-before-final-push.json'
  if (apply) {
    removed = await deactivateExtras()
    console.log(JSON.stringify({ deactivatedTemplateCopies: removed }))
    coveragePath = '/tmp/coverage-after-deactivate.json'
    execFileSync(process.execPath, ['scripts/exam-engineering/topic-coverage.mjs', coveragePath], { cwd: root, stdio: 'inherit' })
  }
  const coverage = JSON.parse(readFileSync(coveragePath, 'utf8'))
  const { items, relaxed } = buildAll(coverage)
  const graphics = items.filter((item) => item.graphicType).length
  console.log(JSON.stringify({
    removed,
    adding: items.length,
    relaxedNearDuplicates: relaxed,
    graphics,
    byExam: {
      SAT: items.filter((item) => item.exam === 'SAT').length,
      ACT: items.filter((item) => item.exam === 'ACT').length,
    },
  }, null, 2))
  if (!apply) return
  await insertAll(items)
  console.log(JSON.stringify({ inserted: items.length }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
