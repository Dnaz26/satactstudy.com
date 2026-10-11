'use client'
import * as React from 'react'
import { BookOpen, GraduationCap, Home, LayoutGrid, MessageCircle, RotateCcw, Send, Zap } from 'lucide-react'
import { DashboardHome } from '@/app/(dashboard)/dashboard/dashboard-home'
import { StudyClient } from '@/app/(dashboard)/study/study-client'
import { PracticeExamsClient } from '@/components/practice/practice-exams-client'
import { RefreshClient } from '@/app/(dashboard)/refresh/refresh-client'
import { SimulatorClient } from '@/app/(dashboard)/simulator/simulator-client'
import { ChatClient } from '@/app/(dashboard)/chat/chat-client'
import { TestBooklet, type BookletQuestion } from '@/components/practice/test-booklet'
import { GameClient } from '@/app/(dashboard)/game/game-client'
import { PreviewSignup } from '@/components/preview-signup'

function isoOffset(days:number){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
const card='rounded-[1.6rem] border-4 border-[#e5e5e5] bg-white shadow-[0_6px_0_#e5e5e5]'
const PREVIEW_EXAMS = [
  { id:'preview-sat', examNumber:1, title:'Digital SAT Practice Test 1', totalQuestions:98, status:'available', unlocked:true, kind:'SAT' as const },
  { id:'preview-act', examNumber:1, title:'Enhanced ACT Practice Test 1', totalQuestions:131, status:'available', unlocked:true, kind:'ACT' as const },
  { id:'preview-science', examNumber:1, title:'ACT Science Practice', totalQuestions:40, status:'available', unlocked:true, kind:'ACT Science' as const },
]
const RAPID_PREVIEW: BookletQuestion[] = [{ id:'preview-rapid', question_text:'If f(x + 2) = 3x² − 12x + 7, what is the minimum value of f(x)?', choices:[{key:'A',text:'−5'},{key:'B',text:'−2'},{key:'C',text:'4'},{key:'D',text:'7'}], correct_answer:'A', difficulty:'hard', topic_id:null, topic_name:'Quadratic functions', section_name:'Math', test_type:'SAT' }]
const EXAM_PREVIEW: BookletQuestion[] = [
  { id:'exam-1', question_text:'A line passes through (2, 7) and (6, 19). Which equation represents the line?', choices:[{key:'A',text:'y = 3x + 1'},{key:'B',text:'y = 3x − 1'},{key:'C',text:'y = 2x + 3'},{key:'D',text:'y = 4x − 1'}], correct_answer:'A', difficulty:'medium', topic_id:null, topic_name:'Linear functions', section_name:'Math', test_type:'SAT' },
  { id:'exam-2', question_text:'Which choice completes the text so that it conforms to Standard English?', passage_content:'The collection of early maps, along with two field journals, _____ stored in the climate-controlled archive.', choices:[{key:'A',text:'are'},{key:'B',text:'were'},{key:'C',text:'is'},{key:'D',text:'have been'}], correct_answer:'C', difficulty:'medium', topic_id:null, topic_name:'Subject-verb agreement', section_name:'Reading and Writing', test_type:'SAT' },
]

function Learn(){const [a,setA]=React.useState('');return <div className="mx-auto max-w-4xl p-5"><p className="text-xs font-black uppercase tracking-widest text-[#58cc02]">Learn path · Level 3</p><h3 className="font-display text-3xl">Linear functions</h3><div className="mt-5 grid gap-5 md:grid-cols-2"><div className={`${card} p-6`}><b className="text-[#afafaf]">NOVA EXPLAINS</b><p className="mt-4 font-display text-2xl">Slope tells us how much y changes when x increases by 1.</p><p className="mt-5 rounded-2xl bg-[#f7f7f7] p-5 text-center font-display text-3xl">y = <span className="bg-[#d7f4ff] px-2 text-[#1899d6]">3</span>x + 4</p><p className="mt-4 rounded-xl bg-[#e8f8ff] p-3 text-sm font-bold text-[#167cac]">The 3 is attached to x, so every step right moves 3 steps up.</p></div><div className={`${card} p-6`}><p className="font-display text-xl">What is the slope?</p><div className="mt-5 grid grid-cols-2 gap-3">{['3','4','x','7'].map(v=><button key={v} onClick={()=>setA(v)} className={`rounded-2xl border-2 p-4 font-display text-xl ${a===v?(v==='3'?'border-[#58cc02] bg-[#eafbdc]':'border-[#ff4b4b] bg-[#ffe5e5]'):'border-[#e5e5e5]'}`}>{v}</button>)}</div>{a&&<p className="mt-4 text-center text-sm font-black text-[#58cc02]">{a==='3'?'Correct — you found the rate of change!':'Try the number attached to x.'}</p>}</div></div></div>}

function Practice(){const [a,setA]=React.useState('');return <div className="mx-auto max-w-5xl p-4"><div className="overflow-hidden rounded-xl border-2 border-[#b7bec7]"><header className="flex justify-between bg-[#f2f4f7] px-5 py-3"><div><b>SAT Math · Module 1</b><p className="text-xs">Question 8 of 22</p></div><span className="rounded border bg-white px-4 py-2 font-mono">27:41</span></header><div className="grid min-h-[470px] md:grid-cols-2"><p className="border-r p-7 leading-7">A linear function models the total cost of producing x notebooks. The cost rises $3.25 per notebook, and 20 notebooks cost $89. What is the fixed cost?</p><div className="p-6">{['$24','$32.50','$65','$89'].map((v,i)=><button key={v} onClick={()=>setA(v)} className={`mb-3 flex w-full gap-3 rounded-lg border p-3 ${a===v?'border-[#276ef1] bg-[#eef4ff]':'border-[#b8c0c9]'}`}><span className="rounded-full border px-2">{'ABCD'[i]}</span>{v}</button>)}</div></div><footer className="flex justify-between border-t bg-[#f2f4f7] p-3"><button className="rounded border bg-white px-4 py-2">Desmos</button><button className="rounded bg-[#276ef1] px-5 py-2 font-bold text-white">Next</button></footer></div></div>}

function Review(){const [done,setDone]=React.useState(false);return <div className="mx-auto max-w-4xl p-6"><p className="text-xs font-black uppercase tracking-widest text-[#ff4b4b]">Mistake repair</p><h3 className="font-display text-3xl">Turn a miss into a skill</h3><div className="mt-5 grid gap-5 md:grid-cols-2"><div className={`${card} p-6`}><span className="rounded-full bg-[#ffe5e5] px-3 py-1 text-xs font-black text-[#d33131]">Your answer: 12</span><p className="mt-5 font-display text-xl">3(x − 2) = 18. Find x.</p><p className="mt-5 rounded-xl bg-[#fff4cc] p-4 text-sm font-bold">You divided before undoing the grouping.</p></div><div className={`${card} p-6`}><b className="text-[#afafaf]">REPAIR STEP</b><p className="mt-4 text-lg font-bold">Divide both sides by 3:</p><p className="mt-3 text-center font-display text-2xl">x − 2 = 6</p><button onClick={()=>setDone(true)} className="mt-6 w-full rounded-2xl bg-[#58cc02] py-3 font-black text-white shadow-[0_5px_0_#46a302]">{done?'Repaired ✓':'Finish the repair'}</button></div></div></div>}

function Rapid(){const [sec,setSec]=React.useState(26);const [a,setA]=React.useState('');React.useEffect(()=>{const id=setInterval(()=>setSec(s=>s<=1?26:s-1),1000);return()=>clearInterval(id)},[]);return <div className="mx-auto max-w-3xl p-6"><div className="flex justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-[#ce82ff]">Rapid Fire</p><h3 className="font-display text-3xl">Hard question streak</h3></div><span className="flex h-16 w-16 items-center justify-center rounded-full border-8 border-[#ce82ff] font-display text-xl">{sec}</span></div><div className={`${card} mt-5 p-6`}><p className="font-display text-xl">If f(x + 2) = 3x² − 12x + 7, what is the minimum value of f(x)?</p><div className="mt-6 grid grid-cols-2 gap-3">{['−5','−2','4','7'].map(v=><button key={v} onClick={()=>setA(v)} className={`rounded-2xl border-2 p-4 font-display text-xl ${a===v?'border-[#ce82ff] bg-[#f6eaff]':'border-[#e5e5e5]'}`}>{v}</button>)}</div><div className="mt-6 h-3 overflow-hidden rounded-full bg-[#e5e5e5]"><div className="h-full bg-[#ce82ff]" style={{width:`${sec/26*100}%`}}/></div></div></div>}

function Chat(){const [sent,setSent]=React.useState(false);return <div className="grid min-h-[590px] md:grid-cols-[.8fr_1.2fr]"><div className="border-r-4 border-[#e5e5e5] p-5"><p className="font-display text-2xl">Chat with Nova</p><p className="mt-5 rounded-2xl bg-[#1cb0f6] p-4 font-bold text-white">Show me how systems work.</p><p className="mt-3 rounded-2xl bg-[#f1f1f1] p-4 font-bold">I made an example on the board. We’ll solve it one step at a time.</p><button onClick={()=>setSent(true)} className="mt-6 flex w-full justify-between rounded-2xl border-2 p-3 text-[#777]"><span>{sent?'Great — now eliminate y.':'Ask a follow-up…'}</span><Send className="h-5 w-5 text-[#1cb0f6]"/></button></div><div className="bg-[#fffdf7] p-6"><b className="text-xs text-[#1cb0f6]">LIVE BOARD</b><p className="mt-5 font-display text-2xl">2x + y = 11<br/>x − y = 1</p><p className="mt-6 rounded-xl border-2 border-[#1cb0f6] bg-white p-3 font-bold">① Add the equations</p><p className="mt-3 rounded-xl bg-[#dff5ff] p-3 text-sm font-bold">+y and −y cancel because together they equal 0.</p><p className="mt-3 rounded-xl border-2 border-dashed border-[#58cc02] bg-white p-3 font-display text-xl">3x = 12 → x = 4</p></div></div>}
function More(){return <div className="mx-auto max-w-4xl p-6"><h3 className="font-display text-3xl">More</h3><div className="mt-6 grid gap-4 sm:grid-cols-2">{[['Score analytics','1400 predicted'],['Study routine','45 minutes nightly'],['Games','Typing Rush + 3 more'],['Settings','Goals, plan, and account']].map(([a,b])=><button key={a} className={`${card} p-5 text-left`}><p className="font-display text-xl">{a}</p><p className="mt-2 text-sm font-bold text-[#afafaf]">{b}</p></button>)}</div></div>}

function ExamTry({ onDone }: { onDone: () => void }) {
  const question = EXAM_PREVIEW[0]
  const [picked, setPicked] = React.useState('')
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-[#ff9600]">Practice preview</p>
      <p className="font-display text-2xl text-[#3c3c3c]">{question.question_text}</p>
      <div className="grid gap-2">
        {question.choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            onClick={() => setPicked(choice.key)}
            className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold ${picked === choice.key ? 'border-[#276ef1] bg-[#eef4ff]' : 'border-[#e5e5e5] bg-white'}`}
          >
            {choice.key}. {choice.text}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!picked}
        onClick={onDone}
        className="w-full rounded-full bg-[#ff5c39] py-3 text-sm font-extrabold text-white disabled:opacity-40"
      >
        Lock in
      </button>
    </div>
  )
}

export function LoggedInProductPreview(){const [view,setView]=React.useState('Home');const [signup,setSignup]=React.useState(false);const [examTry,setExamTry]=React.useState(false);const tabs=[['Home',Home,'#58cc02'],['Learn',GraduationCap,'#1cb0f6'],['Practice',BookOpen,'#ff9600'],['Review',RotateCcw,'#ff4b4b'],['Rapid Fire',Zap,'#ce82ff'],['Chat',MessageCircle,'#1cb0f6'],['More',LayoutGrid,'#4b4b4b']] as const;const tasks=[{id:'p1',date:isoOffset(0),task_type:'lesson',topic_name:'Linear function interpretation',duration_minutes:20,question_count:null,completed:false,topic_id:null},{id:'p2',date:isoOffset(0),task_type:'rapid_fire',topic_name:'Rapid Fire questions',duration_minutes:15,question_count:null,completed:false,topic_id:null}];const body=signup?<PreviewSignup/>:view==='Home'?<DashboardHome firstName="Alex" testType="SAT" studyStart="19:00" dailyMinutes={45} todayMinutes={18} streak={12} testDate={isoOffset(84)} targetScore={1500} readyRate={73} expectedScore={1400} scoreLow={1360} scoreHigh={1440} baselineScore={1180} pacing={{sessionsLeft:36,practiceTotal:294,practiceRemaining:196,practiceToday:22,lessonsTotal:148,lessonsRemaining:91,lessonsToday:1,studyMinutesPerDay:45,studyDaysPerWeek:5}} todayPracticeDone={14} todayLessonsDone={0} lessonsDone={57} lessonsTotal={148} growthPoints={[]} snapshots={[]} scheduleTasks={tasks} practiceExamsDone={1} masterHref="/study/math/0" examHref="/practice"/>:view==='Learn'?<StudyClient initialRows={[]} previewOnly/>:view==='Practice'?(examTry?<ExamTry onDone={()=>setSignup(true)}/>:<PracticeExamsClient exams={PREVIEW_EXAMS} onPreviewExam={()=>setExamTry(true)}/>):view==='Review'?<RefreshClient onPreviewTopic={()=>setSignup(true)}/>:view==='Rapid Fire'?<SimulatorClient testType="SAT" initialQuestions={RAPID_PREVIEW}/>:view==='Chat'?<ChatClient guestPreview/>:<More/>;return <div className="overflow-hidden rounded-[2.25rem] border-4 border-[#e5e5e5] bg-white shadow-[0_28px_80px_rgba(40,24,12,.14)]"><div className="flex gap-2 border-b-4 bg-[#f7f7f7] px-5 py-3"><i className="h-3 w-3 rounded-full bg-red-400"/><i className="h-3 w-3 rounded-full bg-yellow-400"/><i className="h-3 w-3 rounded-full bg-green-400"/><span className="mx-auto rounded-full border-2 bg-white px-8 py-1 text-[10px] font-bold text-[#afafaf]">satactstudy.com/{view.toLowerCase().replace(' ','-')}</span></div><div className="relative h-[760px] overflow-y-auto px-3 pb-24 pt-5 sm:px-6">{body}<nav className="sticky bottom-0 z-20 mx-auto mt-8 grid max-w-3xl grid-cols-7 gap-1 rounded-2xl border-t-4 bg-white p-2 shadow-[0_-10px_30px_rgba(0,0,0,.07)]">{tabs.map(([label,Icon,color])=><button key={label} onClick={()=>{setSignup(false);setExamTry(false);setView(label)}} className={`flex flex-col items-center rounded-2xl py-2 text-[9px] font-extrabold ${view===label?'text-white':'text-[#afafaf]'}`} style={view===label?{background:color}:undefined}><Icon className="h-5 w-5"/>{label}</button>)}</nav></div></div>}
