from fastapi import FastAPI
from app.api.routes import score

app = FastAPI(title="JudgeChain Backend MVP")

app.include_router(score.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "JudgeChain Scoring Engine MVP API is running."}
