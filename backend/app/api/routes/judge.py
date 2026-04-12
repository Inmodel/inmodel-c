from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.models.schemas import JudgeScoreInput
from app.api.auth import verify_solana_signature
from app.database import get_db
from app import db_store
from app.models.db_models import Submission
from app.scoring.solana_client import record_score_on_chain

router = APIRouter()


@router.get("/judge/submissions")
def list_judge_submissions(db: Session = Depends(get_db)):
    rows = db.query(Submission).order_by(Submission.created_at.desc()).all()
    return [db_store._to_dict(r) for r in rows]


@router.post("/judge/score")
async def judge_score(
    request: Request,
    body: JudgeScoreInput,
    background_tasks: BackgroundTasks,
    x_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    if x_signature:
        raw_body = await request.body()
        if not verify_solana_signature(body.judge_wallet, raw_body.decode(), x_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    existing = db_store.get_by_id(db, body.submission_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Submission not found")
    if existing.get("judge_submitted"):
        raise HTTPException(status_code=409, detail="Submission already judge-scored")

    judge_score = round((body.innovation + body.impact + body.presentation) / 3 * 10, 2)
    system_score = existing["system_score"]["total"]
    final_score = round((system_score * 0.7) + (judge_score * 0.3), 2)

    updated = db_store.apply_judge_score(db, body.submission_id, judge_score)

    background_tasks.add_task(
        record_score_on_chain,
        body.submission_id,
        int(system_score),
        int(judge_score),
        int(final_score),
    )

    return updated


@router.get("/problems")
def list_problems():
    from app.problems import PROBLEMS
    return PROBLEMS
