"""
Output Validator - Layer 4 of Anti-Tampering Security

This module provides strict bounds checking on all scoring dimensions:
- Pydantic-based validation with custom validators
- Hard cap on total score (70 points)
- Per-dimension bounds enforcement
"""

from pydantic import BaseModel, validator


class ScoringOutput(BaseModel):
    """
    Validated scoring output with strict bounds.
    
    Invariants:
    - 0 <= code_quality <= 18
    - 0 <= test_coverage <= 18
    - 0 <= deployment_health <= 14
    - 0 <= documentation <= 10
    - 0 <= custom_criteria <= 10
    - total <= 70
    """
    
    code_quality: int
    test_coverage: int
    deployment_health: int
    documentation: int
    custom_criteria: int
    
    @validator('code_quality')
    def validate_code_quality(cls, v):
        """Validate code_quality score is in range [0, 18]."""
        if not isinstance(v, int):
            raise ValueError(f'code_quality must be an integer, got {type(v).__name__}')
        if not 0 <= v <= 18:
            raise ValueError(f'code_quality {v} out of bounds [0, 18]')
        return v
    
    @validator('test_coverage')
    def validate_test_coverage(cls, v):
        """Validate test_coverage score is in range [0, 18]."""
        if not isinstance(v, int):
            raise ValueError(f'test_coverage must be an integer, got {type(v).__name__}')
        if not 0 <= v <= 18:
            raise ValueError(f'test_coverage {v} out of bounds [0, 18]')
        return v
    
    @validator('deployment_health')
    def validate_deployment_health(cls, v):
        """Validate deployment_health score is in range [0, 14]."""
        if not isinstance(v, int):
            raise ValueError(f'deployment_health must be an integer, got {type(v).__name__}')
        if not 0 <= v <= 14:
            raise ValueError(f'deployment_health {v} out of bounds [0, 14]')
        return v
    
    @validator('documentation')
    def validate_documentation(cls, v):
        """Validate documentation score is in range [0, 10]."""
        if not isinstance(v, int):
            raise ValueError(f'documentation must be an integer, got {type(v).__name__}')
        if not 0 <= v <= 10:
            raise ValueError(f'documentation {v} out of bounds [0, 10]')
        return v
    
    @validator('custom_criteria')
    def validate_custom_criteria(cls, v):
        """Validate custom_criteria score is in range [0, 10]."""
        if not isinstance(v, int):
            raise ValueError(f'custom_criteria must be an integer, got {type(v).__name__}')
        if not 0 <= v <= 10:
            raise ValueError(f'custom_criteria {v} out of bounds [0, 10]')
        return v
    
    @property
    def total(self) -> int:
        """
        Calculate total score with hard cap.
        
        Postcondition: 0 <= total <= 70
        """
        total = (self.code_quality + self.test_coverage +
                 self.deployment_health + self.documentation +
                 self.custom_criteria)
        return min(total, 70)
    
    class Config:
        """Pydantic configuration."""
        # Allow arbitrary types if needed
        arbitrary_types_allowed = True


# Export the class
__all__ = ["ScoringOutput"]
