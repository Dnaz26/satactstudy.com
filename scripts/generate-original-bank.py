#!/usr/bin/env python3
"""Generate original StudentQuest questions. Never copies exam wording."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

TID = "d1000000-0000-0000-0000-{}"
QID = "f3000000-0000-0000-0000-{}"
PID = "f3100000-0000-0000-0000-{}"


def tid(n: int) -> str:
    return TID.format(f"{n:012d}")


def qid(n: int) -> str:
    return QID.format(f"{n:012d}")


def pid(n: int) -> str:
    return PID.format(f"{n:012d}")


def fp(text: str, *choices: str, ans: str = "") -> str:
    def n(s: str) -> str:
        s = s.lower()
        out = []
        for ch in s:
            if ch.isalnum() or ch in " =+-*/^().,":
                out.append(ch)
        return " ".join("".join(out).split())

    parts = [n(text)] + [n(c) for c in choices] + [ans.upper()]
    return "|".join(parts)


PASSAGES = [
    {
        "id": pid(1),
        "test_type": "SAT",
        "section_name": "Reading and Writing",
        "title": "Harbor wind sensors",
        "author": "StudentQuest original",
        "content": "City engineers placed inexpensive wind sensors along an old harbor wall, hoping to predict which winter nights would ice the pedestrian path. The first season produced noisy data: gusts bounced off warehouses, and two sensors failed after salt spray. Instead of abandoning the project, the team moved the remaining devices onto lampposts and compared readings with a nearby airport. The harbor still gusted more sharply than the airport, but the pattern was stable enough to warn maintenance crews twelve hours ahead. The lesson was not that cheap sensors are perfect. It was that a messy local signal, cleaned and compared, can still be useful.",
    },
    {
        "id": pid(2),
        "test_type": "SAT",
        "section_name": "Reading and Writing",
        "title": "Seed libraries",
        "author": "StudentQuest original",
        "content": "A neighborhood seed library looks like a birdhouse, yet it runs on a civic idea: gardeners borrow seeds, grow plants, and return extra seeds the following year. Supporters argue that the box preserves varieties grocery stores ignore. Critics worry that unlabeled packets spread weeds. In one trial, volunteers photographed every packet and posted a simple growing note. Returns rose, and the weed complaints dropped. The photographs did not make gardeners more skilled overnight. They made the exchange accountable, which is often what a shared tool actually needs.",
    },
    {
        "id": pid(3),
        "test_type": "ACT",
        "section_name": "Reading",
        "title": "Night-shift maps",
        "author": "StudentQuest original",
        "content": "When a bus agency redrew its night-shift map, planners expected riders to complain about longer walks. Instead, comments focused on lighting. Stops that sat under working lamps felt shorter than closer stops in the dark. The agency had treated distance as the only cost. Riders were pricing safety. After the agency added lamps to three transfers, ridership on those lines recovered within a month. The map still mattered, but it was no longer the whole story.",
    },
    {
        "id": pid(4),
        "test_type": "ACT",
        "section_name": "Science",
        "title": "Soil moisture trial",
        "author": "StudentQuest original",
        "content": "Researchers compared two watering schedules for greenhouse basil. Group A received 40 mL every morning. Group B received 80 mL every other morning. Leaf mass was recorded on day 14. Group A averaged 3.2 g per plant; Group B averaged 2.7 g. A third group, watered only when soil sensors dropped below 20 percent moisture, averaged 3.6 g. The authors concluded that matching water to soil moisture outperformed both fixed schedules in this greenhouse.",
    },
]

questions: list[dict] = []
n = 0


def add(q: dict) -> None:
    global n
    n += 1
    q["id"] = qid(n)
    q["slug"] = q.get("slug") or f"q-{n:03d}"
    q["source_type"] = "original_derived_reference"
    q["source_rights_status"] = "owned"
    q.setdefault("choice_e", None)
    q.setdefault("passage_id", None)
    q.setdefault("secondary_topic_id", None)
    q.setdefault("english_strategy_slug", None)
    q["fingerprint"] = fp(
        q["question_text"],
        q.get("choice_a") or "",
        q.get("choice_b") or "",
        q.get("choice_c") or "",
        q.get("choice_d") or "",
        q.get("choice_e") or "",
        ans=q["correct_answer"],
    )
    questions.append(q)


def mc(test, section, category, topic, tidn, diff, score, text, choices, ans, expl, reason, calc, desmos, mode, **kw):
    labels = "ABCDE"
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
    }
    for i, c in enumerate(choices):
        row[f"choice_{labels[i].lower()}"] = c
    row.update(kw)
    add(row)


def spr(test, section, category, topic, tidn, diff, score, text, ans, expl, reason, calc, desmos, mode, **kw):
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
        **kw,
    })


# --- SAT Math: 24 topics × 2 ---
mc("SAT", "Math", "Algebra", "Linear Equations", 1, "easy", 0.28,
   "What value of $x$ satisfies $5x - 8 = 27$?",
   ["5", "6", "7", "8"], "C",
   "Add 8 to both sides to get $5x=35$, then divide by 5 to get $x=7$. Choice B forgets the last division.",
   "algebraic manipulation", False, False, "manual_first")
spr("SAT", "Math", "Algebra", "Linear Equations", 1, "medium", 0.52,
    "Solve $\\frac{2x}{5} + 3 = 11$. What is $x$?",
    20,
    "Subtract 3 to get $\\frac{2x}{5}=8$. Multiply both sides by 5/2 to get $x=20$. Graphing both sides also works, but the arithmetic is faster.",
    "algebraic manipulation", True, True, "hybrid")

mc("SAT", "Math", "Algebra", "Linear Inequalities", 2, "easy", 0.30,
   "Which of the following is equivalent to $3x + 4 < 19$?",
   ["$x < 5$", "$x < 7$", "$x > 5$", "$x > 7$"], "A",
   "Subtract 4, then divide by 3: $x<5$. Reversing the inequality is the common trap when people divide by a negative that is not actually there.",
   "algebraic manipulation", False, False, "manual_first")
mc("SAT", "Math", "Algebra", "Linear Inequalities", 2, "medium", 0.55,
   "A shop will mail a box only if its weight $w$ in pounds satisfies $w \\le 12$. Which graph represents the allowed weights?",
   ["A closed circle at 12 and shading left", "An open circle at 12 and shading left", "A closed circle at 12 and shading right", "An open circle at 12 and shading right"], "A",
   "$\\le$ includes 12, so the endpoint is closed, and smaller weights are allowed, so shade left. Desmos can shade $x\\le 12$, but you still must know closed vs open.",
   "interpretation", True, True, "hybrid")

mc("SAT", "Math", "Algebra", "Systems of Equations", 3, "easy", 0.42,
   "What is the solution to the system $y = 3x - 1$ and $y = -x + 11$?",
   ["$(2, 5)$", "$(3, 8)$", "$(4, 11)$", "$(5, 6)$"], "B",
   "Set $3x-1=-x+11$ to get $4x=12$, so $x=3$ and $y=8$. Graphing both lines and reading the intersection is a valid Desmos-first method.",
   "algebraic manipulation", True, True, "desmos_first",
   secondary_topic_id=tid(5), secondary_topic_name="Linear Functions")
mc("SAT", "Math", "Algebra", "Systems of Equations", 3, "hard", 0.72,
   "The system $2x - y = 10$ and $6y = 12x + 36$ has how many solutions?",
   ["Zero", "Exactly one", "Exactly two", "Infinitely many"], "A",
   "Rewrite the second as $y=2x+6$. The first is $y=2x-10$. Parallel distinct lines never meet, so there is no solution. Graphing makes the parallel slopes obvious.",
   "modeling", True, True, "desmos_first")

mc("SAT", "Math", "Algebra", "Systems of Inequalities", 4, "medium", 0.58,
   "Which point is a solution of both $y \\ge 2x + 1$ and $y \\le -x + 8$?",
   ["$(0, 0)$", "$(1, 4)$", "$(5, 1)$", "$(6, 0)$"], "B",
   "$(1,4)$ satisfies $4\\ge 3$ and $4\\le 7$. $(0,0)$ fails the first inequality. The overlap of the two shaded half-planes is the Desmos picture.",
   "interpretation", True, True, "desmos_first")
mc("SAT", "Math", "Algebra", "Systems of Inequalities", 4, "hard", 0.74,
   "A bakery uses flour $f$ and sugar $s$ with $f + s \\le 20$ and $s \\ge 2f$. Which pair $(f, s)$ is possible?",
   ["$(10, 12)$", "$(6, 14)$", "$(8, 10)$", "$(12, 6)$"], "B",
   "$6+14=20$ and $14\\ge 12$. $(10,12)$ fails $s\\ge 2f$. Graphing the feasible region shows the overlap quickly.",
   "modeling", True, True, "hybrid")

mc("SAT", "Math", "Algebra", "Linear Functions", 5, "easy", 0.32,
   "If $f(x) = 4x - 9$, what is $f(5)$?",
   ["9", "11", "20", "29"], "B",
   "$f(5)=20-9=11$. Substituting into the rule is faster than a graph.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Algebra", "Linear Functions", 5, "medium", 0.50,
   "A taxi fare is $3.50 plus $2.25 per mile. Which function gives the fare $C$ after $m$ miles?",
   ["$C=2.25m-3.50$", "$C=3.50m+2.25$", "$C=2.25m+3.50$", "$C=3.50m-2.25$"], "C",
   "Fixed fee is the intercept; the per-mile charge is the slope. Mixing them is the usual trap.",
   "modeling", True, True, "hybrid")

mc("SAT", "Math", "Algebra", "Slope and Rate of Change", 6, "easy", 0.30,
   "A line passes through $(1, 4)$ and $(5, 12)$. What is its slope?",
   ["1", "2", "3", "4"], "B",
   "Slope is $\\frac{12-4}{5-1}=\\frac{8}{4}=2$.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Algebra", "Slope and Rate of Change", 6, "medium", 0.56,
   "A tank holds 40 gallons at $t=0$ hours and 22 gallons at $t=6$ hours. What is the average rate of change in gallons per hour?",
   ["$-3$", "$-2$", "$2$", "$3$"], "A",
   "$(22-40)/6=-18/6=-3$. The tank is emptying, so the rate is negative.",
   "interpretation", True, False, "manual_first")

mc("SAT", "Math", "Advanced Math", "Quadratics", 7, "medium", 0.60,
   "What are the solutions of $x^2 - 5x + 4 = 0$?",
   ["$x=1$ and $x=4$", "$x=-1$ and $x=-4$", "$x=2$ and $x=3$", "$x=-2$ and $x=2$"], "A",
   "Factor as $(x-1)(x-4)=0$. The x-intercepts of $y=x^2-5x+4$ are those same roots.",
   "algebraic manipulation", True, True, "desmos_first")
mc("SAT", "Math", "Advanced Math", "Quadratics", 7, "hard", 0.76,
   "A ball’s height in feet is $h(t)=-16t^2+48t+4$. What is the maximum height?",
   ["36", "40", "44", "52"], "B",
   "The vertex is at $t=48/(32)=1.5$, and $h(1.5)=40$. Desmos marks that peak as a point of interest.",
   "modeling", True, True, "desmos_first")

mc("SAT", "Math", "Advanced Math", "Polynomials", 8, "medium", 0.58,
   "How many real zeros does $p(x)=x^3-3x+1$ have?",
   ["0", "1", "2", "3"], "D",
   "A cubic always has at least one real root; the graph crosses the x-axis three times. Counting intercepts on the graph is the fast method.",
   "interpretation", True, True, "desmos_first")
mc("SAT", "Math", "Advanced Math", "Polynomials", 8, "hard", 0.78,
   "If $(x-2)$ is a factor of $x^3 + ax^2 - 4x - 8$, what is $a$?",
   ["$-2$", "$0$", "$2$", "$4$"], "C",
   "By the factor theorem, $p(2)=0$: $8+4a-8-8=0$ so $4a=8$ and $a=2$.",
   "algebraic manipulation", True, False, "manual_first")

mc("SAT", "Math", "Advanced Math", "Exponents and Radicals", 9, "easy", 0.34,
   "Which is equivalent to $8^{2/3}$?",
   ["2", "4", "16", "64"], "B",
   "$8^{1/3}=2$ and $2^2=4$. Treating the fraction as 8/3 is the trap.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Advanced Math", "Exponents and Radicals", 9, "medium", 0.62,
   "An account starts at $40 and grows by 20% each year. A linear model is $y=20x+40$. After how many whole years is the exponential model first larger?",
   ["2", "3", "4", "5"], "C",
   "Compare $40(1.2)^x$ with $20x+40$. They meet near $x=3.8$, so the exponential is first larger at year 4. Graph both.",
   "modeling", True, True, "desmos_first",
   secondary_topic_id=tid(5), secondary_topic_name="Linear Functions")

mc("SAT", "Math", "Advanced Math", "Rational Expressions", 10, "medium", 0.64,
   "For $x \\ne 3$, which expression equals $\\frac{x^2-9}{x-3}$?",
   ["$x-3$", "$x+3$", "$x^2-3$", "$x-9$"], "B",
   "Factor the numerator as $(x-3)(x+3)$ and cancel $x-3$. Direct substitution of a test value such as $x=5$ also confirms 8.",
   "algebraic manipulation", True, True, "hybrid")
mc("SAT", "Math", "Advanced Math", "Rational Expressions", 10, "hard", 0.80,
   "Solve $\\frac{2x}{3} - \\frac{x}{6} = 4$.",
   ["6", "8", "10", "12"], "B",
   "Common denominator 6: $\\frac{4x-x}{6}=4$ so $x=8$. Graphing $y=(2x)/3-x/6$ and $y=4$ intersects at $x=8$.",
   "algebraic manipulation", True, True, "desmos_first")

mc("SAT", "Math", "Advanced Math", "Functions", 11, "easy", 0.33,
   "If $g(x)=x^2+3x$, what is $g(3)$?",
   ["9", "12", "18", "21"], "C",
   "$9+9=18$. Defining $g(x)$ then typing $g(3)$ in Desmos also works.",
   "computation", True, True, "desmos_first")
mc("SAT", "Math", "Advanced Math", "Functions", 11, "medium", 0.54,
   "The function $h$ is defined by $h(x)=2x+1$. For which $x$ is $h(x)=g(x)$ if $g(x)=x^2$?",
   ["$x=1$ only", "$x=-1$ only", "$x=-1$ and $x=2$", "$x=1$ and $x=-2$"], "C",
   "Solve $x^2=2x+1$ → $x^2-2x-1=0$. The graphs $y=x^2$ and $y=2x+1$ cross near $-0.4$ wait: $x=1$: 1 vs 3, not equal. $x=-1$: 1 vs -1, no. Let me recalculate. $x^2 - 2x - 1 = 0$ has roots $1\\pm\\sqrt{2}$, not -1 and 2. Fix choices.",
   "algebraic manipulation", True, True, "desmos_first")

# Fix functions q2 - I'll overwrite last question by popping and re-adding
questions.pop()
n -= 1
mc("SAT", "Math", "Advanced Math", "Functions", 11, "medium", 0.54,
   "If $h(x)=2x+1$ and $g(x)=x^2$, which $x$ satisfies $h(x)=g(x)$?",
   ["$x=1$ only", "$x=-1$ and $x=2$", "$x=-1$ only", "no real $x$"], "B",
   "$x^2=2x+1$ → $x^2-2x-1=0$. Wait, $x=-1$: g=1, h=-1. $x=2$: g=4, h=5. Neither works. Correct equation $x^2-2x-1=0$ is not those integers. Use $g(x)=x^2$ and $h(x)=3x-2$: at x=1, 1 vs 1; at x=2, 4 vs 4.",
   "algebraic manipulation", True, True, "desmos_first")

questions.pop()
n -= 1
mc("SAT", "Math", "Advanced Math", "Functions", 11, "medium", 0.54,
   "If $h(x)=3x-2$ and $g(x)=x^2$, which values of $x$ satisfy $h(x)=g(x)$?",
   ["1 only", "2 only", "1 and 2", "0 and 3"], "C",
   "Set $x^2=3x-2$ so $x^2-3x+2=0=(x-1)(x-2)$. Both $x=1$ and $x=2$ work. Graph $y=x^2$ and $y=3x-2$ and read both intersections.",
   "algebraic manipulation", True, True, "desmos_first")

mc("SAT", "Math", "Advanced Math", "Nonlinear Equations", 12, "medium", 0.61,
   "How many real solutions does $|x-2| = 5$ have?",
   ["0", "1", "2", "infinitely many"], "C",
   "$x-2=5$ or $x-2=-5$, so $x=7$ or $x=-3$. Two points on the V-graph meet $y=5$.",
   "algebraic manipulation", True, True, "hybrid")
mc("SAT", "Math", "Advanced Math", "Nonlinear Equations", 12, "hard", 0.77,
   "Solve $x^3 = 4x$. How many real solutions are there?",
   ["1", "2", "3", "4"], "C",
   "$x^3-4x=0$ → $x(x-2)(x+2)=0$, so $x=-2,0,2$. Three x-intercepts.",
   "algebraic manipulation", True, True, "desmos_first")

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Ratios and Proportions", 13, "easy", 0.27,
   "A recipe uses 3 cups of oats for every 2 cups of milk. How many cups of milk are needed for 12 cups of oats?",
   ["6", "8", "9", "18"], "B",
   "$3/2=12/m$ so $3m=24$ and $m=8$.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Ratios and Proportions", 13, "medium", 0.51,
   "On a map, 2 centimeters represent 15 kilometers. How many kilometers do 7 centimeters represent?",
   ["45", "50.5", "52.5", "105"], "C",
   "$2/15=7/k$ → $2k=105$ → $k=52.5$.",
   "computation", True, False, "manual_first")

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Percentages", 14, "easy", 0.26,
   "What is 15% of 80?",
   ["8", "12", "15", "18"], "B",
   "$0.15\\times 80=12$. Opening Desmos is slower.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Percentages", 14, "medium", 0.53,
   "A jacket costs $80 after a 20% discount. What was the original price?",
   ["$96$", "$100$", "$104$", "$120$"], "B",
   "The sale price is 80% of original, so original is $80/0.8=100$. Adding 20% of 80 is the trap ($96$).",
   "algebraic manipulation", True, False, "manual_first")

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Unit Conversions", 15, "easy", 0.31,
   "There are 16 ounces in a pound. How many ounces are in 3.5 pounds?",
   ["48", "52", "56", "64"], "C",
   "$3.5\\times 16=56$.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Unit Conversions", 15, "medium", 0.57,
   "A runner travels 9 kilometers in 45 minutes. What is that speed in kilometers per hour?",
   ["9", "10", "12", "15"], "C",
   "45 minutes is 0.75 hours, so $9/0.75=12$ km/h.",
   "computation", True, False, "manual_first")

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Statistics and Data", 16, "easy", 0.35,
   "The data set is $4, 7, 7, 10$. What is the mean?",
   ["6", "7", "7.5", "8"], "B",
   "Sum is 28; $28/4=7$. The mean and median happen to match here.",
   "computation", True, True, "desmos_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Statistics and Data", 16, "medium", 0.59,
   "The list $2, 3, 3, 4, 4, 4, 18$ has a mean that is larger than the median. Why?",
   ["The mode is 3", "18 is an outlier that pulls the mean up", "The list has an odd count", "The median ignores the middle"], "B",
   "The median is 4; 18 inflates the mean. A boxplot makes the outlier visible.",
   "interpretation", True, True, "hybrid")

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Probability", 17, "easy", 0.29,
   "A bag has 3 red and 5 blue marbles. One marble is drawn at random. What is the probability it is red?",
   ["$3/5$", "$3/8$", "$5/8$", "$1/3$"], "B",
   "3 of 8 marbles are red.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Probability", 17, "medium", 0.58,
   "A club of 6 students chooses a 2-person committee. How many different committees are possible?",
   ["12", "15", "30", "36"], "B",
   "Order does not matter, so $nCr(6,2)=15$. $nPr=30$ is the ordered trap.",
   "computation", True, True, "hybrid",
   english_strategy_slug=None)

mc("SAT", "Math", "Problem-Solving and Data Analysis", "Data Interpretation", 18, "easy", 0.36,
   "A table shows hours studied $1,2,4,5$ with scores $62,68,80,86$. What score is paired with 4 hours?",
   ["62", "68", "80", "86"], "C",
   "Read the matching row. A regression is unnecessary for a lookup.",
   "data analysis", True, False, "manual_first")
mc("SAT", "Math", "Problem-Solving and Data Analysis", "Data Interpretation", 18, "hard", 0.73,
   "Hours $1,2,4,5$ pair with scores $62,68,80,86$. Which linear model best fits?",
   ["$y=6x+56$", "$y=8x+50$", "$y=10x+50$", "$y=12x+40$"], "A",
   "From (1,62) to (5,86) slope is $24/4=6$, intercept near 56. A table plus $y_1 \\sim mx_1+b$ confirms $m=6$.",
   "data analysis", True, True, "desmos_first",
   secondary_topic_id=tid(6), secondary_topic_name="Slope and Rate of Change")

mc("SAT", "Math", "Geometry and Trigonometry", "Angles and Lines", 19, "easy", 0.31,
   "Two supplementary angles have measures $3x$ and $x+20$. What is $x$?",
   ["40", "45", "50", "80"], "A",
   "$3x+(x+20)=180$ → $4x=160$ → $x=40$.",
   "geometry", False, False, "manual_first")
mc("SAT", "Math", "Geometry and Trigonometry", "Angles and Lines", 19, "medium", 0.55,
   "Parallel lines are cut by a transversal. If one interior angle is $118^\\circ$, what is the consecutive interior angle?",
   ["62", "72", "118", "242"], "A",
   "Consecutive interior angles are supplementary: $180-118=62$.",
   "geometry", False, False, "manual_first")

mc("SAT", "Math", "Geometry and Trigonometry", "Triangles", 20, "easy", 0.33,
   "A right triangle has legs 6 and 8. What is the hypotenuse?",
   ["9", "10", "12", "14"], "B",
   "$6^2+8^2=36+64=100$, so the hypotenuse is 10. This is a 3-4-5 multiple.",
   "geometry", False, False, "manual_first")
mc("SAT", "Math", "Geometry and Trigonometry", "Triangles", 20, "medium", 0.60,
   "In triangle $ABC$, $AB=AC$ and $\\angle BAC=40^\\circ$. What is $\\angle ABC$?",
   ["40", "70", "80", "100"], "B",
   "Base angles of an isosceles triangle are equal: $(180-40)/2=70$.",
   "geometry", False, False, "manual_first")

mc("SAT", "Math", "Geometry and Trigonometry", "Circles", 21, "easy", 0.38,
   "A circle has equation $x^2+y^2=25$. What is its radius?",
   ["5", "10", "12.5", "25"], "A",
   "$r^2=25$ so $r=5$. Graphing the circle makes the radius visible.",
   "geometry", True, True, "desmos_first")
mc("SAT", "Math", "Geometry and Trigonometry", "Circles", 21, "medium", 0.63,
   "A circle is centered at $(2,-1)$ with radius 6. Which equation represents it?",
   ["$(x-2)^2+(y+1)^2=36$", "$(x+2)^2+(y-1)^2=36$", "$(x-2)^2+(y+1)^2=6$", "$(x-2)^2+(y-1)^2=36$"], "A",
   "Center $(h,k)$ gives $(x-h)^2+(y-k)^2=r^2$. Here $k=-1$, so $y-(-1)=y+1$, and $r^2=36$.",
   "geometry", True, True, "hybrid")

mc("SAT", "Math", "Geometry and Trigonometry", "Area and Volume", 22, "easy", 0.29,
   "A rectangle is 9 by 4. What is its area?",
   ["13", "26", "36", "72"], "C",
   "$9\\times 4=36$. Perimeter 26 is the trap.",
   "computation", False, False, "manual_first")
mc("SAT", "Math", "Geometry and Trigonometry", "Area and Volume", 22, "medium", 0.57,
   "A cylinder has radius 3 and height 10. What is its volume? (Use $\\pi$.)",
   ["$30\\pi$", "$60\\pi$", "$90\\pi$", "$120\\pi$"], "C",
   "$V=\\pi r^2 h=\\pi\\cdot 9\\cdot 10=90\\pi$. Forgetting to square the radius yields $30\\pi$.",
   "geometry", True, False, "manual_first")

mc("SAT", "Math", "Geometry and Trigonometry", "Coordinate Geometry", 23, "easy", 0.34,
   "What is the midpoint of $(0, 2)$ and $(4, 6)$?",
   ["$(2, 4)$", "$(4, 8)$", "$(2, 2)$", "$(1, 4)$"], "A",
   "Average the coordinates: $((0+4)/2,(2+6)/2)=(2,4)$.",
   "geometry", True, True, "hybrid")
mc("SAT", "Math", "Geometry and Trigonometry", "Coordinate Geometry", 23, "medium", 0.58,
   "What is the distance between $(0, 2)$ and $(4, 5)$?",
   ["3", "4", "5", "7"], "C",
   "$\\sqrt{(4-0)^2+(5-2)^2}=\\sqrt{16+9}=5$. Desmos `distance((0,2),(4,5))` confirms it.",
   "geometry", True, True, "hybrid")

mc("SAT", "Math", "Geometry and Trigonometry", "Trigonometry", 24, "easy", 0.40,
   "In a right triangle, $\\sin \\theta = 3/5$. What is $\\cos \\theta$ if $\\theta$ is acute?",
   ["$3/4$", "$4/5$", "$5/3$", "$5/4$"], "B",
   "The adjacent side is 4 in a 3-4-5 triangle, so $\\cos\\theta=4/5$. Degree mode is required if you evaluate with a calculator.",
   "geometry", True, True, "hybrid")
mc("SAT", "Math", "Geometry and Trigonometry", "Trigonometry", 24, "medium", 0.66,
   "If $\\tan \\theta = 1$ and $0^\\circ < \\theta < 90^\\circ$, what is $\\theta$?",
   ["30", "45", "60", "90"], "B",
   "Tangent is 1 at $45^\\circ$. Desmos in degree mode graphs $y=\\tan(x)$ crossing $y=1$ at 45.",
   "geometry", True, True, "desmos_first")

# SAT R&W 025-041
mc("SAT", "Reading and Writing", "Information and Ideas", "Main Idea", 25, "easy", 0.40,
   "Which choice best states the main idea of the harbor sensors passage?",
   ["Cheap sensors never work near water.", "A noisy local signal can still support a useful warning after it is cleaned and compared.", "Airports should replace harbor sensors.", "Salt spray is the only engineering problem that matters."], "B",
   "The closing sentences say messy local data can still help after comparison. A and C overclaim. Use the whole-passage test.",
   "inference", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="main_idea_whole")
mc("SAT", "Reading and Writing", "Information and Ideas", "Main Idea", 25, "medium", 0.55,
   "The seed-library passage is primarily concerned with",
   ["proving grocery stores sell the wrong vegetables", "showing that accountability, not just enthusiasm, keeps a shared tool working", "arguing that weeds cannot be controlled", "describing birdhouse carpentry"], "B",
   "The last two sentences name accountability as the real need. Details about weeds support that claim; they are not the whole point.",
   "inference", False, False, "manual_first",
   passage_id=pid(2), english_strategy_slug="main_idea_whole")

mc("SAT", "Reading and Writing", "Information and Ideas", "Evidence and Details", 26, "easy", 0.38,
   "According to the harbor passage, what did the team do after two sensors failed?",
   ["They canceled the project.", "They moved remaining devices onto lampposts and compared readings with an airport.", "They replaced the harbor wall.", "They used only warehouse data."], "B",
   "The text states they moved devices and compared with a nearby airport.",
   "evidence", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="must_be_supported")
mc("SAT", "Reading and Writing", "Information and Ideas", "Evidence and Details", 26, "medium", 0.52,
   "Which detail from the seed-library passage most directly supports the claim that accountability improved the project?",
   ["The box looks like a birdhouse.", "Grocery stores ignore some varieties.", "After photographs and notes, returns rose and weed complaints dropped.", "Gardeners like civic ideas."], "C",
   "Only that sentence reports the before/after change tied to the new process.",
   "evidence", False, False, "manual_first",
   passage_id=pid(2), english_strategy_slug="must_be_supported")

mc("SAT", "Reading and Writing", "Information and Ideas", "Inference", 27, "medium", 0.57,
   "The harbor passage most strongly implies that",
   ["the airport sensors were inaccurate", "useful prediction can come from imperfect instruments if the workflow is revised", "twelve-hour warnings are legally required", "salt spray can be eliminated"], "B",
   "The lesson sentence supports B. The other choices add facts the passage never proves.",
   "inference", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="must_be_supported")
mc("SAT", "Reading and Writing", "Information and Ideas", "Inference", 27, "hard", 0.70,
   "Based on the seed-library passage, the author would most likely agree that",
   ["shared tools fail unless someone can check what is being exchanged", "photographs replace the need for growing notes", "weed complaints prove the library should close", "civic ideas work without procedures"], "A",
   "Accountability is the stated lesson. C overreaches from a problem that later dropped.",
   "inference", False, False, "manual_first",
   passage_id=pid(2), english_strategy_slug="must_be_supported")

mc("SAT", "Reading and Writing", "Craft and Structure", "Words in Context", 28, "easy", 0.36,
   "In the harbor passage, “stable” most nearly means",
   ["motionless", "politically conservative", "consistent enough to use", "frozen"], "C",
   "The pattern is “stable enough to warn crews,” so consistent/usable, not motionless.",
   "vocabulary", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="prefix_root_suffix")
mc("SAT", "Reading and Writing", "Craft and Structure", "Words in Context", 28, "medium", 0.50,
   "In the seed-library passage, “accountable” most nearly means",
   ["famous", "able to be checked and traced", "expensive", "secret"], "B",
   "Photographs and notes make the exchange checkable. Prefix/root: account as a record.",
   "vocabulary", False, False, "manual_first",
   passage_id=pid(2), english_strategy_slug="prefix_root_suffix")

mc("SAT", "Reading and Writing", "Craft and Structure", "Author Purpose", 29, "medium", 0.54,
   "The harbor author’s primary purpose is to",
   ["entertain with a storm story", "explain how a flawed measurement system became useful", "argue that airports should close", "list every sensor brand"], "B",
   "The arc is problem → revision → lesson. That is an explanatory purpose.",
   "inference", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="main_idea_whole")
mc("SAT", "Reading and Writing", "Craft and Structure", "Author Purpose", 29, "medium", 0.56,
   "Why does the seed-library author mention critics who worry about weeds?",
   ["To dismiss gardening", "To introduce a problem the later procedure addresses", "To prove grocery stores are better", "To describe birdhouses"], "B",
   "The criticism sets up the trial that reduced complaints.",
   "inference", False, False, "manual_first",
   passage_id=pid(2))

mc("SAT", "Reading and Writing", "Craft and Structure", "Text Structure", 30, "medium", 0.58,
   "Which best describes the structure of the harbor passage?",
   ["A strict chronological diary with no conclusion", "Problem, failed first attempt, revision, and a stated lesson", "A debate between two named scientists", "A list of unrelated facts"], "B",
   "The passage moves from noisy data to a moved-sensor fix to an explicit lesson.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(1), english_strategy_slug="main_idea_whole")
mc("SAT", "Reading and Writing", "Craft and Structure", "Text Structure", 30, "hard", 0.68,
   "The seed-library passage is organized mainly as",
   ["definition, objection, trial, conclusion", "strict cause-and-effect with dates", "compare-and-contrast of two cities", "a how-to manual"], "A",
   "It defines the box, raises the weed objection, reports a trial, then concludes.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(2))

mc("SAT", "Reading and Writing", "Expression of Ideas", "Transitions", 31, "easy", 0.34,
   "Harbor wall sensors failed after salt spray. _____ the team moved the remaining devices onto lampposts. Which transition best fits?",
   ["Therefore", "For example", "In contrast", "Meanwhile"], "A",
   "The second sentence is the response to the failure, a cause-effect link. Name the relationship before the choices.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="transition_relationship")
mc("SAT", "Reading and Writing", "Expression of Ideas", "Transitions", 31, "medium", 0.52,
   "Returns rose. _____ weed complaints dropped. Which choice best connects the sentences if both are good results of the same trial?",
   ["However,", "Instead,", "Likewise,", "Previously,"], "C",
   "Both results move in a positive direction, so addition/similarity, not contrast.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="transition_relationship")

mc("SAT", "Reading and Writing", "Expression of Ideas", "Rhetorical Synthesis", 32, "medium", 0.60,
   "A student wants to emphasize that local data needed comparison, not replacement. Which note best accomplishes that goal?",
   ["The airport is farther inland.", "Harbor gusts were sharper than airport gusts, but the pattern still supported a twelve-hour warning.", "Two sensors failed.", "Warehouses bounce wind."], "B",
   "Only B pairs the difference with the still-useful warning, which is the assigned goal.",
   "interpretation", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Expression of Ideas", "Rhetorical Synthesis", 32, "hard", 0.72,
   "A student must show that a civic tool failed until a record existed. Which sentence should be included?",
   ["The box looks like a birdhouse.", "Volunteers photographed packets, and weed complaints dropped.", "Grocery stores ignore some seeds.", "Gardeners like neighborhoods."], "B",
   "The photograph procedure is the record; the drop in complaints is the result.",
   "interpretation", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Expression of Ideas", "Organization and Flow", 33, "medium", 0.55,
   "Where should a sentence defining “local signal” be placed in the harbor passage?",
   ["After the lesson sentence", "Before any sensors are mentioned", "Right after the first mention of noisy harbor data", "In a new paragraph about airports only"], "C",
   "Define a term where the reader first needs it, not after the conclusion.",
   "interpretation", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Expression of Ideas", "Organization and Flow", 33, "hard", 0.69,
   "Which sentence is least relevant to the seed-library argument and should be deleted?",
   ["Critics worry unlabeled packets spread weeds.", "In one trial, volunteers photographed every packet.", "Some birdhouses are painted blue.", "Returns rose after the notes were posted."], "C",
   "Paint color does not affect accountability or weeds.",
   "interpretation", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Sentence Boundaries", 34, "easy", 0.32,
   "Which choice correctly joins the sentences? The path iced. Crews needed a warning.",
   ["The path iced, crews needed a warning.", "The path iced crews needed a warning.", "The path iced; crews needed a warning.", "The path iced: crews, needed a warning."], "C",
   "Two complete sentences need a period or semicolon, not a comma splice.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Sentence Boundaries", 34, "medium", 0.50,
   "Which is acceptable?",
   ["Because the sensors failed the team moved them.", "Because the sensors failed, the team moved them.", "Because the sensors failed; the team moved them.", "Because the sensors failed: the team moved them."], "B",
   "A dependent clause needs a comma before the independent clause, not a semicolon.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Punctuation", 35, "easy", 0.33,
   "Choose the correct punctuation: The result was clear ___ the path could be treated overnight.",
   [",", ";", ":", "— and ,"], "C",
   "A colon introduces an explanation after a complete setup clause.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Punctuation", 35, "medium", 0.51,
   "Which sentence is punctuated correctly?",
   ["The gardeners, who returned seeds, posted notes.", "The gardeners who returned seeds posted, notes.", "The gardeners who, returned seeds posted notes.", "The gardeners who returned seeds, posted notes, last year."], "A",
   "The nonrestrictive who-clause takes commas on both sides if it is extra; here it is a clean appositive-style clause. A is the only grammatical option.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Subject-Verb Agreement", 36, "easy", 0.30,
   "The box of samples ___ missing.",
   ["are", "is", "were", "have been"], "B",
   "The subject is box, singular. Ignore “of samples.”",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="remove_interrupter")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Subject-Verb Agreement", 36, "medium", 0.48,
   "Each of the sensors on the lampposts ___ a timestamp.",
   ["record", "records", "are recording", "have recorded"], "B",
   "Each is singular. The prepositional phrase is an interrupter.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="remove_interrupter")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Pronouns", 37, "easy", 0.31,
   "Every gardener should return ___ extra seeds.",
   ["their", "his or her", "its", "they"], "B",
   "Formal SAT agreement still prefers a singular possessive with every. Its cannot refer to a person.",
   "grammar rule", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Pronouns", 37, "medium", 0.49,
   "The committee published ___ findings on Monday.",
   ["its", "their", "it's", "there"], "A",
   "Committee as a unit takes its. It's means it is.",
   "grammar rule", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Verb Tense and Form", 38, "easy", 0.29,
   "Last winter the path ___ twice.",
   ["ices", "iced", "will ice", "is icing"], "B",
   "Last winter requires past tense.",
   "grammar rule", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Verb Tense and Form", 38, "medium", 0.47,
   "By the time crews arrived, the warning ___ already ___ sent.",
   ["has / been", "had / been", "will / be", "is / being"], "B",
   "Past perfect marks an action completed before another past action.",
   "grammar rule", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Modifiers", 39, "easy", 0.35,
   "Which sentence places the modifier correctly?",
   ["Walking to the harbor, the sensors were checked by Mira.", "Walking to the harbor, Mira checked the sensors.", "The sensors were checked walking to the harbor by Mira.", "Checked by Mira walking the sensors to the harbor."], "B",
   "The walker must be Mira, not the sensors.",
   "grammar rule", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Modifiers", 39, "medium", 0.53,
   "Which choice avoids a dangling modifier?",
   ["To reduce weeds, photographs were taken.", "To reduce weeds, volunteers photographed the packets.", "To reduce weeds, the packets photographed volunteers.", "To reduce weeds, photographing happened."], "B",
   "The people who intended to reduce weeds must be the subject.",
   "grammar rule", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Parallelism", 40, "easy", 0.34,
   "The team moved the sensors, compared the readings, and ___ the crews.",
   ["warning", "to warn", "warned", "were warning"], "C",
   "Moved, compared, warned are parallel past verbs.",
   "grammar rule", False, False, "manual_first")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Parallelism", 40, "medium", 0.52,
   "Gardeners can borrow seeds, grow plants, and ___ extras.",
   ["the return of", "returning", "return", "to have returned"], "C",
   "Borrow, grow, return.",
   "grammar rule", False, False, "manual_first")

mc("SAT", "Reading and Writing", "Standard English Conventions", "Concision", 41, "easy", 0.28,
   "Which is the most concise replacement for “the final outcome was a success”?",
   ["the final outcome was a success", "the outcome was a success", "the final ending outcome was successful in the end", "the outcome that was final was a success"], "B",
   "Final and outcome overlap. Cut the repeat.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="concision_no_repeat")
mc("SAT", "Reading and Writing", "Standard English Conventions", "Concision", 41, "medium", 0.46,
   "Which is most concise?",
   ["each and every gardener", "every gardener", "each and every single gardener", "all of the gardeners each"], "B",
   "Each and every is redundant.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="concision_no_repeat")

# ACT 042-068
mc("ACT", "English", "Production of Writing", "Topic Development", 42, "easy", 0.40,
   "The writer wants to introduce a paragraph about lighting at bus stops. Which sentence is most relevant?",
   ["Buses are painted red in some cities.", "Riders said a lit stop felt closer than a dark one even if the walk was longer.", "Night-shift maps use many colors.", "Agencies reprint maps yearly."], "B",
   "Only B is about lighting and rider perception, which is the paragraph goal.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(3))
mc("ACT", "English", "Production of Writing", "Topic Development", 42, "medium", 0.56,
   "Which sentence should be deleted because it does not develop the lighting claim?",
   ["Stops under working lamps felt shorter.", "The agency added lamps to three transfers.", "Some buses have USB chargers.", "Ridership recovered within a month."], "C",
   "USB chargers are off-topic.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(3))

mc("ACT", "English", "Production of Writing", "Organization", 43, "easy", 0.42,
   "For the night-shift map passage, which order is most logical?",
   ["Conclusion, then the problem", "Expectation, surprise, cause, fix, result", "Fix, then the original expectation with no result", "Random rider quotes only"], "B",
   "The passage already follows expectation → surprise → insight → action → result.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(3))
mc("ACT", "English", "Production of Writing", "Organization", 43, "medium", 0.55,
   "The writer wants to end with the lesson. Which closing is best?",
   ["The map still mattered, but it was no longer the whole story.", "Buses have wheels.", "Lighting is a physics topic.", "Reprint the map in color."], "A",
   "A restates the insight without a new unrelated fact.",
   "interpretation", False, False, "manual_first",
   passage_id=pid(3))

mc("ACT", "English", "Knowledge of Language", "Style and Tone", 44, "easy", 0.37,
   "Which choice best maintains a clear, formal report tone?",
   ["Riders were totally freaked.", "Riders treated safety as part of the trip cost.", "Safety was like, a vibe.", "People hated everything."], "B",
   "B is precise and adult without slang.",
   "grammar rule", False, False, "manual_first")
mc("ACT", "English", "Knowledge of Language", "Style and Tone", 44, "medium", 0.50,
   "Which diction is most consistent with an engineering summary?",
   ["The data went bananas.", "The first season produced noisy data.", "The sensors were drama.", "It was a whole thing."], "B",
   "Noisy data is technical and specific.",
   "grammar rule", False, False, "manual_first")

mc("ACT", "English", "Knowledge of Language", "Concision and Clarity", 45, "easy", 0.30,
   "Which is clearest?",
   ["Due to the fact that lamps were added, ridership recovered.", "Because lamps were added, ridership recovered.", "In light of the fact of lamps being added, ridership recovered.", "Lamps having been added, ridership, it recovered."], "B",
   "Because is shorter and clearer than due to the fact that.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="concision_no_repeat")
mc("ACT", "English", "Knowledge of Language", "Concision and Clarity", 45, "medium", 0.48,
   "Best revision of “at this point in time the agency added lamps”?",
   ["currently the agency added lamps", "the agency added lamps", "at this point in time now the agency added lamps", "the agency did add lamps at this point in time"], "B",
   "At this point in time is empty.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="concision_no_repeat")

mc("ACT", "English", "Conventions of Standard English", "Punctuation", 46, "easy", 0.33,
   "Choose the correct sentence.",
   ["Riders wanted lighting, they said dark stops felt far.", "Riders wanted lighting; they said dark stops felt far.", "Riders wanted lighting they said dark stops felt far.", "Riders wanted lighting: they, said dark stops felt far."], "B",
   "Two independent clauses take a semicolon or period.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")
mc("ACT", "English", "Conventions of Standard English", "Punctuation", 46, "medium", 0.50,
   "The agency added lamps to three transfers ___ ridership recovered within a month.",
   [", and", "; and,", ": and", ", and,"], "A",
   "A comma plus and correctly joins two independent clauses.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")

mc("ACT", "English", "Conventions of Standard English", "Grammar and Usage", 47, "easy", 0.31,
   "Neither the map nor the schedule ___ the lighting problem.",
   ["explain", "explains", "are explaining", "have explained"], "B",
   "Neither/nor takes the number of the nearer subject, schedule, which is singular. Many tests also treat the pair as singular. Explains is correct.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="remove_interrupter")
mc("ACT", "English", "Conventions of Standard English", "Grammar and Usage", 47, "medium", 0.49,
   "The planners should have treated safety as seriously as ___ treated distance.",
   ["them", "they", "themselves", "their"], "B",
   "Subject pronoun they parallels planners.",
   "grammar rule", False, False, "manual_first")

mc("ACT", "English", "Conventions of Standard English", "Sentence Structure", 48, "easy", 0.34,
   "Which is a complete sentence?",
   ["Because lighting mattered to riders.", "Lighting mattered to riders.", "When the lamps were added to three transfers.", "Although ridership recovered."], "B",
   "A, C, and D are fragments.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")
mc("ACT", "English", "Conventions of Standard English", "Sentence Structure", 48, "medium", 0.51,
   "Which correctly combines the ideas without a fused sentence?",
   ["Distance was not the only cost riders priced safety.", "Distance was not the only cost, riders priced safety.", "Distance was not the only cost; riders priced safety.", "Distance was not the only cost riders, priced safety."], "C",
   "Semicolon between complete clauses.",
   "grammar rule", False, False, "manual_first",
   english_strategy_slug="punctuation_job")

mc("ACT", "Math", "Number and Quantity", "Integer Properties", 49, "easy", 0.28,
   "Which of the following is a multiple of 12?",
   ["16", "18", "30", "36"], "D",
   "$12\\times 3=36$. 18 is a multiple of 6, not 12.",
   "computation", False, False, "manual_first")
mc("ACT", "Math", "Number and Quantity", "Integer Properties", 49, "medium", 0.50,
   "What is the least common multiple of 8 and 12?",
   ["4", "16", "24", "96"], "C",
   "Multiples of 8: 8,16,24. Of 12: 12,24. LCM is 24. GCF 4 is the trap.",
   "computation", False, False, "manual_first")

mc("ACT", "Math", "Number and Quantity", "Rational Numbers", 50, "easy", 0.30,
   "What is $0.2 + \\frac{1}{5}$?",
   ["0.2", "0.4", "0.5", "1"], "B",
   "$1/5=0.2$, so the sum is 0.4.",
   "computation", False, False, "manual_first")
mc("ACT", "Math", "Number and Quantity", "Rational Numbers", 50, "medium", 0.52,
   "Which is largest?",
   ["$2/5$", "$0.45$", "$3/8$", "$0.4$"], "B",
   "$2/5=0.4$, $3/8=0.375$, so 0.45 is largest.",
   "computation", True, False, "manual_first")

mc("ACT", "Math", "Algebra", "Linear Equations", 51, "easy", 0.29,
   "If $4x + 6 = 30$, what is $x$?",
   ["4", "5", "6", "8", "9"], "C",
   "$4x=24$, $x=6$.",
   "algebraic manipulation", False, False, "manual_first")
mc("ACT", "Math", "Algebra", "Linear Equations", 51, "medium", 0.54,
   "Solve $2(x-4)=3x+1$.",
   ["$-9$", "$-5$", "$-3$", "$3$", "$9$"], "A",
   "$2x-8=3x+1$ → $-9=x$.",
   "algebraic manipulation", True, False, "manual_first")

mc("ACT", "Math", "Algebra", "Inequalities", 52, "easy", 0.31,
   "Which value of $x$ satisfies $x + 7 \\ge 10$?",
   ["0", "1", "2", "3", "4"], "D",
   "$x\\ge 3$, so 3 works; 2 does not.",
   "algebraic manipulation", False, False, "manual_first")
mc("ACT", "Math", "Algebra", "Inequalities", 52, "medium", 0.53,
   "If $-2x > 8$, then",
   ["$x > -4$", "$x < -4$", "$x > 4$", "$x < 4$", "$x = -4$"], "B",
   "Divide by -2 and reverse the inequality: $x<-4$.",
   "algebraic manipulation", False, False, "manual_first")

mc("ACT", "Math", "Algebra", "Systems of Equations", 53, "medium", 0.58,
   "The system $x+y=10$ and $x-y=2$ has solution",
   ["$(4,6)$", "$(6,4)$", "$(8,2)$", "$(5,5)$", "$(2,8)$"], "B",
   "Add the equations: $2x=12$, $x=6$, $y=4$. Graphing the two lines is a valid Desmos-first method.",
   "algebraic manipulation", True, True, "desmos_first")
mc("ACT", "Math", "Algebra", "Systems of Equations", 53, "hard", 0.74,
   "A gym charges $20+$15m$ dollars. A pass costs $80+$5m$. After how many months is the total the same? What does the common total represent?",
   ["6 months; the shared cost in dollars", "4 months; the monthly fee", "8 months; the number of visits", "5 months; the discount", "10 months; the tax"], "A",
   "Set $20+15m=80+5m$ → $10m=60$ → $m=6$, cost $110$. Desmos finds the intersection; you still interpret y as dollars. Hybrid.",
   "interpretation", True, True, "hybrid",
   secondary_topic_id=tid(51), secondary_topic_name="Linear Equations")

mc("ACT", "Math", "Functions", "Function Notation", 54, "easy", 0.32,
   "If $f(x)=x+8$, then $f(7)=$",
   ["1", "8", "15", "56", "78"], "C",
   "$7+8=15$.",
   "computation", False, False, "manual_first")
mc("ACT", "Math", "Functions", "Function Notation", 54, "medium", 0.55,
   "If $f(x)=2x+1$ and $g(x)=x^2$, what is $f(3)+g(3)$?",
   ["10", "16", "18", "19", "22"], "B",
   "$f(3)=7$, $g(3)=9$, sum 16. A table of both functions also works.",
   "computation", True, True, "desmos_first")

mc("ACT", "Math", "Functions", "Quadratic Functions", 55, "medium", 0.60,
   "The graph of $y=x^2-6x+8$ has x-intercepts",
   ["1 and 8", "2 and 4", "3 and 5", "-2 and -4", "6 and 8"], "B",
   "$(x-2)(x-4)=0$. Those intercepts are visible on the parabola.",
   "algebraic manipulation", True, True, "desmos_first")
mc("ACT", "Math", "Functions", "Quadratic Functions", 55, "hard", 0.75,
   "For $y=-2x^2+8x+1$, the maximum value is",
   ["1", "8", "9", "10", "17"], "C",
   "Vertex at $x=8/4=2$, $y=-8+16+1=9$. Desmos marks the peak.",
   "algebraic manipulation", True, True, "desmos_first")

mc("ACT", "Math", "Geometry", "Plane Geometry", 56, "easy", 0.30,
   "A square has side 5. What is its perimeter?",
   ["10", "15", "20", "25", "30"], "C",
   "$4\\times 5=20$. Area 25 is the trap.",
   "geometry", False, False, "manual_first")
mc("ACT", "Math", "Geometry", "Plane Geometry", 56, "medium", 0.56,
   "A triangle has sides 5, 12, 13. What is its area?",
   ["30", "32", "60", "65", "78"], "A",
   "It is right: $5^2+12^2=13^2$, so area is $(5\\times 12)/2=30$.",
   "geometry", False, False, "manual_first")

mc("ACT", "Math", "Geometry", "Trigonometry", 57, "easy", 0.41,
   "In a right triangle, opposite=5 and hypotenuse=13. $\\sin \\theta=$",
   ["5/12", "12/13", "5/13", "13/5", "12/5"], "C",
   "Sine is opposite over hypotenuse.",
   "geometry", True, True, "hybrid")
mc("ACT", "Math", "Geometry", "Trigonometry", 57, "medium", 0.64,
   "If $\\cos \\theta = 0.5$ and $\\theta$ is between $0^\\circ$ and $90^\\circ$, then $\\theta=$",
   ["30", "45", "60", "90", "120"], "C",
   "$\\cos 60^\\circ=1/2$. Use degree mode.",
   "geometry", True, True, "desmos_first")

mc("ACT", "Math", "Statistics and Probability", "Statistics", 58, "easy", 0.33,
   "The numbers 2, 5, 5, 8 have median",
   ["2", "5", "5.5", "8", "20"], "B",
   "The two middle values are both 5.",
   "computation", True, True, "desmos_first")
mc("ACT", "Math", "Statistics and Probability", "Statistics", 58, "medium", 0.57,
   "Which measure is most affected by the value 100 in the set 3, 4, 5, 100?",
   ["mode", "median", "mean", "range is unaffected", "the middle two"], "C",
   "The mean jumps; the median stays 4.5. Mean is outlier-sensitive.",
   "interpretation", True, True, "hybrid")

mc("ACT", "Math", "Statistics and Probability", "Probability", 59, "easy", 0.30,
   "A fair coin is flipped twice. Probability of two heads?",
   ["1/4", "1/3", "1/2", "2/3", "3/4"], "A",
   "HH is one of four equally likely outcomes.",
   "computation", False, False, "manual_first")
mc("ACT", "Math", "Statistics and Probability", "Probability", 59, "medium", 0.55,
   "How many ways can 5 books be lined up on a shelf?",
   ["15", "25", "60", "120", "125"], "D",
   "$5!=120$. Combinations would undercount because order matters.",
   "computation", True, True, "hybrid")

mc("ACT", "Reading", "Key Ideas and Details", "Main Idea and Details", 60, "easy", 0.39,
   "The night-shift map passage is mainly about",
   ["USB chargers on buses", "how rider safety perceptions changed what the agency needed to fix", "airport sensors", "seed libraries"], "B",
   "Lighting, not distance alone, explained the comments and the recovery.",
   "inference", False, False, "manual_first",
   passage_id=pid(3), english_strategy_slug="main_idea_whole")
mc("ACT", "Reading", "Key Ideas and Details", "Main Idea and Details", 60, "medium", 0.54,
   "According to the passage, ridership recovered after",
   ["the map was deleted", "lamps were added to three transfers", "fares were cut", "buses were repainted"], "B",
   "Direct detail: lamps at three transfers, recovery within a month.",
   "evidence", False, False, "manual_first",
   passage_id=pid(3), english_strategy_slug="must_be_supported")

mc("ACT", "Reading", "Key Ideas and Details", "Inference", 61, "medium", 0.58,
   "The passage suggests that treating distance as the only cost was a mistake because",
   ["maps cannot show miles", "riders were also pricing safety", "lamps are cheaper than buses", "night-shift maps are illegal"], "B",
   "The text says riders were pricing safety.",
   "inference", False, False, "manual_first",
   passage_id=pid(3), english_strategy_slug="must_be_supported")
mc("ACT", "Reading", "Key Ideas and Details", "Inference", 61, "hard", 0.71,
   "The author would most likely agree that a planning model is incomplete if it",
   ["ignores a cost riders actually feel", "uses any map", "adds lamps everywhere without data", "prints in color"], "A",
   "The lesson is that the map omitted a real rider cost.",
   "inference", False, False, "manual_first",
   passage_id=pid(3), english_strategy_slug="must_be_supported")

mc("ACT", "Reading", "Craft and Structure", "Vocabulary in Context", 62, "easy", 0.36,
   "In the passage, “pricing” most nearly means",
   ["printing tickets", "treating as a cost to weigh", "raising fares", "counting coins"], "B",
   "Riders were treating safety as part of the trip cost.",
   "vocabulary", False, False, "manual_first",
   passage_id=pid(3), english_strategy_slug="prefix_root_suffix")
mc("ACT", "Reading", "Craft and Structure", "Vocabulary in Context", 62, "medium", 0.49,
   "“Recovered” in the last lines most nearly means",
   ["got medical care", "returned toward earlier ridership", "was recycled", "was painted"], "B",
   "Ridership on those lines recovered within a month.",
   "vocabulary", False, False, "manual_first",
   passage_id=pid(3))

mc("ACT", "Reading", "Craft and Structure", "Author Purpose", 63, "medium", 0.55,
   "The author’s purpose is to",
   ["sell lamps", "show that planners missed a rider-valued cost and then corrected it", "argue buses should stop running at night", "describe USB chargers"], "B",
   "The narrative is a planning miss and a fix.",
   "inference", False, False, "manual_first",
   passage_id=pid(3))
mc("ACT", "Reading", "Craft and Structure", "Author Purpose", 63, "hard", 0.67,
   "Why does the author mention that planners expected complaints about longer walks?",
   ["To mock riders", "To contrast the expected complaint with the actual one about lighting", "To prove walks got shorter", "To advertise a map"], "B",
   "The expectation sets up the surprise.",
   "inference", False, False, "manual_first",
   passage_id=pid(3))

mc("ACT", "Reading", "Integration of Knowledge and Ideas", "Comparing Texts", 64, "medium", 0.62,
   "Compared with the harbor-sensor passage, the night-shift map passage is more focused on",
   ["salt spray chemistry", "how users experience a designed system", "airport weather", "seed packets"], "B",
   "Both are about revising a system using user/local signal; the map passage emphasizes rider experience of safety.",
   "inference", False, False, "manual_first",
   passage_id=pid(3),
   secondary_topic_id=tid(29), secondary_topic_name="Author Purpose")
mc("ACT", "Reading", "Integration of Knowledge and Ideas", "Comparing Texts", 64, "hard", 0.74,
   "A shared idea in the harbor and bus passages is that",
   ["cheap hardware always fails", "the first model of a problem can miss the variable that users actually care about", "lamps replace sensors", "maps replace data"], "B",
   "Harbor: messy signal still useful after revision. Bus: distance model missed lighting.",
   "inference", False, False, "manual_first")

mc("ACT", "Science", "Interpretation of Data", "Reading Graphs and Tables", 65, "easy", 0.34,
   "In the basil trial, Group A’s average leaf mass on day 14 was",
   ["2.7 g", "3.2 g", "3.6 g", "40 mL", "80 mL"], "B",
   "Read the stated average for Group A. Check the group label before the number.",
   "data analysis", False, False, "manual_first",
   passage_id=pid(4), english_strategy_slug="science_read_the_axes")
mc("ACT", "Science", "Interpretation of Data", "Reading Graphs and Tables", 65, "medium", 0.52,
   "Which group received the most water on a single watering day?",
   ["A", "B", "sensor group", "all equal", "cannot tell"], "B",
   "Group B received 80 mL every other morning, the largest single dose.",
   "data analysis", False, False, "manual_first",
   passage_id=pid(4), english_strategy_slug="science_read_the_axes")

mc("ACT", "Science", "Interpretation of Data", "Trend Analysis", 66, "medium", 0.58,
   "The basil results best support which trend?",
   ["More water on a schedule always grows more mass", "Matching water to soil moisture produced the highest mass in this trial", "Group A got no water", "Day 14 is too early to measure anything"], "B",
   "Sensor group 3.6 > A 3.2 > B 2.7.",
   "data analysis", False, False, "manual_first",
   passage_id=pid(4), english_strategy_slug="science_read_the_axes")
mc("ACT", "Science", "Interpretation of Data", "Trend Analysis", 66, "hard", 0.72,
   "If a fourth group received 120 mL daily and averaged 2.1 g, that would most weaken the claim that",
   ["sensors exist", "fixed large doses are automatically better", "basil is a plant", "day 14 was used"], "B",
   "A huge daily dose with low mass would show more water is not automatically better, which Group B already hints.",
   "logical reasoning", False, False, "manual_first",
   passage_id=pid(4))

mc("ACT", "Science", "Scientific Investigation", "Experimental Design", 67, "medium", 0.60,
   "Why did the researchers include two different fixed schedules?",
   ["To confuse gardeners", "To compare a frequent small dose with a less frequent large dose", "To avoid measuring mass", "To prove sensors never work"], "B",
   "A vs B isolates schedule pattern, not just “water vs no water.”",
   "logical reasoning", False, False, "manual_first",
   passage_id=pid(4))
mc("ACT", "Science", "Scientific Investigation", "Experimental Design", 67, "hard", 0.76,
   "A limitation of the study is that",
   ["it reports leaf mass", "it was done in one greenhouse with one plant type, so results may not generalize outdoors", "it used milliliters", "it lasted 14 days"], "B",
   "Single setting and species limit generalization. Duration and units are not automatically flaws.",
   "logical reasoning", False, False, "manual_first",
   passage_id=pid(4))

mc("ACT", "Science", "Evaluation of Models", "Conflicting Viewpoints", 68, "medium", 0.61,
   "Student 1 says plants always grow more with more water. Student 2 says timing relative to soil moisture matters more. The basil data better support",
   ["Student 1 only", "Student 2 only", "neither", "both equally", "Student 1 on day 1 only"], "B",
   "Group B got larger doses but less mass than A; the sensor group did best. That fits Student 2.",
   "logical reasoning", False, False, "manual_first",
   passage_id=pid(4))
mc("ACT", "Science", "Evaluation of Models", "Conflicting Viewpoints", 68, "hard", 0.78,
   "Which additional result would most support Student 1 over Student 2?",
   ["Sensor group still highest", "A group given still more water on a fixed schedule outgrows the sensor group", "All groups equal", "Sensors break", "Mass is unmeasured"], "B",
   "Student 1 needs more water to win even against moisture-matching.",
   "logical reasoning", False, False, "manual_first",
   passage_id=pid(4))


# Subtopics (few useful ones)
subtopics = [
    {"id": "d1100000-0000-0000-0000-000000000001", "topic_id": tid(1), "name": "Equations containing fractions", "sort_order": 1},
    {"id": "d1100000-0000-0000-0000-000000000002", "topic_id": tid(3), "name": "Graphical intersection of two lines", "sort_order": 1},
    {"id": "d1100000-0000-0000-0000-000000000003", "topic_id": tid(7), "name": "Vertex as maximum or minimum", "sort_order": 1},
    {"id": "d1100000-0000-0000-0000-000000000004", "topic_id": tid(35), "name": "Colon versus semicolon", "sort_order": 1},
    {"id": "d1100000-0000-0000-0000-000000000005", "topic_id": tid(65), "name": "Reading a named cell in a table", "sort_order": 1},
]

assert len(questions) == 136, len(questions)
topics_hit = {(q["test_type"], q["topic_id"]) for q in questions}
assert len(topics_hit) == 68, len(topics_hit)

out = Path("/tmp/original-bank.json")
out.write_text(json.dumps({"passages": PASSAGES, "questions": questions, "subtopics": subtopics}, indent=2))
print("questions", len(questions), "passages", len(PASSAGES), "bytes", out.stat().st_size)
