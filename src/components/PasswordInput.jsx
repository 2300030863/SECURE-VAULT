import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = '••••••••',
  error,
  showStrength = false,
  autoComplete = 'current-password',
  required = true,
  disabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);

  // Compute simple password strength score (0 to 3)
  const calculateStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None', class: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score === 1) return { score: 1, label: 'Weak', class: 'active-weak' };
    if (score === 2) return { score: 2, label: 'Fair', class: 'active-fair' };
    if (score === 3) return { score: 3, label: 'Strong', class: 'active-strong' };
    return { score: 0, label: 'Too short', class: 'active-weak' };
  };

  const strength = calculateStrength(value);
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="sv-form-group">
      <label htmlFor={id} className="sv-label">
        <span>{label}</span>
      </label>

      <div className="sv-input-wrapper">
        <Lock size={18} className="sv-input-icon" aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="sv-input"
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={`${error ? errorId : ''} ${showStrength ? helperId : ''}`.trim()}
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="sv-password-toggle-btn"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && value && (
        <div id={helperId} className="sv-strength-meter" aria-live="polite">
          <div className="sv-strength-bars">
            <div className={`sv-strength-bar ${strength.score >= 1 ? strength.class : ''}`} />
            <div className={`sv-strength-bar ${strength.score >= 2 ? strength.class : ''}`} />
            <div className={`sv-strength-bar ${strength.score >= 3 ? strength.class : ''}`} />
          </div>
          <div className="sv-strength-label">
            <span>Strength: {strength.label}</span>
            <span>Min. 8 characters</span>
          </div>
        </div>
      )}

      {error && (
        <span id={errorId} className="sv-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
