/**
 * DocQevrilo – Socket.IO + WebRTC E2EE P2P Transfer Engine
 *
 * Handles:
 * - Ephemeral Socket.IO signaling (p2p:* events)
 * - Multi-recipient independent RTCPeerConnections & ordered RTCDataChannels
 * - Backpressure-controlled 24 KB AES-256-GCM encrypted chunk streaming
 * - Pause/Resume, Manual Stop Sharing, Server-Authoritative Expiration, One-Time Access
 * - Zero file bytes, zero unlock secrets, and zero AES keys sent to backend
 */

import { io } from 'socket.io-client';
import { getApiBaseUrl } from '../config/api';
import { authService } from './authService';
import {
  KDF_PARAMS,
  generateSecureId,
  parseSecureId,
  isSecureIdFormat,
  generateSalt,
  deriveAesKeyFromSecret,
  encryptJsonPayload,
  decryptJsonPayload,
  encryptFileChunk,
  decryptFileChunk,
  createStreamingSha256,
  toBase64,
  fromBase64,
} from './p2pCryptoService';

const CHUNK_SIZE = 24 * 1024; // 24 KB conservative encrypted frame size
const BUFFERED_LOW_THRESHOLD = 256 * 1024; // 256 KB
const MAX_BUFFERED_AMOUNT = 512 * 1024; // 512 KB

function getSocketServerUrl() {
  const apiBase = getApiBaseUrl();
  // Strip trailing /api if present to get root origin for Socket.IO
  return apiBase.replace(/\/api\/?$/i, '');
}

function encodeBinaryChunkFrame(headerObj, ciphertextUint8) {
  const headerBytes = new TextEncoder().encode(JSON.stringify(headerObj));
  const frame = new Uint8Array(4 + headerBytes.length + ciphertextUint8.length);
  const view = new DataView(frame.buffer);
  view.setUint32(0, headerBytes.length, false); // big-endian
  frame.set(headerBytes, 4);
  frame.set(ciphertextUint8, 4 + headerBytes.length);
  return frame.buffer;
}

function decodeBinaryChunkFrame(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 4) {
    throw new Error('Malformed binary chunk frame');
  }
  const headerLen = view.getUint32(0, false);
  if (headerLen <= 0 || 4 + headerLen > arrayBuffer.byteLength) {
    throw new Error('Invalid chunk header length');
  }
  const headerBytes = new Uint8Array(arrayBuffer, 4, headerLen);
  const header = JSON.parse(new TextDecoder().decode(headerBytes));
  const ciphertext = new Uint8Array(arrayBuffer, 4 + headerLen);
  return { header, ciphertext };
}

