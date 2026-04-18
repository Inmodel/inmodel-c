"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { web3 } from "@coral-xyz/anchor";
import { useProgram, getHackathonPda } from "../../../lib/useProgram";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";

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
  
  const [step, setStep] = useState(1);
  const [activeProblemTab, setActiveProblemTab] = useState(0);
  const [creating, setCreating] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  
  const [problems, setProblems] = useState<ProblemInput[]>([
    { id: "", title: "", description: "", max_custom_points: 10, custom_criteria: [] }
  ]);

  const totalCustomPoints = (pIdx: number) => 
    problems[pIdx].custom_criteria.reduce((sum, c) => sum + (c.points || 0), 0);

  function addProblem() {
    if (problems.length >= 5) return toast.info("Maximum 5 problems allowed.");
    setProblems([...problems, { id: "", title: "", description: "", max_custom_points: 10, custom_criteria: [] }]);
  }

  function updateProblem(index: number, field: keyof ProblemInput, value: string | number | CriterionRule[]) {
    const next = [...problems];
    next[index] = { ...next[index], [field]: value };
    setProblems(next);
  }

  function removeProblem(index: number) {
    if (problems.length <= 1) return toast.error("Must have at least one problem.");
    const next = [...problems];
    next.splice(index, 1);
    setProblems(next);
    if (activeProblemTab >= next.length) setActiveProblemTab(Math.max(0, next.length - 1));
  }

  function addCriterion(pIdx: number) {
    if (problems[pIdx].custom_criteria.length >= 5) return toast.info("Maximum 5 criteria per problem.");
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

  const validateStep1 = () => !!name;
  const validateStep2 = () => problems.every(p => !!p.id && !!p.title);
  const validateStep3 = () => problems.every((_, i) => totalCustomPoints(i) <= 10);

  async function handleCreate() {
    if (!publicKey || !program) return toast.error("Connect wallet first.");
    if (!validateStep1() || !validateStep2() || !validateStep3()) return toast.error("Please verify all fields.");

    setCreating(true);
    const chainToast = toast.loading("Creating hackathon PDA...");

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

      toast.success(
        <div className="flex flex-col">
          <span className="font-bold text-green-base text-xs mb-1">ON-CHAIN CONFIRMED</span>
          <a target="_blank" rel="noreferrer" className="underline text-[10px]" href="https://solscan.io">View on Solscan ↗</a>
        </div>, 
        { id: chainToast }
      );
      
      // 2. Register on Backend
      const backendToast = toast.loading("Registering with JudgeNod metadata service...");
      try {
        await api.createHackathon({
          name,
          email,
          startDate,
          endDate,
          description,
          organizer: publicKey.toBase58(),
          pubkey: hackathonPda.toBase58(),
          problems,
          scoring_weights: { system: 70, judge: 30 }
        });
        
        toast.success("Hackathon fully active!", { id: backendToast });
        setTimeout(() => router.push(`/organizer/${hackathonPda.toBase58()}`), 2000);
      } catch {
        toast.error("Metadata sync failed. Your hackathon is on-chain but not synced to the dashboard.", { id: backendToast });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || "On-chain initialization failed.", { id: chainToast });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-void text-primary font-body">
      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Step Progress Bar */}
        <div className="flex items-center gap-2 mb-12 overflow-x-auto pb-4 hide-scrollbar">
          {[
            { n: 1, label: "Details" }, 
            { n: 2, label: "Problems" }, 
            { n: 3, label: "Criteria" }, 
            { n: 4, label: "Deploy" }
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div 
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-data text-xs uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
                  step === s.n ? 'bg-amber-base text-void font-bold shadow-[0_0_15px_rgba(240,165,0,0.4)]' : 
                  step > s.n ? 'bg-green-base text-void font-bold' : 
                  'bg-elevated text-muted border border-border'
                }`}
              >
                <span>{s.n}</span>
                <span>{s.label}</span>
              </div>
              {i < arr.length - 1 && (
                <div className={`h-px w-8 flex-shrink-0 ${step > s.n ? 'bg-green-base' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-display font-bold mb-6 tracking-wide uppercase">Hackathon Configuration</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="input-label">Hackathon Name</label>
                  <input className="input-field" placeholder="e.g. Solana Grizzlython 2026" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div>
                  <label className="input-label">Organizer Email (Optional)</label>
                  <input type="email" className="input-field" placeholder="notifications@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Start Date</label>
                    <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label">End Date</label>
                    <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="input-label">Description</label>
                  <textarea className="input-field h-24 resize-none" placeholder="Brief overview of the hackathon goals..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button variant="primary" disabled={!validateStep1()} onClick={() => setStep(2)}>
                    Next: Define Problems →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-display font-bold mb-6 tracking-wide uppercase">Problem Statements</h2>
              
              <div className="space-y-4 mb-8">
                {problems.map((p, i) => (
                  <div key={i} className="bg-elevated border border-border p-5 rounded-lg relative">
                    <button type="button" onClick={() => removeProblem(i)} className="absolute top-4 right-4 text-muted hover:text-red-base font-bold text-xs uppercase tracking-widest transition-colors">Remove</button>
                    <div className="grid grid-cols-2 gap-4 mb-4 pr-16">
                      <div>
                        <label className="input-label">ID / Slug</label>
                        <input className="input-field" placeholder="e.g. defi-track" value={p.id} onChange={e => updateProblem(i, "id", e.target.value)} />
                      </div>
                      <div>
                        <label className="input-label">Title</label>
                        <input className="input-field" placeholder="e.g. Decentralized Finance" value={p.title} onChange={e => updateProblem(i, "title", e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Mission Brief</label>
                      <input className="input-field" placeholder="Describe the expectations..." value={p.description} onChange={e => updateProblem(i, "description", e.target.value)} />
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={addProblem} className="text-xs font-data text-amber-base hover:text-amber-bright tracking-widest uppercase transition-colors px-1">+ Add Problem</button>
              </div>

              <div className="bg-void border border-amber-dim/50 p-5 rounded-lg mb-8">
                <h3 className="font-data text-xs text-muted uppercase tracking-widest mb-4">Immutable Scoring Weights</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between font-data text-xs mb-1">
                      <span className="text-primary">System Score (Automated AI Engine)</span>
                      <span className="text-amber-base">70%</span>
                    </div>
                    <div className="h-2 w-full bg-border rounded overflow-hidden">
                      <div className="h-full bg-amber-base w-[70%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-data text-xs mb-1">
                      <span className="text-primary">Peer Judge Score (Human Override)</span>
                      <span className="text-sol-purple">30%</span>
                    </div>
                    <div className="h-2 w-full bg-border rounded overflow-hidden">
                      <div className="h-full bg-sol-purple w-[30%]" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-4">These weights are enforced on-chain. System output carries 70% jurisdiction over final scores.</p>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                <Button variant="primary" disabled={!validateStep2()} onClick={() => setStep(3)}>Next: Custom Criteria →</Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-display font-bold mb-6 tracking-wide uppercase">Custom Criteria</h2>
              
              <div className="flex border-b border-border mb-6 overflow-x-auto hide-scrollbar gap-2">
                {problems.map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveProblemTab(i)}
                    className={`font-data text-xs uppercase tracking-widest px-4 py-3 whitespace-nowrap transition-all border-b-2 ${activeProblemTab === i ? 'text-amber-base border-amber-base bg-amber-glow' : 'text-muted border-transparent hover:bg-elevated'}`}
                  >
                    {p.title || `Problem ${i+1}`}
                  </button>
                ))}
              </div>

              <div className="space-y-4 min-h-[300px]">
                {problems[activeProblemTab].custom_criteria.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg bg-void/50">
                    <p className="font-data text-xs text-muted uppercase tracking-widest mb-2">No custom constraints</p>
                    <p className="text-text-secondary text-sm mb-4">Add specific tech requirements for the AI to enforce during scoring.</p>
                    <Button variant="ghost" onClick={() => addCriterion(activeProblemTab)}>+ Add Criterion</Button>
                  </div>
                )}

                {problems[activeProblemTab].custom_criteria.map((c, cIdx) => (
                  <div key={cIdx} className="bg-elevated border border-border p-4 rounded-lg grid grid-cols-12 gap-4 relative">
                    <button type="button" onClick={() => removeCriterion(activeProblemTab, cIdx)} className="absolute top-2 right-2 text-muted hover:text-red-base text-[10px] font-bold p-2">✕</button>
                    
                    <div className="col-span-12 md:col-span-8">
                      <label className="input-label">Description</label>
                      <input className="input-field py-2 text-xs" placeholder="e.g. Uses Anchor Framework" value={c.description} onChange={e => updateCriterion(activeProblemTab, cIdx, "description", e.target.value)} />
                    </div>
                    
                    <div className="col-span-12 md:col-span-4">
                      <label className="input-label">Points</label>
                      <input type="number" min="0" max="10" className="input-field py-2 text-xs" value={c.points} onChange={e => updateCriterion(activeProblemTab, cIdx, "points", parseInt(e.target.value)||0)} />
                    </div>
                    
                    <div className="col-span-12 md:col-span-6">
                      <label className="input-label">Validator Agent</label>
                      <select 
                        className="input-field py-2 text-xs"
                        value={c.validator} 
                        onChange={e => {
                          const val = e.target.value;
                          updateCriterion(activeProblemTab, cIdx, "validator", val);
                          if (val === "has_dependency") updateCriterion(activeProblemTab, cIdx, "params", { package: "" });
                          else if (val === "has_file_matching") updateCriterion(activeProblemTab, cIdx, "params", { pattern: "" });
                          else if (val === "readme_mentions") updateCriterion(activeProblemTab, cIdx, "params", { keyword: "" });
                          else updateCriterion(activeProblemTab, cIdx, "params", {});
                        }}
                      >
                        <option value="has_dependency">has_dependency</option>
                        <option value="has_file_matching">has_file_matching</option>
                        <option value="has_folder">has_folder</option>
                        <option value="readme_mentions">readme_mentions</option>
                        <option value="has_tests">has_tests</option>
                        <option value="deployment_has_endpoint">deployment_has_endpoint</option>
                      </select>
                    </div>
                    
                    <div className="col-span-12 md:col-span-6">
                       {c.validator === "has_dependency" && (
                         <><label className="input-label">Package Name</label><input className="input-field py-2 text-xs" placeholder="e.g. @solana/web3.js" value={c.params.package || ""} onChange={e => updateCriterionParam(activeProblemTab, cIdx, "package", e.target.value)} /></>
                       )}
                       {c.validator === "has_file_matching" && (
                         <><label className="input-label">File Pattern</label><input className="input-field py-2 text-xs" placeholder="e.g. src/programs/*.rs" value={c.params.pattern || ""} onChange={e => updateCriterionParam(activeProblemTab, cIdx, "pattern", e.target.value)} /></>
                       )}
                       {c.validator === "readme_mentions" && (
                         <><label className="input-label">Keyword Match</label><input className="input-field py-2 text-xs" placeholder="e.g. 'architecture'" value={c.params.keyword || ""} onChange={e => updateCriterionParam(activeProblemTab, cIdx, "keyword", e.target.value)} /></>
                       )}
                    </div>
                  </div>
                ))}

                {problems[activeProblemTab].custom_criteria.length > 0 && (
                  <div className="pt-2">
                    <button type="button" onClick={() => addCriterion(activeProblemTab)} className="text-xs font-data text-amber-base hover:text-amber-bright tracking-widest uppercase transition-colors px-1">+ Add Criterion</button>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-border mt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
                <div className="flex items-center gap-6">
                  <div className={`font-data text-sm uppercase tracking-widest ${totalCustomPoints(activeProblemTab) > 10 ? 'text-red-base' : 'text-amber-base'}`}>
                    {totalCustomPoints(activeProblemTab)} / 10 points assigned
                  </div>
                  <Button variant="primary" disabled={!validateStep3()} onClick={() => setStep(4)}>Next: Deploy On-Chain →</Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-display font-bold mb-6 tracking-wide uppercase text-green-base flex items-center gap-3">
                <span className="loading-dots"><span className="loading-dot bg-green-base"/><span className="loading-dot bg-green-base"/><span className="loading-dot bg-green-base"/></span>
                Ready for Genesis
              </h2>
              
              <div className="bg-void border border-green-muted/50 p-6 rounded-xl font-mono mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-green-glow opacity-30 blur-xl"></div>
                <div className="relative z-10 grid grid-cols-2 gap-y-4">
                  <div className="text-muted text-xs uppercase">Target Name</div>
                  <div className="text-white">{name}</div>
                  
                  <div className="text-muted text-xs uppercase">Active Tracks</div>
                  <div className="text-white">{problems.length} Problem Statement{problems.length !== 1 ? 's' : ''}</div>
                  
                  <div className="text-muted text-xs uppercase">Custom Constraints</div>
                  <div className="text-white">{problems.reduce((sum, p) => sum + p.custom_criteria.length, 0)} Rules Configured</div>
                  
                  <div className="text-muted text-xs uppercase">Voting Topology</div>
                  <div className="text-amber-base font-bold">70% System / 30% Judge</div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
                {!publicKey ? (
                   <div className="py-2 px-4 border border-red-dim bg-red-dim/20 text-red-base rounded font-data text-xs tracking-widest uppercase">
                     ⚠ Please connect wallet to deploy
                   </div>
                ) : (
                   <Button variant="primary" disabled={creating} onClick={handleCreate} className="min-w-[240px]">
                     {creating ? "Communicating with Solana..." : "Create Hackathon On-Chain →"}
                   </Button>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
