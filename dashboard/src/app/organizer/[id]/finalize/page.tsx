"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/Button";
import IDL_JSON from "../../../../idl/judgechain.json";
import { Judgechain } from "../../../../idl/judgechain";
import { api } from "../../../../lib/api";

interface HackathonData {
  name: string;
  organizer: PublicKey;
  isActive: boolean;
}

export default function HackathonFinalization() {
  const { id } = useParams();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [hackathon, setHackathon] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Checklist state
  const [checks, setChecks] = useState([false, false, false, false]);
  const allChecked = checks.every(c => c);

  useEffect(() => {
    if (!id || !connection) return;

    const fetchHackathon = async () => {
      try {
        const provider = new AnchorProvider(connection, (window as unknown as { solana: Wallet }).solana, {});
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

  const toggleCheck = (idx: number) => {
    const next = [...checks];
    next[idx] = !next[idx];
    setChecks(next);
  };

  const handleFinalize = async () => {
    if (!publicKey || !id) return toast.error("Please connect your wallet.");

    setFinalizing(true);
    const toastId = toast.loading("Calling finalize_hackathon instruction...");

    try {
      const provider = new AnchorProvider(connection, (window as unknown as { solana: Wallet }).solana, {});
      const program = new Program<Judgechain>(IDL_JSON as unknown as Judgechain, provider);

      const tx = await program.methods
        .finalizeHackathon()
        .accounts({
          organizer: publicKey,
          hackathon: new PublicKey(id as string),
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // Notify Backend
      await api.finalizeHackathon(id as string).catch(() => {});

      toast.success("Hackathon finalized successfully!", { id: toastId });
      setHackathon(prev => prev ? { ...prev, isActive: false } : null);
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error(`Finalization failed: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div></div>;
  if (!hackathon) return <div className="min-h-screen bg-void text-center p-20 text-amber-base font-display">HACKATHON NOT FOUND</div>;

  const isOrganizer = publicKey?.toString() === hackathon.organizer.toString();

  return (
    <div className="min-h-screen bg-void text-primary font-body">
      <main className="max-w-3xl mx-auto px-6 py-12">
        
        <button onClick={() => router.push(`/organizer/${id}`)} className="text-muted hover:text-amber-base mb-8 flex items-center gap-2 font-data text-xs tracking-widest uppercase transition-colors">
          ← Back to Monitor
        </button>

        <h1 className="text-3xl font-display font-bold uppercase mb-8">Execute Finalization</h1>

        {/* Warning Section */}
        <div className="border border-amber-dim bg-amber-glow p-6 rounded-lg mb-10">
          <h2 className="text-amber-base font-bold text-sm tracking-widest uppercase mb-3 flex items-center gap-2">
            <span>⚠</span> FINALIZATION IS PERMANENT
          </h2>
          <p className="text-primary text-sm leading-relaxed font-mono">
            Once finalized, no scores can be modified. All submissions will be locked on-chain. Certificate minting will be enabled for winners (final_score >= 50).<br/><br/>
            This action cannot be undone.
          </p>
        </div>

        {!hackathon.isActive ? (
          <div className="bg-green-glow border border-green-muted rounded-lg p-8 animate-in slide-in-from-bottom">
            <h3 className="text-green-base font-data font-bold uppercase tracking-widest mb-4">✓ HACKATHON FINALIZED ON-CHAIN</h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
               <div className="text-muted">STATUS</div><div className="text-green-base">LOCKED IMMUTABLE</div>
               <div className="text-muted">WINNERS</div><div><a href={`/organizer/${id}/certificates`} className="text-amber-base hover:underline">View Eligible & Mint →</a></div>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border p-8 rounded-lg shadow-xl">
             <h3 className="font-data text-xs text-muted tracking-widest uppercase mb-6">Pre-Finalization Checklist</h3>
             
             <div className="space-y-4 mb-10">
               {[
                 "All submissions have been reviewed",
                 "All judge scores have been submitted",
                 "Leaderboard has been verified",
                 "Winners have been notified"
               ].map((label, i) => (
                 <label key={i} className="flex items-start gap-4 cursor-pointer group">
                   <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${checks[i] ? 'bg-amber-base border-amber-base text-void' : 'bg-void border-border group-hover:border-amber-muted text-transparent'}`}>
                     ✓
                   </div>
                   <span className={`text-sm ${checks[i] ? 'text-primary' : 'text-text-secondary'}`}>{label}</span>
                 </label>
               ))}
             </div>

             {!isOrganizer && publicKey ? (
                <div className="text-red-base text-xs font-data uppercase p-4 border border-red-dim bg-red-dim/20 rounded">
                  Access Denied: Only the organizing wallet can execute this instruction.
                </div>
             ) : (
                !showConfirm ? (
                  <button 
                    disabled={!allChecked}
                    onClick={() => setShowConfirm(true)}
                    className="w-full font-display font-bold uppercase tracking-wider py-4 rounded bg-red-base text-void disabled:opacity-30 disabled:bg-border transition-colors hover:bg-red-500"
                  >
                    FINALIZE HACKATHON — PERMANENT
                  </button>
                ) : (
                  <div className="border border-red-base/50 bg-red-dim/20 p-6 rounded animate-in fade-in zoom-in-95 duration-200">
                    <h4 className="text-red-base font-bold font-data text-sm uppercase mb-4 tracking-wider">Are you absolutely sure?</h4>
                    <p className="text-sm font-mono text-muted mb-6">This will lock all scores on-chain. This cannot be reversed.</p>
                    <div className="flex gap-4">
                      <Button variant="ghost" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
                      <button 
                        onClick={handleFinalize}
                        disabled={finalizing}
                        className="flex-1 bg-red-base text-void font-bold uppercase tracking-wider font-display rounded hover:bg-red-500 disabled:opacity-50"
                      >
                        {finalizing ? "Executing..." : "Confirm Finalization"}
                      </button>
                    </div>
                  </div>
                )
             )}
          </div>
        )}
      </main>
    </div>
  );
}
