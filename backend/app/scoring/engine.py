from app.models.schemas import SubmissionInput, SystemScore
from app.scoring.github_utils import parse_github_repo, assert_repo_accessible
from app.scoring.analyzers.code_quality import score_code_quality
from app.scoring.analyzers.test_coverage import score_test_coverage
from app.scoring.analyzers.deployment_health import score_deployment_health
from app.scoring.analyzers.documentation import score_documentation
from app.scoring.analyzers.custom_criteria import score_custom_criteria

async def execute_scoring_pipeline(submission: SubmissionInput) -> SystemScore:
    owner, repo = parse_github_repo(submission.repo_url)
    await assert_repo_accessible(owner, repo)

    pts_deployment = await score_deployment_health(submission.deployment_url)
    pts_docs = await score_documentation(owner, repo)
    pts_tests = await score_test_coverage(owner, repo, submission.reported_test_coverage_percent)
    pts_code = await score_code_quality(owner, repo, submission.reported_linting_score)
    pts_custom = await score_custom_criteria(submission.repo_url, submission.problem_id)

    total = min(pts_deployment + pts_docs + pts_tests + pts_code + pts_custom, 70)

    return SystemScore(
        code_quality=pts_code,
        test_coverage=pts_tests,
        deployment_health=pts_deployment,
        documentation=pts_docs,
        custom_criteria=pts_custom,
        total=total
    )
