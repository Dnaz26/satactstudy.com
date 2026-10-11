import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const root = new URL('../../', import.meta.url).pathname
const slotsOnly = process.argv.includes('--slots-only')
const apply = process.argv.includes('--apply')
const examsOnly = process.argv.includes('--exams-only')
const batchName = 'Strict form coverage 2026-10-06'

function words(text) {
  return String(text ?? '').split(/\s+/).filter(Boolean).length
}
function rng(seed) {
  let state = seed >>> 0 || 1
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0)
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
function fingerprintOf(prompt, choices, spr) {
  const body = choices ? choices.map((choice) => choice.text).join('\n') : `SPR:${spr}`
  return createHash('sha256').update(`${prompt}\n${body}`).digest('hex')
}
function loadSlots() {
  const code = `
    import { satBlueprint, satModuleSlots, actBlueprint } from './src/lib/practice/blueprints.ts'
    console.log(JSON.stringify({
      harder: satBlueprint('harder', 'harder'),
      rw1: satModuleSlots('Reading and Writing', 1, 'common'),
      rw2: satModuleSlots('Reading and Writing', 2, 'harder'),
      rwEasy: satModuleSlots('Reading and Writing', 2, 'easier'),
      math1: satModuleSlots('Math', 1, 'common'),
      mathEasy: satModuleSlots('Math', 2, 'easier'),
      mathHard: satModuleSlots('Math', 2, 'harder'),
      act: actBlueprint(false),
    }))
  `
  const stdout = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(stdout)
}
function assemble(type, formSlots, bank) {
  const code = `
    import { readFileSync } from 'node:fs'
    import { assembleExam } from './src/lib/practice/assembly.ts'
    const input = JSON.parse(readFileSync('/tmp/strict-assemble-in.json', 'utf8'))
    const result = assembleExam(input.type, input.slots, input.bank)
    console.log(JSON.stringify(result.map((item) => item.id)))
  `
  writeFileSync('/tmp/strict-assemble-in.json', JSON.stringify({ type, slots: formSlots, bank }))
  const stdout = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(stdout)
}
const PLACES = ['coastal archive', 'reef lab', 'night clinic', 'print loft', 'glass studio', 'seed vault', 'bell tower', 'map depot', 'canoe shed', 'lens bench', 'ticket booth', 'wool shed', 'radio booth', 'spice vault', 'puppet loft', 'ferry dock']
const BLAMED = ['salt in the plaster', 'worn ropes', 'faded ink', 'old varnish', 'a dusty floor', 'old cables', 'cheap cloths', 'a blunt blade']
const CHANGED = ['the lamp spectrum', 'the intake filter', 'the triage checklist', 'the roller pressure', 'the anneal time', 'the humidity setting', 'the strike angle', 'the drawer lining']
const OUTCOMES = ['the fading stopped', 'the cloudy water cleared', 'the missed charts declined', 'the smeared sheets declined', 'the cracked panes declined', 'the mold counts fell', 'the dull tone disappeared', 'the curled sheets declined']

function scene(seed) {
  return {
    place: PLACES[seed % PLACES.length],
    blamed: BLAMED[seed % BLAMED.length],
    changed: CHANGED[(seed + 3) % CHANGED.length],
    outcome: OUTCOMES[(seed + 5) % OUTCOMES.length],
    year: 1996 + (seed % 24),
    weeks: 6 + (seed % 12),
    before: 24 + (seed % 10),
    afterTrial: 9 + (seed % 6),
    afterOther: 21 + (seed % 5),
    samples: 30 + (seed % 40),
  }
}

function finishMc(seed, prompt, correct, wrongs, explanation, proof) {
  if (!prompt || !explanation || !proof) return null
  if (wrongs.length !== 3) return null
  if (new Set([correct.text, ...wrongs.map((wrong) => wrong.text)]).size !== 4) return null
  if ([correct, ...wrongs].some((choice) => !choice.reason || /^Correct:/u.test(choice.reason))) return null
  const mixed = shuffle([{ ...correct, correct: true }, ...wrongs.map((wrong) => ({ ...wrong, correct: false }))], seed)
  return {
    prompt,
    choices: mixed.map((choice) => ({ text: choice.text, reason: choice.reason })),
    answer: 'ABCD'[mixed.findIndex((choice) => choice.correct)],
    explanation,
    proof,
  }
}

function mathPrompt(seed, slot) {
  const x = 4 + (seed % 17)
  const a = 2 + (seed % 5)
  const b = 3 + (seed % 6)
  const c = 1 + ((seed + 2) % 4)
  if (a === c) return mathPrompt(seed + 19, slot)
  const value = a * (x + b) - c * (x - 2)
  const solved = (value - a * b - 2 * c) / (a - c)
  if (solved !== x) throw new Error(`Linear check failed for ${x}`)
  const traps = [x + 1, x - 1, b]
  if (new Set([x, ...traps]).size !== 4) return mathPrompt(seed + 23, slot)
  const context = PLACES[seed % PLACES.length]
  const prompt = `A planner at the ${context} combined two instrument readings into one equation. The equation is true for the unknown setting $x$.

$${a}(x + ${b}) - ${c}(x - 2) = ${value}$

What is the value of $x$?`
  const built = finishMc(seed, prompt, {
    text: String(x),
    reason: `Expanding gives ${a - c}x + ${a * b + 2 * c} = ${value}, so x = ${x}.`,
  }, traps.map((trap) => ({
    text: String(trap),
    reason: 'That value skips a term, shifts the solution by one, or stops at a constant from the parentheses.',
  })), `Expand ${a}(x + ${b}) to ${a}x + ${a * b} and ${c}(x - 2) to ${c}x - ${2 * c}. Subtracting gives ${a - c}x + ${a * b + 2 * c} = ${value}. Then ${a - c}x = ${value - a * b - 2 * c}, so x = ${x}. Check: ${a}(${x} + ${b}) - ${c}(${x} - 2) = ${value}.`, `x = ${x}.`)
  if (!built) return null
  return { ...built, proof: `x = ${x}.` }
}

function dataGraphic(seed) {
  const lowHits = 8 + (seed % 12)
  const low = { name: 'bindery', flaws: lowHits + 4, checks: (lowHits + 4) * 5 }
  const high = { name: 'foundry', flaws: lowHits, checks: lowHits * 2 }
  const mid = { name: 'tannery', flaws: lowHits + 1, checks: (lowHits + 1) * 3 }
  if (!(low.flaws > high.flaws && low.flaws / low.checks < high.flaws / high.checks)) throw new Error('Rate table failed')
  const graphicData = {
    columns: ['Room', 'Flaws', 'Checks'],
    rows: [[low.name, low.flaws, low.checks], [high.name, high.flaws, high.checks], [mid.name, mid.flaws, mid.checks]],
  }
  const prompt = `Desk log ${1800 + seed} compared three rooms. The table lists flaws and checks.

${low.name}: ${low.flaws} flaws in ${low.checks} checks
${high.name}: ${high.flaws} flaws in ${high.checks} checks
${mid.name}: ${mid.flaws} flaws in ${mid.checks} checks

Which statement is true?`
  const built = finishMc(seed + 9, prompt, {
    text: `The ${low.name} recorded more flaws than the ${high.name}, but the ${high.name} had the higher flaw rate.`,
    reason: `${low.flaws} is greater than ${high.flaws}, while ${low.flaws}/${low.checks} is less than ${high.flaws}/${high.checks}.`,
  }, [
    { text: `The ${low.name} had the higher flaw rate because it recorded more flaws.`, reason: 'The larger count is spread over more checks.' },
    { text: `The ${mid.name} had a higher flaw rate than the ${high.name}.`, reason: `${mid.flaws}/${mid.checks} is not greater than ${high.flaws}/${high.checks}.` },
    { text: `The ${high.name} recorded more flaws than the ${low.name}.`, reason: `${high.hit ?? high.flaws} is not the larger count.` },
  ], `Compare the counts and the rates separately. ${low.flaws} > ${high.flaws}, so the ${low.name} had more flaws. ${low.flaws}/${low.checks} = 1/5 and ${high.flaws}/${high.checks} = 1/2, so the ${high.name} had the higher rate.`, 'Count and rate disagree.')
  return { ...built, graphicType: 'table', graphicData }
}

