# SAT ACT AI

**Your Personal AI Coach for the SAT & ACT**

Know exactly what to study. Improve every day.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Supabase Setup](#supabase-setup)
5. [Stripe Setup](#stripe-setup)
6. [DeepSeek AI Setup](#deepseek-ai-setup)
7. [Admin Setup](#admin-setup)
8. [Local Development](#local-development)
9. [Production Deployment](#production-deployment)
10. [Database Migrations](#database-migrations)
11. [Architecture Docs](#architecture-docs)

---

## Overview

SAT ACT AI is a full-stack SaaS application for SAT and ACT preparation. It combines:

- **Adaptive practice engine** — questions get harder/easier based on performance
- **Granular mastery tracking** — topic-by-topic accuracy, speed, trend analysis
- **AI tutoring (Nova)** — powered by DeepSeek, explains every question step-by-step
- **Score prediction** — calibrated SAT/ACT score estimates with confidence ranges
- **Personalized scheduling** — daily study plans based on weaknesses, test date, and available time
- **Stripe subscriptions** — Starter $5/mo, Pro $20/mo, Elite $100/mo
- **Access codes** — promotional full-access codes (DN126 pre-loaded)

### Technology Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (server-side) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | DeepSeek (via OpenAI-compatible API) |
| Payments | Stripe |
| Charts | Recharts |
| Validation | Zod |

---

## Quick Start

```bash
# Clone / open project
cd /path/to/project

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your values (see below)

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Only for server-side admin operations

# DeepSeek AI (required for AI features)
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_PRO_MODEL=deepseek-chat   # High-quality reasoning
DEEPSEEK_FLASH_MODEL=deepseek-chat  # Fast, low-cost

# Stripe (required for payments)
STRIPE_SECRET_KEY=sk_live_...       # or sk_test_... for dev
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ELITE_PRICE_ID=price_...

# Admin
ADMIN_EMAILS=your@email.com  # Comma-separated

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**Security rules:**
- `SUPABASE_SERVICE_ROLE_KEY` — never exposed to the browser (server-only API routes)
- `STRIPE_SECRET_KEY` — never exposed to the browser
- `DEEPSEEK_API_KEY` — never exposed to the browser
- All `NEXT_PUBLIC_*` vars are safe to expose to the browser

---

## Supabase Setup

### 1. Connected Project

This app is already connected to: `https://skauxjewikafoyymhcgn.supabase.co`

The database schema was migrated automatically. All tables, RLS policies, triggers, and seed data are in place.

### 2. Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `access_codes` | Promotional access codes (DN126 pre-loaded) |
| `access_code_redemptions` | Tracks who redeemed which code |
| `tests` | SAT / ACT definitions |
| `sections` | Math, R&W, English, Reading, Science |
| `categories` | Algebra, Advanced Math, etc. |
| `topics` | Linear Equations, Transitions, etc. (68 topics seeded) |
| `subtopics` | Fine-grained skill breakdowns |
| `questions` | Practice questions |
| `practice_sessions` | Practice session metadata |
| `attempts` | Every question answer (never overwritten) |
| `topic_mastery` | Per-user topic mastery scores |
| `topic_daily_snapshots` | Daily mastery history |
| `score_predictions` | Calculated score estimates |
| `study_plans` | Daily study plan |
| `study_plan_tasks` | Individual tasks within a plan |
| `vocabulary_words` | SAT/ACT vocabulary |
| `vocabulary_attempts` | Vocabulary spaced-repetition data |
| `ai_conversations` | AI chat threads |
| `ai_messages` | Individual AI messages |
| `ai_usage` | AI token/cost tracking |
| `user_usage_daily` | Daily question + AI chat counters |
| `subscriptions` | Stripe subscription records |
| `payments` | Payment history |
| `admin_logs` | Admin action audit log |
| `performance_snapshots` | Daily OVR + score history |
| `mistake_tags` | Tags on incorrect attempts |

### 3. Row Level Security

Every table has RLS enabled. Users can only read/write their own data. Admins can read everything. The `is_admin()` function checks `profiles.role = 'admin'`.

### 4. Auth

Supabase Auth is configured with email/password. A trigger automatically creates a `profiles` row on signup.

To enable email confirmations, configure SMTP in Supabase Dashboard → Auth → SMTP Settings.

---

## Stripe Setup

### 1. Create Products

In Stripe Dashboard, create three recurring products:

| Plan | Price | Billing |
|------|-------|---------|
| Starter | $5.00 | Monthly |
| Pro | $20.00 | Monthly |
| Elite | $100.00 | Monthly |

Copy each Price ID to your `.env.local`.

### 2. Configure Webhook

In Stripe Dashboard → Webhooks → Add endpoint:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`.

### 3. Customer Portal

Enable the Customer Portal in Stripe Dashboard → Customer Portal. This powers the billing management UI.

---

## DeepSeek AI Setup

1. Sign up at [platform.deepseek.com](https://platform.deepseek.com)
2. Create an API key
3. Add to `DEEPSEEK_API_KEY` in `.env.local`

### Model Selection

The app uses two tiers:

| Tier | Model | Used For |
|------|-------|---------|
| Pro | `deepseek-chat` (or deepseek-v4-pro when available) | Tutoring, study plans, deep analysis |
| Flash | `deepseek-chat` (or deepseek-v4-flash when available) | Question explanations, quick recommendations |

Update `DEEPSEEK_PRO_MODEL` and `DEEPSEEK_FLASH_MODEL` when DeepSeek releases new model names.

### Cost Optimization

- Explanations are cached in `questions.ai_explanation` — never regenerated for the same question
- Flash model used for all high-volume operations
- Pro model only for tutoring conversations and personalized analysis
- Usage logged to `ai_usage` table with token counts and estimated cost

---

## Admin Setup

### 1. Grant Admin Role

After creating your account, run this SQL in Supabase Dashboard → SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

### 2. Admin Features

Navigate to `/admin` (only visible to admins):

- **Dashboard** — user counts, revenue, AI cost
- **Questions** — review, approve, edit questions
- **Import** — upload CSV/JSON to import questions with AI classification
- **Profitability** — MRR, AI cost per user, margin estimates
- **Database Health** — connection status, table counts

### 3. Access Code Management

The access code `DN126` is pre-loaded and grants Elite access. To add more codes, insert into the `access_codes` table:

```sql
INSERT INTO access_codes (code_hash, label, max_uses, plan_granted)
VALUES (
  encode(digest('YOUR_CODE_HERE', 'sha256'), 'hex'),
  'Your Label',
  100,  -- NULL for unlimited
  'elite'
);
```

---

## Local Development

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint check
```

### Testing Stripe Locally

Use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Production Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel Dashboard
# Or via CLI:
vercel env add DEEPSEEK_API_KEY
```

### Environment Variables for Production

Set all variables from `.env.example` in your deployment platform. Remember:
- Use `NEXT_PUBLIC_APP_URL=https://your-domain.com`
- Use live Stripe keys (not test keys)
- Update Stripe webhook URL to production domain

---

## Database Migrations

Migrations are tracked in the Supabase Dashboard under Database → Migrations.

Applied migrations:
1. `001_core_schema` — all tables, indexes
2. `002_rls_policies` — RLS, triggers, helper functions
3. `003_taxonomy_seed` — tests, sections, categories, 68 topics, vocabulary seed
4. `004_sample_questions` — sample practice questions

To add new migrations, use the Supabase MCP or Dashboard SQL Editor, or use the Supabase CLI:

```bash
supabase migration new my_migration_name
# Edit the file in supabase/migrations/
supabase db push
```

---

## Architecture Docs

### Mastery Formula

```
# Per topic, per user:

accuracy = correct_attempts / total_attempts
recent_accuracy = correct in last 20 attempts / min(total, 20)

difficulty_weights = { Easy: 0.75, Medium: 1.00, Hard: 1.25 }
difficulty_adjusted = Σ(correct * weight) / Σ(weight)

confidence = min(1, total_attempts / 30)

base_mastery = (0.50 * accuracy)
             + (0.30 * recent_accuracy)
             + (0.20 * difficulty_adjusted)

knowledge_mastery = 100 * (confidence * base_mastery + (1 - confidence) * 0.50)

# Speed component:
target_time = per-topic configurable (default 90s)
avg_time = total_time_seconds / total_attempts
speed_ratio = avg_time / target_time
speed_mastery = max(0, min(100, 100 - (speed_ratio - 1) * 50))

# Overall:
overall_mastery = 0.80 * knowledge_mastery + 0.20 * speed_mastery
```

### OVR Formula

```
OVR = weighted average of all topic masteries

Weight per topic = test_weight * confidence * recency_factor

Where:
- test_weight = topic's importance in the test framework
- confidence = min(1, attempts / 30)
- recency_factor = decay based on days since last practice
```

### SAT Score Prediction

```
# Per question:
difficulty_weight = { Easy: 0.75, Medium: 1.00, Hard: 1.25 }
weighted_accuracy = Σ(correct * difficulty_weight) / Σ(difficulty_weight)

# Section score (200-800):
predicted_section = 200 + weighted_accuracy * 600

# Blend with practice test if available:
predicted_section = 0.60 * practice_test_score
                  + 0.25 * recent_question_estimate
                  + 0.15 * long_term_question_estimate

# Total SAT:
predicted_total = predicted_math + predicted_reading_writing

# Confidence:
High:   multiple practice tests + 100+ questions + wide topic coverage
Medium: 1 practice test or 30-100 questions
Low:    < 30 questions, no practice tests
```

### ACT Score Prediction

Independent calibration model. Section scores (1-36) calculated separately for English, Math, Reading, Science. Composite = average of four sections (rounded to nearest integer per ACT rules).

### Study Schedule Algorithm

```
# Topic priority per topic:
weakness = 1 - (mastery / 100)
recency_need = 1 - (recent_mastery / 100)
speed_problem = max(0, avg_time / target_time - 1)
importance = test_weight

potential_gain = weakness * importance * confidence

priority = 0.45 * potential_gain
         + 0.20 * weakness
         + 0.15 * recency_need
         + 0.10 * speed_problem
         + 0.10 * importance

# Time allocation:
45% → weakest high-value topics
20% → mistake review
15% → timed practice
10% → medium-strength topics
10% → strong-topic maintenance

# Adaptation by days remaining:
> 60 days   → concept learning focus
30-60 days  → concepts + practice
14-30 days  → targeted weaknesses + timed
7-13 days   → high-value weaknesses + practice tests
3-6 days    → no new curriculum, timing + mistakes
1-2 days    → very light review only
```

### Entitlements / Plan Limits

| Feature | Free | Starter | Pro | Elite |
|---------|------|---------|-----|-------|
| Questions/day | 5 | 10 | 50 | ∞ |
| AI chats/day | 1 | 3 | 15 | ∞ |
| Analytics | Basic | Full | Full | Full+AI |
| Adaptive difficulty | — | — | ✓ | ✓ |
| Practice tests | — | — | ✓ | ✓ |
| Unlimited everything | — | — | — | ✓ |

"Unlimited" = 999,999 daily limit (protects against automation abuse while allowing all normal student usage).

### AI Cost Optimization

1. **Explanation caching** — `questions.ai_explanation` is set once and reused forever
2. **Model tiering** — Flash for explanations, Pro only for tutoring/planning
3. **Deterministic calculations** — mastery, OVR, scores, schedules all computed in code (zero AI cost)
4. **Usage logging** — `ai_usage` table tracks model, tokens, cost per request
5. **Daily counters** — `user_usage_daily` enforces per-plan limits

---

## Support

For questions about this codebase, refer to the inline code documentation or the admin analytics page for system health monitoring.
