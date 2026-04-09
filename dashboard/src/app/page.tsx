import { Navbar } from "./components/Navbar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <Navbar />

      {/* Hero */}
      <main className="flex flex-col items-center justify-center flex-1 text-center px-6 py-24 gap-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)", background: "var(--card)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          Live on Solana Devnet
        </div>

        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight" style={{ color: "var(--foreground)" }}>
          Tamper-proof judging,{" "}
          <span style={{ color: "var(--accent)" }}>on-chain.</span>
        </h1>

        <p className="text-lg max-w-md" style={{ color: "var(--muted)" }}>
          Submit your project, get scored transparently, and earn a verifiable NFT certificate — all on Solana.
        </p>

        <div className="flex gap-3 mt-2">
          <a
            href="/submit"
            className="px-5 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Submit Project
          </a>
          <a
            href="/leaderboard"
            className="px-5 py-2.5 rounded-md text-sm font-semibold border transition-colors hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--card)" }}
          >
            View Leaderboard →
          </a>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="px-6 pb-24 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "On-Chain Scores", desc: "Every score is written to Solana. No tampering, no disputes." },
            { title: "NFT Certificates", desc: "Winners receive a Metaplex Core NFT as proof of achievement." },
            { title: "AI + Human Judging", desc: "Automated scoring combined with judge review for fairness." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-5 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-4 flex items-center justify-between text-xs"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        <span>© 2026 JudgeChain</span>
        <div className="flex gap-4">
          <a href="#" className="hover:opacity-70">GitHub</a>
          <a href="#" className="hover:opacity-70">Docs</a>
        </div>
      </footer>
    </div>
  );
}
