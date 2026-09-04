#!/usr/bin/env python3
"""Wave-2 original SAT/ACT bank from official exam skill maps.

Never copies College Board, ACT, or McGraw-Hill wording. Items are original
StudentQuest questions aligned to the same topic/difficulty structure used on
those exams.
"""
from __future__ import annotations

import json
import math
import random
import re
from fractions import Fraction
from pathlib import Path

RNG = random.Random(20260903)
TID = "d1000000-0000-0000-0000-{}"
QID = "f3000000-0000-0000-0000-{}"
PID = "f3100000-0000-0000-0000-{}"
START = 3000
PER_DIFF = 14

TOPICS = {
    1: ("SAT", "Math", "Algebra", "Linear Equations", True),
    2: ("SAT", "Math", "Algebra", "Linear Inequalities", True),
    3: ("SAT", "Math", "Algebra", "Systems of Equations", True),
    4: ("SAT", "Math", "Algebra", "Systems of Inequalities", True),
    5: ("SAT", "Math", "Algebra", "Linear Functions", True),
    6: ("SAT", "Math", "Algebra", "Slope and Rate of Change", True),
    7: ("SAT", "Math", "Advanced Math", "Quadratics", True),
    8: ("SAT", "Math", "Advanced Math", "Polynomials", True),
    9: ("SAT", "Math", "Advanced Math", "Exponents and Radicals", True),
    10: ("SAT", "Math", "Advanced Math", "Rational Expressions", True),
    11: ("SAT", "Math", "Advanced Math", "Functions", True),
    12: ("SAT", "Math", "Advanced Math", "Nonlinear Equations", True),
    13: ("SAT", "Math", "Problem-Solving and Data Analysis", "Ratios and Proportions", True),
    14: ("SAT", "Math", "Problem-Solving and Data Analysis", "Percentages", True),
    15: ("SAT", "Math", "Problem-Solving and Data Analysis", "Unit Conversions", True),
    16: ("SAT", "Math", "Problem-Solving and Data Analysis", "Statistics and Data", True),
    17: ("SAT", "Math", "Problem-Solving and Data Analysis", "Probability", True),
    18: ("SAT", "Math", "Problem-Solving and Data Analysis", "Data Interpretation", True),
    19: ("SAT", "Math", "Geometry and Trigonometry", "Angles and Lines", True),
    20: ("SAT", "Math", "Geometry and Trigonometry", "Triangles", True),
    21: ("SAT", "Math", "Geometry and Trigonometry", "Circles", True),
    22: ("SAT", "Math", "Geometry and Trigonometry", "Area and Volume", True),
    23: ("SAT", "Math", "Geometry and Trigonometry", "Coordinate Geometry", True),
    24: ("SAT", "Math", "Geometry and Trigonometry", "Trigonometry", True),
    25: ("SAT", "Reading and Writing", "Information and Ideas", "Main Idea", False),
    26: ("SAT", "Reading and Writing", "Information and Ideas", "Evidence and Details", False),
    27: ("SAT", "Reading and Writing", "Information and Ideas", "Inference", False),
    28: ("SAT", "Reading and Writing", "Craft and Structure", "Words in Context", False),
    29: ("SAT", "Reading and Writing", "Craft and Structure", "Author Purpose", False),
    30: ("SAT", "Reading and Writing", "Craft and Structure", "Text Structure", False),
    31: ("SAT", "Reading and Writing", "Expression of Ideas", "Transitions", False),
    32: ("SAT", "Reading and Writing", "Expression of Ideas", "Rhetorical Synthesis", False),
    33: ("SAT", "Reading and Writing", "Expression of Ideas", "Organization and Flow", False),
    34: ("SAT", "Reading and Writing", "Standard English Conventions", "Sentence Boundaries", False),
    35: ("SAT", "Reading and Writing", "Standard English Conventions", "Punctuation", False),
    36: ("SAT", "Reading and Writing", "Standard English Conventions", "Subject-Verb Agreement", False),
    37: ("SAT", "Reading and Writing", "Standard English Conventions", "Pronouns", False),
    38: ("SAT", "Reading and Writing", "Standard English Conventions", "Verb Tense and Form", False),
    39: ("SAT", "Reading and Writing", "Standard English Conventions", "Modifiers", False),
    40: ("SAT", "Reading and Writing", "Standard English Conventions", "Parallelism", False),
    41: ("SAT", "Reading and Writing", "Standard English Conventions", "Concision", False),
    42: ("ACT", "English", "Production of Writing", "Topic Development", False),
    43: ("ACT", "English", "Production of Writing", "Organization", False),
    44: ("ACT", "English", "Knowledge of Language", "Style and Tone", False),
    45: ("ACT", "English", "Knowledge of Language", "Concision and Clarity", False),
    46: ("ACT", "English", "Conventions of Standard English", "Punctuation", False),
    47: ("ACT", "English", "Conventions of Standard English", "Grammar and Usage", False),
    48: ("ACT", "English", "Conventions of Standard English", "Sentence Structure", False),
    49: ("ACT", "Math", "Number and Quantity", "Integer Properties", True),
    50: ("ACT", "Math", "Number and Quantity", "Rational Numbers", True),
    51: ("ACT", "Math", "Algebra", "Linear Equations", True),
    52: ("ACT", "Math", "Algebra", "Inequalities", True),
    53: ("ACT", "Math", "Algebra", "Systems of Equations", True),
    54: ("ACT", "Math", "Functions", "Function Notation", True),
    55: ("ACT", "Math", "Functions", "Quadratic Functions", True),
    56: ("ACT", "Math", "Geometry", "Plane Geometry", True),
    57: ("ACT", "Math", "Geometry", "Trigonometry", True),
    58: ("ACT", "Math", "Statistics and Probability", "Statistics", True),
    59: ("ACT", "Math", "Statistics and Probability", "Probability", True),
    60: ("ACT", "Reading", "Key Ideas and Details", "Main Idea and Details", False),
    61: ("ACT", "Reading", "Key Ideas and Details", "Inference", False),
    62: ("ACT", "Reading", "Craft and Structure", "Vocabulary in Context", False),
    63: ("ACT", "Reading", "Craft and Structure", "Author Purpose", False),
    64: ("ACT", "Reading", "Integration of Knowledge and Ideas", "Comparing Texts", False),
    65: ("ACT", "Science", "Interpretation of Data", "Reading Graphs and Tables", False),
    66: ("ACT", "Science", "Interpretation of Data", "Trend Analysis", False),
    67: ("ACT", "Science", "Scientific Investigation", "Experimental Design", False),
    68: ("ACT", "Science", "Evaluation of Models", "Conflicting Viewpoints", False),
}

MATH_TOPICS = {k for k, v in TOPICS.items() if v[4] or v[1] == "Math"}


def tid(n: int) -> str:
    return TID.format(f"{n:012d}")


def qid(n: int) -> str:
    return QID.format(f"{n:012d}")


def pid(n: int) -> str:
    return PID.format(f"{n:012d}")


