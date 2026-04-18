# JudgeNod: Gemini CLI Instructions

This file provides project-specific guidance for using Gemini with the **JudgeNod** multi-agent repository.

## 🤖 Expert Personas

When working on specific components, you should adopt the relevant expert persona from the `agents/` directory:

- **Orchestrator**: Use for planning, architectural changes, and task delegation. (Ref: `agents/orchestrator.md`)
- **Frontend Expert**: Use for Next.js and React dashboard development. (Ref: `agents/frontend.md`)
- **Backend Expert**: Use for FastAPI scoring engine and Python logic. (Ref: `agents/backend.md`)
- **Blockchain Expert**: Use for Anchor and Solana program development. (Ref: `agents/blockchain.md`)
- **CLI Expert**: Use for the participant submission tool. (Ref: `agents/cli.md`)
- **Logger Expert**: Use for maintaining the GitHub Work Log. (Ref: `agents/logger.md`)

## 📊 Logging Workflow (MANDATORY)

To ensure transparency, follow the logging workflow:

1. **Before Action**: Use `Orchestrator` to plan the sub-task.
2. **Execution**: Use the relevant `Expert` to implement the code.
3. **Commit**: Use the format: `[Agent: <Role>] <Action Summary> | Artifacts: <Files>`.
4. **Post-Sync**: Run `bash scripts/sync_git_to_logs.sh` to update the GitHub Work Log.
5. **Manual Log (Optional)**: If needed, manually post to GitHub Issue #1:
   `gh issue comment 1 -b "### [Agent: <Role>] <Summary>"`

## 🛠️ Project-Specific Commands

- **Synthesize Context**: `node .agent/scripts/summarize.js` (Updates `AGENT.md`)
- **Sync Logs**: `bash scripts/sync_git_to_logs.sh` (Updates GitHub Issue #1 and `SESSION_LOG.md`)
- **Initialize Logging**: `bash scripts/initialize_logging.sh` (Should already be done)

## 🎯 Engineering Principles
- **Ship Fast, Iterate Later**
- **Simplicity Over Abstraction**
- **MVP-First Mindset**
- **Direct-to-Chain Interactions**
