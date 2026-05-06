import React, { useRef, useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useConnect } from 'wagmi'
import { useOwner } from '../hooks/useBlokzGame'
import { useTheme } from '../hooks/useTheme'
import { BrutalIcon } from './BrutalIcon'
import ThemeToggle from './ThemeToggle'
import { IS_MINIPAY } from '../utils/miniPay'
import { useGoodDollar } from '../hooks/useGoodDollar'
import { web3AuthConnector } from '../config/web3auth'

type HeaderView = 'lobby' | 'classic' | 'tournaments' | 'tournament-play' | 'admin'

interface HeaderProps {
  onShowLeaderboard?: () => void
  onViewChange: (view: 'lobby' | 'classic' | 'tournaments' | 'admin') => void
  activeView: HeaderView
  showLeaderboardAction: boolean
  isLeaderboardOpen?: boolean
}

const MiniPayWalletBadge: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { effectiveTheme } = useTheme()
  const { isGSupported, gModeEnabled, isWhitelisted, gBalance, verificationUrl } = useGoodDollar()
  const isDarkTheme = effectiveTheme !== 'light'
  const walletBg = isDarkTheme ? 'var(--accent)' : 'var(--accent-soft)'
  const walletColor = isDarkTheme ? '#FFFFFF' : 'var(--ink-fixed)'

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 border-[3px] border-ink px-4 py-[10px] font-display text-[12px] tracking-[0.08em] uppercase"
        style={{
          background: walletBg,
          color: walletColor,
          boxShadow: '4px 4px 0 var(--shadow)',
        }}
      >
        <div
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: walletColor }}
        />
        {isConnected && address ? truncateAddress(address) : 'MINIPAY'}
      </div>

      {isGSupported && gModeEnabled && isConnected && (
        <div 
          className={`flex items-center gap-2 border-[3px] border-ink px-3 py-[10px] font-display text-[10px] tracking-widest uppercase shadow-[3px_3px_0_var(--shadow)] ${isWhitelisted ? 'bg-paper text-ink' : 'bg-accent-pink text-white'}`}
        >
          {isWhitelisted ? (
             <span className="flex items-center gap-1">
               <BrutalIcon name="check" size={12} />
               {gBalance?.formatted?.slice(0, 5)} G$
             </span>
          ) : (
            <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
              <BrutalIcon name="alert" size={12} />
              VERIFY G$
            </a>
          )}
        </div>
      )}
    </div>
  )
}

const HeaderDivider: React.FC = () => (
  <div
    className="hidden h-8 w-px lg:block"
    style={{ background: 'var(--rule)' }}
  />
)

/**
 * Single LOGIN button that opens a dropdown with two connection options:
 *  • Social  (Web3Auth — Google / Twitter / email) — marked as RECOMMENDED
 *  • Wallet  (RainbowKit — MetaMask, WalletConnect, etc.)
 *
 * Replaces the previous two-button layout for a cleaner UX.
 */
const LoginDropdown: React.FC<{ onConnectWallet: () => void }> = ({ onConnectWallet }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { effectiveTheme } = useTheme()
  const { connect, isPending, variables } = useConnect()
  const isSocialBusy = isPending && (variables?.connector as any)?.id === 'web3auth'
  const isDarkTheme = effectiveTheme !== 'light'
  const buttonBg = isDarkTheme ? 'var(--accent)' : 'var(--accent-soft)'
  const buttonColor = isDarkTheme ? '#FFFFFF' : 'var(--ink-fixed)'

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="brutal-btn flex items-center gap-2 border-[3px] border-ink px-4 py-[10px] font-display text-[12px] tracking-[0.08em] uppercase"
        style={{
          background: buttonBg,
          boxShadow: '4px 4px 0 var(--shadow)',
          color: buttonColor,
        }}
      >
        LOGIN
        <span className="text-[10px] leading-none">{open ? '▴' : '▾'}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-[200] w-56 border-[3px] border-ink bg-paper"
          style={{ boxShadow: '4px 4px 0 var(--shadow)' }}
        >
          {/* ── Social (recommended) ── */}
          <button
            onClick={() => {
              setOpen(false)
              connect({ connector: web3AuthConnector })
            }}
            disabled={isSocialBusy}
            className="flex w-full items-center justify-between border-b-[3px] border-ink px-4 py-3 font-display text-[11px] tracking-[0.1em] uppercase text-ink transition-colors hover:bg-accent-yellow/20 disabled:opacity-60"
          >
            <span className="flex items-center gap-2">
              <BrutalIcon name="zap" size={12} strokeWidth={2.5} />
              {isSocialBusy ? (
                <span className="flex items-center gap-1.5">
                  <div className="brutal-loader" style={{ borderColor: 'var(--ink)', borderTopColor: 'transparent' }} />
                  SIGNING IN
                </span>
              ) : (
                'SOCIAL'
              )}
            </span>
            {/* Best badge */}
            <span
              className="border-[2px] border-ink bg-accent-pink px-1.5 py-0.5 font-display text-[8px] tracking-widest uppercase leading-none text-white"
            >
              BEST
            </span>
          </button>

          {/* ── Wallet (MetaMask / WalletConnect) ── */}
          <button
            onClick={() => {
              setOpen(false)
              onConnectWallet()
            }}
            className="flex w-full items-center gap-2 px-4 py-3 font-display text-[11px] tracking-[0.1em] uppercase text-ink transition-colors hover:bg-paper-2"
          >
            <BrutalIcon name="share" size={12} strokeWidth={2.5} />
            WALLET
          </button>
        </div>
      )}
    </div>
  )
}

