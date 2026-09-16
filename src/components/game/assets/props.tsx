'use client'

import * as React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameId } from '@/lib/game/modes'

export function Basketball({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.16, 32, 32]} />
      <meshStandardMaterial color="#c2410c" roughness={0.42} metalness={0.08} />
    </mesh>
  )
}

export function SoccerBall({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.151, 16, 16]} />
        <meshStandardMaterial color="#0f172a" wireframe transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

export function Football({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow scale={[1, 0.62, 0.62]}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color="#7c2d12" roughness={0.5} metalness={0.05} />
    </mesh>
  )
}

export function Baseball({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.08, 24, 24]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.45} metalness={0.05} />
    </mesh>
  )
}

export function HockeyPuck({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.05, 24]} />
      <meshStandardMaterial color="#111827" metalness={0.2} roughness={0.55} />
    </mesh>
  )
}

export function BoxingGlovesPair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-0.2, 0, 0]} castShadow>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.65} metalness={0.05} />
      </mesh>
      <mesh position={[0.2, 0, 0]} castShadow>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.65} metalness={0.05} />
      </mesh>
    </group>
  )
}

export function BaseballGlove({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow rotation={[0.4, 0.3, 0.2]}>
      <boxGeometry args={[0.22, 0.28, 0.1]} />
      <meshStandardMaterial color="#92400e" roughness={0.7} metalness={0.05} />
    </mesh>
  )
}

export function FlyingProjectile({
  gameId,
  active,
}: {
  gameId: GameId
  active: boolean
}) {
  const ref = React.useRef<THREE.Group>(null)
  const start = React.useRef(0)

  React.useEffect(() => {
    if (active) start.current = performance.now()
  }, [active])

  useFrame(() => {
    if (!ref.current || !active) {
      if (ref.current) ref.current.visible = false
      return
    }
    ref.current.visible = true
    const t = Math.min(1, (performance.now() - start.current) / 700)
    const x = -1.2 + t * 4.2
    const y = 1.2 + Math.sin(t * Math.PI) * 1.4
    const z = 0.2
    ref.current.position.set(x, y, z)
    ref.current.rotation.x = t * 8
    ref.current.rotation.z = t * 4
  })

  return (
    <group ref={ref} visible={false}>
      {false && <Basketball position={[0, 0, 0]} />}
      {false && (
        <mesh>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  )
}
