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
const PAPER2 = '#EDE8DA'
const YELLOW = '#FFD51F'
const LIME   = '#B7FF3B'
const CYAN   = '#38BDF8'
const RED    = '#FF3B3B'
const BLUE   = '#3B82F6'
const ORANGE = '#FB923C'
const PURPLE = '#A855F7'

const PIECE_COLORS = [BLUE, RED, LIME, YELLOW, CYAN, ORANGE, PURPLE]

// ── Demo config ───────────────────────────────────────────────
const DEMO_CONFIG: Record<DemoId, { title: string; accent: string; tagline: string; price: string }> = {
  bomb:          { title: 'BOMB IN ACTION',        accent: RED,    tagline: 'Wipes the busiest row + column in one tap.',           price: '0.10' },
  shield:        { title: 'SHIELD IN ACTION',      accent: BLUE,   tagline: 'Auto-saves you from game-over. Clears 3 columns.',     price: '0.10' },
  scoreBoost:    { title: 'SCORE BOOST IN ACTION', accent: YELLOW, tagline: 'Every piece scores ×2 for the whole game.',            price: '0.10' },
  rotatePass:    { title: 'ROTATE PASS IN ACTION', accent: ORANGE, tagline: 'Rotate any piece to unlock impossible placements.',     price: '0.10' },
  revivalBundle: { title: 'REVIVAL BUNDLE',        accent: CYAN,   tagline: 'Continue a run without losing your score — ever.',     price: '0.10' },
}

// ── Grid cell types ────────────────────────────────────────────
type CellState = 'normal' | 'highlight' | 'flash' | 'cleared'
interface Cell { color: string | null; state: CellState }

const EMPTY: Cell = { color: null, state: 'normal' }
const c = (idx: number): Cell => ({ color: PIECE_COLORS[(idx - 1) % PIECE_COLORS.length], state: 'normal' })

// ── Bomb grid: row 4 and col 4 both fully packed ──────────────
// Makes the blast impact obvious — the bomb clears 17 cells in one tap.
const BOMB_BASE: Cell[] = [
  c(1), c(2), EMPTY, c(3), c(5), EMPTY, c(1), c(2), EMPTY, // row 0
  c(3), EMPTY, c(4), c(1), c(6), c(2), c(3), EMPTY, c(4),  // row 1
  EMPTY, c(5), c(1), EMPTY, c(3), c(1), EMPTY, c(2), c(3), // row 2
  c(4), c(1), EMPTY, c(2), c(4), c(3), c(1), EMPTY, c(4),  // row 3
  c(2), c(6), c(3), c(5), c(7), c(4), c(2), c(7), c(1),   // row 4 ← TARGET ROW (9/9)
  c(1), c(3), EMPTY, c(4), c(5), c(1), c(3), EMPTY, c(2),  // row 5
  EMPTY, c(2), c(4), EMPTY, c(1), EMPTY, c(4), c(2), EMPTY, // row 6
  c(3), EMPTY, c(1), c(2), c(6), c(3), EMPTY, c(1), c(2),  // row 7
  c(1), c(4), EMPTY, c(3), c(2), EMPTY, c(4), c(1), c(3),  // row 8
]
// col 4: c(5),c(6),c(3),c(4),c(7),c(5),c(1),c(6),c(2) — fully packed top-to-bottom

