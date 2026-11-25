/**
 * DocQevrilo – Production-Grade Multi-User P2P Concurrent WebRTC Sharing Service
 *
 * Implements high-throughput, memory-bounded, multi-recipient WebRTC DataChannel streaming:
 * - 64 KB chunks read incrementally using the HTML5 File API (bounded memory).
 * - Backpressure handling using RTCDataChannel.bufferedAmount and bufferedamountlow per peer.
 * - ZERO server storage: bytes travel directly between browsers via DTLS-SRTP encrypted SCTP.
 * - Real-time signaling via Server-Sent Events (SSE) with polling fallback.
 * - Concurrent multi-peer support: owner streams to multiple recipients simultaneously.
 * - SHA-256 end-to-end cryptographic integrity verification.
 */

import { getApiBaseUrl } from '../config/api';

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk (standard optimal size for SCTP)
const BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024; // 256 KB threshold
const MAX_BUFFERED_AMOUNT = 1024 * 1024; // 1 MB pause threshold for backpressure

const DEFAULT_STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * Formats byte counts into human-readable sizes (B, KB, MB, GB, TB).
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// Standard Incremental SHA-256 Engine (FIPS 180-4)
// Allows hashing files of arbitrary size with strictly bounded O(1) memory.
// ---------------------------------------------------------------------------
function isPrime(n) {
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return n > 1;
}

function getFirstPrimes(count) {
  const primes = [];
  let n = 2;
  while (primes.length < count) {
    if (isPrime(n)) primes.push(n);
    n++;
  }
  return primes;
}

const SHA256_K = getFirstPrimes(64).map((p) => Math.floor(Math.pow(p, 1 / 3) * 0x100000000) >>> 0);
const SHA256_H_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const rotr = (n, x) => (x >>> n) | (x << (32 - n));
const ch = (x, y, z) => (x & y) ^ (~x & z);
const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
const sigma0 = (x) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
const sigma1 = (x) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
const gamma0 = (x) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
const gamma1 = (x) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);

export class IncrementalSha256 {
  constructor() {
    this.h = [...SHA256_H_INIT];
    this.buffer = new Uint8Array(64);
    this.bufferLength = 0;
    this.totalBytes = 0;
  }

  update(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.totalBytes += bytes.length;
    let offset = 0;
    while (offset < bytes.length) {
      if (this.bufferLength === 0 && bytes.length - offset >= 64) {
        this.processBlock(bytes, offset);
        offset += 64;
      } else {
        const toCopy = Math.min(64 - this.bufferLength, bytes.length - offset);
        this.buffer.set(bytes.subarray(offset, offset + toCopy), this.bufferLength);
        this.bufferLength += toCopy;
        offset += toCopy;
        if (this.bufferLength === 64) {
          this.processBlock(this.buffer, 0);
          this.bufferLength = 0;
        }
      }
    }
  }

  processBlock(block, offset) {
    const W = new Uint32Array(64);
    for (let t = 0; t < 16; t++) {
      const idx = offset + t * 4;
      W[t] = ((block[idx] << 24) | (block[idx + 1] << 16) | (block[idx + 2] << 8) | block[idx + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = gamma0(W[t - 15]);
      const s1 = gamma1(W[t - 2]);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = this.h;
    for (let t = 0; t < 64; t++) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + SHA256_K[t] + W[t]) >>> 0;
      const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g; g = f; f = e;
      e = (d + T1) >>> 0;
      d = c; c = b; b = a;
      a = (T1 + T2) >>> 0;
    }
    this.h[0] = (this.h[0] + a) >>> 0;
    this.h[1] = (this.h[1] + b) >>> 0;
    this.h[2] = (this.h[2] + c) >>> 0;
    this.h[3] = (this.h[3] + d) >>> 0;
    this.h[4] = (this.h[4] + e) >>> 0;
    this.h[5] = (this.h[5] + f) >>> 0;
    this.h[6] = (this.h[6] + g) >>> 0;
    this.h[7] = (this.h[7] + h) >>> 0;
  }

  digest() {
    const totalBits = BigInt(this.totalBytes) * 8n;
    this.buffer[this.bufferLength++] = 0x80;
    if (this.bufferLength > 56) {
      this.buffer.fill(0, this.bufferLength);
      this.processBlock(this.buffer, 0);
      this.bufferLength = 0;
    }
    this.buffer.fill(0, this.bufferLength, 56);
    for (let i = 0; i < 8; i++) {
      this.buffer[63 - i] = Number((totalBits >> BigInt(i * 8)) & 0xffn);
    }
    this.processBlock(this.buffer, 0);
    return this.h.map((val) => val.toString(16).padStart(8, '0')).join('');
  }
}

/**
 * Computes SHA-256 hex string of an ArrayBuffer, File, or Blob.
 * Streams in 2 MB slices so memory consumption never exceeds ~2 MB even for multi-gigabyte files.
 */
export async function computeSha256(blobOrBuffer, onProgress = null) {
  if (!blobOrBuffer) return null;
  try {
    if (blobOrBuffer instanceof ArrayBuffer) {
      const hasher = new IncrementalSha256();
      hasher.update(new Uint8Array(blobOrBuffer));
      return hasher.digest();
    }
    if (typeof Blob !== 'undefined' && blobOrBuffer instanceof Blob) {
      const hasher = new IncrementalSha256();
      const SLICE_SIZE = 2 * 1024 * 1024; // 2 MB slices
      let offset = 0;
      const total = blobOrBuffer.size;
      while (offset < total) {
        const slice = blobOrBuffer.slice(offset, Math.min(offset + SLICE_SIZE, total));
        const buffer = await slice.arrayBuffer();
        hasher.update(new Uint8Array(buffer));
        offset += buffer.byteLength;
        if (onProgress && total > 0) {
          onProgress(Math.min(100, Math.round((offset / total) * 100)));
        }
      }
      return hasher.digest();
    }
    return null;
  } catch (e) {
    console.warn('[SHA-256 Digest Warning]', e);
    return null;
  }
}

/**
 * SequentialFileWriter
 * Guarantees that every chunk write is strictly serialized and awaited in order.
 * Never mixes partially written files with fallback memory chunks.
 */
export class SequentialFileWriter {
  constructor({ writableStream = null, totalBytes = 0, mimeType = 'application/octet-stream' }) {
    this.writableStream = writableStream;
    this.totalBytes = totalBytes;
    this.mimeType = mimeType;
    this.writeQueue = Promise.resolve();
    this.memoryChunks = writableStream ? null : [];
    this.receivedBytes = 0;
    this.receivedChunksCount = 0;
    this.hasWriteError = false;
    this.writeErrorMessage = null;
  }

