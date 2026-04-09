import base64
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from solders.pubkey import Pubkey

def verify_solana_signature(wallet_address: str, message: str, signature_b64: str) -> bool:
    """
    Verifies an Ed25519 signature from a Solana wallet.
    
    :param wallet_address: The public key of the signer (Base58).
    :param message: The original message that was signed.
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
        # Most wallets sign the raw bytes of the string
        verify_key.verify(message.encode('utf-8'), sig_bytes)
        return True
    except (BadSignatureError, ValueError, Exception) as e:
        print(f"Signature verification failed: {str(e)}")
        return False
