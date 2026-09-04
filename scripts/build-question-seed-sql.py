#!/usr/bin/env python3
"""Build SQL for source documents, original bank, strategies, mappings."""
from __future__ import annotations

import json
import re
from pathlib import Path

inspect = json.loads(Path("/tmp/exam-inspect.json").read_text())
bank = json.loads(Path("/tmp/original-bank.json").read_text())
english = json.loads(Path("/Users/dylannazarian/Desktop/SATACTstudy.com/src/lib/questions/english-strategies.ts").read_text()) if False else None


def sql_str(s: object) -> str:
    if s is None:
        return "NULL"
    if isinstance(s, bool):
        return "true" if s else "false"
    if isinstance(s, (int, float)):
        return str(s)
    t = str(s).replace("'", "''")
    return f"'{t}'"


def detected_for(row: dict) -> int:
    if row["source_type"] == "answer_key":
        return 98 if row["exam_type"] in ("SAT", "PSAT") else 215
    if row["exam_type"] == "SAT":
        return 98
    if row.get("commercial_prep"):
        return 2150
    if row["exam_type"] == "ACT":
        return 215
    return row.get("question_numbers_count") or 0


# Source documents
lines = ["BEGIN;"]
for i, r in enumerate(inspect, 1):
    did = f"f3300000-0000-0000-0000-{i:012d}"
    r["_id"] = did
    det = detected_for(r)
    notes = (
        "Official College Board/ACT or commercial prep. Verbatim republication is not authorized. "
        "Recorded for skill mapping and internal reference only. Original StudentQuest items were authored from the tested skills."
        if r["source_rights_status"] == "reference_only"
        else ""
    )
    meta = {
        "page_count": r["page_count"],
        "sections": r["sections_detected"],
        "likely_digital": r["likely_digital"],
        "bytes": r["bytes"],
    }
    lines.append(
        "INSERT INTO public.source_documents (id, filename, folder, exam_type, exam_year, exam_name, exam_number, source_type, source_rights_status, contains_answer_key, processing_status, page_count, question_count_detected, question_count_imported, question_count_needing_review, checksum, notes, metadata) VALUES ("
        + ", ".join([
            sql_str(did),
            sql_str(r["filename"]),
            sql_str(r["folder"]),
            sql_str(r["exam_type"]),
            sql_str(r.get("exam_year")),
            sql_str(Path(r["filename"]).stem[:120] if False else r["filename"].replace(".pdf", "")),
            sql_str(r.get("exam_number")) if r.get("exam_number") is not None else "NULL",
            sql_str(r["source_type"]),
            sql_str("reference_only"),
            sql_str(r["contains_answer_key"]),
            sql_str("skipped" if r["source_type"] == "answer_key" else "parsed"),
            sql_str(r["page_count"]),
            sql_str(det),
            "0",
            sql_str(det),
            sql_str(r["checksum"]),
            sql_str(notes),
            f"'{json.dumps(meta).replace(chr(39), chr(39)+chr(39))}'::jsonb",
        ])
        + ") ON CONFLICT (checksum) DO UPDATE SET processing_status = EXCLUDED.processing_status, question_count_detected = EXCLUDED.question_count_detected;"
    )
    lines.append(
        "INSERT INTO public.question_import_staging (source_document_id, exam_type, section_name, question_text, answer_verification_status, source_rights_status, review_status, verification_notes, metadata) VALUES ("
        + ", ".join([
            sql_str(did),
            sql_str(r["exam_type"]),
            sql_str(", ".join(r["sections_detected"]) or None),
            sql_str("[copyrighted source — not stored] Structure detected only."),
            sql_str("needs_review"),
            sql_str("reference_only"),
            sql_str("needs_review"),
            sql_str("Exact question wording was not imported. Original StudentQuest items cover the same skills."),
            f"'{{ \"detected\": {det}, \"filename\": {json.dumps(r['filename'])} }}'::jsonb",
        ])
        + ");"
    )

# Subtopics
for s in bank["subtopics"]:
    lines.append(
        f"INSERT INTO public.subtopics (id, topic_id, name, sort_order) VALUES ({sql_str(s['id'])}, {sql_str(s['topic_id'])}, {sql_str(s['name'])}, {s['sort_order']}) ON CONFLICT (id) DO NOTHING;"
    )

# Passages
SAT_TEST = "a1000000-0000-0000-0000-000000000001"
ACT_TEST = "a1000000-0000-0000-0000-000000000002"
SAT_RW = "b1000000-0000-0000-0000-000000000002"
ACT_READ = "b1000000-0000-0000-0000-000000000005"
ACT_SCI = "b1000000-0000-0000-0000-000000000006"
section_for = {
    ("SAT", "Reading and Writing"): SAT_RW,
    ("ACT", "Reading"): ACT_READ,
    ("ACT", "Science"): ACT_SCI,
    ("ACT", "English"): "b1000000-0000-0000-0000-000000000003",
}
for p in bank["passages"]:
    sid = section_for.get((p["test_type"], p["section_name"]))
    tid = SAT_TEST if p["test_type"] == "SAT" else ACT_TEST
    lines.append(
        "INSERT INTO public.passages (id, test_id, section_id, title, author, content, source_type, source_rights_status, active) VALUES ("
        + ", ".join([
            sql_str(p["id"]), sql_str(tid), sql_str(sid), sql_str(p["title"]), sql_str(p["author"]),
            sql_str(p["content"]), sql_str("original"), sql_str("owned"), "true",
        ])
        + ") ON CONFLICT (id) DO NOTHING;"
    )

