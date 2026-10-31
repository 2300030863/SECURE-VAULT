import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Briefcase, KeyRound, Check, X, Shield, AlertCircle, RefreshCw, Lock, Send } from 'lucide-react';
import { authService } from '../services/authService';

export default function UserProfileModal({ isOpen, onClose, currentUser, onProfileUpdated }) {
  const [localUser, setLocalUser] = useState(currentUser);
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || currentUser?.full_name || '',
    occupation: currentUser?.occupation || 'Student',
    currentPinOrPassword: '',
    newPin: '',
    confirmPin: '',
    pinRecoveryOtp: '',
  });

  const [authMethod, setAuthMethod] = useState('credentials'); // 'credentials' | 'otp'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRequestingPinRecovery, setIsRequestingPinRecovery] = useState(false);
  const [pinRecoveryRequested, setPinRecoveryRequested] = useState(false);
  const [pinRecoveryAttemptsRemaining, setPinRecoveryAttemptsRemaining] = useState(3);
  const [isPinRecoveryLocked, setIsPinRecoveryLocked] = useState(false);
  const [pinRecoveryLockoutMinutes, setPinRecoveryLockoutMinutes] = useState(20);

  // Keep state synchronized with currentUser prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalUser(currentUser);
      setFormData({
        fullName: currentUser?.name || currentUser?.full_name || '',
        occupation: currentUser?.occupation || 'Student',
        currentPinOrPassword: '',
        newPin: '',
        confirmPin: '',
        pinRecoveryOtp: '',
      });
      setError('');
      setSuccess('');
      setPinRecoveryRequested(false);
      setAuthMethod('credentials');

      // Check OTP rate limit / hold status on modal open
      authService.getPinRecoveryStatus().then((status) => {
        if (status) {
          if (status.locked) {
            setIsPinRecoveryLocked(true);
            setPinRecoveryLockoutMinutes(status.minutesRemaining || 20);
          } else {
            setIsPinRecoveryLocked(false);
            if (typeof status.attemptsRemaining === 'number') {
              setPinRecoveryAttemptsRemaining(status.attemptsRemaining);
            }
          }
        }
      }).catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRequestPinRecovery = async () => {
    setError('');
    setSuccess('');

    if (isPinRecoveryLocked) {
      setError(`Too many OTP requests. PIN recovery is held for ${pinRecoveryLockoutMinutes} minutes.`);
      return;
    }

    setIsRequestingPinRecovery(true);
    try {
      const res = await authService.requestPinRecoveryOtp();
      setPinRecoveryRequested(true);
      if (typeof res.attemptsRemaining === 'number') {
        setPinRecoveryAttemptsRemaining(res.attemptsRemaining);
      }
      setSuccess(res.message || 'A 6-digit recovery code has been sent to your registered email.');
    } catch (err) {
      if (err.locked) {
        setIsPinRecoveryLocked(true);
        setPinRecoveryLockoutMinutes(err.minutesRemaining || 20);
        setError(err.message || `Too many OTP requests (3 limit). Please try again in ${err.minutesRemaining || 20} minutes.`);
      } else {
        setError(err.message || 'Unable to send PIN recovery code. Please try again.');
      }
    } finally {
      setIsRequestingPinRecovery(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const wantsToChangePin = Boolean(formData.newPin || formData.confirmPin);

    if (wantsToChangePin) {
      if (!/^\d{4}$/.test(formData.newPin.trim())) {
        setError('New Security PIN must be exactly 4 digits (0-9).');
        return;
      }
      if (!formData.confirmPin) {
        setError('Please re-enter the 4-digit PIN in the Confirm field.');
        return;
      }
      if (formData.newPin !== formData.confirmPin) {
        setError('PIN confirmation does not match. Please enter the same 4 digits.');
        return;
      }

      if (hasPinConfigured) {
        if (authMethod === 'otp') {
          if (!pinRecoveryRequested) {
            setError('Please click "Send 6-Digit Code" to receive the verification OTP on your email.');
            return;
          }
          if (!/^\d{6}$/.test(formData.pinRecoveryOtp.trim())) {
            setError('Enter the complete 6-digit email recovery code to verify this PIN change.');
            return;
          }
        } else {
          if (!formData.currentPinOrPassword.trim()) {
            setError('Please enter your current 4-digit PIN or account password to authorize changing your PIN.');
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const isOtpMode = Boolean(hasPinConfigured && authMethod === 'otp');
      const res = await authService.updateProfile({
        fullName: formData.fullName.trim(),
        occupation: formData.occupation,
        newPin: wantsToChangePin ? formData.newPin.trim() : undefined,
        currentPin: !isOtpMode && formData.currentPinOrPassword ? formData.currentPinOrPassword.trim() : undefined,
        currentPassword: !isOtpMode && formData.currentPinOrPassword ? formData.currentPinOrPassword.trim() : undefined,
        pinRecoveryOtp: isOtpMode ? formData.pinRecoveryOtp.trim() : undefined,
      });

      const updatedUser = res.user;
      setLocalUser(updatedUser);
      setFormData((prev) => ({
        ...prev,
        fullName: updatedUser.name || updatedUser.full_name || prev.fullName,
        occupation: updatedUser.occupation || prev.occupation,
        currentPinOrPassword: '',
        newPin: '',
        confirmPin: '',
        pinRecoveryOtp: '',
      }));
      setPinRecoveryRequested(false);
      setSuccess('Profile & security settings updated successfully!');

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPinConfigured = Boolean(localUser?.has_security_pin);

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
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Your Account Profile</h3>
              <p className="text-xs text-zinc-400">Vault credentials & security settings</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Feedback banners */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full bg-[#121215] border border-[#27272A] rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-[#E11D2E]"
                required
              />
            </div>
          </div>

          {/* Email Address (Readonly) */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-600 absolute left-3 top-2.5" />
              <input
                type="email"
                value={localUser?.email || currentUser?.email || ''}
                readOnly
                disabled
                className="w-full bg-[#0E0E12] border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-zinc-400 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Occupation Selection */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Occupation</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <select
                name="occupation"
                value={formData.occupation}
                onChange={handleChange}
                className="w-full bg-[#121215] border border-[#27272A] rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:border-[#E11D2E] appearance-auto cursor-pointer"
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
                <option value="Professor">Professor</option>
                <option value="Researcher">Researcher</option>
                <option value="Software Engineer / Developer">Software Engineer / Developer</option>
                <option value="Doctor / Healthcare">Doctor / Healthcare</option>
                <option value="Lawyer / Legal">Lawyer / Legal</option>
                <option value="Finance / Accountant">Finance / Accountant</option>
                <option value="Business / Entrepreneur">Business / Entrepreneur</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* 4-Digit Security PIN Section */}
          <div className="p-3.5 bg-[#0E0E12] rounded-xl border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-zinc-200 font-semibold flex items-center gap-1.5 text-xs">
                <KeyRound className="w-4 h-4 text-[#E11D2E]" />
                <span>4-Digit Security PIN</span>
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                  hasPinConfigured
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                }`}
              >
                {hasPinConfigured ? '✓ Active PIN Configured' : '● No PIN Set'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              This 4-digit number is your secondary authorization code to reveal and regenerate access codes in Your Shared Vaults.
            </p>

            {hasPinConfigured && (
              <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-medium">Verify Identity to Change PIN:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('credentials');
                        setError('');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        authMethod === 'credentials'
                          ? 'bg-[#E11D2E] text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      PIN / Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod('otp');
                        setError('');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        authMethod === 'otp'
                          ? 'bg-[#E11D2E] text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Verify via Email
                    </button>
                  </div>
                </div>

                {authMethod === 'credentials' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-zinc-400 text-[10px] font-medium">
                      Enter Current PIN or Account Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      name="currentPinOrPassword"
                      value={formData.currentPinOrPassword}
                      onChange={handleChange}
                      placeholder="Current 4-digit PIN or account password"
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-[#E11D2E]"
                      autoComplete="current-password"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">
                        {isPinRecoveryLocked
                          ? `Verification on hold for ${pinRecoveryLockoutMinutes}m`
                          : `${pinRecoveryAttemptsRemaining} attempt${pinRecoveryAttemptsRemaining === 1 ? '' : 's'} remaining (max 3)`}
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestPinRecovery}
                        disabled={isRequestingPinRecovery || isPinRecoveryLocked}
                        className="px-2.5 py-1 rounded-md bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 text-[10px] font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {isRequestingPinRecovery ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : isPinRecoveryLocked ? (
                          <span>Locked ({pinRecoveryLockoutMinutes}m)</span>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>{pinRecoveryRequested ? 'Resend Code' : 'Send 6-Digit Code'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isPinRecoveryLocked && (
                      <p className="text-[10px] text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/60 leading-tight">
                        Too many OTP requests. PIN recovery for this profile is locked for {pinRecoveryLockoutMinutes} minutes. Please try again later.
                      </p>
                    )}

                    {pinRecoveryRequested && (
                      <div className="space-y-1.5 animate-in fade-in duration-150">
                        <label className="block text-zinc-300 text-[10px] font-medium">
                          Enter 6-Digit Code sent to {localUser?.email || currentUser?.email} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={formData.pinRecoveryOtp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setFormData((prev) => ({ ...prev, pinRecoveryOtp: val }));
                            setError('');
                          }}
                          placeholder="000000"
                          className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white font-mono text-center tracking-[0.35em] text-sm focus:outline-none focus:border-[#E11D2E]"
                          autoComplete="one-time-code"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                  {hasPinConfigured ? 'New 4-Digit PIN' : 'Enter 4-Digit PIN'}
                </label>
                <input
                  type="password"
                  name="newPin"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={formData.newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData((prev) => ({ ...prev, newPin: val }));
                    setError('');
                  }}
                  placeholder="e.g. 5824"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white font-mono text-center tracking-[0.35em] text-sm focus:outline-none focus:border-[#E11D2E]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  name="confirmPin"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={formData.confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData((prev) => ({ ...prev, confirmPin: val }));
                    setError('');
                  }}
                  placeholder="e.g. 5824"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg py-2 px-3 text-white font-mono text-center tracking-[0.35em] text-sm focus:outline-none focus:border-[#E11D2E]"
                />
              </div>
            </div>

            {formData.newPin && formData.confirmPin && formData.newPin !== formData.confirmPin && (
              <p className="text-[11px] text-[#E11D2E] font-medium pt-0.5">
                PINs do not match yet. Make sure both fields contain the exact same 4 digits.
              </p>
            )}
            {formData.newPin && formData.confirmPin && formData.newPin === formData.confirmPin && formData.newPin.length === 4 && (
              <p className="text-[11px] text-emerald-400 font-medium pt-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>4-Digit PIN confirmed and ready to save.</span>
              </p>
            )}
          </div>

          {/* Bottom Action Feedback (visible right above the button) */}
          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/40"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
