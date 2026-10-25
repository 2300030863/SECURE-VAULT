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
              DocQevrilo — A smarter way to share documents securely. Distribute PDFs, presentations,
              notes, and confidential assets protected by individual retrieval access codes.
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
                <li>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open_brand_meaning'))}
                    className="text-left text-[#E11D2E] hover:underline cursor-pointer bg-transparent border-0 p-0 text-xs font-semibold"
                  >
                    ✨ Brand Meaning
                  </button>
                </li>
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
            &copy; {currentYear} DocQevrilo. One Code. Simple Sharing.
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
