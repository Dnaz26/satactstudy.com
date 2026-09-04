#!/usr/bin/env python3
"""Generate a large ORIGINAL StudentQuest bank. Never copies exam wording."""
from __future__ import annotations

import hashlib
import json
import math
import random
import re
from fractions import Fraction
from pathlib import Path

RNG = random.Random(20260902)
TID = "d1000000-0000-0000-0000-{}"
QID = "f3000000-0000-0000-0000-{}"
PID = "f3100000-0000-0000-0000-{}"
START = 2001

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
    row["slug"] = f"exp-{n:04d}"
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
    while len(uniq) < count:
        uniq.append(f"{uniq[-1]}*")
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


def diffs(i: int) -> tuple[str, float]:
    cycle = [("easy", 0.28), ("medium", 0.52), ("hard", 0.74)]
    return cycle[i % 3]


# ---- original passages ----
PASSAGE_BANK = [
    ("Harbor retrofit", "SAT", "Reading and Writing", "A city bolted cheap wind sensors to an old pier, then moved them onto lampposts after salt ruined two units. Compared with the airport, the pier still gusted harder, but the pattern was steady enough to warn crews a night ahead."),
    ("Seed box", "SAT", "Reading and Writing", "A neighborhood seed box works if gardeners return leftover seeds. After volunteers photographed every packet, returns rose and weed complaints fell. The photos did not teach botany; they made the swap accountable."),
    ("Night buses", "ACT", "Reading", "When night-shift bus stops were redrawn, riders complained less about walking and more about darkness. After lamps went up at three transfers, ridership on those lines recovered. Distance was never the only cost."),
    ("Basil trial", "ACT", "Science", "Group A got 40 mL of water every morning. Group B got 80 mL every other morning. A sensor group was watered only when soil moisture dropped below 20 percent. Day-14 leaf mass: A 3.2 g, B 2.7 g, sensor 3.6 g."),
    ("Clay tiles", "SAT", "Reading and Writing", "A potter tested three kiln holds at the same peak temperature. The longest hold dulled the glaze; the shortest left bubbles. The middle hold kept both color and strength, so the studio adopted it for public work."),
    ("River counts", "ACT", "Science", "Researchers counted mayflies at three river sites after a warm week. Site 1: 40, 38, 41. Site 2: 22, 19, 25. Site 3: 9, 11, 8. They also logged water temperature each noon."),
    ("Library hours", "SAT", "Reading and Writing", "A library tried Friday evening hours for six weeks. Door counts rose, but most new visits lasted under ten minutes. Staff concluded that later hours helped pickup more than deep study."),
    ("Two notes", "ACT", "Reading", "Memo A says the park should add lights first. Memo B says lights without weekend staff will not change use. Both agree the current dusk closing wastes the river path."),
]

for i, (title, test, section, content) in enumerate(PASSAGE_BANK, 101):
    passages.append({
        "id": pid(i),
        "test_type": test,
        "section_name": section,
        "title": title,
        "author": "StudentQuest original",
        "content": content,
    })


def p(i: int) -> str:
    return pid(i)


# ---- SAT / ACT math generators ----
def gen_linear(tidn: int, act5: bool = False) -> None:
    for i, a in enumerate(range(2, 18)):
        b = 3 + (i * 2)
        x = 4 + i
        c = a * x + b
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What value of $x$ satisfies ${a}x + {b} = {c}$?",
           fmt(x), [fmt(x + 1), fmt(x - 1), fmt(c - b), fmt(a + b)],
           f"Subtract {b} to get ${a}x={c-b}$, then divide by {a}.", "algebraic manipulation", False, False, "manual_first", act5=act5)
        if i % 2 == 0 and TOPICS[tidn][0] == "SAT":
            spr(tidn, "medium", 0.5, f"Solve $\\frac{{x}}{{{a}}} + {b} = {b + (5 + i)}$. What is $x$?",
                str(a * (5 + i)), f"Subtract {b}, then multiply by {a}.", "algebraic manipulation", True, True, "hybrid")


def gen_ineq(tidn: int, act5: bool = False) -> None:
    for i, a in enumerate(range(2, 14)):
        b = 5 + i
        xbound = 6 + i
        rhs = a * xbound + b
        dname, score = diffs(i)
        mc(tidn, dname, score, f"Which inequality is equivalent to ${a}x + {b} < {rhs}$?",
           f"$x < {xbound}$", [f"$x > {xbound}$", f"$x < {rhs}$", f"$x > {a}$", f"$x \\le {xbound}$"],
           f"Subtract {b} and divide by {a}. The inequality direction stays the same.", "algebraic manipulation", False, False, "manual_first", act5=act5)


def gen_systems(tidn: int, act5: bool = False) -> None:
    for i in range(14):
        x, y = 2 + i, 3 + (i % 5)
        a1, b1 = 1, 1
        c1 = x + y
        a2, b2 = 2, -1
        c2 = 2 * x - y
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is the solution of ${a1}x + {b1}y = {c1}$ and ${a2}x + {b2}y = {c2}$?",
           f"$({x}, {y})$", [f"$({y}, {x})$", f"$({x+1}, {y})$", f"$({x}, {y+1})$", f"$({c1}, {c2})$"],
           f"Add the equations to eliminate $y$, or graph both lines and read the intersection $({x},{y})$.", "algebraic manipulation", True, True, "desmos_first", extra=5 if tidn == 3 else None, act5=act5)


def gen_sys_ineq(tidn: int) -> None:
    for i in range(12):
        x, y = 2 + (i % 4), 8 - i % 3
        dname, score = diffs(i)
        ok = y >= 2 * x and x + y <= 12
        if not ok:
            x, y = 3, 7
        mc(tidn, dname, score, f"Which point satisfies both $y \\ge 2x$ and $x + y \\le {x+y+2}$?",
           f"$({x}, {y})$", ["$(10, 1)$", "$(8, 1)$", "$(0, 20)$", "$(9, 9)"],
           f"$({x},{y})$ meets $y\\ge 2x$ and the sum bound. Graph the overlap of the two half-planes.", "interpretation", True, True, "desmos_first")


