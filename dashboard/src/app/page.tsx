"use client";

import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreRing } from "@/components/ui/ScoreRing";

export default function Home() {
  const [score, setScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= 87) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="content-area pt-8 mb-16 relative">
      <div className="ambient-glow" />
      
      {/* Top Hero / Stats Row */}
      <div className="bento-stat stagger-item">
        <StatCard label="Total Submissions" value="1,204" delta="+12% this week" />
      </div>
      <div className="bento-stat stagger-item">
        <StatCard label="Prizes Distributed" value="125 SOL" delta="Paid automatically" />
      </div>
      <div className="bento-stat stagger-item">
        <StatCard label="Active Judges" value="48" delta="Online now" />
      </div>
      <div className="bento-feed stagger-item bg-surface border border-border p-5 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-hero text-amber-base font-data leading-none drop-shadow-md">
          {score}
        </div>
        <div className="font-data text-xs text-muted tracking-widest mt-2 uppercase">Platform Average Score</div>
      </div>

      {/* Middle Row */}
      <div className="bento-leader stagger-item bg-surface border border-border rounded-lg p-6 min-h-[300px]">
        <h2 className="text-sm font-data mb-6 uppercase tracking-widest text-secondary border-b border-border pb-4">Top Auto-Scored Submissions</h2>
        <div className="space-y-5">
           <div className="flex justify-between items-center pb-2">
             <div className="flex items-center gap-4">
                <span className="font-data text-muted text-xs">01</span>
                <span className="font-data text-primary text-sm uppercase tracking-widest">Solana Pay Hub</span>
             </div>
             <span className="font-data text-amber-base">98.5</span>
           </div>
           <div className="flex justify-between items-center pb-2">
             <div className="flex items-center gap-4">
                <span className="font-data text-muted text-xs">02</span>
                <span className="font-data text-primary text-sm uppercase tracking-widest">DeFi Analytics Dashboard</span>
             </div>
             <span className="font-data text-amber-base">94.2</span>
           </div>
           <div className="flex justify-between items-center pb-2">
             <div className="flex items-center gap-4">
                <span className="font-data text-muted text-xs">03</span>
                <span className="font-data text-primary text-sm uppercase tracking-widest">NFT Marketplace Contract</span>
             </div>
             <span className="font-data text-amber-base">91.0</span>
           </div>
        </div>
      </div>

      <div className="bento-score stagger-item bg-surface border border-border rounded-lg p-6 flex flex-col justify-center items-center relative overflow-hidden min-h-[300px]">
        <h2 className="text-sm font-data mb-6 uppercase tracking-widest text-secondary w-full text-left absolute top-6 left-6">Real-Time Processing</h2>
        <ScoreRing score={score} size={180} />
      </div>

      {/* Bottom Row */}
      <div className="bento-full stagger-item bg-surface border border-border rounded-lg p-6 mt-4">
        <h2 className="text-sm font-data mb-4 uppercase tracking-widest text-secondary">Recent On-Chain Events</h2>
        <div className="flex gap-2 items-center text-xs font-data text-muted mb-4">
          <span className="chain-dot" /> Live feed connected via Devnet
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="p-4 bg-elevated rounded border border-border font-data text-xs flex justify-between hover:border-amber-muted transition-colors items-center">
              <div>
                <div className="text-amber-base mb-1">SCORE PUSHED</div>
                <span className="text-primary">Submission ID: #8a2b...4f1e</span>
              </div>
              <span className="text-muted">12s ago</span>
           </div>
           <div className="p-4 bg-elevated rounded border border-border font-data text-xs flex justify-between hover:border-amber-muted transition-colors items-center">
              <div>
                <div className="text-green-base mb-1">CERTIFICATE MINTED</div>
                <span className="text-primary">Solana Pay Hub - Gold Rank</span>
              </div>
              <span className="text-muted">1m ago</span>
           </div>
           <div className="p-4 bg-elevated rounded border border-border font-data text-xs flex justify-between hover:border-amber-muted transition-colors items-center">
              <div>
                <div className="text-secondary mb-1">SMART CONTRACT CALL</div>
                <span className="text-primary">init_submission() by 7X9p...k2M1</span>
              </div>
              <span className="text-muted">4m ago</span>
           </div>
           <div className="p-4 bg-elevated rounded border border-border font-data text-xs flex justify-between hover:border-amber-muted transition-colors items-center">
              <div>
                <div className="text-amber-base mb-1">SCORE PUSHED</div>
                <span className="text-primary">Submission ID: #2c9d...1a4f</span>
              </div>
              <span className="text-muted">5m ago</span>
           </div>
        </div>
      </div>
    </main>
  );
}