// ── Shield grid: 90 % full, cols 2 / 5 / 7 are 100 % filled ──
// Shield targets the three densest columns.
const SHIELD_BASE: Cell[] = [
  c(1), c(2), c(4), c(3), EMPTY, c(6), c(1), c(5), c(3), // row 0
  c(3), EMPTY, c(1), c(4), c(6), c(2), c(3), c(7), c(5), // row 1
  EMPTY, c(5), c(3), EMPTY, c(1), c(4), c(2), c(2), c(1), // row 2
  c(2), c(3), c(6), c(4), c(2), c(7), c(7), c(4), c(2),  // row 3
  c(4), c(5), c(1), c(7), c(3), c(5), c(1), c(6), EMPTY, // row 4
  c(1), c(2), c(3), c(4), c(7), c(3), c(2), c(1), c(6),  // row 5
  c(3), c(4), c(4), c(2), c(3), c(6), EMPTY, c(3), c(3), // row 6
  c(2), EMPTY, c(6), c(1), c(4), c(1), c(7), c(7), c(4), // row 7
  c(7), c(1), c(2), c(3), c(6), c(4), c(2), c(3), c(7),  // row 8
]
const SHIELD_COLS = [2, 5, 7] // the three 9/9-filled columns

// ── Phase-based grid builders ─────────────────────────────────
const BOMB_ROW = 4
const BOMB_COL = 4

function getBombCells(phase: number): Cell[] {
  if (phase === 0) return BOMB_BASE
  // phase 1: highlight the full cross so the blast zone is unmistakable
  if (phase === 1) return BOMB_BASE.map((cell, i) => {
    const r = Math.floor(i / 9), col = i % 9
    if (r === BOMB_ROW || col === BOMB_COL) return { ...cell, state: 'highlight' }
    return cell
  })
  // phase 2: blast flash
  if (phase === 2) return BOMB_BASE.map((cell, i) => {
    const r = Math.floor(i / 9), col = i % 9
    return (r === BOMB_ROW || col === BOMB_COL) ? { ...cell, state: 'flash' } : cell
  })
  // phase 3+: cleared
  return BOMB_BASE.map((cell, i) => {
    const r = Math.floor(i / 9), col = i % 9
    return (r === BOMB_ROW || col === BOMB_COL) ? { color: null, state: 'cleared' } : cell
  })
}

function getShieldCells(phase: number): Cell[] {
  if (phase <= 1) return SHIELD_BASE
  // phase 2: target cols pulse blue
  if (phase === 2) return SHIELD_BASE.map((cell, i) =>
    SHIELD_COLS.includes(i % 9) ? { ...cell, state: 'highlight' } : cell
  )
  // phase 3: flash
  if (phase === 3) return SHIELD_BASE.map((cell, i) =>
    SHIELD_COLS.includes(i % 9) ? { ...cell, state: 'flash' } : cell
  )
  // phase 4+: cleared
  return SHIELD_BASE.map((cell, i) =>
    SHIELD_COLS.includes(i % 9) ? { color: null, state: 'cleared' } : cell
  )
}

