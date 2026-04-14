# JudgeChain Backend — Hardened Scoring Engine

The JudgeChain backend is a FastAPI-based service responsible for cryptographically verifying submissions, performing static code analysis via the GitHub API, and recording results on the Solana Devnet.

## Key Features (Hardened)

### 1. Robust Network Handling
Implemented a centralized `@with_retry` async decorator (in `app/utils/retry.py`) with exponential backoff. This ensures that:
- GitHub API rate limits or transient timeouts don't fail submissions.
- Solana RPC transaction fluctuations are handled gracefully.
- External health checks on deployment URLs are resilient to network blips.

### 2. Global & Mutation Rate Limiting
Integrated `slowapi` to protect system resources and LLM quotas.
- **Mutation Limits**: 10 requests per minute on `/score`, `/judge/score`, and `/certificate`.
- **Global Limits**: 60 requests per minute on all other endpoints.
- **Test Mode**: Rate limiting is automatically disabled when `JUDGECHAIN_ENV=test` to ensure CI/CD stability.

### 3. Real-time Event Streaming (SSE)
Moved from polling to **Server-Sent Events (SSE)** for leaderboard updates.
- **Endpoint**: `GET /api/v1/events/leaderboard`.
- **Logic**: The backend maintains an in-memory broadcast bus. Every time a score is updated (system or judge), it pushes a standard `score_update` event to all connected clients.

### 4. Dynamic Certificate Metadata
Serves Metaplex-compatible JSON metadata at `/api/v1/metadata/{submission_id}.json`. This includes:
- Final score and dimension breakdown.
- Problem title and repo link.
- On-chain proof markers.

## API Architecture

| Path | Auth | Purpose |
|------|------|---------|
| `/api/v1/score` | Signed | Runs logic-heavy scoring pipeline |
| `/api/v1/judge/score`| Signed | Records organizer/judge scores |
| `/api/v1/submissions` | Public | History retrieval for participants |
| `/api/v1/events` | Public | SSE stream for real-time dashboard |
| `/api/v1/metadata` | Public | NFT JSON metadata service |

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Required environment variables:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For identity linking.
- `ANCHOR_WALLET`: Keypair for signing on-chain transactions.
- `PROGRAM_ID`: Deployed program ID on Devnet.
