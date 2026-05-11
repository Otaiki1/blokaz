import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, useConnect, useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config, injectedConnector } from '../config/wagmi-lite'
import React, { useEffect } from 'react'

const queryClient = new QueryClient()

const MiniPayAutoConnect: React.FC = () => {
  const { connect } = useConnect()
  const { isConnected } = useAccount()

  useEffect(() => {
    if (isConnected) return
    const timer = setTimeout(() => {
      if (!(window.ethereum as any)?.isMiniPay) return
      connect({ connector: injectedConnector })
    }, 1000)
    return () => clearTimeout(timer)
  }, [isConnected, connect])

  return null
}

// Lean provider for MiniPay users — identical API to Web3Provider but omits
// the web3auth SDK entirely. RainbowKit is still included so that any
// component using ConnectButton (guarded by IS_MINIPAY checks) doesn't
// throw a missing-context error if it ever mounts.
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniPayAutoConnect />
        <RainbowKitProvider
          theme={darkTheme()}
          appInfo={{ appName: 'Blokaz', learnMoreUrl: 'https://blokaz.com' }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
