import os
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app import db_store
from app.api.auth import require_solana_signature
from app.scoring.solana_client import issue_certificate_on_chain
from app.limiter import limiter

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

router = APIRouter()



@router.post("/certificate/{submission_id}")
@limiter.limit("10/minute")
async def mint_certificate(
    submission_id: str,
    request: Request,
    x_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    sub = db_store.get_by_id(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # The signed message for certificate requests is always the submission_id
    require_solana_signature(sub["wallet"], submission_id, x_signature)

    effective_score = sub.get("final_score") or sub["system_score"]["total"]
    if effective_score < 50:
        raise HTTPException(status_code=400, detail="Score too low (minimum 50 required)")

    metadata_uri = f"{API_BASE_URL}/api/v1/metadata/{submission_id}.json"
    tx_sig = await issue_certificate_on_chain(submission_id, sub["wallet"], metadata_uri)
    if not tx_sig:
        raise HTTPException(status_code=502, detail="On-chain certificate minting failed")

    return {
        "tx_sig": tx_sig,
        "solscan_url": f"https://solscan.io/tx/{tx_sig}?cluster=devnet",
        "metadata_uri": metadata_uri,
    }

