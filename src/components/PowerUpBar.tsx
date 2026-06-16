import React, { useState, useRef, useEffect } from 'react'
import { usePowerUpStore, type PowerUpId } from '../stores/powerUpStore'
import { useGameStore } from '../stores/gameStore'
import { hapticPowerUp } from '../miniapp/haptics'

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('pu-hint-style')) {
  const s = document.createElement('style')
  s.id = 'pu-hint-style'
  s.textContent = `
    @keyframes pu-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,213,31,0.85), 3px 3px 0 #0C0C10; }
      50%      { box-shadow: 0 0 0 7px rgba(255,213,31,0),  3px 3px 0 #0C0C10; }
    }
    @keyframes pu-pulse-shield {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.85), 3px 3px 0 #0C0C10; }
      50%      { box-shadow: 0 0 0 7px rgba(239,68,68,0),  3px 3px 0 #0C0C10; }
    }
    @keyframes pu-pulse-bomb {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,59,59,0.85), 3px 3px 0 #0C0C10; }
      50%      { box-shadow: 0 0 0 7px rgba(255,59,59,0),  3px 3px 0 #0C0C10; }
    }
    @keyframes pu-shop-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,59,59,0.9), 3px 3px 0 #FFD51F; }
      50%      { box-shadow: 0 0 0 8px rgba(255,59,59,0), 3px 3px 0 #FFD51F; }
    }
    @keyframes pu-empty-breathe {
      0%,100% { opacity: 0.55; }
      50%      { opacity: 1; }
    }
    @keyframes pu-press {
      0%   { transform: scale(1)    translateY(0px);  }
      22%  { transform: scale(0.86) translateY(2px);  }
      55%  { transform: scale(1.10) translateY(-1px); }
      78%  { transform: scale(0.97) translateY(0px);  }
      100% { transform: scale(1)    translateY(0px);  }
    }
    @keyframes pu-ring {
      0%   { opacity: 1; transform: scale(1);   }
      100% { opacity: 0; transform: scale(2.1); }
    }
    @keyframes pu-ring-outer {
      0%   { opacity: 0.7; transform: scale(1);   }
      100% { opacity: 0;   transform: scale(2.7); }
    }
  `
  document.head.appendChild(s)
}

interface PowerUpBarProps {
  onOpenShop: () => void
  onRotatePiece: (pieceIndex: number) => void
  activePieceIndex: number | null
}

// ── Design tokens ──────────────────────────────────────────────
const INK = '#0C0C10'
const PAPER = '#F5EFE3'
const LIME = '#B7FF3B'
const YELLOW = '#FFD51F'

const PBT = '4px solid #0C0C10'
const PB = '3px solid #0C0C10'
const PSH = (x = 5, y = 5, c = INK) => `${x}px ${y}px 0 ${c}`

// ── Piece palette per power-up ─────────────────────────────────
const PU_CONFIG = {
  scoreBoost:  { bg: '#FFD51F', fg: INK,   label: 'BOOST'  },
  shield:      { bg: '#3B82F6', fg: '#fff', label: 'SHIELD' },
  bomb:        { bg: '#FF3B3B', fg: '#fff', label: 'BOMB'   },
  rotatePass:  { bg: '#38BDF8', fg: INK,   label: 'SPIN'   },
} as const

