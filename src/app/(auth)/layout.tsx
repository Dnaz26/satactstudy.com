import { NovaCharacter } from '@/components/study/nova-character'
import { BrainCircuit, ChartNoAxesCombined, Sparkles } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#e9ffd9_0,transparent_32%),radial-gradient(circle_at_88%_15%,#ddf5ff_0,transparent_30%),#fffdf8] px-4 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(#d8d8d8_1px,transparent_1px),linear-gradient(90deg,#d8d8d8_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden lg:block">
          <div className="flex items-end gap-5">
            <NovaCharacter mood="cheer" size="lg" />
            <div className="mb-10 rounded-[2rem] border-2 border-[#e5e5e5] bg-white p-6 shadow-[0_8px_0_#e5e5e5]">
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#58cc02]">Nova is ready</p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-[#3c3c3c]">Your study system starts here.</h1>
              <p className="mt-3 text-sm font-bold leading-6 text-[#777]">I’ll analyze your goals, build your routine, and change the practice as you improve.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">{[[BrainCircuit,'AI lessons'],[ChartNoAxesCombined,'Score tracking'],[Sparkles,'Daily plan']].map(([Icon,label])=><div key={String(label)} className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-4 text-center shadow-[0_4px_0_#e5e5e5]"><Icon className="mx-auto h-6 w-6 text-[#1cb0f6]"/><p className="mt-2 text-xs font-black text-[#3c3c3c]">{String(label)}</p></div>)}</div>
        </section>
        <section>
          <div className="mb-4 flex items-center justify-center gap-3 lg:hidden"><NovaCharacter mood="cheer" size="sm"/><p className="max-w-[220px] rounded-2xl border-2 bg-white p-3 text-sm font-black shadow-[0_4px_0_#e5e5e5]">Hi! I’ll build your study system with you.</p></div>
          <div className="relative w-full rounded-[2.25rem] border-2 border-[#e5e5e5] bg-white/95 p-6 shadow-[0_14px_0_#e5e5e5,0_30px_80px_rgba(0,0,0,.08)] sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
