import { toDataSuffix } from '@celo/attribution-tags'

// Celo ERC-8021 attribution tag issued to Blokaz (MiniPay). Appended to the
// calldata of every transaction the app sends so on-chain activity is credited
// to us. Invisible to the contracts we call — the EVM discards trailing bytes,
// so it never changes execution or gas. Opaque token; keep it out of anything
// public-facing.
export const ATTRIBUTION_TAG = 'celo_m49b7rgt'

// Encoded suffix (hex). Computed once at module load; contains no browser APIs,
// so it is safe to evaluate anywhere.
export const ATTRIBUTION_SUFFIX = toDataSuffix(ATTRIBUTION_TAG) as `0x${string}`
