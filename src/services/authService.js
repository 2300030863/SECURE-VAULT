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
   * @param {Object} payload { fullName, email, password, occupation, securityPin, verificationProof }
   */
  async register({ fullName, email, password, occupation, securityPin, verificationProof }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password, occupation, securityPin, verificationProof }),
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Registration failed');
      error.requiresEmailVerification = data.requiresEmailVerification || false;
      error.requiresInlineEmailVerification = data.requiresInlineEmailVerification || false;
      error.email = data.email || email;
      error.devOtp = data.devOtp;
      throw error;
    }

    if (data.token) {
      authToken = data.token;
      sessionStorage.setItem('sv_token', data.token);
    }

    return {
      success: true,
      message: data.message || 'Account created successfully!',
      requiresEmailVerification: data.requiresEmailVerification,
      email: data.email || email,
      token: data.token,
      warning: data.warning,
      devOtp: data.devOtp,
      user: data.user,
    };
  },

  /**
   * Send inline registration email verification OTP code
   */
  async sendEmailOtp(email) {
    const response = await fetch(`${API_BASE_URL}/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || 'Failed to send verification code.');
      err.locked = Boolean(data.locked);
      err.minutesRemaining = data.minutesRemaining;
      err.attemptsRemaining = data.attemptsRemaining;
      throw err;
    }
    return data;
  },

  /**
   * Verify inline registration email OTP code and obtain verificationProof
   */
  async verifyEmailOtp(email, otp) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Invalid or expired verification code.');
    }
    return data;
  },

  /**
   * Verify an unverified user's email with a 6-digit OTP code
   */
  async verifyEmail(email, otp) {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Email verification failed.');
    return data;
  },

  /**
   * Resend a fresh 6-digit OTP verification code to user's email
   */
  async resendVerificationEmail(email) {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to resend verification code.');
    return data;
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
      const error = new Error(data.error || 'Invalid email or password');
      error.requiresEmailVerification = data.requiresEmailVerification || false;
      error.email = data.email || email;
      throw error;
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
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Retrieve active authentication JWT token string
   */
  getToken() {
    return authToken || sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token') || null;
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
      const err = new Error(data.message || 'Request failed.');
      err.locked = Boolean(data.locked);
      err.minutesRemaining = data.minutesRemaining;
      err.attemptsRemaining = data.attemptsRemaining;
      throw err;
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

  /**
   * Update user profile details & 4-digit Security PIN
   */
  async updateProfile({ fullName, occupation, newPin, currentPin, currentPassword, pinRecoveryOtp }) {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ fullName, occupation, newPin, currentPin, currentPassword, pinRecoveryOtp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update profile.');
    }

    return data;
  },

  async requestPinRecoveryOtp() {
    const response = await fetch(`${API_BASE_URL}/auth/request-pin-recovery`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      const err = new Error(data.error || 'Unable to send PIN recovery code.');
      err.locked = Boolean(data.locked);
      err.minutesRemaining = data.minutesRemaining;
      err.attemptsRemaining = data.attemptsRemaining;
      throw err;
    }
    return data;
  },

  async getPinRecoveryStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/pin-recovery-status`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (_) {}
    return { locked: false, attemptsRemaining: 3 };
  },

  /**
   * Request a 6-digit verification OTP sent to user's registered email
   */
  async requestCodeOtp(docId, action = 'reveal') {
    const response = await fetch(`${API_BASE_URL}/documents/request-code-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ docId, action }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP.');
    }

    return data;
  },

  /**
   * Verify Password + (PIN or OTP) and reveal the document's access code
   */
  async verifyAndRevealCode(docId, { password, method, pin, otp }) {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/verify-and-reveal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ password, method, pin, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Verification failed.');
    }

    return data;
  },

  /**
   * Verify Password + (PIN or OTP) and regenerate a new access code
   */
  async regenerateAccessCode(docId, { password, method, pin, otp }) {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/regenerate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ password, method, pin, otp }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to regenerate code.');
    }

    return data;
  },
};
