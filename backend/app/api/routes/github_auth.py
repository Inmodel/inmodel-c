"""
GitHub OAuth stub — lightweight flow to link a GitHub username to a wallet.

Env vars required:
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
"""

import os
import logging
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

logger = logging.getLogger(__name__)

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")


@router.get("/auth/github")
def github_login():
    """Redirect the user to GitHub's OAuth authorization page."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured (missing GITHUB_CLIENT_ID)")
    
    redirect_uri = f"{DASHBOARD_URL}/api/auth/callback"
    scope = "read:user"
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
    )
    return RedirectResponse(url)


@router.get("/auth/github/callback")
async def github_callback(code: str = Query(...)):
    """Exchange a GitHub OAuth code for an access token and fetch the username."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        
        if token_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to exchange GitHub code")
        
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=token_data.get("error_description", "No access token"))

        # Fetch user info
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        
        if user_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch GitHub user info")
        
        user_data = user_resp.json()

    return {
        "github_username": user_data.get("login"),
        "github_id": user_data.get("id"),
        "avatar_url": user_data.get("avatar_url"),
        "name": user_data.get("name"),
    }
