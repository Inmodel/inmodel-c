import re
import httpx

def parse_github_repo(url: str):
    # Extracts owner and repo from URLs like https://github.com/owner/repo
    pattern = r"github\.com/([^/]+)/([^/]+)"
    match = re.search(pattern, url)
    if not match:
        return None, None
    owner = match.group(1)
    repo = match.group(2).replace(".git", "")
    return owner, repo

async def check_github_repo_exists(owner: str, repo: str) -> bool:
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    async with httpx.AsyncClient() as client:
        # User-Agent required by GitHub API
        response = await client.get(api_url, headers={"User-Agent": "JudgeChain-MVP"})
        return response.status_code == 200

async def check_readme_exists(owner: str, repo: str) -> bool:
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/README.md"
    async with httpx.AsyncClient() as client:
        response = await client.get(api_url, headers={"User-Agent": "JudgeChain-MVP"})
        return response.status_code == 200

async def check_test_folder_exists(owner: str, repo: str) -> bool:
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"
    async with httpx.AsyncClient() as client:
        response = await client.get(api_url, headers={"User-Agent": "JudgeChain-MVP"})
        if response.status_code != 200:
            return False
        contents = response.json()
        if not isinstance(contents, list):
            return False
        for item in contents:
            if item.get("type") == "dir" and item.get("name") in ["test", "tests"]:
                return True
        return False
