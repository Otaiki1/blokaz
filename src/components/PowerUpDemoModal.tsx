import React, { useEffect, useRef, useState } from 'react'
import type { PowerUpId } from '../stores/powerUpStore'

export type DemoId = PowerUpId | 'revivalBundle'

interface PowerUpDemoModalProps {
  demoId: DemoId
  onClose: () => void
  onBuy: () => void
}

const INK    = '#0C0C10'
const PAPER  = '#F5EFE3'
const YELLOW = '#FFD51F'
const LIME   = '#B7FF3B'
const CYAN   = '#38BDF8'
const RED    = '#FF3B3B'
const BLUE   = '#3B82F6'
const ORANGE = '#FB923C'

const PIECE_COLORS = [BLUE, RED, LIME, YELLOW, CYAN, ORANGE, '#A855F7']

// ── Demo config ───────────────────────────────────────────────
const DEMO_CONFIG: Record<DemoId, { title: string; accent: string; tagline: string; price: string }> = {
  bomb:          { title: 'BOMB IN ACTION',        accent: RED,    tagline: 'Cross blast — row + column gone in one tap.',          price: '0.10' },
  shield:        { title: 'SHIELD IN ACTION',      accent: BLUE,   tagline: 'Auto-saves you and clears 3 columns.',                 price: '0.10' },
  scoreBoost:    { title: 'SCORE BOOST IN ACTION', accent: YELLOW, tagline: 'Every piece scores ×2 for the whole game.',            price: '0.10' },
  rotatePass:    { title: 'ROTATE PASS IN ACTION', accent: CYAN,   tagline: 'Rotate pieces to unlock impossible placements.',        price: '0.10' },
  revivalBundle: { title: 'REVIVAL BUNDLE',        accent: CYAN,   tagline: 'Continue a run without losing your score.',            price: '0.10' },
}

// ── Grid types ────────────────────────────────────────────────
type CellState = 'normal' | 'target' | 'flash' | 'cleared'
interface Cell { color: string | null; state: CellState }

const EMPTY: Cell = { color: null, state: 'normal' }
const c = (idx: number): Cell => ({ color: PIECE_COLORS[(idx - 1) % PIECE_COLORS.length], state: 'normal' })

// 60% filled grid for bomb demo
const BOMB_BASE: Cell[] = [
  c(1),c(2),EMPTY,c(3),c(4),EMPTY,c(5),c(1),c(2),
  c(3),EMPTY,c(4),c(1),EMPTY,c(2),c(3),c(4),EMPTY,
  EMPTY,c(5),c(1),EMPTY,c(3),c(1),EMPTY,c(2),c(3),
  c(4),c(1),EMPTY,c(2),EMPTY,c(3),c(1),EMPTY,c(4),
  c(2),EMPTY,c(3),EMPTY,EMPTY,EMPTY,c(2),EMPTY,c(1), // row 4 = target
  c(1),c(3),EMPTY,c(4),EMPTY,c(1),c(3),EMPTY,c(2),
  EMPTY,c(2),c(4),EMPTY,c(5),EMPTY,c(4),c(2),EMPTY,
  c(3),EMPTY,c(1),c(2),EMPTY,c(3),EMPTY,c(1),c(2),
  c(1),c(4),EMPTY,c(3),c(2),EMPTY,c(4),c(1),c(3),
]

// Nearly-full grid for shield demo
const SHIELD_BASE: Cell[] = [
  c(1),c(2),c(3),c(4),c(5),c(6),c(1),c(2),c(3),
  c(3),c(4),c(5),c(1),c(6),c(2),c(3),c(4),c(5),
  c(5),c(1),c(2),c(3),c(1),c(7),c(2),c(3),c(1),
  c(2),c(3),c(6),c(4),c(2),c(3),c(7),c(4),c(2),
  c(4),c(5),c(1),c(7),c(3),c(4),c(1),c(6),c(3),
  c(1),c(2),c(3),c(4),c(7),c(1),c(2),c(3),c(6),
  c(3),c(7),c(4),c(2),c(3),c(6),c(4),c(2),c(3),
  c(2),c(3),c(6),c(1),c(4),c(2),c(7),c(1),c(4),
  c(7),c(1),c(2),c(3),c(6),c(1),c(2),c(3),c(7),
]

