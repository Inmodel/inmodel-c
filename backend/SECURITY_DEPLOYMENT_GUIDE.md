# Security Layer Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the 5-layer anti-tampering security system to production.

## Pre-Deployment Checklist

- [ ] All security modules implemented and tested
- [ ] Database migration script reviewed
- [ ] API route updated with SecureScoringEngine
- [ ] Security logging configured
- [ ] Monitoring and alerting set up
- [ ] Rollback plan documented

## Deployment Steps

### Phase 1: Database Setup (Pre-Deployment)

1. **Backup existing database**
   ```bash
   cp backend/judgechain.db backend/judgechain.db.backup
   ```

2. **Run migration to create security_audit table**
   ```bash
   sqlite3 backend/judgechain.db < backend/migrations/001_create_security_audit_table.sql
   ```

3. **Verify table creation**
   ```bash
   sqlite3 backend/judgechain.db ".schema security_audit"
   ```

### Phase 2: Code Deployment

1. **Deploy security modules**
   - `backend/app/security/__init__.py` - Shared types and constants
   - `backend/app/security/input_validator.py` - Layer 1
   - `backend/app/security/injection_scanner.py` - Layer 2
   - `backend/app/security/content_isolator.py` - Layer 3
   - `backend/app/security/output_validator.py` - Layer 4
   - `backend/app/security/anti_gaming.py` - Layer 5

2. **Deploy integration layer**
   - `backend/app/scoring/secure_engine.py` - SecureScoringEngine

3. **Update API route**
   - `backend/app/api/routes/score.py` - Updated to use SecureScoringEngine

4. **Update models**
   - `backend/app/models/db_models.py` - Added SecurityAuditRecord
   - `backend/app/models/schemas.py` - Added SecurityMetadata

5. **Update main application**
   - `backend/main.py` - Security logger initialization

### Phase 3: Incremental Rollout Strategy

#### Stage 1: Validation Only (Week 1)
- Deploy all security modules
- Enable Layers 1-4 (validation only, no penalties)
- Monitor audit logs for false positives
- Collect baseline metrics

**Metrics to monitor:**
- Injection attempt rate
- Gaming flag distribution
- Score variance (before/after penalties)
- False positive rate

#### Stage 2: Gaming Detection (Week 2)
- Enable Layer 5 (anti-gaming checks)
- Apply penalties to scores
- Monitor penalty distribution
- Adjust thresholds if needed

**Thresholds to monitor:**
- Trivial test ratio (currently 0.5)
- AI phrase count (currently 3)
- Content density (currently 3 lines/section)
- Coverage ratio (currently 0.3)

#### Stage 3: Full Production (Week 3+)
- All layers enabled with penalties
- Continuous monitoring
- Regular audit log review
- Threat pattern analysis

### Phase 4: Monitoring Setup

1. **Security Event Logging**
   ```python
   # Logs are written to:
   # - security.injection logger: injection detection events
   # - security.gaming logger: gaming detection events
   ```

2. **Metrics to Track**
   - Daily injection attempt count
   - Daily gaming flag count
   - Average penalties applied
   - Blocked submission rate
   - False positive rate (manual review)

3. **Alerting Rules**
   - Alert if injection attempt rate > 10% of submissions
   - Alert if gaming flag rate > 5% of submissions
   - Alert if blocked submission rate > 2%
   - Alert on unusual patterns (e.g., same wallet multiple blocks)

### Phase 5: Threshold Tuning

Based on real-world data, adjust these thresholds:

**Layer 2: Injection Scanner**
- Threat level calculation: currently 0-2 = SUSPICIOUS, 3+ = BLOCKED
- Consider adjusting based on false positive rate

**Layer 5: Anti-Gaming Checker**
- Trivial test ratio: currently 0.5 (50%)
- AI phrase count: currently 3
- Content density: currently 3 lines per section
- Coverage ratio: currently 0.3 (30%)

## Rollback Plan

If issues arise, rollback in this order:

1. **Disable Layer 5 (Anti-Gaming)**
   - Comment out anti-gaming checks in SecureScoringEngine
   - Penalties will be 0
   - Submissions will still be validated

