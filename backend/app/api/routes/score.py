import uuid
from fastapi import APIRouter
from app.models.schemas import SubmissionInput, ScoreResponse
from app.scoring.engine import execute_scoring_pipeline

router = APIRouter()

@router.post("/score", response_model=ScoreResponse)
async def submit_and_score(submission: SubmissionInput):
    """
    Accepts a submission, runs the tech scoring engine pipelines,
    and returns a ScoreResponse with the tallied points.
    """
    sys_score = await execute_scoring_pipeline(submission)
    
    return ScoreResponse(
        submission_id=str(uuid.uuid4()),
        problem_id=submission.problem_id,
        wallet=submission.participant_wallet,
        system_score=sys_score
    )
