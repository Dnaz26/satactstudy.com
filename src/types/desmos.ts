export type ExpressionOwner = 'student' | 'agent' | 'question'

export type CalculatorMode = 'graphing' | 'degrees' | 'radians'

export interface DesmosViewport {
  left: number
  right: number
  bottom: number
  top: number
}

export interface DesmosTableColumn {
  latex: string
  values?: string[]
  hidden?: boolean
  points?: boolean
  lines?: boolean
  color?: string
}

export interface QuestionCalculatorConfig {
  calculator_enabled?: boolean
  calculator_recommended?: boolean
  starter_expressions?: string[]
  starter_table?: { columns: DesmosTableColumn[] }
  starter_viewport?: Partial<DesmosViewport>
  calculator_mode?: CalculatorMode
}

export interface DesmosExpressionSnapshot {
  id: string
  latex: string
  owner: ExpressionOwner
  type?: string
  evaluation?: number | number[] | null
}

export interface DesmosContextSnapshot {
  expressions: DesmosExpressionSnapshot[]
  viewport: DesmosViewport | null
  degreeMode: boolean
}

export type DesmosAgentAction =
  | { type: 'addExpression'; latex: string; id?: string; color?: string; hidden?: boolean }
  | { type: 'updateExpression'; id: string; latex: string; color?: string }
  | { type: 'removeExpression'; id: string }
  | { type: 'clearAgentWork' }
  | { type: 'clearAll' }
  | { type: 'plotExpressions'; latex: string[] }
  | { type: 'addPoint'; x: number; y: number; id?: string; label?: string }
  | { type: 'addTable'; columns: DesmosTableColumn[]; id?: string }
  | { type: 'createSlider'; variable: string; value: number; min: number; max: number; step?: number; id?: string }
  | { type: 'setVariable'; name: string; value: number }
  | { type: 'setViewport'; bounds: Partial<DesmosViewport> }
  | { type: 'setDegreeMode'; degrees: boolean }
  | { type: 'getValue'; latex: string; id?: string }

export interface DesmosChatResponse {
  message: string
  desmosActions: DesmosAgentAction[]
}

export interface DesmosAPI {
  GraphingCalculator: (
    element: HTMLElement,
    options?: Record<string, unknown>
  ) => DesmosGraphingCalculator
  Colors?: Record<string, string>
}

export interface DesmosGraphingCalculator {
  setExpression: (state: Record<string, unknown>) => void
  setExpressions: (states: Array<Record<string, unknown>>) => void
  removeExpression: (state: { id: string }) => void
  removeExpressions: (states: Array<{ id: string }>) => void
  getExpressions: () => Array<Record<string, unknown>>
  getState: () => unknown
  setState: (state: unknown, options?: { allowUndo?: boolean }) => void
  setBlank: (options?: { allowUndo?: boolean }) => void
  setMathBounds: (bounds: DesmosViewport) => void
  updateSettings: (settings: Record<string, unknown>) => void
  resize: () => void
  destroy: () => void
  observe: (event: string, callback: () => void) => void
  unobserve: (event: string) => void
  observeEvent: (event: string, callback: () => void) => void
  unobserveEvent: (event: string) => void
  HelperExpression: (state: { latex: string }) => DesmosHelperExpression
  expressionAnalysis?: Record<string, DesmosExpressionAnalysis>
  graphpaperBounds?: {
    mathCoordinates?: DesmosViewport
  }
}

export interface DesmosHelperExpression {
  numericValue?: number
  listValue?: number[]
  observe: (event: string, callback: () => void) => void
  unobserve: (event: string) => void
}

export interface DesmosExpressionAnalysis {
  isGraphable?: boolean
  isError?: boolean
  errorMessage?: string
  evaluationDisplayed?: boolean
  evaluation?: { type: 'Number' | 'ListOfNumber'; value: number | number[] }
}

declare global {
  interface Window {
    Desmos?: DesmosAPI
  }
}
