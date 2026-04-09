from app.scoring.github_utils import check_test_folder_exists

async def score_test_coverage(owner: str, repo: str, reported_coverage: float) -> int:
    """Mock testing execution. Max 14 points."""
    # 1. Surface check for test folder structure
    has_tests = False
    if owner and repo:
        has_tests = await check_test_folder_exists(owner, repo)
        
    if not has_tests and reported_coverage > 0:
        # If they report coverage but have no test folder, cap it heavily.
        return 2
        
    # 2. Mock coverage based on reported points
    # Range is 0-100%, max points is 14
    score = int((reported_coverage / 100.0) * 14)
    if score > 14:
        score = 14
    if score < 0:
        score = 0
    return score
