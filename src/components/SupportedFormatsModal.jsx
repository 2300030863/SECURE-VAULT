import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileSpreadsheet,
  FileText,
  FileImage,
  Music,
  Archive,
  Code2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Eye,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function SupportedFormatsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const formatCategories = [
    {
      title: 'Spreadsheets & Data',
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-400" />,
      badge: 'Tabular AI Analysis',
      badgeColor: 'border-emerald-800/40 text-emerald-300 bg-emerald-950/40',
      extensions: ['.xlsx', '.xls', '.csv', '.tsv'],
      aiCapability:
        'Parsed sheet-by-sheet with automatic table digitizing. Groq AI indexes rows, financial summaries, calculations, and generates tabular Q&A.',
    },
    {
      title: 'Documents & Presentations',
      icon: <FileText className="w-5 h-5 text-rose-500" />,
      badge: 'Full-Text & Slide Indexing',
      badgeColor: 'border-rose-800/40 text-rose-300 bg-rose-950/40',
      extensions: ['.pdf', '.docx', '.doc', '.pptx', '.txt', '.rtf'],
      aiCapability:
        'Page-by-page and slide-by-slide text extraction. Provides executive study summaries, context citations with exact page numbers, and custom exam quizzes.',
    },
    {
      title: 'Images & Visual Media',
      icon: <FileImage className="w-5 h-5 text-rose-400" />,
      badge: 'Groq Vision OCR',
      badgeColor: 'border-red-800/40 text-red-300 bg-red-950/40',
      extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'],
      aiCapability:
        'Powered by Groq Vision (llama-3.2-11b-vision-preview). Transcribes OCR text, handwriting, whiteboard notes, UI wireframes, flowcharts, and technical diagrams.',
    },
    {
      title: 'Audio Recordings & Voice Memos',
      icon: <Music className="w-5 h-5 text-cyan-400" />,
      badge: 'Groq Whisper Transcription',
      badgeColor: 'border-cyan-800/40 text-cyan-300 bg-cyan-950/40',
      extensions: ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'],
      aiCapability:
        'Powered by Groq Whisper (whisper-large-v3-turbo). Converts speech into high-precision transcripts with timestamped markers ([00:15]) and meeting action items.',
    },
    {
      title: 'Archives & Multi-File Bundles',
      icon: <Archive className="w-5 h-5 text-amber-400" />,
      badge: 'Deep Archive Scan',
      badgeColor: 'border-amber-800/40 text-amber-300 bg-amber-950/40',
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      aiCapability:
        'Recursively unpacks nested ZIP archives and multi-file packages. Extracts all contained documents, images, audio, and code into one unified study index.',
    },
    {
      title: 'Source Code & Developer Notes',
      icon: <Code2 className="w-5 h-5 text-violet-400" />,
      badge: 'Syntax Comprehension',
      badgeColor: 'border-violet-800/40 text-violet-300 bg-violet-950/40',
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.sql', '.html', '.css', '.json', '.md'],
      aiCapability:
        'Indexes code structure, functions, and logic. Explains codebases, spots bugs, outlines architectures, and answers technical questions.',
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      style={{ position: 'fixed', inset: 0, zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-[#121215] border border-[#27272A] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950 via-zinc-900 to-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0 shadow-lg shadow-red-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Supported File Formats & Groq AI
              </h3>
              <p className="text-xs text-zinc-400">
                Complete guide to supported formats, multimodal AI extractors, and security specifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900 border border-[#E11D2E]/30 text-xs text-zinc-300 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#E11D2E] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white">Unified Zero-Knowledge Vault:</strong> Upload single files or batch up to 20 files. DocQevrilo encrypts and auto-packages all uploads into a private vault archive. Groq AI seamlessly extracts, transcribes, and indexes all supported formats.
            </div>
          </div>

          {/* Grid of Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formatCategories.map((cat, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0e0e12] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        {cat.icon}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white">
                        {cat.title}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.badgeColor}`}
                    >
                      {cat.badge}
                    </span>
                  </div>

                  {/* Extension Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {cat.extensions.map((ext, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px] font-mono font-medium"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>

                  {/* AI Description */}
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {cat.aiCapability}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Security & Restricted Formats Warning */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2.5">
            <div className="p-1 rounded bg-red-950/60 text-[#E11D2E] border border-red-800/40 shrink-0 mt-0.5 font-bold text-xs">
              🛡️
            </div>
            <div>
              <strong className="text-zinc-200">Restricted Executable Formats:</strong> For server and user security, dangerous executable files (<code className="text-red-400">.exe, .bat, .cmd, .msi, .dll, .sh, .ps1, .vbs</code>) are blocked by the DocQevrilo DeepShield WAF firewall.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#18181B] border-t border-[#27272A] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>All supported formats automatically integrate with Groq AI</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold transition-all cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

