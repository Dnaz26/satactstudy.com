export type StudyMode = 'Tutoring' | 'Rapid Fire' | 'Game' | 'Practice Test'
export type StudyPath = 'Self study' | 'Tutor' | 'Prep SAT ACT'

export type ResearchUser = {
  id: number; name: string; test: 'SAT' | 'ACT'; path: StudyPath
  baselineScore: number; currentScore: number; averageGrowthRate: number
  averageStudyMinutes: number; projectedScoreChange: number; signupTime: string
  modes: Record<StudyMode, number>; dominantMode: StudyMode
}

const modes: StudyMode[] = ['Tutoring', 'Rapid Fire', 'Game', 'Practice Test']
const paths: StudyPath[] = ['Prep SAT ACT']
const seeded = (index: number, salt: number) => { const value = Math.sin(index * 91.73 + salt * 47.11) * 10000; return value - Math.floor(value) }
const rounded = (value: number, step: number) => Math.round(value / step) * step

export const researchUsers: ResearchUser[] = Array.from({ length: 243 }, (_, index) => {
  const id = index + 1
  const test = index % 4 === 0 ? 'ACT' as const : 'SAT' as const
  const path: StudyPath = 'Prep SAT ACT'
  const studyBoost = 1.1
  const averageStudyMinutes = Math.round(38 + seeded(id, 1) * 58)
  const baselineScore = test === 'SAT' ? rounded(1050 + seeded(id, 2) * 250, 10) : Math.round(23 + seeded(id, 2) * 6)
  const rawChange = test === 'SAT' ? (110 + seeded(id, 3) * 110) * studyBoost : (3.5 + seeded(id, 3) * 3) * studyBoost
  const projectedScoreChange = test === 'SAT' ? rounded(rawChange, 10) : Math.max(1, Math.round(rawChange))
  const currentScore = Math.min(test === 'SAT' ? 1600 : 36, baselineScore + projectedScoreChange)
  const averageGrowthRate = Number(((projectedScoreChange / baselineScore) * 100).toFixed(1))
  const rawModes = modes.map((_, modeIndex) => 12 + seeded(id, modeIndex + 8) * 38 + (modeIndex === index % 4 ? 20 : 0))
  const rawTotal = rawModes.reduce((sum, value) => sum + value, 0)
  const modeValues = rawModes.map((value) => Math.round((value / rawTotal) * 100))
  modeValues[0] += 100 - modeValues.reduce((sum, value) => sum + value, 0)
  const modeRecord = Object.fromEntries(modes.map((mode, modeIndex) => [mode, modeValues[modeIndex]])) as Record<StudyMode, number>
  const dominantMode = modes.reduce((best, mode) => modeRecord[mode] > modeRecord[best] ? mode : best, modes[0])
  const signupDate = new Date(Date.UTC(2025, 0, 4 + (index * 5) % 580, 8 + index % 11, (index * 7) % 60))
  return { id, name: `User ${id}`, test, path, baselineScore, currentScore, averageGrowthRate, averageStudyMinutes, projectedScoreChange, signupTime: signupDate.toISOString(), modes: modeRecord, dominantMode }
})

export const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
export function median(values: number[]) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 }
export function quartiles(values: number[]) { const sorted = [...values].sort((a, b) => a - b); const q2 = median(sorted); const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2))); const q3 = median(sorted.slice(Math.ceil(sorted.length / 2))); return { q1, q2, q3, iqr: q3 - q1 } }
export const satEquivalent = (user: ResearchUser, score = user.currentScore) => user.test === 'SAT' ? score : Math.round((score / 36) * 1600)
export const studyModes = modes
export const studyPaths = paths
