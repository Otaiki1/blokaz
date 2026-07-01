import { Router } from 'express'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import dotenv from 'dotenv'
import { replayAndValidateScore } from '../engine/scoreReplay.js'
dotenv.config()

const router = Router()

const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY
const TOURNAMENT_ADDRESS = process.env.TOURNAMENT_ADDRESS
const CHAIN_ID = Number(process.env.CHAIN_ID)
const RPC_URL = process.env.RPC_URL

const account = privateKeyToAccount(SIGNER_PRIVATE_KEY)
const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })

const domain = {
  name: 'BlokzTournament',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: TOURNAMENT_ADDRESS,
}

const types = {
  StartGame: [
    { name: 'player', type: 'address' },
    { name: 'tournamentId', type: 'uint256' },
    { name: 'seedHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  SubmitScore: [
    { name: 'player', type: 'address' },
    { name: 'tournamentId', type: 'uint256' },
    { name: 'gameId', type: 'uint256' },
    { name: 'score', type: 'uint32' },
    { name: 'deadline', type: 'uint256' },
  ],
}

function validateScore(tid, gid, score, moves, seed) {
  console.log(`Validating score for Tournament ${tid}, Game ${gid}: ${score} (${moves?.length ?? 0} moves)`)
  if (!Array.isArray(moves)) return false
  const valid = replayAndValidateScore(moves, score)
  if (!valid) console.warn(`[sign] Score replay failed for tid=${tid} gid=${gid} claimed=${score}`)
  return valid
}

router.post('/sign-start', async (req, res) => {
  try {
    const { tid, seedHash, player } = req.body

    let nonce
    try {
      nonce = await publicClient.readContract({
        address: TOURNAMENT_ADDRESS,
        abi: [{
          name: 'userNonces', type: 'function', stateMutability: 'view',
          inputs: [{ name: '', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'userNonces',
        args: [player],
      })
    } catch {
      nonce = 0n
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
    const signature = await account.signTypedData({
      domain, types, primaryType: 'StartGame',
      message: { player, tournamentId: BigInt(tid), seedHash, nonce: BigInt(nonce), deadline },
    })

    const recovered = await publicClient.verifyTypedData({
      address: account.address, domain, types, primaryType: 'StartGame',
      message: { player, tournamentId: BigInt(tid), seedHash, nonce: BigInt(nonce), deadline },
      signature,
    })
    if (!recovered) console.error('CRITICAL: Server generated an unverifiable signature')

    res.json({ signature, nonce: nonce.toString(), deadline: deadline.toString() })
  } catch (error) {
    console.error('SERVER ERROR in /sign-start:', error)
    res.status(500).json({ error: 'Failed to generate signature', details: error.message })
  }
})

router.post('/sign-submit', async (req, res) => {
  try {
    const { tid, gid, score, moves, seed, player } = req.body

    if (!validateScore(tid, gid, score, moves, seed)) {
      return res.status(403).json({ error: 'Invalid score submission' })
    }

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
    const signature = await account.signTypedData({
      domain, types, primaryType: 'SubmitScore',
      message: { player, tournamentId: BigInt(tid), gameId: BigInt(gid), score: Number(score), deadline },
    })

    res.json({ signature, deadline: deadline.toString() })
  } catch (error) {
    console.error('Error signing submit:', error)
    res.status(500).json({ error: 'Failed to generate signature' })
  }
})

export { account, publicClient, TOURNAMENT_ADDRESS }
export default router
