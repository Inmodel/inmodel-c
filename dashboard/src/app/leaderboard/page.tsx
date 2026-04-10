"use client";
import { useEffect, useState, useCallback } from "react";
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

type LeaderboardEntry = {
  submission_id: string;
  problem_id: string;
  wallet: string;
  system_score: SystemScore;
  judge_score: number | null;
  final_score: number | null;
  tx_hash: string | null;
  status: string;
};

type ProblemMeta = { title: string; description?: string };

function truncateWallet(wallet: string) {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMeta>>({});
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load problems once on mount
  useEffect(() => {
    fetch(`${API_URL}/api/v1/problems`)
      .then((r) => r.json())
      .then((data: Record<string, ProblemMeta>) => {
        setProblems(data);
        const firstId = Object.keys(data)[0];
        if (firstId) setSelectedProblem(firstId);
      })
      .catch(() => toast.error("Could not load problem list."));
  }, []);

  const fetchLeaderboard = useCallback(async (problemId: string) => {
    if (!problemId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/leaderboard?problem_id=${encodeURIComponent(problemId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaderboardEntry[] = await res.json();
      setEntries(data);
      setLastRefresh(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load leaderboard";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when problem changes
  useEffect(() => {
    if (selectedProblem) fetchLeaderboard(selectedProblem);
  }, [selectedProblem, fetchLeaderboard]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!selectedProblem) return;
    const interval = setInterval(() => fetchLeaderboard(selectedProblem), 10000);
    return () => clearInterval(interval);
  }, [selectedProblem, fetchLeaderboard]);

  const getRankDisplay = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
              <p className="text-sm text-muted mt-1">
                {lastRefresh
                  ? `Last updated ${lastRefresh.toLocaleTimeString()} · auto-refreshes every 10s`
                  : "Live scoring from JudgeChain backend"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                Live
              </span>
              {/* Problem selector */}
              {Object.keys(problems).length > 0 && (
                <select
                  id="problem-selector"
                  className="bg-card border border-border text-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all cursor-pointer"
                  value={selectedProblem}
                  onChange={(e) => setSelectedProblem(e.target.value)}
                >
                  {Object.entries(problems).map(([id, meta]) => (
                    <option key={id} value={id}>
                      {meta.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => fetchLeaderboard(selectedProblem)}
                disabled={loading || !selectedProblem}
                className="text-xs font-medium text-accent hover:underline bg-accent/5 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Loading spinner */}
          {loading && entries.length === 0 && (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!loading && entries.length === 0 && (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/50">
              <p className="text-muted text-sm">
                {selectedProblem
                  ? "No submissions yet for this problem. Be the first!"
                  : "Select a problem to view the leaderboard."}
              </p>
            </div>
          )}

          {/* Table */}
          {entries.length > 0 && (
            <div className="rounded-xl border border-card-border overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/5 border-b border-card-border">
                    <th className="px-4 py-3 font-medium text-muted w-12">Rank</th>
                    <th className="px-4 py-3 font-medium text-muted">Wallet</th>
                    <th className="px-4 py-3 font-medium text-muted text-right">System</th>
                    <th className="px-4 py-3 font-medium text-muted text-right">Judge</th>
                    <th className="px-4 py-3 font-medium text-muted text-right">Final</th>
                    <th className="px-4 py-3 font-medium text-muted text-center">On-Chain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.submission_id}
                      className="hover:bg-muted/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-base">
                        {i < 3 ? (
                          <span>{getRankDisplay(i)}</span>
                        ) : (
                          <span className="text-muted text-sm">#{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium font-mono text-foreground text-xs">
                          {truncateWallet(entry.wallet)}
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">
                          {entry.problem_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted text-right">
                        {entry.system_score.total}
                      </td>
                      <td className="px-4 py-3 text-muted text-right">
                        {entry.judge_score ?? <span className="text-border">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-accent text-base">
                          {entry.final_score ?? entry.system_score.total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.tx_hash ? (
                          <a
                            href={`${SOLSCAN_BASE}/${entry.tx_hash}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={entry.tx_hash}
                            className="inline-flex items-center gap-1 text-green-600 hover:underline text-xs font-semibold"
                          >
                            ✓ Solscan ↗
                          </a>
                        ) : (
                          <span className="text-muted/40 text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-card-border bg-muted/5 text-xs text-muted text-right">
                {entries.length} submission{entries.length !== 1 ? "s" : ""} · sorted by final score
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