def gen_linear_fn(tidn: int, act5: bool = False) -> None:
    for i in range(14):
        m, b, x = 2 + (i % 6), 3 + i, 4 + (i % 5)
        dname, score = diffs(i)
        mc(tidn, dname, score, f"If $f(x) = {m}x + {b}$, what is $f({x})$?",
           fmt(m * x + b), [fmt(m * x), fmt(m + b), fmt(m * x - b), fmt(x + b)],
           f"Substitute: ${m}({x})+{b}={m*x+b}$.", "computation", False, True, "hybrid", act5=act5)


def gen_slope(tidn: int) -> None:
    for i in range(14):
        x1, y1 = 1, 2 + i
        x2, y2 = 5, y1 + 2 * (3 + i % 4)
        slope = (y2 - y1) / (x2 - x1)
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A line passes through $({x1}, {y1})$ and $({x2}, {y2})$. What is its slope?",
           fmt(slope), [fmt(-slope), fmt(y2 - y1), fmt(x2 - x1), fmt(slope + 1)],
           f"Slope is $({y2}-{y1})/({x2}-{x1})={fmt(slope)}$.", "computation", False, False, "manual_first")


def gen_quad(tidn: int, act5: bool = False) -> None:
    for i in range(14):
        r1, r2 = 1 + (i % 4), 4 + (i % 3)
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What are the solutions of $x^2 - {r1+r2}x + {r1*r2} = 0$?",
           f"$x={r1}$ and $x={r2}$", [f"$x=-{r1}$ and $x=-{r2}$", f"$x={r1+r2}$ and $x={r1*r2}$", f"$x={r1}$ only", f"$x={r2}$ only"],
           f"Factor as $(x-{r1})(x-{r2})=0$, or graph and read the intercepts.", "algebraic manipulation", True, True, "desmos_first", act5=act5)
        if i % 2 == 0 and TOPICS[tidn][0] == "SAT":
            h = 48
            k = 16
            t = h / (2 * k)
            height = -k * t * t + h * t + 4
            spr(tidn, "hard", 0.76, f"A ball’s height is $h(t)=-{k}t^2+{h}t+4$. What is the time $t$ when height is maximized?",
                fmt(t), f"Vertex at $t={h}/(2\\cdot{k})={fmt(t)}$.", "modeling", True, True, "desmos_first")


def gen_poly(tidn: int) -> None:
    for i in range(12):
        a = 2 + i % 3
        dname, score = diffs(i)
        mc(tidn, dname, score, f"If $(x-{a})$ is a factor of $x^3 + bx^2 - 4x - {a*4}$, and $p({a})=0$ with $b={2*a}$, which statement is true?",
           f"$x={a}$ is a root", [f"$x=-{a}$ is the only root", "The polynomial has no real roots", f"The leading coefficient is {a}", "The constant term is 0"],
           f"The factor theorem says $p({a})=0$ when $(x-{a})$ is a factor.", "algebraic manipulation", True, False, "manual_first")
        mc(tidn, "medium", 0.58, f"How many real zeros does $p(x)=x^3-{3+i%2}x+1$ have if its graph crosses the x-axis three times?",
           "3", ["0", "1", "2", "4"],
           "Each distinct x-intercept is a real zero. A cubic can have three real zeros.", "interpretation", True, True, "desmos_first")


