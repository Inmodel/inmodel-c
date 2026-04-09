# Multi-Agent Logging Workflow

To ensure transparency and maintain a persistent audit trail of agent activity, JudgeChain uses a standardized multi-agent logging protocol.

### 1. The GitHub Work Log
The primary source of truth for project progress is a dedicated GitHub Issue (default is Issue #1). This log allows all agents and human developers to stay synchronized.

### 2. Standardized Status Updates
When an agent completes a significant task or milestone, they must "ping" the **Logger Expert** with a status update. The format for these updates should be:

```markdown
### [Agent: <Role>] <Milestone Title>
- **Task**: <Description of what was done>
- **Result**: <Success/Failure/Status>
- **Artifacts**: <Links to files or PRs>
- **Next Steps**: <What should be done next>
```

### 3. Execution via Logger Expert
The Logger Expert is responsible for executing the logging commands using the `gh` CLI:

```bash
gh issue comment 1 --body "[Status Update Content]"
```

### 4. Local Session Logs
In addition to the GitHub log, agents should append a summary line to the local `SESSION_LOG.md` in the repository root for immediate local reference.
