# Difficulty audit, 10 October 2026

This is an editorial structural audit of the live bank. It is not a student-performance study, and it is not a literal “5× harder” measurement.

## What was counted

Live active, approved questions: 1,640 (SAT 364, ACT 1,276 before the new batch; 1,646 after six additions).

Labels before any change: Easy 159, Medium 475, Hard 1,006.

Exact duplicate fingerprints among those active questions: 0.

Repeated reasoning-frame families with more than two active items in the same topic: 13. The extras sit on existing exams, so they were not deactivated. Deactivating them would break those exams.

## Rubric result

Each active question was scored on the 18-point rubric from its stem, choices, explanation, passage, and distractor notes. A Hard label was not treated as evidence.

Recommended bands if the scores were applied to the live labels:

- Foundation: 970
- Easy: 568
- Medium: 101
- Hard: 1
- Elite Hard: 0 in the old bank

The old Hard label would move mostly to Easy or Foundation. One hundred one old Hard items would become Medium. One old Hard item would stay Hard. No old item reached 15.

That distribution is a property of this structural scorer. It downgrades inflated “elite” stamps, including short one-relationship items that had been stored with a self-scored 15. It can also underrate a subtle item whose difficulty is not visible in length or keywords.

## What was saved, and what was not changed

Every recommended change is in `difficulty-reclass-2026-10-10.json` (old label, recommended label, rubric, reason).

Rubric audits were written onto 934 validated `exam_item_metadata` rows under `product_audit_2026_10_10`.

Live `questions.difficulty` and `questions.difficulty_score` were not changed. Applying the recommended scores would leave SAT Module 2 with about 15 medium Math items, 2 medium Reading and Writing items, and almost no harder-module items. Module 2 needs 22 Math questions or 27 Reading and Writing questions in the selected band. Rapid Fire and the other practice modes only serve Hard items, so relabeling the current Hard set would empty them before a replacement pool exists. Exam question IDs were left active.

No question row was deleted. Attempts, scores, and exam assignments still point at the same IDs.

## New questions

Batch `Audited hard pool 2026-10-10 batch 1` added 6 original questions, all active and validated. See `audited-hard-batch-1-2026-10-10.json`.

- SAT Math, Algebra, Linear equations in one variable: 1 Hard (14)
- SAT Math, Advanced Math, Equivalent expressions: 1 Hard (13)
- SAT Math, Advanced Math, Nonlinear functions: 1 Hard (14)
- SAT Math, Problem-Solving and Data Analysis, Percentages: 1 Hard (13)
- SAT Math, Geometry and Trigonometry, Right triangles and trigonometry: 1 Hard (13)
- SAT Reading and Writing, Information and Ideas, Inferences: 1 Elite Hard (15)

Each one was checked against a worked proof before it was activated. Answer positions in this batch are not all the same letter. This is not 30 Hard plus 20 Elite Hard on every official topic.

## Official topic target

The target was at least 30 validated Hard items (12–14), 20 Elite Hard items (15–18), and 50 new Hard or Elite Hard items on every official SAT and ACT skill, with no reasoning frame used more than twice.

That target is not met. Most official skills still have a handful of active items, and many of those items do not score 12 on this audit. Filling 66 official skills at 50 original items each, with 25 different frames per skill, was not completed.

## Blueprint

Existing practice exams still reference the same question IDs. SAT adaptive routing still uses the previous difficulty scores, so the easier, middle, and harder Module 2 pools are the same size as before this audit. ACT forms are still fixed, not adaptive. New items are eligible for a harder module, but there are not enough of them to carry a module by themselves.

## Limitations

- The 18-point scores are editorial, not equated to College Board or ACT statistics.
- The bank is not five times harder than the official exams.
- Recommended label changes are recorded and not yet live, because applying them now would break Module 2 and Rapid Fire.
- Thirteen repeated-frame families remain because their extra items are on exams.
- Graphical coverage was not expanded in this batch.
- Tutoring can still reach the current Easy and Medium items. It cannot yet rely on a separate Foundation label in the question row.
