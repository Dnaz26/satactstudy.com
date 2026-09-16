'use client'

import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { JetBullet, JetEnemy, JetMeteor } from '@/lib/game/fighterjet'

export function FighterJetMesh({
  x,
  y,
  z,
  roll = 0,
  pitch = 0,
  enemy = false,
}: {
  x: number
  y: number
  z: number
  roll?: number
  pitch?: number
  enemy?: boolean
}) {
  const ref = React.useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.22)
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, roll, 0.16)
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, pitch, 0.16)
    if (enemy) ref.current.rotation.y = Math.PI
  })

  const hull = enemy ? '#7f1d1d' : '#94a3b8'
  const accent = enemy ? '#fbbf24' : '#ff5c39'
  const glow = enemy ? '#ef4444' : '#22d3ee'

  return (
    <group ref={ref} position={[x, y, z]} scale={enemy ? 0.92 : 1}>
      <mesh castShadow position={[0, 0, 0.15]}>
        <capsuleGeometry args={[0.2, 1.55, 10, 20]} />
        <meshStandardMaterial color={hull} metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0.02, 1.0]}>
        <coneGeometry args={[0.18, 0.75, 18]} />
        <meshStandardMaterial color={enemy ? '#450a0a' : '#64748b'} metalness={0.85} roughness={0.16} />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0.4]}>
        <sphereGeometry args={[0.15, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color={enemy ? '#fca5a5' : '#7dd3fc'}
          transparent
          opacity={0.55}
          metalness={0.15}
          roughness={0.04}
          transmission={0.45}
        />
      </mesh>
      <mesh castShadow position={[0, -0.04, -0.05]} rotation={[0.04, 0, 0]}>
        <boxGeometry args={[2.55, 0.055, 0.58]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[-1.0, -0.02, 0]}>
        <boxGeometry args={[0.38, 0.04, 0.72]} />
        <meshStandardMaterial color={accent} metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[1.0, -0.02, 0]}>
        <boxGeometry args={[0.38, 0.04, 0.72]} />
        <meshStandardMaterial color={accent} metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.38, -0.72]}>
        <boxGeometry args={[0.06, 0.58, 0.38]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[-0.38, 0.06, -0.72]}>
        <boxGeometry args={[0.6, 0.05, 0.3]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0.38, 0.06, -0.72]}>
        <boxGeometry args={[0.6, 0.05, 0.3]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.22} />
      </mesh>
      {[-0.3, 0.3].map((sx) => (
        <group key={sx}>
          <mesh castShadow position={[sx, -0.12, -0.58]}>
            <cylinderGeometry args={[0.11, 0.13, 0.58, 16]} />
            <meshStandardMaterial color="#0f172a" metalness={0.92} roughness={0.18} />
          </mesh>
          <mesh position={[sx, -0.12, -0.9]}>
            <sphereGeometry args={[0.095, 14, 14]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={3.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function MeteorMesh({ m }: { m: JetMeteor }) {
  const ref = React.useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.set(m.x, m.y, m.z)
    ref.current.rotation.x += dt * m.spin
    ref.current.rotation.y += dt * m.spin * 0.7
  })
  return (
    <group ref={ref}>
      <mesh castShadow>
        <dodecahedronGeometry args={[m.r, 0]} />
        <meshStandardMaterial color="#78716c" metalness={0.35} roughness={0.72} flatShading />
      </mesh>
      <mesh scale={0.72}>
        <dodecahedronGeometry args={[m.r, 0]} />
        <meshStandardMaterial color="#a8a29e" metalness={0.2} roughness={0.8} flatShading />
      </mesh>
      <pointLight intensity={0.35} distance={4} color="#fb923c" />
    </group>
  )
}

function BulletMesh({ b }: { b: JetBullet }) {
  const color = b.from === 'player' ? '#67e8f9' : '#fb7185'
  return (
    <mesh position={[b.x, b.y, b.z]}>
      <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} />
    </mesh>
  )
}

function GalaxyBackdrop() {
  const nebula = React.useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!nebula.current) return
    nebula.current.rotation.z = state.clock.elapsedTime * 0.02
  })
  return (
    <group>
      <Stars radius={120} depth={60} count={4500} factor={3.2} saturation={0.4} fade speed={0.6} />
      <mesh ref={nebula} position={[0, 0, 40]} scale={[70, 40, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#312e81" transparent opacity={0.35} />
      </mesh>
      <mesh position={[-18, 8, 55]}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.22} />
      </mesh>
      <mesh position={[22, -6, 70]}>
        <sphereGeometry args={[9, 32, 32]} />
        <meshBasicMaterial color="#9f1239" transparent opacity={0.16} />
      </mesh>
      <mesh position={[8, 12, 90]}>
        <sphereGeometry args={[2.2, 28, 28]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={2.5} />
      </mesh>
      <pointLight position={[8, 12, 80]} intensity={2.4} color="#fde68a" distance={80} />
      <pointLight position={[-10, -4, 20]} intensity={1.1} color="#818cf8" distance={50} />
    </group>
  )
}

function ChaseCam({ x, y }: { x: number; y: number }) {
  const ref = React.useRef<THREE.PerspectiveCamera>(null)
  useFrame(() => {
    if (!ref.current) return
    ref.current.position.lerp(new THREE.Vector3(x * 0.4, y * 0.35 + 1.35, -5.2), 0.1)
    ref.current.lookAt(x * 0.25, y * 0.2 + 0.15, 8)
  })
  return <PerspectiveCamera ref={ref} makeDefault fov={58} near={0.1} far={200} position={[0, 1.4, -5.2]} />
}

export function FighterJetStage({
  playerX,
  playerY,
  roll,
  pitch,
  enemies,
  meteors,
  bullets,
  hp,
  kills,
  secondsLeft,
}: {
  playerX: number
  playerY: number
  roll: number
  pitch: number
  enemies: JetEnemy[]
  meteors: JetMeteor[]
  bullets: JetBullet[]
  hp: number
  kills: number
  secondsLeft: number
}) {
  return (
    <div className="relative h-[min(88vh,860px)] w-full overflow-hidden rounded-[1.5rem] border border-indigo-400/20 bg-[#030014] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3">
        <div className="flex w-full max-w-lg items-stretch overflow-hidden rounded-xl border border-indigo-300/20 bg-black/70 backdrop-blur-md">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-2.5 text-cyan-100">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">HP</span>
            <span className="font-display text-3xl tabular-nums">{Math.max(0, Math.round(hp))}</span>
          </div>
          <div className="flex w-28 flex-col items-center justify-center border-x border-white/10 px-3 py-2.5 text-white">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Clock</span>
            <span className="font-mono text-2xl tabular-nums">{Math.max(0, secondsLeft)}</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-2.5 text-orange-100">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-300/70">Kills</span>
            <span className="font-display text-3xl tabular-nums">{kills}</span>
          </div>
        </div>
      </div>

      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <color attach="background" args={['#030014']} />
        <fog attach="fog" args={['#030014', 28, 95]} />
        <ChaseCam x={playerX} y={playerY} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 8, 3]} intensity={1.5} color="#e0e7ff" />
        <GalaxyBackdrop />
        <FighterJetMesh x={playerX} y={playerY} z={0} roll={roll} pitch={pitch} />
        {enemies.map((e) => (
          <FighterJetMesh
            key={e.id}
            x={e.x}
            y={e.y}
            z={e.z}
            roll={Math.sin(e.id + e.z * 0.05) * 0.35}
            pitch={0.08}
            enemy
          />
        ))}
        {meteors.map((m) => (
          <MeteorMesh key={m.id} m={m} />
        ))}
        {bullets.map((b) => (
          <BulletMesh key={b.id} b={b} />
        ))}
      </Canvas>
    </div>
  )
}
