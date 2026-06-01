import { create } from 'zustand'
import { GameSession } from '../engine/game'
import type { ShapeDefinition } from '../engine/shapes'
// Imported lazily to avoid circular deps — accessed via getState() at call time
import { usePowerUpStore } from './powerUpStore'

interface GameState {
  gameSession: GameSession | null
  score: number
  comboStreak: number
  currentPieces: (ShapeDefinition | null)[]
  isGameOver: boolean
  onChainGameId: bigint | null
  onChainSeed: `0x${string}` | null
  onChainStatus: 'none' | 'pending' | 'syncing' | 'registered' | 'failed'
  tournamentId: bigint | null
  reviveCount: number

  startGame: (seed: bigint, preserveOnChain?: boolean) => void
  setOnChainData: (gameId: bigint, seed: `0x${string}`, status?: 'registered' | 'pending' | 'syncing' | 'failed') => void
  setOnChainGameId: (id: bigint) => void
  setOnChainSeed: (seed: `0x${string}`) => void
  setTournamentId: (id: bigint | null) => void
  placePiece: (index: number, r: number, c: number) => any
  resetGame: () => void
  reviveGame: () => void
  forceReset: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  gameSession: null,
  score: 0,
  comboStreak: 0,
  currentPieces: [],
  isGameOver: false,
  onChainGameId: null,
  onChainSeed: null,
  onChainStatus: 'none',
  tournamentId: null,
  reviveCount: 0,

  startGame: (seed, preserveOnChain = false) => {
    const session = new GameSession(seed)
    // @ts-ignore
    window.currentPieces = session.currentPieces

    const updates: Partial<GameState> = {
      gameSession: session,
      score: 0,
      comboStreak: 0,
      currentPieces: session.currentPieces,
      isGameOver: false,
      reviveCount: 0,
    }

    if (!preserveOnChain) {
      updates.onChainGameId = null
      updates.onChainSeed = null
      updates.onChainStatus = 'none'
    }

    set(updates)
  },

  setOnChainData: (gameId, seed, status = 'registered') => {
    set({ onChainGameId: gameId, onChainSeed: seed, onChainStatus: status })
  },

  setOnChainGameId: (id) => set({ onChainGameId: id }),
  setOnChainSeed: (seed) => set({ onChainSeed: seed }),
  setTournamentId: (id) => set({ tournamentId: id }),

  placePiece: (index, r, c) => {
    const { gameSession, reviveCount } = get()
    if (!gameSession) return null

    const result = gameSession.placePiece(index, r, c)
    if (!result.success) return result

    // Shield intercept: if this move triggers game-over, try to auto-save
    // synchronously BEFORE committing isGameOver to the store so the
    // game-over modal never flashes and timing/effect issues are eliminated.
    if (result.isGameOver) {
      const shielded = usePowerUpStore.getState().triggerShield()
      if (shielded) {
        gameSession.revive()
        // @ts-ignore
        window.currentPieces = gameSession.currentPieces
        set({
          score:        gameSession.score,
          comboStreak:  gameSession.comboStreak,
          currentPieces: [...gameSession.currentPieces],
          isGameOver:   gameSession.isGameOver,   // accurate post-revive state
          reviveCount:  reviveCount + 1,
        })
        return { ...result, isGameOver: gameSession.isGameOver }
      }
    }

    set({
      score:        gameSession.score,
      comboStreak:  gameSession.comboStreak,
      currentPieces: [...gameSession.currentPieces],
      isGameOver:   result.isGameOver,
    })
    // @ts-ignore
    window.currentPieces = gameSession.currentPieces
    return result
  },

  resetGame: () => {
    get().startGame(BigInt(Date.now()))
  },
  
  reviveGame: () => {
    const { gameSession, reviveCount } = get()
    if (!gameSession) return
    gameSession.revive()
    set({
      isGameOver: false,
      currentPieces: [...gameSession.currentPieces],
      reviveCount: reviveCount + 1,
    })
    // @ts-ignore
    window.currentPieces = gameSession.currentPieces
  },

  forceReset: (keepTournamentId = false) => {
    set({
      gameSession: null,
      score: 0,
      comboStreak: 0,
      currentPieces: [],
      isGameOver: false,
      onChainGameId: null,
      onChainSeed: null,
      onChainStatus: 'none',
      tournamentId: keepTournamentId ? get().tournamentId : null,
      reviveCount: 0,
    })
  },

}))
