/**
 * Secure Vault - Universal Frontend API Configuration
 * 
 * Automatically connects to the correct backend API from ANY frontend URL:
 * 1. Runtime Query / Storage Override:
 *    - Add ?backend=https://my-api.com/api or ?api_url=... to connect on the fly
 *    - Saves to localStorage automatically (use ?backend=reset to clear)
 * 2. Environment Variable:
 *    - Uses VITE_API_BASE_URL or VITE_API_URL if configured
 *    - If running on a live remote server but env points to localhost,
 *      safely falls back to the current server's origin (${window.location.origin}/api)
 * 3. Automatic Network / Host Detection:
 *    - On localhost/127.0.0.1 -> http://localhost:5000/api
 *    - On local LAN IP (e.g. 192.168.x.x, 10.x.x.x) -> http://<IP>:5000/api
 *    - On remote server/domain -> ${window.location.origin}/api
 */

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 1. Runtime URL parameter or localStorage override
    try {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('backend') || params.get('api_url') || params.get('api');
      if (queryParam) {
        if (queryParam === 'reset') {
          localStorage.removeItem('sv_custom_api_url');
        } else {
          const clean = queryParam.trim().replace(/\/+$/, '');
          localStorage.setItem('sv_custom_api_url', clean);
          return clean;
        }
      }

      const storedUrl = localStorage.getItem('sv_custom_api_url');
      if (storedUrl && storedUrl.trim()) {
        return storedUrl.trim().replace(/\/+$/, '');
      }

      // Injected runtime config (Docker/HTML script)
      if (window.__API_URL__) {
        return window.__API_URL__.replace(/\/+$/, '');
      }
    } catch (_) {
      // Ignore storage access errors in restricted iframe/browser modes
    }
  }

  // 2. Build-time environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanEnv = envUrl.trim().replace(/\/+$/, '');

    // Safety check: If deployed on a live domain but env mistakenly points to localhost,
    // don't try to connect to the client's local computer; use the live domain instead.
    if (typeof window !== 'undefined') {
      const isLocalHost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      const envPointsToLocal =
        cleanEnv.includes('localhost') || cleanEnv.includes('127.0.0.1');

      if (!isLocalHost && envPointsToLocal) {
        return 'https://secure-vault-backend-1.onrender.com/api';
      }
    }

    return cleanEnv;
  }

  // 3. Automatic Browser Host Detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // Local machine dev fallback
    if (isLocal) {
      return 'http://localhost:5000/api';
    }

    // Local LAN Wi-Fi testing (e.g. mobile accessing 192.168.x.x:5173)
    if (
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return `http://${hostname}:5000/api`;
    }

    // Production remote fallback (Vercel connecting to Render)
    return 'https://secure-vault-backend-1.onrender.com/api';
  }

  return 'https://secure-vault-backend-1.onrender.com/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Builds a unified, valid API URL for any path or endpoint.
 * Accepts relative endpoints ('/documents/upload') or absolute URLs.
 */
export const apiUrl = (endpoint = '') => {
  if (!endpoint) return getApiBaseUrl();

  // Return unchanged if already absolute (e.g. presigned S3/Backblaze B2 link)
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
