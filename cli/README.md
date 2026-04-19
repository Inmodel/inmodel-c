# hacknod CLI

Submit and track hackathon projects on HackNod (Solana).

## Install

```bash
# Install via GitHub Packages
npm install -g @Inmodel/hacknod

# Or run directly via npx
npx @Inmodel/hacknod <command>
```

---

## 🏗️ Robustness & Reliability (Phase 2)

The CLI now handles intermittent network instability gracefully.

### 🔄 Automatic Retries
All requests to the HackNod backend are wrapped in a `retryFetch` wrapper. This implements:
- **3 Attempt Limit**: To avoid infinite loops while ensuring a fair chance at delivery.
- **Exponential Backoff**: (1s → 2s → 4s) to allow short network blips or backend restarts to resolve.
- **Targeted Failures**: Retries on `ECONNREFUSED`, `ETIMEDOUT`, and non-rate-limited 500 errors.

---

## Commands

### `submit` — Submit a project

```bash
hacknod submit \
  --problem <id> \
  --repo https://github.com/user/repo \
  --deployment https://myapp.vercel.app \
  --coverage 85 \
  --lint 16 \
  --keypair ~/.config/solana/id.json \
  --network devnet
```

| Flag | Description |
|---|---|
| `-p, --problem <id>` | Problem statement ID |
| `-r, --repo <url>` | GitHub repository URL |
| `-d, --deployment <url>` | Live deployment URL |
| `-c, --coverage <percent>` | Test coverage 0–100 (default: 0) |
| `-l, --lint <score>` | Linting score 0–18 (default: 0) |
| `-k, --keypair <path>` | Solana keypair JSON (default: `~/.config/solana/id.json`) |
| `-n, --network <name>` | `devnet` \| `mainnet` \| `localnet` (default: `devnet`) |
| `--json` | Output raw JSON (CI mode) |

---

### `status` — Check on-chain transaction

```bash
hacknod status --tx <signature> --network devnet
```

| Flag | Description |
|---|---|
| `-t, --tx <hash>` | Transaction signature (required) |
| `-n, --network <name>` | `devnet` \| `mainnet` \| `localnet` (default: `devnet`) |

---

### `leaderboard` — View problem leaderboard

```bash
# Interactive problem selector:
hacknod leaderboard

# Direct:
hacknod leaderboard --problem problem-1 --json
```

| Flag | Description |
|---|---|
| `-p, --problem <id>` | Problem ID (omit for interactive selector) |
| `--json` | Output raw JSON |

---

### `init` — Interactive guided submission TUI

```bash
hacknod init --network devnet
```

Walks through all submission fields interactively, saves config to `.hacknod.json`, submits, then offers to mint your certificate immediately.

| Flag | Description |
|---|---|
| `-k, --keypair <path>` | Solana keypair JSON |
| `-n, --network <name>` | `devnet` \| `mainnet` \| `localnet` (default: `devnet`) |

---

### `certificate` — Mint soulbound NFT certificate

```bash
hacknod certificate --submission-id <id> --network devnet
```

Mints a soulbound NFT certificate on-chain for a qualifying submission (final score ≥ 50).
- **Hardened**: Now calls the backend authority for centralized, Metaplex-compatible minting with dynamic metadata JSON.
- **Verifiable**: Both the scoring hash and the final reward are linked permanently on the Solana Devnet.

| Flag | Description |
|---|---|
| `-s, --submission-id <id>` | Submission ID from `submit` output |
| `-n, --network <network>` | `devnet` \| `mainnet` (default: `devnet`) |
