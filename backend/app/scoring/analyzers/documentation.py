from app.scoring.github_utils import get_repo_contents, check_file_exists

async def score_documentation(owner: str, repo: str) -> int:
    """Analyze README and documentation files. Max 10 points."""
    if not owner or not repo:
        return 0
    
    score = 0
    
    # 1. Check for README.md (6 points)
    if await check_file_exists(owner, repo, "README.md") or await check_file_exists(owner, repo, "readme.md"):
        score += 6
        
    # 2. Check for other docs (2 points)
    contents = await get_repo_contents(owner, repo)
    doc_dirs = ["docs", "doc", "documentation"]
    if any(i.get("type") == "dir" and i.get("name").lower() in doc_dirs for i in contents):
        score += 2
        
    # 3. Check for .env.example (2 points)
    if await check_file_exists(owner, repo, ".env.example"):
        score += 2
        
    return score
