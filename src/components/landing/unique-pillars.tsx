'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, BrainCircuit, Coins, Database, Gamepad2, LineChart, Sparkles, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NovaCharacter } from '@/components/study/nova-character'

type PillarId = 'models' | 'game' | 'bank' | 'rewards' | 'agent' | 'score' | 'routine' | 'copilot' | 'brain'

const PILLARS: Array<{ id: PillarId; title: string; icon: typeof Bot }> = [
  { id: 'rewards', title: 'You can make money by studying', icon: Coins },
  { id: 'models', title: 'Multiple AI models', icon: Sparkles },
  { id: 'game', title: 'Gamified learning', icon: Gamepad2 },
  { id: 'bank', title: 'Deep question bank', icon: Database },
  { id: 'agent', title: 'AI agent', icon: Bot },
  { id: 'score', title: 'Score predictor', icon: Target },
  { id: 'routine', title: 'Routine builder', icon: LineChart },
  { id: 'copilot', title: 'Live copilot', icon: BrainCircuit },
  { id: 'brain', title: 'More of your brain working', icon: BrainCircuit },
]

function PremiereAtmosphere({ activeIndex }: { activeIndex: number }) {
  return <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <motion.div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-signal/20 blur-[90px]" animate={{ x: [0, 210, 30], y: [0, 80, 190], scale: [1, 1.35, .9] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
    <motion.div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-[110px]" animate={{ x: [0, -170, -30], y: [0, -100, -20], scale: [.9, 1.25, 1] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
    <motion.div key={`beam-${activeIndex}`} className="absolute -left-1/3 top-0 h-[160%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl" initial={{ x: '-40%', opacity: 0 }} animate={{ x: '440%', opacity: [0, .75, 0] }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
    {Array.from({ length: 16 }, (_, index) => <motion.i key={index} className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${5 + ((index * 23) % 91)}%`, top: `${8 + ((index * 37) % 82)}%` }} animate={{ y: [12, -22, 12], opacity: [.08, .7, .08], scale: [.6, 1.7, .6] }} transition={{ duration: 2.6 + (index % 5) * .45, delay: index * .11, repeat: Infinity, ease: 'easeInOut' }} />)}
    <div className="absolute inset-0 opacity-[.045]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px)', backgroundSize: '100% 4px' }} />
  </div>
}

function ModelPreview() {
  const models = [
    { name: 'Claude', logo: '/brands/claude.svg', color: '#d97757' },
    { name: 'Gemini', logo: '/brands/gemini.svg', color: '#5686e1' },
    { name: 'ChatGPT', logo: '/brands/chatgpt.svg', color: '#10a37f' },
    { name: 'Grok', logo: '/brands/grok.svg', color: '#f3f4f6' },
    { name: 'DeepSeek', logo: '/brands/deepseek.svg', color: '#4b6bfb' },
  ]
  const [modelIndex, setModelIndex] = React.useState(0)
  React.useEffect(() => { const timer = window.setInterval(() => setModelIndex((value) => (value + 1) % models.length), 1100); return () => window.clearInterval(timer) }, [models.length])
  const model = models[modelIndex]
  return <div className="relative flex h-full items-center justify-center overflow-hidden"><motion.div key={`glow-${model.name}`} className="absolute h-52 w-52 rounded-full blur-[65px]" style={{ background: model.color }} initial={{ opacity: 0, scale: .55 }} animate={{ opacity: .3, scale: 1 }} exit={{ opacity: 0 }} /><div className="absolute inset-x-8 top-7 flex justify-center gap-2">{models.map((item,index) => <span key={item.name} className={cn('h-1 rounded-full transition-all duration-300', index === modelIndex ? 'w-9 bg-signal' : 'w-3 bg-paper/15')} />)}</div><AnimatePresence mode="wait"><motion.div key={model.name} initial={{ opacity: 0, scale: .35, rotate: -18, filter: 'blur(18px)' }} animate={{ opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.55, rotate: 12, filter: 'blur(18px)' }} transition={{ duration: .42, ease: [0.2,0.8,0.2,1] }} className="relative flex flex-col items-center"><span className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-black/10 bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,.2)]"><Image src={model.logo} alt={`${model.name} logo`} width={72} height={72} className="h-full w-full object-contain" /></span><p className="mt-5 font-display text-3xl text-paper">{model.name}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[.24em] text-paper/45">Model network</p></motion.div></AnimatePresence></div>
}

function BankPreview() {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    const start = performance.now(); let frame = 0
    const tick = (now: number) => { const progress = Math.min(1, (now - start) / 3200); setCount(Math.round(7000 * (1 - Math.pow(1 - progress, 3)))); if (progress < 1) frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame)
  }, [])
  const formulas = ['=SUM(B2:D2)','Quadratics','Evidence','=AVERAGE(F:F)','Triangles','Transitions','Systems','Probability']
  return <div className="relative h-full overflow-hidden bg-white text-left">
    <motion.div className="absolute inset-2 overflow-hidden rounded-lg border border-emerald-700/25 bg-white shadow-inner" initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}}>
      <div className="grid h-6 grid-cols-[24px_repeat(7,1fr)] bg-emerald-700 text-center text-[7px] font-bold text-white"><span />{['A','B','C','D','E','F','G'].map(x=><span key={x} className="border-l border-white/20 py-1">{x}</span>)}</div>
      <motion.div animate={{y:[0,-360]}} transition={{duration:5.2,ease:'linear'}}>{Array.from({length:42},(_,row)=><div key={row} className="grid h-6 grid-cols-[24px_repeat(7,1fr)] text-[6px] text-slate-600"><span className="border-b border-r border-slate-200 bg-slate-100 pt-1 text-center">{row+1}</span>{Array.from({length:7},(_,col)=><motion.span key={col} className="overflow-hidden border-b border-r border-slate-200 px-1 pt-1" animate={{backgroundColor:(row+col)%11===0?['#fff','#dcfce7','#fff']:'#fff'}} transition={{duration:1.4,delay:(row+col)*.03,repeat:Infinity}}>{formulas[(row*3+col)%formulas.length]}</motion.span>)}</div>)}</motion.div>
    </motion.div>
    <motion.div className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-2xl border border-black/10 bg-white/95 px-5 py-3 text-center shadow-2xl backdrop-blur" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.5}}><p className="font-display text-4xl text-paper">{count.toLocaleString()}</p><p className="text-[8px] font-bold uppercase tracking-wider text-signal">Original questions indexed</p></motion.div>
  </div>
}

function RewardsPreview() {
  const [unlocked, setUnlocked] = React.useState(false)
  const [typed, setTyped] = React.useState('')
  React.useEffect(() => {
    const password = '••••••••'
    const timers = password.split('').map((_, index) => window.setTimeout(() => setTyped(password.slice(0,index+1)), 350 + index*110))
    const reveal = window.setTimeout(() => setUnlocked(true), 1850)
    return () => { timers.forEach(window.clearTimeout); window.clearTimeout(reveal) }
  }, [])
  return <div className="relative flex h-full items-center justify-center overflow-hidden px-4">
    <AnimatePresence mode="wait">
      {!unlocked ? <motion.div key="login" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.08, filter: 'blur(12px)' }} className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#b9c9de] bg-white shadow-[0_24px_60px_rgba(19,55,96,.22)]"><div className="bg-[#e31837] px-5 py-3 text-left text-lg font-bold italic text-white">Secure Banking</div><div className="p-5 text-left"><p className="text-xs font-bold text-[#173d6e]">Sign in to view your statement</p><label className="mt-4 block text-[9px] font-semibold text-slate-500">Password</label><div className="mt-1 h-10 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm tracking-[.35em] text-slate-700">{typed}<motion.span animate={{ opacity:[0,1,0] }} transition={{duration:.7,repeat:Infinity}}>|</motion.span></div><motion.button className="mt-3 w-full rounded bg-[#173d6e] py-2.5 text-xs font-bold text-white" animate={{ boxShadow: ['0 0 0 rgba(23,61,110,0)','0 0 0 5px rgba(23,61,110,.12)','0 0 0 rgba(23,61,110,0)'] }} transition={{ delay: 1.2, duration: .8 }}>View bank statement</motion.button></div></motion.div> : <motion.div key="statement" initial={{ opacity: 0, rotateY: 80, scale: .8 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} transition={{ type:'spring', stiffness:130, damping:15 }} className="w-full max-w-md overflow-hidden rounded-2xl border border-[#b9c9de] bg-white shadow-[0_28px_70px_rgba(19,55,96,.25)]"><div className="flex items-center justify-between bg-[#e31837] px-5 py-3 text-white"><p className="font-bold italic">Bank Statement</p><span className="text-[9px]">CHECKING ••4821</span></div><div className="p-5"><div className="flex items-end justify-between"><div><p className="text-[9px] uppercase tracking-wider text-slate-400">Study earnings</p><motion.p initial={{scale:.5}} animate={{scale:1}} className="mt-1 text-4xl font-bold text-[#173d6e]">+$100.00</motion.p></div><motion.span initial={{rotate:-18,scale:0}} animate={{rotate:-5,scale:1}} transition={{delay:.4,type:'spring'}} className="rounded-full border-2 border-emerald-500 px-3 py-1 text-[10px] font-bold text-emerald-600">DEPOSITED</motion.span></div><div className="mt-4 h-16 overflow-hidden rounded-lg bg-slate-50 p-2"><motion.svg viewBox="0 0 300 55" className="h-full w-full"><motion.path d="M0 47 C45 50 55 31 92 34 S145 23 170 28 S222 9 300 5" fill="none" stroke="#16a34a" strokeWidth="4" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.3}} /></motion.svg></div></div></motion.div>}
    </AnimatePresence>
  </div>
}

function WritingAgent() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-0 z-10" style={{ animation: 'agent-write-bob 1.25s ease-in-out infinite' }}>
        <NovaCharacter mood="point" size="sm" />
      </div>
      <div className="absolute bottom-2 left-1/2 z-20 h-[5.25rem] w-[92%] -translate-x-1/2 rounded-lg border-2 border-[#e4cbb8] bg-[#fff4e6] shadow-[0_8px_16px_rgba(40,24,12,.16)]">
        <div className="absolute bottom-0 left-0 top-0 w-2 rounded-l-md bg-[#ffb4a2]" />
        {[0, 1, 2].map((line) => (
          <i
            key={line}
            className="absolute left-4 h-[2px] origin-left rounded-full bg-[#1a1412]"
            style={{ top: 14 + line * 20, width: line === 2 ? 28 : 46, animation: `agent-ink 1.25s ease-in-out ${line * 0.22}s infinite` }}
          />
        ))}
      </div>
      <span className="absolute bottom-12 left-1/2 z-30 h-10 w-1.5 origin-bottom rounded-full bg-[#1a1412]" style={{ animation: 'agent-pen 1.25s ease-in-out infinite' }}>
        <i className="absolute -left-1 -top-2 h-3.5 w-3.5 rounded-sm bg-[#ff5c39]" />
        <i className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#5a4638]" />
      </span>
    </div>
  )
}

function BrainPreview() {
  const regions = [
    { part: 'Prefrontal cortex', fn: 'Rapid Fire builds focus', x: '62%', y: '12%', color: '#ff5c39' },
    { part: 'Parietal cortex', fn: 'Desmos builds visual math', x: '4%', y: '20%', color: '#3a9d8f' },
    { part: 'Temporal lobe', fn: 'Tutoring connects meaning', x: '3%', y: '72%', color: '#9b5de5' },
    { part: 'Hippocampus', fn: 'Review strengthens memory', x: '59%', y: '73%', color: '#e59d18' },
  ]
  return <div className="relative flex h-full items-center justify-center overflow-hidden"><motion.div className="relative h-[88%] w-[70%]" initial={{scale:.7,opacity:0}} animate={{scale:1,opacity:1}}><Image src="/images/realistic-learning-brain-transparent.png" alt="Brain regions used across the study system" fill className="object-contain drop-shadow-[0_24px_35px_rgba(92,43,31,.25)]" /><motion.div className="absolute inset-[18%] rounded-full border-2 border-signal/30" animate={{scale:[.8,1.1,.8],opacity:[.2,.8,.2]}} transition={{duration:2,repeat:Infinity}} /></motion.div>{regions.map((region,index)=><motion.div key={region.part} className="absolute max-w-[42%] rounded-xl border-2 bg-white/95 px-2 py-1.5 text-[8px] font-bold text-paper shadow-xl" style={{left:region.x,top:region.y,borderColor:region.color}} initial={{scale:0}} animate={{scale:[.94,1.04,.94],y:[0,index%2?4:-4,0]}} transition={{delay:index*.18,duration:2.4,repeat:Infinity}}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{background:region.color,boxShadow:`0 0 10px ${region.color}`}} /><strong>{region.part}:</strong> {region.fn}</motion.div>)}</div>
}

function PillarPreview({ id }: { id: PillarId }) {
  const [cycle, setCycle] = React.useState(0)
  React.useEffect(() => { const timer = window.setInterval(() => setCycle((value) => value + 1), 5200); return () => window.clearInterval(timer) }, [])
  if (id === 'brain') return <BrainPreview key={cycle} />
  if (id === 'models') return <ModelPreview key={cycle} />
  if (id === 'bank') return <BankPreview key={cycle} />
  if (id === 'game') return <div key={cycle} className="relative h-full overflow-hidden rounded-xl bg-[#07090d]"><motion.div className="absolute inset-0 opacity-50" style={{backgroundImage:'linear-gradient(rgba(0,255,255,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,255,.12) 1px,transparent 1px)',backgroundSize:'28px 28px'}} animate={{backgroundPosition:['0px 0px','28px 28px']}} transition={{duration:1,repeat:Infinity,ease:'linear'}}/><div className="absolute left-4 top-3 z-10 rounded bg-red-600 px-2 py-1 text-[8px] font-black text-white">FINAL ROUND</div><div className="absolute right-4 top-3 z-10 font-mono text-xl font-black text-white">9–9</div><motion.div className="absolute left-[12%] top-[48%] h-12 w-4 rounded bg-cyan-300 shadow-[0_0_25px_#67e8f9]" animate={{y:[-40,35,-20]}} transition={{duration:1.2,repeat:Infinity}}/><motion.div className="absolute right-[12%] top-[48%] h-12 w-4 rounded bg-signal shadow-[0_0_25px_#ff5c39]" animate={{y:[30,-35,15]}} transition={{duration:1.1,repeat:Infinity}}/><motion.div className="absolute h-6 w-6 rounded-full bg-white shadow-[0_0_30px_white]" animate={{left:['18%','50%','84%'],top:['66%','20%','52%'],scale:[1,1.35,.8]}} transition={{duration:1.9,ease:'easeInOut'}}/><motion.div className="absolute inset-3 z-20 flex items-center justify-center rounded-xl bg-black/90 p-3 text-center" initial={{opacity:0,scale:.8}} animate={{opacity:[0,0,1,1],scale:[.8,.8,1,1]}} transition={{duration:5.1,times:[0,.48,.57,1]}}><div><motion.p initial={{scale:2,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:2.5}} className="font-display text-2xl text-emerald-300">GOAL! 10–9</motion.p><p className="mt-2 text-[9px] font-bold text-white">Answer to keep your point</p><p className="mt-2 font-mono text-sm text-white">3x + 4 = 19</p><div className="mt-2 flex justify-center gap-1.5">{['3','5','7','15'].map((choice,index)=><motion.span key={choice} initial={{opacity:0,y:8}} animate={{opacity:1,y:0,backgroundColor:choice==='5'?'#16a34a':'rgba(255,255,255,.08)'}} transition={{delay:3+index*.12}} className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold text-white">{choice}</motion.span>)}</div><motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:4.2}} className="mt-2 text-[9px] font-bold text-emerald-300">Correct — point secured!</motion.p></div></motion.div></div>
  if (id === 'rewards') return <RewardsPreview key={cycle} />
  if (id === 'agent') return <div key={cycle} className="relative h-full overflow-hidden"><div className="absolute inset-y-3 left-3 right-[38%] rounded-2xl border border-black/10 bg-white p-3 shadow-lg"><p className="font-mono text-[7px] uppercase tracking-wider text-signal">Chat with Nova</p><div className="mt-3 space-y-2"><motion.div initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} className="ml-8 rounded-2xl rounded-br-sm bg-sky-500 p-2 text-[8px] font-semibold text-white">Can you explain quadratic roots?</motion.div><motion.div initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:1.2}} className="mr-5 rounded-2xl rounded-bl-sm bg-slate-100 p-2 text-[8px] font-semibold text-paper">Yes — roots are the x-values where the graph touches the x-axis.</motion.div><motion.div initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} transition={{delay:2.5}} className="ml-12 rounded-2xl rounded-br-sm bg-sky-500 p-2 text-[8px] font-semibold text-white">Show me an example.</motion.div><motion.div initial={{opacity:0}} animate={{opacity:[0,1,.35,1]}} transition={{delay:3.4,duration:1,repeat:Infinity}} className="mr-20 rounded-full bg-slate-100 px-3 py-1 text-[8px] text-fog">Nova is writing •••</motion.div></div></div><div className="absolute bottom-1 right-1 top-1" style={{ width: '34%' }}><WritingAgent /></div></div>
  if (id === 'score') { const formulas=['∫₀¹x²eˣdx','P(θ)=c+(1−c)/(1+e⁻ᵃ⁽θ⁻ᵇ⁾)','Σᵢwᵢ(xᵢ−μ)²','det(A−λI)=0','∂L/∂θ=Σ(y−p)x','σ²=E[X²]−E[X]²','β=(XᵀX)⁻¹Xᵀy','z=(x−μ)/σ','P(A|B)=P(B|A)P(A)/P(B)','ΔM=∫v(t)dt','R²=1−SSres/SStot','S=400+1200θ']; return <div key={cycle} className="relative h-full overflow-hidden">{formulas.map((formula,index)=><motion.span key={formula} className="absolute font-mono text-[7px] font-semibold text-paper" style={{left:`${3+(index%4)*25}%`,top:`${5+Math.floor(index/4)*25}%`}} initial={{opacity:0,scale:.7}} animate={{opacity:[0,.8,.8,0],scale:[.7,1,1,1.2],y:[8,0,0,-8]}} transition={{delay:index*.14,duration:3.8,times:[0,.2,.72,1]}}>{formula}</motion.span>)}<motion.div className="absolute inset-0 flex items-center justify-center" initial={{opacity:0}} animate={{opacity:[0,0,1,1]}} transition={{duration:5.1,times:[0,.72,.82,1]}}><div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-white shadow-[0_20px_55px_rgba(255,92,57,.22)]"><svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#f1e9e4" strokeWidth="7"/><motion.circle cx="50" cy="50" r="43" fill="none" stroke="#ff5c39" strokeWidth="7" strokeLinecap="round" strokeDasharray="270" initial={{strokeDashoffset:270}} animate={{strokeDashoffset:34}} transition={{delay:4,duration:.8}}/></svg><div className="text-center"><p className="font-display text-4xl text-paper">1400</p><p className="font-mono text-[7px] uppercase text-fog">Predicted SAT</p></div></div></motion.div></div> }
  if (id === 'routine') { const plans=[['12','Linear lesson'],['13','Transitions'],['14','Rapid Fire'],['15','SAT module'],['16','Mistake review'],['17','Geometry'],['18','Rest + review']]; const colors=['#ffe4e6','#fef3c7','#dcfce7','#e0f2fe','#ede9fe','#fce7f3','#f1f5f9']; return <div key={cycle} className="relative flex h-full items-center justify-center overflow-hidden [perspective:900px]"><motion.div className="w-[94%] rounded-2xl border border-black/10 bg-white p-3 shadow-[0_20px_45px_rgba(20,30,50,.18)]" initial={{rotateX:12,y:12}} animate={{rotateX:0,y:0}}><div className="mb-2 flex items-center justify-between"><p className="font-display text-sm text-paper">October study plan</p><span className="font-mono text-[6px] uppercase text-signal">Nova is planning live</span></div><div className="grid grid-cols-7 gap-1">{plans.map(([day,plan],index)=><motion.div key={day} className="relative h-24 overflow-hidden rounded-lg border border-black/10 bg-white p-1" animate={{backgroundColor:['#ffffff','#ffffff',colors[index],colors[index]]}} transition={{delay:index*.55,duration:.55,times:[0,.2,.5,1]}}><p className="font-mono text-[6px] text-paper/45">{day}</p><motion.span className="absolute inset-0 rounded-lg border-2 border-signal" initial={{opacity:0,scale:.82}} animate={{opacity:[0,1,1,0],scale:[.82,1,1,1.04]}} transition={{delay:index*.55,duration:.55,times:[0,.16,.72,1]}}/><motion.p className="mt-6 overflow-hidden text-[6px] font-bold leading-2.5 text-paper" initial={{width:0,opacity:0}} animate={{width:'100%',opacity:1}} transition={{delay:index*.55+.18,duration:.28}}>{plan}</motion.p><motion.i className="absolute bottom-1 left-1 right-1 h-1 origin-left rounded bg-signal" initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:index*.55+.34,duration:.18}}/></motion.div>)}</div></motion.div><motion.div className="absolute bottom-0 left-1/2" initial={{x:-210,opacity:0}} animate={{x:[-210,-150,-92,-34,24,82,140,220],y:[0,-8,0,-8,0,-8,0,-18],opacity:[0,1,1,1,1,1,1,0]}} transition={{duration:4.7,times:[0,.08,.2,.33,.46,.59,.72,1],ease:'easeInOut'}}><NovaCharacter mood="point" size="sm" /></motion.div></div> }
  return <div key={cycle} className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(28,176,246,.14),transparent_60%)] p-2">
    <div className="h-full rounded-2xl border border-black/10 bg-white/90 p-3 shadow-lg">
      <div className="flex items-center justify-between"><div><p className="font-mono text-[6px] uppercase tracking-[.18em] text-signal">Live copilot math</p><p className="mt-1 font-display text-base text-paper">f(x) = 2x + 5. Find f(6).</p></div><motion.span className="h-2 w-2 rounded-full bg-emerald-500" animate={{scale:[1,1.8,1]}} transition={{duration:.8,repeat:Infinity}}/></div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[8px] text-paper">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-lg bg-amber-100 p-2"><span className="font-bold">1.</span> Circle <span className="rounded-full border border-signal px-1">6</span><p className="mt-1 font-sans text-[6px] text-fog">Replace x with 6.</p></motion.div>
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.8}} className="rounded-lg bg-sky-100 p-2"><span className="font-bold">2.</span> <span className="border-b-2 border-sky-500">2 × 6</span> = 12<p className="mt-1 font-sans text-[6px] text-fog">Multiply first.</p></motion.div>
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:1.6}} className="rounded-lg bg-emerald-100 p-2"><span className="font-bold">3.</span> 12 + 5<p className="mt-1 font-sans text-[6px] text-fog">Now add.</p></motion.div>
      </div>
      <motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{delay:2.1}} className="mt-2 rounded-xl border border-black/10 bg-[#fffdf8] p-2"><div className="flex items-center justify-between"><p className="text-[7px] font-bold uppercase text-signal">Your turn</p><p className="text-[7px] font-bold text-paper">What is 12 + 5?</p></div><div className="mt-1.5 grid grid-cols-4 gap-1">{['15','16','17','18'].map((choice,index)=><motion.span key={choice} initial={{opacity:0}} animate={{opacity:1,backgroundColor:choice==='17'?['#fff','#dcfce7']:'#fff'}} transition={{delay:2.35+index*.1}} className={`rounded-md border p-1.5 text-center text-[7px] font-bold ${choice==='17'?'border-emerald-400 text-emerald-700':'border-line text-paper'}`}>{String.fromCharCode(65+index)}. {choice}</motion.span>)}</div></motion.div>
      <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:3.15}} className="mt-2 flex items-center justify-between rounded-xl bg-emerald-600 px-3 py-2 text-[7px] font-bold text-white"><span>You selected C</span><span>Correct — f(6) = 17 ✓</span></motion.div>
    </div>
  </div>

}

export function UniquePillars() {
  return <div className="py-6">
    <div className="mx-auto max-w-3xl text-center">
      <p className="font-mono text-[10px] uppercase tracking-[.2em] text-signal">Nine connected systems</p>
      <h2 className="mt-2 font-display text-4xl tracking-tight text-paper sm:text-6xl">What makes us different</h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-fog">See every part of Prep SAT/ACT working instead of waiting for a slideshow to change.</p>
    </div>

    <div className="mt-8 grid border-l border-t border-black/10 sm:grid-cols-2 lg:grid-cols-3">
      {PILLARS.map((pillar, index) => {
        const Icon = pillar.icon
        return <section key={pillar.id} className="overflow-hidden border-b border-r border-black/10 p-3">
          <div className="flex items-start gap-2.5 px-1 pb-2">
            <span className="pt-1 font-mono text-[11px] font-semibold text-signal">{String(index + 1).padStart(2, '0')}</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal"><Icon className="h-3.5 w-3.5" /></span>
            <div>
              <h3 className="font-display text-base leading-tight text-paper sm:text-lg">{pillar.title}</h3>
              <p className="mt-1 text-[7px] font-semibold uppercase tracking-[.16em] text-fog">Live preview</p>
            </div>
          </div>
          <div className="relative h-56 overflow-hidden sm:h-60">
            <PillarPreview id={pillar.id} />
          </div>
        </section>
      })}
    </div>
    <p className="mt-6 text-center text-[10px] leading-4 text-fog">Question counts change during review. Rewards remain planned until eligibility and payout terms launch.</p>
  </div>
}