// ── Phase-based grid computer ─────────────────────────────────
// Grid is derived purely from phase — no separate grid state needed.
function getBombCells(phase: number): Cell[] {
  if (phase === 0) return BOMB_BASE
  if (phase === 1) return BOMB_BASE.map((cell, i) =>
    i === 40 ? { ...cell, state: 'target' } : cell
  )
  if (phase === 2) return BOMB_BASE.map((cell, i) => {
    const r = Math.floor(i / 9), col = i % 9
    return (r === 4 || col === 4) ? { ...cell, state: 'flash' } : cell
  })
  // phase 3+: cleared
  return BOMB_BASE.map((cell, i) => {
    const r = Math.floor(i / 9), col = i % 9
    return (r === 4 || col === 4) ? { color: null, state: 'cleared' } : cell
  })
}

function getShieldCells(phase: number, tintCols: number[]): Cell[] {
  if (phase === 0) return SHIELD_BASE
  if (phase === 1) return SHIELD_BASE  // red overlay handled outside
  if (phase === 2) return SHIELD_BASE.map((cell, i) =>
    tintCols.includes(i % 9) ? { color: BLUE, state: 'flash' } : cell
  )
  // phase 3+: cleared
  return SHIELD_BASE.map((cell, i) =>
    tintCols.includes(i % 9) ? { color: null, state: 'cleared' } : cell
  )
}

// ── Mini grid ─────────────────────────────────────────────────
const MiniGrid: React.FC<{ cells: Cell[]; tint?: string }> = ({ cells, tint }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(9, 27px)',
      gap: 2, background: INK, padding: 3, border: `3px solid ${INK}`,
    }}>
      {cells.map((cell, i) => (
        <div key={i} style={{
          width: 27, height: 27,
          background:
            cell.state === 'flash'   ? '#fff' :
            cell.state === 'cleared' ? 'transparent' :
            cell.color ?? '#1e1e28',
          opacity:   cell.state === 'cleared' ? 0 : 1,
          transform: cell.state === 'cleared' ? 'scale(0)' :
                     cell.state === 'target'  ? 'scale(1.1)' : 'scale(1)',
          outline: cell.state === 'target' ? `2.5px solid ${YELLOW}` : 'none',
          outlineOffset: 1,
          transition: 'all 200ms ease',
        }} />
      ))}
    </div>
    {tint && (
      <div style={{
        position: 'absolute', inset: 0, background: tint,
        pointerEvents: 'none', transition: 'background 300ms',
      }} />
    )}
  </div>
)

// ── Overlay text ──────────────────────────────────────────────
const Overlay: React.FC<{ text: string; sub?: string; color: string }> = ({ text, sub, color }) => (
  <div style={{
    marginTop: 10, background: INK, color,
    border: `3px solid ${color}`, boxShadow: `4px 4px 0 ${color}`,
    padding: '10px 18px', textAlign: 'center',
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1.2,
  }}>
    {text}
    {sub && <div style={{ fontSize: 10, letterSpacing: '0.1em', marginTop: 4, opacity: 0.85 }}>{sub}</div>}
  </div>
)