const MobileBottomNav: React.FC<{
  activeView: HeaderView
  isLeaderboardOpen: boolean
  onViewChange: (view: 'lobby' | 'classic' | 'tournaments' | 'admin') => void
  onShowLeaderboard?: () => void
  isOwner: boolean
}> = ({ activeView, isLeaderboardOpen, onViewChange, onShowLeaderboard, isOwner }) => {
  const tabs = [
    {
      label: 'HOME',
      icon: 'home' as const,
      active: activeView === 'lobby',
      onClick: () => onViewChange('lobby'),
    },
    {
      label: 'CLASSIC',
      icon: 'zap' as const,
      active: activeView === 'classic' && !isLeaderboardOpen,
      onClick: () => onViewChange('classic'),
    },
    {
      label: 'TOURNEY',
      icon: 'trophy' as const,
      active: activeView === 'tournaments' || activeView === 'tournament-play',
      onClick: () => onViewChange('tournaments'),
    },
    {
      label: 'RANKS',
      icon: 'trending' as const,
      active: isLeaderboardOpen,
      onClick: onShowLeaderboard,
    },
    ...(isOwner
      ? [
          {
            label: 'ADMIN',
            icon: 'alert' as const,
            active: activeView === 'admin',
            onClick: () => onViewChange('admin'),
          },
        ]
      : []),
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t-4 border-ink bg-paper lg:hidden"
      style={{ boxShadow: '0 -3px 0 var(--shadow)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.label}
          onClick={tab.onClick}
          className={`flex flex-1 flex-col items-center justify-center gap-1 font-display text-[8px] tracking-[0.14em] uppercase ${
            tab.active ? 'bg-ink' : ''
          }`}
          style={{ color: tab.active ? 'var(--paper)' : 'var(--ink)' }}
        >
          <BrutalIcon name={tab.icon} size={18} strokeWidth={2.5} />
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

const truncateAddress = (value?: string) =>
  value ? `${value.slice(0, 4)}…${value.slice(-2)}` : 'CONNECT'

export const Header: React.FC<HeaderProps> = ({
  onShowLeaderboard,
  onViewChange,
  activeView,
  showLeaderboardAction,
  isLeaderboardOpen = false,
}) => {
  const { address } = useAccount()
  const { owner } = useOwner()
  const { effectiveTheme } = useTheme()
  const { isGSupported, gModeEnabled, isWhitelisted, gBalance, verificationUrl } = useGoodDollar()
  const { isConnected } = useAccount()

  const isOwner =
    address && owner && address.toLowerCase() === owner.toLowerCase()
  const isTournamentView =
    activeView === 'tournaments' || activeView === 'tournament-play'
  const isDarkTheme = effectiveTheme !== 'light'
  const connectedChipBg = isDarkTheme ? 'var(--accent)' : 'var(--accent-soft)'
  const connectedChipColor = isDarkTheme ? '#FFFFFF' : 'var(--ink-fixed)'

  const safeNavigate = (view: 'lobby' | 'classic' | 'tournaments' | 'admin') => {
    if (typeof onViewChange === 'function') onViewChange(view)
  }

  const navTabs = [
    {
      label: 'CLASSIC',
      active: activeView === 'classic',
      view: 'classic' as const,
    },
    {
      label: 'TOURNAMENTS',
      active: isTournamentView,
      view: 'tournaments' as const,
    },
    {
      label: 'LEADERBOARD',
      active: isLeaderboardOpen,
      onClick: onShowLeaderboard,
    },
    {
      label: 'MY STATS',
      active: false,
    },
    ...(isOwner
      ? [
          {
            label: 'ADMIN',
            active: activeView === 'admin',
            view: 'admin' as const,
          },
        ]
      : []),
  ]

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 border-b-4 border-ink bg-paper px-4 py-3 lg:px-6 lg:py-4"
        style={{ borderBottomColor: 'var(--ink)' }}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 lg:gap-6">
          <div
            className="group flex min-w-0 cursor-pointer items-center gap-2.5 lg:min-w-[210px] lg:basis-[320px] lg:gap-[14px]"
            onClick={() => safeNavigate('lobby')}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-ink font-display text-[18px] transition-transform group-hover:-rotate-3 lg:h-[46px] lg:w-[46px] lg:text-[22px]"
              style={{
                background: 'var(--accent-yellow)',
                boxShadow: '3px 3px 0 var(--shadow)',
                color: 'var(--ink-fixed)',
              }}
            >
              B
            </div>
            <span className="font-display text-[18px] leading-none tracking-tight text-ink lg:text-[24px]">
              BLOKAZ
            </span>
          </div>

          <div className="hidden flex-1 justify-center lg:flex">
            <div className="flex items-center gap-2">
              {navTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() =>
                    tab.onClick ? tab.onClick() : tab.view && safeNavigate(tab.view)
                  }
                  className="font-display uppercase"
                  style={{
                    padding: '8px 14px',
                    border: '3px solid var(--ink)',
                    background: tab.active ? 'var(--ink)' : 'var(--paper)',
                    color: tab.active ? 'var(--label)' : 'var(--ink)',
                    boxShadow: tab.active
                      ? '4px 4px 0 var(--shadow)'
                      : '3px 3px 0 var(--shadow)',
                    letterSpacing: tab.active ? '0.08em' : '0.1em',
                    fontSize: tab.active ? 13 : 12,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 lg:basis-[320px] lg:gap-3">
            <ThemeToggle />
            <HeaderDivider />

            {IS_MINIPAY ? (
              <>
                <MiniPayWalletBadge />
              </>
            ) : (
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  mounted,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                }) => {
                  const ready = mounted
                  const connected = ready && account && chain

                  const handleClick = () => {
                    if (chain?.unsupported) return openChainModal()
                    openAccountModal()
                  }

                  return (
                    <div
                      className="flex items-center gap-2 lg:gap-3"
                      style={{ opacity: ready ? 1 : 0 }}
                    >
                      {!connected ? (
                        <LoginDropdown onConnectWallet={openConnectModal} />
                      ) : (
                        <>
                          {isGSupported && gModeEnabled && (
                            <>
                              <div
                                className={`hidden items-center gap-2 border-[3px] border-ink px-3 py-[10px] font-display text-[10px] tracking-[0.12em] uppercase lg:flex ${
                                  isWhitelisted ? '' : 'text-white'
                                }`}
                                style={{
                                  background: isWhitelisted
                                    ? 'var(--paper)'
                                    : 'var(--accent-pink)',
                                  color: isWhitelisted ? 'var(--ink)' : '#FFFFFF',
                                  boxShadow: '3px 3px 0 var(--shadow)',
                                }}
                              >
                                {isWhitelisted ? (
                                  <>
                                    <img
                                      src="https://docs.gooddollar.org/~gitbook/image?url=https%3A%2F%2F1693836101-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252F-LfsEjhezedCgGFXCkms%252Ficon%252F7UuO7n9qO2vO6Z3z7N2N%252FGoodDollar_Icon_Green.png%3Falt%3Dmedia%26token%3D7f3b8b1b-7f1b-4f1b-8f1b-7f1b8f1b7f1b&width=32&dpr=2"
                                      alt="G$"
                                      className="h-4 w-4"
                                    />
                                    {gBalance?.formatted?.slice(0, 6)} G$
                                  </>
                                ) : (
                                  <a
                                    href={verificationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                  >
                                    <BrutalIcon name="alert" size={14} />
                                    VERIFY IDENTITY
                                  </a>
                                )}
                              </div>
                              <HeaderDivider />
                            </>
                          )}

                          {/* Address chip: hidden on mobile to save width */}
                          <button
                            onClick={handleClick}
                            className="hidden border-[3px] border-ink px-4 py-[10px] font-display text-[12px] tracking-[0.08em] uppercase lg:block"
                            style={{
                              background: connectedChipBg,
                              color: connectedChipColor,
                              boxShadow: '4px 4px 0 var(--shadow)',
                            }}
                          >
                            {chain?.unsupported
                              ? 'NETWORK ⚠'
                              : truncateAddress(account.address)}
                          </button>
                          {/* Avatar icon: always visible */}
                          <button
                            onClick={handleClick}
                            className="flex h-10 w-10 items-center justify-center border-[3px] border-ink font-display text-[11px] uppercase"
                            style={{
                              background: connectedChipBg,
                              color: connectedChipColor,
                              boxShadow: '3px 3px 0 var(--shadow)',
                            }}
                            aria-label="Open account"
                          >
                            {account.displayName?.slice(0, 1) ?? 'W'}
                          </button>
                        </>
                      )}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            )}
          </div>
        </div>
      </header>
    <MobileBottomNav
      activeView={activeView}
      isLeaderboardOpen={isLeaderboardOpen ?? false}
      onViewChange={onViewChange}
      onShowLeaderboard={onShowLeaderboard}
      isOwner={!!isOwner}
    />
    </>
  )
}

export default Header
