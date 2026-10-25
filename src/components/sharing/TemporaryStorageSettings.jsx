import React from 'react';
import {
  Clock,
  Download,
  Flame,
  Sliders,
  CheckCircle2,
  Timer,
  Sparkles,
} from 'lucide-react';

export default function TemporaryStorageSettings({
  expiry,
  setExpiry,
  maxDownloads,
  setMaxDownloads,
  deleteAfterDownload,
  setDeleteAfterDownload,
  customMode,
  setCustomMode,
  customDurationValue,
  setCustomDurationValue,
  customDurationUnit,
  setCustomDurationUnit,
  customDateTime,
  setCustomDateTime,
  getDefaultDateTime,
  getMinDateTime,
}) {
  const downloadLimitOptions = [
    { label: 'Unlimited (Default)', value: 'unlimited' },
    { label: '1 Download', value: 1 },
    { label: '5 Downloads', value: 5 },
    { label: '10 Downloads', value: 10 },
  ];

  const formatSummary = () => {
    let expText = '1 hour';
    if (expiry === '5m') expText = '5 minutes';
    else if (expiry === '10m') expText = '10 minutes';
    else if (expiry === '30m') expText = '30 minutes';
    else if (expiry === '1h') expText = '1 hour';
    else if (expiry === '6h') expText = '6 hours';
    else if (expiry === '12h') expText = '12 hours';
    else if (expiry === '24h') expText = '24 hours';
    else if (expiry === '3d') expText = '3 days';
    else if (expiry === 'custom') {
      expText =
        customMode === 'date'
          ? customDateTime ? `Until ${new Date(customDateTime).toLocaleString()}` : 'Custom date'
          : `${customDurationValue} ${customDurationUnit === 'm' ? 'mins' : customDurationUnit === 'h' ? 'hrs' : customDurationUnit === 'd' ? 'days' : customDurationUnit === 'w' ? 'weeks' : 'months'}`;
    }

    const dlText =
      maxDownloads === 'unlimited' || maxDownloads === null || maxDownloads === '' || maxDownloads === 0
        ? 'Unlimited downloads'
        : `${maxDownloads} max download${maxDownloads > 1 ? 's' : ''}`;

    const delText = deleteAfterDownload ? 'Auto-destructs on download' : 'Active until expiry';

    return { expText, dlText, delText };
  };

  const { expText, dlText, delText } = formatSummary();

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[#121215] border border-[#27272A] mb-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#E11D2E]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Temporary Storage Parameters
          </span>
        </div>
        <span className="text-[10px] text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded-full font-medium">
          Auto-Purge Active
        </span>
      </div>

      {/* Grid: Expiration & Download Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. Auto-Expire Duration Selector */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Auto-Purge Expiry Period</span>
          </label>
          <select
            value={expiry}
            onChange={(e) => {
              const val = e.target.value;
              setExpiry(val);
              if (val === 'custom' && !customDateTime && getDefaultDateTime) {
                setCustomDateTime(getDefaultDateTime());
              }
            }}
            className="w-full bg-[#18181B] border border-[#27272A] text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#E11D2E] cursor-pointer"
          >
            <optgroup label="Popular Presets">
              <option value="5m">5 Minutes (Quick View)</option>
              <option value="10m">10 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour (Default)</option>
              <option value="6h">6 Hours</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="3d">3 Days</option>
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">⚙️ Custom (Your Choice...)</option>
            </optgroup>
          </select>
        </div>

        {/* 2. Maximum Downloads */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Allowed Downloads Limit</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {downloadLimitOptions.map((opt) => {
              const isSelected =
                opt.value === 'unlimited'
                  ? maxDownloads === 'unlimited' || maxDownloads === null || maxDownloads === ''
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
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Expiry Drawer (when custom is selected) */}
      {expiry === 'custom' && (
        <div className="p-3 bg-[#18181B] border border-[#E11D2E]/40 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Sliders className="w-3.5 h-3.5 text-[#E11D2E]" />
              <span>Custom Expiry: Your Choice</span>
            </div>
            {/* Duration vs Date Picker toggle */}
            <div className="flex items-center p-0.5 bg-[#121215] rounded-lg border border-[#27272A] text-[11px]">
              <button
                type="button"
                onClick={() => setCustomMode('duration')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  customMode === 'duration'
                    ? 'bg-[#E11D2E] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Duration
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomMode('date');
                  if (!customDateTime && getDefaultDateTime) setCustomDateTime(getDefaultDateTime());
                }}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  customMode === 'date'
                    ? 'bg-[#E11D2E] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Date & Time
              </button>
            </div>
          </div>

          {customMode === 'duration' ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                    Duration Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customDurationValue}
                    onChange={(e) => setCustomDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#E11D2E]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={customDurationUnit}
                    onChange={(e) => setCustomDurationUnit(e.target.value)}
                    className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                  >
                    <option value="m">Minute(s)</option>
                    <option value="h">Hour(s)</option>
                    <option value="d">Day(s)</option>
                    <option value="w">Week(s)</option>
                    <option value="mo">Month(s)</option>
                  </select>
                </div>
              </div>

              {/* Quick duration chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: '15m', val: 15, unit: 'm' },
                  { label: '45m', val: 45, unit: 'm' },
                  { label: '2h', val: 2, unit: 'h' },
                  { label: '12h', val: 12, unit: 'h' },
                  { label: '3d', val: 3, unit: 'd' },
                ].map((chip) => (
                  <button
                    type="button"
                    key={chip.label}
                    onClick={() => {
                      setCustomDurationValue(chip.val);
                      setCustomDurationUnit(chip.unit);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                      customDurationValue === chip.val && customDurationUnit === chip.unit
                        ? 'bg-red-950/80 border-[#E11D2E] text-white font-semibold'
                        : 'bg-[#121215] border-[#27272A] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">
                Choose Specific Expiration Date & Time
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                min={getMinDateTime ? getMinDateTime() : undefined}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E] [color-scheme:dark]"
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Delete After First Successful Download (Optional Burn-on-read) */}
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
              Purges the file immediately once 1 recipient completes the download, or retains until auto-purge expiry.
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
            <strong>Temporary Storage:</strong> Expires in {expText} · {dlText}
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