// ── Crisp blocky SVG icons ─────────────────────────────────────
function IcoBoost({ c = INK }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill={c} stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function IcoShield({ c = INK }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" fill={c} stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 11.5 11 14l4-4.5" stroke={PAPER} strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
function IcoBomb({ c = INK }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <circle cx="11" cy="15" r="6.5" fill={c} />
      <path d="M15 9l2.5-2.5M18 5l1 1m-1-1 1-1m-1 1-1-1" stroke={c} strokeWidth="2" strokeLinecap="square" />
      <circle cx="9" cy="13" r="1.6" fill={PAPER} />
    </svg>
  )
}
function IcoSpin({ c = INK }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <path d="M20 12a8 8 0 1 1-2.3-5.6" stroke={c} strokeWidth="2.6" strokeLinecap="square" />
      <path d="M20 3.5V8h-4.5z" fill={c} />
    </svg>
  )
}
function IcoShop({ c = YELLOW }: { c?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      <path d="M5 8h14l-1 12H6L5 8Z" fill={c} />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke={c} strokeWidth="2.4" strokeLinecap="square" />
      <path d="M9.5 13h5" stroke={INK} strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

const ICONS: Record<string, (fg: string) => React.ReactNode> = {
  scoreBoost: (fg) => <IcoBoost c={fg} />,
  shield:     (fg) => <IcoShield c={fg} />,
  bomb:       (fg) => <IcoBomb c={fg} />,
  rotatePass: (fg) => <IcoSpin c={fg} />,
}

// ── Rotated count sticker — colour-coded by urgency ───────────
function CountSticker({ n }: { n: number }) {
  const bg    = n === 0 ? '#FF3B3B' : n === 1 ? '#FF8C00' : LIME
  const color = n === 0 || n === 1 ? '#fff' : INK
  return (
    <div style={{
      position: 'absolute', top: -10, right: -8,
      minWidth: 22, height: 22, padding: '0 5px',
      background: bg, color,
      border: '2.5px solid #0C0C10',
      display: 'grid', placeItems: 'center',
      transform: 'rotate(6deg)',
      fontFamily: '"Archivo Black", sans-serif',
      fontSize: 11,
      boxShadow: '1px 1px 0 #0C0C10',
      zIndex: 3,
    }}>
      {n}
    </div>
  )
}

// Pulse animation name per power-up id
const PULSE_ANIM: Record<string, string> = {
  scoreBoost: 'pu-pulse 0.9s ease-in-out infinite',
  shield:     'pu-pulse-shield 0.9s ease-in-out infinite',
  bomb:       'pu-pulse-bomb 0.9s ease-in-out infinite',
  rotatePass: 'pu-pulse 0.9s ease-in-out infinite',
}

// ── Single power-up tile ──────────────────────────────────────
function PowerTile({
  id, charges, isActive, isHighlighted, hintText, onClick, activated, activationKey,
}: {
  id: keyof typeof PU_CONFIG
  charges: number
  isActive: boolean
  isHighlighted?: boolean
  hintText?: string | null
  onClick: () => void
  activated?: boolean
  activationKey?: number
}) {
  const cfg      = PU_CONFIG[id]
  const depleted = charges === 0
  const isLow    = charges === 1

  // Visual state
  const tileBg    = isActive   ? INK
                  : depleted   ? '#1C1C22'   // near-black "drained" look
                  : cfg.bg
  const iconColor = isActive   ? cfg.bg
                  : depleted   ? '#555566'
                  : (cfg.fg === '#fff' ? '#fff' : INK)
  const border    = isHighlighted ? `4px solid ${YELLOW}`
                  : depleted      ? '4px solid #FF3B3B'
                  : isActive      ? `4px solid ${cfg.bg}`
                  : PBT

  // Only show text for contextual suggestions — sticker + border already signal empty/low
  const slotText  = isHighlighted && hintText ? hintText : null
  const slotColor = YELLOW

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      width: 54,
    }}>
      {/* ── Button + stickers ── */}
      <div style={{ position: 'relative' }}>
        {/* Activation ring bursts — two staggered rings */}
        {activated && (
          <>
            <div key={`r1-${activationKey}`} style={{
              position: 'absolute', inset: -1, pointerEvents: 'none', zIndex: 10,
              border: `3px solid ${cfg.bg}`,
              boxShadow: `0 0 8px ${cfg.bg}`,
              animation: 'pu-ring 0.52s ease-out forwards',
            }} />
            <div key={`r2-${activationKey}`} style={{
              position: 'absolute', inset: -1, pointerEvents: 'none', zIndex: 10,
              border: `2px solid ${cfg.bg}`,
              animation: 'pu-ring-outer 0.72s 0.08s ease-out forwards',
            }} />
          </>
        )}
        <button
          id={`pu-tile-${id}`}
          onClick={onClick}
          style={{
            width: 54, height: 54,
            background: tileBg,
            border,
            boxShadow: isHighlighted
              ? undefined
              : depleted
                ? 'none'
                : isActive ? PSH(3, 3, cfg.bg) : PSH(3, 3),
            animation: activated
              ? 'pu-press 0.40s ease-out'
              : isHighlighted ? PULSE_ANIM[id] : undefined,
            outline: 'none',
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            padding: 0,
            touchAction: 'manipulation',
            transition: activated || isHighlighted ? 'none' : 'background 100ms, border 100ms, box-shadow 100ms',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            width: 28, height: 28,
            opacity: depleted ? 0.25 : 1,
            filter: depleted ? 'grayscale(1)' : 'none',
          }}>
            {ICONS[id](iconColor)}
          </div>

          {/* Depleted overlay — cart icon signals "tap to refill" */}
          {depleted && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', placeItems: 'center',
              animation: 'pu-empty-breathe 1.6s ease-in-out infinite',
            }}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none">
                <path d="M5 8h14l-1 12H6L5 8Z" fill="#FF3B3B" />
                <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="#FF3B3B" strokeWidth="2.4" strokeLinecap="square" />
                <path d="M9.5 13h5" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
              </svg>
            </div>
          )}
        </button>
        <CountSticker n={charges} />
      </div>

      {/* ── Power-up name ── */}
      <span style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: 10, letterSpacing: '0.1em',
        color: isHighlighted ? YELLOW
             : depleted       ? '#666677'
             : 'var(--ink)',
        lineHeight: 1, textAlign: 'center',
      }}>
        {cfg.label}
      </span>

      {/* ── Contextual hint — only rendered when a suggestion is active ── */}
      {slotText && (
        <span style={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: 7.5, letterSpacing: '0.08em',
          color: slotColor, lineHeight: 1, textAlign: 'center',
          background: INK, padding: '2px 4px', whiteSpace: 'nowrap',
        }}>
          {slotText}
        </span>
      )}
    </div>
  )
}

