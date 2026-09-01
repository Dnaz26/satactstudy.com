import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStudyPlan, type ScheduleInput } from '@/lib/schedule'
import { todayISO } from '@/lib/schema'
import { z } from 'zod'

const bodySchema = z.object({
  testDate: z.string(),
  testType: z.enum(['SAT', 'ACT', 'both', 'Both']),
  targetScore: z.number(),
  baselineScore: z.number().nullable().optional(),
  dailyMinutes: z.number().min(5).max(480),
  availableDays: z.array(z.string()),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const { testDate, testType, targetScore, baselineScore, dailyMinutes, availableDays } = parsed.data

    type MasteryWithTopics = {
      topic_id: string
      overall_mastery: number | null
      topics: { name: string; categories: { name: string } | null } | null
    }

    const { data: rawMasteryData } = await supabase
      .from('topic_mastery')
      .select('topic_id, overall_mastery, topics(name, categories(name))')
      .eq('user_id', user.id)
      .order('overall_mastery')

    const masteryData = (rawMasteryData ?? []) as unknown as MasteryWithTopics[]
    const weak: ScheduleInput['weakTopics'] = []
    const medium: ScheduleInput['mediumTopics'] = []
    const strong: ScheduleInput['strongTopics'] = []

    for (const m of masteryData) {
      const entry = {
        topicId: m.topic_id,
        topicName: m.topics?.name ?? 'Unknown',
        mastery: m.overall_mastery ?? 50,
        categoryName: m.topics?.categories?.name ?? '',
      }
      const score = m.overall_mastery ?? 50
      if (score < 40) weak.push(entry)
      else if (score < 70) medium.push(entry)
      else strong.push(entry)
    }

    const { count: mistakeCount } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('correct', false)

    const normalizedType = testType === 'Both' || testType === 'both' ? 'both' : testType

    const plans = generateStudyPlan({
      userId: user.id,
      testDate,
      testType: normalizedType,
      targetScore,
      currentScore: baselineScore ?? null,
      dailyMinutes,
      availableDays,
      weakTopics: weak,
      mediumTopics: medium,
      strongTopics: strong,
      hasMistakes: (mistakeCount ?? 0) > 0,
    })

    const today = todayISO()
    const firstDay = plans[0]
    if (!firstDay) return Response.json({ success: true, planId: null, taskCount: 0 })

    const { data: newPlan } = await supabase
      .from('study_plans')
      .upsert({
        user_id: user.id,
        plan_date: firstDay.date || today,
        total_minutes: firstDay.tasks.reduce((s, t) => s + t.durationMinutes, 0),
        completed_minutes: 0,
        status: 'pending',
      }, { onConflict: 'user_id,plan_date' })
      .select('id')
      .single()

    if (newPlan) {
      await supabase.from('study_plan_tasks').delete().eq('plan_id', newPlan.id)
      const tasks = firstDay.tasks.map((task, i) => {
        const typeMap: Record<string, string> = {
          practice: 'topic_practice',
          review: 'mistake_review',
          timed: 'timed_practice',
          vocabulary: 'vocabulary',
        }
        return {
          plan_id: newPlan.id,
          task_type: typeMap[task.taskType] ?? 'topic_practice',
          topic_id: task.topicId,
          title: task.topicName || task.taskType,
          target_minutes: task.durationMinutes,
          target_questions: task.questionCount,
          status: 'pending',
          sort_order: i,
        }
      })
      if (tasks.length > 0) await supabase.from('study_plan_tasks').insert(tasks)
    }

    return Response.json({
      success: true,
      planId: newPlan?.id,
      taskCount: firstDay.tasks.length,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