// ── Phase runner hook ─────────────────────────────────────────
// Cycles through phases with given durations (ms). Returns current phase.
function usePhase(durations: number[]): number {
  const [phase, setPhase] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef(0)

  useEffect(() => {
    phaseRef.current = 0
    setPhase(0)

    const schedule = () => {
      const current = phaseRef.current
      timerRef.current = setTimeout(() => {
        const next = (current + 1) % durations.length
        phaseRef.current = next
        setPhase(next)
        schedule()
      }, durations[current])
    }

    schedule()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return phase
}

// ── Bomb demo ─────────────────────────────────────────────────
// phases: 0=idle 1=target 2=flash 3=clear 4=score 5=hold
const BOMB_DURATIONS = [900, 700, 450, 400, 1100, 400]

const BombDemo: React.FC = () => {
  const phase = usePhase(BOMB_DURATIONS)
  const cells = getBombCells(Math.min(phase, 3))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <MiniGrid cells={cells} />
      {phase === 0 && <Overlay text="TAP ANY CELL" color={YELLOW} />}
      {phase === 4 && <Overlay text="+480 PTS" sub="BOMB COMBO ×1.5!" color={RED} />}
    </div>
  )
}

// ── Shield demo ───────────────────────────────────────────────
// phases: 0=normal 1=danger 2=flash-cols 3=clear-cols 4=saved 5=hold
const SHIELD_DURATIONS = [700, 800, 600, 450, 1100, 400]
const SHIELD_COLS = [1, 4, 7]  // 3 most-filled cols to clear

const ShieldDemo: React.FC = () => {
  const phase = usePhase(SHIELD_DURATIONS)
  const tint  = phase === 1 ? 'rgba(255,59,59,0.25)' : undefined
  const cells = getShieldCells(Math.min(phase, 3), SHIELD_COLS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <MiniGrid cells={cells} tint={tint} />
      {phase === 1 && <Overlay text="GAME OVER?" color={RED} />}
      {phase === 4 && <Overlay text="🛡️ SAVED!" sub="3 COLUMNS CLEARED · COMBO KEPT" color={BLUE} />}
    </div>
  )
}

// ── Score Boost demo ──────────────────────────────────────────
// phases: 0=normal 1=activating 2=boosted 3=result 4=hold
const BOOST_DURATIONS = [900, 700, 1000, 800, 500]

const SCORE_ROWS = [
  { label: 'L-PIECE  (5 cells)', base: 25 },
  { label: 'T-PIECE  (4 cells)', base: 16 },
  { label: 'LINE     (5 cells)', base: 25 },
  { label: 'COMBO ×2 BONUS',     base: 62 },
]

const BoostDemo: React.FC = () => {
  const phase   = usePhase(BOOST_DURATIONS)
  const active  = phase >= 2
  const total   = SCORE_ROWS.reduce((s, r) => s + r.base, 0)

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: active ? YELLOW : '#222', color: active ? INK : '#aaa',
        border: `3px solid ${INK}`, padding: '8px 14px', marginBottom: 8,
        transition: 'all 300ms', boxShadow: active ? `3px 3px 0 ${INK}` : 'none',
      }}>
        <span style={{ fontSize: 12, letterSpacing: '0.1em' }}>
          {phase === 0 ? '⚡ SCORE BOOST' : phase === 1 ? '⚡ ACTIVATING...' : '⚡ BOOST ACTIVE'}
        </span>
        <span style={{ fontSize: 20 }}>{active ? '×2' : '×1'}</span>
      </div>

      {SCORE_ROWS.map(row => (
        <div key={row.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 10px', marginBottom: 3,
          background: PAPER, border: `2px solid ${INK}`,
        }}>
          <span style={{ fontSize: 9, letterSpacing: '0.06em', opacity: 0.65 }}>{row.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {active && (
              <span style={{ fontSize: 9, opacity: 0.45, textDecoration: 'line-through' }}>
                +{row.base}
              </span>
            )}
            <span style={{
              fontSize: active ? 16 : 13, letterSpacing: '-0.02em',
              color: active ? RED : INK, transition: 'all 250ms',
            }}>
              +{active ? row.base * 2 : row.base}
            </span>
          </div>
        </div>
      ))}

      {phase >= 3 && (
        <div style={{
          marginTop: 8, background: YELLOW, color: INK,
          border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
          padding: '8px 14px', textAlign: 'center', fontSize: 13, letterSpacing: '0.06em',
        }}>
          +{total} pts → <strong>+{total * 2} pts</strong> &nbsp;THIS GAME
        </div>
      )}
    </div>
  )
}

