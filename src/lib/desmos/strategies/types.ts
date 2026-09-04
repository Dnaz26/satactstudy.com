import type { DesmosAgentAction } from '@/types/desmos'

export const DESMOS_MODES = ['desmos_first', 'hybrid', 'manual_first'] as const
export type DesmosMode = (typeof DESMOS_MODES)[number]

export const DESMOS_STRATEGY_CATEGORIES = [
  'algebra',
  'advanced_math',
  'functions',
  'data_analysis',
  'geometry',
  'statistics',
  'manual',
] as const
export type DesmosStrategyCategory = (typeof DESMOS_STRATEGY_CATEGORIES)[number]

export interface StrategyTopicKey {
  test: 'SAT' | 'ACT'
  topic: string
}

export interface DesmosStrategy {
  id: string
  slug: string
  title: string
  category: DesmosStrategyCategory
  mode: DesmosMode
  description: string
  when_to_use: string
  when_not_to_use: string
  recognition_rule: string
  desmos_capability: string
  desmos_input_template: string[]
  student_steps: string[]
  what_to_look_for: string
  why_it_works: string
  common_mistakes: string[]
  sat_applicable: boolean
  act_applicable: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  desmos_only_possible: boolean
  desmos_first_recommended: boolean
  hybrid_recommended: boolean
  estimated_time_savings: string
  example_problem: string
  example_desmos_input: string[]
  example_result: string
  explanation: string
  try_it_prompt: string
  keywords: string[]
  source_reference: string[]
  topic_keys: StrategyTopicKey[]
  agent_actions: DesmosAgentAction[]
  approved: boolean
}

export interface DesmosClassification {
  desmos_useful: boolean
  mode: DesmosMode
  strategy: string | null
  strategy_id: string | null
  confidence: number
  reason: string
  inputs: string[]
  student_should_find: string
  manual_reasoning_remaining: string
  recognition_rule: string
  alternatives: string[]
}

export interface DesmosStrategyMastery {
  strategy_id: string
  times_shown: number
  times_used: number
  successful_uses: number
  failed_uses: number
  independent_uses: number
  mastery_score: number
  last_used_at: string | null
  needs_review: boolean
}

export const EMPTY_CLASSIFICATION: DesmosClassification = {
  desmos_useful: false,
  mode: 'manual_first',
  strategy: null,
  strategy_id: null,
  confidence: 0.2,
  reason: 'No graphable structure found.',
  inputs: [],
  student_should_find: '',
  manual_reasoning_remaining: 'Solve with the fastest valid method.',
  recognition_rule: '',
  alternatives: [],
}
