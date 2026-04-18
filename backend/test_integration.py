import requests
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_user_profile():
    # Test Create/Update
    payload = {
        "uid": "test_uid_123",
        "email": "test@example.com",
        "wallet_address": "FHVLbTJfZQDASRm51WP2NPARMdfU6xTnRNgQMaxawxXx"
    }
    print("Testing User Profile Create/Update...")
    try:
        resp = requests.post(f"{BASE_URL}/user/profile", json=payload)
        print(f"POST Response: {resp.status_code}, {resp.json()}")
        
        # Test Get
        resp = requests.get(f"{BASE_URL}/user/profile?uid=test_uid_123")
        print(f"GET Response: {resp.status_code}, {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_health():
    print("Testing Health Endpoint...")
    try:
        resp = requests.get("http://localhost:8000/health")
        print(f"Health Response: {resp.status_code}, {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Note: This requires the backend to be running
    test_health()
    test_user_profile()
