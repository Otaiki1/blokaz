import React, { useState } from 'react'
import type { Reward } from '../hooks/useRewards'

interface ClaimedEntry {
  cashLinkUrl: string
}

interface Props {
  rewards: Reward[]
  claiming: string | null
  claimedLinks: Record<string, ClaimedEntry>
  claimError: string | null
  onClaim: (reward: Reward) => void
  onClose: () => void
}

const RewardsClaimModal: React.FC<Props> = ({
  rewards,
  claiming,
  claimedLinks,
  claimError,
  onClaim,
  onClose,
}) => {
  const anyClaimed = Object.keys(claimedLinks).length > 0
  const step = anyClaimed ? 2 : 1

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 28,
        background: '#0f1200',
        backgroundImage: `repeating-conic-gradient(
          from 0deg at 50% 38%,
          rgba(160,130,0,0.18) 0deg 9deg,
          transparent 9deg 18deg
        )`,
      }}
    >
      <div style={{ width: '100%', maxWidth: 480, padding: '0 16px' }}>
        {/* Card */}
        <div
          style={{
            border: '4px solid #f5c518',
            background: '#181a00',
            padding: 20,
            boxShadow: '6px 6px 0 #f5c518',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🏆</span>
                <span style={{
                  fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#f5c518',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}>
                  YOU'RE A WINNER
                </span>
              </div>
              <div style={{
                marginTop: 3,
                paddingLeft: 30,
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
              }}>
                {rewards.length} unclaimed reward{rewards.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                border: '2px solid #f5c518',
                background: '#f5c518',
                color: '#111',
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 13,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { n: 1, label: 'Click CLAIM NOW' },
              { n: 2, label: 'Come back and confirm' },
            ].map(s => (
              <div
                key={s.n}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${step === s.n ? 'rgba(245,197,24,0.35)' : 'rgba(255,255,255,0.07)'}`,
                  padding: '10px 12px',
                  textAlign: 'center' as const,
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                  fontSize: 10,
                  fontWeight: 900,
                  color: step === s.n
                    ? (s.n === 2 ? '#4ade80' : '#f5c518')
                    : 'rgba(255,255,255,0.25)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.12em',
                  marginBottom: 3,
                }}>
                  STEP {s.n}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                  fontSize: 11,
                  color: step === s.n ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)',
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Reward cards */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 14 }}>
            {rewards.map(reward => {
              const claimed = claimedLinks[reward.id]
              return (
                <div
                  key={reward.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    padding: 16,
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                    fontSize: 10,
                    color: '#f5c518',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.16em',
                    marginBottom: 6,
                  }}>
                    {reward.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                    fontSize: 44,
                    color: '#fff',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginBottom: 16,
                  }}>
                    {reward.amount}{' '}
                    <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.45)' }}>
                      {reward.token.toLowerCase()}
                    </span>
                  </div>

                  {claimed ? (
                    <button
                      onClick={() => { window.location.href = claimed.cashLinkUrl }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: '#4ade80',
                        color: '#111',
                        border: 'none',
                        padding: '14px 18px',
                        fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                        fontSize: 13,
                        fontWeight: 900,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        boxSizing: 'border-box' as const,
                      }}
                    >
                      <span>OPEN CASH LINK</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onClaim(reward)}
                      disabled={!!claiming}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: claiming === reward.id ? 'rgba(245,197,24,0.45)' : '#f5c518',
                        color: '#111',
                        border: 'none',
                        padding: '14px 18px',
                        fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                        fontSize: 13,
                        fontWeight: 900,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.1em',
                        cursor: claiming ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>{claiming === reward.id ? 'CLAIMING...' : 'CLAIM NOW'}</span>
                      {claiming !== reward.id && <span>→</span>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {claimError && (
            <div style={{
              marginBottom: 12,
              padding: '14px 16px',
              border: '3px solid #ff4444',
              background: '#ff4444',
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 12,
              color: '#fff',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              fontWeight: 900,
            }}>
              ⚠ {claimError}
            </div>
          )}

          {/* Claim later */}
          <div style={{ textAlign: 'center' as const }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.28)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.16em',
                padding: '6px 0',
              }}
            >
              I'LL CLAIM LATER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RewardsClaimModal
