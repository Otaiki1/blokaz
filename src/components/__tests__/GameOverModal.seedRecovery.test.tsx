import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CLASSIC_SESSION_STORAGE_KEY } from '../../utils/gameSessionStorage'

// Real stuck-run values from address 0xe44e97…: synced to the server with a raw
// seed but on_chain_game_id = '0' (start never confirmed) and no localStorage.
const PLAYER = '0xe44e97c9b512160a1bbb30800e6e2cf2ae217cea' as const
const SERVER_SEED = '0x47a28f57b033e807a7d00ccf81cbd22ac999450ea11f785b635844c5f3ba63f9'

const H = vi.hoisted(() => {
  const storeState = {
    gameSession: {
      moveHistory: [{ pieceIndex: 0, row: 0, col: 0, shapeId: 'S1', scoreEvent: {} }],
      score: 346541,
    },
    onChainSeed: null as `0x${string}` | null,
    onChainGameId: undefined as bigint | undefined,
    onChainStatus: 'none',
    forceReset: () => {},
    tournamentId: null as bigint | null,
    setTournamentId: () => {},
    comboStreak: 0,
    reviveGame: () => {},
  }
  return {
    storeState,
    setState: vi.fn((patch: any) => Object.assign(storeState, patch)),
    useGameStore: Object.assign(() => storeState, {
      getState: () => storeState,
      setState: (patch: any) => Object.assign(storeState, patch),
    }),
    // No on-chain game exists for this run.
    chain: { activeGameId: undefined as bigint | undefined, game: undefined as readonly unknown[] | undefined },
    fetchServerSession: vi.fn(),
    fetchTournamentServerSession: vi.fn(),
  }
})
const { storeState } = H

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: PLAYER }),
  useReadContract: () => ({ data: H.chain.game, isLoading: false }),
}))
vi.mock('../../stores/gameStore', () => ({ useGameStore: H.useGameStore }))
vi.mock('../../stores/powerUpStore', () => ({
  usePowerUpStore: () => ({ inventory: { revivalBundle: 0 }, consumeCharge: vi.fn() }),
}))
vi.mock('../../hooks/useStablecoinRevive', () => ({
  useStablecoinRevive: () => ({
    balances: { USDC: 0n, USDT: 0n, USDm: 0n }, canAfford: () => false, hasAnyBalance: false,
    defaultToken: 'USDC', isPaying: false, error: null, payForRevive: vi.fn(),
    getReviveCost: () => 0n, reviveCount: 0,
  }),
}))
vi.mock('../../hooks/useBlokzGame', () => ({
  useActiveGame: () => ({ gameId: H.chain.activeGameId, isLoading: false, refetch: vi.fn() }),
  useActiveTournamentGame: () => ({ gameId: undefined, isLoading: false, refetch: vi.fn() }),
  useLeaderboard: () => ({ leaderboard: [] }),
  useSubmitScore: () => ({ submitScore: vi.fn(), isPending: false, isConfirming: false, isSuccess: false, error: null }),
  useSubmitTournamentScore: () => ({ submitTournamentScore: vi.fn(), isPending: false, isConfirming: false, isSuccess: false, error: null }),
  useStartGame: () => ({ startGame: vi.fn(), isPending: false, isConfirming: false, isSuccess: false }),
  useStartTournamentGame: () => ({ startTournamentGame: vi.fn(), isPending: false, isConfirming: false, isSuccess: false, error: null }),
}))
vi.mock('../../hooks/useMoveSync', () => ({
  markSessionComplete: vi.fn().mockResolvedValue(undefined),
  markTournamentSessionComplete: vi.fn().mockResolvedValue(undefined),
  fetchServerSession: (...args: any[]) => H.fetchServerSession(...args),
  fetchTournamentServerSession: (...args: any[]) => H.fetchTournamentServerSession(...args),
}))
vi.mock('../../api/signer', () => ({
  requestSubmitSignature: vi.fn(), requestStartSignature: vi.fn(),
  SignerRejectionError: class extends Error {},
}))

import GameOverModal from '../GameOverModal'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  storeState.onChainSeed = null
  storeState.tournamentId = null
  H.chain.activeGameId = undefined
  H.chain.game = undefined
})

describe('GameOverModal — seed recovery for a stranded classic run', () => {
  it('recovers the raw seed from the server session and offers on-chain registration', async () => {
    H.fetchServerSession.mockResolvedValue({ onChainSeed: SERVER_SEED, onChainGameId: '0' })

    render(<GameOverModal score={346541} mode="classic" onPlayAgain={vi.fn()} />)

    // The run is unregistered and localStorage is empty; once the server seed
    // arrives the Register button appears (the run is no longer stranded).
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /REGISTER GAME ON-CHAIN/i })).not.toBeNull()
    )
    expect(H.fetchServerSession).toHaveBeenCalledWith(PLAYER)
    // Seed mirrored into the store for the rest of the submit flow.
    expect(storeState.onChainSeed).toBe(SERVER_SEED)
    // The stranded-seed error is gone.
    expect(screen.queryByText(/Game seed unavailable/i)).toBeNull()
  })

  it('recovers the seed from the per-tournament server session in tournament mode', async () => {
    storeState.tournamentId = 7n
    H.fetchTournamentServerSession.mockResolvedValue({ onChainSeed: SERVER_SEED, onChainGameId: '0' })

    render(<GameOverModal score={346541} mode="tournament" onPlayAgain={vi.fn()} />)

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /REGISTER GAME ON-CHAIN/i })).not.toBeNull()
    )
    // Keyed by tournamentId — not the classic endpoint.
    expect(H.fetchTournamentServerSession).toHaveBeenCalledWith(PLAYER, '7')
    expect(H.fetchServerSession).not.toHaveBeenCalled()
    expect(storeState.onChainSeed).toBe(SERVER_SEED)
  })

  it('still shows the stranded error when the server has no seed either', async () => {
    H.fetchServerSession.mockResolvedValue(null)
    // A stale on-chain game id with no recoverable seed reaches the seed check.
    H.chain.activeGameId = 999n
    H.chain.game = [PLAYER, '0xdeadbeef', 0, 0n, 0n, 0]

    render(<GameOverModal score={346541} mode="classic" onPlayAgain={vi.fn()} />)

    await waitFor(() => expect(H.fetchServerSession).toHaveBeenCalled())
    expect(storeState.onChainSeed).toBeNull()
  })
})
