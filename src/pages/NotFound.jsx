import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function NotFound() {
  return (
    <div className="sv-page-wrapper">
      <div className="sv-auth-container">
        <GlassCard className="sv-auth-card" style={{ textAlign: 'center' }}>
          <div className="sv-auth-badge" style={{ margin: '0 auto 1.5rem' }}>
            <ShieldAlert size={24} />
          </div>
          <h1 className="sv-auth-title">404: Vault Key Not Found</h1>
          <p className="sv-auth-subtitle" style={{ margin: '0 auto 2rem' }}>
            The requested location does not exist or has been securely relocated.
          </p>
          <Link to="/" className="sv-btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
            <ArrowLeft size={16} />
            <span>Return to Safety</span>
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}
