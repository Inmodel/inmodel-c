import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.schemas import SubmissionInput, ScoreResponse
from app.scoring.engine import execute_scoring_pipeline
from app.api.auth import verify_solana_signature
from app.scoring.solana_client import record_score_on_chain
from app.database import get_db
from app import db_store

router = APIRouter()


@router.post("/score", response_model=ScoreResponse)
async def submit_and_score(
    request: Request,
    submission: SubmissionInput,
    background_tasks: BackgroundTasks,
    x_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    if not x_signature:
        raise HTTPException(status_code=401, detail="Missing x-signature header")

    body_bytes = await request.body()
    if not verify_solana_signature(submission.participant_wallet, body_bytes.decode(), x_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    existing = db_store.get_by_wallet(db, submission.problem_id, submission.participant_wallet)
    if existing:
        return existing

    sys_score = await execute_scoring_pipeline(submission)

    resp = ScoreResponse(
        submission_id=str(uuid.uuid4()),
        problem_id=submission.problem_id,
        wallet=submission.participant_wallet,
        system_score=sys_score,
    )
    db_store.save(db, resp.model_dump(), submission.repo_url, submission.deployment_url)

    background_tasks.add_task(
        record_score_on_chain,
        resp.submission_id,
        int(sys_score.total),
        0,
        int(sys_score.total),
    )

    return resp


@router.get("/score/{submission_id}", response_model=ScoreResponse)
def get_score(submission_id: str, db: Session = Depends(get_db)):
    data = db_store.get_by_id(db, submission_id)
    if not data:
        raise HTTPException(status_code=404, detail="Submission not found")
    return data


@router.get("/leaderboard")
def leaderboard(problem_id: str, db: Session = Depends(get_db)):
    return db_store.leaderboard(db, problem_id)
