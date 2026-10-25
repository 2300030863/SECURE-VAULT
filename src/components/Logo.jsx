import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

export default function Logo({ size = 'medium', onClick }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick(e);
    } else {
      window.dispatchEvent(new CustomEvent('open_brand_meaning'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="sv-logo-link group flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0 text-left transition-all hover:opacity-95"
      aria-label="DocQevrilo — Click to view Brand Meaning"
      title="DocQevrilo — Click to view Brand Meaning"
    >
      <div className="sv-logo-icon-wrapper transition-transform duration-200 group-hover:scale-105" aria-hidden="true">
        <Shield size={size === 'large' ? 24 : 18} />
      </div>
      <div className="flex flex-col">
        <span className="sv-logo-text flex items-center gap-1">
          Doc<span className="sv-logo-text-accent">Qevrilo</span>
          <span className="text-[9px] font-semibold tracking-normal text-[#E11D2E] bg-red-950/60 border border-red-800/40 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 group-hover:border-[#E11D2E] transition-colors">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Meaning</span>
          </span>
        </span>
        <span className="text-[10px] text-zinc-400 font-mono tracking-tight leading-none group-hover:text-zinc-300 transition-colors">
          One Code. Simple Sharing.
        </span>
      </div>
    </button>
  );
}
