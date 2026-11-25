import React from 'react';
import {
  Clock,
  Download,
  Flame,
  Radio,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function OnlineSharingSettings({
  expiry,
  setExpiry,
  maxDownloads,
  setMaxDownloads,
  deleteAfterDownload,
  setDeleteAfterDownload,
}) {
  const expiryOptions = [
    { label: '5 Minutes', value: '5m' },
    { label: '10 Minutes', value: '10m' },
    { label: '15 Minutes (Default)', value: '15m' },
    { label: '30 Minutes', value: '30m' },
    { label: '1 Hour', value: '1h' },
  ];

  const downloadLimitOptions = [
    { label: '1 Recipient (Default)', value: 1 },
    { label: '2 Recipients', value: 2 },
    { label: '5 Recipients', value: 5 },
    { label: '10 Recipients', value: 10 },
    { label: 'Unlimited', value: 'unlimited' },
  ];

  const formatSummary = () => {
    let expText = '15 minutes';
    if (expiry === '5m') expText = '5 minutes';
    else if (expiry === '10m') expText = '10 minutes';
    else if (expiry === '15m') expText = '15 minutes';
    else if (expiry === '30m') expText = '30 minutes';
    else if (expiry === '1h') expText = '1 hour';
    else expText = expiry;

    const isUnlimited = maxDownloads === 'unlimited' || maxDownloads === null;
    const dlText = isUnlimited
      ? 'unlimited recipients'
      : `${Number(maxDownloads) || 1} recipient${Number(maxDownloads) > 1 ? 's' : ''}`;

    const delText = deleteAfterDownload ? 'One-Time Access ON' : 'Reusable within window';

    return { expText, dlText, delText };
  };

  const { expText, dlText, delText } = formatSummary();

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[#121215] border border-[#27272A] mb-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#E11D2E] animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Live Online Sharing Parameters
          </span>
        </div>
        <span className="text-[10px] text-red-300 bg-red-950/60 border border-[#E11D2E]/40 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          Live Memory Stream · Zero Cloud
        </span>
      </div>

      {/* Architecture Guarantee Callout */}
      <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-xs text-zinc-300 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-white font-semibold">Zero Cloud Storage · Zero Disk Writes</span>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Files stream directly from your browser memory to the recipient over encrypted WebRTC DataChannels. Nothing is ever saved to Backblaze B2, server disk, or database. You must keep this browser tab open during the transfer.
          </p>
        </div>
      </div>

      {/* Grid: Expiration & Download Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. Live Session Window */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Live Session Window</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {expiryOptions.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setExpiry(opt.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                  expiry === opt.value
                    ? 'bg-red-950/70 border-[#E11D2E] text-white shadow-sm'
                    : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {opt.label.replace(' (Default)', '')}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Maximum Recipients */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Maximum Completed Transfers</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {downloadLimitOptions.map((opt) => {
              const isSelected =
                opt.value === 'unlimited'
                  ? maxDownloads === 'unlimited' || maxDownloads === null
                  : Number(maxDownloads) === opt.value;

              return (
                <button
                  type="button"
                  key={String(opt.value)}
                  onClick={() => setMaxDownloads(opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/70 border-[#E11D2E] text-white shadow-sm'
                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {opt.label.replace(' (Default)', '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Delete After First Successful Download (Burn on Finish) */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-zinc-700 transition-all">
        <div className="flex items-start gap-2.5">
          <div
            className={`p-1.5 rounded-lg border mt-0.5 ${
              deleteAfterDownload
                ? 'bg-red-950/80 border-[#E11D2E] text-[#E11D2E]'
                : 'bg-[#121215] border-[#27272A] text-zinc-500'
            }`}
          >
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>One-Time Access (Single Completed Transfer)</span>
              {deleteAfterDownload && (
                <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 text-[10px] font-bold border border-red-900/40">
                  ON
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Automatically blocks all future joins as soon as one authorized recipient completes a verified download.
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => setDeleteAfterDownload(!deleteAfterDownload)}
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
            deleteAfterDownload
              ? 'bg-[#E11D2E] border-[#E11D2E]'
              : 'bg-[#27272A] border-[#3F3F46]'
          }`}
          title="Toggle burn on finish"
        >
          <div
            className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-0.5 ${
              deleteAfterDownload ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Live Configuration Summary Banner */}
      <div className="p-2.5 rounded-lg bg-[#0B0B0D] border border-[#27272A] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            <strong>Sharing Plan:</strong> Live Online P2P · Active for {expText} · {dlText}
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
            deleteAfterDownload
              ? 'bg-red-950/60 text-red-400 border border-red-900/50'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {delText}
        </span>
      </div>
    </div>
  );
}