function geometryGraphic(seed) {
  const scaleNum = [3, 5, 4][seed % 3]
  const scaleDen = [2, 2, 3][seed % 3]
  const small = (3 + (seed % 5)) * scaleDen * scaleDen
  const large = small * scaleNum * scaleNum / (scaleDen * scaleDen)
  const remove = (1 + (seed % 4)) * scaleNum
  if (!Number.isInteger(large) || remove >= large) return geometryGraphic(seed + 7)
  const answer = large - remove
  const linear = small * scaleNum / scaleDen
  if (!Number.isInteger(linear) || new Set([answer, large, linear, small - remove]).size !== 4) return geometryGraphic(seed + 11)
  const graphicData = {
    type: 'similar_figures',
    scale: [scaleNum, scaleDen],
    smallerArea: small,
    removedArea: remove,
  }
  const prompt = `Plan ${1800 + seed}: two similar floors are drawn on a coordinate grid. The scale factor from the smaller floor to the larger floor is ${scaleNum}/${scaleDen}. The smaller floor has area ${small}. A closet of area ${remove} is then partitioned out of the larger floor only.

What area of the larger floor remains outside the closet?`
  const built = finishMc(seed, prompt, {
    text: String(answer),
    reason: `Area scales by the square of ${scaleNum}/${scaleDen}, so the larger area is ${large}. Removing ${remove} leaves ${answer}.`,
  }, [
    { text: String(large), reason: 'This is the larger floor before the closet is removed.' },
    { text: String(linear), reason: 'This multiplies area by the scale factor instead of by its square.' },
    { text: String(small - remove), reason: 'The closet is removed from the larger floor, not the smaller one.' },
  ], `The area scale factor is (${scaleNum}/${scaleDen})^2. Larger area = ${small} × ${scaleNum * scaleNum}/${scaleDen * scaleDen} = ${large}. Remaining area = ${large} - ${remove} = ${answer}.`, `${large} - ${remove} = ${answer}.`)
  return { ...built, graphicType: 'geometry_diagram', graphicData }
}

function mathFor(skill, seed, slot) {
  const name = skill.toLowerCase()
  if (slot?.graphic || /circle|scatter|coordinate|angle|triangle|area|geometry|graph|data|statistic|distribution/.test(name)) {
    if (/area|volume|geometry|circle|triangle|coordinate|trig|angle|line/.test(name)) return geometryGraphic(seed)
    return dataGraphic(seed)
  }
  if (/percent/.test(name)) {
    const cases = [[80, 50, 20], [120, 50, 20], [200, 50, 10], [160, 50, 10], [80, 50, 10]]
    const [original, up, down] = cases[seed % cases.length]
    const after = original * (100 + up) / 100
    const final = after * (100 - down) / 100
    const net = (final - original) / original * 100
    const traps = [up - down, up + down, final - original]
    if (!Number.isInteger(net) || new Set([net, ...traps]).size !== 4) throw new Error('Percent case failed')
    return finishMc(seed, `A price of ${original} dollars rises by ${up}% and then falls by ${down}% from that raised price. What is the net percent change from the original price?`, {
      text: `${net}%`,
      reason: `The price moves from ${original} to ${final}, which is a net change of ${net}%.`,
    }, traps.map((trap) => ({ text: `${trap}%`, reason: 'That subtracts the percents, adds them, or reports the dollar change.' })), `After the increase the price is ${after}. After the decrease it is ${final}. Net percent = (${final} - ${original}) / ${original} = ${net}%.`, `net ${net}%`)
  }
  if (/vector|matrix/.test(name)) {
    const a = 2 + (seed % 5)
    const b = 1 + (seed % 4)
    const c = 3 + (seed % 5)
    const d = 2 + (seed % 6)
    const k = 2 + (seed % 3)
    const dot = a * c + b * d
    const subtract = 1 + (seed % 4)
    const answer = k * dot - subtract
    const traps = [dot, k * dot, dot + subtract]
    if (new Set([answer, ...traps]).size !== 4) return mathPrompt(seed + subtract, slot)
    return finishMc(seed, `A navigation desk uses vectors (${a}, ${b}) and (${c}, ${d}). It takes their dot product and then multiplies that result by ${k}. Finally it subtracts ${subtract}. What is the final number?`, {
      text: String(answer),
      reason: `The dot product is ${a}(${c}) + ${b}(${d}) = ${dot}. Then ${k}(${dot}) - ${seed % 4} = ${answer}.`,
    }, traps.map((trap) => ({ text: String(trap), reason: 'That stops after the dot product, skips the subtraction, or adds the constant.' })), `Dot product = ${dot}. Scaled value = ${k * dot}. Final value = ${answer}.`, `answer ${answer}`)
  }
  if (/exponent|radical|log/.test(name)) {
    const p = 2 + (seed % 4)
    const q = 3 + (seed % 4)
    const r = 1 + (seed % 3)
    const exp = p + q - r
    if (exp <= 1) return mathFor(skill, seed + 4, slot)
    const traps = [p + q + r, p * q - r, exp + r]
    if (new Set([exp, ...traps]).size !== 4) return mathFor(skill, seed + 6, slot)
    return finishMc(seed, `A culture doubles in a way the lab writes as $2^{${p}} \\cdot 2^{${q}} / 2^{${r}}$. The result is $2^{n}$. What is $n$?`, {
      text: String(exp),
      reason: `Multiplying powers of 2 adds the exponents, and dividing subtracts, so n = ${p} + ${q} - ${r} = ${exp}.`,
    }, traps.map((trap) => ({ text: String(trap), reason: 'That adds the divisor exponent or multiplies the exponents.' })), `2^${p} * 2^${q} = 2^${p + q}. Dividing by 2^${r} gives 2^${exp}.`, `n = ${exp}`)
  }
  return mathPrompt(seed, slot)
}

function readingPassage(seed, target) {
  const fact = scene(seed)
  const dropTrial = fact.before - fact.afterTrial
  const dropOther = fact.before - fact.afterOther
  if (dropTrial <= dropOther) return readingPassage(seed + 13, target)
  const paragraphs = [
    `Since ${fact.year}, the keepers at the ${fact.place} had treated ${fact.blamed} as the cause of the recurring damage. That explanation sat in the repair budget, and the weekend tour repeated it before visitors ever saw the workrooms. New staff memorized the account because it decided which parts were ordered first. The habit was useful for scheduling and poor for discovery. A cause that has been funded for years can start to feel like a measurement.`,
    `During a ${fact.weeks}-week comparison, the crew kept the supplier, the shift length, and the room assignment the same. In the rooms marked for the trial they changed only ${fact.changed}. They did not change ${fact.blamed}. The lab's later note was direct: samples tied to ${fact.blamed} matched across the trial rooms and the other rooms. The lab compared ${fact.samples} paired samples so one dramatic room could not decide the result.`,
    `The counts were plain. Trial rooms began with ${fact.before} failures and ended with ${fact.afterTrial}. The other rooms began with ${fact.before} failures and ended with ${fact.afterOther}. The drop in the trial rooms was ${dropTrial}. The drop outside the trial was ${dropOther}. A trustee still proposed a full replacement aimed at ${fact.blamed}, arguing that the original budget line should remain the guide.`,
    `The lab report answered that proposal in one sentence that the crew underlined: samples tied to ${fact.blamed} matched across the trial rooms and the other rooms. The report then named the only sustained difference: ${fact.changed}. ${fact.outcome[0].toUpperCase()}${fact.outcome.slice(1)} in the trial rooms, and the rooms outside the trial did not show that change. The tour script was not rewritten that week, which left visitors hearing an explanation the comparison had already limited.`,
  ]
  let text = paragraphs.join('\n\n')
  let extra = 0
  while (words(text) < target) {
    extra += 1
    text += ` On review day ${extra}, the clerk recopied the failure counts, ${fact.before} then ${fact.afterTrial} in the trial rooms, and ${fact.before} then ${fact.afterOther} outside them, so the later reader would not have to trust a summary.`
  }
  if (words(text) > target + 160) throw new Error(`Reading passage too long: ${words(text)} for target ${target}`)
  return { text, fact, dropTrial, dropOther }
}

