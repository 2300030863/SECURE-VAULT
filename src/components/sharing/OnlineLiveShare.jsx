import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Share2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Zap,
  Download,
  Clock,
  HardDrive,
  Users,
  RefreshCw,
  ExternalLink,
  Lock,
  Eye,
  UserX,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { getApiBaseUrl } from '../../config/api';
import { authService } from '../../services/authService';
import { WebRtcShareSession, formatFileSize } from '../../services/webRtcShareService';
import BlurredQrCard from './BlurredQrCard';
import JSZip from 'jszip';

function formatCountdown(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function OnlineLiveShare({
  currentUser = null,
  initialAccessCode = '',
  initialFile = null,
  autoStart = false,
  initialDuration = 15,
  initialMaxDownloads = 5,
  initialDeleteAfterDownload = false,
}) {
  const [activeMode, setActiveMode] = useState(initialAccessCode ? 'recipient' : 'owner'); // 'owner' | 'recipient'

  // ---------------------------------------------------------------------------
  // Owner State
  // ---------------------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState(initialFile || null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [liveDurationMinutes, setLiveDurationMinutes] = useState(initialDuration || 15);
  const [maxDownloadsLimit, setMaxDownloadsLimit] = useState(initialMaxDownloads || 5);
  const [burnOnFinish, setBurnOnFinish] = useState(Boolean(initialDeleteAfterDownload));
  const [showLiveSettings, setShowLiveSettings] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { sessionId, accessCode, ownerToken, fileName, fileSize, expiresAt }
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [ownerShareStatus, setOwnerShareStatus] = useState('idle'); // 'idle' | 'ready' | 'connecting' | 'transferring' | 'complete' | 'error'
  const [ownerStatusMessage, setOwnerStatusMessage] = useState('');
  const [ownerProgress, setOwnerProgress] = useState(null); // { percent, speedFormatted, bytesTransferred, totalBytes }
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [ownerError, setOwnerError] = useState(null);
  const [connectedRecipients, setConnectedRecipients] = useState([]); // Array of recipient tracking objects

  // ---------------------------------------------------------------------------
  // Recipient State
  // ---------------------------------------------------------------------------
  const [inputCode, setInputCode] = useState(initialAccessCode.toUpperCase());
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedFileData, setConnectedFileData] = useState(null); // { fileName, fileSize, mimeType, sessionId, recipientId, recipientToken }
  const [recipientStatus, setRecipientStatus] = useState('idle'); // 'idle' | 'connecting' | 'transferring' | 'complete' | 'offline' | 'error'
  const [recipientStatusMessage, setRecipientStatusMessage] = useState('');
  const [recipientProgress, setRecipientProgress] = useState(null);
  const [downloadedBlobUrl, setDownloadedBlobUrl] = useState(null);
  const [downloadedSha256, setDownloadedSha256] = useState(null); // { hash, verified }
  const [recipientError, setRecipientError] = useState(null);
  const [recipientConnectionType, setRecipientConnectionType] = useState('Direct P2P');

  // References
  const fileInputRef = useRef(null);
  const webRtcSessionRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const activeSessionRef = useRef(null);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // Auto-fill initial access code if provided via props/URL
  useEffect(() => {
    if (initialAccessCode) {
      const code = initialAccessCode.trim().toUpperCase();
      setInputCode(code);
      setActiveMode('recipient');
    }
  }, [initialAccessCode]);

  // Pre-load initial file if passed from main upload tab
  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      setActiveMode('owner');
      if (autoStart) {
        handleStartLiveShare(initialFile);
      }
    }
  }, [initialFile, autoStart]);

  // ---------------------------------------------------------------------------
  // Browser Unload Protection: Instantly end session ONLY on tab close / component unmount
  // (Never run cleanup when activeSession updates!)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleUnloadOrHide = () => {
      const sess = activeSessionRef.current;
      if (sess?.sessionId && sess?.ownerToken) {
        const payload = JSON.stringify({
          sessionId: sess.sessionId,
          ownerToken: sess.ownerToken,
        });

        try {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(`${getApiBaseUrl()}/online-share/end`, blob);
        } catch (_) {}

        try {
          fetch(`${getApiBaseUrl()}/online-share/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        } catch (_) {}
      }
    };

    window.addEventListener('beforeunload', handleUnloadOrHide);
    window.addEventListener('pagehide', handleUnloadOrHide);
    return () => {
      window.removeEventListener('beforeunload', handleUnloadOrHide);
      window.removeEventListener('pagehide', handleUnloadOrHide);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (webRtcSessionRef.current) webRtcSessionRef.current.close();
      handleUnloadOrHide();
    };
  }, []);

  // Live 1-second countdown from session creation; auto-terminates all transfers on expiry
  useEffect(() => {
    if (!activeSession?.expiresAt) {
      setRemainingSeconds(0);
      return;
    }
    const expiryMs = new Date(activeSession.expiresAt).getTime();
    const updateTimer = () => {
      const rem = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
      setRemainingSeconds(rem);
      if (rem <= 0) {
        handleEndSharing('Session duration expired. All active transfers terminated.');
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.sessionId, activeSession?.expiresAt]);

  // ---------------------------------------------------------------------------
  // OWNER ACTIONS
  // ---------------------------------------------------------------------------

  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      setSelectedFile(files[0]);
      setOwnerError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      setSelectedFile(files[0]);
      setOwnerError(null);
    }
  };

  /**
   * Starts a Live Online Share session:
   * 1. Calls POST /api/online-share/create to obtain a 6-character access code.
   * 2. Starts the 10-second presence heartbeat.
   * 3. Initializes the WebRTC P2P listener ready to stream directly from browser memory.
   */
  const handleStartLiveShare = async (fileOverride = null) => {
    let fileToUse = fileOverride || selectedFile;
    const allFiles = selectedFiles.length > 0 ? selectedFiles : (fileToUse ? [fileToUse] : []);

    if (allFiles.length === 0) {
      setOwnerError('Please select at least one file to share.');
      return;
    }

    setIsCreatingSession(true);
    setOwnerError(null);
    setOwnerProgress(null);

    try {
      let shareFileName = allFiles[0].name;

      // MULTIPLE FILES SUPPORT: Package all files into a single ZIP archive in browser memory
      if (allFiles.length > 1) {
        setOwnerStatusMessage('Packaging multiple files into encrypted ZIP in browser memory...');
        const zip = new JSZip();
        for (const file of allFiles) {
          zip.file(file.name, file);
        }
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });
        const zipName = `DocQevrilo_Archive_${allFiles.length}_Files.zip`;
        fileToUse = new File([zipBlob], zipName, { type: 'application/zip' });
        shareFileName = zipName;
      } else {
        fileToUse = allFiles[0];
        shareFileName = allFiles[0].name;
      }

      const authHeaders = authService.getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/online-share/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          fileName: shareFileName,
          fileSize: fileToUse.size,
          mimeType: fileToUse.type || 'application/octet-stream',
          durationMinutes: liveDurationMinutes,
          maxDownloads: maxDownloadsLimit,
          deleteAfterDownload: burnOnFinish,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start sharing session.');
      }

      setActiveSession(data);
      setOwnerShareStatus('ready');
      setOwnerStatusMessage('Session active! Waiting for recipient to connect...');

      // 1. Start 10-second presence heartbeat
      startOwnerHeartbeat(data.sessionId, data.ownerToken);

      // 2. Initialize WebRTC Session as Owner (Sender)
      initOwnerWebRtc(data.sessionId, data.ownerToken, fileToUse);
    } catch (err) {
      console.error('[Start Live Share Error]', err);
      setOwnerError(err.message || 'Could not start live sharing session.');
      setOwnerShareStatus('error');
    } finally {
      setIsCreatingSession(false);
    }
  };

  /**
   * High-frequency 8-second presence heartbeat timer
   * Server terminates session if heartbeats stop for > 30s.
   */
  const startOwnerHeartbeat = (sessionId, ownerToken) => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

    heartbeatTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/online-share/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, ownerToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.viewCount != null || data.downloadCount != null) {
            setActiveSession((prev) =>
              prev
                ? {
                    ...prev,
                    viewCount: data.viewCount != null ? data.viewCount : prev.viewCount,
                    downloadCount: data.downloadCount != null ? data.downloadCount : prev.downloadCount,
                    maxDownloads: data.maxDownloads != null ? data.maxDownloads : prev.maxDownloads,
                  }
                : prev
            );
          }
          if (data.recipients && Array.isArray(data.recipients)) {
            setConnectedRecipients((prev) => {
              const byId = new Map(prev.map((r) => [r.recipientId, r]));
              for (const sr of data.recipients) {
                const local = byId.get(sr.recipientId);
                if (!local) {
                  byId.set(sr.recipientId, sr);
                } else if (sr.downloadCompleted || sr.status === 'completed') {
                  byId.set(sr.recipientId, { ...local, status: 'completed', percent: 100, downloadCompleted: true });
                } else if (sr.status === 'disconnected') {
                  byId.set(sr.recipientId, { ...local, status: 'disconnected' });
                }
              }
              return Array.from(byId.values());
            });
          }
        } else {
          console.warn('[Heartbeat Error] Session may have been ended.');
        }
      } catch (err) {
        console.warn('[Heartbeat Network Error]', err.message);
      }
    }, 8000); // 8-10 second heartbeat
  };

  /**
   * Initializes WebRTC DataChannel engine for the owner (Multi-Recipient)
   */
  const initOwnerWebRtc = (sessionId, ownerToken, file) => {
    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
    }

    const rtcSession = new WebRtcShareSession({
      role: 'owner',
      sessionId,
      token: ownerToken,
      file,
      onStatusChange: ({ status, message, recipientId }) => {
        setOwnerStatusMessage(message);
        if (status === 'recipient-connected') {
          setOwnerShareStatus('connecting');
        } else if (status === 'channel-open') {
          setOwnerShareStatus('transferring');
        }
      },
      onProgress: (progress) => {
        setOwnerShareStatus('transferring');
        setOwnerProgress(progress);
      },
      onRecipientsUpdate: (recipientsList) => {
        setConnectedRecipients(recipientsList);
      },
      onRecipientJoined: (recipientId) => {
        setOwnerStatusMessage(`New recipient connected (${recipientId.slice(0, 8)}). Starting stream...`);
      },
      onRecipientProgress: (recipientId, progress) => {
        // Individual progress tracked via onRecipientsUpdate
      },
      onRecipientComplete: (recipientId) => {
        setOwnerStatusMessage(`Recipient ${recipientId.slice(0, 8)} finished download successfully!`);
        if (burnOnFinish) {
          setOwnerStatusMessage('Transfer complete! Auto-ending session in 4 seconds (Burn on Finish)...');
          setTimeout(() => {
            handleEndSharing();
          }, 4000);
        }
      },
      onRecipientDisconnected: (recipientId, reason) => {
        setOwnerStatusMessage(`Recipient ${recipientId.slice(0, 8)} disconnected (${reason || 'closed'}).`);
      },
      onStatsUpdate: (stats) => {
        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                viewCount: stats.viewCount != null ? stats.viewCount : prev.viewCount,
                downloadCount: stats.downloadCount != null ? stats.downloadCount : prev.downloadCount,
                maxDownloads: stats.maxDownloads != null ? stats.maxDownloads : prev.maxDownloads,
              }
            : prev
        );
      },
      onComplete: () => {
        setOwnerShareStatus('complete');
      },
      onError: (errMessage) => {
        setOwnerError(errMessage);
        setOwnerShareStatus('error');
      },
    });

    webRtcSessionRef.current = rtcSession;
    rtcSession.start();
  };

  /**
   * Disconnects a specific recipient from the owner session
   */
  const handleDisconnectRecipient = async (recipientId) => {
    if (webRtcSessionRef.current) {
      await webRtcSessionRef.current.disconnectRecipient(recipientId);
    }
    setConnectedRecipients((prev) =>
      prev.map((r) => (r.recipientId === recipientId ? { ...r, status: 'disconnected' } : r))
    );
  };

  /**
   * Ends the sharing session immediately
   */
  const handleEndSharing = async (endMessage = '') => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
      webRtcSessionRef.current = null;
    }

    const sess = activeSessionRef.current || activeSession;
    if (sess?.sessionId) {
      try {
        await fetch(`${getApiBaseUrl()}/online-share/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sess.sessionId,
            ownerToken: sess.ownerToken,
          }),
        });
      } catch (_) {}
    }

    setActiveSession(null);
    setConnectedRecipients([]);
    setSelectedFile(null);
    setOwnerShareStatus('idle');
    setOwnerProgress(null);
    setOwnerStatusMessage(typeof endMessage === 'string' ? endMessage : '');
  };

  const copyAccessCode = () => {
    if (activeSession?.accessCode) {
      navigator.clipboard.writeText(activeSession.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const getDirectShareUrl = (code) => {
    if (!code) return '';
    const origin = Capacitor.isNativePlatform()
      ? 'https://secure-vault-delta-virid.vercel.app'
      : window.location.origin;
    return `${origin}/online-share?code=${encodeURIComponent(code)}`;
  };

  const copyShareLink = () => {
    if (activeSession?.accessCode) {
      const shareUrl = getDirectShareUrl(activeSession.accessCode);
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareDirectLink = async () => {
    if (!activeSession?.accessCode) return;
    const shareUrl = getDirectShareUrl(activeSession.accessCode);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'DocQevrilo Direct Document Access',
          text: `Access shared document directly (Code: ${activeSession.accessCode})`,
          url: shareUrl,
        });
        return;
      } catch (_) {}
    }
    copyShareLink();
  };

  // ---------------------------------------------------------------------------
  // RECIPIENT ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Recipient connects to the live session using the access code:
   * 1. Verifies owner is currently online (< 30s heartbeat).
   * 2. If owner is offline, immediately shows clear error.
   * 3. If online, initiates WebRTC DataChannel receiver.
   */
  const handleConnectRecipient = async (e, codeOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanCode = (codeOverride || inputCode || '').trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 4) {
      setRecipientError('Please enter a valid access code.');
      return;
    }

    setIsConnecting(true);
    setRecipientError(null);
    setRecipientProgress(null);
    setConnectedFileData(null);
    setDownloadedBlobUrl(null);

    try {
      // Connect to session and verify presence
      const res = await fetch(`${getApiBaseUrl()}/online-share/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: cleanCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.ownerOffline || res.status === 410) {
          setRecipientStatus('offline');
          throw new Error('This shared file is no longer available. The owner has ended the sharing session.');
        }
        throw new Error(data.error || 'Failed to connect to sharing session.');
      }

      setConnectedFileData({
        sessionId: data.sessionId,
        recipientId: data.recipientId,
        recipientToken: data.recipientToken,
        fileName: data.file.fileName,
        fileSize: data.file.fileSize,
        mimeType: data.file.mimeType,
      });

      setRecipientStatus('connecting');
      setRecipientStatusMessage('Owner is online! Establishing encrypted WebRTC connection...');

      // Start WebRTC recipient receiver with recipientId and token
      initRecipientWebRtc(data.sessionId, data.recipientToken, data.recipientId);
    } catch (err) {
      console.error('[Recipient Connect Error]', err);
      setRecipientError(err.message || 'Unable to connect to live share session.');
      if (err.message.includes('owner has ended') || err.message.includes('no longer available')) {
        setRecipientStatus('offline');
      } else {
        setRecipientStatus('error');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const initRecipientWebRtc = (sessionId, recipientToken, recipientId) => {
    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
    }

    const rtcSession = new WebRtcShareSession({
      role: 'recipient',
      sessionId,
      token: recipientToken,
      recipientId,
      onStatusChange: ({ status, message, connectionType }) => {
        setRecipientStatusMessage(message);
        if (connectionType) setRecipientConnectionType(connectionType);
        if (status === 'channel-open') {
          setRecipientStatus('transferring');
        } else if (status === 'verifying') {
          setRecipientStatus('verifying');
        }
      },
      onProgress: (progress) => {
        setRecipientStatus('transferring');
        setRecipientProgress(progress);
      },
      onComplete: ({ fileName, blobUrl, sha256, sha256Verified }) => {
        setRecipientStatus('complete');
        setDownloadedBlobUrl(blobUrl);
        if (sha256) {
          setDownloadedSha256({ hash: sha256, verified: sha256Verified });
        }
        setRecipientStatusMessage(`Successfully received ${fileName}!`);
      },
      onError: (errMessage) => {
        setRecipientError(errMessage);
        if (errMessage.includes('owner has ended') || errMessage.includes('no longer available') || errMessage.includes('disconnected by')) {
          setRecipientStatus('offline');
        } else {
          setRecipientStatus('error');
        }
      },
    });

    webRtcSessionRef.current = rtcSession;
    rtcSession.start();
  };

  const handleResetRecipient = () => {
    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
      webRtcSessionRef.current = null;
    }
    setConnectedFileData(null);
    setRecipientStatus('idle');
    setRecipientProgress(null);
    setDownloadedBlobUrl(null);
    setRecipientError(null);
    setRecipientStatusMessage('');
  };

  // ---------------------------------------------------------------------------
  // RENDER UI
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272A] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E11D2E] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E11D2E]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E11D2E]">
                Online Sharing (Live P2P)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Memory-to-Memory P2P Stream
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Zero cloud storage. Zero disk writes. Files stream directly between browsers over encrypted WebRTC DataChannels while the owner is online.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-[#18181B] border border-[#27272A] rounded-xl self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveMode('owner')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'owner'
                  ? 'bg-[#E11D2E] text-white shadow-lg shadow-red-900/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Share File (Owner)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('recipient')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'recipient'
                  ? 'bg-[#E11D2E] text-white shadow-lg shadow-red-900/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Receive File (Recipient)</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-[#27272A]/80 text-[11px] text-zinc-300">
          <div className="flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Zero Cloud or Disk Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Direct P2P + TURN Fallback</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Live Presence (30s Timeout)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>P2P DTLS-SRTP Encrypted</span>
          </div>
        </div>

        {/* Enterprise P2P + TURN Transparency Notice */}
        <div className="mt-4 pt-3 border-t border-[#27272A]/50 text-[11px] text-zinc-400 space-y-1">
          <p className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Enterprise P2P + Encrypted TURN Fallback</span>
          </p>
          <p>
            DocQevrilo prioritizes direct browser-to-browser WebRTC DataChannels. If restrictive symmetric enterprise NAT or mobile firewalls prevent direct hole-punching, authenticated encrypted TURN relay provides guaranteed delivery while strictly ensuring zero file bytes are saved on cloud disks or server storage.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* OWNER VIEW                                                            */}
      {/* ===================================================================== */}
      {activeMode === 'owner' && (
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272A] space-y-6">
          {!activeSession ? (
            // Phase 1: File Selection & Generate Access Code
            <div className="space-y-5">
              {!currentUser ? (
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>Live P2P Mode: Direct browser-to-browser encrypted memory stream.</span>
                  </div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono shrink-0">Guest Allowed</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-zinc-300 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>Hosting session as <span className="text-white font-medium">{currentUser.email || currentUser.fullName}</span></span>
                  </div>
                  <span className="text-[10px] bg-red-950 text-red-300 border border-red-800/40 px-2 py-0.5 rounded-full font-mono shrink-0">Authenticated</span>
                </div>
              )}

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-[#E11D2E] bg-red-950/10'
                    : 'border-[#27272A] hover:border-zinc-500 bg-[#0E0E10]'
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto mb-3 text-[#E11D2E]">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFiles.length > 1 ? (
                  <div>
                    <p className="text-sm font-bold text-white truncate max-w-md mx-auto">
                      {selectedFiles.length} files selected (will package into ZIP archive)
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Total: {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))} · Ready for live memory streaming
                    </p>
                    <span className="inline-block mt-3 text-[11px] px-2.5 py-1 rounded-full bg-red-950/40 text-red-300 border border-red-800/40">
                      Click or drag files to replace
                    </span>
                  </div>
                ) : selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-white truncate max-w-md mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {formatFileSize(selectedFile.size)} · Ready for live memory streaming
                    </p>
                    <span className="inline-block mt-3 text-[11px] px-2.5 py-1 rounded-full bg-red-950/40 text-red-300 border border-red-800/40">
                      Click or drag another file to replace
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-white">
                      Drop files here, or <span className="text-[#E11D2E]">browse your device</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Supports multiple files (auto-packages to ZIP) or single files · No application size limits
                    </p>
                  </div>
                )}
              </div>

              {/* Online Sharing Parameters */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0E0E10] border border-[#27272A] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#27272A]/70">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>Live Session Parameters</span>
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800/40 text-red-300">
                    Active While Browser Online
                  </span>
                </div>

                {/* Duration Window */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#E11D2E]" />
                    <span>Live Session Window</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { minutes: 15, label: '15 Minutes (Default)' },
                      { minutes: 30, label: '30 Minutes' },
                      { minutes: 60, label: '1 Hour' },
                      { minutes: 120, label: '2 Hours' },
                    ].map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setLiveDurationMinutes(opt.minutes)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer text-center ${
                          liveDurationMinutes === opt.minutes
                            ? 'bg-[#E11D2E] border-[#E11D2E] text-white shadow-sm'
                            : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-[#3F3F46]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Maximum Completed Transfers */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#E11D2E]" />
                    <span>Maximum Completed Transfers</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { limit: 1, label: '1 Recipient (Single-Use)' },
                      { limit: 3, label: '3 Recipients' },
                      { limit: 5, label: '5 Recipients' },
                      { limit: 'unlimited', label: 'Unlimited (While Online)' },
                    ].map((opt) => (
                      <button
                        key={String(opt.limit)}
                        type="button"
                        onClick={() => setMaxDownloadsLimit(opt.limit)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-all cursor-pointer text-center truncate ${
                          maxDownloadsLimit === opt.limit
                            ? 'bg-[#E11D2E] border-[#E11D2E] text-white shadow-sm'
                            : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-[#3F3F46]'
                        }`}
                        title={opt.label}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-End After 1st Transfer (Burn on Finish) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#27272A]">
                  <div className="space-y-0.5 pr-3">
                    <span className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#E11D2E]" />
                      <span>Auto-End After 1st Transfer (Burn on Finish)</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Instantly terminates the live P2P sharing session and destroys the 6-character access code as soon as the first recipient finishes downloading.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={burnOnFinish}
                      onChange={(e) => setBurnOnFinish(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#E11D2E]"></div>
                  </label>
                </div>

                {/* Sharing Plan Summary */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>
                      Sharing Plan: <strong className="text-white">Online Sharing</strong> · {liveDurationMinutes < 60 ? `${liveDurationMinutes} mins` : `${liveDurationMinutes / 60} hour(s)`} · {maxDownloadsLimit === 'unlimited' ? 'Unlimited recipients' : `${maxDownloadsLimit} max recipient(s)`}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Zero Cloud · WebRTC P2P</span>
                </div>
              </div>

              {ownerError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ownerError}</span>
                </div>
              )}

              {/* Generate Access Code Button */}
              <button
                type="button"
                onClick={handleStartLiveShare}
                disabled={!selectedFile || isCreatingSession}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#E11D2E] hover:bg-[#c91827] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCreatingSession ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Starting Live Session...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Generate Access Code & Start Online Share</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            // Phase 2: Live Sharing Active Dashboard
            <div className="space-y-6">
              {/* Access Code Box */}
              <div className="p-6 rounded-2xl bg-[#0E0E10] border border-[#27272A] text-center space-y-4">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Share this 6-Character Access Code with Recipient
                </span>

                <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-[0.25em] py-2 px-4 rounded-xl bg-[#18181B] border border-red-900/40 text-[#E11D2E] max-w-sm mx-auto shadow-inner">
                  {activeSession.accessCode}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={copyAccessCode}
                    className="px-4 py-2 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="px-4 py-2 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Direct Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={shareDirectLink}
                    className="px-4 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Direct Link</span>
                  </button>
                </div>

                {/* Direct Document Access URL + Blurred QR */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-center gap-4 text-left">
                  <div className="w-full max-w-sm space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-400 block">
                      Direct Document Access Link
                    </span>
                    <div className="px-3 py-2 rounded-lg bg-[#18181B] border border-zinc-800 text-[11px] font-mono text-zinc-200 break-all select-all">
                      {getDirectShareUrl(activeSession.accessCode)}
                    </div>
                  </div>
                  <BlurredQrCard
                    value={getDirectShareUrl(activeSession.accessCode)}
                    size={104}
                    title="Direct Link QR"
                    subtitle="Scan to open document directly"
                  />
                </div>
              </div>

              {/* Live Sharing Status Card */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Online Sharing State
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#121215] border border-zinc-800 font-mono text-white flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#E11D2E]" />
                      <span className={remainingSeconds <= 60 ? 'text-red-400 font-bold' : ''}>
                        {formatCountdown(remainingSeconds)}
                      </span>
                    </span>
                    <span className="hidden sm:inline">
                      Heartbeat: <span className="text-emerald-400 font-mono">Active</span>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-zinc-300">
                  <p className="font-semibold text-white truncate">{activeSession.fileName}</p>
                  <p className="text-zinc-500 mt-0.5">
                    Size: {formatFileSize(activeSession.fileSize)} · Memory streaming mode
                  </p>
                </div>

                {/* Real-time 4-Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Total Visitors</span>
                    </div>
                    <span className="font-mono font-bold text-white text-base mt-1">
                      {activeSession.viewCount || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Users className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />
                      <span>Connected Peers</span>
                    </div>
                    <span className="font-mono font-bold text-white text-base mt-1">
                      {connectedRecipients.filter((r) => r.status !== 'disconnected' && r.status !== 'failed').length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Active Transfers</span>
                    </div>
                    <span className="font-mono font-bold text-white text-base mt-1">
                      {connectedRecipients.filter((r) => r.status === 'transferring' || r.status === 'connected').length}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Completed</span>
                    </div>
                    <span className="font-mono font-bold text-white text-base mt-1">
                      {activeSession.downloadCount || 0}
                      <span className="text-zinc-500 font-normal text-xs">
                        {' '}/ {activeSession.maxDownloads === 'unlimited' || !activeSession.maxDownloads ? '∞' : activeSession.maxDownloads}
                      </span>
                    </span>
                    {Number(activeSession.reservedSlots || 0) > 0 && (
                      <span className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                        {activeSession.reservedSlots} reserved in flight
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs text-zinc-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{ownerStatusMessage || 'Waiting for recipients to connect with access code...'}</span>
                </div>
              </div>

              {/* Multi-Recipient Live Monitor */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#27272A]/80">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#E11D2E]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Connected Recipients & Live Transfers
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    {connectedRecipients.filter((r) => r.status !== 'disconnected').length} active
                  </span>
                </div>

                {connectedRecipients.length === 0 ? (
                  <div className="p-5 rounded-xl bg-[#121215] border border-dashed border-[#27272A] text-center text-xs text-zinc-500">
                    <Radio className="w-5 h-5 mx-auto mb-1 text-zinc-600 animate-pulse" />
                    <span>No recipients connected yet. Waiting for peers to enter access code...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {connectedRecipients.map((recipient, idx) => {
                      const isCompleted = recipient.status === 'completed' || recipient.downloadCompleted;
                      const isVerifying = recipient.status === 'verifying';
                      const isTransferring = recipient.status === 'transferring';
                      const isDisconnected = recipient.status === 'disconnected';
                      const isFailed = recipient.status === 'failed';
                      const connType = recipient.connectionType || 'Direct P2P';

                      return (
                        <div
                          key={recipient.recipientId || idx}
                          className="p-3 rounded-xl bg-[#121215] border border-[#27272A] space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="text-xs font-mono font-bold text-white">
                                Recipient #{idx + 1}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                                ({recipient.recipientId?.slice(0, 8)})
                              </span>

                              {/* Connection Type Diagnostic Pill */}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                                connType.includes('Relayed')
                                  ? 'bg-purple-950/70 border border-purple-700/50 text-purple-300'
                                  : 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                              }`}>
                                <Zap className="w-2.5 h-2.5" />
                                <span>{connType}</span>
                              </span>

                              {/* Status Lifecycle Badge */}
                              {isCompleted ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1 font-mono">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Completed</span>
                                </span>
                              ) : isVerifying ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 flex items-center gap-1 font-mono">
                                  <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                                  <span>Verifying SHA-256</span>
                                </span>
                              ) : isTransferring ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 flex items-center gap-1 font-mono">
                                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                  <span>Streaming ({recipient.percent || 0}%)</span>
                                </span>
                              ) : isFailed ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/60 text-red-300 font-mono">
                                  Failed
                                </span>
                              ) : isDisconnected ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                                  Disconnected
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 flex items-center gap-1 font-mono">
                                  <Activity className="w-3 h-3 text-amber-400 animate-spin" />
                                  <span>Connecting</span>
                                </span>
                              )}
                            </div>

                            {/* Individual Disconnect Action */}
                            {!isDisconnected && !isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleDisconnectRecipient(recipient.recipientId)}
                                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-[11px] text-red-300 flex items-center gap-1 transition-all cursor-pointer"
                                title="Disconnect this recipient"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Disconnect</span>
                              </button>
                            )}
                          </div>

                          {/* Progress Bar for Transferring / Completed */}
                          {(isTransferring || isCompleted || (recipient.bytesTransferred > 0)) && (
                            <div className="space-y-1">
                              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-150 ${
                                    isCompleted
                                      ? 'bg-emerald-500'
                                      : 'bg-gradient-to-r from-red-600 to-[#E11D2E]'
                                  }`}
                                  style={{ width: `${isCompleted ? 100 : recipient.percent || 0}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                                <span>
                                  {formatFileSize(recipient.bytesTransferred || 0)} of{' '}
                                  {formatFileSize(recipient.totalBytes || activeSession.fileSize)}
                                </span>
                                <span>
                                  {isCompleted
                                    ? 'Finished'
                                    : `${recipient.speed || '0 KB/s'}${recipient.etaSeconds > 0 ? ` · ETA ${recipient.etaSeconds}s` : ''}`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Owner Warning & End Sharing */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Keep this browser tab open.</strong> DocQevrilo never stores your file on disk or cloud servers. The file streams directly from your browser memory. Closing this tab or losing internet will immediately end the session.
                </span>
              </div>

              <button
                type="button"
                onClick={handleEndSharing}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>End Sharing Session & Disconnect</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* RECIPIENT VIEW                                                        */}
      {/* ===================================================================== */}
      {activeMode === 'recipient' && (
        <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272A] space-y-6">
          {!connectedFileData ? (
            // Phase 1: Enter Access Code
            <form onSubmit={handleConnectRecipient} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Enter 6-Character Access Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. A7X9K2"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0E0E10] border border-[#27272A] text-white text-center font-mono font-bold text-xl tracking-[0.25em] focus:outline-none focus:border-[#E11D2E] transition-all"
                />
                <p className="text-[11px] text-zinc-500 text-center">
                  The file owner must be online in their DocQevrilo tab for the transfer to succeed.
                </p>
              </div>

              {recipientStatus === 'offline' ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-red-300">
                    <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>Session Unavailable (Owner Offline)</span>
                  </div>
                  <p className="text-red-200/90 leading-relaxed">
                    This shared file is no longer available. The owner has ended the sharing session or turned offline.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-red-900/40 pt-2">
                    Because DocQevrilo never stores files in cloud buckets or server disks, the file existed only in the owner's active browser memory and cannot be recovered or accessed in the future.
                  </p>
                </div>
              ) : recipientError ? (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{recipientError}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isConnecting || !inputCode.trim()}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#E11D2E] hover:bg-[#c91827] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Owner Presence & Connecting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Connect & Download File</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            // Phase 2: Connected & Live Stream Downloading
            <div className="space-y-5">
              {/* File Information Card */}
              <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#E11D2E]" />
                    <span>Shared File</span>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 flex items-center gap-1.5 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>Owner Online</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-cyan-400 font-bold">{recipientConnectionType}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white truncate">{connectedFileData.fileName}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Size: {formatFileSize(connectedFileData.fileSize)} · Direct WebRTC Stream
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs text-zinc-400 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{recipientStatusMessage || 'Negotiating connection with owner...'}</span>
                </div>

                {/* Verifying Cryptographic Integrity State */}
                {recipientStatus === 'verifying' && (
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-300 text-xs flex items-center gap-2.5 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                    <div>
                      <span className="font-bold text-white block">Verifying SHA-256 Checksum</span>
                      <span className="text-zinc-400">Computing cryptographic digest and validating byte count...</span>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {recipientProgress && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white">Receiving direct stream</span>
                      <span className="text-[#E11D2E] font-mono">{recipientProgress.percent}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-[#E11D2E] transition-all duration-150"
                        style={{ width: `${recipientProgress.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span>{formatFileSize(recipientProgress.bytesTransferred)} of {formatFileSize(recipientProgress.totalBytes)}</span>
                      <span>{recipientProgress.speedFormatted}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Complete State */}
              {recipientStatus === 'complete' && (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white block">File Transfer Complete!</span>
                        <span className="text-zinc-400">Streamed directly via WebRTC (Zero Cloud Storage).</span>
                      </div>
                    </div>

                    {downloadedBlobUrl && (
                      <a
                        href={downloadedBlobUrl}
                        download={connectedFileData.fileName}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {connectedFileData.fileName}</span>
                      </a>
                    )}
                  </div>

                  {/* Cryptographic SHA-256 Integrity Verification Badge */}
                  <div className="pt-2 border-t border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold uppercase tracking-wider">
                        {downloadedSha256?.verified ? 'SHA-256 Verified ✓' : 'Integrity Checked'}
                      </span>
                    </div>
                    {downloadedSha256?.hash && (
                      <div
                        className="text-zinc-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/50 truncate max-w-full sm:max-w-md select-all"
                        title={downloadedSha256.hash}
                      >
                        <span className="text-zinc-500 select-none">hash: </span>
                        {downloadedSha256.hash}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {recipientStatus === 'offline' ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-red-300">
                    <AlertCircle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>Session Unavailable (Owner Offline)</span>
                  </div>
                  <p className="text-red-200/90 leading-relaxed">
                    This shared file is no longer available. The owner has ended the sharing session or turned offline.
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-red-900/40 pt-2">
                    Because DocQevrilo never stores files in cloud buckets or server disks, the file existed only in the owner's active browser memory and cannot be recovered or accessed in the future.
                  </p>
                </div>
              ) : recipientError ? (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{recipientError}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleResetRecipient}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#18181B] hover:bg-[#202024] border border-[#27272A] text-zinc-300 transition-all cursor-pointer"
              >
                Disconnect & Enter Different Code
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

