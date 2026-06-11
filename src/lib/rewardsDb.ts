import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_REWARDS_SUPABASE_URL as string
const ANON = import.meta.env.VITE_REWARDS_SUPABASE_ANON_KEY as string

// Default client — used for player reads and claims
export const rewardsDb = createClient(URL, ANON)

// Admin client — attaches x-admin-address header so RLS policies can verify it
export function adminRewardsDb(adminAddress: string) {
  return createClient(URL, ANON, {
    global: { headers: { 'x-admin-address': adminAddress.toLowerCase() } },
  })
}
