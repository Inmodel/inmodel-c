# JudgeChain

**JudgeChain** is a tamper-proof hackathon infrastructure platform built on the Solana ecosystem. It is designed to facilitate fair, transparent, and auditable code evaluation for hackathons. By leveraging static analysis and on-chain records, JudgeChain ensures every submission is independently verifiable.

---

## Architecture Overview

The platform uses a decoupled architecture designed for security, transparency, and scalability, consisting of four main components:

1. **CLI Tool (`/cli`)**: A Node.js CLI used by participants to package and submit their projects seamlessly. Features interactive prompts, project persistence, and certificate minting.
2. **Backend Scoring Engine (`/backend`)**: A highly-secure Python/FastAPI service that receives submissions, evaluates them using static analysis (avoiding RCE vulnerabilities), calculates technical scores, and integrates LLM-powered code review.
3. **Smart Contracts (`/programs/judgechain`)**: Rust-based Anchor smart contracts deployed on Solana Devnet. These contracts immutably record the final evaluation scores, maintain the hackathon leaderboard, and issue soulbound NFT certificates via Metaplex Core.
4. **Web Dashboard (`/dashboard`)**: A Next.js frontend where participants and organizers can visually track submissions, view score breakdowns, verify on-chain records, and manage hackathons.

```mermaid
graph TD
    classDef user fill:#6366f1,stroke:#fff,stroke-width:2px,color:#fff;
    classDef nodejs fill:#339933,stroke:#fff,stroke-width:2px,color:#fff;
    classDef python fill:#3776AB,stroke:#fff,stroke-width:2px,color:#fff;
    classDef solana fill:#14F195,stroke:#9945FF,stroke-width:3px,color:#000;
    classDef nextjs fill:#000000,stroke:#fff,stroke-width:2px,color:#fff;

    A([Participant Developer]):::user -->|Submits Code| B(CLI Tool<br/>Node.js):::nodejs
    B -->|Encrypted Payload| C{Backend Engine<br/>FastAPI / Python}:::python
    C -->|Static Analysis| D[Scoring Modules]:::python
    D -.->|Score Result| C
    C -->|Records Tx| E[(Solana Blockchain<br/>Anchor Program)]:::solana
    F(Web Dashboard<br/>Next.js):::nextjs -->|Verify On-chain| E
    G([Hackathon Organizer]):::user -->|Views Leaderboard| F
```

---

## Submission Workflow

The following sequence details how a participant's submission moves through the system from the CLI to the blockchain:

```mermaid
sequenceDiagram
    participant User as Participant
    participant CLI as CLI Tool (Node.js)
    participant Backend as Scoring Engine (Python)
    participant Chain as Solana (Anchor)
    participant Dash as Dashboard (Next.js)
    
    User->>CLI: run `judgechain submit ./project`
    activate CLI
    CLI->>CLI: Package code & metadata
    CLI->>Backend: HTTP POST /api/submit
    activate Backend
    
    Backend->>Backend: Validate payload (Pydantic)
    Backend->>Backend: Run static analysis & mock eval
    Backend->>Backend: Calculate technical score
    
    Backend->>Chain: Tx: Record Score Data
    activate Chain
    Chain-->>Backend: Returns Transaction Hash
    deactivate Chain
    
    Backend-->>CLI: Success + Tx Hash
    deactivate Backend
    CLI-->>User: Deployment successful

    Dash->>Chain: Read leaderboard accounts
    activate Dash
    Chain-->>Dash: Score Data
    Dash-->>User: Display verifiable score
    deactivate Dash
```

---

## Directory Structure

