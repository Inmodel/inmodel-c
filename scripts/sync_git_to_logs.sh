#!/bin/bash

# sync_git_to_logs.sh
# Syncs new git commits into the Agent Work Log (GitHub Issue and local SESSION_LOG.md)

# Load logging environment
if [ -f .env.logging ]; then
  source .env.logging
else
  echo "Error: .env.logging not found. Run scripts/initialize_logging.sh first."
  exit 1
fi

STATE_FILE=".agent_log_state"
LAST_SYNC=$(cat $STATE_FILE)
CURRENT_HEAD=$(git rev-parse HEAD)

if [ "$LAST_SYNC" == "$CURRENT_HEAD" ]; then
  echo "No new commits to sync."
  exit 0
fi

echo "Syncing commits from $LAST_SYNC to $CURRENT_HEAD..."

# Get new commits in the format: [hash] [message]
COMMITS=$(git log ${LAST_SYNC}..${CURRENT_HEAD} --pretty=format:"%h %s" --reverse)

while read -r line; do
  HASH=$(echo $line | awk '{print $1}')
  MESSAGE=$(echo $line | cut -d' ' -f2-)
  
  # Extract Agent and Role if present in [Agent: Role] format
  AGENT_INFO=$(echo "$MESSAGE" | grep -oE '^\[Agent: [^]]+\]')
  if [ -z "$AGENT_INFO" ]; then
    AGENT_INFO="[Agent: Manual Commit]"
    TASK_SUMMARY="$MESSAGE"
  else
    TASK_SUMMARY=$(echo "$MESSAGE" | sed "s/^$AGENT_INFO //")
  fi
  
  # Format log entry
  LOG_ENTRY="### $AGENT_INFO - Git Sync
**Commit:** $HASH
**Timestamp:** $(git show -s --format=%ci $HASH)
**Status:** SUCCESS
**Summary:** $TASK_SUMMARY"

  echo "Posting log for $HASH..."
  
  # Post to GitHub
  gh issue comment $AGENT_LOG_ISSUE_ID --body "$LOG_ENTRY"
  
  # Append to local log
  echo -e "\n$LOG_ENTRY\n" >> SESSION_LOG.md
  
done <<< "$COMMITS"

# Update state
echo $CURRENT_HEAD > $STATE_FILE
echo "Sync complete. Updated state to $CURRENT_HEAD."

# Automate GitHub Issues (Component levels)
if [ -f scripts/automate_issues.js ]; then
  echo "Synchronizing component-specific issues..."
  node scripts/automate_issues.js
fi