// ── Mini grid ─────────────────────────────────────────────────
const MiniGrid: React.FC<{
  cells: Cell[]
  tint?: string
  hlColor?: string
  cs?: number
}> = ({ cells, tint, hlColor = RED, cs = 29 }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(9, ${cs}px)`,
      gap: 2, background: '#111', padding: 3,
      border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
    }}>
      {cells.map((cell, i) => (
        <div key={i} style={{
          width: cs, height: cs, borderRadius: 1,
          background:
            cell.state === 'flash'     ? '#fff' :
            cell.state === 'cleared'   ? 'transparent' :
            cell.state === 'highlight' ? hlColor :
            cell.color ?? '#1e1e28',
          opacity:   cell.state === 'cleared' ? 0 : cell.state === 'highlight' ? 0.78 : 1,
          transform: cell.state === 'cleared' ? 'scale(0)' : cell.state === 'flash' ? 'scale(1.06)' : 'scale(1)',
          outline:   cell.state === 'highlight' ? `2px solid ${hlColor}` : 'none',
          outlineOffset: -1,
          transition: 'all 180ms ease',
        }} />
      ))}
    </div>
    {tint && (
      <div style={{
        position: 'absolute', inset: 0, background: tint,
        pointerEvents: 'none', transition: 'background 260ms',
      }} />
    )}
  </div>
)

// ── Phase callout box ─────────────────────────────────────────
const CallOut: React.FC<{
  text: string; sub?: string; color: string; bg?: string
}> = ({ text, sub, color, bg = INK }) => (
  <div style={{
    marginTop: 10, background: bg, color,
    border: `3px solid ${color}`, boxShadow: `4px 4px 0 ${color}`,
    padding: '9px 16px', textAlign: 'center',
    fontFamily: '"Archivo Black", sans-serif',
    fontSize: 16, letterSpacing: '-0.01em', lineHeight: 1.2,
  }}>
    {text}
    {sub && (
      <div style={{ fontSize: 9, letterSpacing: '0.12em', marginTop: 4, opacity: 0.8 }}>{sub}</div>
    )}
  </div>
)

// ── Phase runner ──────────────────────────────────────────────
function usePhase(durations: number[]): number {
  const [phase, setPhase] = useState(0)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef  = useRef(0)

  useEffect(() => {
    phaseRef.current = 0
    setPhase(0)
    const schedule = () => {
      const cur = phaseRef.current
      timerRef.current = setTimeout(() => {
        const next = (cur + 1) % durations.length
        phaseRef.current = next
        setPhase(next)
        schedule()
      }, durations[cur])
    }
    schedule()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return phase
}

// ── Bomb demo ──────────────────────────────────────────────────
// 0=idle  1=cross targeted  2=blast  3=cleared  4=score  5=reset
const BOMB_DUR = [900, 800, 300, 450, 1300, 250]

const BombDemo: React.FC = () => {
  const phase = usePhase(BOMB_DUR)
  const cells = getBombCells(Math.min(phase, 3))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <MiniGrid cells={cells} hlColor="#F5A623" />

      {phase === 0 && (
        <CallOut
          text="TAP ANYWHERE TO BOMB"
          sub="ROW 4 + COL 4 — PACKED TIGHT"
          color={YELLOW}
        />
      )}
      {phase === 1 && (
        <CallOut
          text="✸ CROSS TARGETED"
          sub="1 ROW · 1 COL · 17 CELLS READY TO CLEAR"
          color="#F5A623"
        />
      )}
      {(phase === 2 || phase === 3) && (
        <CallOut
          text="💥 BOOM!"
          sub="ROW + COLUMN OBLITERATED"
          color={RED}
        />
      )}
      {phase === 4 && (
        <CallOut
          text="+360 PTS"
          sub="BOMB COMBO ×1.5 · 17 CELLS CLEARED"
          color={LIME}
          bg="#0a1a0a"
        />
      )}
    </div>
  )
}

// ── Shield demo ────────────────────────────────────────────────
// 0=normal 1=danger 2=cols targeted 3=cols flash 4=cols clear 5=saved 6=reset
const SHIELD_DUR = [700, 700, 500, 280, 420, 1300, 300]

const ShieldDemo: React.FC = () => {
  const phase = usePhase(SHIELD_DUR)
  const tint  = phase === 1 ? 'rgba(255,59,59,0.22)' : undefined
  const cells = getShieldCells(Math.min(phase, 4))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <MiniGrid cells={cells} tint={tint} hlColor={BLUE} />

      {phase === 0 && (
        <CallOut
          text="BOARD 90% FULL"
          sub="NEXT PIECE COULD END THE GAME"
          color={YELLOW}
        />
      )}
      {phase === 1 && (
        <CallOut
          text="⚠ GAME OVER?"
          sub="NO VALID PLACEMENTS LEFT"
          color={RED}
        />
      )}
      {(phase === 2 || phase === 3) && (
        <CallOut
          text="⛊ SHIELD ACTIVATED"
          sub="TARGETING 3 DENSEST COLUMNS"
          color={BLUE}
        />
      )}
      {phase === 4 && (
        <CallOut
          text="CLEARING 3 COLUMNS…"
          sub="COLS 2 · 5 · 7"
          color={CYAN}
        />
      )}
      {phase === 5 && (
        <CallOut
          text="🛡 SAVED!"
          sub="3 COLS CLEARED · COMBO KEPT · GAME CONTINUES"
          color={LIME}
          bg="#0a1a0a"
        />
      )}
    </div>
  )
}

// ── Score Boost demo ───────────────────────────────────────────
// 0=inactive 1=activating 2=boosted 3=total 4=hold
const BOOST_DUR = [950, 650, 1100, 900, 350]

const SCORE_ROWS = [
  { label: 'L-PIECE  (5 cells)', base: 25 },
  { label: 'S-PIECE  (4 cells)', base: 16 },
  { label: 'T-PIECE  (4 cells)', base: 16 },
  { label: 'LINE     (5 cells)', base: 25 },
  { label: 'COMBO ×2 BONUS',    base: 68 },
]

const BoostDemo: React.FC = () => {
  const phase  = usePhase(BOOST_DUR)
  const active = phase >= 2
  const total  = SCORE_ROWS.reduce((s, r) => s + r.base, 0)

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      {/* Multiplier banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: active ? YELLOW : '#1c1c22',
        color: active ? INK : '#666',
        border: `3px solid ${INK}`, padding: '8px 14px', marginBottom: 8,
        boxShadow: active ? `3px 3px 0 ${INK}` : 'none',
        transition: 'all 300ms',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em' }}>
            {phase === 0 ? '⚡ SCORE BOOST' : phase === 1 ? '⚡ ACTIVATING…' : '⚡ BOOST ACTIVE'}
          </div>
          {active && (
            <div style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.65, marginTop: 2 }}>
              EVERY PIECE THIS GAME
            </div>
          )}
        </div>
        <div style={{
          fontSize: 32, letterSpacing: '-0.04em', lineHeight: 1,
          transition: 'transform 250ms',
          transform: phase === 1 ? 'scale(1.25)' : 'scale(1)',
        }}>
          {active ? '×2' : '×1'}
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {SCORE_ROWS.map(row => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 10px',
            background: PAPER, border: `2px solid ${INK}`,
          }}>
            <span style={{
              fontFamily: 'Space Grotesk, system-ui', fontSize: 10,
              fontWeight: 700, opacity: 0.6,
            }}>
              {row.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {active && (
                <span style={{ fontSize: 10, opacity: 0.35, textDecoration: 'line-through' }}>
                  +{row.base}
                </span>
              )}
              <span style={{
                fontSize: active ? 17 : 13, fontWeight: 800,
                color: active ? RED : INK,
                transition: 'all 240ms',
                letterSpacing: '-0.02em',
              }}>
                +{active ? row.base * 2 : row.base}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Total comparison */}
      {phase >= 3 && (
        <div style={{
          marginTop: 8, display: 'flex', gap: 6,
          fontFamily: '"Archivo Black", sans-serif',
        }}>
          <div style={{
            flex: 1, background: PAPER2, color: INK, opacity: 0.55,
            border: `2px solid ${INK}`, padding: '7px 10px', textAlign: 'center',
            fontSize: 10, letterSpacing: '0.06em',
          }}>
            WITHOUT<br />
            <span style={{ fontSize: 18, letterSpacing: '-0.02em', opacity: 1 }}>+{total}</span>
          </div>
          <div style={{
            flex: 1, background: YELLOW, color: INK,
            border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
            padding: '7px 10px', textAlign: 'center',
            fontSize: 10, letterSpacing: '0.06em',
          }}>
            WITH BOOST<br />
            <span style={{ fontSize: 20, letterSpacing: '-0.02em' }}>+{total * 2}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rotate Pass demo ───────────────────────────────────────────
// Shows an L-piece that doesn't fit → rotated → snaps into the gap.
// 0=cant-fit 1=rotating 2=rotated 3=snapped 4=hold
const ROTATE_DUR = [1000, 650, 750, 1100, 400]

// Original L (4 cells occupying a 3×2 bounding box)
const L_ORIG: [number, number][]    = [[0,0],[1,0],[2,0],[2,1]]
// Rotated 90° CW (fits into the gap)
const L_ROTATED: [number, number][] = [[0,0],[0,1],[0,2],[1,0]]
// Gap on the board that the rotated piece fits
const GAP: [number, number][]       = [[0,0],[0,1],[0,2],[1,0]]

const RotateDemo: React.FC = () => {
  const phase   = usePhase(ROTATE_DUR)
  const isRot   = phase >= 2
  const snapped = phase >= 3
  const cells   = isRot ? L_ROTATED : L_ORIG
  const ROWS = 4, COLS = 3
  const CS = 36 // larger cells for clarity

  const pieceColor = snapped ? LIME : ORANGE

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        gap: 18, marginBottom: 10,
      }}>

        {/* Board gap */}
        <div>
          <div style={{
            fontSize: 7, letterSpacing: '0.14em', opacity: 0.45, marginBottom: 5,
            textAlign: 'center',
          }}>
            GAP ON BOARD
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(3, ${CS}px)`,
            gap: 2, background: '#111', padding: 2, border: `2px solid ${INK}`,
          }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS), col = i % COLS
              const isGap = GAP.some(([gr, gc]) => gr === r && gc === col)
              const isSnappedHere = snapped && isGap
              return (
                <div key={i} style={{
                  width: CS, height: CS, borderRadius: 1,
                  background: isSnappedHere ? pieceColor : isGap ? '#1e1e28' : BLUE,
                  border: isSnappedHere ? `2px solid ${INK}` : 'none',
                  transition: 'background 200ms',
                }} />
              )
            })}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ paddingTop: CS + 10, fontSize: 20, color: phase === 1 ? YELLOW : '#3a3a42', transition: 'color 300ms' }}>
          →
        </div>

        {/* Piece */}
        <div>
          <div style={{
            fontSize: 7, letterSpacing: '0.14em', opacity: 0.45, marginBottom: 5,
            textAlign: 'center',
          }}>
            {isRot ? 'ROTATED ✓' : 'YOUR PIECE'}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(3, ${CS}px)`,
            gap: 2, background: '#111', padding: 2, border: `2px solid ${INK}`,
            transform: phase === 1 ? 'rotate(18deg) scale(0.85)' : 'rotate(0deg) scale(1)',
            transition: 'transform 380ms cubic-bezier(0.34,1.56,0.64,1)',
            opacity: snapped ? 0.3 : 1,
          }}>
            {Array.from({ length: ROWS * COLS }, (_, i) => {
              const r = Math.floor(i / COLS), col = i % COLS
              const filled = cells.some(([pr, pc]) => pr === r && pc === col)
              return (
                <div key={i} style={{
                  width: CS, height: CS, borderRadius: 1,
                  background: filled ? pieceColor : 'transparent',
                  border: filled ? `2px solid ${INK}` : 'none',
                  transition: 'background 200ms',
                }} />
              )
            })}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        textAlign: 'center', padding: '8px 14px',
        background:
          phase === 0 ? '#1c0a0a' :
          phase === 1 ? '#1c1600' :
          snapped     ? '#0a1a0a' : '#0a1020',
        color:
          phase === 0 ? RED :
          phase === 1 ? YELLOW :
          snapped     ? LIME : CYAN,
        border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
        fontSize: 12, letterSpacing: '0.08em', transition: 'all 250ms',
        fontFamily: '"Archivo Black", sans-serif',
      }}>
        {phase === 0 && "✗ DOESN'T FIT — ROTATE PASS NEEDED"}
        {phase === 1 && '↻ ROTATING…'}
        {phase === 2 && '✓ FITS NOW!'}
        {phase >= 3 && '🎯 PERFECT PLACEMENT!'}
      </div>
    </div>
  )
}

// ── Revival Bundle demo ────────────────────────────────────────
// 0=gameover 1=credits-appear 2=use-credit 3=continuing 4=scoring 5=hold
const REVIVAL_DUR = [800, 700, 600, 750, 1300, 500]

const RevivalDemo: React.FC = () => {
  const phase   = usePhase(REVIVAL_DUR)
  const credits = phase <= 1 ? 3 : 2
  const score   = phase >= 4 ? 1790 : 1240

  return (
    <div style={{ fontFamily: '"Archivo Black", sans-serif', width: '100%' }}>
      {/* Score ticker */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: PAPER, border: `3px solid ${INK}`,
        padding: '10px 16px', boxShadow: `3px 3px 0 ${INK}`, marginBottom: 10,
      }}>
        <span style={{
          fontFamily: 'Space Grotesk, system-ui', fontWeight: 700,
          fontSize: 10, letterSpacing: '0.1em', opacity: 0.55,
        }}>
          YOUR SCORE
        </span>
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
          <div style={{
            fontFamily: 'Space Grotesk, system-ui', fontWeight: 700,
            fontSize: 10, letterSpacing: '0.12em', opacity: 0.8, marginTop: 4,
          }}>
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
          <div style={{ fontSize: 9, letterSpacing: '0.14em', marginBottom: 10 }}>
            REVIVAL CREDITS
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {Array.from({ length: 3 }, (_, n) => (
              <div key={n} style={{
                width: 40, height: 40,
                background: n < credits ? CYAN : '#2a2a32',
                color: INK, border: `2px solid ${INK}`,
                display: 'grid', placeItems: 'center',
                fontSize: 20, transition: 'background 300ms',
              }}>↻</div>
            ))}
          </div>
        </div>
      )}

      {phase >= 3 && (
        <div style={{
          background: phase >= 4 ? LIME : YELLOW, color: INK,
          border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
          padding: '14px', textAlign: 'center',
          fontSize: phase >= 4 ? 13 : 18, letterSpacing: '0.04em',
          transition: 'all 200ms',
        }}>
          {phase === 3 ? '↻ CONTINUING YOUR RUN!' : '🎮 SCORE KEEPS CLIMBING!'}
          <div style={{
            fontFamily: 'Space Grotesk, system-ui', fontWeight: 700,
            fontSize: 9, letterSpacing: '0.1em', opacity: 0.7, marginTop: 4,
          }}>
            {phase === 3 ? `${credits} REVIVAL CREDITS REMAINING` : 'NEVER LOSE PROGRESS AGAIN'}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Demo registry ─────────────────────────────────────────────
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
        background: 'rgba(0,0,0,0.82)',
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
          boxShadow: `0 -6px 0 ${cfg.accent}, 0 -10px 0 ${INK}`,
          fontFamily: '"Archivo Black", sans-serif',
          maxHeight: '92dvh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: INK, color: cfg.accent,
          padding: '12px 16px', borderBottom: `4px solid ${cfg.accent}`,
        }}>
          <div>
            <div style={{ fontSize: 15, letterSpacing: '0.04em' }}>{cfg.title}</div>
            <div style={{
              fontFamily: 'Space Grotesk, system-ui', fontWeight: 600,
              fontSize: 10, letterSpacing: '0.06em', opacity: 0.65, marginTop: 3,
            }}>
              {cfg.tagline}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `2px solid ${cfg.accent}`,
            color: cfg.accent, width: 30, height: 30,
            fontFamily: '"Archivo Black", sans-serif', fontSize: 15,
            cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>×</button>
        </div>

        {/* Loop label */}
        <div style={{
          textAlign: 'center', padding: '6px 0 2px',
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: 7, letterSpacing: '0.22em', opacity: 0.35,
        }}>
          ▶ LIVE DEMO — PLAYS ON LOOP
        </div>

        {/* Demo area */}
        <div style={{ padding: '8px 14px 4px', display: 'flex', justifyContent: 'center' }}>
          <DemoView />
        </div>

        {/* CTA */}
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
              cursor: 'pointer', opacity: 0.5,
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
