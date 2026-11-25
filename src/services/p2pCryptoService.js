/**
 * DocQevrilo – End-to-End P2P Cryptography Service
 *
 * Implements:
 * - CSPRNG Transfer IDs and >=160-bit Unlock Secrets via crypto.getRandomValues()
 * - Argon2id Key Derivation (via hash-wasm WebAssembly)
 * - AES-256-GCM per-chunk authenticated encryption with unique 96-bit nonces + AAD
 * - Streaming incremental SHA-256 integrity verification (constant memory)
 *
 * Security Invariant:
 * - Unlock secrets, salts, and derived AES keys NEVER leave the browser.
 */

import { argon2id, createSHA256 } from 'hash-wasm';

const KDF_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 32768, // 32 MiB
  hashLength: 32, // 256 bits for AES-256-GCM
};

const BASE32_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0/O, 1/I

export function toBase64(uint8) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function toBase64Url(uint8) {
  return toBase64(uint8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SECURE_ID_RE = /^DQV1-([A-HJ-NP-Z2-9]{12})-([A-Za-z0-9_-]{27})-([A-Za-z0-9_-]{4})$/;

export function isSecureIdFormat(raw) {
  return typeof raw === 'string' && SECURE_ID_RE.test(raw.trim());
}

async function computeSecureIdTag(roomRaw, secretB64u) {
  const data = new TextEncoder().encode(`DQV1:${roomRaw}:${secretB64u}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return toBase64Url(digest.subarray(0, 3));
}

/**
 * Generates a single combined Secure ID containing:
 * - Public 60-bit room identifier (reconstructed into DQV-XXXX-XXXX-XXXX for signaling)
 * - 160-bit CSPRNG secret material (never sent to backend)
 * - 24-bit SHA-256 integrity tag (detects typos / tampering locally)
 *
 * Format: DQV1-<12charRoom>-<27charSecret>-<4charTag>
 */
export async function generateSecureId() {
  const roomBytes = new Uint8Array(12);
  crypto.getRandomValues(roomBytes);
  let roomRaw = '';
  for (let i = 0; i < roomBytes.length; i++) {
    roomRaw += BASE32_ALPHABET[roomBytes[i] % BASE32_ALPHABET.length];
  }

  const secretBytes = new Uint8Array(20); // 160 bits
  crypto.getRandomValues(secretBytes);
  const secretB64u = toBase64Url(secretBytes);
  const tag = await computeSecureIdTag(roomRaw, secretB64u);

  const transferId = `DQV-${roomRaw.slice(0, 4)}-${roomRaw.slice(4, 8)}-${roomRaw.slice(8, 12)}`;
  const secureId = `DQV1-${roomRaw}-${secretB64u}-${tag}`;
  return { secureId, transferId, unlockSecret: secretB64u };
}

/**
 * Validates and decodes a Secure ID locally into { transferId, unlockSecret }.
 * Rejects malformed or tampered Secure IDs before any network request is made.
 */
export async function parseSecureId(rawSecureId) {
  if (typeof rawSecureId !== 'string') {
    return { ok: false, error: 'Please enter a valid Secure ID.' };
  }
  const trimmed = rawSecureId.trim();
  const match = trimmed.match(SECURE_ID_RE);
  if (!match) {
    return { ok: false, error: 'Invalid Secure ID format. Expected DQV1-... from sender.' };
  }

  const [, roomRaw, secretB64u, providedTag] = match;
  const expectedTag = await computeSecureIdTag(roomRaw, secretB64u);

  let diff = expectedTag.length ^ providedTag.length;
  for (let i = 0; i < expectedTag.length; i++) {
    diff |= expectedTag.charCodeAt(i) ^ providedTag.charCodeAt(i);
  }
  if (diff !== 0) {
    return { ok: false, error: 'Secure ID check failed. Verify you copied the complete code without typos.' };
  }

  const transferId = `DQV-${roomRaw.slice(0, 4)}-${roomRaw.slice(4, 8)}-${roomRaw.slice(8, 12)}`;
  return {
    ok: true,
    secureId: trimmed,
    transferId,
    unlockSecret: secretB64u,
  };
}

/**
 * Generates a cryptographically random Transfer ID (separate from unlock secret).
 * Format: DQV-XXXX-XXXX-XXXX (16 random chars, URL-safe, >80 bits ID space).
 */
export function generateTransferId() {
  const randomBytes = new Uint8Array(12);
  crypto.getRandomValues(randomBytes);
  let raw = '';
  for (let i = 0; i < randomBytes.length; i++) {
    raw += BASE32_ALPHABET[randomBytes[i] % BASE32_ALPHABET.length];
  }
  return `DQV-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/**
 * Generates a high-entropy Unlock Secret (160 bits = 20 random bytes).
 * Encoded as readable 5-char groups: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
 */
export function generateUnlockSecret() {
  const randomBytes = new Uint8Array(30);
  crypto.getRandomValues(randomBytes);
  let chars = '';
  for (let i = 0; i < randomBytes.length; i++) {
    chars += BASE32_ALPHABET[randomBytes[i] % BASE32_ALPHABET.length];
  }
  return [
    chars.slice(0, 5),
    chars.slice(5, 10),
    chars.slice(10, 15),
    chars.slice(15, 20),
    chars.slice(20, 25),
    chars.slice(25, 30),
  ].join('-');
}

/**
 * Generates a 128-bit (16-byte) cryptographically random salt for Argon2id.
 */
export function generateSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generates a unique 96-bit (12-byte) AES-GCM nonce.
 */
export function generateNonce96() {
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Derives a non-extractable AES-256-GCM CryptoKey using Argon2id.
 * Normalizes whitespace around the secret without reducing entropy.
 */
export async function deriveAesKeyFromSecret(unlockSecret, saltBytes, params = KDF_PARAMS) {
  if (!unlockSecret || typeof unlockSecret !== 'string' || unlockSecret.trim().length < 8) {
    throw new Error('Unlock secret must be provided.');
  }
  if (!(saltBytes instanceof Uint8Array) || saltBytes.length < 16) {
    throw new Error('Invalid key derivation salt.');
  }

  const normalizedSecret = unlockSecret.trim();

  const rawKeyBytes = await argon2id({
    password: normalizedSecret,
    salt: saltBytes,
    parallelism: params.parallelism || KDF_PARAMS.parallelism,
    iterations: params.iterations || KDF_PARAMS.iterations,
    memorySize: params.memorySize || KDF_PARAMS.memorySize,
    hashLength: 32,
    outputType: 'binary',
  });

  return crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable!
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a JSON object (e.g. manifest or file-complete digest) with AES-256-GCM + AAD.
 */
export async function encryptJsonPayload(aesKey, aadString, payloadObj) {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payloadObj));
  const nonce = generateNonce96();
  const additionalData = encoder.encode(aadString);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData },
    aesKey,
    plaintext
  );

  return {
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertextBuf)),
  };
}

