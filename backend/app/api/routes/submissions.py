"""Submission history endpoint — returns all submissions for a given wallet."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import db_store

router = APIRouter()


@router.get("/submissions")
def list_submissions_by_wallet(
    wallet: str = Query(..., description="Solana wallet pubkey (Base58)"),
    db: Session = Depends(get_db),
):
    """Return all submissions for a participant wallet, ordered by newest first."""
    return db_store.get_all_by_wallet(db, wallet)
