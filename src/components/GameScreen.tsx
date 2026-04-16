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
import { hapticImpact, hapticNotification, hapticError } from '../miniapp/haptics'
import { useStartGame, generateGameSeed, useActiveGame } from '../hooks/useBlokzGame'
import { useAccount } from 'wagmi'
import { keccak256, encodePacked } from 'viem'
import contractInfo from '../contract.json'
import {
  CLASSIC_SESSION_STORAGE_KEY,
  readStoredGameSession,
  writeStoredGameSession,
} from '../utils/gameSessionStorage'

const CONTRACT_ADDRESS = contractInfo.address as `0x${string}`
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

interface GameScreenProps {
  onOpenLeaderboard?: () => void
}

const GameScreen: React.FC<GameScreenProps> = ({ onOpenLeaderboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animManagerRef = useRef<AnimationManager>(new AnimationManager())
  const lastTimeRef = useRef<number>(0)

  const { 
    gameSession, score, comboStreak, isGameOver, 
    startGame, setOnChainData, forceReset,
    onChainStatus, onChainSeed, onChainGameId
  } = useGameStore()

  const { address, isConnected } = useAccount()
  const { refetch: refetchActiveGame } = useActiveGame(address)
  const { startGame: contractStartGame, isPending, isConfirming, isSuccess } = useStartGame()
  
  const [currentSeed, setCurrentSeed] = useState<{seed: `0x${string}`, hash: `0x${string}`} | null>(null)

  // 0. Account Switch Protection
  // If the wallet address changes, we MUST clear the current in-memory session 
  // to prevent seed/address mismatches in the next game.
  const lastAddressRef = useRef<`0x${string}` | undefined>(address)
  useEffect(() => {
    if (address !== lastAddressRef.current) {
        console.log('Account changed, resetting session state')
        forceReset()
        lastAddressRef.current = address
    }
  }, [address, forceReset])
  
  // 0.5 Hydration: Restore session from localStorage on mount/address match
  useEffect(() => {
    if (!isConnected || !address) return

    const storedSession = readStoredGameSession(
      CLASSIC_SESSION_STORAGE_KEY,
      address,
      CONTRACT_ADDRESS
    )

    if (storedSession) {
      console.log('Hydrating classic session from storage', storedSession)
      setOnChainData(BigInt(storedSession.gameId || 0), storedSession.seed, 'none')
    }
  }, [isConnected, address, setOnChainData])

  // 1. Handle Start (Instant + Background Sync)
  const handleStartGame = () => {
    // Check if we HAVE a hydrated seed with an ACTIVE gameId
    if (isConnected && address && onChainSeed && onChainGameId && onChainGameId !== 0n) {
       console.log('Using hydrated seed for classic game engine recovery:', onChainSeed)
       const localSeed = BigInt(keccak256(encodePacked(['bytes32', 'address'], [onChainSeed, address])).slice(0, 18))
       startGame(localSeed, true) // Preserve hydrated state
       return
    }

    // Generate seed for BOTH local engine and on-chain registration
    const dummyAddr = address || ZERO_ADDRESS
    const { seed, hash } = generateGameSeed(dummyAddr)
    
    // Start local engine IMMEDIATELY
    const localSeed = BigInt(hash.slice(0, 18))
    startGame(localSeed)
    
    if (isConnected && address) {
      setCurrentSeed({ seed, hash })
      setOnChainData(0n, seed, 'pending')
      
      // Persist immediately
      writeStoredGameSession(CLASSIC_SESSION_STORAGE_KEY, {
        address,
        seed,
        hash,
        gameId: null,
        contractAddress: CONTRACT_ADDRESS
      })
      
      // Fire on-chain registration in background
      contractStartGame(hash)
    } else {
      // Practice mode
      setOnChainData(0n, seed, 'none')
    }
  }

  // 2. Background Sync: Watch for transaction success
  useEffect(() => {
    if (isSuccess && currentSeed && address) {
      setOnChainData(0n, currentSeed.seed, 'syncing')
      
      // Poll for the new gameId
      const timer = setInterval(async () => {
        const res = await refetchActiveGame()
        const newGameId = res.data as bigint
        if (newGameId && newGameId !== 0n) {
          console.log('Background sync complete. GameId:', newGameId.toString())
          setOnChainData(newGameId, currentSeed.seed, 'registered')
          
          writeStoredGameSession(CLASSIC_SESSION_STORAGE_KEY, {
            address,
            seed: currentSeed.seed,
            hash: currentSeed.hash,
            gameId: newGameId.toString(),
            contractAddress: CONTRACT_ADDRESS
          })
          
          clearInterval(timer)
        }
      }, 2000)
      
      return () => clearInterval(timer)
    }
  }, [address, currentSeed, isSuccess, refetchActiveGame, setOnChainData])


  // 3. Practice Mode Fallback
  useEffect(() => {
    if (!isConnected && !gameSession) {
      handleStartGame()
    }
  }, [isConnected, gameSession])


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

    // Initial fill to prevent black flickers
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

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

      // Get latest state for render without triggering re-render of effect
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

      gridRenderer.draw(currentSession.grid, ghostCells, false)
      pieceRenderer.drawTray(
        currentSession.currentPieces,
        dragState.isDragging && dragState.dragIndex !== null ? dragState.dragIndex : undefined,
        false
      )

      if (dragState.isDragging && dragState.dragIndex !== null) {
        const shape = currentSession.currentPieces[dragState.dragIndex]
        if (shape) {
          pieceRenderer.drawDragging(shape, dragState.dragPos.x, dragState.dragPos.y, cellSize, false)
        }
      }

      animManager.draw(ctx, cellSize, false)
      rafHandle = requestAnimationFrame(render)
    }
    
    rafHandle = requestAnimationFrame(render)
    
    return () => {
      cancelAnimationFrame(rafHandle)
      touchController.destroy()
    }
  }, [!!gameSession]) // ONLY depend on session existence


  const handlePlayAgain = () => {
    handleStartGame()
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-white select-none">
      <ScoreBar score={score} comboStreak={comboStreak} />

      <div className="px-6 py-4 bg-gradient-to-r from-blue-950/25 to-slate-900/30 border-b border-white/5 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🎮</span>
          </div>
          <div>
            <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Classic Mode</div>
            <div className="text-lg font-black tracking-tighter">WEEKLY LEADERBOARD RUN</div>
          </div>
        </div>

        {onOpenLeaderboard && (
          <button
            onClick={onOpenLeaderboard}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Classic Rankings
          </button>
        )}
      </div>

      <div className="flex-1 flex items-start justify-center pt-2">
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ touchAction: 'none', display: 'block' }}
          />

          {/* Registration Status Indicator */}
          {gameSession && isConnected && (
            <div className="absolute top-2 right-2 z-30 pointer-events-none">
              {onChainStatus === 'pending' || isPending || isConfirming ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full backdrop-blur-md text-[10px] text-yellow-500 font-bold uppercase tracking-wider animate-pulse">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full outline outline-2 outline-yellow-500/20" />
                  Syncing to Chain
                </div>
              ) : onChainStatus === 'syncing' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full backdrop-blur-md text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Finalizing Session
                </div>
              ) : onChainStatus === 'registered' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-md text-[10px] text-green-500 font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  On-Chain Verified
                </div>
              ) : null}
            </div>
          )}

          {/* New Lobby Overlay (Non-blocking) */}
          {!gameSession && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg z-40">
              <div className="text-center p-8 bg-[#1a1b24] rounded-2xl border border-white/10 shadow-2xl max-w-sm transition-all pointer-events-auto">
                <div className="mb-2 text-blue-400 font-bold tracking-widest text-xs uppercase">Blokaz</div>
                <h2 className="text-3xl font-black mb-6 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                  Ready for a Classic Run?
                </h2>
                
                <button
                  onClick={handleStartGame}
                  className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold py-4 rounded-xl shadow-lg transition-all text-xl"
                >
                  Start Classic Game
                </button>
                
                <p className="text-gray-500 text-[10px] mt-4 uppercase tracking-widest opacity-60">
                  {isConnected
                    ? 'Your score will flow into the classic leaderboard after submission'
                    : 'Practice mode (Connect wallet for classic rewards)'}
                </p>
              </div>
            </div>
          )}


          {isGameOver && <GameOverModal score={score} onPlayAgain={handlePlayAgain} mode="classic" />}
        </div>
      </div>
    </div>
  )
}

export default GameScreen
