export type AppMode =
  | 'idle'
  | 'in_progress'
  | 'success'
  | 'warning'
  | 'stuck'
  | 'recovery'

export const MODE_STYLES: Record<
  AppMode,
  {
    label: string
    signal: string
    signalRgb: string
    face: string
    button: string
    iconBg: string
    ring: string
  }
> = {
  idle: {
    label: 'READY',
    signal: '#7B8FAD',
    signalRgb: '123, 143, 173',
    face: 'idle',
    button: 'neu-sm text-paper',
    iconBg: 'neu-sm text-steel',
    ring: 'ring-steel/40',
  },
  in_progress: {
    label: 'LIVE',
    signal: '#FF6B57',
    signalRgb: '255, 107, 87',
    face: 'focus',
    button: 'neu-raised text-white hover:bg-signal-hot',
    iconBg: 'neu-sm text-signal',
    ring: 'ring-signal/50',
  },
  success: {
    label: 'ON',
    signal: '#22A06B',
    signalRgb: '34, 160, 107',
    face: 'grin',
    button: 'bg-ok text-white neu-sm hover:brightness-110',
    iconBg: 'neu-sm text-ok',
    ring: 'ring-ok/50',
  },
  warning: {
    label: 'DRIFT',
    signal: '#E08A12',
    signalRgb: '224, 138, 18',
    face: 'alert',
    button: 'bg-warn text-white neu-sm hover:brightness-110',
    iconBg: 'neu-sm text-warn',
    ring: 'ring-warn/50',
  },
  stuck: {
    label: 'STUCK',
    signal: '#E24B62',
    signalRgb: '226, 75, 98',
    face: 'tense',
    button: 'bg-bad text-white neu-sm hover:brightness-110',
    iconBg: 'neu-sm text-bad',
    ring: 'ring-bad/50',
  },
  recovery: {
    label: 'RESET',
    signal: '#2B9ED9',
    signalRgb: '43, 158, 217',
    face: 'calm',
    button: 'bg-ice text-white neu-sm hover:brightness-110',
    iconBg: 'neu-sm text-ice',
    ring: 'ring-ice/50',
  },
}

export function modeFromMastery(mastery: number | null, attempts: number): AppMode {
  if (!attempts) return 'idle'
  if (attempts < 8) return 'recovery'
  if ((mastery ?? 50) >= 75) return 'success'
  if ((mastery ?? 50) >= 45) return 'in_progress'
  if ((mastery ?? 50) >= 30) return 'warning'
  return 'stuck'
}
