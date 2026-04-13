from app.scoring.github_utils import get_repo_contents

async def score_test_coverage(owner: str, repo: str, reported_coverage: float) -> int:
    """Analyze repo for tests and verify reported coverage. Max 14 points."""
    if not owner or not repo:
        return 0
        
    contents = await get_repo_contents(owner, repo)
    test_indicators = ["test", "tests", "spec", "__tests__", "testing"]
    
    has_test_dir = any(
        i.get("type") == "dir" and i.get("name").lower() in test_indicators for i in contents
    )
    
    # Also check for common test config files
    test_configs = ["jest.config.js", "vitest.config.ts", "pytest.ini", "Cargo.toml"]
    has_test_config = any(
        i.get("type") == "file" and i.get("name") in test_configs for i in contents
    )
    
    if not has_test_dir and not has_test_config:
        # Heavily penalize if no tests are even detected in the repo
        # Cap the max possible score from "reported" coverage to 2 if no evidence exists
        coverage_points = min(int((reported_coverage / 100.0) * 12), 2)
        return coverage_points
        
    # Calculate score based on reported coverage (range 0-100%, max points 14)
    # Give a small bonus (2 pts) for having test structure
    base_points = 2
    coverage_points = int((reported_coverage / 100.0) * 12)
    
    score = base_points + coverage_points
    return min(score, 14)
