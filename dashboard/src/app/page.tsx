import { Navbar } from "./components/Navbar";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <main className="flex flex-col items-center justify-center flex-1 text-center px-6 py-24 gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-card-border bg-card text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Live on Solana Devnet
        </div>

        <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight text-foreground">
          Tamper-proof judging,{" "}
          <span className="text-accent">on-chain.</span>
        </h1>

        <p className="text-lg max-w-md text-muted">
          Submit your project, get scored transparently, and earn a verifiable NFT certificate — all on Solana.
        </p>

        <div className="flex gap-3 mt-2">
          <Link
            href="/submit"
            className="px-5 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-80 bg-accent text-white"
          >
            Submit Project
          </Link>
          <Link
            href="/leaderboard"
            className="px-5 py-2.5 rounded-md text-sm font-semibold border border-border bg-card text-foreground transition-colors hover:bg-border/10"
          >
            View Leaderboard →
          </Link>
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
              className="rounded-xl p-5 border border-card-border bg-card"
            >
              <h3 className="font-semibold text-sm mb-1 text-foreground">{f.title}</h3>
              <p className="text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4 flex items-center justify-between text-xs text-muted">
        <span>© 2026 JudgeChain</span>
        <div className="flex gap-4">
          <a href="#" className="hover:text-accent transition-colors">GitHub</a>
          <a href="#" className="hover:text-accent transition-colors">Docs</a>
        </div>
      </footer>
    </div>
  );
}
