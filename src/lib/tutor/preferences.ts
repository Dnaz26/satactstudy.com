import {
  AGENT_PROFILE_KEY,
  AGENT_TONES,
  ANALOGY_TOPICS,
  CHECK_IN_FREQS,
  DEFAULT_AGENT_PROFILE,
  DEFAULT_TUTOR_PREFERENCES,
  ENCOURAGEMENT_LEVELS,
  FOCUS_AREAS,
  RESPONSE_SHAPES,
  STUCK_STYLES,
  TEACHING_METHODS,
  type AgentProfile,
  type AnalogyTopic,
  type FocusArea,
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

function asFocusAreas(value: unknown): FocusArea[] {
  if (!Array.isArray(value)) return DEFAULT_AGENT_PROFILE.focus_areas
  const next = value.filter((item): item is FocusArea => FOCUS_AREAS.includes(item as FocusArea))
  return next.length ? next : DEFAULT_AGENT_PROFILE.focus_areas
}

export function normalizeAgentProfile(raw: unknown): AgentProfile {
  const base = raw && typeof raw === 'object' ? (raw as Partial<AgentProfile>) : {}
  const name = typeof base.name === 'string' && base.name.trim() ? base.name.trim().slice(0, 32) : DEFAULT_AGENT_PROFILE.name
  return {
    name,
    tone: AGENT_TONES.includes(base.tone as AgentProfile['tone']) ? (base.tone as AgentProfile['tone']) : DEFAULT_AGENT_PROFILE.tone,
    encouragement: ENCOURAGEMENT_LEVELS.includes(base.encouragement as AgentProfile['encouragement'])
      ? (base.encouragement as AgentProfile['encouragement'])
      : DEFAULT_AGENT_PROFILE.encouragement,
    stuck_style: STUCK_STYLES.includes(base.stuck_style as AgentProfile['stuck_style'])
      ? (base.stuck_style as AgentProfile['stuck_style'])
      : DEFAULT_AGENT_PROFILE.stuck_style,
    check_ins: CHECK_IN_FREQS.includes(base.check_ins as AgentProfile['check_ins'])
      ? (base.check_ins as AgentProfile['check_ins'])
      : DEFAULT_AGENT_PROFILE.check_ins,
    humor: Boolean(base.humor),
    response_shape: RESPONSE_SHAPES.includes(base.response_shape as AgentProfile['response_shape'])
      ? (base.response_shape as AgentProfile['response_shape'])
      : DEFAULT_AGENT_PROFILE.response_shape,
    focus_areas: asFocusAreas(base.focus_areas),
  }
}

function splitMethodScores(raw: unknown): { scores: Record<string, number>; agent: AgentProfile } {
  if (!raw || typeof raw !== 'object') {
    return { scores: {}, agent: { ...DEFAULT_AGENT_PROFILE } }
  }
  const obj = raw as Record<string, unknown>
  const agent = normalizeAgentProfile(obj[AGENT_PROFILE_KEY])
  const scores: Record<string, number> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === AGENT_PROFILE_KEY) continue
    if (typeof value === 'number' && Number.isFinite(value)) scores[key] = value
  }
  return { scores, agent }
}

export function packMethodScores(scores: Record<string, number>, agent: AgentProfile): Record<string, unknown> {
  return {
    ...scores,
    [AGENT_PROFILE_KEY]: agent,
  }
}

export function normalizePreferences(userId: string, raw: Partial<TutorPreferences> | null | undefined): TutorPreferences {
  const fromScores = splitMethodScores(raw?.method_scores)
  const agent = raw?.agent ? normalizeAgentProfile(raw.agent) : fromScores.agent

  const level = raw?.explanation_level
  const pacing = raw?.pacing

  return {
    user_id: userId,
    methods: asMethods(raw?.methods),
    analogy_topics: asTopics(raw?.analogy_topics),
    custom_interest: raw?.custom_interest ?? null,
    explanation_level:
      level === 'very_simple' || level === 'simple' || level === 'advanced' || level === 'expert'
        ? level
        : 'normal',
    pacing:
      pacing === 'ultra_short' || pacing === 'quick' || pacing === 'detailed' || pacing === 'deep_dive'
        ? pacing
        : 'balanced',
    prefers_visual: Boolean(raw?.prefers_visual),
    prefers_socratic: Boolean(raw?.prefers_socratic),
    prefers_desmos: Boolean(raw?.prefers_desmos),
    prefers_manual_algebra: Boolean(raw?.prefers_manual_algebra),
    graph_comfort: raw?.graph_comfort === 'struggles' || raw?.graph_comfort === 'strong' ? raw.graph_comfort : 'ok',
    desmos_guidance: raw?.desmos_guidance === 'step_by_step' || raw?.desmos_guidance === 'independent'
      ? raw.desmos_guidance
      : 'guided',
    method_scores: fromScores.scores,
    agent,
  }
}
