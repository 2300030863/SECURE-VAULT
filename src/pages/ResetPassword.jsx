import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const tokenParam = params.get('token') || '';
  const emailParam = params.get('email') || '';
  const otpParam = params.get('otp') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(otpParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
    if (otpParam) setOtp(otpParam);
    if (tokenParam) setToken(tokenParam);
  }, [emailParam, otpParam, tokenParam]);

  const hasTokenLink = Boolean(token);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage(null);

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
      setStatusMessage({
        type: 'error',
        message: err.message || 'Unable to reset password. The OTP or link may have expired.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sv-page-wrapper auth-page">
      <div className="sv-auth-container">
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

          {/* Status Message Feedback */}
          <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

          {/* Form */}
          {!isSuccess ? (
            <form className="sv-form" onSubmit={handleSubmit} noValidate>
              {/* If no URL token, prompt for Email and 6-Digit OTP */}
              {!hasTokenLink && (
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
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="sv-form-group">
                    <label htmlFor="reset-otp" className="sv-label">
                      <span>6-Digit OTP Code</span>
                    </label>
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
                        style={{ letterSpacing: '3px', fontWeight: 700 }}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
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
                disabled={loading}
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
                disabled={loading}
              />

              <button
                type="submit"
                className="sv-btn-primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <div className="sv-spinner" aria-hidden="true" />
                    <span>Verifying &amp; Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Password Reset</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#4ade80',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>
                Password Updated!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Your Secure Vault password has been reset successfully. You can now log into your account.
              </p>
              <Link to="/login" className="sv-btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                Sign In Now
              </Link>
            </div>
          )}

          {/* Footer Back to Login */}
          {!isSuccess && (
            <div className="sv-auth-footer-link" style={{ marginTop: '1.25rem' }}>
              <Link to="/login" className="sv-link-accent">
                Remember your password? Sign in
              </Link>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
