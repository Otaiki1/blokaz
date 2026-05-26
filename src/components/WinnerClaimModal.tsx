import React, { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

const TELEGRAM_URL = 'https://t.me/tweetlegg'

// Only these addresses see the claim modal
const WINNER_ADDRESSES = [
  '0x58F6a6313a6e15edFfeC43476e656c1dD72D97De',
  '0x3cF57423474f10292F43Ea937D6bc53dEBA03741',
  '0xE2900Fdc2F717eAA7E24b5B6AD277C1217e3562F',
].map(a => a.toLowerCase())

// sessionStorage so it reappears on every new app open but not on every navigation
const SESSION_KEY = 'blokaz:winner_claim_shown'

function isWinner(address: string | undefined): boolean {
  if (!address) return false
  return WINNER_ADDRESSES.includes(address.toLowerCase())
}

const WinnerClaimModal: React.FC = () => {
  const { address } = useAccount()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isWinner(address)) return
    if (sessionStorage.getItem(SESSION_KEY)) return

    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1')
      setOpen(true)
      requestAnimationFrame(() => setVisible(true))
    }, 1800)

    return () => clearTimeout(t)
  }, [address])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => setOpen(false), 260)
  }

  const handleClaim = () => {
    window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')
    handleDismiss()
  }

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes wcm-pop {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wcm-shine {
          0%   { transform: translateX(-100%) rotate(20deg); }
          100% { transform: translateX(300%) rotate(20deg); }
        }
        @keyframes wcm-trophy {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50%       { transform: translateY(-6px) rotate(3deg); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9100,
          background: 'rgba(12,12,16,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px 24px',
          boxSizing: 'border-box',
          opacity: visible ? 1 : 0,
          transition: 'opacity 220ms ease',
        }}
      >
        {/* Sunburst bg */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          background: `conic-gradient(from 0deg at 50% 40%,
            #FFD51F 0deg 22.5deg, transparent 22.5deg 45deg,
            #FFD51F 45deg 67.5deg, transparent 67.5deg 90deg,
            #FFD51F 90deg 112.5deg, transparent 112.5deg 135deg,
            #FFD51F 135deg 157.5deg, transparent 157.5deg 180deg,
            #FFD51F 180deg 202.5deg, transparent 202.5deg 225deg,
            #FFD51F 225deg 247.5deg, transparent 247.5deg 270deg,
            #FFD51F 270deg 292.5deg, transparent 292.5deg 315deg,
            #FFD51F 315deg 337.5deg, transparent 337.5deg 360deg)`,
          pointerEvents: 'none',
        }} />

        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(400px, calc(100vw - 24px))',
            background: '#0C0C10',
            border: '4px solid #FFD51F',
            boxShadow: '10px 10px 0 #FFD51F',
            overflow: 'hidden',
            position: 'relative',
            animation: visible ? 'wcm-pop 300ms cubic-bezier(0.22,1,0.36,1) both' : 'none',
          }}
        >
          {/* Shine sweep */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%', left: '-50%',
              width: '60%', height: '200%',
              background: 'linear-gradient(90deg, transparent, rgba(255,213,31,0.08), transparent)',
              animation: 'wcm-shine 3.2s ease-in-out infinite',
            }} />
          </div>

          {/* Gold top bar */}
          <div style={{ height: 6, background: '#FFD51F' }} />

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 0',
          }}>
            <div style={{
              background: '#FFD51F',
              border: '2px solid #0C0C10',
              padding: '4px 12px',
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 9,
              letterSpacing: '0.2em',
              color: '#0C0C10',
              textTransform: 'uppercase',
            }}>
              🏆 YOU'RE A WINNER
            </div>

            <button
              onClick={handleDismiss}
              style={{
                background: 'rgba(255,213,31,0.1)',
                border: '2px solid rgba(255,213,31,0.3)',
                color: '#FFD51F',
                width: 32, height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1,
                touchAction: 'manipulation',
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 18px 20px' }}>
            {/* Trophy icon */}
            <div style={{
              fontSize: 56,
              textAlign: 'center',
              marginBottom: 14,
              animation: 'wcm-trophy 2.4s ease-in-out infinite',
              display: 'block',
            }}>
              🏆
            </div>

            {/* Headline */}
            <div style={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 'clamp(24px, 7vw, 32px)',
              letterSpacing: '-0.03em',
              lineHeight: 0.96,
              color: '#FFD51F',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 10,
            }}>
              CONGRATULATIONS!
            </div>

            {/* Subline */}
            <div style={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'rgba(255,213,31,0.7)',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: 16,
            }}>
              YOU ARE ONE OF THE TOP PLAYERS
            </div>

            {/* Body copy */}
            <p style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 'clamp(12px, 3.5vw, 14px)',
              fontWeight: 600,
              lineHeight: 1.6,
              color: 'rgba(245,239,227,0.82)',
              margin: '0 0 18px',
              textAlign: 'center',
            }}>
              You've earned a reward as part of the Blokaz monthly social campaign.
              Join our Telegram and contact us to claim your prize.
            </p>

            {/* Address display */}
            <div style={{
              background: 'rgba(255,213,31,0.08)',
              border: '2px solid rgba(255,213,31,0.25)',
              padding: '8px 12px',
              marginBottom: 18,
              fontFamily: '"Space Grotesk", monospace',
              fontSize: 11,
              color: 'rgba(255,213,31,0.6)',
              textAlign: 'center',
              wordBreak: 'break-all',
              letterSpacing: '0.04em',
            }}>
              {address}
            </div>

            {/* Primary CTA — Telegram */}
            <button
              onClick={handleClaim}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                boxSizing: 'border-box',
                background: '#229ED9',
                border: '4px solid #FFD51F',
                boxShadow: '4px 4px 0 #FFD51F',
                padding: 'clamp(12px, 3vw, 14px) 16px',
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 'clamp(11px, 3vw, 13px)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                cursor: 'pointer',
                marginBottom: 10,
                touchAction: 'manipulation',
              }}
            >
              <span>JOIN TELEGRAM TO CLAIM</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              style={{
                display: 'block',
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '10px 8px',
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(245,239,227,0.4)',
                cursor: 'pointer',
                textAlign: 'center',
                touchAction: 'manipulation',
              }}
            >
              I'LL CLAIM LATER
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default WinnerClaimModal
