import os
import logging
import hashlib
import json
from pathlib import Path
from typing import Optional
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from anchorpy import Provider, Wallet, Program, Idl
from app.utils.retry import with_retry

logger = logging.getLogger(__name__)

RPC_URL = os.getenv("ANCHOR_PROVIDER_URL", "https://api.devnet.solana.com")
WALLET_PATH = os.path.expanduser(os.getenv("ANCHOR_WALLET", "~/.config/solana/id.json"))
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2")
HACKATHON_ID = int(os.getenv("HACKATHON_ID", "1337"))

_cached_program: Optional[Program] = None

async def get_program() -> Program:
    global _cached_program
    if _cached_program:
        return _cached_program

    idl_path = Path(__file__).parent.parent.parent / "judgechain.json"
    if not idl_path.exists():
        raise FileNotFoundError(f"IDL not found at {idl_path}")
    wallet_json = os.getenv("ANCHOR_WALLET_JSON")
    if wallet_json:
        keypair = Keypair.from_bytes(bytes(json.loads(wallet_json)))
    else:
        if not os.path.exists(WALLET_PATH):
            raise FileNotFoundError(f"Judge wallet not found at {WALLET_PATH}")

        with open(WALLET_PATH) as f:
            secret = list(map(int, f.read().strip("[]").split(",")))
        keypair = Keypair.from_bytes(bytes(secret))
    wallet = Wallet(keypair)

    with open(idl_path) as f:
        idl = Idl.from_json(f.read())

    client = AsyncClient(RPC_URL)
    provider = Provider(client, wallet)
    program_id = Pubkey.from_string(PROGRAM_ID_STR)
    _cached_program = Program(idl, program_id, provider)
    return _cached_program

def get_pdas(organizer: Pubkey, participant: Pubkey):
    program_id = Pubkey.from_string(PROGRAM_ID_STR)
    hackathon_pda, _ = Pubkey.find_program_address(
        [b"hackathon", bytes(organizer), HACKATHON_ID.to_bytes(4, "little")], 
        program_id
    )
    submission_pda, _ = Pubkey.find_program_address(
        [b"submission", bytes(hackathon_pda), bytes(participant)], 
        program_id
    )
    score_pda, _ = Pubkey.find_program_address(
        [b"score", bytes(submission_pda)], 
        program_id
    )
    cert_pda, _ = Pubkey.find_program_address(
        [b"certificate", bytes(submission_pda)], 
        program_id
    )
    return hackathon_pda, submission_pda, score_pda, cert_pda


@with_retry(max_attempts=3, backoff_base=2.0)
async def record_score_on_chain(
    submission_id: str, 
    participant_wallet: str,
    system_score: int, 
    judge_score: int, 
    final_score: int, 
    ipfs_cid: str = ""
) -> Optional[str]:
    logger.info(f"[CHAIN] Attempting on-chain record for {submission_id}")
    try:
        program = await get_program()
        organizer_keypair = program.provider.wallet.payer
        organizer_pubkey = organizer_keypair.pubkey()
        participant_pubkey = Pubkey.from_string(participant_wallet)

        hackathon_pda, submission_pda, score_pda, _ = get_pdas(organizer_pubkey, participant_pubkey)

        tx_sig = await program.rpc["score_submission"](
            system_score,
            judge_score,
            ipfs_cid,
            ctx={
                "accounts": {
                    "judge": organizer_pubkey,
                    "submission": submission_pda,
                    "hackathon": hackathon_pda,
                    "organizer": organizer_pubkey, # Must sign
                    "score_hash": score_pda,
                    "system_program": Pubkey.from_string("11111111111111111111111111111111"),
                }
            }
        )
        tx_str = str(tx_sig)
        logger.info(f"[CHAIN] Success. TX: {tx_str}")
        return tx_str

    except Exception as e:
        logger.error(f"[CHAIN] FAILED for {submission_id}: {e}")
        return None


@with_retry(max_attempts=3, backoff_base=2.0)
async def issue_certificate_on_chain(
    submission_id: str, 
    participant_wallet: str,
    metadata_uri: str
) -> Optional[str]:
    """Call the issue_certificate instruction on-chain."""
    logger.info(f"[CHAIN] Issuing certificate for {submission_id}")
    try:
        program = await get_program()
        organizer_pubkey = program.provider.wallet.payer.pubkey()
        participant_pubkey = Pubkey.from_string(participant_wallet)

        hackathon_pda, submission_pda, score_pda, cert_pda = get_pdas(organizer_pubkey, participant_pubkey)
        
        asset_keypair = Keypair()
        collection_pubkey = Pubkey.from_string(
            os.getenv("COLLECTION_PUBKEY", str(organizer_pubkey))
        )
        core_program_id = Pubkey.from_string(
            os.getenv("MPL_CORE_PROGRAM_ID", "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")
        )

        tx_sig = await program.rpc["issue_certificate"](
            metadata_uri,
            f"JudgeNod Certificate #{submission_id[:8]}",
            ctx={
                "accounts": {
                    "payer": organizer_pubkey,
                    "participant": participant_pubkey,
                    "submission": submission_pda,
                    "score_hash": score_pda,
                    "certificate": cert_pda,
                    "asset": asset_keypair.pubkey(),
                    "collection": collection_pubkey,
                    "hackathon": hackathon_pda,
                    "core_program": core_program_id,
                    "system_program": Pubkey.from_string("11111111111111111111111111111111"),
                },
                "signers": [asset_keypair],
            }
        )
        tx_str = str(tx_sig)
        logger.info(f"[CHAIN] Certificate issued. TX: {tx_str}")
        return tx_str

    except Exception as e:
        logger.error(f"[CHAIN] Certificate issuance FAILED for {submission_id}: {e}")
        return None