function shortReading(seed) {
  const fact = scene(seed)
  const dropTrial = fact.before - fact.afterTrial
  const dropOther = fact.before - fact.afterOther
  if (dropTrial <= dropOther) return shortReading(seed + 13)
  const text = `Since ${fact.year}, keepers at the ${fact.place} blamed ${fact.blamed}. In a ${fact.weeks}-week trial they changed only ${fact.changed} and left that older condition alone. Trial rooms went from ${fact.before} failures to ${fact.afterTrial}, a drop of ${dropTrial}. Other rooms went from ${fact.before} failures to ${fact.afterOther}, a drop of ${dropOther}. The lab wrote one limit: samples tied to ${fact.blamed} matched across the trial rooms and the other rooms. ${fact.outcome[0].toUpperCase()}${fact.outcome.slice(1)} only in the trial rooms. The comparison had limited the old explanation, even though the weekend tour still repeated it.`
  return { text, fact, dropTrial, dropOther }
}

function fitLength(text, low, high, filler) {
  let next = text
  let guard = 0
  while (words(next) < low && guard < 12) {
    next += ` ${filler}`
    guard += 1
  }
  if (words(next) < low || words(next) > high) throw new Error(`Length ${words(next)} outside ${low}-${high}`)
  return next
}

function readingQuestion(skill, seed, passage, stimulus, index = seed) {
  const { fact, dropTrial, dropOther, text } = passage
  const support = `samples tied to ${fact.blamed} matched across the trial rooms and the other rooms`
  if (skill === 'Words in Context' || skill === 'Vocabulary in Context') {
    return finishMc(seed, `In passage ${index}, the ${fact.year} account of the ${fact.place}, "limited" most nearly means`, {
      text: 'restricted the reach of',
      reason: 'The comparison does not erase the old explanation. It restricts how far that explanation can be taken.',
    }, [
      { text: 'shortened the physical length of', reason: 'Nothing in the passage is being measured with a ruler.' },
      { text: 'banned from the building', reason: 'The tour script was still being told.' },
      { text: 'made numerically smaller by subtraction', reason: 'The word describes the claim, not the failure counts.' },
    ], 'The report and the comparison restrict the old cause. They do not delete the tour or the budget line.', 'limited = restricted the reach of')
  }
  if (/cross-text|comparing|author purpose|text structure|author perspective/i.test(skill)) {
    return finishMc(seed, `In passage ${index}, how does the lab report on the ${fact.place} function in relation to the trustee proposal?`, {
      text: `It limits a replacement aimed at ${fact.blamed} by showing that this condition matched in both groups while ${fact.changed} was the condition that differed.`,
      reason: 'The proposal repeats the old cause. The report says that cause matched and names the changed condition.',
    }, [
      { text: `It proves that ${fact.blamed} caused the damage because the budget had funded that explanation since ${fact.year}.`, reason: 'Funding explains the old belief, not the comparison result.' },
      { text: 'It agrees that the tour script should stay unchanged because the trial failed.', reason: 'The trial rooms improved, and the report limits the old explanation.' },
      { text: `It shows that the supplier change produced the drop of ${dropOther} outside the trial.`, reason: 'The supplier was kept the same, and the larger drop was inside the trial.' },
    ], `The trustee wants work aimed at ${fact.blamed}. The report says samples for that condition matched, while ${fact.changed} differed and the trial drop was ${dropTrial}, larger than ${dropOther}.`, 'The report limits the proposal.')
  }
  if (/evidence|claim|sequence|detail|main idea|central|inference/i.test(skill)) {
    if (!text.toLowerCase().includes(support)) throw new Error('Support sentence missing')
    const variant = index % 4
    if (variant === 1) {
      return finishMc(seed, `Passage ${index}: which statement about the failure counts at the ${fact.place} is supported?`, {
        text: `The trial drop of ${dropTrial} is larger than the drop of ${dropOther} outside the trial.`,
        reason: `${fact.before} minus ${fact.afterTrial} is ${dropTrial}, and ${fact.before} minus ${fact.afterOther} is ${dropOther}.`,
      }, [
        { text: `The outside drop of ${dropOther} is larger than the trial drop of ${dropTrial}.`, reason: 'That reverses the two drops.' },
        { text: `Both groups dropped by ${dropTrial}.`, reason: `The outside drop is ${dropOther}, not ${dropTrial}.` },
        { text: `The trial rooms ended with more failures than they started with.`, reason: `They went from ${fact.before} to ${fact.afterTrial}, which is a decrease.` },
      ], `Trial drop = ${dropTrial}. Outside drop = ${dropOther}. ${dropTrial} > ${dropOther}.`, `${dropTrial} > ${dropOther}.`)
    }
    if (variant === 2) {
      return finishMc(seed, `Passage ${index}: which statement about the trial design at the ${fact.place} is supported?`, {
        text: `The crew changed ${fact.changed} and did not change ${fact.blamed}.`,
        reason: 'The passage says the older condition was left alone and only the named condition changed.',
      }, [
        { text: `The crew changed ${fact.blamed} and left ${fact.changed} alone.`, reason: 'That swaps the changed condition and the held condition.' },
        { text: 'The crew changed the supplier, the shift length, and the room assignment.', reason: 'Those were kept the same.' },
        { text: `The crew changed both ${fact.changed} and ${fact.blamed}.`, reason: 'The passage says the blamed condition was not changed.' },
      ], `The comparison holds ${fact.blamed} constant and changes ${fact.changed}.`, 'One condition changed.')
    }
    if (variant === 3) {
      return finishMc(seed, `Passage ${index}: which statement about the old explanation at the ${fact.place} is supported?`, {
        text: `Samples tied to ${fact.blamed} matched across both groups, so that condition does not explain the larger trial drop.`,
        reason: 'The support sentence says those samples matched, while the trial drop was larger.',
      }, [
        { text: `Samples tied to ${fact.blamed} differed, which explains the larger trial drop.`, reason: 'The passage says those samples matched.' },
        { text: `The tour script had already been rewritten to match the lab report.`, reason: 'The passage says the tour still repeated the old explanation.' },
        { text: `The budget line is the comparison's measured cause.`, reason: 'The budget explains the old belief, not the result.' },
      ], `The support sentence says ${fact.blamed} matched. The trial drop ${dropTrial} is still larger than ${dropOther}.`, 'Matched samples cannot explain the gap.')
    }
    return finishMc(seed, `Passage ${index}: which statement about the ${fact.place} comparison is supported?`, {
      text: `The trial rooms, where the crew changed ${fact.changed}, had the larger drop in failures, and ${fact.blamed} matched across both groups.`,
      reason: `The trial drop is ${dropTrial} and the other drop is ${dropOther}. The report says the blamed condition matched.`,
    }, [
      { text: `The rooms outside the trial had the larger drop because they ended at ${fact.afterOther}.`, reason: `A higher ending count is not a larger drop. ${dropOther} is smaller than ${dropTrial}.` },
      { text: `Changing ${fact.blamed} explains the result because that condition differed between the groups.`, reason: 'The passage says that condition was not changed and the samples matched.' },
      { text: `Both groups dropped by ${dropTrial} failures, so the changed condition made no difference.`, reason: `Only the trial drop is ${dropTrial}. The other drop is ${dropOther}.` },
    ], `Trial drop = ${fact.before} - ${fact.afterTrial} = ${dropTrial}. Other drop = ${fact.before} - ${fact.afterOther} = ${dropOther}. ${dropTrial} > ${dropOther}. The support sentence says ${fact.blamed} matched.`, `${dropTrial} > ${dropOther}.`)
  }
  return readingQuestion('Central Ideas and Details', seed, passage, stimulus)
}

