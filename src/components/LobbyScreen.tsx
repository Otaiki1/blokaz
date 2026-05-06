import React, { useMemo, useState } from 'react'
import { BrutalIcon } from './BrutalIcon'
import { useAccount } from 'wagmi'
import { useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { useLeaderboard, useTournamentCount, USDC_DECIMALS } from '../hooks/useBlokzGame'
import { useTheme } from '../hooks/useTheme'
import { BLOKZ_TOURNAMENT_ABI } from '../constants/abi'
import contractInfo from '../contract.json'

const TOURNAMENT_ADDRESS = contractInfo.tournament as `0x${string}`

interface LobbyScreenProps {
  onPlayClassic: () => void
  onPlayTournaments: () => void
}

const TetrisBlocks: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="18" width="9" height="9" fill="var(--piece-red)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="9" y="18" width="9" height="9" fill="var(--piece-red)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="9" y="9" width="9" height="9" fill="var(--piece-red)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="18" y="9" width="9" height="9" fill="var(--piece-purple)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="18" y="18" width="9" height="9" fill="var(--piece-blue)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="27" y="18" width="9" height="9" fill="var(--piece-blue)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="18" y="27" width="9" height="9" fill="var(--piece-yellow)" stroke="var(--ink)" strokeWidth="1.5"/>
    <rect x="27" y="27" width="9" height="9" fill="var(--piece-lime)" stroke="var(--ink)" strokeWidth="1.5"/>
  </svg>
)

