'use client'

import * as React from 'react'
import { loadDesmos, prefetchDesmos } from '@/lib/desmos/load'
import { DesmosMathTool } from '@/lib/desmos/math-tool'
import { applyDesmosActions, summarizeDesmos } from '@/lib/desmos/actions'
import type { DesmosAgentAction, QuestionCalculatorConfig } from '@/types/desmos'

type DesmosStatus = 'idle' | 'loading' | 'ready' | 'error'

interface SessionCalcState {
  state: unknown
  owners: Record<string, 'student' | 'agent' | 'question'>
}

interface DesmosContextValue {
  status: DesmosStatus
  error: string
  open: boolean
  expanded: boolean
  panelWidth: number
  tool: DesmosMathTool | null
  hostRef: React.RefObject<HTMLDivElement | null>
  attachHost: (node: HTMLDivElement | null) => void
  setOpen: (open: boolean) => void
  setExpanded: (expanded: boolean) => void
  setPanelWidth: (width: number) => void
  retry: () => void
  resize: () => void
  applyQuestion: (questionId: string, config: QuestionCalculatorConfig | null) => void
  applyActions: (actions: DesmosAgentAction[]) => Promise<void>
  getSummary: () => string
}

const DesmosContext = React.createContext<DesmosContextValue | null>(null)

export function useDesmos(): DesmosContextValue {
  const value = React.useContext(DesmosContext)
  if (!value) {
    throw new Error('useDesmos must be used inside DesmosProvider')
  }
  return value
}

export function useDesmosOptional(): DesmosContextValue | null {
  return React.useContext(DesmosContext)
}

export function DesmosProvider({
  children,
  enabled,
}: {
  children: React.ReactNode
  enabled: boolean
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const [hostNode, setHostNode] = React.useState<HTMLDivElement | null>(null)
  const setHostRef = React.useCallback((node: HTMLDivElement | null) => {
    hostRef.current = node
    setHostNode(node)
  }, [])
  const toolRef = React.useRef<DesmosMathTool | null>(null)
  const questionIdRef = React.useRef<string | null>(null)
  const pendingQuestionRef = React.useRef<{ questionId: string; config: QuestionCalculatorConfig | null } | null>(null)
  const sessionStates = React.useRef(new Map<string, SessionCalcState>())
  const [status, setStatus] = React.useState<DesmosStatus>('idle')
  const [error, setError] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const [panelWidth, setPanelWidth] = React.useState(760)
  const [tool, setTool] = React.useState<DesmosMathTool | null>(null)
  const [boot, setBoot] = React.useState(0)

  React.useEffect(() => {
    if (enabled) prefetchDesmos()
  }, [enabled])

  React.useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let changeHandler: (() => void) | null = null

    async function bootCalculator() {
      if (!hostNode || toolRef.current) return
      setStatus('loading')
      setError('')
      try {
        const Desmos = await loadDesmos()
        if (cancelled || !hostNode || toolRef.current) return
        const calculator = Desmos.GraphingCalculator(hostNode, {
          keypad: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          expressionsTopbar: true,
          pointsOfInterest: true,
          trace: true,
          sliders: true,
          distributions: true,
          images: true,
          folders: true,
          notes: true,
          pasteTableData: true,
          plotInequalities: true,
          plotImplicits: true,
          border: false,
          autosize: true,
          projectorMode: false,
          backgroundColor: '#eaf4ff',
          textColor: '#1f2d4a',
          accentColor: '#ff6b57',
          fontSize: 14,
        })
        const mathTool = new DesmosMathTool(calculator)
        changeHandler = () => mathTool.syncOwnersFromCalculator()
        calculator.observeEvent('change', changeHandler)
        toolRef.current = mathTool
        setTool(mathTool)
        setStatus('ready')
        const pending = pendingQuestionRef.current
        if (pending) {
          questionIdRef.current = pending.questionId
          mathTool.applyQuestionConfig(pending.config)
          if (pending.config?.calculator_recommended || pending.config?.starter_expressions?.length) {
            setOpen(true)
          }
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Desmos failed to load')
      }
    }

    void bootCalculator()

    return () => {
      cancelled = true
      if (toolRef.current) {
        try {
          if (changeHandler) toolRef.current.raw.unobserveEvent('change')
        } catch {
          // Desmos may not expose unobserveEvent in every build
        }
        toolRef.current.destroy()
        toolRef.current = null
        setTool(null)
      }
    }
  }, [enabled, boot, hostNode])

  const resize = React.useCallback(() => {
    requestAnimationFrame(() => toolRef.current?.resize())
  }, [])

  React.useEffect(() => {
    if (open && status === 'ready') resize()
  }, [open, expanded, panelWidth, status, resize])

  const persistCurrent = React.useCallback(() => {
    const currentId = questionIdRef.current
    const currentTool = toolRef.current
    if (!currentId || !currentTool) return
    sessionStates.current.set(currentId, {
      state: currentTool.getState(),
      owners: currentTool.exportOwners(),
    })
  }, [])

  const applyQuestion = React.useCallback((questionId: string, config: QuestionCalculatorConfig | null) => {
    persistCurrent()
    questionIdRef.current = questionId
    pendingQuestionRef.current = { questionId, config }
    const currentTool = toolRef.current
    if (!currentTool) return

    const saved = sessionStates.current.get(questionId)
    if (saved) {
      currentTool.setState(saved.state)
      currentTool.importOwners(saved.owners)
      return
    }

    currentTool.clearAll()
    currentTool.applyQuestionConfig(config)
    if (config?.calculator_recommended || config?.starter_expressions?.length) {
      setOpen(true)
    }
  }, [persistCurrent])

  const applyActions = React.useCallback(async (actions: DesmosAgentAction[]) => {
    const currentTool = toolRef.current
    if (!currentTool || actions.length === 0) return
    setOpen(true)
    await applyDesmosActions(currentTool, actions)
    persistCurrent()
    resize()
  }, [persistCurrent, resize])

  const getSummary = React.useCallback(() => summarizeDesmos(toolRef.current), [])

  const retry = React.useCallback(() => {
    setStatus('idle')
    setBoot((n) => n + 1)
  }, [])

  const value = React.useMemo<DesmosContextValue>(() => ({
    status,
    error,
    open,
    expanded,
    panelWidth,
    tool,
    hostRef,
    attachHost: setHostRef,
    setOpen,
    setExpanded,
    setPanelWidth,
    retry,
    resize,
    applyQuestion,
    applyActions,
    getSummary,
  }), [status, error, open, expanded, panelWidth, tool, setHostRef, retry, resize, applyQuestion, applyActions, getSummary])

  return (
    <DesmosContext.Provider value={value}>
      {children}
    </DesmosContext.Provider>
  )
}