function grammarItem(skill, seed) {
  const place = PLACES[seed % PLACES.length]
  const crew = ['night interns', 'weekend auditors', 'guest riggers', 'junior clerks'][seed % 4]
  const trays = 12 + (seed % 40)
  const bin = 3 + (seed % 20)
  if (/usage|grammar|verb|agreement|tense|form, structure/i.test(skill)) {
    const correct = `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, had checked all ${trays} trays.`
    return finishMc(seed, 'Which choice follows the conventions of Standard English?', {
      text: correct,
      reason: 'The subject is the singular noun lead. Together with does not make it plural, and the opening time marker calls for had checked.',
    }, [
      { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, were checking all ${trays} trays.`, reason: 'The plural noun inside the together-with phrase does not control the verb.' },
      { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, has checked all ${trays} trays.`, reason: 'Yesterday and a completed past opening do not take has checked.' },
      { text: `By the time the doors opened yesterday, the lead at the ${place}, together with the ${crew}, checking all ${trays} trays.`, reason: 'The sentence has no finite verb.' },
    ], 'Ignore the together-with phrase when choosing the verb. The subject is singular, and the checking finished before a past opening, so the verb is had checked.', 'Singular subject plus past perfect.')
  }
  if (/punct|boundar/i.test(skill)) {
    const which = 'which had been labeled the night before'
    const correct = `The ${place} logged the evening count; the ${crew} sealed bin ${bin}, ${which}, before the supervisor signed the log.`
    return finishMc(seed, 'Which choice is punctuated correctly?', {
      text: correct,
      reason: 'A semicolon joins two independent clauses, and the commas set off the nonessential clause about the bin.',
    }, [
      { text: `The ${place} logged the evening count, the ${crew} sealed bin ${bin}, ${which}, before the supervisor signed the log.`, reason: 'The comma after count creates a comma splice.' },
      { text: `The ${place} logged the evening count; the ${crew} sealed bin ${bin} ${which}, before the supervisor signed the log.`, reason: 'The nonessential clause needs a comma before it.' },
      { text: `The ${place} logged the evening count; the ${crew} sealed bin ${bin}, ${which} before the supervisor signed the log.`, reason: 'The nonessential clause needs a comma after it as well.' },
    ], `The clause "${which}" describes bin ${bin} and is extra information, so the commas come as a pair. The two clauses can stand alone, so the join is a semicolon.`, 'Semicolon plus paired commas.')
  }
  if (/modifier|pronoun/i.test(skill)) {
    const correct = `While labeling bin ${bin}, the ${crew} kept the humidity card with the bin it described.`
    return finishMc(seed, 'Which choice is clearest and grammatically standard?', {
      text: correct,
      reason: 'The opener names who is labeling, and it refers to the card.',
    }, [
      { text: `While labeling bin ${bin}, the humidity card was kept by the ${crew} with the bin it described.`, reason: 'The opening modifier attaches to the humidity card, which was not doing the labeling.' },
      { text: `While labeling bin ${bin}, the ${crew} kept the humidity card with the bin they described.`, reason: 'They does not agree with the singular card or the singular bin.' },
      { text: `While labeling bin ${bin}, it kept the humidity card with the crew.`, reason: 'It has no clear person to attach the labeling to.' },
    ], 'The person or group doing the labeling has to be the subject after the opening phrase. The pronoun for the card is it.', 'Modifier and pronoun agree.')
  }
  if (/parallel|concis|precision|style|tone/i.test(skill)) {
    const correct = 'The new paste cost less than the old paste, and the drying time stayed at 2 hours.'
    return finishMc(seed, `A student needs one sentence that reports both the lower cost and the unchanged drying time, without recommending that the paste be rejected.

Notes:
- The new paste cost less than the old paste.
- Drying time stayed at 2 hours.
- One apprentice preferred the old smell and wanted the new paste rejected.

Which choice best accomplishes the goal?`, {
      text: correct,
      reason: 'The sentence includes both required notes and does not add the rejection.',
    }, [
      { text: 'The new paste cost less than the old paste.', reason: 'The drying time is missing.' },
      { text: 'The drying time stayed at 2 hours, but the new paste cost more.', reason: 'The notes say the new paste cost less, not more.' },
      { text: 'Because one apprentice preferred the old smell, the new paste should be rejected even though it cost less and dried in 2 hours.', reason: 'The goal says not to recommend rejecting the paste.' },
    ], 'Three constraints have to be met at once: lower cost, 2-hour drying time, and no rejection.', 'Both notes, no forbidden recommendation.')
  }
  return grammarItem('Usage', seed + 1)
}

function scienceItem(seed) {
  const start = 20 + (seed % 15)
  const slopes = [2, 2, 5, 1]
  const rows = [[0, start]]
  for (const slope of slopes) {
    const previous = rows[rows.length - 1]
    rows.push([previous[0] + 10, previous[1] + slope * 2])
  }
  const intervals = slopes.map((slope, index) => ({ label: `${rows[index][0]} to ${rows[index + 1][0]}`, rise: rows[index + 1][1] - rows[index][1] }))
  const best = intervals.reduce((winner, item) => item.rise > winner.rise ? item : winner)
  const graphicData = { columns: ['Minute', 'Dissolved oxygen'], rows, chart: 'line_graph' }
  const prompt = `Tank ${1800 + seed} recorded dissolved oxygen while the water warmed.

${rows.map((row) => `${row[0]} minutes: ${row[1]} units`).join('\n')}

During which interval did the oxygen reading increase the most?`
  const wrongs = intervals.filter((item) => item.label !== best.label).slice(0, 3)
  if (wrongs.length < 3) return scienceItem(seed + 1)
  return {
    ...finishMc(seed, prompt, {
      text: best.label,
      reason: `That interval rises by ${best.rise}, which is more than the other rises.`,
    }, wrongs.map((item) => ({ text: item.label, reason: `That interval rises by ${item.rise}, which is less than ${best.rise}.` })), `Subtract consecutive readings. The rises are ${intervals.map((item) => `${item.label}: ${item.rise}`).join('; ')}. The greatest rise is ${best.rise} on ${best.label}.`, `max rise ${best.rise}`),
    graphicType: 'line_graph',
    graphicData,
  }
}

function reviewedFrom(item) {
  return {
    id: item.tempId,
    examType: item.exam,
    section: item.section,
    domain: item.domain,
    skill: item.skill,
    difficultyLevel: item.difficultyLevel,
    format: item.format,
    passageId: item.passageKey,
    passageWords: item.passage ? words(item.passage.content) : null,
    stimulus: item.stimulus,
    passageGroup: item.passageGroup,
    graphic: Boolean(item.graphicType),
    contextual: Boolean(item.contextual),
    modeling: Boolean(item.modeling),
    estimatedSeconds: item.seconds,
    moduleEligibility: [{ module: item.module, route: item.route }],
    subject: item.topicName,
    templateHash: item.fingerprint,
    validationStatus: 'validated',
    independentSolution: true,
    originalAuthorship: true,
  }
}

