from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import UserProfile
from app.models.schemas import UserProfileSchema, UserProfileUpdate
from typing import Optional

router = APIRouter()

@router.get("/user/profile", response_model=UserProfileSchema)
def get_user_profile(
    uid: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not uid and not email:
        raise HTTPException(status_code=400, detail="Must provide uid or email")
    
    query = db.query(UserProfile)
    if uid:
        query = query.filter(UserProfile.uid == uid)
    if email:
        query = query.filter(UserProfile.email == email)
    
    profile = query.first()
    if not profile:
        # If not found, we might want to create a stub or return 404
        # For this flow, let's return 404 so the frontend knows to create/link
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@router.post("/user/profile", response_model=UserProfileSchema)
def update_user_profile(profile_in: UserProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).filter(UserProfile.uid == profile_in.uid).first()
    
    if not profile:
        profile = UserProfile(
            uid=profile_in.uid,
            email=profile_in.email,
            wallet_address=profile_in.wallet_address
        )
        db.add(profile)
    else:
        profile.email = profile_in.email
        profile.wallet_address = profile_in.wallet_address
    
    db.commit()
    db.refresh(profile)
    return profile
