import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLevel, isLevelOpen, type StudyTrack } from '@/lib/study/levels'
import { LESSON_STEPS, type LessonStepId } from '@/lib/study/lesson-flow'
import { StudyLesson } from './study-lesson'

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
  const validSteps = new Set(LESSON_STEPS.map((step) => step.id))
  const resumeStep = (
    current?.status !== 'completed'
    && typeof current?.lesson_step === 'string'
    && validSteps.has(current.lesson_step as LessonStepId)
  )
    ? (current.lesson_step as LessonStepId)
    : 'definition'
  const resumeBeat = Math.max(0, Number(current?.lesson_beat ?? 0) || 0)

  if (statuses.get(index) !== 'completed') {
    await supabase.from('study_level_progress').upsert({
      user_id: user.id,
      track: parsedTrack,
      level_index: index,
      status: 'available',
      extra_problems: 0,
      lesson_step: resumeStep,
      lesson_beat: resumeBeat,
      updated_at: new Date().toISOString(),
      completed_at: null,
    }, { onConflict: 'user_id,track,level_index' })
  }

  return (
    <StudyLesson
      track={parsedTrack as StudyTrack}
      level={catalog}
      initialStep={resumeStep}
      initialBeat={resumeBeat}
    />
  )
}
