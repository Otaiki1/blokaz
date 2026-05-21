import type { ShapeDefinition } from '../engine/shapes'
import { COLOR_PALETTE, TOURNAMENT_PALETTE } from './GridRenderer'
import type { TierInfo } from '../engine/scoring'

const getThemeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export class PieceRenderer {
  private ctx: CanvasRenderingContext2D
  private trayY: number
  private cellSize: number
  private canvasWidth: number
  private tierId: number = 0
  private tierAccent: string = '#ffd51f'
  private time: number = 0

  constructor(canvas: HTMLCanvasElement, trayY: number, cellSize: number) {
    this.ctx = canvas.getContext('2d')!
    this.trayY = trayY
    this.cellSize = cellSize
    this.canvasWidth = canvas.width
  }

  setTier(tier: TierInfo): void {
    this.tierId = tier.id
    this.tierAccent = tier.accent
  }

  setTime(t: number): void {
    this.time = t
  }

  drawTray(
    pieces: (ShapeDefinition | null)[],
    activeIndex?: number,
    isTournament: boolean = false,
    hoveredIndex?: number,
    selectedIndex?: number
  ): void {
    const slotWidth = this.canvasWidth / 3
    const palette = isTournament ? TOURNAMENT_PALETTE : COLOR_PALETTE

    pieces.forEach((shape, index) => {
      // Draw slot divider (except before the first slot).
      // Use a dark semi-transparent line so it stays subtle on both the
      // yellow light-theme tray and the coloured dark-theme tray (where
      // --ink is light and would appear as a harsh white stripe).
      if (index > 0) {
        this.ctx.strokeStyle = 'rgba(0,0,0,0.28)'
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.moveTo(index * slotWidth, this.trayY)
        this.ctx.lineTo(index * slotWidth, this.trayY + slotWidth)
        this.ctx.stroke()
      }

      const isSelected = index === selectedIndex
      const isDragging = index === activeIndex

      // Draw selection highlight behind the piece (uses tier accent)
      if (isSelected) {
        const pad = 6
        const acc = this.tierAccent
        const rr = parseInt(acc.slice(1, 3), 16)
        const gg = parseInt(acc.slice(3, 5), 16)
        const bb = parseInt(acc.slice(5, 7), 16)
        this.ctx.fillStyle = `rgba(${rr},${gg},${bb},0.18)`
        this.ctx.fillRect(
          index * slotWidth + pad,
          this.trayY + pad,
          slotWidth - pad * 2,
          slotWidth - pad * 2
        )
        this.ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.9)`
        this.ctx.lineWidth = 3
        this.ctx.setLineDash([])
        this.ctx.strokeRect(
          index * slotWidth + pad,
          this.trayY + pad,
          slotWidth - pad * 2,
          slotWidth - pad * 2
        )
      }

      if (!shape || isDragging) {
        // Empty slot or actively dragging — transparent so tray bg shows through
        return
      }

      const color = palette[shape.colorId as keyof typeof palette]
      const baseScale = isSelected ? 0.65 : 0.6
      const scale = baseScale * (hoveredIndex === index ? 1.05 : 1)
      const displayCellSize = this.cellSize * scale
      const pieceWidth = shape.width * displayCellSize
      const pieceHeight = shape.height * displayCellSize
      const x = index * slotWidth + (slotWidth - pieceWidth) / 2
      const y = this.trayY + (slotWidth - pieceHeight) / 2

      this.ctx.save()
      const acc = this.tierAccent
      const selR = parseInt(acc.slice(1, 3), 16)
      const selG = parseInt(acc.slice(3, 5), 16)
      const selB = parseInt(acc.slice(5, 7), 16)
      this.ctx.shadowColor = isSelected ? `rgba(${selR},${selG},${selB},0.5)` : 'rgba(0,0,0,0.15)'
      this.ctx.shadowOffsetX = isSelected ? 0 : 2
      this.ctx.shadowOffsetY = isSelected ? 0 : 2
      this.ctx.shadowBlur = isSelected ? 10 : 0
      this.drawShapeForTier(shape, x, y, displayCellSize, color, this.tierId)
      this.ctx.restore()
    })
  }

  drawDragging(shape: ShapeDefinition, x: number, y: number, cellSize: number, isTournament: boolean = false): void {
    const palette = isTournament ? TOURNAMENT_PALETTE : COLOR_PALETTE
    const color = palette[shape.colorId as keyof typeof palette]
    const dragY = y - 40
    this.drawShapeForTier(shape, x - (shape.width * cellSize) / 2, dragY - (shape.height * cellSize) / 2, cellSize, color, this.tierId)
  }

  resize(trayY: number, cellSize: number, canvasWidth: number): void {
    this.trayY = trayY
    this.cellSize = cellSize
    this.canvasWidth = canvasWidth
  }

  hitTestTray(x: number, y: number, pieces: (ShapeDefinition | null)[]): number | null {
    const slotWidth = this.canvasWidth / 3
    if (y < this.trayY || y > this.trayY + slotWidth) return null
    const index = Math.floor(x / slotWidth)
    if (index >= 0 && index < 3 && pieces[index]) return index
    return null
  }

  // ── Tier dispatcher ──────────────────────────────────────────────────────
  private drawShapeForTier(shape: ShapeDefinition, x: number, y: number, cellSize: number, color: string, tier: number): void {
    for (const [dr, dc] of shape.cells) {
      const cx = x + dc * cellSize + 1.2
      const cy = y + dr * cellSize + 1.2
      const size = cellSize - 2.4
      if (size <= 0) continue
      switch (tier) {
        case 1: this.drawPieceSticker(cx, cy, size, color); break
        case 2: this.drawPieceStriped(cx, cy, size, color); break
        case 3: this.drawPiecePixel(cx, cy, size, color); break
        case 4: this.drawPieceNeon(cx, cy, size, color); break
        case 5: this.drawPieceCosmic(cx, cy, size, color, dr, dc); break
        case 6: this.drawPieceLiquid(cx, cy, size, color); break
        case 7: this.drawPieceGlitch(cx, cy, size, color); break
        default: this.drawPieceDefault(cx, cy, size, color); break
      }
    }
  }

  private drawPieceDefault(cx: number, cy: number, size: number, color: string): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    this.ctx.fillStyle = 'rgba(255,255,255,0.18)'
    this.ctx.fillRect(cx, cy, size, Math.floor(size * 0.26))
    const sh = Math.floor(size * 0.26)
    this.ctx.fillStyle = 'rgba(0,0,0,0.14)'
    this.ctx.fillRect(cx, cy + size - sh, size, sh)
    this.ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPieceSticker(cx: number, cy: number, size: number, color: string): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    const grd = this.ctx.createLinearGradient(cx, cy, cx, cy + size * 0.4)
    grd.addColorStop(0, 'rgba(255,255,255,0.50)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    this.ctx.fillStyle = grd
    this.ctx.fillRect(cx + 1, cy + 1, size - 2, size * 0.38)
    this.ctx.fillStyle = '#ff3bbd'
    this.ctx.fillRect(cx + size - 5, cy + 1, 3, 3)
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPieceStriped(cx: number, cy: number, size: number, color: string): void {
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(cx, cy, size, size)
    this.ctx.clip()
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    this.ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    this.ctx.lineWidth = 2.5
    for (let i = -size; i < size * 2; i += 7) {
      this.ctx.beginPath()
      this.ctx.moveTo(cx + i, cy)
      this.ctx.lineTo(cx + i + size, cy + size)
      this.ctx.stroke()
    }
    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPiecePixel(cx: number, cy: number, size: number, color: string): void {
    const h = Math.floor(size / 2)
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    const shades = ['rgba(255,255,255,0.18)','rgba(0,0,0,0.12)','rgba(0,0,0,0.12)','rgba(255,255,255,0.08)']
    const pos = [[0,0],[1,0],[0,1],[1,1]]
    for (let i = 0; i < 4; i++) {
      const [dc2, dr2] = pos[i]
      this.ctx.fillStyle = shades[i]
      this.ctx.fillRect(cx + dc2 * h, cy + dr2 * h, h, h)
    }
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    this.ctx.lineWidth = 1.5
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPieceNeon(cx: number, cy: number, size: number, color: string): void {
    this.ctx.save()
    this.ctx.shadowColor = this.tierAccent
    this.ctx.shadowBlur = 8
    this.ctx.fillStyle = 'rgba(0,20,26,0.85)'
    this.ctx.fillRect(cx, cy, size, size)
    this.ctx.restore()
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx + 1, cy + 1, size - 2, size - 2)
    this.ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const ds = Math.max(2, size * 0.15)
    this.ctx.fillRect(cx + size / 2 - ds / 2, cy + size / 2 - ds / 2, ds, ds)
  }

  private drawPieceCosmic(cx: number, cy: number, size: number, color: string, dr: number, dc: number): void {
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(cx, cy, size, size)
    this.ctx.clip()
    const grd = this.ctx.createRadialGradient(cx + size * 0.35, cy + size * 0.3, 0, cx + size / 2, cy + size / 2, size)
    grd.addColorStop(0, color)
    grd.addColorStop(1, 'rgba(0,0,0,0.8)')
    this.ctx.fillStyle = grd
    this.ctx.fillRect(cx, cy, size, size)
    const seed = dr * 9 + dc
    this.ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (let i = 0; i < 2; i++) {
      const sx = cx + ((seed * 17 + i * 37) % 100) / 100 * size
      const sy = cy + ((seed * 31 + i * 53) % 100) / 100 * size
      this.ctx.fillRect(sx, sy, 1, 1)
    }
    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(138,61,255,0.6)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPieceLiquid(cx: number, cy: number, size: number, color: string): void {
    const t = this.time * 0.001
    const wave = Math.sin(t * 2 + cx * 0.1) * 0.5 + 0.5
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(cx, cy, size, size)
    this.ctx.clip()
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    const grd = this.ctx.createLinearGradient(cx, cy, cx + size, cy + size)
    grd.addColorStop(0, `rgba(41,230,230,${0.2 + wave * 0.25})`)
    grd.addColorStop(1, `rgba(255,59,189,${0.2 + (1 - wave) * 0.25})`)
    this.ctx.fillStyle = grd
    this.ctx.fillRect(cx, cy, size, size)
    this.ctx.restore()
    this.ctx.strokeStyle = 'rgba(41,230,230,0.7)'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawPieceGlitch(cx: number, cy: number, size: number, color: string): void {
    const t = this.time * 0.001
    const glitchOffset = Math.sin(t * 8 + cx + cy) > 0.7 ? Math.floor(Math.random() * 3) : 0
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(cx, cy, size, size)
    this.ctx.clip()
    this.ctx.fillStyle = color
    this.ctx.fillRect(cx, cy, size, size)
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.fillStyle = 'rgba(255,0,0,0.3)'
    this.ctx.fillRect(cx - glitchOffset, cy, size, size)
    this.ctx.fillStyle = 'rgba(0,255,255,0.3)'
    this.ctx.fillRect(cx + glitchOffset, cy, size, size)
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)'
    for (let sy = cy; sy < cy + size; sy += 3) {
      this.ctx.fillRect(cx, sy, size, 1)
    }
    this.ctx.restore()
    this.ctx.strokeStyle = '#ff3bbd'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(cx, cy, size, size)
  }

  private drawShape(shape: ShapeDefinition, x: number, y: number, cellSize: number, color: string): void {
    this.drawShapeForTier(shape, x, y, cellSize, color, 0)
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, _r: number) {
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
  }
}
