from app.scoring.github_utils import get_repo_contents, get_file_content
from app.scoring.llm_utils import analyze_code_with_llm

async def score_code_quality(owner: str, repo: str, reported_lint_score: float) -> int:
    """Analyze repo structure and use LLM for logic check. Max 18 points."""
    if not owner or not repo:
        return 0
        
    contents = await get_repo_contents(owner, repo)
    
    # 1. Base points for project structure (6 points)
    manifests = ["package.json", "Cargo.toml", "requirements.txt", "go.mod", "Gemfile"]
    has_manifest = any(
        i.get("type") == "file" and i.get("name") in manifests for i in contents
    )
    
    # Check for src or app folder
    has_src = any(
        i.get("type") == "dir" and i.get("name") in ["src", "app", "lib", "programs"] for i in contents
    )
    
    base_score = 0
    if has_manifest: base_score += 3
    if has_src: base_score += 3
    
    # 2. AI Code Analysis (12 points)
    # We fetch 2-3 key files for analysis
    ai_score = 0
    files_to_analyze = []
    
    # Heuristic for finding main logic
    if has_src:
        src_contents = await get_repo_contents(owner, repo, "src")
        # Try to find lib.rs, main.ts, index.ts etc.
        for f in src_contents:
            if f.get("name") in ["lib.rs", "main.ts", "index.ts", "App.tsx", "main.py"]:
                files_to_analyze.append(f"src/{f.get('name')}")
    
    # Also check root for lib.rs (Anchor style) or main.py
    for f in contents:
        if f.get("name") in ["lib.rs", "main.py"]:
            files_to_analyze.append(f.get("name"))

    if files_to_analyze:
        contents_dict = {}
        for path in files_to_analyze[:3]: # Limit to 3 files
            content = await get_file_content(owner, repo, path)
            if content:
                contents_dict[path] = content
        
        if contents_dict:
            ai_score = await analyze_code_with_llm(contents_dict)
    else:
        # Fallback if no main files found but manifest exists
        ai_score = 4 if has_manifest else 0
        
    score = base_score + ai_score
    return min(score, 18)
