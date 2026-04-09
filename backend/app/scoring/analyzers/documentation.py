from app.scoring.github_utils import check_readme_exists

async def score_documentation(owner: str, repo: str) -> int:
    """Check for README.md. Max 10 points."""
    if not owner or not repo:
        return 0
    has_readme = await check_readme_exists(owner, repo)
    return 10 if has_readme else 0
