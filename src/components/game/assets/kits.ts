import { GAME_MODES, type GameId } from '@/lib/game/modes'

export type TeamKit = {
  primary: string
  secondary: string
  accent: string
  skin: string
  pants: string
}

const DEFAULT_HOME: TeamKit = {
  primary: '#ff5c39',
  secondary: '#111111',
  accent: '#ffffff',
  skin: '#c68642',
  pants: '#111111',
}

const DEFAULT_AWAY: TeamKit = {
  primary: '#1e3a8a',
  secondary: '#f8fafc',
  accent: '#dc2626',
  skin: '#8d5524',
  pants: '#0f172a',
}

function kitMap(base: TeamKit): Record<GameId, TeamKit> {
  return Object.fromEntries(GAME_MODES.map((g) => [g.id, base])) as Record<GameId, TeamKit>
}

export const HOME_KIT = kitMap(DEFAULT_HOME)
export const AWAY_KIT = kitMap(DEFAULT_AWAY)

export const SCENE_FOG: Record<GameId, string> = Object.fromEntries(
  GAME_MODES.map((g) => [g.id, '#0b1220'])
) as Record<GameId, string>

export function envFor(_gameId: GameId): 'warehouse' | 'city' | 'sunset' | 'dawn' | 'night' | 'apartment' {
  return 'night'
}
