import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTutorPreferences } from '@/lib/tutor/memory'
import { CustomizeClient } from './customize-client'

export default async function CustomizePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, tutorPreferences] = await Promise.all([
    supabase
      .from('profiles')
      .select('test_preference, target_score, test_date, study_minutes_per_day, study_days, study_start_time, current_estimated_score')
      .eq('id', user.id)
      .single(),
    getTutorPreferences(user.id),
  ])

  return (
    <CustomizeClient
      profile={{
        test_preference: profile?.test_preference ?? 'SAT',
        target_score: profile?.target_score ?? null,
        test_date: profile?.test_date ?? '',
        study_minutes_per_day: profile?.study_minutes_per_day ?? 30,
        study_days: profile?.study_days ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        study_start_time: profile?.study_start_time ?? '19:00',
        current_estimated_score: profile?.current_estimated_score ?? null,
      }}
      tutorPreferences={tutorPreferences}
    />
  )
}
