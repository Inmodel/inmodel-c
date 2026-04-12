import os
import logging
from pathlib import Path
from typing import Optional
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from anchorpy import Provider, Wallet, Program, Idl

logger = logging.getLogger(__name__)

RPC_URL = os.getenv("ANCHOR_PROVIDER_URL", "https://api.devnet.solana.com")
WALLET_PATH = os.path.expanduser(os.getenv("ANCHOR_WALLET", "~/.config/solana/id.json"))

def _load_program_id() -> str:
    env_id = os.getenv("PROGRAM_ID")
    if env_id:
        return env_id
    txt = Path(__file__).parent.parent.parent.parent / "PROGRAM_ID.txt"
    if txt.exists():
        return txt.read_text().strip()
    return "9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2"

PROGRAM_ID_STR = _load_program_id()


async def record_score_on_chain(submission_id: str, system_score: int, judge_score: int, final_score: int, ipfs_cid: str = "") -> Optional[str]:
    logger.info(f"[CHAIN] Attempting on-chain record for {submission_id}")
    try:
        idl_path = Path(__file__).parent.parent.parent / "judgechain.json"
        if not idl_path.exists():
            logger.error(f"[CHAIN] IDL not found at {idl_path}")
            return None

        if not os.path.exists(WALLET_PATH):
            logger.warning(f"[CHAIN] Judge wallet not found at {WALLET_PATH}. Skipping.")
            return None

        with open(WALLET_PATH) as f:
            secret = list(map(int, f.read().strip("[]").split(",")))

        judge_keypair = Keypair.from_bytes(bytes(secret))
        wallet = Wallet(judge_keypair)

        with open(idl_path) as f:
            idl = Idl.from_json(f.read())

        async with AsyncClient(RPC_URL) as client:
            provider = Provider(client, wallet)
            program_id = Pubkey.from_string(PROGRAM_ID_STR)
            program = Program(idl, program_id, provider)

            organizer_pubkey = judge_keypair.pubkey()

            hackathon_pda, _ = Pubkey.find_program_address(
                [b"hackathon", bytes(organizer_pubkey)], program_id
            )
            participant_pubkey = Pubkey.from_string(submission_id) if len(submission_id) == 44 else organizer_pubkey
            submission_pda, _ = Pubkey.find_program_address(
                [b"submission", bytes(hackathon_pda), bytes(participant_pubkey)], program_id
            )
            score_pda, _ = Pubkey.find_program_address(
                [b"score", bytes(submission_pda)], program_id
            )

            tx_sig = await program.rpc["score_submission"](
                system_score,
                judge_score,
                ipfs_cid,
                ctx={
                    "accounts": {
                        "judge": organizer_pubkey,
                        "submission": submission_pda,
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
        raise


async def issue_certificate(submission_id: str, metadata_uri: str) -> Optional[str]:
    """Alias to record_score_on_chain for certificate minting."""
    logger.info(f"[CHAIN] Issuing certificate for {submission_id}")
    try:
        return await record_score_on_chain(submission_id, 0, 0, 0, metadata_uri)
    except Exception as e:
        logger.error(f"[CHAIN] Certificate issuance FAILED for {submission_id}: {e}")
        return None
