# Architecture

JudgeChain is designed for low latency and tamper-proof verification.

### 1. Component Overview
- **Next.js Dashboard (External):** Live at `hacknod.inmodel.in`. Managed in a separate repository (`hacknod-web`).
- **FastAPI Scoring Engine (This Repo):** Asynchronously analyzes GitHub repositories.
- **Solana JudgeNod Program (This Repo):** Stores the final, verified score on-chain.
- **CLI Submitter:** A tool for developers to push their local builds for judging.

### 2. Data Flow
1. **Submit:** Developer uses the CLI to submit a repository.
2. **Analyze:** FastAPI pulls the code, runs analyzers, and outputs a score.
3. **Verify:** The score is sent to the Solana Program.
4. **On-Chain Proof:** A transaction is signed, permanently recording the score on the blockchain.
5. **Display:** The Dashboard reads the on-chain data to show the leaderboard.

### 3. Off-Chain vs. On-Chain
- **Off-Chain (FastAPI):** Heavy computation (code analysis, linting checks).
- **On-Chain (Solana):** Immutable results, voting, and proof of judging.
