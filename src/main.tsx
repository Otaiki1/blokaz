import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeThemeStore, type ThemeMode } from './stores/themeStore'

const initialMode: ThemeMode =
  window.location.hash === '#/tournaments' ||
  window.location.hash === '#/tournaments/play' ||
  window.location.hash === '#/tournament-game'
    ? 'tournaments'
    : window.location.hash === '#/admin'
      ? 'admin'
      : 'lobby'

initializeThemeStore(initialMode)

// Detect MiniPay synchronously — the WebView provider sets window.ethereum.isMiniPay
// before any page scripts execute, so this check is reliable at module load time.
const isMiniPay = typeof window !== 'undefined' && Boolean((window as any).ethereum?.isMiniPay)

// Load the lean provider for MiniPay (no web3auth, saves ~383 KiB), or the full
// provider for browser users who may need social login.
// @vite-ignore prevents Vite from analysing and preloading both branches for every
// user — only the branch that actually executes is ever fetched.
const providerImport = isMiniPay
  ? import(/* @vite-ignore */ './providers/Web3ProviderLite')
  : import(/* @vite-ignore */ './providers/Web3Provider')

providerImport.then(({ Web3Provider }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Web3Provider>
        <App />
      </Web3Provider>
    </StrictMode>,
  )
})
