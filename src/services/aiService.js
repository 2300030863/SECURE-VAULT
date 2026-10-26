/**
 * DocQevrilo AI Assistant Service
 * API client to interact with backend Groq AI endpoints
 */

import { API_BASE_URL } from '../config/api';
import { authService } from './authService';

export const aiService = {
  /**
   * Check if Groq AI is enabled and configured
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
    return { enabled: false, provider: 'Groq Cloud', model: 'llama-3.3-70b-versatile' };
  },

  /**
   * Configure Groq API Key
   */
  async configureGroqKey(apiKey) {
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
      throw new Error(data.error || 'Failed to save Groq API Key.');
    }
    return data;
  },

  /**
   * Generate or fetch AI Document Summary
   * @param {number|string} docId - Document ID
   * @param {Object} options - { mode: 'detailed'|'quick'|'exam', access_code?: string }
   */
  async getDocumentSummary(docId, { mode = 'detailed', accessCode } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
    if (accessCode) {
      headers['X-Access-Code'] = accessCode;
    }

    const queryParam = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
    const response = await fetch(`${API_BASE_URL}/ai/documents/${docId}/summary${queryParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ mode, access_code: accessCode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate document summary.');
    }
    return data;
  },

  /**
   * Ask AI questions about the document
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
   * @param {Object} options - { topic: string, difficulty: 'easy'|'medium'|'hard', questionCount: number, accessCode?: string }
   */
  async generateQuiz(docId, { topic = 'All Topics', difficulty = 'medium', questionCount = 5, accessCode } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
    if (accessCode) {
      headers['X-Access-Code'] = accessCode;
    }

    const queryParam = accessCode ? `?code=${encodeURIComponent(accessCode)}` : '';
    const response = await fetch(`${API_BASE_URL}/ai/documents/${docId}/quiz${queryParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, difficulty, questionCount, access_code: accessCode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate quiz.');
    }
    return data;
  },
};
