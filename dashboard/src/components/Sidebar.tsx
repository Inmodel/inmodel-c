"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { CommandCenterModal } from "./CommandCenterModal";

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsAdmin(!!api.getAdminKey()), 0);
  }, []);

  const devHubLinks = [
    { href: "/", label: "Dashboard Gate" },
    { href: "/submit", label: "Submit Project" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/profile", label: "Developer Profile" },
  ];

  const commandCenterLinks = [
    { href: "/organizer", label: "Monitor Hub" },
    { href: "/organizer/new", label: "Create Hackathon" },
    { href: "/judge", label: "Judge Panel" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        JudgeNod
        <small>v1.0.0-rc.1</small>
      </div>
      <nav className="flex flex-col gap-6 pt-4">
        <div>
          <div className="text-[10px] text-muted uppercase tracking-widest font-data mb-2 px-6">Developer Hub</div>
          {devHubLinks.map((link) => (
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
        </div>

        {isAdmin && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="text-[10px] text-amber-dim uppercase tracking-widest font-data mb-2 px-6 flex items-center gap-2">
               <span>Command Center</span>
               <span className="w-1.5 h-1.5 rounded-full bg-amber-base animate-pulse"></span>
            </div>
            {commandCenterLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-nav-item border-l-2 ${
                  pathname === link.href ? "border-amber-base text-amber-base bg-amber-glow" : "border-transparent hover:border-amber-dim/50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      
      <div className="mt-auto p-4 border-t border-[var(--bg-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--green-base)] animate-pulse"></span>
            <span className="text-[var(--text-primary)] text-sm font-medium">Devnet</span>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className={`transition-all duration-300 hover:scale-110 ${isAdmin ? 'text-amber-base' : 'text-muted opacity-40 hover:opacity-100'}`}
            title={isAdmin ? "Command Center: Authorized" : "Command Center: Unauthorized"}
          >
            {isAdmin ? "🔒" : "🔓"}
          </button>
        </div>
        <div className="text-[var(--text-muted)] text-[10px] font-mono data-mono">
          9vBoP...m2
        </div>
        {isAdmin && (
          <div className="mt-2 text-[8px] font-data text-amber-dim uppercase tracking-widest text-center py-1 border border-amber-dim/20 rounded bg-amber-glow/5">
            Master Admin Active
          </div>
        )}
      </div>

      <CommandCenterModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setIsAdmin(true);
          window.location.reload(); // Hard refresh to update all API contexts
        }}
      />
    </aside>
  );
}
