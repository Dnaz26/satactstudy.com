export const COIN_NAME = 'Nova Coins'

/** Higher = more valuable. Practice test #1, improvement #2. */
export const COIN_REWARDS = {
  practice_test: 500,
  improvement: 250,
  daily_task: 150,
  tutoring_level: 100,
  game_win: 80,
  correct_answer: 15,
} as const

export type CoinReason = keyof typeof COIN_REWARDS

export type StoreRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type StoreCategory = 'featured' | 'valorant' | 'sports' | 'edu'

export type StoreItem = {
  id: string
  name: string
  blurb: string
  price: number
  rarity: StoreRarity
  category: StoreCategory
  /** Game ids this boosts, or 'edu' for study helpers. */
  appliesTo: string[]
  effect: {
    kind: 'damage' | 'accuracy' | 'defense' | 'score_chance' | 'hint' | 'topic_boost'
    value: number
    label: string
  }
}

export const STORE_ITEMS: StoreItem[] = [
  // Featured
  {
    id: 'featured-operator',
    name: 'Operator',
    blurb: 'One-tap energy for Valorant rounds.',
    price: 1200,
    rarity: 'legendary',
    category: 'featured',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'damage', value: 0.18, label: '+18% frag chance' },
  },
  {
    id: 'featured-clutch-kit',
    name: 'Clutch Kit',
    blurb: 'Extra hang-time when the clock is red.',
    price: 900,
    rarity: 'epic',
    category: 'featured',
    appliesTo: ['tetris', 'pong', 'platform-jumper'],
    effect: { kind: 'score_chance', value: 0.12, label: '+12% score chance' },
  },
  {
    id: 'featured-sat-radar',
    name: 'SAT Radar',
    blurb: 'Highlights the trap answer on hard stems.',
    price: 800,
    rarity: 'epic',
    category: 'featured',
    appliesTo: ['edu'],
    effect: { kind: 'hint', value: 1, label: '1 free trap highlight / session' },
  },

  // Valorant guns
  {
    id: 'val-classic',
    name: 'Classic',
    blurb: 'Starter sidearm. Clean and reliable.',
    price: 200,
    rarity: 'common',
    category: 'valorant',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'damage', value: 0.04, label: '+4% frag chance' },
  },
  {
    id: 'val-spectre',
    name: 'Spectre',
    blurb: 'Spray control for mid-range duels.',
    price: 450,
    rarity: 'uncommon',
    category: 'valorant',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'accuracy', value: 0.08, label: '+8% accuracy' },
  },
  {
    id: 'val-phantom',
    name: 'Phantom',
    blurb: 'Silenced spray — stay alive longer.',
    price: 700,
    rarity: 'rare',
    category: 'valorant',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'defense', value: 0.1, label: '−10% damage taken' },
  },
  {
    id: 'val-vandal',
    name: 'Vandal',
    blurb: 'First-bullet precision.',
    price: 850,
    rarity: 'epic',
    category: 'valorant',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'damage', value: 0.14, label: '+14% frag chance' },
  },

  // Sports capabilities
  {
    id: 'sport-hot-hand',
    name: 'Hot Hand',
    blurb: 'Basketball deep-range confidence.',
    price: 400,
    rarity: 'uncommon',
    category: 'sports',
    appliesTo: ['tetris', 'pong', 'platform-jumper'],
    effect: { kind: 'score_chance', value: 0.1, label: '+10% shoot chance' },
  },
  {
    id: 'sport-through-ball',
    name: 'Through Ball',
    blurb: 'Soccer killer passes.',
    price: 400,
    rarity: 'uncommon',
    category: 'sports',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'accuracy', value: 0.12, label: '+12% pass success' },
  },
  {
    id: 'sport-pocket-pass',
    name: 'Pocket Pass',
    blurb: 'Football timing under pressure.',
    price: 450,
    rarity: 'rare',
    category: 'sports',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'score_chance', value: 0.1, label: '+10% TD chance' },
  },
  {
    id: 'sport-slap-shot',
    name: 'Slap Shot',
    blurb: 'Hockey one-timer power.',
    price: 400,
    rarity: 'uncommon',
    category: 'sports',
    appliesTo: ['tetris', 'pong', 'platform-jumper'],
    effect: { kind: 'score_chance', value: 0.1, label: '+10% goal chance' },
  },
  {
    id: 'sport-green-bat',
    name: 'Green Bat',
    blurb: 'Baseball barrel control.',
    price: 500,
    rarity: 'rare',
    category: 'sports',
    appliesTo: ['tetris', 'pong', 'platform-jumper'],
    effect: { kind: 'score_chance', value: 0.12, label: '+12% hit chance' },
  },
  {
    id: 'sport-iron-chin',
    name: 'Iron Chin',
    blurb: 'Boxing durability.',
    price: 550,
    rarity: 'rare',
    category: 'sports',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'defense', value: 0.15, label: '−15% damage taken' },
  },
  {
    id: 'sport-power-jab',
    name: 'Power Jab',
    blurb: 'Boxing punch snap.',
    price: 500,
    rarity: 'rare',
    category: 'sports',
    appliesTo: ['space-invaders', 'platform-jumper'],
    effect: { kind: 'damage', value: 0.12, label: '+12% punch damage' },
  },

  // Educational
  {
    id: 'edu-algebra-lens',
    name: 'Algebra Lens',
    blurb: 'See the isolate-x move faster.',
    price: 350,
    rarity: 'uncommon',
    category: 'edu',
    appliesTo: ['edu'],
    effect: { kind: 'topic_boost', value: 1, label: 'Algebra tip overlays' },
  },
  {
    id: 'edu-reading-decoder',
    name: 'Reading Decoder',
    blurb: 'Flags claim vs evidence lines.',
    price: 350,
    rarity: 'uncommon',
    category: 'edu',
    appliesTo: ['edu'],
    effect: { kind: 'topic_boost', value: 1, label: 'Reading claim flags' },
  },
  {
    id: 'edu-grammar-guard',
    name: 'Grammar Guard',
    blurb: 'Catches comma / agreement traps.',
    price: 300,
    rarity: 'common',
    category: 'edu',
    appliesTo: ['edu'],
    effect: { kind: 'topic_boost', value: 1, label: 'Grammar trap alerts' },
  },
  {
    id: 'edu-desmos-assist',
    name: 'Desmos Assist',
    blurb: 'Suggests the first graph to type.',
    price: 600,
    rarity: 'rare',
    category: 'edu',
    appliesTo: ['edu'],
    effect: { kind: 'hint', value: 1, label: 'Desmos first-move hint' },
  },
  {
    id: 'edu-act-science-scan',
    name: 'ACT Science Scan',
    blurb: 'Points you at the right figure first.',
    price: 450,
    rarity: 'rare',
    category: 'edu',
    appliesTo: ['edu'],
    effect: { kind: 'topic_boost', value: 1, label: 'Figure-first cue' },
  },
]

export const RARITY_STYLE: Record<StoreRarity, { label: string; bar: string; glow: string }> = {
  common: { label: 'Common', bar: 'bg-slate-400', glow: 'from-slate-500/30' },
  uncommon: { label: 'Uncommon', bar: 'bg-emerald-500', glow: 'from-emerald-500/35' },
  rare: { label: 'Rare', bar: 'bg-sky-500', glow: 'from-sky-500/40' },
  epic: { label: 'Epic', bar: 'bg-violet-500', glow: 'from-violet-500/45' },
  legendary: { label: 'Legendary', bar: 'bg-amber-400', glow: 'from-amber-400/50' },
}

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === id)
}

export function featuredItems(): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === 'featured')
}

export function itemsByCategory(category: StoreCategory): StoreItem[] {
  return STORE_ITEMS.filter((item) => item.category === category)
}
