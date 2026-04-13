import { describe, it, expect } from 'vitest'
import { Grid } from '../grid'
import { SHAPE_MAP } from '../shapes'

describe('Grid Model', () => {
  it('should create an empty 9x9 grid', () => {
    const grid = Grid.createGrid()
    expect(grid.length).toBe(81)
    expect(grid.every((cell) => cell === 0)).toBe(true)
  })

  it('should correctly set and get cells', () => {
    const grid = Grid.createGrid()
    Grid.setCell(grid, 2, 3, 5)
    expect(Grid.getCell(grid, 2, 3)).toBe(5)
    expect(Grid.getCell(grid, 0, 0)).toBe(0)
  })

  it('should validate shape placement', () => {
    const grid = Grid.createGrid()
    const shape = SHAPE_MAP['O2'] // 2x2 square

    // Valid placement
    expect(Grid.canPlace(grid, shape, 0, 0)).toBe(true)

    // Out of bounds
    expect(Grid.canPlace(grid, shape, 8, 8)).toBe(false)
    expect(Grid.canPlace(grid, shape, -1, 0)).toBe(false)

    // Overlapping
    Grid.setCell(grid, 1, 1, 1)
    expect(Grid.canPlace(grid, shape, 0, 0)).toBe(false)
  })

  it('should place a shape and verify cells are filled', () => {
    const grid = Grid.createGrid()
    const shape = SHAPE_MAP['D1'] // 2x1 horizontal domino
    Grid.placeShape(grid, shape, 0, 0, 3)

    expect(Grid.getCell(grid, 0, 0)).toBe(3)
    expect(Grid.getCell(grid, 0, 1)).toBe(3)
    expect(Grid.getCell(grid, 0, 2)).toBe(0)
  })

  it('should detect full rows and columns', () => {
    const grid = Grid.createGrid()

    // Fill row 2
    for (let c = 0; c < 9; c++) Grid.setCell(grid, 2, c, 1)

    // Fill column 5
    for (let r = 0; r < 9; r++) Grid.setCell(grid, r, 5, 1)

    const full = Grid.findFullLines(grid)
    expect(full.rows).toEqual([2])
    expect(full.cols).toEqual([5])
  })

  it('should clear lines and count unique cells cleared', () => {
    const grid = Grid.createGrid()

    // Fill row 2 and col 2 (intersect at 2,2)
    for (let i = 0; i < 9; i++) {
      Grid.setCell(grid, 2, i, 1)
      Grid.setCell(grid, i, 2, 1)
    }

    // Row 2 = 9 cells, Col 2 = 9 cells. Intersection = 1 cell.
    // Total cells to clear = 9 + 9 - 1 = 17.
    const result = Grid.clearLines(grid, [2], [2])
    expect(result.cellsCleared).toBe(17)
    expect(Grid.getCell(grid, 2, 2)).toBe(0)
    expect(grid.every((c) => c === 0)).toBe(true)
  })

  it('should detect if any shape can be placed', () => {
    const grid = Grid.createGrid()
    const shapes = [SHAPE_MAP['S1'], SHAPE_MAP['O3']]

    expect(Grid.canPlaceAny(grid, shapes)).toBe(true)

    // Fill the grid completely
    grid.fill(1)
    expect(Grid.canPlaceAny(grid, shapes)).toBe(false)

    // Leave exactly one spot for S1
    Grid.setCell(grid, 4, 4, 0)
    expect(Grid.canPlaceAny(grid, shapes)).toBe(true)
    expect(Grid.canPlaceAny(grid, [SHAPE_MAP['O3']])).toBe(false)
  })

  it('should produce consistent hashes', () => {
    const grid1 = Grid.createGrid()
    const grid2 = Grid.createGrid()
    expect(Grid.gridHash(grid1)).toBe(Grid.gridHash(grid2))

    Grid.setCell(grid1, 0, 0, 1)
    expect(Grid.gridHash(grid1)).not.toBe(Grid.gridHash(grid2))
  })
})
