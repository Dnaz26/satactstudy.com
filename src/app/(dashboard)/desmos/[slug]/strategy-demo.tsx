'use client'

import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { Button } from '@/components/ui/button'
import type { DesmosStrategy } from '@/lib/desmos/strategies'
import * as React from 'react'

function DemoInner({ strategy }: { strategy: DesmosStrategy }) {
  const { setOpen, setExpanded, setPanelWidth, applyActions } = useDesmos()
  const [ran, setRan] = React.useState(false)

  React.useEffect(() => {
    setOpen(true)
    setExpanded(true)
    setPanelWidth(960)
  }, [setOpen, setExpanded, setPanelWidth])

  async function demonstrate() {
    setOpen(true)
    await applyActions(strategy.agent_actions)
    setRan(true)
  }

  if (strategy.agent_actions.length === 0) {
    return <p className="text-sm text-fog">This strategy is faster without a graph.</p>
  }

  return (
    <div className="space-y-3">
      <Button onClick={demonstrate} className="w-full sm:w-auto">
        {ran ? 'Replay demonstration' : 'Show this in Desmos'}
      </Button>
      <DesmosPanel embedded />
    </div>
  )
}

export function StrategyDemo({ strategy }: { strategy: DesmosStrategy }) {
  return (
    <DesmosProvider enabled>
      <DemoInner strategy={strategy} />
    </DesmosProvider>
  )
}
