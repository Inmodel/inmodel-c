"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";

import { useProgram, getCertificatePda, getHackathonPda } from "../../lib/useProgram";
import { BentoCard } from "../../components/ui/BentoCard";
import { toast } from "sonner";

// For MVP, we use the same hardcoded hackathon
const ORGANIZER_PUBKEY = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
const CORE_PROGRAM_ID = new web3.PublicKey("CoREMoSNo1XUanH6K2D9hM74G3T4qLw1T8S9L6V5S9S"); // Actual Metaplex Core ID

type UserSubmission = {
  pubkey: web3.PublicKey;
  account: {
    problemId: string;
    repoUrl: string;
  };
  score?: {
    finalScore: number;
    judgeScore: number;
    systemScore: number;
  };
  certificate?: unknown;
};

type ApiSubmission = {
  wallet: string;
  problem_id: string;
  repo_url: string;
  system_score?: { total: number };
  judge_score?: number;
  final_score?: number;
  certificate?: unknown;
  submission_id: string;
};

export default function ProfilePage() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [problems, setProblems] = useState<Record<string, { title: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/problems")
      .then(res => res.json())
      .then(setProblems)
      .catch(() => console.warn("Could not load problem titles."));
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/submissions?wallet=${publicKey.toBase58()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiSubmission[] = await res.json();
      const mapped: UserSubmission[] = data.map((s) => ({
        pubkey: new web3.PublicKey(s.wallet),
        account: { problemId: s.problem_id, repoUrl: s.repo_url ?? "" },
        score: s.system_score
          ? { systemScore: s.system_score.total, judgeScore: s.judge_score ?? 0, finalScore: s.final_score ?? s.system_score.total }
          : undefined,
        certificate: s.certificate ?? null,
        submissionId: s.submission_id,
      }));
      setSubmissions(mapped);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load your projects.");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) return;
    fetchUserData();
  }, [publicKey, fetchUserData]);

  async function claimCertificate(sub: UserSubmission) {
    if (!publicKey || !program) return;
    
    const toastId = toast.loading("Minting your On-Chain Certificate...");
    try {
      const [certPda] = getCertificatePda(sub.pubkey);
      const [hackathonPda] = getHackathonPda(ORGANIZER_PUBKEY);
      const assetKeypair = web3.Keypair.generate();
      
      // Note: In a real app, 'collection' would be fetched from the Hackathon account
      // For this MVP, we assume a collection might be passed or hardcoded
      const collectionMint = web3.Keypair.generate().publicKey; // Placeholder

      const [scorePda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("score"), sub.pubkey.toBuffer()],
        program.programId
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program as any).methods
        .issueCertificate(
          "https://judgechain.io/metadata/cert.json", 
          `JudgeChain: ${problems[sub.account.problemId]?.title || "Winner"}`
        )
        .accounts({
          payer: publicKey,
          participant: publicKey,
          submission: sub.pubkey,
          scoreHash: scorePda,
          certificate: certPda,
          asset: assetKeypair.publicKey,
          collection: collectionMint, 
          hackathon: hackathonPda,
          coreProgram: CORE_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([assetKeypair])
        .rpc();

      toast.success("Certificate minted! Check your wallet.", { id: toastId });
      fetchUserData();
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || "Minting failed", { id: toastId });
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex flex-col items-center px-6 py-16 flex-1 text-foreground">
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-2">My Projects</h1>
          <p className="text-muted mb-10">Manage your submissions and claim earned certificates.</p>

          {!publicKey ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <p className="text-muted mb-4">Please connect your wallet to view your projects.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
               <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/50">
              <p className="text-muted">You haven&apos;t submitted any projects yet.</p>
              <Link href="/submit" className="text-accent hover:underline mt-2 inline-block font-medium">
                Submit your first project →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl xl:max-w-7xl mx-auto">
              {submissions.map((s) => {
                const title = problems[s.account.problemId]?.title || s.account.problemId;
                const isQualified = s.score && s.score.finalScore >= 50;
                const scoreDisplay = s.score ? String(s.score.finalScore) : 'PND';
                
                let actionText = undefined;
                let icon = '🚀';
                let tagText = 'AWAITING JUDGING';
                
                if (s.certificate) {
                  tagText = `SCORE: ${scoreDisplay} — MINTED`;
                  icon = '🏆';
                } else if (isQualified) {
                  tagText = `VERIFIED: ${scoreDisplay} — UNLOCKED`;
                  actionText = 'Claim NFT';
                } else if (s.score) {
                  tagText = `SCORE: ${scoreDisplay} — LOCKED`;
                  icon = '🔒';
                }

                return (
                  <BentoCard
                    key={s.pubkey.toBase58()}
                    title={title}
                    subtitle={
                      <div className="flex flex-col gap-1">
                        <span>ID: {s.pubkey.toBase58().slice(0, 8)}...</span>
                        <a href={s.account.repoUrl} target="_blank" className="hover:text-[#BAC4D6] transition-colors leading-none">Repository ↗</a>
                      </div>
                    }
                    tagText={tagText}
                    icon={icon}
                    actionText={actionText}
                    onAction={isQualified && !s.certificate ? () => claimCertificate(s) : undefined}
                    disabled={!!s.certificate || !isQualified}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
