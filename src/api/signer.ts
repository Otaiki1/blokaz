const SIGNER_API_BASE =
  (import.meta.env.VITE_SIGNER_URL as string | undefined) ?? 'http://localhost:3001'

// Retry up to `attempts` times. Waits 2s between each try so a cold-started
// Render server has time to wake up before the next attempt.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = 3
): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) })
      if (res.ok) return res
      // 4xx errors are not retryable (bad request, not server fault)
      if (res.status >= 400 && res.status < 500) return res
    } catch (err) {
      lastErr = err
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw lastErr ?? new Error('Server unreachable after retries')
}

export async function requestStartSignature(
  tid: bigint,
  seedHash: `0x${string}`,
  player: `0x${string}`
) {
  const res = await fetchWithRetry(`${SIGNER_API_BASE}/sign-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tid: tid.toString(), seedHash, player }),
  })

  if (!res.ok) {
    throw new Error('Failed to get start signature')
  }

  const data = await res.json()
  return {
    signature: data.signature as `0x${string}`,
    nonce: BigInt(data.nonce),
    deadline: BigInt(data.deadline),
  }
}

export async function requestSubmitSignature(
  tid: bigint,
  gid: bigint,
  score: number,
  moves: any[],
  seed: `0x${string}`,
  player: `0x${string}`
) {
  const res = await fetchWithRetry(`${SIGNER_API_BASE}/sign-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tid: tid.toString(),
      gid: gid.toString(),
      score,
      moves,
      seed,
      player,
    }),
  })

  if (!res.ok) {
    throw new Error('Failed to get submit signature')
  }

  const data = await res.json()
  return {
    signature: data.signature as `0x${string}`,
    deadline: BigInt(data.deadline),
  }
}
