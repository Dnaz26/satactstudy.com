import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildExamModules, fullTestCount, questionsForModule } from './modules'
import { answersMatch } from './answers'
import type { BookletQuestion } from '../../components/practice/test-booklet'
const ids=Array.from({length:98},(_,i)=>`q${i+1}`)
const questions=ids.map((id,i)=>({id,question_text:'test',choices:[],correct_answer:'1',difficulty:'medium',topic_id:null,topic_name:null,section_name:i<54?'Reading and Writing':'Math'} as BookletQuestion))
test('Digital SAT module counts, timing, order, and numbering boundaries',()=>{
 const m=buildExamModules(questions,{readingIds:ids.slice(0,27),englishIds:ids.slice(27,54),mathIds:ids.slice(54),formatVersion:2})
 assert.equal(fullTestCount(),98)
 assert.deepEqual(m.map(m=>m.questionIds.length),[27,27,22,22])
 assert.deepEqual(m.map(m=>m.seconds),[1920,1920,2100,2100])
 assert.deepEqual(m.flatMap(m=>m.questionIds),ids)
 assert.equal(m[2].questionIds[0],'q55');assert.equal(m[3].questionIds.at(-1),'q98')
 const shuffled=[...questions].reverse()
 assert.deepEqual(questionsForModule(shuffled,m[2]).map(q=>q.id),ids.slice(54,76))
})
test('legacy sessions retain three modules and their saved assignments',()=>{
 const legacy=buildExamModules(questions,{readingIds:ids.slice(0,25),englishIds:ids.slice(25,50),mathIds:ids.slice(50),formatVersion:1})
 assert.deepEqual(legacy.map(m=>m.questionIds.length),[25,25,48])
 assert.deepEqual(legacy.map(m=>m.seconds),[2100,2700,3600])
})
test('student responses accept equivalent fractions and decimals without coercing invalid input',()=>{
 assert.ok(answersMatch('3/4','0.75'));assert.ok(answersMatch('7.50','15/2'));assert.ok(answersMatch(' b ','B'))
 for(const input of ['', ' ', '1/0','0x10','Infinity','a/b'])assert.equal(answersMatch(input,'16'),false)
 assert.equal(answersMatch('0.751','3/4'),false)
})

test('SAT decimal entry accepts full-precision rounding or truncation',()=>{
 assert.ok(answersMatch('2.666','8/3'));assert.ok(answersMatch('2.667','8/3'))
 assert.ok(answersMatch('33.33','100/3'));assert.ok(answersMatch('.6666','2/3'))
 assert.equal(answersMatch('2.66','8/3'),false);assert.equal(answersMatch('2.668','8/3'),false)
 assert.equal(answersMatch('0.751','3/4'),false)
})
