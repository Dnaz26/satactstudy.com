'use client'

import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import type { GameId } from '@/lib/game/modes'
import { AWAY_KIT, HOME_KIT, SCENE_FOG, type TeamKit } from '@/components/game/assets/kits'
import { SportArena } from '@/components/game/assets/arenas'
import { AssaultRifle, TacticalAthlete } from '@/components/game/assets/tactical-athlete'
import {
  BaseballGlove,
  Basketball,
  BoxingGlovesPair,
  Football,
  HockeyPuck,
  SoccerBall,
  Baseball,
} from '@/components/game/assets/props'
import * as THREE from 'three'

export type WorldState = {
  playerX: number
  playerZ: number
  foeX: number
  foeZ: number
  ballX: number
  ballY: number
  ballZ: number
  ballVisible: boolean
  facing: 1 | -1
}

function FollowCam({ targetX, targetZ, live }: { targetX: number; targetZ: number; live: boolean }) {
  const ref = React.useRef<THREE.PerspectiveCamera>(null)
  useFrame(() => {
    if (!ref.current) return
    const desired = new THREE.Vector3(targetX * 0.35, live ? 4.2 : 3.8, 8.4 + targetZ * 0.15)
    ref.current.position.lerp(desired, 0.08)
    ref.current.lookAt(targetX * 0.4, 1.1, targetZ * 0.2)
  })
  return <PerspectiveCamera ref={ref} makeDefault fov={40} near={0.1} far={80} position={[0, 3.8, 8.4]} />
}

function MovingAthlete({
  kit,
  gameId,
  x,
  z,
  facing,
  active,
  anim,
}: {
  kit: TeamKit
  gameId: GameId
  x: number
  z: number
  facing: 1 | -1
  active?: boolean
  anim?: 'idle' | 'ready' | 'strike'
}) {
  const group = React.useRef<THREE.Group>(null)
  useFrame(() => {
    if (!group.current) return
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, 0.18)
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, z, 0.18)
  })
  return (
    <group ref={group} position={[x, 0, z]}>
      <TacticalAthlete
        kit={kit}
        gameId={gameId}
        position={[0, 0, 0]}
        facing={facing}
        active={active}
        anim={anim}
      />
    </group>
  )
}

function LiveBall({
  gameId,
  x,
  y,
  z,
  visible,
}: {
  gameId: GameId
  x: number
  y: number
  z: number
  visible: boolean
}) {
  const ref = React.useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.visible = visible
    ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.22)
    if (visible) {
      ref.current.rotation.x += 0.12
      ref.current.rotation.z += 0.08
    }
  })
  return (
    <group ref={ref} position={[x, y, z]} visible={visible}>
      {false && <Basketball position={[0, 0, 0]} />}
      {false && (
        <mesh>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={3} />
        </mesh>
      )}
    </group>
  )
}