// ── Rotate Pass demo ──────────────────────────────────────────
// phases: 0=before 1=rotating 2=after 3=result 4=hold
const ROTATE_DURATIONS = [1000, 700, 700, 900, 500]

// L-piece cells [row, col] in different orientations
const L_NORMAL  = [[0,0],[1,0],[2,0],[2,1]] as const
const L_ROTATED = [[0,0],[0,1],[0,2],[1,0]] as const
// The gap on the board that the ROTATED piece fits into
const GAP_CELLS = [[0,0],[0,1],[0,2],[1,0]] as const  // same shape as rotated L

const RotateDemo: React.FC = () => {
  const phase    = usePhase(ROTATE_DURATIONS)
  const isRot    = phase >= 2
  const cells    = isRot ? L_ROTATED : L_NORMAL
  const pieceClr = phase >= 3 ? LIME : CYAN

  const ROWS = 4, COLS = 3

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 20, marginBottom: 10 }}>
        {/* Board gap */}
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.5, marginBottom: 4, textAlign: 'center' }}>
            GAP ON BOARD
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gap: 2 }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS), col = i % COLS
              const isGap = GAP_CELLS.some(([gr, gc]) => gr === r && gc === col)
              return (
                <div key={i} style={{
                  width: 30, height: 30, border: `2px solid ${INK}`,
                  background: isGap ? '#1e1e28' : ORANGE,
                  transition: 'background 200ms',
                }} />
              )
            })}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ paddingTop: 30, fontSize: 22, color: phase === 1 ? YELLOW : '#444', transition: 'color 300ms' }}>
          →
        </div>

        {/* Piece */}
        <div>
          <div style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.5, marginBottom: 4, textAlign: 'center' }}>
            {isRot ? 'ROTATED ✓' : 'YOUR PIECE'}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gap: 2,
            transform: phase === 1 ? 'rotate(15deg) scale(0.88)' : 'rotate(0deg) scale(1)',
            transition: 'transform 350ms ease',
          }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS), col = i % COLS
              const filled = cells.some(([pr, pc]) => pr === r && pc === col)
              return (
                <div key={i} style={{
                  width: 30, height: 30,
                  background: filled ? pieceClr : 'transparent',
                  border: filled ? `2px solid ${INK}` : 'none',
                  transition: 'background 200ms',
                }} />
              )
            })}
          </div>
        </div>
      </div>

      <div style={{
        textAlign: 'center', padding: '8px 14px',
        background: phase === 0 ? '#2a1111' : phase === 1 ? '#222' : LIME,
        color: phase === 0 ? RED : phase === 1 ? YELLOW : INK,
        border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
        fontSize: 12, letterSpacing: '0.08em', transition: 'all 250ms',
      }}>
        {phase === 0 ? "✗ DOESN'T FIT — ROTATE PASS NEEDED"
         : phase === 1 ? '↻ ROTATING...'
         : phase === 2 ? '✓ FITS NOW!'
         : '🎯 PERFECT PLACEMENT!'}
      </div>
    </div>
  )
}

// ── Revival demo ──────────────────────────────────────────────
// phases: 0=gameover 1=credits-appear 2=use-credit 3=continuing 4=scoring 5=hold
const REVIVAL_DURATIONS = [800, 700, 600, 700, 1200, 500]

