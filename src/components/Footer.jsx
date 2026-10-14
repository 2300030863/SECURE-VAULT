import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="sv-footer">
      <div className="sv-footer-inner">
        <div className="sv-footer-top">
          <div className="sv-footer-brand">
            <Logo />
            <p className="sv-footer-desc">
              A private, high-security document sharing platform. Distribute PDFs, presentations,
              and confidential assets protected by individual retrieval access codes.
            </p>
          </div>

          <div className="sv-footer-nav">
            <div>
              <div className="sv-footer-col-title">Navigation</div>
              <ul className="sv-footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/vault">Document Vault</Link></li>
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/register">Create Account</Link></li>
              </ul>
            </div>

            <div>
              <div className="sv-footer-col-title">Architecture</div>
              <ul className="sv-footer-links">
                <li><span style={{ color: 'var(--text-muted)' }}>TiDB Cloud Cluster</span></li>
                <li><span style={{ color: 'var(--text-muted)' }}>SHA-256 Code Hashing</span></li>
                <li><span style={{ color: 'var(--text-muted)' }}>Ephemeral Storage</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sv-footer-bottom">
          <div>
            &copy; {currentYear} Secure Vault. All rights reserved.
          </div>
          <div className="sv-privacy-note">
            <ShieldCheck size={16} />
            <span>Private by design — no tracking, zero-knowledge verification</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
