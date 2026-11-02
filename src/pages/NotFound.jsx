import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Terminal } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function NotFound() {
  const handleOpenProtocols = () => {
    window.dispatchEvent(new CustomEvent('open_status_protocols'));
  };

  return (
    <div className="sv-page-wrapper">
      <div className="sv-auth-container">
        <GlassCard className="sv-auth-card" style={{ textAlign: 'center' }}>
          <div
            className="sv-auth-badge"
            style={{
              margin: '0 auto 1.25rem',
              background: 'rgba(229, 9, 42, 0.15)',
              borderColor: 'rgba(229, 9, 42, 0.4)',
              color: '#E11D2E',
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#E11D2E',
              textTransform: 'uppercase',
            }}
          >
            HTTP ERROR CODE 404
          </span>
          <h1 className="sv-auth-title" style={{ marginTop: '0.35rem' }}>
            404 · Page Not Found
          </h1>
          <p className="sv-auth-subtitle" style={{ margin: '0.5rem auto 2rem', maxWidth: '420px' }}>
            The requested vault route, file handle, or cryptographic retrieval key does not exist or has completed its burn-on-read cycle.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <Link to="/" className="sv-btn-primary" style={{ display: 'inline-flex', width: 'auto', gap: '8px' }}>
              <ArrowLeft size={16} />
              <span>Return to Safety</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenProtocols}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              className="hover:text-white transition-colors"
            >
              <Terminal size={13} className="text-[#E11D2E]" />
              <span>View Status Protocols Reference (401, 403, 404, 418, 500)</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
