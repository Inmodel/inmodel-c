from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import score, judge
from app.models.schemas import HackathonInput
from typing import Optional, List
import json
import os

app = FastAPI(title="JudgeChain Backend MVP")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router, prefix="/api/v1")
app.include_router(judge.router, prefix="/api/v1")

DB_HACKATHONS = "hackathons.json"

def load_hackathons():
    if not os.path.exists(DB_HACKATHONS):
        return []
    try:
        with open(DB_HACKATHONS, "r") as f:
            return json.load(f)
    except:
        return []

def save_hackathons(hackathons):
    with open(DB_HACKATHONS, "w") as f:
        json.dump(hackathons, f, indent=2)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "JudgeChain Scoring Engine MVP API is running."}

@app.get("/api/v1/hackathons")
def get_hackathons(organizer: Optional[str] = None):
    hacks = load_hackathons()
    if organizer:
        return [h for h in hacks if h.get("organizer") == organizer]
    return hacks

@app.post("/api/v1/hackathons")
def create_hackathon(hackathon: HackathonInput):
    hacks = load_hackathons()
    # For MVP, just append. In real app, check for duplicates.
    hacks.append(hackathon.model_dump())
    save_hackathons(hacks)
    return {"status": "success", "hackathon": hackathon}

@app.get("/api/v1/problems")
def get_problems(hackathon_pubkey: Optional[str] = None):
    # If no hackathon_pubkey, we can return the legacy problems.json or default to the first one
    if not hackathon_pubkey:
        problems_file = "problems.json"
        if os.path.exists(problems_file):
            with open(problems_file, "r") as f:
                return json.load(f)
        return {}
    
    hacks = load_hackathons()
    for h in hacks:
        if h.get("pubkey") == hackathon_pubkey:
            # Format list of problems as a dict for frontend compatibility
            return {p["id"]: {"title": p["title"], "description": p["description"]} for p in h.get("problems", [])}
    
    return {}

@app.get("/api/v1/leaderboard")
def get_leaderboard(problem_id: str = Query(...)):
    db_file = "submissions.json"
    if not os.path.exists(db_file):
        return []
        
    try:
        with open(db_file, "r") as f:
            submissions = json.load(f)
            
        # Filter by problem_id and sort by total score
        filtered = [s for s in submissions if s.get("problem_id") == problem_id]
        sorted_subs = sorted(
            filtered, 
            key=lambda x: x.get("system_score", {}).get("total", 0), 
            reverse=True
        )
        return sorted_subs
    except Exception:
        return []
