import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, KeyRound, Mail, ShieldCheck, X, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';

export default function VaultCodeSecurityModal({
  isOpen,
  onClose,
  doc,
  action = 'reveal', // 'reveal' | 'regenerate'
  currentUser,
  onSuccess,
}) {
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState('pin'); // 'pin' | 'otp'
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !doc) return null;

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setError('');
    setOtpSentMessage('');
    try {
      const res = await authService.requestCodeOtp(doc.id, action);
      setOtpSentMessage(res.message || 'OTP sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP to email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter your account login password.');
      return;
    }

    if (method === 'pin') {
      if (!pin || !/^\d{4}$/.test(pin.trim())) {
        setError('Please enter your 4-digit Security PIN.');
        return;
      }
    } else if (method === 'otp') {
      if (!otp || !/^\d{6}$/.test(otp.trim())) {
        setError('Please enter the 6-digit OTP received in your email.');
        return;
      }
    }

    setIsVerifying(true);
    try {
      const payload = {
        password,
        method,
        pin: method === 'pin' ? pin.trim() : undefined,
        otp: method === 'otp' ? otp.trim() : undefined,
      };

      let result;
      if (action === 'regenerate') {
        result = await authService.regenerateAccessCode(doc.id, payload);
      } else {
        result = await authService.verifyAndRevealCode(doc.id, payload);
      }

      if (onSuccess && result.access_code) {
        onSuccess(result.access_code);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Security verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isRegenerate = action === 'regenerate';

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isRegenerate ? 'Regenerate Vault Access Code' : 'Reveal Vault Access Code'}
              </h3>
              <p className="text-xs text-zinc-400">Two-factor identity verification</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Context Tag */}
        <div className="p-2.5 rounded-xl bg-[#121215] border border-zinc-800 text-xs flex items-center justify-between">
          <span className="text-zinc-400 truncate max-w-[240px] font-medium" title={doc.original_name}>
            📦 {doc.original_name}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            #{doc.id}
          </span>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Sent Success Note */}
        {otpSentMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{otpSentMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 text-xs">
          {/* Step 1: Login Password */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Step 1: Account Login Password <span className="text-[#E11D2E]">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full bg-[#121215] border border-[#27272A] rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-[#E11D2E]"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Step 2: 2nd Factor Selector Tabs */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5">
              Step 2: Choose 2nd Factor Verification <span className="text-[#E11D2E]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#121215] border border-[#27272A] rounded-xl mb-3">
              <button
                type="button"
                onClick={() => {
                  setMethod('pin');
                  setError('');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'pin'
                    ? 'bg-[#E11D2E] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>4-Digit PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('otp');
                  setError('');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'otp'
                    ? 'bg-[#E11D2E] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email OTP</span>
              </button>
            </div>

            {/* Method A: 4-Digit Security PIN */}
            {method === 'pin' && (
              <div className="p-3 bg-[#0E0E12] border border-zinc-800/80 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Enter your chosen 4-digit PIN:</span>
                  <span className="text-zinc-500 font-mono">4 digits</span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white font-mono text-center text-base tracking-[0.5em] focus:outline-none focus:border-[#E11D2E]"
                />
              </div>
            )}

            {/* Method B: Email OTP */}
            {method === 'otp' && (
              <div className="p-3 bg-[#0E0E12] border border-zinc-800/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Send 6-digit code to:</span>
                  <span className="text-[11px] font-semibold text-zinc-300 truncate max-w-[170px]">
                    {currentUser?.email}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]*"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white font-mono text-center tracking-widest focus:outline-none focus:border-[#E11D2E]"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-zinc-700"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin text-[#E11D2E]' : 'text-[#E11D2E]'}`} />
                    <span>{isSendingOtp ? 'Sending...' : 'Send OTP'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/30"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>{isRegenerate ? 'Verify & Regenerate Code' : 'Verify & Show Code'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
