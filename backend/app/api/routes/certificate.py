from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import db_store
from app.scoring.solana_client import issue_certificate

router = APIRouter()


@router.post("/certificate/{submission_id}")
async def mint_certificate(submission_id: str, db: Session = Depends(get_db)):
    sub = db_store.get_by_id(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    effective_score = sub.get("final_score") or sub["system_score"]["total"]
    if effective_score < 50:
        raise HTTPException(status_code=400, detail="Score too low (minimum 50 required)")

    metadata_uri = f"https://judgechain.io/metadata/{submission_id}.json"
    tx_sig = await issue_certificate(submission_id, metadata_uri)
    if not tx_sig:
        raise HTTPException(status_code=502, detail="On-chain certificate minting failed")

    return {
        "tx_sig": tx_sig,
        "solscan_url": f"https://solscan.io/tx/{tx_sig}?cluster=devnet",
        "metadata_uri": metadata_uri,
    }
