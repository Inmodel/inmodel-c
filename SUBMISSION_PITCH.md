# JudgeChain — Colosseum Hackathon Submission

## One-Liner

Tamper-proof hackathon judging infrastructure on Solana — every score is static-analyzed, 70/30 weighted, and immutably recorded on-chain with soulbound NFT certificates for winners.

---

## Category

**Infrastructure / DevTooling**

---

## Problem

Hackathon judging is broken. Scores live in spreadsheets, evaluation criteria vary between judges, and participants have no way to verify how they were scored. There's no audit trail, no anti-tampering, and no persistent proof of achievement.

---

## Solution

**JudgeChain** replaces the spreadsheet with a full-stack judging platform:

1. **Automated Scoring** — 70% of each score comes from static code analysis (code quality, test coverage, deployment health, documentation). No code execution, no RCE risk.
2. **Human Judging** — 30% comes from signed judge evaluations (innovation, impact, presentation).
3. **On-Chain Immutability** — Final scores are recorded on Solana as PDA accounts. No admin can modify them.
4. **Soulbound Certificates** — Winners receive a Metaplex Core NFT permanently frozen in their wallet — non-transferable, verifiable forever.

---

## Architecture

```
CLI (Node.js) → Backend (FastAPI) → Solana (Anchor) ← Dashboard (Next.js)
                      ↓
                SSE Event Bus → Dashboard (Real-time)
```

| Component | Role |
|---|---|
| **CLI** (`judgenod`) | Participant submits repo with signed payload |
| **Backend** (FastAPI) | Verifies signature, runs 5 modular analyzers, records score |
| **Smart Contract** (Anchor) | Stores scores in PDAs, enforces 70/30 weighting, mints certificates |
| **Dashboard** (Next.js) | Organizer/judge/participant views — leaderboard, scoring, management |

---

## Tech Stack

- **Blockchain**: Solana Devnet, Anchor 0.30.1, Metaplex Core
- **Backend**: Python 3.9, FastAPI, Pydantic, SQLAlchemy, anchorpy
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Solana Wallet Adapter
- **CLI**: Node.js, TypeScript, @clack/prompts, @solana/web3.js, tweetnacl

---

## Smart Contract Instructions

| Instruction | What it does |
|---|---|
| `create_hackathon` | Organizer creates a hackathon PDA |
| `create_collection` | Creates Metaplex Core NFT collection |
| `create_submission` | Registers a participant's submission |
| `score_submission` | Records system + judge scores, computes final (70/30) |
| `finalize_hackathon` | Locks submissions — enables certificate issuance |
| `issue_certificate` | Mints soulbound NFT to winner's wallet |

**Program ID**: `9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2`

---

## Security Highlights

- ✅ **No RCE** — Static analysis only via GitHub API + LLM review. Never executes code.
- ✅ **Hardened API** — Rate limiting (`slowapi`) prevents DoS on scoring and minting.
- ✅ **Network Resilience** — Exponential backoff retries for all GitHub and Solana calls.
- ✅ **Cryptographic auth** — Every CLI submission is signed with the participant's keypair.
- ✅ **On-chain finality** — Scores written to PDAs cannot be modified post-submission.
- ✅ **Soulbound NFTs** — `PermanentFreezeDelegate` with no unfreeze authority.
- ✅ **Lifecycle enforcement** — Certificates gated by `finalize_hackathon`; threshold ≥ 50.

---

## Demo Flow (2-Minute Pitch)

1. **Connect** → Participant connects Solana wallet on the dashboard.
2. **Submit** → `judgenod submit` packages, signs, and POSTs the repo to the backend.
3. **Real-time Verify** → Dashboard updates ranking **instantly** via SSE as the backend scores.
4. **Judge** → Judge scoresInnovation / Impact / Presentation via the "War Room" panel.
5. **Finalize** → Organizer locks the hackathon, enabling verifiable certificates.
6. **Certify** → `judgenod certificate` or the Profile UI mints a soulbound NFT with dynamic metadata.
7. **Verify** → Authenticate achievement with a single Solscan or Metaplex Explorer link.

---

## What Makes This Different

| Traditional Hackathon | JudgeChain |
|---|---|
| Scores in Google Sheets | Scores on Solana PDAs |
| Subjective 100% | 70% automated, 30% judge |
| No verification | Solscan link for every score |
| No proof of achievement | Soulbound NFT certificate |
| Admin can edit | Immutable on-chain records |

---

## Links

- **Program on Devnet**: [Solscan](https://solscan.io/account/9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2?cluster=devnet)
- **GitHub Repo**: [inmodel-c](https://github.com/your-user/inmodel-c) *(update with actual URL)*

---

## Team

Built by **friday** — solo developer, shipped in < 72 hours.

Multi-agent development workflow: 6 AI agents (Orchestrator, Backend, Blockchain, Frontend, CLI, Logger) coordinating via `GEMINI.md` instructions and GitHub Issue #1 work log.
