import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

import signRouter, { account, publicClient, TOURNAMENT_ADDRESS } from './routes/sign.js'
import sessionRouter from './routes/session.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/', signRouter)
app.use('/session', sessionRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001

app.listen(PORT, async () => {
  console.log(`Blokz server running on port ${PORT}`)
  console.log(`Signer address: ${account.address}`)
  console.log(`Tournament proxy: ${TOURNAMENT_ADDRESS}`)
  console.log(`RPC: ${process.env.RPC_URL}`)
  console.log(`Supabase: ${process.env.SUPABASE_URL ? 'connected' : 'NOT CONFIGURED — session persistence disabled'}`)

  try {
    const code = await publicClient.getBytecode({ address: TOURNAMENT_ADDRESS })
    if (!code || code === '0x') {
      console.warn('WARNING: No contract code found at TOURNAMENT_ADDRESS')
    } else {
      console.log('Contract bytecode verified OK')
    }
  } catch (err) {
    console.error('Failed to verify contract on startup:', err.message)
  }
})
