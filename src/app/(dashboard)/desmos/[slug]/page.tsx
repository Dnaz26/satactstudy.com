import { StrategyDemo } from './strategy-demo'
import { Button } from '@/components/ui/button'
import { getStrategyBySlug } from '@/lib/desmos/strategies'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function DesmosStrategyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const strategy = getStrategyBySlug(slug)
  if (!strategy || !strategy.approved) notFound()

  return (
    <div className="mx-auto max-w-6xl space-y-4 pt-2 pb-10">
      <div className="neu space-y-6 p-6">
        <Link href="/study?view=desmos&section=Math" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fog hover:text-paper">
          <ArrowLeft className="h-3.5 w-3.5" />
          Study
        </Link>
        <div>
          <h1 className="font-display text-2xl">{strategy.title}</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{strategy.mode.replaceAll('_', ' ')}</p>
        </div>
        <p className="text-sm text-signal">{strategy.recognition_rule}</p>
        <p className="text-sm text-fog">{strategy.when_to_use}</p>
        <p className="text-sm text-fog">Skip: {strategy.when_not_to_use}</p>

        {strategy.desmos_input_template.length > 0 && (
          <ul className="space-y-1 font-mono text-sm">
            {strategy.desmos_input_template.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        )}

        <p className="text-sm text-fog">{strategy.what_to_look_for}</p>
        <p className="text-sm text-fog">{strategy.why_it_works}</p>
        <p className="text-sm text-paper">{strategy.example_problem}</p>
        <p className="text-sm text-ok">{strategy.example_result}</p>
        <p className="text-sm text-fog">{strategy.explanation}</p>

        <StrategyDemo strategy={strategy} />

        <p className="text-sm text-fog">{strategy.try_it_prompt}</p>
        <Link href={`/practice/session?testType=${strategy.sat_applicable ? 'SAT' : 'ACT'}&difficulty=mixed&count=5`}>
          <Button className="w-full">Practice</Button>
        </Link>
      </div>
    </div>
  )
}
