"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { Navbar } from "../components/Navbar";
import { useProgram, getSubmissionPda, getScorePda } from "../../lib/useProgram";
import { toast } from "sonner";

// Hardcoded devnet hackathon — replace with dynamic lookup once organizer UI exists
const HACKATHON_PUBKEY = new web3.PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SystemScore = {
  code_quality: number;
  test_coverage: number;
  deployment_health: number;
  documentation: number;
  custom_criteria: number;
  total: number;
};

type ScoreResult = {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: SystemScore;
  judge_score: number | null;
  final_score: number | null;
  tx_hash: string | null;
  status: string;
};

type Step = "idle" | "signing" | "scoring" | "writing" | "done";

type ProblemMetadata = {
  title: string;
  description: string;
};

const STEP_LABELS: Record<Step, string> = {
  idle: "Submit & Score",
  signing: "Sign in Wallet…",
  scoring: "AI Scoring…",
  writing: "Confirming Transaction…",
  done: "Submission Recorded ✓",
};

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
  const [step, setStep] = useState<Step>("idle");
  const [txSig, setTxSig] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/v1/problems`)
      .then((res) => res.json())
      .then(setProblems)
      .catch(() => toast.error("Could not load problem list from backend."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return toast.error("Connect your wallet first.");
    if (!form.problem_id) return toast.error("Please select a problem.");

    setResult(null);
    setTxSig("");

    // Build payload
    const payload = {
      problem_id: form.problem_id,
      participant_wallet: publicKey.toBase58(),
      repo_url: form.repo_url,
      deployment_url: form.deployment_url,
      reported_test_coverage_percent: parseFloat(form.coverage) || 0,
    };
    const bodyStr = JSON.stringify(payload);

    // 1. Sign payload with wallet
    setStep("signing");
    let signature = "";
    if (signMessage) {
      try {
        const msgBytes = new TextEncoder().encode(bodyStr);
        const sigBytes = await signMessage(msgBytes);
        signature = Buffer.from(sigBytes).toString("base64");
      } catch (err) {
        toast.error("Wallet signing cancelled.");
        setStep("idle");
        return;
      }
    }

    // 2. Score via backend
    setStep("scoring");
    const scoringToast = toast.loading("AI is analyzing your submission…");

    let scoreData: ScoreResult;
    try {
      const res = await fetch(`${API_URL}/api/v1/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "x-signature": signature } : {}),
        },
        body: bodyStr,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend error: ${res.status}`);
      }
      scoreData = await res.json();
      setResult(scoreData);
      toast.success("Scoring complete!", { id: scoringToast });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scoring failed.";
      toast.error(msg, { id: scoringToast });
      setStep("idle");
      return;
    }

    // 3. Optionally write score to chain (requires connected wallet + program)
    if (program && scoreData) {
      setStep("writing");
      const chainToast = toast.loading("Confirm transaction in your wallet…");
      try {
        const [submissionPda] = getSubmissionPda(HACKATHON_PUBKEY, publicKey);
        const [scorePda] = getScorePda(submissionPda);

        // createSubmission is idempotent — fail silently if already exists
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (program as any).methods
            .createSubmission(form.problem_id, form.repo_url, form.deployment_url)
            .accounts({
              participant: publicKey,
              hackathon: HACKATHON_PUBKEY,
              submission: submissionPda,
              systemProgram: web3.SystemProgram.programId,
            })
            .rpc();
        } catch {
          // already exists — continue
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        toast.success("Score recorded on Solana!", { id: chainToast });
      } catch (err: unknown) {
        // Chain write is non-blocking — score already saved in backend
        const msg = err instanceof Error ? err.message : "Chain write failed.";
        toast.warning(`Backend scored, but on-chain write skipped: ${msg}`, { id: chainToast });
      }
    }

    setStep("done");
  }

  const isSubmitting = step !== "idle" && step !== "done";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-lg rounded-xl border border-card-border p-8 bg-card shadow-sm">
          <h1 className="text-2xl font-bold mb-1 text-foreground">Submit Project</h1>
          <p className="text-sm mb-6 text-muted">
            {publicKey ? (
              <span>
                Wallet:{" "}
                <code className="bg-muted/10 px-1 rounded font-mono text-xs">
                  {publicKey.toBase58().slice(0, 8)}…
                </code>
              </span>
            ) : (
              "Connect wallet to submit"
            )}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Problem selector */}
            <div>
              <label className="text-xs font-medium block mb-1 text-muted uppercase tracking-wider">
                Problem
              </label>
              <select
                id="problem-select"
                className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all"
                value={form.problem_id}
                onChange={(e) => setForm((f) => ({ ...f, problem_id: e.target.value }))}
                required
              >
                <option value="">Select a challenge…</option>
                {Object.entries(problems).map(([id, meta]) => (
                  <option key={id} value={id}>
                    {meta.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Text inputs */}
            {[
              {
                key: "repo_url",
                label: "GitHub Repo URL",
                placeholder: "https://github.com/you/repo",
                type: "url",
              },
              {
                key: "deployment_url",
                label: "Deployment URL",
                placeholder: "https://your-app.vercel.app",
                type: "url",
              },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-medium block mb-1 text-muted uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type={type}
                  id={key}
                  className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all placeholder:text-muted/50"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                />
              </div>
            ))}

            {/* Coverage % */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="coverage"
                  className="text-xs font-medium text-muted uppercase tracking-wider"
                >
                  Test Coverage %
                </label>
                <span className="text-accent font-mono font-bold text-sm">
                  {form.coverage}%
                </span>
              </div>
              <input
                id="coverage"
                type="range"
                min="0"
                max="100"
                step="1"
                value={form.coverage}
                onChange={(e) => setForm((f) => ({ ...f, coverage: e.target.value }))}
                className="w-full accent-accent h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              id="submit-btn"
              disabled={isSubmitting || !publicKey}
              className="mt-2 py-2.5 rounded-md text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 bg-accent text-white shadow-sm active:scale-[0.98]"
            >
              {STEP_LABELS[step]}
            </button>
          </form>

          {/* Score result */}
          {result && (
            <div className="mt-6 rounded-lg border border-card-border p-4 bg-background/50 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs font-semibold mb-3 text-muted uppercase tracking-widest">
                Score Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {(
                  Object.entries(result.system_score) as [keyof SystemScore, number][]
                )
                  .filter(([k]) => k !== "total")
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted">{SCORE_FIELD_LABELS[k]}</span>
                      <span className="font-medium text-foreground">{v}</span>
                    </div>
                  ))}
                <div className="flex justify-between text-base font-bold border-t border-border pt-3 mt-1">
                  <span className="text-foreground">Total System Score</span>
                  <span className="text-accent">
                    {result.system_score.total}
                    <span className="text-xs text-muted font-normal ml-1">/ 70</span>
                  </span>
                </div>
              </div>

              {/* On-chain link */}
              {txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4 text-xs font-medium text-accent hover:underline text-center bg-accent/5 py-2 rounded"
                >
                  View on Solana Explorer →
                </a>
              )}

              {/* Submission ID for reference */}
              <p className="mt-3 text-center text-[10px] text-muted font-mono">
                ID: {result.submission_id}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
