import React, { useMemo } from 'react'
import { useGameStore } from '../stores/gameStore'
import { packMoves } from '../engine/replay'
import { useSubmitScore, useActiveGame, useSubmitTournamentScore } from '../hooks/useBlokzGame'
import { useAccount, useReadContract } from 'wagmi'
import { BLOKZ_GAME_ABI } from '../constants/abi'
import contractInfo from '../contract.json'
import { keccak256, encodePacked } from 'viem'
import {
  CLASSIC_SESSION_STORAGE_KEY,
  TOURNAMENT_SESSION_STORAGE_KEY,
  clearStoredGameSession,
  readStoredGameSession,
} from '../utils/gameSessionStorage'

const CONTRACT_ADDRESS = contractInfo.address as `0x${string}`

interface GameOverModalProps {
  score: number
  onPlayAgain: () => void
  mode: 'classic' | 'tournament'
}

const EMPTY_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'

const GameOverModal: React.FC<GameOverModalProps> = ({ score, onPlayAgain, mode }) => {
  const { address } = useAccount()
  const { gameId: activeGameId, isLoading: isLoadingGameId } = useActiveGame(address)
  const { gameSession, onChainSeed, onChainGameId, onChainStatus, forceReset, tournamentId, setTournamentId } = useGameStore()
  const { submitScore, isPending, isConfirming, isSuccess, error } = useSubmitScore()
  const { submitTournamentScore, isPending: isToursPending, isConfirming: isToursConfirming, isSuccess: isToursSuccess, error: toursError } = useSubmitTournamentScore()
  const storageKey = mode === 'tournament' ? TOURNAMENT_SESSION_STORAGE_KEY : CLASSIC_SESSION_STORAGE_KEY
  const isTournamentMode = mode === 'tournament' && tournamentId !== null

  // Use the store's gameId if available, fall back to the activeGame hook
  const effectiveGameId = onChainGameId || activeGameId

  // Pre-flight check: Fetch the registered seedHash from the contract
  const { data: gameData, isLoading: isLoadingContract } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: BLOKZ_GAME_ABI,
    functionName: 'games',
    args: effectiveGameId ? [effectiveGameId] : undefined,
    query: {
      enabled: !!effectiveGameId,
    }
  })

  // --- SEED RECOVERY ---
  const recoveredSeed = useMemo(() => {
    if (onChainSeed) return onChainSeed
    if (!address) return null

    return readStoredGameSession(storageKey, address, CONTRACT_ADDRESS)?.seed ?? null
  }, [address, onChainSeed, storageKey])

  const onChainHash = useMemo(() => {
    if (!gameData) return null

    const txData = gameData as { seedHash?: `0x${string}` } & readonly unknown[]
    return (txData.seedHash ?? txData[1] ?? null) as `0x${string}` | null
  }, [gameData])

  // Verify seed continuity locally
  const isSeedMatch = useMemo(() => {
    if (!recoveredSeed || !address) {
      console.log('--- Submission Pre-flight [ABORTED] ---')
      console.log('Reason: Missing seed or address')
      return false
    }

    if (!gameData) {
      console.log('--- Submission Pre-flight [LOADING] ---')
      console.log('Waiting for contract data for Game ID:', effectiveGameId?.toString())
      return false
    }
    
    const expectedHash = keccak256(encodePacked(['bytes32', 'address'], [recoveredSeed, address]))
    if (!onChainHash) {
      return false
    }
    
    console.log('--- Submission Pre-flight Check ---')
    console.log('Contract Address:', CONTRACT_ADDRESS)
    console.log('Effective Game ID:', effectiveGameId?.toString())
    console.log('Address:', address)
    console.log('Seed recovered:', recoveredSeed)
    console.log('Expected Hash:', expectedHash)
    console.log('On-chain Hash:', onChainHash)
    console.log('Match Result:', expectedHash === onChainHash)
    
    return expectedHash === onChainHash
  }, [recoveredSeed, address, effectiveGameId, gameData, onChainHash])

  const isLoading = isLoadingGameId || isLoadingContract

  const resetForNextGame = () => {
    const activeTournamentId = tournamentId
    clearStoredGameSession(storageKey)
    forceReset()

    if (mode === 'tournament' && activeTournamentId !== null) {
      setTournamentId(activeTournamentId)
    }
  }

  const handleAbandon = () => {
    resetForNextGame()
    onPlayAgain()
  }

  const handleSubmit = () => {
    if (!gameSession || !recoveredSeed || !effectiveGameId || !isSeedMatch) return
    if (isPending || isConfirming || isSuccess) return

    const packed = packMoves(gameSession.moveHistory)
    
    if (isTournamentMode) {
      submitTournamentScore(
        tournamentId,
        effectiveGameId,
        recoveredSeed,
        packed,
        gameSession.score,
        gameSession.moveHistory.length
      )
    } else {
      submitScore(
        effectiveGameId,
        recoveredSeed,
        packed,
        gameSession.score,
        gameSession.moveHistory.length
      )
    }
  }

  const isRegistering = isPending || isConfirming || isToursPending || isToursConfirming
  const isSyncing = onChainStatus === 'pending' || onChainStatus === 'syncing'
  const isAllSuccess = isSuccess || isToursSuccess
  const hasError = error || toursError

  // Improved canSubmit: Allow submission if we have an effective game ID and seeds match,
  // even if the in-memory onChainStatus is 'none' (recovery case)
  const isRegisteredOrRecovered = onChainStatus === 'registered' || (!!effectiveGameId && onChainStatus === 'none' && !isLoading)
  const canSubmit = !isRegistering && !isAllSuccess && isSeedMatch && !!effectiveGameId && isRegisteredOrRecovered

  // Clear seed from storage once submission is successful
  React.useEffect(() => {
    if (isAllSuccess) {
      clearStoredGameSession(storageKey)
    }
  }, [isAllSuccess, storageKey])

  // --- AUTO-SUBMIT FOR TOURNAMENTS ---
  // If we are in a tournament match and the session is verified, 
  // trigger the submission prompt immediately on game over.
  const submissionTriggeredRef = React.useRef(false)
  React.useEffect(() => {
    if (isTournamentMode && canSubmit && !submissionTriggeredRef.current && !isRegistering && !isAllSuccess) {
      console.log('--- Auto-triggering Tournament Submission ---')
      submissionTriggeredRef.current = true
      // Delay slightly to allow the modal to animate in
      const timer = setTimeout(() => {
        handleSubmit()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isTournamentMode, canSubmit, isRegistering, isAllSuccess])

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-lg z-50 animate-in fade-in duration-300">
      <div className="bg-[#1a1b24] p-8 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-4 text-center transform scale-110">
        <div className="mb-2 text-blue-400 font-bold tracking-widest text-xs uppercase">
          {isTournamentMode ? 'Tournament Match Complete' : 'Classic Run Complete'}
        </div>
        <h2 className="text-5xl font-black mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          {score.toLocaleString()}
        </h2>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            {isSyncing ? (
              <div className="flex flex-col items-center gap-2 text-yellow-500 text-sm">
                <div className="w-4 h-4 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                <span className="font-bold uppercase tracking-tighter text-[10px]">Registering Session...</span>
                <p className="text-[9px] text-gray-500 normal-case italic">Wait a moment to submit this score to the leaderboard.</p>
              </div>
            ) : effectiveGameId ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-center gap-2">
                   <div className="text-[10px] text-gray-500 uppercase tracking-tighter">On-Chain Session</div>
                   {onChainStatus === 'none' && (
                     <span className="text-[8px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded font-black uppercase">Recovered</span>
                   )}
                </div>
                <div className="text-lg font-mono text-blue-400">#{effectiveGameId.toString()}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Practice Session</div>
                <div className="text-xs text-gray-400 italic">No rewards this time</div>
              </div>
            )}
          </div>

          {effectiveGameId && !isSeedMatch && !isLoading && gameData && onChainStatus === 'registered' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-left">
              <div className="font-bold mb-1 flex items-center gap-2">
                <span className="text-lg">⚠️</span> 
                {onChainHash === EMPTY_HASH 
                  ? 'Stale Deployment' 
                  : 'Seed Mismatch'}
              </div>
              <p className="opacity-80 leading-relaxed italic text-[10px]">
                {onChainHash === EMPTY_HASH
                  ? `This session (Game #${effectiveGameId.toString()}) appears to be from a previous deployment of the game.`
                  : `Your local seed doesn't match the record for #${effectiveGameId.toString()}. This happens if your session was reset.`}
              </p>
              <button
                onClick={handleAbandon}
                className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition-all active:scale-95"
              >
                Reset Session
              </button>
            </div>
          )}

          {isRegisteredOrRecovered && isSeedMatch && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:grayscale text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isRegistering ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isConfirming ? 'Recording...' : 'Signing...'}
                </>
              ) : isAllSuccess ? (
                'Score Recorded! ✓'
              ) : (
                isTournamentMode ? 'Submit to Tournament' : 'Submit to Classic Leaderboard'
              )}
            </button>
          )}

          <button
            onClick={handleAbandon}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 rounded-xl transition-all"
          >
            {isAllSuccess ? 'Play Again' : 'Discard & New Game'}
          </button>
        </div>


        {/* Error State */}
        {hasError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-left">
            <div className="font-bold mb-1 flex items-center gap-2">
              <span className="text-lg">❌</span> 
              {(error?.message || toursError?.message)?.includes('863a7486') ? 'Incompatible Session' : 'Submission Failed'}
            </div>
            <p className="opacity-80 leading-relaxed">
              {(error?.message || toursError?.message)?.includes('863a7486') 
                ? 'This session is out of sync with the on-chain recorded seed.'
                : (error?.message || toursError?.message) || 'An error occurred while submitting your score.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameOverModal
