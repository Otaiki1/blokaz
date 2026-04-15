import React, { useState } from 'react'
import GameScreen from './components/GameScreen'
import Header from './components/Header'
import Leaderboard from './components/Leaderboard'
import TournamentHall from './components/TournamentHall'

const App: React.FC = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [activeView, setActiveView] = useState<'game' | 'tournaments'>('game')

  console.log('App Rendering:', { activeView })

  const handleNavigate = (view: 'game' | 'tournaments') => {
    console.log('App: navigating to', view)
    setActiveView(view)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <Header 
        onShowLeaderboard={() => setShowLeaderboard(true)} 
        activeView={activeView}
        onViewChange={handleNavigate}
      />
      
      <main className="pt-24 pb-12 flex flex-col items-center justify-center">
        {activeView === 'game' ? (
          <GameScreen />
        ) : (
          <TournamentHall 
            onBack={() => setActiveView('game')} 
            onEnterMatch={() => setActiveView('game')} 
          />
        )}
      </main>

      <Leaderboard 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
    </div>
  )
}

export default App
