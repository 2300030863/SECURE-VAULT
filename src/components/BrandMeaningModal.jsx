import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Sparkles,
  X,
  FileText,
  KeyRound,
  CheckCircle2,
  Users,
  Lock,
  ArrowRight,
  BookOpen,
  Share2,
} from 'lucide-react';

export default function BrandMeaningModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_brand_meaning', handleOpen);
    return () => window.removeEventListener('open_brand_meaning', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="brand-modal-title"
    >
      <div
        className="bg-[#121215] border border-[#27272A] hover:border-[#E11D2E]/50 rounded-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent rounded-full shadow-[0_0_20px_#E11D2E]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close brand meaning modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-[#E11D2E]/40 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/50 text-[#E11D2E]">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="brand-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Doc<span className="text-[#E11D2E]">Qevrilo</span>
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-[#E11D2E]/40">
                Brand Identity
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-300 mt-0.5">
              Secure Document Sharing Platform
            </p>
            <p className="text-[11px] font-mono text-[#E11D2E] mt-0.5">
              Documents. Security. Simplicity.
            </p>
          </div>
        </div>

        {/* Main Recommendation Slogan Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-[#18181B] to-red-950/20 border border-[#E11D2E]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#E11D2E] shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                Primary Brand Tagline
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                “One Code. Simple Sharing.”
              </span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full shrink-0">
            Recommended
          </span>
        </div>

        {/* Section 1: Anatomy of the Name (Doc + Qevrilo) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Name Composition</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Doc */}
            <div className="p-3 rounded-xl bg-[#18181B] border border-zinc-800 hover:border-zinc-700 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-[#E11D2E] bg-red-950/60 px-2 py-0.5 rounded border border-red-900/40 font-mono">
                  Doc
                </span>
                <span className="text-xs font-semibold text-white">The Foundation</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Represents <strong>Documents</strong> — including PDFs, PPTs, notes, reports, and all types of shared files.
              </p>
            </div>

            {/* Qevrilo */}
            <div className="p-3 rounded-xl bg-[#18181B] border border-zinc-800 hover:border-zinc-700 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 font-mono">
                  Qevrilo
                </span>
                <span className="text-xs font-semibold text-zinc-200">The Platform</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                A distinctive invented brand name signifying a modern, high-speed digital security ecosystem.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Full Brand Meaning Quote */}
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Share2 className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Full Brand Meaning</span>
          </div>
          <blockquote className="text-sm font-semibold text-white pl-3 border-l-2 border-[#E11D2E] italic">
            “DocQevrilo — A smarter way to share documents securely.”
          </blockquote>
          <p className="text-xs text-zinc-400 leading-relaxed pt-1">
            It represents a platform where teachers, students, and teams can upload documents and share
            them using unique access codes, without needing to create WhatsApp or Telegram groups.
          </p>
        </div>

        {/* Section 3: Taglines Hierarchy */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Suggested Taglines</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#18181B] border border-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D2E] shrink-0" />
              <span className="text-zinc-200 font-medium">Upload. Share. Access. Securely.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#18181B] border border-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D2E] shrink-0" />
              <span className="text-zinc-200 font-medium">One Code. Simple Sharing.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#18181B] border border-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D2E] shrink-0" />
              <span className="text-zinc-200 font-medium">Your Documents, Your Control.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#18181B] border border-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E11D2E] shrink-0" />
              <span className="text-zinc-200 font-medium">Share Smarter. Stay Secure.</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-[#27272A]">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors justify-center sm:justify-start"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180 text-[#E11D2E]" />
            <span>Go to Home Page</span>
          </Link>
          <div className="flex items-center justify-end gap-2">
            <Link
              to="/vault"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white transition-all shadow-md shadow-red-950/40"
            >
              Open Vault Console
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
