import { Router } from 'express'
import { supabase } from '../db/supabase.js'

const router = Router()

// Guard — returns 503 if Supabase is not configured
function requireDb(res) {
  if (!supabase) {
    res.status(503).json({ error: 'Session persistence not configured' })
    return false
  }
  return true
}

/**
 * POST /session/start
 * Called when a new game begins. Creates or overwrites the active session
 * for this address so old stale data is never mixed with a fresh game.
 *
 * Body: { address, seed, onChainGameId?, onChainSeed? }
 */
router.post('/start', async (req, res) => {
  if (!requireDb(res)) return
  const { address, seed, onChainGameId, onChainSeed } = req.body
  if (!address || !seed) return res.status(400).json({ error: 'address and seed required' })

  // Mark any previous active session for this address as abandoned
  await supabase
    .from('game_sessions')
    .update({ status: 'abandoned', updated_at: new Date().toISOString() })
    .eq('address', address.toLowerCase())
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      address: address.toLowerCase(),
      seed: seed.toString(),
      on_chain_game_id: onChainGameId?.toString() ?? null,
      on_chain_seed: onChainSeed ?? null,
      move_history: [],
      score: 0,
      score_boost_active: false,
      is_game_over: false,
      revive_count: 0,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('session/start error:', error)
    return res.status(500).json({ error: error.message })
  }

  res.json({ sessionId: data.id })
})

/**
 * POST /session/sync
 * Called after every move (and on revival, power-up, etc.).
 * Upserts the full snapshot so the server always has the latest state.
 *
 * Body: { address, seed, moveHistory, score, scoreBoostActive,
 *         isGameOver, reviveCount, onChainGameId?, onChainSeed? }
 */
router.post('/sync', async (req, res) => {
  if (!requireDb(res)) return
  const {
    address, seed, moveHistory, score,
    scoreBoostActive, isGameOver, reviveCount,
    onChainGameId, onChainSeed,
  } = req.body

  if (!address || !seed) return res.status(400).json({ error: 'address and seed required' })

  const now = new Date().toISOString()

  // Find the active session for this address + seed
  const { data: existing } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('address', address.toLowerCase())
    .eq('seed', seed.toString())
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const patch = {
    move_history: moveHistory ?? [],
    score: score ?? 0,
    score_boost_active: !!scoreBoostActive,
    is_game_over: !!isGameOver,
    revive_count: reviveCount ?? 0,
    updated_at: now,
    ...(onChainGameId != null && { on_chain_game_id: onChainGameId.toString() }),
    ...(onChainSeed != null && { on_chain_seed: onChainSeed }),
  }

  let result
  if (existing) {
    result = await supabase
      .from('game_sessions')
      .update(patch)
      .eq('id', existing.id)
  } else {
    // No matching active session — create one (handles race where /start was skipped)
    result = await supabase
      .from('game_sessions')
      .insert({
        address: address.toLowerCase(),
        seed: seed.toString(),
        on_chain_game_id: onChainGameId?.toString() ?? null,
        on_chain_seed: onChainSeed ?? null,
        status: 'active',
        ...patch,
      })
  }

  if (result.error) {
    console.error('session/sync error:', result.error)
    return res.status(500).json({ error: result.error.message })
  }

  res.json({ ok: true })
})

/**
 * GET /session/restore/:address
 * Returns the latest active session for an address so the client can
 * recover a lost localStorage snapshot from the server.
 */
router.get('/restore/:address', async (req, res) => {
  if (!requireDb(res)) return
  const address = req.params.address.toLowerCase()

  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('address', address)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('session/restore error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!data) return res.json({ session: null })

  res.json({
    session: {
      address: data.address,
      seed: data.seed,
      onChainGameId: data.on_chain_game_id,
      onChainSeed: data.on_chain_seed,
      moveHistory: data.move_history,
      score: data.score,
      scoreBoostActive: data.score_boost_active,
      isGameOver: data.is_game_over,
      reviveCount: data.revive_count,
      updatedAt: data.updated_at,
    },
  })
})

/**
 * POST /session/complete
 * Called after a score is successfully submitted on-chain.
 * Marks the session as submitted so it won't be offered for restore.
 *
 * Body: { address, seed }
 */
router.post('/complete', async (req, res) => {
  if (!requireDb(res)) return
  const { address, seed } = req.body
  if (!address || !seed) return res.status(400).json({ error: 'address and seed required' })

  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('address', address.toLowerCase())
    .eq('seed', seed.toString())
    .eq('status', 'active')

  if (error) {
    console.error('session/complete error:', error)
    return res.status(500).json({ error: error.message })
  }

  res.json({ ok: true })
})

export default router
