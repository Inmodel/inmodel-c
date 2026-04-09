"use client";
import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { useProgram } from "../../lib/useProgram";

type Entry = {
  pubkey: string;
  submissionId: string;
  systemScore: number;
  judgeScore: number;
  finalScore: number;
};

export default function LeaderboardPage() {
  const program = useProgram();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!program) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (program.account as any).scoreHash.all()
      .then((accounts: { publicKey: { toBase58: () => string }; account: { submissionId: { toBase58: () => string }; systemScore: number; judgeScore: number; finalScore: number } }[]) => {
        const sorted = accounts
          .map(a => ({
            pubkey: a.publicKey.toBase58(),
            submissionId: a.account.submissionId.toBase58(),
            systemScore: a.account.systemScore,
            judgeScore: a.account.judgeScore,
            finalScore: a.account.finalScore,
          }))
          .sort((a, b) => b.finalScore - a.finalScore);
        setEntries(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [program]);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)" }}>
      <Navbar />
      <main className="flex flex-col items-center px-6 py-16 flex-1">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Leaderboard</h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            {loading ? "Loading from chain…" : `${entries.length} submission${entries.length !== 1 ? "s" : ""} on-chain`}
          </p>

          {!loading && entries.length === 0 && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No scores on-chain yet. Be the first to submit!</p>
          )}

          {entries.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--card)", borderBottom: "1px solid var(--card-border)" }}>
                    {["Rank", "Submission", "System", "Judge", "Final"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={e.pubkey}
                      style={{ background: i % 2 === 0 ? "var(--card)" : "var(--background)", borderBottom: "1px solid var(--card-border)" }}
                    >
                      <td className="px-4 py-3 font-bold" style={{ color: i < 3 ? "var(--accent)" : "var(--muted)" }}>
                        {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--foreground)" }}>
                        {e.submissionId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{e.systemScore}</td>
                      <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{e.judgeScore}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "var(--accent)" }}>{e.finalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
