'use client'

import * as React from 'react'
import { Maximize2, Minimize2, RefreshCw, X } from 'lucide-react'
import { Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDesmos } from './desmos-provider'

export function DesmosToggle({ className }: { className?: string }) {
  const { open, setOpen, status } = useDesmos()
  return (
    <Button
      size="sm"
      variant={open ? 'default' : 'ghost'}
      onClick={() => setOpen(!open)}
      className={className}
    >
      <Calculator className="mr-1 h-4 w-4" />
      Calculator
      {status === 'loading' && <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-ice" />}
    </Button>
  )
}

export function DesmosPanel({ embedded = false }: { embedded?: boolean }) {
  const {
    open,
    expanded,
    panelWidth,
    status,
    error,
    attachHost,
    setOpen,
    setExpanded,
    setPanelWidth,
    retry,
    resize,
  } = useDesmos()
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null)

  React.useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragRef.current) return
      const next = dragRef.current.startWidth + (dragRef.current.startX - event.clientX)
      setPanelWidth(Math.min(1100, Math.max(560, next)))
    }
    function onUp() {
      dragRef.current = null
      resize()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [resize, setPanelWidth])

  const width = expanded ? 960 : panelWidth

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'z-40 flex min-h-0 flex-col overflow-hidden',
        embedded ? 'relative h-[380px] w-full' : 'rounded-t-3xl border border-transparent neu md:rounded-2xl',
        !embedded && open && 'fixed inset-x-0 bottom-0 h-[62vh] md:relative md:inset-auto md:h-[min(62vh,520px)]',
        !embedded && !open && 'pointer-events-none invisible fixed left-[-2400px] top-0 h-[720px] w-[640px]'
      )}
      style={open && !embedded ? { ['--desmos-width' as string]: `${width}px` } : undefined}
    >
      <div
        className={cn(
          'relative flex h-full min-h-0 flex-col',
          embedded ? 'w-full' : open ? 'w-full md:w-[var(--desmos-width)]' : 'w-[640px]'
        )}
      >
        {open && !embedded && (
          <button
            type="button"
            aria-label="Resize calculator"
            className="absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize md:block"
            onPointerDown={(event) => {
              dragRef.current = { startX: event.clientX, startWidth: panelWidth }
            }}
          />
        )}

        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold text-paper">Desmos</p>
            <p className="text-xs text-fog">Shared with Nova</p>
          </div>
          <div className="flex items-center gap-1">
            {!embedded && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="neu-sm hidden h-9 w-9 items-center justify-center text-fog hover:text-paper md:flex"
                aria-label={expanded ? 'Shrink calculator' : 'Expand calculator'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="neu-sm flex h-9 w-9 items-center justify-center text-fog hover:text-paper"
              aria-label="Close calculator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 px-3 pb-3">
          <div ref={attachHost} className="h-full min-h-[280px] w-full overflow-hidden rounded-xl" />
          {status !== 'ready' && (
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-xl bg-panel/90 text-center">
              {status === 'error' ? (
                <>
                  <p className="mb-2 text-sm text-paper">Calculator could not load.</p>
                  <p className="mb-4 max-w-xs text-xs text-fog">{error || 'You can still answer the question.'}</p>
                  <Button size="sm" onClick={retry}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Retry
                  </Button>
                </>
              ) : (
                <p className="text-sm text-fog">Loading Desmos…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
