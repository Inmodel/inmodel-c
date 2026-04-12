import React from 'react';

type BentoCardProps = {
  title: string;
  subtitle: React.ReactNode;
  tagText: string;
  icon: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  disabled?: boolean;
};

export const BentoCard = ({ title, subtitle, tagText, icon, actionText, onAction, disabled }: BentoCardProps) => {
  return (
    <div className="bg-[#151921] border border-[#232936] rounded-[24px] p-4 flex flex-col gap-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-[#3A455A] group w-full relative overflow-hidden h-full">
      
      {/* Top Graphic Area */}
      <div className="relative w-full h-[220px] rounded-[16px] bg-[#0E1015] overflow-hidden flex items-center justify-center border border-[#1A202A] shadow-inner">
        {/* Subtle CSS Grid Background */}
        <div 
           className="absolute inset-0 pointer-events-none opacity-[0.12]" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #bac4d6 1px, transparent 1px), linear-gradient(to bottom, #bac4d6 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
           }} 
        />
        
        {/* Floating Icon */}
        <div className="z-10 text-[80px] drop-shadow-2xl transition-transform duration-500 group-hover:scale-110">
          {icon}
        </div>
        
        {/* Vertical Tag */}
        <div 
          className="absolute right-3 top-0 bottom-0 flex items-center justify-center pointer-events-none select-none"
        >
           <span 
             className="font-mono text-[#4A5568] text-[10px] uppercase tracking-[0.25em] whitespace-nowrap mix-blend-screen"
             style={{ writingMode: 'vertical-rl' }}
           >
             {tagText}
           </span>
        </div>
      </div>
      
      {/* Footer Content */}
      <div className="flex justify-between items-end mt-1 px-1">
        <div className="flex flex-col flex-1 pr-4 max-w-[calc(100%-60px)]">
          <h3 className="font-display font-medium text-[#E2E8F0] tracking-[0.02em] text-[22px] leading-none mb-2 truncate">{title}</h3>
          <p className="font-mono text-[#8492A6] text-[13px] leading-relaxed line-clamp-2">{subtitle}</p>
        </div>
        
        <button 
          onClick={onAction}
          disabled={disabled}
          className={`flex items-center justify-center transition-all bg-[#242C3D] hover:bg-[#2D374D] border border-[#2D374D] text-[#BAC4D6] group-hover:text-white disabled:opacity-40 disabled:cursor-not-allowed group-hover:border-[#4B5A79] ${actionText ? 'px-4 py-2 rounded-full h-10' : 'w-10 h-10 rounded-full min-w-[40px]'}`}
        >
          {actionText ? (
            <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
              {actionText} <span className="transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform text-lg leading-none font-mono">↗</span>
            </span>
          ) : (
             <span className="transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform text-lg leading-none font-mono">↗</span>
          )}
        </button>
      </div>
    </div>
  );
};
