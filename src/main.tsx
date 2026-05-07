import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Web3Provider } from './providers/Web3Provider'
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

// web3auth/modal dynamically injects a <link> for Inter from Google Fonts, which
// the browser treats as render-blocking even though our app doesn't use Inter.
// Watch for it and convert it to a non-blocking deferred load so it no longer
// sits on the LCP critical path.
;(function deferWeb3AuthFont() {
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (
          node instanceof HTMLLinkElement &&
          node.rel === 'stylesheet' &&
          node.href.includes('googleapis.com') &&
          node.href.includes('Inter')
        ) {
          node.media = 'print'
          node.addEventListener('load', () => { node.media = 'all' }, { once: true })
        }
      }
    }
  })
  obs.observe(document.head, { childList: true })
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>,
)
