import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, ArrowLeft, Home, CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(20);
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60); // 15 minutes countdown
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(6);
  const [autoRedirectActive, setAutoRedirectActive] = useState(true);
  const navigate = useNavigate();

  // Active 15-minute countdown once email is dispatched
  useEffect(() => {
    if (!resultData) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resultData]);

  // Subtle auto-redirect countdown to make the transition smooth
  useEffect(() => {
    if (!resultData || !autoRedirectActive) return;

    if (autoRedirectSeconds <= 0) {
      const targetEmail = resultData.email || email.trim();
      const expParam = resultData.expiresTimestamp ? `&exp=${resultData.expiresTimestamp}` : '';
      navigate(`/reset-password?email=${encodeURIComponent(targetEmail)}${expParam}`);
      return;
    }

    const timer = setTimeout(() => {
      setAutoRedirectSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resultData, autoRedirectSeconds, autoRedirectActive, email, navigate]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage(null);
    setResultData(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatusMessage({
        type: 'error',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    if (isLocked) {
      setStatusMessage({
        type: 'error',
        message: `Too many OTP requests. Password reset is on hold for ${lockoutMinutes} minutes. Please try again later.`,
      });
      return;
    }

    setLoading(true);

    try {
      const result = await authService.forgotPassword(trimmedEmail);
      const targetEmail = result.email || trimmedEmail;
      setResultData({
        ...result,
        email: targetEmail,
      });
      setCountdownSeconds(15 * 60);
      setAutoRedirectSeconds(6);
      setAutoRedirectActive(true);
      setStatusMessage({
        type: 'success',
        message: `Password reset email dispatched to ${targetEmail}. Check your inbox!`,
      });
    } catch (err) {
      if (err.locked) {
        setIsLocked(true);
        setLockoutMinutes(err.minutesRemaining || 20);
        setStatusMessage({
          type: 'error',
          message:
            err.message ||
            `Too many OTP requests (3 limit). Please try again in ${err.minutesRemaining || 20} minutes.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: err.message || 'Unable to connect to the server. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const handleProceedToReset = () => {
    const targetEmail = resultData?.email || email.trim();
    const expParam = resultData?.expiresTimestamp ? `&exp=${resultData.expiresTimestamp}` : '';
    navigate(`/reset-password?email=${encodeURIComponent(targetEmail)}${expParam}`);
  };

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
              <KeyRound size={24} />
            </div>
            <h1 className="sv-auth-title">Forgot Password?</h1>
            <p className="sv-auth-subtitle">
              Enter your registered email address to receive a time-limited 6-digit OTP code &amp; direct reset link.
            </p>
          </div>

          {/* Feedback Alert / Status Banner */}
          <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

          {/* If OTP sent successfully to email */}
          {resultData ? (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  marginBottom: '1rem',
                  boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
                }}
              >
                <Mail size={32} />
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '12px', fontWeight: 600, marginBottom: '0.75rem' }}>
                <CheckCircle2 size={14} />
                <span>Reset Email Dispatched</span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                Check Your Inbox
              </h3>

              <div style={{ background: '#121215', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px 16px', margin: '1rem 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a1a1aa' }}>Destination Email</span>
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>● Sent</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', wordBreak: 'break-all' }}>
                  {resultData.email}
                </div>

                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} className="text-[#ef4444]" />
                    <span>Time Limit:</span>
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: countdownSeconds > 60 ? '#fca5a5' : '#ef4444', fontFamily: 'monospace' }}>
                    {formatTimer(countdownSeconds)} remaining
                  </span>
                </div>
              </div>

              {resultData.devOtp && (
                <div style={{ background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '12px', color: '#fef08a', textAlign: 'left' }}>
                  <strong>Dev Mode OTP Code:</strong> <code style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '2px', color: '#ffffff' }}>{resultData.devOtp}</code>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                We sent a 6-digit verification code and 1-click auto-fill link to your email. Click below to enter your OTP and choose a new password.
              </p>

              <button
                type="button"
                onClick={handleProceedToReset}
                className="sv-btn-primary"
                style={{ width: '100%', marginBottom: '0.75rem', padding: '0.85rem 1rem' }}
              >
                <span>Proceed to Reset Page</span>
                <ArrowRight size={16} />
              </button>

              {autoRedirectActive && autoRedirectSeconds > 0 && (
                <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '0.85rem' }}>
                  Automatically taking you to reset page in <strong style={{ color: '#ffffff' }}>{autoRedirectSeconds}s</strong>...{' '}
                  <button
                    type="button"
                    onClick={() => setAutoRedirectActive(false)}
                    style={{ background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', padding: 0 }}
                  >
                    stay here
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setResultData(null);
                  setStatusMessage(null);
                  setAutoRedirectActive(false);
                }}
                className="sv-btn-secondary"
                style={{ width: '100%' }}
              >
                <span>Change Email or Resend</span>
              </button>
            </div>
          ) : (
            <form className="sv-form" onSubmit={handleSubmit} noValidate>
              <div className="sv-form-group">
                <label htmlFor="email" className="sv-label">
                  <span>Registered email address</span>
                </label>
                <div className="sv-input-wrapper">
                  <Mail size={18} className="sv-input-icon" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="sv-input"
                    required
                    maxLength={254}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clock size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12px', color: '#d4d4d8', lineHeight: 1.4 }}>
                  Password reset codes and verification links are protected with a strict <strong>15-minute time limit</strong>.
                </span>
              </div>

              <button
                type="submit"
                className="sv-btn-primary"
                disabled={loading || isLocked}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <div className="sv-spinner" aria-hidden="true" />
                    <span>Dispatching OTP to Email...</span>
                  </>
                ) : isLocked ? (
                  <span>Locked ({lockoutMinutes}m Hold)</span>
                ) : (
                  <>
                    <span>Send Reset Code &amp; Link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
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

          <div style={{ marginTop: '1rem', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.85rem' }}>
            <Link to="/" className="sv-auth-home-return-link" title="Return to DocQevrilo Home">
              <Home size={14} className="text-[#E11D2E]" />
              <span>Return to Home Page</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
