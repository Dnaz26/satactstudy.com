import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLevel, isLevelOpen, type StudyTrack } from '@/lib/study/levels'
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
    .select('level_index, status')
    .eq('user_id', user.id)
    .eq('track', parsedTrack)

  const statuses = new Map((rows ?? []).map((row) => [row.level_index as number, row.status as string]))
  if (!isLevelOpen(parsedTrack as StudyTrack, index, statuses)) redirect('/study')

  return <StudyLesson track={parsedTrack as StudyTrack} level={catalog} />
}