const RailShell: React.FC<{ title: string; children: React.ReactNode; accent?: boolean }> = ({
  title,
  children,
  accent = false,
}) => (
  <div
    className="border-[3px] border-ink"
    style={{
      background: 'var(--paper)',
      boxShadow: '5px 5px 0 var(--shadow)',
    }}
  >
    <div
      className="border-b-[3px] border-ink px-4 py-3 font-display text-[10px] tracking-[0.18em]"
      style={{
        background: accent ? 'var(--paper-2)' : 'var(--paper)',
        color: 'var(--label)',
      }}
    >
      {title}
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const MiniMetric: React.FC<{ label: string; value: string; background: string }> = ({
  label,
  value,
  background,
}) => {
  const isColoredSurface = background !== 'var(--paper)' && background !== 'var(--paper-2)'
  const textColor = isColoredSurface ? 'var(--ink-fixed)' : 'var(--ink)'
  const labelColor = isColoredSurface ? 'var(--ink-fixed)' : 'var(--ink-soft)'

  return (
    <div
      className="border-[3px] border-ink p-3"
      style={{
        background,
        boxShadow: '3px 3px 0 var(--shadow)',
      }}
    >
      <div
        className="font-display text-[8px] tracking-[0.14em]"
        style={{ color: labelColor, opacity: isColoredSurface ? 0.7 : 1 }}
      >
        {label}
      </div>
      <div
        className="mt-2 font-display text-[24px]"
        style={{ color: textColor, letterSpacing: '-0.03em', lineHeight: 1 }}
      >
        {value}
      </div>
    </div>
  )
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onPlayClassic, onPlayTournaments }) => {
  const { address } = useAccount()
  const { effectiveTheme } = useTheme()
  const isDarkTheme = effectiveTheme !== 'light'

  const { leaderboard, currentEpoch } = useLeaderboard()
  const { count: tournamentCount } = useTournamentCount()

  const tournamentContracts = useMemo(
    () =>
      tournamentCount && tournamentCount > 0n
        ? Array.from({ length: Number(tournamentCount) }, (_, i) => ({
            address: TOURNAMENT_ADDRESS,
            abi: BLOKZ_TOURNAMENT_ABI,
            functionName: 'tournaments' as const,
            args: [BigInt(i + 1)] as const,
          }))
        : [],
    [tournamentCount]
  )

  const { data: tournamentRows } = useReadContracts({
    contracts: tournamentContracts,
    query: { enabled: tournamentContracts.length > 0 },
  })

  const { totalPool, activeTournaments } = useMemo(() => {
    const rows = tournamentRows ?? []
    let pool = 0n
    let active = 0
    const now = BigInt(Math.floor(Date.now() / 1000))
    for (const row of rows) {
      if (row.status !== 'success' || !row.result) continue
      const r = row.result as readonly any[]
      const endTime = r[3] as bigint
      const finalized = r[6] as boolean
      if (endTime > now && !finalized) {
        active++
        pool += (r[7] as bigint) ?? 0n
      }
    }
    return { totalPool: pool, activeTournaments: active }
  }, [tournamentRows])

  const formattedPool = useMemo(() => {
    const raw = Number(formatUnits(totalPool, USDC_DECIMALS))
    return raw ? raw.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'
  }, [totalPool])

  const playerStats = useMemo(() => {
    if (!leaderboard || !address) return null
    const entries = leaderboard as readonly { player: `0x${string}`; score: number; gameId: bigint }[]
    const sorted = [...entries].sort((a, b) => b.score - a.score)
    const idx = sorted.findIndex(e => e.player.toLowerCase() === address.toLowerCase())
    if (idx === -1) return null
    return { rank: idx + 1, bestScore: sorted[idx].score }
  }, [leaderboard, address])

  const sortedLeaderboard = useMemo(
    () => (leaderboard ? [...leaderboard].sort((a, b) => b.score - a.score) : []),
    [leaderboard]
  )

  const season = currentEpoch !== undefined ? Math.floor(Number(currentEpoch) / 12) + 1 : null
  const week = currentEpoch !== undefined ? (Number(currentEpoch) % 12) + 1 : null

  const [streak] = useState<number>(() => {
    try {
      const s = localStorage.getItem('blokaz_streak')
      return s ? parseInt(s, 10) : 0
    } catch { return 0 }
  })

  const heroBackground = isDarkTheme ? 'var(--hero)' : 'var(--accent-yellow)'
  const heroCaptionColor = isDarkTheme ? 'var(--label)' : 'var(--ink-fixed)'
  const heroTextColor = isDarkTheme ? '#FFFFFF' : 'var(--ink-fixed)'
  const streakLabelColor = isDarkTheme ? 'var(--label)' : 'var(--ink-fixed)'
  const liveScore = playerStats?.bestScore ?? sortedLeaderboard[0]?.score ?? 0
  const nextChainWidth = `${Math.min(100, 28 + streak * 10)}%`
  const topThree = sortedLeaderboard.slice(0, 3)
  const currentRank = playerStats?.rank
  const shareScore = playerStats?.bestScore ?? sortedLeaderboard[0]?.score ?? 0

  const handleShareBestScore = () => {
    const message = `BLOKAZ best: ${shareScore.toLocaleString()}`
    if (navigator.share) {
      void navigator.share({
        title: 'BLOKAZ',
        text: message,
        url: window.location.href,
      })
      return
    }

    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${message} on BLOKAZ`)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const heroStack = (
    <>
      <div
        className="mt-1 border-[3px] border-ink p-4 lg:mt-0 lg:p-6"
        style={{ background: heroBackground, boxShadow: '5px 5px 0 var(--shadow)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="font-display text-[10px] tracking-[0.18em]"
            style={{ color: heroCaptionColor }}
          >
            {season !== null && week !== null
              ? `SEASON ${String(season).padStart(2, '0')} · WEEK ${String(week).padStart(2, '0')}`
              : 'WEEKLY SEASON'}
          </span>
          <div className="flex items-center gap-2">
            <div
              className="border-[2px] border-ink px-2 py-[3px] font-display text-[10px] tracking-widest"
              style={{ background: 'var(--ink)', color: 'var(--label)' }}
            >
              WEEKLY
            </div>
            <TetrisBlocks />
          </div>
        </div>

        <div
          className="font-display leading-[0.92]"
          style={{ fontSize: 'clamp(44px, 7vw, 72px)', letterSpacing: '-0.025em' }}
        >
          <div style={{ color: heroTextColor }}>STACK.</div>
          <div style={{ color: heroTextColor }}>SMASH.</div>
          <div
            style={{
              color: 'var(--danger)',
              WebkitTextStroke: '1px var(--ink)',
              paintOrder: 'stroke fill',
            }}
          >
            STAKE.
          </div>
        </div>
      </div>

      <div
        className="grid grid-cols-3 border-[3px] border-ink"
        style={{ boxShadow: '5px 5px 0 var(--shadow)' }}
      >
        <div
          className="flex flex-col items-center justify-center border-r-[3px] border-ink py-4"
          style={{ background: 'var(--paper)' }}
        >
          <span
            className="mb-1 font-display text-[9px] tracking-[0.16em]"
            style={{ color: 'var(--ink-fixed)', opacity: 0.7 }}
          >
            BEST
          </span>
          <span
            className="font-display"
            style={{ letterSpacing: '-0.03em', fontSize: 'clamp(16px,5.5vw,28px)', color: 'var(--ink-fixed)' }}
          >
            {playerStats ? playerStats.bestScore.toLocaleString() : '—'}
          </span>
        </div>
        <div
          className="flex flex-col items-center justify-center border-r-[3px] border-ink py-4"
          style={{ background: 'var(--accent-pink)' }}
        >
          <span
            className="mb-1 font-display text-[9px] tracking-[0.16em]"
            style={{ color: 'var(--ink-fixed)', opacity: 0.7 }}
          >
            RANK
          </span>
          <span
            className="font-display"
            style={{ letterSpacing: '-0.03em', fontSize: 'clamp(16px,5.5vw,28px)', color: 'var(--ink-fixed)' }}
          >
            {playerStats ? `#${playerStats.rank}` : '—'}
          </span>
        </div>
        <div
          className="flex flex-col items-center justify-center py-4"
          style={{ background: 'var(--accent-lime)' }}
        >
          <span
            className="mb-1 font-display text-[9px] tracking-[0.16em]"
            style={{ color: 'var(--ink-fixed)', opacity: 0.7 }}
          >
            WON
          </span>
          <span
            className="font-display"
            style={{ letterSpacing: '-0.03em', fontSize: 'clamp(16px,5.5vw,28px)', color: 'var(--ink-fixed)' }}
          >
            —
          </span>
        </div>
      </div>

      <button
        onClick={onPlayClassic}
        className="brutal-btn flex items-stretch overflow-hidden border-[3px] border-ink text-left"
        style={{ background: 'var(--danger)', boxShadow: '5px 5px 0 var(--shadow)' }}
      >
        <div
          className="flex w-16 flex-shrink-0 items-center justify-center border-r-[3px] border-ink"
          style={{ background: 'var(--ink)' }}
        >
          <span className="font-display text-2xl" style={{ color: 'var(--accent-yellow)' }}>
            ▶
          </span>
        </div>
        <div className="flex-1 px-4 py-4">
          <div className="flex items-center justify-between font-display text-xl tracking-[0.04em] text-white">
            PLAY CLASSIC <span className="text-2xl leading-none opacity-70">→</span>
          </div>
          <div
            className="mt-1 font-display text-[10px] tracking-[0.1em]"
            style={{ color: '#FFFFFF', opacity: 0.9 }}
          >
            Weekly leaderboard · Free
          </div>
        </div>
      </button>

      <div className="relative">
        {totalPool > 0n && (
          <div
            className="absolute right-3 top-[-10px] z-10 border-[2px] border-ink px-2 py-[2px] font-display text-[9px] tracking-[0.12em]"
            style={{ background: 'var(--accent-lime)', color: 'var(--ink-fixed)' }}
          >
            +${formattedPool} POOL
          </div>
        )}
        <button
          onClick={onPlayTournaments}
          className="brutal-btn flex w-full items-stretch overflow-hidden border-[3px] border-ink text-left"
          style={{ background: 'var(--piece-blue)', boxShadow: '5px 5px 0 var(--shadow)' }}
        >
          <div
            className="flex w-16 flex-shrink-0 items-center justify-center border-r-[3px] border-ink"
            style={{ background: 'var(--ink)' }}
          >
            <BrutalIcon name="trophy" size={22} strokeWidth={2.5} />
          </div>
          <div className="flex-1 px-4 py-4">
            <div className="flex items-center justify-between font-display text-xl tracking-[0.04em] text-white">
              TOURNAMENTS <span className="text-2xl leading-none opacity-70">→</span>
            </div>
            <div
              className="mt-1 font-display text-[10px] tracking-[0.1em]"
              style={{ color: '#FFFFFF', opacity: 0.9 }}
            >
              {activeTournaments > 0 ? `${activeTournaments} open · $1–$10 entry` : 'View all brackets'}
            </div>
          </div>
        </button>
      </div>

      <div
        className="flex flex-col gap-2 border-[3px] border-ink px-4 py-3"
        style={{ background: 'var(--paper-2)', boxShadow: '5px 5px 0 var(--shadow)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrutalIcon name="flame" size={16} strokeWidth={2.5} className="text-ink" />
            <div>
              <div
                className="font-display text-[9px] tracking-[0.16em]"
                style={{ color: streakLabelColor }}
              >
                DAILY STREAK
              </div>
              <div className="font-display text-[11px] tracking-[0.04em]" style={{ color: 'var(--ink)' }}>
                {streak > 0 ? `DAY ${streak} · ${streak >= 7 ? '2X' : `${streak}X`} BONUS` : 'START YOUR STREAK'}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[4px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[14px] flex-1 border-[2px] border-ink"
              style={{ background: i < streak ? 'var(--accent)' : 'var(--rule)' }}
            />
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="w-full px-3 pb-6 sm:px-4 lg:px-6">
      <div
        className="mx-auto hidden max-w-[1440px] items-start gap-8 lg:grid"
        style={{
          gridTemplateColumns: 'minmax(250px, 280px) minmax(0, 1fr) minmax(250px, 280px)',
        }}
      >
        <div className="flex min-w-0 flex-col gap-5">
          <RailShell title="LIVE SCORE" accent>
            <div
              className="font-display"
              style={{
                color: 'var(--ink)',
                fontSize: 58,
                letterSpacing: '-0.04em',
                lineHeight: 0.94,
              }}
            >
              {liveScore.toLocaleString()}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div
                className="border-[2px] border-ink px-2 py-1 font-display text-[10px] tracking-[0.12em]"
                style={{ background: 'var(--accent-yellow)', color: 'var(--ink-fixed)' }}
              >
                {currentRank ? `RANK #${currentRank}` : 'JOIN THE LADDER'}
              </div>
              <div
                className="border-[2px] border-ink px-2 py-1 font-display text-[10px] tracking-[0.12em]"
                style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}
              >
                {activeTournaments} LIVE
              </div>
            </div>
          </RailShell>

          <RailShell title="NEXT CLEAR CHAIN">
            <div className="relative overflow-hidden border-[3px] border-ink" style={{ height: 24 }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: nextChainWidth,
                  background:
                    'repeating-linear-gradient(135deg, var(--accent) 0 18px, var(--accent-2) 18px 36px)',
                  transition: 'width 160ms ease',
                }}
              />
            </div>
            <div
              className="mt-3 flex items-center justify-between font-display text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-soft)' }}
            >
              <span>{streak > 0 ? `DAY ${streak} READY` : 'OPENING LINE'}</span>
              <span>+{Math.max(80, streak * 40)} BONUS</span>
            </div>
          </RailShell>

          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="SEASON" value={season !== null ? String(season).padStart(2, '0') : '—'} background="var(--paper-2)" />
            <MiniMetric label="WEEK" value={week !== null ? String(week).padStart(2, '0') : '—'} background="var(--accent-pink)" />
            <MiniMetric label="POOL" value={`$${formattedPool}`} background="var(--accent-lime)" />
            <MiniMetric label="OPEN" value={String(activeTournaments)} background="var(--accent-cyan)" />
          </div>

          <RailShell title="DAILY STREAK">
            <div className="flex items-center gap-3">
              <BrutalIcon name="flame" size={18} strokeWidth={2.5} className="text-ink" />
              <div>
                <div className="font-display text-[11px] tracking-[0.12em]" style={{ color: streakLabelColor }}>
                  {streak > 0 ? `DAY ${streak} · ${streak >= 7 ? '2X BONUS' : `${streak}X BONUS`}` : 'START YOUR STREAK'}
                </div>
                <div className="mt-1 font-display text-[10px] tracking-[0.1em]" style={{ color: 'var(--ink-soft)' }}>
                  Fill the week bar to lock your multiplier.
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[18px] border-[2px] border-ink"
                  style={{ background: i < streak ? 'var(--accent)' : 'var(--rule)' }}
                />
              ))}
            </div>
          </RailShell>
        </div>

        <div className="flex min-w-0 flex-col gap-4">{heroStack}</div>

        <div className="flex min-w-0 flex-col gap-5">
          <RailShell title="WEEKLY LADDER" accent>
            <div className="space-y-2">
              {topThree.length > 0 ? (
                topThree.map((entry, index) => {
                  const isCurrentUser = address?.toLowerCase() === entry.player.toLowerCase()
                  return (
                    <div
                      key={entry.player}
                      className="flex items-center gap-3 border-[3px] border-ink px-3 py-3"
                      style={{
                        background: index === 0 ? 'var(--accent-yellow)' : isCurrentUser ? 'var(--accent-cyan)' : 'var(--paper-2)',
                        color: index === 0 || isCurrentUser ? 'var(--ink-fixed)' : 'var(--ink)',
                      }}
                    >
                      <span className="w-6 font-display text-[16px]">#{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-display text-[11px] tracking-[0.08em]">
                        {entry.player.slice(0, 6)}…{entry.player.slice(-4)}
                      </span>
                      <span className="font-display text-[12px]" style={{ letterSpacing: '-0.02em' }}>
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div
                  className="border-[3px] border-ink px-3 py-4 font-display text-[10px] tracking-[0.12em]"
                  style={{ background: 'var(--paper-2)', color: 'var(--ink-soft)' }}
                >
                  Ladder is warming up.
                </div>
              )}
            </div>
          </RailShell>

          <RailShell title="DANGER WATCH">
            <div className="space-y-2">
              {[
                { label: '3×3 SQUARE', state: 'HIGH', bg: 'var(--piece-red)' },
                { label: '5-LONG LINE', state: 'MED', bg: 'var(--piece-orange)' },
                { label: 'Z-ZIGZAG', state: 'LOW', bg: 'var(--piece-lime)' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-[3px] border-ink px-3 py-3"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <span className="font-display text-[11px] tracking-[0.08em]" style={{ color: 'var(--ink)' }}>
                    {item.label}
                  </span>
                  <span
                    className="border-[2px] border-ink px-2 py-0.5 font-display text-[9px] tracking-[0.1em]"
                    style={{ background: item.bg, color: 'var(--ink-fixed)' }}
                  >
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
          </RailShell>

          <button
            onClick={handleShareBestScore}
            className="brutal-btn flex items-center justify-between border-[3px] border-ink px-5 py-5 font-display text-[11px] tracking-[0.18em]"
            style={{
              background: 'var(--accent-lime)',
              color: 'var(--ink-fixed)',
              boxShadow: '5px 5px 0 var(--shadow)',
            }}
          >
            <span className="flex items-center">
              <BrutalIcon name="rocket" size={16} className="mr-2" />
              SHARE BEST SCORE
            </span>
            <span className="text-xl leading-none">→</span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-3 pb-4 lg:hidden">{heroStack}</div>
    </div>
  )
}

export default LobbyScreen