# English strategies from TS-like list — duplicate the 8 here briefly by reading the TS file
ts = Path("/Users/dylannazarian/Desktop/SATACTstudy.com/src/lib/questions/english-strategies.ts").read_text()
# We'll insert via a separate known list in this script after import from JSON dump
Path("/tmp/seed-part1.sql").write_text("\n".join(lines) + "\nCOMMIT;\n")
print("part1", Path("/tmp/seed-part1.sql").stat().st_size, "docs", len(inspect))

# Questions
qlines = ["BEGIN;"]
for q in bank["questions"]:
    diff = {"easy": "Easy", "medium": "Medium", "hard": "Hard"}[q["difficulty"]]
    cols = {
        "id": q["id"],
        "topic_id": q["topic_id"],
        "test_type": q["test_type"],
        "section_name": q["section_name"],
        "category_name": q["category_name"],
        "topic_name": q["topic_name"],
        "difficulty": diff,
        "question_text": q["question_text"],
        "choice_a": q.get("choice_a"),
        "choice_b": q.get("choice_b"),
        "choice_c": q.get("choice_c"),
        "choice_d": q.get("choice_d"),
        "choice_e": q.get("choice_e"),
        "correct_answer": q["correct_answer"],
        "official_explanation": q["explanation"],
        "source_type": q["source_type"],
        "source_rights_status": q["source_rights_status"],
        "source": "StudentQuest original (skills derived from official exam structure, not wording)",
        "question_type": q["question_type"],
        "answer_verification_status": "authored",
        "difficulty_score": q["difficulty_score"],
        "calculator_allowed": q["calculator_allowed"],
        "desmos_useful": q["desmos_useful"],
        "desmos_mode": q["desmos_mode"],
        "reasoning_type": q["reasoning_type"],
        "fingerprint": q["fingerprint"],
        "review_status": "approved",
        "approved": True,
        "active": True,
        "passage_id": q.get("passage_id"),
        "exam_name": "StudentQuest original bank",
    }
    if q.get("question_type") == "spr":
        cols["calculator_config"] = json.dumps({"calculator_enabled": q["calculator_allowed"], "calculator_recommended": q["desmos_useful"]})
    else:
        cols["calculator_config"] = json.dumps({"calculator_enabled": q["calculator_allowed"], "calculator_recommended": q["desmos_useful"]})
    names = []
    vals = []
    for k, v in cols.items():
        names.append(k)
        if k == "calculator_config":
            vals.append(f"{sql_str(v)}::jsonb")
        else:
            vals.append(sql_str(v))
    qlines.append(
        f"INSERT INTO public.questions ({', '.join(names)}) VALUES ({', '.join(vals)}) ON CONFLICT (id) DO NOTHING;"
    )
    # choices table
    pos = 0
    for label, key in [("A", "choice_a"), ("B", "choice_b"), ("C", "choice_c"), ("D", "choice_d"), ("E", "choice_e")]:
        content = q.get(key)
        if not content:
            continue
        pos += 1
        qlines.append(
            "INSERT INTO public.question_choices (question_id, label, content, position, is_correct) VALUES ("
            f"{sql_str(q['id'])}, {sql_str(label)}, {sql_str(content)}, {pos}, {sql_str(label == q['correct_answer'])}"
            ") ON CONFLICT DO NOTHING;"
        )
    qlines.append(
        "INSERT INTO public.question_topic_mappings (question_id, topic_id, relationship, weight, confidence) VALUES ("
        f"{sql_str(q['id'])}, {sql_str(q['topic_id'])}, 'primary', 1, 1) ON CONFLICT DO NOTHING;"
    )
    if q.get("secondary_topic_id"):
        qlines.append(
            "INSERT INTO public.question_topic_mappings (question_id, topic_id, relationship, weight, confidence) VALUES ("
            f"{sql_str(q['id'])}, {sql_str(q['secondary_topic_id'])}, 'secondary', 0.4, 0.85) ON CONFLICT DO NOTHING;"
        )

qlines.append("COMMIT;")
Path("/tmp/seed-questions.sql").write_text("\n".join(qlines))
print("questions sql", Path("/tmp/seed-questions.sql").stat().st_size)
Path("/Users/dylannazarian/Desktop/SATACTstudy.com/src/lib/questions/original-bank.json").write_text(
    json.dumps({"passages": bank["passages"], "questions": bank["questions"], "subtopics": bank["subtopics"]})
)
print("copied json into repo")
