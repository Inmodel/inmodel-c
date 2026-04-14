"""
Certificate metadata endpoint — serves Metaplex-compatible JSON metadata
for minted NFT certificates.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import db_store

router = APIRouter()


@router.get("/metadata/{submission_id}.json")
def get_certificate_metadata(
    submission_id: str,
    db: Session = Depends(get_db),
):
    """Return Metaplex Core compatible JSON metadata for a certificate NFT."""
    sub = db_store.get_by_id(db, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    final_score = sub.get("final_score") or sub["system_score"]["total"]
    sys = sub["system_score"]

    return {
        "name": f"JudgeChain Certificate #{submission_id[:8]}",
        "symbol": "JCERT",
        "description": (
            f"Soulbound certificate for hackathon submission {submission_id}. "
            f"Final score: {final_score}/100. "
            f"This certificate is permanently frozen and non-transferable."
        ),
        "image": "https://arweave.net/judgechain-cert-placeholder",  # TODO: generate per-cert image
        "external_url": f"https://solscan.io/account/{sub['wallet']}?cluster=devnet",
        "attributes": [
            {"trait_type": "Final Score", "value": final_score},
            {"trait_type": "System Score", "value": sys["total"]},
            {"trait_type": "Judge Score", "value": sub.get("judge_score") or 0},
            {"trait_type": "Code Quality", "value": sys["code_quality"]},
            {"trait_type": "Test Coverage", "value": sys["test_coverage"]},
            {"trait_type": "Deployment Health", "value": sys["deployment_health"]},
            {"trait_type": "Documentation", "value": sys["documentation"]},
            {"trait_type": "Custom Criteria", "value": sys["custom_criteria"]},
            {"trait_type": "Problem ID", "value": sub["problem_id"]},
            {"trait_type": "Wallet", "value": sub["wallet"]},
            {"trait_type": "Soulbound", "value": "true"},
        ],
        "properties": {
            "category": "certificate",
            "creators": [],
        },
    }
