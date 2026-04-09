import uuid
import json
import os
from fastapi import APIRouter, Header, HTTPException, Request
from app.models.schemas import SubmissionInput, ScoreResponse
from app.scoring.engine import execute_scoring_pipeline
from app.api.auth import verify_solana_signature

router = APIRouter()

DB_FILE = "submissions.json"

def save_submission(data: dict):
    submissions = []
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                submissions = json.load(f)
        except:
            submissions = []
    
    submissions.append(data)
    with open(DB_FILE, "w") as f:
        json.dump(submissions, f, indent=2)

@router.post("/score", response_model=ScoreResponse)
async def submit_and_score(
    request: Request,
    submission: SubmissionInput,
    x_signature: str = Header(None)
):
    """
    Accepts a submission, verifies the wallet signature, runs scoring,
    and persists the result.
    """
    # 1. Verify Signature
    if not x_signature:
        raise HTTPException(status_code=401, detail="Missing x-signature header")
    
    # We verify the signature against the raw JSON body
    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8')
    
    is_valid = verify_solana_signature(
        wallet_address=submission.participant_wallet,
        message=body_str,
        signature_b64=x_signature
    )
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid signature")

    # 2. Run Scoring
    sys_score = await execute_scoring_pipeline(submission)
    
    # 3. Prepare Response
    resp = ScoreResponse(
        submission_id=str(uuid.uuid4()),
        problem_id=submission.problem_id,
        wallet=submission.participant_wallet,
        system_score=sys_score
    )
    
    # 4. Mock Persist
    save_submission(resp.dict())
    
    return resp
