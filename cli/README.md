# judgenod CLI

Submit and track hackathon projects on JudgeChain (Solana).

## Install

```bash
cd cli && npm install && npm run build
# then use via:
node dist/index.js <command>
# or link globally:
npm link
```

## Network Configuration

Set `JUDGECHAIN_API_URL` to override the default backend (`http://localhost:8000/api/v1`):

```bash
export JUDGECHAIN_API_URL=https://api.judgechain.xyz/api/v1
```

---

## Commands

### `submit` — Submit a project

```bash
judgenod submit \
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
judgenod status --tx <signature> --network devnet
```

| Flag | Description |
|---|---|
| `-t, --tx <hash>` | Transaction signature (required) |
| `-n, --network <name>` | `devnet` \| `mainnet` \| `localnet` (default: `devnet`) |

---

### `leaderboard` — View problem leaderboard

```bash
# Interactive problem selector:
judgenod leaderboard

# Direct:
judgenod leaderboard --problem problem-1 --json
```

| Flag | Description |
|---|---|
| `-p, --problem <id>` | Problem ID (omit for interactive selector) |
| `--json` | Output raw JSON |

---

### `init` — Interactive guided submission TUI

```bash
judgenod init --network devnet
```

Walks through all submission fields interactively, saves config to `.judgenod.json`, submits, then offers to mint your certificate immediately.

| Flag | Description |
|---|---|
| `-k, --keypair <path>` | Solana keypair JSON |
| `-n, --network <name>` | `devnet` \| `mainnet` \| `localnet` (default: `devnet`) |

---

### `certificate` — Mint soulbound NFT certificate

```bash
judgenod certificate --submission-id <id> --network devnet
```

Mints a soulbound NFT certificate on-chain for a qualifying submission (final score ≥ 50).

| Flag | Description |
|---|---|
| `-s, --submission-id <id>` | Submission ID from `submit` output |
| `-n, --network <network>` | `devnet` \| `mainnet` (default: `devnet`) |
