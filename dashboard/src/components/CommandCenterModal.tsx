"use client";

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from './Button';

interface CommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CommandCenterModal: React.FC<CommandCenterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [key, setKey] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key) return;

    setVerifying(true);
    // There isn't a dedicated "verify" route, so we simulate a verification by storing it 
    // and letting the next API call validate it.
    try {
      api.setAdminKey(key);
      toast.success("Command Center Authorization Injected", {
        description: "Your session key is now active. Re-syncing systems..."
      });
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to apply authorization key.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-void/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-surface border border-amber-dim rounded-xl p-8 shadow-[0_0_50px_rgba(240,165,0,0.2)] relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(240,165,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(240,165,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-amber-base tracking-widest uppercase">Command Center</h2>
              <p className="text-muted text-[10px] uppercase tracking-widest mt-1">Authorized Access Only</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors p-2">✕</button>
          </div>

          <form onSubmit={handleAuthorize} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-data text-amber-dim uppercase tracking-widest block">Authorization Code</label>
              <input 
                autoFocus
                type="password"
                className="w-full bg-void border border-border focus:border-amber-base outline-none p-4 rounded font-mono text-center tracking-[0.5em] text-xl transition-all"
                placeholder="········"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button 
                variant="primary" 
                className="w-full justify-center h-12 shadow-[0_0_20px_rgba(240,165,0,0.3)]"
                disabled={!key || verifying}
              >
                {verifying ? "Infiltrating..." : "Deploy Authorization →"}
              </Button>
            </div>
            
            <p className="text-[9px] text-muted uppercase text-center tracking-widest opacity-60">
              Session keys remain active until manual logout or browser clearance.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
