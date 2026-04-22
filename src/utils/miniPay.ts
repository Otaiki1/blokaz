declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      [key: string]: unknown
    }
  }
}

// Static constant — may be false if MiniPay hasn't injected yet at module load
export const IS_MINIPAY: boolean =
  typeof window !== 'undefined' && window.ethereum?.isMiniPay === true

// Live check — always accurate, evaluated at call time
export const isMiniPay = (): boolean =>
  typeof window !== 'undefined' && !!(window.ethereum as any)?.isMiniPay
