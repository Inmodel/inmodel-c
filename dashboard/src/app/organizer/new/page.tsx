"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";

import { useProgram, getHackathonPda } from "../../../lib/useProgram";
import { toast } from "sonner";

interface CriterionRule {
  id: string;
  description: string;
  points: number;
  validator: string;
  params: Record<string, string>;
}

interface ProblemInput {
  id: string;
  title: string;
  description: string;
  max_custom_points: number;
  custom_criteria: CriterionRule[];
}

export default function NewHackathonPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const program = useProgram();
  const [name, setName] = useState("");
  const [problems, setProblems] = useState<ProblemInput[]>([
    { id: "", title: "", description: "", max_custom_points: 10, custom_criteria: [] }
  ]);
  const [creating, setCreating] = useState(false);

  function addProblem() {
    setProblems([...problems, { id: "", title: "", description: "", max_custom_points: 10, custom_criteria: [] }]);
  }

  function updateProblem(index: number, field: keyof ProblemInput, value: string | number | CriterionRule[]) {
    const next = [...problems];
    next[index] = { ...next[index], [field]: value };
    setProblems(next);
  }

  function addCriterion(pIdx: number) {
    const next = [...problems];
    next[pIdx].custom_criteria.push({
      id: `criterion_${Date.now()}`,
      description: "",
      points: 5,
      validator: "has_dependency",
      params: { package: "" }
    });
    setProblems(next);
  }

  function updateCriterion(pIdx: number, cIdx: number, field: keyof CriterionRule, value: string | number | Record<string, string>) {
    const next = [...problems];
    const updated = { ...next[pIdx].custom_criteria[cIdx], [field]: value };
    next[pIdx].custom_criteria[cIdx] = updated as CriterionRule;
    setProblems(next);
  }
  
  function updateCriterionParam(pIdx: number, cIdx: number, key: string, value: string) {
    const next = [...problems];
    next[pIdx].custom_criteria[cIdx].params[key] = value;
    setProblems(next);
  }

  function removeCriterion(pIdx: number, cIdx: number) {
    const next = [...problems];
    next[pIdx].custom_criteria.splice(cIdx, 1);
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
      const backendToast = toast.loading("Registering with JudgeNod metadata service...");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/hackathons`, {
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
      } catch {
        toast.error("Metadata sync failed. Your hackathon is on-chain but not in our directory.", { id: backendToast });
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || "On-chain initialization failed.", { id: chainToast });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex flex-col items-center px-6 py-16 flex-1 text-foreground">
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

                  {/* CUSTOM SCORING CRITERIA */}
                  <div className="pt-4 border-t border-border mt-3">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold text-muted uppercase tracking-widest">Custom Scoring Criteria</label>
                      <button type="button" onClick={() => addCriterion(i)} className="text-xs text-accent hover:underline">+ Add Criterion</button>
                    </div>

                    <div className="space-y-3">
                      {p.custom_criteria.map((c, cIdx) => (
                        <div key={cIdx} className="bg-card border border-border p-3 rounded-md grid grid-cols-12 gap-3 relative">
                          <button type="button" onClick={() => removeCriterion(i, cIdx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-xs font-bold">X</button>
                          <div className="col-span-8">
                            <input 
                              className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none" 
                              placeholder="Description" value={c.description} onChange={e => updateCriterion(i, cIdx, "description", e.target.value)} 
                            />
                          </div>
                          <div className="col-span-4">
                            <input 
                              className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none" 
                              type="number" placeholder="Points" value={c.points} onChange={e => updateCriterion(i, cIdx, "points", parseInt(e.target.value) || 0)} 
                            />
                          </div>
                          <div className="col-span-6">
                            <select 
                              className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none"
                              value={c.validator} onChange={e => {
                                updateCriterion(i, cIdx, "validator", e.target.value);
                                if (e.target.value === "has_dependency") updateCriterion(i, cIdx, "params", { package: "" });
                                else if (e.target.value === "has_file_matching") updateCriterion(i, cIdx, "params", { pattern: "" });
                                else if (e.target.value === "readme_mentions") updateCriterion(i, cIdx, "params", { keyword: "" });
                                else updateCriterion(i, cIdx, "params", {});
                              }}
                            >
                              <option value="has_dependency">Has Dependency</option>
                              <option value="has_file_matching">Has File Matching</option>
                              <option value="has_folder">Has Folder</option>
                              <option value="readme_mentions">README Mentions</option>
                              <option value="has_tests">Has Tests Folder</option>
                              <option value="deployment_has_endpoint">Deployment Endpoint</option>
                            </select>
                          </div>
                          <div className="col-span-6">
                            {c.validator === "has_dependency" && (
                              <input className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none" placeholder="Package (e.g. anchor)" value={c.params.package || ""} onChange={e => updateCriterionParam(i, cIdx, "package", e.target.value)} />
                            )}
                            {c.validator === "has_file_matching" && (
                              <input className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none" placeholder="Pattern (e.g. wallet)" value={c.params.pattern || ""} onChange={e => updateCriterionParam(i, cIdx, "pattern", e.target.value)} />
                            )}
                            {c.validator === "readme_mentions" && (
                              <input className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs outline-none" placeholder="Keyword" value={c.params.keyword || ""} onChange={e => updateCriterionParam(i, cIdx, "keyword", e.target.value)} />
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="text-right text-xs text-muted">
                        Total custom points: {p.custom_criteria.reduce((sum, c) => sum + (c.points || 0), 0)}/{p.max_custom_points}
                      </div>
                    </div>
                  </div>
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
