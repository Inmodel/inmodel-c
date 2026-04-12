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
    </aside>
  );
}
