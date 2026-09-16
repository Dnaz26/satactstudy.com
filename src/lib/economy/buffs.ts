import { STORE_ITEMS, type StoreItem } from '@/lib/economy/catalog'
import type { GameId } from '@/lib/game/modes'

export type GameBuffs = {
  damage: number
  accuracy: number
  defense: number
  scoreChance: number
  labels: string[]
}

export function emptyBuffs(): GameBuffs {
  return { damage: 0, accuracy: 0, defense: 0, scoreChance: 0, labels: [] }
}

export function buffsForGame(ownedIds: string[], gameId: GameId): GameBuffs {
  const buffs = emptyBuffs()
  for (const id of ownedIds) {
    const item = STORE_ITEMS.find((s) => s.id === id)
    if (!item) continue
    if (!item.appliesTo.includes(gameId) && !item.appliesTo.includes('edu')) continue
    if (!item.appliesTo.includes(gameId)) continue
    applyItem(buffs, item)
  }
  return buffs
}

function applyItem(buffs: GameBuffs, item: StoreItem) {
  buffs.labels.push(item.name)
  switch (item.effect.kind) {
    case 'damage':
      buffs.damage += item.effect.value
      break
    case 'accuracy':
      buffs.accuracy += item.effect.value
      break
    case 'defense':
      buffs.defense += item.effect.value
      break
    case 'score_chance':
      buffs.scoreChance += item.effect.value
      break
    default:
      break
  }
}
