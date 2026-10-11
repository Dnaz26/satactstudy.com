import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAskAI, getAccessProfile, recordAIChat } from '@/lib/entitlements'
import { hasProductAccess } from '@/lib/access'
import { callAI } from '@/lib/ai'
import { getLevel, matchTopicId, tagDifficulties, type StudyProblem } from '@/lib/study/levels'
import { isChallengeQuestion } from '@/lib/practice/complexity'
import { buildGuidedLesson, LESSON_STAGE_LEVELS, type LessonStage } from '@/lib/study/lesson-flow'
import type { LessonExampleSet } from '@/lib/study/examples'
import { z } from 'zod'

const bodySchema = z.object({
  track: z.enum(['math', 'english']),
  level: z.number().int().min(0),
  extra: z.boolean().optional(),
})

type AiLessonPayload = Partial<{
  whatItIs: string
  irlExample: string
  breakdown: string
  translateExample: string
  examples: Partial<LessonExampleSet>
  connections: { yes: Array<{ label: string; why: string }>; no: Array<{ label: string; why: string }> }
  problems: StudyProblem[]
  stages: LessonStage[]
}>

function sanitizeStages(raw: unknown): LessonStage[] | undefined {
  if (!Array.isArray(raw) || raw.length !== LESSON_STAGE_LEVELS.length) return undefined
  const stages = raw.map((value, index) => {
    if (!value || typeof value !== 'object') return null
    const row = value as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const explanation = typeof row.explanation === 'string' ? row.explanation.trim() : ''
    const newSkills = Array.isArray(row.newSkills) ? row.newSkills.filter((item): item is string => typeof item === 'string' && item.trim().length > 2).map((item) => item.trim()) : []
    const workedExamples = Array.isArray(row.workedExamples) ? row.workedExamples.filter((item): item is string => typeof item === 'string' && item.trim().length > 15).map((item) => item.trim()) : []
    if (!title || explanation.length < 45 || !newSkills.length || workedExamples.length < 2) return null
    return { level: LESSON_STAGE_LEVELS[index], title, explanation, newSkills, workedExamples }
  })
  return stages.every(Boolean) ? stages as LessonStage[] : undefined
}

