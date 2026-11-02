import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  Flame,
  Sparkles,
  Heart,
  ExternalLink,
  ArrowRight,
  Lock,
  Coffee,
  Activity,
  Terminal,
} from 'lucide-react';

const DEVELOPER_NAME = 'Kommalapati Sivesh';

/**
 * Custom hook for smooth typing and retyping animation of the developer name
 */
function useTypewriter(text = DEVELOPER_NAME, typingSpeed = 95, deletingSpeed = 45, pauseTime = 3200) {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout;

    if (!isDeleting) {
      if (displayText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        // Full name displayed, pause before backspacing
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length - 1));
        }, deletingSpeed);
      } else {
        // Pauses briefly at empty string before typing again
        timeout = setTimeout(() => {
          setIsDeleting(false);
        }, 500);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, text, typingSpeed, deletingSpeed, pauseTime]);

  return displayText;
}

export default function Footer({ currentUser }) {
  const currentYear = new Date().getFullYear();
  const typedName = useTypewriter(DEVELOPER_NAME, 95, 45, 3400);

  const handleOpenBrandMeaning = () => {
    window.dispatchEvent(new CustomEvent('open_brand_meaning'));
  };

  const handleOpenStatusProtocols = () => {
    window.dispatchEvent(new CustomEvent('open_status_protocols'));
  };

  return (
    <footer className="sv-footer" role="contentinfo" aria-label="DocQevrilo site footer">
      {/* Ambient Top Glow Line */}
      <div className="sv-footer-glow-line" />

      <div className="sv-footer-inner">
        {/* Main 4-Column Grid */}
        <div className="sv-footer-top-grid">
          {/* Column 1: Brand & Security Badge */}
          <div className="sv-footer-col sv-footer-brand-col">
            <div className="sv-footer-brand-header">
              <Link to="/" className="sv-footer-brand-logo" aria-label="DocQevrilo Home">
                <div className="sv-footer-logo-icon">
                  <Shield size={20} />
                </div>
                <span className="sv-footer-logo-text">
                  Doc<span>Qevrilo</span>
                </span>
              </Link>
              <div className="sv-secure-platform-badge" title="Cryptographically verified architecture">
                <span className="sv-pulse-dot" />
                <span>Secure Platform</span>
              </div>
            </div>

            <p className="sv-footer-tagline">
              YOUR DIGITAL DOCUMENT WORKSPACE
            </p>

            <p className="sv-footer-desc">
              A modern platform to store, organize, preview, and share important documents through one convenient digital workspace with cryptographic access controls.
            </p>

            <div className="sv-footer-brand-actions">
              <button
                type="button"
                onClick={handleOpenBrandMeaning}
                className="sv-brand-meaning-btn"
                title="Discover the origin and meaning of the DocQevrilo name"
              >
                <Sparkles size={13} className="text-[#E11D2E]" />
                <span>Brand Meaning</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStatusProtocols}
                className="sv-status-pill-btn"
                title="RFC 2324 Developer Reference: Click to view 418, 200, 401, 403, 404, 500 status protocols"
              >
                <Coffee size={13} className="text-[#E11D2E]" />
                <span>418 · Privacy Is Not Optional</span>
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="sv-footer-col">
            <h4 className="sv-footer-col-title">Navigation</h4>
            <ul className="sv-footer-links">
              <li>
                <a href="/#about">About DocQevrilo</a>
              </li>
              <li>
                <a href="/#why-choose">Why Choose Us</a>
              </li>
              <li>
                <a href="/#features">Platform Features</a>
              </li>
              <li>
                <a href="/#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="/#user-workflow">User Workflow</a>
              </li>
              <li>
                <a href="/#security">Privacy &amp; Security</a>
              </li>
              <li>
                <a href="/#faq">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Access */}
          <div className="sv-footer-col">
            <h4 className="sv-footer-col-title">Workspace</h4>
            <ul className="sv-footer-links">
              <li>
                <Link to="/vault">Document Vault</Link>
              </li>
              <li>
                <Link to="/login">User Sign In</Link>
              </li>
              <li>
                <Link to="/register">Create Account</Link>
              </li>
              <li>
                <Link to="/forgot-password">Reset Password</Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleOpenStatusProtocols}
                  className="sv-footer-text-action-link"
                >
                  <Activity size={12} className="text-[#E11D2E]" />
                  <span>Status Protocols (200 / 418)</span>
                </button>
              </li>
              <li className="sv-footer-meta-pill">
                <span className="text-zinc-400">Zero-Knowledge</span>
              </li>
              <li className="sv-footer-meta-pill">
                <span className="text-zinc-400">SHA-256 Storage</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Developer Signature Card */}
          <div className="sv-footer-col sv-footer-signature-col">
            <div className="sv-dev-signature-card">
              {/* Card Accent Glow */}
              <div className="sv-dev-card-ambient" />

              <div className="sv-dev-card-top">
                <div className="sv-dev-passion-pill">
                  <Flame size={12} className="text-[#E11D2E] animate-pulse" />
                  <span>Crafted with passion</span>
                </div>
              </div>

              <div className="sv-dev-card-body">
                <span className="sv-dev-label">Designed &amp; Developed by</span>
                <div className="sv-dev-name-wrap">
                  <span className="sv-dev-name">{typedName}</span>
                  <span className="sv-dev-caret" aria-hidden="true">|</span>
                </div>
                <p className="sv-dev-tagline">
                  Turning Ideas into Digital Experiences.
                </p>
              </div>

              <div className="sv-dev-card-bottom">
                <span className="sv-dev-connect-kicker">LET'S CONNECT</span>
                <a
                  href="https://kommalaptisivesh.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sv-dev-portfolio-link"
                  title="Visit Kommalapati Sivesh's portfolio"
                >
                  <span className="sv-dev-link-lead">Let's Connect</span>
                  <span className="sv-dev-link-arrow">&rarr;</span>
                  <span className="sv-dev-link-url">kommalaptisivesh.me</span>
                  <ExternalLink size={12} className="sv-dev-link-ext" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="sv-footer-bottom-bar">
          <div className="sv-footer-copyright">
            &copy; {currentYear} <strong>DocQevrilo</strong>. All rights reserved.
          </div>

          {/* Live Telemetry & Philosophy Strip */}
          <div className="sv-footer-status-pill-group">
            <div className="sv-footer-status-badge sv-status-badge-ok" title="All vault microservices operational">
              <span className="sv-pulse-dot" />
              <span>200 · System Operational</span>
            </div>
            <button
              type="button"
              onClick={handleOpenStatusProtocols}
              className="sv-footer-status-badge sv-status-badge-philosophy"
              title="RFC 2324 Developer Reference: Click to view status code definitions"
            >
              <Coffee size={12} className="text-[#E11D2E]" />
              <span>418 · Privacy Is Not Optional</span>
            </button>
          </div>

          <div className="sv-footer-built-signature">
            <span>Built with</span>
            <Heart size={14} className="sv-footer-heart" />
            <span className="sv-footer-built-author">by Kommalapati Sivesh</span>
          </div>

          <div className="sv-footer-legal">
            <a href="/#security" className="sv-footer-legal-link">Privacy Policy</a>
            <span className="sv-footer-legal-bullet">&bull;</span>
            <a href="/#about" className="sv-footer-legal-link">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
