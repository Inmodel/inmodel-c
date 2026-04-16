"""
Security module for JudgeChain anti-tampering layer.

This module provides a 5-layer defense-in-depth security architecture:
- Layer 1: Input Validator (URL validation, size limits, encoded content detection)
- Layer 2: Injection Scanner (pattern-based prompt injection detection)
- Layer 3: Content Isolator (spotlighting technique for LLM safety)
- Layer 4: Output Validator (strict bounds checking with Pydantic)
- Layer 5: Anti-Gaming Checker (heuristic detection of metric manipulation)
"""

import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional


# ============================================================================
# Exception Classes
# ============================================================================

class SecurityError(Exception):
    """
    Raised when security validation fails.
    
    This exception is raised by security layers when:
    - URL validation fails (private IPs, invalid schemes)
    - Content size limits are exceeded
    - Threat level reaches BLOCKED status
    - Other security constraints are violated
    """
    pass


# ============================================================================
# Shared Data Structures
# ============================================================================

class ThreatLevel(Enum):
    """
    Threat level classification for injection detection.
    
    - CLEAN: No injection patterns detected
    - SUSPICIOUS: 1-2 injection patterns detected (logged but allowed)
    - BLOCKED: 3+ injection patterns detected (submission rejected)
    """
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


@dataclass
class ScanResult:
    """
    Result of injection scanning operation.
    
    Attributes:
        threat_level: Classification of threat severity
        threats_found: List of detected injection patterns/keywords
        sanitized_content: Content with injection attempts redacted
        original_hash: SHA256 hash of original content for audit trail
    """
    threat_level: ThreatLevel
    threats_found: list[str]
    sanitized_content: str
    original_hash: str


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
    flags: list[str]
    score_penalty: int
    details: dict


# ============================================================================
# Security Constants
# ============================================================================

class SecurityConstants:
    """
    Shared constants for security validation.
    
    Size Limits:
    - MAX_README_CHARS: 8,000 chars (~2000 tokens)
    - MAX_FILE_CONTENT_CHARS: 4,000 chars per file
    - MAX_REPO_FILES_SCANNED: 50 files maximum
    - MAX_DEPLOYMENT_RESPONSE_SIZE: 10,000 bytes
    
    Blocked Endpoints:
    - AWS metadata endpoint (169.254.169.254)
    - Private IP ranges (10.x, 192.168.x, 172.16-31.x)
    - Localhost addresses (127.x, ::1)
    """
    
    # Size limits
    MAX_README_CHARS = 8_000
    MAX_FILE_CONTENT_CHARS = 4_000
    MAX_REPO_FILES_SCANNED = 50
    MAX_DEPLOYMENT_RESPONSE_SIZE = 10_000
    
    # Blocked IP addresses and ranges
    BLOCKED_IPS = [
        "127.0.0.1",
        "0.0.0.0",
        "localhost",
        "169.254.169.254",  # AWS metadata endpoint
        "::1",  # IPv6 localhost
    ]
    
    # Private IP ranges (CIDR notation)
    PRIVATE_IP_RANGES = [
        "10.",          # 10.0.0.0/8
        "192.168.",     # 192.168.0.0/16
        "172.16.",      # 172.16.0.0/12 (partial)
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
        "169.254.",     # Link-local addresses
    ]
    
    # Blocked URL schemes
    BLOCKED_SCHEMES = ["file://", "data://", "ftp://"]
    
    # Allowed URL schemes
    ALLOWED_SCHEMES = ["https://"]


# ============================================================================
# Logger Configuration
# ============================================================================

def setup_security_logger(name: str = "security") -> logging.Logger:
    """
    Configure security-specific logger.
    
    Creates a logger with:
    - INFO level for production
    - Structured format with timestamp, level, and message
    - Separate file handler for security events (security.log)
    
    Args:
        name: Logger name (default: "security")
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Format: timestamp - level - message
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        logger.propagate = False
    
    return logger


# Create security loggers
security_logger = setup_security_logger("security")
injection_logger = setup_security_logger("security.injection")
gaming_logger = setup_security_logger("security.gaming")


# ============================================================================
# Exports
# ============================================================================

__all__ = [
    # Exceptions
    "SecurityError",
    
    # Data structures
    "ThreatLevel",
    "ScanResult",
    "GamingCheckResult",
    
    # Constants
    "SecurityConstants",
    
    # Loggers
    "security_logger",
    "injection_logger",
    "gaming_logger",
    "setup_security_logger",
]