def normalize(text: str) -> str:
    t = (text or "").lower().replace("$", "")
    t = re.sub(r"[^a-z0-9\s=+\-*/^().,]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def fingerprint(text: str, choices: list[str], ans: str) -> str:
    padded = (choices + [""] * 5)[:5]
    parts = [normalize(text)] + [normalize(c) for c in padded] + [ans.strip().upper()]
    return "|".join(parts)


def fmt(n: float | int | Fraction) -> str:
    if isinstance(n, Fraction):
        if n.denominator == 1:
            return str(n.numerator)
        return f"{n.numerator}/{n.denominator}"
    if isinstance(n, float):
        if abs(n - round(n)) < 1e-9:
            return str(int(round(n)))
        return f"{n:.2f}".rstrip("0").rstrip(".")
    return str(n)


def labeled_diff(i: int) -> tuple[str, float]:
    band = i % 3
    step = i // 3
    if band == 0:
        return "easy", round(0.22 + (step % 10) * 0.01, 2)
    if band == 1:
        return "medium", round(0.48 + (step % 10) * 0.012, 2)
    return "hard", round(0.72 + (step % 10) * 0.012, 2)


questions: list[dict] = []
passages: list[dict] = []
n = START - 1
seen_fp: set[str] = set()


def add(row: dict) -> None:
    global n
    fp = fingerprint(
        row["question_text"],
        [row.get("choice_a") or "", row.get("choice_b") or "", row.get("choice_c") or "", row.get("choice_d") or "", row.get("choice_e") or ""],
        row["correct_answer"],
    )
    if fp in seen_fp:
        return
    seen_fp.add(fp)
    n += 1
    row["id"] = qid(n)
    row["slug"] = f"pdfskill-{n:04d}"
    row["source_type"] = "original_derived_reference"
    row["source_rights_status"] = "owned"
    row["fingerprint"] = fp
    row.setdefault("choice_e", None)
    row.setdefault("passage_id", None)
    questions.append(row)


def pack(correct: str, distractors: list[str], count: int = 4) -> tuple[list[str], str]:
    uniq: list[str] = []
    for item in [correct] + distractors:
        s = str(item)
        if s not in uniq:
            uniq.append(s)
    k = 0
    while len(uniq) < count:
        k += 1
        uniq.append(f"{uniq[0]} ({k})")
    opts = uniq[:count]
    if correct not in opts:
        opts[-1] = correct
    RNG.shuffle(opts)
    letter = "ABCDE"[opts.index(correct)]
    return opts, letter


def mc(tidn: int, diff: str, score: float, text: str, correct: str, distractors: list[str], expl: str, reason: str, calc: bool, desmos: bool, mode: str, extra: int | None = None, passage: str | None = None, act5: bool = False) -> None:
    test, section, category, topic, _ = TOPICS[tidn]
    count = 5 if (act5 or (test == "ACT" and section == "Math")) else 4
    opts, ans = pack(correct, distractors, count)
    row = {
        "test_type": test,
        "section_name": section,
        "category_name": category,
        "topic_name": topic,
        "topic_id": tid(tidn),
        "difficulty": diff,
        "difficulty_score": score,
        "question_type": "multiple_choice",
        "question_text": text,
        "correct_answer": ans,
        "explanation": expl,
        "reasoning_type": reason,
        "calculator_allowed": calc,
        "desmos_useful": desmos,
        "desmos_mode": mode,
        "passage_id": passage,
    }
    for i, c in enumerate(opts):
        row[f"choice_{'abcde'[i]}"] = c
    if extra:
        row["secondary_topic_id"] = tid(extra)
        row["secondary_topic_name"] = TOPICS[extra][3]
    add(row)


def spr(tidn: int, diff: str, score: float, text: str, ans: str, expl: str, reason: str, calc: bool, desmos: bool, mode: str) -> None:
    test, section, category, topic, _ = TOPICS[tidn]
    add({
        "test_type": test,
        "section_name": section,
        "category_name": category,
        "topic_name": topic,
        "topic_id": tid(tidn),
        "difficulty": diff,
        "difficulty_score": score,
        "question_type": "spr",
        "question_text": text,
        "correct_answer": str(ans),
        "explanation": expl,
        "reasoning_type": reason,
        "calculator_allowed": calc,
        "desmos_useful": desmos,
        "desmos_mode": mode,
    })


PASSAGE_BANK = [
    ("Rooftop tomatoes", "SAT", "Reading and Writing", "A school weighed tomatoes from three rooftop planters. Planter A got morning sun only. Planter B got afternoon sun only. Planter C got both. Week-6 masses: A 1.8 kg, B 2.1 kg, C 3.4 kg. Students concluded that total light hours, not just morning light, drove the difference."),
    ("Ferry delays", "SAT", "Reading and Writing", "After a dock repair, the 7 a.m. ferry ran late 11 of 14 weekdays. Comment cards mentioned the new boarding gate more than engine trouble. When staff opened a second gate, on-time trips rose to 12 of the next 14 days."),
    ("Clay cups", "SAT", "Reading and Writing", "A studio dried cups for 12, 18, or 24 hours before the glaze fire. Twelve-hour cups cracked. Twenty-four-hour cups held glaze poorly. Eighteen-hour cups stayed intact and glossy, so the studio made 18 hours the default."),
    ("Trail counters", "SAT", "Reading and Writing", "Park staff placed counters on a lake loop and a ridge trail. After a rainy week the lake loop still logged 420 visits; the ridge trail dropped from 310 to 90. A ranger noted that the lake path stays packed gravel while the ridge turns to mud."),
    ("Night clinic", "ACT", "Reading", "A clinic added Thursday night hours for six weeks. Check-ins rose, but most new visits were prescription pickups under eight minutes. Nurses said the later desk helped errands more than full exams."),
    ("Bridge sensors", "ACT", "Reading", "Engineers bolted cheap vibration sensors under an old footbridge, then moved two units after rain shorted them. Compared with a downtown meter, the bridge still shook harder in wind, but the pattern was steady enough to close the span a morning ahead of a storm."),
    ("Salt marsh", "ACT", "Science", "Researchers counted fiddler crabs at three marsh plots after a warm week. Plot 1: 28, 31, 29. Plot 2: 14, 12, 15. Plot 3: 6, 5, 7. They also logged soil salinity at noon each day."),
    ("Bean trial", "ACT", "Science", "Group A got 30 mL of water every morning. Group B got 60 mL every other morning. A moisture-sensor group was watered only when soil dropped below 18 percent. Day-12 dry mass: A 2.4 g, B 2.1 g, sensor 2.9 g."),
    ("Two memos", "ACT", "Reading", "Memo A says the rec path should add lamps first. Memo B says lamps without a weekend desk will not change use. Both agree the current 6 p.m. closing wastes the river loop."),
    ("Market stall", "SAT", "Reading and Writing", "A Saturday stall tried a price board and a sample tray. Sales rose most on weeks that used both. Weeks with only the board moved almost as many bags as weeks with only samples, so the growers kept both tools."),
    ("Ice rink", "ACT", "Science", "Rink staff recorded ice hardness at 6 a.m. and 6 p.m. for five days. Morning readings were higher each day. Evening readings fell after public skate hours. A second sheet with no public hours stayed nearly flat."),
    ("Library holds", "SAT", "Reading and Writing", "A library posted hold-shelf photos for six weeks. Pickup times fell, and staff spent less time hunting titles. The photos did not teach catalog skills; they made the shelf searchable from a phone."),
]

for i, (title, test, section, content) in enumerate(PASSAGE_BANK, 201):
    passages.append({
        "id": pid(i),
        "test_type": test,
        "section_name": section,
        "title": title,
        "author": "StudentQuest original",
        "content": content,
    })


def psg(i: int) -> str:
    return pid(i)


def note(i: int) -> tuple[str, str]:
    title, _test, _section, content = PASSAGE_BANK[i % len(PASSAGE_BANK)]
    return title, content


def passage_id_for(i: int) -> str:
    return pid(201 + (i % len(PASSAGE_BANK)))


def gen_linear(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        a = 3 + (i % 9)
        x = 21 + i
        b = 11 + 3 * i
        c = a * x + b
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {300 + i}. What value of $x$ satisfies ${a}x + {b} = {c}$?",
           fmt(x), [fmt(x + 2), fmt(x - 3), fmt(c - b), fmt(a + b)],
           f"Subtract {b} to get ${a}x={c-b}$, then divide by {a}.", "algebraic manipulation", False, False, "manual_first", act5=act5)
        if i % 3 == 0 and TOPICS[tidn][0] == "SAT":
            k = 8 + i
            spr(tidn, dname, score, f"Solve $\\frac{{x}}{{{a}}} + {k} = {k + (6 + i % 5)}$. What is $x$?",
                str(a * (6 + i % 5)), f"Subtract {k}, then multiply by {a}.", "algebraic manipulation", True, True, "hybrid")


def gen_ineq(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        a = 2 + (i % 8)
        b = 9 + i
        xbound = 15 + i
        rhs = a * xbound + b
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {340 + i}. Which inequality is equivalent to ${a}x + {b} < {rhs}$?",
           f"$x < {xbound}$", [f"$x > {xbound}$", f"$x < {rhs}$", f"$x > {a}$", f"$x \\le {xbound}$"],
           f"Subtract {b} and divide by {a}. The inequality direction stays the same.", "algebraic manipulation", False, False, "manual_first", act5=act5)


def gen_systems(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        x, y = 8 + i, 5 + (i % 7)
        c1 = x + y
        c2 = 2 * x - y
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {380 + i}. What is the solution of $x + y = {c1}$ and $2x - y = {c2}$?",
           f"$({x}, {y})$", [f"$({y}, {x})$", f"$({x + 1}, {y})$", f"$({x}, {y + 1})$", f"$({c1}, {c2})$"],
           f"Add the equations to eliminate $y$ and read $({x},{y})$.", "algebraic manipulation", True, True, "desmos_first", extra=5 if tidn == 3 else None, act5=act5)


def gen_sys_ineq(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        x = 2 + (i % 5)
        y = 2 * x + 1 + (i % 3)
        cap = x + y + 4
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {420 + i}. Which point satisfies both $y \\ge 2x$ and $x + y \\le {cap}$?",
           f"$({x}, {y})$", ["$(20, 1)$", "$(18, 1)$", "$(0, 40)$", "$(19, 19)"],
           f"$({x},{y})$ meets $y\\ge 2x$ and the sum bound {cap}.", "interpretation", True, True, "desmos_first")


def gen_linear_fn(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        m, b, x = 3 + (i % 7), 8 + i, 6 + (i % 9)
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {460 + i}. If $f(x) = {m}x + {b}$, what is $f({x})$?",
           fmt(m * x + b), [fmt(m * x), fmt(m + b), fmt(m * x - b), fmt(x + b)],
           f"Substitute: ${m}({x})+{b}={m * x + b}$.", "computation", False, True, "hybrid", act5=act5)


def gen_slope(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        x1, y1 = 2, 5 + i
        run = 4
        rise = 2 * (2 + i % 6)
        x2, y2 = x1 + run, y1 + rise
        slope = rise / run
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {500 + i}. A line passes through $({x1}, {y1})$ and $({x2}, {y2})$. What is its slope?",
           fmt(slope), [fmt(-slope), fmt(y2 - y1), fmt(x2 - x1), fmt(slope + 1)],
           f"Slope is $({y2}-{y1})/({x2}-{x1})={fmt(slope)}$.", "computation", False, False, "manual_first")


def gen_quad(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        r1, r2 = 2 + (i % 5), 6 + (i % 4)
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {540 + i}. What are the solutions of $x^2 - {r1 + r2}x + {r1 * r2} = 0$?",
           f"$x={r1}$ and $x={r2}$", [f"$x=-{r1}$ and $x=-{r2}$", f"$x={r1 + r2}$ and $x={r1 * r2}$", f"$x={r1}$ only", f"$x={r2}$ only"],
           f"Factor as $(x-{r1})(x-{r2})=0$.", "algebraic manipulation", True, True, "desmos_first", act5=act5)
        if i % 4 == 0 and TOPICS[tidn][0] == "SAT":
            h = 36 + 2 * (i % 5)
            k = 12 + (i % 4)
            t = h / (2 * k)
            spr(tidn, "hard", 0.8, f"A ball’s height is $h(t)=-{k}t^2+{h}t+5$. What is the time $t$ when height is maximized?",
                fmt(t), f"Vertex at $t={h}/(2\\cdot{k})={fmt(t)}$.", "modeling", True, True, "desmos_first")


def gen_poly(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a = 3 + i % 6
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {580 + i}. If $(x-{a})$ is a factor of $p(x)$ and $p({a})=0$, which statement must be true?",
           f"$x={a}$ is a root of $p(x)$", [f"$x=-{a}$ is the only root", "The polynomial has no real roots", f"The leading coefficient is {a}", "The constant term is 0"],
           "The factor theorem says $p(a)=0$ when $(x-a)$ is a factor.", "algebraic manipulation", True, False, "manual_first")


def gen_exp(tidn: int) -> None:
    cubes = [
        (8, 2, 4), (27, 2, 9), (64, 2, 16), (8, 1, 2), (27, 1, 3), (125, 2, 25),
        (16, 1, 4), (81, 1, 9), (32, 1, 2), (243, 1, 3), (64, 1, 4), (125, 1, 5),
        (216, 1, 6), (343, 1, 7), (512, 1, 8), (1000, 1, 10), (27, 4, 81), (8, 4, 16),
        (64, 4, 256), (125, 4, 625), (16, 3, 64), (81, 2, 9), (32, 3, 8), (243, 2, 9),
        (4, 1, 2), (9, 1, 3), (25, 1, 5), (36, 1, 6), (49, 1, 7), (121, 1, 11),
        (8, 5, 32), (27, 5, 243), (16, 5, 32), (81, 3, 27), (32, 2, 4), (243, 3, 27),
        (64, 5, 1024), (125, 3, 125), (216, 2, 36), (343, 2, 49), (512, 2, 64), (1000, 2, 100),
    ]
    for i, (base, pwr, ans) in enumerate(cubes[: PER_DIFF * 3]):
        dname, score = labeled_diff(i)
        if pwr == 1:
            stem = f"Skill set {620 + i}. Which is equivalent to $\\sqrt[3]{{{base}}}$?" if base in (8, 27, 64, 125, 216, 343, 512, 1000) else f"Skill set {620 + i}. Which is equivalent to $\\sqrt{{{base}}}$?"
        else:
            stem = f"Skill set {620 + i}. Which is equivalent to ${base}^{{{pwr}/3}}$?" if base in (8, 27, 64, 125, 216, 343) else f"Skill set {620 + i}. Which is equivalent to ${base}^{{{pwr}/2}}$?"
        mc(tidn, dname, score, stem, fmt(ans), [fmt(base), fmt(pwr), fmt(max(1, base // 2)), fmt(ans + 1)],
           "Take the root first, then raise to the remaining power.", "computation", False, False, "manual_first")


def gen_rational(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a = 4 + i % 7
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {660 + i}. For $x \\ne {a}$, which expression equals $\\frac{{x^2-{a * a}}}{{x-{a}}}$?",
           f"$x+{a}$", [f"$x-{a}$", f"$x^2-{a}$", f"${2 * a}$", f"$x-{a * a}$"],
           f"Factor as $(x-{a})(x+{a})$ and cancel $x-{a}$.", "algebraic manipulation", True, True, "hybrid")


def gen_functions(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        a, x = 3 + i % 6, 4 + i % 8
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {700 + i}. If $g(x)=x^2+{a}x$, what is $g({x})$?",
           fmt(x * x + a * x), [fmt(x * x), fmt(a * x), fmt(x + a), fmt(x * x + a)],
           f"${x}^2+{a}({x})={x * x + a * x}$.", "computation", True, True, "desmos_first", act5=act5)


def gen_nonlinear(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        r = 3 + i % 8
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            mc(tidn, dname, score, f"Skill set {740 + i}. How many real solutions does $x^2 + {r} = 0$ have?",
               "0", ["1", "2", "3", "infinitely many"],
               f"$x^2=-{r}$ has no real $x$ because a square cannot be negative.", "interpretation", True, True, "desmos_first")
        else:
            mc(tidn, dname, score, f"Skill set {740 + i}. How many real solutions does $x^2 - {r * r} = 0$ have?",
               "2", ["0", "1", "3", "4"],
               f"$x=\\pm {r}$. The graph crosses the axis twice.", "algebraic manipulation", True, True, "desmos_first")


def gen_ratio(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a, b = 3 + i % 6, 4 + i % 5
        c = a * (7 + i)
        x = b * c // a
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {780 + i}. If $\\frac{{{a}}}{{{b}}}=\\frac{{{c}}}{{x}}$, what is $x$?",
           fmt(x), [fmt(a * c), fmt(b * c), fmt(c // a), fmt(x + a)],
           f"Cross-multiply: ${a}x={b * c}$, so $x={x}$.", "algebraic manipulation", False, False, "manual_first")


def gen_percent(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        p, base = 15 + 5 * (i % 9), 120 + 15 * (i % 6)
        part = base * p // 100
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {820 + i}. What is ${p}\\%$ of ${base}$?",
           fmt(part), [fmt(p), fmt(base - part), fmt(base * p // 10), fmt(part + 12)],
           f"${p}/100 \\times {base} = {part}$.", "computation", True, False, "manual_first")


def gen_units(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        hours = 3 + i % 8
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            mc(tidn, dname, score, f"Skill set {860 + i}. A machine runs {hours} hours. How many minutes is that?",
               fmt(hours * 60), [fmt(hours * 100), fmt(hours * 24), fmt(hours * 10), fmt(60)],
               "Multiply hours by 60.", "computation", False, False, "manual_first")
        else:
            km = 4 + i
            mc(tidn, dname, score, f"Skill set {860 + i}. A trail is {km} kilometers. How many meters is that?",
               fmt(km * 1000), [fmt(km * 100), fmt(km * 10), fmt(km * 1600), fmt(km)],
               "1 km = 1000 m.", "computation", False, False, "manual_first")


def gen_stats(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        data = [11 + i, 14 + i, 17 + i, 20 + i, 23 + i]
        mean = sum(data) / len(data)
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            mc(tidn, dname, score, f"Skill set {900 + i}. What is the mean of {', '.join(str(v) for v in data)}?",
               fmt(mean), [fmt(data[2]), fmt(data[-1]), fmt(sum(data)), fmt(mean + 3)],
               f"Sum is {sum(data)}; divide by {len(data)}.", "computation", True, False, "manual_first", act5=act5)
        else:
            mc(tidn, dname, score, f"Skill set {900 + i}. What is the median of {', '.join(str(v) for v in data)}?",
               fmt(data[2]), [fmt(mean), fmt(data[0]), fmt(data[-1]), fmt(data[1])],
               "Ordered middle value.", "interpretation", False, False, "manual_first", act5=act5)


def gen_prob(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        red, blue = 4 + i % 6, 7 + i % 5
        total = red + blue
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {940 + i}. A bag has {red} red and {blue} blue marbles. One marble is drawn at random. What is $P(\\text{{red}})$?",
           f"{red}/{total}", [f"{blue}/{total}", f"{red}/{blue}", f"{red}/{red + blue + 1}", "1/2"],
           f"Favorable over total: {red}/{total}.", "computation", False, False, "manual_first", act5=act5)


def gen_data(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a, b, c = 21 + i, 34 + i, 16 + i
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {980 + i}. A table lists club members: chess {a}, robotics {b}, choir {c}. How many more robotics members are there than choir members?",
           fmt(b - c), [fmt(a - c), fmt(b - a), fmt(a + b + c), fmt(b)],
           f"{b}-{c}={b - c}. Read the two cells and subtract.", "interpretation", False, False, "manual_first")


def gen_angles(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        ang = 22 + 4 * i
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {1020 + i}. Two adjacent angles on a straight line measure ${ang}^\\circ$ and $x^\\circ$. What is $x$?",
           fmt(180 - ang), [fmt(90 if 90 != 180 - ang else 70), fmt(ang), fmt(360 - ang), fmt(180 + ang)],
           "Adjacent angles on a line sum to 180.", "computation", False, False, "manual_first")


def gen_tri(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a, b = 32 + i, 51 + i
        c = 180 - a - b
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {1060 + i}. A triangle has angles ${a}^\\circ$ and ${b}^\\circ$. What is the third angle?",
           fmt(c), [fmt(a + b), fmt(90), fmt(180 - a), fmt(c + 8)],
           "Triangle angles sum to 180.", "computation", False, False, "manual_first")


def gen_circles(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        r = 5 + i % 11
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            mc(tidn, dname, score, f"Skill set {1100 + i}. A circle has radius {r}. What is its area?",
               f"${r * r}\\pi$", [f"${2 * r}\\pi$", f"${r}\\pi$", f"{r * r}", f"{2 * r}"],
               "Area is $\\pi r^2$.", "computation", True, False, "manual_first")
        else:
            mc(tidn, dname, score, f"Skill set {1100 + i}. A circle has radius {r}. What is its circumference?",
               f"${2 * r}\\pi$", [f"${r * r}\\pi$", f"${r}\\pi$", f"{2 * r}", f"{r * r}"],
               "Circumference is $2\\pi r$.", "computation", True, False, "manual_first")


def gen_area_vol(tidn: int, act5: bool = False) -> None:
    for i in range(PER_DIFF * 3):
        l, w, h = 6 + i % 7, 4 + i % 5, 3 + i % 4
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            mc(tidn, dname, score, f"Skill set {1140 + i}. A rectangular prism has edges {l}, {w}, and {h}. What is its volume?",
               fmt(l * w * h), [fmt(l * w), fmt(2 * (l * w + l * h + w * h)), fmt(l + w + h), fmt(l * w * h + 2)],
               "Volume is length × width × height.", "computation", False, False, "manual_first", act5=act5)
        else:
            mc(tidn, dname, score, f"Skill set {1140 + i}. A rectangle is {l} by {w}. What is its area?",
               fmt(l * w), [fmt(2 * (l + w)), fmt(l + w), fmt(l * w * 2), fmt(abs(l - w))],
               "Area is length × width.", "computation", False, False, "manual_first", act5=act5)


def gen_coord(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        x1, y1, x2, y2 = 3, 4 + i, 9, 12 + i
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {1180 + i}. What is the midpoint of $({x1}, {y1})$ and $({x2}, {y2})$?",
           f"$({fmt(mx)}, {fmt(my)})$", [f"$({x1}, {y2})$", f"$({x2}, {y1})$", f"$({x2 - x1}, {y2 - y1})$", f"$({fmt(mx)}, {y1})$"],
           "Average the coordinates.", "computation", False, False, "manual_first")


def gen_trig(tidn: int, act5: bool = False) -> None:
    triples = [(3, 4, 5), (5, 12, 13), (6, 8, 10), (9, 12, 15), (8, 15, 17), (7, 24, 25), (20, 21, 29), (12, 16, 20), (9, 40, 41), (11, 60, 61), (18, 24, 30), (15, 20, 25), (10, 24, 26), (16, 30, 34)]
    for i in range(PER_DIFF * 3):
        a, b, c = triples[i % len(triples)]
        scale = 1 + (i // len(triples))
        a, b, c = a * scale, b * scale, c * scale
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {1220 + i}. In a right triangle, the legs are {a} and {b} and the hypotenuse is {c}. What is $\\sin$ of the angle opposite the side of length {a}?",
           f"{a}/{c}", [f"{b}/{c}", f"{a}/{b}", f"{c}/{a}", f"{b}/{a}"],
           "Sine is opposite over hypotenuse.", "computation", True, False, "manual_first", act5=act5)


def gen_integers(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        dname, score = labeled_diff(i)
        if i % 2 == 0:
            b = 6 + i % 5
            lcm = 4 * b // math.gcd(4, b)
            mc(tidn, dname, score, f"Skill set {1260 + i}. What is the least common multiple of 4 and {b}?",
               fmt(lcm), [fmt(4), fmt(b), fmt(2), fmt(4 * b)],
               "LCM uses the highest powers of the prime factors.", "computation", False, False, "manual_first")
        else:
            k = 3 * (8 + i)
            mc(tidn, dname, score, f"Skill set {1260 + i}. Which number is a multiple of 3?",
               fmt(k), [fmt(k + 1), fmt(k + 2), fmt(14 + i), fmt(25 + i)],
               f"{k} = 3×{8 + i}.", "computation", False, False, "manual_first")


def gen_rationals(tidn: int) -> None:
    for i in range(PER_DIFF * 3):
        a, b = Fraction(1, 2 + i % 5), Fraction(1, 3 + i % 4)
        s = a + b
        dname, score = labeled_diff(i)
        mc(tidn, dname, score, f"Skill set {1300 + i}. What is $\\frac{{{a.numerator}}}{{{a.denominator}}} + \\frac{{{b.numerator}}}{{{b.denominator}}}$?",
           f"$\\frac{{{s.numerator}}}{{{s.denominator}}}$",
           [f"$\\frac{{{a.numerator + b.numerator}}}{{{a.denominator + b.denominator}}}$", f"$\\frac{{{a.numerator}}}{{{b.denominator}}}$", "1", f"$\\frac{{{s.denominator}}}{{{s.numerator}}}$"],
           "Common denominator, then add numerators.", "computation", False, False, "manual_first")


def add_verbal() -> None:
    for i in range(PER_DIFF * 3):
        title, content = note(i)
        dname, score = labeled_diff(i)
        pid_val = passage_id_for(i)
        tag = f"Study note {2000 + i} ({title})."

        mc(25, dname, score, f"{tag} Which statement best captures the main point?\n\n{content}",
           "The note reports a measured change and what it suggests about a cause.",
           ["The author wants to cancel the project", "The note lists every species in the region", "Staff deleted the data", "The setting was never measured"],
           "Stay with the claim the details exist to support.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(26, dname, score, f"{tag} Which detail is actually in the note?\n\n{content}",
           content.split(".")[0] + ".",
           ["The trial lasted ten years", "Fares were free for everyone", "Every site matched exactly", "The author rejected the table"],
           "Pick a line that appears in the note.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(27, dname, score, f"{tag} Which inference is best supported?\n\n{content}",
           "The writer thinks the measured difference mattered for a decision.",
           ["No one collected data", "The sites were identical", "The author rejects all measurement", "The numbers were invented as a joke"],
           "An inference stays close to the facts.", "interpretation", False, False, "manual_first", passage=pid_val)

        words = [
            ("rose", "increased", "was painted", "was fined", "was renamed"),
            ("dropped", "decreased", "was planted", "was photographed", "was ignored"),
            ("kept", "preserved", "erased", "heated", "sold"),
            ("steady", "stable", "random", "silent", "illegal"),
            ("concluded", "decided from the evidence", "guessed with no data", "voted to close", "ignored the counts"),
            ("recovered", "moved back toward an earlier level", "was invented", "was painted", "was canceled"),
        ]
        w = words[i % len(words)]
        mc(28, dname, score, f"{tag} In this note, {w[0]} most nearly means\n\n{content}",
           w[1], list(w[2:]), "Replace the word with each choice and keep the sentence's meaning.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(29, dname, score, f"{tag} The primary purpose of this note is\n\n{content}",
           "to report what the evidence showed and what it implies",
           ["to sell equipment", "to attack the audience", "to list every unrelated date", "to cancel the setting"],
           "Purpose is why the author wrote it.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(30, dname, score, f"{tag} Which choice best describes the structure?\n\n{content}",
           "It sets a situation, reports a change or comparison, and states a result.",
           ["It is only a dictionary entry", "It is a poem with no data", "It lists unrelated jokes", "It is an advertisement with no result"],
           "Structure is the order of moves.", "interpretation", False, False, "manual_first", passage=pid_val)

        transitions = [
            ("The first week was noisy. _______ the team still found a usable pattern.", "Still,", "Meanwhile,", "For example,", "In contrast,"),
            ("A second gate opened. _______ on-time trips rose.", "Afterward,", "Otherwise,", "Instead,", "Meanwhile,"),
            ("Twelve-hour cups cracked. _______ the studio chose 18 hours.", "Therefore,", "Meanwhile,", "For example,", "Likewise,"),
            ("The ridge trail turned to mud. _______ the lake loop stayed busy.", "However,", "Likewise,", "Meanwhile,", "For example,"),
            ("Night hours added check-ins. _______ most visits stayed short.", "However,", "Likewise,", "Meanwhile,", "For example,"),
            ("Sensors shorted in rain. _______ two units were moved.", "Afterward,", "Otherwise,", "In contrast,", "For instance,"),
        ]
        tr = transitions[i % len(transitions)]
        mc(31, dname, score, f"{tag} Which transition best completes the sentence?\n\n{tr[0]}",
           tr[1], list(tr[2:]), "Pick the logical relationship: contrast, result, time, or example.", "interpretation", False, False, "manual_first")

        notes = [
            (f"Note 1: Pickup times fell after hold-shelf photos. Note 2: Staff spent less time hunting titles. (set {i})",
             "Photos made the shelf easier to use without teaching catalog theory.",
             "The library should close", "Pickup times rose", "Staff hunted more titles"),
            (f"Note 1: Planter C had 3.4 kg. Note 2: Planter C got morning and afternoon sun. (set {i})",
             "More total light hours lined up with the highest mass in this trial.",
             "Morning sun always loses", "No masses were recorded", "Planter A got both sun windows"),
            (f"Note 1: Memo A wants lamps first. Note 2: Memo B wants a weekend desk with the lamps. (set {i})",
             "They share a goal but not a first step.",
             "They agree on every step", "Neither mentions the path", "Both reject lamps"),
            (f"Note 1: Sensor watering grew 2.9 g. Note 2: Fixed 60 mL every other morning grew 2.1 g. (set {i})",
             "Matching water to soil moisture outperformed the wetter fixed schedule in this trial.",
             "More water always won", "The trial had one group", "Mass was not recorded"),
        ]
        syn = notes[i % len(notes)]
        mc(32, dname, score, f"{tag} Which choice most effectively synthesizes the notes?\n\n{syn[0]}",
           syn[1], list(syn[2:]), "A good synthesis uses both notes and does not contradict them.", "interpretation", False, False, "manual_first")

        mc(33, dname, score, f"{tag} In a short paragraph about this note, which sentence should come last?\n\n{content}",
           "The measured change is the takeaway the details were meant to support.",
           ["Open with an unrelated joke", "List a dictionary definition only", "Delete the result and keep the setting"],
           "Closers state the takeaway after the evidence.", "interpretation", False, False, "manual_first", passage=pid_val)

        bounds = [
            (f"The sensors failed they were moved in week {i + 1}.",
             f"The sensors failed. They were moved in week {i + 1}.",
             f"The sensors failed, they were moved in week {i + 1}.",
             f"The sensors failed they, were moved in week {i + 1}.",
             f"The sensors failed; they, were moved in week {i + 1}."),
            (f"Door counts rose visits stayed short on day {i + 2}.",
             f"Door counts rose, but visits stayed short on day {i + 2}.",
             f"Door counts rose visits, stayed short on day {i + 2}.",
             f"Door counts rose; but, visits stayed short on day {i + 2}.",
             f"Door counts rose visits stayed, short on day {i + 2}."),
        ]
        bd = bounds[i % 2]
        mc(34, dname, score, f"{tag} Which choice correctly punctuates or joins the ideas in: “{bd[0]}”?",
           bd[1], list(bd[2:]), "Two complete sentences need a period, a semicolon, or a comma plus a conjunction.", "interpretation", False, False, "manual_first")

        punct = [
            (f"After the second gate opened, on-time trips rose in week {i + 1}.",
             f"After the second gate opened on-time trips, rose in week {i + 1}.",
             f"After, the second gate opened on-time trips rose in week {i + 1}.",
             f"After the second gate opened; on-time trips rose in week {i + 1}."),
            (f"The studio adopted the 18-hour dry, which kept glaze and strength in trial {i + 1}.",
             f"The studio adopted the 18-hour dry which, kept glaze and strength in trial {i + 1}.",
             f"The studio adopted the 18-hour dry; which kept glaze and strength in trial {i + 1}.",
             f"The studio adopted the 18-hour dry: which kept glaze and strength in trial {i + 1}."),
        ]
        pu = punct[i % 2]
        mc(35, dname, score, f"{tag} Which sentence is punctuated correctly?",
           pu[0], list(pu[1:]), "Use commas for introductory clauses and nonessential info.", "interpretation", False, False, "manual_first")

        sva = [
            (f"The list of delayed ferries is short in week {i + 1}.",
             f"The list of delayed ferries are short in week {i + 1}.",
             f"The list of delayed ferries were short in week {i + 1}.",
             f"The list of delayed ferries have short in week {i + 1}."),
            (f"Each of the night visits was brief in week {i + 1}.",
             f"Each of the night visits were brief in week {i + 1}.",
             f"Each of the night visits are brief in week {i + 1}.",
             f"Each of the night visits have brief in week {i + 1}."),
        ]
        sv = sva[i % 2]
        mc(36, dname, score, f"{tag} Which sentence has correct subject-verb agreement?",
           sv[0], list(sv[1:]), "Match the real subject, not the nearest noun.", "interpretation", False, False, "manual_first")

        pronouns = [
            (f"The city compared its bridge readings with the downtown meter in trial {i + 1}.",
             f"The city compared their bridge readings with the downtown meter in trial {i + 1}.",
             f"The city compared its' bridge readings with the downtown meter in trial {i + 1}.",
             f"The city compared they bridge readings with the downtown meter in trial {i + 1}."),
            (f"Staff logged the visits and then reviewed them in week {i + 1}.",
             f"Staff logged the visits and then reviewed it in week {i + 1}.",
             f"Staff logged the visits and then reviewed she in week {i + 1}.",
             f"Staff logged the visits and then reviewed he in week {i + 1}."),
        ]
        pr = pronouns[i % 2]
        mc(37, dname, score, f"{tag} Which sentence uses pronouns correctly?",
           pr[0], list(pr[1:]), "Check case, agreement, and whether the noun is a person or a thing.", "interpretation", False, False, "manual_first")

        tense = [
            (f"By Friday the clinic had tried night hours for six weeks in set {i + 1}.",
             f"By Friday the clinic has try night hours for six weeks in set {i + 1}.",
             f"By Friday the clinic trying night hours for six weeks in set {i + 1}.",
             f"By Friday the clinic will had tried night hours for six weeks in set {i + 1}."),
            (f"The sensors failed after rain reached the ports in week {i + 1}.",
             f"The sensors fails after rain reached the ports in week {i + 1}.",
             f"The sensors had fail after rain reached the ports in week {i + 1}.",
             f"The sensors failing after rain reached the ports in week {i + 1}."),
        ]
        te = tense[i % 2]
        mc(38, dname, score, f"{tag} Which sentence uses verb tense and form correctly?",
           te[0], list(te[1:]), "Keep the timeline consistent and use a complete verb.", "interpretation", False, False, "manual_first")

        modifiers = [
            (f"Walking at dusk in week {i + 1}, riders asked for lamps.",
             f"Walking at dusk in week {i + 1}, lamps were asked for by riders.",
             f"Walking at dusk in week {i + 1}, the path asked for lamps.",
             f"Walking at dusk in week {i + 1}, comments asked lamps."),
            (f"Bolted under the bridge in trial {i + 1}, the first sensors shorted.",
             f"Bolted under the bridge in trial {i + 1}, rain shorted.",
             f"Bolted under the bridge in trial {i + 1}, downtown shorted.",
             f"Bolted under the bridge in trial {i + 1}, crews shorted."),
        ]
        mo = modifiers[i % 2]
        mc(39, dname, score, f"{tag} Which sentence places the modifier so it describes the right noun?",
           mo[0], list(mo[1:]), "The opening phrase must attach to the person or thing actually doing that action.", "interpretation", False, False, "manual_first")

        parallel = [
            (f"The studio wanted color, strength, and a clean glaze in trial {i + 1}.",
             f"The studio wanted color, strength, and glazing clean in trial {i + 1}.",
             f"The studio wanted color, to be strong, and a clean glaze in trial {i + 1}.",
             f"The studio wanted colorful, strength, and a clean glaze in trial {i + 1}."),
            (f"Staff redrew gates, added a lane, and watched on-time trips in week {i + 1}.",
             f"Staff redrew gates, adding a lane, and watched on-time trips in week {i + 1}.",
             f"Staff redrew gates, added a lane, and watching on-time trips in week {i + 1}.",
             f"Staff redrew gates, to add a lane, and watched on-time trips in week {i + 1}."),
        ]
        pa = parallel[i % 2]
        mc(40, dname, score, f"{tag} Which sentence is parallel?",
           pa[0], list(pa[1:]), "Keep listed items in the same grammatical form.", "interpretation", False, False, "manual_first")

        concise = [
            (f"The lake loop stayed busier than the ridge trail in week {i + 1}.",
             f"The lake loop, which is a loop, stayed busier than the ridge trail in a manner that was busier in week {i + 1}.",
             f"Due to the fact that the lake loop stayed busy, it stayed busier than the ridge trail in week {i + 1}.",
             f"The lake loop stayed busier than the ridge trail, which is to say it stayed busier in week {i + 1}."),
            (f"Photos made the hold shelf searchable in week {i + 1}.",
             f"Photos that were photographs made the hold shelf searchable in nature in week {i + 1}.",
             f"The making of photos made the hold shelf be searchable in week {i + 1}.",
             f"Photos made the hold shelf searchable, being photos, in week {i + 1}."),
        ]
        co = concise[i % 2]
        mc(41, dname, score, f"{tag} Which sentence is the most concise without losing the meaning?",
           co[0], list(co[1:]), "Cut empty phrases that do not add information.", "interpretation", False, False, "manual_first")

        mc(42, dname, score, f"{tag} A paragraph currently ends by repeating the setting. Which revision best develops the topic?\n\n{content}",
           "End with the measured result and the authors' conclusion.",
           ["Delete the result and keep only the place name", "Add a sentence about an unrelated sport", "List the author's favorite snack", "Replace the result with a joke"],
           "Topic development keeps relevant results and drops side chatter.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(43, dname, score, f"{tag} Where should a one-sentence takeaway go in this note?\n\n{content}",
           "At the end, after the evidence that earns it.",
           ["Before any mention of the setting", "In the middle of an unrelated table", "As the title of a different trial", "Nowhere; delete it"],
           "Place a claim after the evidence that earns it.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(44, dname, score, f"{tag} Which sentence best matches a calm, informative tone?",
           f"The measured values in week {i + 1} were highest in the treatment the authors highlight.",
           [f"The winning group crushed the losers in week {i + 1}!", f"The numbers are like, whatever, in week {i + 1}.", f"YOU MUST BELIEVE WEEK {i + 1}.", f"This trial is a vibe in week {i + 1}."],
           "Informational tone stays specific and unfussy.", "interpretation", False, False, "manual_first")

        mc(45, dname, score, f"{tag} Which choice is the clearest?",
           f"Plot 2 had fewer crabs than Plot 1 in count set {i + 1}.",
           [f"Plot 2 had a situation regarding crabs that was different in a fewer way in count set {i + 1}.", f"Crabs, being crabs, at Plot 2, were, fewer in count set {i + 1}.", f"The plot known as 2 was not like 1 in bugs in count set {i + 1}."],
           "Clear beats decorative.", "interpretation", False, False, "manual_first")

        mc(46, dname, score, f"{tag} Which sentence is punctuated correctly?",
           f"After a warm week, researchers counted crabs at three plots in set {i + 1}.",
           [f"After a warm week researchers, counted crabs at three plots in set {i + 1}.", f"After a warm week; researchers counted crabs at three plots in set {i + 1}.", f"After, a warm week researchers counted crabs at three plots in set {i + 1}."],
           "An introductory phrase takes a comma.", "interpretation", False, False, "manual_first")

        mc(47, dname, score, f"{tag} Which sentence is grammatically correct?",
           f"Neither plot has a count above 50 in set {i + 1}.",
           [f"Neither plot have a count above 50 in set {i + 1}.", f"Neither plot having a count above 50 in set {i + 1}.", f"Neither plot are a count above 50 in set {i + 1}."],
           "Neither takes a singular verb.", "interpretation", False, False, "manual_first")

        mc(48, dname, score, f"{tag} Which choice avoids a run-on?",
           f"Plot 3 was saltiest. Its counts were also lowest in set {i + 1}.",
           [f"Plot 3 was saltiest its counts were also lowest in set {i + 1}.", f"Plot 3 was saltiest, its counts were also lowest in set {i + 1}.", f"Plot 3 was saltiest its, counts were also lowest in set {i + 1}."],
           "Two independent clauses need a legal join.", "interpretation", False, False, "manual_first")

        mc(60, dname, score, f"{tag} What is the main idea of this note?\n\n{content}",
           "A change in conditions lined up with a change in the measured outcome.",
           ["The river was drained", "All visits were free", "Staff wanted longer waits", "The tools were removed with no result"],
           "The comments or numbers carry the point.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(61, dname, score, f"{tag} It can reasonably be inferred that\n\n{content}",
           "The people in the note treated the measured change as a reason to keep or change a rule.",
           ["Nobody collected data", "The author rejects all lighting", "The sites were identical", "The growers hid the masses"],
           "Inference has to follow the evidence.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(62, dname, score, f"{tag} In this note, default most nearly means\n\n{content}" if "default" in content.lower() else f"{tag} In this note, the key result most nearly means the value the authors treat as the takeaway.\n\n{content}",
           "the usual choice after the trial" if "default" in content.lower() else "the measured outcome the note is built around",
           ["was invented", "was painted", "was fined", "was renamed"],
           "Context points to the result the authors keep.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(63, dname, score, f"{tag} The author mainly wants to\n\n{content}",
           "show what the evidence implies for a practical choice",
           ["sell lamps", "cancel the path", "list every stop", "attack riders"],
           "Purpose follows the evidence.", "interpretation", False, False, "manual_first", passage=pid_val)

        mc(64, dname, score, f"{tag} Compared with Memo A, Memo B\n\n{PASSAGE_BANK[8][3]}",
           f"agrees the path is underused but wants staff along with lights (comparison set {i + 1})",
           ["rejects any path use", "ignores dusk closing", "wants lights only", "denies the river exists"],
           "Both want more use; they differ on the first fix.", "interpretation", False, False, "manual_first", passage=pid(209))

        masses = [2.4 + 0.1 * (i % 5), 2.1 + 0.1 * (i % 4), 2.9 + 0.1 * (i % 3)]
        counts = [28 + i % 5, 14 + i % 4, 6 + i % 3]
        mc(65, dname, score, f"{tag} A table lists day-12 dry mass: A {masses[0]:.1f} g, B {masses[1]:.1f} g, sensor {masses[2]:.1f} g. Which group is highest?",
           "the sensor group", ["Group A", "Group B", "a fourth unlisted group"],
           "Compare the three cells and pick the largest.", "interpretation", False, False, "manual_first", passage=pid(208))
        mc(66, dname, score, f"{tag} Crab counts were Plot 1 {counts[0]}, Plot 2 {counts[1]}, Plot 3 {counts[2]}. Which trend does the table support?",
           "Plot 3 had the lowest counts in this set.",
           ["Every plot matched exactly", "Plot 1 had the lowest counts", "No counts were collected"],
           "Stay inside the table.", "interpretation", False, False, "manual_first", passage=pid(207))
        mc(67, dname, score, f"{tag} In the bean trial, what was the independent variable?\n\n{PASSAGE_BANK[7][3]}",
           f"the watering rule (design set {i + 1})",
           ["day-12 mass", "the greenhouse building", "the authors' names"],
           "The independent variable is the rule the researchers set.", "interpretation", False, False, "manual_first", passage=pid(208))
        mc(68, dname, score, f"{tag} Memo A and Memo B disagree mainly about\n\n{PASSAGE_BANK[8][3]}",
           f"whether lamps alone are enough (viewpoint set {i + 1})",
           ["whether the path exists", "whether dusk happens", "whether rivers can have paths"],
           "Both want more use; they differ on the first fix.", "interpretation", False, False, "manual_first", passage=pid(209))


def generate() -> None:
    gen_linear(1)
    gen_ineq(2)
    gen_systems(3)
    gen_sys_ineq(4)
    gen_linear_fn(5)
    gen_slope(6)
    gen_quad(7)
    gen_poly(8)
    gen_exp(9)
    gen_rational(10)
    gen_functions(11)
    gen_nonlinear(12)
    gen_ratio(13)
    gen_percent(14)
    gen_units(15)
    gen_stats(16)
    gen_prob(17)
    gen_data(18)
    gen_angles(19)
    gen_tri(20)
    gen_circles(21)
    gen_area_vol(22)
    gen_coord(23)
    gen_trig(24)
    gen_integers(49)
    gen_rationals(50)
    gen_linear(51, act5=True)
    gen_ineq(52, act5=True)
    gen_systems(53, act5=True)
    gen_functions(54, act5=True)
    gen_quad(55, act5=True)
    gen_area_vol(56, act5=True)
    gen_trig(57, act5=True)
    gen_stats(58, act5=True)
    gen_prob(59, act5=True)
    add_verbal()


def sql_str(s: object) -> str:
    if s is None:
        return "NULL"
    if isinstance(s, bool):
        return "true" if s else "false"
    if isinstance(s, (int, float)) and not isinstance(s, bool):
        return str(s)
    t = str(s).replace("'", "''")
    return f"'{t}'"


def emit_sql(rows: list[dict], passages_in: list[dict], out_dir: Path, batch_size: int = 18) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    files: list[Path] = []
    plines = ["BEGIN;"]
    for psg in passages_in:
        plines.append(
            "INSERT INTO public.passages (id, title, author, content, source_type, source_rights_status, active) VALUES ("
            + ", ".join([
                sql_str(psg["id"]),
                sql_str(psg["title"]),
                sql_str(psg["author"]),
                sql_str(psg["content"]),
                sql_str("original"),
                sql_str("owned"),
                "true",
            ])
            + ") ON CONFLICT (id) DO NOTHING;"
        )
    plines.append("COMMIT;")
    pfile = out_dir / "passages.sql"
    pfile.write_text("\n".join(plines))
    files.append(pfile)

    batch: list[str] = []
    batch_n = 0
    idx = 0

    def flush() -> None:
        nonlocal batch, batch_n, idx
        if not batch:
            return
        path = out_dir / f"q-{idx:03d}.sql"
        path.write_text("BEGIN;\n" + "\n".join(batch) + "\nCOMMIT;\n")
        files.append(path)
        batch = []
        batch_n = 0
        idx += 1

    for q in rows:
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
            "source": "StudentQuest original (skills from official exam structure, not wording)",
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
            "exam_name": "StudentQuest PDF-skill original bank",
            "calculator_config": json.dumps({"calculator_enabled": q["calculator_allowed"], "calculator_recommended": q["desmos_useful"]}),
        }
        names, vals = [], []
        for k, v in cols.items():
            names.append(k)
            vals.append(f"{sql_str(v)}::jsonb" if k == "calculator_config" else sql_str(v))
        batch.append(f"INSERT INTO public.questions ({', '.join(names)}) VALUES ({', '.join(vals)}) ON CONFLICT DO NOTHING;")
        pos = 0
        for label, key in [("A", "choice_a"), ("B", "choice_b"), ("C", "choice_c"), ("D", "choice_d"), ("E", "choice_e")]:
            content = q.get(key)
            if not content:
                continue
            pos += 1
            batch.append(
                "INSERT INTO public.question_choices (question_id, label, content, position, is_correct) VALUES ("
                f"{sql_str(q['id'])}, {sql_str(label)}, {sql_str(content)}, {pos}, {sql_str(label == q['correct_answer'])}"
                ") ON CONFLICT (question_id, label) DO NOTHING;"
            )
        batch.append(
            "INSERT INTO public.question_topic_mappings (question_id, topic_id, relationship, weight, confidence) VALUES ("
            f"{sql_str(q['id'])}, {sql_str(q['topic_id'])}, 'primary', 1, 1) ON CONFLICT (question_id, topic_id) DO NOTHING;"
        )
        batch_n += 1
        if batch_n >= batch_size:
            flush()
    flush()
    return files


def main() -> None:
    generate()
    by_topic: dict[str, int] = {}
    by_test: dict[str, int] = {}
    by_diff: dict[str, int] = {}
    for q in questions:
        by_topic[q["topic_id"]] = by_topic.get(q["topic_id"], 0) + 1
        by_test[q["test_type"]] = by_test.get(q["test_type"], 0) + 1
        by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1
    out = Path("/tmp/pdf-skill-bank.json")
    out.write_text(json.dumps({"passages": passages, "questions": questions}))
    files = emit_sql(questions, passages, Path("/tmp/pdf-skill-sql"))
    print("questions", len(questions), "passages", len(passages))
    print("sat", by_test.get("SAT", 0), "act", by_test.get("ACT", 0))
    print("difficulty", by_diff)
    print("topics", len(by_topic), "min_per_topic", min(by_topic.values()) if by_topic else 0, "max_per_topic", max(by_topic.values()) if by_topic else 0)
    print("wrote", out, "sql_files", len(files))


if __name__ == "__main__":
    main()
