import type { DesmosAgentAction, DesmosChatResponse, QuestionCalculatorConfig } from '@/types/desmos'
import type { DesmosMathTool } from './math-tool'

const ACTION_TYPES = new Set<DesmosAgentAction['type']>([
  'addExpression',
  'updateExpression',
  'removeExpression',
  'clearAgentWork',
  'clearAll',
  'plotExpressions',
  'addPoint',
  'addTable',
  'createSlider',
  'setVariable',
  'setViewport',
  'setDegreeMode',
  'getValue',
])

export function isMathSection(sectionName: string | null | undefined): boolean {
  return /math/i.test(sectionName ?? '')
}

export function shouldShowCalculator(options: {
  sectionName?: string | null
  config?: QuestionCalculatorConfig | null
}): boolean {
  if (options.config?.calculator_enabled === false) return false
  if (options.config?.calculator_enabled === true) return true
  if (options.config?.calculator_recommended) return true
  if (isMathSection(options.sectionName)) return true
  if (/reading|writing|english|science/i.test(options.sectionName ?? '')) return false
  return !options.sectionName
}

export function parseCalculatorConfig(value: unknown): QuestionCalculatorConfig | null {
  if (!value || typeof value !== 'object') return null
  return value as QuestionCalculatorConfig
}

export function summarizeDesmos(tool: DesmosMathTool | null): string {
  if (!tool) return 'Desmos is not ready.'
  const snap = tool.getSnapshot()
  const lines = snap.expressions
    .filter((expr) => expr.latex.trim())
    .slice(0, 16)
    .map((expr, index) => {
      const evalText = expr.evaluation == null ? '' : ` = ${Array.isArray(expr.evaluation) ? expr.evaluation.join(', ') : expr.evaluation}`
      return `${index + 1}. \`${expr.latex}\` [${expr.owner}]${evalText}`
    })

  const viewport = snap.viewport
    ? `x: ${round(snap.viewport.left)} → ${round(snap.viewport.right)}\ny: ${round(snap.viewport.bottom)} → ${round(snap.viewport.top)}`
    : 'default'

  return [
    'Current Desmos Context:',
    'Expressions:',
    lines.length ? lines.join('\n') : '(empty)',
    '',
    'Viewport:',
    viewport,
  ].join('\n')
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function parseAgentActions(value: unknown): DesmosAgentAction[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is DesmosAgentAction => {
    return Boolean(item && typeof item === 'object' && ACTION_TYPES.has((item as DesmosAgentAction).type))
  })
}

export function parseDesmosChatResponse(raw: string): DesmosChatResponse {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  try {
    const parsed = JSON.parse(candidate) as { message?: string; desmosActions?: unknown }
    if (parsed && typeof parsed === 'object' && (parsed.message || parsed.desmosActions)) {
      return {
        message: typeof parsed.message === 'string' ? parsed.message : trimmed,
        desmosActions: parseAgentActions(parsed.desmosActions),
      }
    }
  } catch {
    // fall through — model returned prose
  }

  return { message: raw, desmosActions: [] }
}

export async function applyDesmosActions(
  tool: DesmosMathTool,
  actions: DesmosAgentAction[]
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case 'addExpression':
        tool.addExpression(action.latex, { id: action.id, color: action.color, hidden: action.hidden, owner: 'agent' })
        break
      case 'updateExpression':
        tool.updateExpression(action.id, action.latex, action.color)
        break
      case 'removeExpression':
        if (tool.getOwner(action.id) !== 'student') tool.removeExpression(action.id)
        break
      case 'clearAgentWork':
        tool.clearAgentWork()
        break
      case 'clearAll':
        tool.clearAll()
        break
      case 'plotExpressions':
        action.latex.forEach((latex) => tool.addExpression(latex, { owner: 'agent' }))
        break
      case 'addPoint':
        tool.addPoint(action.x, action.y, { id: action.id, label: action.label, owner: 'agent' })
        break
      case 'addTable':
        tool.addTable(action.columns, { id: action.id, owner: 'agent' })
        break
      case 'createSlider':
        tool.createSlider(action.variable, action.value, action.min, action.max, action.step, { id: action.id, owner: 'agent' })
        break
      case 'setVariable':
        tool.setVariable(action.name, action.value)
        break
      case 'setViewport':
        tool.setViewport(action.bounds)
        break
      case 'setDegreeMode':
        tool.setDegreeMode(action.degrees)
        break
      case 'getValue':
        await tool.getValue(action.latex)
        break
      default:
        break
    }
  }
}

export const DESMOS_TUTOR_INSTRUCTIONS = `You can control the student's live Desmos graphing calculator. The student sees the same calculator.

When graphing, plotting, intersections, systems, quadratics, polynomials, exponentials, coordinate geometry, inequalities, transformations, roots, min/max, tables, regression, scatterplots, trig graphs, or comparing functions would help, use Desmos automatically. Do not use it for simple mental math or purely verbal grammar/reading questions.

Never tell the student to type an equation into Desmos. Graph it yourself.

Return JSON only:
{
  "message": "plain explanation for the student",
  "desmosActions": [ ... ]
}

desmosActions may include:
{ "type": "addExpression", "latex": "y=x^2", "id": "optional", "color": "#2f72dc" }
{ "type": "updateExpression", "id": "ai_1", "latex": "y=2x+1" }
{ "type": "removeExpression", "id": "ai_1" }
{ "type": "clearAgentWork" }
{ "type": "clearAll" }
{ "type": "plotExpressions", "latex": ["y=2x+1", "y=-x+7"] }
{ "type": "addPoint", "x": 2, "y": 5, "label": "P" }
{ "type": "addTable", "columns": [{ "latex": "x", "values": ["1","2"] }, { "latex": "y", "values": ["3","5"] }] }
{ "type": "createSlider", "variable": "a", "value": 1, "min": -5, "max": 5, "step": 0.1 }
{ "type": "setVariable", "name": "a", "value": 2 }
{ "type": "setViewport", "bounds": { "left": -10, "right": 10, "bottom": -10, "top": 10 } }
{ "type": "setDegreeMode", "degrees": true }
{ "type": "getValue", "latex": "2+2" }

Rules:
- Only remove expressions you created unless the student explicitly asks to clear everything (then use clearAll).
- Prefer clearAgentWork before adding a fresh explanation graph if your previous graphs would clutter the board.
- Do not graph the official answer in a way that spoils an unsolved question unless the student already submitted or asked for the answer.
- Keep message concise (2-4 short paragraphs).`
