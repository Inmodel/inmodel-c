from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class ProblemInput(BaseModel):
    id: str
    title: str
    description: str


class HackathonInput(BaseModel):
    name: str
    organizer: str
    pubkey: str
    problems: List[ProblemInput]


class SubmissionInput(BaseModel):
    problem_id: str
    participant_wallet: str
    repo_url: str = Field(..., description="GitHub repository URL")
    deployment_url: str = Field(..., description="Live deployment URL")
    reported_test_coverage_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    reported_linting_score: float = Field(default=0.0, ge=0.0, le=18.0)


class SystemScore(BaseModel):
    code_quality: int
    test_coverage: int
    deployment_health: int
    documentation: int
    custom_criteria: int
    total: int


class SecurityMetadata(BaseModel):
    """
    Security metadata for a scored submission.
    
    Includes injection detection results, gaming flags, and penalties applied.
    """
    scan_result: str  # "clean" | "suspicious" | "blocked"
    injection_attempts_detected: int
    gaming_flags: List[str]
    penalties_applied: int
    audit_hash: str  # first 16 chars of SHA256


class ScoreResponse(BaseModel):
    submission_id: str
    problem_id: str
    wallet: str
    system_score: SystemScore
    judge_score: Optional[int] = None
    final_score: Optional[int] = None
    tx_hash: Optional[str] = None
    status: str = "scored"
    security: Optional[SecurityMetadata] = None


class JudgeScoreInput(BaseModel):
    submission_id: str
    innovation: float = Field(..., ge=0, le=10)
    impact: float = Field(..., ge=0, le=10)
    presentation: float = Field(..., ge=0, le=10)
    judge_wallet: str
