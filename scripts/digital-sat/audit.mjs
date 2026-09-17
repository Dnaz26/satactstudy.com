import { db, checked } from './db.mjs'
import { writeFileSync,existsSync } from 'node:fs'
const exams = checked(await db.from('practice_exams').select('*').order('exam_number'))
const ids = [...new Set(exams.flatMap(e => e.question_ids))]
const questions = []
for (let i = 0; i < ids.length; i += 200) questions.push(...checked(await db.from('questions').select('*').in('id', ids.slice(i,i+200))))
if(!existsSync('/tmp/sat-exams-before.json')) writeFileSync('/tmp/sat-exams-before.json', JSON.stringify({ exams, questions },null,2))
const math = questions.filter(q=>q.section_name==='Math')
console.log(JSON.stringify({exams:exams.length,questions:questions.length,math:math.length,mathByTest:Object.fromEntries(['SAT','ACT'].map(t=>[t,math.filter(q=>q.test_type===t).length])),simpleMath:math.filter(q=>/least common multiple|What is.*%.*of|What is.*mean of|What value of.*satisfies|what is.*f\(/i.test(q.question_text)).length,examples:math.slice(0,8).map(q=>({prompt:q.question_text,difficulty:q.difficulty,domain:q.category_name}))},null,2))
