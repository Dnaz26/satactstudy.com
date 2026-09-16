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
  'music',
  'movies',
  'science',
  'nature',
  'art',
  'travel',
  'fashion',
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
  'teach_back',
  'practice_first',
  'mistake_focus',
  'compare_contrast',
  'story',
] as const

export type TeachingMethod = (typeof TEACHING_METHODS)[number]

export const AGENT_TONES = ['warm', 'coach', 'chill', 'strict', 'funny'] as const
export type AgentTone = (typeof AGENT_TONES)[number]

export const ENCOURAGEMENT_LEVELS = ['high', 'normal', 'minimal'] as const
export type EncouragementLevel = (typeof ENCOURAGEMENT_LEVELS)[number]

export const STUCK_STYLES = ['hint_first', 'show_example', 'ask_question'] as const
export type StuckStyle = (typeof STUCK_STYLES)[number]

export const CHECK_IN_FREQS = ['often', 'sometimes', 'rare'] as const
export type CheckInFreq = (typeof CHECK_IN_FREQS)[number]

export const RESPONSE_SHAPES = ['numbered', 'bullets', 'short_paragraphs'] as const
export type ResponseShape = (typeof RESPONSE_SHAPES)[number]

export const FOCUS_AREAS = ['math', 'reading', 'writing', 'science', 'mixed'] as const
export type FocusArea = (typeof FOCUS_AREAS)[number]

export const AGENT_PROFILE_KEY = '__agent'

export type AgentProfile = {
  name: string
  tone: AgentTone
  encouragement: EncouragementLevel
  stuck_style: StuckStyle
  check_ins: CheckInFreq
  humor: boolean
  response_shape: ResponseShape
  focus_areas: FocusArea[]
}

export const DEFAULT_AGENT_PROFILE: AgentProfile = {
  name: 'Nova',
  tone: 'warm',
  encouragement: 'normal',
  stuck_style: 'hint_first',
  check_ins: 'often',
  humor: false,
  response_shape: 'numbered',
  focus_areas: ['mixed'],
}

export interface TutorPreferences {
  user_id: string
  methods: TeachingMethod[]
  analogy_topics: AnalogyTopic[]
  custom_interest: string | null
  explanation_level: 'very_simple' | 'simple' | 'normal' | 'advanced' | 'expert'
  pacing: 'ultra_short' | 'quick' | 'balanced' | 'detailed' | 'deep_dive'
  prefers_visual: boolean
  prefers_socratic: boolean
  prefers_desmos: boolean
  prefers_manual_algebra: boolean
  graph_comfort: 'struggles' | 'ok' | 'strong'
  desmos_guidance: 'step_by_step' | 'guided' | 'independent'
  method_scores: Record<string, number>
  agent: AgentProfile
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
  agent: { ...DEFAULT_AGENT_PROFILE },
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
