import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, ArrowRight, FolderLock, User } from 'lucide-react';
import Logo from './Logo';
import UserProfileModal from './UserProfileModal';

export default function Navbar({ isAuthenticated = false, currentUser = null, onLogout, onProfileUpdated }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
            <>
              <li>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="sv-profile-pill-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="View and update profile"
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e11d2e, #991b1b)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#ffffff',
                    }}
                  >
                    {(currentUser?.name || currentUser?.full_name || 'U')[0]?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.84rem', fontWeight: '500' }}>
                    {currentUser?.name || currentUser?.full_name || 'Profile'}
                  </span>
                  {currentUser?.occupation && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#a1a1aa',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentUser.occupation}
                    </span>
                  )}
                </button>
              </li>
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
            </>
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
          <>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsProfileOpen(true);
              }}
              className="sv-nav-link"
              style={{ textAlign: 'left', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <User size={16} />
              <span>Profile & Security ({currentUser?.name || 'Account'})</span>
            </button>
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
          </>
        )}
      </div>

      {/* Profile & Security Settings Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={onProfileUpdated}
      />
    </header>
  );
}
