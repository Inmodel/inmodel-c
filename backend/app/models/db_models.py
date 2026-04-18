from sqlalchemy import Column, String, Integer, DateTime, Boolean, func, JSON
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
    judge_submitted = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SecurityAuditRecord(Base):
    """
    Security audit trail for all submissions.
    
    Tracks injection attempts, gaming flags, and score penalties
    for forensic analysis and security monitoring.
    """
    __tablename__ = "security_audit"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(String, index=True, nullable=False)
    wallet = Column(String, index=True, nullable=False)
    timestamp = Column(Integer, nullable=False, index=True)  # Unix timestamp

    repo_url = Column(String, nullable=False)

    # Layer 2: Injection Scanner results
    injection_attempts = Column(JSON, default=list)  # list of pattern matches
    injection_threat_level = Column(String, nullable=False)  # clean/suspicious/blocked
    content_hash_pre_sanitize = Column(String, nullable=False)  # SHA256
    content_hash_post_sanitize = Column(String, nullable=False)  # SHA256

    # Layer 5: Anti-Gaming Checker results
    gaming_flags = Column(JSON, default=list)  # list of gaming flags
    score_penalties_applied = Column(Integer, default=0)

    # Final scores
    raw_system_score = Column(Integer, nullable=False)  # before penalties
    final_system_score = Column(Integer, nullable=False)  # after penalties
    was_penalized = Column(Boolean, default=False)


class Hackathon(Base):
    """
    Metadata for organized Hackathons.
    """
    __tablename__ = "hackathons"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    organizer_wallet = Column(String, nullable=False)
    problems = Column(JSON)           # list of problem configs
    scoring_weights = Column(JSON)    # custom weights
    status = Column(String, default="active")  # active | finalized
    created_at = Column(Integer)
    finalized_at = Column(Integer, nullable=True)
    on_chain_tx = Column(String, nullable=True)
