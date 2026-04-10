from sqlalchemy import Column, String, Integer, DateTime, func
from app.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    submission_id = Column(String, primary_key=True)
    problem_id = Column(String, nullable=False, index=True)
    wallet = Column(String, nullable=False, index=True)

    repo_url = Column(String, nullable=False)
    deployment_url = Column(String, nullable=False)

    # system score breakdown
    score_code_quality = Column(Integer, nullable=False)
    score_test_coverage = Column(Integer, nullable=False)
    score_deployment_health = Column(Integer, nullable=False)
    score_documentation = Column(Integer, nullable=False)
    score_custom_criteria = Column(Integer, nullable=False)
    score_total = Column(Integer, nullable=False)

    # judge + final
    judge_score = Column(Integer, nullable=True)
    final_score = Column(Integer, nullable=True)
    tx_hash = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
