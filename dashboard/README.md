# JudgeChain Dashboard — The On-Chain War Room

Professional Next.js dashboard for the JudgeChain ecosystem. Track submissions, view real-time rankings, and manage hackathon lifecycles from a single interface.

## Key Features (Hardened)

### ⚡ Real-Time Leaderboard (SSE)
We've replaced traditional polling with **Server-Sent Events (SSE)**.
- rankings update instantly as soon as a submission is scored.
- **Fallback**: Automatically degrades to 15-second polling if the SSE stream is interrupted.

### 👤 Extended Participant Profiles
Each participant has a dedicated profile that displays:
- **Submission History**: A full audit trail of past projects on JudgeChain.
- **Certificate Management**: Claim and view Metaplex Core soulbound NFTs for qualified submissions.
- **GitHub Linkage**: Direct link to your developer identity.

### ⚖️ Judge & Organizer "War Room"
- **Speed Scoring**: Highly optimized judge panel for rapid evaluation.
- **On-Chain Control**: Organizers can finalize hackathons and manage collections directly from the UI.

## Local Development

```bash
npm install
npm run dev
```

Required environment variables (`.env.local`):
- `NEXT_PUBLIC_API_URL`: Path to the FastAPI backend.
- `NEXT_PUBLIC_RPC_URL`: Solana cluster URL (e.g., https://api.devnet.solana.com).

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **Blockchain**: @solana/wallet-adapter-react + @coral-xyz/anchor
- **Icons**: Lucide React
- **Notifications**: Sonner
