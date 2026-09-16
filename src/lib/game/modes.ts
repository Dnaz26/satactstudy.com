export type GameCategory = 'arcade' | 'action'

export type GameId =
  | 'tetris'
  | 'pong'
  | 'space-invaders'
  | 'platform-jumper'

export type GameMode = {
  id: GameId
  title: string
  blurb: string
  category: GameCategory
  src: string
  cover: string
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'pong',
    title: 'Neon Pong',
    blurb: 'Futuristic paddle duel — beat the AI in a glowing arena.',
    category: 'arcade',
    src: '/games/pong/index.html',
    cover: '/game-covers/pong.svg',
  },
  {
    id: 'tetris',
    title: 'Neon Tetris',
    blurb: 'Stack luminous blocks in a 3D neon well.',
    category: 'arcade',
    src: '/games/tetris/index.html',
    cover: '/game-covers/tetris.svg',
  },
  {
    id: 'space-invaders',
    title: 'Space Invaders',
    blurb: 'Pilot and blast invaders in a deep-space trench.',
    category: 'action',
    src: '/games/space-invaders/index.html',
    cover: '/game-covers/space-invaders.svg',
  },
  {
    id: 'platform-jumper',
    title: 'Platform Jumper',
    blurb: 'Leap endless floating pads in a neon sky lane.',
    category: 'action',
    src: '/games/platform-jumper/index.html',
    cover: '/game-covers/platform-jumper.svg',
  },
]

export function getGameMode(id: string): GameMode | undefined {
  return GAME_MODES.find((mode) => mode.id === id)
}

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  arcade: 'Neon Arcade',
  action: 'Action Lane',
}

export const RESPAWN_CORRECT_NEEDED = 5
