'use client'

import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { BBallPlayer } from '@/lib/game/basketball'
import {
  BasketballCourtFloor,
  BasketballPlayerMesh,
  RealisticHoop,
} from '@/components/game/basketball/bball-meshes'

/**
 * Sticky chase cam at ~20°: holds still while idle;
 * only retargets when the controlled player moves or you switch characters.
 */
function StickyCam({
  x,
  z,
  facing,
  controlledId,
}: {
  x: number
  z: number
  facing: number
  controlledId: string
}) {
  const ref = React.useRef<THREE.PerspectiveCamera>(null)
  const locked = React.useRef({
    camX: 0,
    camY: 5.2,
    camZ: 0,
    lookX: 0,
    lookY: 1.2,
    lookZ: 0,
    lastId: '',
    lastX: Number.NaN,
    lastZ: Number.NaN,
  })

  useFrame(() => {
    if (!ref.current) return
    const L = locked.current
    const moved =
      L.lastId !== controlledId ||
      !Number.isFinite(L.lastX) ||
      Math.hypot(x - L.lastX, z - L.lastZ) > 0.04

    if (moved) {
      const elev = (20 * Math.PI) / 180
      const dist = 9.5
      // Sit behind the player relative to facing, looking at them
      const back = facing + Math.PI
      L.camX = x + Math.cos(back) * dist * Math.cos(elev)
      L.camY = Math.sin(elev) * dist + 2.1
      L.camZ = z + Math.sin(back) * dist * Math.cos(elev)
      L.lookX = x
      L.lookY = 1.25
      L.lookZ = z
      L.lastId = controlledId
      L.lastX = x
      L.lastZ = z
    }

    ref.current.position.lerp(new THREE.Vector3(L.camX, L.camY, L.camZ), 0.12)
    const look = new THREE.Vector3(L.lookX, L.lookY, L.lookZ)
    ref.current.lookAt(look)
  })

  return <PerspectiveCamera ref={ref} makeDefault fov={40} position={[8, 5, 8]} near={0.1} far={80} />
}

function FlightBall({
  active,
  from,
  to,
  made,
}: {
  active: boolean
  from: [number, number, number]
  to: [number, number, number]
  made?: boolean
}) {
  const ref = React.useRef<THREE.Mesh>(null)
  const start = React.useRef(0)

  React.useEffect(() => {
    if (active) start.current = performance.now()
  }, [active, from, to])

  useFrame(() => {
    if (!ref.current || !active) {
      if (ref.current) ref.current.visible = false
      return
    }
    ref.current.visible = true
    const t = Math.min(1, (performance.now() - start.current) / 780)
    const x = from[0] + (to[0] - from[0]) * t
    const z = from[2] + (to[2] - from[2]) * t
    const arc = made ? 2.1 : 1.5
    const y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * arc
    ref.current.position.set(x, y, z)
    ref.current.rotation.x += 0.25
  })

  return (
    <mesh ref={ref} castShadow visible={false}>
      <sphereGeometry args={[0.14, 32, 32]} />
      <meshStandardMaterial color="#c2410c" roughness={0.35} metalness={0.08} />
    </mesh>
  )
}

function TipBall({ active }: { active: boolean }) {
  const ref = React.useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.visible = active
    if (!active) return
    ref.current.position.y = 1.2 + Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 1.1
    ref.current.rotation.x += 0.08
  })
  return (
    <mesh ref={ref} position={[0, 1.2, 0]} castShadow visible={false}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color="#c2410c" roughness={0.35} metalness={0.08} />
    </mesh>
  )
}

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function BasketballStage({
  players,
  controlledId,
  ballHolderId,
  jumpingId,
  shotFlight,
  tipOff,
  netPulse,
  boardFlash,
  meter,
  homeScore,
  awayScore,
  secondsLeft,
}: {
  players: BBallPlayer[]
  controlledId: string
  ballHolderId: string | null
  jumpingId: string | null
  tipOff: boolean
  netPulse: number
  boardFlash: number
  shotFlight: null | { from: [number, number, number]; to: [number, number, number]; key: number; made: boolean }
  meter: { value: number; armed: boolean; result: null | 'perfect' | 'good' | 'miss' } | null
  homeScore: number
  awayScore: number
  secondsLeft: number
}) {
  const controlled = players.find((p) => p.id === controlledId)

  return (
    <div className="relative h-[min(88vh,860px)] w-full overflow-hidden rounded-[1.5rem] border border-black/15 bg-[#0c0a09] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3">
        <div className="flex w-full max-w-xl items-stretch overflow-hidden rounded-xl border border-white/10 bg-black/75 shadow-lg backdrop-blur-md">
          <div className="flex flex-1 flex-col items-center justify-center bg-[#ff5c39]/90 px-4 py-2.5 text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">Home</span>
            <span className="font-display text-4xl leading-none tabular-nums">{homeScore}</span>
          </div>
          <div className="flex w-28 flex-col items-center justify-center border-x border-white/10 bg-black/60 px-3 py-2.5 text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Clock</span>
            <span className="font-mono text-2xl tabular-nums">{formatClock(secondsLeft)}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center bg-[#1d4ed8]/90 px-4 py-2.5 text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">Away</span>
            <span className="font-display text-4xl leading-none tabular-nums">{awayScore}</span>
          </div>
        </div>
      </div>

      <Canvas
        shadows
        dpr={[1, 1.8]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={['#0c0a09']} />
        <fog attach="fog" args={['#0c0a09', 18, 42]} />
        <StickyCam
          x={controlled?.x ?? 0}
          z={controlled?.z ?? 0}
          facing={controlled?.facing ?? 0}
          controlledId={controlledId}
        />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#ffedd5', '#292524', 0.65]} />
        <directionalLight
          castShadow
          position={[6, 14, 5]}
          intensity={2.8}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={40}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <spotLight position={[2, 12, 3]} angle={0.55} penumbra={0.5} intensity={1.35} color="#fff7ed" />
        <spotLight position={[-3, 8, -2]} angle={0.5} intensity={0.65} color="#93c5fd" />
        <pointLight position={[0, 6, 0]} intensity={0.45} color="#ff5c39" />
        <React.Suspense fallback={null}>
          <BasketballCourtFloor />
          <RealisticHoop side={1} netPulse={netPulse > 0 ? netPulse : 0} boardFlash={boardFlash} />
          <RealisticHoop side={-1} netPulse={netPulse > 0 ? netPulse : 0} boardFlash={boardFlash} />
          {players.map((p) => (
            <BasketballPlayerMesh
              key={p.id}
              player={p}
              active={p.id === controlledId}
              hasBall={p.id === ballHolderId && !shotFlight && !tipOff}
              jumping={p.id === jumpingId}
              meter={p.id === controlledId ? meter : null}
            />
          ))}
          <TipBall active={tipOff} />
          {shotFlight && (
            <FlightBall
              key={shotFlight.key}
              active
              from={shotFlight.from}
              to={shotFlight.to}
              made={shotFlight.made}
            />
          )}
        </React.Suspense>
      </Canvas>
    </div>
  )
}
