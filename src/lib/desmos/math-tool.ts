import type {
  DesmosExpressionSnapshot,
  DesmosGraphingCalculator,
  DesmosTableColumn,
  DesmosViewport,
  ExpressionOwner,
  QuestionCalculatorConfig,
} from '@/types/desmos'

function safeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function asLatex(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asId(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export class DesmosMathTool {
  private owners = new Map<string, ExpressionOwner>()
  private helpers: Array<{ latex: string; value: number | number[] | null }> = []

  constructor(private calculator: DesmosGraphingCalculator) {}

  get raw(): DesmosGraphingCalculator {
    return this.calculator
  }

  resize(): void {
    this.calculator.resize()
  }

  destroy(): void {
    this.calculator.destroy()
  }

  markOwner(id: string, owner: ExpressionOwner): void {
    this.owners.set(id, owner)
  }

  getOwner(id: string): ExpressionOwner {
    return this.owners.get(id) ?? 'student'
  }

  syncOwnersFromCalculator(): void {
    for (const expr of this.calculator.getExpressions()) {
      const id = asId(expr.id)
      if (id && !this.owners.has(id)) this.owners.set(id, 'student')
    }
  }

  addExpression(
    latex: string,
    options?: { id?: string; color?: string; hidden?: boolean; owner?: ExpressionOwner }
  ): string {
    const id = options?.id ?? safeId(options?.owner === 'question' ? 'q' : options?.owner === 'student' ? 's' : 'ai')
    this.calculator.setExpression({
      id,
      latex,
      color: options?.color,
      hidden: options?.hidden,
    })
    this.markOwner(id, options?.owner ?? 'agent')
    return id
  }

  updateExpression(id: string, latex: string, color?: string): void {
    this.calculator.setExpression({ id, latex, color })
    if (!this.owners.has(id)) this.markOwner(id, 'agent')
  }

  removeExpression(id: string): void {
    this.calculator.removeExpression({ id })
    this.owners.delete(id)
  }

  addPoint(x: number, y: number, options?: { id?: string; label?: string; owner?: ExpressionOwner }): string {
    const id = this.addExpression(`(${x},${y})`, { id: options?.id, owner: options?.owner ?? 'agent' })
    if (options?.label) {
      this.calculator.setExpression({ id, label: options.label, showLabel: true })
    }
    return id
  }

  addTable(columns: DesmosTableColumn[], options?: { id?: string; owner?: ExpressionOwner }): string {
    const id = options?.id ?? safeId('tbl')
    this.calculator.setExpression({
      id,
      type: 'table',
      columns,
    })
    this.markOwner(id, options?.owner ?? 'agent')
    return id
  }

  createSlider(
    variable: string,
    value: number,
    min: number,
    max: number,
    step = 0.1,
    options?: { id?: string; owner?: ExpressionOwner }
  ): string {
    const id = options?.id ?? (variable.replace(/[^A-Za-z0-9_]/g, '_') || safeId('slider'))
    this.calculator.setExpression({
      id,
      latex: `${variable}=${value}`,
      sliderBounds: { min, max, step },
    })
    this.markOwner(id, options?.owner ?? 'agent')
    return id
  }

  setVariable(name: string, value: number): string {
    return this.addExpression(`${name}=${value}`, { id: `var_${name}`, owner: 'agent' })
  }

  setViewport(bounds: Partial<DesmosViewport>): void {
    const current = this.calculator.graphpaperBounds?.mathCoordinates
    const next: DesmosViewport = {
      left: bounds.left ?? current?.left ?? -10,
      right: bounds.right ?? current?.right ?? 10,
      bottom: bounds.bottom ?? current?.bottom ?? -10,
      top: bounds.top ?? current?.top ?? 10,
    }
    if (next.right > next.left && next.top > next.bottom) {
      this.calculator.setMathBounds(next)
    }
  }

  setDegreeMode(degrees: boolean): void {
    this.calculator.updateSettings({ degreeMode: degrees })
  }

  async getValue(latex: string, timeoutMs = 800): Promise<number | number[] | null> {
    const helper = this.calculator.HelperExpression({ latex })
    return new Promise((resolve) => {
      const finish = (value: number | number[] | null) => {
        helper.unobserve('numericValue')
        helper.unobserve('listValue')
        this.helpers = this.helpers.filter((h) => h.latex !== latex)
        this.helpers.push({ latex, value })
        resolve(value)
      }

      const timer = window.setTimeout(() => {
        if (typeof helper.numericValue === 'number' && Number.isFinite(helper.numericValue)) {
          finish(helper.numericValue)
          return
        }
        if (Array.isArray(helper.listValue)) {
          finish(helper.listValue)
          return
        }
        finish(null)
      }, timeoutMs)

      helper.observe('numericValue', () => {
        if (typeof helper.numericValue === 'number' && Number.isFinite(helper.numericValue)) {
          window.clearTimeout(timer)
          finish(helper.numericValue)
        }
      })
      helper.observe('listValue', () => {
        if (Array.isArray(helper.listValue)) {
          window.clearTimeout(timer)
          finish(helper.listValue)
        }
      })
    })
  }

  getState(): unknown {
    return this.calculator.getState()
  }

  setState(state: unknown): void {
    this.calculator.setState(state)
    this.syncOwnersFromCalculator()
  }

  clearAgentWork(): void {
    const agentIds = [...this.owners.entries()]
      .filter(([, owner]) => owner === 'agent')
      .map(([id]) => id)
    if (agentIds.length > 0) {
      this.calculator.removeExpressions(agentIds.map((id) => ({ id })))
      for (const id of agentIds) this.owners.delete(id)
    }
  }

  clearAll(): void {
    this.calculator.setBlank()
    this.owners.clear()
    this.helpers = []
  }

  applyQuestionConfig(config: QuestionCalculatorConfig | null | undefined): void {
    if (!config) return

    if (config.calculator_mode === 'degrees') this.setDegreeMode(true)
    if (config.calculator_mode === 'radians') this.setDegreeMode(false)

    config.starter_expressions?.forEach((latex, index) => {
      if (latex.trim()) {
        this.addExpression(latex.trim(), { id: `q_start_${index}`, owner: 'question' })
      }
    })

    if (config.starter_table?.columns?.length) {
      this.addTable(config.starter_table.columns, { id: 'q_table', owner: 'question' })
    }

    if (config.starter_viewport) {
      this.setViewport(config.starter_viewport)
    }
  }

  exportOwners(): Record<string, ExpressionOwner> {
    return Object.fromEntries(this.owners)
  }

  importOwners(owners: Record<string, ExpressionOwner> | undefined): void {
    this.owners = new Map(Object.entries(owners ?? {}))
    this.syncOwnersFromCalculator()
  }

  getSnapshot(): {
    expressions: DesmosExpressionSnapshot[]
    viewport: DesmosViewport | null
    degreeMode: boolean
    helperValues: Array<{ latex: string; value: number | number[] | null }>
  } {
    const analysis = this.calculator.expressionAnalysis ?? {}
    const expressions = this.calculator.getExpressions().map((expr) => {
      const id = asId(expr.id)
      const evalInfo = analysis[id]?.evaluation
      return {
        id,
        latex: asLatex(expr.latex),
        owner: this.getOwner(id),
        type: typeof expr.type === 'string' ? expr.type : 'expression',
        evaluation: evalInfo?.value ?? null,
      }
    })

    return {
      expressions,
      viewport: this.calculator.graphpaperBounds?.mathCoordinates ?? null,
      degreeMode: false,
      helperValues: this.helpers.slice(-8),
    }
  }
}
