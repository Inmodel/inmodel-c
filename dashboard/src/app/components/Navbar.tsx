"use client";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  return (
    <nav
      className="flex items-center justify-between px-6 py-3 border-b text-sm"
      style={{ borderColor: "var(--border)", background: "var(--background)" }}
    >
      <div className="flex items-center gap-6">
        <a href="/" className="font-semibold tracking-tight text-base" style={{ color: "var(--foreground)" }}>
          ▲ JudgeChain
        </a>
        <div className="hidden md:flex gap-5" style={{ color: "var(--muted)" }}>
          <a href="/submit" className="hover:opacity-70 transition-opacity">Submit</a>
          <a href="/leaderboard" className="hover:opacity-70 transition-opacity">Leaderboard</a>
        </div>
      </div>
      <WalletMultiButton
        style={{
          background: "var(--accent)",
          color: "#fff",
          borderRadius: "6px",
          fontSize: "13px",
          height: "34px",
          padding: "0 14px",
        }}
      />
    </nav>
  );
}
