export const MIN_TOPIC_QUESTIONS = 40

/**
 * Daily caps sized for >35% margin after Stripe (2.9%+$0.30) on DeepSeek Flash
 * peak chat cost (~$0.00792). Bank questions ≈ $0 variable cost.
 *
 * List collect: Core $10 / Plus $20
 * RHS collect (60% off): Core $4 / Plus $8 — uses PLAN_LIMITS_PROMO silently.
 *
 * Core list: 20 chats × 31 × $0.00792 + $0.59 ≈ $5.50 → ~45% margin on $10
 * Plus list: 45 chats × 31 × $0.00792 + $0.88 ≈ $11.93 → ~40% margin on $20
 * Core RHS: 8 chats × 31 × $0.00792 + $0.42 ≈ $2.38 → ~40% margin on $4
 * Plus RHS: 18 chats × 31 × $0.00792 + $0.53 ≈ $4.95 → ~38% margin on $8
 */
export const PLAN_LIMITS = {
  free: { questions_per_day: 0, ai_chats_per_day: 0 },
  lite: { questions_per_day: 5, ai_chats_per_day: 1 },
  starter: { questions_per_day: 10, ai_chats_per_day: 3 },
  core: { questions_per_day: 125, ai_chats_per_day: 20 },
  plus: { questions_per_day: 300, ai_chats_per_day: 45 },
  pro: { questions_per_day: 50, ai_chats_per_day: 15 },
  elite: { questions_per_day: 999999, ai_chats_per_day: 999999 },
  access_code: { questions_per_day: 999999, ai_chats_per_day: 999999 },
} as const

/** Silent RHS collect limits — not advertised; keeps margin above 35% at $4 / $8. */
export const PLAN_LIMITS_PROMO = {
  core: { questions_per_day: 50, ai_chats_per_day: 8 },
  plus: { questions_per_day: 120, ai_chats_per_day: 18 },
} as const

export const MASTERY_CONFIG = {
  accuracy_weight: 0.50,
  recent_accuracy_weight: 0.30,
  difficulty_adjusted_weight: 0.20,
  recent_window: 20,
  confidence_divisor: 30,
  easy_weight: 0.75,
  medium_weight: 1.00,
  hard_weight: 1.25,
  knowledge_mastery_weight: 0.80,
  speed_mastery_weight: 0.20,
} as const

export const SCORE_CONFIG = {
  sat_min: 400,
  sat_max: 1600,
  sat_section_min: 200,
  sat_section_max: 800,
  act_min: 1,
  act_max: 36,
} as const

export const PLAN_PRICES = {
  lite: 1,
  starter: 5,
  core: 10,
  plus: 20,
  pro: 20,
  elite: 100,
} as const

export const PLAN_PROMO_PRICES = {
  core: 4,
  plus: 8,
} as const

export const PAID_CHECKOUT_PLANS = ['core', 'plus'] as const

export const PLAN_FEATURES = {
  free: ['Pay or enter an access code to study'],
  lite: ['5 questions/day', '1 AI chat/day', 'Study plan', 'Progress tracking'],
  starter: ['10 questions/day', '3 AI chats/day', 'Study plan', 'Progress tracking'],
  core: ['125 questions/day', '20 AI chats/day', 'Study plan', 'Progress tracking', 'AI tutor'],
  plus: ['300 questions/day', '45 AI chats/day', 'Full analytics', 'Vocabulary', 'AI tutor'],
  pro: ['50 questions/day', '15 AI chats/day', 'Full analytics', 'Vocabulary system', 'AI tutor'],
  elite: ['Unlimited questions', 'Unlimited AI', 'All features', 'Priority support'],
} as const

/** Peak DeepSeek V4 Flash rates used to size caps. */
export const DEEPSEEK_FLASH_PEAK = {
  input_per_million: 0.44,
  output_per_million: 1.32,
} as const

export const STRIPE_FEE = {
  percent: 0.029,
  fixed: 0.3,
} as const

export const MISTAKE_TAGS = [
  { id: 'didnt_know', label: "I didn't know this" },
  { id: 'careless', label: 'I knew it but made a mistake' },
  { id: 'misread', label: 'I misread the question' },
  { id: 'ran_out_of_time', label: 'I ran out of time' },
  { id: 'guessed', label: 'I guessed' },
] as const

export const COMPANION_MESSAGES = {
  idle: [
    'Ready when you are!',
    'Let\'s crush that score today.',
    'Pick a topic and let\'s go!',
  ],
  studying: [
    'Great work! Keep it up.',
    'You\'re building mastery right now.',
    'Every question gets you closer.',
    'Focus mode activated. Let\'s go!',
  ],
  success: [
    'You\'re on fire today! 🎯',
    'Incredible streak! Keep pushing.',
    'That\'s how it\'s done!',
    'Top scorer energy! 🚀',
  ],
  warning: [
    'Let\'s get back on track.',
    'A few more minutes of focus will help.',
    'Don\'t give up — you\'ve got this.',
  ],
  struggling: [
    'I see you\'re having trouble. Let\'s figure this out together.',
    'Hard questions make you stronger. Let\'s break it down.',
    'It\'s okay to struggle — that\'s how we grow.',
  ],
} as const

export const NOVA_NAME = 'Nova'
