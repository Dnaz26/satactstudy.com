'use client'

import * as React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, Text } from '@react-three/drei'
import type { BBallPlayer } from '@/lib/game/basketball'
import { cn } from '@/lib/utils'

function CourtLine({
  w,
  d,
  x = 0,
  z = 0,
}: {
  w: number
  d: number
  x?: number
  z?: number
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, z]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.35} />
    </mesh>
  )
}

/** NBA 2K–inspired athletic build in a continuous sprint cycle. */
export function BasketballPlayerMesh({
  player,
  active,
  hasBall,
  jumping,
  meter,
}: {
  player: BBallPlayer
  active?: boolean
  hasBall?: boolean
  jumping?: boolean
  meter?: { value: number; armed: boolean; result: null | 'perfect' | 'good' | 'miss' } | null
}) {
  const group = React.useRef<THREE.Group>(null)
  const body = React.useRef<THREE.Group>(null)
  const torso = React.useRef<THREE.Group>(null)
  const leftLeg = React.useRef<THREE.Group>(null)
  const rightLeg = React.useRef<THREE.Group>(null)
  const leftArm = React.useRef<THREE.Group>(null)
  const rightArm = React.useRef<THREE.Group>(null)
  const phase = React.useRef(Math.random() * 10)
  const prevPos = React.useRef({ x: player.x, z: player.z })
  const skin = player.skin
  const trim = player.jerseyTrim

  useFrame((state) => {
    if (!group.current || !body.current) return
    const t = state.clock.elapsedTime + phase.current
    const moved = Math.hypot(player.x - prevPos.current.x, player.z - prevPos.current.z) > 0.008
    prevPos.current = { x: player.x, z: player.z }
    const cadence = jumping ? 18 : moved || active ? 13.5 : 11
    const swing = Math.sin(t * cadence)
    const bob = jumping
      ? 0.62 + Math.sin(t * 16) * 0.1
      : 0.04 + Math.abs(Math.sin(t * cadence)) * 0.06

    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, player.x, 0.24)
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, player.z, 0.24)
    group.current.position.y = bob

    const targetY = player.facing - Math.PI / 2
    let cur = body.current.rotation.y
    let delta = targetY - cur
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    body.current.rotation.y = cur + delta * 0.22
    body.current.rotation.x = THREE.MathUtils.lerp(body.current.rotation.x, 0.18, 0.1)

    if (leftLeg.current) leftLeg.current.rotation.x = swing * 0.95
    if (rightLeg.current) rightLeg.current.rotation.x = -swing * 0.95
    if (leftArm.current) {
      leftArm.current.rotation.x = -swing * 1.05
      leftArm.current.rotation.z = 0.35
    }
    if (rightArm.current) {
      rightArm.current.rotation.x = swing * 1.05
      rightArm.current.rotation.z = -0.35
    }
    if (torso.current) torso.current.rotation.y = swing * 0.08
  })

  return (
    <group ref={group} position={[player.x, 0, player.z]}>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.38, 0.54, 48]} />
          <meshStandardMaterial
            color="#2dd4bf"
            emissive="#14b8a6"
            emissiveIntensity={1.05}
            transparent
            opacity={0.78}
          />
        </mesh>
      )}

      <group ref={body}>
        {/* Left leg (hip pivot) — sprinting */}
        <group ref={leftLeg} position={[-0.13, 0.95, 0]}>
          <mesh position={[0, -0.22, 0.02]} castShadow>
            <cylinderGeometry args={[0.085, 0.1, 0.38, 16]} />
            <meshStandardMaterial color={skin} roughness={0.52} metalness={0.05} />
          </mesh>
          <mesh position={[0, -0.42, 0.04]} castShadow>
            <sphereGeometry args={[0.08, 14, 14]} />
            <meshStandardMaterial color={skin} roughness={0.52} />
          </mesh>
          <mesh position={[0, -0.62, 0.06]} castShadow>
            <cylinderGeometry args={[0.07, 0.085, 0.32, 14]} />
            <meshStandardMaterial color={skin} roughness={0.52} />
          </mesh>
          <mesh position={[0, -0.78, 0.06]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.28, 14]} />
            <meshStandardMaterial color={player.socks} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.96, 0.1]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.34]} />
            <meshStandardMaterial color={player.shoes} metalness={0.35} roughness={0.32} />
          </mesh>
          <mesh position={[0, -0.9, 0.22]} castShadow>
            <boxGeometry args={[0.16, 0.05, 0.1]} />
            <meshStandardMaterial color={player.shoeAccent} roughness={0.4} />
          </mesh>
        </group>

        {/* Right leg */}
        <group ref={rightLeg} position={[0.13, 0.95, 0]}>
          <mesh position={[0, -0.22, 0.02]} castShadow>
            <cylinderGeometry args={[0.085, 0.1, 0.38, 16]} />
            <meshStandardMaterial color={skin} roughness={0.52} metalness={0.05} />
          </mesh>
          <mesh position={[0, -0.42, 0.04]} castShadow>
            <sphereGeometry args={[0.08, 14, 14]} />
            <meshStandardMaterial color={skin} roughness={0.52} />
          </mesh>
          <mesh position={[0, -0.62, 0.06]} castShadow>
            <cylinderGeometry args={[0.07, 0.085, 0.32, 14]} />
            <meshStandardMaterial color={skin} roughness={0.52} />
          </mesh>
          <mesh position={[0, -0.78, 0.06]} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.28, 14]} />
            <meshStandardMaterial color={player.socks} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.96, 0.1]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.34]} />
            <meshStandardMaterial color={player.shoes} metalness={0.35} roughness={0.32} />
          </mesh>
          <mesh position={[0, -0.9, 0.22]} castShadow>
            <boxGeometry args={[0.16, 0.05, 0.1]} />
            <meshStandardMaterial color={player.shoeAccent} roughness={0.4} />
          </mesh>
        </group>

        <group ref={torso}>
          {/* Shorts */}
          <mesh position={[0, 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.29, 0.42, 20]} />
            <meshStandardMaterial color={player.shorts} roughness={0.58} />
          </mesh>
          <mesh position={[-0.27, 0.92, 0]} castShadow>
            <boxGeometry args={[0.04, 0.4, 0.22]} />
            <meshStandardMaterial color={trim} roughness={0.5} />
          </mesh>
          <mesh position={[0.27, 0.92, 0]} castShadow>
            <boxGeometry args={[0.04, 0.4, 0.22]} />
            <meshStandardMaterial color={trim} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[0.295, 0.295, 0.05, 20]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.12, 0]} castShadow>
            <cylinderGeometry args={[0.27, 0.27, 0.08, 20]} />
            <meshStandardMaterial color="#111111" roughness={0.55} />
          </mesh>

          {/* Jersey torso */}
          <mesh position={[0, 1.38, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, 0.52, 20]} />
            <meshStandardMaterial color={player.jersey} roughness={0.38} metalness={0.1} />
          </mesh>
          <mesh position={[-0.28, 1.52, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={player.jersey} roughness={0.4} />
          </mesh>
          <mesh position={[0.28, 1.52, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={player.jersey} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.62, 0]} castShadow>
            <torusGeometry args={[0.14, 0.028, 10, 24]} />
            <meshStandardMaterial color={trim} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.62, 0]} castShadow>
            <torusGeometry args={[0.12, 0.016, 8, 20]} />
            <meshStandardMaterial color="#dc2626" roughness={0.4} />
          </mesh>
          <mesh position={[-0.3, 1.42, 0]} rotation={[0, 0, 0.9]} castShadow>
            <torusGeometry args={[0.09, 0.018, 8, 16]} />
            <meshStandardMaterial color={trim} />
          </mesh>
          <mesh position={[0.3, 1.42, 0]} rotation={[0, 0, -0.9]} castShadow>
            <torusGeometry args={[0.09, 0.018, 8, 16]} />
            <meshStandardMaterial color={trim} />
          </mesh>

          <Text
            position={[0, 1.32, 0.26]}
            fontSize={0.32}
            color="#dc2626"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor="#111111"
          >
            {String(player.number)}
          </Text>

          {/* Left arm pump */}
          <group ref={leftArm} position={[-0.32, 1.48, 0]}>
            <mesh position={[0, -0.18, 0.02]} castShadow>
              <cylinderGeometry args={[0.065, 0.08, 0.36, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} metalness={0.05} />
            </mesh>
            <mesh position={[0, -0.42, 0.08]} castShadow>
              <cylinderGeometry args={[0.055, 0.068, 0.34, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.58, 0.14]} castShadow>
              <sphereGeometry args={[0.065, 14, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
          </group>

          {/* Right arm pump */}
          <group ref={rightArm} position={[0.32, 1.48, 0]}>
            <mesh position={[0, -0.18, 0.02]} castShadow>
              <cylinderGeometry args={[0.065, 0.08, 0.36, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} metalness={0.05} />
            </mesh>
            <mesh position={[0, -0.42, 0.08]} castShadow>
              <cylinderGeometry args={[0.055, 0.068, 0.34, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
            <mesh position={[0, -0.58, 0.14]} castShadow>
              <sphereGeometry args={[0.065, 14, 14]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
            {hasBall && (
              <mesh position={[0.08, -0.62, 0.22]} castShadow>
                <sphereGeometry args={[0.135, 32, 32]} />
                <meshStandardMaterial color="#c2410c" roughness={0.38} metalness={0.08} />
              </mesh>
            )}
          </group>

          {/* Head */}
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.14, 16]} />
            <meshStandardMaterial color={skin} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.92, 0.02]} castShadow>
            <sphereGeometry args={[0.21, 40, 40]} />
            <meshStandardMaterial color={skin} roughness={0.45} metalness={0.04} />
          </mesh>
          <mesh position={[0, 1.84, 0.06]} castShadow scale={[1.05, 0.7, 0.9]}>
            <sphereGeometry args={[0.18, 28, 28]} />
            <meshStandardMaterial color={skin} roughness={0.48} />
          </mesh>
          <mesh position={[0, 2.02, -0.02]} castShadow>
            <sphereGeometry args={[0.215, 32, 32]} />
            <meshStandardMaterial color={player.hair} roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.08, -0.04]} scale={[1.05, 0.38, 1]} castShadow>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color={player.hair} roughness={0.88} />
          </mesh>
          <mesh position={[-0.16, 1.95, -0.02]} scale={[0.45, 0.7, 0.7]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={player.hair} roughness={0.9} />
          </mesh>
          <mesh position={[0.16, 1.95, -0.02]} scale={[0.45, 0.7, 0.7]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={player.hair} roughness={0.9} />
          </mesh>
          <mesh position={[-0.2, 1.92, 0]} castShadow>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
          <mesh position={[0.2, 1.92, 0]} castShadow>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
          <mesh position={[-0.07, 1.94, 0.175]}>
            <sphereGeometry args={[0.036, 14, 14]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.07, 1.94, 0.175]}>
            <sphereGeometry args={[0.036, 14, 14]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[-0.07, 1.94, 0.2]}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshStandardMaterial color="#1c1917" />
          </mesh>
          <mesh position={[0.07, 1.94, 0.2]}>
            <sphereGeometry args={[0.018, 12, 12]} />
            <meshStandardMaterial color="#1c1917" />
          </mesh>
          <mesh position={[-0.07, 2.0, 0.16]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.07, 0.014, 0.012]} />
            <meshStandardMaterial color={player.hair} />
          </mesh>
          <mesh position={[0.07, 2.0, 0.16]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.07, 0.014, 0.012]} />
            <meshStandardMaterial color={player.hair} />
          </mesh>
          <mesh position={[0, 1.9, 0.2]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.87, 0.21]}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color={skin} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.8, 0.185]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.075, 0.016, 0.012]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>

          {active && meter && (meter.armed || meter.result) && (
            <Html position={[0, 2.55, 0]} center distanceFactor={8} zIndexRange={[40, 0]}>
              <div className="pointer-events-none flex w-10 flex-col items-center">
                <div className="relative h-28 w-3 overflow-hidden rounded-full border border-black/25 bg-black/40 backdrop-blur-sm">
                  <div className="absolute inset-x-0 bg-emerald-400/65" style={{ bottom: '40%', height: '22%' }} />
                  <div
                    className="absolute inset-x-0.5 h-1.5 rounded-full bg-[#ff5c39] shadow-[0_0_8px_#ff5c39]"
                    style={{ bottom: `${Math.max(2, Math.min(96, meter.value * 100))}%` }}
                  />
                </div>
                {meter.result && (
                  <span
                    className={cn(
                      'mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                      meter.result === 'miss' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                    )}
                  >
                    {meter.result === 'perfect' ? 'SWISH' : meter.result === 'good' ? 'IN' : 'MISS'}
                  </span>
                )}
              </div>
            </Html>
          )}
        </group>
      </group>
    </group>
  )
}

