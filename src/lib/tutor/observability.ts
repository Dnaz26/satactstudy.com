import { NOVA_SPEC_VERSION } from './spec'
import type { NovaRouteDecision } from './router'
import type { TutorTrigger } from './types'

export interface NovaTrace {
  requestId: string
  studentId: string
  agent: 'nova'
  specVersion: string
  trigger: TutorTrigger
  model: string
  tier: string
  difficulty: number
  reason: string
  startedAt: number
  endedAt?: number
  latencyMs?: number
  outcome: 'ok' | 'error' | 'safe_fallback'
  toolsUsed: string[]
}

export function createNovaRequestId(): string {
  return `nova_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function startNovaTrace(params: {
  studentId: string
  trigger: TutorTrigger
  route: NovaRouteDecision
  toolsUsed?: string[]
}): NovaTrace {
  return {
    requestId: createNovaRequestId(),
    studentId: params.studentId,
    agent: 'nova',
    specVersion: NOVA_SPEC_VERSION,
    trigger: params.trigger,
    model: params.route.model,
    tier: params.route.tier,
    difficulty: params.route.difficulty,
    reason: params.route.reason,
    startedAt: Date.now(),
    outcome: 'ok',
    toolsUsed: params.toolsUsed ?? [],
  }
}

export function finishNovaTrace(trace: NovaTrace, outcome: NovaTrace['outcome']): NovaTrace {
  const endedAt = Date.now()
  return {
    ...trace,
    endedAt,
    latencyMs: endedAt - trace.startedAt,
    outcome,
  }
}

/** Compact tag for ai_usage.request_type — keeps observability without new tables. */
export function novaUsageRequestType(trigger: TutorTrigger, route: NovaRouteDecision): string {
  return `nova_v${NOVA_SPEC_VERSION.split('.').slice(-1)[0]}_${trigger}_${route.tier}_d${route.difficulty}`
}
