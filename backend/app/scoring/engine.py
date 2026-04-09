from app.models.schemas import SubmissionInput, SystemScore
from app.scoring.github_utils import parse_github_repo
from app.scoring.analyzers.code_quality import score_code_quality
from app.scoring.analyzers.test_coverage import score_test_coverage
from app.scoring.analyzers.deployment_health import score_deployment_health
from app.scoring.analyzers.documentation import score_documentation
from app.scoring.analyzers.custom_criteria import score_custom_criteria

async def execute_scoring_pipeline(submission: SubmissionInput) -> SystemScore:
    """Master orchestrator for the backend technical scoring engine."""
    owner, repo = parse_github_repo(submission.repo_url)
    
    # 1. Dispatch analyzers
    pts_deployment = await score_deployment_health(submission.deployment_url)
    pts_docs = await score_documentation(owner, repo)
    pts_tests = await score_test_coverage(owner, repo, submission.reported_test_coverage_percent)
    pts_code = await score_code_quality(submission.reported_linting_score)
    pts_custom = await score_custom_criteria()

    # 2. Tally total
    total = pts_deployment + pts_docs + pts_tests + pts_code + pts_custom
    
    # 3. Cap at 70 points
    total = min(total, 70)

    # 4. Construct SystemScore
    return SystemScore(
        code_quality=pts_code,
        test_coverage=pts_tests,
        deployment_health=pts_deployment,
        documentation=pts_docs,
        custom_criteria=pts_custom,
        total=total
    )
