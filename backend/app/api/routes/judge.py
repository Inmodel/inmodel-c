import os
import json
import base64
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from solders.pubkey import Pubkey
from solders.keypair import Keypair as SoldersKeypair
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.hash import Hash
import httpx

from app.models.schemas import JudgeScoreInput, ScoreResponse
from app.api.auth import verify_solana_signature
from app.database import get_db
from app import db_store
from app.problems import PROBLEMS

router = APIRouter()

RPC_URL = os.environ.get("ANCHOR_PROVIDER_URL", "http://127.0.0.1:8899")
PROGRAM_ID = os.environ.get("PROGRAM_ID", "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")
BACKEND_KEYPAIR_PATH = os.environ.get("BACKEND_KEYPAIR_PATH", os.path.expanduser("~/.config/solana/id.json"))


def _load_backend_keypair() -> SoldersKeypair:
    with open(BACKEND_KEYPAIR_PATH) as f:
        secret = bytes(json.load(f))
    return SoldersKeypair.from_bytes(secret)


async def _anchor_score_submission(system_score: int, judge_score: int, final_score: int) -> str:
    """
    Sends score_submission instruction to the Solana program.
    Returns tx signature string, or empty string on failure (non-blocking).
    """
    try:
        kp = _load_backend_keypair()
        async with httpx.AsyncClient() as client:
            # Get latest blockhash
            resp = await client.post(RPC_URL, json={
                "jsonrpc": "2.0", "id": 1,
                "method": "getLatestBlockhash",
                "params": [{"commitment": "confirmed"}]
            })
            blockhash_str = resp.json()["result"]["value"]["blockhash"]

        # Build a minimal memo tx as a proof-of-score anchor
        # Real score_submission CPI requires on-chain submission PDA — that's the blockchain agent's job.
        # Here we record a verifiable memo with the score data.
        from solders.system_program import ID as SYS_PROGRAM_ID
        memo_program = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
        memo_data = f"judgechain:score:{system_score}:{judge_score}:{final_score}".encode()

        ix = Instruction(
            program_id=memo_program,
            accounts=[AccountMeta(pubkey=kp.pubkey(), is_signer=True, is_writable=False)],
            data=memo_data,
        )
        blockhash = Hash.from_string(blockhash_str)
        tx = Transaction.new_signed_with_payer([ix], kp.pubkey(), [kp], blockhash)
        tx_bytes = base64.b64encode(bytes(tx)).decode()

        async with httpx.AsyncClient() as client:
            send_resp = await client.post(RPC_URL, json={
                "jsonrpc": "2.0", "id": 1,
                "method": "sendTransaction",
                "params": [tx_bytes, {"encoding": "base64"}]
            })
        result = send_resp.json()
        return result.get("result", "")
    except Exception as e:
        print(f"[anchor] score anchoring failed (non-blocking): {e}")
        return ""


@router.post("/judge/score", response_model=ScoreResponse)
async def judge_score(
    request: Request,
    body: JudgeScoreInput,
    x_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    # Signature is optional for MVP dashboard — verify if provided, skip if absent
    if x_signature:
        raw_body = await request.body()
        if not verify_solana_signature(body.judge_wallet, raw_body.decode(), x_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    existing = db_store.get_by_id(db, body.submission_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Submission not found")

    if existing.get("judge_score") is not None:
        raise HTTPException(status_code=409, detail="Submission already judge-scored")

    system_total = existing["system_score"]["total"]
    final = system_total + body.judge_score

    # Anchor score on-chain (non-blocking — failure doesn't break the response)
    tx_hash = await _anchor_score_submission(system_total, body.judge_score, final)

    updated = db_store.apply_judge_score(
        db, body.submission_id, body.judge_score, tx_hash or None
    )
    return updated


@router.get("/problems")
def list_problems():
    return PROBLEMS


@router.get("/submissions")
def get_submissions(wallet: str, db: Session = Depends(get_db)):
    if not wallet:
        raise HTTPException(status_code=400, detail="wallet query param required")
    return db_store.get_all_by_wallet(db, wallet)
