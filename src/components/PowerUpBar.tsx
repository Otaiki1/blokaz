import React from 'react'
import { usePowerUpStore, type PowerUpId } from '../stores/powerUpStore'
import { useGameStore } from '../stores/gameStore'

interface PowerUpBarProps {
  onOpenShop: () => void
  rotatePassEnabled: boolean
  onRotatePiece: (pieceIndex: number) => void
  activePieceIndex: number | null
}

interface SlotProps {
  icon: string
  label: string
  charges: number
  isActive: boolean
  disabled: boolean
  onClick: () => void
  onOpenShop: () => void
}

const Slot: React.FC<SlotProps> = ({ icon, label, charges, isActive, disabled, onClick, onOpenShop }) => {
  const hasCharges = charges > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 44 }}>
      <button
        onClick={hasCharges ? onClick : onOpenShop}
        disabled={disabled}
        style={{
          position: 'relative',
          width: 44, height: 44,
          border: `3px solid ${isActive ? 'var(--accent-yellow)' : 'var(--ink)'}`,
          background: isActive
            ? 'var(--accent-yellow)'
            : hasCharges
              ? 'var(--paper)'
              : 'var(--paper-2)',
          boxShadow: isActive
            ? '0 0 0 2px var(--ink), 3px 3px 0 var(--shadow)'
            : '3px 3px 0 var(--shadow)',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, lineHeight: 1,
          touchAction: 'manipulation',
        }}
      >
        {icon}
        {charges > 0 && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: charges > 3 ? 'var(--accent-cyan)' : 'var(--accent-lime)',
            border: '2px solid var(--ink)',
            color: 'var(--ink-fixed)',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 8, lineHeight: 1,
            padding: '2px 4px',
            minWidth: 14, textAlign: 'center',
          }}>
            {charges}
          </span>
        )}
        {!hasCharges && (
          <span style={{
            position: 'absolute', top: -6, right: -6,
            background: 'var(--piece-red, #e53e3e)',
            border: '2px solid var(--ink)',
            color: '#fff',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 7, lineHeight: 1,
            padding: '2px 4px',
          }}>
            BUY
          </span>
        )}
      </button>
      <div style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: 7, letterSpacing: '0.1em',
        color: 'var(--ink-soft)',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 44,
      }}>
        {label}
      </div>
    </div>
  )
}

// Shown when Rotate Pass is active — lets the player pick which of the 3 pieces to rotate
const RotatePicker: React.FC<{
  onRotatePiece: (index: number) => void
  onCancel: () => void
}> = ({ onRotatePiece, onCancel }) => {
  const { currentPieces } = useGameStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => {
          const occupied = currentPieces[i] != null
          return (
            <button
              key={i}
              onClick={() => occupied && onRotatePiece(i)}
              disabled={!occupied}
              style={{
                width: 36, height: 44,
                border: '3px solid var(--ink)',
                background: occupied ? 'var(--accent-yellow)' : 'var(--paper-2)',
                boxShadow: occupied ? '3px 3px 0 var(--shadow)' : 'none',
                cursor: occupied ? 'pointer' : 'not-allowed',
                opacity: occupied ? 1 : 0.35,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 2,
                touchAction: 'manipulation',
              }}
            >
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 9, letterSpacing: '0.06em',
                color: 'var(--ink-fixed)',
              }}>
                {i + 1}
              </span>
            </button>
          )
        })}
        {/* Cancel button — closes picker without spending a charge */}
        <button
          onClick={onCancel}
          style={{
            width: 24, height: 44,
            border: '2px solid var(--ink)',
            background: 'var(--paper-2)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: 11, color: 'var(--ink-soft)',
            touchAction: 'manipulation',
          }}
        >
          ×
        </button>
      </div>
      <div style={{
        fontFamily: '"Archivo Black", sans-serif',
        fontSize: 7, letterSpacing: '0.1em',
        color: 'var(--ink-soft)',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        PICK PIECE
      </div>
    </div>
  )
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  onOpenShop,
  onRotatePiece,
}) => {
  const {
    getCharges,
    active,
    bombModeActive,
    activateScoreBoost,
    activateShield,
    activateBomb,
    activateRotatePass,
    exitBombMode,
    exitRotateMode,
  } = usePowerUpStore()

  const scoreBoostCharges = getCharges('scoreBoost')
  const shieldCharges = getCharges('shield')
  const bombCharges = getCharges('bomb')
  const rotatePassCharges = getCharges('rotatePass')

  const handleBomb = () => {
    if (bombModeActive) { exitBombMode(); return }
    if (active.bombCount > 0) {
      usePowerUpStore.getState().enterBombMode()
    } else {
      activateBomb()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--paper-2)',
        borderTop: '3px solid var(--ink)',
        borderBottom: '3px solid var(--ink)',
      }}
    >
      {/* Score Boost */}
      <Slot
        icon="⚡"
        label="BOOST"
        charges={scoreBoostCharges}
        isActive={active.scoreBoost}
        disabled={active.scoreBoost}
        onClick={activateScoreBoost}
        onOpenShop={onOpenShop}
      />

      {/* Shield */}
      <Slot
        icon="🛡️"
        label="SHIELD"
        charges={shieldCharges}
        isActive={active.shieldCount > 0}
        disabled={false}
        onClick={activateShield}
        onOpenShop={onOpenShop}
      />

      {/* Bomb */}
      <Slot
        icon="💣"
        label={bombModeActive ? 'TAP GRID' : 'BOMB'}
        charges={active.bombCount > 0 ? active.bombCount : bombCharges}
        isActive={bombModeActive}
        disabled={false}
        onClick={handleBomb}
        onOpenShop={onOpenShop}
      />

      {/* Rotate Pass — single activate button, or piece picker when active */}
      {active.rotatePassActive ? (
        <RotatePicker onRotatePiece={onRotatePiece} onCancel={exitRotateMode} />
      ) : (
        <Slot
          icon="🔄"
          label="SPIN"
          charges={rotatePassCharges}
          isActive={false}
          disabled={false}
          onClick={activateRotatePass}
          onOpenShop={onOpenShop}
        />
      )}

      {/* Shop button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 44 }}>
        <button
          onClick={onOpenShop}
          style={{
            width: 44, height: 44,
            border: '3px solid var(--ink)',
            background: 'var(--accent-yellow)',
            boxShadow: '3px 3px 0 var(--shadow)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, lineHeight: 1,
            touchAction: 'manipulation',
          }}
        >
          🛒
        </button>
        <div style={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: 7, letterSpacing: '0.1em',
          color: 'var(--ink-soft)',
          textTransform: 'uppercase', textAlign: 'center',
        }}>
          SHOP
        </div>
      </div>
    </div>
  )
}

export default PowerUpBar
