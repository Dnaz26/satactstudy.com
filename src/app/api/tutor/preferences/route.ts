import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  AGENT_TONES,
  ANALOGY_TOPICS,
  CHECK_IN_FREQS,
  ENCOURAGEMENT_LEVELS,
  FOCUS_AREAS,
  RESPONSE_SHAPES,
  STUCK_STYLES,
  TEACHING_METHODS,
} from '@/lib/tutor/types'
import { getTutorPreferences, saveTutorPreferences } from '@/lib/tutor/memory'

const agentSchema = z.object({
  name: z.string().max(32).optional(),
  tone: z.enum(AGENT_TONES).optional(),
  encouragement: z.enum(ENCOURAGEMENT_LEVELS).optional(),
  stuck_style: z.enum(STUCK_STYLES).optional(),
  check_ins: z.enum(CHECK_IN_FREQS).optional(),
  humor: z.boolean().optional(),
  response_shape: z.enum(RESPONSE_SHAPES).optional(),
  focus_areas: z.array(z.enum(FOCUS_AREAS)).optional(),
}).optional()

const bodySchema = z.object({
  methods: z.array(z.enum(TEACHING_METHODS)).optional(),
  analogy_topics: z.array(z.enum(ANALOGY_TOPICS)).optional(),
  custom_interest: z.string().max(120).nullable().optional(),
  explanation_level: z.enum(['very_simple', 'simple', 'normal', 'advanced', 'expert']).optional(),
  pacing: z.enum(['ultra_short', 'quick', 'balanced', 'detailed', 'deep_dive']).optional(),
  prefers_visual: z.boolean().optional(),
  prefers_socratic: z.boolean().optional(),
  prefers_desmos: z.boolean().optional(),
  prefers_manual_algebra: z.boolean().optional(),
  graph_comfort: z.enum(['struggles', 'ok', 'strong']).optional(),
  desmos_guidance: z.enum(['step_by_step', 'guided', 'independent']).optional(),
  agent: agentSchema,
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

    const existing = await getTutorPreferences(user.id)
    const preferences = await saveTutorPreferences(user.id, {
      ...parsed.data,
      agent: parsed.data.agent
        ? { ...existing.agent, ...parsed.data.agent }
        : existing.agent,
    })
    return Response.json({ preferences })
  } catch {
    return Response.json({ error: 'Could not save preferences' }, { status: 500 })
  }
}
