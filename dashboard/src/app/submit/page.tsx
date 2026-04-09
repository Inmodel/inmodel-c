"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { Navbar } from "../components/Navbar";
import { useProgram, getSubmissionPda, getScorePda } from "../../lib/useProgram";

// Hardcoded devnet hackathon — replace with dynamic lookup once create_hackathon UI exists
const HACKATHON_PUBKEY = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

type ScoreResult = {
  system_score: { code_quality: number; test_coverage: number; deployment_health: number; documentation: number; custom_criteria: number; total: number };
};

type Step = "idle" | "scoring" | "writing" | "done";

export default function SubmitPage() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const [form, setForm] = useState({ problem_id: "", repo_url: "", deployment_url: "" });
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [txSig, setTxSig] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !program) return setError("Connect your wallet first.");
    setError(""); setResult(null); setTxSig("");

    // 1. Score via backend
    setStep("scoring");
    let scoreData: ScoreResult;
    try {
      const res = await fetch("http://localhost:8000/api/v1/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, participant_wallet: publicKey.toBase58() }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      scoreData = await res.json();
      setResult(scoreData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scoring failed.");
      setStep("idle");
      return;
    }

    // 2. Write score to chain
    setStep("writing");
    try {
      const [submissionPda] = getSubmissionPda(HACKATHON_PUBKEY, publicKey);
      const [scorePda] = getScorePda(submissionPda);

      // create_submission first (idempotent attempt — will fail if already exists, that's ok)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (program as any).methods
          .createSubmission(form.problem_id, form.repo_url, form.deployment_url)
          .accounts({ participant: publicKey, hackathon: HACKATHON_PUBKEY, submission: submissionPda, systemProgram: web3.SystemProgram.programId })
          .rpc();
      } catch {
        // submission already exists — continue to scoring
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sig = await (program as any).methods
        .scoreSubmission(scoreData.system_score.total, 0, "")
        .accounts({ judge: publicKey, submission: submissionPda, scoreHash: scorePda, systemProgram: web3.SystemProgram.programId })
        .rpc();

      setTxSig(sig);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Chain write failed.");
      setStep("idle");
    }
  }

  const inputStyle = {
    background: "var(--card)", border: "1px solid var(--card-border)",
    color: "var(--foreground)", borderRadius: "6px", padding: "8px 12px",
    fontSize: "14px", width: "100%", outline: "none",
  };

  const stepLabel: Record<Step, string> = {
    idle: "Submit & Score",
    scoring: "Scoring via AI…",
    writing: "Writing to chain…",
    done: "Done ✓",
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-lg rounded-xl border p-8" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Submit Project</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            {publicKey ? `Wallet: ${publicKey.toBase58().slice(0, 8)}…` : "Connect wallet to submit"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: "problem_id", label: "Problem ID", placeholder: "e.g. defi-swap-01" },
              { key: "repo_url", label: "GitHub Repo URL", placeholder: "https://github.com/you/repo" },
              { key: "deployment_url", label: "Deployment URL", placeholder: "https://your-app.vercel.app" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                <input
                  style={inputStyle}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                />
              </div>
            ))}

            {error && <p className="text-sm" style={{ color: "#c0392b" }}>{error}</p>}

            <button
              type="submit"
              disabled={step !== "idle" && step !== "done" || !publicKey}
              className="mt-2 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {stepLabel[step]}
            </button>
          </form>

          {result && (
            <div className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>SCORE BREAKDOWN</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(result.system_score).filter(([k]) => k !== "total").map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span style={{ color: "var(--muted)" }}>{k.replace(/_/g, " ")}</span>
                    <span className="font-medium" style={{ color: "var(--foreground)" }}>{v}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-1" style={{ borderColor: "var(--border)" }}>
                  <span style={{ color: "var(--foreground)" }}>Total</span>
                  <span style={{ color: "var(--accent)" }}>{result.system_score.total} / 70</span>
                </div>
              </div>
              {txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-3 text-xs underline"
                  style={{ color: "var(--accent)" }}
                >
                  View on Solana Explorer →
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
