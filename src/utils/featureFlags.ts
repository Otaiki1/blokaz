// ─── Feature flags ────────────────────────────────────────────────────────────

// Shop & lottery power-ups — open to everyone.
export const isShopLotteryEnabled = (_addr?: string): boolean => true

// Auto-update banner — open to everyone.
export const isAutoUpdateEnabled = (_addr?: string): boolean => true

// ─── Web access whitelist ─────────────────────────────────────────────────────
// Addresses here bypass the MiniPay gate on web — full access without restriction.
const WEB_ACCESS_WHITELIST = [
  '0xe1a0f916e859624d4edbada23e4382d327eaf626',
]

export function isWebWhitelisted(address?: string | null): boolean {
  if (!address) return false
  return WEB_ACCESS_WHITELIST.includes(address.toLowerCase())
}
