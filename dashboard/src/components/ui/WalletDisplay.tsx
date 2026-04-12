"use client";

import React, { useState } from 'react';

export const WalletDisplay = ({ address }: { address: string }) => {
  const [copied, setCopied] = useState(false);
  
  const truncate = (str: string) => {
    if (str.length <= 8) return str;
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span 
      className={`wallet-address ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title={address}
    >
      {truncate(address)} {copied && "✓"}
    </span>
  );
};
