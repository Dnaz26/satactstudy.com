'use client'

import * as React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { GameId } from '@/lib/game/modes'
import type { TeamKit } from '@/components/game/assets/kits'

function Limb({
  args,
  position,
  rotation,
  color,
  metalness = 0.15,
  roughness = 0.55,
}: {
  args: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

/** Tactical / athletic humanoid with gear sockets for sport props. */
export function TacticalAthlete({
  kit,
  gameId,
  position,
  facing = 1,
  active,
  anim,
}: {
  kit: TeamKit
  gameId: GameId
  position: [number, number, number]
  facing?: 1 | -1
  active?: boolean
  anim?: 'idle' | 'ready' | 'strike'
}) {
  const group = React.useRef<THREE.Group>(null)
  const phase = React.useRef(Math.random() * Math.PI * 2)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime + phase.current
    const bounce = anim === 'strike' ? Math.sin(t * 12) * 0.08 : Math.sin(t * 3.2) * 0.035
    group.current.position.y = position[1] + bounce
    if (active) {
      group.current.rotation.y = facing * 0.15 + Math.sin(t * 2) * 0.05
    }
  })

  const isTactical = false
  const isBoxer = false
  const isFootball = false
  const isHockey = false

  return (
    <group ref={group} position={position} scale={[facing, 1, 1]}>
      {/* Selection ring */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.62, 48]} />
          <meshStandardMaterial
            color="#2dd4bf"
            emissive="#14b8a6"
            emissiveIntensity={1.4}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Boots */}
      <Limb args={[0.22, 0.12, 0.34]} position={[-0.14, 0.08, 0.04]} color="#111111" metalness={0.4} roughness={0.35} />
      <Limb args={[0.22, 0.12, 0.34]} position={[0.14, 0.08, 0.04]} color="#111111" metalness={0.4} roughness={0.35} />

      {/* Legs */}
      <Limb args={[0.2, 0.55, 0.22]} position={[-0.14, 0.42, 0]} color={kit.pants} />
      <Limb args={[0.2, 0.55, 0.22]} position={[0.14, 0.42, 0]} color={kit.pants} />

      {/* Torso / jersey / armor */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.32]} />
        <meshStandardMaterial
          color={kit.primary}
          metalness={isTactical || isFootball ? 0.45 : 0.12}
          roughness={isTactical || isFootball ? 0.35 : 0.6}
        />
      </mesh>
      {/* Chest plate / logo panel */}
      <mesh position={[0, 1.12, 0.17]} castShadow>
        <boxGeometry args={[0.32, 0.28, 0.04]} />
        <meshStandardMaterial color={kit.secondary} metalness={0.3} roughness={0.4} />
      </mesh>
      {isFootball && (
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.7, 0.55, 0.45]} />
          <meshStandardMaterial color={kit.primary} metalness={0.25} roughness={0.5} transparent opacity={0.95} />
        </mesh>
      )}
      {isTactical && (
        <>
          <Limb args={[0.5, 0.12, 0.28]} position={[0, 0.78, 0]} color="#0f172a" metalness={0.5} roughness={0.3} />
          <Limb args={[0.18, 0.22, 0.12]} position={[-0.28, 1.05, 0.12]} color="#1e293b" metalness={0.6} roughness={0.25} />
          <Limb args={[0.18, 0.22, 0.12]} position={[0.28, 1.05, 0.12]} color="#1e293b" metalness={0.6} roughness={0.25} />
        </>
      )}

      {/* Arms */}
      <Limb
        args={[0.14, 0.5, 0.16]}
        position={[-0.4, 1.05, 0]}
        rotation={[0, 0, anim === 'strike' ? 0.6 : 0.25]}
        color={isBoxer ? kit.skin : kit.primary}
      />
      <Limb
        args={[0.14, 0.5, 0.16]}
        position={[0.4, 1.05, 0]}
        rotation={[0, 0, anim === 'strike' ? -0.9 : -0.25]}
        color={isBoxer ? kit.skin : kit.primary}
      />

      {/* Hands / gloves */}
      {isBoxer ? (
        <>
          <mesh position={[-0.52, 0.78, 0.12]} castShadow>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial color="#dc2626" metalness={0.05} roughness={0.7} />
          </mesh>
          <mesh position={[0.55, 0.82, 0.18]} castShadow>
            <sphereGeometry args={[0.16, 24, 24]} />
            <meshStandardMaterial color="#dc2626" metalness={0.05} roughness={0.7} />
          </mesh>
        </>
      ) : (
        <>
          <Limb args={[0.12, 0.12, 0.14]} position={[-0.42, 0.78, 0.05]} color={kit.skin} />
          <Limb args={[0.12, 0.12, 0.14]} position={[0.42, 0.78, 0.05]} color={kit.skin} />
        </>
      )}

      {/* Neck + head */}
      <Limb args={[0.14, 0.12, 0.14]} position={[0, 1.45, 0]} color={kit.skin} />
      <mesh position={[0, 1.72, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color={kit.skin} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Helmet / headgear */}
      {(isFootball || isHockey || isTactical) && (
        <mesh position={[0, 1.78, 0]} castShadow>
          <sphereGeometry args={[0.24, 32, 32]} />
          <meshStandardMaterial
            color={isTactical ? '#0f172a' : kit.accent}
            metalness={0.55}
            roughness={0.28}
          />
        </mesh>
      )}
      {isFootball && (
        <mesh position={[0, 1.72, 0.18]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.12]} />
          <meshStandardMaterial color="#111111" metalness={0.7} roughness={0.2} />
        </mesh>
      )}
      {isTactical && (
        <mesh position={[0, 1.78, 0.2]} castShadow>
          <boxGeometry args={[0.3, 0.1, 0.08]} />
          <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.8} metalness={0.8} roughness={0.15} />
        </mesh>
      )}

      {/* Sport-held props attached to athlete */}
      {false && (
        <mesh position={[0.45, 0.95, 0.25]} castShadow>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color="#c2410c" roughness={0.45} metalness={0.1} />
        </mesh>
      )}
      {false && (
        <mesh position={[0.35, 0.2, 0.35]} castShadow>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.05} />
        </mesh>
      )}
      {false && (
        <group position={[0.55, 1.05, 0.1]} rotation={[0, 0, -0.6]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.05, 0.85, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.55} metalness={0.1} />
          </mesh>
        </group>
      )}
      {false && (
        <group position={[0.5, 0.85, 0.15]} rotation={[0.2, 0, -0.4]}>
          <mesh castShadow>
            <boxGeometry args={[0.05, 1.1, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.55, 0.08]} castShadow>
            <boxGeometry args={[0.22, 0.06, 0.14]} />
            <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.25} />
          </mesh>
        </group>
      )}
      {false && (
        <mesh position={[0.35, 1.0, 0.28]} rotation={[0.4, 0.2, 0.3]} castShadow>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.55} metalness={0.05} />
        </mesh>
      )}
      {false && <AssaultRifle position={[0.35, 1.05, 0.35]} />}
    </group>
  )
}

export function AssaultRifle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0.05, 0.2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.12, 0.55]} />
        <meshStandardMaterial color="#1f2937" metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.02, 0.4]} castShadow>
        <boxGeometry args={[0.05, 0.06, 0.28]} />
        <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.18} />
      </mesh>
      <mesh position={[0, -0.1, -0.05]} castShadow>
        <boxGeometry args={[0.05, 0.16, 0.08]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.09, 0.05]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.12]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.6} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.55]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 0.12, 12]} />
        <meshStandardMaterial color="#020617" metalness={0.85} roughness={0.15} />
      </mesh>
    </group>
  )
}
