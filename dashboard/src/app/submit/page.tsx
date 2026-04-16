"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { api } from "@/lib/api";
import { useProgram, getSubmissionPda } from "@/lib/useProgram";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata } from "@/types";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ChainConfirm } from "@/components/ui/ChainConfirm";

const HACKATHON_PUBKEY = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
              hackathon: HACKATHON_PUBKEY,
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



  return (
    <main className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 w-full max-w-7xl mx-auto items-start h-full h-min-screen">
      {/* 7col Left - Form */}
      <div className="col-span-1 md:col-span-7 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-6 md:p-8 flex flex-col">
        <h1 className="text-xl font-mono text-white uppercase tracking-widest mb-8 border-b border-[var(--bg-border)] pb-4">Submit Execution</h1>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">Problem Target</label>
              <select
                className="w-full bg-[var(--bg-base)] border border-[var(--bg-border)] text-white p-3 font-mono text-sm focus:outline-none focus:border-[var(--amber-base)] transition-colors"
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

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">Repository URL</label>
              <input 
                type="url" 
                className="w-full bg-[var(--bg-base)] border border-[var(--bg-border)] text-white p-3 font-mono text-sm focus:outline-none focus:border-[var(--amber-base)] transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="https://github.com/..."
                value={form.repo_url}
                onChange={(e) => setForm({...form, repo_url: e.target.value})}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">Deployment URL</label>
              <input 
                type="url" 
                className="w-full bg-[var(--bg-base)] border border-[var(--bg-border)] text-white p-3 font-mono text-sm focus:outline-none focus:border-[var(--amber-base)] transition-colors placeholder:text-[var(--text-muted)]"
                placeholder="https://..."
                value={form.deployment_url}
                onChange={(e) => setForm({...form, deployment_url: e.target.value})}
                required
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">Test Coverage</label>
                <span className="text-[var(--amber-base)] font-mono text-sm">{form.coverage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-1 bg-[var(--bg-border)] rounded-none appearance-none cursor-pointer accent-[var(--amber-base)]"
                value={form.coverage}
                onChange={(e) => setForm({ ...form, coverage: e.target.value })}
                style={{ background: `linear-gradient(to right, var(--amber-base) ${form.coverage}%, var(--bg-border) ${form.coverage}%)` }}
              />
            </div>

            <button type="submit" disabled={isLoading || !publicKey} className="mt-8 w-full bg-[var(--amber-base)] text-[#080A0C] font-mono font-bold uppercase tracking-widest py-4 hover:bg-[var(--amber-bright)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
               {isLoading ? "Executing..." : "Initialize Scoring \u2192"}
            </button>
            
            {!publicKey && (
               <div className="text-[var(--amber-bright)] font-mono text-xs mt-2 uppercase text-center w-full">Requires Wallet Connection</div>
            )}
        </form>
      </div>

      {/* 5col Right - Live Preview Panel */}
      <div className="col-span-1 md:col-span-5 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-6 md:p-8 flex flex-col items-center sticky top-24">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)] w-full mb-8 border-b border-[var(--bg-border)] pb-4 text-center">Live Evaluation Array</h2>

        <div className="w-full mb-10 text-sm font-mono flex flex-col gap-5">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center py-10 opacity-70">
               <span className="w-4 h-4 rounded-full bg-[var(--amber-base)] animate-ping mb-4"></span>
               <span className="text-[var(--amber-base)] animate-pulse">Analyzing repository...</span>
             </div>
           ) : result ? (
               <div className="space-y-5 animate-fade-in">
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="text-white w-32">Code Quality</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"><div className="bg-[var(--amber-base)] h-1 transition-all duration-1000" style={{width:`${(result.system_score.code_quality/18)*100}%`}}></div></div><span>{result.system_score.code_quality}/18</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="text-white w-32">Coverage</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"><div className="bg-[var(--amber-base)] h-1 transition-all duration-1000" style={{width:`${(result.system_score.test_coverage/18)*100}%`}}></div></div><span>{result.system_score.test_coverage}/18</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="text-white w-32">Health</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"><div className="bg-[var(--amber-base)] h-1 transition-all duration-1000" style={{width:`${(result.system_score.deployment_health/14)*100}%`}}></div></div><span>{result.system_score.deployment_health}/14</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="text-white w-32">Documentation</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"><div className="bg-[var(--amber-base)] h-1 transition-all duration-1000" style={{width:`${(result.system_score.documentation/10)*100}%`}}></div></div><span>{result.system_score.documentation}/10</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="text-white w-32">Custom Criteria</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"><div className="bg-[var(--amber-base)] h-1 transition-all duration-1000" style={{width:`${(result.system_score.custom_criteria/10)*100}%`}}></div></div><span>{result.system_score.custom_criteria}/10</span></div>
               </div>
           ) : (
               <div className="space-y-5 opacity-40">
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="w-32">Code Quality</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"></div><span>0/18</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="w-32">Coverage</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"></div><span>0/18</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="w-32">Health</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"></div><span>0/14</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="w-32">Documentation</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"></div><span>0/10</span></div>
                 <div className="flex justify-between items-center text-[var(--text-secondary)]"><span className="w-32">Custom Criteria</span><div className="flex-1 bg-[var(--bg-border)] h-1 mx-4"></div><span>0/10</span></div>
               </div>
           )}
        </div>

        <div className="mt-4 flex flex-col items-center">
          <ScoreRing score={result ? result.system_score.total : 0} max={70} size={140} />
          {result && <div className="mt-8 font-mono text-[10px] text-[var(--amber-base)] uppercase tracking-widest bg-[var(--amber-glow)] px-3 py-1 animate-fade-in border border-[var(--amber-base)]/20">Analysis Complete</div>}
        </div>

        {txSig && (
          <div className="w-full mt-12 animate-fade-in flex flex-col">
            <ChainConfirm txHash={txSig} />
          </div>
        )}
      </div>
    </main>
  );
}
