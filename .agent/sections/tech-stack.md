# Tech Stack

JudgeChain uses a modern, high-performance stack chosen for developer speed and production-readiness.

### 1. Blockchain: Solana + Anchor
- **Language:** Rust
- **Framework:** Anchor (for account management, IDLs, and safety).
- **Network:** Devnet for testing, Mainnet for shipping.

### 2. Frontend: Next.js + TailwindCSS (External Repo)
- **Framework:** Next.js (App Router).
- **Deployment:** Live at `https://hacknod.inmodel.in` (Vercel).
- **Repository:** `hacknod-web` (Handle separately from this backend repo).
- **Styling:** TailwindCSS.

### 3. Backend: FastAPI (Python)
- **Framework:** FastAPI (for high-speed async APIs).
- **Database:** PostgreSQL (for off-chain data and indexing).
- **Scoring Engine:** Custom Python analyzers for code quality and documentation.

### 4. CLI Tooling: Node.js
- **Purpose:** Quick project submission and developer health checks.
- **Library:** Commander.js.