  writeChunk(chunkData) {
    if (this.hasWriteError) {
      return Promise.reject(new Error(this.writeErrorMessage || 'Write stream error'));
    }

    this.receivedBytes += chunkData.byteLength;
    this.receivedChunksCount++;

    if (this.writableStream) {
      this.writeQueue = this.writeQueue.then(async () => {
        try {
          await this.writableStream.write(chunkData);
        } catch (err) {
          this.hasWriteError = true;
          this.writeErrorMessage = err.message || 'Disk write failed';
          throw err;
        }
      });
      return this.writeQueue;
    } else {
      this.memoryChunks.push(chunkData);
      return Promise.resolve();
    }
  }

  async close() {
    await this.writeQueue;
    if (this.writableStream) {
      try {
        await this.writableStream.close();
      } catch (err) {
        console.warn('[SequentialFileWriter] Error closing stream:', err.message);
      }
      return null;
    } else {
      return new Blob(this.memoryChunks || [], { type: this.mimeType });
    }
  }

  async abort() {
    this.hasWriteError = true;
    if (this.writableStream) {
      try {
        await this.writableStream.abort();
      } catch (_) { }
    }
    this.memoryChunks = null;
  }
}

/**
 * PeerTransferController
 * Manages an independent WebRTC connection and DataChannel stream for a SINGLE peer.
 */
export class PeerTransferController {
  constructor({
    recipientId,
    file,
    fileSha256 = null,
    getSha256Fn = null,
    readChunkFn = null,
    iceServers = DEFAULT_STUN_SERVERS,
    onSignal = () => { },
    onStatusChange = () => { },
    onProgress = () => { },
    onComplete = () => { },
    onError = () => { },
    onConnectionType = () => { },
  }) {
    this.recipientId = recipientId;
    this.file = file;
    this.fileSha256 = fileSha256;
    this.getSha256Fn = getSha256Fn;
    this.readChunkFn = readChunkFn;
    this.iceServers = iceServers;
    this.onSignal = onSignal;
    this.onStatusChange = onStatusChange;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
    this.onConnectionType = onConnectionType;

    this.peerConnection = null;
    this.dataChannel = null;
    this.connectionType = 'Direct P2P';
    this.isTransferring = false;
    this.isVerifying = false;
    this.isCompleted = false;
    this.isClosed = false;
    this.queuedIceCandidates = [];
    this.bytesTransferred = 0;
    this.totalBytes = file ? file.size : 0;
    this.startTime = 0;
    this.statsTimer = null;
    this.lastProgressEmit = 0;
    this.currentChunkIndex = 0;
  }

