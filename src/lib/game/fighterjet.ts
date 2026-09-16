export const JET_WIN_KILLS = 20
export const JET_MATCH_SECONDS = 90
export const JET_MAX_HP = 100
/** Playable lateral range in open space (galaxy). */
export const GALAXY_HALF = 5.2

export type JetEnemy = {
  id: number
  x: number
  y: number
  z: number
  hp: number
  fireCd: number
  kind: 'jet'
}

export type JetMeteor = {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  r: number
  spin: number
}

export type JetBullet = {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  from: 'player' | 'enemy'
}

export function clampGalaxy(x: number, y: number) {
  return {
    x: Math.max(-GALAXY_HALF, Math.min(GALAXY_HALF, x)),
    y: Math.max(-GALAXY_HALF * 0.75, Math.min(GALAXY_HALF * 0.75, y)),
  }
}

/** @deprecated use clampGalaxy */
export function clampTunnel(x: number, y: number) {
  return clampGalaxy(x, y)
}