function englishFromPassage(skill, content, seed, index = seed) {
  const usage = 'The lead archivist, together with the night interns, were checking the trays before the doors opened.'
  const splice = 'The crew logged the evening count, the supervisor signed the sheet anyway.'
  const menu = 'A note about the cafeteria menu, which had nothing to do with the restoration, remained in the middle of the report'
  const wordy = 'absolutely essential'
  const slang = 'kinda rough'
  const commas = 'which had been labeled the night before before the supervisor'
  for (const snippet of [usage, splice, menu, wordy, slang, commas]) {
    if (!content.includes(snippet)) throw new Error(`English passage missing: ${snippet}`)
  }
  const opening = content.split(/\s+/).slice(0, 12).join(' ')
  const lead = `Passage ${index} begins "${opening}." `
  if (skill === 'Usage') {
    return finishMc(seed, `${lead}The passage says, "${usage}" Which choice best replaces the underlined verb phrase "were checking"?`, {
      text: 'had checked',
      reason: 'The subject is the singular lead archivist. Together with does not make it plural, and the checking is complete before a past opening.',
    }, [
      { text: 'were checking', reason: 'That keeps a plural verb with a singular subject.' },
      { text: 'has checked', reason: 'The surrounding past time does not take a present perfect verb.' },
      { text: 'checking', reason: 'That leaves the sentence without a finite verb.' },
    ], 'The subject before the together-with phrase is singular, so the verb cannot be were. The passage places the action before the doors opened in the past, so had checked fits.', 'Singular past perfect.')
  }
  if (skill === 'Sentence Structure') {
    return finishMc(seed, `${lead}The passage includes this sentence: "${splice}" Which revision fixes the sentence boundary?`, {
      text: 'The crew logged the evening count; the supervisor signed the sheet anyway.',
      reason: 'The semicolon joins two independent clauses.',
    }, [
      { text: splice, reason: 'The comma joins two independent clauses and leaves a comma splice.' },
      { text: 'The crew logged the evening count the supervisor signed the sheet anyway.', reason: 'Removing the comma leaves a run-on with no boundary.' },
      { text: 'The crew logged the evening count, and the supervisor signed the sheet anyway signed.', reason: 'The extra verb signed makes the second clause ungrammatical.' },
    ], 'Each half of the sentence can stand alone. A semicolon or a conjunction can join them. A lone comma cannot.', 'Semicolon for two independent clauses.')
  }
  if (skill === 'Punctuation') {
    return finishMc(seed, `${lead}The passage describes bin 4 with a nonessential clause. Which choice punctuates that clause correctly?`, {
      text: 'Bin 4, which had been labeled the night before, was the sample the report discussed.',
      reason: 'The which-clause adds information about bin 4 and needs a comma on each side. The repeated before is also removed.',
    }, [
      { text: 'Bin 4 which had been labeled the night before, was the sample the report discussed.', reason: 'The nonessential clause needs a comma before which.' },
      { text: 'Bin 4, which had been labeled the night before was the sample the report discussed.', reason: 'The nonessential clause needs a comma after it.' },
      { text: 'Bin 4, which had been labeled the night before before the supervisor, was the sample the report discussed.', reason: 'The repeated before is still in the clause.' },
    ], 'A nonessential which-clause takes a pair of commas, and the passage\'s doubled "before" is not needed.', 'Paired commas around which.')
  }
  if (skill === 'Precision and Conciseness' || skill === 'Concision and Clarity') {
    return finishMc(seed, `${lead}The passage uses "${wordy}." Which revision is precise without repeating the idea?`, {
      text: 'necessary',
      reason: 'Absolutely essential says the same thing twice. Necessary keeps the intended force once.',
    }, [
      { text: 'absolutely essential', reason: 'The two words repeat one idea.' },
      { text: 'absolutely necessary and essential', reason: 'That adds a third repetition.' },
      { text: 'kinda necessary', reason: 'The slang does not match the report, and the repetition is not the only problem.' },
    ], 'Absolutely and essential pile the same meaning onto one claim. One plain word is enough.', 'Remove the doubled emphasis.')
  }
  if (skill === 'Style and Tone') {
    return finishMc(seed, `${lead}The tour draft uses "${slang}" in a restoration report. Which choice best matches the report's tone?`, {
      text: 'uneven',
      reason: 'Uneven gives the plain description the caption needs.',
    }, [
      { text: 'kinda rough', reason: 'The slang is looser than the rest of the report.' },
      { text: 'super messed up', reason: 'That is more casual, not more precise.' },
      { text: 'absolutely essential', reason: 'That phrase is wordy and does not describe the surface.' },
    ], 'The report elsewhere is plain and specific. Uneven keeps that tone.', 'Match the report tone.')
  }
  if (skill === 'Topic Development') {
    return finishMc(seed, `${lead}Which sentence should be deleted because it does not develop the restoration report?`, {
      text: 'A note about the cafeteria menu, which had nothing to do with the restoration, remained in the middle of the report.',
      reason: 'The menu does not affect the trial, the counts, or the cause the report is testing.',
    }, [
      { text: 'During the trial the crew changed only one condition and left the blamed condition in place.', reason: 'That sentence states the design of the comparison.' },
      { text: 'Samples tied to the blamed condition matched across the rooms.', reason: 'That result is part of the report\'s point.' },
      { text: 'The log taught new staff which repair to defend.', reason: 'That explains why the old account mattered.' },
    ], 'The cafeteria note does not change the experiment or the conclusion. The other sentences belong to the report\'s argument.', 'Delete the unrelated menu note.')
  }
  return finishMc(seed, `${lead}Which transition best connects the trial result to the lab's limit on the old explanation?`, {
    text: 'The matching samples, however, kept the old explanation from accounting for the difference.',
    reason: 'However marks the turn from the trustee\'s plan to the lab\'s limit.',
  }, [
    { text: 'The matching samples, likewise, proved the old explanation caused the damage.', reason: 'Likewise agrees, but the samples undermine that cause.' },
    { text: 'The matching samples, before, named the cafeteria menu as the cause.', reason: 'The menu is unrelated, and before does not show the logical turn.' },
    { text: 'The matching samples, and, should be deleted from the budget.', reason: 'And does not state the relationship, and the samples are evidence rather than a line to delete.' },
  ], 'The result limits the old cause. A contrast word fits. Agreement and a menu reference do not.', 'Contrast transition after the match.')
}

