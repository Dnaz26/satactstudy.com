import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateStudyPlan, type ScheduleInput } from '@/lib/schedule'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { ensureTopicQuestionCount } from '@/lib/questions/expand-topic'
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

const TYPE_MAP: Record<string, string> = {
  practice: 'topic_practice',
  review: 'mistake_review',
  timed: 'timed_practice',
  vocabulary: 'vocabulary',
    test: 'timed_practice',
}

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

    const [{ data: rawMasteryData }, { data: topicRows }] = await Promise.all([
      supabase
        .from('topic_mastery')
        .select('topic_id, overall_mastery, topics(name, categories(name))')
        .eq('user_id', user.id)
        .order('overall_mastery'),
      supabase.from('topics').select('id, name').limit(40),
    ])

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

    if (!weak.length && !medium.length && !strong.length) {
      for (const row of topicRows ?? []) {
        medium.push({ topicId: row.id, topicName: row.name, mastery: 50, categoryName: '' })
      }
    }

    const { count: mistakeCount } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('correct', false)

    const normalizedType = testType === 'Both' || testType === 'both' ? 'both' : testType

    const plans = generateStudyPlan({
      userId: user.id,
      testDate: testDate || todayISO(),
      testType: normalizedType,
      targetScore,
      currentScore: baselineScore ?? null,
      dailyMinutes,
      availableDays: availableDays.length ? availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      weakTopics: weak,
      mediumTopics: medium,
      strongTopics: strong,
      hasMistakes: (mistakeCount ?? 0) > 0,
    })

    let saved = 0
    const today = todayISO()
    const { data: existing } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', user.id)
      .gte('plan_date', today)
    const existingIds = (existing ?? []).map((row) => row.id)
    if (existingIds.length) {
      await supabase.from('study_plan_tasks').delete().in('plan_id', existingIds)
      await supabase.from('study_plans').delete().in('id', existingIds)
    }

    for (const day of plans) {
      const { data: newPlan } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          plan_date: day.date,
          total_minutes: day.totalMinutes,
          completed_minutes: 0,
          status: 'pending',
        })
        .select('id')
        .single()

      if (!newPlan) continue
      await supabase.from('study_plan_tasks').delete().eq('plan_id', newPlan.id)
      const tasks = day.tasks.map((item, i) => ({
        plan_id: newPlan.id,
        task_type: TYPE_MAP[item.taskType] ?? 'topic_practice',
        topic_id: item.topicId,
        title: item.topicName || item.taskType,
        target_minutes: item.durationMinutes,
        target_questions: item.questionCount,
        status: 'pending',
        sort_order: i,
      }))
      if (tasks.length > 0) {
        await supabase.from('study_plan_tasks').insert(tasks)
        saved += 1
      }
    }

    const topicIds = [...new Set(plans.flatMap((day) => day.tasks.map((task) => task.topicId).filter(Boolean)))] as string[]
    await Promise.all(topicIds.map((id) => ensureTopicQuestionCount(supabase, id, MIN_TOPIC_QUESTIONS)))

    return Response.json({
      success: true,
      planId: plans[0]?.date ?? null,
      taskCount: saved,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
