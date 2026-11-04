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
} from 'lucide-react';
import { getApiBaseUrl } from '../../config/api';
import { WebRtcShareSession, formatFileSize } from '../../services/webRtcShareService';

export default function OnlineLiveShare({ currentUser = null, initialAccessCode = '' }) {
  const [activeMode, setActiveMode] = useState(initialAccessCode ? 'recipient' : 'owner'); // 'owner' | 'recipient'

  // ---------------------------------------------------------------------------
  // Owner State
  // ---------------------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { sessionId, accessCode, ownerToken, fileName, fileSize, expiresAt }
  const [ownerShareStatus, setOwnerShareStatus] = useState('idle'); // 'idle' | 'ready' | 'connecting' | 'transferring' | 'complete' | 'error'
  const [ownerStatusMessage, setOwnerStatusMessage] = useState('');
  const [ownerProgress, setOwnerProgress] = useState(null); // { percent, speedFormatted, bytesTransferred, totalBytes }
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [ownerError, setOwnerError] = useState(null);

  // ---------------------------------------------------------------------------
  // Recipient State
  // ---------------------------------------------------------------------------
  const [inputCode, setInputCode] = useState(initialAccessCode.toUpperCase());
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedFileData, setConnectedFileData] = useState(null); // { fileName, fileSize, mimeType, sessionId, recipientToken }
  const [recipientStatus, setRecipientStatus] = useState('idle'); // 'idle' | 'connecting' | 'transferring' | 'complete' | 'offline' | 'error'
  const [recipientStatusMessage, setRecipientStatusMessage] = useState('');
  const [recipientProgress, setRecipientProgress] = useState(null);
  const [downloadedBlobUrl, setDownloadedBlobUrl] = useState(null);
  const [recipientError, setRecipientError] = useState(null);

  // References
  const fileInputRef = useRef(null);
  const webRtcSessionRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  // Auto-fill initial access code if provided via props/URL
  useEffect(() => {
    if (initialAccessCode) {
      setInputCode(initialAccessCode.trim().toUpperCase());
      setActiveMode('recipient');
    }
  }, [initialAccessCode]);

  // ---------------------------------------------------------------------------
  // Browser Unload Protection: End session when tab closes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeSession?.sessionId && activeSession?.ownerToken) {
        const payload = JSON.stringify({
          sessionId: activeSession.sessionId,
          ownerToken: activeSession.ownerToken,
        });
        navigator.sendBeacon(`${getApiBaseUrl()}/online-share/end`, payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession]);

  // Clean up WebRTC & Heartbeat on unmount
  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (webRtcSessionRef.current) webRtcSessionRef.current.close();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // OWNER ACTIONS
  // ---------------------------------------------------------------------------

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOwnerError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOwnerError(null);
    }
  };

  /**
   * Starts a Live Online Share session:
   * 1. Calls POST /api/online-share/create to obtain a 6-character access code.
   * 2. Starts the 10-second presence heartbeat.
   * 3. Initializes the WebRTC P2P listener ready to stream directly from browser memory.
   */
  const handleStartLiveShare = async () => {
    if (!selectedFile) {
      setOwnerError('Please select a file to share.');
      return;
    }

    if (!currentUser) {
      setOwnerError('You must be signed in to create an Online Share session.');
      return;
    }

    setIsCreatingSession(true);
    setOwnerError(null);
    setOwnerProgress(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiBaseUrl()}/online-share/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type || 'application/octet-stream',
          durationMinutes: 120, // 2 hours live window
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
      initOwnerWebRtc(data.sessionId, data.ownerToken, selectedFile);
    } catch (err) {
      console.error('[Start Live Share Error]', err);
      setOwnerError(err.message || 'Could not start live sharing session.');
      setOwnerShareStatus('error');
    } finally {
      setIsCreatingSession(false);
    }
  };

  /**
   * 10-second presence heartbeat timer
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
        if (!res.ok) {
          console.warn('[Heartbeat Error] Session may have been ended.');
        }
      } catch (err) {
        console.warn('[Heartbeat Network Error]', err.message);
      }
    }, 10000);
  };

  /**
   * Initializes WebRTC DataChannel engine for the owner
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
      onStatusChange: ({ status, message }) => {
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
      onComplete: () => {
        setOwnerShareStatus('complete');
        setOwnerStatusMessage('File transfer completed successfully!');
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
   * Ends the sharing session immediately
   */
  const handleEndSharing = async () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
      webRtcSessionRef.current = null;
    }

    if (activeSession?.sessionId) {
      try {
        await fetch(`${getApiBaseUrl()}/online-share/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSession.sessionId,
            ownerToken: activeSession.ownerToken,
          }),
        });
      } catch (_) {}
    }

    setActiveSession(null);
    setSelectedFile(null);
    setOwnerShareStatus('idle');
    setOwnerProgress(null);
    setOwnerStatusMessage('');
  };

  const copyAccessCode = () => {
    if (activeSession?.accessCode) {
      navigator.clipboard.writeText(activeSession.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyShareLink = () => {
    if (activeSession?.accessCode) {
      const shareUrl = `${window.location.origin}/vault?tab=live-share&code=${activeSession.accessCode}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
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
  const handleConnectRecipient = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();

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
        recipientToken: data.recipientToken,
        fileName: data.file.fileName,
        fileSize: data.file.fileSize,
        mimeType: data.file.mimeType,
      });

      setRecipientStatus('connecting');
      setRecipientStatusMessage('Owner is online! Establishing encrypted WebRTC connection...');

      // Start WebRTC recipient receiver
      initRecipientWebRtc(data.sessionId, data.recipientToken);
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

  const initRecipientWebRtc = (sessionId, recipientToken) => {
    if (webRtcSessionRef.current) {
      webRtcSessionRef.current.close();
    }

    const rtcSession = new WebRtcShareSession({
      role: 'recipient',
      sessionId,
      token: recipientToken,
      onStatusChange: ({ status, message }) => {
        setRecipientStatusMessage(message);
        if (status === 'channel-open') {
          setRecipientStatus('transferring');
        }
      },
      onProgress: (progress) => {
        setRecipientStatus('transferring');
        setRecipientProgress(progress);
      },
      onComplete: ({ fileName, blobUrl }) => {
        setRecipientStatus('complete');
        setDownloadedBlobUrl(blobUrl);
        setRecipientStatusMessage(`Successfully received ${fileName}!`);
      },
      onError: (errMessage) => {
        setRecipientError(errMessage);
        if (errMessage.includes('owner has ended') || errMessage.includes('no longer available')) {
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
                Temporary Live File Sharing
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
              <span>Share Live (Owner)</span>
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
              <span>Receive File</span>
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
            <span>Direct P2P Only (No Relays)</span>
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

        {/* Zero-Relay & Browser Memory Transparency Notice */}
        <div className="mt-4 pt-3 border-t border-[#27272A]/50 text-[11px] text-zinc-400 space-y-1">
          <p className="flex items-center gap-1.5 text-zinc-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Strict Direct P2P Guarantee</span>
          </p>
          <p>
            DocQevrilo connects browsers directly via WebRTC STUN hole-punching. To prevent file contents from ever touching a third-party server, <strong>no TURN relay servers are used</strong>. If direct network traversal cannot be established due to symmetric corporate NAT, the transfer stops cleanly with an explicit error rather than routing through an intermediary.
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
              {!currentUser && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    You must be logged in to host a live share. Please sign in or register to generate an access code.
                  </span>
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
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto mb-3 text-[#E11D2E]">
                  <UploadCloud className="w-6 h-6" />
                </div>

                {selectedFile ? (
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
                      Drop any file here, or <span className="text-[#E11D2E]">browse your device</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      No application-level size limits. Large files stream in 64KB backpressured chunks.
                    </p>
                  </div>
                )}
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
                disabled={!selectedFile || isCreatingSession || !currentUser}
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
                    <span>Generate Access Code & Start Live Share</span>
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
                      Live Sharing State
                    </span>
                  </div>

                  <span className="text-[11px] text-zinc-400">
                    Heartbeat: <span className="text-emerald-400 font-mono">10s Active</span>
                  </span>
                </div>

                <div className="text-xs text-zinc-300">
                  <p className="font-semibold text-white truncate">{activeSession.fileName}</p>
                  <p className="text-zinc-500 mt-0.5">
                    Size: {formatFileSize(activeSession.fileSize)} · Memory streaming mode
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs text-zinc-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{ownerStatusMessage || 'Waiting for recipient to connect with access code...'}</span>
                </div>

                {/* Transfer Progress Bar */}
                {ownerProgress && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-white">Streaming to recipient</span>
                      <span className="text-[#E11D2E] font-mono">{ownerProgress.percent}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-600 to-[#E11D2E] transition-all duration-150"
                        style={{ width: `${ownerProgress.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                      <span>{formatFileSize(ownerProgress.bytesTransferred)} of {formatFileSize(ownerProgress.totalBytes)}</span>
                      <span>{ownerProgress.speedFormatted}</span>
                    </div>
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

              {recipientError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{recipientError}</span>
                </div>
              )}

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
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    <span>Owner Online</span>
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
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Download complete! The file has been saved to your device.</span>
                  </div>

                  {downloadedBlobUrl && (
                    <a
                      href={downloadedBlobUrl}
                      download={connectedFileData.fileName}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all whitespace-nowrap"
                    >
                      Save Again
                    </a>
                  )}
                </div>
              )}

              {recipientError && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{recipientError}</span>
                </div>
              )}

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

