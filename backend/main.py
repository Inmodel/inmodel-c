import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.api.routes import score, judge, problems
from app.api.routes.certificate import router as certificate_router
from app.api.routes.events import router as events_router
from app.api.routes.submissions import router as submissions_router
from app.api.routes.metadata import router as metadata_router
from app.api.routes.github_auth import router as github_auth_router
from app.api.routes.organizer import router as organizer_router
from app.api.routes.user import router as user_router
from app.database import init_db
from app.security import setup_security_logger

# Configure main logging
logging.basicConfig(level=logging.INFO)

# Configure security logging
security_logger = setup_security_logger("security")
injection_logger = setup_security_logger("security.injection")
gaming_logger = setup_security_logger("security.gaming")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="JudgeNod Backend", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://hacknod.inmodel.in,https://api.judgechain.xyz").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(score.router, prefix="/api/v1")
app.include_router(judge.router, prefix="/api/v1")
app.include_router(problems.router, prefix="/api/v1")
app.include_router(certificate_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(submissions_router, prefix="/api/v1")
app.include_router(metadata_router, prefix="/api/v1")
app.include_router(github_auth_router, prefix="/api/v1")
app.include_router(organizer_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "JudgeNod Scoring Engine is running."}

# UX Redirects for Production Deployment
from fastapi.responses import RedirectResponse

@app.get("/deployment")
@app.get("/docs/deploy")
@app.get("/docs/deployment")
def redirect_to_docs():
    return RedirectResponse(url="https://hacknod.inmodel.in/docs/deployment")

@app.get("/docs")
@app.get("/docs/introduction")
def redirect_to_intro():
    return RedirectResponse(url="https://hacknod.inmodel.in/docs/introduction")

@app.get("/health")
@app.get("/h")
def health():
    return {
        "status": "ok",
        "program_id": os.getenv("PROGRAM_ID"),
        "network": "devnet"
    }

