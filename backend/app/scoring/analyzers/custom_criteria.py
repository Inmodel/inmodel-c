from app.models.schemas import ProblemConfig

import httpx

async def check_deployment_endpoint(deployment_url: str, path: str) -> bool:
    try:
        url = deployment_url.rstrip("/") + "/" + path.lstrip("/")
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=5.0)
            return r.status_code == 200
    except Exception:
        return False

# Mapping of validator names to actual functions
# These accept (owner, repo, params) or (url, params)
async def _run_validator(validator_name: str, owner: str, repo: str, url: str, params: dict) -> bool:
    if validator_name == "has_dependency":
        from app.scoring.github_utils import check_package_dependency
        return await check_package_dependency(owner, repo, params.get("package", ""))
    elif validator_name == "has_file_matching":
        from app.scoring.github_utils import check_file_matching
        return await check_file_matching(owner, repo, params.get("pattern", ""))
    elif validator_name == "has_folder":
        from app.scoring.github_utils import check_folder_exists
        return await check_folder_exists(owner, repo, params.get("name", ""))
    elif validator_name == "readme_mentions":
        from app.scoring.github_utils import check_readme_contains
        return await check_readme_contains(owner, repo, params.get("keyword", ""))
    elif validator_name == "has_tests":
        from app.scoring.github_utils import check_has_test_files
        return await check_has_test_files(owner, repo)
    elif validator_name == "deployment_has_endpoint":
        return await check_deployment_endpoint(url, params.get("path", "/"))
    return False


async def check_custom_criteria(repo_url: str, problem_config: ProblemConfig) -> dict:
    from app.scoring.github_utils import parse_github_repo
    try:
        owner, repo = parse_github_repo(repo_url)
    except Exception:
        return {"score": 0, "max": problem_config.max_custom_points, "breakdown": []}

    score = 0
    breakdown = []
    
    for rule in problem_config.custom_criteria:
        try:
            passed = await _run_validator(rule.validator, owner, repo, repo_url, rule.params)
            pts = rule.points if passed else 0
            score += pts
            breakdown.append({
                "id": rule.id,
                "description": rule.description,
                "passed": passed,
                "points": pts,
                "max": rule.points
            })
        except Exception as e:
            breakdown.append({
                "id": rule.id,
                "description": rule.description,
                "passed": False,
                "points": 0,
                "max": rule.points,
                "error": str(e)
            })

    final_score = min(score, problem_config.max_custom_points)
    return {"score": final_score, "max": problem_config.max_custom_points, "breakdown": breakdown}


async def score_custom_criteria(repo_url: str = "", problem_config: ProblemConfig = None) -> int:
    if not repo_url or not problem_config:
        return 0
    result = await check_custom_criteria(repo_url, problem_config)
    return result["score"]
