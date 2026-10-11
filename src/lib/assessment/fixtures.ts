/**
 * Negative regression fixtures: the 11 known-bad Math items from the retired
 * ACT Practice Test 1 form. Each entry preserves the live defect and the
 * failure code(s) the validator must produce. These fixtures must NEVER ship
 * as live items; the gate test below rejects the whole form if any of these
 * fingerprints appear in it.
 */
import type { AssessmentItem, FailureCode } from './validate'

export interface RegressionFixture {
  id: string
  item: AssessmentItem
  /** The independently established true answer (empty when none exists). */
  expected: string | null
  mustFail: FailureCode[]
  note: string
}

const C = (a: string, b: string, c: string, d: string) => [a, b, c, d]

export const REGRESSION_FIXTURES: RegressionFixture[] = [
  {
    id: 'M2-lcm-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 1290. What is the least common multiple of 4 and 6?',
      choices: C('6', '24', '4', '2'),
      answer: 'A',
    },
    expected: '12',
    mustFail: ['invalid_key', 'banned_label'],
    note: 'LCM(4,6)=12 is absent; key A points at 6.',
  },
  {
    id: 'M11-dup-equivalent-star',
    item: {
      section: 'Math',
      prompt: 'What are the solutions of $x^2 - 8x + 16 = 0$?',
      choices: C('$x=8$ and $x=16$', '$x=4$ only*', '$x=4$ and $x=4$', '$x=4$ only'),
      answer: 'D',
    },
    expected: '$x=4$ only',
    mustFail: ['equivalent_choices', 'suspicious_marks', 'latex_forbidden'],
    note: 'B and D are the same answer; B carries a stray asterisk.',
  },
  {
    id: 'M17-inequality-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 367. Which inequality is equivalent to $5x + 36 < 246$?',
      choices: C('$x > 42$', '$x \\le 42$', '$x > 5$', '$x < 246$'),
      answer: 'B',
    },
    expected: '$x < 42$',
    mustFail: ['invalid_key', 'banned_label', 'latex_forbidden'],
    note: '5x<210 so x<42; strict inequality is missing (B claims ≤).',
  },
  {
    id: 'M24-func-eval-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 737. If $g(x)=x^2+4x$, what is $g(9)$?',
      choices: C('85', '13', '36', '81'),
      answer: 'D',
    },
    expected: '117',
    mustFail: ['invalid_key', 'banned_label', 'latex_forbidden'],
    note: '81+36=117 is absent; key D points at 81.',
  },
  {
    id: 'M28-linear-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 313. What value of $x$ satisfies $7x + 50 = 288$?',
      choices: C('36', '31', '57', '238'),
      answer: 'B',
    },
    expected: '34',
    mustFail: ['invalid_key', 'banned_label', 'latex_forbidden'],
    note: '(288-50)/7=34 is absent; also a duplicate stem of M30.',
  },
  {
    id: 'M31-volume-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 1168. A rectangular prism has edges 6, 7, and 3. What is its volume?',
      choices: C('128', '162', '16', '42'),
      answer: 'B',
    },
    expected: '126',
    mustFail: ['invalid_key', 'banned_label'],
    note: '6·7·3=126 is absent; key B points at 162.',
  },
  {
    id: 'M32-trig-no-key',
    item: {
      section: 'Math',
      prompt: 'Skill set 1248. In a right triangle, the legs are 9 and 12 and the hypotenuse is 15. What is $\\sin$ of the angle opposite the side of length 9?',
      choices: C('12/15', '15/9', '9/12', '12/9'),
      answer: 'C',
    },
    expected: '9/15',
    mustFail: ['invalid_key', 'banned_label', 'latex_forbidden'],
    note: 'Opposite/hypotenuse is 9/15, absent; key C points at 9/12.',
  },
  {
    id: 'M33-mean-dup-paren',
    item: {
      section: 'Math',
      prompt: 'Skill set 928. What is the mean of 39, 42, 45, 48, 51?',
      choices: C('48', '45 (1)', '225', '45'),
      answer: 'D',
    },
    expected: '45',
    mustFail: ['equivalent_choices', 'suspicious_marks', 'banned_label'],
    note: 'B and D are both 45; the "(1)" is a stray mark.',
  },
  {
    id: 'M34-lcm-dup-paren',
    item: {
      section: 'Math',
      prompt: 'Skill set 1288. What is the least common multiple of 4 and 9?',
      choices: C('2', '36', '36 (1)', '9'),
      answer: 'B',
    },
    expected: '36',
    mustFail: ['equivalent_choices', 'suspicious_marks', 'banned_label'],
    note: 'B and C are both 36.',
  },
  {
    id: 'M38-system-no-key',
    item: {
      section: 'Math',
      prompt: 'What is the solution of $1x + 1y = 9$ and $2x + -1y = 3$?',
      choices: C('$(9, 3)$', '$(5, 5)$', '$(5, 4)$', '$(4, 6)$'),
      answer: 'B',
    },
    expected: '$(4, 5)$',
    mustFail: ['invalid_key', 'latex_forbidden'],
    note: 'x=4,y=5 is absent; "1x" and "+ -1y" are template artifacts.',
  },
  {
    id: 'M43-mean-dup-paren',
    item: {
      section: 'Math',
      prompt: 'Skill set 914. What is the mean of 25, 28, 31, 34, 37?',
      choices: C('31 (1)', '31', '155', '34'),
      answer: 'B',
    },
    expected: '31',
    mustFail: ['equivalent_choices', 'suspicious_marks', 'banned_label'],
    note: 'A and B are both 31.',
  },
]