function sanitizeExamples(raw: unknown): Partial<LessonExampleSet> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const data = raw as Record<string, unknown>
  const mapList = (value: unknown) => {
    if (!Array.isArray(value)) return []
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const label = typeof row.label === 'string' ? row.label.trim() : ''
        const why = typeof row.why === 'string' ? row.why.trim() : ''
        if (!label || !why || /\?$/.test(label)) return null
        return { label, why }
      })
      .filter((item): item is { label: string; why: string } => Boolean(item))
  }
  const yes = mapList(data.yes)
  const no = mapList(data.no)
  if (yes.length < 2 && no.length < 2) return undefined
  return {
    yesTitle: typeof data.yesTitle === 'string' ? data.yesTitle : undefined,
    noTitle: typeof data.noTitle === 'string' ? data.noTitle : undefined,
    yes,
    no,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const level = getLevel(parsed.data.track, parsed.data.level)
  if (!level) return Response.json({ error: 'Unknown level' }, { status: 404 })

  const fallback = buildGuidedLesson(level)
  const access = await getAccessProfile(user.id)
  if (!hasProductAccess({ plan: access.plan, role: access.role, trialEndsAt: access.trialEndsAt })) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from('study_level_progress')
      .select('track, level_index')
      .eq('user_id', user.id)
      .gte('updated_at', weekAgo)
    if (recentError) return Response.json(fallback)
    const rows = recent ?? []
    const sameLesson = rows.some((row) => row.track === parsed.data.track && row.level_index === parsed.data.level)
    if (rows.length > 0 && !sameLesson) {
      return Response.json({ error: 'The free plan includes 1 lesson a week.' }, { status: 403 })
    }
    return Response.json(fallback)
  }
  const entitlement = await canAskAI(user.id)
  if (!entitlement.allowed) return Response.json(fallback)
  const { data: topicRows } = await supabase.from('topics').select('id, name, category_id').limit(500)
  const matchedTopic = matchTopicId(level, topicRows ?? [])
  let exemplars: Array<{ question_text: string; difficulty_score: number | null }> = []
  if (matchedTopic) {
    const { data } = await supabase.from('questions').select('question_text, difficulty_score, difficulty, section_name, test_type, exam_name, correct_answer, official_explanation, ai_explanation, question_type, choice_a, choice_b, choice_c, choice_d')
      .eq('topic_id', matchedTopic).eq('approved', true).eq('active', true)
      .eq('difficulty', 'Hard')
      .order('difficulty_score', { ascending: false, nullsFirst: false }).limit(60)
    exemplars = (data ?? []).filter((item) => isChallengeQuestion(item)).slice(0, 6)
  }
  const exemplarHint = exemplars.length
    ? `Upper-tail database examples for complexity calibration ONLY (never copy wording, numbers, stories, or answers): ${exemplars.map((q) => `${q.question_text} [score ${q.difficulty_score ?? 'unknown'}]`).join(' || ')}`
    : 'No reviewed upper-tail database exemplars were available; create original upper-range items from the objectives.'
  const topicHints = [
    `Title: ${level.title}`,
    `Category: ${level.category}`,
    `Teach: ${level.teach.join(' | ')}`,
    `Tricks: ${level.tricks.join(' | ')}`,
    exemplarHint,
    `Seed problems: ${level.problems.map((p) => {
      const correct = p.choices.find((c) => c.key === p.answer)?.text ?? p.answer
      return `${p.prompt} → correct: ${correct}`
    }).join(' || ')}`,
  ].join('\n')

  try {
    const raw = await callAI({
      model: 'flash',
      userId: user.id,
      requestType: 'study_lesson',
      speed: 'interactive',
      maxTokens: 4000,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'You teach SAT/ACT topics to a student who starts knowing only 3rd-grade math: adding, subtracting, multiplying, and dividing whole numbers, plus halves and quarters. Use a 6th-grade reading level. Reply JSON only with this shape: '
            + '{"whatItIs":"ONE idea in 1-2 super-simple sentences defining the topic for a kid, then one separate example sentence starting with \'For example,\' using real numbers (the example is shown on the whiteboard, so keep it as its own sentence)",'
            + '"irlExample":"ONE short real-world sentence (like: Counting numbers can be used to count how many people are in the room.)",'
            + '"breakdown":"ONE idea per sentence about THIS topic only, each followed by its own For example sentence with real numbers — never mention another topic",'
            + '"translateExample":"one short live correct example of the topic for the student to translate (NOT a question)",'
            + '"examples":{"yesTitle":"short","noTitle":"short",'
            + '"yes":[{"label":"short concrete correct example","why":"one sentence why correct"}],'
            + '"no":[{"label":"short concrete incorrect example","why":"one sentence why incorrect"}]},'
            + '"connections":{"yes":[{"label":"worked example combining the original idea with the new layer","why":"one sentence explaining the connection"}],"no":[{"label":"plausible but wrong combined example","why":"one sentence explaining the precise mistake"}]},'
            + '"stages":[{"title":"...","newSkills":["..."],"explanation":"...","workedExamples":["fully worked example 1","fully worked example 2"]}],'
            + '"problems":[{"difficulty":"easy"|"medium"|"hard","prompt":"...","choices":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"answer":"A","explain":"complete solution steps"}]}'
            + ' Rules: Use words a 6th grader knows. Database examples calibrate complexity only: never copy or closely paraphrase them. No jargon. Create examples from the topic itself. Do NOT pull from a database. '
            + 'Stay inside the lesson topic. Introduce every supporting operation or rule before using it in a harder question. Never assume the student already knows a new layer. Never name, define, or explain a math type, grammar topic, or vocabulary word that a later lesson teaches. Use only this lesson and ideas from earlier lessons in the same track. '
            + 'whatItIs example style: "Whole numbers are numbers you count whole objects with. Whole numbers begin at 0 and are not negative numbers, decimals, or fractions." '
            + 'irlExample must be ONE short real-life sentence and must NOT repeat the definition. '
            + 'examples.yes must have EXACTLY 3 correct portrayals of THIS topic only. examples.no must have EXACTLY 3 traps on THIS topic only. Each "why" is one sentence. The three incorrect examples must all be explained, not only the first. '
            + 'connections.yes and connections.no must each have EXACTLY 3 distinct concrete examples using the new second layer with the original idea. The incorrect examples must each show a real, different mistake and explain it in one sentence. '
            + 'labels must be the example itself — never a quiz prompt like "Which is…?". '
            + 'Exactly 5 problems on THIS topic only in a real progression: question 1 is a genuinely easy one-step check of the skill just taught; questions 2 and 3 add interpretation and a second step; question 4 is hard; question 5 is the hardest multi-concept challenge. For extra=true, make all five questions use the newly added second layer and be meaningfully different from the first quiz. Difficulty must come from setup, inference, combining concepts, parameters, or close distractors—not ugly arithmetic. Explain each solution in short, complete steps so difficult work feels learnable. Use four plausible choices based on specific student errors; no throwaway distractors. Easy words. No LaTeX.'
            + ' stages must have exactly five entries in order: easy, medium, hard, very hard, upper range. Stage one starts from 3rd-grade arithmetic or a one-sentence grammar fact and teaches the first new move with numbers a beginner can follow. For EACH stage, name and plainly define the new subskills, show TWO distinct fully worked examples with all steps, explain how they extend prior stages, and end the explanation with a one-sentence check the student can answer before the next layer. Never use an operation, theorem, or grammar rule in a problem unless an earlier stage or the same stage already taught it with a worked example. The lesson screen shows each stage before its question. The five problems must use only skills already taught by that stage. Order the problems easy, medium, hard, very hard, then a final challenge that mixes ideas from this lesson and is harder than a typical SAT item, with every step explained. A student who does every stage should be able to finish that final challenge. When the topic allows it, the final challenge should use an advanced pattern from practice: a hidden condition, a parameter, an extraneous solution, a conditional probability, a model comparison, or two answer choices that both sound plausible. '
            + ' Each harder problem may use only THIS topic plus a clearly teachable next layer still explained inside this lesson. Never jump to an operation or rule from a different lesson. For linear functions, build through signed arithmetic, addition, multiplication, distribution, division/fractions, expression inputs, parameters, multiple conditions, and the difference between a linear term and a variable raised to a power.',
        },
        {
          role: 'user',
          content: parsed.data.extra
            ? `Five more practice questions for ${level.title}.\n${topicHints}`
            : `Create a full copilot lesson for this topic. Invent fresh correct and incorrect board examples from the topic itself.\n${topicHints}`,
        },
      ],
    })
    const parsedAi = JSON.parse(raw) as AiLessonPayload
    const problems = (parsedAi.problems ?? []).filter(
      (item) => item?.prompt && item?.answer && item?.choices?.length >= 2,
    )
    const examples = sanitizeExamples(parsedAi.examples)
    const guided = buildGuidedLesson(level, {
      whatItIs: parsedAi.whatItIs,
      irlExample: parsedAi.irlExample,
      breakdown: parsedAi.breakdown,
      translateExample: parsedAi.translateExample,
      examples,
      connections: parsedAi.connections &&
        Array.isArray(parsedAi.connections.yes) && parsedAi.connections.yes.length >= 3 &&
        Array.isArray(parsedAi.connections.no) && parsedAi.connections.no.length >= 3
        ? { yes: parsedAi.connections.yes.slice(0, 3), no: parsedAi.connections.no.slice(0, 3) }
        : undefined,
      stages: sanitizeStages(parsedAi.stages),
      problems: problems.length >= 3 ? tagDifficulties(problems, 5) : fallback.problems,
    })
    await recordAIChat(user.id)
    return Response.json(guided)
  } catch {
    return Response.json(fallback)
  }
}
