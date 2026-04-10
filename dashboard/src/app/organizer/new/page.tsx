"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { Navbar } from "../../components/Navbar";
import { useProgram, getHackathonPda } from "../../../lib/useProgram";
import { toast } from "sonner";

export default function NewHackathonPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [name, setName] = useState("");
  const [problems, setProblems] = useState([{ id: "", title: "", description: "" }]);
  const [creating, setCreating] = useState(false);

  function addProblem() {
    setProblems([...problems, { id: "", title: "", description: "" }]);
  }

  function updateProblem(index: number, field: string, value: string) {
    const next = [...problems];
    (next[index] as any)[field] = value;
    setProblems(next);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !program) return toast.error("Connect wallet first.");
    if (problems.some(p => !p.id || !p.title)) return toast.error("Please fill in all problem fields.");

    setCreating(true);
    const chainToast = toast.loading("Initializing Hackathon on Solana...");

    try {
      const [hackathonPda] = getHackathonPda(publicKey);

      // 1. Create Hackathon on-chain
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (program as any).methods
        .createHackathon(name)
        .accounts({
          organizer: publicKey,
          hackathon: hackathonPda,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      toast.success("Hackathon created on-chain!", { id: chainToast });
      
      // 2. Register on Backend
      const backendToast = toast.loading("Registering with JudgeChain metadata service...");
      try {
        const res = await fetch("http://localhost:8000/api/v1/hackathons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            organizer: publicKey.toBase58(),
            pubkey: hackathonPda.toBase58(),
            problems,
          }),
        });
        if (!res.ok) throw new Error("Backend registration failed.");
        toast.success("Hackathon fully active!", { id: backendToast });
        router.push("/organizer");
      } catch (err) {
        toast.error("Metadata sync failed. Your hackathon is on-chain but not in our directory.", { id: backendToast });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "On-chain initialization failed.", { id: chainToast });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-2xl bg-card border border-card-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-1">Create New Hackathon</h1>
          <p className="text-sm text-muted mb-8">Deploy a new hackathon program and define its challenges.</p>

          <form onSubmit={handleCreate} className="flex flex-col gap-6">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-widest mb-2 block">Hackathon Name</label>
              <input
                className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all"
                placeholder="e.g. Solana Grizzlython 2026"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Problem Statements</label>
                <button
                  type="button"
                  onClick={addProblem}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  + Add Challenge
                </button>
              </div>

              {problems.map((p, i) => (
                <div key={i} className="p-4 border border-border rounded-xl bg-background/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="bg-background border border-border text-foreground rounded-md px-3 py-2 text-xs outline-none focus:border-accent"
                      placeholder="Problem ID (e.g. defi-01)"
                      value={p.id}
                      onChange={e => updateProblem(i, "id", e.target.value)}
                      required
                    />
                    <input
                      className="bg-background border border-border text-foreground rounded-md px-3 py-2 text-xs outline-none focus:border-accent"
                      placeholder="Title (e.g. Best DEX)"
                      value={p.title}
                      onChange={e => updateProblem(i, "title", e.target.value)}
                      required
                    />
                  </div>
                  <textarea
                    className="w-full bg-background border border-border text-foreground rounded-md px-3 py-2 text-xs outline-none focus:border-accent h-20"
                    placeholder="Description of the challenge..."
                    value={p.description}
                    onChange={e => updateProblem(i, "description", e.target.value)}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={creating || !publicKey}
              className="mt-4 bg-accent text-white px-6 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50"
            >
              {creating ? "Deploying..." : "Deploy to Solana & Active Hackathon"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
