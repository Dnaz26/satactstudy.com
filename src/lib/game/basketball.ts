export type Side = 'home' | 'away'

export type BBallPlayer = {
  id: string
  number: number
  side: Side
  name: string
  skin: string
  hair: string
  jersey: string
  jerseyTrim: string
  shorts: string
  socks: string
  shoes: string
  shoeAccent: string
  /** Matchup: away player guards this home id (for away) or is guarded by (for home). */
  matchId: string
  x: number
  z: number
  /** Radians: 0 faces +X (toward away basket). */
  facing: number
}

export type Possession = 'home' | 'away'

export const HOME_JERSEY = '#ff5c39'
export const AWAY_JERSEY = '#1e3a8a'
export const COURT_HALF_X = 5.6
export const COURT_HALF_Z = 3.4
export const HOOP_X = 5.35
/** First to this many points (2 pts each make → need 2 makes if WIN is 3? User said games up to 3 — first to 3 points). */
export const WIN_SCORE = 3
export const MATCH_SECONDS = 120
export const AWAY_MAKE_RATE = 0.7

const SKINS = ['#c68642', '#e0ac69', '#8d5524', '#f1c27d', '#6b3f24']
const HAIRS = ['#1a120c', '#3b2314', '#111111', '#4a3728', '#0f0a07']
const SHOES = ['#111111', '#f8fafc', '#dc2626', '#0ea5e9', '#f59e0b']

export function createRoster(): BBallPlayer[] {
  const spots = [
    { x: -1.6, z: 0 },
    { x: -2.8, z: -2.5 },
    { x: -2.8, z: 2.5 },
    { x: -4.5, z: -1.5 },
    { x: -4.5, z: 1.5 },
  ]

  const home: BBallPlayer[] = [1, 2, 3, 4, 5].map((number, i) => ({
    id: `h${number}`,
    number,
    side: 'home' as const,
    name: ['Nova', 'Ace', 'Blitz', 'Rex', 'Kai'][i],
    skin: SKINS[i],
    hair: HAIRS[i],
    jersey: HOME_JERSEY,
    jerseyTrim: '#111111',
    shorts: '#111111',
    socks: HOME_JERSEY,
    shoes: SHOES[i],
    shoeAccent: '#f8fafc',
    matchId: `a${number}`,
    x: spots[i].x,
    z: spots[i].z,
    facing: 0,
  }))

  const away: BBallPlayer[] = [1, 2, 3, 4, 5].map((number, i) => ({
    id: `a${number}`,
    number,
    side: 'away' as const,
    name: ['Fox', 'Drake', 'Storm', 'Volt', 'Zen'][i],
    skin: SKINS[(i + 2) % SKINS.length],
    hair: HAIRS[(i + 1) % HAIRS.length],
    jersey: '#f8fafc',
    jerseyTrim: AWAY_JERSEY,
    shorts: '#f8fafc',
    socks: '#dc2626',
    shoes: '#94a3b8',
    shoeAccent: '#f8fafc',
    matchId: `h${number}`,
    x: spots[i].x + 3.2,
    z: spots[i].z,
    facing: Math.PI,
  }))

  return [...home, ...away]
}

export function tipOffPositions(): { home: { x: number; z: number }[]; away: { x: number; z: number }[] } {
  return {
    home: [
      { x: -1.2, z: 0 },
      { x: -2.8, z: -2.4 },
      { x: -2.8, z: 2.4 },
      { x: -4.4, z: -1.4 },
      { x: -4.4, z: 1.4 },
    ],
    away: [
      { x: 1.2, z: 0 },
      { x: 2.8, z: -2.4 },
      { x: 2.8, z: 2.4 },
      { x: 4.4, z: -1.4 },
      { x: 4.4, z: 1.4 },
    ],
  }
}

export function clampCourt(x: number, z: number) {
  return {
    x: Math.max(-COURT_HALF_X, Math.min(COURT_HALF_X, x)),
    z: Math.max(-COURT_HALF_Z, Math.min(COURT_HALF_Z, z)),
  }
}

/** Spread wing / corner / slot targets so teammates stay open and spaced. */
export function offenseSpot(number: number, ballX: number, ballZ: number, t: number): { x: number; z: number } {
  const lanes = [
    { x: 2.4, z: 0 },
    { x: 1.6, z: -2.6 },
    { x: 1.6, z: 2.6 },
    { x: -0.4, z: -2.8 },
    { x: -0.4, z: 2.8 },
  ]
  const base = lanes[(number - 1) % lanes.length]
  const cut = Math.sin(t * 0.9 + number * 1.7) * 0.85
  const slide = Math.cos(t * 0.7 + number) * 0.55
  return clampCourt(
    base.x + ballX * 0.18 + cut,
    base.z + ballZ * 0.08 + slide
  )
}

export function opennessScore(
  player: { x: number; z: number; id: string },
  defenders: { x: number; z: number }[],
  ball: { x: number; z: number } | null
) {
  let nearest = 99
  for (const d of defenders) {
    nearest = Math.min(nearest, Math.hypot(d.x - player.x, d.z - player.z))
  }
  const toHoop = Math.hypot(player.x - HOOP_X, player.z)
  const toBall = ball ? Math.hypot(player.x - ball.x, player.z - ball.z) : 3
  // Prefer open, near-ish hoop, not glued to ball handler
  return nearest * 1.35 - toHoop * 0.12 + Math.min(2.2, toBall) * 0.25
}

export function mostOpenTeammate(
  players: BBallPlayer[],
  holderId: string | null
): BBallPlayer | null {
  const home = players.filter((p) => p.side === 'home' && p.id !== holderId)
  const away = players.filter((p) => p.side === 'away')
  const ball = players.find((p) => p.id === holderId) ?? null
  if (!home.length) return null
  return [...home].sort(
    (a, b) => opennessScore(b, away, ball) - opennessScore(a, away, ball)
  )[0]
}

/** Push players apart if they bunch up. */
export function separateFromCrowd(
  me: { x: number; z: number; id: string },
  others: { x: number; z: number; id: string }[],
  minDist = 1.85
) {
  let x = me.x
  let z = me.z
  for (const o of others) {
    if (o.id === me.id) continue
    const d = Math.hypot(o.x - x, o.z - z)
    if (d < minDist && d > 0.001) {
      const push = (minDist - d) * 0.35
      x -= ((o.x - x) / d) * push
      z -= ((o.z - z) / d) * push
    }
  }
  return clampCourt(x, z)
}

/** Easy mode for user — generous make chance when timing is decent. */
export function shotMakeChance(timingQuality: number, distanceToHoop: number) {
  const distFactor = Math.max(0.55, 1 - distanceToHoop / 12)
  const timing = Math.pow(Math.max(0.2, timingQuality), 0.85)
  return Math.min(0.98, 0.35 + timing * 0.6 * distFactor)
}

export function timingQualityFromMeter(value: number, sweetMin = 0.4, sweetMax = 0.62) {
  const mid = (sweetMin + sweetMax) / 2
  if (value >= sweetMin && value <= sweetMax) {
    const spread = (sweetMax - sweetMin) / 2
    return 1 - (Math.abs(value - mid) / spread) * 0.12
  }
  const edge = value < sweetMin ? sweetMin : sweetMax
  const miss = Math.min(1, Math.abs(value - edge) / 0.4)
  return Math.max(0, 1 - miss)
}
