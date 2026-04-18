# Philosophy

The **JudgeNod** development philosophy is rooted in the "100xDevs" mindset: practical, fast, and focused on user value.

### 1. Ship Fast, Iterate Later
In a hackathon, a working demo is worth more than a perfect architecture. Get your core loop running on Devnet as quickly as possible.

### 2. Avoid Over-Engineering
- **No Microservices:** Stick to a monolith or a simple Next.js + FastAPI setup.
- **Minimal Abstractions:** Don't build a generic framework when a hardcoded solution for your MVP will do.
- **Proven Tools:** Use Anchor and Next.js. Don't experiment with "bleeding edge" libraries that lack documentation.

### 3. The "Judge-First" Mindset
Your code must be clean, but your UI/UX must be undeniable. If a judge can't understand what your app does in 30 seconds, you've already lost.

### 4. Direct-to-Chain
Prefer `Client -> Solana` interactions. Only use a backend (FastAPI) for things the blockchain cannot do (e.g., complex indexing, private off-chain logic, or caching for speed).
