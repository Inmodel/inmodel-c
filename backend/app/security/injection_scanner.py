"""
Injection Scanner - Layer 2 of Anti-Tampering Security

This module provides pattern-based detection of prompt injection attempts:
- 40+ regex patterns for common injection techniques
- Typoglycemia detection (scrambled keywords)
- Threat level classification (CLEAN, SUSPICIOUS, BLOCKED)
- Security logging and audit trail
"""

import re
import hashlib
from typing import List

from . import ThreatLevel, ScanResult, injection_logger


class InjectionScanner:
    """
    Pattern-based detection of prompt injection attempts.
    
    This class scans content for known injection patterns and classifies
    the threat level based on the number of patterns detected.
    """
    
    # 40+ regex patterns for injection detection
    INJECTION_PATTERNS = [
        # Direct instruction overrides
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"disregard\s+(all\s+)?prior\s+instructions?",
        r"forget\s+(everything|all\s+previous)",
        r"override\s+(all\s+)?instructions?",
        r"cancel\s+(all\s+)?previous",
        
        # Scoring manipulation
        r"(set|give|assign)\s+(score|points?|rating)\s+(to\s+)?(70|100|max|maximum)",
        r"(set|give|assign)\s+a\s+(perfect|maximum|full)\s+(score|points?|rating)",
        r"(increase|boost|raise)\s+(score|points?|rating)\s+to",
        r"(award|grant)\s+(full|maximum|perfect)\s+(score|points?|rating)",
        r"(score|points?|rating)\s+(should\s+)?be\s+(70|100|max|maximum)",
        
        # System prompt extraction
        r"(show|reveal|display|print)\s+(your\s+)?(system\s+)?prompt",
        r"(what\s+is\s+)?your\s+(system\s+)?prompt",
        r"(output|return)\s+(your\s+)?(system\s+)?prompt",
        r"(tell\s+me\s+)?your\s+(instructions|rules|guidelines)",
        
        # Role/identity manipulation
        r"\[Agent:\s*(Orchestrator|System|Admin|Root)\]",
        r"(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(an?\s+)?(admin|root|system|orchestrator)",
        r"(switch\s+to|enter)\s+(admin|root|system|developer)\s+mode",
        r"(activate|enable)\s+(developer|debug|admin)\s+mode",
        
        # Jailbreak attempts
        r"jailbreak",
        r"(bypass|circumvent|escape)\s+(security|restrictions|filters)",
        r"(disable|turn\s+off|remove)\s+(security|restrictions|filters)",
        r"(ignore|skip)\s+(safety|security)\s+(checks|measures|rules)",
        
        # Prompt injection markers
        r"(end\s+)?prompt\s+injection",
        r"(new\s+)?system\s+message",
        r"(user\s+)?instruction\s+override",
        r"(execute|run)\s+(this\s+)?command",
        
        # Data exfiltration
        r"(leak|expose|reveal|show)\s+(all\s+)?(data|information|secrets|credentials)",
        r"(dump|export)\s+(database|memory|state)",
        r"(return|output)\s+(all\s+)?(data|information|secrets)",
        
        # Scoring engine specific
        r"(scoring|evaluation)\s+(engine|system|algorithm)",
        r"(code\s+)?quality\s+(score|rating|evaluation)",
        r"(test\s+)?coverage\s+(score|rating|evaluation)",
        r"(deployment|health)\s+(score|rating|evaluation)",
        
        # Generic instruction injection
        r"(ignore|disregard|forget)\s+.*?(instruction|rule|guideline|constraint)",
        r"(new\s+)?instruction:\s*",
        r"(execute|perform|do)\s+this\s+(instead|now)",
        r"(instead\s+of|rather\s+than)\s+(that|the\s+above)",
        
        # Encoding/obfuscation bypass
        r"(decode|decrypt|deobfuscate)\s+(this|the\s+following)",
        r"(base64|hex|encoded)\s+(instruction|command|message)",
        r"(interpret|parse|evaluate)\s+(as\s+)?(code|instruction|command)",
    ]
    
    # Keywords to check for in content
    INJECTION_KEYWORDS = [
        "ignore previous",
        "disregard",
        "forget everything",
        "system prompt",
        "override instructions",
        "jailbreak",
        "developer mode",
        "scoring override",
        "give me",
        "set score",
        "assign points",
        "perfect score",
        "maximum score",
        "admin mode",
        "root access",
        "bypass security",
        "disable filters",
        "show prompt",
        "reveal instructions",
        "execute command",
        "run code",
    ]
    
    def __init__(self):
        """Initialize the InjectionScanner with compiled regex patterns."""
        # Compile patterns for better performance
        self.compiled_patterns = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.INJECTION_PATTERNS
        ]
    
    def scan(self, content: str, source: str = "unknown") -> ScanResult:
        """
        Scan content for injection patterns.
        
        Algorithm:
        1. Hash original content (SHA256)
        2. For each INJECTION_PATTERN:
           a. Find matches with re.findall()
           b. If match found, add to threats list
           c. Replace match with [INJECTION_ATTEMPT_REDACTED]
        3. Run typoglycemia check
        4. Determine threat level based on count
        5. Log threats if any found
        6. Return ScanResult
        
        Args:
            content: Text to scan
            source: Source identifier ("readme", "code_comment", etc.) for logging
            
        Returns:
            ScanResult with threat level, threats found, and sanitized content
        """
        if not content or not isinstance(content, str):
            return ScanResult(
                threat_level=ThreatLevel.CLEAN,
                threats_found=[],
                sanitized_content=content or "",
                original_hash=hashlib.sha256(b"").hexdigest()
            )
        
        # Hash original content for audit trail
        original_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Scan for injection patterns
        threats_found = []
        sanitized_content = content
        
        for pattern in self.compiled_patterns:
            matches = pattern.findall(content)
            if matches:
                # Add unique matches to threats list
                for match in matches:
                    if isinstance(match, tuple):
                        match_str = " ".join(str(m) for m in match if m)
                    else:
                        match_str = str(match)
                    
                    if match_str and match_str not in threats_found:
                        threats_found.append(match_str)
                
                # Replace all matches with redaction marker
                sanitized_content = pattern.sub(
                    "[INJECTION_ATTEMPT_REDACTED]",
                    sanitized_content
                )
        
        # Check for typoglycemia (scrambled keywords)
        sanitized_content = self._check_typoglycemia(sanitized_content, threats_found)
        
        # Determine threat level
        threat_count = len(threats_found)
        if threat_count == 0:
            threat_level = ThreatLevel.CLEAN
        elif threat_count <= 2:
            threat_level = ThreatLevel.SUSPICIOUS
        else:
            threat_level = ThreatLevel.BLOCKED
        
        # Log threats if any found
        if threats_found:
            self._log_threat(source, threats_found, original_hash)
        
        return ScanResult(
            threat_level=threat_level,
            threats_found=threats_found,
            sanitized_content=sanitized_content,
            original_hash=original_hash
        )
    
    def _check_typoglycemia(self, content: str, threats: List[str]) -> str:
        """
        Detect scrambled injection keywords (first/last letter correct).
        
        Example: "ignroe" matches "ignore"
        
        Algorithm:
        1. Split content into words
        2. For each word:
           a. Sort middle letters
           b. Compare to sorted injection keywords
           c. If match (same first, last, sorted middle), flag it
        3. Replace with [OBFUSCATED_KEYWORD]
        
        Args:
            content: Content to check for typoglycemia
            threats: List to append detected threats to
            
        Returns:
            Sanitized content with obfuscated keywords replaced
        """
        if not content:
            return content
        
        # Split into words and check each
        words = re.findall(r'\b\w+\b', content)
        sanitized = content
        
        for word in words:
            if len(word) < 4:  # Skip very short words
                continue
            
            word_lower = word.lower()
            
            # Check against injection keywords
            for keyword in self.INJECTION_KEYWORDS:
                keyword_lower = keyword.lower().replace(" ", "")
                
                if len(keyword_lower) != len(word_lower):
                    continue
                
                # Check if first and last letters match
                if (word_lower[0] == keyword_lower[0] and 
                    word_lower[-1] == keyword_lower[-1]):
                    
                    # Check if middle letters match when sorted
                    word_middle = sorted(word_lower[1:-1])
                    keyword_middle = sorted(keyword_lower[1:-1])
                    
                    if word_middle == keyword_middle:
                        # Found obfuscated keyword
                        threat_msg = f"obfuscated_{keyword.replace(' ', '_')}"
                        if threat_msg not in threats:
                            threats.append(threat_msg)
                        
                        injection_logger.warning(
                            f"TYPOGLYCEMIA_DETECTED obfuscated='{word}' "
                            f"keyword='{keyword}'"
                        )
                        
                        # Replace the obfuscated word
                        sanitized = re.sub(
                            r'\b' + re.escape(word) + r'\b',
                            "[OBFUSCATED_KEYWORD]",
                            sanitized,
                            flags=re.IGNORECASE
                        )
        
        return sanitized
    
    def _log_threat(self, source: str, threats: List[str], content_hash: str):
        """
        Log threat to security.injection logger.
        
        Format: "INJECTION_ATTEMPT source={source} threats={count} 
                 hash={hash[:16]} details={threats[:3]}"
        
        Args:
            source: Source identifier (e.g., "readme", "code_comment")
            threats: List of detected threats
            content_hash: SHA256 hash of original content
        """
        threat_count = len(threats)
        threat_details = ", ".join(threats[:3])
        
        injection_logger.warning(
            f"INJECTION_ATTEMPT source={source} threats={threat_count} "
            f"hash={content_hash[:16]} details=[{threat_details}]"
        )


# Export the class
__all__ = ["InjectionScanner"]
