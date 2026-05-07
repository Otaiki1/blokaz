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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <App />
    </Web3Provider>
  </StrictMode>,
)
