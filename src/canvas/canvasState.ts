export function resetCanvasFrameState(ctx: CanvasRenderingContext2D): void {
  try { ctx.setTransform(1, 0, 0, 1, 0, 0) } catch {}
  try { ctx.globalAlpha = 1 } catch {}
  try { ctx.globalCompositeOperation = 'source-over' } catch {}
  try { ctx.filter = 'none' } catch {}
  try { ctx.shadowColor = 'transparent' } catch {}
  try { ctx.shadowBlur = 0 } catch {}
  try { ctx.shadowOffsetX = 0 } catch {}
  try { ctx.shadowOffsetY = 0 } catch {}
  try { ctx.lineDashOffset = 0 } catch {}
  try { ctx.lineCap = 'butt' } catch {}
  try { ctx.lineJoin = 'miter' } catch {}
  try { ctx.setLineDash([]) } catch {}
}
