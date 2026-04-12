"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const WalletProviderInner = dynamic(
  () => import("./WalletProviderInner"),
  { ssr: false }
);

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // To avoid hydration mismatch, we only render the wallet provider on the client
  if (!mounted) {
    return <>{children}</>;
  }

  return <WalletProviderInner>{children}</WalletProviderInner>;
}
