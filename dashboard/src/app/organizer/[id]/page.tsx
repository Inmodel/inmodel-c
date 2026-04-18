"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import { ScoreResult, ProblemMetadata } from "../../../types";
import { WalletDisplay } from "../../../components/ui/WalletDisplay";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";

interface HackathonInfo {
  name: string;
  isActive: boolean;
}

export default function OrganizerMonitor() {
  const { id } = useParams();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<ScoreResult[]>([]);
  const [problems, setProblems] = useState<Record<string, ProblemMetadata>>({});
  const [hackathon, setHackathon] = useState<HackathonInfo | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(15);
  
  // Animation counts
  const [statSubs, setStatSubs] = useState(0);
  const [statOnChain, setStatOnChain] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    if (!id) return;
    try {
      const [subsData, probsData] = await Promise.all([
        api.getHackathonSubmissions(id as string).catch(() => []),
        api.getProblems().catch(() => ({}))
      ]);
      setSubmissions(subsData);
      setProblems(probsData);
      
      // If we had a real GET hackathon route we'd fetch it here. We'll mock the config from local context:
      setHackathon({ name: "Monitor Dashboard", isActive: true });
    } catch {
      toast.error("Failed to sync monitor data.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDashboardData();
    const int = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchDashboardData();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(int);
  }, [fetchDashboardData]);

  useEffect(() => {
    // Stat counter animation logic
    if (submissions.length === 0) return;
    let frame: number;
    let start: number;
    const targets = {
       subs: submissions.length,
       chain: submissions.filter(s => s.tx_hash).length
    };
    
    const animate = (time: number) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / 1000, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      setStatSubs(Math.floor(targets.subs * ease));
      setStatOnChain(Math.floor(targets.chain * ease));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [submissions.length]);

  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div></div>;

  const avgScore = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.final_score || s.system_score.total || 0), 0) / submissions.length)
    : 0;

  const sortedSubs = [...submissions].sort((a,b) => (b.final_score || b.system_score.total) - (a.final_score || a.system_score.total));

  return (
    <div className="min-h-screen bg-void text-primary font-body">
      <main className="max-w-[1440px] mx-auto px-6 py-12">
        
        <header className="flex justify-between items-end mb-8 stagger-item">
           <div>
             <h1 className="text-3xl font-display font-bold uppercase tracking-widest">{hackathon?.name || "Hackathon Monitor"}</h1>
             <p className="text-muted text-xs font-data uppercase tracking-wider mt-1">ID: {id}</p>
           </div>
           <div className="font-data text-xs text-secondary bg-elevated/50 px-3 py-1.5 rounded flex items-center gap-2 border border-border">
             <span className="w-2 h-2 rounded-full bg-amber-base animate-pulse"></span>
             Auto-refreshing in {refreshCountdown}s
           </div>
        </header>

        {/* Bento Stat Row */}
        <div className="grid grid-cols-12 gap-4 mb-6 stagger-item" style={{ animationDelay: '100ms' }}>
           <div className="col-span-12 md:col-span-3 stat-card">
              <div className="stat-value">{statSubs}</div>
              <div className="stat-label">Total Submissions</div>
           </div>
           <div className="col-span-12 md:col-span-3 stat-card">
              <div className="stat-value">{Object.keys(problems).length || 0}</div>
              <div className="stat-label">Active Problems</div>
           </div>
           <div className="col-span-12 md:col-span-3 stat-card">
              <div className="stat-value">{avgScore}<span className="text-sm text-muted">/100</span></div>
              <div className="stat-label">Average Score</div>
           </div>
           <div className="col-span-12 md:col-span-3 stat-card border-green-dim/30">
              <div className="stat-value text-green-base">{statOnChain}</div>
              <div className="stat-label text-green-base opacity-80">On-Chain Verified</div>
           </div>
        </div>

        {/* 7col + 5col Split */}
        <div className="grid grid-cols-12 gap-6 stagger-item" style={{ animationDelay: '200ms' }}>
          
          <div className="col-span-12 lg:col-span-7 bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Wallet</th>
                    <th>Problem</th>
                    <th className="text-right">Sys</th>
                    <th className="text-right">Judge</th>
                    <th className="text-right">Final</th>
                    <th>Chain</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-muted text-xs font-data uppercase tracking-widest border-b-[transparent] pb-10">No Submissions Yet</td></tr>
                  ) : sortedSubs.map((s, i) => (
                    <tr key={s.submission_id}>
                      <td className={`td-rank ${i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : ''}`}>
                        {(i + 1).toString().padStart(2, '0')}
                      </td>
                      <td><WalletDisplay address={s.wallet} /></td>
                      <td>
                        <span className="bg-elevated px-2 py-0.5 rounded text-[10px] font-data text-secondary truncate max-w-[100px] border border-border inline-block">
                          {problems[s.problem_id]?.title || s.problem_id}
                        </span>
                      </td>
                      <td className="text-right font-data text-xs text-amber-dim">{s.system_score.total || "—"}</td>
                      <td className="text-right font-data text-xs text-sol-purple">{s.judge_score ?? "—"}</td>
                      <td className="td-score text-right font-bold text-sm">{s.final_score || s.system_score.total || 0}</td>
                      <td>
                        {s.tx_hash ? (
                          <div className="flex items-center gap-1.5 font-data text-[10px] text-green-base">
                            <span className="chain-dot"></span>
                            <a href={`https://solscan.io/tx/${s.tx_hash}?cluster=devnet`} target="_blank" rel="noreferrer" className="hover:underline">View ↗</a>
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted font-data">Pending</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-auto p-4 border-t border-border bg-elevated/30 flex flex-wrap gap-4 items-center justify-between">
              <button className="text-xs font-data uppercase tracking-widest text-muted hover:text-primary transition-colors">Export CSV ↗</button>
              <div className="flex gap-4">
                 <Button variant="ghost" onClick={() => router.push('/judge')}>Open Judge Panel →</Button>
                 <Button variant="primary" onClick={() => router.push(`/organizer/${id}/finalize`)} className="bg-red-dim hover:bg-red-base text-red-base hover:text-white border-none">Finalize Hackathon</Button>
              </div>
            </div>
          </div>
          
          <div className="col-span-12 lg:col-span-5 bg-surface border border-border rounded-xl p-6 shadow-2xl">
            <h3 className="font-display uppercase tracking-widest text-sm mb-6 pb-4 border-b border-border">Problem Breakdown</h3>
            
            <div className="space-y-6">
              {Object.entries(problems).length === 0 ? (
                <div className="text-muted text-xs font-data uppercase text-center py-6">No problem data available</div>
              ) : Object.entries(problems).map(([pid, p]) => {
                const pSubs = submissions.filter(s => s.problem_id === pid);
                const count = pSubs.length;
                const pAvg = count > 0 ? Math.round(pSubs.reduce((acc, s) => acc + (s.final_score || s.system_score.total || 0), 0) / count) : 0;
                
                return (
                  <div key={pid} className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="font-bold text-sm mb-1">{p.title}</div>
                        <div className="font-data text-[10px] text-muted uppercase tracking-widest">{count} Submissions</div>
                      </div>
                      <div className="font-data text-amber-base">{pAvg}<span className="text-[10px] text-muted">/100 avg</span></div>
                    </div>
                    <div className="h-1.5 w-full bg-elevated rounded overflow-hidden">
                       <div className="h-full bg-amber-border" style={{ width: `${(pAvg/100)*100}%`, background: 'var(--amber-base)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 p-5 rounded-lg border border-sol-purple/30 bg-sol-purple/5">
              <h4 className="text-sol-purple font-data text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-sol-purple rounded-full block"></span> Human Review Required
              </h4>
              <p className="text-muted text-xs leading-relaxed mb-4">
                {submissions.filter(s => !s.judge_submitted).length} submissions are currently waiting for human judge evaluation to finalize their 30% metric weight.
              </p>
              <Button onClick={() => router.push('/judge')} className="w-full text-xs font-data tracking-widest border-sol-purple/50 hover:bg-sol-purple/20 hover:text-white text-sol-purple">
                Start Judging Queue
              </Button>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
