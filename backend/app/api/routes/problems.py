from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.models.db_models import Hackathon
from app.models.schemas import ProblemConfig
from app.database import get_db

router = APIRouter()

@router.get("/problems", response_model=List[ProblemConfig])
def list_problems(db: Session = Depends(get_db)):
    """
    Returns a consolidated list of problems from all active hackathons.
    """
    hackathons = db.query(Hackathon).filter(Hackathon.status == "active").all()
    
    all_problems = []
    seen_ids = set()
    
    for h in hackathons:
        if h.problems:
            # Handle both list and dict formats
            problems_data = h.problems if isinstance(h.problems, list) else h.problems.values()
            for p in problems_data:
                p_id = p.get("id") or p.get("title", "").lower().replace(" ", "_")
                if p_id not in seen_ids:
                    all_problems.append(ProblemConfig(
                        id=p_id,
                        name=p.get("name") or p.get("title", "Untitled Problem"),
                        description=p.get("description", "No description available"),
                        custom_criteria=p.get("custom_criteria", []),
                        max_custom_points=p.get("max_custom_points", 10)
                    ))
                    seen_ids.add(p_id)
    
    return all_problems
