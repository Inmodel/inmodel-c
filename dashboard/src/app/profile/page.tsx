"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { Navbar } from "../components/Navbar";
import { useProgram, getCertificatePda, getHackathonPda } from "../../lib/useProgram";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  certificate?: any;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: UserSubmission[] = data.map((s: any) => ({
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
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
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
            <div className="grid gap-6">
              {submissions.map((s) => (
                <div key={s.pubkey.toBase58()} className="bg-card border border-card-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">
                      {problems[s.account.problemId]?.title || s.account.problemId}
                    </h3>
                    <div className="flex gap-3 mb-4 text-xs font-mono text-muted">
                       <span>ID: {s.pubkey.toBase58().slice(0, 8)}...</span>
                       <a href={s.account.repoUrl} target="_blank" className="text-accent hover:underline">Repo ↗</a>
                    </div>

                    {s.score ? (
                      <div className="inline-flex items-center gap-4 bg-background px-4 py-2 rounded-xl border border-border">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Final Score</span>
                          <span className="text-xl font-black text-accent">{s.score.finalScore}</span>
                        </div>
                        <div className="h-8 w-px bg-border mx-2" />
                        <div className="flex flex-col">
                           <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Status</span>
                           <span className="text-xs font-bold text-foreground">
                             {s.score.finalScore >= 50 ? "✅ Qualified for Cert" : "❌ Below Threshold (50)"}
                           </span>
                        </div>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 bg-muted/5 text-muted px-3 py-1.5 rounded-lg text-sm border border-border/50">
                        <span className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                        Awaiting Judging
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center items-end min-w-[200px]">
                    {s.certificate ? (
                      <div className="bg-accent/10 text-accent border border-accent/20 px-6 py-4 rounded-2xl text-center w-full">
                        <div className="text-2xl mb-1">🏆</div>
                        <div className="text-sm font-bold uppercase tracking-tight">NFT Certificate Claimed</div>
                        <div className="text-[10px] opacity-70 mt-1 font-mono">Issued on Solana</div>
                      </div>
                    ) : s.score && s.score.finalScore >= 50 ? (
                      <button
                        onClick={() => claimCertificate(s)}
                        className="w-full bg-accent text-white px-6 py-4 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20 active:scale-95 flex flex-col items-center"
                      >
                        <span className="text-xl mb-1">🎓</span>
                        Claim Certificate NFT
                      </button>
                    ) : (
                      <div className="w-full bg-muted/5 border border-border/50 px-6 py-4 rounded-2xl text-center opacity-50 grayscale cursor-not-allowed">
                        <div className="text-2xl mb-1">🔒</div>
                        <div className="text-sm font-bold">Certificate Locked</div>
                        <div className="text-[10px] mt-1">Score 50+ to unlock</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
