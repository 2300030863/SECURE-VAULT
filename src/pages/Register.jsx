import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Shield, ArrowRight, Briefcase, KeyRound } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PasswordInput from '../components/PasswordInput';
import FormMessage from '../components/FormMessage';
import { authService } from '../services/authService';

export default function Register() {
  const navigate = useNavigate();

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

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email format.';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await authService.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        occupation: formData.occupation,
        securityPin: formData.securityPin.trim(),
        password: formData.password,
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Account successfully registered! Redirecting to sign in...',
        });

        setTimeout(() => {
          navigate('/login');
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

          {/* Form */}
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

            {/* Email Address */}
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
                  onChange={handleChange}
                  placeholder="alex@example.com"
                  className="sv-input"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                />
              </div>
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
                  style={{ cursor: 'pointer', appearance: 'auto', backgroundColor: '#18181b', color: '#fafafa' }}
                  required
                >
                  <option value="">Select your occupation...</option>
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
              {errors.occupation && (
                <span id="reg-occupation-error" className="sv-field-error" role="alert">
                  {errors.occupation}
                </span>
              )}
            </div>

            {/* 4-Digit Security PIN */}
            <div className="sv-form-group">
              <label htmlFor="reg-pin" className="sv-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  I agree to the Terms of Service and Privacy Policy for zero-knowledge data retention.
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
          </form>

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
