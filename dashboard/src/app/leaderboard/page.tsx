import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata } from "@/types";
import { WalletDisplay } from "@/components/ui/WalletDisplay";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Search, Filter, RefreshCcw } from "lucide-react";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [selectedProblem, setSelectedProblem] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(15);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending">("all");

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

  // Filtering Logic
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = entry.wallet.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "confirmed" && entry.tx_hash) || 
        (statusFilter === "pending" && !entry.tx_hash);
      
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchQuery, statusFilter]);

  // SSE & Polling
  useEffect(() => {
    if (!selectedProblem) return;

    let eventSource: EventSource | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = setInterval(() => {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            fetchLeaderboard(selectedProblem);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const connectSSE = () => {
      const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/events/leaderboard`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.problem_id === selectedProblem) {
             fetchLeaderboard(selectedProblem);
          }
        } catch { }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (pollingInterval) clearInterval(pollingInterval);
        startPolling();
      };

      eventSource.onopen = () => {
        setRefreshCountdown(15);
      };
    };

    startPolling();
    connectSSE();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
      if (eventSource) eventSource.close();
    };
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
          <div>
            <h1 className="text-xl font-display uppercase tracking-widest text-primary">Immutable Leaderboard</h1>
            <p className="text-xs text-muted font-data mt-1 uppercase tracking-wider">On-chain synchronized rankings</p>
          </div>
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

        <div className="bg-surface border border-border rounded-lg p-6 min-h-[400px] flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-border/50 pb-6">
             <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input 
                    type="text"
                    placeholder="Search by wallet..."
                    className="input-field pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                   <Filter className="h-3.5 w-3.5 text-muted" />
                   <select 
                     className="bg-elevated border border-border rounded px-3 h-9 text-xs font-data text-primary outline-none focus:border-amber-base transition-colors"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value as "all" | "confirmed" | "pending")}
                   >
                     <option value="all">All Status</option>
                     <option value="confirmed">Confirmed</option>
                     <option value="pending">Pending</option>
                   </select>
                </div>
             </div>

             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 font-data text-xs uppercase tracking-widest text-muted">
                 <span className="chain-dot" /> Live Data Feed
               </div>
               <div className="flex items-center gap-1.5 font-data text-[10px] text-secondary bg-elevated/50 px-2 py-1 rounded border border-border/30">
                 <RefreshCcw className="h-3 w-3 animate-spin-slow" /> {refreshCountdown}s
               </div>
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
            <DataTable columns={["Rank", "Participant", "Sys", "Judge", "Final", "Status"]}>
              {filteredEntries.map((entry) => {
                const globalIndex = entries.findIndex(e => e.submission_id === entry.submission_id);
                return (
                  <tr key={entry.submission_id} className="stagger-item">
                    <td className={`td-rank ${getRankClass(globalIndex)}`}>
                      {(globalIndex + 1).toString().padStart(2, '0')}
                    </td>
                    <td>
                      <WalletDisplay address={entry.wallet} truncated />
                    </td>
                    <td className="font-data text-sm text-right pr-4">{entry.system_score?.total || "0"}</td>
                    <td className="font-data text-sm text-right pr-4">{entry.judge_score ?? "—"}</td>
                    <td className="td-score text-lg font-bold text-right pr-4">
                      {entry.final_score || entry.system_score?.total || 0}
                    </td>
                    <td>
                      {entry.tx_hash ? (
                        <Badge variant="confirmed">Live</Badge>
                      ) : (
                        <Badge variant="pending">Sync</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                   <td colSpan={6} className="text-center py-20 bg-void/30 rounded-lg border border-dashed border-border/50">
                     <p className="font-data text-xs text-muted uppercase tracking-widest mb-1">No matching results</p>
                     <p className="text-[10px] text-disabled font-data uppercase">Try adjusting your search or filter</p>
                   </td>
                </tr>
              )}
            </DataTable>
          )}
        </div>
      </div>
    </main>
  );
}
