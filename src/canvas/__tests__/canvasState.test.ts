import { describe, expect, it, vi } from 'vitest'
import { resetCanvasFrameState } from '../canvasState'

describe('resetCanvasFrameState', () => {
  it('restores canvas state before a new frame is drawn', () => {
    const ctx = {
      setTransform: vi.fn(),
      setLineDash: vi.fn(),
      globalAlpha: 0.12,
      globalCompositeOperation: 'screen',
      filter: 'blur(8px)',
      shadowColor: '#ff0000',
      shadowBlur: 12,
      shadowOffsetX: 4,
      shadowOffsetY: 5,
      lineDashOffset: 9,
      lineCap: 'round',
      lineJoin: 'bevel',
    } as unknown as CanvasRenderingContext2D

    resetCanvasFrameState(ctx)

    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0)
    expect(ctx.globalAlpha).toBe(1)
    expect(ctx.globalCompositeOperation).toBe('source-over')
    expect(ctx.filter).toBe('none')
    expect(ctx.shadowColor).toBe('transparent')
    expect(ctx.shadowBlur).toBe(0)
    expect(ctx.shadowOffsetX).toBe(0)
    expect(ctx.shadowOffsetY).toBe(0)
    expect(ctx.lineDashOffset).toBe(0)
    expect(ctx.lineCap).toBe('butt')
    expect(ctx.lineJoin).toBe('miter')
    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })
})
