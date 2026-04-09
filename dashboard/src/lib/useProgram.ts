import { Program, AnchorProvider, web3, Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import idl from "./idl.json";

export const PROGRAM_ID = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

export function useProgram(): Program | null {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    return new Program(idl as Idl, provider);
  }, [connection, wallet]);
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
