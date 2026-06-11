import { useState, useEffect, useCallback } from 'react'
import { rewardsDb, adminRewardsDb } from '../lib/rewardsDb'

export interface Reward {
  id: string
  label: string
  amount: string
  token: string
  claimed_at: string | null
  created_at: string
}

export interface AdminReward extends Reward {
  address: string
}

// ─── Player: fetch their rewards (no cash_link_url) ──────────────────────────

export function usePlayerRewards(address?: string) {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    try {
      const { data } = await rewardsDb
        .from('rewards')
        .select('id, label, amount, token, claimed_at, created_at')
        .eq('address', address.toLowerCase())
        .order('created_at', { ascending: false })
      setRewards(data ?? [])
    } catch {
      // silently skip
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => { fetch() }, [fetch])

  return { rewards, isLoading, refetch: fetch }
}

// ─── Player: claim a reward — marks claimed_at and returns cash_link_url ─────

// Step 1 — fetch the cash link URL without touching claimed_at
export async function getRewardUrl(
  address: string,
  rewardId: string,
): Promise<{ ok: boolean; cashLinkUrl?: string; error?: string }> {
  const { data, error } = await rewardsDb
    .from('rewards')
    .select('cash_link_url, address, claimed_at')
    .eq('id', rewardId)
    .single()

  if (error || !data) return { ok: false, error: 'Reward not found' }
  if (data.address !== address.toLowerCase()) return { ok: false, error: 'Not your reward' }
  return { ok: true, cashLinkUrl: data.cash_link_url }
}

// Step 2 — mark as claimed only after user confirms they received it
export async function confirmRewardClaimed(
  address: string,
  rewardId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await rewardsDb
    .from('rewards')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', rewardId)
    .eq('address', address.toLowerCase())

  if (error) {
    console.error('confirmRewardClaimed error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// Legacy alias used by settings sheet direct claim
export async function claimReward(
  address: string,
  rewardId: string,
): Promise<{ ok: boolean; cashLinkUrl?: string; error?: string }> {
  const urlResult = await getRewardUrl(address, rewardId)
  if (!urlResult.ok) return urlResult
  const confirmResult = await confirmRewardClaimed(address, rewardId)
  if (!confirmResult.ok) return { ok: false, error: confirmResult.error }
  return { ok: true, cashLinkUrl: urlResult.cashLinkUrl }
}

// ─── Admin: fetch all rewards ─────────────────────────────────────────────────

export function useAdminRewards(adminAddress?: string) {
  const [rewards, setRewards] = useState<AdminReward[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!adminAddress) return
    setIsLoading(true)
    try {
      const { data } = await adminRewardsDb(adminAddress)
        .from('rewards')
        .select('id, address, label, amount, token, claimed_at, created_at')
        .order('created_at', { ascending: false })
      setRewards(data ?? [])
    } catch {
    } finally {
      setIsLoading(false)
    }
  }, [adminAddress])

  useEffect(() => { fetch() }, [fetch])

  return { rewards, isLoading, refetch: fetch }
}

// ─── Admin: add a reward ──────────────────────────────────────────────────────

export async function adminAddReward(
  adminAddress: string,
  reward: { address: string; cashLinkUrl: string; amount: string; token: string; label: string },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await adminRewardsDb(adminAddress)
    .from('rewards')
    .insert({
      address:       reward.address.toLowerCase(),
      cash_link_url: reward.cashLinkUrl,
      amount:        reward.amount,
      token:         reward.token,
      label:         reward.label,
    })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── Admin: delete a reward ───────────────────────────────────────────────────

export async function adminDeleteReward(
  adminAddress: string,
  rewardId: string,
): Promise<{ ok: boolean; error?: string }> {
  // Block deletion of already-claimed rewards
  const { data: reward } = await rewardsDb
    .from('rewards')
    .select('claimed_at')
    .eq('id', rewardId)
    .single()

  if (reward?.claimed_at) return { ok: false, error: 'Cannot delete a claimed reward' }

  const { error } = await adminRewardsDb(adminAddress)
    .from('rewards')
    .delete()
    .eq('id', rewardId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
