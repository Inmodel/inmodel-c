"use client";

import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreRing } from "@/components/ui/ScoreRing";

export default function Home() {
  const [stats, setStats] = useState({ total: 0, active: 0, nfts: 0 });

  useEffect(() => {
    let start = 0;
    const interval = setInterval(() => {
      start += 1;
      setStats({
        total: Math.min(start * 24, 1204),
        active: Math.min(start, 4),
        nfts: Math.min(start * 15, 782)
      });
      if (start > 50) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const feedEvents = [
    { time: "3 min ago", text: "Score finalized", detail: "9vBo... 82pts", color: "text-[var(--amber-base)]" },
    { time: "7 min ago", text: "Certificate minted", detail: "7mKp...", color: "text-[var(--green-base)]" },
    { time: "12 min ago", text: "Submission scored", detail: "2nRt... 70pts", color: "text-[var(--text-secondary)]" },
    { time: "18 min ago", text: "New submission", detail: "5cLm...", color: "text-[var(--text-secondary)]" },
    { time: "34 min ago", text: "Score finalized", detail: "8hJd... 65pts", color: "text-[var(--amber-base)]" },
    { time: "1 hr ago", text: "New submission", detail: "1xZp...", color: "text-[var(--text-secondary)]" },
  ];

  return (
    <main className="p-6 w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">
        {/* Row 1 Stats */}
        <StatCard 
          label="Total Submissions" 
          value={stats.total} 
          className="col-span-1 md:col-span-4 lg:col-span-3 animate-fade-in opacity-0" 
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }} 
        />
        <StatCard 
          label="Active Hackathons" 
          value={stats.active} 
          className="col-span-1 md:col-span-4 lg:col-span-3 animate-fade-in opacity-0" 
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }} 
        />
        <StatCard 
          label="NFTs Minted" 
          value={stats.nfts} 
          className="col-span-1 md:col-span-4 lg:col-span-3 animate-fade-in opacity-0" 
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }} 
        />

        {/* Live Feed - Spans 2 rows */}
        <div className="col-span-1 md:col-span-12 lg:col-span-3 lg:row-span-2 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-5 flex flex-col animate-fade-in opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-6 border-b border-[var(--bg-border)] pb-2 flex justify-between items-center">
            <span>Live Feed</span>
            <span className="w-2 h-2 rounded-full bg-[var(--green-base)] animate-pulse"></span>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            {feedEvents.map((ev, i) => (
              <div key={i} className="flex flex-col border-l border-[var(--bg-border)] pl-3 ml-1 py-1">
                <span className="text-[10px] text-[var(--text-muted)] font-mono">{ev.time}</span>
                <span className="text-sm text-[var(--text-primary)] font-medium mt-1">{ev.text}</span>
                <span className={`text-xs font-mono mt-0.5 ${ev.color}`}>{ev.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="col-span-1 md:col-span-7 lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-5 min-h-[300px] animate-fade-in opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-6 border-b border-[var(--bg-border)] pb-2">Top Submissions Preview</div>
          <div className="space-y-4">
            {[ 
              { rank: "01", name: "Solana Pay Hub", score: 98, color: "#FFD700" },
              { rank: "02", name: "DeFi Analytics Dashboard", score: 94, color: "#C0C0C0" },
              { rank: "03", name: "NFT Marketplace Contract", score: 91, color: "#CD7F32" }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center group cursor-pointer">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[var(--text-muted)] text-xs border-l-2 pl-2" style={{ borderColor: item.color }}>{item.rank}</span>
                  <span className="font-mono text-[var(--text-primary)] text-sm group-hover:text-[var(--amber-base)] transition-colors">{item.name}</span>
                </div>
                <span className="font-mono text-[var(--amber-base)] font-bold">{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="col-span-1 md:col-span-5 lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-5 flex flex-col justify-center items-center min-h-[300px] animate-fade-in opacity-0" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-4 border-b border-[var(--bg-border)] pb-2 w-full">Avg Score</div>
          <ScoreRing score={87} size={160} />
        </div>

        {/* Recent Submissions */}
        <div className="col-span-1 md:col-span-12 lg:col-span-12 bg-[var(--bg-surface)] border border-[var(--bg-border)] p-5 mt-4 min-h-[200px] animate-fade-in opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono mb-4 border-b border-[var(--bg-border)] pb-2">Recent Submissions</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="p-4 bg-[var(--bg-base)] border border-[var(--bg-border)] flex justify-between items-center hover:border-[var(--amber-base)] transition-colors">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-[var(--amber-base)] font-mono mb-1">EVALUATING</span>
                   <span className="text-white text-sm font-mono truncate max-w-[120px]">Project #{i}29A</span>
                 </div>
                 <div className="w-2 h-2 rounded-full border border-[var(--text-muted)] animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
