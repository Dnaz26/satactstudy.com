export const MIN_TOPIC_QUESTIONS = 40

/**
 * Caps sized for >70% margin after Stripe (2.9%+$0.30) on DeepSeek-V4.1-Flash
 * peak cache-miss rates ($0.30 / $1.20 per 1M). Bank questions ≈ $0.
 * Plus daily usage is 3× Core. Annual billing is 30% off and is the tighter case.
 */
export const PLAN_LIMITS = {
  free: { questions_per_day: 12, ai_chats_per_day: 0 },
  lite: { questions_per_day: 5, ai_chats_per_day: 1 },
  starter: { questions_per_day: 10, ai_chats_per_day: 3 },
  core: { questions_per_day: 125, ai_chats_per_day: 5 },
  plus: { questions_per_day: 375, ai_chats_per_day: 15 },
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
  core: 7.56,
  plus: 20,
  pro: 20,
  elite: 100,
} as const

export const PLAN_PROMO_PRICES = {
  core: 3.02,
  plus: 8,
} as const

export const PAID_CHECKOUT_PLANS = ['core', 'plus'] as const

export const PLAN_FEATURES = {
  free: [
    '1 lesson a week',
    'No access to take practice exams',
    '5 Rapid Fire questions',
    '5 game mode questions',
    '2 Review questions a day',
  ],
  lite: ['5 questions/day', '1 AI chat/day', 'Study plan', 'Progress tracking'],
  starter: ['10 questions/day', '3 AI chats/day', 'Study plan', 'Progress tracking'],
  core: [
    '1 lesson a day',
    'Practice exams included',
    '15 Rapid Fire questions a day',
    '15 game mode questions a day',
    '6 Review questions a day',
    '4 Nova tutor chats a day',
    'Personal nightly study plan',
    'Live projected score range',
  ],
  plus: [
    '3 lessons a day',
    'Practice exams included',
    '45 Rapid Fire questions a day',
    '45 game mode questions a day',
    '18 Review questions a day',
    '12 Nova tutor chats a day',
    'Personal nightly study plan',
    'Live projected score range',
  ],
  pro: ['50 questions/day', '15 AI chats/day', 'Full analytics', 'Vocabulary system', 'AI tutor'],
  elite: ['Unlimited questions', 'Unlimited AI', 'All features', 'Priority support'],
} as const

/** DeepSeek-V4.1-Flash peak cache-miss rates (api-docs.deepseek.com). */
export const DEEPSEEK_FLASH_PEAK = {
  input_per_million: 0.3,
  output_per_million: 1.2,
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
