import {
  ANALOGY_TOPICS,
  DEFAULT_TUTOR_PREFERENCES,
  TEACHING_METHODS,
  type AnalogyTopic,
  type TeachingMethod,
  type TutorPreferences,
} from './types'

function asMethods(value: unknown): TeachingMethod[] {
  if (!Array.isArray(value)) return DEFAULT_TUTOR_PREFERENCES.methods
  const next = value.filter((item): item is TeachingMethod => TEACHING_METHODS.includes(item as TeachingMethod))
  return next.length ? next : DEFAULT_TUTOR_PREFERENCES.methods
}

function asTopics(value: unknown): AnalogyTopic[] {
  if (!Array.isArray(value)) return DEFAULT_TUTOR_PREFERENCES.analogy_topics
  const next = value.filter((item): item is AnalogyTopic => ANALOGY_TOPICS.includes(item as AnalogyTopic))
  return next.length ? next : DEFAULT_TUTOR_PREFERENCES.analogy_topics
}

export function normalizePreferences(userId: string, raw: Partial<TutorPreferences> | null | undefined): TutorPreferences {
  return {
    user_id: userId,
    methods: asMethods(raw?.methods),
    analogy_topics: asTopics(raw?.analogy_topics),
    custom_interest: raw?.custom_interest ?? null,
    explanation_level: raw?.explanation_level === 'very_simple' || raw?.explanation_level === 'simple' || raw?.explanation_level === 'advanced'
      ? raw.explanation_level
      : 'normal',
    pacing: raw?.pacing === 'quick' || raw?.pacing === 'detailed' ? raw.pacing : 'balanced',
    prefers_visual: Boolean(raw?.prefers_visual),
    prefers_socratic: Boolean(raw?.prefers_socratic),
    prefers_desmos: Boolean(raw?.prefers_desmos),
    prefers_manual_algebra: Boolean(raw?.prefers_manual_algebra),
    graph_comfort: raw?.graph_comfort === 'struggles' || raw?.graph_comfort === 'strong' ? raw.graph_comfort : 'ok',
    desmos_guidance: raw?.desmos_guidance === 'step_by_step' || raw?.desmos_guidance === 'independent'
      ? raw.desmos_guidance
      : 'guided',
    method_scores: raw?.method_scores && typeof raw.method_scores === 'object' ? raw.method_scores : {},
  }
}
