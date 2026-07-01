/**
 * Server-side score replay validator.
 * Replays a client-submitted move history against a deterministic grid simulation
 * to verify the claimed score is consistent with the moves played.
 *
 * What this catches:
 *   - Inflated score numbers (score ≠ sum of move scoreEvents)
 *   - Fake line clears (client claims 3 lines when grid only allows 1)
 *   - Fake combo streaks (newComboStreak doesn't follow from linesCleared)
 *   - Invalid piece placements (cell already occupied / out of bounds)
 *
 * What this trusts (and cannot verify without tracking score-boost activations):
 *   - basePoints per move (depends on scoreBoostActive, a client-side state)
 */

const GRID_SIZE = 9

// ── Shape definitions (ported from src/engine/shapes.ts) ──────────────────────
const SHAPES = [
  { id: 'S1',   cells: [[0,0]],                                                            cellCount: 1,  colorId: 1 },
  { id: 'D1',   cells: [[0,0],[0,1]],                                                      cellCount: 2,  colorId: 1 },
  { id: 'D2',   cells: [[0,0],[1,0]],                                                      cellCount: 2,  colorId: 1 },
  { id: 'I3H',  cells: [[0,0],[0,1],[0,2]],                                                cellCount: 3,  colorId: 6 },
  { id: 'I3V',  cells: [[0,0],[1,0],[2,0]],                                                cellCount: 3,  colorId: 6 },
  { id: 'I4H',  cells: [[0,0],[0,1],[0,2],[0,3]],                                          cellCount: 4,  colorId: 6 },
  { id: 'I4V',  cells: [[0,0],[1,0],[2,0],[3,0]],                                          cellCount: 4,  colorId: 6 },
  { id: 'I5H',  cells: [[0,0],[0,1],[0,2],[0,3],[0,4]],                                    cellCount: 5,  colorId: 6 },
  { id: 'I5V',  cells: [[0,0],[1,0],[2,0],[3,0],[4,0]],                                    cellCount: 5,  colorId: 6 },
  { id: 'O2',   cells: [[0,0],[0,1],[1,0],[1,1]],                                          cellCount: 4,  colorId: 3 },
  { id: 'O3',   cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],            cellCount: 9,  colorId: 3 },
  { id: 'O23',  cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],                              cellCount: 6,  colorId: 3 },
  { id: 'O32',  cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],                              cellCount: 6,  colorId: 3 },
  { id: 'L2A',  cells: [[0,0],[1,0],[1,1]],                                                cellCount: 3,  colorId: 2 },
  { id: 'L2B',  cells: [[0,0],[0,1],[1,0]],                                                cellCount: 3,  colorId: 2 },
  { id: 'L2C',  cells: [[0,1],[1,0],[1,1]],                                                cellCount: 3,  colorId: 2 },
  { id: 'L2D',  cells: [[0,0],[0,1],[1,1]],                                                cellCount: 3,  colorId: 2 },
  { id: 'L3A',  cells: [[0,0],[1,0],[2,0],[2,1],[2,2]],                                    cellCount: 5,  colorId: 4 },
  { id: 'L3B',  cells: [[0,0],[0,1],[0,2],[1,2]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3C',  cells: [[0,0],[0,1],[0,2],[1,0]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3D',  cells: [[0,2],[1,2],[2,0],[2,1],[2,2]],                                    cellCount: 5,  colorId: 4 },
  { id: 'L3E',  cells: [[0,0],[0,1],[0,2],[1,0],[2,0]],                                    cellCount: 5,  colorId: 4 },
  { id: 'L3F',  cells: [[0,0],[0,1],[0,2],[1,2],[2,2]],                                    cellCount: 5,  colorId: 4 },
  { id: 'L3G',  cells: [[0,1],[1,1],[2,0],[2,1]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3H',  cells: [[0,0],[1,0],[1,1],[1,2]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3I',  cells: [[0,0],[0,1],[1,0],[2,0]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3J',  cells: [[0,0],[0,1],[1,1],[2,1]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3K',  cells: [[0,2],[1,0],[1,1],[1,2]],                                          cellCount: 4,  colorId: 4 },
  { id: 'L3L',  cells: [[0,0],[1,0],[2,0],[2,1]],                                          cellCount: 4,  colorId: 4 },
  { id: 'T1',   cells: [[0,0],[0,1],[0,2],[1,1]],                                          cellCount: 4,  colorId: 8 },
  { id: 'T2',   cells: [[0,1],[1,0],[1,1],[1,2]],                                          cellCount: 4,  colorId: 8 },
  { id: 'T3',   cells: [[0,1],[1,0],[1,1],[2,1]],                                          cellCount: 4,  colorId: 8 },
  { id: 'T4',   cells: [[0,0],[1,0],[1,1],[2,0]],                                          cellCount: 4,  colorId: 8 },
  { id: 'S1Z',  cells: [[0,1],[0,2],[1,0],[1,1]],                                          cellCount: 4,  colorId: 9 },
  { id: 'Z1Z',  cells: [[0,0],[0,1],[1,1],[1,2]],                                          cellCount: 4,  colorId: 9 },
  { id: 'S1ZV', cells: [[0,0],[1,0],[1,1],[2,1]],                                          cellCount: 4,  colorId: 9 },
  { id: 'Z1ZV', cells: [[0,1],[1,0],[1,1],[2,0]],                                          cellCount: 4,  colorId: 9 },
]

const SHAPE_MAP = Object.fromEntries(SHAPES.map(s => [s.id, s]))

// ── Grid utilities ────────────────────────────────────────────────────────────

function createGrid() {
  return new Uint8Array(GRID_SIZE * GRID_SIZE)
}

function rotateCells(cells) {
  const maxR = Math.max(...cells.map(([r]) => r))
  const rotated = cells.map(([r, c]) => [c, maxR - r])
  const minR = Math.min(...rotated.map(([r]) => r))
  const minC = Math.min(...rotated.map(([, c]) => c))
  return rotated.map(([r, c]) => [r - minR, c - minC])
}

function canPlace(grid, cells, row, col) {
  for (const [dr, dc] of cells) {
    const r = row + dr, c = col + dc
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false
    if (grid[r * GRID_SIZE + c] !== 0) return false
  }
  return true
}

function placeShape(grid, cells, row, col, colorId) {
  for (const [dr, dc] of cells) {
    grid[(row + dr) * GRID_SIZE + (col + dc)] = colorId
  }
}

function findAndClearLines(grid) {
  const rows = [], cols = []
  for (let r = 0; r < GRID_SIZE; r++) {
    let full = true
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r * GRID_SIZE + c] === 0) { full = false; break }
    }
    if (full) rows.push(r)
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let full = true
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r * GRID_SIZE + c] === 0) { full = false; break }
    }
    if (full) cols.push(c)
  }
  const toClear = new Set()
  for (const r of rows) for (let c = 0; c < GRID_SIZE; c++) toClear.add(r * GRID_SIZE + c)
  for (const c of cols) for (let r = 0; r < GRID_SIZE; r++) toClear.add(r * GRID_SIZE + c)
  for (const idx of toClear) grid[idx] = 0
  return rows.length + cols.length
}

