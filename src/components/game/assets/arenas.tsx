'use client'

import type { GameId } from '@/lib/game/modes'

/** Legacy arena shell — unused by Shrimpy Game Box hub, kept for older stage imports. */
export function SportArena({ gameId: _gameId }: { gameId: GameId }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
    </group>
  )
}
