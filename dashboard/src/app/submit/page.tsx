"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { api } from "@/lib/api";
import { useProgram, getSubmissionPda } from "@/lib/useProgram";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata, SystemScore } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ChainConfirm } from "@/components/ui/ChainConfirm";

const HACKATHON_PUBKEY = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const SCORE_FIELD_LABELS: Record<keyof SystemScore, string> = {
  code_quality: "Code Quality",
  test_coverage: "Test Coverage",
  deployment_health: "Deployment Health",
  documentation: "Documentation",
  custom_criteria: "Custom Criteria",
  total: "Total",
};

export default function SubmitPage() {
  const { publicKey, signMessage } = useWallet();
  const program = useProgram();
  const [form, setForm] = useState({
    problem_id: "",
    repo_url: "",
    deployment_url: "",
    coverage: "0",
  });
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);

  useEffect(() => {
    api.getProblems()
      .then(setProblems)
      .catch((err) => toast.error(err.message));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return toast.error("Connect your wallet first.");
    if (!form.problem_id) return toast.error("Please select a problem.");

    setResult(null);
    setTxSig(null);
    setIsLoading(true);

    const payload = {
      problem_id: form.problem_id,
      participant_wallet: publicKey.toBase58(),
      repo_url: form.repo_url,
      deployment_url: form.deployment_url,
      reported_test_coverage_percent: parseFloat(form.coverage) || 0,
    };

    const scoringToast = toast.loading("AI is analyzing your submission...");

    try {
      let signature = "";
      if (signMessage) {
        const bodyStr = JSON.stringify(payload);
        const msgBytes = new TextEncoder().encode(bodyStr);
        const sigBytes = await signMessage(msgBytes);
        signature = Buffer.from(sigBytes).toString("base64");
      }

      const scoreData = await api.submitScore(payload, signature);
      setResult(scoreData);
      toast.success("Scoring complete!", { id: scoringToast });

      if (program && publicKey) {
        const chainToast = toast.loading("Recording on-chain...");
        try {
          const [submissionPda] = getSubmissionPda(HACKATHON_PUBKEY, publicKey);

          try {
            await program.methods
              .createSubmission(form.problem_id, form.repo_url, form.deployment_url)
              .accounts({
                participant: publicKey,
                hackathon: HACKATHON_PUBKEY,
              })
              .rpc();
          } catch { /* ignore if exists */ }

          const sig = await program.methods
            .scoreSubmission(scoreData.system_score.total, 0, "")
            .accounts({
              judge: publicKey,
              submission: submissionPda,
            })
            .rpc();
            
          setTxSig(sig);
          toast.success("Recorded on Solana!", { id: chainToast });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          toast.warning(`On-chain record skipped: ${errorMessage}`, { id: chainToast });
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage, { id: scoringToast });
    } finally {
      setIsLoading(false);
    }
  }

  const previewScore = form.repo_url.length > 10 ? 30 : 0;

  return (
    <main className="content-area pt-8">
      <div className="bento-leader bg-surface border border-border p-6 rounded-lg">
        <h1 className="text-xl font-display uppercase tracking-widest mb-6">Submit Execution</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="input-label">Problem Target</label>
              <select
                className="input-field"
                value={form.problem_id}
                onChange={(e) => setForm({ ...form, problem_id: e.target.value })}
                required
              >
                <option value="">Select a challenge...</option>
                {Object.entries(problems).map(([id, meta]) => (
                  <option key={id} value={id}>{meta.title}</option>
                ))}
              </select>
            </div>

            <Input 
              label="Repository URL" 
              type="url" 
              placeholder="https://github.com/..."
              value={form.repo_url}
              onChange={(e) => setForm({...form, repo_url: e.target.value})}
              required
            />

            <Input 
              label="Deployment URL" 
              type="url" 
              placeholder="https://..."
              value={form.deployment_url}
              onChange={(e) => setForm({...form, deployment_url: e.target.value})}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="input-label">Test Coverage</label>
                <span className="text-amber-base font-data text-sm">{form.coverage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-2 bg-elevated rounded appearance-none cursor-pointer border border-border"
                value={form.coverage}
                onChange={(e) => setForm({ ...form, coverage: e.target.value })}
                style={{ background: `linear-gradient(to right, var(--amber-base) ${form.coverage}%, var(--bg-elevated) ${form.coverage}%)` }}
              />
            </div>

            <Button type="submit" disabled={isLoading || !publicKey} className="mt-4 w-full">
               {isLoading ? "Executing..." : "Initialize Scoring"}
            </Button>
            
            {!publicKey && (
               <div className="text-red-base font-data text-xs mt-2 uppercase">Requires Wallet Connection</div>
            )}
        </form>
      </div>

      <div className="bento-score bg-surface border border-border p-6 rounded-lg flex flex-col items-center">
        <h2 className="text-sm font-data uppercase tracking-widest text-secondary w-full mb-6">Live Evaluation Array</h2>

        <div className="w-full mb-8">
           {result ? (
               <div className="space-y-4">
                 {(Object.entries(result.system_score) as [keyof SystemScore, number][]).filter(([k]) => k !== 'total').map(([key, value]) => (
                     <ScoreBar key={key} label={SCORE_FIELD_LABELS[key]} score={value} max={key === 'code_quality' ? 20 : (key === 'test_coverage' || key === 'deployment_health' || key === 'documentation') ? 15 : 5} />
                 ))}
               </div>
           ) : (
               <div className="space-y-4 opacity-50">
                 <ScoreBar label="Code Quality" score={previewScore > 0 ? 12 : 0} max={20} />
                 <ScoreBar label="Test Coverage" score={parseInt(form.coverage) > 0 ? parseInt(form.coverage)*0.15 : 0} max={15} />
                 <ScoreBar label="Deployment Health" score={0} max={15} />
                 <ScoreBar label="Documentation" score={0} max={15} />
               </div>
           )}
        </div>

        <div className="mt-auto flex flex-col items-center">
          <ScoreRing score={result ? result.system_score.total : previewScore} max={70} size={140} />
          {result && <div className="mt-4 font-data text-xs text-amber-base uppercase tracking-widest animate-pulse">Analysis Complete</div>}
        </div>

        {txSig && (
          <div className="w-full mt-8 animate-in slide-in-from-bottom flex flex-col">
            <ChainConfirm txHash={txSig} />
          </div>
        )}
      </div>
    </main>
  );
}
