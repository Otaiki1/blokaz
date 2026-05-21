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

// True when the user is on a regular browser (not inside MiniPay)
export const isWebBrowser = (): boolean => !isMiniPay()

const TRIAL_KEY = 'blokaz:trial_used'

// Whether the one free web trial has already been consumed
export const hasUsedTrial = (): boolean => {
  try { return localStorage.getItem(TRIAL_KEY) === '1' } catch { return false }
}

// Mark the trial as consumed — call once when the first web game starts
export const markTrialUsed = (): void => {
  try { localStorage.setItem(TRIAL_KEY, '1') } catch {}
}

// Gate condition: non-MiniPay browser that has already used the trial
export const isWebTrialGated = (): boolean => isWebBrowser() && hasUsedTrial()