// ── Shop tile ──────────────────────────────────────────────────
function ShopTile({ onClick, depletedCount }: { onClick: () => void; depletedCount: number }) {
  const urgent = depletedCount > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClick}
          style={{
            width: 54, height: 54,
            background: INK,
            border: urgent ? '4px solid #FF3B3B' : PBT,
            boxShadow: undefined,
            animation: urgent ? 'pu-shop-pulse 1s ease-in-out infinite' : undefined,
            display: 'grid', placeItems: 'center',
            cursor: 'pointer',
            padding: 0,
            touchAction: 'manipulation',
          }}
        >
          <div style={{ width: 28, height: 28 }}>
            <IcoShop c={urgent ? '#FF3B3B' : YELLOW} />
          </div>
        </button>
        {/* Badge: number of depleted power-ups */}
        {urgent && (
          <div style={{
            position: 'absolute', top: -10, right: -8,
            minWidth: 22, height: 22, padding: '0 5px',
            background: '#FF3B3B', color: '#fff',
            border: '2.5px solid #0C0C10',
            display: 'grid', placeItems: 'center',
            transform: 'rotate(6deg)',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 11, boxShadow: '1px 1px 0 #0C0C10', zIndex: 3,
          }}>
            {depletedCount}
          </div>
        )}
      </div>
      <span style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: 10, letterSpacing: '0.1em',
        color: urgent ? '#FF3B3B' : 'var(--ink)', lineHeight: 1,
      }}>
        {urgent ? 'REFILL' : 'SHOP'}
      </span>
    </div>
  )
}

// ── Rotate piece picker (styled to match Direction A) ──────────
const RotatePicker: React.FC<{
  onRotatePiece: (index: number) => void
  onCancel: () => void
}> = ({ onRotatePiece, onCancel }) => {
  const { currentPieces } = useGameStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => {
          const occupied = currentPieces[i] != null
          return (
            <button
              key={i}
              onClick={() => occupied && onRotatePiece(i)}
              disabled={!occupied}
              style={{
                width: 40, height: 54,
                border: PBT,
                background: occupied ? '#38BDF8' : '#E7E0D2',
                boxShadow: occupied ? PSH(3, 3) : 'none',
                outline: occupied ? `3px solid ${LIME}` : 'none',
                outlineOffset: 3,
                cursor: occupied ? 'pointer' : 'not-allowed',
                opacity: occupied ? 1 : 0.35,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 3,
                touchAction: 'manipulation',
                padding: 0,
              }}
            >
              <div style={{ width: 20, height: 20 }}>
                <IcoSpin c={occupied ? INK : '#A8A095'} />
              </div>
              <span style={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 10, letterSpacing: '0.06em',
                color: occupied ? INK : '#A8A095',
              }}>
                {i + 1}
              </span>
            </button>
          )
        })}
        <button
          onClick={onCancel}
          style={{
            width: 26, height: 54,
            border: PB,
            background: '#E7E0D2',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 14, color: '#A8A095',
            touchAction: 'manipulation',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <span style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: 10, letterSpacing: '0.1em',
        color: 'var(--ink)', lineHeight: 1,
      }}>
        PICK PIECE
      </span>
    </div>
  )
}

