# JudgeChain — Project Repost

> Tamper-proof hackathon judging infrastructure on Solana. Every score is cryptographically signed, statically analyzed, and immutably recorded on-chain.

---

## The Problem

Hackathon judging is broken. Scores are subjective, opaque, and stored in spreadsheets. There's no way for participants to verify how they were evaluated, no audit trail, and no protection against bias or manipulation. Organizers have no tooling to run fair, scalable evaluations at speed.

---

## What We Built

**JudgeChain** is a full-stack hackathon judging platform that replaces spreadsheets and gut-feel scoring with:

- **Automated static analysis** of submitted GitHub repos (no code execution, no RCE risk)
- **LLM-assisted code review** via GitHub API static analysis (no code execution, no sandboxing required)
- **On-chain score recording** via a Solana/Anchor smart contract
- **Soulbound NFT certificates** for winners — non-transferable, permanently frozen, verifiable forever
- **A CLI** for participants to submit in seconds
- **A dashboard** for organizers and judges to manage everything visually

---

## How It Works

### Submission Flow

1. Participant runs `judgechain submit` from their project directory
2. CLI collects repo URL, deployment URL, problem ID — persists to `.judgenod.json` for re-use
3. CLI signs the payload with the participant's Solana keypair (`nacl` + `tweetnacl`)
4. Signed payload is `POST`ed to `/api/v1/score` with an `x-signature` header
5. Backend verifies the signature, then runs the scoring pipeline
6. Score is saved to SQLite and recorded on-chain in a background task
7. Participant gets back a full score breakdown + transaction hash

### Scoring Pipeline (Backend)

The system score is capped at **70 points** (the remaining 30 come from judges). Five analyzers run in parallel against the GitHub API:

| Analyzer | Max Points | Method |
|---|---|---|
| Code Quality | 18 | Repo structure check + LLM analysis of key source files |
| Test Coverage | 18 | Detects test files/dirs + uses `reported_test_coverage_percent` |
| Deployment Health | 14 | HTTP health check of live deployment URL |
| Documentation | 10 | Checks for README, docs folder, inline comments |
| Custom Criteria | 10 | Problem-specific evaluation logic |

No code is executed. All analysis is done via the GitHub Contents API and static inspection.

### Judge Scoring

Judges score via the dashboard or `POST /api/v1/judge/score`. Three dimensions:
- Innovation (0–10)
- Impact (0–10)  
- Presentation (0–10)

Judge score = average of three × 10 → normalized to 30 points.

**Final score = (system_score × 0.7) + (judge_score × 0.3)**

This is enforced both in the backend and in the Solana smart contract.

### On-Chain Recording

The Anchor program (`programs/judgechain/src/lib.rs`) stores:

```
Hackathon PDA → Submission PDA → ScoreHash PDA → Certificate PDA
```

- `ScoreHash` stores `system_score`, `judge_score`, `final_score`, and an `ipfs_cid` for the full report
- `final_score` is computed on-chain: `(system_score * 7 / 10) + (judge_score * 3 / 10)`
- Certificates can only be issued **after** `finalize_hackathon` is called and only if `final_score >= 50`

### Soulbound NFT Certificates

Built on **Metaplex Core**. Each certificate is minted with a `PermanentFreezeDelegate` plugin set to `frozen: true` with no authority — meaning no one can ever unfreeze or transfer it. It's permanently bound to the winner's wallet.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Smart Contract | Rust, Anchor 0.30.1, Metaplex Core |
| Backend | Python 3.9+, FastAPI, Pydantic, SQLite, anchorpy |
| CLI | Node.js, TypeScript, @clack/prompts, @solana/web3.js, tweetnacl |
| Dashboard | Next.js 15, TypeScript, Tailwind CSS, Solana Wallet Adapter |
| Chain | Solana Devnet |

---

## Smart Contract — Key Instructions

| Instruction | Description |
|---|---|
| `create_hackathon` | Organizer creates a hackathon PDA (name, active flag) |
| `create_collection` | Creates a Metaplex Core NFT collection for certificates |
| `create_submission` | Participant registers a submission on-chain |
| `score_submission` | Records system + judge scores, computes 70/30 final |
| `finalize_hackathon` | Locks the hackathon — no more submissions or scoring |
| `issue_certificate` | Mints a soulbound NFT to the winner's wallet |

