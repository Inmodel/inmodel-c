"use client";
import { useEffect, useState, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { ScoreResult, ProblemMetadata } from "@/types";

function truncateWallet(wallet: string) {
  if (!wallet || wallet.length < 10) return wallet || "???";
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default function JudgePage() {
  const { publicKey } = useWallet();
  const [submissions, setSubmissions] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [judgeInputs, setJudgeInputs] = useState<Record<string, { innovation: number; impact: number; presentation: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSubmissions();
      setSubmissions(data);
      
      // Initialize inputs for each submission
      const inputs: any = {};
      data.forEach(sub => {
        inputs[sub.submission_id] = { innovation: 0, impact: 0, presentation: 0 };
      });
      setJudgeInputs(prev => ({ ...inputs, ...prev }));
    } catch (err: any) {
      toast.error(`Error loading submissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.getProblems().then(setProblems).catch(() => {});
    fetchSubmissions();
  }, [fetchSubmissions]);

  async function handleJudgeSubmit(submissionId: string) {
    if (!publicKey) return toast.error("Connect wallet to judge.");
    const inputs = judgeInputs[submissionId];
    
    setIsSubmitting(submissionId);
    try {
      const updated = await api.submitJudgeScore({
        submission_id: submissionId,
        ...inputs
      });
      
      toast.success("Judge score recorded successfully!");
      setSubmissions(prev => prev.map(s => s.submission_id === submissionId ? { ...s, ...updated, judge_submitted: true } : s));
      setExpandedId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(null);
    }
  }

  const handleInputChange = (submissionId: string, field: string, value: number) => {
    const val = Math.min(10, Math.max(0, value));
    setJudgeInputs(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: val
      }
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1 text-foreground">
        <div className="w-full max-w-4xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight">Judge Panel</h1>
            <p className="text-sm text-muted mt-2">Audit submissions and provide qualitative impact scoring.</p>
          </div>

          {loading && submissions.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {submissions.map((sub) => {
                const isExpanded = expandedId === sub.submission_id;
                const problemTitle = problems[sub.problem_id]?.title || sub.problem_id;
                const inputs = judgeInputs[sub.submission_id] || { innovation: 0, impact: 0, presentation: 0 };
                const isAlreadyScored = sub.judge_submitted;

                return (
                  <div key={sub.submission_id} className="bg-card border border-card-border rounded-xl shadow-sm transition-all overflow-hidden">
                    <div 
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : sub.submission_id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg">{problemTitle}</h3>
                          {isAlreadyScored && (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-green-200">
                              Already Scored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted font-mono mt-1">{truncateWallet(sub.wallet)}</p>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest">System Score</p>
                          <p className="text-xl font-bold text-foreground">{sub.system_score.total}<span className="text-xs font-normal text-muted ml-1">/ 70</span></p>
                        </div>
                        <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-8 border-t border-border bg-background/50 grid md:grid-cols-2 gap-10 animate-in slide-in-from-top-2 duration-300">
                        {/* Read-only system breakdown */}
                        <div>
                          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Auto-Score Audit</p>
                          <div className="space-y-2">
                            {Object.entries(sub.system_score).filter(([k]) => k !== "total").map(([key, val]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted capitalize">{key.replace("_", " ")}</span>
                                <span className="font-medium">{val as number}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                              <span>System Total</span>
                              <span className="text-accent">{sub.system_score.total} / 70</span>
                            </div>
                          </div>
                        </div>

                        {/* Judge Inputs */}
                        <div className="flex flex-col gap-6">
                          <p className="text-xs font-bold text-muted uppercase tracking-widest">Manual Scoring (0–10 each)</p>
                          
                          {["innovation", "impact", "presentation"].map(field => (
                            <div key={field} className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold capitalize text-muted">{field}</label>
                                <span className="text-accent font-mono font-bold">{ (inputs as any)[field] }</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                disabled={isAlreadyScored}
                                value={(inputs as any)[field]}
                                className="w-full accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                                onChange={(e) => handleInputChange(sub.submission_id, field, parseInt(e.target.value))}
                              />
                            </div>
                          ))}

                          <button
                            disabled={isAlreadyScored || isSubmitting === sub.submission_id}
                            onClick={() => handleJudgeSubmit(sub.submission_id)}
                            className="mt-4 w-full py-3 rounded-lg text-sm font-bold bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-all shadow-lg active:scale-[0.98]"
                          >
                            {isSubmitting === sub.submission_id ? "Saving..." : isAlreadyScored ? "Submission Finalized" : "Confirm Manual Score"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {submissions.length === 0 && (
                <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                  <p className="text-muted italic">No active submissions awaiting review.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
