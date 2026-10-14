import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function FormMessage({ type = 'error', message }) {
  if (!message) return null;

  const icons = {
    error: <AlertCircle size={18} className="sv-form-message-icon" />,
    success: <CheckCircle2 size={18} className="sv-form-message-icon" />,
    warning: <AlertTriangle size={18} className="sv-form-message-icon" />,
    info: <Info size={18} className="sv-form-message-icon" />,
  };

  return (
    <div
      className={`sv-form-message ${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {icons[type] || icons.error}
      <span>{message}</span>
    </div>
  );
}
