/**
 * DocQevrilo – WebRTC Live P2P File Streaming Service
 *
 * Implements high-throughput, memory-bounded, browser-to-browser chunked file transfer:
 * - 64 KB chunks read incrementally using the HTML5 File API.
 * - Backpressure handling using RTCDataChannel.bufferedAmount and bufferedamountlow.
 * - Zero server storage: bytes travel directly between browsers via DTLS-SRTP encrypted SCTP.
 * - Real-time signaling via Server-Sent Events (SSE) with polling fallback.
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
 * Formats byte counts into human-readable sizes (KB, MB, GB).
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export class WebRtcShareSession {
  constructor({
    role, // 'owner' | 'recipient'
    sessionId,
    token, // ownerToken or recipientToken
    file = null, // File object (for owner)
    iceServers = DEFAULT_STUN_SERVERS,
    onStatusChange = () => {},
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {},
  }) {
    this.role = role;
    this.sessionId = sessionId;
    this.token = token;
    this.file = file;
    this.iceServers = iceServers;
    this.onStatusChange = onStatusChange;
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;

    this.peerConnection = null;
    this.dataChannel = null;
    this.sseSource = null;
    this.pollInterval = null;
    this.isTransferring = false;
    this.isTerminated = false;
    this.queuedIceCandidates = [];
    this.isHandlingOffer = false;

    // Transfer stats
    this.bytesTransferred = 0;
    this.totalBytes = file ? file.size : 0;
    this.startTime = 0;
    this.receivedChunks = [];
    this.incomingFileInfo = null;
  }

  /**
   * Initializes the WebRTC connection and starts signaling.
   */
  async start() {
    try {
      this.onStatusChange({ status: 'initializing', message: 'Connecting to signaling channel...' });

      // 1. Fetch live STUN configuration if available
      try {
        const res = await fetch(`${getApiBaseUrl()}/online-share/ice-servers`);
        if (res.ok) {
          const data = await res.json();
          if (data.iceServers?.length) {
            this.iceServers = data.iceServers;
          }
        }
      } catch (_) {}

      // 2. Create RTCPeerConnection (STUN discovery only - ZERO TURN relay)
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceTransportPolicy: 'all',
      });

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Zero-Relay Guarantee: Only allow host and server-reflexive (STUN) candidates.
          // Explicitly reject any relay (TURN) candidates to ensure file data NEVER passes through a third-party server.
          const candidateStr = event.candidate.candidate || '';
          if (event.candidate.type === 'relay' || candidateStr.includes('typ relay')) {
            console.log('[WebRTC Direct P2P] Dropped relay candidate to preserve zero-server guarantee.');
            return;
          }
          this.sendSignal('candidate', event.candidate);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        if (state === 'connected') {
          this.onStatusChange({ status: 'connected', message: 'Direct encrypted P2P tunnel established (Zero Server Relay).' });
        } else if (state === 'failed') {
          if (!this.isTerminated) {
            this.onError(
              'Direct peer-to-peer connection could not be established between these networks. ' +
              'To guarantee zero server storage, DocQevrilo does not route file data through third-party TURN relay servers. ' +
              'Please ensure both devices have standard internet access, or try connecting on the same Wi-Fi / network.'
            );
          }
        } else if (state === 'disconnected') {
          if (!this.isTerminated) {
            this.onError('Direct P2P connection lost. The owner may have closed their browser tab.');
          }
        }
      };

      // 3. Connect Signaling Stream (SSE)
      this.initSignalingStream();

      // 4. Role-specific channel setup
      if (this.role === 'owner') {
        this.setupOwnerDataChannel();
      } else {
        this.setupRecipientDataChannel();
      }
    } catch (err) {
      console.error('[WebRTC Share Error]', err);
      this.onError(err.message || 'Failed to start WebRTC session.');
    }
  }

  /**
   * Initializes Server-Sent Events stream for instant signaling delivery.
   */
  initSignalingStream() {
    const streamUrl = `${getApiBaseUrl()}/online-share/signal/stream?sessionId=${this.sessionId}&token=${this.token}&role=${this.role}`;

    try {
      this.sseSource = new EventSource(streamUrl);

      this.sseSource.addEventListener('recipient-connected', async () => {
        this.onStatusChange({ status: 'recipient-connected', message: 'Recipient connected! Creating WebRTC offer...' });
        if (this.role === 'owner') {
          await this.createAndSendOffer();
        }
      });

      this.sseSource.addEventListener('offer', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (this.role === 'recipient') {
            this.onStatusChange({ status: 'negotiating', message: 'Received offer, negotiating connection...' });
            await this.handleOffer(payload);
          }
        } catch (e) {
          console.error('[Signaling Offer Parse Error]', e);
        }
      });

      this.sseSource.addEventListener('answer', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (this.role === 'owner') {
            await this.handleAnswer(payload);
          }
        } catch (e) {
          console.error('[Signaling Answer Parse Error]', e);
        }
      });

      this.sseSource.addEventListener('candidate', async (event) => {
        try {
          const { payload } = JSON.parse(event.data);
          if (payload) {
            await this.handleCandidate(payload);
          }
        } catch (e) {
          console.error('[Signaling Candidate Parse Error]', e);
        }
      });

      this.sseSource.addEventListener('session-ended', (event) => {
        let msg = 'The owner has ended the sharing session.';
        try {
          const data = JSON.parse(event.data);
          if (data.payload?.message) msg = data.payload.message;
        } catch (_) {}
        this.onError(msg);
        this.close();
      });

      this.sseSource.onerror = () => {
        // Start polling fallback if SSE drops
        if (!this.pollInterval && !this.isTerminated) {
          this.startPollingFallback();
        }
      };
    } catch (_) {
      this.startPollingFallback();
    }
  }

  /**
   * Fallback queue polling if SSE is blocked by client proxy or browser settings.
   */
  startPollingFallback() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      if (this.isTerminated) return;
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/online-share/signal/poll?sessionId=${this.sessionId}&token=${this.token}&role=${this.role}`
        );
        if (!res.ok) return;
        const data = await res.json();
        for (const msg of data.messages || []) {
          this.handleInboundSignal(msg.type, msg.payload);
        }
      } catch (_) {}
    }, 1200);
  }

  async handleInboundSignal(type, payload) {
    if (type === 'recipient-connected' && this.role === 'owner') {
      await this.createAndSendOffer();
    } else if (type === 'offer' && this.role === 'recipient') {
      await this.handleOffer(payload);
    } else if (type === 'answer' && this.role === 'owner') {
      await this.handleAnswer(payload);
    } else if (type === 'candidate') {
      if (payload) {
        await this.handleCandidate(payload);
      }
    } else if (type === 'session-ended') {
      this.onError('This shared file is no longer available. The owner has ended the sharing session.');
      this.close();
    }
  }

  /**
   * Sends signaling messages to peer through backend coordinator.
   */
  async sendSignal(signalType, payload) {
    try {
      await fetch(`${getApiBaseUrl()}/online-share/signal/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          token: this.token,
          role: this.role,
          signalType,
          payload,
        }),
      });
    } catch (err) {
      console.warn('[Signal Send Warning]', err.message);
    }
  }

  /**
   * Owner setup: creates RTCDataChannel and starts listening.
   */
  setupOwnerDataChannel() {
    // ordered: true guarantees chunk delivery in sequential order
    this.dataChannel = this.peerConnection.createDataChannel('docqevrilo-stream', {
      ordered: true,
    });
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;

    this.dataChannel.onopen = () => {
      this.onStatusChange({
        status: 'channel-open',
        message: 'P2P DataChannel open! Starting direct file stream...',
      });
      // Start streaming file directly from browser memory
      this.streamFileToRecipient();
    };

    this.dataChannel.onclose = () => {
      this.onStatusChange({ status: 'channel-closed', message: 'P2P DataChannel closed.' });
    };

    this.dataChannel.onerror = (err) => {
      console.error('[DataChannel Error]', err);
      this.onError('DataChannel transfer error occurred.');
    };
  }

  /**
   * Recipient setup: listens for incoming RTCDataChannel.
   */
  setupRecipientDataChannel() {
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.dataChannel.binaryType = 'arraybuffer';

      this.dataChannel.onopen = () => {
        this.onStatusChange({
          status: 'channel-open',
          message: 'P2P DataChannel open! Receiving file stream...',
        });
      };

      this.dataChannel.onmessage = (msgEvent) => {
        this.handleIncomingChunk(msgEvent.data);
      };

      this.dataChannel.onclose = () => {
        if (!this.isTransferring && this.bytesTransferred > 0) {
          // Normal close after transfer
        } else if (this.isTransferring) {
          this.onError('Transfer was interrupted. The owner closed the connection or went offline.');
        }
      };

      this.dataChannel.onerror = (err) => {
        console.error('[DataChannel Error]', err);
        this.onError('DataChannel transfer error occurred.');
      };
    };
  }

  async handleCandidate(candidate) {
    if (!this.peerConnection || this.isTerminated || !candidate) return;
    try {
      if (!this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
        if (!this.queuedIceCandidates) this.queuedIceCandidates = [];
        this.queuedIceCandidates.push(candidate);
      } else {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (_) {}
  }

  async createAndSendOffer() {
    if (this.isTerminated || !this.peerConnection) return;

    // 1. If dataChannel is already open or already transferring, ignore offer request
    if (this.dataChannel && (this.dataChannel.readyState === 'open' || this.isTransferring)) {
      console.log('[WebRTC Owner] DataChannel already open, skipping offer generation');
      return;
    }

    // 2. Only create offer if signalingState is 'stable'
    if (this.peerConnection.signalingState !== 'stable') {
      console.log('[WebRTC Owner] Signaling state is not stable (' + this.peerConnection.signalingState + '), skipping createOffer');
      return;
    }

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendSignal('offer', offer);
    } catch (err) {
      console.error('[Create Offer Error]', err);
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        this.onError('Failed to generate WebRTC offer.');
      }
    }
  }

  async handleOffer(offer) {
    if (this.isTerminated || !this.peerConnection) return;

    // 1. If dataChannel is already open or already transferring, ignore duplicate offer
    if (this.dataChannel && (this.dataChannel.readyState === 'open' || this.isTransferring)) {
      console.log('[WebRTC Recipient] DataChannel already active, ignoring duplicate offer');
      return;
    }

    // 2. Prevent concurrent handleOffer execution
    if (this.isHandlingOffer) {
      console.log('[WebRTC Recipient] Already processing offer, ignoring concurrent offer');
      return;
    }

    // 3. Check signaling state: only set remote offer if stable or have-local-pranswer
    const state = this.peerConnection.signalingState;
    if (state === 'have-remote-offer') {
      console.log('[WebRTC Recipient] Already in have-remote-offer state, ignoring duplicate');
      return;
    }
    if (state === 'closed') return;

    this.isHandlingOffer = true;
    try {
      const sdpData = offer && offer.sdp ? offer : (offer?.payload || offer);
      if (!sdpData || !sdpData.sdp) {
        console.warn('[WebRTC Recipient] Invalid offer SDP:', offer);
        return;
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));

      // Flush queued candidates
      if (this.queuedIceCandidates?.length) {
        for (const cand of this.queuedIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
          } catch (_) {}
        }
        this.queuedIceCandidates = [];
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      await this.sendSignal('answer', answer);
    } catch (err) {
      console.error('[Handle Offer Error]', err);
      // Only emit error if connection is not already active
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        this.onError('Failed to accept WebRTC offer.');
      }
    } finally {
      this.isHandlingOffer = false;
    }
  }

  async handleAnswer(answer) {
    if (this.isTerminated || !this.peerConnection) return;
    if (this.peerConnection.signalingState !== 'have-local-offer') {
      console.log('[WebRTC Owner] Ignoring answer: state is', this.peerConnection.signalingState);
      return;
    }
    try {
      const sdpData = answer && answer.sdp ? answer : (answer?.payload || answer);
      if (sdpData && sdpData.sdp) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));
        // Flush queued candidates
        if (this.queuedIceCandidates?.length) {
          for (const cand of this.queuedIceCandidates) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            } catch (_) {}
          }
          this.queuedIceCandidates = [];
        }
      }
    } catch (err) {
      console.error('[Handle Answer Error]', err);
    }
  }

  /**
   * Owner: Streams file chunk-by-chunk using backpressure flow control.
   */
  async streamFileToRecipient() {
    if (!this.file || !this.dataChannel || this.dataChannel.readyState !== 'open') return;

    this.isTransferring = true;
    this.bytesTransferred = 0;
    this.totalBytes = this.file.size;
    this.startTime = Date.now();

    // 1. Send metadata header packet
    const header = {
      type: 'header',
      fileName: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type || 'application/octet-stream',
      chunkSize: CHUNK_SIZE,
      totalChunks: Math.ceil(this.file.size / CHUNK_SIZE),
    };
    this.dataChannel.send(JSON.stringify(header));

    // 2. Stream chunks with backpressure
    let offset = 0;

    const sendNextChunk = async () => {
      while (offset < this.file.size) {
        if (this.isTerminated || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          return;
        }

        // Apply backpressure if buffer exceeds limit
        if (this.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
          // Pause and wait for bufferedamountlow event
          this.dataChannel.onbufferedamountlow = () => {
            this.dataChannel.onbufferedamountlow = null;
            sendNextChunk();
          };
          return;
        }

        const slice = this.file.slice(offset, offset + CHUNK_SIZE);
        const arrayBuffer = await slice.arrayBuffer();

        this.dataChannel.send(arrayBuffer);
        offset += arrayBuffer.byteLength;
        this.bytesTransferred = offset;

        // Progress notification
        const elapsedSec = Math.max((Date.now() - this.startTime) / 1000, 0.001);
        const speedBytesPerSec = this.bytesTransferred / elapsedSec;
        const progressPercent = Math.min((this.bytesTransferred / this.totalBytes) * 100, 100);

        this.onProgress({
          bytesTransferred: this.bytesTransferred,
          totalBytes: this.totalBytes,
          percent: Number(progressPercent.toFixed(1)),
          speedFormatted: `${formatFileSize(speedBytesPerSec)}/s`,
          timeElapsedSec: Math.floor(elapsedSec),
        });
      }

      // 3. Send complete packet
      if (offset >= this.file.size) {
        this.dataChannel.send(JSON.stringify({ type: 'complete' }));
        this.isTransferring = false;
        this.onComplete({
          fileName: this.file.name,
          fileSize: this.file.size,
          bytesTransferred: this.bytesTransferred,
        });
      }
    };

    sendNextChunk();
  }

  /**
   * Recipient: Handles incoming data packets (header, binary chunks, complete).
   */
  async handleIncomingChunk(data) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);

        // Header packet
        if (parsed.type === 'header') {
          this.incomingFileInfo = parsed;
          this.totalBytes = parsed.fileSize;
          this.bytesTransferred = 0;
          this.receivedChunks = [];
          this.startTime = Date.now();
          this.isTransferring = true;
          this.onStatusChange({
            status: 'transferring',
            message: `Streaming ${parsed.fileName} (${formatFileSize(parsed.fileSize)})...`,
          });
          return;
        }

        // Complete packet
        if (parsed.type === 'complete') {
          this.isTransferring = false;
          const mimeType = this.incomingFileInfo?.mimeType || 'application/octet-stream';
          const fileName = this.incomingFileInfo?.fileName || 'downloaded-file';

          if (this.fileWritableStream) {
            try {
              await this.fileWritableStream.close();
              this.fileWritableStream = null;
            } catch (_) {}
            this.onComplete({
              fileName,
              fileSize: this.totalBytes,
              streamSaved: true,
            });
            return;
          }

          const fileBlob = new Blob(this.receivedChunks, { type: mimeType });
          const blobUrl = URL.createObjectURL(fileBlob);

          this.onComplete({
            fileName,
            fileSize: this.totalBytes,
            blob: fileBlob,
            blobUrl,
          });
          return;
        }
      } catch (e) {
        console.error('[Header Parse Error]', e);
      }
    }

    // Binary Chunk (ArrayBuffer)
    if (data instanceof ArrayBuffer) {
      if (this.fileWritableStream) {
        try {
          this.fileWritableStream.write(data);
        } catch (_) {
          this.receivedChunks.push(data);
        }
      } else {
        this.receivedChunks.push(data);
      }
      this.bytesTransferred += data.byteLength;

      const elapsedSec = Math.max((Date.now() - this.startTime) / 1000, 0.001);
      const speedBytesPerSec = this.bytesTransferred / elapsedSec;
      const progressPercent = this.totalBytes > 0
        ? Math.min((this.bytesTransferred / this.totalBytes) * 100, 100)
        : 0;

      this.onProgress({
        bytesTransferred: this.bytesTransferred,
        totalBytes: this.totalBytes,
        percent: Number(progressPercent.toFixed(1)),
        speedFormatted: `${formatFileSize(speedBytesPerSec)}/s`,
        timeElapsedSec: Math.floor(elapsedSec),
      });
    }
  }

  /**
   * Terminates and cleans up all active connection objects.
   */
  close() {
    this.isTerminated = true;
    this.isTransferring = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch (_) {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (_) {}
      this.peerConnection = null;
    }

    this.receivedChunks = [];
  }
}

