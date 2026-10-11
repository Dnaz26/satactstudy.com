# ACT Flagship v1 — Audit Report (review status, NOT published)

Form: `ACT Flagship v1` · spec `enhanced-act-2026` v1 · status **`review`**
Previous form `ACT Practice Test 1` (exam #37): **quarantined, preserved** (reversible title prefix; row, attempts, and history untouched).

Scores shown anywhere in product UI are **estimates**. No official ACT endorsement,
no official items, no psychometric equivalence is claimed. Calibration sample: n=0.

## Before → after

| Area | Before (#37) | After (Flagship v1) |
|---|---|---|
| English | 50 items, ~6 unique stems rotated (template clones), 200-char blurbs | 50 items across 6 essays (4×10 + 2×5), marked spans verified unique, mixed Production/Knowledge/Conventions |
| Math | 45 items incl. 11 invalid (no-key, dup-equivalent, template clones), `Skill set` labels | 45 hand-authored items, ramped L1–L7, 11 topics, modeling ≥9, zero banned labels |
| Reading | 36 items, 3 passages, 35-min timer, no paired unit | 36 items, 4 units × 9 (incl. genuine paired humanities), 40-min timer, evidence maps on all 36 |
| Science | absent | absent (optional; plumbing retained for v2) |
| Scoring | 4-section average incl. Science; near-linear, totals unlabeled | EMR composite only; Science separate; STEM documented; form-versioned tables; labeled estimates |
| Validation evidence | none (0 ACT metadata rows) | 131 metadata rows (status `pending`, honest partial evidence), 131 bank reviews (`automated_checks_only`) |
| Calibration | none | none (gated) |
| Assembly | ad-hoc /tmp script, unversioned | versioned form row + `form.json` artifact + readback gate test |

## Blueprint readback (operational / scored)

- English 40 scored: Production 16 (40%), Knowledge 8 (20%), Conventions 16 (40%) — all in band.
- Math 41 scored: NQ 5 (12.2% — 0.2pt over the 10–12% band; integer quantization at n=41 admits no exact hit; documented deviation), Algebra 8, Functions 7, Geometry 7, Stats 5, IES 9 (22%, "~20%"), modeling 13 items.
- Reading 27 scored: Key Ideas 13 (48%), Craft 8 (30%), Integration 6 (22%) — all in band.
- Field-test: 10 + 4 + 9 = 23 mixed invisibly, recorded in `form.json` only.
- Timers: 35:00 / 50:00 / 40:00 via legacy modules path (verified in E2E harness).

## Gates (measured)

PASS: exact counts/timing/units; operational bands (with noted NQ deviation);
validator clean on all 131 live rows; fingerprints unique; 1 sibling group adjudicated
(linear-vs-quadratic function evaluation — same archetype, different content);
11/11 regression fixtures rejected with documented codes; span uniqueness on 50
English marks; evidence maps on 36 Reading; payload leakage clean on 131/131;
EMR composite excludes Science; STEM documented; quarantine reversible; RLS
unchanged (anon blocked, service key server-only); lint/typecheck/76 unit tests/build green.

NOT MEASURED (environment limits, not failures): headless-browser E2E (no browser
tooling installed); authenticated click-through (no test credentials);
independent-model review (DeepSeek/Anthropic SNI-filtered from this network);
empirical calibration (n=0, no student sample yet).

## Score: measured 85/100 → capped 59/100

Subtotal: structure 14 + blueprint 19 + correctness 15 + distractors/style 10 +
passages/evidence 9 + UX/security/integrity 8 + honesty 10 = 85.
Cap applies per rubric (<60): browser E2E missing + psychometrics unmeasured.
No 100 is claimed. Cap lifts when: (1) browser E2E passes, (2) independent review
completes, (3) calibration sample collected and equating published.

## To reach psychometric (not just engineering) fidelity

1. Collect n≥400 complete, motivated, first-attempt responses per form.
2. Fit 2PL IRT per item (discrimination/difficulty), DIF screen, drift check.
3. Equate raw→scale per section against an anchored reference; publish as a new
   `ACT_SCALES` table version (never mutate `act-flagship-v1-estimate`).
4. Insert one row per item into `exam_calibration_reports`; flip form to
   `validated` only when `all_critical_categories_pass` and
   `all_applicable_categories_measured` are true with evidence attached.

## Residual risks / follow-ups

- Science form not built (spec-optional; plumbing retained).
- Template filler remains elsewhere in the bank (flagship is clean; drills untouched).
- NQ band 12.2% (documented deviation).
- No migration was needed (schema already sufficient); none created.

## Revision 2 (same form, same 131 ids)

- 8 English items rewritten for grammar breadth (colon, possessives ×2,
  diction, parallelism ×2, appositive, who/whom); comma-splice items 13 → 5;
  E39-D distractor repaired. Domain bands re-verified unchanged.
- 12 Math items rewritten for multi-step reasoning and modeling; two
  correct-is-longest outliers repaired.
- Reading Salt passage gained a results table; 2 field items rewritten as
  text+visual integration (bands untouched — both are field slots).
- 95 answer keys rotated: E 13/12/13/12, M 11/11/11/12, R 9/9/9/9, max run 2.
- Template-sibling sweep now finds 0 groups (prior single adjudication retired).
- research: official ACT sources confirm 50/40 English, 45/41 Math, 36/27
  Reading, 40/34 Science, EMR composite, embedded field tests, 35/50/40/40
  timing, shorter passages, fewer math response options noted.

## Revision 6 (order-only)

- Math resequenced easy-to-hard by difficulty level (was assembly score order).
  Keys untouched (11/11/11/12, max run 2). Artifact + exam row + empty
  progress rows updated to the new order.

## Revision 7 (key-integrity fix)

- Post-rotation audit caught a systematic period-4 cycle the phase-locked
  check missed: English Q7-Q50 ran ABCDABCD..., Reading ran BADC x9.
  Cause: naive balance-by-cycling in the rev5 rotation script.
- Re-rotated English (seed 20260924) and Reading (seed 777) choice positions
  with autocorrelation gates: balance kept (E 13/12/13/12, R 9/9/9/9),
  max run <= 2, longest repeat <= 4 for periods 2/3/4, lag-4 match rate at
  chance (~25%). Correct content untouched; only positions moved.
- Lesson: periodicity checks must test autocorrelation at periods 2/3/4 and
  lag-4 rate, never phase alignment alone.
