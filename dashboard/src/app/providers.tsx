"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const WalletProviderInner = dynamic(
  () => import("./WalletProviderInner"),
  { ssr: false }
);

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  
  if (!isClient) {
    return null;
  }

  return <WalletProviderInner>{children}</WalletProviderInner>;
}
