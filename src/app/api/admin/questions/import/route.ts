import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json() as {
      questions?: Array<{
        question_text: string
        answer_choices: Record<string, string>
        correct_answer: string
        difficulty?: string
        explanation?: string
      }>
    }
    const rawQuestions = body.questions ?? []

    if (!rawQuestions.length) {
      return Response.json({ error: 'No questions provided' }, { status: 400 })
    }

    const { data: topics } = await supabase.from('topics').select('id, name')
    const topicList = topics?.map((t) => `${t.id}: ${t.name}`).join('\n') ?? ''

    const classified = []
    for (const q of rawQuestions.slice(0, 50)) {
      try {
        const response = await callAI({
          model: 'flash',
          userId: user.id,
          requestType: 'question_classify',
          json: true,
          messages: [
            {
              role: 'system',
              content: `You classify SAT/ACT questions into topics. Available topics:\n${topicList}\n\nReturn JSON: { "topic_id": "uuid", "test_type": "SAT"|"ACT", "section_name": string, "category_name": string, "topic_name": string, "difficulty": "easy"|"medium"|"hard" }`,
            },
            {
              role: 'user',
              content: `Classify this question:\n${q.question_text}`,
            },
          ],
        })

        const classification = JSON.parse(response) as {
          topic_id: string
          test_type: string
          section_name: string
          category_name: string
          topic_name: string
          difficulty: string
        }
        classified.push({ ...q, ...classification, status: 'pending' })
      } catch {
        classified.push({ ...q, topic_id: null, status: 'pending', test_type: 'SAT', section_name: 'Unknown', category_name: 'Unknown', topic_name: 'Unknown', difficulty: q.difficulty ?? 'medium' })
      }
    }

    return Response.json({ questions: classified, count: classified.length })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Import failed' }, { status: 500 })
  }
}
