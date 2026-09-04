import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { z } from 'zod'
import { firstIndexInEachCategory, getLevel, levelsFor, nextInCategory, type StudyTrack } from '@/lib/study/levels'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0).optional(),
  status: z.enum(['available', 'completed']).optional(),
})

type SB = Awaited<ReturnType<typeof createClient>>

async function ensureStart(supabase: SB, userId: string, track: StudyTrack) {
  const { data } = await supabase
    .from('study_level_progress')
    .select('level_index, status')
    .eq('user_id', userId)
    .eq('track', track)

  const have = new Set((data ?? []).map((row) => row.level_index))
  const now = new Date().toISOString()
  const missing = firstIndexInEachCategory(track).filter((index) => !have.has(index))
  if (!missing.length) return

  await supabase.from('study_level_progress').upsert(
    missing.map((level_index) => ({
      user_id: userId,
      track,
      level_index,
      status: 'available',
      extra_problems: 0,
      updated_at: now,
    })),
    { onConflict: 'user_id,track,level_index' },
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  await Promise.all([
    ensureStart(supabase, user.id, 'math'),
    ensureStart(supabase, user.id, 'english'),
  ])

  const { data } = await supabase
    .from('study_level_progress')
    .select('track, level_index, status, extra_problems, completed_at')
    .eq('user_id', user.id)

  return Response.json({
    rows: data ?? [],
    mathCount: levelsFor('math').length,
    englishCount: levelsFor('english').length,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const blocked = await denyIfUnpaid(user.id)
  if (blocked) return blocked

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success || parsed.data.level == null || !parsed.data.status) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { track, level, status } = parsed.data
  if (!getLevel(track, level)) return Response.json({ error: 'Unknown level' }, { status: 400 })

  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const { error } = await supabase.from('study_level_progress').upsert({
    user_id: user.id,
    track,
    level_index: level,
    status,
    completed_at: completedAt,
    extra_problems: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,track,level_index' })

  if (error) {
    return Response.json({ error: 'Could not save level' }, { status: 500 })
  }

  const next = status === 'completed' ? nextInCategory(track, level) : null
  if (next) {
    await supabase.from('study_level_progress').upsert({
      user_id: user.id,
      track,
      level_index: next.index,
      status: 'available',
      extra_problems: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,track,level_index' })
  }

  const { data: saved } = await supabase
    .from('study_level_progress')
    .select('track, level_index, status, completed_at')
    .eq('user_id', user.id)
    .eq('track', track)
    .eq('level_index', level)
    .maybeSingle()

  return Response.json({ success: true, row: saved })
}
