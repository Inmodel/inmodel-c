import React from 'react';

interface SecurityReportProps {
  clean: boolean;
  injections: number;
  gamingFlags: boolean;
  auditHash: string;
}

export const SecurityReport: React.FC<SecurityReportProps> = ({ 
  clean, 
  injections, 
  gamingFlags, 
  auditHash 
}) => {
  const isSuspicious = !clean || injections > 0 || !gamingFlags;

  return (
    <div className={`mt-6 border rounded-lg p-5 font-data text-sm ${isSuspicious ? 'border-amber-dim text-amber-base bg-amber-glow' : 'border-border text-primary bg-surface'}`}>
      <div className="uppercase tracking-widest mb-4 pb-3 border-b border-inherit/30 font-bold text-xs opacity-80 flex items-center gap-2">
        <span>SECURITY SCAN</span>
        {isSuspicious && <span className="bg-amber-base text-void px-2 py-0.5 rounded text-[10px] ml-auto">{injections > 0 ? `${injections} THREATS` : 'SUSPICIOUS'}</span>}
      </div>
      
      <div className="flex justify-between py-1.5 border-b border-inherit/10">
        <span className="text-muted uppercase text-xs tracking-wider">Content scan</span>
        <span className={!clean ? "text-amber-base" : "text-green-base"}>{clean ? "✓ Clean" : "⚠ Suspicious"}</span>
      </div>
      
      <div className="flex justify-between py-1.5 border-b border-inherit/10">
        <span className="text-muted uppercase text-xs tracking-wider">Injection</span>
        <span className={injections > 0 ? "text-amber-base" : "text-primary"}>{injections} detected</span>
      </div>
      
      <div className="flex justify-between py-1.5 border-b border-inherit/10">
        <span className="text-muted uppercase text-xs tracking-wider">Gaming flags</span>
        <span className={!gamingFlags ? "text-amber-base" : "text-green-base"}>{gamingFlags ? "✓ Passed" : "⚠ Failed"}</span>
      </div>
      
      <div className="flex justify-between pt-3 mt-1">
        <span className="text-muted uppercase text-xs tracking-wider">Audit hash</span>
        <span className="text-secondary opacity-70 truncate max-w-[140px] font-mono">{auditHash}</span>
      </div>
    </div>
  );
};
