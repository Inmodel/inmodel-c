import { ScoreResult, ProblemMetadata } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const getHeaders = (extra: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== "undefined") {
    const adminKey = localStorage.getItem("admin_access_key");
    if (adminKey) headers["x-admin-access"] = adminKey;
    
    // Auto-inject wallet headers if we have a way to track them globally?
    // For now, these are usually passed explicitly but we'll prioritize the admin key.
  }
  return headers;
};

export const api = {
  setAdminKey: (key: string) => localStorage.setItem("admin_access_key", key),
  getAdminKey: () => typeof window !== "undefined" ? localStorage.getItem("admin_access_key") : null,
  clearAdminKey: () => localStorage.removeItem("admin_access_key"),
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
    
  getSubmissions: (wallet?: string, signature?: string): Promise<ScoreResult[]> => 
    fetch(`${API_BASE}/judge/submissions`, {
      headers: getHeaders({
        ...(wallet ? { "x-wallet": wallet } : {}),
        ...(signature ? { "x-signature": signature } : {})
      })
    }).then(r => {
      if (!r.ok) throw new Error("Unauthorized or server error");
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
    
  submitJudgeScore: (payload: { submission_id: string; innovation: number; impact: number; presentation: number; judge_wallet: string }, signature: string): Promise<ScoreResult> =>
    fetch(`${API_BASE}/judge/score`, {
      method: "POST",
      headers: getHeaders({ 
        "Content-Type": "application/json",
        "x-signature": signature
      }),
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
    
  getOrganizerHackathons: <T>(wallet: string): Promise<T[]> =>
    fetch(`${API_BASE}/hackathon/organizer/${wallet}`).then(r => r.json()),
};
