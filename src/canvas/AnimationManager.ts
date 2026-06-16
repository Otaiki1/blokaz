export type AnimationType = 'LINE_CLEAR' | 'COMBO' | 'SCORE' | 'SNAP' | 'DROP_FLASH' | 'TIER_UP' | 'MULTI_CLEAR' | 'POWER_UP'

interface Animation {
  type: AnimationType
  progress: number // 0 to 1
  duration: number
  params: any
}

const getThemeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const withAlpha = (color: string, alpha: number) => {
  if (color.startsWith('#')) {
    const normalized = color.slice(1)
    const r = Number.parseInt(normalized.slice(0, 2), 16)
    const g = Number.parseInt(normalized.slice(2, 4), 16)
    const b = Number.parseInt(normalized.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

export class AnimationManager {
  private animations: Animation[] = []

  trigger(type: AnimationType, params: any): void {
    const POWER_UP_DUR: Record<string, number> = {
      scoreBoost: 1500, shield: 1300, bomb: 950, rotatePass: 1400,
    }
    const duration =
      type === 'COMBO'       ? 800  :
      type === 'LINE_CLEAR'  ? 500  :
      type === 'DROP_FLASH'  ? 220  :
      type === 'TIER_UP'     ? 2400 :
      type === 'MULTI_CLEAR' ? 1000 :
      type === 'POWER_UP'    ? (POWER_UP_DUR[(params as any).subType] ?? 1200) :
      300
    // Only one TIER_UP at a time
    if (type === 'TIER_UP') {
      this.animations = this.animations.filter((a) => a.type !== 'TIER_UP')
    }
    this.animations.push({ type, progress: 0, duration, params })
  }

  update(deltaTime: number): void {
    this.animations.forEach((anim) => {
      anim.progress += deltaTime / anim.duration
    })
    this.animations = this.animations.filter((anim) => anim.progress < 1)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    isTournament: boolean = false
  ): void {
    const boardW = 9 * cellSize

    this.animations.forEach((anim) => {
      ctx.save()

      if (anim.type === 'LINE_CLEAR') {
        const { rows, cols, accent } = anim.params
        const clearColor = accent
          ? withAlpha(accent, 0.45 * (1 - anim.progress))
          : isTournament
            ? `rgba(255, 184, 214, ${0.45 * (1 - anim.progress)})`
            : `rgba(183, 255, 59, ${0.45 * (1 - anim.progress)})`

        ctx.fillStyle = clearColor

        rows?.forEach((r: number) => {
          ctx.fillRect(0, r * cellSize, boardW, cellSize)

          // CLEAR! sticker
          if (anim.progress < 0.6) {
            const inkColor = getThemeColor('--ink')
            const limeColor = accent ?? getThemeColor('--accent-lime')
            ctx.save()
            ctx.translate(cellSize * 1.5, r * cellSize + cellSize / 2)
            ctx.rotate(-0.1)
            ctx.fillStyle = inkColor
            ctx.fillRect(-45, -18, 90, 36)
            ctx.strokeStyle = limeColor
            ctx.lineWidth = 3
            ctx.strokeRect(-45, -18, 90, 36)
            ctx.fillStyle = limeColor
            ctx.font = 'bold 16px "Archivo Black"'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('CLEAR!', 0, 0)
            ctx.restore()
          }
        })
        cols?.forEach((c: number) => {
          ctx.fillRect(c * cellSize, 0, cellSize, boardW)
        })

      } else if (anim.type === 'DROP_FLASH') {
        const { cells } = anim.params as { cells: { row: number; col: number }[] }
        const alpha = Math.max(0, 0.55 * (1 - anim.progress * 1.6))
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        for (const { row, col } of cells) {
          ctx.fillRect(col * cellSize + 1, row * cellSize + 1, cellSize - 2, cellSize - 2)
        }
        const outlineAlpha = Math.max(0, 0.8 * (1 - anim.progress))
        ctx.strokeStyle = `rgba(140, 255, 60, ${outlineAlpha})`
        ctx.lineWidth = 2.5
        ctx.setLineDash([])
        for (const { row, col } of cells) {
          ctx.strokeRect(col * cellSize + 1.5, row * cellSize + 1.5, cellSize - 3, cellSize - 3)
        }

      } else if (anim.type === 'SCORE') {
        const { x, y, score, label, small } = anim.params
        const inkColor = getThemeColor('--ink')
        ctx.globalAlpha = 1 - anim.progress
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 4
        ctx.textAlign = 'center'
        const drift = anim.progress * (small ? 40 : 60)
        if (label) {
          ctx.font = `${small ? 11 : 14}px "Archivo Black"`
          ctx.fillStyle = getThemeColor('--accent-pink')
          ctx.fillText(label, x, y - drift - (small ? 14 : 22))
        }
        ctx.fillStyle = isTournament ? getThemeColor('--accent-cyan') : inkColor
        ctx.font = `${small ? 14 : 22}px "Archivo Black"`
        ctx.fillText(`+${score}`, x, y - drift)

      } else if (anim.type === 'MULTI_CLEAR') {
        const { count, linePoints } = anim.params as { count: number; linePoints: number }
        const boardW = 9 * cellSize
        const label = count >= 3 ? 'TRIPLE CLEAR!' : count >= 2 ? 'DOUBLE CLEAR!' : 'CLEAR!'
        const badgeW = count >= 3 ? 220 : 200
        const badgeH = 48
        const cx = boardW / 2
        const cy = 9 * cellSize * 0.3

        // Fade in fast, hold, fade out
        const fadeIn  = Math.min(1, anim.progress / 0.15)
        const fadeOut = Math.max(0, (anim.progress - 0.7) / 0.3)
        const alpha   = fadeIn * (1 - fadeOut)
        if (alpha <= 0) { ctx.restore(); return }

        const scale = 0.8 + fadeIn * 0.2
        ctx.globalAlpha = alpha
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(-0.04)
        ctx.scale(scale, scale)
        ctx.translate(-cx, -cy)

        // Shadow
        ctx.fillStyle = '#0C0C10'
        ctx.fillRect(cx - badgeW / 2 + 5, cy - badgeH / 2 + 5, badgeW, badgeH)

        // Badge bg — lime for double, cyan for triple
        ctx.fillStyle = count >= 3 ? '#29e6e6' : '#B7FF3B'
        ctx.fillRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH)
        ctx.strokeStyle = '#0C0C10'
        ctx.lineWidth = 3
        ctx.strokeRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH)

        // Label text
        ctx.fillStyle = '#0C0C10'
        ctx.font = '20px "Archivo Black"'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, cx, cy - 8)

        // Points sub-label
        ctx.font = '13px "Archivo Black"'
        ctx.fillStyle = '#0C0C10'
        ctx.globalAlpha = alpha * 0.7
        ctx.fillText(`+${linePoints.toLocaleString()} LINE PTS`, cx, cy + 14)

        ctx.restore()

      } else if (anim.type === 'COMBO') {
        const { streak } = anim.params
        const center = boardW / 2
        const accentColor = getThemeColor('--accent')

        if (anim.progress < 0.5) {
          ctx.fillStyle = withAlpha(accentColor, Math.max(0, 0.2 - anim.progress * 0.4))
          ctx.beginPath()
          ctx.arc(center, ctx.canvas.height / 2, anim.progress * 800, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.textAlign = 'center'
        const pinkColor = getThemeColor('--accent-pink')
        const redColor = getThemeColor('--danger')
        const inkColor = getThemeColor('--ink')

        ctx.fillStyle = isTournament ? pinkColor : redColor
        ctx.strokeStyle = inkColor
        ctx.lineWidth = 8
        const scale = 1 + Math.sin(anim.progress * Math.PI) * 0.2
        ctx.font = `${Math.floor(48 * scale)}px "Archivo Black"`

        const yPos = ctx.canvas.height / 2 - anim.progress * 150
        ctx.strokeText('COMBO!', center, yPos)
        ctx.fillText('COMBO!', center, yPos)

        ctx.font = `${Math.floor(28 * scale)}px "Archivo Black"`
        ctx.fillStyle = isTournament ? getThemeColor('--accent-lime') : getThemeColor('--accent-yellow')
        ctx.strokeText(`x${streak}`, center, yPos + 40)
        ctx.fillText(`x${streak}`, center, yPos + 40)

      } else if (anim.type === 'POWER_UP') {
        drawPowerUpActivation(ctx, cellSize, anim.params, anim.progress)

      } else if (anim.type === 'TIER_UP') {
        // ─── TIER UP REVEAL ───────────────────────────────────────
        // 3 phases: 0-0.25 sunburst in, 0.25-0.75 hold, 0.75-1 fade out
        const { tierName, accent } = anim.params as { tierName: string; accent: string }
        const p = anim.progress

        const inP   = Math.min(1, p / 0.25)
        const outP  = Math.max(0, (p - 0.75) / 0.25)
        const alpha = 1 - outP

        if (alpha <= 0) { ctx.restore(); return }

        const center = boardW / 2
        const midY   = 9 * cellSize / 2

        // Dark overlay with blur-like feel
        ctx.globalAlpha = alpha * 0.82
        ctx.fillStyle = '#0c0c10'
        ctx.fillRect(0, 0, boardW, 9 * cellSize)

        // Sunburst conic rays
        ctx.globalAlpha = alpha * 0.55
        ctx.save()
        ctx.translate(center, midY)
        ctx.rotate(p * Math.PI * 0.5)
        const rays = 18
        for (let i = 0; i < rays; i++) {
          const a1 = (i / rays) * Math.PI * 2
          const a2 = ((i + 0.5) / rays) * Math.PI * 2
          const R = boardW * 0.9
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.arc(0, 0, R, a1, a2)
          ctx.closePath()
          if (i % 2 === 0) {
            const r2 = parseInt(accent.slice(1, 3), 16)
            const g2 = parseInt(accent.slice(3, 5), 16)
            const b2 = parseInt(accent.slice(5, 7), 16)
            ctx.fillStyle = `rgba(${r2},${g2},${b2},0.55)`
          } else {
            ctx.fillStyle = 'transparent'
          }
          ctx.fill()
        }
        ctx.restore()

        // Pill badge
        const scale2 = Math.min(1, inP * 1.15) * (1 - outP * 0.2)
        const badgeW = 280
        const badgeH = 80
        const bx = center - badgeW / 2
        const by = midY - badgeH / 2

        ctx.globalAlpha = alpha
        ctx.save()
        ctx.translate(center, midY)
        ctx.scale(scale2, scale2)
        ctx.translate(-center, -midY)

        // Shadow
        ctx.fillStyle = '#0c0c10'
        ctx.fillRect(bx + 7, by + 7, badgeW, badgeH)

        // Accent bg
        const ra = parseInt(accent.slice(1, 3), 16)
        const ga = parseInt(accent.slice(3, 5), 16)
        const ba = parseInt(accent.slice(5, 7), 16)
        ctx.fillStyle = accent
        ctx.fillRect(bx, by, badgeW, badgeH)
        ctx.strokeStyle = '#0c0c10'
        ctx.lineWidth = 4
        ctx.strokeRect(bx, by, badgeW, badgeH)

        // "TIER UP" label
        ctx.fillStyle = '#0c0c10'
        ctx.font = '13px "Archivo Black"'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('TIER UP', center, by + 22)

        // Tier name
        ctx.font = '34px "Archivo Black"'
        ctx.fillText(tierName, center, by + 54)

        ctx.restore()
      }

      ctx.restore()
    })
  }
}

// ─── Power-up activation canvas bursts ───────────────────────────────────────

function ease(t: number): number { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, text: string,
  bg: string, w: number, h: number, scale: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.fillStyle = '#0C0C10'
  ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w, h)
  ctx.fillStyle = bg
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.strokeStyle = '#0C0C10'
  ctx.lineWidth = 3
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.fillStyle = '#0C0C10'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(h * 0.44)}px "Archivo Black"`
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function drawPowerUpActivation(
  ctx: CanvasRenderingContext2D,
  cs: number,
  params: any,
  p: number,
): void {
  const { subType, row, col } = params
  const boardW = 9 * cs
  const cx = boardW / 2
  const cy = 9 * cs / 2

  ctx.save()
  ctx.shadowBlur = 0

  switch (subType as string) {

    case 'scoreBoost': {
      const C = '#FFD51F'
      // Gold board wash
      const washA = p < 0.2 ? p / 0.2 : p > 0.6 ? (1 - p) / 0.4 : 1
      ctx.globalAlpha = washA * 0.22
      ctx.fillStyle = C
      ctx.fillRect(0, 0, boardW, 9 * cs)

      // 3 staggered radial rings
      for (let i = 0; i < 3; i++) {
        const rp = Math.max(0, Math.min(1, (p - i * 0.11) / 0.65))
        if (rp <= 0) continue
        const radius = rp * boardW * 0.88
        const ringA = (1 - rp) * washA
        ctx.globalAlpha = ringA * 0.95
        ctx.strokeStyle = C
        ctx.lineWidth = Math.max(1.5, (1 - rp) * 6)
        ctx.shadowColor = C
        ctx.shadowBlur = 14
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Badge
      if (p > 0.1 && p < 0.88) {
        const ba = p < 0.2 ? (p - 0.1) / 0.1 : p > 0.75 ? (0.88 - p) / 0.13 : 1
        const sc = 0.82 + ease(Math.min(1, (p - 0.1) / 0.12)) * 0.18
        ctx.globalAlpha = ba
        drawBadge(ctx, cx, cy, '⚡  ×2 ACTIVE', C, 200, 56, sc)
      }
      break
    }

    case 'shield': {
      const C = '#3B82F6'
      const sweepY = Math.min(9 * cs, p * (9 * cs) / 0.5)
      const fadeA = p > 0.45 ? 1 - (p - 0.45) / 0.55 : 1

      // Blue curtain
      if (sweepY > 0) {
        ctx.globalAlpha = 0.38 * fadeA
        ctx.fillStyle = C
        ctx.shadowColor = C
        ctx.shadowBlur = 18
        ctx.fillRect(0, 0, boardW, sweepY)
        ctx.shadowBlur = 0

        // Bright leading edge
        const edgeY = Math.min(9 * cs - 2, sweepY)
        ctx.globalAlpha = Math.max(0, (1 - p / 0.55)) * 0.9
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, edgeY - 4, boardW, 7)
      }

      // Badge
      if (p > 0.18 && p < 0.88) {
        const ba = p < 0.28 ? (p - 0.18) / 0.1 : p > 0.75 ? (0.88 - p) / 0.13 : 1
        const sc = 0.82 + ease(Math.min(1, (p - 0.18) / 0.12)) * 0.18
        ctx.globalAlpha = ba
        drawBadge(ctx, cx, cy, '🛡  SHIELD ARMED', C, 220, 56, sc)
      }
      break
    }

    case 'bomb': {
      const C = '#FF5722'
      const YELLOW = '#FFD51F'
      const bx = (col ?? 4) * cs + cs / 2
      const by = (row ?? 4) * cs + cs / 2
      const maxR = boardW * 0.92

      // 2 staggered shockwave rings from blast cell
      for (let i = 0; i < 2; i++) {
        const rp = Math.max(0, Math.min(1, (p - i * 0.16) / 0.72))
        if (rp <= 0) continue
        const radius = rp * maxR
        const ringA = (1 - rp) * (1 - p * 0.4)
        ctx.globalAlpha = ringA * 0.9
        ctx.strokeStyle = i === 0 ? '#fff' : C
        ctx.lineWidth = Math.max(1.5, (1 - rp) * 7)
        ctx.shadowColor = C
        ctx.shadowBlur = 16
        ctx.beginPath()
        ctx.arc(bx, by, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Cross-cell flash (row + col of blast point)
      const flashA = p < 0.18 ? p / 0.18 : p < 0.42 ? (0.42 - p) / 0.24 : 0
      if (flashA > 0.01 && row != null && col != null) {
        ctx.globalAlpha = flashA * 0.72
        ctx.fillStyle = YELLOW
        for (let c = 0; c < 9; c++) ctx.fillRect(c * cs + 1, row * cs + 1, cs - 2, cs - 2)
        for (let r = 0; r < 9; r++) ctx.fillRect(col * cs + 1, r * cs + 1, cs - 2, cs - 2)
      }

      // "BOOM!" badge — fast in, fast out
      if (p < 0.45) {
        const ba = p < 0.08 ? p / 0.08 : p > 0.3 ? (0.45 - p) / 0.15 : 1
        const sc = 0.75 + ease(Math.min(1, p / 0.1)) * 0.35
        ctx.globalAlpha = ba
        drawBadge(ctx, cx, cy - cs * 0.8, '💥  BOOM!', C, 160, 52, sc)
      }
      break
    }

    case 'rotatePass': {
      const C = '#38BDF8'
      const trayY = 9 * cs
      const slotCx = [cs * 1.5, cs * 4.5, cs * 7.5]
      const spin = p * Math.PI * 3.5

      // Board wash
      const washA = p < 0.15 ? p / 0.15 : p > 0.65 ? (1 - p) / 0.35 : 1
      ctx.globalAlpha = washA * 0.12
      ctx.fillStyle = C
      ctx.fillRect(0, 0, boardW, boardW)

      ctx.strokeStyle = C
      ctx.lineWidth = Math.max(2, cs * 0.075)
      ctx.lineCap = 'round'
      ctx.shadowColor = C
      ctx.shadowBlur = cs * 0.22

      for (let i = 0; i < 3; i++) {
        const delay = i * 0.1
        const lp = Math.max(0, Math.min(1, (p - delay) / (1 - delay)))
        if (lp <= 0) continue
        const envA = lp < 0.12 ? lp / 0.12 : lp > 0.78 ? (1 - lp) / 0.22 : 1
        const sx = slotCx[i]
        const sy = trayY + cs * 1.5
        const r = cs * 0.82

        // Dashed slot
        ctx.globalAlpha = envA * washA * 0.7
        ctx.setLineDash([cs * 0.14, cs * 0.1])
        ctx.strokeRect(sx - r, sy - r, r * 2, r * 2)
        ctx.setLineDash([])

        // Spinning arc
        const startA = spin + (i * Math.PI * 2) / 3
        const endA = startA + Math.PI * 1.7
        ctx.globalAlpha = envA * washA
        ctx.beginPath()
        ctx.arc(sx, sy, r * 0.72, startA, endA)
        ctx.stroke()

        // Arrowhead
        const ax = sx + Math.cos(endA) * r * 0.72
        const ay = sy + Math.sin(endA) * r * 0.72
        const tan = endA + Math.PI / 2
        const as = cs * 0.16
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(tan - 0.5) * as, ay - Math.sin(tan - 0.5) * as)
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax - Math.cos(tan + 0.5) * as, ay - Math.sin(tan + 0.5) * as)
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      ctx.shadowBlur = 0

      // Badge
      if (p > 0.12 && p < 0.82) {
        const ba = p < 0.22 ? (p - 0.12) / 0.1 : p > 0.7 ? (0.82 - p) / 0.12 : 1
        const sc = 0.82 + ease(Math.min(1, (p - 0.12) / 0.12)) * 0.18
        ctx.globalAlpha = ba
        drawBadge(ctx, cx, cy, '↻  ROTATIONS UNLOCKED', C, 250, 56, sc)
      }
      break
    }
  }

  ctx.restore()
}
