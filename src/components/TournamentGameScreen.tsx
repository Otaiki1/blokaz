import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { GridRenderer } from '../canvas/GridRenderer'
import { PieceRenderer } from '../canvas/PieceRenderer'
import { TouchController } from '../canvas/TouchController'
import { AnimationManager } from '../canvas/AnimationManager'
import { Grid } from '../engine/grid'
import type { ShapeDefinition } from '../engine/shapes'
import ScoreBar from './ScoreBar'
import GameOverModal from './GameOverModal'
import TournamentLeaderboard from './TournamentLeaderboard'
import { hapticImpact, hapticNotification, hapticError } from '../miniapp/haptics'
import { useStartTournamentGame, generateGameSeed, useActiveGame } from '../hooks/useBlokzGame'
import { useAccount } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import contractInfo from '../contract.json'
import {
  TOURNAMENT_SESSION_STORAGE_KEY,
  readStoredGameSession,
  writeStoredGameSession,
} from '../utils/gameSessionStorage'

const CONTRACT_ADDRESS = contractInfo.address as `0x${string}`

interface TournamentGameScreenProps {
  onBackToHall: () => void
}

const TournamentGameScreen: React.FC<TournamentGameScreenProps> = ({ onBackToHall }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animManagerRef = useRef<AnimationManager>(new AnimationManager())
  const lastTimeRef = useRef<number>(0)

  const { 
    gameSession, score, comboStreak, isGameOver, 
    startGame, setOnChainData,
    onChainStatus, tournamentId, setTournamentId, 
    onChainSeed, onChainGameId
  } = useGameStore()

  const { address, isConnected } = useAccount()
  const { refetch: refetchActiveGame } = useActiveGame(address)
  const { startTournamentGame: contractStartTournamentGame, isPending, isConfirming, isSuccess } = useStartTournamentGame()
  
  const [currentSeed, setCurrentSeed] = useState<{seed: `0x${string}`, hash: `0x${string}`} | null>(null)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)

  // --- HYDRATION ---
  useEffect(() => {
    if (!isConnected || !address) return

    const storedSession = readStoredGameSession(
      TOURNAMENT_SESSION_STORAGE_KEY,
      address,
      CONTRACT_ADDRESS
    )

    if (storedSession) {
      console.log('Hydrating tournament session from storage', storedSession)
      setOnChainData(BigInt(storedSession.gameId || 0), storedSession.seed, 'none')

      if (storedSession.tournamentId && !tournamentId) {
        setTournamentId(BigInt(storedSession.tournamentId))
      }
    }
  }, [isConnected, address, setOnChainData, setTournamentId, tournamentId])

  // Redirect if no tournamentId is active (sanity check)
  useEffect(() => {
    if (tournamentId === null) {
      onBackToHall()
    }
  }, [tournamentId, onBackToHall])

  // 1. Handle Start (On-chain ONLY)
  const handleStartGame = () => {
    if (!isConnected || !address) return
    
    // Check if we HAVE a hydrated seed with an ACTIVE gameId
    if (onChainSeed && onChainGameId && onChainGameId !== 0n) {
      console.log('Using hydrated seed for tournament game engine recovery:', onChainSeed)
      const localSeed = BigInt(keccak256(encodePacked(['bytes32', 'address'], [onChainSeed, address])).slice(0, 18))
      startGame(localSeed, true) // TRUE to preserve onChain data
      return
    }

    const { seed, hash } = generateGameSeed(address)
    
    // Start local engine
    const localSeed = BigInt(hash.slice(0, 18))
    startGame(localSeed)
    
    setCurrentSeed({ seed, hash })
    setOnChainData(0n, seed, 'pending')
    
    writeStoredGameSession(TOURNAMENT_SESSION_STORAGE_KEY, {
      address,
      seed,
      hash,
      gameId: null,
      tournamentId: tournamentId?.toString(),
      contractAddress: CONTRACT_ADDRESS
    })
    
    contractStartTournamentGame(tournamentId!, hash)
  }

  // 2. Background Sync
  useEffect(() => {
    if (isSuccess && currentSeed && address) {
      setOnChainData(0n, currentSeed.seed, 'syncing')
      
      const timer = setInterval(async () => {
        const res = await refetchActiveGame()
        const newGameId = res.data as bigint
        if (newGameId && newGameId !== 0n) {
          setOnChainData(newGameId, currentSeed.seed, 'registered')
          
          writeStoredGameSession(TOURNAMENT_SESSION_STORAGE_KEY, {
            address,
            seed: currentSeed.seed,
            hash: currentSeed.hash,
            gameId: newGameId.toString(),
            tournamentId: tournamentId?.toString(),
            contractAddress: CONTRACT_ADDRESS
          })
          
          clearInterval(timer)
        }
      }, 2000)
      
      return () => clearInterval(timer)
    }
  }, [address, currentSeed, isSuccess, refetchActiveGame, setOnChainData, tournamentId])

  // Initialize canvas renderers
  useEffect(() => {
    if (!canvasRef.current || !gameSession) return

    const canvas = canvasRef.current
    const gridSize = Math.min(window.innerWidth - 32, window.innerHeight * 0.55)
    const cellSize = gridSize / 9
    const trayGap = Math.round(cellSize * 0.5)
    const trayHeight = Math.round(gridSize / 3)
    const trayY = gridSize + trayGap

    canvas.width = gridSize
    canvas.height = gridSize + trayGap + trayHeight
    canvas.style.width = `${gridSize}px`
    canvas.style.height = `${canvas.height}px`

    const gridRenderer = new GridRenderer(canvas, gridSize)
    const pieceRenderer = new PieceRenderer(canvas, trayY, cellSize)
    const animManager = animManagerRef.current

    const touchController = new TouchController(
      canvas,
      gridRenderer,
      pieceRenderer,
      (pieceIndex: number, row: number, col: number) => {
        const result = useGameStore.getState().placePiece(pieceIndex, row, col)
        if (!result?.success) {
          hapticError()
          return
        }

        hapticImpact()
        const linesCleared = result.linesCleared
        if (linesCleared && (linesCleared.rows.length > 0 || linesCleared.cols.length > 0)) {
          hapticNotification()
          animManager.trigger('LINE_CLEAR', {
            rows: linesCleared.rows,
            cols: linesCleared.cols,
          })
          if (result.scoreEvent && result.scoreEvent.newComboStreak > 0) {
            animManager.trigger('COMBO', { streak: result.scoreEvent.newComboStreak })
          }
        }

        if (result.scoreEvent && result.scoreEvent.totalPoints > 0) {
          animManager.trigger('SCORE', {
            x: gridSize * 0.5,
            y: gridSize * 0.45,
            score: result.scoreEvent.totalPoints,
          })
        }
      },
      (shape: ShapeDefinition, row: number, col: number) => {
        if (!shape) return false
        const session = useGameStore.getState().gameSession
        return session ? Grid.canPlace(session.grid, shape, row, col) : false
      }
    )

    let rafHandle: number
    lastTimeRef.current = 0
    
    const render = (timestamp: number) => {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp
      animManager.update(delta)

      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const currentSession = useGameStore.getState().gameSession
      if (!currentSession) return

      const ghost = (window as any).activeGhost as { row: number; col: number; valid: boolean } | null
      const dragState = touchController.getDragState()
      let ghostCells: { row: number; col: number; valid: boolean }[] | undefined

      if (ghost && dragState.isDragging && dragState.dragIndex !== null) {
        const shape = currentSession.currentPieces[dragState.dragIndex]
        if (shape) {
          ghostCells = shape.cells
            .map(([dr, dc]) => ({
              row: ghost.row + dr,
              col: ghost.col + dc,
              valid: ghost.valid,
            }))
            .filter((cell) => cell.row >= 0 && cell.row < 9 && cell.col >= 0 && cell.col < 9)
        }
      }

      const isTournamentMatch = true // Always true in this screen

      gridRenderer.draw(currentSession.grid, ghostCells, isTournamentMatch)
      pieceRenderer.drawTray(
        currentSession.currentPieces,
        dragState.isDragging && dragState.dragIndex !== null ? dragState.dragIndex : undefined,
        isTournamentMatch
      )

      if (dragState.isDragging && dragState.dragIndex !== null) {
        const shape = currentSession.currentPieces[dragState.dragIndex]
        if (shape) {
          pieceRenderer.drawDragging(shape, dragState.dragPos.x, dragState.dragPos.y, cellSize, isTournamentMatch)
        }
      }

      animManager.draw(ctx, cellSize, isTournamentMatch)
      rafHandle = requestAnimationFrame(render)
    }
    
    rafHandle = requestAnimationFrame(render)
    
    return () => {
      cancelAnimationFrame(rafHandle)
      touchController.destroy()
    }
  }, [!!gameSession])

  return (
    <div className="flex flex-col h-screen bg-[#05050a] text-white select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

      <ScoreBar score={score} comboStreak={comboStreak} tournamentId={tournamentId} />
      
      {/* Tournament HUD Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-b border-white/5 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🏆</span>
          </div>
          <div>
            <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Tournament Match</div>
            <div className="text-lg font-black tracking-tighter">CONTENDER LOBBY #{tournamentId?.toString()}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Rankings
          </button>
          {!gameSession && (
            <button 
              onClick={onBackToHall}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Exit Match
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center pt-8 z-10">
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ touchAction: 'none', display: 'block' }}
            className="shadow-[0_0_50px_rgba(0,102,255,0.1)] rounded-xl"
          />

          {/* Sync Status */}
          {gameSession && (
            <div className="absolute top-4 right-4 z-30">
              {onChainStatus === 'pending' || isPending || isConfirming ? (
                <div className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full backdrop-blur-md text-[10px] text-yellow-500 font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
                   <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                   Registering...
                </div>
              ) : onChainStatus === 'syncing' ? (
                <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full backdrop-blur-md text-[10px] text-blue-400 font-black uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                   Finalizing...
                </div>
              ) : onChainStatus === 'registered' ? (
                <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full backdrop-blur-md text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                   Match Verified
                </div>
              ) : null}
            </div>
          )}

          {/* Match Start Overlay */}
          {!gameSession && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl z-40">
              <div className="text-center p-10 bg-[#0a0a0f] rounded-3xl border border-white/10 shadow-2xl max-w-xs w-full mx-4 border-blue-500/20">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                  <span className="text-4xl">⚔️</span>
                </div>
                <h2 className="text-2xl font-black mb-2 tracking-tight uppercase">Ready for Glory?</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-8 leading-relaxed">
                  You are about to enter a competitive match. Your final score will be recorded on the leaderboard.
                </p>
                
                <button
                  onClick={handleStartGame}
                  disabled={isPending || isConfirming}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  {isPending || isConfirming ? 'Preparing...' : 'Commence Match'}
                </button>
              </div>
            </div>
          )}

          {isGameOver && <GameOverModal score={score} onPlayAgain={handleStartGame} mode="tournament" />}
        </div>
      </div>
      
      <TournamentLeaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        tournamentId={tournamentId}
      />

      {/* Footer Branding */}
      <div className="p-6 text-center opacity-20 pointer-events-none">
        <div className="text-[10px] font-black tracking-[0.5em] text-blue-400 uppercase">Tournament Edition</div>
      </div>
    </div>
  )
}

export default TournamentGameScreen
