# masterplan.md

## 1. App Overview and Objective

This project is not an application but a **high-quality `.agent` context file** designed for Claude Code.

Objective:

* Help a beginner quickly understand and build on **Solana**
* Encode **Harkirat Singh–style thinking**
* Provide **clear guidance during a hackathon**
* Reduce confusion and prevent common mistakes

Core Idea:

> “An AI-ready mentor for Solana hackathon development”

---

## 2. Target Audience

* Beginner to intermediate developers
* Developers with **no prior Web3 experience**
* Hackathon participants (time-constrained builders)

---

## 3. Core Output

A structured `.agent/agents/` multi-agent ecosystem that includes:

* Orchestrator (Product Manager / Engineering Lead)
* Frontend Developer (Next.js, Solana Wallet Adapter)
* Backend Developer (FastAPI, CLI Tooling)
* Blockchain Developer (Anchor, Rust)
* Harkirat-style workflow encoded in each role

---

## 4. Content Sources

Primary Sources:

* YouTube (Harkirat Singh)
* Blogs and tweets
* Solana documentation
* Hackathon pages (e.g., folder.md)

Processing Approach:

1. Extract raw insights
2. Summarize using AI
3. Convert into structured principles
4. Remove noise and repetition
5. Organize into sections

---

## 5. `.agent` File Structure

### 5.1 Identity Section

Define agent personality:

* Practical engineer
* MVP-first mindset
* Avoid over-engineering
* Focus on shipping

---

### 5.2 Engineering Principles (Harkirat-style)

Examples:

* Ship fast, iterate later
* Prefer simplicity over abstraction
* Avoid premature optimization
* Use proven tools, not hype

---

### 5.3 Solana First Principles

Include:

* Accounts-based model (not like Ethereum)
* Programs (smart contracts)
* Transactions and instructions
* Importance of low latency and high throughput
* Cost efficiency mindset

---

### 5.4 Recommended Tech Stack

Frontend:

* Next.js
* TypeScript

Backend:

* Node.js (if needed)

Blockchain:

* Solana Web3.js
* Anchor framework

Wallet:

* Phantom wallet integration

---

### 5.5 Architecture Patterns

* Keep backend minimal
* Use direct client → blockchain interaction
* Stateless design where possible
* Use indexing only if required

---

### 5.6 Best Practices (Web3 + Solana)

* Always validate transactions
* Keep contracts simple
* Use testnet/devnet first
* Log and debug properly
* Reuse audited patterns

---

### 5.7 Common Mistakes to Avoid

* Overcomplicating smart contracts
* Ignoring UX (wallet flow matters)
* Poor error handling
* Not testing on devnet
* Trying to build too many features

---

### 5.8 Hackathon Strategy

* Start with a clear, small MVP
* Pick one strong idea, not five
* Focus on demo > perfection
* Build something judges can understand in 2 minutes

---

### 5.9 Project Guidance (Light Templates)

Provide direction for:

* DeFi app (simple staking or swap)
* NFT minting tool
* Wallet dashboard
* Developer tooling

---

### 5.10 User Experience Principles

* Reduce friction in wallet connection
* Clear transaction feedback
* Fast UI interactions
* Avoid confusing blockchain jargon

---

## 6. Conceptual Data Model (for understanding)

Even though no backend required:

* User (wallet address)
* Transactions
* Program interactions
* Metadata (for NFTs or app logic)

---

## 7. Security Considerations

* Never expose private keys
* Validate all inputs
* Avoid unsafe contract logic
* Use standard libraries

---

## 8. Development Phases

### Phase 1 — Research

* Watch Harkirat videos
* Read Solana basics
* Study hackathon requirements

### Phase 2 — Extraction

* Write raw notes
* Identify repeated patterns

### Phase 3 — Structuring

* Convert notes into sections
* Remove redundancy

### Phase 4 — `.agent` Formatting

* Convert into Claude-compatible format

### Phase 5 — Testing

* Use `.agent` in Claude
* Ask it to build sample apps
* Refine output

---

## 9. Potential Challenges

### Challenge: Noisy data from YouTube

Solution: Manual filtering + summarization

### Challenge: Too generic output

Solution: Add hackathon-specific constraints

### Challenge: Overloading the agent

Solution: Keep content concise and structured

---

## 10. Future Expansion

* Add multiple creators
* Add dynamic generation
* Build UI tool later
* Support multiple blockchains

---

## 11. Success Criteria

* Agent gives clear, actionable guidance
* Helps build MVP faster
* Reduces beginner confusion
* Produces usable project ideas

---

## Final Note

Focus on:

* Clarity > completeness
* Actionable > theoretical
* Hackathon relevance > general knowledge

This is not documentation.
This is a **thinking system for AI**.
