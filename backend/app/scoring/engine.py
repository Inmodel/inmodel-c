import asyncio
import logging
from fastapi import HTTPException
from app.models.schemas import SubmissionInput, SystemScore, ProblemConfig
from app.scoring.github_utils import parse_github_repo, assert_repo_accessible
from app.scoring.analyzers.code_quality import score_code_quality
from app.scoring.analyzers.test_coverage import score_test_coverage
from app.scoring.analyzers.deployment_health import score_deployment_health
from app.scoring.analyzers.documentation import score_documentation
from app.scoring.analyzers.custom_criteria import score_custom_criteria

logger = logging.getLogger(__name__)


async def _safe_run(name: str, coro) -> int:
    """Run an analyzer coroutine; return 0 on failure instead of crashing the pipeline."""
    try:
        return await coro
    except Exception as e:
        logger.error(f"[SCORING] Analyzer '{name}' failed: {e}. Awarding 0 points.")
        return 0

async def execute_scoring_pipeline(submission: SubmissionInput, problem_config: ProblemConfig = None) -> SystemScore:
    owner, repo = parse_github_repo(submission.repo_url)

    try:
        await assert_repo_accessible(owner, repo)
    except HTTPException:
        raise  # Re-raise validation errors (invalid repo URL, 404)
    except Exception as e:
        logger.error(f"[SCORING] GitHub accessibility check failed: {e}")
        raise HTTPException(status_code=502, detail=f"Cannot reach GitHub: {e}")

    # Fallback if problem_config is not provided
    if problem_config is None:
        problem_config = ProblemConfig(
            id=submission.problem_id,
            name="Fallback Config",
            description="",
            custom_criteria=[],
            max_custom_points=10
        )

    # Run analyzers concurrently — each one is individually fault-tolerant
    pts_deployment, pts_docs, pts_tests, pts_code, pts_custom = await asyncio.gather(
        _safe_run("deployment_health", score_deployment_health(submission.deployment_url)),
        _safe_run("documentation", score_documentation(owner, repo)),
        _safe_run("test_coverage", score_test_coverage(owner, repo, submission.reported_test_coverage_percent)),
        _safe_run("code_quality", score_code_quality(owner, repo, submission.reported_linting_score)),
        _safe_run("custom_criteria", score_custom_criteria(submission.repo_url, problem_config)),
    )

    total = min(pts_deployment + pts_docs + pts_tests + pts_code + pts_custom, 70)

    return SystemScore(
        code_quality=pts_code,
        test_coverage=pts_tests,
        deployment_health=pts_deployment,
        documentation=pts_docs,
        custom_criteria=pts_custom,
        total=total
    )