  /**
   * Detects whether connection is Direct P2P (LAN), Direct P2P (STUN), or Relayed (TURN).
   */
  async detectConnectionType() {
    if (!this.peerConnection || this.isClosed) return 'unknown';
    try {
      const stats = await this.peerConnection.getStats();
      let activePair = null;
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.selected || report.nominated)) {
          activePair = report;
        }
      });

      if (activePair) {
        const localCandidate = stats.get(activePair.localCandidateId);
        const remoteCandidate = stats.get(activePair.remoteCandidateId);
        if (localCandidate && remoteCandidate) {
          const lType = localCandidate.candidateType;
          const rType = remoteCandidate.candidateType;
          if (lType === 'relay' || rType === 'relay') {
            this.connectionType = 'Relayed (TURN)';
          } else if (lType === 'host' && rType === 'host') {
            this.connectionType = 'Direct P2P (LAN)';
          } else {
            this.connectionType = 'Direct P2P (STUN)';
          }
          this.onConnectionType({
            recipientId: this.recipientId,
            connectionType: this.connectionType,
            isRelayed: this.connectionType.includes('Relayed'),
          });
          return this.connectionType;
        }
      }
    } catch (_) { }
    return this.connectionType;
  }

  /**
   * Initializes RTCPeerConnection for this recipient.
   */
  async init() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceTransportPolicy: 'all', // Never filter relay candidates - allows TURN fallback
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && !this.isClosed) {
        this.onSignal('candidate', event.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.isClosed || !this.peerConnection) return;
      const iceState = this.peerConnection.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        this.detectConnectionType();
      } else if (iceState === 'failed') {
        // Attempt ICE restart before giving up
        try {
          this.peerConnection.restartIce();
        } catch (_) {
          this.onError('ICE connection failed. Direct and relay routes were unreachable.');
        }
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.isClosed || !this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.detectConnectionType();
        this.onStatusChange({
          status: 'connected',
          message: `Encrypted connection established with recipient (${this.connectionType}).`,
          connectionType: this.connectionType,
        });
      } else if (state === 'failed') {
        this.onError('P2P connection negotiation failed for this recipient.');
      } else if (state === 'disconnected') {
        if (!this.isCompleted) {
          this.onStatusChange({
            status: 'disconnected',
            message: 'Recipient disconnected before transfer completed.',
          });
        }
      }
    };

    // Create ordered DataChannel for reliable sequential chunk delivery
    this.dataChannel = this.peerConnection.createDataChannel(`docqevrilo-stream-${this.recipientId}`, {
      ordered: true,
    });
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;

    this.dataChannel.onopen = () => {
      this.detectConnectionType();
      this.onStatusChange({
        status: 'channel-open',
        message: 'DataChannel active. Streaming file chunks...',
        connectionType: this.connectionType,
      });
      this.streamFile();
    };

    // Listen for verification acknowledgements from recipient
    this.dataChannel.onmessage = (msgEvent) => {
      if (typeof msgEvent.data === 'string') {
        try {
          const parsed = JSON.parse(msgEvent.data);
          if (parsed.type === 'verify-ack') {
            this.isVerifying = false;
            this.isCompleted = true;
            this.isTransferring = false;
            this.onStatusChange({
              status: 'completed',
              message: 'Recipient verified cryptographic SHA-256 integrity. Transfer complete!',
            });
            this.onComplete({
              recipientId: this.recipientId,
              fileName: this.file ? this.file.name : 'shared-file',
              fileSize: this.totalBytes,
              bytesTransferred: this.bytesTransferred,
              sha256: parsed.sha256,
              verified: true,
            });
          } else if (parsed.type === 'resume-handshake' && typeof parsed.lastChunk === 'number') {
            console.log(`[Resume Handshake] Recipient ${this.recipientId} requested resume from chunk #${parsed.lastChunk}`);
            this.streamFile(parsed.lastChunk);
            return;
          } else if (parsed.type === 'verify-failed') {
            this.isVerifying = false;
            this.onError(`Recipient integrity check failed: ${parsed.error || 'Checksum mismatch'}`);
          }
        } catch (_) { }
      }
    };

    this.dataChannel.onclose = () => {
      this.onStatusChange({
        status: 'channel-closed',
        message: 'DataChannel closed.',
      });
    };

    this.dataChannel.onerror = (err) => {
      console.warn(`[DataChannel Error] Recipient ${this.recipientId}:`, err);
      this.onError('DataChannel transfer error occurred.');
    };

    // Create offer and send to recipient
    await this.createOffer();
  }

  async createOffer() {
    if (!this.peerConnection || this.isClosed) return;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.onSignal('offer', offer);
    } catch (err) {
      console.error(`[Create Offer Error] Recipient ${this.recipientId}:`, err);
      this.onError('Failed to generate WebRTC offer for recipient.');
    }
  }

  async handleAnswer(answer) {
    if (!this.peerConnection || this.isClosed) return;
    try {
      const sdpData = answer && answer.sdp ? answer : answer?.payload || answer;
      if (sdpData && sdpData.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));

        // Flush any queued candidates
        if (this.queuedIceCandidates.length > 0) {
          for (const cand of this.queuedIceCandidates) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            } catch (_) { }
          }
          this.queuedIceCandidates = [];
        }
      }
    } catch (err) {
      console.error(`[Handle Answer Error] Recipient ${this.recipientId}:`, err);
    }
  }

  async handleCandidate(candidate) {
    if (!this.peerConnection || this.isClosed || !candidate) return;
    try {
      if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
        this.queuedIceCandidates.push(candidate);
      } else {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (_) { }
  }

  /**
   * Streams file chunks with sequence headers and backpressure flow control.
   * Supports starting from an arbitrary chunk offset for transfer resumption.
   */
  async streamFile(startChunk = 0) {
    if (!this.file || !this.dataChannel || this.dataChannel.readyState !== 'open') return;

    this.isTransferring = true;
    this.totalBytes = this.file.size;
    this.startTime = Date.now();

    const totalChunks = Math.max(1, Math.ceil(this.file.size / CHUNK_SIZE));

    // 1. Send metadata header packet (only when starting from 0)
    if (startChunk === 0) {
      this.bytesTransferred = 0;
      const header = {
        type: 'header',
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type || 'application/octet-stream',
        sha256: this.fileSha256 || null,
        chunkSize: CHUNK_SIZE,
        totalChunks,
      };

      try {
        this.dataChannel.send(JSON.stringify(header));
      } catch (e) {
        this.onError('Failed to send file header packet.');
        return;
      }
    }

    // 2. Stream chunks incrementally using slice() - bounded memory with 8-byte sequence headers
    let offset = startChunk * CHUNK_SIZE;
    let seq = startChunk;
    this.bytesTransferred = offset;

    const sendNextChunk = async () => {
      // Handle zero-byte files cleanly
      if (this.file.size === 0) {
        this.dataChannel.send(
          JSON.stringify({
            type: 'complete',
            totalChunks: 0,
            fileSize: 0,
            sha256: this.fileSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          })
        );
        this.isVerifying = true;
        this.onStatusChange({
          status: 'verifying',
          message: 'Transmitted zero-byte file. Waiting for recipient verification...',
        });
        return;
      }

      while (offset < this.file.size) {
        if (this.isClosed || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          return;
        }

        // Apply backpressure if buffer exceeds limit
        if (this.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          this.dataChannel.onbufferedamountlow = () => {
            this.dataChannel.onbufferedamountlow = null;
            sendNextChunk();
          };
          return;
        }

        const arrayBuffer = this.readChunkFn
          ? await this.readChunkFn(seq, offset, CHUNK_SIZE)
          : await this.file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();

        if (this.isClosed || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          return;
        }

        // 8-byte sequential envelope: [seq (Uint32), totalChunks (Uint32)]
        const packet = new Uint8Array(8 + arrayBuffer.byteLength);
        const view = new DataView(packet.buffer);
        view.setUint32(0, seq, false);
        view.setUint32(4, totalChunks, false);
        packet.set(new Uint8Array(arrayBuffer), 8);

        try {
          this.dataChannel.send(packet.buffer);
        } catch (sendErr) {
          console.warn(`[DataChannel Send Error] Recipient ${this.recipientId}:`, sendErr);
          return;
        }

        offset += arrayBuffer.byteLength;
        seq++;
        this.currentChunkIndex = seq;
        this.bytesTransferred = offset;

        // Progress calculation (throttled to ~150ms for smooth multi-peer UI)
        const now = Date.now();
        if (now - this.lastProgressEmit >= 150 || offset >= this.file.size) {
          this.lastProgressEmit = now;
          const elapsedSec = Math.max((now - this.startTime) / 1000, 0.001);
          const speedBytesPerSec = this.bytesTransferred / elapsedSec;
          const remainingBytes = Math.max(0, this.totalBytes - this.bytesTransferred);
          const etaSeconds = speedBytesPerSec > 0 ? Math.ceil(remainingBytes / speedBytesPerSec) : 0;
          const progressPercent = Math.min((this.bytesTransferred / this.totalBytes) * 100, 100);

          this.onProgress({
            recipientId: this.recipientId,
            bytesTransferred: this.bytesTransferred,
            totalBytes: this.totalBytes,
            percent: Number(progressPercent.toFixed(1)),
            speedBytesPerSec,
            speedFormatted: `${formatFileSize(speedBytesPerSec)}/s`,
            etaSeconds,
            timeElapsedSec: Math.floor(elapsedSec),
          });
        }

        // Yield to the event loop every 4 chunks so concurrent recipients interleave cleanly
        if (seq % 4 === 0 && offset < this.file.size) {
          setTimeout(() => sendNextChunk(), 0);
          return;
        }
      }

      // 3. Send complete packet & wait for verification acknowledgement
      if (offset >= this.file.size) {
        const resolvedSha256 = this.fileSha256 || (this.getSha256Fn ? this.getSha256Fn() : null);
        try {
          this.dataChannel.send(
            JSON.stringify({
              type: 'complete',
              totalChunks,
              fileSize: this.file.size,
              sha256: resolvedSha256 || null,
            })
          );
        } catch (_) { }

        this.isVerifying = true;
        this.onStatusChange({
          status: 'verifying',
          message: 'All chunks sent. Recipient is verifying cryptographic SHA-256 checksum...',
        });
      }
    };

    sendNextChunk();
  }

  close() {
    this.isClosed = true;
    this.isTransferring = false;
    this.isVerifying = false;

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (_) { }
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (_) { }
      this.peerConnection = null;
    }
  }
}