2. **Disable Layer 2 (Injection Scanner)**
   - Comment out injection scanning
   - Only URL validation and size limits active
   - Revert to original scoring

3. **Full Rollback**
   - Revert to original `execute_scoring_pipeline()`
   - Restore database backup if needed
   - Disable security logging

## Testing Checklist

Before production deployment:

- [ ] Unit tests pass for all security modules
- [ ] Integration tests pass for end-to-end flow
- [ ] Database migration runs without errors
- [ ] API returns correct security metadata
- [ ] Audit records are created for all submissions
- [ ] Logging works correctly
- [ ] Performance impact < 150ms per submission
- [ ] No breaking changes to existing API clients

## Performance Considerations

Expected latency impact:

| Layer | Latency |
|-------|---------|
| Layer 1 (Input Validator) | < 1ms |
| Layer 2 (Injection Scanner) | 10-50ms |
| Layer 3 (Content Isolator) | < 1ms |
| Layer 4 (Output Validator) | < 1ms |
| Layer 5 (Anti-Gaming) | 20-100ms |
| **Total** | **30-150ms** |

This is acceptable since LLM calls take 1-5 seconds.

## Monitoring Dashboard

Set up monitoring for:

1. **Security Events**
   - Injection attempts per day
   - Gaming flags per day
   - Blocked submissions per day
   - Penalties applied distribution

2. **Performance**
   - Scoring latency (with/without security)
   - Database query times
   - API response times

3. **Audit Trail**
   - Submissions by threat level
   - Submissions by gaming flags
   - Penalty distribution
   - Wallet-level patterns

## Documentation Updates

After deployment, update:

1. **API Documentation**
   - Document new `security` field in ScoreResponse
   - Document SecurityError responses
   - Provide examples

2. **Deployment Documentation**
   - Add security layer architecture diagram
   - Document monitoring setup
   - Document threshold tuning process

3. **Operational Runbooks**
   - How to investigate security alerts
   - How to adjust thresholds
   - How to rollback if needed

## Post-Deployment Validation

1. **Week 1 Review**
   - Analyze injection attempt patterns
   - Check for false positives
   - Review gaming flag distribution
   - Validate audit records

2. **Week 2 Review**
   - Assess penalty impact on scores
   - Identify threshold adjustments needed
   - Review performance metrics
   - Check for edge cases

3. **Week 3+ Ongoing**
   - Monthly security audit
   - Quarterly threshold review
   - Continuous monitoring
   - Pattern analysis for new attack types

## Support and Troubleshooting

### Common Issues

**Issue: High false positive rate for injection detection**
- Solution: Review INJECTION_PATTERNS list, adjust regex patterns
- Consider: Lowering threat level threshold from 3 to 4

**Issue: Gaming flags too aggressive**
- Solution: Increase thresholds (e.g., trivial_ratio from 0.5 to 0.7)
- Consider: Add whitelist for known legitimate patterns

**Issue: Performance degradation**
- Solution: Profile security layers, optimize regex compilation
- Consider: Cache compiled patterns, batch processing

**Issue: Database migration fails**
- Solution: Check SQLite version, verify table doesn't exist
- Consider: Manual table creation if migration fails

## Contact and Escalation

For security-related issues:
1. Check monitoring dashboard
2. Review audit logs
3. Consult security team
4. Consider rollback if critical

## Appendix: Configuration

### Environment Variables

```bash
# Security configuration
SECURITY_ENABLED=true
SECURITY_LOG_LEVEL=INFO
SECURITY_AUDIT_ENABLED=true

# Threshold configuration
TRIVIAL_TEST_RATIO=0.5
AI_PHRASE_COUNT=3
CONTENT_DENSITY_MIN=3
COVERAGE_RATIO_MIN=0.3
```

### Database Indexes

The migration creates these indexes for performance:
- `idx_security_audit_submission` - Query by submission_id
- `idx_security_audit_wallet` - Query by wallet (detect patterns)
- `idx_security_audit_timestamp` - Query by time range

### Logging Configuration

Security loggers are configured in `backend/main.py`:
- `security` - Main security logger
- `security.injection` - Injection detection events
- `security.gaming` - Gaming detection events

All logs include timestamp, level, and structured message format.
