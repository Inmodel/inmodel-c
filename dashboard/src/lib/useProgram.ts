import { Program, AnchorProvider, setProvider, web3 } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import idl from "../idl/judgechain.json";
import type { Judgechain } from "../idl/judgechain";

// Program ID: Use NEXT_PUBLIC_PROGRAM_ID or fallback to hardcoded
export const PROGRAM_ID = new web3.PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

export function useProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  if (!wallet) return null;
  const provider = new AnchorProvider(connection, wallet, {});
  setProvider(provider);
  return new Program<Judgechain>(idl as unknown as Judgechain, provider);
}

export function getSubmissionPda(hackathonPubkey: web3.PublicKey, participantPubkey: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("submission"), hackathonPubkey.toBuffer(), participantPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getScorePda(submissionPubkey: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("score"), submissionPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getCertificatePda(submissionPubkey: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("certificate"), submissionPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export function getHackathonPda(organizerPubkey: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("hackathon"), organizerPubkey.toBuffer()],
    PROGRAM_ID
  );
}
