import sys
import os
import json
import base64

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from solders.keypair import Keypair

client = TestClient(app)

def test_score_endpoint():
    kp = Keypair()
    wallet = str(kp.pubkey())
    
    payload = {
        "problem_id": "defi_dashboard",
        "participant_wallet": wallet,
        "repo_url": "https://github.com/Inmodel-Labs/hackathon-submission-pineapples",
        "deployment_url": "https://google.com/",
        "reported_test_coverage_percent": 90.0,
        "reported_linting_score": 15.0
    }
    
    body_bytes = json.dumps(payload).encode('utf-8')
    sig = kp.sign_message(body_bytes)
    sig_b64 = base64.b64encode(bytes(sig)).decode('utf-8')

    print("Testing POST /api/v1/score ...")
    response = client.post("/api/v1/score", content=body_bytes, headers={"x-signature": sig_b64, "Content-Type": "application/json"})
    if response.status_code == 200:
        print("Success! Response JSON:")
        print(response.json())
    else:
        print(f"Failed with status code {response.status_code}:")
        print(response.text)

if __name__ == "__main__":
    test_score_endpoint()
