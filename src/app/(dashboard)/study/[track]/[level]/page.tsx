import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLevel, isLevelOpen, type StudyTrack } from '@/lib/study/levels'
import { StudyLessonV2 } from './study-lesson-v2'

export default async function StudyLessonPage({
  params,
}: {
  params: Promise<{ track: string; level: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { track, level } = await params
  const parsedTrack = track === 'english' ? 'english' : track === 'math' ? 'math' : null
  const index = Number(level)
  if (!parsedTrack || !Number.isInteger(index)) redirect('/study')

  const catalog = getLevel(parsedTrack as StudyTrack, index)
  if (!catalog) redirect('/study')

  const { data: rows } = await supabase
    .from('study_level_progress')
    .select('level_index, status, lesson_step, lesson_beat')
    .eq('user_id', user.id)
    .eq('track', parsedTrack)

  const statuses = new Map((rows ?? []).map((row) => [row.level_index as number, row.status as string]))
  if (!isLevelOpen(parsedTrack as StudyTrack, index, statuses)) redirect('/study')

  const current = (rows ?? []).find((row) => row.level_index === index)
  const savedPhase = typeof current?.lesson_step === 'string' && /^v2:(?:[0-9]|1[0-2])$/.test(current.lesson_step)
    ? Number(current.lesson_step.slice(3)) : 0
  const resumeStep = `v2:${savedPhase}`

  if (statuses.get(index) !== 'completed') {
    await supabase.from('study_level_progress').upsert({
      user_id: user.id,
      track: parsedTrack,
      level_index: index,
      status: 'available',
      extra_problems: 0,
      lesson_step: resumeStep,
      lesson_beat: 0,
      updated_at: new Date().toISOString(),
      completed_at: null,
    }, { onConflict: 'user_id,track,level_index' })
  }

  return (
    <StudyLessonV2
      track={parsedTrack as StudyTrack}
      level={catalog}
      initialPhase={savedPhase}
    />
  )
}
