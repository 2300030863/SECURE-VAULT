import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const navigate = useNavigate();

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

    setLoading(true);

    try {
      const result = await authService.forgotPassword(trimmedEmail);
      setResultData(result);
      setStatusMessage({
        type: 'success',
        message:
          result.message ||
          'If an account exists for that email, a verification link & OTP code will be sent.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'Unable to connect to the server. Please try again.',
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
              <KeyRound size={24} />
            </div>
            <h1 className="sv-auth-title">Forgot Password?</h1>
            <p className="sv-auth-subtitle">
              Enter your registered email address to receive a secure 6-digit OTP verification code.
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
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  marginBottom: '1rem',
                }}
              >
                <Mail size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
                OTP Sent to Your Email
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#d4d4d8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                A 6-digit OTP verification code has been sent to <strong>{email.trim()}</strong>. Please check your email inbox and enter the code below to reset your password.
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
                }
                className="sv-btn-primary"
                style={{ width: '100%', marginBottom: '0.75rem' }}
              >
                <span>Enter 6-Digit OTP</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setResultData(null);
                  setStatusMessage(null);
                }}
                className="sv-btn-secondary"
                style={{ width: '100%' }}
              >
                <span>Resend Code</span>
              </button>
            </div>
          ) : (
            <form className="sv-form" onSubmit={handleSubmit} noValidate>
              <div className="sv-form-group">
                <label htmlFor="email" className="sv-label">
                  <span>Email address</span>
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

              <button
                type="submit"
                className="sv-btn-primary"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <div className="sv-spinner" aria-hidden="true" />
                    <span>Sending OTP to Email...</span>
                  </>
                ) : (
                  <>
                    <span>Send 6-Digit OTP to Email</span>
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
        </GlassCard>
      </div>
    </div>
  );
}
