import { Grid } from '../engine/grid'
import type { TierInfo } from '../engine/scoring'

export const COLOR_PALETTE = {
  0: 'transparent',
  1: '#FF3D3D',
  2: '#FF7A1A',
  3: '#FFD51F',
  4: '#B7FF3B',
  5: '#2CE66A',
  6: '#29E6E6',
  7: '#2F6BFF',
  8: '#8A3DFF',
  9: '#FF3BBD',
}

export const TOURNAMENT_PALETTE = {
  0: 'transparent',
  1: COLOR_PALETTE[9], // hot pink  — singles
  2: COLOR_PALETTE[2], // orange    — L-shapes
  3: COLOR_PALETTE[3], // yellow    — squares
  4: COLOR_PALETTE[4], // lime      — bigL
  5: COLOR_PALETTE[5], // green     — (unused, safety net)
  6: COLOR_PALETTE[6], // cyan      — lines
  7: COLOR_PALETTE[7], // blue      — (unused, safety net)
  8: COLOR_PALETTE[8], // purple    — T/other
  9: COLOR_PALETTE[1], // red       — zigzag
}

const getThemeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export class GridRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private gridSize: number
  private cellSize: number
  private tierId: number = 0
  private tierAccent: string = '#ffd51f'
  private time: number = 0

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.gridSize = gridSize
    this.cellSize = gridSize / 9
  }

  setTier(tier: TierInfo): void {
    this.tierId = tier.id
    this.tierAccent = tier.accent
  }

  setTime(t: number): void {
    this.time = t
  }

  getCellSizeInScreen(): number {
    const rect = this.canvas.getBoundingClientRect()
    return rect.width / 9
  }

  draw(
    grid: Uint8Array,
    ghostCells?: { row: number; col: number; valid: boolean }[],
    isTournament: boolean = false
  ): void {
    this.ctx.clearRect(0, 0, this.gridSize, this.gridSize)

    const css = getComputedStyle(document.documentElement)
    const bg = css.getPropertyValue('--board').trim()
    const empty = css.getPropertyValue('--empty-cell').trim()
    const ink = css.getPropertyValue('--ink').trim()
    const rule = css.getPropertyValue('--rule').trim()

    // Board background
    this.ctx.fillStyle = bg
    this.ctx.fillRect(0, 0, this.gridSize, this.gridSize)

    // Board border
    this.ctx.strokeStyle = ink
    this.ctx.lineWidth = 6
    this.ctx.strokeRect(0, 0, this.gridSize, this.gridSize)

    const palette = isTournament ? TOURNAMENT_PALETTE : COLOR_PALETTE
    this.drawBoardBackground(this.tierId)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = Grid.getCell(grid, r, c)
        if (val === 0) {
          this.drawEmptyCell(r, c, empty)
        } else {
          this.drawCellForTier(
            r,
            c,
            palette[val as keyof typeof palette],
            ink,
            this.tierId
          )
        }
      }
    }

    // Gridlines
    this.ctx.strokeStyle = rule
    this.ctx.lineWidth = 1
    for (let i = 1; i < 9; i++) {
      const pos = i * this.cellSize
      this.ctx.beginPath()
      this.ctx.moveTo(pos, 3)
      this.ctx.lineTo(pos, this.gridSize - 3)
      this.ctx.stroke()
      this.ctx.beginPath()
      this.ctx.moveTo(3, pos)
      this.ctx.lineTo(this.gridSize - 3, pos)
      this.ctx.stroke()
    }

    // Row/column completion hint — highlight lines that would clear on placement
    if (ghostCells && ghostCells.length > 0 && ghostCells[0].valid) {
      const ghostSet = new Set(ghostCells.map((g) => `${g.row},${g.col}`))
      this.ctx.fillStyle = 'rgba(180, 255, 80, 0.15)'
      for (let r = 0; r < 9; r++) {
        let willComplete = true
        for (let c = 0; c < 9; c++) {
          if (Grid.getCell(grid, r, c) === 0 && !ghostSet.has(`${r},${c}`)) {
            willComplete = false
            break
          }
        }
        if (willComplete) {
          this.ctx.fillRect(3, r * this.cellSize + 3, this.gridSize - 6, this.cellSize - 6)
        }
      }
      for (let c = 0; c < 9; c++) {
        let willComplete = true
        for (let r = 0; r < 9; r++) {
          if (Grid.getCell(grid, r, c) === 0 && !ghostSet.has(`${r},${c}`)) {
            willComplete = false
            break
          }
        }
        if (willComplete) {
          this.ctx.fillRect(c * this.cellSize + 3, 3, this.cellSize - 6, this.gridSize - 6)
        }
      }
    }

    // Ghost preview
    if (ghostCells) {
      for (const ghost of ghostCells) {
        this.drawGhostCell(ghost.row, ghost.col, ghost.valid)
      }
    }
  }

  private drawEmptyCell(row: number, col: number, fill: string): void {
    const pad = 1.8
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.fillStyle = fill
    this.ctx.fillRect(x, y, size, size)
  }

  private drawGhostCell(row: number, col: number, valid: boolean): void {
    const pad = 1
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    if (valid) {
      // Use tier accent for ghost preview
      const acc = this.tierAccent
      const r2 = parseInt(acc.slice(1, 3), 16)
      const g2 = parseInt(acc.slice(3, 5), 16)
      const b2 = parseInt(acc.slice(5, 7), 16)
      this.ctx.fillStyle = `rgba(${r2},${g2},${b2},0.38)`
      this.ctx.fillRect(x, y, size, size)
      this.ctx.strokeStyle = `rgba(${r2},${g2},${b2},0.9)`
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([])
      this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
    } else {
      this.ctx.fillStyle = 'rgba(255, 55, 55, 0.32)'
      this.ctx.fillRect(x, y, size, size)
      this.ctx.strokeStyle = 'rgba(220, 30, 30, 0.75)'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([4, 3])
      this.ctx.strokeRect(x, y, size, size)
      this.ctx.setLineDash([])
    }
  }

  // ── Tier dispatcher ────────────────────────────────────────────────────────
  private drawCellForTier(row: number, col: number, color: string, ink: string, tier: number): void {
    switch (tier) {
      case 1: this.drawCellSticker(row, col, color); break
      case 2: this.drawCellStriped(row, col, color); break
      case 3: this.drawCellPixel(row, col, color); break
      case 4: this.drawCellNeon(row, col, color); break
      case 5: this.drawCellCosmic(row, col, color); break
      case 6: this.drawCellLiquid(row, col, color); break
      case 7: this.drawCellGlitch(row, col, color); break
      default: this.drawCell(row, col, color, ink); break
    }
  }

  // ── T0 PAPER — flat neo-brutalist (default) ─────────────────────────────
  private drawCell(row: number, col: number, color: string, _ink: string): void {
    const pad = 1.8
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.beginPath()
    this.ctx.rect(x, y, size, size)
    this.ctx.fillStyle = color
    this.ctx.fill()
    this.ctx.strokeStyle = 'rgba(0,0,0,0.45)'
    this.ctx.lineWidth = 2.5
    this.ctx.stroke()
    this.ctx.fillStyle = 'rgba(255,255,255,0.18)'
    this.ctx.fillRect(x + 1, y + 1, size - 2, Math.floor(size * 0.26))
    const shadowH = Math.floor(size * 0.26)
    this.ctx.fillStyle = 'rgba(0,0,0,0.14)'
    this.ctx.fillRect(x + 1, y + size - shadowH - 1, size - 2, shadowH)
  }

  // ── T1 STICKER — gloss label with rounded inset ─────────────────────────
  private drawCellSticker(row: number, col: number, color: string): void {
    const pad = 1.5
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, size, size)
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)

    // Gloss band — top 35%
    const grd = this.ctx.createLinearGradient(x, y, x, y + size * 0.4)
    grd.addColorStop(0, 'rgba(255,255,255,0.52)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    this.ctx.fillStyle = grd
    this.ctx.fillRect(x + 2, y + 2, size - 4, size * 0.38)

    // Pink corner dot
    this.ctx.fillStyle = '#ff3bbd'
    this.ctx.fillRect(x + size - 6, y + 2, 4, 4)
  }

  // ── T2 STRIPED — diagonal candy stripe ──────────────────────────────────
  private drawCellStriped(row: number, col: number, color: string): void {
    const pad = 1.8
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, size, size)
    this.ctx.clip()

    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, size, size)

    // Diagonal stripes
    this.ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    this.ctx.lineWidth = 3
    const step = 8
    for (let i = -size; i < size * 2; i += step) {
      this.ctx.beginPath()
      this.ctx.moveTo(x + i, y)
      this.ctx.lineTo(x + i + size, y + size)
      this.ctx.stroke()
    }

    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)
  }

  // ── T3 PIXEL — retro 4-pixel inset grid ─────────────────────────────────
  private drawCellPixel(row: number, col: number, color: string): void {
    const pad = 1.5
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    const h = Math.floor(size / 2)
    const positions = [[0,0],[1,0],[0,1],[1,1]]
    const shades = [
      'rgba(255,255,255,0.18)',
      'rgba(0,0,0,0.12)',
      'rgba(0,0,0,0.12)',
      'rgba(255,255,255,0.08)',
    ]

    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, size, size)

    for (let i = 0; i < 4; i++) {
      const [dc, dr] = positions[i]
      this.ctx.fillStyle = shades[i]
      this.ctx.fillRect(x + dc * h, y + dr * h, h, h)
    }

    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    this.ctx.lineWidth = 1.5
    this.ctx.strokeRect(x, y, size, size)
    // inner cross
    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(x + h, y); this.ctx.lineTo(x + h, y + size)
    this.ctx.moveTo(x, y + h); this.ctx.lineTo(x + size, y + h)
    this.ctx.stroke()
  }

  // ── T4 NEON — cyan glow bloom ────────────────────────────────────────────
  private drawCellNeon(row: number, col: number, color: string): void {
    const pad = 2
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.save()
    this.ctx.shadowColor = this.tierAccent
    this.ctx.shadowBlur = 10
    this.ctx.fillStyle = 'rgba(0,0,0,0.85)'
    this.ctx.fillRect(x, y, size, size)
    this.ctx.restore()

    // Neon stroke
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2.5
    this.ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)

    // Inner fill — dim version
    this.ctx.fillStyle = color.replace(')', ',0.15)').replace('rgb', 'rgba')
    this.ctx.fillRect(x + 3, y + 3, size - 6, size - 6)

    // Bright center dot
    this.ctx.save()
    this.ctx.shadowColor = color
    this.ctx.shadowBlur = 8
    this.ctx.fillStyle = 'rgba(255,255,255,0.7)'
    const ds = Math.max(2, size * 0.18)
    this.ctx.fillRect(x + size / 2 - ds / 2, y + size / 2 - ds / 2, ds, ds)
    this.ctx.restore()
  }

  // ── T5 COSMIC — deep color with star specks ──────────────────────────────
  private drawCellCosmic(row: number, col: number, color: string): void {
    const pad = 1.5
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, size, size)
    this.ctx.clip()

    // Radial gradient body
    const grd = this.ctx.createRadialGradient(x + size * 0.35, y + size * 0.3, 0, x + size / 2, y + size / 2, size)
    grd.addColorStop(0, color)
    grd.addColorStop(1, 'rgba(0,0,0,0.8)')
    this.ctx.fillStyle = grd
    this.ctx.fillRect(x, y, size, size)

    // Star specks (deterministic from row/col)
    const seed = row * 9 + col
    this.ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (let i = 0; i < 3; i++) {
      const sx = x + ((seed * 17 + i * 37) % 100) / 100 * size
      const sy = y + ((seed * 31 + i * 53) % 100) / 100 * size
      this.ctx.fillRect(sx, sy, 1, 1)
    }

    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(138,61,255,0.6)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)
  }

  // ── T6 LIQUID — chromatic wave sheen ────────────────────────────────────
  private drawCellLiquid(row: number, col: number, color: string): void {
    const pad = 1.5
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    const t = this.time * 0.001
    const wave = Math.sin(t * 2 + row * 0.8 + col * 0.6) * 0.5 + 0.5

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, size, size)
    this.ctx.clip()

    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, size, size)

    // Iridescent overlay
    const grd = this.ctx.createLinearGradient(x, y, x + size, y + size)
    grd.addColorStop(0, `rgba(41,230,230,${0.2 + wave * 0.25})`)
    grd.addColorStop(0.5, `rgba(138,61,255,${0.15})`)
    grd.addColorStop(1, `rgba(255,59,189,${0.2 + (1 - wave) * 0.25})`)
    this.ctx.fillStyle = grd
    this.ctx.fillRect(x, y, size, size)

    // Ripple highlight
    this.ctx.fillStyle = `rgba(255,255,255,${0.1 + wave * 0.2})`
    this.ctx.fillRect(x, y, size, size * 0.28)

    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(41,230,230,0.7)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)
  }

  // ── T7 GLITCH — RGB channel split + scan lines ──────────────────────────
  private drawCellGlitch(row: number, col: number, color: string): void {
    const pad = 1.5
    const x = col * this.cellSize + pad
    const y = row * this.cellSize + pad
    const size = this.cellSize - pad * 2
    if (size <= 0) return

    const t = this.time * 0.001
    const glitchOffset = Math.sin(t * 8 + row + col) > 0.7 ? Math.floor(Math.random() * 4) : 0

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, size, size)
    this.ctx.clip()

    // RGB channel split
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, size, size)

    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.fillStyle = `rgba(255,0,0,0.3)`
    this.ctx.fillRect(x - glitchOffset, y, size, size)
    this.ctx.fillStyle = `rgba(0,255,255,0.3)`
    this.ctx.fillRect(x + glitchOffset, y, size, size)

    // Scan lines
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.fillStyle = 'rgba(0,0,0,0.25)'
    for (let sy = y; sy < y + size; sy += 3) {
      this.ctx.fillRect(x, sy, size, 1)
    }

    this.ctx.restore()
    this.ctx.strokeStyle = '#ff3bbd'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x, y, size, size)
  }

  // ── Board background overlay per tier ───────────────────────────────────
  private drawBoardBackground(tier: number): void {
    if (tier < 4) return // tiers 0-3 use CSS --board colour, nothing extra needed

    const ctx = this.ctx
    const gs = this.gridSize
    const t = this.time * 0.001

    ctx.save()

    if (tier === 4) {
      // NEON: subtle dark overlay, cyan grid glow
      ctx.fillStyle = 'rgba(0,20,26,0.35)'
      ctx.fillRect(0, 0, gs, gs)
    } else if (tier === 5) {
      // COSMIC: deep space radial
      const grd = ctx.createRadialGradient(gs / 2, gs / 2, 0, gs / 2, gs / 2, gs)
      grd.addColorStop(0, 'rgba(20,0,40,0.3)')
      grd.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, gs, gs)
      // Wandering star
      const sx = (gs / 2) + Math.sin(t * 0.4) * gs * 0.3
      const sy = (gs / 2) + Math.cos(t * 0.3) * gs * 0.3
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillRect(sx, sy, 1.5, 1.5)
    } else if (tier === 6) {
      // LIQUID: shifting hue band
      const wave = Math.sin(t) * 0.5 + 0.5
      const grd = ctx.createLinearGradient(0, 0, gs, gs)
      grd.addColorStop(0, `rgba(41,230,230,${0.04 + wave * 0.06})`)
      grd.addColorStop(1, `rgba(255,59,189,${0.04 + (1-wave) * 0.06})`)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, gs, gs)
    } else if (tier === 7) {
      // GLITCH: random scanline flicker
      if (Math.random() > 0.94) {
        const lineY = Math.floor(Math.random() * gs)
        ctx.fillStyle = 'rgba(255,59,189,0.15)'
        ctx.fillRect(0, lineY, gs, 2 + Math.floor(Math.random() * 4))
      }
    }

    ctx.restore()
  }

  getCellSize(): number {
    return this.cellSize
  }

  resize(gridSize: number): void {
    this.gridSize = gridSize
    this.cellSize = gridSize / 9
  }

  get currentGridSize(): number {
    return this.gridSize
  }

  screenToGrid(x: number, y: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const canvasX = (x - rect.left) * scaleX
    const canvasY = (y - rect.top) * scaleY
    if (
      canvasX < 0 ||
      canvasX >= this.gridSize ||
      canvasY < 0 ||
      canvasY >= this.gridSize
    ) {
      return null
    }
    return {
      row: Math.floor(canvasY / this.cellSize),
      col: Math.floor(canvasX / this.cellSize),
    }
  }

  // kept for internal usage with square cells
  private roundRect(
    _ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    _r: number
  ) {
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(x + w, y)
    this.ctx.lineTo(x + w, y + h)
    this.ctx.lineTo(x, y + h)
    this.ctx.closePath()
  }
}