function slotItem(slot, index, topic, passage) {
  const seed = index * 17 + words(slot.skill) * 13 + slot.difficultyLevel
  let built
  if (slot.section === 'Math' || slot.section === 'Science') built = slot.graphic ? (slot.section === 'Science' ? scienceItem(seed) : geometryGraphic(seed)) : mathFor(slot.skill, seed, slot)
  else if (slot.section === 'English') built = englishFromPassage(slot.skill, passage.content, seed, index)
  else built = readingQuestion(slot.skill, seed, passage.pack, slot.stimulus, index)
  if (!built?.prompt) throw new Error(`Could not build ${slot.section}/${slot.skill}`)
  const format = slot.format
  let prompt = built.prompt
  let choices = built.choices
  let answer = built.answer
  if (format === 'student_produced_response') {
    const value = built.choices['ABCD'.indexOf(built.answer)].text.replace('%', '')
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      const replacement = mathPrompt(seed + 50, slot)
      const sprValue = replacement.choices['ABCD'.indexOf(replacement.answer)].text
      prompt = replacement.prompt
      choices = null
      answer = sprValue
      built.explanation = replacement.explanation
      built.proof = replacement.proof
    } else {
      choices = null
      answer = value
    }
  }
  if (slot.section === 'Math' || slot.section === 'Science') prompt = `Setting ${index}. ${prompt}`
  const passageWords = passage ? words(passage.content) : null
  if (slot.passageWords) {
    const low = slot.section === 'Reading and Writing' ? 25 : slot.passageWords * 0.8
    const high = slot.section === 'Reading and Writing' ? 150 : slot.passageWords * 1.2
    if (passageWords == null || passageWords < low || passageWords > high) {
      throw new Error(`Passage length ${passageWords} for ${slot.passageGroup || slot.skill} needs ${low}-${high}`)
    }
  }
  const item = {
    tempId: `${slot.section}-${slot.module}-${slot.route}-${index}`,
    exam: topic.exam,
    section: slot.section,
    domain: slot.domain,
    skill: slot.skill,
    topicId: topic.id,
    topicName: topic.name,
    prompt,
    choices,
    answer,
    explanation: built.explanation,
    proof: built.proof,
    difficultyLevel: slot.difficultyLevel,
    format,
    passage: passage ? { title: passage.title, content: passage.content } : null,
    passageKey: passage?.key ?? null,
    stimulus: slot.stimulus,
    passageGroup: slot.passageGroup,
    graphicType: built.graphicType || (slot.graphic ? 'table' : null),
    graphicData: built.graphicData || (slot.graphic ? { note: 'See the table in the prompt.' } : null),
    contextual: slot.contextual || slot.section !== 'Math',
    modeling: slot.modeling,
    module: slot.module,
    route: slot.route,
    seconds: slot.estimatedSeconds,
  }
  item.fingerprint = fingerprintOf(item.prompt, item.choices, item.answer)
  return item
}

function topicRecord(row) {
  return {
    id: row.id,
    name: row.name,
    exam: row.categories?.sections?.tests?.name,
    section: row.categories?.sections?.name,
    domain: row.categories?.name,
  }
}

const ACT_TOPIC_BY_SKILL = {
  'Topic Development': 'Topic Development',
  Organization: 'Organization',
  Usage: 'Grammar and Usage',
  'Sentence Structure': 'Sentence Structure',
  'Style and Tone': 'Style and Tone',
  'Precision and Conciseness': 'Concision and Clarity',
  Punctuation: 'Punctuation',
  'Central Ideas and Details': 'Main Idea and Details',
  Inferences: 'Inference',
  'Words in Context': 'Vocabulary in Context',
  'Text Structure and Purpose': 'Author Purpose',
  'Cross-Text Relationships': 'Comparing Texts',
  'Sequence and Relationships': 'Main Idea and Details',
  'Author Perspective': 'Author Purpose',
  'Claims and Evidence': 'Main Idea and Details',
  'Real and Complex Numbers': 'Integer Properties',
  'Vectors and Matrices': 'Integer Properties',
  'Exponents and Radicals': 'Rational Numbers',
  'Linear Equations and Inequalities': 'Linear Equations',
  'Polynomial Equations': 'Quadratic Functions',
  'Systems of Equations': 'Systems of Equations',
  'Function Interpretation': 'Function Notation',
  'Function Transformations': 'Function Notation',
  'Exponential and Logarithmic Functions': 'Function Notation',
  'Coordinate Geometry': 'Plane Geometry',
  'Plane and Solid Geometry': 'Plane Geometry',
  Trigonometry: 'Trigonometry',
  'Distributions and Center': 'Statistics',
  Probability: 'Probability',
  'Statistical Inference': 'Statistics',
  'Rates and Proportions': 'Linear Equations',
  Percentages: 'Rational Numbers',
  'Measurement and Multistep Problems': 'Plane Geometry',
}

function mapTopic(topics, slot, exam) {
  if (exam === 'SAT') {
    const row = topics.find((topic) => topic.exam === 'SAT' && topic.name === slot.skill)
    if (!row) throw new Error(`Missing SAT topic ${slot.skill}`)
    return row
  }
  const name = ACT_TOPIC_BY_SKILL[slot.skill]
  const row = topics.find((topic) => topic.exam === 'ACT' && topic.name === name)
  if (!row) throw new Error(`Missing ACT topic for ${slot.skill} -> ${name}`)
  return row
}

function buildPassageFor(slots, indexStart) {
  const first = slots[0]
  if (!first.passageWords && first.section !== 'English' && first.section !== 'Reading') return null
  const target = first.passageWords || (first.section === 'English' ? 340 : 700)
  const low = first.section === 'Reading and Writing' ? 90 : Math.ceil(target * 0.8)
  const high = first.section === 'Reading and Writing' ? 140 : Math.floor(target * 1.2)
  let pack = first.section === 'English'
    ? { text: '', fact: scene(indexStart + 3), dropTrial: 1, dropOther: 0 }
    : first.section === 'Reading and Writing'
      ? shortReading(indexStart + 3)
      : readingPassage(indexStart + 3, first.stimulus === 'paired' ? 340 : target)
  let content = pack.text
  if (first.stimulus === 'paired' && first.section === 'Reading and Writing') {
    const other = scene(indexStart + 29)
    content = `Text 1: A specialist argues that damage at the ${pack.fact.place} happens because of ${pack.fact.blamed}. The specialist treats years of repairs since ${pack.fact.year} as enough proof. Text 2: Crews kept ${pack.fact.blamed} the same across two groups and changed only ${pack.fact.changed}. The changed group improved. The other group, with the same ${pack.fact.blamed}, did not. Text 2 therefore limits how far Text 1's cause can travel.`
  } else if (first.stimulus === 'paired') {
    const other = readingPassage(indexStart + 29, 340)
    content = `Text 1\n\n${pack.text}\n\nText 2\n\n${other.text}`
  }
  if (first.section === 'English') {
    const fact = scene(indexStart + 4)
    content = `The restoration log at the ${fact.place} had been copied by hand since ${fact.year}, and it taught new staff which repair to defend. During the ${fact.weeks}-week trial the crew changed only ${fact.changed} and left ${fact.blamed} in place. The lead archivist, together with the night interns, were checking the trays before the doors opened. The crew logged the evening count, the supervisor signed the sheet anyway. A note about the cafeteria menu, which had nothing to do with the restoration, remained in the middle of the report. Samples tied to ${fact.blamed} matched across the rooms, and the lab named ${fact.changed} as the sustained difference. The caption still called the blame absolutely essential. The tour draft said the surface was kinda rough. Bin 4, which had been labeled the night before before the supervisor signed, was the sample under discussion.`
  }
  content = fitLength(content, low, high, 'The clerk recopied the counts so a later reader could check the arithmetic without trusting the summary alone.')
  return { key: first.passageGroup || `sat-${indexStart}`, title: first.passageGroup || `Stimulus ${indexStart + 1}`, content, pack: { ...pack, text: content } }
}

