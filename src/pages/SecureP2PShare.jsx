import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield,
  Lock,
  UploadCloud,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Clock,
  Users,
  StopCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  ArrowLeft,
  Radio,
  KeyRound,
  FileText,
  QrCode,
  Sparkles,
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import BlurredQrCard from '../components/sharing/BlurredQrCard';
import UnlockQrScannerModal from '../components/sharing/UnlockQrScannerModal';
import { P2PSenderSession, P2PReceiverSession } from '../services/p2pSocketWebRtcService';
import { extractSecureIdFromHash } from '../utils/qrCodeParser';
import { isSecureIdFormat } from '../services/p2pCryptoService';

function formatBytes(bytes = 0) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

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

function formatSpeed(bps = 0) {
  if (!bps || bps <= 0) return '0 KB/s';
  if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  return `${(bps / 1024).toFixed(1)} KB/s`;
}

export default function SecureP2PShare() {
  // Top-level view: 'hub' | 'sender' | 'receiver'
  const [viewMode, setViewMode] = useState('hub');

  // Sender configuration state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [durationSeconds, setDurationSeconds] = useState(900); // 15m default
  const [customMinutes, setCustomMinutes] = useState('');
  const [maxRecipients, setMaxRecipients] = useState(1);
  const [oneTimeAccess, setOneTimeAccess] = useState(false);

  // Sender active session state
  const senderRef = useRef(null);
  const [senderState, setSenderState] = useState({
    status: 'IDLE',
    secureId: '',
    transferId: '',
    unlockSecret: '',
    expiresAt: null,
    remainingSeconds: 0,
    recipients: [],
    recipientCount: 0,
    maxRecipients: 1,
    oneTimeAccess: false,
    oneTimeConsumed: false,
    completedCount: 0,
  });
  const [senderProgress, setSenderProgress] = useState(null);
  const [showQr, setShowQr] = useState(true);
  const [copiedField, setCopiedField] = useState('');
  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [senderError, setSenderError] = useState('');
  const [senderNotice, setSenderNotice] = useState(null);

  // Receiver join & session state
  const receiverRef = useRef(null);
  const [joinSecureId, setJoinSecureId] = useState('');
  const [useLegacyTwoCode, setUseLegacyTwoCode] = useState(false);
  const [joinTransferId, setJoinTransferId] = useState('');
  const [joinUnlockSecret, setJoinUnlockSecret] = useState('');
  const [showJoinSecret, setShowJoinSecret] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [receiverState, setReceiverState] = useState({
    status: 'IDLE',
    transferId: '',
    recipientId: '',
    expiresAt: null,
    remainingSeconds: 0,
    files: [],
    fileCount: 0,
    totalSize: 0,
    peerConnectionState: '',
  });
  const [receiverProgress, setReceiverProgress] = useState(null);
  const [receiverError, setReceiverError] = useState('');
  const [receiverNotice, setReceiverNotice] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Live 1s display countdown driven by authoritative server expiresAt
  useEffect(() => {
    const timer = setInterval(() => {
      if (senderState.expiresAt && !['EXPIRED', 'CANCELLED', 'IDLE'].includes(senderState.status)) {
        const rem = Math.max(0, Math.ceil((senderState.expiresAt - Date.now()) / 1000));
        setSenderState((prev) => ({
          ...prev,
          remainingSeconds: rem,
          status: rem === 0 ? 'EXPIRED' : prev.status,
        }));
      }
      if (receiverState.expiresAt && !['EXPIRED', 'CANCELLED', 'IDLE'].includes(receiverState.status)) {
        const rem = Math.max(0, Math.ceil((receiverState.expiresAt - Date.now()) / 1000));
        setReceiverState((prev) => ({
          ...prev,
          remainingSeconds: rem,
          status: rem === 0 ? 'EXPIRED' : prev.status,
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [senderState.expiresAt, senderState.status, receiverState.expiresAt, receiverState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      senderRef.current?.stopSharing();
      receiverRef.current?.disconnect();
    };
  }, []);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length > 0) {
      setSelectedFiles((prev) => [...prev, ...picked]);
    }
    e.target.value = '';
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSenderError('');
    setSenderNotice(null);

    if (selectedFiles.length === 0) {
      setSenderError('Please select at least one file to share.');
      return;
    }

    let finalDuration = durationSeconds;
    if (durationSeconds === 'custom') {
      const mins = parseInt(customMinutes, 10);
      if (isNaN(mins) || mins < 1 || mins > 1440) {
        setSenderError('Custom duration must be between 1 and 1440 minutes.');
        return;
      }
      finalDuration = mins * 60;
    }

    setIsCreating(true);
    try {
      const session = new P2PSenderSession({
        onStateChange: (patch) => {
          setSenderState((prev) => ({ ...prev, ...patch }));
        },
        onProgress: (prog) => {
          setSenderProgress(prog);
        },
        onNotification: (note) => {
          setSenderNotice(note);
        },
        onError: (errMsg) => {
          setSenderError(errMsg);
        },
      });
      senderRef.current = session;
      await session.startSession({
        files: selectedFiles,
        durationSeconds: finalDuration,
        maxRecipients,
        oneTimeAccess,
      });
      setViewMode('sender');
    } catch (err) {
      setSenderError(err.message || 'Unable to create secure P2P session.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStopSharing = () => {
    setConfirmStopOpen(false);
    senderRef.current?.stopSharing();
    setSenderNotice({ type: 'warning', message: 'Sharing stopped. Active transfers were terminated.' });
  };

  const connectReceiver = async ({ secureId, transferId, unlockSecret }) => {
    setReceiverError('');
    setReceiverNotice(null);
    setReceiverProgress(null);

    const trimmedSecure = (secureId || '').trim();
    if (!useLegacyTwoCode || trimmedSecure) {
      const candidate = trimmedSecure || joinSecureId.trim();
      if (!candidate) {
        setReceiverError('Please enter a Secure ID.');
        return;
      }
      setIsJoining(true);
      try {
        const receiver = new P2PReceiverSession({
          onStateChange: (patch) => {
            setReceiverState((prev) => ({ ...prev, ...patch }));
          },
          onProgress: (prog) => {
            setReceiverProgress(prog);
          },
          onNotification: (note) => {
            setReceiverNotice(note);
          },
          onError: (errMsg) => {
            setReceiverError(errMsg);
          },
        });
        receiverRef.current = receiver;
        await receiver.joinSession({ secureId: candidate });
        setViewMode('receiver');
      } catch (err) {
        setReceiverError(err.message || 'Unable to join secure share.');
      } finally {
        setIsJoining(false);
      }
      return;
    }

    const cleanTid = (transferId ?? joinTransferId).trim();
    const cleanSecret = (unlockSecret ?? joinUnlockSecret).trim();
    if (!cleanTid || !cleanSecret) {
      setReceiverError('Please enter both the Transfer ID and the Secret Unlock Code.');
      return;
    }

    setIsJoining(true);
    try {
      const receiver = new P2PReceiverSession({
        onStateChange: (patch) => {
          setReceiverState((prev) => ({ ...prev, ...patch }));
        },
        onProgress: (prog) => {
          setReceiverProgress(prog);
        },
        onNotification: (note) => {
          setReceiverNotice(note);
        },
        onError: (errMsg) => {
          setReceiverError(errMsg);
        },
      });
      receiverRef.current = receiver;
      await receiver.joinSession({
        transferId: cleanTid,
        unlockSecret: cleanSecret,
      });
      setViewMode('receiver');
    } catch (err) {
      setReceiverError(err.message || 'Unable to join secure share.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    await connectReceiver({
      secureId: useLegacyTwoCode ? '' : joinSecureId,
      transferId: joinTransferId,
      unlockSecret: joinUnlockSecret,
    });
  };

  const handleQrScanSuccess = async (parsed) => {
    setShowQrScanner(false);
    if (!parsed?.ok) return;
    if (parsed.isSecureId && parsed.secureId) {
      setUseLegacyTwoCode(false);
      setJoinSecureId(parsed.secureId);
      await connectReceiver({ secureId: parsed.secureId });
      return;
    }
    if (parsed.code) {
      setUseLegacyTwoCode(true);
      setJoinTransferId(parsed.code);
      if (parsed.unlockSecret) {
        setJoinUnlockSecret(parsed.unlockSecret);
        await connectReceiver({ transferId: parsed.code, unlockSecret: parsed.unlockSecret });
      }
    }
  };

  useEffect(() => {
    const hashSecureId = extractSecureIdFromHash(window.location.hash);
    if (hashSecureId) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setUseLegacyTwoCode(false);
      setJoinSecureId(hashSecureId);
      connectReceiver({ secureId: hashSecureId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetToHub = () => {
    senderRef.current?.stopSharing();
    receiverRef.current?.disconnect();
    setSenderState({
      status: 'IDLE',
      transferId: '',
      unlockSecret: '',
      expiresAt: null,
      remainingSeconds: 0,
      recipients: [],
      recipientCount: 0,
      maxRecipients: 1,
      oneTimeAccess: false,
      oneTimeConsumed: false,
      completedCount: 0,
    });
    setReceiverState({
      status: 'IDLE',
      transferId: '',
      recipientId: '',
      expiresAt: null,
      remainingSeconds: 0,
      files: [],
      fileCount: 0,
      totalSize: 0,
      peerConnectionState: '',
    });
    setSenderProgress(null);
    setReceiverProgress(null);
    setSenderError('');
    setReceiverError('');
    setSenderNotice(null);
    setReceiverNotice(null);
    setViewMode('hub');
  };

  const totalSelectedSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Header Breadcrumb */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          to="/vault"
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Document Vault</span>
        </Link>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-[#E11D2E]/40 text-xs text-red-200 font-semibold">
          <Lock className="w-3.5 h-3.5 text-[#E11D2E]" />
          <span>End-to-End Encrypted • AES-256-GCM + Argon2id • Zero Server Storage</span>
        </div>
      </div>

      {/* Title Section */}
      <div className="w-full max-w-5xl text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2.5">
          <Radio className="w-7 h-7 text-[#E11D2E]" />
          <span>Secure P2P Sharing</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl mx-auto">
          Transfer files directly between browsers over encrypted WebRTC DataChannels. Your files, unlock codes, and encryption keys never touch our servers or cloud storage.
        </p>
      </div>

      {/* HUB VIEW: Two Cards (Send Files & Receive Files) */}
      {viewMode === 'hub' && (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEND FILES CARD */}
          <GlassCard highlightCrimson className="p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E11D2E]/20 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Send Files</h2>
                  <p className="text-xs text-zinc-400">Encrypt locally & stream directly to approved recipients</p>
                </div>
              </div>

              {/* File Picker */}
              <label className="block border-2 border-dashed border-zinc-700 hover:border-[#E11D2E] rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#0B0B0D]/70">
                <input type="file" multiple onChange={handleFilePick} className="hidden" />
                <UploadCloud className="w-8 h-8 text-[#E11D2E] mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">Select one or multiple files</div>
                <div className="text-xs text-zinc-400 mt-1">PDFs, images, videos, archives — never uploaded to backend</div>
              </label>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{selectedFiles.length} file(s) selected</span>
                    <span>Total: {formatBytes(totalSelectedSize)}</span>
                  </div>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#121215] border border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#E11D2E] shrink-0" />
                        <span className="text-white font-medium truncate">{file.name}</span>
                        <span className="text-zinc-500 shrink-0">({formatBytes(file.size)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-zinc-400 hover:text-red-400 p-1 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Duration & Recipient Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    <Clock className="w-3.5 h-3.5 inline mr-1 text-[#E11D2E]" />
                    Sharing Duration
                  </label>
                  <select
                    value={durationSeconds}
                    onChange={(e) =>
                      setDurationSeconds(e.target.value === 'custom' ? 'custom' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#E11D2E]"
                  >
                    <option value={300}>5 minutes</option>
                    <option value={600}>10 minutes</option>
                    <option value={900}>15 minutes (Default)</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                    <option value="custom">Custom duration...</option>
                  </select>
                  {durationSeconds === 'custom' && (
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      placeholder="Minutes (1 - 1440)"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg bg-[#0B0B0D] border border-zinc-700 text-white text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    <Users className="w-3.5 h-3.5 inline mr-1 text-[#E11D2E]" />
                    Max Recipients
                  </label>
                  <select
                    value={maxRecipients == null ? 'unlimited' : maxRecipients}
                    onChange={(e) => setMaxRecipients(e.target.value === 'unlimited' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0B0D] border border-zinc-700 text-white text-xs focus:outline-none focus:border-[#E11D2E]"
                  >
                    <option value={1}>1 recipient (Default)</option>
                    <option value={2}>2 recipients</option>
                    <option value={5}>5 recipients</option>
                    <option value={10}>10 recipients</option>
                    <option value="unlimited">Unlimited recipients</option>
                  </select>
                </div>
              </div>

              {/* One-Time Access Toggle */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-[#0B0B0D] border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">One-Time Access</div>
                  <div className="text-[11px] text-zinc-400">
                    Automatically block all future joins after 1 completed download
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={oneTimeAccess}
                  onChange={(e) => setOneTimeAccess(e.target.checked)}
                  className="w-4 h-4 accent-[#E11D2E]"
                />
              </label>

              {senderError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{senderError}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateSession}
              disabled={isCreating || selectedFiles.length === 0}
              className="sv-btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              <span>{isCreating ? 'Deriving Key & Creating Session...' : 'Create Secure Share'}</span>
            </button>
          </GlassCard>

          {/* RECEIVE FILES CARD */}
          <GlassCard className="p-6 flex flex-col justify-between space-y-5">
            <form onSubmit={handleJoinSession} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Receive Files</h2>
                  <p className="text-xs text-zinc-400">
                    {useLegacyTwoCode
                      ? 'Enter the legacy Transfer ID and Secret Unlock Code from sender'
                      : 'Enter or scan the Secure ID from the sender'}
                  </p>
                </div>
              </div>

              {!useLegacyTwoCode ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Enter Secure ID</label>
                  <input
                    type="text"
                    placeholder="DQV1-..."
                    value={joinSecureId}
                    onChange={(e) => {
                      setJoinSecureId(e.target.value.trim());
                      setReceiverError('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0D] border border-zinc-700 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-[#E11D2E]"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowQrScanner(true)}
                      className="py-2 px-3 text-xs font-semibold text-red-200 hover:text-white bg-red-950/60 hover:bg-[#E11D2E] border border-[#E11D2E]/50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setJoinSecureId(text.trim());
                            setReceiverError('');
                          }
                        } catch {}
                      }}
                      className="py-2 px-3 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Transfer ID</label>
                    <input
                      type="text"
                      placeholder="e.g. DQV-XXXX-XXXX-XXXX"
                      value={joinTransferId}
                      onChange={(e) => setJoinTransferId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0B0D] border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-[#E11D2E]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Secret Unlock Code</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showJoinSecret ? 'text' : 'password'}
                        placeholder="Enter sender's secret unlock code"
                        value={joinUnlockSecret}
                        onChange={(e) => setJoinUnlockSecret(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B0B0D] border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-[#E11D2E]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowJoinSecret(!showJoinSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                        aria-label={showJoinSecret ? 'Hide unlock code' : 'Show unlock code'}
                      >
                        {showJoinSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setUseLegacyTwoCode((v) => !v);
                    setReceiverError('');
                  }}
                  className="text-zinc-400 hover:text-white underline cursor-pointer"
                >
                  {useLegacyTwoCode ? 'Use single Secure ID instead' : 'Have legacy 2-part Transfer ID + Unlock Code?'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0B0D] border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span>Zero-Knowledge Verification</span>
                </div>
                <p>
                  The secret component of your Secure ID never leaves your browser. It derives the AES-256-GCM decryption key locally after sender approval.
                </p>
              </div>

              {receiverError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                  <span>{receiverError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="sv-btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isJoining ? 'Connecting to Session...' : 'Connect & Unlock'}</span>
              </button>
            </form>

            <UnlockQrScannerModal
              isOpen={showQrScanner}
              onClose={() => setShowQrScanner(false)}
              onScanSuccess={handleQrScanSuccess}
              onFallbackManual={() => setShowQrScanner(false)}
            />
          </GlassCard>
        </div>
      )}

      {/* SENDER DASHBOARD */}
      {viewMode === 'sender' && (
        <div className="w-full max-w-4xl space-y-5">
          <GlassCard highlightCrimson className="p-6 space-y-5">
            {/* Top Status & Countdown Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E11D2E]/20 border border-[#E11D2E]/40 text-[#FF4D5E]">
                  {senderState.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-zinc-400">
                  Recipients: <strong className="text-white">{senderState.recipientCount} / {senderState.maxRecipients == null ? '∞' : senderState.maxRecipients}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B0B0D] border border-zinc-800 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span className={senderState.remainingSeconds <= 60 ? 'text-red-400 font-bold' : 'text-white'}>
                    {formatCountdown(senderState.remainingSeconds)}
                  </span>
                </div>

                {!['EXPIRED', 'CANCELLED'].includes(senderState.status) ? (
                  <button
                    type="button"
                    onClick={() => setConfirmStopOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Stop Sharing</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetToHub}
                    className="sv-btn-secondary px-3 py-1.5 text-xs"
                  >
                    New Share
                  </button>
                )}
              </div>
            </div>

            {/* Confirmation Modal Banner */}
            {confirmStopOpen && (
              <div className="p-4 rounded-xl bg-red-950/70 border border-red-700 space-y-3">
                <div className="text-sm font-bold text-white">Stop sharing immediately?</div>
                <p className="text-xs text-red-200">
                  This will immediately terminate active transfers, disconnect all recipients, and permanently cancel this Transfer ID. Note: Stopping sharing cannot remotely delete files a recipient has already finished downloading.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStopSharing}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Yes, Stop Sharing Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStopOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {senderNotice && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                {senderNotice.message}
              </div>
            )}
            {senderError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                {senderError}
              </div>
            )}

            {/* Unified SECURE ID + QR Grid */}
            {!['EXPIRED', 'CANCELLED'].includes(senderState.status) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col justify-center">
                  <div className="p-4 rounded-xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">
                        SECURE ID
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/60 border border-[#E11D2E]/40 text-red-300 font-medium">
                        E2EE Key Embedded · Zero Server Secrets
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs sm:text-sm font-bold text-white font-mono break-all select-all">
                        {senderState.secureId || senderState.transferId}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(senderState.secureId || senderState.transferId, 'secureId')}
                        className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                      >
                        {copiedField === 'secureId' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'secureId' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Share this single Secure ID or let the recipient scan the QR code to connect and decrypt.
                    </p>
                  </div>
                </div>

                {/* QR Code Card (Blurred until Show QR clicked) */}
                <BlurredQrCard
                  value={`${window.location.origin}/p2p-share#id=${encodeURIComponent(senderState.secureId || senderState.transferId)}`}
                  size={112}
                  title="Secure QR Code"
                  subtitle="Scan to connect & unlock"
                  className="bg-[#0B0B0D]"
                />
              </div>
            )}

            {/* Transfer Controls (Pause / Resume) */}
            {['TRANSFERRING', 'PAUSED'].includes(senderState.status) && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0B0D] border border-zinc-800">
                <div className="text-xs text-zinc-300">
                  {senderProgress ? (
                    <span>
                      Sending <strong>{senderProgress.fileName}</strong> • {senderProgress.percentage}% ({formatBytes(senderProgress.bytesTransferred)} / {formatBytes(senderProgress.totalBytes)}) • {formatSpeed(senderProgress.speedBps)} • ETA {senderProgress.etaSeconds}s
                    </span>
                  ) : (
                    <span>Encrypted transfer {senderState.status === 'PAUSED' ? 'paused' : 'in progress'}...</span>
                  )}
                </div>
                {senderState.status === 'TRANSFERRING' ? (
                  <button
                    type="button"
                    onClick={() => senderRef.current?.pauseTransfer()}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => senderRef.current?.resumeTransfer()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}
              </div>
            )}

            {/* Recipients Queue & Approval */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Connected Recipients ({senderState.recipients?.length || 0})
              </h3>
              {(!senderState.recipients || senderState.recipients.length === 0) ? (
                <div className="p-4 rounded-xl bg-[#0B0B0D] border border-zinc-800 text-xs text-zinc-400 text-center">
                  Waiting for recipient to enter Secure ID and request access...
                </div>
              ) : (
                senderState.recipients.map((r) => (
                  <div
                    key={r.recipientId}
                    className="p-3.5 rounded-xl bg-[#0B0B0D] border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-white font-mono">{r.recipientId}</div>
                      <div className="text-[11px] text-zinc-400">
                        Status: <span className="text-zinc-200">{r.status}</span> • Progress: {r.progress || 0}%
                      </div>
                    </div>
                    {!r.approved ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => senderRef.current?.approveRecipient(r.recipientId)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => senderRef.current?.rejectRecipient(r.recipientId)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900 text-zinc-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* RECEIVER DASHBOARD */}
      {viewMode === 'receiver' && (
        <div className="w-full max-w-3xl space-y-5">
          <GlassCard highlightCrimson className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E11D2E]/20 border border-[#E11D2E]/40 text-[#FF4D5E]">
                  {receiverState.status.replace(/_/g, ' ')}
                </span>
                <code className="text-xs text-zinc-400 font-mono">{receiverState.transferId}</code>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B0B0D] border border-zinc-800 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span className={receiverState.remainingSeconds <= 60 ? 'text-red-400 font-bold' : 'text-white'}>
                    {formatCountdown(receiverState.remainingSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToHub}
                  className="sv-btn-secondary px-3 py-1.5 text-xs"
                >
                  Leave Session
                </button>
              </div>
            </div>

            {receiverNotice && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
                {receiverNotice.message}
              </div>
            )}
            {receiverError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#E11D2E] shrink-0" />
                <span>{receiverError}</span>
              </div>
            )}

            {/* Approval Waiting Message */}
            {receiverState.status === 'WAITING_FOR_APPROVAL' && (
              <div className="p-5 rounded-xl bg-[#0B0B0D] border border-zinc-800 text-center space-y-2">
                <div className="text-sm font-bold text-white">Waiting for Sender Approval</div>
                <p className="text-xs text-zinc-400">
                  You have connected to the signaling room ({receiverState.fileCount} file(s), {formatBytes(receiverState.totalSize)}). The sender must click Accept before encrypted transfer begins.
                </p>
              </div>
            )}

            {/* Live Transfer Progress */}
            {receiverProgress && ['TRANSFERRING', 'PAUSED', 'COMPLETED'].includes(receiverState.status) && (
              <div className="p-4 rounded-xl bg-[#0B0B0D] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-semibold">
                    {receiverState.status === 'PAUSED'
                      ? 'Sharing Paused by Sender'
                      : receiverState.status === 'COMPLETED'
                      ? 'Transfer Completed & Verified'
                      : 'Decrypting & Receiving...'}
                  </span>
                  <span className="text-zinc-300 font-mono">{receiverProgress.percentage}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#E11D2E] transition-all duration-200"
                    style={{ width: `${receiverProgress.percentage}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400">
                  <span>
                    {formatBytes(receiverProgress.bytesTransferred)} / {formatBytes(receiverProgress.totalBytes)}
                  </span>
                  <span>
                    {formatSpeed(receiverProgress.speedBps)} • ETA {receiverProgress.etaSeconds}s
                  </span>
                </div>
              </div>
            )}

            {/* Verified Decrypted Files for Download */}
            {receiverState.files && receiverState.files.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Files ({receiverState.files.length})
                </h3>
                {receiverState.files.map((f) => (
                  <div
                    key={f.fileId}
                    className="p-3.5 rounded-xl bg-[#0B0B0D] border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {formatBytes(f.size)} {f.sha256 ? `• SHA-256 Verified (${f.sha256.slice(0, 12)}...)` : ''}
                      </div>
                    </div>
                    {f.completed && f.blobUrl ? (
                      <a
                        href={f.blobUrl}
                        download={f.name}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">Transferring...</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
