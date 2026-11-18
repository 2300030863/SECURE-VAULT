import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, KeyRound, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const tokenParam = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const otpParam = params.get('otp') || '';
  const expParam = params.get('exp') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(otpParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [autoFilledOtp, setAutoFilledOtp] = useState(false);

  // Time Limit Countdown state (15 minutes maximum)
  const initialSeconds = expParam
    ? Math.max(0, Math.floor((parseInt(expParam, 10) - Date.now()) / 1000))
    : 15 * 60;

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isExpired, setIsExpired] = useState(expParam ? initialSeconds <= 0 : false);
  const navigate = useNavigate();

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (otpParam) {
      setOtp(otpParam);
      setAutoFilledOtp(true);
    }
    if (tokenParam) setToken(tokenParam);

    if (expParam) {
      const diffSecs = Math.floor((parseInt(expParam, 10) - Date.now()) / 1000);
      if (diffSecs <= 0) {
        setIsExpired(true);
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(diffSecs);
      }
    }
  }, [emailParam, otpParam, tokenParam, expParam]);

  // Active 1-second countdown interval
  useEffect(() => {
    if (isExpired || isSuccess) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExpired, isSuccess]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hasTokenLink = Boolean(token);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage(null);

    if (isExpired) {
      setStatusMessage({
        type: 'error',
        message: 'This password reset link and OTP have expired (15-minute time limit). Please request a fresh reset link.',
      });
      return;
    }

    // Validate either token OR (email + 6-digit OTP)
    if (!token) {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setStatusMessage({
          type: 'error',
          message: 'Please provide a valid registered email address.',
        });
        return;
      }

      if (!otp.trim() || !/^\d{6}$/.test(otp.trim())) {
        setStatusMessage({
          type: 'error',
          message: 'Please enter the 6-digit OTP code sent to your email.',
        });
        return;
      }
    }

    if (password.length < 8) {
      setStatusMessage({
        type: 'error',
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage({
        type: 'error',
        message: 'Passwords do not match. Please verify both fields.',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await authService.resetPassword({
        token: token ? token.trim() : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
        otp: otp ? otp.trim() : undefined,
        password,
      });

      setStatusMessage({
        type: 'success',
        message:
          result.message ||
          'Password reset successfully! You can now sign in with your new password.',
      });
      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const isExpError =
        err.message?.toLowerCase().includes('expired') ||
        err.message?.toLowerCase().includes('invalid');

      if (isExpError) {
        setIsExpired(true);
      }

      setStatusMessage({
        type: 'error',
        message: err.message || 'Unable to reset password. The OTP or verification link may have expired.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sv-page-wrapper auth-page">
      <div className="sv-auth-container">
        {/* Back to Home Navigation */}
        <Link to="/" className="sv-auth-back-link" title="Return to DocQevrilo Home">
          <ArrowLeft size={16} className="sv-back-arrow" />
          <span>Back to Home</span>
        </Link>

        <GlassCard highlightCrimson className="sv-auth-card auth-card">
          {/* Header */}
          <div className="sv-auth-header">
            <div className="sv-auth-badge" aria-hidden="true">
              <ShieldCheck size={24} />
            </div>
            <h1 className="sv-auth-title">Reset Password</h1>
            <p className="sv-auth-subtitle">
              {hasTokenLink
                ? 'Security reset link verified. Choose your new password.'
                : 'Enter your 6-digit OTP code and choose a new password.'}
            </p>
          </div>

          {/* Time Limit Notice Banner */}
          {!isSuccess && !isExpired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderRadius: '8px',
                background: remainingSeconds < 120 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: remainingSeconds < 120 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1rem',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa' }}>
                <Clock size={14} className={remainingSeconds < 120 ? 'text-[#ef4444]' : 'text-[#fca5a5]'} />
                <span>Link &amp; OTP Time Limit:</span>
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: remainingSeconds < 120 ? '#ef4444' : '#fca5a5',
                  fontSize: '13px',
                }}
              >
                {formatTimer(remainingSeconds)} remaining
              </span>
            </div>
          )}

          {/* Auto-filled Badge when link was clicked */}
          {autoFilledOtp && !isExpired && !isSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                marginBottom: '1rem',
                fontSize: '12px',
                color: '#34d399',
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>OTP code automatically filled from your email verification link!</span>
            </div>
          )}

          {/* Status Message Feedback */}
          <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

          {/* Expired State Warning */}
          {isExpired && !isSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  marginBottom: '1rem',
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Verification Link Expired
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#d4d4d8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                For your security, password reset verification links and OTP codes expire strictly after <strong>15 minutes</strong>. This link is no longer valid.
              </p>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="sv-btn-primary"
                style={{ width: '100%', marginBottom: '0.75rem' }}
              >
                <RefreshCw size={16} />
                <span>Request New Password Reset Link</span>
              </button>
              <Link to="/login" className="sv-btn-secondary" style={{ width: '100%', display: 'inline-block', textAlign: 'center' }}>
                <span>Return to Login</span>
              </Link>
            </div>
          ) : !isSuccess ? (
            <form className="sv-form" onSubmit={handleSubmit} noValidate>
              {/* If no URL token, prompt for Email and 6-Digit OTP */}
              {!hasTokenLink ? (
                <>
                  <div className="sv-form-group">
                    <label htmlFor="reset-email" className="sv-label">
                      <span>Email address</span>
                    </label>
                    <div className="sv-input-wrapper">
                      <Mail size={18} className="sv-input-icon" aria-hidden="true" />
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="sv-input"
                        autoComplete="email"
                        required
                        disabled={loading || isExpired}
                      />
                    </div>
                  </div>

                  <div className="sv-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label htmlFor="reset-otp" className="sv-label" style={{ margin: 0 }}>
                        <span>6-Digit OTP Code</span>
                      </label>
                      {autoFilledOtp && (
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                          Auto-filled from link
                        </span>
                      )}
                    </div>
                    <div className="sv-input-wrapper">
                      <KeyRound size={18} className="sv-input-icon" aria-hidden="true" />
                      <input
                        id="reset-otp"
                        name="otp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="sv-input"
                        style={{ letterSpacing: '4px', fontWeight: 700 }}
                        required
                        disabled={loading || isExpired}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px 14px', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a1a1aa', marginBottom: '4px' }}>
                    Resetting Password For
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                    {email || 'Verified Account'}
                  </div>
                </div>
              )}

              <PasswordInput
                id="password"
                name="password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showStrength={true}
                placeholder="Enter new password (min. 8 chars)"
                autoComplete="new-password"
                required
                disabled={loading || isExpired}
              />

              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                showStrength={false}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                disabled={loading || isExpired}
              />

              <button
                type="submit"
                className="sv-btn-primary"
                disabled={loading || isExpired}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <div className="sv-spinner" aria-hidden="true" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Update Password</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="sv-auth-success-state" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Password Updated!
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Your account password has been updated securely. You can now sign in to your document vault with your new credentials.
              </p>
              <Link to="/login" className="sv-btn-primary" style={{ width: '100%', display: 'inline-flex', justifyContent: 'center' }}>
                <span>Proceed to Sign In</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {/* Footer Back to Login Link */}
          <div className="sv-auth-footer-link" style={{ marginTop: '1.25rem' }}>
            <Link
              to="/login"
              className="sv-link-accent"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
