-- Migration: Create security_audit table for security audit trail
-- This table tracks injection attempts, gaming flags, and score penalties

CREATE TABLE IF NOT EXISTS security_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    repo_url TEXT NOT NULL,
    injection_attempts TEXT,  -- JSON array
    injection_threat_level TEXT NOT NULL,
    content_hash_pre_sanitize TEXT NOT NULL,
    content_hash_post_sanitize TEXT NOT NULL,
    gaming_flags TEXT,  -- JSON array
    score_penalties_applied INTEGER DEFAULT 0,
    raw_system_score INTEGER NOT NULL,
    final_system_score INTEGER NOT NULL,
    was_penalized BOOLEAN DEFAULT 0
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_audit_submission ON security_audit(submission_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_wallet ON security_audit(wallet);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit(timestamp);