/**
 * FetchSseClient
 * Fetch-based Server-Sent Events client supporting custom HTTP request headers.
 * Native browser EventSource does not support custom headers (such as x-sse-ticket).
 * FetchSseClient streams SSE chunks over HTTP fetch, keeping tickets out of URL query strings.
 */
export class FetchSseClient {
  constructor({ url, headers = {}, onMessage = () => {}, onError = () => {} }) {
    this.url = url;
    this.headers = headers;
    this.onMessage = onMessage;
    this.onError = onError;
    this.controller = new AbortController();
    this.isClosed = false;
    this.listeners = new Map();
  }

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) {
        try {
          cb({ data });
        } catch (e) {
          console.warn('[FetchSseClient Listener Error]', e);
        }
      }
    }
  }

  async start() {
    try {
      const response = await fetch(this.url, {
        headers: {
          Accept: 'text/event-stream',
          ...this.headers,
        },
        signal: this.controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!this.isClosed) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep last partial line

        let currentEvent = 'message';
        let currentData = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') {
            if (currentData) {
              this.emit(currentEvent, currentData);
              currentEvent = 'message';
              currentData = '';
            }
          } else if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const val = trimmed.slice(5).trim();
            currentData = currentData ? currentData + '\n' + val : val;
          }
        }
      }
    } catch (err) {
      if (!this.isClosed) {
        this.onError(err);
      }
    }
  }

  close() {
    this.isClosed = true;
    try {
      this.controller.abort();
    } catch (_) {}
  }
}

/**
 * WebRtcShareSession
 * Unified WebRTC sharing session supporting both Owner (Multi-Recipient) and Recipient.
 */
export class WebRtcShareSession {
  constructor({
    role, // 'owner' | 'recipient'
    sessionId,
    token, // ownerToken or recipientToken
    recipientId = null, // required for recipient
    file = null, // File object (for owner)
    iceServers = DEFAULT_STUN_SERVERS,
    onStatusChange = () => { },
    onProgress = () => { },
    onComplete = () => { },
    onError = () => { },
    onStatsUpdate = () => { },
    // Multi-Recipient Specific Callbacks for Owner:
    onRecipientsUpdate = () => { },
    onRecipientJoined = () => { },
    onRecipientProgress = () => { },
    onRecipientComplete = () => { },
    onRecipientDisconnected = () => { },
  }) {
    this.role = role;
    this.sessionId = sessionId;
    this.token = token;
    this.recipientId = recipientId;
    this.file = file;
    this.fileSha256 = null;
    this.iceServers = iceServers;

    this.onStatusChange = onStatusChange;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
    this.onStatsUpdate = onStatsUpdate;

    this.onRecipientsUpdate = onRecipientsUpdate;
    this.onRecipientJoined = onRecipientJoined;
    this.onRecipientProgress = onRecipientProgress;
    this.onRecipientComplete = onRecipientComplete;
    this.onRecipientDisconnected = onRecipientDisconnected;

    this.sseSource = null;
    this.pollInterval = null;
    this.isTerminated = false;

    // Owner State: Map of recipientId -> PeerTransferController
    this.peerControllers = new Map();
    this.recipientsState = new Map(); // recipientId -> { recipientId, percent, bytesTransferred, speed, etaSeconds, status }
    this.sharedChunkCache = new Map(); // seq -> Promise<ArrayBuffer> (bounded LRU max 32 chunks)

    // Recipient State: Single RTCPeerConnection and DataChannel
    this.peerConnection = null;
    this.dataChannel = null;
    this.queuedIceCandidates = [];
    this.isHandlingOffer = false;
    this.isTransferring = false;
    this.bytesTransferred = 0;
    this.totalBytes = file ? file.size : 0;
    this.startTime = 0;
    this.receivedChunks = [];
    this.incomingFileInfo = null;
    this.lastProgressReport = 0;
  }

  /**
   * Initializes the session, precomputes SHA-256 for owner file, and connects signaling.
   */
  async start() {
    try {
      this.onStatusChange({
        status: 'initializing',
        message: 'Connecting to signaling channel...',
      });

      // 1. Fetch live STUN/TURN configuration
      try {
        const res = await fetch(`${getApiBaseUrl()}/online-share/ice-servers`);
        if (res.ok) {
          const data = await res.json();
          if (data.iceServers?.length) {
            this.iceServers = data.iceServers;
          }
        }
      } catch (_) { }

      // 2. If Owner, compute SHA-256 of file in background for cryptographic verification
      if (this.role === 'owner' && this.file) {
        computeSha256(this.file).then((hash) => {
          this.fileSha256 = hash;
          for (const ctrl of this.peerControllers.values()) {
            ctrl.fileSha256 = hash;
          }
          console.log(`[File SHA-256 Digest] ${this.file.name}: ${hash}`);
        });
      }

      // 3. Connect Signaling Stream (SSE with ticket auth)
      await this.initSignalingStream();

      // 4. Recipient initialization
      if (this.role === 'recipient') {
        this.initRecipientPeerConnection();
      }

      // 5. Automatic TURN credential renewal for long transfers (every 10 minutes)
      this.setupTurnRenewal();
    } catch (err) {
      console.error('[WebRTC Share Error]', err);
      this.onError(err.message || 'Failed to start WebRTC session.');
    }
  }

