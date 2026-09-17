/** Original item slots, not official question content. Official percentages
 * apply to operational items. Field-test items are administered but unscored.
 * Difficulty/time targets are editorial estimates, never empirical calibration. */
export type ExamType = 'SAT' | 'ACT'
export type Route = 'common' | 'easier' | 'harder'
export type Slot = {
  section: string; module: number; route: Route; domain: string; skill: string
  difficultyLevel: number; format: 'multiple_choice' | 'student_produced_response'
  scored: boolean; passageGroup: string | null; passageWords: number | null
  stimulus: 'short' | 'long' | 'paired' | 'notes' | 'none'
  graphic: boolean; contextual: boolean; modeling: boolean; estimatedSeconds: number
}
export const OFFICIAL_SPECIFICATIONS = {
  SAT: { version: 'digital-sat-2026', total: 98, scored: 90, seconds: 8040, breakSeconds: 600,
    adaptive: true, sources: ['https://satsuite.collegeboard.org/sat/whats-on-the-test/structure',
      'https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf'],
    sections: [{ name: 'Reading and Writing', count: 54, scored: 50, seconds: 3840 },
      { name: 'Math', count: 44, scored: 40, seconds: 4200 }] },
  ACT: { version: 'enhanced-act-2026', total: 131, scored: 108, seconds: 7500,
    adaptive: false, sources: ['https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/act-exam-sections-and-structure.html',
      'https://www.act.org/content/dam/act/unsecured/documents/R2519-Design-Framework-for-the-ACT-Enhancements-2026-02.pdf'],
    sections: [{ name: 'English', count: 50, scored: 40, seconds: 2100 },
      { name: 'Math', count: 45, scored: 41, seconds: 3000 },
      { name: 'Reading', count: 36, scored: 27, seconds: 2400 }],
    science: { name: 'Science', count: 40, scored: 34, seconds: 2400 } },
} as const

