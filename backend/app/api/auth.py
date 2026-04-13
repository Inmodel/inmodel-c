import base64
from typing import Union
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from solders.pubkey import Pubkey
from fastapi import HTTPException

def verify_solana_signature(wallet_address: str, message: Union[str, bytes], signature_b64: str) -> bool:
    """
    Verifies an Ed25519 signature from a Solana wallet.
    
    :param wallet_address: The public key of the signer (Base58).
    :param message: The original message that was signed (str or bytes).
    :param signature_b64: The signature in Base64 format.
    :return: True if valid, False otherwise.
    """
    try:
        # 1. Decode signature and public key
        sig_bytes = base64.b64decode(signature_b64)
        pubkey = Pubkey.from_string(wallet_address)
        
        # 2. Extract raw bytes from Pubkey (it's 32 bytes)
        verify_key = VerifyKey(bytes(pubkey))
        
        # 3. Verify
        # Ensure we are checking the same format (bytes)
        encoded_message = message if isinstance(message, bytes) else message.encode('utf-8')
        verify_key.verify(encoded_message, sig_bytes)
        return True
    except (BadSignatureError, ValueError, Exception) as e:
        # Log failure but return bool
        print(f"[AUTH] Signature verification failed for {wallet_address}: {str(e)}")
        return False

def require_solana_signature(wallet_address: str, message: Union[str, bytes], signature_b64: str):
    """Raise HTTPException if signature is invalid."""
    if not signature_b64:
        raise HTTPException(status_code=401, detail="Missing signature")
    if not verify_solana_signature(wallet_address, message, signature_b64):
        raise HTTPException(status_code=401, detail="Invalid signature")
