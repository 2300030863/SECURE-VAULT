import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Eye, EyeOff } from 'lucide-react';

/**
 * Displays a QR code blurred by default for shoulder-surfing privacy.
 * Only reveals the crisp scannable QR code when the user clicks "Show QR".
 */
export default function BlurredQrCard({
  value,
  size = 108,
  title = 'Share QR Code',
  subtitle = 'Scan to unlock',
  className = '',
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [value]);

  if (!value) return null;

  return (
    <div
      className={`p-3.5 rounded-xl bg-[#121215] border border-zinc-800 flex flex-col items-center justify-center text-center ${className}`}
    >
      <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 mb-2 font-medium">
        <QrCode className="w-3.5 h-3.5 text-[#E11D2E]" />
        <span>{title}</span>
      </span>

      <div className="relative p-2 bg-white rounded-xl overflow-hidden shadow-inner">
        <div
          className={`transition-all duration-300 ${
            revealed ? 'blur-0 opacity-100' : 'blur-md opacity-80 select-none pointer-events-none'
          }`}
        >
          <QRCodeSVG value={value} size={size} level="M" />
        </div>

        {!revealed && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-2">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Show QR</span>
            </button>
          </div>
        )}
      </div>

      {revealed ? (
        <div className="mt-2 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setRevealed(false)}
            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
          >
            <EyeOff className="w-3 h-3" />
            <span>Hide QR</span>
          </button>
          <span className="text-[10px] text-zinc-500">{subtitle}</span>
        </div>
      ) : (
        <span className="text-[10px] text-zinc-500 mt-1.5">Click Show QR to reveal</span>
      )}
    </div>
  );
}