export class P2PSenderSession {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.socket = null;
    this.transferId = null;
    this.unlockSecret = null;
    this.salt = null;
    this.aesKey = null;
    this.files = []; // File[]
    this.fileManifestEntries = [];
    this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.peers = new Map(); // recipientId -> PeerContext
    this.status = 'IDLE';
    this.expiresAt = null;
    this.aborted = false;
  }

  _emitState(patch) {
    if (patch.status) this.status = patch.status;
    this.callbacks.onStateChange?.(patch);
  }

  async startSession({ files, durationSeconds, maxRecipients, oneTimeAccess }) {
    if (!files || files.length === 0) {
      throw new Error('Please select at least one file to share.');
    }

    this.files = Array.from(files);
    const { secureId, transferId, unlockSecret } = await generateSecureId();
    this.secureId = secureId;
    this.transferId = transferId;
    this.unlockSecret = unlockSecret;
    this.salt = generateSalt();
    this.aborted = false;

    this._emitState({
      status: 'DERIVING_KEY',
      secureId: this.secureId,
      transferId: this.transferId,
      unlockSecret: this.unlockSecret,
    });

    // Derive AES-256-GCM key locally via Argon2id (never leaves browser)
    this.aesKey = await deriveAesKeyFromSecret(this.unlockSecret, this.salt, KDF_PARAMS);

    // Prepare manifest metadata (does NOT read file contents into memory)
    this.fileManifestEntries = this.files.map((f, idx) => ({
      fileId: `f_${idx}_${f.size}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      chunkSize: CHUNK_SIZE,
      chunkCount: Math.max(1, Math.ceil(f.size / CHUNK_SIZE)),
    }));

    const totalSize = this.files.reduce((acc, f) => acc + f.size, 0);

    // Connect Socket.IO signaling
    const socketUrl = getSocketServerUrl();
    const token = authService.getToken();
    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this._bindSocketEvents();

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Signaling server connection timeout.')), 12000);

      this.socket.once('connect', () => {
        this.socket.emit(
          'p2p:create-session',
          {
            transferId: this.transferId,
            durationSeconds,
            maxRecipients,
            oneTimeAccess,
            fileCount: this.files.length,
            totalSize,
          },
          (res) => {
            clearTimeout(timeout);
            if (!res || !res.ok) {
              reject(new Error(res?.error || 'Failed to create P2P session.'));
              return;
            }
            this.expiresAt = res.expiresAt;
            this.iceServers = res.iceServers || this.iceServers;
            this._emitState({
              status: res.status || 'WAITING_FOR_RECIPIENT',
              secureId: this.secureId,
              transferId: this.transferId,
              unlockSecret: this.unlockSecret,
              expiresAt: res.expiresAt,
              remainingSeconds: res.remainingSeconds,
              maxRecipients: res.maxRecipients,
              oneTimeAccess: res.oneTimeAccess,
            });
            resolve(res);
          }
        );
      });

      this.socket.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Signaling connection failed: ${err.message}`));
      });
    });

    return {
      secureId: this.secureId,
      transferId: this.transferId,
      unlockSecret: this.unlockSecret,
      expiresAt: this.expiresAt,
    };
  }

  _bindSocketEvents() {
    this.socket.on('p2p:recipient-joined', (data) => {
      this._emitState({
        recipientCount: data.recipientCount,
        recipients: data.recipients || [],
        status: data.status || this.status,
      });
      if (data.recipientId) {
        this.callbacks.onNotification?.({
          type: 'info',
          message: `Recipient ${data.recipientId.slice(0, 10)} joined and is waiting for your approval.`,
        });
      }
    });

    this.socket.on('p2p:access-requested', (data) => {
      this._emitState({ status: 'WAITING_FOR_APPROVAL' });
      this.callbacks.onAccessRequested?.(data);
    });

    this.socket.on('p2p:webrtc-answer', async ({ recipientId, sdp }) => {
      const peer = this.peers.get(recipientId);
      if (!peer || !peer.pc || peer.aborted) return;
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        peer.remoteDescSet = true;
        for (const cand of peer.pendingCandidates) {
          await peer.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        peer.pendingCandidates = [];
      } catch (err) {
        this.callbacks.onError?.(`WebRTC answer error: ${err.message}`);
      }
    });

    this.socket.on('p2p:webrtc-ice-candidate', async ({ recipientId, candidate }) => {
      const peer = this.peers.get(recipientId);
      if (!peer || !peer.pc || peer.aborted || !candidate) return;
      try {
        if (peer.remoteDescSet) {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          peer.pendingCandidates.push(candidate);
        }
      } catch (_) {}
    });

    this.socket.on('p2p:time-update', (data) => {
      this._emitState({
        expiresAt: data.expiresAt,
        remainingSeconds: data.remainingSeconds,
      });
    });

    this.socket.on('p2p:transfer-completed', (data) => {
      this._emitState({
        recipients: data.recipients || [],
        completedCount: data.completedCount,
        oneTimeConsumed: data.oneTimeConsumed,
        status: 'COMPLETED',
      });
      this.callbacks.onNotification?.({
        type: 'success',
        message: 'Transfer completed and SHA-256 integrity verified by recipient!',
      });
    });

    this.socket.on('p2p:expired', (data) => {
      this._cleanupAllPeers();
      this._emitState({ status: 'EXPIRED', remainingSeconds: 0 });
      this.callbacks.onNotification?.({ type: 'error', message: data.message || 'Session expired.' });
    });

    this.socket.on('p2p:sharing-stopped', () => {
      this._cleanupAllPeers();
      this._emitState({ status: 'CANCELLED' });
    });

    this.socket.on('p2p:error', (err) => {
      this.callbacks.onError?.(err.message || 'Signaling error');
    });
  }

  async approveRecipient(recipientId) {
    if (this.aborted || this.status === 'EXPIRED' || this.status === 'CANCELLED') return;

    await new Promise((resolve, reject) => {
      this.socket.emit('p2p:approve-recipient', { transferId: this.transferId, recipientId }, (res) => {
        if (!res?.ok) return reject(new Error(res?.error || 'Failed to approve recipient'));
        resolve(res);
      });
    });

    this._emitState({ status: 'APPROVED' });
    await this._initPeerConnectionForRecipient(recipientId);
  }

  rejectRecipient(recipientId) {
    if (!this.socket) return;
    this.socket.emit('p2p:reject-recipient', { transferId: this.transferId, recipientId });
    const peer = this.peers.get(recipientId);
    if (peer) {
      this._closePeer(peer);
      this.peers.delete(recipientId);
    }
  }

  async _initPeerConnectionForRecipient(recipientId) {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,
    });

    const peerCtx = {
      recipientId,
      pc,
      dc: null,
      aborted: false,
      paused: false,
      resumeResolvers: [],
      remoteDescSet: false,
      pendingCandidates: [],
      bytesSent: 0,
      startTime: Date.now(),
    };
    this.peers.set(recipientId, peerCtx);

    pc.onicecandidate = (event) => {
      if (event.candidate && !peerCtx.aborted && this.socket?.connected) {
        this.socket.emit('p2p:webrtc-ice-candidate', {
          transferId: this.transferId,
          recipientId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      this.callbacks.onPeerConnectionState?.(recipientId, state);
      if (state === 'failed' || state === 'closed') {
        peerCtx.aborted = true;
        this._wakePaused(peerCtx);
      }
    };

    const dc = pc.createDataChannel('docqevrilo-e2ee', { ordered: true });
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = BUFFERED_LOW_THRESHOLD;
    peerCtx.dc = dc;

    dc.onopen = async () => {
      try {
        // 1. Send public Argon2id salt & KDF parameters over DataChannel (never via backend)
        dc.send(
          JSON.stringify({
            type: 'kdf-params',
            salt: toBase64(this.salt),
            params: KDF_PARAMS,
          })
        );

        // 2. Send AES-256-GCM encrypted manifest
        const manifestPayload = {
          version: 1,
          transferId: this.transferId,
          files: this.fileManifestEntries,
        };
        const encManifest = await encryptJsonPayload(
          this.aesKey,
          `${this.transferId}|manifest`,
          manifestPayload
        );
        dc.send(
          JSON.stringify({
            type: 'encrypted-manifest',
            nonce: encManifest.nonce,
            ciphertext: encManifest.ciphertext,
          })
        );
      } catch (err) {
        this.callbacks.onError?.(`Failed to initiate encrypted channel: ${err.message}`);
      }
    };

    dc.onmessage = async (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'manifest-ack') {
          await this._streamAllFilesToPeer(peerCtx);
        } else if (msg.type === 'auth-failed') {
          peerCtx.aborted = true;
          this.callbacks.onNotification?.({
            type: 'error',
            message: `Recipient ${recipientId.slice(0, 10)} entered an incorrect unlock code.`,
          });
          this._closePeer(peerCtx);
        }
      } catch (_) {}
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit('p2p:webrtc-offer', {
      transferId: this.transferId,
      recipientId,
      sdp: pc.localDescription,
    });
  }

  async _waitForBackpressure(peerCtx) {
    const { dc } = peerCtx;
    if (dc.bufferedAmount <= MAX_BUFFERED_AMOUNT) return;
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        dc.removeEventListener('bufferedamountlow', onLow);
        clearInterval(abortCheck);
      };
      const onLow = () => {
        cleanup();
        resolve();
      };
      const abortCheck = setInterval(() => {
        if (peerCtx.aborted || this.aborted || dc.readyState !== 'open') {
          cleanup();
          reject(new Error('Transfer aborted'));
        }
      }, 150);
      dc.addEventListener('bufferedamountlow', onLow);
    });
  }

  async _waitWhilePaused(peerCtx) {
    while (peerCtx.paused && !peerCtx.aborted && !this.aborted) {
      await new Promise((resolve) => {
        peerCtx.resumeResolvers.push(resolve);
      });
    }
    if (peerCtx.aborted || this.aborted) {
      throw new Error('Transfer aborted');
    }
  }

  _wakePaused(peerCtx) {
    while (peerCtx.resumeResolvers.length > 0) {
      const r = peerCtx.resumeResolvers.shift();
      r();
    }
  }

  async _streamAllFilesToPeer(peerCtx) {
    const totalBytes = this.files.reduce((acc, f) => acc + f.size, 0);
    peerCtx.startTime = Date.now();
    peerCtx.bytesSent = 0;

    this._emitState({ status: 'TRANSFERRING' });
    this.socket?.emit('p2p:transfer-started', {
      transferId: this.transferId,
      recipientId: peerCtx.recipientId,
    });

    try {
      for (let fIdx = 0; fIdx < this.files.length; fIdx++) {
        const file = this.files[fIdx];
        const meta = this.fileManifestEntries[fIdx];
        const sha256Hasher = await createStreamingSha256();

        let offset = 0;
        let chunkIndex = 0;

        // Handle 0-byte empty file cleanly
        if (file.size === 0) {
          const emptyBuf = new ArrayBuffer(0);
          const { nonce, ciphertext } = await encryptFileChunk(
            this.aesKey,
            this.transferId,
            meta.fileId,
            0,
            emptyBuf
          );
          const frame = encodeBinaryChunkFrame(
            { t: 'c', f: meta.fileId, i: 0, l: 0, n: toBase64(nonce) },
            ciphertext
          );
          peerCtx.dc.send(frame);
        }

        while (offset < file.size) {
          await this._waitWhilePaused(peerCtx);
          await this._waitForBackpressure(peerCtx);

          const sliceEnd = Math.min(offset + CHUNK_SIZE, file.size);
          const plainBuf = await file.slice(offset, sliceEnd).arrayBuffer();
          const plainBytes = new Uint8Array(plainBuf);
          sha256Hasher.update(plainBytes);

          const { nonce, ciphertext } = await encryptFileChunk(
            this.aesKey,
            this.transferId,
            meta.fileId,
            chunkIndex,
            plainBuf
          );

          if (peerCtx.aborted || this.aborted || peerCtx.dc.readyState !== 'open') {
            throw new Error('Channel closed during transfer');
          }

          const frame = encodeBinaryChunkFrame(
            {
              t: 'c',
              f: meta.fileId,
              i: chunkIndex,
              l: plainBuf.byteLength,
              n: toBase64(nonce),
            },
            ciphertext
          );
          peerCtx.dc.send(frame);

          offset = sliceEnd;
          chunkIndex += 1;
          peerCtx.bytesSent += plainBuf.byteLength;

          const elapsedSec = Math.max(0.1, (Date.now() - peerCtx.startTime) / 1000);
          const speedBps = peerCtx.bytesSent / elapsedSec;
          const remainingBytes = Math.max(0, totalBytes - peerCtx.bytesSent);
          const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;
          const percentage = totalBytes > 0 ? Math.min(100, Math.round((peerCtx.bytesSent / totalBytes) * 100)) : 100;

          if (chunkIndex % 4 === 0 || offset >= file.size) {
            this.callbacks.onProgress?.({
              recipientId: peerCtx.recipientId,
              fileName: file.name,
              fileIndex: fIdx,
              bytesTransferred: peerCtx.bytesSent,
              totalBytes,
              percentage,
              speedBps,
              etaSeconds,
            });
            this.socket?.emit('p2p:transfer-progress', {
              transferId: this.transferId,
              recipientId: peerCtx.recipientId,
              percentage,
              bytesTransferred: peerCtx.bytesSent,
              totalBytes,
            });
          }
        }

        // Send AES-GCM encrypted file-end frame containing authoritative SHA-256
        const sha256Hex = sha256Hasher.digestHex();
        const encEnd = await encryptJsonPayload(this.aesKey, `${this.transferId}|${meta.fileId}|end`, {
          fileId: meta.fileId,
          sha256: sha256Hex,
          chunkCount: chunkIndex,
        });
        peerCtx.dc.send(
          JSON.stringify({
            type: 'file-end',
            fileId: meta.fileId,
            nonce: encEnd.nonce,
            ciphertext: encEnd.ciphertext,
          })
        );
      }
    } catch (err) {
      if (!peerCtx.aborted && !this.aborted) {
        this.callbacks.onError?.(`Transfer interrupted: ${err.message}`);
      }
    }
  }

  pauseTransfer(recipientId) {
    if (recipientId && this.peers.has(recipientId)) {
      const peer = this.peers.get(recipientId);
      peer.paused = true;
      if (peer.dc?.readyState === 'open') {
        peer.dc.send(JSON.stringify({ type: 'transfer-paused' }));
      }
    } else {
      for (const peer of this.peers.values()) {
        peer.paused = true;
        if (peer.dc?.readyState === 'open') {
          peer.dc.send(JSON.stringify({ type: 'transfer-paused' }));
        }
      }
    }
    this.socket?.emit('p2p:pause-transfer', { transferId: this.transferId, recipientId });
    this._emitState({ status: 'PAUSED' });
  }

  resumeTransfer(recipientId) {
    if (recipientId && this.peers.has(recipientId)) {
      const peer = this.peers.get(recipientId);
      peer.paused = false;
      if (peer.dc?.readyState === 'open') {
        peer.dc.send(JSON.stringify({ type: 'transfer-resumed' }));
      }
      this._wakePaused(peer);
    } else {
      for (const peer of this.peers.values()) {
        peer.paused = false;
        if (peer.dc?.readyState === 'open') {
          peer.dc.send(JSON.stringify({ type: 'transfer-resumed' }));
        }
        this._wakePaused(peer);
      }
    }
    this.socket?.emit('p2p:resume-transfer', { transferId: this.transferId, recipientId });
    this._emitState({ status: 'TRANSFERRING' });
  }

  stopSharing() {
    this.aborted = true;
    if (this.socket?.connected && this.transferId) {
      this.socket.emit('p2p:stop-sharing', { transferId: this.transferId });
    }
    this._cleanupAllPeers();
    this.aesKey = null;
    this.unlockSecret = null;
    this.salt = null;
    this._emitState({ status: 'CANCELLED' });
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  _closePeer(peer) {
    peer.aborted = true;
    this._wakePaused(peer);
    try {
      peer.dc?.close();
    } catch (_) {}
    try {
      peer.pc?.close();
    } catch (_) {}
  }

  _cleanupAllPeers() {
    for (const peer of this.peers.values()) {
      this._closePeer(peer);
    }
    this.peers.clear();
  }
}

