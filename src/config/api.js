/**
 * Secure Vault - Frontend API Configuration
 * 
 * Automatically selects the correct backend API URL:
 * 1. If VITE_API_BASE_URL or VITE_API_URL is provided in environment, use it.
 * 2. If running locally on localhost/127.0.0.1, use "http://localhost:5000/api".
 * 3. If running on a remote server/domain without an env variable, automatically
 *    use the server origin (`${window.location.origin}/api` or `/api`).
 */

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Automatic browser environment detection:
  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // Local system fallback
    if (isLocal) {
      return 'http://localhost:5000/api';
    }

    // Remote server fallback (same host)
    if (window.location.origin) {
      return `${window.location.origin}/api`;
    }
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper to build unified API URLs from any endpoint.
 * Accepts '/api/status', '/documents/mine', or absolute URLs.
 */
export const apiUrl = (endpoint = '') => {
  if (!endpoint) return API_BASE_URL;

  // Preserve absolute links (e.g. presigned S3/Backblaze B2 URLs or blobs)
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://') || endpoint.startsWith('blob:')) {
    return endpoint;
  }

  const base = getApiBaseUrl();

  let cleanEndpoint = endpoint;
  if (cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4);
  } else if (cleanEndpoint === '/api') {
    cleanEndpoint = '';
  }

  if (cleanEndpoint && !cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  return `${base}${cleanEndpoint}`;
};

export default API_BASE_URL;