const RevivalDemo: React.FC = () => {
  const phase = usePhase(REVIVAL_DURATIONS)
  const credits = phase <= 1 ? 3 : phase === 2 ? 2 : 2
  const score   = phase >= 4 ? 1790 : 1240

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: PAPER, border: `3px solid ${INK}`, padding: '10px 16px',
        boxShadow: `3px 3px 0 ${INK}`, marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.6 }}>YOUR SCORE</span>
        <span style={{ fontSize: 28, letterSpacing: '-0.03em', transition: 'all 200ms' }}>
          {score.toLocaleString()}
        </span>
      </div>

      {phase === 0 && (
        <div style={{
          background: RED, color: '#fff', border: `3px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`, padding: '14px',
          textAlign: 'center', fontSize: 22, letterSpacing: '-0.01em',
        }}>
          GAME OVER
          <div style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.8, marginTop: 4 }}>
            SCORE WOULD BE LOST
          </div>
        </div>
      )}

      {(phase === 1 || phase === 2) && (
        <div style={{
          background: INK, color: CYAN, border: `3px solid ${CYAN}`,
          boxShadow: `4px 4px 0 ${CYAN}`, padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', marginBottom: 8 }}>REVIVAL CREDITS</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {Array.from({ length: 3 }, (_, n) => (
              <div key={n} style={{
                width: 38, height: 38, background: n < credits ? CYAN : '#333',
                color: INK, border: `2px solid ${INK}`,
                display: 'grid', placeItems: 'center',
                fontSize: 18, transition: 'background 300ms',
              }}>↻</div>
            ))}
          </div>
        </div>
      )}

      {(phase === 3 || phase === 4 || phase === 5) && (
        <div style={{
          background: phase >= 4 ? LIME : YELLOW, color: INK,
          border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
          padding: '14px', textAlign: 'center',
          fontSize: phase >= 4 ? 14 : 18, letterSpacing: '0.04em',
          transition: 'all 200ms',
        }}>
          {phase === 3 ? '↻ CONTINUING YOUR RUN!' : '🎮 SCORE KEEPS CLIMBING!'}
          <div style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.7, marginTop: 4 }}>
            {phase === 3 ? `${credits} REVIVAL CREDITS REMAINING` : 'NEVER LOSE PROGRESS AGAIN'}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Demo map ──────────────────────────────────────────────────
const DEMOS: Record<DemoId, React.FC> = {
  bomb:          BombDemo,
  shield:        ShieldDemo,
  scoreBoost:    BoostDemo,
  rotatePass:    RotateDemo,
  revivalBundle: RevivalDemo,
}

// ── Main modal ────────────────────────────────────────────────
const PowerUpDemoModal: React.FC<PowerUpDemoModalProps> = ({ demoId, onClose, onBuy }) => {
  const cfg      = DEMO_CONFIG[demoId]
  const DemoView = DEMOS[demoId]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9200,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: PAPER,
          border: `4px solid ${INK}`,
          borderBottom: 'none',
          boxShadow: `0 -5px 0 ${cfg.accent}`,
          fontFamily: '"Archivo Black", sans-serif',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: INK, color: cfg.accent,
          padding: '12px 16px', borderBottom: `4px solid ${cfg.accent}`,
        }}>
          <div>
            <div style={{ fontSize: 14, letterSpacing: '0.06em' }}>{cfg.title}</div>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.65, marginTop: 2 }}>
              {cfg.tagline}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `2px solid ${cfg.accent}`,
            color: cfg.accent, width: 30, height: 30,
            fontFamily: '"Archivo Black", sans-serif', fontSize: 15,
            cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>×</button>
        </div>

        {/* Live loop label */}
        <div style={{
          textAlign: 'center', padding: '6px 0 2px',
          fontSize: 8, letterSpacing: '0.2em', opacity: 0.45,
        }}>
          ▶ LIVE DEMO — PLAYS ON LOOP
        </div>

        {/* Demo */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'center' }}>
          <DemoView />
        </div>

        {/* CTA buttons */}
        <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => { onBuy(); onClose() }}
            style={{
              background: cfg.accent, color: INK,
              border: `4px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
              padding: '13px 20px', width: '100%',
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >
            BUY NOW — ${cfg.price}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: INK,
              border: `3px solid ${INK}`,
              padding: '9px 20px', width: '100%',
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 10, letterSpacing: '0.12em',
              cursor: 'pointer', opacity: 0.55,
            }}
          >
            BACK TO SHOP
          </button>
        </div>
      </div>
    </div>
  )
}

export default PowerUpDemoModal