```text
inmodel-c/
├── backend/            # Python backend scoring engine (FastAPI, Pydantic)
│   ├── app/
│   │   ├── api/        # API routes (score, judge, certificate)
│   │   ├── models/     # Pydantic schemas
│   │   ├── scoring/    # Static analysis & LLM scoring modules
│   │   └── utils/      # Solana integration & helpers
│   ├── main.py         # FastAPI app entry point
│   ├── judgechain.db   # SQLite database
│   └── judgechain.json # IDL for Solana program
├── cli/                # Node.js CLI submission tool for participants
│   ├── src/
│   │   └── index.ts    # CLI commands (submit, leaderboard, certificate)
│   └── package.json
├── dashboard/          # Next.js / TypeScript Web dashboard 
│   ├── src/
│   │   ├── app/        # Pages (home, submit, leaderboard, judge, organizer, profile)
│   │   ├── components/ # React components (Navbar, etc.)
│   │   ├── lib/        # Solana connection & utilities
│   │   ├── idl/        # IDL types for TypeScript
│   │   └── types/      # TypeScript definitions
│   └── package.json
├── programs/           # Solana smart contracts (Rust & Anchor)
│   └── judgechain/
│       └── src/
│           └── lib.rs  # Main program (hackathon, submission, scoring, NFT certificates)
├── tests/              # Anchor protocol and integration tests
│   └── nft_certificates.ts
├── agents/             # AI agent instructions (orchestrator, blockchain, backend, frontend, cli, logger)
└── .agent/             # AI Developer Context files
```

---

## Features Implemented

✅ **Smart Contract (Solana/Anchor)**
- Hackathon creation and management
- Submission tracking with on-chain records
- Dual scoring system (system + judge)
- NFT certificate issuance via Metaplex Core
- Soulbound certificates with permanent freeze delegate

✅ **Backend Scoring Engine (FastAPI)**
- Static code analysis (coverage, lint, complexity)
- LLM-powered code review integration
- Cryptographic signature verification
- SQLite database for submission storage
- Certificate metadata generation endpoint

✅ **CLI Tool (Node.js)**
- Interactive submission flow with @clack/prompts
- Project persistence (.judgenod.json)
- Smart git detection
- Leaderboard viewing
- Certificate command for NFT minting

✅ **Web Dashboard (Next.js)**
- Home page with feature showcase
- Submit page for project submission
- Leaderboard with real-time rankings
- Judge panel for manual scoring
- Organizer dashboard for hackathon management
- Profile page for participant stats

---

## Development & Testing

Ensure you have the following prerequisites installed:
* Node.js & npm
* Python 3.9+
* Rust & Cargo
* Solana CLI & Anchor Framework (`^0.30.1`)

### Current Deployment Status

**Program ID (Devnet):** `9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2`

The smart contract is deployed on Solana Devnet with full NFT certificate support via Metaplex Core.

### Local Setup Environments

**1. Solana Smart Contracts**
```bash
# Build the Anchor programs
anchor build

# Run protocol tests (includes NFT certificate tests)
anchor test
```

**2. Backend Scoring Engine**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the development server
python main.py
# or
uvicorn main:app --reload
```

**3. Web Dashboard**
```bash
cd dashboard
npm install
npm run dev
# Dashboard runs on http://localhost:3000
```

**4. CLI Tool**
```bash
cd cli
npm install
npm link  # Makes 'judgechain' command available globally

# Submit a project
judgechain submit --problem "problem-1" --repo "https://github.com/user/repo" --deployment "https://app.vercel.app"

# View leaderboard
judgechain leaderboard
```

---

## Security Philosophy

**MVP First**: Prioritize rapid execution and straightforward architecture while maintaining strong security guarantees.

**No RCE Vulnerabilities**: The backend explicitly does not execute arbitrary user code. Submissions run through structured static analysis, preventing Remote Code Execution (RCE) vectors.

**Deterministic Validation**: Input validation is rigorously handled by comprehensive Pydantic (Backend) and TypeScript (Frontend/CLI) typing.

**Cryptographic Request Signing**: All CLI submissions are signed with the participant's Solana keypair to ensure authenticity and prevent impersonation.

**Soulbound NFT Certificates**: Certificates are issued as Metaplex Core NFTs with a permanent freeze delegate, making them non-transferable and tamper-proof proof of achievement.