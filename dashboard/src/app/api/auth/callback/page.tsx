"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verifying GitHub authentication...");

  useEffect(() => {
    const code = searchParams.get("code");
    
    if (!code) {
      toast.error("No authentication code provided");
      router.push("/profile");
      return;
    }

    const exchangeCode = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/github/callback?code=${code}`);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.detail || "Authentication failed");
        }
        
        toast.success(`Successfully linked GitHub profile: ${data.github_username}`);
        router.push("/profile");
      } catch (err) {
        console.error("OAuth error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`GitHub login failed: ${errorMessage}`);
        setStatus(`Failed: ${errorMessage}`);
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        {status.includes("Failed") ? (
          <div className="text-red-500 font-bold mb-4">{status}</div>
        ) : (
          <div className="w-8 h-8 border-4 border-amber-base border-t-transparent rounded-full animate-spin"></div>
        )}
        <p className="text-secondary font-display tracking-widest uppercase">{status}</p>
        {status.includes("Failed") && (
          <button 
            onClick={() => router.push("/profile")}
            className="badge bg-elevated text-secondary px-4 py-2 mt-4 hover:text-white"
          >
            Return to Profile
          </button>
        )}
      </div>
    </div>
  );
}
