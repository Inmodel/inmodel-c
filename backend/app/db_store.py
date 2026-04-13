from typing import Optional
from sqlalchemy.orm import Session
from app.models.db_models import Submission


def status(s: Submission) -> str:
    if s.tx_hash:
        return "anchored"
    if s.final_score is not None:
        return "judge_reviewed"
    return "scored"


def to_dict(s: Submission) -> dict:
    return {
        "submission_id": s.submission_id,
        "problem_id": s.problem_id,
        "wallet": s.wallet,
        "system_score": {
            "code_quality": s.score_code_quality,
            "test_coverage": s.score_test_coverage,
            "deployment_health": s.score_deployment_health,
            "documentation": s.score_documentation,
            "custom_criteria": s.score_custom_criteria,
            "total": s.score_total,
        },
        "judge_score": s.judge_score,
        "final_score": s.final_score,
        "tx_hash": s.tx_hash,
        "judge_submitted": s.judge_submitted,
        "status": status(s),
    }


def get_by_id(db: Session, submission_id: str) -> Optional[dict]:
    row = db.get(Submission, submission_id)
    return to_dict(row) if row else None


def get_by_wallet(db: Session, problem_id: str, wallet: str) -> Optional[dict]:
    row = db.query(Submission).filter_by(problem_id=problem_id, wallet=wallet).first()
    return to_dict(row) if row else None


def get_all_by_wallet(db: Session, wallet: str) -> list[dict]:
    rows = db.query(Submission).filter_by(wallet=wallet).order_by(Submission.created_at.desc()).all()
    return [to_dict(r) for r in rows]


def save(db: Session, data: dict, repo_url: str, deployment_url: str) -> None:
    s = data["system_score"]
    row = Submission(
        submission_id=data["submission_id"],
        problem_id=data["problem_id"],
        wallet=data["wallet"],
        repo_url=repo_url,
        deployment_url=deployment_url,
        score_code_quality=s["code_quality"],
        score_test_coverage=s["test_coverage"],
        score_deployment_health=s["deployment_health"],
        score_documentation=s["documentation"],
        score_custom_criteria=s["custom_criteria"],
        score_total=s["total"],
    )
    db.add(row)
    db.commit()


def apply_judge_score(db: Session, submission_id: str, judge_score: float, tx_hash: Optional[str] = None, final_score: Optional[float] = None) -> Optional[dict]:
    row = db.get(Submission, submission_id)
    if not row:
        return None
    row.judge_score = judge_score
    row.final_score = int(final_score) if final_score is not None else int((row.score_total * 7 + judge_score * 3) // 10)
    row.judge_submitted = True
    if tx_hash:
        row.tx_hash = tx_hash
    db.commit()
    db.refresh(row)
    return to_dict(row)


def leaderboard(db: Session, problem_id: str) -> list[dict]:
    from sqlalchemy import case
    rows = (
        db.query(Submission)
        .filter_by(problem_id=problem_id)
        .order_by(case((Submission.final_score != None, Submission.final_score), else_=Submission.score_total).desc())
        .all()
    )
    return [to_dict(r) for r in rows]
