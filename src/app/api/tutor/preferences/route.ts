import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ANALOGY_TOPICS, TEACHING_METHODS } from '@/lib/tutor/types'
import { getTutorPreferences, saveTutorPreferences } from '@/lib/tutor/memory'

const bodySchema = z.object({
  methods: z.array(z.enum(TEACHING_METHODS)).optional(),
  analogy_topics: z.array(z.enum(ANALOGY_TOPICS)).optional(),
  custom_interest: z.string().max(80).nullable().optional(),
  explanation_level: z.enum(['very_simple', 'simple', 'normal', 'advanced']).optional(),
  pacing: z.enum(['quick', 'balanced', 'detailed']).optional(),
  prefers_visual: z.boolean().optional(),
  prefers_socratic: z.boolean().optional(),
  prefers_desmos: z.boolean().optional(),
  prefers_manual_algebra: z.boolean().optional(),
  graph_comfort: z.enum(['struggles', 'ok', 'strong']).optional(),
  desmos_guidance: z.enum(['step_by_step', 'guided', 'independent']).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const preferences = await getTutorPreferences(user.id)
  return Response.json({ preferences })
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid preferences' }, { status: 400 })
    }

    const preferences = await saveTutorPreferences(user.id, parsed.data)
    return Response.json({ preferences })
  } catch {
    return Response.json({ error: 'Could not save preferences' }, { status: 500 })
  }
}
