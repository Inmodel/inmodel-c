export function SolscanLink({ tx, label = "View on Solscan ↗" }: { tx: string; label?: string }) {
  if (!tx) return null;
  return (
    <a
      href={`https://solscan.io/tx/${tx}?cluster=devnet`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-400 hover:text-green-300 underline text-sm font-mono"
    >
      {label}
    </a>
  );
}
