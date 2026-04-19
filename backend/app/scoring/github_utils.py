import re
import httpx
import os
import base64
from fastapi import HTTPException
from app.utils.retry import with_retry

GITHUB_HEADERS = {
    "User-Agent": "JudgeNod",
    "Accept": "application/vnd.github.v3+json"
}

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
if GITHUB_TOKEN:
    GITHUB_HEADERS["Authorization"] = f"token {GITHUB_TOKEN}"

_github_client = httpx.AsyncClient(headers=GITHUB_HEADERS, timeout=10.0)

def parse_github_repo(url: str) -> tuple[str, str]:
    # Handles both https://github.com/owner/repo and github.com/owner/repo
    match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
    if not match:
        raise HTTPException(status_code=422, detail="Invalid GitHub URL")
    owner = match.group(1)
    repo = match.group(2).replace(".git", "").split("?")[0].split("#")[0]
    return owner, repo

@with_retry(max_attempts=3, backoff_base=1.0)
async def fetch_github_api(endpoint: str) -> httpx.Response:
    url = f"https://api.github.com/{endpoint.lstrip('/')}"
    return await _github_client.get(url)

async def assert_repo_accessible(owner: str, repo: str) -> None:
    r = await fetch_github_api(f"repos/{owner}/{repo}")
    if r.status_code == 404:
        raise HTTPException(status_code=422, detail=f"GitHub repo {owner}/{repo} not found or is private")
    if r.status_code != 200:
        raise HTTPException(status_code=422, detail=f"GitHub API error: {r.status_code}")

async def get_repo_contents(owner: str, repo: str, path: str = "") -> list:
    r = await fetch_github_api(f"repos/{owner}/{repo}/contents/{path}")
    if r.status_code == 200:
        return r.json()
    return []

async def check_file_exists(owner: str, repo: str, filename: str) -> bool:
    r = await fetch_github_api(f"repos/{owner}/{repo}/contents/{filename}")
    return r.status_code == 200

async def get_file_content(owner: str, repo: str, path: str) -> str:
    """Fetches raw file content and decodes from Base64."""
    r = await fetch_github_api(f"repos/{owner}/{repo}/contents/{path}")
    if r.status_code == 200:
        data = r.json()
        if data.get("encoding") == "base64":
            return base64.b64decode(data["content"]).decode("utf-8")
    return ""

async def get_repo_meta(owner: str, repo: str) -> dict:
    r = await fetch_github_api(f"repos/{owner}/{repo}")
    if r.status_code == 200:
        return r.json()
    return {}

async def check_package_dependency(owner: str, repo: str, package: str) -> bool:
    pkg = await get_file_content(owner, repo, "package.json")
    if package in pkg: return True
    cargo = await get_file_content(owner, repo, "Cargo.toml")
    if package in cargo: return True
    req = await get_file_content(owner, repo, "requirements.txt")
    if package in req: return True
    return False

async def check_file_matching(owner: str, repo: str, pattern: str) -> bool:
    import re
    contents = await get_repo_contents(owner, repo)
    for item in contents:
        if item.get("type") == "file" and re.search(pattern, item.get("name", ""), re.IGNORECASE):

            return True
    return False

async def check_folder_exists(owner: str, repo: str, folder_name: str) -> bool:
    contents = await get_repo_contents(owner, repo)
    for item in contents:
        if item.get("type") == "dir" and item.get("name", "") == folder_name:
            return True
    return False

async def check_readme_contains(owner: str, repo: str, keyword: str) -> bool:
    readme = await get_file_content(owner, repo, "README.md")
    if not readme:
        readme = await get_file_content(owner, repo, "readme.md")
    return re.search(keyword, readme, re.IGNORECASE) is not None

async def check_has_test_files(owner: str, repo: str) -> bool:
    contents = await get_repo_contents(owner, repo)
    for item in contents:
        name = item.get("name", "").lower()
        if item.get("type") == "dir" and name in ["tests", "test", "__tests__", "spec"]:
            return True
        if item.get("type") == "file" and ("test" in name or "spec" in name):
            return True
    return False
