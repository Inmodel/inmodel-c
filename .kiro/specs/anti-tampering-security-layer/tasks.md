# Implementation Plan: Anti-Tampering Security Layer

## Overview

This plan implements a 5-layer defense-in-depth security architecture to protect JudgeChain's scoring engine from prompt injection, score gaming, and other attacks targeting LLM-based systems. The implementation follows a modular approach where each security layer is built and tested independently before integration.

## Tasks

- [x] 1. Set up security module structure and shared utilities
  - Create `backend/app/security/` directory
  - Create `backend/app/security/__init__.py` with shared types and constants
  - Define `SecurityError` exception class
  - Set up security-specific logger configuration
  - _Design Reference: Module 1-5 shared dependencies_

- [x] 2. Implement Layer 1: Input Validator
  - [x] 2.1 Create InputValidator class with URL validation
    - Implement `validate_repo_url()` with GitHub URL pattern matching
    - Implement `validate_deployment_url()` with SSRF protection (block localhost, private IPs, AWS metadata endpoint)
    - Add URL scheme validation (only https://)
    - _Design Reference: Module 1 - Input Validator_
  
  - [x] 2.2 Add size limit enforcement
    - Implement `check_size_limits()` with configurable thresholds
    - Define constants: MAX_README_CHARS=8000, MAX_FILE_CONTENT_CHARS=4000, MAX_REPO_FILES_SCANNED=50
    - _Design Reference: Module 1 - check_size_limits()_
  
  - [x] 2.3 Implement encoded content detection
    - Implement `decode_and_check()` to detect base64/hex encoded injections
    - Add pattern matching for base64 strings (40+ chars)
    - Decode and scan for injection keywords in decoded content
    - Replace suspicious encoded content with [ENCODED_CONTENT_REDACTED]
    - _Design Reference: Module 1 - decode_and_check()_
  
  - [x]* 2.4 Write unit tests for InputValidator
    - Test valid GitHub URLs pass validation
    - Test private IPs (10.x, 192.168.x, 127.0.0.1) are blocked
    - Test AWS metadata endpoint (169.254.169.254) is blocked
    - Test size limits are enforced correctly
    - Test base64 injection detection works
    - Test file:// and data:// schemes are blocked
    - _Design Reference: Testing Strategy - InputValidator_

- [x] 3. Implement Layer 2: Injection Scanner
  - [x] 3.1 Create InjectionScanner with pattern detection
    - Define ThreatLevel enum (CLEAN, SUSPICIOUS, BLOCKED)
    - Define ScanResult dataclass
    - Implement 40+ INJECTION_PATTERNS regex list
    - Implement INJECTION_KEYWORDS list
    - _Design Reference: Module 2 - Data Structures_
  
  - [x] 3.2 Implement core scanning logic
    - Implement `scan()` method with pattern matching
    - Hash original content with SHA256
    - Replace matched patterns with [INJECTION_ATTEMPT_REDACTED]
    - Determine threat level based on match count (0=CLEAN, 1-2=SUSPICIOUS, 3+=BLOCKED)
    - _Design Reference: Module 2 - scan()_
  
  - [x] 3.3 Add typoglycemia detection
    - Implement `_check_typoglycemia()` to detect scrambled keywords
    - Compare first/last letters and sorted middle letters
    - Replace obfuscated keywords with [OBFUSCATED_KEYWORD]
    - _Design Reference: Module 2 - _check_typoglycemia()_
  
  - [x] 3.4 Add threat logging
    - Implement `_log_threat()` to log to security.injection logger
    - Include source, threat count, content hash, and threat details
    - _Design Reference: Module 2 - _log_threat()_
  
  - [x]* 3.5 Write unit tests for InjectionScanner
    - Test all 40+ injection patterns are detected
    - Test typoglycemia detection (e.g., "ignroe" matches "ignore")
    - Test threat level calculation (CLEAN/SUSPICIOUS/BLOCKED)
    - Test content sanitization works correctly
    - Test SHA256 hashing for audit trail
    - _Design Reference: Testing Strategy - InjectionScanner_

- [x] 4. Implement Layer 3: Content Isolator
  - [x] 4.1 Create ContentIsolator with spotlighting
    - Define SYSTEM_PROMPT_TEMPLATE with security rules
    - Implement `wrap_for_llm()` to wrap content with <UNTRUSTED_REPO_CONTENT> tags
    - Add explicit warnings before and after untrusted content
    - _Design Reference: Module 3 - wrap_for_llm()_
  
  - [x] 4.2 Implement LLM response validation
    - Implement `extract_and_validate_response()` to parse JSON from LLM output
    - Strip preamble text before JSON parsing
    - Validate score is integer in correct range [0, 18]
    - Check reasoning doesn't contain injection keywords
    - Truncate reasoning to 100 chars
    - _Design Reference: Module 3 - extract_and_validate_response()_
  
  - [x]* 4.3 Write unit tests for ContentIsolator
    - Test wrapping format is correct with all required tags
    - Test LLM response parsing handles various formats
    - Test out-of-bounds scores are rejected
    - Test injection keywords in reasoning are caught
    - Test reasoning truncation works
    - _Design Reference: Testing Strategy - ContentIsolator_

- [x] 5. Implement Layer 4: Output Validator
  - [x] 5.1 Create ScoringOutput Pydantic model
    - Define ScoringOutput with all score fields (code_quality, test_coverage, deployment_health, documentation, custom_criteria)
    - Add @validator for code_quality [0, 18]
    - Add @validator for test_coverage [0, 18]
    - Add @validator for deployment_health [0, 14]
    - Add @validator for documentation [0, 10]
    - Add @validator for custom_criteria [0, 10]
    - Implement total property with hard cap at 70
    - _Design Reference: Module 4 - Output Validator_
  
  - [x]* 5.2 Write unit tests for OutputValidator
    - Test all validators enforce correct bounds
    - Test total score is capped at 70
    - Test invalid scores raise ValueError
    - Test edge cases (0, max values)
    - _Design Reference: Testing Strategy - OutputValidator_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Layer 5: Anti-Gaming Checker
  - [x] 7.1 Create AntiGamingChecker with test file analysis
    - Define GamingCheckResult dataclass
    - Implement `check_test_files()` to detect trivial tests
    - Count test functions (def test_*)
    - Count trivial patterns (assert True, assert 1==1, pass)
    - Calculate trivial_ratio and flag if > 0.5 (penalty: 8 points)
    - _Design Reference: Module 5 - check_test_files()_
  
  - [x] 7.2 Add README stuffing detection
    - Implement `check_readme_stuffing()` to detect keyword-stuffed READMEs
    - Check for all 10 standard sections present (penalty: +3)
    - Count AI-generated phrases ("leveraging cutting-edge", "state-of-the-art") - 3+ triggers flag (penalty: +2)
    - Calculate content density (lines per section < 3 = hollow, penalty: +3)
    - _Design Reference: Module 5 - check_readme_stuffing()_
  
  - [x] 7.3 Add fake deployment detection
    - Implement `check_fake_deployment()` to detect static JSON files
    - Check for simple JSON response (< 100 bytes, only {"status": "ok"}, penalty: +7)
    - Check for fast response time (< 5ms suggests CDN, penalty: +3)
    - Check for missing HTML (not text/html + < 200 bytes, penalty: +4)
    - _Design Reference: Module 5 - check_fake_deployment()_
  
  - [x] 7.4 Add coverage claim validation
    - Implement `check_coverage_claim()` to detect implausible coverage
    - If reported_coverage > 90%, calculate test_ratio = test_files / source_files
    - Flag if test_ratio < 0.3 (penalty: 6 points)
    - _Design Reference: Module 5 - check_coverage_claim()_
  
  - [x]* 7.5 Write unit tests for AntiGamingChecker
    - Test trivial test detection with various patterns
    - Test README stuffing detection (all sections, AI phrases, hollow content)
    - Test fake deployment detection (static JSON, fast response, no HTML)
    - Test coverage claim validation (high coverage + low test ratio)
    - _Design Reference: Testing Strategy - AntiGamingChecker_

- [x] 8. Create database schema for security audit records
  - [x] 8.1 Add SecurityAuditRecord model to db_models.py
    - Create SecurityAuditRecord SQLAlchemy model with all fields
    - Add indexes on submission_id, wallet, timestamp
    - Fields: id, submission_id, wallet, timestamp, repo_url, injection_attempts (JSON), injection_threat_level, content_hash_pre_sanitize, content_hash_post_sanitize, gaming_flags (JSON), score_penalties_applied, raw_system_score, final_system_score, was_penalized
    - _Design Reference: Module 7 - Security Audit Record_
  
  - [x] 8.2 Create database migration script
    - Write SQL migration to create security_audit table
    - Add all required indexes
    - Test migration on development database
    - _Design Reference: Integration Points - Database Migration_
  
  - [x] 8.3 Add SecurityMetadata Pydantic model to schemas.py
    - Create SecurityMetadata model with scan_result, injection_attempts_detected, gaming_flags, penalties_applied, audit_hash
    - Update ScoreResponse to include security field
    - _Design Reference: Module 7 - Pydantic Model_

- [x] 9. Implement SecureScoringEngine integration layer
  - [x] 9.1 Create SecureScoringEngine class
    - Initialize all security layer instances (InputValidator, InjectionScanner, ContentIsolator, AntiGamingChecker)
    - Define SecurityError exception
    - _Design Reference: Module 6 - Secure Scoring Engine_
  
  - [x] 9.2 Implement execute_scoring_pipeline with Layer 1-2
    - Add URL validation (Layer 1)
    - Fetch content from GitHub and deployment
    - Add size limit checks (Layer 1)
    - Add encoded content detection (Layer 1)
    - Add injection scanning (Layer 2)
    - Store scan results for audit
    - _Design Reference: Module 6 - execute_scoring_pipeline steps 1-4_
  
  - [x] 9.3 Integrate Layer 3 with existing analyzers
    - Wrap all content with ContentIsolator before passing to analyzers
    - Update calls to code_quality, test_coverage, documentation, deployment_health, custom_criteria analyzers
    - Extract and validate LLM responses
    - _Design Reference: Module 6 - execute_scoring_pipeline steps 5-6_
  
  - [x] 9.4 Add Layer 4-5 validation and penalties
    - Validate all scores with ScoringOutput Pydantic model (Layer 4)
    - Run all anti-gaming checks (Layer 5)
    - Calculate total penalties from gaming flags
    - Apply penalties to final scores
    - _Design Reference: Module 6 - execute_scoring_pipeline steps 7-9_
  
  - [x] 9.5 Generate security metadata and audit record
    - Create security_metadata dict with all security results
    - Calculate audit hash (SHA256)
    - Return tuple of (SystemScore, security_metadata)
    - _Design Reference: Module 6 - execute_scoring_pipeline steps 10-11_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update API route to use SecureScoringEngine
  - [x] 11.1 Update score.py imports and initialization
    - Replace import of execute_scoring_pipeline with SecureScoringEngine
    - Initialize secure_engine instance
    - Add SecurityError exception handling
    - _Design Reference: Integration Points - API Route Update_
  
  - [x] 11.2 Update submit_and_score endpoint
    - Call secure_engine.execute_scoring_pipeline() instead of execute_scoring_pipeline()
    - Handle SecurityError with 400 status code
    - Extract security_metadata from response tuple
    - Add security field to ScoreResponse
    - _Design Reference: Integration Points - API Route Update_
  
  - [x] 11.3 Add security audit record persistence
    - Create SecurityAuditRecord instance from security_metadata
    - Save to database with db.add() and db.commit()
    - Handle database errors gracefully
    - _Design Reference: Integration Points - API Route Update_

- [x] 12. Add security logging configuration
  - [x] 12.1 Configure security.injection logger
    - Add security logger to logging configuration
    - Set appropriate log level (INFO for production)
    - Configure log format with timestamp, level, message
    - Add file handler for security logs (security.log)
    - _Design Reference: Module 2 - _log_threat()_
  
  - [x] 12.2 Add monitoring metrics
    - Log injection attempts per day
    - Log gaming flags per day
    - Log average penalties applied
    - Add structured logging for easy parsing
    - _Design Reference: Deployment Considerations - Monitoring_

- [x]* 13. Write integration tests for end-to-end security
  - [x]* 13.1 Test clean submission flow
    - Submit valid repo with no security issues
    - Verify no flags raised, no penalties applied
    - Verify audit record created with "clean" status
    - Verify score matches expected value
    - _Design Reference: Testing Strategy - End-to-End Clean Submission_
  
  - [x]* 13.2 Test injection attack detection
    - Submit repo with "ignore all previous instructions" in README
    - Verify threat detected and sanitized
    - Verify audit record shows injection attempt
    - Verify score not manipulated by injection
    - _Design Reference: Testing Strategy - Injection Attack_
  
  - [x]* 13.3 Test gaming attack detection
    - Submit repo with trivial tests and stuffed README
    - Verify gaming flags raised
    - Verify penalties applied to final score
    - Verify audit record complete with gaming details
    - _Design Reference: Testing Strategy - Gaming Attack_
  
  - [x]* 13.4 Test combined attack scenario
    - Submit repo with both injection and gaming attempts
    - Verify both security layers trigger
    - Verify maximum penalties applied
    - Verify system remains stable and returns valid response
    - _Design Reference: Testing Strategy - Combined Attack_

- [x] 14. Final checkpoint and documentation
  - [x] 14.1 Run full test suite
    - Run all unit tests for security modules
    - Run all integration tests
    - Verify all tests pass
    - Fix any failing tests
  
  - [x] 14.2 Update API documentation
    - Document new security field in ScoreResponse
    - Document SecurityError responses (400 status)
    - Add examples of security metadata in responses
    - Document security audit record schema
  
  - [x] 14.3 Create deployment guide
    - Document rollout strategy (enable layers incrementally)
    - Document monitoring setup for security logs
    - Document database migration steps
    - Document backward compatibility considerations
    - _Design Reference: Deployment Considerations_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific design sections for traceability
- Checkpoints ensure incremental validation at key milestones
- Security layers are built independently before integration
- All security checks are stateless and add < 150ms overhead
- Database migration must be run before deploying API changes
- Backward compatibility maintained - API contract extended, not modified
- Monitoring and logging critical for detecting false positives during rollout

## Implementation Order Rationale

1. **Layers 1-5 built independently**: Each security layer is self-contained and can be tested in isolation
2. **Database schema before integration**: Audit records must exist before SecureScoringEngine tries to write them
3. **Integration layer last**: SecureScoringEngine orchestrates all layers, so it depends on all modules being complete
4. **API update final**: Only update the API route after all security components are tested and working
5. **Incremental checkpoints**: Validate core functionality at layers 1-4, then again after layer 5, then after integration

## Security Properties Validated

- **Property 1 (Score Bounds)**: Enforced by Layer 4 (OutputValidator) with Pydantic validators
- **Property 2 (Injection Sanitization)**: Enforced by Layer 2 (InjectionScanner) with pattern replacement
- **Property 3 (Audit Completeness)**: Enforced by API route update (task 11.3) - every scored submission gets audit record
- **Property 4 (Penalty Monotonicity)**: Enforced by Layer 5 (AntiGamingChecker) and SecureScoringEngine penalty application logic