// ── Power-Up Bar ───────────────────────────────────────────────
export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  onOpenShop,
  onRotatePiece,
}) => {
  // Track which tile is mid-activation animation
  const [activeAnim, setActiveAnim] = useState<{ id: string; key: number } | null>(null)
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fireAnim = (id: PowerUpId) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current)
    setActiveAnim(prev => ({ id, key: (prev?.key ?? 0) + 1 }))
    animTimerRef.current = setTimeout(() => setActiveAnim(null), 750)
    hapticPowerUp(id)
    window.dispatchEvent(new CustomEvent('pu-activated', { detail: { type: id } }))
  }

  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }, [])

  const {
    getCharges,
    active,
    bombModeActive,
    activateScoreBoost,
    activateShield,
    activateBomb,
    activateRotatePass,
    enterBombMode,
    exitBombMode,
    exitRotateMode,
  } = usePowerUpStore()

  const { gameSession, comboStreak } = useGameStore()

  const scoreBoostCharges = getCharges('scoreBoost')
  const shieldCharges     = getCharges('shield')
  const bombCharges       = getCharges('bomb')
  const rotatePassCharges = getCharges('rotatePass')

  // Grid fill % — recomputed each render (store triggers re-render on each move)
  const gridFill = gameSession
    ? Array.from(gameSession.grid).filter((v) => v !== 0).length / 81
    : 0

  // Contextual suggestion: which power-up should the player use right now?
  let suggestedId: PowerUpId | null = null
  let hintText: string | null = null
  if (comboStreak >= 3 && !active.scoreBoost && scoreBoostCharges > 0) {
    suggestedId = 'scoreBoost'
    hintText    = `×${comboStreak} COMBO!`
  } else if (gridFill >= 0.65 && bombCharges > 0 && active.bombCount === 0 && !bombModeActive) {
    suggestedId = 'bomb'
    hintText    = 'BOARD FULL'
  } else if (gridFill >= 0.75 && shieldCharges > 0 && active.shieldCount === 0) {
    suggestedId = 'shield'
    hintText    = 'DANGER!'
  }

  // Always show pool charges — the armed bomb already deducted its charge on activation

  const handleTileClick = (id: PowerUpId) => {
    const charges = getCharges(id)
    if (charges === 0) { onOpenShop?.(); return }
    switch (id) {
      case 'scoreBoost':
        if (!active.scoreBoost) { activateScoreBoost(); fireAnim(id) }
        break
      case 'shield':
        activateShield(); fireAnim(id)
        break
      case 'bomb':
        if (bombModeActive) exitBombMode()
        else if (active.bombCount > 0) { enterBombMode(); fireAnim(id) }
        else { activateBomb(); fireAnim(id) }
        break
      case 'rotatePass':
        if (!active.rotatePassActive) { activateRotatePass(); fireAnim(id) }
        break
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: '10px 14px 6px',
      overflow: 'visible',
    }}>
      {/* Power-up tiles */}
      <div style={{ display: 'flex', gap: 10, overflow: 'visible' }}>
        {/* Score Boost */}
        <PowerTile
          id="scoreBoost"
          charges={scoreBoostCharges}
          isActive={active.scoreBoost}
          isHighlighted={suggestedId === 'scoreBoost'}
          hintText={suggestedId === 'scoreBoost' ? hintText : null}
          onClick={() => handleTileClick('scoreBoost')}
          activated={activeAnim?.id === 'scoreBoost'}
          activationKey={activeAnim?.key}
        />

        {/* Shield */}
        <PowerTile
          id="shield"
          charges={shieldCharges}
          isActive={active.shieldCount > 0}
          isHighlighted={suggestedId === 'shield'}
          hintText={suggestedId === 'shield' ? hintText : null}
          onClick={() => handleTileClick('shield')}
          activated={activeAnim?.id === 'shield'}
          activationKey={activeAnim?.key}
        />

        {/* Bomb */}
        <PowerTile
          id="bomb"
          charges={bombCharges}
          isActive={bombModeActive || active.bombCount > 0}
          isHighlighted={suggestedId === 'bomb'}
          hintText={suggestedId === 'bomb' ? hintText : null}
          onClick={() => handleTileClick('bomb')}
          activated={activeAnim?.id === 'bomb'}
          activationKey={activeAnim?.key}
        />

        {/* Rotate Pass — tile OR picker when active */}
        {active.rotatePassActive ? (
          <RotatePicker
            onRotatePiece={onRotatePiece}
            onCancel={exitRotateMode}
          />
        ) : (
          <PowerTile
            id="rotatePass"
            charges={rotatePassCharges}
            isActive={false}
            onClick={() => handleTileClick('rotatePass')}
            activated={activeAnim?.id === 'rotatePass'}
            activationKey={activeAnim?.key}
          />
        )}
      </div>

      {/* Divider + SHOP — only shown when shop is available */}
      {onOpenShop && (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
          <div style={{
            width: 3,
            background: 'var(--rule)',
            margin: '2px 0 18px',
            alignSelf: 'stretch',
          }} />
          <ShopTile
            onClick={onOpenShop}
            depletedCount={[scoreBoostCharges, shieldCharges, bombCharges, rotatePassCharges].filter(c => c === 0).length}
          />
        </div>
      )}
    </div>
  )
}

export default PowerUpBar
