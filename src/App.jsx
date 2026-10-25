import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import CSS Design System
import './styles/global.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/welcome.css';

// Import Shared Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BrandMeaningModal from './components/BrandMeaningModal';

// Import Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VaultDashboard from './pages/VaultDashboard';
import NotFound from './pages/NotFound';

// Import Auth Service
import { authService } from './services/authService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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
        />

        <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route
              path="/login"
              element={<Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/vault" element={<VaultDashboard currentUser={currentUser} />} />
            <Route path="/dashboard" element={<Navigate to="/vault" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
        <BrandMeaningModal />
      </div>
    </Router>
  );
}