export class P2PReceiverSession {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.socket = null;
    this.pc = null;
    this.dc = null;
    this.transferId = '';
    this.unlockSecret = '';
    this.aesKey = null;
    this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
    this.remoteDescSet = false;
    this.pendingCandidates = [];
    this.manifest = null;
    this.fileStates = new Map(); // fileId -> { meta, expectedIndex, decryptedChunks, sha256Hasher, completed, blobUrl }
    this.bytesReceived = 0;
    this.totalBytes = 0;
    this.startTime = null;
    this.aborted = false;
    this.status = 'IDLE';
  }

  _emitState(patch) {
    if (patch.status) this.status = patch.status;
    this.callbacks.onStateChange?.(patch);
  }

  async joinSession({ secureId, transferId, unlockSecret }) {
    let cleanId = (transferId || '').trim();
    let cleanSecret = (unlockSecret || '').trim();

    const candidateSecureId = (secureId || '').trim() || (isSecureIdFormat(cleanId) ? cleanId : '');
    if (candidateSecureId || /^DQV1-/i.test(cleanId)) {
      const parsed = await parseSecureId(candidateSecureId || cleanId);
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Invalid Secure ID.');
      }
      cleanId = parsed.transferId;
      cleanSecret = parsed.unlockSecret;
    }

    if (!cleanId || cleanId.length < 12) {
      throw new Error('Please enter a valid Secure ID or Transfer ID.');
    }
    if (!cleanSecret || cleanSecret.length < 8) {
      throw new Error('Please enter a valid Secure ID or secret unlock code.');
    }

    this.transferId = cleanId;
    this.unlockSecret = cleanSecret;
    this.aborted = false;

    const socketUrl = getSocketServerUrl();
    const token = authService.getToken();
    this.socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this._bindSocketEvents();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Signaling server connection timeout.')), 12000);

      this.socket.once('connect', () => {
        this.socket.emit('p2p:join-session', { transferId: this.transferId }, (res) => {
          clearTimeout(timeout);
          if (!res || !res.ok) {
            this.disconnect();
            reject(new Error(res?.error || 'Unable to join sharing session.'));
            return;
          }
          this.iceServers = res.iceServers || this.iceServers;
          this.totalBytes = res.totalSize || 0;
          this._emitState({
            status: 'WAITING_FOR_APPROVAL',
            transferId: this.transferId,
            recipientId: res.recipientId,
            expiresAt: res.expiresAt,
            remainingSeconds: res.remainingSeconds,
            fileCount: res.fileCount,
            totalSize: res.totalSize,
            oneTimeAccess: res.oneTimeAccess,
          });
          resolve(res);
        });
      });

      this.socket.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Connection error: ${err.message}`));
      });
    });
  }

  _bindSocketEvents() {
    this.socket.on('p2p:access-approved', () => {
      this._emitState({ status: 'APPROVED' });
      this.callbacks.onNotification?.({
        type: 'success',
        message: 'Sender approved your access! Establishing encrypted WebRTC tunnel...',
      });
    });

    this.socket.on('p2p:access-rejected', (data) => {
      this._emitState({ status: 'FAILED' });
      this.callbacks.onError?.(data.message || 'Access rejected by sender.');
      this.disconnect();
    });

    this.socket.on('p2p:webrtc-offer', async ({ sdp }) => {
      if (this.aborted) return;
      try {
        await this._handleOffer(sdp);
      } catch (err) {
        this.callbacks.onError?.(`WebRTC connection error: ${err.message}`);
      }
    });

    this.socket.on('p2p:webrtc-ice-candidate', async ({ candidate }) => {
      if (!this.pc || this.aborted || !candidate) return;
      try {
        if (this.remoteDescSet) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          this.pendingCandidates.push(candidate);
        }
      } catch (_) {}
    });

    this.socket.on('p2p:transfer-paused', () => {
      this._emitState({ status: 'PAUSED' });
    });

    this.socket.on('p2p:transfer-resumed', () => {
      this._emitState({ status: 'TRANSFERRING' });
    });

    this.socket.on('p2p:time-update', (data) => {
      this._emitState({
        expiresAt: data.expiresAt,
        remainingSeconds: data.remainingSeconds,
      });
    });

    this.socket.on('p2p:expired', (data) => {
      this._wipeUnverifiedBuffers();
      this._emitState({ status: 'EXPIRED', remainingSeconds: 0 });
      this.callbacks.onError?.(data.message || 'This sharing session has expired.');
      this.disconnect();
    });

    this.socket.on('p2p:sharing-stopped', (data) => {
      this._wipeUnverifiedBuffers();
      this._emitState({ status: 'CANCELLED' });
      this.callbacks.onError?.(data.message || 'Sender stopped sharing.');
      this.disconnect();
    });

    this.socket.on('p2p:error', (err) => {
      this.callbacks.onError?.(err.message || 'Signaling error');
    });
  }

  async _handleOffer(sdp) {
    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && !this.aborted && this.socket?.connected) {
        this.socket.emit('p2p:webrtc-ice-candidate', {
          transferId: this.transferId,
          candidate: event.candidate,
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      this._emitState({ peerConnectionState: this.pc.connectionState });
    };

    this.pc.ondatachannel = (event) => {
      const dc = event.channel;
      dc.binaryType = 'arraybuffer';
      this.dc = dc;

      // Serialize DataChannel message processing so kdf-params finishes before encrypted-manifest
      // and binary chunks are decrypted/hashed strictly in order.
      let msgQueue = Promise.resolve();
      dc.onmessage = (msgEvent) => {
        msgQueue = msgQueue.then(async () => {
          if (this.aborted) return;
          try {
            if (typeof msgEvent.data === 'string') {
              await this._handleControlMessage(JSON.parse(msgEvent.data));
            } else {
              await this._handleBinaryChunk(msgEvent.data);
            }
          } catch (err) {
            this._wipeUnverifiedBuffers();
            this._emitState({ status: 'FAILED' });
            this.callbacks.onError?.(err.message || 'Decryption or integrity verification failed.');
            this.disconnect();
          }
        });
      };
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.remoteDescSet = true;
    for (const cand of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    }
    this.pendingCandidates = [];

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.socket.emit('p2p:webrtc-answer', {
      transferId: this.transferId,
      sdp: this.pc.localDescription,
    });
  }

  async _handleControlMessage(msg) {
    if (msg.type === 'kdf-params') {
      this._emitState({ status: 'DERIVING_KEY' });
      const saltBytes = fromBase64(msg.salt);
      this.aesKey = await deriveAesKeyFromSecret(this.unlockSecret, saltBytes, msg.params || KDF_PARAMS);
      return;
    }

    if (msg.type === 'encrypted-manifest') {
      if (!this.aesKey) {
        throw new Error('Encryption key not initialized.');
      }
      let manifest;
      try {
        manifest = await decryptJsonPayload(
          this.aesKey,
          `${this.transferId}|manifest`,
          msg.nonce,
          msg.ciphertext
        );
      } catch (_) {
        try {
          this.dc?.send(JSON.stringify({ type: 'auth-failed' }));
        } catch (_) {}
        throw new Error('Incorrect unlock code. Unable to decrypt transfer.');
      }

      this.manifest = manifest;
      this.totalBytes = manifest.files.reduce((acc, f) => acc + f.size, 0);
      this.bytesReceived = 0;
      this.startTime = Date.now();

      for (const fMeta of manifest.files) {
        const hasher = await createStreamingSha256();
        this.fileStates.set(fMeta.fileId, {
          meta: fMeta,
          expectedIndex: 0,
          decryptedChunks: [],
          sha256Hasher: hasher,
          completed: false,
          blobUrl: null,
          sha256: null,
        });
      }

      this._emitState({
        status: 'TRANSFERRING',
        files: manifest.files.map((f) => ({ ...f, receivedBytes: 0, completed: false, blobUrl: null })),
      });

      this.dc.send(JSON.stringify({ type: 'manifest-ack' }));
      return;
    }

    if (msg.type === 'transfer-paused') {
      this._emitState({ status: 'PAUSED' });
      return;
    }

    if (msg.type === 'transfer-resumed') {
      this._emitState({ status: 'TRANSFERRING' });
      return;
    }

    if (msg.type === 'file-end') {
      const fState = this.fileStates.get(msg.fileId);
      if (!fState) throw new Error('Unexpected file completion frame.');

      const endPayload = await decryptJsonPayload(
        this.aesKey,
        `${this.transferId}|${msg.fileId}|end`,
        msg.nonce,
        msg.ciphertext
      );

      if (fState.expectedIndex !== endPayload.chunkCount && fState.meta.size > 0) {
        throw new Error(`Missing chunks detected for ${fState.meta.name}.`);
      }

      const computedSha256 = fState.sha256Hasher.digestHex();
      if (computedSha256 !== endPayload.sha256) {
        throw new Error(`SHA-256 integrity mismatch on ${fState.meta.name}. File rejected.`);
      }

      const blob = new Blob(fState.decryptedChunks, {
        type: fState.meta.type || 'application/octet-stream',
      });
      // Release raw chunk references after assembling Blob
      fState.decryptedChunks = [];
      fState.completed = true;
      fState.sha256 = computedSha256;
      fState.blobUrl = URL.createObjectURL(blob);

      this._emitFilesUpdate();

      // Check if all files are verified and completed
      const allCompleted = Array.from(this.fileStates.values()).every((s) => s.completed);
      if (allCompleted) {
        this._emitState({ status: 'COMPLETED' });
        this.socket?.emit('p2p:transfer-completed', { transferId: this.transferId });
      }
    }
  }

  async _handleBinaryChunk(arrayBuffer) {
    if (!this.aesKey || !this.manifest) {
      throw new Error('Received chunk before authenticated manifest.');
    }

    const { header, ciphertext } = decodeBinaryChunkFrame(arrayBuffer);
    if (header.t !== 'c') return;

    const fState = this.fileStates.get(header.f);
    if (!fState || fState.completed) {
      throw new Error('Invalid or already completed file chunk.');
    }

    // Strict ordering / duplicate / missing chunk rejection
    if (header.i !== fState.expectedIndex) {
      throw new Error(`Chunk sequence error on ${fState.meta.name}: expected ${fState.expectedIndex}, got ${header.i}.`);
    }

    const nonce = fromBase64(header.n);
    const plainBytes = await decryptFileChunk(
      this.aesKey,
      this.transferId,
      header.f,
      header.i,
      header.l,
      nonce,
      ciphertext
    );

    fState.sha256Hasher.update(plainBytes);
    fState.decryptedChunks.push(plainBytes);
    fState.expectedIndex += 1;
    this.bytesReceived += plainBytes.byteLength;

    const elapsedSec = Math.max(0.1, (Date.now() - this.startTime) / 1000);
    const speedBps = this.bytesReceived / elapsedSec;
    const remainingBytes = Math.max(0, this.totalBytes - this.bytesReceived);
    const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;
    const percentage =
      this.totalBytes > 0 ? Math.min(100, Math.round((this.bytesReceived / this.totalBytes) * 100)) : 100;

    this.callbacks.onProgress?.({
      bytesTransferred: this.bytesReceived,
      totalBytes: this.totalBytes,
      percentage,
      speedBps,
      etaSeconds,
    });
  }

  _emitFilesUpdate() {
    const filesList = Array.from(this.fileStates.values()).map((s) => ({
      ...s.meta,
      completed: s.completed,
      blobUrl: s.blobUrl,
      sha256: s.sha256,
    }));
    this._emitState({ files: filesList });
  }

  _wipeUnverifiedBuffers() {
    for (const s of this.fileStates.values()) {
      if (!s.completed) {
        s.decryptedChunks = [];
      }
    }
    this.aesKey = null;
    this.unlockSecret = '';
  }

  disconnect() {
    this.aborted = true;
    this._wipeUnverifiedBuffers();
    try {
      this.dc?.close();
    } catch (_) {}
    try {
      this.pc?.close();
    } catch (_) {}
    if (this.socket) {
      try {
        this.socket.emit('p2p:leave-session');
        this.socket.disconnect();
      } catch (_) {}
      this.socket = null;
    }
  }
}
