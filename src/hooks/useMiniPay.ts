import { useEffect } from 'react'
import { useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean
      isMetaMask?: boolean
      isOpera?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      [key: string]: unknown
    }
  }
}

export function isMiniPayEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.isMiniPay
}

export function useMiniPay() {
  return { isMiniPay: isMiniPayEnvironment() }
}

// Creates a connector that directly wraps window.ethereum without any
// isMetaMask / isOpera flag checks. This is required because:
//  - injected({ target: 'metaMask' }) requires isMetaMask===true AND rejects
//    providers with isOpera===true (MiniPay is Opera-based, so it would fail)
//  - injected() without a target has wagmi auto-connect prevention side-effects
// Using a custom target function is the only approach that reliably works on
// both Android (Opera Mini / standalone) and iOS (standalone).
function miniPayConnector() {
  return injected({
    target() {
      return {
        id: 'minipay',
        name: 'MiniPay',
        provider: typeof window !== 'undefined' ? window.ethereum : undefined,
      }
    },
  })
}

export function useMiniPayAutoConnect() {
  const { connect } = useConnect()

  useEffect(() => {
    if (isMiniPayEnvironment()) {
      connect({ connector: miniPayConnector() })
    }
  }, [connect])
}
