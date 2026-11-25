/**
 * DocQevrilo – Strict QR Code Payload Parser & Validator
 *
 * Extracts only expected unlock codes, Transfer IDs, or approved DocQevrilo share URLs.
 * Never executes QR-provided content or accepts arbitrary external URLs.
 */

const TRANSFER_ID_RE = /^DQV-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,3}$/i;
const VAULT_OR_LIVE_CODE_RE = /^[A-Za-z0-9]{4,32}$/;
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

export function parseDocQevriloQrPayload(rawValue, currentOrigin = typeof window !== 'undefined' ? window.location.origin : '') {
  if (typeof rawValue !== 'string') {
    return { ok: false, error: 'Unrecognized QR code format.' };
  }

  const trimmed = rawValue.trim();
  if (!trimmed || trimmed.length > 512) {
    return { ok: false, error: 'QR code is empty or exceeds maximum allowed length.' };
  }

  // Reject dangerous schemes immediately
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { ok: false, error: 'Blocked unsafe QR code scheme.' };
  }

  // 1. Legacy DocQevrilo Secure P2P JSON payload: { transferId, unlockSecret? }
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
        format: 'p2p-json',
      };
    } catch {
      return { ok: false, error: 'Malformed JSON in QR code.' };
    }
  }

  // 2. Approved DocQevrilo Share URL (e.g., https://.../vault?code=DQV-... or /vault?code=ABC123)
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
      const extracted = (
        urlObj.searchParams.get('code') ||
        urlObj.searchParams.get('c') ||
        urlObj.searchParams.get('transferId') ||
        ''
      ).trim();

      if (!extracted) {
        return { ok: false, error: 'QR URL does not contain an unlock code or Transfer ID.' };
      }
      if (TRANSFER_ID_RE.test(extracted)) {
        return { ok: true, code: extracted.toUpperCase(), unlockSecret: null, isP2P: true, format: 'url-p2p' };
      }
      if (VAULT_OR_LIVE_CODE_RE.test(extracted)) {
        return { ok: true, code: extracted, unlockSecret: null, isP2P: false, format: 'url-vault' };
      }
      return { ok: false, error: 'Extracted code from QR URL has an invalid format.' };
    } catch {
      return { ok: false, error: 'Invalid URL format in QR code.' };
    }
  }

  // 3. Direct Transfer ID (DQV-XXXX-XXXX-XXXX)
  if (TRANSFER_ID_RE.test(trimmed)) {
    return {
      ok: true,
      code: trimmed.toUpperCase(),
      unlockSecret: null,
      isP2P: true,
      format: 'direct-p2p',
    };
  }

  // 4. Direct Vault / Live Share access code (e.g., 6-char live code or 10-char vault code)
  if (VAULT_OR_LIVE_CODE_RE.test(trimmed)) {
    return {
      ok: true,
      code: trimmed,
      unlockSecret: null,
      isP2P: false,
      format: 'direct-vault',
    };
  }

  return { ok: false, error: 'QR code does not contain a valid DocQevrilo unlock code or Transfer ID.' };
}
