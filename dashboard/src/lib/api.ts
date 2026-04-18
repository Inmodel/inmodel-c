import { ScoreResult, ProblemMetadata } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = {
  getProblems: (): Promise<Record<string, ProblemMetadata>> => 
    fetch(`${API_BASE}/problems`).then(r => {
      if (!r.ok) throw new Error("Failed to fetch problems");
      return r.json();
    }),
    
  getLeaderboard: (problemId: string): Promise<ScoreResult[]> => 
    fetch(`${API_BASE}/leaderboard?problem_id=${encodeURIComponent(problemId)}`).then(r => {
      if (!r.ok) throw new Error("Failed to fetch leaderboard");
      return r.json();
    }),
    
  getSubmissions: (): Promise<ScoreResult[]> => 
    fetch(`${API_BASE}/judge/submissions`).then(r => {
      if (!r.ok) throw new Error("Failed to fetch submissions");
      return r.json();
    }),
    
  submitScore: (payload: object, signature: string): Promise<ScoreResult> =>
    fetch(`${API_BASE}/score`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-signature": signature 
      },
      body: JSON.stringify(payload),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Unknown backend error" }));
        throw new Error(err.detail || `Backend error: ${r.status}`);
      }
      return r.json();
    }),
    
  submitJudgeScore: (payload: { submission_id: string; innovation: number; impact: number; presentation: number }): Promise<ScoreResult> =>
    fetch(`${API_BASE}/judge/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Unknown backend error" }));
        throw new Error(err.detail || `Backend error: ${r.status}`);
      }
      return r.json();
    }),
    
  mintCertificate: (submissionId: string): Promise<{ tx_sig: string; solscan_url: string; metadata_uri: string }> =>
    fetch(`${API_BASE}/certificate/${submissionId}`, { method: "POST" }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: "Unknown backend error" }));
        throw new Error(err.detail || `Backend error: ${r.status}`);
      }
      return r.json();
    }),
  createHackathon: (body: object): Promise<{ id: string; on_chain_tx?: string; solscan_url?: string }> =>
    fetch(`${API_BASE}/hackathon/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(r => r.json()),
    
  finalizeHackathon: (id: string): Promise<{ on_chain_tx?: string; solscan_url?: string; winners?: ScoreResult[] }> =>
    fetch(`${API_BASE}/hackathon/${id}/finalize`, {
      method: "POST"
    }).then(r => r.json()),

  getHackathonSubmissions: (id: string): Promise<ScoreResult[]> => 
    fetch(`${API_BASE}/hackathon/${id}/submissions`).then(r => r.json()),
    
  getHackathonWinners: (id: string): Promise<ScoreResult[]> => 
    fetch(`${API_BASE}/hackathon/${id}/winners`).then(r => r.json()),
};
