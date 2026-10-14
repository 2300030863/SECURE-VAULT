import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, ArrowRight, FolderLock } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ isAuthenticated = false, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sv-navbar-container">
      <nav className="sv-navbar" aria-label="Main navigation">
        <Logo />

        {/* Desktop Links */}
        <ul className="sv-nav-links">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
              end
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/vault"
              className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
            >
              <FolderLock size={15} />
              <span>Document Vault</span>
            </NavLink>
          </li>
          {!isAuthenticated ? (
            <>
              <li>
                <NavLink
                  to="/login"
                  className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
                >
                  Sign In
                </NavLink>
              </li>
              <li>
                <NavLink to="/register" className="sv-nav-cta">
                  <span>Create Account</span>
                  <ArrowRight size={14} />
                </NavLink>
              </li>
            </>
          ) : (
            <li>
              <button
                onClick={() => {
                  if (onLogout) onLogout();
                  navigate('/login');
                }}
                className="sv-btn-secondary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
              >
                Sign Out
              </button>
            </li>
          )}
        </ul>

        {/* Mobile Toggle Button */}
        <button
          className="sv-nav-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div className={`sv-mobile-menu ${mobileMenuOpen ? 'open' : ''}`} aria-hidden={!mobileMenuOpen}>
        <NavLink
          to="/"
          className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
          onClick={handleLinkClick}
          end
        >
          Home
        </NavLink>
        <NavLink
          to="/vault"
          className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
          onClick={handleLinkClick}
        >
          <FolderLock size={16} />
          <span>Document Vault</span>
        </NavLink>
        {!isAuthenticated ? (
          <>
            <NavLink
              to="/login"
              className={({ isActive }) => `sv-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              Sign In
            </NavLink>
            <NavLink
              to="/register"
              className="sv-nav-cta"
              onClick={handleLinkClick}
            >
              Create Account
            </NavLink>
          </>
        ) : (
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (onLogout) onLogout();
              navigate('/login');
            }}
            className="sv-btn-secondary"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}
