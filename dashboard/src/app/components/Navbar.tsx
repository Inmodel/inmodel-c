"use client";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-background text-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight text-base text-foreground">
          ▲ JudgeChain
        </Link>
        <div className="hidden md:flex gap-5 text-muted">
          <Link href="/submit" className="hover:text-accent transition-colors">
            Submit
          </Link>
          <Link href="/leaderboard" className="hover:text-accent transition-colors">
            Leaderboard
          </Link>
          <Link href="/profile" className="hover:text-accent transition-colors">
            My Projects
          </Link>
          <Link href="/judge" className="hover:text-accent transition-colors">
            Judge
          </Link>
          <Link href="/organizer" className="hover:text-accent transition-colors">
            Organizer
          </Link>
        </div>
      </div>
      <div className="wallet-adapter-custom">
        <WalletMultiButton />
      </div>
    </nav>
  );
}
