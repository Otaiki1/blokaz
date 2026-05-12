import React, { useState } from 'react'
import { BrutalIcon } from './BrutalIcon'

const TELEGRAM_SUPPORT = 'https://t.me/+ulIKRKsI1HYxNmQ0'

interface FAQItem {
  q: string
  a: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'How do I play Blokaz?',
    a: 'Drag or tap a piece from the tray at the bottom and drop it on the 9×9 board. Fill a complete row or column to clear it and earn points. The game ends when none of the three tray pieces can fit anywhere on the board.',
  },
  {
    q: 'Why does my wallet pop up when I start a game?',
    a: 'Blokaz records your game session on the Celo network. When you tap START, your wallet asks you to confirm a transaction that registers your session. Tap CONFIRM to proceed — without it the game cannot start.',
  },
  {
    q: 'Why does my wallet pop up again after the game ends?',
    a: 'After the game ends, a second transaction is sent to submit your final score to the network so it can appear on the leaderboard. Tap CONFIRM again to save your score — rejecting it means your score will not be recorded.',
  },
  {
    q: 'What happens if I reject a wallet popup?',
    a: 'If you reject the popup at game start, the game will not begin. If you reject it at game over, your score will not be saved or ranked. The game itself will still show your score locally, but it will not appear on the leaderboard.',
  },
  {
    q: 'What is a COMBO and how do I trigger one?',
    a: 'A combo happens when you clear more than one row or column with a single piece placement. The more clears you chain together in consecutive moves, the higher your combo multiplier grows, adding a large bonus to your score.',
  },
  {
    q: 'What is the weekly leaderboard?',
    a: 'Every game you play in Classic Mode is scored against all other players for the current week. The leaderboard resets at the start of each new epoch. Tap RANKS in the bottom bar to see the top scores.',
  },
  {
    q: 'How do tournaments work?',
    a: 'Tournaments are limited-time competitions with an entry fee and a prize pool. Join one from the TOURNEY tab, pay the entry fee, and play your best game. When the tournament ends, prizes are distributed to the top finishers automatically.',
  },
  {
    q: 'Is my game progress saved if I close the app?',
    a: 'Yes. Your current game is saved in the browser so you can continue it later. When you return to Classic Mode, tap CONTINUE GAME to pick up where you left off. Note: clearing your browser data will erase the saved session.',
  },
  {
    q: 'What network does Blokaz use?',
    a: 'Blokaz runs on the Celo network — a fast, low-fee blockchain. Transaction fees are very small (fractions of a cent). Make sure your wallet is connected to Celo Mainnet before playing.',
  },
  {
    q: 'What tokens can I use to revive my game?',
    a: 'If your game ends and you want another chance, you can pay a small revival fee ($0.001) using USDC, USDT, or USDm. The token selector appears in the Game Over screen.',
  },
  {
    q: 'How do I change the app theme?',
    a: 'Open the SETTINGS tab in the bottom bar (wrench icon). You will find four theme options: AUTO (follows your device), CREAM (light), NAVY (dark blue), and FOREST (dark green).',
  },
  {
    q: 'Where can I find the Terms of Service and Privacy Policy?',
    a: 'Both documents are available in the SETTINGS tab in the bottom bar. Scroll down to the LEGAL & SUPPORT section.',
  },
  {
    q: 'How do I contact support?',
    a: 'Join our Telegram community for the fastest help. The link is in the SETTINGS tab under LEGAL & SUPPORT, or you can tap the button below.',
  },
]

// ─── Accordion item ───────────────────────────────────────────────────────────

const FAQRow: React.FC<{ item: FAQItem; isOpen: boolean; onToggle: () => void }> = ({
  item,
  isOpen,
  onToggle,
}) => (
  <div className="border-b-[3px] border-ink last:border-b-0">
    <button
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
      style={{ background: isOpen ? 'var(--paper-2)' : 'transparent' }}
    >
      <span className="font-display text-[12px] uppercase tracking-[0.08em] leading-snug" style={{ color: 'var(--ink)' }}>
        {item.q}
      </span>
      <span
        className="mt-0.5 shrink-0 font-display text-[14px] leading-none transition-transform"
        style={{
          color: 'var(--ink-soft)',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        +
      </span>
    </button>
    {isOpen && (
      <div className="px-5 pb-4 pt-1">
        <p className="font-body text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {item.a}
        </p>
      </div>
    )}
  </div>
)

// ─── Sheet component ──────────────────────────────────────────────────────────

interface FAQSheetProps {
  onClose: () => void
}

const FAQSheet: React.FC<FAQSheetProps> = ({ onClose }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <div className="fixed inset-0 z-[350] flex flex-col">
      {/* Backdrop */}
      <button
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
        aria-label="Close FAQ"
      />

      {/* Sheet */}
      <div
        className="relative mt-auto flex max-h-[96dvh] w-full flex-col border-t-4 border-ink"
        style={{ background: 'var(--paper)', boxShadow: '0 -8px 0 var(--shadow)' }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between border-b-4 border-ink px-5 py-4"
          style={{ background: 'var(--paper-2)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center border-[3px] border-ink"
              style={{ background: 'var(--accent-yellow)' }}
            >
              <BrutalIcon name="alert" size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-[13px] uppercase tracking-[0.14em]">HELP & FAQ</div>
              <div className="font-body text-[10px]" style={{ color: 'var(--ink-soft)' }}>
                Common questions answered
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border-[3px] border-ink"
            style={{ background: 'var(--paper)', boxShadow: '2px 2px 0 var(--shadow)' }}
            aria-label="Close"
          >
            <BrutalIcon name="close" size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* FAQ list */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="border-b-4 border-ink">
            {FAQ_ITEMS.map((item, i) => (
              <FAQRow
                key={i}
                item={item}
                isOpen={openIndex === i}
                onToggle={() => toggle(i)}
              />
            ))}
          </div>

          {/* Support CTA */}
          <div className="p-5">
            <a
              href={TELEGRAM_SUPPORT}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 border-[3px] border-ink py-3 font-display text-[11px] uppercase tracking-widest"
              style={{
                background: 'var(--accent-lime)',
                color: 'var(--ink-fixed)',
                boxShadow: '4px 4px 0 var(--shadow)',
              }}
            >
              <BrutalIcon name="share" size={14} strokeWidth={2.5} />
              CONTACT SUPPORT ON TELEGRAM
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQSheet
