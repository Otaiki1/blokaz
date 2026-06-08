// ─── Beta tester whitelist ────────────────────────────────────────────────────
// Addresses listed here get new features before they roll out to everyone.
// To graduate a feature to all players: flip its flag from isBetaTester() to true.

const BETA_TESTERS = new Set([
  '0xcf6864d109724621cb94486ff2859977ab7efa5f',
  '0xfd1a3980f7473bdfe7461e78adde78c33d7b006b',
  '0xa09dc4b3ac1a2835eb14bc975e2d220b0c63c171',
  '0x9d089d7f439d458a787178b7f14312881c3bb443',
])

export function isBetaTester(addr?: string): boolean {
  if (!addr) return false
  return BETA_TESTERS.has(addr.toLowerCase())
}

// ─── Feature flags ────────────────────────────────────────────────────────────

// Shop & lottery power-ups — open to everyone.
export const isShopLotteryEnabled = (_addr?: string): boolean => true

// Auto-update banner — shown to beta testers first, then everyone once confirmed.
export const isAutoUpdateEnabled = (addr?: string): boolean => isBetaTester(addr)
