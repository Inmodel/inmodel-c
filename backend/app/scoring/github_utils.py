import re
import httpx
import os
import base64
from fastapi import HTTPException

GITHUB_HEADERS = {
    "User-Agent": "JudgeChain-MVP",
    "Accept": "application/vnd.github.v3+json"
}

# Add auth if token is in environment
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
if GITHUB_TOKEN:
    GITHUB_HEADERS["Authorization"] = f"token {GITHUB_TOKEN}"

def parse_github_repo(url: str) -> tuple[str, str]:
    # Handles both https://github.com/owner/repo and github.com/owner/repo
    match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
    if not match:
        raise HTTPException(status_code=422, detail="Invalid GitHub URL")
    owner = match.group(1)
    repo = match.group(2).replace(".git", "").split("?")[0].split("#")[0]
    return owner, repo

async def fetch_github_api(endpoint: str) -> httpx.Response:
    async with httpx.AsyncClient() as client:
        url = f"https://api.github.com/{endpoint.lstrip('/')}"
        r = await client.get(url, headers=GITHUB_HEADERS)
        return r

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
