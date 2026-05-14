import React, { useState } from 'react'
import { BrutalIcon } from './BrutalIcon'

const STORAGE_KEY = 'blokaz_tourn_onboarded_v1'

export const hasSeenTournamentOnboarding = () => {
  try { return !!localStorage.getItem(STORAGE_KEY) } catch { return false }
}
export const markTournamentOnboardingSeen = () => {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
}

interface Step {
  tag: string
  tagColor: string
  title: React.ReactNode
  body: string
  visual: React.ReactNode
}

const STEPS: Step[] = [
  // ── Step 1: Pick a bracket ───────────────────────────────────────────────
  {
    tag: 'STEP 1',
    tagColor: 'var(--accent-yellow)',
    title: <>PICK YOUR<br />BRACKET</>,
    body: 'Browse active tournaments. Each card shows the entry fee, prize pool, number of players, and end time. Active contests sit at the top — ended ones show below for results.',
    visual: (
      <div className="w-full px-2">
        <div
          className="border-[3px] border-ink p-3"
          style={{ background: 'var(--piece-cyan)', boxShadow: '4px 4px 0 var(--shadow)' }}
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <div
                className="mb-1 inline-block border-[2px] border-ink px-2 py-0.5 font-display text-[8px] uppercase tracking-widest"
                style={{ background: 'var(--accent-yellow)', color: 'var(--ink-fixed)', transform: 'rotate(-2deg)' }}
              >
                HOT
              </div>
              <div className="font-display text-base" style={{ color: 'var(--ink-fixed)', letterSpacing: '-0.02em' }}>
                Tournament #1
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[8px] uppercase tracking-widest" style={{ color: 'var(--ink-fixed)', opacity: 0.7 }}>ENTRY</div>
              <div
                className="border-[2px] border-ink px-2 py-0.5 font-display text-sm"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
              >
                1.00 USDT
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'POOL', value: '8.00 USDT' },
              { label: 'PLAYERS', value: '8/20' },
              { label: 'ENDS', value: 'Jan 20' },
            ].map((m) => (
              <div
                key={m.label}
                className="flex-1 border-[2px] border-ink p-1 text-center"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                <div className="font-display text-[7px] uppercase tracking-widest" style={{ opacity: 0.6, color: 'var(--ink-fixed)' }}>{m.label}</div>
                <div className="font-display text-[10px]" style={{ color: 'var(--ink-fixed)' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-center font-display text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-soft)' }}>
          Tap a card to see details and join
        </p>
      </div>
    ),
  },

  // ── Step 2: Pay entry ────────────────────────────────────────────────────
  {
    tag: 'STEP 2',
    tagColor: 'var(--accent-lime)',
    title: <>APPROVE &amp;<br />JOIN</>,
    body: 'Tap "APPROVE & JOIN". Your wallet will ask you to confirm twice — first to allow the USDT spend, then to actually join. Both are needed. Your entry fee goes straight into the prize pool.',
    visual: (
      <div className="flex w-full flex-col items-center gap-3 px-2">
        {[
          {
            num: '1',
            label: 'APPROVE USDT',
            sub: 'Allow the contract to spend your entry fee',
            color: 'var(--accent-yellow)',
          },
          {
            num: '2',
            label: 'JOIN TOURNAMENT',
            sub: 'Lock your seat and add to the prize pool',
            color: 'var(--accent-lime)',
          },
        ].map(({ num, label, sub, color }) => (
          <div
            key={num}
            className="flex w-full items-center gap-3 border-[3px] border-ink px-3 py-2.5"
            style={{ background: 'var(--paper-2)', boxShadow: '3px 3px 0 var(--shadow)' }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-ink font-display text-sm"
              style={{ background: color, color: 'var(--ink-fixed)' }}
            >
              {num}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-[10px] uppercase tracking-[0.14em]">{label}</span>
              <span className="font-body text-[10px] leading-snug" style={{ color: 'var(--ink-soft)' }}>{sub}</span>
            </div>
            <div
              className="ml-auto shrink-0 border-[2px] border-ink px-2 py-1 font-display text-[9px] uppercase tracking-widest"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              CONFIRM
            </div>
          </div>
        ))}
        <p className="font-display text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-soft)' }}>
          You only pay the entry fee once
        </p>
      </div>
    ),
  },

  // ── Step 3: Start your match ─────────────────────────────────────────────
  {
    tag: 'STEP 3',
    tagColor: 'var(--accent-pink)',
    title: <>COMMENCE<br />YOUR MATCH</>,
    body: 'Once you\'re in, tap "COMMENCE MATCH". This registers your game session on the blockchain so your score can be verified. Confirm the wallet popup and your match begins immediately.',
    visual: (
      <div className="flex w-full flex-col items-center gap-4 px-2">
        <div
          className="w-full border-[3px] border-ink py-3 text-center font-display text-sm uppercase tracking-[0.14em]"
          style={{ background: 'var(--accent-lime)', color: 'var(--ink-fixed)', boxShadow: '4px 4px 0 var(--shadow)' }}
        >
          COMMENCE MATCH
        </div>
        <div className="flex items-center gap-3">
          <div className="h-0.5 flex-1" style={{ background: 'var(--rule)' }} />
          <BrutalIcon name="zap" size={12} strokeWidth={2.5} />
          <div className="h-0.5 flex-1" style={{ background: 'var(--rule)' }} />
        </div>
        <div
          className="flex w-full items-center gap-3 border-[3px] border-ink px-3 py-3"
          style={{ background: 'var(--paper-2)', boxShadow: '3px 3px 0 var(--shadow)' }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center border-[2px] border-ink"
            style={{ background: 'var(--accent-yellow)' }}
          >
            <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--ink)' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[10px] uppercase tracking-[0.14em]">REGISTER GAME SESSION</span>
            <span className="font-body text-[10px]" style={{ color: 'var(--ink-soft)' }}>Locks your seed on-chain for fair scoring</span>
          </div>
          <div
            className="ml-auto shrink-0 border-[2px] border-ink px-2 py-1 font-display text-[9px] uppercase"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            CONFIRM
          </div>
        </div>
        <p className="font-display text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-soft)' }}>
          One confirmation — then you're live
        </p>
      </div>
    ),
  },

  // ── Step 4: Play & score ─────────────────────────────────────────────────
  {
    tag: 'STEP 4',
    tagColor: 'var(--accent-cyan)',
    title: <>PLAY FOR<br />THE TOP SPOT</>,
    body: 'Place pieces, clear full rows and columns, and chain combos to rack up points. Your score is calculated locally and submitted when the game ends. The highest score wins.',
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          {/* Mini grid */}
          <div className="grid border-[3px] border-ink" style={{ gridTemplateColumns: 'repeat(5, 20px)' }}>
            {Array.from({ length: 25 }).map((_, i) => {
              const filled = [0,1,5,6,10,11,15,16,20,21].includes(i)
              const clearing = [2,7,12,17,22].includes(i)
              return (
                <div
                  key={i}
                  className="h-5 w-5 border border-ink/20"
                  style={{
                    background: clearing
                      ? 'var(--accent-lime)'
                      : filled
                        ? 'var(--piece-pink)'
                        : 'var(--paper-2)',
                  }}
                />
              )
            })}
          </div>
          {/* Score stack */}
          <div className="flex flex-col gap-1.5">
            <div
              className="border-[2px] border-ink px-3 py-1 font-display text-sm tabular-nums"
              style={{ background: 'var(--ink)', color: 'var(--paper)', letterSpacing: '-0.02em' }}
            >
              4,280
            </div>
            <div
              className="border-[2px] border-ink px-2 py-1 font-display text-[10px] uppercase tracking-wider"
              style={{ background: 'var(--accent-yellow)', color: 'var(--ink-fixed)' }}
            >
              COMBO ×3
            </div>
            <div
              className="border-[2px] border-ink px-2 py-1 font-display text-[10px] uppercase tracking-wider"
              style={{ background: 'var(--accent-lime)', color: 'var(--ink-fixed)' }}
            >
              +220 BONUS
            </div>
          </div>
        </div>
        <p className="font-display text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-soft)' }}>
          You can play multiple matches — best score counts
        </p>
      </div>
    ),
  },

  // ── Step 5: Submit score ─────────────────────────────────────────────────
  {
    tag: 'STEP 5',
    tagColor: 'var(--piece-orange)',
    title: <>SUBMIT YOUR<br />SCORE</>,
    body: 'When the game ends, tap "SUBMIT SCORE" in the game-over screen. One final wallet confirmation records your score on-chain and locks it into the leaderboard.',
    visual: (
      <div className="flex w-full flex-col items-center gap-3 px-2">
        {/* Game-over card mock */}
        <div
          className="w-full border-[3px] border-ink p-3"
          style={{ background: 'var(--paper-2)', boxShadow: '4px 4px 0 var(--shadow)' }}
        >
          <div className="mb-1 font-display text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-soft)' }}>
            FINAL SCORE
          </div>
          <div className="mb-3 font-display text-3xl tabular-nums" style={{ letterSpacing: '-0.04em' }}>
            4,280
          </div>
          <div
            className="w-full border-[2px] border-ink py-2 text-center font-display text-[11px] uppercase tracking-widest"
            style={{ background: 'var(--accent-lime)', color: 'var(--ink-fixed)', boxShadow: '3px 3px 0 var(--shadow)' }}
          >
            SUBMIT SCORE
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: 'var(--accent-lime)' }}
          />
          <span className="font-display text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-soft)' }}>
            Score recorded on leaderboard
          </span>
        </div>
      </div>
    ),
  },

  // ── Step 6: Win prizes ───────────────────────────────────────────────────
  {
    tag: 'PRIZES',
    tagColor: 'var(--ink)',
    title: <>TOP SCORER<br />WINS IT ALL</>,
    body: 'When the tournament period ends, the prize pool is sent to the player with the highest verified score. Hit "FINALIZE" on the results card to trigger the payout, or just check the Final Results to see who won.',
    visual: (
      <div className="flex w-full flex-col items-center gap-3 px-2">
        {/* Podium */}
        <div className="flex items-end justify-center gap-2">
          {[
            { place: '#2', height: 40, bg: 'var(--paper-2)', label: '0 USDT' },
            { place: '#1', height: 64, bg: 'var(--accent-yellow)', label: '8 USDT' },
            { place: '#3', height: 28, bg: 'var(--paper-2)', label: '0 USDT' },
          ].map(({ place, height, bg, label }) => (
            <div key={place} className="flex flex-col items-center gap-1">
              <span className="font-display text-[9px] uppercase tracking-widest" style={{ color: 'var(--ink-soft)' }}>{label}</span>
              <div
                className="flex w-14 items-center justify-center border-[2px] border-ink font-display text-[11px]"
                style={{ height, background: bg, color: 'var(--ink-fixed)', boxShadow: '3px 3px 0 var(--shadow)' }}
              >
                {place}
              </div>
            </div>
          ))}
        </div>
        <div
          className="flex w-full items-center justify-between border-[3px] border-ink px-3 py-2"
          style={{ background: 'var(--accent-yellow)', color: 'var(--ink-fixed)', boxShadow: '3px 3px 0 var(--shadow)' }}
        >
          <span className="font-display text-[10px] uppercase tracking-widest">WINNER TAKES</span>
          <span className="font-display text-base tabular-nums">100% POOL</span>
        </div>
        <p className="font-display text-[9px] uppercase tracking-widest text-center" style={{ color: 'var(--ink-soft)' }}>
          Payout is automatic via smart contract
        </p>
      </div>
    ),
  },
]