def gen_exp(tidn: int) -> None:
    cubes = [(8, 2, 4), (27, 2, 9), (64, 2, 16), (8, 1, 2), (27, 1, 3), (125, 2, 25), (16, 1, 4), (81, 1, 9), (32, 1, 2), (243, 1, 3), (64, 1, 4), (125, 1, 5)]
    for i, (base, pwr, ans) in enumerate(cubes):
        # base^{pwr/3} if cube, else handled as integer roots we listed
        dname, score = diffs(i)
        if base in (8, 27, 64, 125) and ans in (2, 3, 4, 5, 9, 16, 25):
            mc(tidn, dname, score, f"Which is equivalent to ${base}^{{{pwr}/3}}$?" if pwr != 1 else f"Which is equivalent to $\\sqrt[3]{{{base}}}$?",
               fmt(ans if pwr != 1 else round(base ** (1 / 3)),), [fmt(base), fmt(pwr), fmt(base // 2), fmt(ans + 1)],
               "Take the cube root first, then raise to the remaining power.", "computation", False, False, "manual_first")


def gen_rational(tidn: int) -> None:
    for i in range(12):
        a = 3 + i % 5
        dname, score = diffs(i)
        mc(tidn, dname, score, f"For $x \\ne {a}$, which expression equals $\\frac{{x^2-{a*a}}}{{x-{a}}}$?",
           f"$x+{a}$", [f"$x-{a}$", f"$x^2-{a}$", f"${2*a}$", f"$x-{a*a}$"],
           f"Factor as $(x-{a})(x+{a})$ and cancel $x-{a}$.", "algebraic manipulation", True, True, "hybrid")
        rhs = 4 + i % 3
        mc(tidn, "medium", 0.62, f"Solve $\\frac{{2x}}{{3}} - \\frac{{x}}{{6}} = {rhs}$.",
           fmt(2 * rhs), [fmt(rhs), fmt(3 * rhs), fmt(rhs + 6), fmt(6 * rhs)],
           f"Common denominator 6: $\\frac{{3x}}{{6}}={rhs}$, so $x={2*rhs}$.", "algebraic manipulation", True, True, "desmos_first")


def gen_functions(tidn: int, act5: bool = False) -> None:
    for i in range(14):
        a, b, x = 2 + i % 4, 1 + i % 5, 3 + i % 6
        dname, score = diffs(i)
        mc(tidn, dname, score, f"If $g(x)=x^2+{a}x$, what is $g({x})$?",
           fmt(x * x + a * x), [fmt(x * x), fmt(a * x), fmt(x + a), fmt(x * x + a)],
           f"${x}^2+{a}({x})={x*x+a*x}$.", "computation", True, True, "desmos_first", act5=act5)


def gen_nonlinear(tidn: int) -> None:
    for i in range(12):
        r = 2 + i % 5
        dname, score = diffs(i)
        mc(tidn, dname, score, f"How many real solutions does $x^2 + {r} = 0$ have?",
           "0", ["1", "2", "3", "infinitely many"],
           f"$x^2=-{r}$ has no real $x$ because a square cannot be negative.", "interpretation", True, True, "desmos_first")
        mc(tidn, "medium", 0.6, f"How many real solutions does $x^2 - {r*r} = 0$ have?",
           "2", ["0", "1", "3", "4"],
           f"$x=\\pm {r}$. The graph crosses the axis twice.", "algebraic manipulation", True, True, "desmos_first")


def gen_ratio(tidn: int) -> None:
    for i in range(14):
        a, b, c = 2 + i % 5, 3 + i % 4, 10 + 2 * i
        # a/b = c/x => x = bc/a
        if (b * c) % a != 0:
            c = a * (4 + i)
        x = b * c // a
        dname, score = diffs(i)
        mc(tidn, dname, score, f"If $\\frac{{{a}}}{{{b}}}=\\frac{{{c}}}{{x}}$, what is $x$?",
           fmt(x), [fmt(a * c), fmt(b * c), fmt(c // a if a else c), fmt(x + a)],
           f"Cross-multiply: ${a}x={b*c}$, so $x={x}$.", "algebraic manipulation", False, False, "manual_first")


def gen_percent(tidn: int) -> None:
    for i in range(14):
        p, base = 10 + 5 * (i % 8), 80 + 20 * (i % 5)
        part = base * p // 100
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is ${p}\\%$ of ${base}$?",
           fmt(part), [fmt(p), fmt(base - part), fmt(base * p // 10), fmt(part + 10)],
           f"${p}/100 \\times {base} = {part}$.", "computation", True, False, "manual_first")


def gen_units(tidn: int) -> None:
    for i in range(12):
        hours = 2 + i % 5
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A machine runs {hours} hours. How many minutes is that?",
           fmt(hours * 60), [fmt(hours * 100), fmt(hours * 24), fmt(hours * 10), fmt(60)],
           "Multiply hours by 60.", "computation", False, False, "manual_first")
        km = 3 + i
        mc(tidn, "medium", 0.5, f"A trail is {km} kilometers. About how many meters is that?",
           fmt(km * 1000), [fmt(km * 100), fmt(km * 10), fmt(km * 1600), fmt(km)],
           "1 km = 1000 m.", "computation", False, False, "manual_first")


def gen_stats(tidn: int, act5: bool = False) -> None:
    for i in range(12):
        data = [4 + i, 6 + i, 8 + i, 10 + i, 12 + i]
        mean = sum(data) / len(data)
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is the mean of {', '.join(str(v) for v in data)}?",
           fmt(mean), [fmt(data[2]), fmt(data[-1]), fmt(sum(data)), fmt(mean + 2)],
           f"Sum is {sum(data)}; divide by {len(data)}.", "computation", True, False, "manual_first", act5=act5)
        mc(tidn, "easy", 0.3, f"What is the median of {', '.join(str(v) for v in data)}?",
           fmt(data[2]), [fmt(mean), fmt(data[0]), fmt(data[-1]), fmt(data[1])],
           "Ordered middle value.", "interpretation", False, False, "manual_first", act5=act5)


def gen_prob(tidn: int, act5: bool = False) -> None:
    for i in range(12):
        red, blue = 3 + i % 4, 5 + i % 3
        total = red + blue
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A bag has {red} red and {blue} blue marbles. One marble is drawn at random. What is $P(\\text{{red}})$?",
           f"{red}/{total}", [f"{blue}/{total}", f"{red}/{blue}", f"{red}/{red+blue+1}", "1/2"],
           f"Favorable over total: {red}/{total}.", "computation", False, False, "manual_first", act5=act5)


def gen_data(tidn: int) -> None:
    for i in range(12):
        a, b, c = 12 + i, 18 + i, 9 + i
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A table lists club members: chess {a}, robotics {b}, choir {c}. How many more robotics members are there than choir members?",
           fmt(b - c), [fmt(a - c), fmt(b - a), fmt(a + b + c), fmt(b)],
           f"{b}-{c}={b-c}. Read the two cells and subtract.", "interpretation", False, False, "manual_first")


def gen_angles(tidn: int) -> None:
    for i in range(12):
        ang = 30 + 5 * i
        dname, score = diffs(i)
        mc(tidn, dname, score, f"Two adjacent angles on a straight line measure ${ang}^\\circ$ and $x^\\circ$. What is $x$?",
           fmt(180 - ang), [fmt(90 - ang if 90 > ang else ang), fmt(ang), fmt(360 - ang), fmt(180 + ang)],
           "Adjacent angles on a line sum to 180.", "computation", False, False, "manual_first")


def gen_tri(tidn: int) -> None:
    for i in range(12):
        a, b = 40 + i, 60 + i
        c = 180 - a - b
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A triangle has angles ${a}^\\circ$ and ${b}^\\circ$. What is the third angle?",
           fmt(c), [fmt(a + b), fmt(90), fmt(180 - a), fmt(c + 10)],
           "Triangle angles sum to 180.", "computation", False, False, "manual_first")


def gen_circles(tidn: int) -> None:
    for i in range(12):
        r = 3 + i % 8
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A circle has radius {r}. What is its area?",
           f"${r*r}\\pi$", [f"${2*r}\\pi$", f"${r}\\pi$", f"{r*r}", f"{2*r}"],
           "Area is $\\pi r^2$.", "computation", True, False, "manual_first")
        mc(tidn, "easy", 0.3, f"A circle has radius {r}. What is its circumference?",
           f"${2*r}\\pi$", [f"${r*r}\\pi$", f"${r}\\pi$", f"{2*r}", f"{r*r}"],
           "Circumference is $2\\pi r$.", "computation", True, False, "manual_first")


def gen_area_vol(tidn: int, act5: bool = False) -> None:
    for i in range(12):
        l, w, h = 4 + i % 5, 3 + i % 4, 2 + i % 3
        dname, score = diffs(i)
        mc(tidn, dname, score, f"A rectangular prism has edges {l}, {w}, and {h}. What is its volume?",
           fmt(l * w * h), [fmt(l * w), fmt(2 * (l * w + l * h + w * h)), fmt(l + w + h), fmt(l * w * h + 1)],
           "Volume is length × width × height.", "computation", False, False, "manual_first", act5=act5)
        mc(tidn, "easy", 0.28, f"A rectangle is {l} by {w}. What is its area?",
           fmt(l * w), [fmt(2 * (l + w)), fmt(l + w), fmt(l * w * 2), fmt(abs(l - w))],
           "Area is length × width.", "computation", False, False, "manual_first", act5=act5)