function SceneContent({
  gameId,
  playerIndex,
  flash,
  live,
  world,
}: {
  gameId: GameId
  playerIndex: number
  flash: 'you' | 'them' | null
  live: boolean
  world: WorldState
}) {
  const home = HOME_KIT[gameId]
  const away = AWAY_KIT[gameId]
  const team = false

  const mates: [number, number][] = [
    [world.playerX - 1.4, world.playerZ + 0.5],
    [world.playerX, world.playerZ],
    [world.playerX + 1.3, world.playerZ + 0.35],
  ]

  return (
    <>
      <color attach="background" args={[SCENE_FOG[gameId]]} />
      <fog attach="fog" args={[SCENE_FOG[gameId], 12, 32]} />
      <FollowCam targetX={world.playerX} targetZ={world.playerZ} live={live} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#bfdbfe', '#1c1917', 0.55]} />
      <directionalLight
        castShadow
        position={[7, 12, 5]}
        intensity={2.8}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        color="#fff7ed"
      />
      <spotLight position={[-5, 9, 3]} angle={0.5} penumbra={0.55} intensity={2} color="#67e8f9" castShadow />
      <pointLight position={[0, 5, 0]} intensity={1.1} color="#ff5c39" />

      <SportArena gameId={gameId} />

      {team ? (
        <>
          {mates.map((pos, i) => (
            <MovingAthlete
              key={`h-${i}`}
              kit={home}
              gameId={gameId}
              x={i === playerIndex ? world.playerX : pos[0]}
              z={i === playerIndex ? world.playerZ : pos[1]}
              facing={world.facing}
              active={live && i === playerIndex}
              anim={flash === 'you' && i === playerIndex ? 'strike' : live ? 'ready' : 'idle'}
            />
          ))}
          <MovingAthlete
            kit={away}
            gameId={gameId}
            x={world.foeX}
            z={world.foeZ}
            facing={-1}
            anim={flash === 'them' ? 'strike' : 'idle'}
          />
          <MovingAthlete
            kit={away}
            gameId={gameId}
            x={world.foeX + 1.5}
            z={world.foeZ - 0.4}
            facing={-1}
            anim={flash === 'them' ? 'strike' : 'idle'}
          />
        </>
      ) : (
        <>
          <MovingAthlete
            kit={home}
            gameId={gameId}
            x={world.playerX}
            z={world.playerZ}
            facing={world.facing}
            active={live}
            anim={flash === 'you' ? 'strike' : live ? 'ready' : 'idle'}
          />
          <MovingAthlete
            kit={away}
            gameId={gameId}
            x={world.foeX}
            z={world.foeZ}
            facing={-1}
            anim={flash === 'them' ? 'strike' : 'idle'}
          />
        </>
      )}

      <LiveBall
        gameId={gameId}
        x={world.ballX}
        y={world.ballY}
        z={world.ballZ}
        visible={world.ballVisible || live}
      />

      {false && flash === 'you' && (
        <mesh position={[world.playerX + 0.8, 1.4, world.playerZ + 0.4]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={5} transparent opacity={0.85} />
        </mesh>
      )}

      {false && <BoxingGlovesPair position={[0, 0.2, 2.4]} />}
      {false && <BaseballGlove position={[-2.8, 0.2, 1.5]} />}
      {false && (
        <group position={[-3.8, 0.9, 1.6]} rotation={[0, 0.6, 0]}>
          <AssaultRifle position={[0, 0, 0]} />
        </group>
      )}

      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={20} blur={2.2} far={10} />

      {flash && (
        <pointLight
          position={[world.playerX, 2.2, world.playerZ]}
          intensity={5}
          distance={12}
          color={flash === 'you' ? '#34d399' : '#f43f5e'}
        />
      )}
    </>
  )
}

export function CodStage({
  gameId,
  playerIndex,
  flash,
  live,
  world,
  onAction,
  phaseLabel,
}: {
  gameId: GameId
  playerIndex: number
  flash: 'you' | 'them' | null
  live: boolean
  world: WorldState
  onAction?: (action: string) => void
  phaseLabel: string
}) {
  return (
    <div className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-[1.25rem] border border-cyan-400/20 bg-[#05080f] shadow-[0_22px_0_rgba(0,0,0,0.4)]">
      <Canvas
        shadows
        dpr={[1, 1.6]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.2
        }}
      >
        <SceneContent
          gameId={gameId}
          playerIndex={playerIndex}
          flash={flash}
          live={live}
          world={world}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <span className="rounded border border-cyan-400/30 bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          {gameId} · {phaseLabel}
        </span>
        {live && (
          <span className="rounded border border-white/10 bg-black/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/70">
            WASD move · Space action · E second · Q switch
          </span>
        )}
      </div>

      {live && onAction && (
        <div className="absolute bottom-3 right-3 z-10 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/20 bg-black/70 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white backdrop-blur hover:bg-signal"
            onClick={() => onAction('primary')}
          >
            Action
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/20 bg-black/70 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white backdrop-blur hover:bg-cyan-500"
            onClick={() => onAction('secondary')}
          >
            Alt
          </button>
        </div>
      )}

      {live && (
        <div className="absolute bottom-3 left-3 z-10 grid grid-cols-3 gap-1">
          <span />
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-white/20 bg-black/70 text-white backdrop-blur"
            onPointerDown={() => onAction?.('up')}
          >
            ↑
          </button>
          <span />
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-white/20 bg-black/70 text-white backdrop-blur"
            onPointerDown={() => onAction?.('left')}
          >
            ←
          </button>
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-white/20 bg-black/70 text-white backdrop-blur"
            onPointerDown={() => onAction?.('down')}
          >
            ↓
          </button>
          <button
            type="button"
            className="h-11 w-11 rounded-xl border border-white/20 bg-black/70 text-white backdrop-blur"
            onPointerDown={() => onAction?.('right')}
          >
            →
          </button>
        </div>
      )}

      {!live && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
          <p className="rounded-full border border-white/20 bg-black/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white">
            Press Play to drop in
          </p>
        </div>
      )}
    </div>
  )
}
