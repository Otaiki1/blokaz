import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useGameStore } from '../stores/gameStore'

const SERVER_URL = import.meta.env.VITE_SIGNER_URL ?? 'http://localhost:3001'
const SYNC_DEBOUNCE_MS = 3_000

async function post(path: string, body: object): Promise<void> {
  try {
    await fetch(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Network failure — localStorage remains the fallback
  }
}

export function useMoveSync() {
  const { address } = useAccount()
  const score = useGameStore((s) => s.score)
  const isGameOver = useGameStore((s) => s.isGameOver)
  const reviveCount = useGameStore((s) => s.reviveCount)
  const onChainGameId = useGameStore((s) => s.onChainGameId)
  const onChainSeed = useGameStore((s) => s.onChainSeed)

  // Subscribe to the game seed so the effect re-fires when a new game starts.
  // Previously this depended only on [address], so if gameSession was null
  // at mount time (MiniPay), /session/start was never called.
  const gameSeed = useGameStore((s) => s.gameSession?.seed?.toString() ?? null)

  const registeredSeedRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedMoveCountRef = useRef(0)

  // Fire /session/start whenever a new game session appears
  useEffect(() => {
    if (!address || !gameSeed) return
    if (registeredSeedRef.current === gameSeed) return
    registeredSeedRef.current = gameSeed
    lastSyncedMoveCountRef.current = 0

    post('/session/start', {
      address,
      seed: gameSeed,
      onChainGameId: onChainGameId?.toString() ?? null,
      onChainSeed: onChainSeed ?? null,
    })
  }, [address, gameSeed, onChainGameId, onChainSeed])

  // Ref-based callback so the debounce closure always reads latest state
  const syncNowRef = useRef<() => void>(() => {})
  useEffect(() => {
    syncNowRef.current = () => {
      const { gameSession: session } = useGameStore.getState()
      if (!session || !address) return
      lastSyncedMoveCountRef.current = session.moveHistory.length
      post('/session/sync', {
        address,
        seed: session.seed.toString(),
        moveHistory: session.moveHistory,
        score: session.score,
        scoreBoostActive: session.scoreBoostActive,
        isGameOver,
        reviveCount,
        onChainGameId: onChainGameId?.toString() ?? null,
        onChainSeed: onChainSeed ?? null,
      })
    }
  }, [address, isGameOver, reviveCount, onChainGameId, onChainSeed])

  // Debounced sync after every score change
  useEffect(() => {
    if (!address || !score) return
    const { gameSession } = useGameStore.getState()
    if (!gameSession || !gameSession.moveHistory.length) return

    const currentMoveCount = gameSession.moveHistory.length
    if (currentMoveCount === lastSyncedMoveCountRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => syncNowRef.current(), SYNC_DEBOUNCE_MS)
  }, [score, address])

  // Flush pending sync immediately on unmount (navigation away mid-game)
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        syncNowRef.current()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

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

export async function markSessionComplete(address: string, seed: string): Promise<void> {
  await post('/session/complete', { address, seed })
}
