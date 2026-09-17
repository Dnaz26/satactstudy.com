# Digital SAT practice upgrade — September 2026

The 36 existing catalog IDs and exam numbers are preserved. Each new start uses
54 Reading & Writing questions followed by 44 Math questions (55–98). RW modules
contain 27 questions/32 minutes each; Math modules contain 22 questions/35 minutes.
Both Math paths contain 15 Algebra, 15 Advanced Math, 7 Problem-Solving and Data
Analysis, and 7 Geometry and Trigonometry items, including 11 student responses.

## Official sources and limits

- [SAT structure](https://satsuite.collegeboard.org/sat/whats-on-the-test/structure)
- [Math overview and progression](https://satsuite.collegeboard.org/sat/whats-on-the-test/math/overview)
- [Official skill descriptions](https://satsuite.collegeboard.org/practice/student-question-bank/math)
- [Adaptive design](https://blog.collegeboard.org/what-digital-sat-adaptive-testing)
- [Official scoring methodology](https://satsuite.collegeboard.org/scores/what-scores-mean/how-scores-calculated)

The questions are original. Difficulty labels are editorial judgments, not
empirically calibrated item parameters. Routing to harder Math Module 2 at
15/22 correct is a practice approximation, not an assertion of
College Board's threshold. Results report raw practice accuracy; estimated
analytics scores are not official IRT/equated SAT scores. No questions are
represented as College Board questions, and no official items were copied.

The 132-item Math bank is shared across the 36 exams. Both forms of each pool
are combined into different exam blueprints. Every exam/path has distinct IDs,
and every bank item is assigned, but items recur across later exams. RW content
uses existing SAT questions; this task rebuilds Math and changes RW counts and
module structure, not the quality of existing RW items.

## Data and application changes

- `bank.json`: 132 original Math items, explanations, choices/keys, domains,
  skills, difficulty, type, source, verification results and figure URLs.
  Questions and primary topic mappings are persisted in Supabase.
- `sat_question_assignments`: durable per-exam module, path and global question
  number metadata. There are 66 assignments per exam: 22 common, 22 easier,
  22 harder (2,376 total).
- `exam-blueprints.json`: the 36 persisted catalog definitions. Constraints
  enforce 98/54/44 and 22/22. The default `math_ids` contains common+easier;
  the server locks the selected path at Module 1 submission.
- `legacy-exams.json`: previous catalog ID assignments. Existing questions are
  retained; 1,251 replaced SAT Math items were made inactive. ACT items remain.
- `supabase/migrations`: schema and authenticated, invoker-rights RPCs for
  atomic start, module submission/routing, and completion. Scores are computed
  using database keys. Unanswered questions are incorrect. Attempts, session
  totals and results are written once under a row lock; mastery is recalculated.
- Historical/answered legacy sessions are supported separately. The three
  existing untouched starts had no answers and no valid session; they were
  upgraded safely to 98 questions with valid `full_test` sessions.
- Autosave uses a fixed interval unaffected by frequent timer ticks. Submission
  locks earlier answers; stale module writes are rejected. Resume uses saved
  assignments, not an unrestricted question refill.
- Exact authored SVG figures reside under `public/digital-sat/math`. Advanced
  originals do not receive potentially inaccurate heuristic diagrams.

## Verification and reproducibility

Create an isolated Python environment and install SymPy 1.14.0. Run:

```sh
python scripts/digital-sat/build_bank.py
node scripts/digital-sat/validate.mjs
npm test
npm run build
```

The builder checks numeric keys symbolically against independent derivations,
validates distinct choices and one numerical match, and checks mathematical
properties for expression keys. Statistical interpretations were reviewed
against official skill descriptions. `bank-audit.json` records lexical near
matches: these are shared stem phrasing for different operations (factoring a
rational numerator versus dividing terms, radical simplification, expansion,
difference of squares, and cubic grouping), not numerical-template variants.

`validation-report.json` verifies every saved exam and both Math paths, domain
and difficulty mixtures, ordering, metadata, persistence readback, SAT-only RW
counts, and 11 student responses. `flow-report.json` records authenticated HTTP
and RLS tests for 0/14/15/22 correct in Math Module 1, including both paths,
concurrent starts, resume, locked/stale answers, completion, unanswered items,
fraction/decimal representations, idempotency, 98 analytics records, assistance
metadata, mastery, next-exam unlocking, and results/dashboard/mistakes pages.
Test users are signed out and deleted in `finally`; admin creation sends no
email. Browser testing also verified entered answers and remaining time through
a reload, questions 55–98, module transitions, and a saved 0/98 result.

`persist.mjs` is an explicit database write tool requiring the local service key.
It reads back the whole new bank before switching the catalog atomically.
`audit.mjs` retains an initial `/tmp/sat-exams-before.json` backup. Do not replace
that original backup when restoring prior catalog assignments. Secrets are
loaded from `.env.local` and are never written to generated files or reports.

Supabase data/migrations are applied. Application code and public figures must
be deployed together to activate the new flow on the hosted production site;
validation used the local production build.
