"use client";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <button
        onClick={() => disconnect()}
        className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md font-mono text-sm transition-all shadow-sm flex items-center gap-2"
      >
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md font-semibold text-sm transition-all shadow-sm"
    >
      Connect Wallet
    </button>
  );
}
