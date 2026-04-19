"""
Anti-Gaming Checker - Layer 5 of Anti-Tampering Security

This module provides heuristic detection of metric manipulation:
- Trivial test detection
- README stuffing detection
- Fake deployment detection
- Implausible coverage claim detection
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any

from . import gaming_logger


@dataclass
class GamingCheckResult:
    """
    Result of anti-gaming heuristic checks.
    
    Attributes:
        is_gaming: Whether gaming behavior was detected
        flags: List of gaming flags raised (e.g., "TRIVIAL_TESTS", "README_STUFFING")
        score_penalty: Total penalty points to deduct from score
        details: Additional context about the gaming detection
    """
    is_gaming: bool
    flags: List[str]
    score_penalty: int
    details: Dict[str, Any]


class AntiGamingChecker:
    """
    Heuristic detection of metric manipulation.
    
    This class provides methods to detect common gaming techniques:
    - Trivial test files (assert True, pass statements)
    - README stuffing (keyword-stuffed or AI-generated content)
    - Fake deployments (static JSON files)
    - Implausible coverage claims
    """
    
    # Standard README sections
    STANDARD_README_SECTIONS = [
        "overview",
        "features",
        "installation",
        "usage",
        "api",
        "architecture",
        "testing",
        "deployment",
        "contributing",
        "license",
    ]
    
    # AI-generated phrases that suggest stuffing
    AI_PHRASES = [
        "leveraging cutting-edge",
        "state-of-the-art",
        "revolutionary",
        "groundbreaking",
        "cutting-edge technology",
        "seamless integration",
        "robust solution",
        "scalable architecture",
        "enterprise-grade",
        "industry-leading",
        "best-in-class",
        "next-generation",
        "innovative approach",
        "powerful capabilities",
        "comprehensive solution",
    ]
    
    def check_test_files(self, test_files: List[Dict[str, Any]]) -> GamingCheckResult:
        """
        Detect trivial test files.
        
        Algorithm:
        1. Count total test functions (def test_*)
        2. Count trivial patterns:
           - assert True
           - assert 1 == 1
           - pass
           - def test_x(): pass
        3. Calculate trivial_ratio = trivial_count / total_count
        4. If ratio > 0.5, flag TRIVIAL_TESTS, penalty = 8
        
        Args:
            test_files: List of test file dicts with 'content' key
            
        Returns:
            GamingCheckResult with gaming detection results
        """
        if not test_files:
            return GamingCheckResult(
                is_gaming=False,
                flags=[],
                score_penalty=0,
                details={"test_files_count": 0}
            )
        
        total_test_functions = 0
        trivial_count = 0
        
        for test_file in test_files:
            content = test_file.get("content", "")
            if not content:
                continue
            
            # Count test functions
            test_functions = re.findall(r'def\s+test_\w+\s*\(', content)
            total_test_functions += len(test_functions)
            
            # Count trivial patterns
            trivial_patterns = [
                r'assert\s+True',
                r'assert\s+1\s*==\s*1',
                r'assert\s+True\s*$',
                r'^\s*pass\s*$',
                r'def\s+test_\w+\s*\([^)]*\)\s*:\s*pass',
            ]
            
            for pattern in trivial_patterns:
                matches = re.findall(pattern, content, re.MULTILINE)
                trivial_count += len(matches)
        
        # Calculate trivial ratio
        if total_test_functions == 0:
            trivial_ratio = 0.0
        else:
            trivial_ratio = trivial_count / total_test_functions
        
        # Determine if gaming detected
        is_gaming = trivial_ratio > 0.5
        penalty = 8 if is_gaming else 0
        
        flags = ["TRIVIAL_TESTS"] if is_gaming else []
        
        gaming_logger.warning(
            f"TEST_ANALYSIS test_functions={total_test_functions} "
            f"trivial={trivial_count} ratio={trivial_ratio:.2f} "
            f"gaming={is_gaming}"
        )
        
        return GamingCheckResult(
            is_gaming=is_gaming,
            flags=flags,
            score_penalty=penalty,
            details={
                "test_functions_count": total_test_functions,
                "trivial_count": trivial_count,
                "trivial_ratio": trivial_ratio,
            }
        )
    
    def check_readme_stuffing(self, readme: str) -> GamingCheckResult:
        """
        Detect keyword-stuffed or AI-generated READMEs.
        
        Checks:
        1. Section coverage: if all 10 standard sections present → suspicious
        2. AI phrases: count phrases like "leveraging cutting-edge", 
           "state-of-the-art" (3+ → flag)
        3. Content density: headers vs content lines ratio
           (< 3 lines per section → hollow)
        
        Penalties:
        - All sections: +3
        - AI-generated: +2
        - Hollow: +3
        
        Args:
            readme: README content to check
            
        Returns:
            GamingCheckResult with gaming detection results
        """
        if not readme:
            return GamingCheckResult(
                is_gaming=False,
                flags=[],
                score_penalty=0,
                details={"readme_length": 0}
            )
        
        flags = []
        total_penalty = 0
        details = {
            "readme_length": len(readme),
            "sections_found": 0,
            "ai_phrases_count": 0,
            "content_density": 0.0,
        }
        
        # Check 1: Section coverage
        sections_found = 0
        for section in self.STANDARD_README_SECTIONS:
            if re.search(rf'#\s*{section}', readme, re.IGNORECASE):
                sections_found += 1
        
        details["sections_found"] = sections_found
        
        if sections_found == len(self.STANDARD_README_SECTIONS):
            flags.append("ALL_SECTIONS_PRESENT")
            total_penalty += 3
            gaming_logger.warning("README_STUFFING all standard sections present")
        
        # Check 2: AI-generated phrases
        ai_phrase_count = 0
        for phrase in self.AI_PHRASES:
            if phrase.lower() in readme.lower():
                ai_phrase_count += 1
        
        details["ai_phrases_count"] = ai_phrase_count
        
        if ai_phrase_count >= 3:
            flags.append("AI_GENERATED_PHRASES")
            total_penalty += 2
            gaming_logger.warning(
                f"README_STUFFING ai_phrases={ai_phrase_count}"
            )
        
        # Check 3: Content density (hollow content)
        lines = readme.split('\n')
        header_count = len([l for l in lines if l.strip().startswith('#')])
        content_lines = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
        
        if header_count > 0:
            lines_per_section = content_lines / header_count
            details["content_density"] = lines_per_section
            
            if lines_per_section < 3:
                flags.append("HOLLOW_CONTENT")
                total_penalty += 3
                gaming_logger.warning(
                    f"README_STUFFING hollow_content lines_per_section={lines_per_section:.2f}"
                )
        
        is_gaming = len(flags) > 0
        
        return GamingCheckResult(
            is_gaming=is_gaming,
            flags=flags,
            score_penalty=total_penalty,
            details=details
        )
    
    def check_fake_deployment(self, response_data: Dict[str, Any]) -> GamingCheckResult:
        """
        Detect static JSON files masquerading as apps.
        
        Checks:
        1. Simple JSON: application/json + body < 100 bytes + 
           only {"status": "ok"} → penalty +7
        2. Fast response: < 5ms suggests CDN static file → penalty +3
        3. No HTML: not text/html + body < 200 bytes → penalty +4
        
        Args:
            response_data: Dict with keys:
                - content_type: str (e.g., "application/json")
                - body: str (response body)
                - response_time_ms: int (response time in milliseconds)
                
        Returns:
            GamingCheckResult with gaming detection results
        """
        if not response_data:
            return GamingCheckResult(
                is_gaming=False,
                flags=[],
                score_penalty=0,
                details={}
            )
        
        flags = []
        total_penalty = 0
        details = {}
        
        content_type = response_data.get("content_type", "").lower()
        body = response_data.get("body", "")
        response_time_ms = response_data.get("response_time_ms", 0)
        
        # Check 1: Simple JSON response
        if "application/json" in content_type and len(body) < 100:
            # Check if it's just {"status": "ok"} or similar
            if re.match(r'^\s*\{\s*"status"\s*:\s*"ok"\s*\}\s*$', body):
                flags.append("SIMPLE_JSON_RESPONSE")
                total_penalty += 7
                details["simple_json"] = True
                gaming_logger.warning("FAKE_DEPLOYMENT simple json response")
        
        # Check 2: Fast response time (suggests CDN/static)
        if response_time_ms < 5 and response_time_ms > 0:
            flags.append("FAST_RESPONSE_TIME")
            total_penalty += 3
            details["response_time_ms"] = response_time_ms
            gaming_logger.warning(f"FAKE_DEPLOYMENT fast response {response_time_ms}ms")
        
        # Check 3: No HTML content
        if "text/html" not in content_type and len(body) < 200:
            flags.append("NO_HTML_CONTENT")
            total_penalty += 4
            details["no_html"] = True
            gaming_logger.warning("FAKE_DEPLOYMENT no html content")
        
        is_gaming = len(flags) > 0
        
        return GamingCheckResult(
            is_gaming=is_gaming,
            flags=flags,
            score_penalty=total_penalty,
            details=details
        )
    
    def check_coverage_claim(
        self,
        reported_coverage: float,
        test_files: List[Dict[str, Any]],
        source_files: List[Dict[str, Any]]
    ) -> GamingCheckResult:
        """
        Detect implausible coverage claims.
        
        Algorithm:
        1. If reported_coverage > 90%:
           a. Calculate test_ratio = len(test_files) / len(source_files)
           b. If test_ratio < 0.3, flag COVERAGE_IMPLAUSIBLE, penalty = 6
        
        Args:
            reported_coverage: Reported test coverage percentage (0-100)
            test_files: List of test file dicts
            source_files: List of source file dicts
            
        Returns:
            GamingCheckResult with gaming detection results
        """
        if not test_files or not source_files:
            return GamingCheckResult(
                is_gaming=False,
                flags=[],
                score_penalty=0,
                details={
                    "test_files_count": len(test_files) if test_files else 0,
                    "source_files_count": len(source_files) if source_files else 0,
                }
            )
        
        flags = []
        total_penalty = 0
        
        # Check if coverage claim is implausibly high
        if reported_coverage > 90:
            test_ratio = len(test_files) / len(source_files)
            
            if test_ratio < 0.3:
                flags.append("COVERAGE_IMPLAUSIBLE")
                total_penalty = 6
                gaming_logger.warning(
                    f"COVERAGE_CLAIM reported={reported_coverage}% "
                    f"test_ratio={test_ratio:.2f}"
                )
        
        is_gaming = len(flags) > 0
        
        return GamingCheckResult(
            is_gaming=is_gaming,
            flags=flags,
            score_penalty=total_penalty,
            details={
                "reported_coverage": reported_coverage,
                "test_files_count": len(test_files),
                "source_files_count": len(source_files),
                "test_ratio": len(test_files) / len(source_files) if source_files else 0,
            }
        )


# Export the class
__all__ = ["AntiGamingChecker", "GamingCheckResult"]
