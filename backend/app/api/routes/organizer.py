import uuid
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.schemas import HackathonInput
from app.models.db_models import Hackathon
from app.database import get_db

router = APIRouter()

@router.post("/hackathons")
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

@router.get("/hackathons/{hackathon_id}")
def get_hackathon(hackathon_id: str, db: Session = Depends(get_db)):
    hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return hackathon
