import React from 'react'

interface ScoreBarProps {
  score: number
  comboStreak: number
  tournamentId?: bigint | null
}

const ScoreBar: React.FC<ScoreBarProps> = ({ score, comboStreak, tournamentId }) => {
  const isTournament = tournamentId !== null && tournamentId !== undefined

  return (
    <div className={`flex items-center justify-between px-6 py-4 transition-all duration-500 ${
      isTournament ? 'bg-indigo-950/20 border-b border-indigo-500/10' : ''
    }`}>
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className={`text-[10px] uppercase tracking-[0.2em] font-black mb-1 ${
            isTournament ? 'text-blue-400' : 'text-gray-500'
          }`}>
            Live Score
          </div>
          <div className={`text-4xl font-black tabular-nums tracking-tighter ${
            isTournament 
              ? 'bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
              : 'text-white'
          }`}>
            {score.toLocaleString()}
          </div>
          {isTournament && (
            <div className="absolute -bottom-2 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 to-transparent rounded-full" />
          )}
        </div>

        {isTournament && (
          <div className="flex flex-col items-start">
             <div className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em] mb-1">Status</div>
             <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <span className="text-xs animate-pulse">🏆</span>
                <span className="text-[10px] text-white font-black uppercase tracking-tight">Match Active</span>
             </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {comboStreak > 0 && (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2 border transition-all duration-300 animate-in zoom-in ${
            isTournament 
              ? 'bg-pink-500/20 border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.2)]'
              : 'bg-purple-600/20 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
          }`}>
            <span className="text-xl">🔥</span>
            <span className={`font-black text-xl italic tracking-tighter ${
              isTournament ? 'text-pink-400' : 'text-purple-400'
            }`}>
              x{comboStreak}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ScoreBar
