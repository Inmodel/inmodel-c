"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/submit", label: "Submit" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/judge", label: "Judge Panel" },
    { href: "/organizer", label: "Organizer" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        JudgeNod
        <small>v1.0.0-rc.1</small>
      </div>
      <nav>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-nav-item ${
              pathname === link.href ? "active" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      
      <div className="mt-auto p-4 border-t border-[var(--bg-border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[var(--green-base)] animate-pulse"></span>
          <span className="text-[var(--text-primary)] text-sm font-medium">Devnet</span>
        </div>
        <div className="text-[var(--text-muted)] text-[10px] font-mono data-mono">
          9vBoP...m2
        </div>
      </div>
    </aside>
  );
}
