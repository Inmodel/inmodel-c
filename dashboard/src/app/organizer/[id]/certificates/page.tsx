"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { toast } from "sonner";
import { ScoreResult } from "../../../../types";
import { Button } from "../../../../components/ui/Button";

interface WinnerCardProps {
  submission: ScoreResult;
  hackathonId: string;
}

const WinnerCard = ({ submission, hackathonId }: WinnerCardProps) => {
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);
  const [txUrl, setTxUrl] = useState("");

  const handleMint = async () => {
    setMinting(true);
    const toastId = toast.loading("Minting soulbound certificate...");
    try {
      const res = await api.mintCertificate(submission.submission_id);
      setTxUrl(res.solscan_url || `https://solscan.io/tx/${res.tx_sig}?cluster=devnet`);
      setMinted(true);
      toast.success("Certificate minted successfully!", { id: toastId });
    } catch (err) {
      toast.error(`Minting failed: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className={`p-6 rounded-lg border transition-all duration-500 overflow-hidden relative ${minted ? 'border-green-base bg-[linear-gradient(135deg,rgba(0,214,143,0.1),transparent)]' : 'border-green-muted/30 bg-[linear-gradient(135deg,rgba(0,214,143,0.03),transparent)] hover:border-green-muted'}`}>
      
      {/* Mint Sweep Animation via CSS if minted */}
      {minted && <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,214,143,0.1),transparent)] animate-[chainSweep_1.5s_ease-in-out_forwards]" />}

      <div className="relative z-10 flex flex-col h-full">
        <h3 className="font-display uppercase font-bold text-white tracking-widest mb-1 text-lg">JUDGENOD CERTIFICATE</h3>
        <div className="h-px w-16 bg-amber-base mb-4"></div>
        
        <div className="space-y-3 mb-6">
           <div className="flex flex-col">
             <span className="text-[10px] font-data text-muted uppercase tracking-widest">Issuer</span>
             <span className="font-mono text-sm text-green-base truncate">{hackathonId}</span>
           </div>
           
           <div className="flex flex-col">
             <span className="text-[10px] font-data text-muted uppercase tracking-widest">Recipient Wallet</span>
             <span className="font-mono text-sm text-white truncate">{submission.wallet}</span>
           </div>
           
           <div className="flex flex-col">
             <span className="text-[10px] font-data text-muted uppercase tracking-widest">Final Scored Performance</span>
             <span className="font-data text-xl text-amber-base font-bold">{submission.final_score || submission.system_score.total}/100</span>
           </div>
        </div>

        <div className="mt-auto">
          <div className="text-[10px] font-data text-[#14F195] uppercase tracking-widest mb-4 flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 bg-[#14F195] rotate-45 block"></span> 
             SOULBOUND · NON-TRANSFERABLE
          </div>

          {!minted ? (
            <Button variant="ghost" onClick={handleMint} disabled={minting} className="w-full justify-center border-green-muted text-green-base hover:bg-green-base hover:text-void h-11">
              {minting ? "Minting to Chain..." : "Mint Certificate"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="w-full bg-green-dim/30 border border-green-base text-green-base flex items-center justify-center h-11 rounded font-bold uppercase tracking-widest text-xs font-data">
                ✓ Minted Successfully
              </div>
              <a href={txUrl} target="_blank" rel="noreferrer" className="text-center font-data text-[10px] text-muted hover:text-green-base transform transition-colors">
                Verify on Solscan ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CertificatesPage() {
  const { id } = useParams();
  const router = useRouter();

  const [winners, setWinners] = useState<ScoreResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getHackathonWinners(id as string)
       .then(setWinners)
       .catch(() => toast.error("Failed to load eligible winners."))
       .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/></div></div>;

  const eligible = winners.filter(w => (w.final_score || w.system_score.total) >= 50);

  return (
    <div className="min-h-screen bg-void text-primary font-body">
      <main className="max-w-5xl mx-auto px-6 py-12">
        <button onClick={() => router.push(`/organizer/${id}`)} className="text-muted hover:text-amber-base mb-8 flex items-center gap-2 font-data text-xs tracking-widest uppercase transition-colors">
          ← Back to Monitor
        </button>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase mb-2">Soulbound Issuance</h1>
            <p className="text-muted font-mono text-sm max-w-xl">
              Hackathon is finalized. The following wallets scored 50 points or higher and are eligible to receive immutable JSON-metadata verifiable certificates minted via Metaplex Core.
            </p>
          </div>
          <div>
            <Button variant="primary" className="whitespace-nowrap px-8" disabled={eligible.length === 0}>
              Batch Mint All ({eligible.length})
            </Button>
          </div>
        </header>

        {eligible.length === 0 ? (
           <div className="text-center py-20 bg-surface border border-dashed border-border rounded-lg text-muted font-data text-xs uppercase tracking-widest">
              No eligible winners found (Score ≥ 50).
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {eligible.map(w => (
               <WinnerCard key={w.submission_id} submission={w} hackathonId={id as string} />
             ))}
           </div>
        )}
      </main>
    </div>
  );
}
