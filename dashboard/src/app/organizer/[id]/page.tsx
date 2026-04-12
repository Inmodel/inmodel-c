"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { toast } from "sonner";
import { StatCard } from "../../../components/ui/StatCard";
import { Button } from "../../../components/ui/Button";
import IDL_JSON from "../../../idl/judgechain.json";
import { Judgechain } from "../../../idl/judgechain";

interface StrategicWallet {
  publicKey: PublicKey;
  signTransaction: (tx: unknown) => Promise<unknown>;
  signAllTransactions: (txs: unknown[]) => Promise<unknown[]>;
}

interface HackathonData {
  name: string;
  organizer: PublicKey;
  isActive: boolean;
}

export default function HackathonManagement() {
  const { id } = useParams();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [hackathon, setHackathon] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!id || !connection) return;

    const fetchHackathon = async () => {
      try {
        const provider = new AnchorProvider(connection, (window as unknown as { solana: StrategicWallet }).solana, {});
        const program = new Program<Judgechain>(IDL_JSON as unknown as Judgechain, provider);
        const data = await program.account.hackathon.fetch(new PublicKey(id as string));
        setHackathon({
          name: data.name as string,
          organizer: data.organizer as PublicKey,
          isActive: data.isActive as boolean,
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch hackathon data.");
      } finally {
        setLoading(false);
      }
    };

    fetchHackathon();
  }, [id, connection]);

  const handleFinalize = async () => {
    if (!publicKey || !id) {
      toast.error("Please connect your wallet.");
      return;
    }

    setFinalizing(true);
    const toastId = toast.loading("Finalizing hackathon on-chain...");

    try {
      const provider = new AnchorProvider(connection, (window as unknown as { solana: StrategicWallet }).solana, {});
      const program = new Program<Judgechain>(IDL_JSON as unknown as Judgechain, provider);

      // Program ID is already in the IDL or we can use the default
      const tx = await program.methods
        .finalizeHackathon()
        .accounts({
          organizer: publicKey,
          hackathon: new PublicKey(id as string),
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Hackathon finalized successfully!", { id: toastId });
      setHackathon(prev => prev ? { ...prev, isActive: false } : null);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Finalization failed: ${errorMessage}`, { id: toastId });
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-void">
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-void">
        <h1 className="text-xl font-display text-amber-base mb-4 tracking-widest">HACKATHON NOT FOUND</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          Return to Deck
        </Button>
      </div>
    );
  }

  const isOrganizer = publicKey?.toString() === hackathon.organizer.toString();

  return (
    <div className="min-h-screen bg-void text-primary font-body relative overflow-hidden">
      <div className="ambient-glow" />
      
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 stagger-item">
          <button 
            onClick={() => router.push("/organizer")}
            className="text-muted hover:text-amber-base mb-4 flex items-center gap-2 transition-colors font-data text-xs tracking-widest uppercase"
          >
            ← BACK TO COMMAND CENTER
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-display font-bold tracking-tighter text-amber-bright uppercase">{hackathon.name}</h1>
                <div className={`badge ${hackathon.isActive ? 'badge-confirmed' : 'badge-pending'}`}>
                  {hackathon.isActive ? '• PHASE: ACTIVE' : '• PHASE: FINALIZED'}
                </div>
              </div>
              <p className="text-muted font-data text-xs tracking-wider uppercase opacity-80">
                SYSTEM ID: <span className="text-text-secondary">{id}</span>
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 stagger-item" style={{ animationDelay: '100ms' }}>
          <StatCard label="Network Status" value={hackathon.isActive ? "ONLINE" : "OFFLINE"} />
          <StatCard label="Submissions" value="LOCKED" delta="System Ready" />
          <StatCard 
            label="Authority" 
            value={`${hackathon.organizer.toString().slice(0, 4)}...${hackathon.organizer.toString().slice(-4)}`} 
          />
        </section>

        <section className="stagger-item" style={{ animationDelay: '200ms' }}>
          <div className="bg-surface border border-border rounded-lg p-8 card-texture relative">
            <h2 className="text-xl font-display font-bold text-amber-base mb-4 tracking-wide uppercase">Strategic Operations</h2>
            <div className="max-w-2xl">
              <p className="text-text-secondary mb-8 leading-relaxed">
                Finalizing the hackathon results is a critical, irreversible on-chain operation. 
                This will lock the current leaderboard, prevent any further submissions or peer-judge adjustments, 
                and enable the immutable issuance of soulbound achievement certificates.
              </p>

              {hackathon.isActive ? (
                <div className="space-y-6">
                  {!isOrganizer && publicKey && (
                    <div className="bg-red-dim border border-red-base/20 rounded p-4 mb-4">
                      <p className="text-red-base text-xs font-data uppercase tracking-widest flex items-center gap-2">
                        ⚠️ ACCESS DENIED: Only the registered organizer can execute finalization.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    variant="primary" 
                    className="w-full md:w-auto px-12 py-4"
                    onClick={handleFinalize}
                    disabled={finalizing || !isOrganizer}
                  >
                    {finalizing ? "INITIALIZING ON-CHAIN LOCK..." : "SEAL RESULTS & FINALIZE"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4 text-green-base font-data text-sm uppercase tracking-widest border border-green-muted bg-green-dim/20 p-6 rounded">
                  <span className="text-2xl">✓</span>
                  SYSTEM HAS BEEN FINALIZED. RECORDS ARE IMMUTABLE.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
