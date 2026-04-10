import uuid
from fastapi import APIRouter, Header, HTTPException, Request, BackgroundTasks
from solders.pubkey import Pubkey
from app.models.schemas import SubmissionInput, ScoreResponse
from app.scoring.engine import execute_scoring_pipeline
from app.api.auth import verify_solana_signature
from app.scoring.solana_client import record_score_on_chain
from app import store

router = APIRouter()

PROBLEMS = {
    "defi-swap": {"title": "DeFi Token Swap", "description": "Build a simple token swap on Solana."},
    "nft-mint": {"title": "NFT Minting Tool", "description": "Create and mint NFTs using Metaplex Core."},
    "wallet-dashboard": {"title": "Wallet Dashboard", "description": "Build a wallet analytics dashboard."},
}


@router.get("/problems")
def get_problems():
    return PROBLEMS


@router.post("/score", response_model=ScoreResponse)
async def submit_and_score(
    request: Request,
    submission: SubmissionInput,
    background_tasks: BackgroundTasks,
    x_signature: str = Header(None),
):
    if not x_signature:
        raise HTTPException(status_code=401, detail="Missing x-signature header")

    body_bytes = await request.body()
    if not verify_solana_signature(submission.participant_wallet, body_bytes.decode(), x_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    existing = store.get_by_wallet(submission.problem_id, submission.participant_wallet)
    if existing:
        return existing

    sys_score = await execute_scoring_pipeline(submission)

    resp = ScoreResponse(
        submission_id=str(uuid.uuid4()),
        problem_id=submission.problem_id,
        wallet=submission.participant_wallet,
        system_score=sys_score,
    )
    store.save(resp.dict())

    # Record on devnet in the background
    background_tasks.add_task(
        record_score_on_chain,
        submission.participant_wallet,
        int(sys_score.total),
        0  # Initial judge score is 0
    )

    return resp


@router.get("/score/{submission_id}", response_model=ScoreResponse)
def get_score(submission_id: str):
    data = store.get_by_id(submission_id)
    if not data:
        raise HTTPException(status_code=404, detail="Submission not found")
    return data


@router.get("/submissions")
def list_submissions():
    """Return all submissions for judge review panel."""
    return store.all_scores()


@router.get("/leaderboard")
def leaderboard(problem_id: str):
    all_subs = store.all_scores()
    filtered = [s for s in all_subs if s.get("problem_id") == problem_id]
    return sorted(filtered, key=lambda x: x.get("system_score", {}).get("total", 0), reverse=True)
