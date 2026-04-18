from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from app.models.schemas import JudgeScoreInput
from app.api.auth import require_solana_signature, verify_solana_signature
from app.database import get_db
from app import db_store
from app.models.db_models import Submission
from app.scoring.solana_client import record_score_on_chain
from app.events import broadcast
from app.limiter import limiter
import os

AUTHORIZED_JUDGES = os.getenv("AUTHORIZED_JUDGES", "").split(",")
ADMIN_ACCESS_KEY = os.getenv("ADMIN_ACCESS_KEY")

router = APIRouter()



@router.get("/judge/submissions")
async def list_judge_submissions(
    x_signature: str = Header(None),
    x_wallet: str = Header(None),
    x_admin_access: str = Header(None),
    db: Session = Depends(get_db)
):
    is_authorized = (x_wallet and x_wallet in AUTHORIZED_JUDGES) or (x_admin_access == ADMIN_ACCESS_KEY)
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Unauthorized judge")
    
    # Verify signature for a fixed message "list_submissions"
    require_solana_signature(x_wallet, "list_submissions", x_signature)

    rows = db.query(Submission).order_by(Submission.created_at.desc()).all()
    return [db_store.to_dict(r) for r in rows]


@router.post("/judge/score")
@limiter.limit("10/minute")
async def judge_score(
    request: Request,
    body: JudgeScoreInput,
    background_tasks: BackgroundTasks,
    x_signature: str = Header(None),
    x_admin_access: str = Header(None),
    db: Session = Depends(get_db),
):
    is_authorized = (body.judge_wallet in AUTHORIZED_JUDGES) or (x_admin_access == ADMIN_ACCESS_KEY)
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Unauthorized judge")

    raw_body = await request.body()
    require_solana_signature(body.judge_wallet, raw_body.decode(), x_signature)

    existing = db_store.get_by_id(db, body.submission_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Submission not found")
    if existing.get("judge_submitted"):
        raise HTTPException(status_code=409, detail="Submission already judge-scored")

    # Issue 6: Replicate on-chain integer math exactly
    # 70% System (int(total)*7)//10 + 30% Judge (int(total)*3)//10
    system_score = int(existing["system_score"]["total"])
    judge_score_raw = (body.innovation + body.impact + body.presentation) / 3 * 10
    judge_score = int(judge_score_raw)
    
    final_score = (system_score * 7 // 10) + (judge_score * 3 // 10)

    updated = db_store.apply_judge_score(db, body.submission_id, judge_score, final_score=final_score)

    background_tasks.add_task(
        record_score_on_chain,
        body.submission_id,
        existing["wallet"],
        system_score,
        judge_score,
        final_score,
    )

    # Broadcast to SSE subscribers
    if updated:
        background_tasks.add_task(broadcast, "score_update", updated)

    return updated


@router.get("/problems")
def list_problems():
    from app.problems import PROBLEMS
    return PROBLEMS
