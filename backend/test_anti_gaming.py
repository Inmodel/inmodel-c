"""
Unit tests for AntiGamingChecker - Layer 5 Security
"""

import pytest
from app.security.anti_gaming import AntiGamingChecker


class TestAntiGamingChecker:
    """Tests for AntiGamingChecker class"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.checker = AntiGamingChecker()
    
    # =========================================================================
    # Tests for check_test_files
    # =========================================================================
    
    def test_check_test_files_no_files(self):
        """Test with no test files"""
        result = self.checker.check_test_files([])
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
        assert len(result.flags) == 0
    
    def test_check_test_files_legitimate_tests(self):
        """Test with legitimate test files"""
        test_files = [
            {
                "content": """
def test_addition():
    assert 2 + 2 == 4

def test_subtraction():
    assert 5 - 3 == 2

def test_multiplication():
    assert 3 * 4 == 12
                """
            }
        ]
        
        result = self.checker.check_test_files(test_files)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_test_files_trivial_tests(self):
        """Test with trivial test files"""
        test_files = [
            {
                "content": """
def test_one():
    assert True

def test_two():
    assert True

def test_three():
    assert 1 == 1

def test_four():
    pass
                """
            }
        ]
        
        result = self.checker.check_test_files(test_files)
        
        assert result.is_gaming is True
        assert "TRIVIAL_TESTS" in result.flags
        assert result.score_penalty == 8
    
    def test_check_test_files_mixed_tests(self):
        """Test with mix of legitimate and trivial tests"""
        test_files = [
            {
                "content": """
def test_real():
    assert 2 + 2 == 4

def test_trivial():
    assert True

def test_another_real():
    assert len([1, 2, 3]) == 3

def test_trivial2():
    pass
                """
            }
        ]
        
        result = self.checker.check_test_files(test_files)
        
        # 50% trivial, should not trigger (threshold is > 0.5)
        assert result.is_gaming is False
    
    def test_check_test_files_empty_content(self):
        """Test with empty file content"""
        test_files = [{"content": ""}]
        
        result = self.checker.check_test_files(test_files)
        
        assert result.is_gaming is False
    
    # =========================================================================
    # Tests for check_readme_stuffing
    # =========================================================================
    
    def test_check_readme_stuffing_clean(self):
        """Test with clean README"""
        readme = """
# My Project

This is a normal README with reasonable content.

## Features

- Feature 1
- Feature 2

## Installation

pip install myproject

## Usage

import myproject
        """
        
        result = self.checker.check_readme_stuffing(readme)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_readme_stuffing_all_sections(self):
        """Test with all standard sections present"""
        sections = [
            "# Overview",
            "## Features",
            "## Installation",
            "## Usage",
            "## API",
            "## Architecture",
            "## Testing",
            "## Deployment",
            "## Contributing",
            "## License",
        ]
        
        readme = "\n\n".join(sections)
        result = self.checker.check_readme_stuffing(readme)
        
        assert result.is_gaming is True
        assert "ALL_SECTIONS_PRESENT" in result.flags
        assert result.score_penalty >= 3
    
    def test_check_readme_stuffing_ai_phrases(self):
        """Test with AI-generated phrases"""
        readme = """
# Project

This is a leveraging cutting-edge solution that provides state-of-the-art capabilities.
We offer a revolutionary approach with groundbreaking technology.
Our cutting-edge technology provides seamless integration.
        """
        
        result = self.checker.check_readme_stuffing(readme)
        
        assert result.is_gaming is True
        assert "AI_GENERATED_PHRASES" in result.flags
        assert result.score_penalty >= 2
    
    def test_check_readme_stuffing_hollow_content(self):
        """Test with hollow content (many headers, few lines)"""
        readme = """
