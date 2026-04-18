import uuid
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import HackathonInput
from app.models.db_models import Hackathon, Submission
from app.database import get_db
from app import db_store

router = APIRouter()

@router.post("/hackathon/create")
def create_hackathon(hackathon_in: HackathonInput, db: Session = Depends(get_db)):
    # Validate problem configs
    problems_json = [p.model_dump() for p in hackathon_in.problems]
    
    hackathon = Hackathon(
        id=str(uuid.uuid4()),
        name=hackathon_in.name,
        organizer_wallet=hackathon_in.pubkey,
        problems=problems_json,
        scoring_weights={},
        status="active",
        created_at=int(time.time()),
    )
    db.add(hackathon)
    db.commit()
    db.refresh(hackathon)
    return {"id": hackathon.id, "status": "created"}

@router.get("/hackathon/{hackathon_id}")
def get_hackathon(hackathon_id: str, db: Session = Depends(get_db)):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return hackathon

@router.post("/hackathon/{hackathon_id}/finalize")
def finalize_hackathon(hackathon_id: str, db: Session = Depends(get_db)):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    if hackathon.status == "finalized":
        raise HTTPException(status_code=400, detail="Already finalized")
    hackathon.status = "finalized"
    db.commit()
    # Mock return for the UX confirmation:
    return {"on_chain_tx": "mock_tx_finalize", "solscan_url": "https://solscan.io", "winners": []}

@router.get("/hackathon/{hackathon_id}/submissions")
def get_hackathon_submissions(hackathon_id: str, db: Session = Depends(get_db)):
    # Currently returning stub response if relations are not strictly keyed:
    # We will fetch from judge submissions API mostly, but this implements the asked route.
    rows = db.query(Submission).order_by(Submission.created_at.desc()).all()
    return [db_store.to_dict(r) for r in rows]

@router.get("/hackathon/{hackathon_id}/winners")
def get_hackathon_winners(hackathon_id: str, db: Session = Depends(get_db)):
    # Stub returning top 3 submissions as winners for the Certificates page
    rows = db.query(Submission).order_by(Submission.created_at.desc()).limit(3).all()
    return [db_store.to_dict(r) for r in rows]
