import React, { useState } from 'react'
import { useStablecoinShop } from '../hooks/useStablecoinShop'
import { usePowerUpStore, type PowerUpId } from '../stores/powerUpStore'
import { STABLECOIN_TOKENS, type StablecoinSymbol } from '../constants/contracts'

interface ShopModalProps {
  isOpen: boolean
  onClose: () => void
}

type ShopItemId = PowerUpId | 'revivalBundle'
type ShopTab = 'consumables' | 'bundles' | 'season'

// ── Design tokens ────────────────────────────────────────────
const INK    = '#0C0C10'
const PAPER  = '#F5EFE3'
const PAPER2 = '#EDE8DA'
const CYAN   = '#38BDF8'
const YELLOW = '#FFD51F'
const LIME   = '#B7FF3B'
const RED    = '#FF3B3B'
const BLUE   = '#3B82F6'
const ORANGE = '#FB923C'
const PURPLE = '#A855F7'

const SB  = '3px solid #0C0C10'
const SBT = '4px solid #0C0C10'
const SSH = (x = 6, y = 6, c = INK) => `${x}px ${y}px 0 ${c}`

interface ItemDesign {
  glyph: string
  bg: string
  name: string
  desc: string
  price: string
  tag?: string
  best?: boolean
}

interface BundleItem {
  id: ShopItemId
  qty: number
  glyph: string
  bg: string
}

interface BundleDef {
  id: string
  name: string
  desc: string
  priceCents: number
  accent: string
  saveBadge: string
  items: BundleItem[]
  best?: boolean
}

// ── Individual item designs ──────────────────────────────────
const ITEM_DESIGN: Record<string, ItemDesign> = {
  revivalBundle: {
    glyph: '↻', bg: CYAN,
    name: 'Revival Bundle',
    desc: 'Three extra lives per purchase. Continue a run without losing your score — ever.',
    price: '0.10', tag: '3 LIVES', best: true,
  },
  scoreBoost: {
    glyph: '⚡', bg: YELLOW,
    name: 'Score Boost',
    desc: 'Doubles every piece\'s base points for the whole game. Stack with combos for massive scores.',
    price: '0.10', tag: '×2 SCORE',
  },
  shield: {
    glyph: '⛊', bg: BLUE,
    name: 'Shield',
    desc: 'Auto-saves you the moment you\'d game-over. Clears 3 columns and keeps your combo streak alive.',
    price: '0.10', tag: 'AUTO-SAVE',
  },
  bomb: {
    glyph: '✸', bg: RED,
    name: 'Bomb',
    desc: 'Wipes a full row AND column in one tap. Feeds your combo — ×3 cell points when Boost is active.',
    price: '0.10', tag: '🔥 HOT',
  },
  rotatePass: {
    glyph: '⟳', bg: ORANGE,
    name: 'Rotate Pass',
    desc: 'Rotate any piece before placing this session. Unlock placements that would otherwise be impossible.',
    price: '0.10', tag: '1 SESSION',
  },
}

// ── Bundle definitions ───────────────────────────────────────
const BUNDLES: BundleDef[] = [
  {
    id: 'revivalMegaPack',
    name: 'Revival Mega Pack',
    desc: '9 revival credits — triple what a single bundle gives. Never run dry mid-run.',
    priceCents: 25,
    accent: CYAN,
    saveBadge: 'SAVE $0.05',
    items: [{ id: 'revivalBundle', qty: 9, glyph: '↻', bg: CYAN }],
    best: true,
  },
  {
    id: 'powerPack',
    name: 'Power Pack',
    desc: '2× Score Boost, 2× Shield and 2× Bomb — double every offensive tool at once.',
    priceCents: 20,
    accent: YELLOW,
    saveBadge: 'SAVE $0.10',
    items: [
      { id: 'scoreBoost', qty: 2, glyph: '⚡', bg: YELLOW },
      { id: 'shield',     qty: 2, glyph: '⛊', bg: BLUE   },
      { id: 'bomb',       qty: 2, glyph: '✸', bg: RED    },
    ],
  },
  {
    id: 'starterPack',
    name: 'Starter Pack',
    desc: 'One of every power-up + 3 revival credits. The complete kit for new and returning players.',
    priceCents: 35,
    accent: PURPLE,
    saveBadge: 'SAVE $0.15',
    items: [
      { id: 'revivalBundle', qty: 3, glyph: '↻', bg: CYAN   },
      { id: 'scoreBoost',    qty: 1, glyph: '⚡', bg: YELLOW },
      { id: 'shield',        qty: 1, glyph: '⛊', bg: BLUE   },
      { id: 'bomb',          qty: 1, glyph: '✸', bg: RED    },
      { id: 'rotatePass',    qty: 1, glyph: '⟳', bg: ORANGE },
    ],
  },
]

