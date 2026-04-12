"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { BentoCard } from "../../components/ui/BentoCard";
import { toast } from "sonner";

type Hackathon = {
  name: string;
  organizer: string;
  pubkey: string;
  problems: unknown[];
};

export default function OrganizerDashboard() {
  const { publicKey } = useWallet();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/hackathons?organizer=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then(setHackathons)
      .catch(() => toast.error("Failed to load your hackathons."))
      .finally(() => setLoading(false));
  }, [publicKey]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
              <p className="text-muted">Manage your on-chain hackathons and collections.</p>
            </div>
            {publicKey && (
              <Link
                href="/organizer/new"
                className="bg-accent text-white px-5 py-2.5 rounded-md text-sm font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
              >
                + Create New Hackathon
              </Link>
            )}
          </div>

          {!publicKey ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <p className="text-muted">Please connect your organizer wallet.</p>
            </div>
          ) : loading ? (
             <div className="flex justify-center py-20">
               <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : hackathons.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/50">
              <p className="text-muted">You haven&apos;t created any hackathons yet.</p>
              <Link href="/organizer/new" className="text-accent hover:underline mt-2 inline-block font-medium">
                Create your first hackathon →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl xl:max-w-7xl mx-auto">
              {hackathons.map((h) => (
                <BentoCard
                  key={h.pubkey}
                  title={h.name}
                  subtitle={
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs">ID: {h.pubkey.slice(0, 8)}...</span>
                      <span>Active Challenges: {h.problems.length}</span>
                    </div>
                  }
                  tagText="ON-CHAIN HACKATHON"
                  icon="🌐"
                  actionText="Manage"
                  onAction={() => toast.info("Management panel coming soon.")}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
