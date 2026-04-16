"""
Secure Scoring Engine - Integration Layer

This module orchestrates all 5 security layers:
- Layer 1: Input Validator (URL validation, size limits, encoded content)
- Layer 2: Injection Scanner (pattern-based injection detection)
- Layer 3: Content Isolator (spotlighting for LLM safety)
- Layer 4: Output Validator (strict bounds checking)
- Layer 5: Anti-Gaming Checker (heuristic gaming detection)
"""

import hashlib
import time
from typing import Tuple, Dict, Any, Optional

from app.security import SecurityError
from app.security.input_validator import InputValidator
from app.security.injection_scanner import InjectionScanner
from app.security.content_isolator import ContentIsolator
from app.security.output_validator import ScoringOutput
from app.security.anti_gaming import AntiGamingChecker
from app.models.schemas import SubmissionInput, SystemScore, SecurityMetadata


class SecureScoringEngine:
    """
    Drop-in replacement for execute_scoring_pipeline() with security layers.
    
    Maintains same interface as existing engine while adding comprehensive
    security checks at each stage of the scoring pipeline.
    """
    
    def __init__(self):
        """Initialize the SecureScoringEngine with all security layer instances."""
        self.validator = InputValidator()
        self.scanner = InjectionScanner()
        self.isolator = ContentIsolator()
        self.anti_gaming = AntiGamingChecker()
    
    async def execute_scoring_pipeline(
        self,
        submission: SubmissionInput,
        readme_content: str = "",
        code_files: Dict[str, str] = None,
        test_files: Dict[str, str] = None,
        deployment_response: Dict[str, Any] = None,
        raw_scores: Dict[str, int] = None,
    ) -> Tuple[SystemScore, SecurityMetadata]:
        """
        Execute secure scoring pipeline with all 5 security layers.
        
        Algorithm:
        1. LAYER 1: Validate URLs and size limits
        2. Fetch content from GitHub/deployment
        3. LAYER 1: Decode and check for encoded injections
        4. LAYER 2: Scan all content for injection patterns
        5. LAYER 3: Wrap content with spotlighting markers
        6. Run existing analyzers with wrapped content
        7. LAYER 4: Validate output scores with Pydantic
        8. LAYER 5: Run anti-gaming checks
        9. Apply penalties to scores
        10. Generate security audit record
        11. Return (SystemScore, security_metadata)
        
        Args:
            submission: SubmissionInput from API
            readme_content: README content from repository
            code_files: Dict of code file paths to content
            test_files: Dict of test file paths to content
            deployment_response: Dict with deployment response data
            raw_scores: Dict with raw scores from analyzers
            
        Returns:
            Tuple of (SystemScore, SecurityMetadata)
            
        Raises:
            SecurityError: If URL validation fails or threat level is BLOCKED
        """
        if code_files is None:
            code_files = {}
        if test_files is None:
            test_files = {}
        if deployment_response is None:
            deployment_response = {}
        if raw_scores is None:
            raw_scores = {
                "code_quality": 0,
                "test_coverage": 0,
                "deployment_health": 0,
                "documentation": 0,
                "custom_criteria": 0,
            }
        
        # Initialize security metadata
        injection_attempts = []
        injection_threat_level = "clean"
        content_hash_pre = ""
        content_hash_post = ""
        gaming_flags = []
        total_penalties = 0
        
        # =====================================================================
        # LAYER 1: Input Validation
        # =====================================================================
        
        # Validate repository URL
        is_valid, error = self.validator.validate_repo_url(submission.repo_url)
        if not is_valid:
            raise SecurityError(f"Invalid repository URL: {error}")
        
        # Validate deployment URL
        is_valid, error = self.validator.validate_deployment_url(submission.deployment_url)
        if not is_valid:
            raise SecurityError(f"Invalid deployment URL: {error}")
        
        # Check size limits
        is_valid, warning = self.validator.check_size_limits(readme_content, "readme")
        if not is_valid:
            readme_content = readme_content[:self.validator.MAX_README_CHARS]
        
        for filename, content in code_files.items():
            is_valid, warning = self.validator.check_size_limits(content, "file")
            if not is_valid:
                code_files[filename] = content[:self.validator.MAX_FILE_CONTENT_CHARS]
        
        # Decode and check for encoded injections
        readme_content = self.validator.decode_and_check(readme_content)
        for filename in code_files:
            code_files[filename] = self.validator.decode_and_check(code_files[filename])
        
        # =====================================================================
        # LAYER 2: Injection Scanner
        # =====================================================================
        
        # Scan README for injections
        readme_scan = self.scanner.scan(readme_content, source="readme")
        injection_attempts.extend(readme_scan.threats_found)
        injection_threat_level = readme_scan.threat_level.value
        content_hash_pre = readme_scan.original_hash
        content_hash_post = hashlib.sha256(readme_scan.sanitized_content.encode()).hexdigest()
        
        # Sanitize README
        readme_content = readme_scan.sanitized_content
        
        # Scan code files for injections
        for filename, content in code_files.items():
            code_scan = self.scanner.scan(content, source=f"code:{filename}")
            injection_attempts.extend(code_scan.threats_found)
            
            # Update threat level to highest found
            if code_scan.threat_level.value == "blocked":
                injection_threat_level = "blocked"
            elif code_scan.threat_level.value == "suspicious" and injection_threat_level != "blocked":
                injection_threat_level = "suspicious"
            
            # Sanitize code
            code_files[filename] = code_scan.sanitized_content
        
        # Check if threat level is BLOCKED
        if injection_threat_level == "blocked":
            raise SecurityError(
                f"Submission blocked due to injection attempts: {injection_attempts[:3]}"
            )
        
        # =====================================================================
        # LAYER 3: Content Isolation (Spotlighting)
        # =====================================================================
        
        # Wrap content for LLM with security markers
        wrapped_readme = self.isolator.wrap_for_llm(readme_content, "readme")
        wrapped_code = self.isolator.wrap_for_llm(
            "\n".join(code_files.values()),
            "code"
        )
        
        # Note: In a real implementation, we would pass wrapped_readme and wrapped_code
        # to the existing analyzers. For now, we'll use the raw scores provided.
        
        # =====================================================================
        # LAYER 4: Output Validation
        # =====================================================================
        
        # Validate scores with Pydantic model
        try:
            validated_scores = ScoringOutput(
                code_quality=raw_scores.get("code_quality", 0),
                test_coverage=raw_scores.get("test_coverage", 0),
                deployment_health=raw_scores.get("deployment_health", 0),
                documentation=raw_scores.get("documentation", 0),
                custom_criteria=raw_scores.get("custom_criteria", 0),
            )
        except ValueError as e:
            raise SecurityError(f"Score validation failed: {str(e)}")
        
        # =====================================================================
        # LAYER 5: Anti-Gaming Checks
        # =====================================================================
        
        # Convert test_files dict to list format for anti-gaming checker
        test_files_list = [
            {"content": content}
            for content in test_files.values()
        ]
        
        # Convert code_files dict to list format
        code_files_list = [
            {"content": content}
            for content in code_files.values()
        ]
        
        # Check for trivial tests
        test_check = self.anti_gaming.check_test_files(test_files_list)
        if test_check.is_gaming:
            gaming_flags.extend(test_check.flags)
            total_penalties += test_check.score_penalty
        
        # Check for README stuffing
        readme_check = self.anti_gaming.check_readme_stuffing(readme_content)
        if readme_check.is_gaming:
            gaming_flags.extend(readme_check.flags)
            total_penalties += readme_check.score_penalty
        
        # Check for fake deployment
        deployment_check = self.anti_gaming.check_fake_deployment(deployment_response)
        if deployment_check.is_gaming:
            gaming_flags.extend(deployment_check.flags)
            total_penalties += deployment_check.score_penalty
        
        # Check for implausible coverage claims
        coverage_check = self.anti_gaming.check_coverage_claim(
            submission.reported_test_coverage_percent,
            test_files_list,
            code_files_list
        )
        if coverage_check.is_gaming:
            gaming_flags.extend(coverage_check.flags)
            total_penalties += coverage_check.score_penalty
        
        # =====================================================================
        # Apply Penalties and Generate Final Scores
        # =====================================================================
        
        # Store raw scores before penalties
        raw_system_score = validated_scores.total
        
        # Apply penalties to individual scores
        final_code_quality = max(0, validated_scores.code_quality - (total_penalties // 5))
        final_test_coverage = max(0, validated_scores.test_coverage - (total_penalties // 5))
        final_deployment_health = max(0, validated_scores.deployment_health - (total_penalties // 5))
        final_documentation = max(0, validated_scores.documentation - (total_penalties // 5))
        final_custom_criteria = max(0, validated_scores.custom_criteria - (total_penalties // 5))
        
        # Recalculate total with penalties
        final_total = min(
            final_code_quality + final_test_coverage + final_deployment_health +
            final_documentation + final_custom_criteria,
            70
        )
        
        # =====================================================================
        # Generate Security Metadata and Audit Record
        # =====================================================================
        
        # Create audit hash
        audit_data = f"{submission.submission_id}:{injection_threat_level}:{len(gaming_flags)}"
        audit_hash = hashlib.sha256(audit_data.encode()).hexdigest()[:16]
        
        # Create security metadata
        security_metadata = SecurityMetadata(
            scan_result=injection_threat_level,
            injection_attempts_detected=len(injection_attempts),
            gaming_flags=gaming_flags,
            penalties_applied=total_penalties,
            audit_hash=audit_hash
        )
        
        # Create final system score
        final_system_score = SystemScore(
            code_quality=final_code_quality,
            test_coverage=final_test_coverage,
            deployment_health=final_deployment_health,
            documentation=final_documentation,
            custom_criteria=final_custom_criteria,
            total=final_total
        )
        
        return final_system_score, security_metadata


# Export the class
__all__ = ["SecureScoringEngine"]