const CONSUMABLE_IDS: ShopItemId[] = ['revivalBundle', 'scoreBoost', 'shield', 'bomb', 'rotatePass']

const TOKEN_LABELS: Record<StablecoinSymbol, string> = {
  USDC: 'USDC', USDT: 'USDT', USDm: 'USDm',
}

// ── Shared sub-components ────────────────────────────────────

function ItemGlyph({ glyph, bg, size = 56 }: { glyph: string; bg: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, background: INK, color: bg,
      border: `2.5px solid ${bg}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Archivo Black", system-ui',
      fontSize: Math.round(size * 0.46), lineHeight: 1, flexShrink: 0,
    }}>
      {glyph}
    </div>
  )
}

function PriceChip({ amount, token = 'USDT', bg = LIME }: { amount: string; token?: string; bg?: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 5,
      background: bg, color: INK, border: SB,
      padding: '5px 10px', boxShadow: SSH(3, 3),
      fontFamily: '"Archivo Black", system-ui',
    }}>
      <span style={{ fontSize: 16, letterSpacing: '-0.02em' }}>${amount}</span>
      <span style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.7 }}>{token}</span>
    </div>
  )
}

// ── Item Card ────────────────────────────────────────────────
function ItemCard({
  design, onBuy, isBuying, isSuccess, affordable, freeTryCount, purchasedCount,
}: {
  design: ItemDesign
  onBuy: () => void
  isBuying: boolean
  isSuccess: boolean
  affordable: boolean
  freeTryCount: number
  purchasedCount: number
}) {
  const [hover, setHover] = useState(false)
  const off = hover ? 4 : 6

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: PAPER, border: SBT, boxShadow: SSH(off, off),
        transform: `translate(${6 - off}px, ${6 - off}px)`,
        transition: 'all 90ms ease-out',
        padding: 14, position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 10,
        fontFamily: '"Archivo Black", system-ui',
      }}
    >
      {design.best && (
        <div style={{
          position: 'absolute', top: -12, right: -10,
          background: RED, color: '#fff', border: SB,
          padding: '3px 9px', fontSize: 10, letterSpacing: '0.12em',
          transform: 'rotate(6deg)', boxShadow: SSH(2, 2),
        }}>
          BEST VALUE
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ItemGlyph glyph={design.glyph} bg={design.bg} size={54} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, letterSpacing: '-0.01em', lineHeight: 1.05, color: INK }}>
              {design.name}
            </span>
            {design.tag && (
              <span style={{
                background: design.bg, color: INK, border: '2px solid #0C0C10',
                padding: '1px 6px', fontSize: 9, letterSpacing: '0.1em', flexShrink: 0,
              }}>
                {design.tag}
              </span>
            )}
            {freeTryCount > 0 && (
              <span style={{
                background: LIME, color: INK, border: '2px solid #0C0C10',
                padding: '1px 6px', fontSize: 9, letterSpacing: '0.1em', flexShrink: 0,
              }}>
                {freeTryCount} FREE
              </span>
            )}
            {purchasedCount > 0 && (
              <span style={{
                background: CYAN, color: INK, border: '2px solid #0C0C10',
                padding: '1px 6px', fontSize: 9, letterSpacing: '0.1em', flexShrink: 0,
              }}>
                {purchasedCount} OWNED
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{
        fontFamily: 'Space Grotesk, system-ui', fontSize: 12,
        fontWeight: 600, color: INK, opacity: 0.75, lineHeight: 1.4,
      }}>
        {design.desc}
      </div>

      {/* Per-use cost + value callout */}
      <div style={{
        background: design.bg,
        border: SB,
        padding: '5px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: '"Archivo Black", system-ui',
      }}>
        <span style={{ fontSize: 9, letterSpacing: '0.12em', color: INK, opacity: 0.75 }}>
          {design.name === 'Revival Bundle' ? '$0.03 per revival'
           : design.name === 'Rotate Pass'  ? '$0.10 per session'
           : '$0.10 per game'}
        </span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', color: INK }}>
          {design.name === 'Revival Bundle'  ? '💡 NEVER LOSE PROGRESS'
           : design.name === 'Score Boost'   ? '💡 CLIMB THE LEADERBOARD'
           : design.name === 'Shield'        ? '💡 PROTECT YOUR STREAK'
           : design.name === 'Bomb'          ? '💡 CLEAR THE BOARD FAST'
           : '💡 UNLOCK MORE PLAYS'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PriceChip amount={design.price} />
        <button
          onClick={onBuy}
          disabled={!affordable || isBuying}
          style={{
            background: isSuccess ? LIME : design.bg,
            color: isSuccess ? INK : INK,
            border: SB, boxShadow: SSH(3, 3, INK),
            padding: '8px 18px',
            fontFamily: '"Archivo Black", system-ui',
            fontSize: 13, letterSpacing: '0.12em',
            cursor: affordable && !isBuying ? 'pointer' : 'not-allowed',
            opacity: !affordable ? 0.4 : 1, minWidth: 72,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 150ms',
          }}
        >
          {isSuccess ? '✓ GOT IT!' : isBuying ? '…' : 'BUY NOW'}
        </button>
      </div>
    </div>
  )
}

// ── Bundle Card ──────────────────────────────────────────────
function BundleCard({
  bundle, onBuy, isBuying, isSuccess, affordable,
}: {
  bundle: BundleDef
  onBuy: () => void
  isBuying: boolean
  isSuccess: boolean
  affordable: boolean
}) {
  const [hover, setHover] = useState(false)
  const off = hover ? 4 : 6
  const priceStr = (bundle.priceCents / 100).toFixed(2)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: PAPER, border: SBT, boxShadow: SSH(off, off),
        transform: `translate(${6 - off}px, ${6 - off}px)`,
        transition: 'all 90ms ease-out',
        padding: 14, position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 10,
        fontFamily: '"Archivo Black", system-ui',
      }}
    >
      {/* Savings badge */}
      <div style={{
        position: 'absolute', top: -12, right: -10,
        background: bundle.accent, color: INK, border: SB,
        padding: '3px 9px', fontSize: 10, letterSpacing: '0.12em',
        transform: 'rotate(6deg)', boxShadow: SSH(2, 2),
      }}>
        {bundle.saveBadge}
      </div>

      {/* Best seller badge */}
      {bundle.best && (
        <div style={{
          position: 'absolute', top: -12, left: -10,
          background: RED, color: '#fff', border: SB,
          padding: '3px 9px', fontSize: 10, letterSpacing: '0.12em',
          transform: 'rotate(-6deg)', boxShadow: SSH(2, 2),
        }}>
          BEST SELLER
        </div>
      )}

      {/* Name */}
      <div style={{
        fontSize: 17, letterSpacing: '-0.01em', color: INK,
        marginTop: bundle.best ? 6 : 0,
      }}>
        {bundle.name}
      </div>

      {/* Description */}
      <div style={{
        fontFamily: 'Space Grotesk, system-ui', fontSize: 12,
        fontWeight: 600, color: INK, opacity: 0.75, lineHeight: 1.4,
      }}>
        {bundle.desc}
      </div>

      {/* Item chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {bundle.items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: INK, border: `2px solid ${item.bg}`,
            padding: '5px 9px',
          }}>
            <span style={{ color: item.bg, fontSize: 13, lineHeight: 1 }}>{item.glyph}</span>
            <span style={{
              color: PAPER, fontSize: 10, letterSpacing: '0.08em',
              fontFamily: '"Archivo Black", system-ui',
            }}>
              {item.qty}×
            </span>
          </div>
        ))}
      </div>

      {/* Price + buy */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PriceChip amount={priceStr} bg={bundle.accent} />
        <button
          onClick={onBuy}
          disabled={!affordable || isBuying}
          style={{
            background: isSuccess ? LIME : INK,
            color: isSuccess ? INK : PAPER,
            border: SB, boxShadow: SSH(3, 3, bundle.accent),
            padding: '8px 16px',
            fontFamily: '"Archivo Black", system-ui',
            fontSize: 12, letterSpacing: '0.12em',
            cursor: affordable && !isBuying ? 'pointer' : 'not-allowed',
            opacity: !affordable ? 0.4 : 1, minWidth: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'background 150ms',
          }}
        >
          {isSuccess ? '✓ DONE' : isBuying ? '…' : 'BUY'}
        </button>
      </div>
    </div>
  )
}

// ── Purchase Confirm / Success Sheet ─────────────────────────
interface ConfirmPayload {
  name: string
  glyph: string
  glyphBg: string
  priceStr: string
  bundleItems?: BundleItem[]
}

function PurchaseSheet({
  payload, balance, selectedToken, onConfirm, onCancel, state,
}: {
  payload: ConfirmPayload | null
  balance: string
  selectedToken: StablecoinSymbol
  onConfirm: () => void
  onCancel: () => void
  state: 'confirm' | 'success' | null
}) {
  if (!payload || !state) return null
  const afterBalance = (parseFloat(balance) - parseFloat(payload.priceStr)).toFixed(3)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, fontFamily: '"Archivo Black", system-ui' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(12,12,16,0.55)' }} />

      <div style={{
        position: 'absolute', left: 14, right: 14, bottom: 14,
        maxWidth: 440, margin: '0 auto',
        background: INK, color: PAPER,
        border: `4px solid ${PAPER}`,
        boxShadow: `0 -6px 0 ${INK}, 0 -10px 0 ${payload.glyphBg}`,
        padding: 18,
      }}>
        <div style={{ width: 48, height: 4, background: PAPER, opacity: 0.4, margin: '0 auto 14px' }} />

        {state === 'confirm' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {payload.bundleItems ? (
                /* Bundle: show item chips instead of single glyph */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: 1 }}>
                  {payload.bundleItems.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: PAPER, border: `2px solid ${item.bg}`,
                      padding: '4px 8px', color: INK,
                    }}>
                      <span style={{ color: item.bg, fontSize: 14 }}>{item.glyph}</span>
                      <span style={{ fontSize: 10, letterSpacing: '0.08em' }}>{item.qty}×</span>
                    </div>
                  ))}
                </div>
              ) : (
                <ItemGlyph glyph={payload.glyph} bg={payload.glyphBg} size={60} />
              )}
              <div style={{ flex: payload.bundleItems ? undefined : 1 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', color: payload.glyphBg }}>
                  CONFIRM PURCHASE
                </div>
                <div style={{ fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2 }}>
                  {payload.name}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 14, background: PAPER, color: INK,
              padding: '12px 14px',
              fontFamily: 'Space Grotesk, system-ui', fontWeight: 700, fontSize: 13,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>Price</span>
                <span>${payload.priceStr} {TOKEN_LABELS[selectedToken]}</span>
              </div>
              <div style={{ height: 2, background: INK, opacity: 0.12, margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ opacity: 0.6 }}>Wallet balance</span>
                <span>${balance} {TOKEN_LABELS[selectedToken]}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ opacity: 0.6 }}>After purchase</span>
                <span>${afterBalance} {TOKEN_LABELS[selectedToken]}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={onConfirm} style={{
                flex: 1, background: LIME, color: INK,
                border: `3px solid ${PAPER}`, boxShadow: SSH(4, 4, PAPER),
                padding: '12px', fontFamily: 'inherit',
                fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
              }}>
                PAY ${payload.priceStr}
              </button>
              <button onClick={onCancel} style={{
                background: PAPER, color: INK, border: `3px solid ${PAPER}`,
                padding: '12px 16px', fontFamily: 'inherit',
                fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer', opacity: 0.85,
              }}>
                CANCEL
              </button>
            </div>
            <div style={{
              marginTop: 10, textAlign: 'center',
              fontFamily: 'Space Grotesk, system-ui', fontSize: 11, opacity: 0.6,
              letterSpacing: '0.08em',
            }}>
              ⟳ Paid in {TOKEN_LABELS[selectedToken]} on Celo · one-tap via MiniPay
            </div>
          </>
        )}

        {state === 'success' && (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ display: 'inline-block', marginBottom: 12 }}>
              <ItemGlyph glyph="✓" bg={LIME} size={72} />
            </div>
            <div style={{ fontSize: 30, letterSpacing: '-0.02em', color: LIME }}>PURCHASED</div>
            <div style={{
              fontFamily: 'Space Grotesk, system-ui', fontSize: 14, fontWeight: 600,
              opacity: 0.85, marginTop: 8,
            }}>
              {payload.name} added to your inventory.
            </div>
            <button onClick={onCancel} style={{
              marginTop: 16, width: '100%', background: LIME, color: INK,
              border: `3px solid ${PAPER}`, boxShadow: SSH(4, 4, PAPER),
              padding: '12px', fontFamily: 'inherit',
              fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer',
            }}>
              BACK TO SHOP
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ShopModal ───────────────────────────────────────────
export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose }) => {
  const {
    balances, canAfford, canAffordCents, hasAnyBalance, defaultToken,
    isPaying, error, purchase, purchaseBundle,
  } = useStablecoinShop()
  const { freeTries, inventory } = usePowerUpStore()

  const [selectedToken, setSelectedToken] = useState<StablecoinSymbol>(defaultToken)
  const [tab, setTab]                     = useState<ShopTab>('consumables')
  const [buyingId, setBuyingId]           = useState<string | null>(null)
  const [successId, setSuccessId]         = useState<string | null>(null)
  const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null)
  const [purchaseState, setPurchaseState] = useState<'confirm' | 'success' | null>(null)
  // Track whether current pending purchase is a bundle (and which one)
  const [pendingBundle, setPendingBundle] = useState<BundleDef | null>(null)
  const [pendingItemId, setPendingItemId] = useState<ShopItemId | null>(null)

  if (!isOpen) return null

  const tokenList = Object.keys(STABLECOIN_TOKENS) as StablecoinSymbol[]
  const selectedBalance = Number(balances[selectedToken]) / 10 ** STABLECOIN_TOKENS[selectedToken].decimals

  const finishSuccess = (id: string) => {
    setSuccessId(id)
    setPurchaseState('success')
    setTimeout(() => {
      setSuccessId(null)
      setPurchaseState(null)
      setConfirmPayload(null)
      setPendingBundle(null)
      setPendingItemId(null)
    }, 3000)
  }

  // ── Item buy ──
  const handleBuyClick = (id: ShopItemId, design: ItemDesign) => {
    if (isPaying || buyingId) return
    setPendingItemId(id)
    setPendingBundle(null)
    setConfirmPayload({
      name: design.name,
      glyph: design.glyph,
      glyphBg: design.bg,
      priceStr: design.price,
    })
    setPurchaseState('confirm')
  }

  // ── Bundle buy ──
  const handleBundleBuyClick = (bundle: BundleDef) => {
    if (isPaying || buyingId) return
    setPendingBundle(bundle)
    setPendingItemId(null)
    setConfirmPayload({
      name: bundle.name,
      glyph: '✦',
      glyphBg: bundle.accent,
      priceStr: (bundle.priceCents / 100).toFixed(2),
      bundleItems: bundle.items,
    })
    setPurchaseState('confirm')
  }

  const handleConfirm = async () => {
    setPurchaseState(null)

    if (pendingBundle) {
      setBuyingId(pendingBundle.id)
      const ok = await purchaseBundle(
        pendingBundle.id,
        pendingBundle.priceCents,
        pendingBundle.items.map(i => ({ id: i.id, qty: i.qty })),
        selectedToken,
      )
      setBuyingId(null)
      if (ok) finishSuccess(pendingBundle.id)
      else { setConfirmPayload(null); setPendingBundle(null) }
    } else if (pendingItemId) {
      setBuyingId(pendingItemId)
      const ok = await purchase(pendingItemId, selectedToken)
      setBuyingId(null)
      if (ok) finishSuccess(pendingItemId)
      else { setConfirmPayload(null); setPendingItemId(null) }
    }
  }

  const handleCancelSheet = () => {
    setConfirmPayload(null)
    setPurchaseState(null)
    setPendingBundle(null)
    setPendingItemId(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(12,12,16,0.75)', backdropFilter: 'blur(4px)',
      }} />

      {/* Shop Panel */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9001,
        overflowY: 'auto',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '16px 8px 40px', boxSizing: 'border-box',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(440px, calc(100vw - 16px))',
            background: PAPER, border: SBT, boxShadow: SSH(8, 8),
            position: 'relative', fontFamily: '"Archivo Black", system-ui',
          }}
        >
          {/* Halftone */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: 'radial-gradient(#0C0C1010 1.5px, transparent 1.5px)',
            backgroundSize: '12px 12px',
          }} />

          {/* ── Header ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: INK, borderBottom: SBT,
          }}>
            <div style={{ fontSize: 22, letterSpacing: '-0.02em', color: PAPER }}>SHOP</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: INK, color: LIME, border: `3px solid ${LIME}`,
                padding: '4px 10px', boxShadow: SSH(3, 3, LIME),
              }}>
                <span style={{ fontSize: 9, letterSpacing: '0.12em', opacity: 0.6, color: PAPER, fontFamily: '"Archivo Black", system-ui' }}>
                  BAL
                </span>
                <span style={{ fontSize: 13, fontFamily: '"Archivo Black", system-ui' }}>
                  ${selectedBalance.toFixed(2)}
                </span>
              </div>
              <button onClick={onClose} style={{
                background: PAPER, border: `3px solid ${PAPER}`, color: INK,
                width: 32, height: 32, fontFamily: '"Archivo Black", system-ui',
                fontSize: 18, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                ×
              </button>
            </div>
          </div>

          {/* ── Token Selector ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '10px 16px 8px',
            borderBottom: '3px solid rgba(12,12,16,0.12)',
          }}>
            <div style={{
              fontFamily: '"Archivo Black", system-ui', fontSize: 9,
              letterSpacing: '0.18em', color: INK, opacity: 0.45, marginBottom: 8,
            }}>
              PAY WITH
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {tokenList.map(sym => {
                const bal = Number(balances[sym]) / 10 ** STABLECOIN_TOKENS[sym].decimals
                const isSelected = selectedToken === sym
                return (
                  <button key={sym} onClick={() => setSelectedToken(sym)} style={{
                    flex: 1, padding: '7px 4px',
                    border: isSelected ? `3px solid ${INK}` : '3px solid rgba(12,12,16,0.2)',
                    background: isSelected ? YELLOW : PAPER2,
                    cursor: 'pointer',
                    fontFamily: '"Archivo Black", system-ui',
                    fontSize: 10, letterSpacing: '0.1em', color: INK,
                    boxShadow: isSelected ? SSH(2, 2) : 'none',
                    transition: 'all 80ms',
                  }}>
                    <div>{TOKEN_LABELS[sym]}</div>
                    <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: 9, fontWeight: 600, opacity: 0.65, marginTop: 2 }}>
                      {bal.toFixed(2)}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', gap: 6,
            padding: '10px 16px 8px',
            borderBottom: '3px solid rgba(12,12,16,0.12)',
          }}>
            {([
              ['consumables', 'POWER-UPS'],
              ['bundles',     'BUNDLES'],
              ['season',      'SEASON'],
            ] as [ShopTab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                flex: 1, padding: '8px 4px',
                background: tab === id ? INK : PAPER2,
                color: tab === id ? YELLOW : INK,
                border: SB,
                boxShadow: tab === id ? SSH(3, 3, YELLOW) : SSH(3, 3),
                fontFamily: '"Archivo Black", system-ui',
                fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
                transition: 'all 80ms',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Item Area ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '14px 16px 18px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* POWER-UPS tab */}
            {tab === 'consumables' && (() => {
              const depletedNames = CONSUMABLE_IDS
                .filter(id => id !== 'revivalBundle' && (inventory[id as PowerUpId] ?? 0) === 0 && (freeTries[id as PowerUpId] ?? 0) === 0)
                .map(id => ITEM_DESIGN[id]?.name ?? id)
              return depletedNames.length > 0 ? (
                <div style={{
                  background: '#FF3B3B', color: '#fff',
                  border: '3px solid #0C0C10', boxShadow: SSH(3, 3, '#0C0C10'),
                  padding: '9px 14px',
                  fontFamily: '"Archivo Black", system-ui',
                  fontSize: 10, letterSpacing: '0.12em', textAlign: 'center',
                }}>
                  ⚠ YOU\'RE OUT OF: {depletedNames.join(' · ')} — RESTOCK NOW
                </div>
              ) : null
            })()}

            {tab === 'consumables' && CONSUMABLE_IDS.map(id => {
              const design = ITEM_DESIGN[id]
              const isBuying  = buyingId === id
              const isSuccess = successId === id
              const affordable    = canAfford(selectedToken)
              const freeTryCount  = id !== 'revivalBundle' ? (freeTries[id as PowerUpId] ?? 0) : 0
              const purchasedCount = id === 'revivalBundle'
                ? (inventory.revivalBundle ?? 0)
                : (inventory[id as PowerUpId] ?? 0)

              return (
                <ItemCard
                  key={id}
                  design={design}
                  onBuy={() => handleBuyClick(id, design)}
                  isBuying={isBuying}
                  isSuccess={isSuccess}
                  affordable={affordable}
                  freeTryCount={freeTryCount}
                  purchasedCount={purchasedCount}
                />
              )
            })}

            {/* BUNDLES tab */}
            {tab === 'bundles' && (
              <>
                {/* Savings callout */}
                <div style={{
                  background: INK, color: LIME,
                  border: `3px solid ${LIME}`, boxShadow: SSH(4, 4, LIME),
                  padding: '10px 14px',
                  fontFamily: '"Archivo Black", system-ui',
                  fontSize: 11, letterSpacing: '0.12em', textAlign: 'center',
                }}>
                  BUY MORE, SPEND LESS — BUNDLES SAVE UP TO $0.15
                </div>

                {BUNDLES.map(bundle => (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    onBuy={() => handleBundleBuyClick(bundle)}
                    isBuying={buyingId === bundle.id}
                    isSuccess={successId === bundle.id}
                    affordable={canAffordCents(selectedToken, bundle.priceCents)}
                  />
                ))}
              </>
            )}

            {/* SEASON tab */}
            {tab === 'season' && (
              <div style={{
                padding: '40px 0 20px', textAlign: 'center',
                fontFamily: '"Archivo Black", system-ui', fontSize: 13,
                letterSpacing: '0.1em', color: INK, opacity: 0.4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{ fontSize: 36 }}>★</div>
                SEASON PASS COMING SOON
              </div>
            )}
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '10px 16px',
              background: 'rgba(255,59,59,0.1)',
              borderTop: `3px solid ${RED}`,
            }}>
              <div style={{ fontFamily: 'Space Grotesk, system-ui', fontSize: 11, fontWeight: 600, color: RED }}>
                {error}
              </div>
            </div>
          )}

          {/* ── No balance ── */}
          {!hasAnyBalance && (
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '10px 16px',
              borderTop: '3px solid rgba(12,12,16,0.1)',
              fontFamily: '"Archivo Black", system-ui', fontSize: 9,
              letterSpacing: '0.12em', color: INK, opacity: 0.45, textAlign: 'center',
            }}>
              DEPOSIT FUNDS IN MINIPAY TO PURCHASE
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '10px 16px', background: PAPER2,
            borderTop: '3px solid rgba(12,12,16,0.1)',
            fontFamily: '"Archivo Black", system-ui', fontSize: 8,
            letterSpacing: '0.14em', color: INK, opacity: 0.45, textAlign: 'center',
          }}>
            ALL SALES FINAL · ITEMS STORED ON-CHAIN
          </div>
        </div>
      </div>

      {/* ── Purchase Sheet ── */}
      {confirmPayload && purchaseState && (
        <PurchaseSheet
          payload={confirmPayload}
          balance={selectedBalance.toFixed(2)}
          selectedToken={selectedToken}
          onConfirm={handleConfirm}
          onCancel={handleCancelSheet}
          state={purchaseState}
        />
      )}
    </>
  )
}

export default ShopModal
