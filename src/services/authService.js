/**
 * Secure Vault - Authentication Service
 * 
 * Connected to Node.js backend with TiDB Cloud persistence.
 * - Password hashing handled securely on backend via bcrypt.
 * - JWT token used for secure session authorization.
 */

import { API_BASE_URL } from '../config/api';

// Memory cache for active token
let authToken = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token') || null;

export const authService = {
  /**
   * Register a new user in TiDB Cloud
   * @param {Object} payload { fullName, email, password }
   */
  async register({ fullName, email, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return {
      success: true,
      message: data.message || 'Account created successfully!',
      user: data.user,
    };
  },

  /**
   * Log in an existing user with TiDB verification
   * @param {Object} payload { email, password, rememberMe }
   */
  async login({ email, password, rememberMe = false }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Invalid email or password');
    }

    // Store JWT token safely
    authToken = data.token;
    if (rememberMe) {
      localStorage.setItem('sv_token', data.token);
      localStorage.setItem('sv_user_email_hint', email);
    } else {
      sessionStorage.setItem('sv_token', data.token);
      localStorage.removeItem('sv_token');
    }

    return {
      success: true,
      user: data.user,
    };
  },

  /**
   * Log out the current user and destroy session
   */
  async logout() {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    } finally {
      authToken = null;
      sessionStorage.removeItem('sv_token');
      localStorage.removeItem('sv_token');
    }
    return { success: true };
  },

  /**
   * Get the current authenticated user from TiDB
   */
  async getCurrentUser() {
    const token = authToken || sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Retrieve active authentication headers
   */
  getAuthHeaders() {
    const token = authToken || sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Send password reset request
   * @param {string} email
   */
  async forgotPassword(email) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed.');
    }

    return {
      success: true,
      message: data.message || 'If an account exists for that email, a 6-digit OTP code has been sent.',
      email: data.email,
    };
  },

  /**
   * Reset user password using token OR (email + 6-digit OTP)
   * @param {Object} payload { token, email, otp, password }
   */
  async resetPassword({ token, email, otp, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email, otp, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed.');
    }

    return {
      success: true,
      message: data.message || 'Password reset successfully. You can now log in.',
    };
  },

  /**
   * Helper to retrieve remembered email hint
   */
  getSavedEmailHint() {
    try {
      return localStorage.getItem('sv_user_email_hint') || '';
    } catch (_) {
      return '';
    }
  },
};