export function RealisticHoop({
  side,
  netPulse = 0,
  boardFlash = 0,
}: {
  side: 1 | -1
  netPulse?: number
  boardFlash?: number
}) {
  const x = side * 5.35
  const netScale = 1 + netPulse * 0.4
  const netWobble = netPulse * 0.12

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[side * 0.55, 0.18, 0]} castShadow>
        <boxGeometry args={[0.9, 0.36, 0.7]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[side * 0.45, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.095, 0.12, 2.7, 22]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.88} roughness={0.16} />
      </mesh>
      <mesh position={[side * 0.45, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.55, 18]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
      </mesh>
      <mesh position={[side * -0.05, 3.05, 0]} castShadow>
        <boxGeometry args={[0.95, 0.12, 0.12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[side * 0.15, 2.55, 0]} rotation={[0, 0, side * -0.55]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.08]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      <mesh position={[side * -0.58, 3.22, 0]} castShadow>
        <boxGeometry args={[0.09, 1.2, 1.95]} />
        <meshPhysicalMaterial
          color="#e8eef5"
          transparent
          opacity={0.48}
          metalness={0.05}
          roughness={0.04}
          transmission={0.55}
          thickness={0.25}
        />
      </mesh>
      <mesh position={[side * -0.53, 3.22, 0]}>
        <boxGeometry args={[0.02, 1.24, 1.99]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[side * -0.52, 2.98, 0]}>
        <boxGeometry args={[0.03, 0.52, 0.78]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.15 + boardFlash * 2.2}
        />
      </mesh>

      <mesh position={[side * -0.9, 2.72, 0]} castShadow>
        <boxGeometry args={[0.28, 0.04, 0.18]} />
        <meshStandardMaterial color="#ef4444" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[side * -1.05, 2.72, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.31, 0.04, 18, 48]} />
        <meshStandardMaterial color="#ef4444" metalness={0.9} roughness={0.12} />
      </mesh>

      <group position={[side * -1.05, 2.34 + netWobble * 0.15, 0]} scale={[1, netScale, 1]} rotation={[0, netWobble, 0]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2
          return (
            <mesh key={`v-${i}`} position={[Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26]} castShadow>
              <cylinderGeometry args={[0.007, 0.016, 0.72, 6]} />
              <meshStandardMaterial color="#f1f5f9" transparent opacity={0.9} />
            </mesh>
          )
        })}
        {[0.15, -0.05, -0.25].map((y, idx) => (
          <mesh key={`r-${idx}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2 - idx * 0.035, 0.008, 8, 28]} />
            <meshStandardMaterial color="#e2e8f0" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function BasketballCourtFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[28, 18]} />
        <meshStandardMaterial color="#1c1917" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14.2, 9.2]} />
        <meshStandardMaterial color="#6b3f1f" roughness={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[11.6, 7.1]} />
        <meshStandardMaterial color="#b86a2e" roughness={0.48} metalness={0.05} />
      </mesh>
      {[-2.8, -1.4, 0, 1.4, 2.8].map((x, i) => (
        <mesh key={`band-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.008, 0]} receiveShadow>
          <planeGeometry args={[1.25, 7.05]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#c2783a' : '#a85f28'} roughness={0.5} />
        </mesh>
      ))}

      <CourtLine w={11.5} d={0.06} z={3.45} />
      <CourtLine w={11.5} d={0.06} z={-3.45} />
      <CourtLine w={0.06} d={7} x={5.7} />
      <CourtLine w={0.06} d={7} x={-5.7} />
      <CourtLine w={0.07} d={7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <ringGeometry args={[1.15, 1.24, 56]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.85, 0.012, 0]} receiveShadow>
        <planeGeometry args={[2.8, 2.45]} />
        <meshStandardMaterial color="#8f4d22" roughness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.85, 0.012, 0]} receiveShadow>
        <planeGeometry args={[2.8, 2.45]} />
        <meshStandardMaterial color="#8f4d22" roughness={0.55} />
      </mesh>
      <CourtLine w={2.8} d={0.05} x={3.85} z={1.2} />
      <CourtLine w={2.8} d={0.05} x={3.85} z={-1.2} />
      <CourtLine w={0.05} d={2.45} x={2.45} />
      <CourtLine w={2.8} d={0.05} x={-3.85} z={1.2} />
      <CourtLine w={2.8} d={0.05} x={-3.85} z={-1.2} />
      <CourtLine w={0.05} d={2.45} x={-2.45} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.45, 0.027, 0]}>
        <ringGeometry args={[1.05, 1.13, 48, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, Math.PI, 0]} position={[-2.45, 0.027, 0]}>
        <ringGeometry args={[1.05, 1.13, 48, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.55, 0.024, 0]}>
        <ringGeometry args={[3.55, 3.63, 64, 1, -1.15, 2.3]} />
        <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, Math.PI, 0]} position={[-4.55, 0.024, 0]}>
        <ringGeometry args={[3.55, 3.63, 64, 1, -1.15, 2.3]} />
        <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 5.4]}>
          {[0, 1, 2].map((row) => (
            <mesh key={row} position={[0, 0.25 + row * 0.35, side * row * 0.35]} castShadow receiveShadow>
              <boxGeometry args={[16, 0.3, 0.55]} />
              <meshStandardMaterial color={row % 2 === 0 ? '#292524' : '#1c1917'} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[8.2, 2.2, 0]}>
        <boxGeometry args={[0.25, 4.2, 10]} />
        <meshStandardMaterial color="#111827" roughness={0.85} />
      </mesh>
      <mesh position={[-8.2, 2.2, 0]}>
        <boxGeometry args={[0.25, 4.2, 10]} />
        <meshStandardMaterial color="#111827" roughness={0.85} />
      </mesh>
      <mesh position={[8, 2.4, 0]}>
        <planeGeometry args={[3.2, 1.1]} />
        <meshStandardMaterial color="#ff5c39" emissive="#ff5c39" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[-8, 2.4, 0]}>
        <planeGeometry args={[3.2, 1.1]} />
        <meshStandardMaterial color="#1d4ed8" emissive="#1d4ed8" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}