def gen_coord(tidn: int) -> None:
    for i in range(12):
        x1, y1, x2, y2 = 1, 2 + i, 5, 8 + i
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is the midpoint of $({x1}, {y1})$ and $({x2}, {y2})$?",
           f"$({fmt(mx)}, {fmt(my)})$", [f"$({x1}, {y2})$", f"$({x2}, {y1})$", f"$({x2-x1}, {y2-y1})$", f"$({fmt(mx)}, {y1})$"],
           "Average the coordinates.", "computation", False, False, "manual_first")


def gen_trig(tidn: int, act5: bool = False) -> None:
    triples = [(3, 4, 5), (5, 12, 13), (6, 8, 10), (9, 12, 15), (8, 15, 17), (7, 24, 25)]
    for i, (a, b, c) in enumerate(triples * 2):
        dname, score = diffs(i)
        mc(tidn, dname, score, f"In a right triangle, the legs are {a} and {b} and the hypotenuse is {c}. What is $\\sin$ of the angle opposite the side of length {a}?",
           f"{a}/{c}", [f"{b}/{c}", f"{a}/{b}", f"{c}/{a}", f"{b}/{a}"],
           "Sine is opposite over hypotenuse.", "computation", True, False, "manual_first", act5=act5)


def gen_integers(tidn: int) -> None:
    for i in range(14):
        n = 12 + 2 * i
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is the least common multiple of 4 and {6 + i % 3} that is also a multiple of 2?",
           fmt(12 if (6 + i % 3) in (6, 3) else 4 * (6 + i % 3) // math.gcd(4, 6 + i % 3)),
           [fmt(4), fmt(6 + i % 3), fmt(2), fmt(n)],
           "LCM uses the highest powers of the prime factors.", "computation", False, False, "manual_first")
        mc(tidn, "easy", 0.3, f"Which number is a multiple of 3?",
           fmt(3 * (5 + i)), [fmt(3 * (5 + i) + 1), fmt(3 * (5 + i) + 2), "14", "25"],
           f"{3*(5+i)} = 3×{5+i}.", "computation", False, False, "manual_first")


def gen_rationals(tidn: int) -> None:
    for i in range(12):
        a, b = Fraction(1, 2 + i % 4), Fraction(1, 3 + i % 3)
        s = a + b
        dname, score = diffs(i)
        mc(tidn, dname, score, f"What is $\\frac{{{a.numerator}}}{{{a.denominator}}} + \\frac{{{b.numerator}}}{{{b.denominator}}}$?",
           f"$\\frac{{{s.numerator}}}{{{s.denominator}}}$", [f"$\\frac{{{a.numerator+b.numerator}}}{{{a.denominator+b.denominator}}}$", f"$\\frac{{{a.numerator}}}{{{b.denominator}}}$", "1", f"$\\frac{{{s.denominator}}}{{{s.numerator}}}$"],
           "Common denominator, then add numerators.", "computation", False, False, "manual_first")


