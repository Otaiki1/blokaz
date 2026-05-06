import React, { useState, useEffect, useCallback } from 'react'
import GameScreen from './components/GameScreen'
import TournamentGameScreen from './components/TournamentGameScreen'
import Header from './components/Header'
import Leaderboard from './components/Leaderboard'
import TournamentHall from './components/TournamentHall'
import AdminDashboard from './components/AdminDashboard'
import LobbyScreen from './components/LobbyScreen'
import AppFooter from './components/AppFooter'
import SplashScreen from './components/SplashScreen'
import { useGameStore } from './stores/gameStore'
import { useThemeStore, type ThemeMode } from './stores/themeStore'
import { IS_MINIPAY } from './utils/miniPay'

type AppView = 'lobby' | 'classic' | 'tournaments' | 'tournament-play' | 'admin'

// Only tournaments and admin are hash-routed (deep-linkable).
// Lobby and classic are state-only — refresh always returns to lobby.
const getViewFromHash = (hash: string): AppView | null => {
  if (hash === '#/tournaments') return 'tournaments'
  if (hash === '#/tournaments/play' || hash === '#/tournament-game') return 'tournament-play'
  if (hash === '#/admin') return 'admin'
  return null
}

const App: React.FC = () => {
  // Show splash on every fresh page load. App only mounts once per load,
  // so navigating between views never re-triggers it.
  const [showSplash, setShowSplash] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const { setTournamentId, forceReset, gameSession } = useGameStore()
  const [activeView, setActiveView] = useState<AppView>('lobby')
  // Hide the header bar while actively playing — the game chrome has its own back/pause
  const isPlayingGame = !!gameSession && (activeView === 'classic' || activeView === 'tournament-play')
  const setThemeMode = useThemeStore((state) => state.setMode)
  const handleSplashDone = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    const handleHashChange = () => {
      const nextView = getViewFromHash(window.location.hash)
      if (nextView === null) return // lobby/classic managed via direct state
      setActiveView(prev => {
        if (nextView !== prev) {
          setTimeout(() => forceReset(nextView === 'tournament-play'), 0)
        }
        return nextView
      })
      setShowLeaderboard(false)
    }
    window.addEventListener('hashchange', handleHashChange)
    // On initial load only honour tournament/admin deep links
    handleHashChange()
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [forceReset])

  useEffect(() => {
    const nextMode: ThemeMode = showLeaderboard
      ? 'leaderboard'
      : activeView === 'classic'
        ? 'classic'
        : activeView === 'tournaments'
          ? 'tournaments'
          : activeView === 'tournament-play'
            ? 'tournament-play'
            : activeView === 'admin'
              ? 'admin'
              : 'lobby'
    setThemeMode(nextMode)
  }, [activeView, setThemeMode, showLeaderboard])

  const handleNavigate = (view: AppView, clearTournament: boolean = true) => {
    if (view === 'lobby') {
      // Clear any leftover hash then update state directly
      if (window.location.hash) history.replaceState(null, '', window.location.pathname)
      forceReset()
      setActiveView('lobby')
    } else if (view === 'classic') {
      if (clearTournament) setTournamentId(null)
      forceReset()
      setActiveView('classic')
      // No hash change — refresh always returns to lobby
    } else if (view === 'tournaments') {
      window.location.hash = '#/tournaments'
    } else if (view === 'tournament-play') {
      window.location.hash = '#/tournaments/play'
    } else if (view === 'admin') {
      window.location.hash = '#/admin'
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {showSplash && <SplashScreen onDone={handleSplashDone} />}

      {/* Header: hidden during active gameplay — game chrome has its own back/pause */}
      {!isPlayingGame && (
        <Header
          onShowLeaderboard={() => setShowLeaderboard(true)}
          showLeaderboardAction={true}
          isLeaderboardOpen={showLeaderboard}
          activeView={activeView}
          onViewChange={handleNavigate}
        />
      )}

      <main className={`flex flex-col ${
        activeView === 'lobby' ? 'min-h-screen pt-[64px] pb-20'
        : activeView === 'classic'
          ? isPlayingGame
            ? 'h-dvh overflow-hidden pt-0 pb-16 lg:min-h-screen lg:h-auto lg:overflow-visible lg:pt-0 lg:pb-20 lg:items-center'
            : 'h-dvh overflow-hidden pt-16 pb-16 lg:min-h-screen lg:h-auto lg:overflow-visible lg:pt-[64px] lg:pb-20 lg:items-center'
        : activeView === 'tournament-play' ? 'pt-0 min-h-screen'
        : 'min-h-screen pt-[64px] pb-20 lg:items-center lg:pb-12'
      }`}>
        {activeView === 'lobby' ? (
          <LobbyScreen
            onPlayClassic={() => handleNavigate('classic')}
            onPlayTournaments={() => handleNavigate('tournaments')}
          />
        ) : activeView === 'classic' ? (
          <GameScreen
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onBack={() => handleNavigate('lobby')}
          />
        ) : activeView === 'tournaments' ? (
          <TournamentHall
            onBack={() => handleNavigate('lobby')}
            onEnterMatch={() => handleNavigate('tournament-play', false)}
          />
        ) : activeView === 'tournament-play' ? (
          <TournamentGameScreen
            onBackToHall={() => handleNavigate('tournaments', false)}
          />
        ) : (
          <AdminDashboard />
        )}
      </main>

      <Leaderboard
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Footer — always visible; provides ToS, Privacy, Support links (MiniPay requirement) */}
      {activeView !== 'classic' && activeView !== 'tournament-play' && (
        <AppFooter />
      )}
    </div>
  )
}

export default App
