# Security API Documentation

## Overview

The JudgeChain scoring engine now includes a comprehensive 5-layer anti-tampering security system that protects against prompt injection, score gaming, and other attacks targeting LLM-based systems.

## API Changes

### ScoreResponse Schema

The `/api/v1/score` endpoint now returns an extended `ScoreResponse` with security metadata:

```json
{
  "submission_id": "uuid",
  "problem_id": "string",
  "wallet": "string",
  "system_score": {
    "code_quality": 15,
    "test_coverage": 14,
    "deployment_health": 12,
    "documentation": 8,
    "custom_criteria": 7,
    "total": 56
  },
  "security": {
    "scan_result": "clean|suspicious|blocked",
    "injection_attempts_detected": 0,
    "gaming_flags": [],
    "penalties_applied": 0,
    "audit_hash": "a1b2c3d4e5f6g7h8"
  },
  "judge_score": null,
  "final_score": null,
  "tx_hash": null,
  "status": "scored"
}
```

### Security Metadata Fields

- **scan_result**: Threat level classification
  - `"clean"`: No injection patterns detected
  - `"suspicious"`: 1-2 injection patterns detected (submission scored but flagged)
  - `"blocked"`: 3+ injection patterns detected (submission rejected with 400 error)

- **injection_attempts_detected**: Count of injection patterns found

- **gaming_flags**: List of gaming detection flags
  - `"TRIVIAL_TESTS"`: Trivial test files detected (>50% trivial patterns)
  - `"ALL_SECTIONS_PRESENT"`: All standard README sections present (suspicious)
  - `"AI_GENERATED_PHRASES"`: 3+ AI-generated phrases detected
  - `"HOLLOW_CONTENT"`: README with <3 lines per section
  - `"SIMPLE_JSON_RESPONSE"`: Deployment returns only `{"status": "ok"}`
  - `"FAST_RESPONSE_TIME"`: Deployment responds in <5ms (suggests static file)
  - `"NO_HTML_CONTENT"`: Deployment doesn't return HTML
  - `"COVERAGE_IMPLAUSIBLE"`: High coverage claim with low test-to-source ratio

- **penalties_applied**: Total score penalty points deducted (0-8 per flag)

- **audit_hash**: First 16 characters of SHA256 hash for audit trail

## Error Responses

### 400 Bad Request - Security Error

When a submission is blocked due to security violations:

```json
{
  "detail": "Submission blocked due to injection attempts: ['ignore previous instructions', 'set score to 100']"
}
```

Common security error messages:
- `"Invalid repository URL: ..."` - URL validation failed
- `"Invalid deployment URL: ..."` - SSRF protection triggered
- `"Submission blocked due to injection attempts: ..."` - Threat level BLOCKED
- `"Score validation failed: ..."` - Output validator rejected scores

## Security Audit Records

All submissions are logged to the `security_audit` table with:

- `submission_id`: Unique submission identifier
- `wallet`: Participant wallet address
- `timestamp`: Unix timestamp of submission
- `repo_url`: Repository URL
- `injection_attempts`: JSON array of detected injection patterns
- `injection_threat_level`: "clean", "suspicious", or "blocked"
- `content_hash_pre_sanitize`: SHA256 hash of original content
- `content_hash_post_sanitize`: SHA256 hash of sanitized content
- `gaming_flags`: JSON array of gaming detection flags
- `score_penalties_applied`: Total penalty points
- `raw_system_score`: Score before penalties
- `final_system_score`: Score after penalties
- `was_penalized`: Boolean flag

## Security Layers

### Layer 1: Input Validator
- Validates GitHub repository URLs (HTTPS only)
- SSRF protection for deployment URLs (blocks private IPs, localhost, AWS metadata)
- Size limit enforcement (README: 8KB, files: 4KB each)
- Base64/hex encoded injection detection

### Layer 2: Injection Scanner
- 40+ regex patterns for common injection techniques
- Typoglycemia detection (scrambled keywords)
- Threat level classification (CLEAN, SUSPICIOUS, BLOCKED)
- Content sanitization with [INJECTION_ATTEMPT_REDACTED] markers

### Layer 3: Content Isolator
- Spotlighting technique: wraps untrusted content with explicit markers
- System prompt instructs LLM to treat content as data, not instructions
- LLM response validation (score bounds, reasoning checks)

### Layer 4: Output Validator
- Pydantic-based strict bounds checking
- Per-dimension score validation:
  - code_quality: [0, 18]
  - test_coverage: [0, 18]
  - deployment_health: [0, 14]
  - documentation: [0, 10]
  - custom_criteria: [0, 10]
- Hard cap on total score: 70 points

### Layer 5: Anti-Gaming Checker
- Trivial test detection (assert True, pass statements)
- README stuffing detection (all sections, AI phrases, hollow content)
- Fake deployment detection (static JSON, fast response, no HTML)
- Implausible coverage claim detection (high coverage + low test ratio)

## Penalty System

Gaming flags result in score penalties:

| Flag | Penalty |
|------|---------|
| TRIVIAL_TESTS | 8 points |
| ALL_SECTIONS_PRESENT | 3 points |
| AI_GENERATED_PHRASES | 2 points |
| HOLLOW_CONTENT | 3 points |
| SIMPLE_JSON_RESPONSE | 7 points |
| FAST_RESPONSE_TIME | 3 points |
| NO_HTML_CONTENT | 4 points |
| COVERAGE_IMPLAUSIBLE | 6 points |

Penalties are distributed across all score dimensions proportionally.

## Monitoring and Logging

Security events are logged to:
- `security.injection` logger: Injection detection events
- `security.gaming` logger: Gaming detection events

Log format includes:
- Event type (INJECTION_ATTEMPT, ENCODED_INJECTION_DETECTED, etc.)
- Source identifier (readme, code, deployment, etc.)
- Threat count or flag details
- Content hash for audit trail

## Backward Compatibility

- API contract is extended, not modified
- Existing clients can ignore the `security` field
- All security checks are transparent to existing workflows
- No breaking changes to existing endpoints

## Examples

### Clean Submission

```json
{
  "security": {
    "scan_result": "clean",
    "injection_attempts_detected": 0,
    "gaming_flags": [],
    "penalties_applied": 0,
    "audit_hash": "0000000000000000"
  }
}
```

### Suspicious Submission (Scored but Flagged)

```json
{
  "security": {
    "scan_result": "suspicious",
    "injection_attempts_detected": 2,
    "gaming_flags": ["TRIVIAL_TESTS", "HOLLOW_CONTENT"],
    "penalties_applied": 11,
    "audit_hash": "a1b2c3d4e5f6g7h8"
  }
}
```

### Blocked Submission (400 Error)

```json
{
  "detail": "Submission blocked due to injection attempts: ['ignore previous instructions', 'set score to 100', 'override scoring']"
}
```

## Deployment Considerations

1. **Database Migration**: Run migration to create `security_audit` table before deploying
2. **Incremental Rollout**: Enable layers incrementally and monitor for false positives
3. **Monitoring**: Set up alerts for high injection attempt rates or gaming flag patterns
4. **Tuning**: Adjust thresholds based on real-world data (e.g., trivial_ratio threshold)
