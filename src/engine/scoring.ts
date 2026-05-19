import type { ShapeDefinition } from './shapes'

export interface ScoreEvent {
  basePoints: number
  linePoints: number
  comboBonus: number      // extra points from multiplier + milestone
  totalPoints: number
  linesCleared: number
  newComboStreak: number
  comboMultiplier: number // 1.0 | 1.25 | 1.5 | 2.0 | 2.5 | 3.0 | 4.0
  isMilestone: boolean    // true at streak 3, 5, 10
  multiLineFactor: number // 1.0 | 1.5 | 2.5
}

const MILESTONE_BONUS: Record<number, number> = { 3: 300, 5: 750, 10: 2000 }

export function getComboMultiplier(streak: number): number {
  if (streak >= 10) return 4.0
  if (streak >= 7) return 3.0
  if (streak >= 5) return 2.5
  if (streak >= 3) return 2.0
  if (streak >= 2) return 1.5
  if (streak >= 1) return 1.25
  return 1.0
}

export function getComboTierInfo(streak: number): { pct: number; label: string; multiplier: number } {
  const multiplier = getComboMultiplier(streak)
  if (streak === 0) return { pct: 15, label: '', multiplier: 1.0 }
  if (streak >= 10) return { pct: 100, label: 'LEGENDARY', multiplier }
  if (streak >= 7) return { pct: 82 + (streak - 7) * 6, label: 'UNSTOPPABLE', multiplier }
  if (streak >= 5) return { pct: 65 + (streak - 5) * 8, label: 'ON FIRE', multiplier }
  if (streak >= 3) return { pct: 50 + (streak - 3) * 7, label: 'ON FIRE', multiplier }
  if (streak >= 2) return { pct: 40, label: 'COMBO', multiplier }
  return { pct: 25, label: 'COMBO', multiplier }
}

export function calculateScore(
  piece: ShapeDefinition,
  linesCleared: number,
  currentComboStreak: number
): ScoreEvent {
  const basePoints = piece.cellCount * piece.cellCount  // quadratic: rewards larger pieces

  const multiLineFactor = linesCleared >= 3 ? 2.5 : linesCleared === 2 ? 1.5 : 1.0
  const linePoints = Math.round(linesCleared * 100 * multiLineFactor)

  let newComboStreak = 0
  let comboMultiplier = 1.0
  let isMilestone = false
  let milestoneBonus = 0

  if (linesCleared > 0) {
    newComboStreak = currentComboStreak + 1
    comboMultiplier = getComboMultiplier(newComboStreak)
    isMilestone = newComboStreak in MILESTONE_BONUS
    milestoneBonus = MILESTONE_BONUS[newComboStreak] ?? 0
  }

  const rawPoints = basePoints + linePoints
  const totalPoints = Math.round(rawPoints * comboMultiplier) + milestoneBonus
  const comboBonus = totalPoints - rawPoints

  return {
    basePoints,
    linePoints,
    comboBonus,
    totalPoints,
    linesCleared,
    newComboStreak,
    comboMultiplier,
    isMilestone,
    multiLineFactor,
  }
}
