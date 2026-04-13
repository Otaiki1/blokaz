import { describe, it, expect } from 'vitest'
import { calculateScore } from '../scoring'
import { SHAPE_MAP } from '../shapes'

describe('Scoring System', () => {
  it('should calculate basic points with no lines cleared', () => {
    const shape = SHAPE_MAP['L3A'] // 5 cells
    const result = calculateScore(shape, 0, 5)
    
    expect(result.basePoints).toBe(5)
    expect(result.linePoints).toBe(0)
    expect(result.comboBonus).toBe(0)
    expect(result.totalPoints).toBe(5)
    expect(result.newComboStreak).toBe(0)
  })

  it('should calculate points for 1 line clear and first combo', () => {
    const shape = SHAPE_MAP['I4H'] // 4 cells
    const result = calculateScore(shape, 1, 0)
    
    // BASE = 4
    // LINE = 1 * 90 = 90
    // COMBO = 1 * (0+1) * 50 = 50
    // TOTAL = 144
    expect(result.totalPoints).toBe(144)
    expect(result.newComboStreak).toBe(1)
  })

  it('should calculate points for 2 lines and existing combo', () => {
    const shape = SHAPE_MAP['L2A'] // 3 cells
    const result = calculateScore(shape, 2, 2)
    
    // BASE = 3
    // LINE = 2 * 90 = 180
    // COMBO = 2 * (2+1) * 50 = 300
    // TOTAL = 483
    expect(result.totalPoints).toBe(483)
    expect(result.newComboStreak).toBe(3)
  })

  it('should reset combo on no clear', () => {
    const shape = SHAPE_MAP['S1'] // 1 cell
    const result = calculateScore(shape, 0, 10)
    
    expect(result.totalPoints).toBe(1)
    expect(result.newComboStreak).toBe(0)
  })
})