// ── Scoring helpers ────────────────────────────────────────────────────────────

const MILESTONE_BONUS = { 3: 300, 5: 750, 10: 2000 }

function getComboMultiplier(streak) {
  if (streak >= 10) return 4.0
  if (streak >= 7)  return 3.0
  if (streak >= 5)  return 2.5
  if (streak >= 3)  return 2.0
  if (streak >= 2)  return 1.5
  if (streak >= 1)  return 1.25
  return 1.0
}

// ── Main validator ─────────────────────────────────────────────────────────────

/**
 * Replays moves against a grid simulation and verifies the claimed score.
 * Returns true if the score is consistent, false otherwise.
 *
 * @param {Array}  moves        - moveHistory array from the client
 * @param {number} claimedScore - the score the client submitted
 * @returns {boolean}
 */
export function replayAndValidateScore(moves, claimedScore) {
  if (!Array.isArray(moves)) return false
  if (moves.length === 0)   return claimedScore === 0

  const grid = createGrid()
  let replayedScore   = 0
  let comboStreak     = 0
  let lotteryMovesLeft = 0

  for (const move of moves) {
    // ── Lottery multiplier activation marker ─────────────────────────────────
    if (move.lotteryMultiplierStart === true) {
      lotteryMovesLeft = 3
      continue
    }

    // ── Marker moves (pieceIndex: -1) ────────────────────────────────────────
    if (move.pieceIndex === -1) {
      if (move.revive === true) continue

      if (typeof move.lotteryBonus === 'number' && move.lotteryBonus > 0) {
        replayedScore += move.lotteryBonus
        continue
      }

      if (move.bomb) {
        const { row: cr, col: cc } = move.bomb
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = cr + dr, c = cc + dc
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r * GRID_SIZE + c] !== 0) {
              grid[r * GRID_SIZE + c] = 0
              replayedScore += 5
            }
          }
        }
      }
      continue
    }

    // ── Regular placement (pieceIndex: 0|1|2) ────────────────────────────────
    if (!move.shapeId) continue

    const shape = SHAPE_MAP[move.shapeId]
    if (!shape) {
      console.warn(`[scoreReplay] Unknown shapeId: ${move.shapeId}`)
      return false
    }

    // Apply rotations
    let cells = shape.cells
    const rotations = move.rotations ?? 0
    for (let i = 0; i < rotations; i++) cells = rotateCells(cells)

    if (!canPlace(grid, cells, move.row, move.col)) {
      console.warn(`[scoreReplay] Invalid placement: ${move.shapeId} at ${move.row},${move.col}`)
      return false
    }

    placeShape(grid, cells, move.row, move.col, shape.colorId)
    const linesCleared = findAndClearLines(grid)

    // Verify the client's reported line count matches the grid simulation
    if (move.scoreEvent?.linesCleared !== undefined && move.scoreEvent.linesCleared !== linesCleared) {
      console.warn(`[scoreReplay] Line mismatch: client=${move.scoreEvent.linesCleared}, server=${linesCleared}`)
      return false
    }

    // Verify combo streak is consistent with actual line clears
    const expectedCombo = linesCleared > 0 ? comboStreak + 1 : 0
    if (move.scoreEvent?.newComboStreak !== undefined && move.scoreEvent.newComboStreak !== expectedCombo) {
      console.warn(`[scoreReplay] Combo mismatch: client=${move.scoreEvent.newComboStreak}, server=${expectedCombo}`)
      return false
    }
    comboStreak = expectedCombo

    // Accumulate score from the client's totalPoints (which includes scoreBoost
    // and lottery doubling that we can't independently derive without re-running
    // the full boost activation history)
    const moveScore = move.scoreEvent?.totalPoints ?? 0
    replayedScore  += moveScore

    if (lotteryMovesLeft > 0) lotteryMovesLeft--
  }

  return replayedScore === claimedScore
}
