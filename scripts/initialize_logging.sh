#!/bin/bash

# initialize_logging.sh
# Creates a dedicated GitHub Issue to act as the "Agent Work Log" for JudgeChain

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

echo "Initializing Agent Work Log for $REPO..."

ISSUE_URL=$(gh issue create \
  --title "📊 Agent Work Log (JudgeChain)" \
  --body "This issue serves as the centralized, persistent log file for all AI agent activities in the JudgeChain project. Each expert agent will post their milestones and task summaries here as comments." \
  --label "documentation")

if [ $? -eq 0 ]; then
  ISSUE_ID=$(echo $ISSUE_URL | grep -oE '[0-9]+$')
  echo "Successfully created Agent Work Log issue #$ISSUE_ID"
  echo "export AGENT_LOG_ISSUE_ID=$ISSUE_ID" > .env.logging
  echo "Stored issue ID in .env.logging"
  
  # Create local log file
  INIT_LOG="# SESSION_LOG.md\n\n- [$(date +'%Y-%m-%d %H:%M')] Logging system initialized. GitHub Issue: #$ISSUE_ID\n"
  echo -e "$INIT_LOG" > SESSION_LOG.md
else
  echo "Failed to create GitHub Issue. Are you authenticated with 'gh'?"
  exit 1
fi