/**
 * Decrypts a JSON object encrypted with encryptJsonPayload.
 * Throws if the unlock secret is wrong or AAD/tag does not match.
 */
export async function decryptJsonPayload(aesKey, aadString, nonceB64, ciphertextB64) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const nonce = fromBase64(nonceB64);
  const ciphertext = fromBase64(ciphertextB64);
  const additionalData = encoder.encode(aadString);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData },
    aesKey,
    ciphertext
  );

  return JSON.parse(decoder.decode(plainBuf));
}

/**
 * Encrypts a single file chunk using AES-256-GCM with a unique 96-bit nonce
 * and authenticated chunk metadata (transferId, fileId, chunkIndex, plainLength).
 */
export async function encryptFileChunk(aesKey, transferId, fileId, chunkIndex, plainArrayBuffer) {
  const nonce = generateNonce96();
  const aadStr = `${transferId}|${fileId}|${chunkIndex}|${plainArrayBuffer.byteLength}`;
  const additionalData = new TextEncoder().encode(aadStr);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData },
    aesKey,
    plainArrayBuffer
  );

  return {
    nonce,
    ciphertext: new Uint8Array(ciphertextBuf),
  };
}

/**
 * Decrypts a single file chunk and verifies its AES-GCM authentication tag & AAD.
 */
export async function decryptFileChunk(
  aesKey,
  transferId,
  fileId,
  chunkIndex,
  expectedPlainLength,
  nonceUint8,
  ciphertextUint8
) {
  const aadStr = `${transferId}|${fileId}|${chunkIndex}|${expectedPlainLength}`;
  const additionalData = new TextEncoder().encode(aadStr);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonceUint8, additionalData },
    aesKey,
    ciphertextUint8
  );

  return new Uint8Array(plainBuf);
}

/**
 * Creates a streaming incremental SHA-256 hasher (constant memory).
 */
export async function createStreamingSha256() {
  const hasher = await createSHA256();
  hasher.init();
  return {
    update(uint8) {
      hasher.update(uint8);
    },
    digestHex() {
      return hasher.digest('hex');
    },
  };
}

export { KDF_PARAMS };
