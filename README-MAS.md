# 🚀 JudgeChain Multi-Agent Operations

This guide shows how to launch the expert agents for the assigned MVP tasks.

## 📊 Current Task Log
View the target tasks here: [GitHub Issue #1](https://github.com/Inmodel/inmodel-c/issues/1)

---

## 🎨 Frontend Expert
**Task**: Solana Wallet + Submission Form
**Launch Commands**:
```bash
# Using Kiro (Recommended for Dashboard work)
kiro chat frontend

# Using Gemini (Secondary)
gemini ask "Work on the Project Submission form in dashboard/src/app/page.tsx as the Frontend Expert"
```

## 🔧 Backend Expert
**Task**: Signature Verification + Persistence
**Launch Commands**:
```bash
# Using Kiro (Recommended for API logic)
kiro chat backend

# Using Gemini
gemini ask "Implement signature verification in backend/app/api/routes/score.py as the Backend Expert"
```

## ⛓️ Blockchain Expert
**Task**: Devnet Deployment
**Launch Commands**:
```bash
# Using Kiro (Recommended for Anchor logic)
kiro chat blockchain

# Using Gemini
gemini ask "Deploy the judgechain program to Devnet and update IDs as the Blockchain Expert"
```

---

## 📝 Rules for Agents
All agents must follow the **Multi-Agent Logging Workflow** from [AGENT.md](file:///Users/friday/Development/inmodel-c/AGENT.md):
1.  **Work**: Implement the assigned task.
2.  **Log**: Post progress to Issue #1: \`gh issue comment 1 -b \"### [Agent: <Role>] <Summary>\"\`.
3.  **Sync**: Run \`scripts/sync_git_to_logs.sh\` after committing.
