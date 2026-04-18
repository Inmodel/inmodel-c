"use client";
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useWallet } from "@solana/wallet-adapter-react";
import { ScoreResult, ProblemMetadata } from "@/types";
import { WalletDisplay } from "@/components/ui/WalletDisplay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ChainConfirm } from "@/components/ui/ChainConfirm";
import { SecurityReport } from "@/components/ui/SecurityReport";

export default function JudgePage() {
  const { publicKey } = useWallet();
  const [submissions, setSubmissions] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [judgeInputs, setJudgeInputs] = useState<Record<string, { innovation: number; impact: number; presentation: number }>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSubmissions();
      setSubmissions(data);
      
      const inputs: Record<string, { innovation: number; impact: number; presentation: number }> = {};
      data.forEach(sub => {
        inputs[sub.submission_id] = { innovation: 0, impact: 0, presentation: 0 };
      });
      setJudgeInputs(prev => ({ ...inputs, ...prev }));
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].submission_id);
      }
    } catch (err: unknown) {
      toast.error(`Error loading submissions: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(null);
    }
  }

  const handleInputChange = (submissionId: string, field: "innovation"|"impact"|"presentation", value: number) => {
    const val = Math.min(10, Math.max(0, value));
    setJudgeInputs(prev => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], [field]: val }
    }));
  };

  const selectedSub = submissions.find(s => s.submission_id === selectedId);
  const inputs = selectedId ? judgeInputs[selectedId] || { innovation: 0, impact: 0, presentation: 0 } : null;

  return (
    <main className="content-area pt-8">
      {/* LEFT COLUMN: 4 columns out of 12 for submission list */}
      <div className="col-span-12 md:col-span-4 flex flex-col gap-4 max-h-[85vh] overflow-y-auto pr-2">
        <h1 className="text-xl font-display uppercase tracking-widest text-primary mb-2">Submissions Queue</h1>
        {loading && submissions.length === 0 ? (
          <div className="loading-dots p-4"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
        ) : submissions.map((sub) => {
          const isSelected = selectedId === sub.submission_id;
          return (
            <div 
              key={sub.submission_id}
              onClick={() => setSelectedId(sub.submission_id)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-amber-glow border-amber-base' : 'bg-surface border-border hover:border-amber-muted'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-display font-bold text-sm truncate pr-2">{problems[sub.problem_id]?.title || 'Unknown'}</span>
                {sub.judge_submitted && <Badge variant="scored">Scored</Badge>}
              </div>
              <WalletDisplay address={sub.wallet} />
              <div className="mt-3 text-xs font-data text-muted uppercase">Sys Score: <span className="text-amber-base">{sub.system_score.total}</span></div>
            </div>
          );
        })}
        {submissions.length === 0 && !loading && <div className="text-muted text-sm p-4 border border-dashed border-border rounded-lg text-center">No submissions in queue.</div>}
      </div>

      {/* RIGHT COLUMN: 8 columns out of 12 for detail panel */}
      <div className="col-span-12 md:col-span-8">
        {selectedSub && inputs ? (
          <div className="bg-surface border border-border rounded-lg p-8 animate-in fade-in slide-in-from-right-4 duration-300 min-h-full">
            <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
               <div>
                  <h2 className="text-2xl font-display font-bold uppercase tracking-wide">{problems[selectedSub.problem_id]?.title}</h2>
                  <div className="mt-2"><WalletDisplay address={selectedSub.wallet} /></div>
               </div>
               <div className="text-right">
                  <div className="font-data text-xs text-muted uppercase tracking-widest mb-1">System Audit</div>
                  <div className="font-data text-3xl text-amber-base">{selectedSub.system_score.total}<span className="text-sm text-muted">/70</span></div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Read-Only System Breakdown */}
               <div>
                 <h3 className="text-xs font-data text-secondary uppercase tracking-widest mb-6">AI Evaluation Output</h3>
                 <div className="space-y-4">
                   <ScoreBar label="Code Quality" score={selectedSub.system_score.code_quality} max={20} />
                   <ScoreBar label="Test Coverage" score={selectedSub.system_score.test_coverage} max={15} />
                   <ScoreBar label="Deployment" score={selectedSub.system_score.deployment_health} max={15} />
                   <ScoreBar label="Docs" score={selectedSub.system_score.documentation} max={15} />
                 </div>
                 
                 <SecurityReport 
                   clean={true}       // using default true until API returns these fields specifically
                   injections={0} 
                   gamingFlags={true} 
                   auditHash={selectedSub.submission_id.slice(0, 8)}
                 />
               </div>

               {/* Manual Judging Form */}
               <div>
                 <h3 className="text-xs font-data text-secondary uppercase tracking-widest mb-6">Human Override</h3>
                 <div className="space-y-6">
                    {(["innovation", "impact", "presentation"] as const).map(field => (
                      <div key={field}>
                        <div className="flex justify-between mb-2">
                          <label className="font-data text-xs text-muted uppercase tracking-widest">{field}</label>
                          <span className="font-data text-amber-base">{inputs[field]}/10</span>
                        </div>
                        <input
                          type="range" min="0" max="10" step="1"
                          disabled={selectedSub.judge_submitted}
                          value={inputs[field]}
                          onChange={(e) => handleInputChange(selectedSub.submission_id, field, parseInt(e.target.value))}
                          className="w-full h-2 bg-elevated rounded appearance-none cursor-pointer disabled:opacity-50 border border-border"
                          style={{ background: `linear-gradient(to right, var(--amber-base) ${inputs[field]*10}%, var(--bg-elevated) ${inputs[field]*10}%)` }}
                        />
                      </div>
                    ))}

                    <div className="pt-4 mt-6 border-t border-border">
                       <Button 
                         disabled={selectedSub.judge_submitted || isSubmitting === selectedSub.submission_id}
                         onClick={() => handleJudgeSubmit(selectedSub.submission_id)}
                         className="w-full"
                       >
                         {isSubmitting === selectedSub.submission_id ? "Finalizing..." : selectedSub.judge_submitted ? "Finalized ✓" : "Finalize Score"}
                       </Button>
                       {selectedSub.judge_submitted && selectedSub.tx_hash && (
                          <div className="mt-6 animate-in slide-in-from-bottom flex flex-col">
                            <ChainConfirm txHash={selectedSub.tx_hash} />
                          </div>
                       )}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-surface border border-border rounded-lg text-muted font-data text-xs uppercase tracking-widest min-h-[400px]">
            Select a submission to review
          </div>
        )}
      </div>
    </main>
  );
}
