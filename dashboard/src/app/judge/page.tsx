"use client";
import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "../components/Navbar";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SOLSCAN_BASE = "https://solscan.io/tx";

type SystemScore = {
  code_quality: number;
  test_coverage: number;
  deployment_health: number;
  documentation: number;
  custom_criteria: number;
  total: number;
};

type Submission = {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: SystemScore;
  judge_score: number | null;
  final_score: number | null;
  tx_hash: string | null;
  status: string;
};

type ProblemMeta = { title: string };

function truncateWallet(wallet: string) {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

const SCORE_FIELDS: { key: keyof SystemScore; label: string }[] = [
  { key: "code_quality", label: "Code Quality" },
  { key: "test_coverage", label: "Test Coverage" },
  { key: "deployment_health", label: "Deployment" },
  { key: "documentation", label: "Documentation" },
  { key: "custom_criteria", label: "Custom Criteria" },
];

export default function JudgePage() {
  const { publicKey } = useWallet();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMeta>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [judgeScores, setJudgeScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [scored, setScored] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_URL}/api/v1/problems`)
      .then((r) => r.json())
      .then(setProblems)
      .catch(() => console.warn("Could not load problems."));
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/submissions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Submission[] = await res.json();
      setSubmissions(data);
      // Mark already judge-scored ones
      const alreadyScored = new Set(
        data.filter((s) => s.judge_score !== null).map((s) => s.submission_id)
      );
      setScored(alreadyScored);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load submissions";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    if (!judgeScores[id]) {
      setJudgeScores((prev) => ({ ...prev, [id]: 0 }));
    }
  }

  async function handleJudgeSubmit(sub: Submission) {
    if (!publicKey) return toast.error("Connect your wallet first.");
    const currentJudgeScore = judgeScores[sub.submission_id] ?? 0;

    const payload = {
      submission_id: sub.submission_id,
      judge_score: currentJudgeScore,
      judge_wallet: publicKey.toBase58(),
    };

    setSubmitting(sub.submission_id);
    const toastId = toast.loading("Submitting judge score...");

    try {
      const res = await fetch(`${API_URL}/api/v1/judge/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      toast.success("Judge score submitted successfully!", { id: toastId });
      setScored((prev) => new Set([...prev, sub.submission_id]));
      setExpandedId(null);
      await fetchSubmissions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Judge Dashboard</h1>
              <p className="text-sm text-muted mt-1">
                Review submissions and provide manual scoring.
              </p>
            </div>
            <button
              onClick={fetchSubmissions}
              disabled={loading}
              className="text-xs font-medium text-accent hover:underline bg-accent/5 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* Wallet warning */}
          {!publicKey && (
            <div className="mb-6 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm">
              Connect your wallet to submit judge scores.
            </div>
          )}

          {/* Loading */}
          {loading && submissions.length === 0 && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!loading && submissions.length === 0 && (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/50">
              <p className="text-muted text-sm">
                No submissions found. They&apos;ll appear here once someone submits via the CLI or /submit page.
              </p>
            </div>
          )}

          {/* Submission cards */}
          <div className="grid gap-4">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.submission_id;
              const isAlreadyScored = scored.has(sub.submission_id);
              const currentScore = judgeScores[sub.submission_id] ?? 0;
              const problemTitle =
                problems[sub.problem_id]?.title || sub.problem_id;

              return (
                <div
                  key={sub.submission_id}
                  className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Card header */}
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base text-foreground truncate">
                            {problemTitle}
                          </h3>
                          {isAlreadyScored && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                              SCORED
                            </span>
                          )}
                          {sub.tx_hash && (
                            <a
                              href={`${SOLSCAN_BASE}/${sub.tx_hash}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-accent bg-accent/5 border border-accent/20 px-1.5 py-0.5 rounded hover:underline"
                            >
                              ON-CHAIN ↗
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted font-mono">
                          {truncateWallet(sub.wallet)}
                        </p>
                      </div>

                      {/* Score display + action */}
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <div className="text-2xl font-bold text-accent">
                            {sub.final_score ?? sub.system_score.total}
                            <span className="text-xs text-muted font-normal ml-1">
                              / {sub.judge_score !== null ? "100" : "70"}
                            </span>
                          </div>
                          {sub.judge_score !== null && (
                            <div className="text-[10px] text-muted font-medium">
                              System: {sub.system_score.total} · Judge: {sub.judge_score}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => toggleExpand(sub.submission_id)}
                          className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all ${
                            isExpanded
                              ? "bg-muted/10 text-muted"
                              : isAlreadyScored
                              ? "border border-border text-muted hover:text-foreground"
                              : "bg-accent text-white hover:opacity-90 shadow-sm active:scale-95"
                          }`}
                        >
                          {isExpanded
                            ? "Collapse"
                            : isAlreadyScored
                            ? "Edit Score"
                            : "Score Now"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-border p-5 bg-background/50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Auto-score breakdown (read-only) */}
                        <div>
                          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
                            Auto-Score Breakdown
                          </p>
                          <div className="flex flex-col gap-2">
                            {SCORE_FIELDS.map(({ key, label }) => (
                              <div
                                key={key}
                                className="flex justify-between text-sm"
                              >
                                <span className="text-muted">{label}</span>
                                <span className="font-medium text-foreground">
                                  {sub.system_score[key]}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-1">
                              <span>System Total</span>
                              <span className="text-accent">
                                {sub.system_score.total}
                                <span className="text-xs text-muted font-normal ml-1">/ 70</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Judge score input */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-bold text-muted uppercase tracking-widest">
                              Judge Score (0–30)
                            </p>
                            <span className="text-accent font-mono font-bold text-xl">
                              {currentScore}
                            </span>
                          </div>
                          <input
                            id={`judge-slider-${sub.submission_id}`}
                            type="range"
                            min="0"
                            max="30"
                            step="1"
                            value={currentScore}
                            disabled={isAlreadyScored}
                            onChange={(e) =>
                              setJudgeScores((prev) => ({
                                ...prev,
                                [sub.submission_id]: parseInt(e.target.value),
                              }))
                            }
                            className="w-full accent-accent h-2 bg-muted/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                          />
                          <div className="text-xs text-muted mb-4">
                            Estimated final:{" "}
                            <span className="font-bold text-foreground">
                              {sub.system_score.total + currentScore} / 100
                            </span>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setExpandedId(null)}
                              className="px-4 py-2 text-sm font-semibold text-muted hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              id={`confirm-score-${sub.submission_id}`}
                              onClick={() => handleJudgeSubmit(sub)}
                              disabled={
                                submitting === sub.submission_id ||
                                isAlreadyScored ||
                                !publicKey
                              }
                              className="bg-foreground text-background px-5 py-2 rounded-md text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {submitting === sub.submission_id
                                ? "Confirming…"
                                : isAlreadyScored
                                ? "Already Scored"
                                : "Confirm Score"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
