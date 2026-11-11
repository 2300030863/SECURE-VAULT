import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Import CSS Design System
import './styles/global.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/welcome.css';
import './styles/dashboard.css';

// Import Shared Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BrandMeaningModal from './components/BrandMeaningModal';
import StatusCodeProtocolModal from './components/StatusCodeProtocolModal';

// Import Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VaultDashboard from './pages/VaultDashboard';
import OnlineShare from './pages/OnlineShare';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Import Auth Service & API Configuration
import { authService } from './services/authService';
import { API_BASE_URL } from './config/api';

function AppFooter({ currentUser }) {
  const location = useLocation();
  const isVaultOrAdmin =
    location.pathname.startsWith('/vault') ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/dashboard';

  if (isVaultOrAdmin) return null;
  return <Footer currentUser={currentUser} />;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [platformAnnouncement, setPlatformAnnouncement] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (_) {
        setCurrentUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    }
    checkAuth();

    // Check for active broadcast announcement banner
    fetch(`${API_BASE_URL}/announcement`)
      .then((r) => r.json())
      .then((data) => {
        const ann = data?.announcement || data;
        if (ann?.active && ann?.message) {
          setPlatformAnnouncement(ann);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  return (
    <Router>
      {/* Dynamic Obsidian & Crimson Ambient Atmosphere */}
      <div className="app-atmosphere" aria-hidden="true">
        <div className="ambient-orb ambient-orb-top" />
        <div className="ambient-orb ambient-orb-right" />
        <div className="ambient-grid" />
      </div>

      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Navbar
          isAuthenticated={Boolean(currentUser)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onProfileUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />

        {platformAnnouncement?.active && (
          <div
            style={{
              width: "100%",
              padding: "10px 16px",
              background:
                platformAnnouncement.type === "critical"
                  ? "linear-gradient(90deg, #b91c1c, #e50936, #b91c1c)"
                  : platformAnnouncement.type === "warning"
                  ? "linear-gradient(90deg, #92400e, #d97706, #92400e)"
                  : "linear-gradient(90deg, #1e3a8a, #2563eb, #1e3a8a)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              textAlign: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
              zIndex: 50,
              boxSizing: "border-box",
            }}
          >
            <span>📢 {platformAnnouncement.message}</span>
            <button
              onClick={() => setPlatformAnnouncement(null)}
              style={{
                background: "transparent",
                border: 0,
                color: "#fff",
                cursor: "pointer",
                fontSize: "15px",
                marginLeft: "8px",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
              title="Dismiss announcement"
              aria-label="Dismiss announcement"
            >
              ✕
            </button>
          </div>
        )}

        <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Welcome currentUser={currentUser} />} />
            <Route
              path="/login"
              element={<Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminDashboard
                  currentUser={currentUser}
                  onAdminLoaded={(u) => setCurrentUser(u)}
                />
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vault" element={<VaultDashboard currentUser={currentUser} />} />
            <Route path="/online-share" element={<OnlineShare currentUser={currentUser} />} />
            <Route path="/live-share" element={<OnlineShare currentUser={currentUser} />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/dashboard" element={<Navigate to="/vault" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Global Footer (rendered across all public pages, hidden on dashboard) */}
        <AppFooter currentUser={currentUser} />
        <BrandMeaningModal />
        <StatusCodeProtocolModal />
      </div>
    </Router>
  );
}