**Program ID (Devnet):** `9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2`

---

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/score` | Submit project, run scoring pipeline |
| `GET` | `/api/v1/score/{id}` | Fetch a submission by ID |
| `GET` | `/api/v1/leaderboard?problem_id=` | Ranked leaderboard for a problem |
| `GET` | `/api/v1/judge/submissions` | List all submissions for judges |
| `POST` | `/api/v1/judge/score` | Submit judge scores (signed) |
| `GET` | `/api/v1/problems` | List available problems |
| `POST` | `/api/v1/certificate/{submission_id}` | Mint NFT certificate |

All mutating endpoints require an `x-signature` header — a `nacl` signature of the request body using the participant's/judge's Solana keypair.

---

## CLI Commands

```bash
judgenod submit       # Interactive submission flow
judgenod leaderboard  # View current rankings
judgenod certificate  # Mint your NFT certificate
```

Supports `--network devnet | mainnet | localnet` and `--keypair <path>`.

---

## Dashboard Pages

- `/` — Landing page with feature overview
- `/submit` — Submit a project (wallet-connected)
- `/leaderboard` — Live rankings
- `/judge` — Judge panel (score submissions)
- `/organizer` — Manage hackathons
- `/organizer/new` — Create a new hackathon
- `/organizer/[id]` — Hackathon detail + finalize
- `/profile` — Participant stats and submission history

---

## Security Design

- **No RCE**: The backend never executes submitted code. All analysis is static (GitHub API + LLM).
- **Signature verification**: Every submission is signed with the submitter's Solana keypair. The backend verifies the `nacl` signature before processing.
- **On-chain immutability**: Scores are written to PDAs — they can't be edited after the fact.
- **Soulbound certificates**: `PermanentFreezeDelegate` with no unfreeze authority. Permanently non-transferable.
- **Hackathon lifecycle enforcement**: Submissions and scoring are gated by `is_active`. Certificates are gated by `!is_active` (must finalize first).
- **Score threshold**: Certificates require `final_score >= 50` — enforced in the contract.

---

## Repo Structure

```
├── programs/judgechain/src/lib.rs   # Anchor smart contract
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── app/api/routes/              # score.py, judge.py, certificate.py
│   ├── app/scoring/
│   │   ├── engine.py                # Scoring pipeline orchestrator
│   │   ├── github_utils.py          # GitHub API helpers
│   │   ├── llm_utils.py             # LLM code review
│   │   ├── solana_client.py         # anchorpy on-chain recording
│   │   └── analyzers/               # 5 modular analyzers
│   └── app/models/schemas.py        # Pydantic models
├── cli/src/index.ts                 # CLI (submit, leaderboard, certificate)
├── dashboard/src/
│   ├── app/                         # Next.js pages
│   ├── components/                  # Navbar, Sidebar, WalletButton, SolscanLink
│   └── lib/                         # useProgram hook, API client
└── tests/
    ├── judgechain.ts                # Anchor integration tests
    └── nft_certificates.ts          # NFT certificate tests
```

---

## Local Setup

**Smart Contract**
```bash
anchor build && anchor test
```

**Backend**
```bash
cd backend && source venv/bin/activate && python main.py
```

**Dashboard**
```bash
cd dashboard && npm install && npm run dev
```

**CLI**
```bash
cd cli && npm install && npm link
judgenod submit
```

**Environment**
```
# backend/.env
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
PROGRAM_ID=9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2

# dashboard/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

---

## What Makes This Different

Most hackathon platforms are just form submissions + a Google Sheet. JudgeChain is:

1. **Verifiable** — every score has a transaction hash. Anyone can verify it on Solscan.
2. **Tamper-proof** — scores are written to PDAs. No admin can edit them post-submission.
3. **Automated** — 70% of the score is computed deterministically from the code itself.
4. **Fair** — the 30% judge component is signed and recorded on-chain too.
5. **Credentialed** — winners get a soulbound NFT that lives in their wallet forever.

---

## Live on Devnet

- Program: https://solscan.io/account/9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2?cluster=devnet
- Example score tx: [TODO — add after devnet airdrop]
- Example certificate mint: [TODO — add after devnet airdrop]
