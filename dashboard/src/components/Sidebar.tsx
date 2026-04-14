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
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        JudgeChain
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
      
      <div className="mt-auto p-4 border-t border-border">
        <a 
          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/github`}
          className="w-full flex items-center justify-center gap-2 badge bg-elevated hover:bg-surface text-secondary border border-border px-4 py-2 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          Link GitHub
        </a>
      </div>
    </aside>
  );
}