const RW = [
  ['Information and Ideas', ['Central Ideas and Details', 'Command of Evidence — Textual', 'Command of Evidence — Quantitative', 'Inferences']],
  ['Craft and Structure', ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections']],
  ['Expression of Ideas', ['Transitions', 'Rhetorical Synthesis']],
  ['Standard English Conventions', ['Boundaries', 'Form, Structure, and Sense']],
] as const
const MATH = [
  ['Algebra', ['Linear equations in one variable', 'Linear functions', 'Linear equations in two variables', 'Systems of two linear equations in two variables', 'Linear inequalities in one or two variables']],
  ['Advanced Math', ['Equivalent expressions', 'Nonlinear equations in one variable and systems of equations in two variables', 'Nonlinear functions']],
  ['Problem-Solving and Data Analysis', ['Ratios, rates, proportional relationships, and units', 'Percentages', 'One-variable data: distributions and measures of center and spread', 'Two-variable data: models and scatterplots', 'Probability and conditional probability', 'Inference from sample statistics and margin of error', 'Evaluating statistical claims: observational studies and experiments']],
  ['Geometry and Trigonometry', ['Area and volume', 'Lines, angles, and triangles', 'Right triangles and trigonometry', 'Circles']],
] as const
function base(section: string, module: number, route: Route): Slot {
  return { section, module, route, domain: '', skill: '', difficultyLevel: 4,
    format: 'multiple_choice', scored: true, passageGroup: null, passageWords: null,
    stimulus: 'none', graphic: false, contextual: false, modeling: false, estimatedSeconds: 70 }
}
function level(route: Route, index: number, count: number): number {
  const fraction = index / count
  if (route === 'easier') return fraction < .45 ? 2 : fraction < .90 ? 4 : 6
  if (route === 'harder') return fraction < .09 ? 2 : fraction < .55 ? 5 : 7
  return fraction < .25 ? 2 : fraction < .80 ? 4 : 6
}
/** Both M2 banks are generated independently. Picking a path yields exactly98.
 * Math increases in difficulty per official overview. RW groups related skills,
 * resetting difficulty within groups; neither first module is uniformly easy. */
export function satModuleSlots(section: 'Reading and Writing' | 'Math', module: 1 | 2, route: Route): Slot[] {
  if ((module === 1) !== (route === 'common')) throw new Error('Invalid adaptive route eligibility')
  const reading = section !== 'Math'
  const groups = reading ? RW : MATH
  const counts = reading ? (module === 1 ? [7, 7, 5, 6] : [6, 7, 5, 7]) : [7, 7, 3, 3]
  const slots: Slot[] = []
  groups.forEach(([domain, skills], g) => {
    for (let i = 0; i < counts[g]; i++) {
      const skill = skills[(i + (module - 1) * counts[g]) % skills.length]
      slots.push({ ...base(section,module,route), domain, skill,
        difficultyLevel: level(route, reading ? i : slots.length, reading ? counts[g] : 20),
        stimulus: reading ? (skill === 'Rhetorical Synthesis' ? 'notes' : skill === 'Cross-Text Connections' ? 'paired' : 'short') : 'none',
        passageWords: reading ? (route === 'harder' ? 110 : 70) : null,
        contextual: !reading && [0,3,8,12,16,18].includes(slots.length),
        graphic: skill === 'Command of Evidence — Quantitative' || (!reading && ['Two-variable data: models and scatterplots','Circles','Lines, angles, and triangles'].includes(skill)),
        estimatedSeconds: reading ? 65 : 90 })
    }
  })
  // Two original field-test items in every module. They must not affect routing.
  const fieldGroups=reading?(module===1?[0,1]:[2,3]):(module===1?[0,3]:[1,2])
  fieldGroups.forEach((g,i)=>slots.push({ ...base(section,module,route), scored:false,
    domain:groups[g][0],skill:groups[g][1][!reading&&module===2&&g===2?6:0]!,difficultyLevel:i?5:3,
    contextual:!reading&&module===2&&i===1,
    stimulus:reading?'short':'none', passageWords:reading?80:null,estimatedSeconds:reading?65:90 }))
  if(reading){
    // Keep trial items within their domain/skill group, rather than exposing them
    // as a conspicuous unrelated pair at the end of every module.
    slots.sort((a,b)=>groups.findIndex(g=>g[0]===a.domain)-groups.findIndex(g=>g[0]===b.domain)||
      groups.find(g=>g[0]===a.domain)![1].findIndex(s=>s===a.skill)-groups.find(g=>g[0]===b.domain)![1].findIndex(s=>s===b.skill)||a.difficultyLevel-b.difficultyLevel)
  }
  if (!reading) {
    slots.sort((a,b)=>a.difficultyLevel-b.difficultyLevel)
    const responses = module===1 ? [3,7,11,15,19] : [2,6,10,14,18,21]
    slots.forEach((s,i)=>{ if(responses.includes(i))s.format='student_produced_response' })
  }
  return slots
}

export function satBlueprint(rwRoute: 'easier'|'harder', mathRoute: 'easier'|'harder'): Slot[] {
  return [...satModuleSlots('Reading and Writing',1,'common'),...satModuleSlots('Reading and Writing',2,rwRoute),
    ...satModuleSlots('Math',1,'common'),...satModuleSlots('Math',2,mathRoute)]
}

/** Current enhanced ACT has one fixed form, never adaptive SAT modules. */
export function actBlueprint(includeScience=false,readingVariant:'paired'|'visual'='paired'): Slot[] {
  const slots: Slot[]=[]
  const englishDomains=[...Array(16).fill('Production of Writing'),...Array(8).fill('Knowledge of Language'),...Array(16).fill('Conventions of Standard English')]
  const englishSkills: Record<string,string[]> = {'Production of Writing':['Topic Development','Organization'],
    'Knowledge of Language':['Precision and Conciseness','Style and Tone'],
    'Conventions of Standard English':['Sentence Structure','Punctuation','Usage']}
  let en=0
  ;[10,10,10,5,5,10].forEach((count,group)=>{
    for(let i=0;i<count;i++,en++){
      const domain=englishDomains[(en*13)%40]
      slots.push({...base('English',1,'common'),domain,skill:englishSkills[domain][i%englishSkills[domain].length],
        scored:group<5,passageGroup:`act-english-${group+1}`,passageWords:count===10?340:185,
        stimulus:'long',difficultyLevel:[2,4,6][i%3],estimatedSeconds:42})
    }
  })
  const mathDomains=[...Array(5).fill('Number and Quantity'),...Array(8).fill('Algebra'),...Array(7).fill('Functions'),
    ...Array(7).fill('Geometry'),...Array(6).fill('Statistics and Probability'),...Array(8).fill('Integrating Essential Skills')]
  const actMathSkills:Record<string,string[]>={
    'Number and Quantity':['Real and Complex Numbers','Vectors and Matrices','Exponents and Radicals'],
    'Algebra':['Linear Equations and Inequalities','Polynomial Equations','Systems of Equations'],
    'Functions':['Function Interpretation','Function Transformations','Exponential and Logarithmic Functions'],
    'Geometry':['Coordinate Geometry','Plane and Solid Geometry','Trigonometry'],
    'Statistics and Probability':['Distributions and Center','Probability','Statistical Inference'],
    'Integrating Essential Skills':['Rates and Proportions','Percentages','Measurement and Multistep Problems']}
  for(let i=0;i<45;i++){
    const scored=![9,20,31,42].includes(i)
    const operational=i-[9,20,31,42].filter(n=>n<i).length
    const domain=mathDomains[(operational*17)%41]
    slots.push({...base('Math',1,'common'),scored,domain,skill:actMathSkills[domain][i%actMathSkills[domain].length],
      difficultyLevel:Math.min(7,1+Math.floor(i/7)),modeling:i%4===0,contextual:i%4===0,
      graphic:i%6===0,estimatedSeconds:67})
  }
  const readingDomains=[...Array(13).fill('Key Ideas and Details'),...Array(8).fill('Craft and Structure'),...Array(6).fill('Integration of Knowledge and Ideas')]
  const readingSkills:Record<string,string[]>={'Key Ideas and Details':['Central Ideas and Details','Inferences','Sequence and Relationships'],
    'Craft and Structure':['Author Perspective','Text Structure and Purpose','Words in Context'],
    'Integration of Knowledge and Ideas':['Claims and Evidence','Cross-Text Relationships']}
  for(let i=0;i<36;i++)slots.push({...base('Reading',1,'common'),scored:i<27,domain:readingDomains[(i*10)%27],
    skill:readingSkills[readingDomains[(i*10)%27]][i%readingSkills[readingDomains[(i*10)%27]].length],
    passageGroup:`act-reading-${1+Math.floor(i/9)}`,passageWords:i<18?750:650,
    stimulus:i>=18&&i<27&&readingVariant==='paired'?'paired':'long',graphic:i>=18&&i<27&&readingVariant==='visual',difficultyLevel:[2,4,6][i%3],estimatedSeconds:67})
  if(includeScience){
    const domains=[...Array(15).fill('Interpretation of Data'),...Array(8).fill('Scientific Investigation'),...Array(11).fill('Evaluating Scientific Arguments and Models with Evidence')]
    let i=0
    ;[5,6,5,6,6,6,6].forEach((count,g)=>{for(let j=0;j<count;j++,i++)slots.push({...base('Science',1,'common'),
      scored:g<6,domain:domains[(i*13)%34],skill:g<2?'Data Representation':g<5?'Research Summaries':'Conflicting Viewpoints',
      passageGroup:`act-science-${g+1}`,stimulus:'long',graphic:true,difficultyLevel:[2,4,6][j%3],estimatedSeconds:60})})
  }
  return slots
}
