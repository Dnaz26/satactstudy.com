'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ANALOGY_TOPICS, TEACHING_METHODS, type AnalogyTopic, type TeachingMethod, type TutorPreferences } from '@/lib/tutor/types'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const METHOD_LABELS: Record<TeachingMethod, string> = {
  analogy: 'Real-life analogies',
  visual: 'Visuals',
  simplified_example: 'Simple examples',
  step_by_step: 'Step-by-step',
  direct: 'Direct explanations',
  socratic: 'Questions / hints',
}

const ANALOGY_LABELS: Record<AnalogyTopic, string> = {
  business: 'Business',
  sports: 'Sports',
  gaming: 'Gaming',
  cars: 'Cars',
  money: 'Money',
  technology: 'Technology',
  everyday: 'Everyday life',
  food: 'Food',
  school: 'School',
  custom: 'Custom',
}

export function TutorPreferencesCard({ initial, openAll = false }: { initial: TutorPreferences; openAll?: boolean }) {
  const [prefs, setPrefs] = React.useState(initial)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const [more, setMore] = React.useState(openAll)
  const first = React.useRef(true)

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = window.setTimeout(() => {
      void save()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [prefs])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/tutor/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methods: prefs.methods,
          analogy_topics: prefs.analogy_topics,
          custom_interest: prefs.custom_interest,
          explanation_level: prefs.explanation_level,
          pacing: prefs.pacing,
          prefers_visual: prefs.methods.includes('visual'),
          prefers_socratic: prefs.methods.includes('socratic'),
          prefers_desmos: prefs.prefers_desmos,
          prefers_manual_algebra: prefs.prefers_manual_algebra,
          graph_comfort: prefs.graph_comfort,
          desmos_guidance: prefs.desmos_guidance,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm text-fog">Teach with</p>
        <div className="flex flex-wrap gap-2">
          {TEACHING_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, methods: toggle(p.methods, method) }))}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs',
                prefs.methods.includes(method) ? 'neu-raised text-white' : 'neu-sm text-fog'
              )}
            >
              {METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-fog">Level</p>
        <div className="flex flex-wrap gap-2">
          {(['very_simple', 'simple', 'normal', 'advanced'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, explanation_level: level }))}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs capitalize',
                prefs.explanation_level === level ? 'neu-raised text-white' : 'neu-sm text-fog'
              )}
            >
              {level.replaceAll('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setMore((v) => !v)} className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
        {more ? 'Less' : 'More'}
      </button>

      {more && (
        <>
          <div>
            <p className="mb-2 text-sm text-fog">Analogies</p>
            <div className="flex flex-wrap gap-2">
              {ANALOGY_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, analogy_topics: toggle(p.analogy_topics, topic) }))}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs',
                    prefs.analogy_topics.includes(topic) ? 'neu-raised text-white' : 'neu-sm text-fog'
                  )}
                >
                  {ANALOGY_LABELS[topic]}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Custom interest"
            value={prefs.custom_interest ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, custom_interest: e.target.value || null }))}
          />

          <div>
            <p className="mb-2 text-sm text-fog">Pace</p>
            <div className="flex flex-wrap gap-2">
              {(['quick', 'balanced', 'detailed'] as const).map((pace) => (
                <button
                  key={pace}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, pacing: pace }))}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs capitalize',
                    prefs.pacing === pace ? 'neu-raised text-white' : 'neu-sm text-fog'
                  )}
                >
                  {pace}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, prefers_desmos: !p.prefers_desmos }))}
              className={cn('rounded-xl px-3 py-1.5 text-xs', prefs.prefers_desmos ? 'neu-raised text-white' : 'neu-sm text-fog')}
            >
              Desmos
            </button>
            <button
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, prefers_manual_algebra: !p.prefers_manual_algebra }))}
              className={cn('rounded-xl px-3 py-1.5 text-xs', prefs.prefers_manual_algebra ? 'neu-raised text-white' : 'neu-sm text-fog')}
            >
              By hand
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['struggles', 'ok', 'strong'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, graph_comfort: level }))}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs capitalize',
                  prefs.graph_comfort === level ? 'neu-raised text-white' : 'neu-sm text-fog'
                )}
              >
                Graphs {level}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['step_by_step', 'guided', 'independent'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, desmos_guidance: level }))}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs',
                  prefs.desmos_guidance === level ? 'neu-raised text-white' : 'neu-sm text-fog'
                )}
              >
                {level.replaceAll('_', ' ')}
              </button>
            ))}
          </div>
        </>
      )}

      <Button onClick={() => void save()} loading={saving} className="w-full">
        {saved ? <><CheckCircle className="mr-2 h-4 w-4" />Saved</> : 'Save Nova style'}
      </Button>
    </div>
  )
}