# ---- verbal / science original items ----
def add_verbal() -> None:
    sat_main = [
        ("The potter kept the middle kiln hold because it balanced color and strength.", "The studio wanted the longest firing every time", "Bubbles are always desirable", "The peak temperature changed in each test", "Harbor retrofit notes"),
        ("Friday hours mainly helped short pickup visits, not long study sessions.", "Door counts fell after six weeks", "Staff banned evening hours", "Most new visits lasted hours", "Seed box notes"),
        ("Cheap pier sensors became useful after the team cleaned and compared the signal.", "The airport data were deleted", "Salt made the sensors more accurate", "The pier never gusted", "Night bus notes"),
    ]
    for i, (good, w1, w2, w3, _note) in enumerate(sat_main * 4):
        mc(25, *diffs(i), f"Based on the StudentQuest note, which statement best captures the main point?\n\n{PASSAGE_BANK[i % 4][3]}",
           good, [w1, w2, w3], "The main point is the claim the details exist to support.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 4)))

    details = [
        ("two sensors failed after salt spray", "the airport closed", "the pier was rebuilt in steel", "gusts stopped entirely"),
        ("returns rose after packets were photographed", "the box was removed", "weeds increased after photos", "gardeners stopped borrowing"),
        ("ridership recovered after lamps were added", "walks became longer", "the map was deleted", "staff cut all night lines"),
        ("the sensor group had the highest leaf mass", "Group B had 3.6 g", "no water was used", "day 14 was skipped"),
    ]
    for i, (good, *bad) in enumerate(details * 3):
        mc(26, *diffs(i), f"Which detail is actually in the note?\n\n{PASSAGE_BANK[i % 4][3]}",
           good, list(bad), "Match the wording to a sentence that is present.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 4)))

    inferences = [
        ("A messy local signal can still help if it is checked against another source.", "Sensors must be expensive to be useful", "Airports should ignore harbor data", "Salt spray improves accuracy"),
        ("Accountability, not extra skill, changed the seed-box results.", "Photos taught advanced botany", "Weed complaints rose because of photos", "The box failed"),
        ("Riders treated safety as part of the trip cost.", "Only distance matters to riders", "Lamps reduced walking distance", "The agency ignored comments"),
    ]
    for i, (good, *bad) in enumerate(inferences * 4):
        mc(27, *diffs(i), f"Which inference is best supported?\n\n{PASSAGE_BANK[i % 3][3]}",
           good, list(bad), "An inference stays close to the facts and does not invent a new plot.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 3)))

    words = [
        ("The team moved the remaining devices onto lampposts after salt ruined two units. In this sentence, remaining most nearly means", "the ones still working", "the most expensive", "the newest", "the airport's"),
        ("Returns rose, and the weed complaints dropped. Dropped most nearly means", "decreased", "were planted", "were photographed", "were ignored"),
        ("Ridership on those lines recovered. Recovered most nearly means", "returned toward earlier levels", "was counted twice", "moved to a new city", "was canceled"),
        ("The middle hold kept both color and strength. Kept most nearly means", "preserved", "erased", "heated", "sold"),
        ("Most new visits lasted under ten minutes. Lasted most nearly means", "continued for", "were billed as", "were banned after", "were photographed for"),
        ("The pattern was steady enough to warn crews. Steady most nearly means", "stable", "random", "silent", "illegal"),
        ("Staff concluded that later hours helped pickup. Concluded most nearly means", "decided from the evidence", "guessed with no data", "voted to close", "ignored the counts"),
        ("Critics worry that unlabeled packets spread weeds. Spread most nearly means", "cause to increase over an area", "label carefully", "photograph", "return"),
    ]
    for i, (stem, good, *bad) in enumerate(words * 2):
        mc(28, *diffs(i), stem, good, list(bad), "Replace the word with each choice; only the best synonym keeps the sentence's meaning.", "interpretation", False, False, "manual_first")

    purpose = [
        ("to show that a local signal can still be useful after it is cleaned", "to argue airports should close", "to sell sensors", "to describe a storm"),
        ("to explain why photographing packets changed the seed exchange", "to list every plant species", "to attack grocery stores", "to teach kiln theory"),
        ("to show that lighting, not only distance, shaped night ridership", "to demand a new river", "to price fuel", "to cancel Friday hours"),
        ("to report which watering rule grew more basil mass", "to advertise a greenhouse", "to ban sensors", "to rewrite a bus map"),
    ]
    for i, (good, *bad) in enumerate(purpose * 3):
        mc(29, *diffs(i), f"The primary purpose of this note is\n\n{PASSAGE_BANK[i % 4][3]}",
           good, list(bad), "Purpose is why the author wrote it, not a side detail.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 4)))

    structure = [
        ("It states a problem, a change, and a result.", "It lists unrelated dates", "It is only a definition", "It is a poem"),
        ("It contrasts a claim with what the comments actually emphasized.", "It gives a recipe", "It is a score table", "It is an advertisement"),
        ("It compares three treatments and reports an outcome.", "It narrates a war", "It is a dictionary entry", "It is a bus timetable only"),
    ]
    for i, (good, *bad) in enumerate(structure * 4):
        mc(30, *diffs(i), f"Which choice best describes the structure?\n\n{PASSAGE_BANK[i % 3][3]}",
           good, list(bad), "Structure is the order of moves, not the topic alone.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 3)))

    transitions = [
        ("The first season was noisy. _______ the team still found a usable pattern.", "Still,", "Meanwhile,", "For example,", "In contrast,"),
        ("Photos were posted. _______ returns rose.", "Afterward,", "Otherwise,", "Instead,", "Meanwhile,"),
        ("Walks were longer. _______ comments focused on lighting.", "Instead,", "Likewise,", "Therefore,", "For instance,"),
        ("Group B got more water per dose. _______ it grew less mass.", "However,", "Similarly,", "Meanwhile,", "For example,"),
        ("Lamps went up. _______ ridership recovered.", "Afterward,", "Otherwise,", "In contrast,", "For instance,"),
        ("The longest hold dulled the glaze. _______ the studio chose the middle hold.", "Therefore,", "Meanwhile,", "For example,", "Likewise,"),
        ("Door counts rose. _______ visits stayed short.", "However,", "Likewise,", "Meanwhile,", "For example,"),
        ("Both memos want more path use. _______ they disagree about the first step.", "However,", "Likewise,", "Therefore,", "For instance,"),
    ]
    for i, (stem, good, *bad) in enumerate(transitions * 2):
        mc(31, *diffs(i), f"Which transition best completes the sentence?\n\n{stem}",
           good, list(bad), "Pick the logical relationship: contrast, result, time, or example.", "interpretation", False, False, "manual_first")

    notes = [
        ("Note 1: Door counts rose on Friday nights. Note 2: Most new visits lasted under ten minutes.", "Later hours helped quick pickups more than long study.", "The library should close on Fridays", "Visits became longer", "Door counts fell"),
        ("Note 1: Site 2 had fewer mayflies than Site 1. Note 2: Site 2 was also warmer at noon.", "The counts differ by site, and temperature was recorded too.", "All sites had the same count", "No temperatures were logged", "Site 3 had the most mayflies"),
        ("Note 1: Memo A wants lights first. Note 2: Memo B wants staff with the lights.", "They share a goal but not a first step.", "They agree on every step", "Neither mentions the path", "Both reject lights"),
        ("Note 1: Sensor watering grew 3.6 g. Note 2: Fixed 80 mL every other morning grew 2.7 g.", "Matching water to soil moisture outperformed the wetter fixed schedule in this trial.", "More water always won", "The trial had one group", "Mass was not recorded"),
    ]
    for i, (stem, good, *bad) in enumerate(notes * 3):
        mc(32, *diffs(i), f"Which choice most effectively synthesizes the notes?\n\n{stem}",
           good, list(bad), "A good synthesis uses both notes and does not contradict them.", "interpretation", False, False, "manual_first")

    flow = [
        ("which sentence should come last?", "The photographs made the exchange accountable.", "A neighborhood seed box looks like a birdhouse.", "Gardeners borrow seeds.", "Critics mention weeds."),
        ("which sentence should open the paragraph?", "A city bolted cheap wind sensors to an old pier.", "The pattern warned crews a night ahead.", "Two units failed.", "The airport comparison helped."),
        ("which sentence is the conclusion?", "Staff concluded that later hours helped pickup more than deep study.", "A library tried Friday evening hours.", "Door counts rose.", "Visits lasted under ten minutes."),
    ]
    for i, (q, good, *bad) in enumerate(flow * 4):
        mc(33, *diffs(i), f"In a short paragraph about this note, {q}\n\n{PASSAGE_BANK[i % 3][3]}",
           good, list(bad), "Openers set the scene; closers state the takeaway.", "interpretation", False, False, "manual_first", passage=p(101 + (i % 3)))

    bounds = [
        ("The sensors failed they were moved.", "The sensors failed. They were moved.", "The sensors failed, they were moved.", "The sensors failed they, were moved.", "The sensors failed; they, were moved."),
        ("Door counts rose visits stayed short.", "Door counts rose, but visits stayed short.", "Door counts rose visits, stayed short.", "Door counts rose; but, visits stayed short.", "Door counts rose visits stayed, short."),
        ("Lamps went up ridership recovered.", "Lamps went up, and ridership recovered.", "Lamps went up ridership, recovered.", "Lamps went up; and, ridership recovered.", "Lamps, went up ridership recovered."),
        ("Group A got 40 mL Group B got 80 mL.", "Group A got 40 mL; Group B got 80 mL.", "Group A got 40 mL Group B, got 80 mL.", "Group A got 40 mL, Group B got 80 mL and.", "Group A got 40 mL Group; B got 80 mL."),
        ("The hold was shorter bubbles remained.", "The hold was shorter, so bubbles remained.", "The hold was shorter bubbles, remained.", "The hold was shorter; so, bubbles remained.", "The hold, was shorter bubbles remained."),
        ("Memo A wants lights Memo B wants staff.", "Memo A wants lights; Memo B wants staff.", "Memo A wants lights Memo B, wants staff.", "Memo A wants lights, Memo B wants staff and.", "Memo A wants; lights Memo B wants staff."),
        ("Site 1 was cooler Site 2 was warmer.", "Site 1 was cooler, and Site 2 was warmer.", "Site 1 was cooler Site 2, was warmer.", "Site 1 was cooler; and, Site 2 was warmer.", "Site 1, was cooler Site 2 was warmer."),
        ("Returns rose complaints fell.", "Returns rose, and complaints fell.", "Returns rose complaints, fell.", "Returns rose; and, complaints fell.", "Returns, rose complaints fell."),
    ]
    for i, (bad_stem, good, *wrong) in enumerate(bounds * 2):
        mc(34, *diffs(i), f"Which choice correctly punctuates or joins the ideas in: “{bad_stem}”?",
           good, list(wrong), "Two complete sentences need a period, a semicolon, or a comma plus a conjunction.", "interpretation", False, False, "manual_first")

    punct = [
        ("The studio adopted the middle hold, which kept color and strength.", "The studio adopted the middle hold which, kept color and strength.", "The studio adopted the middle hold; which kept color and strength.", "The studio adopted the middle hold: which kept color and strength."),
        ("After the lamps went up, ridership recovered.", "After the lamps went up ridership, recovered.", "After, the lamps went up ridership recovered.", "After the lamps went up; ridership recovered."),
        ("The notes — door counts and visit length — pointed to pickup use.", "The notes, door counts and visit length pointed to pickup use.", "The notes door counts and visit length — pointed to pickup use.", "The notes — door counts and visit length pointed to pickup use."),
        ("Crews got a warning twelve hours ahead.", "Crews got a warning, twelve hours ahead.", "Crews, got a warning twelve hours ahead.", "Crews got a warning twelve, hours ahead."),
    ]
    for i, (good, *bad) in enumerate(punct * 3):
        mc(35, *diffs(i), "Which sentence is punctuated correctly?",
           good, list(bad), "Use commas for introductory clauses and nonessential info; do not splice clauses.", "interpretation", False, False, "manual_first")

    sva = [
        ("The list of failed sensors is short.", "The list of failed sensors are short.", "The list of failed sensors were short.", "The list of failed sensors have short."),
        ("Each of the Friday visits was brief.", "Each of the Friday visits were brief.", "Each of the Friday visits are brief.", "Each of the Friday visits have brief."),
        ("The data from Site 2 show a dip.", "The data from Site 2 shows a dip.", "The data from Site 2 has a dip.", "The data from Site 2 is a dip."),
        ("Neither memo agrees on the first step.", "Neither memo agree on the first step.", "Neither memo are agree on the first step.", "Neither memo have agree on the first step."),
        ("A box of packets sits by the gate.", "A box of packets sit by the gate.", "A box of packets are by the gate.", "A box of packets were by the gate."),
        ("The pair of lampposts is new.", "The pair of lampposts are new.", "The pair of lampposts were new.", "The pair of lampposts have new."),
        ("Ten minutes is a short visit.", "Ten minutes are a short visit.", "Ten minutes were a short visit.", "Ten minutes have a short visit."),
        ("The crew of three repairs the sensor.", "The crew of three repair the sensor.", "The crew of three are repair the sensor.", "The crew of three have repair the sensor."),
    ]
    for i, (good, *bad) in enumerate(sva * 2):
        mc(36, *diffs(i), "Which sentence has correct subject-verb agreement?",
           good, list(bad), "Match the real subject, not the nearest noun.", "interpretation", False, False, "manual_first")

    pronouns = [
        ("Each gardener returned a packet to the box.", "Each gardener returned theirselves a packet to the box.", "Each gardener returned them a packet to the box.", "Each gardener returned it packet to the box."),
        ("The city compared its pier readings with the airport.", "The city compared their pier readings with the airport.", "The city compared its' pier readings with the airport.", "The city compared they pier readings with the airport."),
        ("Staff logged the visits and then reviewed them.", "Staff logged the visits and then reviewed it.", "Staff logged the visits and then reviewed she.", "Staff logged the visits and then reviewed he."),
        ("Who left the unlabeled packet?", "Whom left the unlabeled packet?", "Whose left the unlabeled packet?", "Who's left the unlabeled packet?"),
        ("The riders who wanted lamps sent comments.", "The riders which wanted lamps sent comments.", "The riders whom wanted lamps sent comments.", "The riders what wanted lamps sent comments."),
        ("The agency that added lamps saw ridership recover.", "The agency who added lamps saw ridership recover.", "The agency what added lamps saw ridership recover.", "The agency whom added lamps saw ridership recover."),
        ("Maya and I counted the mayflies.", "Maya and me counted the mayflies.", "Maya and myself counted the mayflies.", "I and Maya counted the mayflies, me."),
        ("The report is on the desk; please hand it to me.", "The report is on the desk; please hand it to I.", "The report is on the desk; please hand it to myself.", "The report is on the desk; please hand they to me."),
    ]
    for i, (good, *bad) in enumerate(pronouns * 2):
        mc(37, *diffs(i), "Which sentence uses pronouns correctly?",
           good, list(bad), "Check case, agreement, and whether the noun is a person or a thing.", "interpretation", False, False, "manual_first")

    tense = [
        ("By Friday the library had tried evening hours for six weeks.", "By Friday the library has try evening hours for six weeks.", "By Friday the library trying evening hours for six weeks.", "By Friday the library will had tried evening hours for six weeks."),
        ("The sensors failed after salt spray reached the ports.", "The sensors fails after salt spray reached the ports.", "The sensors had fail after salt spray reached the ports.", "The sensors failing after salt spray reached the ports."),
        ("If the soil drops below 20 percent, the sensor group is watered.", "If the soil drops below 20 percent, the sensor group watered.", "If the soil drops below 20 percent, the sensor group watering.", "If the soil drops below 20 percent, the sensor group have watered."),
        ("Riders were pricing safety, not only distance.", "Riders was pricing safety, not only distance.", "Riders is pricing safety, not only distance.", "Riders been pricing safety, not only distance."),
    ]
    for i, (good, *bad) in enumerate(tense * 3):
        mc(38, *diffs(i), "Which sentence uses verb tense and form correctly?",
           good, list(bad), "Keep the timeline consistent and use a complete verb.", "interpretation", False, False, "manual_first")

    modifiers = [
        ("Walking at dusk, riders asked for lamps.", "Walking at dusk, lamps were asked for by riders.", "Walking at dusk, the path asked for lamps.", "Walking at dusk, comments asked lamps."),
        ("Bolted to the pier, the first sensors rusted.", "Bolted to the pier, salt rusted.", "Bolted to the pier, the airport rusted.", "Bolted to the pier, crews rusted."),
        ("Photographed and posted, each packet got a note.", "Photographed and posted, volunteers got a note.", "Photographed and posted, weeds got a note.", "Photographed and posted, the gate got a note."),
        ("Counted at noon, the mayflies were fewer at Site 2.", "Counted at noon, researchers were fewer at Site 2.", "Counted at noon, the river were fewer at Site 2.", "Counted at noon, temperatures were fewer at Site 2."),
    ]
    for i, (good, *bad) in enumerate(modifiers * 3):
        mc(39, *diffs(i), "Which sentence places the modifier so it describes the right noun?",
           good, list(bad), "The opening phrase must attach to the person or thing actually doing that action.", "interpretation", False, False, "manual_first")

    parallel = [
        ("The studio wanted color, strength, and a clean glaze.", "The studio wanted color, strength, and glazing clean.", "The studio wanted color, to be strong, and a clean glaze.", "The studio wanted colorful, strength, and a clean glaze."),
        ("Gardeners borrow, grow, and return seeds.", "Gardeners borrow, growing, and return seeds.", "Gardeners borrow, grow, and returning seeds.", "Gardeners borrow, to grow, and return seeds."),
        ("The agency redrew stops, added lamps, and watched ridership.", "The agency redrew stops, adding lamps, and watched ridership.", "The agency redrew stops, added lamps, and watching ridership.", "The agency redrew stops, to add lamps, and watched ridership."),
        ("Researchers counted insects, logged temperature, and compared sites.", "Researchers counted insects, logging temperature, and compared sites.", "Researchers counted insects, logged temperature, and comparing sites.", "Researchers counted insects, to log temperature, and compared sites."),
    ]
    for i, (good, *bad) in enumerate(parallel * 3):
        mc(40, *diffs(i), "Which sentence is parallel?",
           good, list(bad), "Keep listed items in the same grammatical form.", "interpretation", False, False, "manual_first")

    concise = [
        ("The pier gusted harder than the airport.", "The pier, which is a pier, gusted harder than the airport in a manner that was harder.", "Due to the fact that the pier gusted, it gusted harder than the airport.", "The pier gusted harder than the airport, which is to say it gusted harder."),
        ("Photos made the seed swap accountable.", "Photos that were photographs made the seed swap accountable in nature.", "The making of photos made the seed swap be accountable.", "Photos made the seed swap accountable, being photos."),
        ("Lamps at three transfers helped ridership recover.", "Lamps that were lamps at three transfers helped ridership recover back.", "The presence of lamps at three transfers helped ridership to recover back again.", "Lamps at three transfers helped ridership recover, recovering."),
        ("The sensor group grew the most mass.", "The sensor group grew the most mass, which was the most.", "The group with sensors grew the most mass in terms of mass.", "The sensor group grew the most mass, being the most mass."),
    ]
    for i, (good, *bad) in enumerate(concise * 3):
        mc(41, *diffs(i), "Which sentence is the most concise without losing the meaning?",
           good, list(bad), "Cut empty phrases that do not add information.", "interpretation", False, False, "manual_first")

    # ACT English / Reading / Science
    for i in range(12):
        mc(42, *diffs(i), "A paragraph about the basil trial currently ends by repeating the watering amounts. Which revision best develops the topic?",
           "End with the day-14 masses and the authors' conclusion about soil-sensor watering.",
           ["Delete the masses and keep only the group names", "Add a sentence about bus lamps", "List the author's favorite herbs", "Replace masses with a joke"],
           "Topic development keeps relevant results and drops side chatter.", "interpretation", False, False, "manual_first", passage=p(104))
        mc(43, *diffs(i), "Where should the sentence “Distance was never the only cost” go in the night-bus note?",
           "At the end, as the takeaway after the lamp result.",
           ["Before any mention of the map", "In the middle of a temperature table", "As the title of the basil trial", "Nowhere; delete it"],
           "Place a claim after the evidence that earns it.", "interpretation", False, False, "manual_first", passage=p(103))
        mc(44, *diffs(i), "Which sentence best matches a calm, informative tone for a science note?",
           "Day-14 leaf mass was highest in the sensor group.",
           ["The sensor group crushed the losers!", "Water is like, whatever.", "YOU MUST BELIEVE THE SENSORS.", "Basil is a vibe."],
           "ACT science/English informational tone stays specific and unfussy.", "interpretation", False, False, "manual_first")
        mc(45, *diffs(i), "Which choice is the clearest?",
           "Site 2 had fewer mayflies than Site 1.",
           ["Site 2 had a situation regarding mayflies that was different in a fewer way.", "Mayflies, being insects, at Site 2, were, fewer.", "The site known as 2 was not like 1 in bugs.", "Fewer happened at two."],
           "Clear beats decorative.", "interpretation", False, False, "manual_first")
        mc(46, *diffs(i), "Which sentence is punctuated correctly?",
           "After a warm week, researchers counted mayflies at three sites.",
           ["After a warm week researchers, counted mayflies at three sites.", "After a warm week; researchers counted mayflies at three sites.", "After, a warm week researchers counted mayflies at three sites."],
           "An introductory phrase takes a comma.", "interpretation", False, False, "manual_first")
        mc(47, *diffs(i), "Which sentence is grammatically correct?",
           "Neither site has a count above 50.",
           ["Neither site have a count above 50.", "Neither site having a count above 50.", "Neither site are a count above 50."],
           "Neither takes a singular verb.", "interpretation", False, False, "manual_first")
        mc(48, *diffs(i), "Which choice avoids a run-on?",
           "Site 3 was coldest. Its counts were also lowest.",
           ["Site 3 was coldest its counts were also lowest.", "Site 3 was coldest, its counts were also lowest.", "Site 3 was coldest its, counts were also lowest."],
           "Two independent clauses need a legal join.", "interpretation", False, False, "manual_first")

    for i in range(10):
        mc(60, *diffs(i), f"What is the main idea of this note?\n\n{PASSAGE_BANK[2][3]}",
           "Lighting changed how riders judged the new night map.",
           ["The river was drained", "Buses were free", "Staff wanted longer walks", "Lamps were removed"],
           "The comments and the recovery after lamps carry the point.", "interpretation", False, False, "manual_first", passage=p(103))
        mc(61, *diffs(i), f"It can reasonably be inferred that\n\n{PASSAGE_BANK[2][3]}",
           "Riders treated dark stops as costlier than a longer walk.",
           ["The agency measured only fuel", "Walks became shorter", "Lamps reduced the fare", "Comments were deleted"],
           "They talked about lighting more than walking.", "interpretation", False, False, "manual_first", passage=p(103))
        mc(62, *diffs(i), "In the night-bus note, recovered most nearly means",
           "moved back toward an earlier level",
           ["was invented", "was painted", "was fined", "was renamed"],
           "Context is ridership coming back after a drop.", "interpretation", False, False, "manual_first", passage=p(103))
        mc(63, *diffs(i), f"The author of the night-bus note mainly wants to\n\n{PASSAGE_BANK[2][3]}",
           "show that safety shaped the response to the new map",
           ["sell lamps", "cancel the river path", "list every stop", "attack riders"],
           "Purpose follows the evidence about comments and recovery.", "interpretation", False, False, "manual_first", passage=p(103))
        mc(64, *diffs(i), f"Compared with Memo A, Memo B\n\n{PASSAGE_BANK[7][3]}",
           "agrees the path is underused but wants staff along with lights",
           ["rejects any path use", "ignores dusk closing", "wants lights only", "denies the river exists"],
           "Both want more use; they differ on the first fix.", "interpretation", False, False, "manual_first", passage=p(108))

    science_rows = [
        (65, "According to the basil note, which group had the highest day-14 mass?", "the sensor group", ["Group A", "Group B", "a fourth unlisted group"], p(104)),
        (65, "At Site 1 the three mayfly counts were 40, 38, and 41. What is the median?", "40", ["38", "41", "119"], p(106)),
        (66, "Which trend do the basil masses support?", "Matching water to soil moisture beat both fixed schedules in this trial", ["More water always grew more mass", "Group A got no water", "Day 14 is too early to measure"], p(104)),
        (66, "Which site had the lowest mayfly counts?", "Site 3", ["Site 1", "Site 2", "A fourth site"], p(106)),
        (67, "What was the independent variable in the basil trial?", "the watering rule", ["day-14 mass", "the greenhouse building", "the authors' names"], p(104)),
        (67, "Why did researchers log noon temperature with the mayfly counts?", "to record a condition that might relate to the counts", ["to heat the river", "to replace the counts", "to name the insects"], p(106)),
        (68, "Memo A and Memo B disagree mainly about", "whether lights alone are enough", ["whether the path exists", "whether dusk happens", "whether rivers can have paths"], p(108)),
        (68, "Which claim could both memos accept?", "The current dusk closing wastes the river path", ["Lights are useless", "Staff are useless", "The path should close earlier"], p(108)),
    ]
    for i, (tidn, stem, good, bad, passage) in enumerate(science_rows * 3):
        mc(tidn, *diffs(i), stem, good, bad, "Use only the table or note; do not import outside facts.", "interpretation", False, False, "manual_first", passage=passage)


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


def emit_sql(rows: list[dict], passages_in: list[dict], out_dir: Path) -> list[Path]:
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
    pfile = out_dir / "expand-passages.sql"
    pfile.write_text("\n".join(plines))
    files.append(pfile)

    batch: list[str] = []
    batch_n = 0
    idx = 0

    def flush() -> None:
        nonlocal batch, batch_n, idx
        if not batch:
            return
        path = out_dir / f"expand-q-{idx:02d}.sql"
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
            "exam_name": "StudentQuest expanded original bank",
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
        if batch_n >= 28:
            flush()
    flush()
    return files


def main() -> None:
    generate()
    by_topic: dict[str, int] = {}
    by_test: dict[str, int] = {}
    for q in questions:
        by_topic[q["topic_name"]] = by_topic.get(q["topic_name"], 0) + 1
        by_test[q["test_type"]] = by_test.get(q["test_type"], 0) + 1
    out = Path("/tmp/expanded-bank.json")
    out.write_text(json.dumps({"passages": passages, "questions": questions}))
    files = emit_sql(questions, passages, Path("/tmp/expand-sql"))
    print("questions", len(questions), "passages", len(passages), "sat", by_test.get("SAT", 0), "act", by_test.get("ACT", 0), "sql_files", len(files))
    print("topics_covered", len(by_topic))


if __name__ == "__main__":
    main()
