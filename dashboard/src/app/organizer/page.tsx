"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "../components/Navbar";
import { toast } from "sonner";

type Hackathon = {
  name: string;
  organizer: string;
  pubkey: string;
  problems: any[];
};

export default function OrganizerDashboard() {
  const { publicKey } = useWallet();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) return;
    
    fetch(`http://localhost:8000/api/v1/hackathons?organizer=${publicKey.toBase58()}`)
      .then(res => res.json())
      .then(setHackathons)
      .catch(() => toast.error("Failed to load your hackathons."))
      .finally(() => setLoading(false));
  }, [publicKey]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
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
              <p className="text-muted">You haven't created any hackathons yet.</p>
              <Link href="/organizer/new" className="text-accent hover:underline mt-2 inline-block font-medium">
                Create your first hackathon →
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {hackathons.map((h) => (
                <div key={h.pubkey} className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{h.name}</h3>
                      <p className="text-xs font-mono text-muted mb-4">{h.pubkey}</p>
                      
                      <div className="flex gap-4">
                        <div className="bg-background px-3 py-1.5 rounded-lg border border-border text-center">
                          <div className="text-[10px] text-muted uppercase font-bold">Challenges</div>
                          <div className="text-lg font-black">{h.problems.length}</div>
                        </div>
                        <div className="bg-background px-3 py-1.5 rounded-lg border border-border text-center">
                          <div className="text-[10px] text-muted uppercase font-bold">Status</div>
                          <div className="text-xs font-bold text-green-600 mt-1">ACTIVE</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button className="text-sm font-semibold text-accent hover:underline px-4 py-2 bg-accent/5 rounded-md">
                        Manage Submissions
                      </button>
                      <button className="text-sm font-semibold text-muted hover:text-foreground px-4 py-2">
                        Edit Metadata
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
