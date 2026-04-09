import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_score_endpoint():
    payload = {
        "problem_id": "defi_dashboard",
        "participant_wallet": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
        "repo_url": "https://github.com/Inmodel-Labs/hackathon-submission-pineapples",
        "deployment_url": "https://google.com/",
        "reported_test_coverage_percent": 90.0,
        "reported_linting_score": 15.0
    }

    print("Testing POST /api/v1/score ...")
    response = client.post("/api/v1/score", json=payload)
    if response.status_code == 200:
        print("Success! Response JSON:")
        print(response.json())
    else:
        print(f"Failed with status code {response.status_code}:")
        print(response.text)

if __name__ == "__main__":
    test_score_endpoint()
