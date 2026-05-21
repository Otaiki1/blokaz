import { describe, it, expect } from 'vitest'
import { calculateScore } from '../scoring'
import { SHAPE_MAP } from '../shapes'

describe('Scoring System', () => {
  it('should calculate basic points with no lines cleared', () => {
    const shape = SHAPE_MAP['L3A'] // 5 cells
    const result = calculateScore(shape, 0, 5)

    expect(result.basePoints).toBe(25)  // 5^2
    expect(result.linePoints).toBe(0)
    expect(result.comboBonus).toBe(0)
    expect(result.totalPoints).toBe(25)
    expect(result.newComboStreak).toBe(0)
    expect(result.comboMultiplier).toBe(1.0)
    expect(result.isMilestone).toBe(false)
  })

  it('should calculate points for 1 line clear and first combo', () => {
    const shape = SHAPE_MAP['I4H'] // 4 cells
    const result = calculateScore(shape, 1, 0)

    // BASE = 4^2 = 16, LINE = 1 * 100 * 1.0 = 100, RAW = 116
    // streak=1 → ×1.25, TOTAL = round(116 * 1.25) = 145
    expect(result.basePoints).toBe(16)
    expect(result.linePoints).toBe(100)
    expect(result.totalPoints).toBe(145)
    expect(result.newComboStreak).toBe(1)
    expect(result.comboMultiplier).toBe(1.25)
    expect(result.isMilestone).toBe(false)
  })

  it('should calculate points for 2 lines and existing combo reaching milestone', () => {
    const shape = SHAPE_MAP['L2A'] // 3 cells
    const result = calculateScore(shape, 2, 2)

    // BASE = 3^2 = 9, LINE = 2 * 100 * 1.5 = 300, RAW = 309
    // streak=3 → ×2.0, milestone +300, TOTAL = round(309 * 2.0) + 300 = 918
    expect(result.basePoints).toBe(9)
    expect(result.linePoints).toBe(300)
    expect(result.totalPoints).toBe(918)
    expect(result.newComboStreak).toBe(3)
    expect(result.comboMultiplier).toBe(2.0)
    expect(result.isMilestone).toBe(true)
    expect(result.multiLineFactor).toBe(1.5)
  })

  it('should reset combo on no clear', () => {
    const shape = SHAPE_MAP['S1'] // 1 cell
    const result = calculateScore(shape, 0, 10)

    expect(result.basePoints).toBe(1)   // 1^2
    expect(result.totalPoints).toBe(1)
    expect(result.newComboStreak).toBe(0)
    expect(result.comboMultiplier).toBe(1.0)
  })

  it('should apply multi-line factor correctly', () => {
    const shape = SHAPE_MAP['L3A'] // 5 cells
    const result3 = calculateScore(shape, 3, 0)
    // LINE = 3 * 100 * 2.5 = 750, BASE = 25, RAW = 775
    // streak=1 → ×1.25, TOTAL = round(775 * 1.25) = 969
    expect(result3.multiLineFactor).toBe(2.5)
    expect(result3.linePoints).toBe(750)
    expect(result3.totalPoints).toBe(969)
  })
})
