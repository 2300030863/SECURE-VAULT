/**
 * DocQevrilo AI Assistant Service
 * API client to interact with backend Google Gemini AI endpoints
 */

import { API_BASE_URL } from '../config/api';
import { authService } from './authService';

export const aiService = {
  /**
   * Check if Google Gemini AI is enabled and configured
   */
  async getAiStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/status`, {
        method: 'GET',
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (_) {}
    return {
      enabled: false,
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      fallbackModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    };
  },

  /**
   * Configure Google Gemini API Key
   */
  async configureGeminiKey(apiKey) {
    const response = await fetch(`${API_BASE_URL}/ai/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
      body: JSON.stringify({ apiKey }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save Gemini API Key.');
    }
    return data;
  },

  /**
   * Generate or fetch AI Document Summary with Exact Bullet Count & Complete PDF Coverage
   * @param {number|string} docId - Document ID
   * @param {Object} options - { mode: 'simple_learning'|'quick_revision'|'exam_prep'|'detailed', bulletCount?: number, accessCode?: string, refresh?: boolean }
   */
  async getDocumentSummary(docId, { mode = 'simple_learning', bulletCount = 80, accessCode, refresh = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
    if (accessCode) {
      headers['X-Access-Code'] = accessCode;
    }

    const queryParts = [];
    if (accessCode) queryParts.push(`code=${encodeURIComponent(accessCode)}`);
    if (refresh) queryParts.push('refresh=true');
    if (bulletCount) queryParts.push(`bullets=${bulletCount}`);
    const queryParam = queryParts.length ? `?${queryParts.join('&')}` : '';

    const response = await fetch(`${API_BASE_URL}/ai/documents/${docId}/summary${queryParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode, bulletCount, access_code: accessCode, refresh }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate document summary.');
    }
    return data;
  },

  /**
   * Ask AI grounded questions about the document with citations
   * @param {number|string} docId - Document ID
   * @param {Object} options - { question: string, history: Array, accessCode?: string }
   */
  async askQuestion(docId, { question, history = [], accessCode } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
    if (accessCode) {
      headers['X-Access-Code'] = accessCode;
    }

    const queryParam = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
    const response = await fetch(`${API_BASE_URL}/ai/documents/${docId}/chat${queryParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, history, access_code: accessCode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to answer question.');
    }
    return data;
  },

  /**
   * Generate customizable AI Quiz
   * @param {number|string} docId - Document ID
   * @param {Object} options - { topic: string, difficulty: 'easy'|'medium'|'hard', questionCount: number, accessCode?: string, refresh?: boolean }
   */
  async generateQuiz(docId, { topic = 'All Topics', difficulty = 'medium', questionCount = 5, accessCode, refresh = false } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
    if (accessCode) {
      headers['X-Access-Code'] = accessCode;
    }

    const queryParts = [];
    if (accessCode) queryParts.push(`code=${encodeURIComponent(accessCode)}`);
    if (refresh) queryParts.push('refresh=true');
    const queryParam = queryParts.length ? `?${queryParts.join('&')}` : '';

    const response = await fetch(`${API_BASE_URL}/ai/documents/${docId}/quiz${queryParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, difficulty, questionCount, access_code: accessCode, refresh }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate quiz.');
    }
    return data;
  },
};
