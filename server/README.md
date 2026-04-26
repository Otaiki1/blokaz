# Blokz Signing Server

This server handles session signing and score verification for Blokz Tournaments.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Create a `.env` file in this directory with:
   ```env
   PORT=3001
   SIGNER_PRIVATE_KEY=your_key_here
   TOURNAMENT_ADDRESS=0xea6c2873830ed989d2df6da025663ae88d8cb5d6
   CHAIN_ID=11142220
   RPC_URL=https://forno.celo.org
   ```

## Running

```bash
# Standard
node index.js

# Using the npm script
npm run dev
```

## API Endpoints

- `POST /sign-start`: Generates a game seed and signature to begin a tournament match.
- `POST /sign-submit`: Validates the final score and returns a signature for on-chain submission.
