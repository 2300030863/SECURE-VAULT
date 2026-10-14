import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Logo({ size = 'medium' }) {
  return (
    <Link to="/" className="sv-logo-link" aria-label="Secure Vault Home">
      <div className="sv-logo-icon-wrapper" aria-hidden="true">
        <Shield size={size === 'large' ? 24 : 18} />
      </div>
      <span className="sv-logo-text">
        SECURE <span className="sv-logo-text-accent">VAULT</span>
      </span>
    </Link>
  );
}
