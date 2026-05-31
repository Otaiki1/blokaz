import React, { useState } from 'react'
import { useStablecoinShop } from '../hooks/useStablecoinShop'
import { usePowerUpStore, POWER_UP_META, type PowerUpId } from '../stores/powerUpStore'
import { STABLECOIN_TOKENS, type StablecoinSymbol } from '../constants/contracts'
import { BrutalIcon } from './BrutalIcon'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
}

type ShopItemId = PowerUpId | 'revivalBundle'

const SHOP_ITEMS: ShopItemId[] = ['revivalBundle', 'scoreBoost', 'shield', 'bomb', 'rotatePass']

const TOKEN_LABELS: Record<StablecoinSymbol, string> = {
  USDC: 'USDC',
  USDT: 'USDT',
  USDm: 'USDm',
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
  const { balances, canAfford, hasAnyBalance, defaultToken, isPaying, error, purchase, shopCost } = useStablecoinShop()
  const { freeTries, inventory, getCharges } = usePowerUpStore()
  const [selectedToken, setSelectedToken] = useState<StablecoinSymbol>(defaultToken)
  const [buyingId, setBuyingId] = useState<ShopItemId | null>(null)
  const [successId, setSuccessId] = useState<ShopItemId | null>(null)

  if (!isOpen) return null

  const handleBuy = async (id: ShopItemId) => {
    if (isPaying || buyingId) return
    setBuyingId(id)
    const ok = await purchase(id, selectedToken)
    if (ok) {
      setSuccessId(id)
      setTimeout(() => setSuccessId(null), 2000)
    }
    setBuyingId(null)
  }

  const tokenList = Object.keys(STABLECOIN_TOKENS) as StablecoinSymbol[]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9001,
          overflowY: 'auto',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '12px 8px 32px',
          boxSizing: 'border-box',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(440px, calc(100vw - 16px))',
            background: 'var(--paper)',
            border: '4px solid var(--ink)',
            boxShadow: '8px 8px 0 var(--shadow)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--ink)',
              borderBottom: '4px solid var(--ink)',
            }}
          >
            <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, letterSpacing: '-0.03em', color: 'var(--paper)', lineHeight: 1 }}>
              🛒 BLOKAZ SHOP
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--paper)', border: '3px solid var(--paper)',
                color: 'var(--ink)', width: 36, height: 36,
                fontFamily: '"Archivo Black", sans-serif', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>

          {/* Token selector */}
          <div style={{ padding: '12px 16px 0', borderBottom: '3px solid var(--rule)' }}>
            <div style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-soft)', marginBottom: 8 }}>
              PAY WITH
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {tokenList.map(sym => {
                const bal = Number(balances[sym]) / 10 ** STABLECOIN_TOKENS[sym].decimals
                return (
                  <button
                    key={sym}
                    onClick={() => setSelectedToken(sym)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      border: `3px solid ${selectedToken === sym ? 'var(--ink)' : 'var(--rule)'}`,
                      background: selectedToken === sym ? 'var(--accent-yellow)' : 'var(--paper-2)',
                      cursor: 'pointer',
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: 'var(--ink)',
                    }}
                  >
                    <div>{TOKEN_LABELS[sym]}</div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>
                      {bal.toFixed(2)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Items */}
          <div style={{ padding: '4px 0 0' }}>
            {SHOP_ITEMS.map(id => {
              const meta = POWER_UP_META[id]
              const isBuying = buyingId === id
              const isSuccess = successId === id
              const affordable = canAfford(selectedToken)
              const charges = id === 'revivalBundle'
                ? inventory.revivalBundle
                : getCharges(id as PowerUpId)
              const freeTryCount = id !== 'revivalBundle' ? freeTries[id as PowerUpId] : 0
              const purchasedCount = id === 'revivalBundle' ? inventory.revivalBundle : inventory[id as PowerUpId]

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '14px 16px',
                    borderBottom: '3px solid var(--rule)',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2,
                    width: 36, textAlign: 'center',
                  }}>
                    {meta.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink)' }}>
                        {meta.label}
                      </span>
                      {freeTryCount > 0 && (
                        <span style={{
                          background: 'var(--accent-lime)', color: 'var(--ink-fixed)',
                          fontFamily: '"Archivo Black", sans-serif', fontSize: 8,
                          letterSpacing: '0.12em', padding: '2px 6px',
                          border: '2px solid var(--ink)',
                        }}>
                          {freeTryCount} FREE
                        </span>
                      )}
                      {purchasedCount > 0 && (
                        <span style={{
                          background: 'var(--accent-cyan)', color: 'var(--ink-fixed)',
                          fontFamily: '"Archivo Black", sans-serif', fontSize: 8,
                          letterSpacing: '0.12em', padding: '2px 6px',
                          border: '2px solid var(--ink)',
                        }}>
                          {purchasedCount} OWNED
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 600,
                      color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 4,
                    }}>
                      {meta.description}
                    </div>
                  </div>

                  {/* Buy button */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <button
                      onClick={() => handleBuy(id)}
                      disabled={!affordable || !!buyingId}
                      style={{
                        background: isSuccess ? 'var(--accent-lime)' : 'var(--accent-yellow)',
                        border: '3px solid var(--ink)',
                        boxShadow: '3px 3px 0 var(--shadow)',
                        color: 'var(--ink-fixed)',
                        padding: '8px 12px',
                        fontFamily: '"Archivo Black", sans-serif',
                        fontSize: 10, letterSpacing: '0.12em',
                        cursor: affordable && !buyingId ? 'pointer' : 'not-allowed',
                        opacity: !affordable ? 0.45 : 1,
                        minWidth: 64,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      {isSuccess ? (
                        <><BrutalIcon name="check" size={12} strokeWidth={3} /> DONE</>
                      ) : isBuying ? (
                        <div className="brutal-loader" />
                      ) : (
                        <>$0.10</>
                      )}
                    </button>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, fontWeight: 600,
                      color: 'var(--ink-soft)', marginTop: 4, letterSpacing: '0.04em',
                    }}>
                      {TOKEN_LABELS[selectedToken]}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 16px', background: 'rgba(229,62,62,0.1)', borderTop: '3px solid var(--danger)' }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--danger)' }}>
                {error}
              </div>
            </div>
          )}

          {/* No balance warning */}
          {!hasAnyBalance && (
            <div style={{
              padding: '10px 16px', borderTop: '3px solid var(--rule)',
              fontFamily: '"Archivo Black", sans-serif', fontSize: 9,
              letterSpacing: '0.12em', color: 'var(--ink-soft)', textAlign: 'center',
            }}>
              DEPOSIT FUNDS IN MINIPAY TO PURCHASE
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            background: 'var(--paper-2)',
            borderTop: '3px solid var(--rule)',
            fontFamily: '"Archivo Black", sans-serif', fontSize: 8,
            letterSpacing: '0.14em', color: 'var(--ink-soft)', textAlign: 'center',
          }}>
            ALL SALES FINAL · ITEMS STORED LOCALLY
          </div>
        </div>
      </div>
    </>
  )
}

export default ShopModal
