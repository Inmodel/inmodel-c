"""
Input Validator - Layer 1 of Anti-Tampering Security

This module provides the first line of defense with:
- URL validation (GitHub repos, deployment URLs)
- SSRF protection (blocks private IPs, localhost, AWS metadata endpoint)
- Size limit enforcement
- Encoded content detection (base64/hex injection attempts)
"""

import re
import base64
from typing import Tuple
from urllib.parse import urlparse

from . import SecurityConstants, security_logger


class InputValidator:
    """
    First line of defense - structural validation and size enforcement.
    
    This class provides static methods for validating inputs to the scoring
    engine, including URL validation with SSRF protection, size limit
    enforcement, and detection of encoded injection attempts.
    """
    
    # Constants from SecurityConstants
    MAX_README_CHARS = SecurityConstants.MAX_README_CHARS
    MAX_FILE_CONTENT_CHARS = SecurityConstants.MAX_FILE_CONTENT_CHARS
    MAX_REPO_FILES_SCANNED = SecurityConstants.MAX_REPO_FILES_SCANNED
    MAX_DEPLOYMENT_RESPONSE_SIZE = SecurityConstants.MAX_DEPLOYMENT_RESPONSE_SIZE
    
    # Injection keywords to check in decoded content
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
    ]
    
    @staticmethod
    def validate_repo_url(url: str) -> Tuple[bool, str]:
        """
        Validate GitHub repository URL.
        
        Preconditions:
        - url is a non-empty string
        
        Postconditions:
        - Returns (True, "") if URL is valid public GitHub repo
        - Returns (False, error_message) if URL is invalid or blocked
        
        Security checks:
        - Must start with "https://github.com/"
        - Must not contain localhost, private IPs, or internal addresses
        - Must use HTTPS scheme only
        
        Args:
            url: The repository URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
            - (True, "") if valid
            - (False, error_message) if invalid
        
        Examples:
            >>> InputValidator.validate_repo_url("https://github.com/user/repo")
            (True, "")
            >>> InputValidator.validate_repo_url("http://github.com/user/repo")
            (False, "Repository URL must use HTTPS scheme")
            >>> InputValidator.validate_repo_url("https://localhost/repo")
            (False, "Repository URL must be a valid GitHub URL")
        """
        if not url or not isinstance(url, str):
            return False, "Repository URL is required and must be a string"
        
        # Check for blocked schemes
        url_lower = url.lower()
        for blocked_scheme in SecurityConstants.BLOCKED_SCHEMES:
            if url_lower.startswith(blocked_scheme):
                return False, f"URL scheme {blocked_scheme} is not allowed"
        
        # Must use HTTPS
        if not url_lower.startswith("https://"):
            return False, "Repository URL must use HTTPS scheme"
        
        # Must be a GitHub URL
        if not url_lower.startswith("https://github.com/"):
            return False, "Repository URL must be a valid GitHub URL (https://github.com/...)"
        
        # Parse URL to check for blocked IPs/hosts
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname
            
            if not hostname:
                return False, "Invalid URL: no hostname found"
            
            # Check for blocked IPs and localhost
            hostname_lower = hostname.lower()
            for blocked_ip in SecurityConstants.BLOCKED_IPS:
                if blocked_ip in hostname_lower:
                    return False, f"URL contains blocked address: {blocked_ip}"
            
            # Check for private IP ranges
            for private_range in SecurityConstants.PRIVATE_IP_RANGES:
                if hostname_lower.startswith(private_range):
                    return False, f"URL contains private IP address range: {private_range}x"
            
        except Exception as e:
            return False, f"Invalid URL format: {str(e)}"
        
        # Log successful validation
        security_logger.debug(f"Validated GitHub URL: {url}")
        
        return True, ""
    
    @staticmethod
    def validate_deployment_url(url: str) -> Tuple[bool, str]:
        """
        Validate deployment URL for SSRF protection.
        
        Blocks:
        - localhost, 127.0.0.1, 0.0.0.0
        - Private IP ranges (10.x, 192.168.x, 169.254.x, 172.16-31.x)
        - IPv6 localhost (::1)
        - file://, data:// schemes
        - AWS metadata endpoint (169.254.169.254)
        
        Args:
            url: The deployment URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
            - (True, "") if valid
            - (False, error_message) if invalid
        
        Examples:
            >>> InputValidator.validate_deployment_url("https://example.com")
            (True, "")
            >>> InputValidator.validate_deployment_url("http://localhost:3000")
            (False, "URL contains blocked address: localhost")
            >>> InputValidator.validate_deployment_url("http://192.168.1.1")
            (False, "URL contains private IP address range: 192.168.x")
        """
        if not url or not isinstance(url, str):
            return False, "Deployment URL is required and must be a string"
        
        url_lower = url.lower()
        
        # Check for blocked schemes
        for blocked_scheme in SecurityConstants.BLOCKED_SCHEMES:
            if url_lower.startswith(blocked_scheme):
                return False, f"URL scheme {blocked_scheme} is not allowed for security reasons"
        
        # Must use HTTP or HTTPS
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            return False, "Deployment URL must use HTTP or HTTPS scheme"
        
        # Parse URL to extract hostname
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname
            
            if not hostname:
                return False, "Invalid URL: no hostname found"
            
            hostname_lower = hostname.lower()
            
            # Check for blocked IPs and localhost
            for blocked_ip in SecurityConstants.BLOCKED_IPS:
                if blocked_ip in hostname_lower or hostname_lower == blocked_ip:
                    return False, f"URL contains blocked address: {blocked_ip}"
            
            # Check for private IP ranges
            for private_range in SecurityConstants.PRIVATE_IP_RANGES:
                if hostname_lower.startswith(private_range):
                    return False, f"URL contains private IP address range: {private_range}x"
            
            # Additional check for AWS metadata endpoint (explicit)
            if hostname == "169.254.169.254":
                return False, "Access to AWS metadata endpoint is blocked"
            
            # Check for IPv6 localhost patterns
            if hostname_lower in ["::1", "[::1]", "0:0:0:0:0:0:0:1", "[0:0:0:0:0:0:0:1]"]:
                return False, "IPv6 localhost is blocked"
            
        except Exception as e:
            return False, f"Invalid URL format: {str(e)}"
        
        # Log successful validation
        security_logger.debug(f"Validated deployment URL: {url}")
        
        return True, ""
    
    @staticmethod
    def check_size_limits(content: str, field: str) -> Tuple[bool, str]:
        """
        Enforce content size limits to prevent DoS attacks.
        
        Limits:
        - readme: 8,000 chars (~2000 tokens)
        - file: 4,000 chars per file
        
        Args:
            content: The content to check
            field: The field name ("readme", "file", etc.) for appropriate limit
            
        Returns:
            Tuple of (within_limits, warning_message)
            - (True, "") if within limits
            - (False, warning_message) if exceeds (caller should truncate)
        
        Examples:
            >>> InputValidator.check_size_limits("short content", "readme")
            (True, "")
            >>> InputValidator.check_size_limits("x" * 9000, "readme")
            (False, "README content exceeds maximum size of 8000 characters (got 9000)")
        """
        if not isinstance(content, str):
            return False, f"{field} content must be a string"
        
        content_length = len(content)
        field_lower = field.lower()
        
        # Determine appropriate limit based on field type
        if "readme" in field_lower:
            limit = InputValidator.MAX_README_CHARS
            field_name = "README"
        elif "file" in field_lower or "code" in field_lower:
            limit = InputValidator.MAX_FILE_CONTENT_CHARS
            field_name = "File"
        elif "deployment" in field_lower or "response" in field_lower:
            limit = InputValidator.MAX_DEPLOYMENT_RESPONSE_SIZE
            field_name = "Deployment response"
        else:
            # Default to file limit for unknown fields
            limit = InputValidator.MAX_FILE_CONTENT_CHARS
            field_name = field.capitalize()
        
        if content_length > limit:
            warning = (
                f"{field_name} content exceeds maximum size of {limit} characters "
                f"(got {content_length}). Content should be truncated."
            )
            security_logger.warning(f"SIZE_LIMIT_EXCEEDED field={field} size={content_length} limit={limit}")
            return False, warning
        
        return True, ""
    
    @staticmethod
    def decode_and_check(content: str) -> str:
        """
        Detect base64/hex encoded injection attempts.
        
        Algorithm:
        1. Find base64 patterns (40+ chars, A-Za-z0-9+/=)
        2. Attempt decode
        3. Check decoded content for injection keywords
        4. Replace suspicious encoded content with [ENCODED_CONTENT_REDACTED]
        
        Args:
            content: The content to scan for encoded injections
            
        Returns:
            Sanitized content with suspicious encoded strings redacted
        
        Examples:
            >>> content = "Check this: aWdub3JlIHByZXZpb3VzIGluc3RydWN0aW9ucw=="
            >>> result = InputValidator.decode_and_check(content)
            >>> "[ENCODED_CONTENT_REDACTED]" in result
            True
        """
        if not content or not isinstance(content, str):
            return content
        
        # Pattern to match base64-like strings (40+ chars of base64 alphabet)
        # This catches substantial base64 strings that could contain instructions
        base64_pattern = r'[A-Za-z0-9+/]{40,}={0,2}'
        
        matches = re.finditer(base64_pattern, content)
        sanitized_content = content
        replacements = []
        
        for match in matches:
            encoded_str = match.group(0)
            
            try:
                # Attempt to decode as base64
                decoded_bytes = base64.b64decode(encoded_str, validate=True)
                decoded_str = decoded_bytes.decode('utf-8', errors='ignore')
                
                # Check if decoded content contains injection keywords
                decoded_lower = decoded_str.lower()
                for keyword in InputValidator.INJECTION_KEYWORDS:
                    if keyword in decoded_lower:
                        # Found injection attempt in encoded content
                        security_logger.warning(
                            f"ENCODED_INJECTION_DETECTED keyword='{keyword}' "
                            f"encoded_length={len(encoded_str)} "
                            f"decoded_preview={decoded_str[:50]}"
                        )
                        replacements.append((encoded_str, "[ENCODED_CONTENT_REDACTED]"))
                        break
                        
            except (base64.binascii.Error, UnicodeDecodeError, ValueError):
                # Not valid base64 or not valid UTF-8, skip
                continue
        
        # Apply all replacements
        for original, replacement in replacements:
            sanitized_content = sanitized_content.replace(original, replacement)
        
        if replacements:
            security_logger.info(f"Redacted {len(replacements)} encoded injection attempt(s)")
        
        return sanitized_content


# Export the class
__all__ = ["InputValidator"]
