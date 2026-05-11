import { createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { http, custom, fallback } from 'wagmi'
import { celo } from 'wagmi/chains'

const rpcUrl = import.meta.env.VITE_RPC as string | undefined
const CELO_RPC = rpcUrl || 'https://forno.celo.org'

const celoTransport = fallback([
  custom({
    async request({ method, params }: { method: string; params?: unknown[] }) {
      const p = typeof window !== 'undefined' ? (window.ethereum as any) : null
      if (!p?.isMiniPay) throw new Error('not-minipay')
      return p.request({ method, params })
    },
  }),
  http(CELO_RPC),
])

export const injectedConnector = injected({
  target() {
    return {
      id: 'injected',
      name: 'MiniPay',
      provider:
        typeof window !== 'undefined' ? (window.ethereum as any) : undefined,
    }
  },
})

// Lean wagmi config for MiniPay — no web3auth, no rainbowkit wallet list.
// This config is intentionally excluded from the full provider's chunk so
// the web3auth SDK (~383 KiB) is never fetched for MiniPay users.
export const config = createConfig({
  chains: [celo],
  connectors: [injectedConnector],
  transports: { [celo.id]: celoTransport },
  ssr: false,
})
