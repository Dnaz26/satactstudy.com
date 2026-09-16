'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BasketballStage } from '@/components/game/basketball/bball-stage'
import { cn } from '@/lib/utils'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { officialChoiceLabel } from '@/lib/schema'
import {
  AWAY_MAKE_RATE,
  HOOP_X,
  MATCH_SECONDS,
  WIN_SCORE,
  clampCourt,
  createRoster,
  mostOpenTeammate,
  offenseSpot,
  opennessScore,
  separateFromCrowd,
  shotMakeChance,
  tipOffPositions,
  timingQualityFromMeter,
  type BBallPlayer,
  type Possession,
} from '@/lib/game/basketball'
import { COIN_REWARDS } from '@/lib/economy/catalog'
import type { BookletQuestion } from '@/components/practice/test-booklet'

type Phase = 'ready' | 'tipoff' | 'play' | 'quiz' | 'win' | 'lose'

function dist(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

export function BasketballClient({ testType }: { testType: 'SAT' | 'ACT' }) {
  const [phase, setPhase] = React.useState<Phase>('ready')
  const [players, setPlayers] = React.useState<BBallPlayer[]>(() => createRoster())
  const [controlledId, setControlledId] = React.useState('h1')
  const [ballHolderId, setBallHolderId] = React.useState<string | null>(null)
  const [possession, setPossession] = React.useState<Possession>('home')
  const [homeScore, setHomeScore] = React.useState(0)
  const [awayScore, setAwayScore] = React.useState(0)
  const [secondsLeft, setSecondsLeft] = React.useState(MATCH_SECONDS)
  const [jumpingId, setJumpingId] = React.useState<string | null>(null)
  const [meterArmed, setMeterArmed] = React.useState(false)
  const [meterValue, setMeterValue] = React.useState(0)
  const [meterResult, setMeterResult] = React.useState<null | 'perfect' | 'good' | 'miss'>(null)
  const [shotFlight, setShotFlight] = React.useState<null | {
    from: [number, number, number]
    to: [number, number, number]
    key: number
    made: boolean
  }>(null)
  const [netPulse, setNetPulse] = React.useState(0)
  const [boardFlash, setBoardFlash] = React.useState(0)
  const [winCoins, setWinCoins] = React.useState<number | null>(null)

  const [quiz, setQuiz] = React.useState<BookletQuestion[]>([])
  const [quizIndex, setQuizIndex] = React.useState(0)
  const [choice, setChoice] = React.useState('')
  const [quizMark, setQuizMark] = React.useState<'ok' | 'bad' | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)

  const keysRef = React.useRef<Set<string>>(new Set())
  const meterDir = React.useRef(1)
  const playersRef = React.useRef(players)
  playersRef.current = players
  const phaseRef = React.useRef(phase)
  phaseRef.current = phase
  const possessionRef = React.useRef(possession)
  possessionRef.current = possession
  const controlledRef = React.useRef(controlledId)
  controlledRef.current = controlledId
  const ballRef = React.useRef(ballHolderId)
  ballRef.current = ballHolderId
  const meterArmedRef = React.useRef(meterArmed)
  meterArmedRef.current = meterArmed
  const meterValueRef = React.useRef(meterValue)
  meterValueRef.current = meterValue

  const homePlayers = players.filter((p) => p.side === 'home')

  function awardWin() {
    void (async () => {
      try {
        const res = await fetch('/api/economy/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'game_win', meta: { modeId: 'basketball' } }),
        })
        const data = await res.json() as { awarded?: number; skipped?: boolean }
        setWinCoins(data.skipped ? 0 : (data.awarded ?? COIN_REWARDS.game_win))
      } catch {
        setWinCoins(null)
      }
    })()
  }

  function startTipOff() {
    const roster = createRoster()
    const spots = tipOffPositions()
    const next = roster.map((p) => {
      const i = p.number - 1
      const spot = p.side === 'home' ? spots.home[i] : spots.away[i]
      return {
        ...p,
        x: spot.x,
        z: spot.z,
        facing: p.side === 'home' ? 0 : Math.PI,
      }
    })
    setPlayers(next)
    setControlledId('h1')
    setBallHolderId(null)
    setPossession('home')
    setHomeScore(0)
    setAwayScore(0)
    setSecondsLeft(MATCH_SECONDS)
    setJumpingId(null)
    setMeterArmed(false)
    setMeterResult(null)
    setShotFlight(null)
    setNetPulse(0)
    setBoardFlash(0)
    setWinCoins(null)
    setPhase('tipoff')

    // Tip-off animation then home wins tip (easy)
    window.setTimeout(() => setJumpingId('h1'), 400)
    window.setTimeout(() => setJumpingId('a1'), 450)
    window.setTimeout(() => {
      setJumpingId(null)
      setBallHolderId('h1')
      setPossession('home')
      setControlledId('h1')
      setPhase('play')
    }, 1600)
  }

  function pulseNet(made: boolean) {
    if (made) {
      setNetPulse(1)
      window.setTimeout(() => setNetPulse(0), 500)
    } else {
      setBoardFlash(1)
      window.setTimeout(() => setBoardFlash(0), 350)
    }
  }

  function passTo(number: number) {
    if (phaseRef.current !== 'play') return
    if (possessionRef.current !== 'home') {
      const target = playersRef.current.find((p) => p.side === 'home' && p.number === number)
      if (target) setControlledId(target.id)
      return
    }
    const target = playersRef.current.find((p) => p.side === 'home' && p.number === number)
    if (!target) return
    setBallHolderId(target.id)
    setControlledId(target.id)
  }

  function passToMostOpen() {
    if (phaseRef.current !== 'play' || possessionRef.current !== 'home') return
    const open = mostOpenTeammate(playersRef.current, ballRef.current)
    if (!open) return
    setBallHolderId(open.id)
    setControlledId(open.id)
  }

  function startShotMeter() {
    if (phaseRef.current !== 'play' || possessionRef.current !== 'home') return
    if (ballRef.current !== controlledRef.current) return
    if (meterArmedRef.current) {
      releaseShot()
      return
    }
    setMeterArmed(true)
    setMeterResult(null)
    setMeterValue(0.08)
    meterDir.current = 1
  }

  function releaseShot() {
    if (!meterArmedRef.current) return
    const quality = timingQualityFromMeter(meterValueRef.current)
    const shooter = playersRef.current.find((p) => p.id === controlledRef.current)
    if (!shooter) return
    const distance = Math.hypot(shooter.x - HOOP_X, shooter.z - 0)
    const chance = shotMakeChance(quality, distance)
    const made = Math.random() < chance
    setMeterArmed(false)
    setMeterResult(made ? (quality >= 0.88 ? 'perfect' : 'good') : 'miss')

    const from: [number, number, number] = [shooter.x, 1.5, shooter.z]
    const to: [number, number, number] = made
      ? [HOOP_X - 0.55, 2.55, 0]
      : [HOOP_X - 0.35 + (Math.random() - 0.5) * (1.4 - quality), 2.9, (Math.random() - 0.5) * (1.5 - quality)]

    setShotFlight({ from, to, key: Date.now(), made })
    setBallHolderId(null)

    window.setTimeout(() => {
      setShotFlight(null)
      pulseNet(made)
      if (made) {
        setHomeScore((s) => s + 1)
        setPossession('away')
        setBallHolderId('a1')
        setControlledId('h1')
      } else {
        // rebound — easy bias to home
        if (Math.random() < 0.62) {
          const near = [...playersRef.current.filter((p) => p.side === 'home')].sort(
            (a, b) => dist(a, { x: HOOP_X, z: 0 }) - dist(b, { x: HOOP_X, z: 0 })
          )[0]
          setBallHolderId(near.id)
          setControlledId(near.id)
          setPossession('home')
        } else {
          setBallHolderId('a1')
          setPossession('away')
          setControlledId('h1')
        }
      }
      window.setTimeout(() => setMeterResult(null), 700)
    }, 800)
  }

  function trySteal() {
    if (phaseRef.current !== 'play' || possessionRef.current !== 'away') return
    const me = playersRef.current.find((p) => p.id === controlledRef.current)
    const holder = playersRef.current.find((p) => p.id === ballRef.current)
    if (!me || !holder) return
    if (dist(me, holder) > 1.4) return
    if (Math.random() < 0.55) {
      setBallHolderId(me.id)
      setPossession('home')
    }
  }

  function tryBlock() {
    if (phaseRef.current !== 'play' || possessionRef.current !== 'away') return
    const me = playersRef.current.find((p) => p.id === controlledRef.current)
    const holder = playersRef.current.find((p) => p.id === ballRef.current)
    if (!me) return
    setJumpingId(me.id)
    window.setTimeout(() => setJumpingId(null), 400)
    if (holder && dist(me, holder) < 1.7 && Math.random() < 0.5) {
      setBallHolderId(me.id)
      setPossession('home')
    }
  }

  function onSpace() {
    if (possessionRef.current === 'home') startShotMeter()
    else trySteal()
  }

  async function openOpponentQuiz() {
    setPhase('quiz')
    setQuizLoading(true)
    setChoice('')
    setQuizMark(null)
    setQuizIndex(0)
    try {
      const res = await fetch(`/api/practice/questions?testType=${testType}&count=8&difficulty=mixed`)
      const data = await res.json() as { questions?: BookletQuestion[] }
      setQuiz(data.questions ?? [])
    } catch {
      setQuiz([])
    } finally {
      setQuizLoading(false)
    }
  }

  function finishQuizAndResume() {
    setPhase('play')
    setPossession('home')
    setBallHolderId('h1')
    setControlledId('h1')
  }

  function submitQuiz() {
    const q = quiz[quizIndex]
    if (!q || !choice || quizMark) return
    const ok = choice.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
    setQuizMark(ok ? 'ok' : 'bad')
    window.setTimeout(() => {
      if (ok || quizIndex >= quiz.length - 1) {
        finishQuizAndResume()
        return
      }
      setChoice('')
      setQuizMark(null)
      setQuizIndex((i) => i + 1)
    }, 500)
  }

  React.useEffect(() => {
    function down(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const key = e.key.toLowerCase()
      keysRef.current.add(key)
      if (phaseRef.current !== 'play') return
      if (e.code === 'Space') {
        e.preventDefault()
        onSpace()
      }
      if (e.key === 'ArrowUp' && possessionRef.current === 'away') {
        e.preventDefault()
        tryBlock()
      }
      if (key >= '1' && key <= '5') passTo(Number(key))
      if (key === 'e') {
        e.preventDefault()
        passToMostOpen()
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

  // Movement, meter, man-to-man defense, away AI
  React.useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => {
      if (meterArmedRef.current) {
        setMeterValue((v) => {
          let next = v + meterDir.current * 0.04
          if (next >= 1) {
            next = 1
            meterDir.current = -1
          } else if (next <= 0) {
            next = 0
            meterDir.current = 1
          }
          meterValueRef.current = next
          return next
        })
      }

      const keys = keysRef.current
      let dx = 0
      let dz = 0
      if (keys.has('a') || keys.has('arrowleft')) dx -= 0.3
      if (keys.has('d') || keys.has('arrowright')) dx += 0.3
      if (keys.has('w')) dz -= 0.3
      if (keys.has('s') || keys.has('arrowdown')) dz += 0.3
      if (keys.has('arrowup') && possessionRef.current === 'home') dz -= 0.3

      setPlayers((prev) => {
        const poss = possessionRef.current
        const holderId = ballRef.current
        const byId = new Map(prev.map((p) => [p.id, p]))
        const t = performance.now() / 1000
        const holder = holderId ? byId.get(holderId) : null

        const moved = prev.map((p) => {
          // User move — face steer direction
          if (p.id === controlledRef.current && (dx || dz)) {
            const next = clampCourt(p.x + dx, p.z + dz)
            return { ...p, ...next, facing: Math.atan2(dz, dx) }
          }

          // Away man-to-man: guard / pressure
          if (p.side === 'away') {
            const match = byId.get(p.matchId)
            if (!match) return p

            if (poss === 'away' && p.id === holderId) {
              const targetX = -HOOP_X + 1.6
              const nx = p.x + (targetX - p.x) * 0.04
              const nz = p.z + (0 - p.z) * 0.03
              const clamped = clampCourt(nx, nz)
              return {
                ...p,
                ...clamped,
                facing: Math.atan2(clamped.z - p.z, clamped.x - p.x) || p.facing,
              }
            }

            const pressBall = poss === 'home' && holder && holder.id === p.matchId
            const guardX = pressBall ? holder.x + 0.45 : match.x + 0.95
            const guardZ = pressBall ? holder.z * 0.95 : match.z * 0.9
            const nx = p.x + (guardX - p.x) * (pressBall ? 0.11 : 0.07)
            const nz = p.z + (guardZ - p.z) * (pressBall ? 0.11 : 0.07)
            const clamped = clampCourt(nx, nz)
            const mx = clamped.x - p.x
            const mz = clamped.z - p.z
            return {
              ...p,
              ...clamped,
              facing: Math.hypot(mx, mz) > 0.01 ? Math.atan2(mz, mx) : p.facing,
            }
          }

          // Home teammates: cut to spaced open spots (not clustered)
          if (p.side === 'home' && p.id !== controlledRef.current) {
            const ballX = holder?.x ?? 0
            const ballZ = holder?.z ?? 0
            let spot = offenseSpot(p.number, ballX, ballZ, t)
            // Prefer drifting toward hoop if they're the most open cutter
            const away = prev.filter((o) => o.side === 'away')
            const openBoost = opennessScore(p, away, holder ?? null)
            if (openBoost > 3.2) {
              spot = clampCourt(spot.x + 0.35, spot.z * 0.92)
            }
            const nx = p.x + (spot.x - p.x) * 0.055
            const nz = p.z + (spot.z - p.z) * 0.055
            let clamped = clampCourt(nx, nz)
            clamped = separateFromCrowd(
              { ...p, ...clamped },
              prev.filter((o) => o.side === 'home')
            )
            return {
              ...p,
              ...clamped,
              facing: Math.atan2(spot.z - p.z, spot.x - p.x) || p.facing,
            }
          }

          // Idle controlled player still faces hoop-ish when standing
          if (p.id === controlledRef.current && !dx && !dz) {
            return p
          }

          return p
        })

        // Second pass: keep everyone spaced after simultaneous moves
        return moved.map((p) => {
          if (p.id === controlledRef.current && (dx || dz)) return p
          const spaced = separateFromCrowd(
            p,
            moved.filter((o) => o.side === p.side)
          )
          if (spaced.x === p.x && spaced.z === p.z) return p
          return {
            ...p,
            ...spaced,
            facing: Math.atan2(spaced.z - p.z, spaced.x - p.x) || p.facing,
          }
        })
      })

      // Away AI steals when guarding close to the ball handler
      if (
        possessionRef.current === 'home' &&
        ballRef.current &&
        !meterArmedRef.current
      ) {
        const holder = playersRef.current.find((p) => p.id === ballRef.current)
        if (holder && holder.side === 'home') {
          const defender = playersRef.current.find((p) => p.side === 'away' && p.matchId === holder.id)
          if (defender && dist(defender, holder) < 1.15 && Math.random() < 0.045) {
            setBallHolderId(defender.id)
            setPossession('away')
            setMeterArmed(false)
            setMeterResult(null)
          }
        }
      }

      // Away shot attempt near rim — 70% make
      if (possessionRef.current === 'away' && ballRef.current) {
        const holder = playersRef.current.find((p) => p.id === ballRef.current)
        if (holder && dist(holder, { x: -HOOP_X, z: 0 }) < 2.5 && Math.random() < 0.025) {
          const made = Math.random() < AWAY_MAKE_RATE
          const from: [number, number, number] = [holder.x, 1.5, holder.z]
          const to: [number, number, number] = made
            ? [-HOOP_X + 0.55, 2.55, 0]
            : [-HOOP_X + 0.4, 2.9, (Math.random() - 0.5)]
          setShotFlight({ from, to, key: Date.now(), made })
          setBallHolderId(null)
          window.setTimeout(() => {
            setShotFlight(null)
            // Use left hoop net — we only pulse right hoop visually; still flash board on miss conceptually
            pulseNet(made)
            if (made) {
              setAwayScore((s) => s + 1)
              void openOpponentQuiz()
            } else {
              const near = [...playersRef.current.filter((p) => p.side === 'home')].sort(
                (a, b) => dist(a, holder) - dist(b, holder)
              )[0]
              setBallHolderId(near.id)
              setControlledId(near.id)
              setPossession('home')
            }
          }, 800)
        }
      }
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
    if (homeScore >= WIN_SCORE) {
      setPhase('win')
      awardWin()
    } else if (awayScore >= WIN_SCORE) {
      setPhase('lose')
    } else if (secondsLeft <= 0) {
      if (homeScore >= awayScore) {
        setPhase('win')
        awardWin()
      } else setPhase('lose')
    }
  }, [homeScore, awayScore, secondsLeft, phase])

  const meter =
    phase === 'play'
      ? { value: meterValue, armed: meterArmed, result: meterResult }
      : null

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 pb-8 pt-1">
      {phase === 'ready' && (
        <Button className="h-14 w-full text-base" onClick={startTipOff}>
          Play Basketball
        </Button>
      )}

      {(phase === 'tipoff' || phase === 'play' || phase === 'win' || phase === 'lose' || phase === 'quiz') && (
        <>
          <BasketballStage
            players={players}
            controlledId={controlledId}
            ballHolderId={ballHolderId}
            jumpingId={jumpingId}
            tipOff={phase === 'tipoff'}
            netPulse={netPulse}
            boardFlash={boardFlash}
            shotFlight={shotFlight}
            meter={meter}
            homeScore={homeScore}
            awayScore={awayScore}
            secondsLeft={secondsLeft}
          />

          {phase === 'play' && (
            <>
              <div className="grid grid-cols-5 gap-2">
                {homePlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => passTo(p.number)}
                    className={cn(
                      'rounded-full border py-3 font-display text-xl transition',
                      p.id === controlledId
                        ? 'border-signal bg-signal text-white'
                        : p.id === ballHolderId
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-black/10 bg-transparent'
                    )}
                  >
                    {p.number}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button className="h-12" onClick={onSpace}>
                  {possession === 'home' ? (meterArmed ? 'Release' : 'Shoot') : 'Steal'}
                </Button>
                <Button
                  className="h-12"
                  variant="secondary"
                  disabled={possession !== 'home'}
                  onClick={() => passToMostOpen()}
                >
                  Pass open
                </Button>
                <Button
                  className="h-12"
                  variant="secondary"
                  disabled={possession !== 'away'}
                  onClick={() => tryBlock()}
                >
                  Block
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {phase === 'quiz' && (
        <div className="space-y-3 rounded-2xl border border-signal/30 bg-white p-4">
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
          <Button className="h-12 w-full" onClick={startTipOff}>
            Rematch
          </Button>
        </div>
      )}

      {phase === 'lose' && (
        <Button className="h-12 w-full" onClick={startTipOff}>
          Play again
        </Button>
      )}
    </div>
  )
}
