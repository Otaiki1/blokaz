import type { ShapeDefinition } from './shapes'

// ─── Score-tier system ───────────────────────────────────────────────────────

export interface TierInfo {
  id: number
  name: string
  range: string
  accent: string
  flavor: string
  mechanic: string | null
}

export const TIERS: TierInfo[] = [
  { id: 0, name: 'PAPER',   range: '0 – 500',          accent: '#ffd51f', flavor: 'Classic flat blocks',           mechanic: null },
  { id: 1, name: 'STICKER', range: '500 – 1,500',      accent: '#ff3bbd', flavor: 'Pink gloss sticker look',        mechanic: null },
  { id: 2, name: 'STRIPED', range: '1,500 – 4,000',    accent: '#ff7a1a', flavor: 'Diagonal stripe texture',        mechanic: null },
  { id: 3, name: 'PIXEL',   range: '4,000 – 9,000',    accent: '#b7ff3b', flavor: 'Retro pixel grid inset',         mechanic: null },
  { id: 4, name: 'NEON',    range: '9,000 – 20,000',   accent: '#29e6e6', flavor: 'Cyan glow bloom',                mechanic: null },
  { id: 5, name: 'COSMIC',  range: '20,000 – 45,000',  accent: '#8a3dff', flavor: 'Deep space — star-field board',  mechanic: null },
  { id: 6, name: 'LIQUID',  range: '45,000 – 100,000', accent: '#29e6e6', flavor: 'Chromatic wave sheen',           mechanic: null },
  { id: 7, name: 'GLITCH',  range: '100,000+',         accent: '#ff3bbd', flavor: 'RGB scan-line glitch',           mechanic: null },
]

export function getScoreTier(score: number): TierInfo {
  if (score < 500)    return TIERS[0]
  if (score < 1500)   return TIERS[1]
  if (score < 4000)   return TIERS[2]
  if (score < 9000)   return TIERS[3]
  if (score < 20000)  return TIERS[4]
  if (score < 45000)  return TIERS[5]
  if (score < 100000) return TIERS[6]
  return TIERS[7]
}

// ─── Score events ────────────────────────────────────────────────────────────

export interface ScoreEvent {
  basePoints: number // piece.cellCount
  linePoints: number // linesCleared * 90
  comboBonus: number // linesCleared * newCombo * 50
  totalPoints: number // sum of above
  linesCleared: number
  newComboStreak: number // updated streak value
}

export function calculateScore(
  piece: ShapeDefinition,
  linesCleared: number,
  currentComboStreak: number
): ScoreEvent {
  const basePoints = piece.cellCount
  const linePoints = linesCleared * 10 * 9 // 90 per line

  let newComboStreak = 0
  let comboBonus = 0

  if (linesCleared > 0) {
    newComboStreak = currentComboStreak + 1
    comboBonus = linesCleared * newComboStreak * 50
  } else {
    newComboStreak = 0
    comboBonus = 0
  }

  const totalPoints = basePoints + linePoints + comboBonus

  return {
    basePoints,
    linePoints,
    comboBonus,
    totalPoints,
    linesCleared,
    newComboStreak,
  }
}
