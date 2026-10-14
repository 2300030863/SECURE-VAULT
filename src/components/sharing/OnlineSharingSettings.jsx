import React from 'react';
import {
  Clock,
  Download,
  Trash2,
  Sliders,
  CheckCircle2,
  Info,
  ShieldAlert,
  Flame,
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
    { label: '30 Minutes', value: '30m' },
    { label: '1 Hour', value: '1h' },
    { label: '24 Hours (Default)', value: '24h' },
    { label: '7 Days', value: '7d' },
  ];

  const downloadLimitOptions = [
    { label: '1 Download', value: 1 },
    { label: '5 Downloads (Default)', value: 5 },
    { label: '10 Downloads', value: 10 },
    { label: 'Unlimited', value: 'unlimited' },
  ];

  const formatSummary = () => {
    let expText = '24 hours';
    if (expiry === '30m') expText = '30 minutes';
    else if (expiry === '1h') expText = '1 hour';
    else if (expiry === '24h') expText = '24 hours';
    else if (expiry === '7d') expText = '7 days';
    else expText = expiry;

    const dlText =
      maxDownloads === 'unlimited' || maxDownloads === null || maxDownloads === 0
        ? 'Unlimited downloads'
        : `${maxDownloads} max download${maxDownloads > 1 ? 's' : ''}`;

    const delText = deleteAfterDownload ? 'Auto-destruct after 1st download' : 'Keep until expiry';

    return { expText, dlText, delText };
  };

  const { expText, dlText, delText } = formatSummary();

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[#121215] border border-[#27272A] mb-5">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#E11D2E]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Online Sharing Parameters
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 bg-red-950/40 border border-[#E11D2E]/30 px-2 py-0.5 rounded-full font-medium">
          Active Policies
        </span>
      </div>

      {/* Grid: Expiration & Download Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. Link Expiration */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Link Expiration Duration</span>
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

        {/* 2. Maximum Downloads */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Maximum Completed Downloads</span>
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

      {/* 3. Delete After First Successful Download */}
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
              <span>Delete After First Download (Burn on Read)</span>
              {deleteAfterDownload && (
                <span className="px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 text-[10px] font-bold border border-red-900/40">
                  ON
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Immediately purges the ZIP archive from Backblaze B2 once 1 recipient completes the transfer.
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
          title="Toggle delete after first download"
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
            <strong>Sharing Plan:</strong> Online Sharing · Expires in {expText} · {dlText}
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
