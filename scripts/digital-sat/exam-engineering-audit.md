# SAT / ACT engineering audit

Status: initial audit; rebuild not completed. User specification received through
Part 5 and ends mid-sentence at “researchers measured som”. Remaining requirements
must be collected before finalizing the complete rebuild.

## Official specifications checked

- SAT: https://satsuite.collegeboard.org/sat/whats-on-the-test/structure
  54 Reading & Writing / 64 minutes, 44 Math / 70 minutes, two adaptive modules
  per section, 10-minute break between sections. 134 minutes excludes the break.
- ACT: https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/act-exam-sections-and-structure.html
  Enhanced core: English 50 / 35 minutes, Math 45 / 50 minutes, Reading 36 /
  40 minutes; optional Science 40 / 40 minutes and Writing 1 essay / 40 minutes.
  Core total 131 questions / 125 minutes, excluding breaks. Official scored counts
  differ from administered counts: English 40, Math 41, Reading 27, Science 34.

## Confirmed implementation gaps

- `buildPracticeModules` and `fullTestCount` discard test type; shared legacy
  helpers cannot express current SAT and enhanced ACT independently.
- SAT format 2 has correct module sizes/times, but only Math adaptive pools.
- No scheduled full-test 10-minute SAT inter-section break is represented in
  the module model.
- Existing SAT Reading & Writing items include repeated stimuli, stems depending
  entirely on choices, and vocabulary questions referencing absent words.
- Current Math bank is shared across 36 catalogs; editorial difficulty is not
  empirically calibrated. Global increasing difficulty ordering needs revision
  against the new Module 1 requirement.
- SAT routing uses a practice raw-count threshold, not calibrated ability.
- Results use raw practice accuracy and estimated analytics, not official
  equated scoring. Perfect scoring equivalence cannot be claimed.
- Item metadata needs solve-time estimates, subskills, explicit module
  eligibility, and individual distractor rationales.

## Rebuild requirements already received

- Separate SAT and ACT specifications, generation, banks, and difficulty models.
- Fully original items, passages, datasets, figures and choices; no official
  question reconstruction or close paraphrase.
- SAT Reading & Writing: four choices per item, short academic stimuli,
  both-section adaptation, complete domain and grammar coverage.
- Quality gates for unique keys, sufficient context, plausible distractors,
  original diverse scenarios, and reasoning-based difficulty.
- Database persistence and authenticated flow validation remain mandatory.

No new exam content or catalog records were changed during this initial audit.