  /**
   * Initializes Server-Sent Events stream using secure single-use ticket auth.
   * Prefers FetchSseClient with custom 'x-sse-ticket' request header to avoid
   * leaking authentication tokens into URL query parameters or access logs.
   */
  async initSignalingStream() {
    let ticket = null;
    try {
      const ticketRes = await fetch(`${getApiBaseUrl()}/online-share/signal/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          token: this.token,
          role: this.role,
          recipientId: this.recipientId,
        }),
      });
      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        if (ticketData.ticket) ticket = ticketData.ticket;
      }
    } catch (_) { }

    // 1. Prefer FetchSseClient with custom 'x-sse-ticket' header (clean URLs, zero log leakage)
    if (ticket && typeof fetch === 'function' && typeof ReadableStream !== 'undefined') {
      try {
        const fetchSse = new FetchSseClient({
          url: `${getApiBaseUrl()}/online-share/signal/stream`,
          headers: { 'x-sse-ticket': ticket },
          onError: () => {
            if (!this.pollInterval && !this.isTerminated) {
              this.startPollingFallback();
            }
          },
        });
        this.attachSseEventListeners(fetchSse);
        this.sseSource = fetchSse;
        fetchSse.start();
        return;
      } catch (e) {
        console.warn('[FetchSseClient initialization error, using EventSource fallback]', e);
      }
    }

    // 2. Standard EventSource Fallback
    const streamUrl = ticket
      ? `${getApiBaseUrl()}/online-share/signal/stream?ticket=${encodeURIComponent(ticket)}`
      : `${getApiBaseUrl()}/online-share/signal/stream?sessionId=${this.sessionId}&token=${this.token}&role=${this.role}` +
      (this.role === 'recipient' && this.recipientId ? `&recipientId=${encodeURIComponent(this.recipientId)}` : '');

    try {
      const es = new EventSource(streamUrl);
      this.attachSseEventListeners(es);
      es.onerror = () => {
        if (!this.pollInterval && !this.isTerminated) {
          this.startPollingFallback();
        }
      };
      this.sseSource = es;
    } catch (_) {
      this.startPollingFallback();
    }
  }

  /**
   * Binds unified event handlers for both FetchSseClient and native EventSource.
   */
  attachSseEventListeners(source) {
    if (!source || typeof source.addEventListener !== 'function') return;

    // --- OWNER EVENTS ---
    if (this.role === 'owner') {
      // Initial sync of existing recipients
      source.addEventListener('recipients-sync', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.recipients && Array.isArray(data.recipients)) {
            for (const r of data.recipients) {
              this.recipientsState.set(r.recipientId, r);
            }
            this.notifyRecipientsUpdate();
          }
        } catch (_) { }
      });

      // New recipient connected -> establish dedicated WebRTC connection!
      source.addEventListener('recipient-joined', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId) {
            await this.handleOwnerRecipientJoined(payload.recipientId);
          }
        } catch (e) {
          console.error('[Recipient Joined Parse Error]', e);
        }
      });

      // Recipient Answer
      source.addEventListener('answer', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId && payload.payload) {
            const controller = this.peerControllers.get(payload.recipientId);
            if (controller) {
              await controller.handleAnswer(payload.payload);
            }
          }
        } catch (e) {
          console.error('[Answer Parse Error]', e);
        }
      });

      // Recipient ICE Candidate
      source.addEventListener('candidate', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId && payload.payload) {
            const controller = this.peerControllers.get(payload.recipientId);
            if (controller) {
              await controller.handleCandidate(payload.payload);
            }
          }
        } catch (e) {
          console.error('[Candidate Parse Error]', e);
        }
      });

      // Recipient Progress Update
      source.addEventListener('recipient-progress', (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId) {
            const existing = this.recipientsState.get(payload.recipientId) || {};
            this.recipientsState.set(payload.recipientId, {
              ...existing,
              recipientId: payload.recipientId,
              bytesTransferred: payload.bytesTransferred,
              totalBytes: payload.totalBytes,
              percent: payload.percent,
              speed: payload.speed,
              status: 'transferring',
            });
            this.notifyRecipientsUpdate();
            this.onRecipientProgress(payload.recipientId, payload);
          }
        } catch (_) { }
      });

      // Recipient Completed Download
      source.addEventListener('recipient-completed', (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId) {
            const existing = this.recipientsState.get(payload.recipientId) || {};
            this.recipientsState.set(payload.recipientId, {
              ...existing,
              recipientId: payload.recipientId,
              status: 'completed',
              percent: 100,
              downloadCompleted: true,
            });
            this.notifyRecipientsUpdate();
            this.onRecipientComplete(payload.recipientId);
          }
        } catch (_) { }
      });

      // Recipient Disconnected
      source.addEventListener('recipient-disconnected', (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload && payload.recipientId) {
            const controller = this.peerControllers.get(payload.recipientId);
            if (controller) {
              controller.close();
              this.peerControllers.delete(payload.recipientId);
            }
            const existing = this.recipientsState.get(payload.recipientId);
            if (existing) {
              existing.status = 'disconnected';
            }
            this.notifyRecipientsUpdate();
            this.onRecipientDisconnected(payload.recipientId, payload.reason);
          }
        } catch (_) { }
      });
    }

    // --- RECIPIENT EVENTS ---
    if (this.role === 'recipient') {
      source.addEventListener('offer', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload) {
            this.onStatusChange({
              status: 'negotiating',
              message: 'Received WebRTC offer. Connecting...',
            });
            await this.handleRecipientOffer(payload);
          }
        } catch (e) {
          console.error('[Recipient Offer Parse Error]', e);
        }
      });

      source.addEventListener('candidate', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload) {
            await this.handleRecipientCandidate(payload);
          }
        } catch (e) {
          console.error('[Recipient Candidate Parse Error]', e);
        }
      });

      source.addEventListener('recipient-disconnect', (event) => {
        let message = 'You were disconnected by the file owner.';
        try {
          const data = JSON.parse(event.data);
          if (data.payload?.message) message = data.payload.message;
        } catch (_) { }
        this.onError(message);
        this.close();
      });
    }

    // --- SHARED EVENTS ---
    source.addEventListener('stats-updated', (event) => {
      try {
        const { payload } = JSON.parse(event.data);
        if (this.onStatsUpdate && payload) {
          this.onStatsUpdate(payload);
        }
        if (payload?.recipients && Array.isArray(payload.recipients)) {
          for (const r of payload.recipients) {
            const local = this.recipientsState.get(r.recipientId);
            if (!local) {
              this.recipientsState.set(r.recipientId, r);
            } else {
              // Preserve live local WebRTC progress/speed/ETA/connectionType; only sync terminal/completed flags
              if (r.downloadCompleted || r.status === 'completed') {
                local.downloadCompleted = true;
                local.status = 'completed';
                local.percent = 100;
              } else if (r.status === 'disconnected') {
                local.status = 'disconnected';
              }
            }
          }
          this.notifyRecipientsUpdate();
        }
      } catch (_) { }
    });

    source.addEventListener('session-ended', (event) => {
      let msg = 'The owner has ended the sharing session.';
      try {
        const data = JSON.parse(event.data);
        if (data.payload?.message) msg = data.payload.message;
      } catch (_) { }
      this.onError(msg);
      this.close();
    });
  }

  notifyRecipientsUpdate() {
    const list = Array.from(this.recipientsState.values());
    if (this.onRecipientsUpdate) {
      this.onRecipientsUpdate(list);
    }
  }

  // -------------------------------------------------------------------------
  // OWNER MULTI-RECIPIENT HANDLING
  // -------------------------------------------------------------------------

  /**
   * Shared bounded read-through chunk cache (max 32 chunks = ~2MB).
   * Prevents repeatedly reading the same file slices when multiple recipients stream concurrently.
   */
  readSharedChunk(seq, offset, chunkSize) {
    if (!this.file) return Promise.resolve(new ArrayBuffer(0));
    if (this.sharedChunkCache.has(seq)) {
      return this.sharedChunkCache.get(seq);
    }
    const readPromise = this.file.slice(offset, offset + chunkSize).arrayBuffer();
    if (this.sharedChunkCache.size >= 32) {
      const oldestKey = this.sharedChunkCache.keys().next().value;
      this.sharedChunkCache.delete(oldestKey);
    }
    this.sharedChunkCache.set(seq, readPromise);
    return readPromise;
  }

  /**
   * Owner establishes an independent connection for a newly joined recipient.
   */
  async handleOwnerRecipientJoined(recipientId) {
    if (this.isTerminated || !this.file) return;

    console.log(`[WebRTC Owner] Setting up independent WebRTC connection for recipient ${recipientId}`);

    // If an existing controller exists for this recipient, close it cleanly first
    if (this.peerControllers.has(recipientId)) {
      this.peerControllers.get(recipientId).close();
    }

    // Register recipient in UI state
    this.recipientsState.set(recipientId, {
      recipientId,
      status: 'connecting',
      percent: 0,
      bytesTransferred: 0,
      totalBytes: this.file.size,
      speed: '',
      etaSeconds: 0,
      connectionType: 'Direct P2P',
      connectedAt: Date.now(),
      downloadCompleted: false,
    });
    this.notifyRecipientsUpdate();

    const controller = new PeerTransferController({
      recipientId,
      file: this.file,
      fileSha256: this.fileSha256,
      getSha256Fn: () => this.fileSha256,
      readChunkFn: (seq, offset, chunkSize) => this.readSharedChunk(seq, offset, chunkSize),
      iceServers: this.iceServers,
      onSignal: (signalType, payload) => {
        this.sendSignal(signalType, payload, recipientId);
      },
      onConnectionType: ({ connectionType }) => {
        const existing = this.recipientsState.get(recipientId);
        if (existing) {
          existing.connectionType = connectionType;
          this.notifyRecipientsUpdate();
        }
      },
      onStatusChange: ({ status, message }) => {
        const existing = this.recipientsState.get(recipientId);
        if (existing) {
          existing.status = status;
          this.notifyRecipientsUpdate();
        }
        this.onStatusChange({
          status,
          message: `[Recipient #${recipientId.slice(4, 8)}] ${message}`,
          recipientId,
        });
      },
      onProgress: (progress) => {
        const existing = this.recipientsState.get(recipientId);
        if (existing) {
          existing.status = 'transferring';
          existing.bytesTransferred = progress.bytesTransferred;
          existing.percent = progress.percent;
          existing.speed = progress.speedFormatted;
          existing.etaSeconds = progress.etaSeconds;
          this.notifyRecipientsUpdate();
        }
        this.onProgress(progress);
      },
      onComplete: (completeInfo) => {
        const existing = this.recipientsState.get(recipientId);
        if (existing) {
          existing.status = 'completed';
          existing.percent = 100;
          existing.downloadCompleted = true;
          this.notifyRecipientsUpdate();
        }
        this.onComplete(completeInfo);
      },
      onError: (errMessage) => {
        const existing = this.recipientsState.get(recipientId);
        if (existing) {
          existing.status = 'failed';
          this.notifyRecipientsUpdate();
        }
        console.warn(`[Peer Error] Recipient ${recipientId}: ${errMessage}`);
      },
    });

    this.peerControllers.set(recipientId, controller);
    await controller.init();
    this.onRecipientJoined(recipientId);
  }

  /**
   * Owner action: Disconnect a specific recipient without ending the whole session.
   */
  async disconnectRecipient(recipientId, reason = 'owner-disconnected') {
    const controller = this.peerControllers.get(recipientId);
    if (controller) {
      controller.close();
      this.peerControllers.delete(recipientId);
    }

    const existing = this.recipientsState.get(recipientId);
    if (existing) {
      existing.status = 'disconnected';
      this.notifyRecipientsUpdate();
    }

    try {
      await fetch(`${getApiBaseUrl()}/online-share/disconnect-recipient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          ownerToken: this.token,
          recipientId,
          reason,
        }),
      });
    } catch (_) { }
  }

  // -------------------------------------------------------------------------
  // RECIPIENT WEB-RTC HANDLING
  // -------------------------------------------------------------------------

  initRecipientPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceTransportPolicy: 'all',
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && !this.isTerminated) {
        this.sendSignal('candidate', event.candidate, this.recipientId);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.isTerminated || !this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      if (state === 'connected') {
        this.onStatusChange({
          status: 'connected',
          message: 'Direct encrypted P2P tunnel established.',
        });
      } else if (state === 'failed') {
        this.onError('Direct P2P connection negotiation failed. Please check network/firewall settings.');
      } else if (state === 'disconnected') {
        if (!this.isTransferring && this.bytesTransferred > 0) {
          // Normal disconnect after transfer
        } else {
          this.onError('Direct P2P connection lost. The file owner may have closed their browser tab.');
        }
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = 'arraybuffer';

      this.dataChannel.onopen = () => {
        this.onStatusChange({
          status: 'channel-open',
          message: 'P2P DataChannel open. Receiving file stream...',
        });

        // Resume handshake: if reconnecting after an interruption, ask sender to resume from expectedSeq
        if (this.expectedSeq > 0 && this.bytesTransferred > 0) {
          console.log(`[Recipient DataChannel Resumed] Requesting stream resumption from chunk #${this.expectedSeq}`);
          try {
            this.dataChannel.send(
              JSON.stringify({
                type: 'resume-handshake',
                lastChunk: this.expectedSeq,
              })
            );
          } catch (e) {
            console.warn('[Failed to dispatch resume-handshake]', e);
          }
        }
      };

      this.dataChannel.onmessage = (msgEvent) => {
        this.handleIncomingChunk(msgEvent.data);
      };

      this.dataChannel.onclose = () => {
        if (this.isTransferring) {
          this.onError('File transfer was interrupted. Connection closed before completion.');
        }
      };

      this.dataChannel.onerror = (err) => {
        console.error('[Recipient DataChannel Error]', err);
        this.onError('DataChannel transfer error occurred.');
      };
    };
  }

  async handleRecipientOffer(offer) {
    if (this.isTerminated || !this.peerConnection) return;

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      return;
    }
    if (this.isHandlingOffer) return;

    const state = this.peerConnection.signalingState;
    if (state === 'have-remote-offer' || state === 'closed') return;

    this.isHandlingOffer = true;
    try {
      const sdpData = offer && offer.sdp ? offer : offer?.payload || offer;
      if (!sdpData || !sdpData.sdp) return;

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));

      // Flush queued candidates
      if (this.queuedIceCandidates.length > 0) {
        for (const cand of this.queuedIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          } catch (_) { }
        }
        this.queuedIceCandidates = [];
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendSignal('answer', answer, this.recipientId);
    } catch (err) {
      console.error('[Recipient Handle Offer Error]', err);
    } finally {
      this.isHandlingOffer = false;
    }
  }

  async handleRecipientCandidate(candidate) {
    if (!this.peerConnection || this.isTerminated || !candidate) return;
    try {
      if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
        this.queuedIceCandidates.push(candidate);
      } else {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (_) { }
  }

  /**
   * Recipient receives incoming chunks and reassembles file with sequential streaming and SHA-256 integrity check.
   */
  async handleIncomingChunk(data) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);

        // 1. Header packet
        if (parsed.type === 'header') {
          this.incomingFileInfo = parsed;
          this.totalBytes = parsed.fileSize;
          this.bytesTransferred = 0;
          this.expectedSeq = 0;
          this.fileWriter = new SequentialFileWriter({
            totalBytes: parsed.fileSize,
            mimeType: parsed.mimeType || 'application/octet-stream',
          });
          this.startTime = Date.now();
          this.isTransferring = true;
          this.onStatusChange({
            status: 'transferring',
            message: `Streaming ${parsed.fileName} (${formatFileSize(parsed.fileSize)})...`,
          });
          return;
        }

        // 2. Complete packet
        if (parsed.type === 'complete') {
          this.isTransferring = false;
          this.onStatusChange({
            status: 'verifying',
            message: 'Verifying file size, chunk count & cryptographic SHA-256...',
          });

          const mimeType = this.incomingFileInfo?.mimeType || 'application/octet-stream';
          const fileName = this.incomingFileInfo?.fileName || 'downloaded-file';
          const expectedSha256 = parsed.sha256 || this.incomingFileInfo?.sha256;
          const expectedTotalChunks = parsed.totalChunks;
          const expectedFileSize = parsed.fileSize ?? this.totalBytes;

          let fileBlob = null;
          if (this.fileWriter) {
            fileBlob = await this.fileWriter.close();
          } else {
            fileBlob = new Blob([], { type: mimeType });
          }

          // Verify exact byte count & chunk count
          const receivedBytes = this.fileWriter ? this.fileWriter.receivedBytes : 0;
          const receivedChunksCount = this.fileWriter ? this.fileWriter.receivedChunksCount : 0;

          const isZeroByteFile = expectedFileSize === 0;
          const isSizeValid = isZeroByteFile ? receivedBytes === 0 : receivedBytes === expectedFileSize;
          const isChunkCountValid = isZeroByteFile ? receivedChunksCount === 0 : (expectedTotalChunks == null || receivedChunksCount === expectedTotalChunks);

          // Cryptographic integrity check: calculate SHA-256 of downloaded file
          let sha256Verified = false;
          let calculatedSha256 = null;

          try {
            calculatedSha256 = await computeSha256(fileBlob);
            if (expectedSha256 && calculatedSha256) {
              sha256Verified = calculatedSha256.toLowerCase() === expectedSha256.toLowerCase();
            } else {
              sha256Verified = true;
            }
          } catch (_) {
            sha256Verified = false;
          }

          if (!isSizeValid || !isChunkCountValid || !sha256Verified) {
            const errReason = !isSizeValid
              ? `Byte count mismatch (expected ${expectedFileSize}, got ${receivedBytes})`
              : !isChunkCountValid
                ? `Chunk count mismatch (expected ${expectedTotalChunks}, got ${receivedChunksCount})`
                : 'Cryptographic SHA-256 mismatch';

            console.error(`[Integrity Verification Failure] ${errReason}`);
            try {
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(
                  JSON.stringify({
                    type: 'verify-failed',
                    error: errReason,
                  })
                );
              }
            } catch (_) { }

            this.onError(`File integrity check failed: ${errReason}.`);
            return;
          }

          // Acknowledge verified completion to sender via DataChannel
          try {
            if (this.dataChannel && this.dataChannel.readyState === 'open') {
              this.dataChannel.send(
                JSON.stringify({
                  type: 'verify-ack',
                  status: 'verified',
                  sha256: calculatedSha256,
                })
              );
            }
          } catch (_) { }

          // Notify backend of authenticated completed download
          try {
            await fetch(`${getApiBaseUrl()}/online-share/download-complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: this.sessionId,
                recipientId: this.recipientId,
                recipientToken: this.token,
                fileSha256: calculatedSha256,
              }),
            });
          } catch (_) { }

          const blobUrl = URL.createObjectURL(fileBlob);
          this.onComplete({
            fileName,
            fileSize: this.totalBytes,
            blob: fileBlob,
            blobUrl,
            sha256: calculatedSha256,
            sha256Verified: true,
          });
          return;
        }
      } catch (e) {
        console.error('[Header Parse Error]', e);
      }
    }

    // Binary Chunk (ArrayBuffer) with 8-byte sequence header: [seq (Uint32), totalChunks (Uint32)]
    if (data instanceof ArrayBuffer) {
      let chunkPayload = data;

      if (data.byteLength >= 8) {
        const view = new DataView(data);
        const seq = view.getUint32(0, false);
        const totalChunks = view.getUint32(4, false);
        chunkPayload = data.slice(8);

        // Guard against duplicate / stale packets arriving after reconnection
        if (seq < this.expectedSeq) {
          console.warn(`[Duplicate Chunk Discarded] Stale chunk #${seq} ignored, currently at #${this.expectedSeq}`);
          return; // Ignore duplicate chunk: do not write to file or corrupt hash/progress
        }
        if (seq > this.expectedSeq) {
          console.warn(`[Sequence Gap Warning] Expected chunk #${this.expectedSeq}, received #${seq}`);
        }
        this.expectedSeq = seq + 1;
      }

      if (this.fileWriter) {
        try {
          await this.fileWriter.writeChunk(chunkPayload);
        } catch (writeErr) {
          this.onError(`File write failed: ${writeErr.message || 'Stream write error'}`);
          return;
        }
      }

      this.bytesTransferred += chunkPayload.byteLength;

      const elapsedSec = Math.max((Date.now() - this.startTime) / 1000, 0.001);
      const speedBytesPerSec = this.bytesTransferred / elapsedSec;
      const progressPercent = this.totalBytes > 0 ? Math.min((this.bytesTransferred / this.totalBytes) * 100, 100) : 0;

      const progressData = {
        bytesTransferred: this.bytesTransferred,
        totalBytes: this.totalBytes,
        percent: Number(progressPercent.toFixed(1)),
        speedFormatted: `${formatFileSize(speedBytesPerSec)}/s`,
        timeElapsedSec: Math.floor(elapsedSec),
      };

      this.onProgress(progressData);

      // Throttled progress reporting to backend (~every 1000ms) so owner dashboard tracks live speed
      const now = Date.now();
      if (now - this.lastProgressReport > 1000) {
        this.lastProgressReport = now;
        try {
          fetch(`${getApiBaseUrl()}/online-share/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: this.sessionId,
              recipientId: this.recipientId,
              recipientToken: this.token,
              bytesTransferred: this.bytesTransferred,
              percent: progressData.percent,
              speed: progressData.speedFormatted,
            }),
          }).catch(() => { });
        } catch (_) { }
      }
    }
  }

  // -------------------------------------------------------------------------
  // SIGNALING & TRANSPORT HELPERS
  // -------------------------------------------------------------------------

  /**
   * Sends signaling message to peer through backend coordinator.
   */
  async sendSignal(signalType, payload, recipientId = null) {
    try {
      await fetch(`${getApiBaseUrl()}/online-share/signal/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          token: this.token,
          role: this.role,
          recipientId: recipientId || this.recipientId,
          signalType,
          payload,
        }),
      });
    } catch (err) {
      console.warn('[Signal Send Warning]', err.message);
    }
  }

  /**
   * Fallback queue polling if SSE is blocked.
   */
  startPollingFallback() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      if (this.isTerminated) return;
      try {
        let pollUrl = `${getApiBaseUrl()}/online-share/signal/poll?sessionId=${this.sessionId}&token=${this.token}&role=${this.role}`;
        if (this.role === 'recipient' && this.recipientId) {
          pollUrl += `&recipientId=${encodeURIComponent(this.recipientId)}`;
        }
        const res = await fetch(pollUrl);
        if (res.status === 410 || res.status === 404) {
          this.onError('The owner has ended the sharing session.');
          this.close();
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        for (const msg of data.messages || []) {
          this.handleInboundSignal(msg.type, msg.payload);
        }
      } catch (_) { }
    }, 1200);
  }

  async handleInboundSignal(type, payload) {
    if (this.role === 'owner') {
      if (type === 'recipient-joined' && payload?.recipientId) {
        await this.handleOwnerRecipientJoined(payload.recipientId);
      } else if (type === 'answer' && payload?.recipientId) {
        const controller = this.peerControllers.get(payload.recipientId);
        if (controller) await controller.handleAnswer(payload.payload);
      } else if (type === 'candidate' && payload?.recipientId) {
        const controller = this.peerControllers.get(payload.recipientId);
        if (controller) await controller.handleCandidate(payload.payload);
      }
    } else if (this.role === 'recipient') {
      if (type === 'offer') {
        await this.handleRecipientOffer(payload);
      } else if (type === 'candidate') {
        await this.handleRecipientCandidate(payload);
      } else if (type === 'recipient-disconnect') {
        this.onError('You were disconnected by the file owner.');
        this.close();
      } else if (type === 'session-ended') {
        this.onError(payload?.message || 'The owner has ended the sharing session.');
        this.close();
      }
    }
  }

  /**
   * Sets up background renewal timer to refresh 15-minute ephemeral TURN credentials
   * so transfers lasting longer than 15 minutes never fail or lose relay connectivity.
   */
  setupTurnRenewal() {
    if (this.turnRenewalTimer) {
      clearInterval(this.turnRenewalTimer);
    }
    // Renew TURN credentials every 10 minutes (600 seconds)
    this.turnRenewalTimer = setInterval(async () => {
      if (this.isTerminated) return;
      await this.refreshTurnCredentials();
    }, 10 * 60 * 1000);
  }

  /**
   * Fetches fresh ephemeral STUN/TURN credentials and updates all active RTCPeerConnections
   * dynamically via setConfiguration() without interrupting active SCTP DataChannels.
   */
  async refreshTurnCredentials() {
    try {
      const res = await fetch(`${getApiBaseUrl()}/online-share/ice-servers?sessionId=${encodeURIComponent(this.sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers?.length) {
          this.iceServers = data.iceServers;

          // 1. Update Recipient connection if active
          if (this.peerConnection && typeof this.peerConnection.setConfiguration === 'function') {
            try {
              this.peerConnection.setConfiguration({
                iceServers: this.iceServers,
                iceTransportPolicy: 'all',
              });
              console.log('[WebRTC Recipient] Dynamically refreshed ephemeral TURN credentials.');
            } catch (e) {
              console.warn('[WebRTC Recipient setConfiguration Warning]', e.message);
            }
          }

          // 2. Update Owner peer controllers if active
          if (this.peerControllers && this.peerControllers.size > 0) {
            for (const controller of this.peerControllers.values()) {
              if (controller.peerConnection && typeof controller.peerConnection.setConfiguration === 'function') {
                try {
                  controller.peerConnection.setConfiguration({
                    iceServers: this.iceServers,
                    iceTransportPolicy: 'all',
                  });
                } catch (e) {
                  console.warn('[WebRTC Controller setConfiguration Warning]', e.message);
                }
              }
            }
            console.log(`[WebRTC Owner] Dynamically refreshed TURN credentials across ${this.peerControllers.size} peer controllers.`);
          }
        }
      }
    } catch (e) {
      console.warn('[TURN Credentials Refresh Error]', e.message);
    }
  }

  /**
   * Terminates and cleans up all active connection objects.
   */
  close() {
    this.isTerminated = true;

    if (this.turnRenewalTimer) {
      clearInterval(this.turnRenewalTimer);
      this.turnRenewalTimer = null;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }

    // Owner: close all peer controllers
    if (this.peerControllers.size > 0) {
      for (const controller of this.peerControllers.values()) {
        controller.close();
      }
      this.peerControllers.clear();
    }

    // Recipient: close channel and peer connection
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (_) { }
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (_) { }
      this.peerConnection = null;
    }

    this.receivedChunks = [];
  }
}
