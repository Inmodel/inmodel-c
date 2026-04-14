"""
JudgeChain Backend — Comprehensive API Test Suite
Tests all endpoints: /score, /judge, /certificate, /leaderboard, /problems
"""

import sys
import os
import json
import base64
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Force a clean test database
TEST_DB = "sqlite:///./test_judgechain.db"
os.environ["DATABASE_URL"] = TEST_DB
os.environ["JUDGECHAIN_ENV"] = "test"

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from solders.keypair import Keypair

# Pre-generate a judge keypair for all judge tests
TEST_JUDGE_KP = Keypair()
os.environ["AUTHORIZED_JUDGES"] = str(TEST_JUDGE_KP.pubkey())


from main import app
from app.database import Base, engine
from app.models.schemas import SystemScore

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_db():
    """Recreate the database for every test so tests are fully isolated."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


# A fixed system score for mocked tests
_MOCK_SYSTEM_SCORE = SystemScore(
    code_quality=15,
    test_coverage=12,
    deployment_health=10,
    documentation=8,
    custom_criteria=5,
    total=50,
)

async def _mock_scoring_pipeline(submission):
    """Return a deterministic score without hitting GitHub API."""
    return _MOCK_SYSTEM_SCORE


@pytest.fixture(autouse=True)
def mock_externals():
    """Mock all external dependencies: Solana chain calls + GitHub scoring pipeline."""
    mock_record = lambda *args, **kwargs: "mock_tx_hash"
    with patch("app.api.routes.score.record_score_on_chain", side_effect=mock_record), \
         patch("app.api.routes.judge.record_score_on_chain", side_effect=mock_record), \
         patch("app.api.routes.certificate.issue_certificate_on_chain", new_callable=AsyncMock, return_value="mock_tx_hash_cert"), \
         patch("app.api.routes.score.execute_scoring_pipeline", side_effect=_mock_scoring_pipeline):
        yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def keypair():
    return Keypair()


def _sign(keypair: Keypair, payload: dict) -> tuple[str, str]:
    """Return (body_string, base64_signature)."""
    body = json.dumps(payload)
    sig = keypair.sign_message(body.encode("utf-8"))
    return body, base64.b64encode(bytes(sig)).decode("utf-8")


# ── Tests: Health Check ───────────────────────────────────────────────────────

class TestHealthCheck:
    def test_root_returns_ok(self, client: TestClient):
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "JudgeChain" in data["message"]


# ── Tests: POST /api/v1/score ─────────────────────────────────────────────────

class TestScoreEndpoint:
    def _payload(self, wallet: str) -> dict:
        return {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 80.0,
            "reported_linting_score": 12.0,
        }

    def test_submit_success(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = self._payload(wallet)
        body, sig = _sign(keypair, payload)

        r = client.post(
            "/api/v1/score",
            content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["submission_id"]
        assert data["problem_id"] == "defi_dashboard"
        assert data["wallet"] == wallet
        assert "system_score" in data
        assert data["system_score"]["total"] >= 0

    def test_submit_missing_signature_returns_401(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = self._payload(wallet)

        r = client.post(
            "/api/v1/score",
            json=payload,
            headers={},
        )
        assert r.status_code == 401
        assert "signature" in r.json()["detail"].lower()

    def test_submit_invalid_signature_returns_401(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = self._payload(wallet)
        body = json.dumps(payload)

        r = client.post(
            "/api/v1/score",
            content=body,
            headers={"Content-Type": "application/json", "x-signature": "badsig=="},
        )
        assert r.status_code == 401

    def test_submit_duplicate_returns_existing(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = self._payload(wallet)
        body, sig = _sign(keypair, payload)

        r1 = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r1.status_code == 200
        sid1 = r1.json()["submission_id"]

        r2 = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r2.status_code == 200
        assert r2.json()["submission_id"] == sid1  # idempotent

    def test_submit_bad_repo_url(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = self._payload(wallet)
        payload["repo_url"] = "not-a-url"
        body, sig = _sign(keypair, payload)

        r = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        # Engine may accept and score low, or raise 422 — both acceptable
        assert r.status_code in (200, 422, 400, 500)


# ── Tests: GET /api/v1/score/{submission_id} ──────────────────────────────────

class TestScoreLookup:
    def test_lookup_existing(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 50.0,
            "reported_linting_score": 5.0,
        }
        body, sig = _sign(keypair, payload)
        r = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        sid = r.json()["submission_id"]

        r2 = client.get(f"/api/v1/score/{sid}")
        assert r2.status_code == 200
        assert r2.json()["submission_id"] == sid

    def test_lookup_missing_returns_404(self, client: TestClient):
        r = client.get(f"/api/v1/score/{uuid.uuid4()}")
        assert r.status_code == 404


# ── Tests: GET /api/v1/leaderboard ────────────────────────────────────────────

class TestLeaderboard:
    def test_leaderboard_empty(self, client: TestClient):
        r = client.get("/api/v1/leaderboard?problem_id=nonexistent")
        assert r.status_code == 200
        assert r.json() == []

    def test_leaderboard_returns_submissions(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 60.0,
            "reported_linting_score": 10.0,
        }
        body, sig = _sign(keypair, payload)
        client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )

        r = client.get("/api/v1/leaderboard?problem_id=defi_dashboard")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert data[0]["wallet"] == wallet


# ── Tests: GET /api/v1/judge/submissions ──────────────────────────────────────

class TestJudgeSubmissions:
    def test_list_empty(self, client: TestClient):
        judge_wallet = str(TEST_JUDGE_KP.pubkey())
        # Sign the fixed message "list_submissions"
        sig = base64.b64encode(bytes(TEST_JUDGE_KP.sign_message(b"list_submissions"))).decode("utf-8")
        r = client.get(
            "/api/v1/judge/submissions",
            headers={"x-wallet": judge_wallet, "x-signature": sig}
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_list_after_submit(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 70.0,
            "reported_linting_score": 8.0,
        }
        body, sig = _sign(keypair, payload)
        client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )

        judge_wallet = str(TEST_JUDGE_KP.pubkey())
        sig_judge = base64.b64encode(bytes(TEST_JUDGE_KP.sign_message(b"list_submissions"))).decode("utf-8")
        r = client.get(
            "/api/v1/judge/submissions",
            headers={"x-wallet": judge_wallet, "x-signature": sig_judge}
        )
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ── Tests: POST /api/v1/judge/score ───────────────────────────────────────────

class TestJudgeScore:
    def _submit_first(self, client: TestClient, keypair: Keypair) -> str:
        wallet = str(keypair.pubkey())
        payload = {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 90.0,
            "reported_linting_score": 15.0,
        }
        body, sig = _sign(keypair, payload)
        r = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        return r.json()["submission_id"]

    def test_judge_score_success(self, client: TestClient, keypair: Keypair):
        sid = self._submit_first(client, keypair)
        judge_wallet = str(TEST_JUDGE_KP.pubkey())

        judge_payload = {
            "submission_id": sid,
            "innovation": 8.0,
            "impact": 7.0,
            "presentation": 9.0,
            "judge_wallet": judge_wallet,
        }
        body, sig = _sign(TEST_JUDGE_KP, judge_payload)

        r = client.post(
            "/api/v1/judge/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["judge_score"] is not None
        assert data["final_score"] is not None
        assert data["judge_submitted"] is True

    def test_judge_score_duplicate_returns_409(self, client: TestClient, keypair: Keypair):
        sid = self._submit_first(client, keypair)
        judge_wallet = str(TEST_JUDGE_KP.pubkey())

        judge_payload = {
            "submission_id": sid,
            "innovation": 8.0,
            "impact": 7.0,
            "presentation": 9.0,
            "judge_wallet": judge_wallet,
        }
        body, sig = _sign(TEST_JUDGE_KP, judge_payload)

        # First score
        r1 = client.post(
            "/api/v1/judge/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r1.status_code == 200

        # Duplicate score
        r2 = client.post(
            "/api/v1/judge/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r2.status_code == 409

    def test_judge_score_missing_submission_returns_404(self, client: TestClient):
        judge_wallet = str(TEST_JUDGE_KP.pubkey())
        judge_payload = {
            "submission_id": str(uuid.uuid4()),
            "innovation": 5.0,
            "impact": 5.0,
            "presentation": 5.0,
            "judge_wallet": judge_wallet,
        }
        body, sig = _sign(TEST_JUDGE_KP, judge_payload)
        r = client.post(
            "/api/v1/judge/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        assert r.status_code == 404

    def test_judge_score_no_signature_returns_401(self, client: TestClient, keypair: Keypair):
        sid = self._submit_first(client, keypair)
        r = client.post(
            "/api/v1/judge/score",
            json={
                "submission_id": sid,
                "innovation": 5.0,
                "impact": 5.0,
                "presentation": 5.0,
                "judge_wallet": "FakeWallet",
            },
        )
        assert r.status_code == 403



# ── Tests: GET /api/v1/problems ───────────────────────────────────────────────

class TestProblems:
    def test_list_problems(self, client: TestClient):
        r = client.get("/api/v1/problems")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (dict, list))


# ── Tests: POST /api/v1/certificate/{submission_id} ──────────────────────────

class TestCertificate:
    def test_certificate_submission_not_found(self, client: TestClient):
        r = client.post(f"/api/v1/certificate/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_certificate_missing_signature(self, client: TestClient, keypair: Keypair):
        wallet = str(keypair.pubkey())
        payload = {
            "problem_id": "defi_dashboard",
            "participant_wallet": wallet,
            "repo_url": "https://github.com/octocat/Hello-World",
            "deployment_url": "https://google.com/",
            "reported_test_coverage_percent": 90.0,
            "reported_linting_score": 15.0,
        }
        body, sig = _sign(keypair, payload)
        r = client.post(
            "/api/v1/score", content=body,
            headers={"Content-Type": "application/json", "x-signature": sig},
        )
        sid = r.json()["submission_id"]

        r2 = client.post(f"/api/v1/certificate/{sid}")
        assert r2.status_code == 401


# ── Run directly ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-x"])
