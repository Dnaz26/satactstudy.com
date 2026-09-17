import { asDifficulty, questionChoices } from '@/lib/schema'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import type { BookletQuestion } from '@/components/practice/test-booklet'
export const QUESTION_FIELDS = 'id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, difficulty_score, topic_id, topic_name, section_name, category_name, test_type, official_explanation, ai_explanation, calculator_config, calculator_allowed, desmos_useful, desmos_mode, question_type, reasoning_type, image_url, passage_id, source_rights_status, source_type, passages(title, content)'
export function examQuestion(row: Record<string, unknown>): BookletQuestion {
  const rel = row.passages as { title?: string; content?: string } | { title?: string; content?: string }[] | null
  const passage = Array.isArray(rel) ? rel[0] : rel
  return {
    ...row,
    // Full-test keys and worked solutions stay server-side until completion.
    correct_answer: '',
    official_explanation: null,
    ai_explanation: null,
    calculator_config: null,
    question_text: cleanQuestionText(String(row.question_text)),
    passage_title: passage?.title ?? null,
    passage_content: passage?.content ?? null,
    difficulty: asDifficulty(row.difficulty as string),
    choices: questionChoices(row as Parameters<typeof questionChoices>[0]),
  } as BookletQuestion
}
