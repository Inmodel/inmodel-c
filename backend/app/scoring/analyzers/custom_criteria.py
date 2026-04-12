from app.scoring.github_utils import check_file_exists, get_repo_contents, get_file_content

CRITERIA_RULES = {
    "defi-swap": [
        {"check": "has_anchor_toml", "points": 4, "description": "Uses Anchor framework"},
        {"check": "has_wallet_connect", "points": 4, "description": "Has wallet integration"},
    ],
    "nft-mint": [
        {"check": "has_metaplex_dep", "points": 4, "description": "Uses Metaplex"},
        {"check": "has_tests_folder", "points": 4, "description": "Has test suite"},
    ],
    "wallet-dashboard": [
        {"check": "has_wallet_connect", "points": 4, "description": "Has wallet integration"},
        {"check": "has_readme_screenshots", "points": 4, "description": "README has screenshots"},
    ],
}


async def _has_anchor_toml(owner: str, repo: str) -> bool:
    return await check_file_exists(owner, repo, "Anchor.toml")


async def _has_wallet_connect(owner: str, repo: str) -> bool:
    pkg = await get_file_content(owner, repo, "package.json")
    return any(kw in pkg for kw in ["@solana/wallet-adapter", "wallet-adapter", "@project-serum/sol-wallet-adapter"])


async def _has_metaplex_dep(owner: str, repo: str) -> bool:
    pkg = await get_file_content(owner, repo, "package.json")
    return "@metaplex-foundation" in pkg or "metaplex" in pkg


async def _has_tests_folder(owner: str, repo: str) -> bool:
    contents = await get_repo_contents(owner, repo)
    return any(
        i.get("type") == "dir" and i.get("name", "").lower() in ["tests", "test", "__tests__", "spec"]
        for i in contents
    )


async def _has_readme_screenshots(owner: str, repo: str) -> bool:
    readme = await get_file_content(owner, repo, "README.md")
    if not readme:
        readme = await get_file_content(owner, repo, "readme.md")
    return "![" in readme or "<img" in readme.lower()


_CHECK_FNS = {
    "has_anchor_toml": _has_anchor_toml,
    "has_wallet_connect": _has_wallet_connect,
    "has_metaplex_dep": _has_metaplex_dep,
    "has_tests_folder": _has_tests_folder,
    "has_readme_screenshots": _has_readme_screenshots,
}


async def check_custom_criteria(repo_url: str, problem_id: str) -> dict:
    from app.scoring.github_utils import parse_github_repo
    try:
        owner, repo = parse_github_repo(repo_url)
    except Exception:
        return {"score": 0, "max": 8, "breakdown": []}

    rules = CRITERIA_RULES.get(problem_id, [])
    score = 0
    breakdown = []
    for rule in rules:
        fn = _CHECK_FNS.get(rule["check"])
        passed = await fn(owner, repo) if fn else False
        pts = rule["points"] if passed else 0
        score += pts
        breakdown.append({"check": rule["check"], "description": rule["description"], "passed": passed, "points": pts})

    return {"score": score, "max": 8, "breakdown": breakdown}


async def score_custom_criteria(repo_url: str = "", problem_id: str = "") -> int:
    if not repo_url or not problem_id:
        return 0
    result = await check_custom_criteria(repo_url, problem_id)
    return result["score"]
