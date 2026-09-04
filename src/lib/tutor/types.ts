import type { DesmosAgentAction } from '@/types/desmos'

export const TUTOR_STRATEGIES = [
  'hint',
  'direct',
  'analogy',
  'simplified_example',
  'visualization',
  'socratic',
  'step_by_step',
  'teach_back',
  'practice',
  'full_explanation',
  'reinforcement',
] as const

export type TutorStrategy = (typeof TUTOR_STRATEGIES)[number]

export const TUTOR_TRIGGERS = [
  'chat',
  'hint',
  'help',
  'explain',
  'wrong_answer',
  'correct_answer',
] as const

export type TutorTrigger = (typeof TUTOR_TRIGGERS)[number]

export const ANALOGY_TOPICS = [
  'business',
  'sports',
  'gaming',
  'cars',
  'money',
  'technology',
  'everyday',
  'food',
  'school',
  'custom',
] as const

export type AnalogyTopic = (typeof ANALOGY_TOPICS)[number]

export const TEACHING_METHODS = [
  'analogy',
  'visual',
  'simplified_example',
  'step_by_step',
  'direct',
  'socratic',
] as const

export type TeachingMethod = (typeof TEACHING_METHODS)[number]

export interface TutorPreferences {
  user_id: string
  methods: TeachingMethod[]
  analogy_topics: AnalogyTopic[]
  custom_interest: string | null
  explanation_level: 'very_simple' | 'simple' | 'normal' | 'advanced'
  pacing: 'quick' | 'balanced' | 'detailed'
  prefers_visual: boolean
  prefers_socratic: boolean
  prefers_desmos: boolean
  prefers_manual_algebra: boolean
  graph_comfort: 'struggles' | 'ok' | 'strong'
  desmos_guidance: 'step_by_step' | 'guided' | 'independent'
  method_scores: Record<string, number>
}

export const DEFAULT_TUTOR_PREFERENCES: Omit<TutorPreferences, 'user_id'> = {
  methods: ['step_by_step', 'direct'],
  analogy_topics: ['everyday'],
  custom_interest: null,
  explanation_level: 'normal',
  pacing: 'balanced',
  prefers_visual: false,
  prefers_socratic: false,
  prefers_desmos: false,
  prefers_manual_algebra: false,
  graph_comfort: 'ok',
  desmos_guidance: 'guided',
  method_scores: {},
}

export interface TutorOutput {
  message: string
  strategy: TutorStrategy
  misconception: string | null
  confidence: number
  understanding_check: string | null
  desmosActions: DesmosAgentAction[]
  next_action: 'wait_for_student' | 'continue' | 'new_practice'
  related_question_id: string | null
}

export interface TutorRequestContext {
  questionId?: string
  questionText?: string
  topicId?: string | null
  topicName?: string
  sectionName?: string
  selectedAnswer?: string
  correctAnswer?: string
  choices?: Array<{ key: string; text: string }>
  officialExplanation?: string | null
  submitted?: boolean
  isCorrect?: boolean
  desmosAvailable?: boolean
  desmosSummary?: string
  imageDataUrl?: string
  trigger?: TutorTrigger
}