interface TournamentHowToPlayProps {
  onDone: () => void
}

const TournamentHowToPlay: React.FC<TournamentHowToPlayProps> = ({ onDone }) => {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleDone = () => {
    markTournamentOnboardingSeen()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center px-0 pb-16 sm:items-center sm:px-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={handleDone}
      />

      {/* Card */}
      <div
        className="relative flex w-full max-w-sm flex-col overflow-hidden border-t-4 border-ink sm:border-4"
        style={{
          background: 'var(--paper)',
          boxShadow: '0 -8px 0 var(--shadow), 8px 8px 0 var(--shadow)',
          maxHeight: '96dvh',
        }}
      >
        {/* Top strip */}
        <div
          className="flex shrink-0 items-center justify-between border-b-4 border-ink px-5 py-3"
          style={{ background: current.tagColor }}
        >
          <span
            className="font-display text-[11px] uppercase tracking-[0.2em]"
            style={{
              color: current.tagColor === 'var(--ink)' ? 'var(--paper)' : 'var(--ink-fixed)',
            }}
          >
            {current.tag}
          </span>
          <button
            onClick={handleDone}
            className="font-display text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
            style={{
              color: current.tagColor === 'var(--ink)' ? 'var(--paper)' : 'var(--ink-fixed)',
            }}
          >
            SKIP
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
          <h2
            className="font-display uppercase leading-[1.05]"
            style={{ fontSize: 'clamp(1.35rem, 6vw, 1.75rem)', letterSpacing: '-0.02em' }}
          >
            {current.title}
          </h2>

          <div
            className="flex items-center justify-center border-4 border-ink py-5"
            style={{ background: 'var(--paper-2)', boxShadow: '4px 4px 0 var(--shadow)' }}
          >
            {current.visual}
          </div>

          <p className="font-body text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-between border-t-4 border-ink px-5 py-4"
          style={{ background: 'var(--paper-2)' }}
        >
          {/* Step dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="h-2 border-[2px] border-ink transition-all"
                style={{
                  width: i === step ? 24 : 8,
                  background: i === step ? 'var(--ink)' : 'var(--rule)',
                }}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="brutal-btn border-[3px] border-ink bg-paper px-4 py-2 font-display text-[11px] uppercase tracking-widest"
                style={{ boxShadow: '3px 3px 0 var(--shadow)' }}
              >
                ← BACK
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleDone}
                className="brutal-btn border-[3px] border-ink px-5 py-2 font-display text-[11px] uppercase tracking-widest"
                style={{
                  background: 'var(--accent-lime)',
                  color: 'var(--ink-fixed)',
                  boxShadow: '3px 3px 0 var(--shadow)',
                }}
              >
                LET'S GO →
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="brutal-btn border-[3px] border-ink px-5 py-2 font-display text-[11px] uppercase tracking-widest"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  boxShadow: '3px 3px 0 var(--shadow)',
                }}
              >
                NEXT →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TournamentHowToPlay
