/**
 * DocQevrilo – Strict QR Code Payload Parser & Validator
 *
 * Extracts only expected Secure IDs, unlock codes, Transfer IDs, or approved DocQevrilo share URLs.
 * Never executes QR-provided content or accepts arbitrary external URLs.
 */

const SECURE_ID_RE = /^DQV1-[A-HJ-NP-Z2-9]{12}-[A-Za-z0-9_-]{27}-[A-Za-z0-9_-]{4}$/;
const TRANSFER_ID_RE = /^DQV-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,3}$/i;
const VAULT_OR_LIVE_CODE_RE = /^[A-Za-z0-9@$!_-]{4,32}$/;
const UNLOCK_SECRET_RE = /^[A-Za-z0-9_-]{8,128}$/;

const APPROVED_PATH_PREFIXES = ['/vault', '/p2p-share', '/secure-p2p', '/online-share'];

function isApprovedOrigin(urlObj, currentOrigin) {
  if (currentOrigin && urlObj.origin === currentOrigin) return true;
  const host = urlObj.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host === 'secure-vault-delta-virid.vercel.app' || host.endsWith('.docqevrilo.com')) {
    return urlObj.protocol === 'https:';
  }
  return false;
}

export function extractSecureIdFromHash(hashStr) {
  if (typeof hashStr !== 'string' || !hashStr) return '';
  const cleanHash = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
  const params = new URLSearchParams(cleanHash);
  const candidate = (params.get('id') || params.get('secureId') || '').trim();
  return SECURE_ID_RE.test(candidate) ? candidate : '';
}

export function parseDocQevriloQrPayload(rawValue, currentOrigin = typeof window !== 'undefined' ? window.location.origin : '') {
  if (typeof rawValue !== 'string') {
    return { ok: false, error: 'Unrecognized QR code format.' };
  }

  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.length > 512) {
    return { ok: false, error: 'QR code is empty or exceeds maximum allowed length.' };
  }

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { ok: false, error: 'Blocked unsafe QR code scheme.' };
  }

  // 1. Direct Unified Secure ID (DQV1-...)
  if (SECURE_ID_RE.test(trimmed)) {
    return {
      ok: true,
      code: trimmed,
      secureId: trimmed,
      unlockSecret: null,
      isP2P: true,
      isSecureId: true,
      format: 'direct-secure-id',
    };
  }

  // 2. Legacy DocQevrilo Secure P2P JSON payload: { transferId, unlockSecret? }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const tid = typeof parsed?.transferId === 'string' ? parsed.transferId.trim().toUpperCase() : '';
      const secret = typeof parsed?.unlockSecret === 'string' ? parsed.unlockSecret.trim() : '';
      if (!TRANSFER_ID_RE.test(tid)) {
        return { ok: false, error: 'QR JSON does not contain a valid DocQevrilo Transfer ID.' };
      }
      if (secret && !UNLOCK_SECRET_RE.test(secret)) {
        return { ok: false, error: 'QR JSON contains an invalid unlock secret format.' };
      }
      return {
        ok: true,
        code: tid,
        unlockSecret: secret || null,
        isP2P: true,
        isSecureId: false,
        format: 'p2p-json',
      };
    } catch {
      return { ok: false, error: 'Malformed JSON in QR code.' };
    }
  }

  // 3. Approved DocQevrilo Share URL (e.g., https://.../p2p-share#id=DQV1-... or /vault?code=ABC123)
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    try {
      const urlObj = new URL(trimmed, currentOrigin || 'https://localhost');
      if (!isApprovedOrigin(urlObj, currentOrigin)) {
        return { ok: false, error: 'QR URL is not from an approved DocQevrilo domain.' };
      }
      const pathOk = APPROVED_PATH_PREFIXES.some((p) => urlObj.pathname === p || urlObj.pathname.startsWith(`${p}/`));
      if (!pathOk) {
        return { ok: false, error: 'QR URL does not point to a valid DocQevrilo unlock route.' };
      }

      // Check URL hash fragment first (#id=DQV1-...) — never sent to backend
      const hashSecureId = extractSecureIdFromHash(urlObj.hash);
      if (hashSecureId) {
        return {
          ok: true,
          code: hashSecureId,
          secureId: hashSecureId,
          unlockSecret: null,
          isP2P: true,
          isSecureId: true,
          format: 'url-secure-id-hash',
        };
      }

      const extracted = (
        urlObj.searchParams.get('id') ||
        urlObj.searchParams.get('code') ||
        urlObj.searchParams.get('c') ||
        urlObj.searchParams.get('transferId') ||
        ''
      ).trim();

      if (!extracted) {
        return { ok: false, error: 'QR URL does not contain a Secure ID or unlock code.' };
      }
      if (SECURE_ID_RE.test(extracted)) {
        return {
          ok: true,
          code: extracted,
          secureId: extracted,
          unlockSecret: null,
          isP2P: true,
          isSecureId: true,
          format: 'url-secure-id',
        };
      }
      if (TRANSFER_ID_RE.test(extracted)) {
        return { ok: true, code: extracted.toUpperCase(), unlockSecret: null, isP2P: true, isSecureId: false, format: 'url-p2p' };
      }
      if (VAULT_OR_LIVE_CODE_RE.test(extracted)) {
        return { ok: true, code: extracted, unlockSecret: null, isP2P: false, isSecureId: false, format: 'url-vault' };
      }
      return { ok: false, error: 'Extracted code from QR URL has an invalid format.' };
    } catch {
      return { ok: false, error: 'Invalid URL format in QR code.' };
    }
  }

  // 4. Direct Legacy Transfer ID (DQV-XXXX-XXXX-XXXX)
  if (TRANSFER_ID_RE.test(trimmed)) {
    return {
      ok: true,
      code: trimmed.toUpperCase(),
      unlockSecret: null,
      isP2P: true,
      isSecureId: false,
      format: 'direct-p2p',
    };
  }

  // 5. Direct Vault / Live Share access code (e.g., 6-char live code or 10-char vault code)
  if (VAULT_OR_LIVE_CODE_RE.test(trimmed)) {
    return {
      ok: true,
      code: trimmed,
      unlockSecret: null,
      isP2P: false,
      isSecureId: false,
      format: 'direct-vault',
    };
  }

  return { ok: false, error: 'QR code does not contain a valid DocQevrilo Secure ID or unlock code.' };
}
