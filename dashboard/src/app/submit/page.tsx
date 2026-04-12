"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { Navbar } from "../components/Navbar";
import { SolscanLink } from "@/components/SolscanLink";
import { api } from "@/lib/api";
import { useProgram, getSubmissionPda, getScorePda, PROGRAM_ID } from "@/lib/useProgram";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata, SystemScore } from "@/types";

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
      // 1. Sign
      let signature = "";
      if (signMessage) {
        const bodyStr = JSON.stringify(payload);
        const msgBytes = new TextEncoder().encode(bodyStr);
        const sigBytes = await signMessage(msgBytes);
        signature = Buffer.from(sigBytes).toString("base64");
      }

      // 2. Submit to Backend
      const scoreData = await api.submitScore(payload, signature);
      setResult(scoreData);
      toast.success("Scoring complete!", { id: scoringToast });

      // 3. On-chain Write (Optional/Auto)
      if (program && publicKey) {
        const chainToast = toast.loading("Recording on-chain...");
        try {
          const [submissionPda] = getSubmissionPda(HACKATHON_PUBKEY, publicKey);
          const [scorePda] = getScorePda(submissionPda);

          // Try create submission if not exists
          try {
            await (program as any).methods
              .createSubmission(form.problem_id, form.repo_url, form.deployment_url)
              .accounts({
                participant: publicKey,
                hackathon: HACKATHON_PUBKEY,
                submission: submissionPda,
                systemProgram: web3.SystemProgram.programId,
              })
              .rpc();
          } catch (e) { /* ignore if exists */ }

          const sig = await (program as any).methods
            .scoreSubmission(scoreData.system_score.total, 0, "")
            .accounts({
              judge: publicKey,
              submission: submissionPda,
              scoreHash: scorePda,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();
            
          setTxSig(sig);
          toast.success("Recorded on Solana!", { id: chainToast });
        } catch (err: any) {
          toast.warning(`On-chain record skipped: ${err.message}`, { id: chainToast });
        }
      }
    } catch (err: any) {
      toast.error(err.message, { id: scoringToast });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-lg rounded-xl border border-card-border p-8 bg-card shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Submit Project</h1>
          <p className="text-sm mb-6 text-muted">
            {publicKey ? `Connected: ${publicKey.toBase58().slice(0, 8)}...` : "Please connect your wallet"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium block mb-1 uppercase tracking-wider text-muted">Problem</label>
              <select
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all"
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

            {[
              { id: "repo_url", label: "Repo URL", type: "url", placeholder: "https://github.com/..." },
              { id: "deployment_url", label: "Deployment URL", type: "url", placeholder: "https://..." }
            ].map(field => (
              <div key={field.id}>
                <label className="text-xs font-medium block mb-1 uppercase tracking-wider text-muted">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-all"
                  value={(form as any)[field.id]}
                  onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                  required
                />
              </div>
            ))}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium uppercase tracking-wider text-muted">Coverage %</label>
                <span className="text-accent font-mono font-bold text-sm">{form.coverage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-accent h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer"
                value={form.coverage}
                onChange={(e) => setForm({ ...form, coverage: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !publicKey}
              className="mt-4 py-2.5 rounded-md text-sm font-bold bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-md active:scale-[0.98]"
            >
              {isLoading ? "Analyzing..." : "Submit & Score"}
            </button>
          </form>

          {result && (
            <div className="mt-8 p-6 rounded-lg border border-card-border bg-background/50 animate-in fade-in duration-500">
              <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Score Breakdown</h3>
              <table className="w-full text-sm">
                <tbody>
                  {(Object.entries(result.system_score) as [keyof SystemScore, number][]).map(([key, value]) => (
                    <tr key={key} className={key === "total" ? "border-t border-border font-bold text-base" : ""}>
                      <td className="py-2 text-muted">{SCORE_FIELD_LABELS[key]}</td>
                      <td className={`py-2 text-right ${key === "total" ? "text-accent" : "text-foreground"}`}>
                        {value} {key === "total" && <span className="text-xs text-muted font-normal">/ 70</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(txSig || result.tx_hash) && (
                <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted font-mono">TX Proof:</span>
                  <SolscanLink tx={txSig || result.tx_hash || ""} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
