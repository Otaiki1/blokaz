import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useGameStore } from '../stores/gameStore'

const SERVER_URL = import.meta.env.VITE_SIGNER_URL ?? 'http://localhost:3001'

async function post(path: string, body: object): Promise<void> {
  try {
    await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Network failure — localStorage remains the fallback, so we swallow silently
  }
}

/**
 * Syncs the current game session to the server after every score change.
 * This ensures the server always has the latest move history so a lost
 * localStorage snapshot can be recovered from the server.
 *
 * Must be mounted inside GameScreen (i.e. while a game is active).
 */
export function useMoveSync() {
  const { address } = useAccount()
  const score = useGameStore((s) => s.score)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const reviveCount = useGameStore((s) => s.reviveCount)
  const onChainGameId = useGameStore((s) => s.onChainGameId)
  const onChainSeed = useGameStore((s) => s.onChainSeed)

  // Track whether we've registered this session with the server
  const registeredSeedRef = useRef<string | null>(null)

  // Register a new session on the server when the game starts
  useEffect(() => {
    const { gameSession } = useGameStore.getState()
    if (!address || !gameSession) return
    const seed = gameSession.seed.toString()
    if (registeredSeedRef.current === seed) return
    registeredSeedRef.current = seed

    post('/session/start', {
      address,
      seed,
      onChainGameId: onChainGameId?.toString() ?? null,
      onChainSeed: onChainSeed ?? null,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  // Sync after every score change (i.e. after every successful move)
  useEffect(() => {
    if (!address || !score) return
    const { gameSession } = useGameStore.getState()
    if (!gameSession || !gameSession.moveHistory.length) return

    post('/session/sync', {
      address,
      seed: gameSession.seed.toString(),
      moveHistory: gameSession.moveHistory,
      score,
      scoreBoostActive: gameSession.scoreBoostActive,
      isGameOver,
      reviveCount,
      onChainGameId: onChainGameId?.toString() ?? null,
      onChainSeed: onChainSeed ?? null,
    })
  }, [score, isGameOver, reviveCount, address, onChainGameId, onChainSeed])
}

/**
 * Fetches the latest active session from the server for the given address.
 * Returns null if nothing found or server unreachable.
 */
export async function fetchServerSession(address: string): Promise<{
  seed: string
  onChainGameId: string | null
  onChainSeed: string | null
  moveHistory: any[]
  score: number
  scoreBoostActive: boolean
  isGameOver: boolean
  reviveCount: number
  updatedAt: string
} | null> {
  try {
    const res = await fetch(`${SERVER_URL}/session/restore/${address.toLowerCase()}`)
    if (!res.ok) return null
    const { session } = await res.json()
    return session ?? null
  } catch {
    return null
  }
}

/**
 * Marks the current session as submitted on the server.
 * Call this after a successful on-chain score submission.
 */
export async function markSessionComplete(address: string, seed: string): Promise<void> {
  await post('/session/complete', { address, seed })
}
