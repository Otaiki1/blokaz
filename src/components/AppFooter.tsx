import React from 'react'

const TELEGRAM_SUPPORT = 'https://t.me/+ulIKRKsI1HYxNmQ0'
const TOS_URL = 'https://blokaz.xyz/terms'
const PRIVACY_URL = 'https://blokaz.xyz/privacy'

/**
 * Persistent app footer — provides in-app links to Terms of Service,
 * Privacy Policy, and support channel. Required for MiniPay listing.
 */
const AppFooter: React.FC = () => {
  return (
    <footer
      className="w-full border-t-[2px] border-ink"
      style={{ background: 'var(--paper)', paddingTop: 10, paddingBottom: 10 }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4">
        <span
          className="font-display text-[9px] tracking-[0.12em]"
          style={{ color: 'var(--ink-soft)', opacity: 0.6 }}
        >
          © {new Date().getFullYear()} BLOKAZ
        </span>

        <a
          href={TOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[9px] tracking-[0.12em] underline-offset-2 hover:underline"
          style={{ color: 'var(--ink-soft)' }}
        >
          TERMS
        </a>

        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-display text-[9px] tracking-[0.12em] underline-offset-2 hover:underline"
          style={{ color: 'var(--ink-soft)' }}
        >
          PRIVACY
        </a>

        <a
          href={TELEGRAM_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-display text-[9px] tracking-[0.12em] underline-offset-2 hover:underline"
          style={{ color: 'var(--ink-soft)' }}
        >
          {/* Telegram send icon */}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          SUPPORT
        </a>
      </div>
    </footer>
  )
}

export default AppFooter
