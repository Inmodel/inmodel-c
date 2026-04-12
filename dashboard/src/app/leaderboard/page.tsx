"use client";
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata } from "@/types";
import { WalletDisplay } from "@/components/ui/WalletDisplay";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(15);

  useEffect(() => {
    api.getProblems()
      .then((data) => {
        setProblems(data);
        const firstId = Object.keys(data)[0];
        if (firstId) setSelectedProblem(firstId);
      })
      .catch((err) => toast.error(`Error loading problems: ${err.message}`));
  }, []);

  const fetchLeaderboard = useCallback(async (problemId: string) => {
    if (!problemId) return;
    setLoading(true);
    try {
      const data = await api.getLeaderboard(problemId);
      const sorted = [...data].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
      setEntries(sorted);
      setRefreshCountdown(15);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProblem) fetchLeaderboard(selectedProblem);
  }, [selectedProblem, fetchLeaderboard]);

  useEffect(() => {
    if (!selectedProblem) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          fetchLeaderboard(selectedProblem);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedProblem, fetchLeaderboard]);

  const getRankClass = (index: number) => {
    if (index === 0) return "rank-gold";
    if (index === 1) return "rank-silver";
    if (index === 2) return "rank-bronze";
    return "";
  };

  return (
    <main className="content-area pt-8">
      <div className="bento-full flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h1 className="text-xl font-display uppercase tracking-widest text-primary">Immutable Leaderboard</h1>
          <div className="flex gap-2">
            {Object.entries(problems).map(([id, meta]) => (
              <button
                key={id}
                onClick={() => setSelectedProblem(id)}
                className={`badge px-3 py-1 cursor-pointer transition-colors ${
                  selectedProblem === id ? "bg-amber-glow text-amber-base border border-amber-dim" : "bg-elevated text-muted border border-border hover:text-secondary"
                }`}
              >
                {meta.title}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2 font-data text-xs uppercase tracking-widest text-muted">
               <span className="chain-dot" /> Live Data Feed
             </div>
             <div className="font-data text-xs text-secondary">
               ↻ Refreshing in {refreshCountdown}s
             </div>
          </div>
          
          {loading && entries.length === 0 ? (
            <div className="flex justify-center py-20">
               <div className="loading-dots">
                 <div className="loading-dot" />
                 <div className="loading-dot" />
                 <div className="loading-dot" />
               </div>
            </div>
          ) : (
            <DataTable columns={["Rank", "Participant", "Sys Score", "Judge Score", "Final", "Status"]}>
              {entries.map((entry, i) => (
                <tr key={entry.submission_id} className="stagger-item">
                  <td className={`td-rank ${getRankClass(i)}`}>
                    {(i+1).toString().padStart(2, '0')}
                  </td>
                  <td>
                    <WalletDisplay address={entry.wallet} />
                  </td>
                  <td className="font-data text-sm text-right pr-4">{entry.system_score?.total || "0"}</td>
                  <td className="font-data text-sm text-right pr-4">{entry.judge_score ?? "—"}</td>
                  <td className="td-score text-lg font-bold text-right pr-4">
                    {entry.final_score || entry.system_score?.total || 0}
                  </td>
                  <td>
                    {entry.tx_hash ? (
                      <Badge variant="confirmed">Confirmed</Badge>
                    ) : (
                      <Badge variant="pending">Pending</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                   <td colSpan={6} className="text-center py-8 font-data text-xs text-muted uppercase">No entries found</td>
                </tr>
              )}
            </DataTable>
          )}
        </div>
      </div>
    </main>
  );
}