# Section 1
# Section 2
# Section 3
# Section 4
# Section 5
# Section 6
# Section 7
# Section 8
# Section 9
# Section 10
        """
        
        result = self.checker.check_readme_stuffing(readme)
        
        assert result.is_gaming is True
        assert "HOLLOW_CONTENT" in result.flags
        assert result.score_penalty >= 3
    
    def test_check_readme_stuffing_empty(self):
        """Test with empty README"""
        result = self.checker.check_readme_stuffing("")
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    # =========================================================================
    # Tests for check_fake_deployment
    # =========================================================================
    
    def test_check_fake_deployment_legitimate(self):
        """Test with legitimate deployment response"""
        response_data = {
            "content_type": "text/html",
            "body": "<html><body>Hello World</body></html>",
            "response_time_ms": 100,
        }
        
        result = self.checker.check_fake_deployment(response_data)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_fake_deployment_simple_json(self):
        """Test with simple JSON response"""
        response_data = {
            "content_type": "application/json",
            "body": '{"status": "ok"}',
            "response_time_ms": 50,
        }
        
        result = self.checker.check_fake_deployment(response_data)
        
        assert result.is_gaming is True
        assert "SIMPLE_JSON_RESPONSE" in result.flags
        assert result.score_penalty >= 7
    
    def test_check_fake_deployment_fast_response(self):
        """Test with very fast response time"""
        response_data = {
            "content_type": "text/html",
            "body": "<html>test</html>",
            "response_time_ms": 2,
        }
        
        result = self.checker.check_fake_deployment(response_data)
        
        assert result.is_gaming is True
        assert "FAST_RESPONSE_TIME" in result.flags
        assert result.score_penalty >= 3
    
    def test_check_fake_deployment_no_html(self):
        """Test with no HTML content"""
        response_data = {
            "content_type": "application/json",
            "body": '{"data": "test"}',
            "response_time_ms": 100,
        }
        
        result = self.checker.check_fake_deployment(response_data)
        
        assert result.is_gaming is True
        assert "NO_HTML_CONTENT" in result.flags
        assert result.score_penalty >= 4
    
    def test_check_fake_deployment_empty(self):
        """Test with empty response data"""
        result = self.checker.check_fake_deployment({})
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_fake_deployment_none(self):
        """Test with None response data"""
        result = self.checker.check_fake_deployment(None)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    # =========================================================================
    # Tests for check_coverage_claim
    # =========================================================================
    
    def test_check_coverage_claim_legitimate(self):
        """Test with legitimate coverage claim"""
        test_files = [
            {"content": "def test_1(): pass"},
            {"content": "def test_2(): pass"},
            {"content": "def test_3(): pass"},
        ]
        source_files = [
            {"content": "def func_1(): pass"},
            {"content": "def func_2(): pass"},
            {"content": "def func_3(): pass"},
        ]
        
        result = self.checker.check_coverage_claim(85.0, test_files, source_files)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_coverage_claim_implausible(self):
        """Test with implausible coverage claim"""
        test_files = [
            {"content": "def test_1(): pass"},
        ]
        source_files = [
            {"content": "def func_1(): pass"},
            {"content": "def func_2(): pass"},
            {"content": "def func_3(): pass"},
            {"content": "def func_4(): pass"},
            {"content": "def func_5(): pass"},
        ]
        
        result = self.checker.check_coverage_claim(95.0, test_files, source_files)
        
        assert result.is_gaming is True
        assert "COVERAGE_IMPLAUSIBLE" in result.flags
        assert result.score_penalty == 6
    
    def test_check_coverage_claim_low_coverage(self):
        """Test with low coverage claim (should not flag)"""
        test_files = [
            {"content": "def test_1(): pass"},
        ]
        source_files = [
            {"content": "def func_1(): pass"},
            {"content": "def func_2(): pass"},
            {"content": "def func_3(): pass"},
        ]
        
        result = self.checker.check_coverage_claim(50.0, test_files, source_files)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_coverage_claim_no_files(self):
        """Test with no files"""
        result = self.checker.check_coverage_claim(95.0, [], [])
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    def test_check_coverage_claim_high_test_ratio(self):
        """Test with high test-to-source ratio (legitimate)"""
        test_files = [
            {"content": "def test_1(): pass"},
            {"content": "def test_2(): pass"},
            {"content": "def test_3(): pass"},
        ]
        source_files = [
            {"content": "def func_1(): pass"},
            {"content": "def func_2(): pass"},
        ]
        
        # test_ratio = 3/2 = 1.5 (> 0.3, so legitimate)
        result = self.checker.check_coverage_claim(95.0, test_files, source_files)
        
        assert result.is_gaming is False
        assert result.score_penalty == 0
    
    # =========================================================================
    # Integration tests
    # =========================================================================
    
    def test_multiple_gaming_flags(self):
        """Test detection of multiple gaming flags"""
        # Trivial tests
        test_files = [
            {
                "content": """
def test_1():
    assert True

def test_2():
    assert True
                """
            }
        ]
        
        # Stuffed README
        readme = """
# Overview
## Features
## Installation
## Usage
## API
## Architecture
## Testing
## Deployment
## Contributing
## License
        """
        
        test_result = self.checker.check_test_files(test_files)
        readme_result = self.checker.check_readme_stuffing(readme)
        
        assert test_result.is_gaming is True
        assert readme_result.is_gaming is True
        assert len(test_result.flags) > 0
        assert len(readme_result.flags) > 0
    
    def test_gaming_check_result_structure(self):
        """Test that GamingCheckResult has correct structure"""
        result = self.checker.check_test_files([])
        
        assert hasattr(result, "is_gaming")
        assert hasattr(result, "flags")
        assert hasattr(result, "score_penalty")
        assert hasattr(result, "details")
        
        assert isinstance(result.is_gaming, bool)
        assert isinstance(result.flags, list)
        assert isinstance(result.score_penalty, int)
        assert isinstance(result.details, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
