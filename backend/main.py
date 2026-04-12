import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import score, judge
from app.api.routes.certificate import router as certificate_router
from app.database import init_db

logging.basicConfig(level=logging.INFO)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="JudgeChain Backend", lifespan=lifespan)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router, prefix="/api/v1")
app.include_router(judge.router, prefix="/api/v1")
app.include_router(certificate_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "JudgeChain Scoring Engine is running."}
