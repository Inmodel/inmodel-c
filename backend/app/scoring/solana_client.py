import os
import asyncio
import logging
from pathlib import Path
from solana.rpc.async_api import AsyncClient
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from anchorpy import Provider, Wallet, Program, Idl

logger = logging.getLogger(__name__)

# Constants - Should reflect Devnet state
RPC_URL = os.getenv("ANCHOR_PROVIDER_URL", "https://api.devnet.solana.com")
PROGRAM_ID_STR = os.getenv("PROGRAM_ID", "9vBoPV2ZzcbVPWGzJhA31SDYRZ3efwLZ2HH6BfBLvnm2")
WALLET_PATH = os.path.expanduser(os.getenv("ANCHOR_WALLET", "~/.config/solana/id.json"))

async def record_score_on_chain(participant_wallet_str: str, system_score: int, judge_score: int, ipfs_cid: str = ""):
    """
    Calls the Anchor program to record technical scores on Solana Devnet.
    Derives necessary PDAs: Hackathon -> Submission -> Score
    """
    try:
        # 1. Load the Idl
        idl_path = Path(__file__).parent.parent.parent.parent / "target" / "idl" / "judgechain.json"
        if not idl_path.exists():
            logger.error(f"IDL file not found at {idl_path}")
            return None

        with open(idl_path, "r") as f:
            idl_json = f.read()
        idl = Idl.from_json(idl_json)

        # 2. Setup Provider & Wallet
        if not os.path.exists(WALLET_PATH):
            logger.warning(f"Judge wallet not found at {WALLET_PATH}. Skipping on-chain record.")
            return None

        with open(WALLET_PATH, "r") as f:
            secret = list(map(int, f.read().strip("[]").split(",")))
        
        judge_keypair = Keypair.from_bytes(bytes(secret))
        wallet = Wallet(judge_keypair)
        
        async with AsyncClient(RPC_URL) as client:
            provider = Provider(client, wallet)
            program_id = Pubkey.from_string(PROGRAM_ID_STR)
            program = Program(idl, program_id, provider)

            # 3. Derive PDAs
            participant_pubkey = Pubkey.from_string(participant_wallet_str)
            organizer_pubkey = judge_keypair.pubkey()

            # Hackathon PDA: [b"hackathon", organizer]
            hackathon_pda, _ = Pubkey.find_program_address(
                [b"hackathon", bytes(organizer_pubkey)],
                program_id
            )

            # Submission PDA: [b"submission", hackathon, participant]
            submission_pda, _ = Pubkey.find_program_address(
                [b"submission", bytes(hackathon_pda), bytes(participant_pubkey)],
                program_id
            )
            
            # Score PDA: [b"score", submission]
            score_pda, _ = Pubkey.find_program_address(
                [b"score", bytes(submission_pda)],
                program_id
            )

            # 4. Execute score_submission instruction
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

            logger.info(f"On-chain score recorded! Signature: {tx_sig}")
            return str(tx_sig)

    except Exception as e:
        logger.error(f"Failed to record score on Solana: {str(e)}")
        return None
