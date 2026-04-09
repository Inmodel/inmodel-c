---
name: judgechain-instructions
description: System-level instructions and persona overview for the JudgeChain project agents.
---

# Gemini Agent System (JudgeChain)

This directory contains specialized system instructions for using Gemini with the **JudgeChain** project.

## How to use
When using the Gemini CLI or API, you can provide the content of the specialized agent files as system instructions.

## Agent Personas
- **Orchestrator**: Lead Architect & PM (MVP-first mindset). See `agents/orchestrator.md`.
- **Backend Expert**: FastAPI & Python Scoring Engine. See `agents/backend.md`.
- **Blockchain Expert**: Solana & Anchor smart contracts. See `agents/blockchain.md`.
- **Frontend Expert**: Next.js & React Dashboard. See `agents/frontend.md`.
- **CLI Expert**: Participant submission tool (Node.js). See `agents/cli.md`.

## Standard Practice
1. Start with the **Orchestrator** to plan a feature.
2. Switch to the relevant **Expert** to implement the logic.
3. Always verify against the "Ship Fast, Iterate Later" mindset to avoid over-engineering.
