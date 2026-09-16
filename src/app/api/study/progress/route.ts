import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { denyIfUnpaid } from '@/lib/entitlements'
import { z } from 'zod'
import { firstIndexInEachCategory, getLevel, levelsFor, nextInCategory, type StudyTrack } from '@/lib/study/levels'
import { awardCoins } from '@/lib/economy/wallet'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0).optional(),
  status: z.enum(['available', 'completed']).optional(),
})

type SB = Awaited<ReturnType<typeof createClient>>

type ProgressRow = {
  track: string
  level_index: number
  status: string
  completed_at: string | null
  extra_problems?: number
}

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
      completed_at: null,
    })),
    { onConflict: 'user_id,track,level_index' },
  )
}

async function upsertProgress(
  supabase: SB,
  input: {
    userId: string
    track: StudyTrack
    level: number
    status: 'available' | 'completed'
  },
): Promise<{ row: ProgressRow | null; error: string | null }> {
  const completedAt = input.status === 'completed' ? new Date().toISOString() : null
  const { data, error } = await supabase
    .from('study_level_progress')
    .upsert(
      {
        user_id: input.userId,
        track: input.track,
        level_index: input.level,
        status: input.status,
        completed_at: completedAt,
        extra_problems: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,track,level_index' },
    )
    .select('track, level_index, status, completed_at, extra_problems')
    .single()

  if (error) {
    return { row: null, error: error.message }
  }

  return { row: data as ProgressRow, error: null }
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

  const { data, error } = await supabase
    .from('study_level_progress')
    .select('track, level_index, status, extra_problems, completed_at')
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ error: 'Could not load progress', rows: [] }, { status: 500 })
  }

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

  await ensureStart(supabase, user.id, track)

  const { data: prior } = await supabase
    .from('study_level_progress')
    .select('status')
    .eq('user_id', user.id)
    .eq('track', track)
    .eq('level_index', level)
    .maybeSingle()

  const saved = await upsertProgress(supabase, {
    userId: user.id,
    track,
    level,
    status,
  })

  if (saved.error || !saved.row) {
    console.error('study_level_progress upsert failed', saved.error)
    return Response.json({ error: 'Could not save level', detail: saved.error }, { status: 500 })
  }

  let coinsAwarded = 0
  if (status === 'completed' && prior?.status !== 'completed') {
    try {
      const coin = await awardCoins(supabase, user.id, 'tutoring_level', { track, level })
      coinsAwarded = coin.awarded
    } catch (err) {
      console.error('tutoring coin award failed', err)
    }
  }

  if (status === 'completed') {
    const next = nextInCategory(track, level)
    if (next) {
      const unlocked = await upsertProgress(supabase, {
        userId: user.id,
        track,
        level: next.index,
        status: 'available',
      })
      if (unlocked.error) {
        console.error('could not unlock next tutoring level', unlocked.error)
      }
    }
  }

  // Re-read to confirm persistence for the client.
  const { data: confirmed } = await supabase
    .from('study_level_progress')
    .select('track, level_index, status, completed_at, extra_problems')
    .eq('user_id', user.id)
    .eq('track', track)
    .eq('level_index', level)
    .maybeSingle()

  const row = (confirmed as ProgressRow | null) ?? saved.row
  if (status === 'completed' && row.status !== 'completed') {
    return Response.json({ error: 'Progress did not persist', row }, { status: 500 })
  }

  return Response.json({ success: true, row, coinsAwarded })
}
