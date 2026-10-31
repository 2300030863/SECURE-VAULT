import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  ArrowRight,
  Briefcase,
  KeyRound,
  Check,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    occupation: '',
    securityPin: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline Email Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationProof, setVerificationProof] = useState('');
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [inlineOtp, setInlineOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingInlineOtp, setIsVerifyingInlineOtp] = useState(false);
  const [inlineOtpStatus, setInlineOtpStatus] = useState(null); // { type: 'success' | 'error', text: '' }
  const [otpAttemptsRemaining, setOtpAttemptsRemaining] = useState(3);
  const [isOtpLocked, setIsOtpLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(20);

  // Fallback state for users arriving with ?verify=email parameter
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  useEffect(() => {
    const verifyParam = searchParams.get('verify');
    if (verifyParam) {
      setVerificationEmail(verifyParam.trim().toLowerCase());
    }
  }, [searchParams]);

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Please provide a valid email format.';
    } else if (!isEmailVerified) {
      newErrors.email = 'Please click "Verify" on the right to verify your email first.';
    }

    if (!formData.occupation) {
      newErrors.occupation = 'Please select your occupation.';
    }

    if (!formData.securityPin) {
      newErrors.securityPin = 'A 4-digit security PIN is required.';
    } else if (!/^\d{4}$/.test(formData.securityPin.trim())) {
      newErrors.securityPin = 'PIN must be exactly 4 digits (0-9).';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must accept the Terms of Service & Privacy Policy.';
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

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, email: val }));

    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: '' }));
    }

    // Changing email resets the verified state
    if (isEmailVerified || verificationProof) {
      setIsEmailVerified(false);
      setVerificationProof('');
      setShowOtpBox(false);
      setInlineOtp('');
      setInlineOtpStatus(null);
    }
  };

  const handleSendInlineOtp = async () => {
    const cleanEmail = formData.email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address first.' }));
      return;
    }

    if (isOtpLocked) {
      setInlineOtpStatus({
        type: 'error',
        text: `Too many OTP requests. Profile verification is on hold. Please try again in ${lockoutMinutes} minutes.`,
      });
      setShowOtpBox(true);
      return;
    }

    setIsSendingOtp(true);
    setInlineOtpStatus(null);

    try {
      const res = await authService.sendEmailOtp(cleanEmail);
      setShowOtpBox(true);
      if (typeof res.attemptsRemaining === 'number') {
        setOtpAttemptsRemaining(res.attemptsRemaining);
      }
      if (res.devOtp) {
        setInlineOtp(res.devOtp);
      }
      setInlineOtpStatus({
        type: res.emailSent === false ? 'warning' : 'success',
        text: res.warning || res.message || `A 6-digit verification code has been sent to ${cleanEmail}.`,
      });
    } catch (err) {
      setShowOtpBox(true);
      if (err.locked) {
        setIsOtpLocked(true);
        setLockoutMinutes(err.minutesRemaining || 20);
        setInlineOtpStatus({
          type: 'error',
          text: err.message || `Too many OTP requests (3 max). Please try again in ${err.minutesRemaining || 20} minutes.`,
        });
      } else {
        setInlineOtpStatus({
          type: 'error',
          text: err.message || 'Unable to send verification code. Please try again.',
        });
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyInlineOtp = async () => {
    const cleanEmail = formData.email.trim();
    const cleanOtp = inlineOtp.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setInlineOtpStatus({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setInlineOtpStatus({ type: 'error', text: 'Enter the complete 6-digit verification code.' });
      return;
    }

    setIsVerifyingInlineOtp(true);
    setInlineOtpStatus(null);

    try {
      const res = await authService.verifyEmailOtp(cleanEmail, cleanOtp);
      setIsEmailVerified(true);
      setVerificationProof(res.verificationProof);
      setShowOtpBox(false);
      setInlineOtp('');
      setInlineOtpStatus(null);
      setErrors((prev) => ({ ...prev, email: '' }));
      setStatusMessage({
        type: 'success',
        message: '✓ Email verified! You can now complete your registration.',
      });
    } catch (err) {
      setInlineOtpStatus({
        type: 'error',
        text: err.message || 'Invalid or expired 6-digit code. Please try again.',
      });
    } finally {
      setIsVerifyingInlineOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isEmailVerified) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please click "Verify" and enter the 6-digit code sent to your email.',
      }));
      setStatusMessage({
        type: 'error',
        message: 'Email verification required: please verify your email before creating your account.',
      });
      setShowOtpBox(true);
      return;
    }

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await authService.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        occupation: formData.occupation,
        securityPin: formData.securityPin.trim(),
        password: formData.password,
        verificationProof,
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Account created and email verified! Redirecting to your vault...',
        });
        setTimeout(() => {
          navigate('/vault');
        }, 1200);
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'Registration failed. Please verify your details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fallback standalone OTP verification handlers (for URL query ?verify=email)
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) {
      setVerificationStatus({ type: 'error', message: 'Please provide a valid email address.' });
      return;
    }
    if (!/^\d{6}$/.test(verificationOtp)) {
      setVerificationStatus({ type: 'error', message: 'Enter the 6-digit code from your email.' });
      return;
    }
    setIsVerifyingEmail(true);
    setVerificationStatus(null);
    try {
      const result = await authService.verifyEmail(verificationEmail, verificationOtp);
      setVerificationStatus({ type: 'success', message: result.message });
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      setVerificationStatus({ type: 'error', message: err.message });
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) {
      setVerificationStatus({ type: 'error', message: 'Please enter a valid email to resend code.' });
      return;
    }
    setVerificationStatus(null);
    try {
      const result = await authService.resendVerificationEmail(verificationEmail);
      setVerificationStatus({ type: 'success', message: result.message });
    } catch (err) {
      setVerificationStatus({ type: 'error', message: err.message });
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
            <h1 className="sv-auth-title">Create your secure space</h1>
            <p className="sv-auth-subtitle">
              Create an account to manage and share your documents with unique access codes.
            </p>
          </div>

          {/* Feedback message */}
          <FormMessage type={statusMessage?.type} message={statusMessage?.message} />

          {verificationEmail ? (
            <form className="sv-form" onSubmit={handleVerifyEmail} noValidate>
              <div className="sv-form-group">
                <label htmlFor="verification-email-input" className="sv-label">
                  <span>Registered Email</span>
                </label>
                <div className="sv-input-wrapper">
                  <Mail size={18} className="sv-input-icon" aria-hidden="true" />
                  <input
                    id="verification-email-input"
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value.trim().toLowerCase())}
                    placeholder="alex@example.com"
                    className="sv-input"
                    disabled={isVerifyingEmail}
                    required
                  />
                </div>
              </div>

              <div className="sv-form-group">
                <label htmlFor="verification-otp" className="sv-label">
                  <span>6-Digit Verification Code</span>
                </label>
                <p className="sv-auth-subtitle" style={{ marginBottom: '0.5rem' }}>
                  Enter the 6-digit code for <strong>{verificationEmail}</strong>.
                </p>
                <input
                  id="verification-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationOtp}
                  onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="sv-input"
                  autoComplete="one-time-code"
                  autoFocus
                  disabled={isVerifyingEmail}
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem' }}
                />
              </div>

              <FormMessage type={verificationStatus?.type} message={verificationStatus?.message} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="sv-btn-primary" disabled={isVerifyingEmail || verificationOtp.length !== 6}>
                  {isVerifyingEmail ? 'Verifying...' : 'Verify Email'}
                </button>
                <button type="button" className="sv-btn-secondary" onClick={handleResendVerification} disabled={isVerifyingEmail || !verificationEmail}>
                  Resend verification code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationEmail('');
                    setVerificationOtp('');
                    setStatusMessage(null);
                    setVerificationStatus(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '0.25rem',
                  }}
                >
                  ← Back to full registration form
                </button>
              </div>
            </form>
          ) : (
            <form className="sv-form" onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className="sv-form-group">
                <label htmlFor="reg-name" className="sv-label">
                  <span>Full name</span>
                </label>
                <div className="sv-input-wrapper">
                  <User size={18} className="sv-input-icon" aria-hidden="true" />
                  <input
                    id="reg-name"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Alex Morgan"
                    className="sv-input"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? 'reg-name-error' : undefined}
                  />
                </div>
                {errors.fullName && (
                  <span id="reg-name-error" className="sv-field-error" role="alert">
                    {errors.fullName}
                  </span>
                )}
              </div>

              {/* Email Address with Inline Verify on the Right */}
              <div className="sv-form-group">
                <label htmlFor="reg-email" className="sv-label">
                  <span>Email address</span>
                </label>
                <div className="sv-input-wrapper">
                  <Mail size={18} className="sv-input-icon" aria-hidden="true" />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    placeholder="alex@example.com"
                    className="sv-input"
                    style={{ paddingRight: isEmailVerified ? '6.8rem' : '5.5rem' }}
                    autoComplete="email"
                    required
                    disabled={isSubmitting || isEmailVerified}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'reg-email-error' : undefined}
                  />

                  {/* Right-side Action: Verified badge OR Verify button */}
                  {isEmailVerified ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        zIndex: 2,
                      }}
                    >
                      <span className="sv-verified-badge" style={{ position: 'static', transform: 'none' }}>
                        <Check size={13} />
                        <span>Verified</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEmailVerified(false);
                          setVerificationProof('');
                          setShowOtpBox(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#a1a1aa',
                          fontSize: '0.7rem',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: '0.1rem 0.25rem',
                        }}
                        title="Change email address"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendInlineOtp}
                      disabled={isSendingOtp || isOtpLocked || !formData.email.trim()}
                      className="sv-input-action-btn"
                      title={isOtpLocked ? `Locked for ${lockoutMinutes}m` : 'Verify this email address'}
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : isOtpLocked ? (
                        <span>Locked ({lockoutMinutes}m)</span>
                      ) : (
                        <span>Verify</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Inline OTP Section directly down below */}
                {showOtpBox && !isEmailVerified && (
                  <div className="sv-inline-otp-container">
                    <div className="sv-inline-otp-header">
                      <span className="sv-inline-otp-title">
                        <KeyRound size={13} />
                        <span>Email Verification Code</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowOtpBox(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#71717a',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        aria-label="Close verification box"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <p className="sv-inline-otp-note">
                      {inlineOtpStatus?.type === 'success' ? (
                        <span style={{ color: '#34d399' }}>{inlineOtpStatus.text}</span>
                      ) : inlineOtpStatus?.type === 'warning' ? (
                        <span style={{ color: '#fbbf24' }}>{inlineOtpStatus.text}</span>
                      ) : (
                        <>
                          Enter the 6-digit code sent to <strong>{formData.email.trim()}</strong>.
                        </>
                      )}
                    </p>

                    <div className="sv-inline-otp-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={inlineOtp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setInlineOtp(val);
                          if (inlineOtpStatus?.type === 'error') setInlineOtpStatus(null);
                        }}
                        placeholder="000000"
                        className="sv-inline-otp-input"
                        autoFocus
                        disabled={isVerifyingInlineOtp}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyInlineOtp}
                        disabled={isVerifyingInlineOtp || inlineOtp.trim().length !== 6}
                        className="sv-inline-otp-verify-btn"
                      >
                        {isVerifyingInlineOtp ? 'Verifying...' : 'Verify OTP'}
                      </button>
                    </div>

                    {inlineOtpStatus?.type === 'error' && (
                      <div
                        style={{
                          marginTop: '0.45rem',
                          fontSize: '0.725rem',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{inlineOtpStatus.text}</span>
                      </div>
                    )}

                    <div className="sv-inline-otp-footer">
                      <span>
                        {isOtpLocked
                          ? `Locked for ${lockoutMinutes}m`
                          : `${otpAttemptsRemaining} attempt${otpAttemptsRemaining === 1 ? '' : 's'} left (max 3)`}
                      </span>
                      <button
                        type="button"
                        onClick={handleSendInlineOtp}
                        disabled={isSendingOtp || isOtpLocked}
                        className="sv-inline-otp-resend-btn"
                      >
                        {isSendingOtp ? 'Sending...' : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {errors.email && (
                  <span id="reg-email-error" className="sv-field-error" role="alert">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Occupation */}
              <div className="sv-form-group">
                <label htmlFor="reg-occupation" className="sv-label">
                  <span>Occupation</span>
                </label>
                <div className="sv-input-wrapper">
                  <Briefcase size={18} className="sv-input-icon" aria-hidden="true" />
                  <select
                    id="reg-occupation"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    className="sv-input"
                    disabled={isSubmitting}
                    style={{
                      cursor: 'pointer',
                      appearance: 'auto',
                      backgroundColor: '#18181b',
                      color: '#fafafa',
                    }}
                    required
                  >
                    <option value="">Select your occupation...</option>
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Professor">Professor</option>
                    <option value="Researcher">Researcher</option>
                    <option value="Software Engineer / Developer">
                      Software Engineer / Developer
                    </option>
                    <option value="Doctor / Healthcare">Doctor / Healthcare</option>
                    <option value="Lawyer / Legal">Lawyer / Legal</option>
                    <option value="Finance / Accountant">Finance / Accountant</option>
                    <option value="Business / Entrepreneur">Business / Entrepreneur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {errors.occupation && (
                  <span id="reg-occupation-error" className="sv-field-error" role="alert">
                    {errors.occupation}
                  </span>
                )}
              </div>

              {/* 4-Digit Security PIN */}
              <div className="sv-form-group">
                <label
                  htmlFor="reg-pin"
                  className="sv-label"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>4-Digit Security PIN</span>
                  <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 'normal' }}>
                    (To reveal / regenerate vault codes)
                  </span>
                </label>
                <div className="sv-input-wrapper">
                  <KeyRound size={18} className="sv-input-icon" aria-hidden="true" />
                  <input
                    id="reg-pin"
                    name="securityPin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={formData.securityPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData((prev) => ({ ...prev, securityPin: val }));
                      if (errors.securityPin) setErrors((prev) => ({ ...prev, securityPin: '' }));
                    }}
                    placeholder="e.g. 5824"
                    className="sv-input"
                    autoComplete="off"
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.securityPin)}
                  />
                </div>
                {errors.securityPin && (
                  <span id="reg-pin-error" className="sv-field-error" role="alert">
                    {errors.securityPin}
                  </span>
                )}
              </div>

              {/* Password with Strength Meter */}
              <PasswordInput
                id="reg-password"
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                disabled={isSubmitting}
                showStrength={true}
                autoComplete="new-password"
              />

              {/* Confirm Password */}
              <PasswordInput
                id="reg-confirm-password"
                name="confirmPassword"
                label="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
              />

              {/* Terms & Privacy acceptance */}
              <div className="sv-form-group">
                <label className="sv-form-row-checkbox">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.agreeTerms)}
                  />
                  <span>
                    I agree to the Terms of Service and Privacy Policy for zero-knowledge data
                    retention.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <span className="sv-field-error" role="alert">
                    {errors.agreeTerms}
                  </span>
                )}
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationEmail(formData.email.trim().toLowerCase() || '');
                    setStatusMessage(null);
                    setVerificationStatus(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Already have an account pending verification? Enter code
                </button>
              </div>
            </form>
          )}

          {/* Footer link to sign in */}
          <div className="sv-auth-footer-link">
            Already have an account?{' '}
            <Link to="/login" className="sv-link-accent">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