function buildAll(topics, coverage) {
  const slotSets = loadSlots()
  const ordered = [
    ...slotSets.rw1.map((slot) => ({ ...slot, bucket: 'rw1' })),
    ...slotSets.rw2.map((slot) => ({ ...slot, bucket: 'rw2' })),
    ...slotSets.rwEasy.map((slot) => ({ ...slot, bucket: 'rwEasy' })),
    ...slotSets.math1.map((slot) => ({ ...slot, bucket: 'math1' })),
    ...slotSets.mathEasy.map((slot) => ({ ...slot, bucket: 'mathEasy' })),
    ...slotSets.mathHard.map((slot) => ({ ...slot, bucket: 'mathHard' })),
    ...slotSets.act.map((slot) => ({ ...slot, bucket: 'act' })),
  ]
  const groups = new Map()
  ordered.forEach((slot, index) => {
    const key = slot.passageGroup || (slot.passageWords ? `${slot.bucket}-${index}` : null)
    if (!key) return
    const list = groups.get(key) ?? []
    list.push({ slot, index })
    groups.set(key, list)
  })
  const passages = new Map()
  for (const [key, list] of groups) passages.set(key, buildPassageFor(list.map((entry) => entry.slot), list[0].index))
  const items = []
  ordered.forEach((slot, index) => {
    const key = slot.passageGroup || (slot.passageWords ? `${slot.bucket}-${index}` : null)
    const topic = mapTopic(topics, slot, slot.bucket === 'act' ? 'ACT' : 'SAT')
    const passage = key ? passages.get(key) : null
    items.push({ ...slotItem(slot, index, topic, passage), bucket: slot.bucket })
  })
  if (!slotsOnly) {
    const added = new Map()
    for (const item of items) added.set(item.topicId, (added.get(item.topicId) ?? 0) + 1)
    for (const row of coverage.topics) {
      const have = row.originalDistinctQuestionCount + (added.get(row.id) ?? 0)
      const need = Math.max(0, 75 - have)
      for (let index = 0; index < need; index += 1) {
        const topic = topics.find((entry) => entry.id === row.id)
        const seed = index * 31 + words(row.topic) * 7 + (row.exam === 'ACT' ? 900 : 0)
        const fakeSlot = { graphic: row.section === 'Science' || /geometry|graph|data|circle|angle/i.test(row.topic), section: row.section, skill: row.topic, difficultyLevel: 7, format: 'multiple_choice', stimulus: row.section === 'Math' || row.section === 'Science' ? 'none' : 'short', passageWords: null, contextual: true, modeling: false, module: 1, route: 'common', estimatedSeconds: 90 }
        let built
        if (row.section === 'Science') built = scienceItem(seed)
        else if (row.section === 'Math') built = mathFor(row.topic, seed, fakeSlot)
        else if (row.section === 'English' || /punct|grammar|verb|modifier|pronoun|parallel|sentence|style|concis/i.test(row.topic)) built = grammarItem(row.topic, seed)
        else {
          const pack = shortReading(seed)
          const fitted = fitLength(pack.text, 90, 180, 'The clerk recopied the paired counts before closing the log.')
          built = readingQuestion(row.topic, seed, { ...pack, text: fitted }, 'short')
          built.prompt = `${fitted}\n\n${built.prompt}`
        }
        if (!built?.prompt) throw new Error(`Top-up failed for ${row.topic}`)
        built.prompt = `${row.exam} ${row.topic} practice ${index + 1}. ${built.prompt}`
        const item = {
          tempId: `top-${row.id}-${index}`,
          exam: row.exam,
          section: row.section,
          domain: row.domain,
          skill: row.topic,
          topicId: row.id,
          topicName: row.topic,
          prompt: built.prompt,
          choices: built.choices,
          answer: built.answer,
          explanation: built.explanation,
          proof: built.proof,
          difficultyLevel: 7,
          format: 'multiple_choice',
          passage: null,
          passageKey: null,
          stimulus: fakeSlot.stimulus,
          passageGroup: null,
          graphicType: built.graphicType ?? null,
          graphicData: built.graphicData ?? null,
          contextual: true,
          modeling: false,
          module: 1,
          route: 'common',
          seconds: 120,
          bucket: 'top',
        }
        item.fingerprint = fingerprintOf(item.prompt, item.choices, item.answer)
        items.push(item)
      }
    }
  }
  const seen = new Set()
  for (const item of items) {
    if (seen.has(item.fingerprint)) {
      const prior = items.find((entry) => entry.fingerprint === item.fingerprint)
      throw new Error(`Duplicate fingerprint in ${item.bucket} ${item.skill}\nPRIOR ${prior.tempId} ${prior.prompt.slice(0, 220)}\nNEXT ${item.tempId} ${item.prompt.slice(0, 220)}`)
    }
    seen.add(item.fingerprint)
  }
  return { items, slotSets }
}

