'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { FighterJetStage } from '@/components/game/fighterjet/jet-stage'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { officialChoiceLabel } from '@/lib/schema'
import {
  JET_MATCH_SECONDS,
  JET_MAX_HP,
  JET_WIN_KILLS,
  clampGalaxy,
  type JetBullet,
  type JetEnemy,
  type JetMeteor,
} from '@/lib/game/fighterjet'
import { COIN_REWARDS } from '@/lib/economy/catalog'
import type { BookletQuestion } from '@/components/practice/test-booklet'
import { cn } from '@/lib/utils'

type Phase = 'ready' | 'play' | 'quiz' | 'win' | 'lose'

export function FighterJetClient({ testType }: { testType: 'SAT' | 'ACT' }) {
  const [phase, setPhase] = React.useState<Phase>('ready')
  const [playerX, setPlayerX] = React.useState(0)
  const [playerY, setPlayerY] = React.useState(0)
  const [roll, setRoll] = React.useState(0)
  const [pitch, setPitch] = React.useState(0)
  const [hp, setHp] = React.useState(JET_MAX_HP)
  const [kills, setKills] = React.useState(0)
  const [secondsLeft, setSecondsLeft] = React.useState(JET_MATCH_SECONDS)
  const [enemies, setEnemies] = React.useState<JetEnemy[]>([])
  const [meteors, setMeteors] = React.useState<JetMeteor[]>([])
  const [bullets, setBullets] = React.useState<JetBullet[]>([])
  const [winCoins, setWinCoins] = React.useState<number | null>(null)

  const [quiz, setQuiz] = React.useState<BookletQuestion[]>([])
  const [quizIndex, setQuizIndex] = React.useState(0)
  const [choice, setChoice] = React.useState('')
  const [quizMark, setQuizMark] = React.useState<'ok' | 'bad' | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)

  const keysRef = React.useRef<Set<string>>(new Set())
  const fireCd = React.useRef(0)
  const nextId = React.useRef(1)
  const phaseRef = React.useRef(phase)
  phaseRef.current = phase
  const posRef = React.useRef({ x: 0, y: 0 })
  posRef.current = { x: playerX, y: playerY }
  const enemiesRef = React.useRef(enemies)
  enemiesRef.current = enemies
  const meteorsRef = React.useRef(meteors)
  meteorsRef.current = meteors
  const bulletsRef = React.useRef(bullets)
  bulletsRef.current = bullets
  const hpRef = React.useRef(hp)
  hpRef.current = hp
  const killsRef = React.useRef(kills)
  killsRef.current = kills

  function awardWin() {
    void (async () => {
      try {
        const res = await fetch('/api/economy/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'game_win', meta: { modeId: 'fighterjet' } }),
        })
        const data = (await res.json()) as { awarded?: number; skipped?: boolean }
        setWinCoins(data.skipped ? 0 : (data.awarded ?? COIN_REWARDS.game_win))
      } catch {
        setWinCoins(null)
      }
    })()
  }

  function startGame() {
    setPlayerX(0)
    setPlayerY(0)
    setRoll(0)
    setPitch(0)
    setHp(JET_MAX_HP)
    setKills(0)
    setSecondsLeft(JET_MATCH_SECONDS)
    setEnemies([])
    setMeteors([])
    setBullets([])
    setWinCoins(null)
    setPhase('play')
  }

  async function openHitQuiz() {
    setPhase('quiz')
    setQuizLoading(true)
    setChoice('')
    setQuizMark(null)
    setQuizIndex(0)
    try {
      const res = await fetch(`/api/practice/questions?testType=${testType}&count=6&difficulty=mixed`)
      const data = (await res.json()) as { questions?: BookletQuestion[] }
      setQuiz(data.questions ?? [])
    } catch {
      setQuiz([])
    } finally {
      setQuizLoading(false)
    }
  }

  function finishQuizAndResume() {
    setHp(JET_MAX_HP * 0.55)
    setPhase('play')
    setQuiz([])
    setChoice('')
    setQuizMark(null)
  }

  function submitQuiz() {
    const q = quiz[quizIndex]
    if (!q || !choice || quizMark) return
    const ok = choice === q.correct_answer
    setQuizMark(ok ? 'ok' : 'bad')
    window.setTimeout(() => {
      if (ok || quizIndex >= quiz.length - 1) finishQuizAndResume()
      else {
        setChoice('')
        setQuizMark(null)
        setQuizIndex((i) => i + 1)
      }
    }, 450)
  }

  function fire() {
    if (phaseRef.current !== 'play' || fireCd.current > 0) return
    fireCd.current = 0.18
    const { x, y } = posRef.current
    const id = nextId.current++
    setBullets((prev) => [
      ...prev,
      { id, x, y, z: 0.8, vx: 0, vy: 0, vz: 28, from: 'player' },
    ])
  }

  React.useEffect(() => {
    function down(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const key = e.key.toLowerCase()
      keysRef.current.add(key)
      if (e.code === 'Space') {
        e.preventDefault()
        fire()
      }
    }
    function up(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  React.useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => {
      const keys = keysRef.current
      let dx = 0
      let dy = 0
      if (keys.has('a') || keys.has('arrowleft')) dx -= 0.22
      if (keys.has('d') || keys.has('arrowright')) dx += 0.22
      if (keys.has('w') || keys.has('arrowup')) dy += 0.22
      if (keys.has('s') || keys.has('arrowdown')) dy -= 0.22
      if (keys.has(' ')) fire()

      fireCd.current = Math.max(0, fireCd.current - 0.05)

      setPlayerX((px) => {
        const py = posRef.current.y
        const next = clampGalaxy(px + dx, py + dy)
        posRef.current = next
        setPlayerY(next.y)
        setRoll(-dx * 1.8)
        setPitch(dy * 0.9)
        return next.x
      })

      // Enemy fighter jets
      if (Math.random() < 0.07 && enemiesRef.current.length < 6) {
        setEnemies((prev) => [
          ...prev,
          {
            id: nextId.current++,
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 5,
            z: 32 + Math.random() * 18,
            hp: 3,
            fireCd: 0.4 + Math.random() * 0.8,
            kind: 'jet',
          },
        ])
      }

      // Meteorites
      if (Math.random() < 0.12 && meteorsRef.current.length < 14) {
        setMeteors((prev) => [
          ...prev,
          {
            id: nextId.current++,
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 7,
            z: 40 + Math.random() * 25,
            vx: (Math.random() - 0.5) * 1.2,
            vy: (Math.random() - 0.5) * 1.0,
            vz: -(10 + Math.random() * 10),
            r: 0.35 + Math.random() * 0.55,
            spin: 0.8 + Math.random() * 1.8,
          },
        ])
      }

      setEnemies((prev) =>
        prev
          .map((e) => {
            const { x: px, y: py } = posRef.current
            const chaseX = e.x + (px - e.x) * 0.012
            const chaseY = e.y + (py - e.y) * 0.012
            const nz = e.z - 0.48
            let fireCd = e.fireCd - 0.05
            if (fireCd <= 0 && nz > 3) {
              fireCd = 0.85 + Math.random() * 0.6
              const dxb = px - e.x
              const dyb = py - e.y
              const dzb = 0 - e.z
              const len = Math.hypot(dxb, dyb, dzb) || 1
              setBullets((b) => [
                ...b,
                {
                  id: nextId.current++,
                  x: e.x,
                  y: e.y,
                  z: e.z,
                  vx: (dxb / len) * 16,
                  vy: (dyb / len) * 16,
                  vz: (dzb / len) * 16,
                  from: 'enemy',
                },
              ])
            }
            return { ...e, x: chaseX, y: chaseY, z: nz, fireCd }
          })
          .filter((e) => e.z > -5 && e.hp > 0)
      )

      setMeteors((prev) => {
        const next = prev
          .map((m) => ({
            ...m,
            x: m.x + m.vx * 0.05,
            y: m.y + m.vy * 0.05,
            z: m.z + m.vz * 0.05,
          }))
          .filter((m) => m.z > -8)

        // Meteor collisions with player — destroy rock on hit
        const { x, y } = posRef.current
        let nextHp = hpRef.current
        const afterPlayerHit: JetMeteor[] = []
        for (const m of next) {
          if (Math.hypot(m.x - x, m.y - y, m.z - 0) < m.r + 0.55) {
            nextHp -= 16
          } else {
            afterPlayerHit.push(m)
          }
        }
        // Player bullets smash meteors
        let nextBullets = bulletsRef.current
        const keptMeteors: JetMeteor[] = []
        for (const m of afterPlayerHit) {
          let hit = false
          nextBullets = nextBullets.filter((b) => {
            if (b.from !== 'player') return true
            if (Math.hypot(b.x - m.x, b.y - m.y, b.z - m.z) < m.r + 0.25) {
              hit = true
              return false
            }
            return true
          })
          if (!hit) keptMeteors.push(m)
        }
        if (nextBullets !== bulletsRef.current) {
          bulletsRef.current = nextBullets
          setBullets(nextBullets)
        }
        if (nextHp !== hpRef.current) {
          hpRef.current = nextHp
          setHp(nextHp)
          if (nextHp <= 0 && phaseRef.current === 'play') void openHitQuiz()
        }
        meteorsRef.current = keptMeteors
        return keptMeteors
      })

      setBullets((prev) => {
        const moved = prev
          .map((b) => ({
            ...b,
            x: b.x + b.vx * 0.05,
            y: b.y + b.vy * 0.05,
            z: b.z + b.vz * 0.05,
          }))
          .filter((b) => b.z > -8 && b.z < 55)

        let nextEnemies = [...enemiesRef.current]
        let nextHp = hpRef.current
        let nextKills = killsRef.current
        const keep: JetBullet[] = []

        for (const b of moved) {
          let alive = true
          if (b.from === 'player') {
            nextEnemies = nextEnemies.map((e) => {
              if (!alive) return e
              if (Math.hypot(e.x - b.x, e.y - b.y, e.z - b.z) < 0.7) {
                alive = false
                const hpLeft = e.hp - 1
                if (hpLeft <= 0) nextKills += 1
                return { ...e, hp: hpLeft }
              }
              return e
            })
          } else {
            const { x, y } = posRef.current
            if (Math.hypot(b.x - x, b.y - y, b.z - 0) < 0.6) {
              alive = false
              nextHp -= 14
            }
          }
          if (alive) keep.push(b)
        }

        nextEnemies = nextEnemies.filter((e) => e.hp > 0)
        enemiesRef.current = nextEnemies
        setEnemies(nextEnemies)
        if (nextKills !== killsRef.current) {
          killsRef.current = nextKills
          setKills(nextKills)
        }
        if (nextHp !== hpRef.current) {
          hpRef.current = nextHp
          setHp(nextHp)
          if (nextHp <= 0 && phaseRef.current === 'play') {
            void openHitQuiz()
          }
        }
        bulletsRef.current = keep
        return keep
      })
    }, 50)
    return () => window.clearInterval(id)
  }, [phase])

  React.useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  React.useEffect(() => {
    if (phase !== 'play') return
    if (kills >= JET_WIN_KILLS) {
      setPhase('win')
      awardWin()
    } else if (secondsLeft <= 0) {
      if (kills >= 8) {
        setPhase('win')
        awardWin()
      } else setPhase('lose')
    }
  }, [kills, secondsLeft, phase])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-8 pt-1">
      {phase === 'ready' && (
        <Button className="h-14 w-full text-base" onClick={startGame}>
          Launch Fighter Jet
        </Button>
      )}

      {(phase === 'play' || phase === 'quiz' || phase === 'win' || phase === 'lose') && (
        <FighterJetStage
          playerX={playerX}
          playerY={playerY}
          roll={roll}
          pitch={pitch}
          enemies={enemies}
          meteors={meteors}
          bullets={bullets}
          hp={hp}
          kills={kills}
          secondsLeft={secondsLeft}
        />
      )}

      {phase === 'play' && (
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12" onClick={fire}>
            Fire
          </Button>
          <Button className="h-12" variant="secondary" onClick={() => setPlayerX(0)}>
            Center
          </Button>
        </div>
      )}

      {phase === 'quiz' && (
        <div className="space-y-3 rounded-2xl border border-cyan-500/30 bg-white p-4">
          {quizLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Loading…" />
            </div>
          )}
          {!quizLoading && quiz[quizIndex] && (
            <>
              <QuestionPrompt text={cleanQuestionText(quiz[quizIndex].question_text)} className="mb-0 text-base" />
              <div className="grid gap-2">
                {(quiz[quizIndex].choices ?? []).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => !quizMark && setChoice(item.key)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left text-sm',
                      choice === item.key ? 'border-signal bg-signal text-white' : 'border-line bg-white'
                    )}
                  >
                    <span className="mr-2 font-mono text-[10px]">{item.key}</span>
                    {item.text}
                  </button>
                ))}
              </div>
              {quizMark && (
                <p className="text-sm text-fog">
                  {quizMark === 'ok'
                    ? 'Correct.'
                    : `Incorrect · ${officialChoiceLabel(quiz[quizIndex].correct_answer, testType, quizIndex + 1)}`}
                </p>
              )}
              <Button className="h-12 w-full" onClick={submitQuiz} disabled={!choice || Boolean(quizMark)}>
                Check
              </Button>
            </>
          )}
          {!quizLoading && !quiz[quizIndex] && (
            <Button className="h-12 w-full" onClick={finishQuizAndResume}>
              Continue
            </Button>
          )}
        </div>
      )}

      {phase === 'win' && (
        <div className="text-center">
          {winCoins != null && winCoins > 0 && (
            <p className="mb-2 font-mono text-sm text-signal">+{winCoins}</p>
          )}
          <Button className="h-12 w-full" onClick={startGame}>
            Fly again
          </Button>
        </div>
      )}

      {phase === 'lose' && (
        <Button className="h-12 w-full" onClick={startGame}>
          Retry
        </Button>
      )}
    </div>
  )
}
