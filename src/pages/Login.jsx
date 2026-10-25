import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Shield, ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null); // { type, message }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState(null);

  // Pre-fill remembered email hint if present
  useEffect(() => {
    const saved = authService.getSavedEmailHint();
    if (saved) {
      setFormData((prev) => ({ ...prev, email: saved, rememberMe: true }));
    }
  }, []);

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email format (e.g. name@domain.com).';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Sign in successful! Redirecting to your vault...',
        });

        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }

        setTimeout(() => {
          navigate('/vault');
        }, 800);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'Unable to sign in. Please check your credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotStatus({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }

    try {
      const res = await authService.forgotPassword(forgotEmail);
      setForgotStatus({ type: 'success', message: res.message });
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStatus(null);
      }, 2500);
    } catch (_) {
      setForgotStatus({ type: 'error', message: 'Failed to process request.' });
    }
  };

  return (
    <div className="sv-page-wrapper">
      <div className="sv-auth-container">
        <GlassCard highlightCrimson className="sv-auth-card">
          {/* Header */}
          <div className="sv-auth-header">
            <div className="sv-auth-badge" aria-hidden="true">
              <Shield size={24} />
            </div>
            <h1 className="sv-auth-title">Welcome back</h1>
            <p className="sv-auth-subtitle">
              Sign in to manage and share your DocQevrilo documents.
            </p>
          </div>

          {/* Status Feedback Live Region */}
          <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

          {/* Form */}
          <form className="sv-form" onSubmit={handleSubmit} noValidate>
            {/* Email Address */}
            <div className="sv-form-group">
              <label htmlFor="login-email" className="sv-label">
                <span>Email address</span>
              </label>
              <div className="sv-input-wrapper">
                <Mail size={18} className="sv-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@example.com"
                  className="sv-input"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                />
              </div>
              {errors.email && (
                <span id="login-email-error" className="sv-field-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <PasswordInput
              id="login-password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={isSubmitting}
              autoComplete="current-password"
            />

            {/* Remember Me & Forgot Password */}
            <div className="sv-form-actions-row">
              <label className="sv-form-row-checkbox">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="sv-link-accent"
              >
                Forgot password?
              </Link>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="sv-btn-primary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="sv-spinner" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer link to register */}
          <div className="sv-auth-footer-link">
            Don't have an account?{' '}
            <Link to="/register" className="sv-link-accent">
              Create one
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <GlassCard style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
            <h2 id="forgot-modal-title" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Enter your email address and we'll send a password recovery notification.
            </p>

            <FormMessage type={forgotStatus?.type} message={forgotStatus?.message} />

            <form onSubmit={handleForgotPassword} className="sv-form">
              <div className="sv-form-group">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="sv-input"
                  style={{ paddingLeft: '1rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="sv-btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button type="submit" className="sv-btn-primary" style={{ flex: 1 }}>
                  Send Link
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