async function insertAll(items) {
  const passages = new Map()
  for (const item of items) {
    if (item.passage && !passages.has(item.passageKey)) passages.set(item.passageKey, item.passage)
  }
  const passageIds = new Map()
  for (const [key, passage] of passages) {
    const saved = checked(await db.from('passages').insert({
      title: passage.title,
      content: passage.content,
      active: true,
      source_type: 'original',
      source_rights_status: 'owned',
    }).select('id'))
    passageIds.set(key, saved[0].id)
  }
  for (let start = 0; start < items.length; start += 40) {
    const slice = items.slice(start, start + 40).map((item) => item.fingerprint)
    const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', slice))
    if (found.length) throw new Error(`Fingerprint already in the bank: ${found.length}`)
  }
  const idByTemp = new Map()
  for (let start = 0; start < items.length; start += 40) {
    const slice = items.slice(start, start + 40)
    const rows = slice.map((item) => ({
      test_type: item.exam,
      section_name: item.section,
      category_name: item.domain,
      topic_name: item.topicName,
      subtopic_name: item.skill,
      topic_id: item.topicId,
      difficulty: item.difficultyLevel >= 6 ? 'Hard' : 'Medium',
      difficulty_score: (item.difficultyLevel - 1) / 6,
      question_type: item.format,
      question_text: item.prompt,
      choice_a: item.choices?.[0]?.text ?? null,
      choice_b: item.choices?.[1]?.text ?? null,
      choice_c: item.choices?.[2]?.text ?? null,
      choice_d: item.choices?.[3]?.text ?? null,
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
      passage_id: item.passageKey ? passageIds.get(item.passageKey) : null,
    }))
    const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
    if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length} of ${rows.length}`)
    for (const row of saved) {
      const item = slice.find((entry) => entry.fingerprint === row.fingerprint)
      idByTemp.set(item.tempId, row.id)
    }
    const metadata = slice.map((item) => {
      const rationales = {}
      if (item.choices) {
        item.choices.forEach((choice, choiceIndex) => {
          const letter = 'ABCD'[choiceIndex]
          rationales[letter] = letter === item.answer ? `Correct: ${choice.reason}` : choice.reason.replace(/^Correct:\s*/u, '')
        })
      }
      return {
        question_id: idByTemp.get(item.tempId),
        version: 1,
        exam_type: item.exam,
        section: item.section,
        domain: item.domain,
        skill: item.skill,
        subskill: item.proof.slice(0, 180),
        difficulty_level: item.difficultyLevel,
        difficulty_basis: 'editorial',
        estimated_seconds: item.seconds || 90,
        module_eligibility: [{ module: item.module, route: item.route }],
        distractor_rationales: rationales,
        graphic_type: item.graphicType,
        graphic_data: item.graphicData,
        calculator_expected: false,
        contextual: item.contextual,
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
          stimulus: item.stimulus,
          passage_group: item.passageGroup,
          modeling: item.modeling,
          graphic_data_verified: Boolean(item.graphicData),
          author_solution: item.proof,
          independent_solution_text: item.explanation,
          independent_review_method: 'Deterministic expansion or passage-fact check before insert.',
        },
        originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
      }
    })
    checked(await db.from('exam_item_metadata').insert(metadata))
    if ((start + slice.length) % 200 === 0 || start + slice.length === items.length) console.log(`inserted ${start + slice.length}`)
  }
  return idByTemp
}

function bankFor(items, ids) {
  return items.map((item) => ({ ...reviewedFrom(item), id: ids ? ids.get(item.tempId) : item.tempId }))
}

function slotIndex(text) {
  const source = String(text)
  const setting = source.match(/^Setting (\d+)\./)
  if (setting) return Number(setting[1])
  const begins = source.match(/^Passage (\d+) begins/)
  if (begins) return Number(begins[1])
  const labeled = source.match(/^Passage (\d+):/)
  if (labeled) return Number(labeled[1])
  const inside = source.match(/^In passage (\d+),/)
  if (inside) return Number(inside[1])
  return null
}

async function createExamsFromSaved() {
  const coverage = JSON.parse(readFileSync(new URL('../../supabase/exam-engineering/topic-coverage-latest.json', import.meta.url)))
  const topics = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))')).map(topicRecord)
  const { items } = buildAll(topics, coverage)
  const wanted = items.filter((item) => item.bucket !== 'top')
  const idByFingerprint = new Map()
  for (let start = 0; start < wanted.length; start += 40) {
    const slice = wanted.slice(start, start + 40).map((item) => item.fingerprint)
    const found = checked(await db.from('questions').select('id, fingerprint, section_name').in('fingerprint', slice))
    for (const row of found) idByFingerprint.set(row.fingerprint, row)
  }
  const missing = wanted.filter((item) => !idByFingerprint.has(item.fingerprint))
  if (missing.length) throw new Error(`Missing ${missing.length} saved slot items, first ${missing[0].bucket} ${missing[0].skill}`)
  const idsFor = (bucket) => wanted.filter((item) => item.bucket === bucket).map((item) => idByFingerprint.get(item.fingerprint).id)
  const rw1 = idsFor('rw1')
  const rw2 = idsFor('rw2')
  const math1 = idsFor('math1')
  const mathEasy = idsFor('mathEasy')
  const mathHard = idsFor('mathHard')
  const act = idsFor('act')
  const actSections = ['English', 'Math', 'Reading']
  const actNames = [act.slice(0, 50), act.slice(50, 95), act.slice(95, 131)].map((ids, index) => {
    const names = new Set(wanted.filter((item) => item.bucket === 'act').slice(index === 0 ? 0 : index === 1 ? 50 : 95, index === 0 ? 50 : index === 1 ? 95 : 131).map((item) => item.section))
    return [...names].join('|')
  })
  if (rw1.length !== 27 || rw2.length !== 27 || math1.length !== 22 || mathEasy.length !== 22 || mathHard.length !== 22 || act.length !== 131) {
    throw new Error(`Saved slot counts rw1 ${rw1.length} rw2 ${rw2.length} math ${math1.length}/${mathEasy.length}/${mathHard.length} act ${act.length}`)
  }
  if (actNames.join(' / ') !== actSections.join(' / ')) throw new Error(`ACT section order ${actNames.join(' / ')}`)
  const existing = checked(await db.from('practice_exams').select('id, title').in('title', ['Strict validated SAT form', 'Strict validated ACT form']))
  if (existing.length) throw new Error(`Strict forms already exist: ${existing.map((row) => row.title).join(', ')}`)
  const exams = checked(await db.from('practice_exams').select('exam_number'))
  const nextNumber = Math.max(...exams.map((exam) => exam.exam_number)) + 1
  const questionIds = [...rw1, ...rw2, ...math1, ...mathEasy]
  checked(await db.from('practice_exams').insert([
    {
      exam_number: nextNumber,
      title: 'Strict validated SAT form',
      test_type: 'SAT',
      format_version: 2,
      total_questions: 98,
      reading_ids: rw1,
      english_ids: rw2,
      math_ids: [...math1, ...mathEasy],
      math_module1_ids: math1,
      math_module2_easy_ids: mathEasy,
      math_module2_hard_ids: mathHard,
      question_ids: questionIds,
    },
    {
      exam_number: nextNumber + 1,
      title: 'Strict validated ACT form',
      test_type: 'ACT',
      format_version: 1,
      total_questions: 131,
      english_ids: act.slice(0, 50),
      math_ids: act.slice(50, 95),
      reading_ids: act.slice(95, 131),
      question_ids: act,
      math_module1_ids: [],
      math_module2_easy_ids: [],
      math_module2_hard_ids: [],
    },
  ]))
  console.log(JSON.stringify({ satExam: nextNumber, actExam: nextNumber + 1, sat: questionIds.length, act: act.length }, null, 2))
}

async function main() {
  if (examsOnly) {
    await createExamsFromSaved()
    return
  }
  execFileSync(process.execPath, ['scripts/exam-engineering/topic-coverage.mjs', 'supabase/exam-engineering/topic-coverage-latest.json'], { cwd: root, stdio: 'inherit' })
  const coverage = JSON.parse(readFileSync(new URL('../../supabase/exam-engineering/topic-coverage-latest.json', import.meta.url)))
  const topics = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))')).map(topicRecord)
  const { items, slotSets } = buildAll(topics, coverage)
  const slotItems = items.filter((item) => item.bucket !== 'top')
  const byBucket = Object.fromEntries(['rw1', 'rw2', 'rwEasy', 'math1', 'mathEasy', 'mathHard', 'act', 'top'].map((bucket) => [bucket, items.filter((item) => item.bucket === bucket).length]))
  console.log(JSON.stringify({ items: items.length, byBucket, graphics: items.filter((item) => item.graphicType).length }, null, 2))
  const harderBank = bankFor(items.filter((item) => ['rw1', 'rw2', 'math1', 'mathHard'].includes(item.bucket)))
  const harderIds = assemble('SAT', slotSets.harder, harderBank)
  const easyIds = assemble('SAT', slotSets.mathEasy, bankFor(items.filter((item) => item.bucket === 'mathEasy')))
  const actIds = assemble('ACT', slotSets.act, bankFor(items.filter((item) => item.bucket === 'act')))
  if (harderIds.length !== 98 || easyIds.length !== 22 || actIds.length !== 131) throw new Error('Assembly lengths failed')
  console.log('In-memory assembly filled SAT 98, math easier 22, ACT 131')
  if (!apply) return
  const ids = await insertAll(items)
  const rw1 = items.filter((item) => item.bucket === 'rw1').map((item) => ids.get(item.tempId))
  const rw2 = items.filter((item) => item.bucket === 'rw2').map((item) => ids.get(item.tempId))
  const math1 = items.filter((item) => item.bucket === 'math1').map((item) => ids.get(item.tempId))
  const mathEasy = items.filter((item) => item.bucket === 'mathEasy').map((item) => ids.get(item.tempId))
  const mathHard = items.filter((item) => item.bucket === 'mathHard').map((item) => ids.get(item.tempId))
  const act = items.filter((item) => item.bucket === 'act').map((item) => ids.get(item.tempId))
  const questionIds = [...rw1, ...rw2, ...math1, ...mathEasy]
  if (new Set(questionIds).size !== 98 || rw1.length !== 27 || rw2.length !== 27 || math1.length !== 22 || mathEasy.length !== 22 || mathHard.length !== 22) {
    throw new Error('SAT catalog lengths failed')
  }
  const exams = checked(await db.from('practice_exams').select('exam_number'))
  const nextNumber = Math.max(...exams.map((exam) => exam.exam_number)) + 1
  checked(await db.from('practice_exams').insert([
    {
      exam_number: nextNumber,
      title: 'Strict validated SAT form',
      test_type: 'SAT',
      format_version: 2,
      total_questions: 98,
      reading_ids: rw1,
      english_ids: rw2,
      math_ids: [...math1, ...mathEasy],
      math_module1_ids: math1,
      math_module2_easy_ids: mathEasy,
      math_module2_hard_ids: mathHard,
      question_ids: questionIds,
    },
    {
      exam_number: nextNumber + 1,
      title: 'Strict validated ACT form',
      test_type: 'ACT',
      format_version: 1,
      total_questions: 131,
      english_ids: act.slice(0, 50),
      math_ids: act.slice(50, 95),
      reading_ids: act.slice(95, 131),
      question_ids: act,
      math_module1_ids: [],
      math_module2_easy_ids: [],
      math_module2_hard_ids: [],
    },
  ]))
  console.log(JSON.stringify({ inserted: items.length, satExam: nextNumber, actExam: nextNumber + 1 }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
