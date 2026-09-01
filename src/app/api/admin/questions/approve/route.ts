import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { toDbDifficulty } from '@/lib/schema'

const bodySchema = z.object({
  questions: z.array(z.object({
    topic_id: z.string().uuid(),
    test_type: z.enum(['SAT', 'ACT']),
    section_name: z.string(),
    category_name: z.string(),
    topic_name: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard', 'Easy', 'Medium', 'Hard']),
    question_text: z.string().min(1),
    choice_a: z.string().optional(),
    choice_b: z.string().optional(),
    choice_c: z.string().optional(),
    choice_d: z.string().optional(),
    choice_e: z.string().optional(),
    answer_choices: z.record(z.string(), z.string()).optional(),
    correct_answer: z.string().min(1),
    explanation: z.string().optional(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid questions data', details: parsed.error.issues }, { status: 400 })
    }

    const rows = parsed.data.questions.map((q) => {
      const choices = q.answer_choices ?? {}
      return {
        topic_id: q.topic_id,
        test_type: q.test_type,
        section_name: q.section_name,
        category_name: q.category_name,
        topic_name: q.topic_name,
        difficulty: toDbDifficulty(q.difficulty),
        question_text: q.question_text,
        choice_a: q.choice_a ?? choices.A ?? choices.a ?? null,
        choice_b: q.choice_b ?? choices.B ?? choices.b ?? null,
        choice_c: q.choice_c ?? choices.C ?? choices.c ?? null,
        choice_d: q.choice_d ?? choices.D ?? choices.d ?? null,
        choice_e: q.choice_e ?? choices.E ?? choices.e ?? null,
        correct_answer: q.correct_answer,
        official_explanation: q.explanation ?? null,
        approved: true,
        active: true,
        source_type: 'original',
      }
    })

    const { data: inserted, error } = await supabase.from('questions').insert(rows).select('id')
    if (error) {
      return Response.json({ error: 'Failed to insert questions', details: error.message }, { status: 500 })
    }

    await supabase.from('admin_logs').insert({
      admin_id: user.id,
      action: 'approve_questions',
      target_type: 'questions',
      details: { count: rows.length },
    })

    return Response.json({ success: true, inserted: inserted?.length ?? 0 })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
