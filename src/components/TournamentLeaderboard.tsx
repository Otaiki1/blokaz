import React from 'react'
import { useTournamentLeaderboard, useUsername } from '../hooks/useBlokzGame'
import { useAccount } from 'wagmi'
import contractInfo from '../contract.json'

interface TournamentLeaderboardProps {
  tournamentId: bigint | null
  isOpen: boolean
  onClose: () => void
  prizePool?: bigint
}

const PlayerName: React.FC<{ address: string; isCurrentUser: boolean }> = ({ address, isCurrentUser }) => {
  const { username, isLoading } = useUsername(address as `0x${string}`)
  
  const truncatedAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (isLoading) return <div className="h-4 w-24 bg-white/5 animate-pulse rounded" />

  return (
    <span className={`font-mono text-sm ${isCurrentUser ? 'text-white font-bold' : 'text-gray-300'}`}>
      {username || truncatedAddress(address)}
    </span>
  )
}

const TournamentLeaderboard: React.FC<TournamentLeaderboardProps> = ({ tournamentId, isOpen, onClose, prizePool }) => {
  const { address } = useAccount()
  const { leaderboard, isLoading, refetch } = useTournamentLeaderboard(tournamentId ?? undefined)
  
  // Force a refetch whenever the leaderboard is opened to ensure data is fresh
  React.useEffect(() => {
    if (isOpen && tournamentId !== null) {
      console.log('Leaderboard opened, refetching rankings for TID:', tournamentId.toString())
      refetch()
    }
  }, [isOpen, tournamentId, refetch])

  const getPrizeEstimate = (rank: number) => {
    if (!prizePool || prizePool === 0n) return null
    // Distribution logic from contract:
    // 1st: 50%, 2nd: 25%, 3rd: 15% (if 3+ players)
    // protocol takes 5%, rewards pool takes 5%
    if (rank === 1) return (prizePool * 50n) / 100n
    if (rank === 2) return (prizePool * 25n) / 100n
    if (rank === 3) return (prizePool * 15n) / 100n
    return null
  }

  const formatAmount = (amt: bigint) => {
    return (Number(amt) / 1e6).toFixed(2)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#05050a]/95 backdrop-blur-3xl border-l border-blue-500/20 z-[90] transform transition-transform duration-500 ease-in-out shadow-[0_0_50px_rgba(0,242,255,0.1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-8 border-b border-white/5 bg-blue-500/5 relative overflow-hidden">
             {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full" />
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-white to-purple-400 bg-clip-text text-transparent">
                  TOURNAMENT #{tournamentId?.toString()}
                </h2>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.3em] mt-2">
                  Official Standings
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all group border border-white/5"
              >
                <svg className="w-5 h-5 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  Global Contenders
                </h3>
                <span className="text-[10px] text-gray-600 font-bold uppercase">
                  {leaderboard?.length || 0} Joined
                </span>
              </div>
              
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                ))
              ) : leaderboard && leaderboard.length > 0 ? (
                leaderboard
                  .sort((a, b) => b.score - a.score)
                  .map((entry, index) => {
                    const isCurrentUser = address?.toLowerCase() === entry.player.toLowerCase()
                    const rank = index + 1
                    const prize = getPrizeEstimate(rank)
                    
                    return (
                      <div 
                        key={entry.player}
                        className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                          isCurrentUser 
                            ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]' 
                            : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {/* Rank */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner ${
                          rank === 1 ? 'bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 text-yellow-500 border border-yellow-500/30' :
                          rank === 2 ? 'bg-gradient-to-br from-gray-300/20 to-gray-500/20 text-gray-400 border border-gray-400/20' :
                          rank === 3 ? 'bg-gradient-to-br from-orange-500/20 to-orange-700/20 text-orange-600 border border-orange-600/20' :
                          'bg-white/5 text-gray-500 border border-white/5'
                        }`}>
                          {rank}
                        </div>

                        {/* Player */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <PlayerName address={entry.player} isCurrentUser={isCurrentUser} />
                            {isCurrentUser && (
                              <span className="text-[8px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                YOU
                              </span>
                            )}
                          </div>
                          {prize && (
                            <div className="flex items-center gap-1.5 mt-1.5 animate-in fade-in slide-in-from-left-2">
                              <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">
                                Est. Prize:
                              </span>
                              <span className="text-xs font-black text-green-400">
                                {formatAmount(prize)} USDC
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className="text-2xl font-black text-white tabular-nums tracking-tighter">
                            {entry.score.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-blue-400/60 uppercase tracking-widest font-black">
                            Score
                          </div>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mb-4 text-2xl opacity-20">
                    🛡️
                  </div>
                  <p className="text-sm font-bold text-gray-500">The field is empty</p>
                  <p className="text-[10px] uppercase tracking-widest mt-1 text-gray-600">Be the first to claim the throne</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-white/5 bg-blue-500/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-relaxed font-bold opacity-60">
              Only members of this lobby are eligible for prizes. <br />
              Ranking is based on your single highest score.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default TournamentLeaderboard
