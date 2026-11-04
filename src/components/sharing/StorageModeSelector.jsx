import React from 'react';
import { Clock, HardDrive, Check, Sparkles, Radio } from 'lucide-react';

export default function StorageModeSelector({ storageMode, onChange, onSwitchToLive }) {
  const modes = [
    {
      id: 'temporary',
      name: 'Temporary Storage',
      tagline: 'Quick Auto-Expiring',
      description: 'Files are encrypted and stored in Backblaze B2, automatically purging after your selected expiration period.',
      icon: Clock,
      badge: 'B2 Auto-Purge',
      badgeColor: 'text-zinc-300 bg-zinc-800 border-zinc-700',
      activeRing: 'border-zinc-500 bg-zinc-900/60',
    },
    {
      id: 'long_term',
      name: 'Long-Term Storage',
      tagline: 'Extended Vault Retention',
      description: 'Files remain securely archived in Backblaze B2 until explicitly deleted by you.',
      icon: HardDrive,
      badge: 'Permanent Retention',
      badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-800/40',
      activeRing: 'border-amber-500/70 bg-amber-950/20',
    },
  ];

  return (
    <div className="space-y-3 mb-5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
          <span>Cloud Storage Policy</span>
        </label>
        <span className="text-[11px] text-zinc-500 font-mono">Backblaze B2 + TiDB</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = storageMode === mode.id;

          return (
            <button
              type="button"
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? `${mode.activeRing} ring-1 ring-[#E11D2E]/50`
                  : 'bg-[#121215] border-[#27272A] hover:border-[#3F3F46] hover:bg-[#18181B]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isSelected
                        ? 'bg-red-950/80 border-[#E11D2E] text-white'
                        : 'bg-[#18181B] border-[#27272A] text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#E11D2E] text-white flex items-center justify-center text-[10px]">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="font-semibold text-xs text-white mb-0.5">{mode.name}</div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2.5">
                  {mode.description}
                </p>
              </div>

              <div>
                <span
                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${mode.badgeColor}`}
                >
                  {mode.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Switch to Live Sharing P2P Callout */}
      {onSwitchToLive && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/30 to-zinc-900 border border-red-900/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-zinc-300">
            <Radio className="w-4 h-4 text-[#E11D2E] shrink-0 animate-pulse" />
            <span>
              Looking for direct P2P transfer with <strong className="text-white">zero cloud storage</strong> and <strong className="text-white">no 250MB limit</strong>?
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToLive}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold text-[11px] transition-all cursor-pointer shadow-sm"
          >
            Switch to Live Sharing (P2P)
          </button>
        </div>
      )}
    </div>
  );
}
