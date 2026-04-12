import React from 'react';

export const ChainConfirm = ({ txHash }: { txHash: string }) => {
  return (
    <div className="chain-confirm">
      <div className="chain-confirm-label">ON-CHAIN CONFIRMED</div>
      <div className="chain-confirm-tx">{txHash}</div>
      <a 
        href={`https://solscan.io/tx/${txHash}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="chain-confirm-link block mt-2 font-data text-xs"
      >
        View on Solscan ↗
      </a>
    </div>
  );
};
