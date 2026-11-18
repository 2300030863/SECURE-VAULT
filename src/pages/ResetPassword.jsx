import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const tokenParam = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const expParam = params.get('exp') || '';

  const navigate = useNavigate();

  const [token, setToken] = useState(tokenParam);
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(Boolean(tokenParam));
  const [tokenValid, setTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState('');

  // 15-minute countdown state
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  // 1. If NO token is provided in URL, deny direct access
  const hasToken = Boolean(tokenParam && tokenParam.trim().length >= 32);

  // 2. Token verification on initial mount
  useEffect(() => {
    if (!hasToken) {
      setVerifyingToken(false);
      return;
    }

    let isMounted = true;

    async function verifyToken() {
      setVerifyingToken(true);
      setStatusMessage(null);

      try {
        const result = await authService.verifyResetToken(tokenParam.trim());
        if (!isMounted) return;

        setTokenValid(true);
        if (result.email) setEmail(result.email);

        const serverSecs =
          typeof result.remainingSeconds === 'number'
            ? result.remainingSeconds
            : expParam
            ? Math.max(0, Math.floor((parseInt(expParam, 10) - Date.now()) / 1000))
            : 15 * 60;

        if (serverSecs <= 0) {
          setIsExpired(true);
          setExpiredReason('This verification link has expired (15-minute time limit).');
          setRemainingSeconds(0);
        } else {
          setRemainingSeconds(serverSecs);
        }
      } catch (err) {
        if (!isMounted) return;
        setTokenValid(false);
        setIsExpired(true);
        setExpiredReason(
          err.isUsed
            ? 'This password reset link has already been used and cannot be reused.'
            : err.message || 'This password reset link is invalid or has expired after 15 minutes.'
        );
      } finally {
        if (isMounted) {
          setVerifyingToken(false);
        }
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [tokenParam, expParam, hasToken]);

  // 3. Active 1-second countdown interval (15 minutes max)
  useEffect(() => {
    if (!tokenValid || isExpired || isSuccess || verifyingToken) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          setExpiredReason('The 15-minute time limit for this reset link has elapsed.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenValid, isExpired, isSuccess, verifyingToken]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. Handle Password Reset Submission
  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage(null);

    if (isExpired) {
      setStatusMessage({
        type: 'error',
        message: 'This reset link has expired. Please request a fresh reset link.',
      });
      return;
    }

    if (!token) {
      setStatusMessage({
        type: 'error',
        message: 'A valid email reset verification link is required to change your password.',
      });
      return;
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
        token: token.trim(),
        password,
      });

      // Clear token immediately so it cannot be used again in this session
      setToken('');
      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setStatusMessage({
        type: 'success',
        message:
          result.message ||
          'Password reset successfully! Your verification link has been expired immediately.',
      });
    } catch (err) {
      const isExpError =
        err.message?.toLowerCase().includes('expired') ||
        err.message?.toLowerCase().includes('invalid') ||
        err.message?.toLowerCase().includes('already');

      if (isExpError) {
        setIsExpired(true);
        setExpiredReason(err.message || 'This reset link has expired or has already been used.');
      }

      setStatusMessage({
        type: 'error',
        message: err.message || 'Unable to reset password. The link may have expired or already been used.',
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
          {/* STATE A: DIRECT ACCESS BLOCKED - NO EMAIL LINK TOKEN PROVIDED */}
          {!hasToken ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
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
                  marginBottom: '1.25rem',
                  boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)',
                }}
              >
                <ShieldAlert size={32} />
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.6rem' }}>
                Email Verification Link Required
              </h2>

              <p style={{ fontSize: '0.875rem', color: '#d4d4d8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                For security reasons, your password can <strong>only be reset by clicking the direct verification link</strong> sent to your email inbox. Direct access without an active verification link is disabled.
              </p>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '1.5rem',
                  fontSize: '12px',
                  color: '#a1a1aa',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5', fontWeight: 600, marginBottom: '4px' }}>
                  <Mail size={14} className="text-[#ef4444]" />
                  <span>How to reset your password:</span>
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                  <li>Go to the Forgot Password page and submit your registered email.</li>
                  <li>Open your email inbox and look for the email from <strong>DocQevrilo</strong>.</li>
                  <li>Click the secure 1-click verification link inside the email (valid for 15 minutes).</li>
                </ol>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="sv-btn-primary"
                  style={{ width: '100%' }}
                >
                  <RefreshCw size={16} />
                  <span>Request Password Reset Link</span>
                </button>

                <Link
                  to="/login"
                  className="sv-btn-secondary"
                  style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : verifyingToken ? (
            /* STATE B: TOKEN VERIFICATION IN PROGRESS */
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(225, 29, 46, 0.12)',
                  border: '1px solid rgba(225, 29, 46, 0.3)',
                  color: '#E11D2E',
                  marginBottom: '1.25rem',
                }}
              >
                <Loader2 size={28} className="animate-spin" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.4rem' }}>
                Verifying Security Link...
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                Checking cryptographic token validity and 15-minute time limit.
              </p>
            </div>
          ) : isExpired && !isSuccess ? (
            /* STATE C: TOKEN EXPIRED OR ALREADY CONSUMED */
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
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
                  marginBottom: '1.25rem',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
                }}
              >
                <AlertTriangle size={32} />
              </div>

              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Verification Link Expired or Already Used
              </h2>

              <p style={{ fontSize: '0.875rem', color: '#d4d4d8', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                {expiredReason ||
                  'For your security, password reset verification links expire strictly after 15 minutes and can only be used once. This link is no longer valid.'}
              </p>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.22)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '1.5rem',
                  fontSize: '12px',
                  color: '#fca5a5',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                  <Clock size={14} className="text-[#ef4444]" />
                  <span>Single-Use &amp; 15-Minute Policy:</span>
                </div>
                <p style={{ margin: 0, color: '#d4d4d8', fontSize: '12px', lineHeight: 1.5 }}>
                  Once a password is successfully updated, or once 15 minutes have passed, the security token is immediately and permanently destroyed.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="sv-btn-primary"
                  style={{ width: '100%' }}
                >
                  <RefreshCw size={16} />
                  <span>Request New Reset Link</span>
                </button>

                <Link
                  to="/login"
                  className="sv-btn-secondary"
                  style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  <span>Return to Login</span>
                </Link>
              </div>
            </div>
          ) : !isSuccess ? (
            /* STATE D: ACTIVE RESET PASSWORD FORM (TOKEN VERIFIED & VALID) */
            <>
              {/* Header */}
              <div className="sv-auth-header">
                <div className="sv-auth-badge" aria-hidden="true">
                  <ShieldCheck size={24} />
                </div>
                <h1 className="sv-auth-title">Reset Password</h1>
                <p className="sv-auth-subtitle">
                  Email verification link authenticated. Choose a new secure password.
                </p>
              </div>

              {/* Time Limit Countdown Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: remainingSeconds < 120 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: remainingSeconds < 120 ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '1.25rem',
                  fontSize: '12px',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa' }}>
                  <Clock size={14} className={remainingSeconds < 120 ? 'text-[#ef4444]' : 'text-[#fca5a5]'} />
                  <span>Link Time Limit:</span>
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

              {/* Target Email Display */}
              {email && (
                <div
                  style={{
                    background: '#121215',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a1a1aa' }}>
                      Resetting Password For
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                      {email}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Verified
                  </span>
                </div>
              )}

              {/* Status Message Feedback */}
              <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

              <form className="sv-form" onSubmit={handleSubmit} noValidate>
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
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Update Password</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* STATE E: SUCCESS STATE - PASSWORD UPDATED & TOKEN PERMANENTLY EXPIRED */
            <div className="sv-auth-success-state" style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  marginBottom: '1.25rem',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Password Updated Successfully!
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Your account password has been updated securely. For your safety, this verification link has been <strong>permanently expired</strong> and cannot be used again.
              </p>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '1.5rem',
                  fontSize: '12px',
                  color: '#6ee7b7',
                }}
              >
                🔒 You can now sign in to DocQevrilo with your new password.
              </div>
              <Link
                to="/login"
                className="sv-btn-primary"
                style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
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
