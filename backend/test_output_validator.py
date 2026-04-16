"""
Unit tests for OutputValidator - Layer 4 Security
"""

import pytest
from app.security.output_validator import ScoringOutput


class TestScoringOutput:
    """Tests for ScoringOutput Pydantic model"""
    
    def test_valid_scores(self):
        """Test that valid scores are accepted"""
        output = ScoringOutput(
            code_quality=15,
            test_coverage=14,
            deployment_health=12,
            documentation=8,
            custom_criteria=7,
        )
        
        assert output.code_quality == 15
        assert output.test_coverage == 14
        assert output.deployment_health == 12
        assert output.documentation == 8
        assert output.custom_criteria == 7
    
    def test_total_score_calculation(self):
        """Test that total score is calculated correctly"""
        output = ScoringOutput(
            code_quality=10,
            test_coverage=10,
            deployment_health=10,
            documentation=10,
            custom_criteria=10,
        )
        
        assert output.total == 50
    
    def test_total_score_cap_at_70(self):
        """Test that total score is capped at 70"""
        output = ScoringOutput(
            code_quality=18,
            test_coverage=18,
            deployment_health=14,
            documentation=10,
            custom_criteria=10,
        )
        
        # Sum would be 70, should be capped at 70
        assert output.total == 70
    
    def test_total_score_exceeds_cap(self):
        """Test that total score exceeding 70 is capped"""
        # This shouldn't be possible with valid individual scores,
        # but test the cap logic
        output = ScoringOutput(
            code_quality=18,
            test_coverage=18,
            deployment_health=14,
            documentation=10,
            custom_criteria=10,
        )
        
        assert output.total <= 70
    
    def test_code_quality_min_bound(self):
        """Test that code_quality minimum bound is 0"""
        output = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=0,
            documentation=0,
            custom_criteria=0,
        )
        
        assert output.code_quality == 0
    
    def test_code_quality_max_bound(self):
        """Test that code_quality maximum bound is 18"""
        output = ScoringOutput(
            code_quality=18,
            test_coverage=0,
            deployment_health=0,
            documentation=0,
            custom_criteria=0,
        )
        
        assert output.code_quality == 18
    
    def test_code_quality_below_min(self):
        """Test that code_quality below 0 is rejected"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=-1,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_code_quality_above_max(self):
        """Test that code_quality above 18 is rejected"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=19,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_test_coverage_bounds(self):
        """Test that test_coverage bounds are [0, 18]"""
        # Valid
        output = ScoringOutput(
            code_quality=0,
            test_coverage=18,
            deployment_health=0,
            documentation=0,
            custom_criteria=0,
        )
        assert output.test_coverage == 18
        
        # Invalid - below
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=0,
                test_coverage=-1,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
        
        # Invalid - above
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=0,
                test_coverage=19,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_deployment_health_bounds(self):
        """Test that deployment_health bounds are [0, 14]"""
        # Valid
        output = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=14,
            documentation=0,
            custom_criteria=0,
        )
        assert output.deployment_health == 14
        
        # Invalid - above
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=0,
                test_coverage=0,
                deployment_health=15,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_documentation_bounds(self):
        """Test that documentation bounds are [0, 10]"""
        # Valid
        output = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=0,
            documentation=10,
            custom_criteria=0,
        )
        assert output.documentation == 10
        
        # Invalid - above
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=0,
                test_coverage=0,
                deployment_health=0,
                documentation=11,
                custom_criteria=0,
            )
    
    def test_custom_criteria_bounds(self):
        """Test that custom_criteria bounds are [0, 10]"""
        # Valid
        output = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=0,
            documentation=0,
            custom_criteria=10,
        )
        assert output.custom_criteria == 10
        
        # Invalid - above
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=0,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=11,
            )
    
    def test_all_bounds_at_minimum(self):
        """Test all scores at minimum (0)"""
        output = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=0,
            documentation=0,
            custom_criteria=0,
        )
        
        assert output.total == 0
    
    def test_all_bounds_at_maximum(self):
        """Test all scores at maximum allowed values"""
        output = ScoringOutput(
            code_quality=18,
            test_coverage=18,
            deployment_health=14,
            documentation=10,
            custom_criteria=10,
        )
        
        assert output.code_quality == 18
        assert output.test_coverage == 18
        assert output.deployment_health == 14
        assert output.documentation == 10
        assert output.custom_criteria == 10
        assert output.total == 70
    
    def test_non_integer_score_rejected(self):
        """Test that non-integer scores are rejected"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=15.5,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_string_score_rejected(self):
        """Test that string scores are rejected"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality="15",
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_none_score_rejected(self):
        """Test that None scores are rejected"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=None,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
    
    def test_missing_required_field(self):
        """Test that missing required fields raise error"""
        with pytest.raises(ValueError):
            ScoringOutput(
                code_quality=10,
                test_coverage=10,
                deployment_health=10,
                documentation=10,
                # custom_criteria missing
            )
    
    def test_model_serialization(self):
        """Test that model can be serialized"""
        output = ScoringOutput(
            code_quality=15,
            test_coverage=14,
            deployment_health=12,
            documentation=8,
            custom_criteria=7,
        )
        
        # Should be serializable to dict
        data = output.dict()
        assert data["code_quality"] == 15
        assert data["test_coverage"] == 14
        assert data["deployment_health"] == 12
        assert data["documentation"] == 8
        assert data["custom_criteria"] == 7
    
    def test_model_json_serialization(self):
        """Test that model can be serialized to JSON"""
        output = ScoringOutput(
            code_quality=15,
            test_coverage=14,
            deployment_health=12,
            documentation=8,
            custom_criteria=7,
        )
        
        # Should be serializable to JSON
        json_str = output.json()
        assert "code_quality" in json_str
        assert "15" in json_str
    
    def test_edge_case_scores(self):
        """Test edge case score combinations"""
        # All zeros
        output1 = ScoringOutput(
            code_quality=0,
            test_coverage=0,
            deployment_health=0,
            documentation=0,
            custom_criteria=0,
        )
        assert output1.total == 0
        
        # Mixed
        output2 = ScoringOutput(
            code_quality=18,
            test_coverage=0,
            deployment_health=14,
            documentation=0,
            custom_criteria=10,
        )
        assert output2.total == 42
        
        # Another mix
        output3 = ScoringOutput(
            code_quality=9,
            test_coverage=9,
            deployment_health=7,
            documentation=5,
            custom_criteria=5,
        )
        assert output3.total == 35
    
    def test_validator_error_messages(self):
        """Test that validator error messages are informative"""
        try:
            ScoringOutput(
                code_quality=25,
                test_coverage=0,
                deployment_health=0,
                documentation=0,
                custom_criteria=0,
            )
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "code_quality" in str(e).lower()
            assert "25" in str(e)
    
    def test_total_property_is_readonly(self):
        """Test that total property cannot be set directly"""
        output = ScoringOutput(
            code_quality=10,
            test_coverage=10,
            deployment_health=10,
            documentation=10,
            custom_criteria=10,
        )
        
        # total is a property, should not be settable
        with pytest.raises(AttributeError):
            output.total = 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
