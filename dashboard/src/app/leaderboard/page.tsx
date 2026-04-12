"use client";
import { useEffect, useState, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import { SolscanLink } from "@/components/SolscanLink";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata } from "@/types";

function truncateWallet(wallet: string) {
  if (!wallet || wallet.length < 10) return wallet || "???";
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
      // Sort by final score descending
      const sorted = [...data].sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
      setEntries(sorted);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProblem) fetchLeaderboard(selectedProblem);
  }, [selectedProblem, fetchLeaderboard]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!selectedProblem) return;
    const interval = setInterval(() => fetchLeaderboard(selectedProblem), 15000);
    return () => clearInterval(interval);
  }, [selectedProblem, fetchLeaderboard]);

  const getRankStyle = (index: number) => {
    if (index === 0) return "border-l-4 border-yellow-400";
    if (index === 1) return "border-l-4 border-gray-400";
    if (index === 2) return "border-l-4 border-amber-600";
    return "";
  };

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
              <p className="text-sm text-muted mt-2">Immutable hackathon rankings fetched live from Solana.</p>
            </div>

            <div className="flex items-center gap-4 bg-card border border-card-border p-1 rounded-lg">
              {Object.entries(problems).map(([id, meta]) => (
                <button
                  key={id}
                  onClick={() => setSelectedProblem(id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedProblem === id 
                      ? "bg-accent text-white shadow-sm" 
                      : "text-muted hover:text-foreground hover:bg-muted/5"
                  }`}
                >
                  {meta.title}
                </button>
              ))}
            </div>
          </div>

          {loading && entries.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/5 border-b border-card-border">
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px]">Rank</th>
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px]">Wallet</th>
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px] text-right">System Score</th>
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px] text-right">Judge Score</th>
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px] text-right">Final Score</th>
                    <th className="px-6 py-4 font-semibold text-muted tracking-wider uppercase text-[10px] text-center">On-Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {entries.map((entry, i) => (
                    <tr key={entry.submission_id} className={`hover:bg-muted/5 transition-colors ${getRankStyle(i)}`}>
                      <td className="px-6 py-4 font-bold text-base">
                        {getRankEmoji(i)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-medium">
                        {truncateWallet(entry.wallet)}
                      </td>
                      <td className="px-6 py-4 text-right text-muted font-medium">
                        {entry.system_score.total}
                      </td>
                      <td className="px-6 py-4 text-right text-muted font-medium">
                        {entry.judge_score ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold text-accent">{entry.final_score || entry.system_score.total}</span>
                        <span className="text-[10px] text-muted ml-1">/ 100</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {entry.tx_hash ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-green-500 font-bold">✓</span>
                            <SolscanLink tx={entry.tx_hash} label="View Proof" />
                          </div>
                        ) : (
                          <span className="text-muted/40 font-medium italic">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-muted italic">
                        No submissions found for this challenge.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-end gap-2 text-[10px] text-muted uppercase tracking-widest font-bold">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Auto-refreshing every 15s
          </div>
        </div>
      </main>
    </div>
  );
}
