async def score_code_quality(reported_lint_score: float) -> int:
    """Mock code quality linting. Max 18 points."""
    # Since we avoid RCE, we use the participant-reported lint score.
    # We just ensure it bounds to 0-18.
    score = int(reported_lint_score)
    if score > 18:
        score = 18
    if score < 0:
        score = 0
    return score
