import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { apiUrl } from '../config/api';
import {
  Shield,
  UploadCloud,
  KeyRound,
  FileText,
  Lock,
  Unlock,
  Copy,
  Check,
  Download,
  ExternalLink,
  Clock,
  AlertCircle,
  FileCheck,
  RefreshCw,
  CheckCircle2,
  Database,
  X,
  File,
  FileImage,
  FileType,
  Paperclip,
  AlignLeft,
  Clipboard,
  FileCode,
  Cloud,
  Radio,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  Plus,
  Globe,
  Flame,
  HardDrive,
  Tag,
  Sparkles,
  Music,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Share2,
  FolderLock,
  Layers,
  Send,
  StopCircle,
  Play,
  Pause,
  QrCode,
  XCircle,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import StorageModeSelector from '../components/sharing/StorageModeSelector';
import TemporaryStorageSettings from '../components/sharing/TemporaryStorageSettings';
import OnlineSharingSettings from '../components/sharing/OnlineSharingSettings';
import MySharedDocuments from '../components/sharing/MySharedDocuments';
import AiDocumentModal from '../components/ai/AiDocumentModal';
import SupportedFormatsModal from '../components/SupportedFormatsModal';
import OnlineLiveShare from '../components/sharing/OnlineLiveShare';
import BlurredQrCard from '../components/sharing/BlurredQrCard';
import UnlockQrScannerModal from '../components/sharing/UnlockQrScannerModal';
import { extractSecureIdFromHash } from '../utils/qrCodeParser';
import { isSecureIdFormat } from '../services/p2pCryptoService';
import { WebRtcShareSession, formatFileSize } from '../services/webRtcShareService';
import { P2PSenderSession, P2PReceiverSession } from '../services/p2pSocketWebRtcService';
import JSZip from 'jszip';

function formatP2PCountdown(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatP2PSpeed(bps = 0) {
  if (!bps || bps <= 0) return '0 KB/s';
  if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  return `${(bps / 1024).toFixed(1)} KB/s`;
}

export default function VaultDashboard({ currentUser }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation Tabs: 'upload' | 'access' | 'documents'
  const [activeTab, setActiveTab] = useState('upload');
  const [showFormatsModal, setShowFormatsModal] = useState(false);

  // Auth Redirect State
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // System & Database State
  const [dbStatus, setDbStatus] = useState({
    isTiDBConnected: false,
    dbMode: 'checking...',
    host: null,
  });
  const [storageStatus, setStorageStatus] = useState({
    isConnected: false,
    isConfigured: false,
    bucket: null,
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  // User Documents Cache for KPIs
  const [userDocs, setUserDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Upload & Storage Mode State
  const [wizardStep, setWizardStep] = useState(1); // 1..7 guided wizard
  const [hasSelectedEntryMode, setHasSelectedEntryMode] = useState(false);
  const [showFormatsGuide, setShowFormatsGuide] = useState(false);
  const [entryMode, setEntryMode] = useState('file'); // 'file' | 'text'
  const [storageMode, setStorageMode] = useState(''); // '' (unselected) | 'online' | 'temporary' | 'long_term'
  const [maxDownloads, setMaxDownloads] = useState(5); // 1 | 5 | 10 | 'unlimited'
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [liveShareInitialFile, setLiveShareInitialFile] = useState(null);
  const [liveShareAutoStart, setLiveShareAutoStart] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [expiryOption, setExpiryOption] = useState('2h');
  const [customMode, setCustomMode] = useState('duration'); // 'duration' | 'date'
  const [customDurationValue, setCustomDurationValue] = useState(3);
  const [customDurationUnit, setCustomDurationUnit] = useState('d'); // 'm' | 'h' | 'd' | 'w' | 'mo'
  const [customDateTime, setCustomDateTime] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const [textCopySuccess, setTextCopySuccess] = useState(false);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const [aiModalDoc, setAiModalDoc] = useState(null);
  const [showSettingsAccordion, setShowSettingsAccordion] = useState(true);
  const fileInputRef = useRef(null);

  // Secure P2P Live Sharing Session State (replaces legacy Online Sharing under Storage Policy & Access Rules)
  const [activeLiveSession, setActiveLiveSession] = useState(null); // { transferId, unlockSecret, expiresAt, status, ... }
  const [isStartingLiveShare, setIsStartingLiveShare] = useState(false);
  const [liveShareStatusMessage, setLiveShareStatusMessage] = useState('');
  const [liveShareProgress, setLiveShareProgress] = useState(null);
  const [copiedLiveCode, setCopiedLiveCode] = useState(false);
  const [copiedLiveSecret, setCopiedLiveSecret] = useState(false);
  const [showP2PSecret, setShowP2PSecret] = useState(false);
  const [confirmStopP2P, setConfirmStopP2P] = useState(false);
  const secureP2PRef = useRef(null);

  // Clean up Secure P2P session on unmount
  useEffect(() => {
    return () => {
      secureP2PRef.current?.stopSharing();
    };
  }, []);

  // Live 1-second countdown from session creation
  useEffect(() => {
    if (!activeLiveSession?.expiresAt || ['EXPIRED', 'CANCELLED'].includes(activeLiveSession.status)) {
      return;
    }
    const timer = setInterval(() => {
      setActiveLiveSession((prev) => {
        if (!prev?.expiresAt || ['EXPIRED', 'CANCELLED'].includes(prev.status)) return prev;
        const rem = Math.max(0, Math.ceil((prev.expiresAt - Date.now()) / 1000));
        return {
          ...prev,
          remainingSeconds: rem,
          status: rem === 0 ? 'EXPIRED' : prev.status,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeLiveSession?.transferId, activeLiveSession?.expiresAt, activeLiveSession?.status]);

  const handleEndLiveShare = () => {
    setConfirmStopP2P(false);
    secureP2PRef.current?.stopSharing();
    secureP2PRef.current = null;
    setActiveLiveSession(null);
    setLiveShareProgress(null);
    setLiveShareStatusMessage('');
    setWizardStep(1);
  };

  const handleResetWizard = () => {
    setUploadResult(null);
    setUploadError('');
    setUploadProgress(0);
    setSelectedFiles([]);
    setDocumentName('');
    setTextContent('');
    setTextTitle('');
    setStorageMode('');
    setHasSelectedEntryMode(false);
    setWizardStep(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Access State
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const accessCodeInputRef = useRef(null);
  const p2pSecretInputRef = useRef(null);
  const [isSecureP2PUnlock, setIsSecureP2PUnlock] = useState(false);
  const [p2pUnlockSecret, setP2pUnlockSecret] = useState('');
  const [showP2PUnlockSecret, setShowP2PUnlockSecret] = useState(false);
  const [p2pReceiverState, setP2pReceiverState] = useState(null);
  const [p2pReceiverProgress, setP2pReceiverProgress] = useState(null);
  const p2pReceiverRef = useRef(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedDoc, setUnlockedDoc] = useState(null);
  const [unlockedLiveShareCode, setUnlockedLiveShareCode] = useState(null);
  const [accessError, setAccessError] = useState('');

  const trimmedAccessInput = accessCodeInput.trim();
  const isUnifiedSecureId = isSecureIdFormat(trimmedAccessInput) || /^DQV1-/i.test(trimmedAccessInput);
  const isLegacyP2PCode = !isUnifiedSecureId && /^DQV-/i.test(trimmedAccessInput);
  const isP2PTransferCode = isSecureP2PUnlock || isUnifiedSecureId || isLegacyP2PCode;

  const handleResetP2PReceiver = () => {
    p2pReceiverRef.current?.disconnect();
    p2pReceiverRef.current = null;
    setP2pReceiverState(null);
    setP2pReceiverProgress(null);
    setAccessError('');
  };

  useEffect(() => {
    return () => {
      p2pReceiverRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (
      !p2pReceiverState?.expiresAt ||
      ['COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(p2pReceiverState.status)
    ) {
      return;
    }
    const timer = setInterval(() => {
      setP2pReceiverState((prev) => {
        if (!prev?.expiresAt) return prev;
        const rem = Math.max(0, Math.ceil((prev.expiresAt - Date.now()) / 1000));
        return {
          ...prev,
          remainingSeconds: rem,
          status: rem === 0 ? 'EXPIRED' : prev.status,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [p2pReceiverState?.transferId, p2pReceiverState?.expiresAt, p2pReceiverState?.status]);

  // Auto-fill code from URL query param if present (?code=ABC or ?tab=online-share)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'live-share' || tabFromUrl === 'online-share' || tabFromUrl === 'live' || tabFromUrl === 'online') {
      setActiveTab('upload');
      setEntryMode('file');
      setHasSelectedEntryMode(true);
      setStorageMode('online');
      setWizardStep(2);
    }
    const hashSecureId = extractSecureIdFromHash(window.location.hash);
    if (hashSecureId) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setAccessCodeInput(hashSecureId);
      setIsSecureP2PUnlock(true);
      setActiveTab('access');
      joinSecureP2PByCode(hashSecureId);
    }
    const codeFromUrl = searchParams.get('code') || searchParams.get('c') || searchParams.get('transferId');
    if (codeFromUrl && codeFromUrl.trim()) {
      const trimmed = codeFromUrl.trim();
      setAccessCodeInput(trimmed);
      setActiveTab('access');
      if (/^DQV1-/i.test(trimmed)) {
        setIsSecureP2PUnlock(true);
        joinSecureP2PByCode(trimmed);
      } else if (/^DQV-/i.test(trimmed)) {
        setIsSecureP2PUnlock(true);
      } else {
        unlockVaultAccessCode(trimmed);
      }
    }
  }, [searchParams]);

  // Helper date generators for datetime-local picker
  const getDefaultDateTime = () => {
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const getMinDateTime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  // Helper to compute live preview of expiration
  const getExpiryPreview = () => {
    if (expiryOption === 'never') {
      return {
        text: 'Never expires (Document stays permanently accessible)',
        badge: 'Permanent',
        isNever: true,
      };
    }

    const now = new Date();
    let target = null;

    if (expiryOption === 'custom') {
      if (customMode === 'date') {
        if (!customDateTime) {
          return { text: 'Choose date & time below', isCustom: true, isPending: true };
        }
        const parsed = new Date(customDateTime);
        if (isNaN(parsed.getTime())) {
          return { text: 'Invalid date/time format', isCustom: true, isError: true };
        }
        if (parsed <= now) {
          return { text: 'Date must be set in the future', isCustom: true, isError: true };
        }
        target = parsed;
      } else {
        const val = Math.max(1, parseInt(customDurationValue, 10) || 1);
        let ms = 0;
        if (customDurationUnit === 'm') ms = val * 60 * 1000;
        else if (customDurationUnit === 'h') ms = val * 60 * 60 * 1000;
        else if (customDurationUnit === 'd') ms = val * 24 * 60 * 60 * 1000;
        else if (customDurationUnit === 'w') ms = val * 7 * 24 * 60 * 60 * 1000;
        else if (customDurationUnit === 'mo') ms = val * 30 * 24 * 60 * 60 * 1000;
        target = new Date(now.getTime() + ms);
      }
    } else {
      const match = expiryOption.match(/^(\d+)(m|h|d|w|mo)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2];
        let ms = 0;
        if (unit === 'm') ms = val * 60 * 1000;
        else if (unit === 'h') ms = val * 60 * 60 * 1000;
        else if (unit === 'd') ms = val * 24 * 60 * 60 * 1000;
        else if (unit === 'w') ms = val * 7 * 24 * 60 * 60 * 1000;
        else if (unit === 'mo') ms = val * 30 * 24 * 60 * 60 * 1000;
        target = new Date(now.getTime() + ms);
      }
    }

    if (!target) return null;

    const formatted = target.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (60 * 1000));
    const diffHours = Math.round(diffMs / (3600 * 1000));
    const diffDays = Math.round(diffMs / (86400 * 1000));
    let relativeStr = '';
    if (diffMins < 60) {
      relativeStr = `in ${Math.max(1, diffMins)} min${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 48) {
      relativeStr = `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      relativeStr = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }

    return {
      text: `Expires: ${formatted} (${relativeStr})`,
      badge: relativeStr,
      target,
    };
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(apiUrl('/status'));
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data.database || {});
        setStorageStatus(data.storage || {});
      }
    } catch {
      setDbStatus({ isTiDBConnected: false, dbMode: 'offline' });
      setStorageStatus({ isConnected: false });
    }
  };

  const fetchUserDocuments = async () => {
    if (!currentUser) return;
    setIsLoadingDocs(true);
    try {
      const res = await fetch(apiUrl('/documents/mine'), {
        headers: authService.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUserDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load user documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    if (currentUser) {
      fetchUserDocuments();
      const interval = setInterval(fetchUserDocuments, 15000);
      return () => clearInterval(interval);
    } else {
      setUserDocs([]);
    }
  }, [currentUser]);

  // Auth redirect countdown effect
  useEffect(() => {
    let timer;
    if (authPromptOpen) {
      setRedirectCountdown(3);
      timer = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/register');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authPromptOpen, navigate]);

  // Upload handlers with authentication guard
  const handleFileSelect = (e) => {
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    const incoming = Array.from(e.target.files || []);
    if (incoming.length > 0) {
      setSelectedFiles((prev) => {
        const combined = [...prev, ...incoming];
        return combined.slice(0, 20);
      });
      setUploadError('');
      setUploadResult(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    const incoming = Array.from(e.dataTransfer.files || []);
    if (incoming.length > 0) {
      setSelectedFiles((prev) => {
        const combined = [...prev, ...incoming];
        return combined.slice(0, 20);
      });
      setUploadError('');
      setUploadResult(null);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setDocumentName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e) => {
    e?.preventDefault?.();
    if (isUploading || isStartingLiveShare) return;
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    if ((entryMode === 'file' || entryMode === 'both') && selectedFiles.length === 0) {
      setUploadError('Please select at least one file to upload.');
      setWizardStep(2);
      return;
    }
    if ((entryMode === 'text' || entryMode === 'both') && !textContent.trim()) {
      setUploadError('Please enter text content to secure.');
      setWizardStep(2);
      return;
    }
    if (!storageMode) {
      setUploadError('Please choose a sharing method before continuing.');
      setWizardStep(4);
      return;
    }
    setWizardStep(6);

    const noteFile =
      entryMode === 'both' && textContent.trim()
        ? new window.File(
            [textContent.trim()],
            `${(textTitle.trim() || 'Secret_Note').replace(/\.txt$/i, '')}.txt`,
            { type: 'text/plain' }
          )
        : null;
    const filesForShare = noteFile ? [...selectedFiles, noteFile] : selectedFiles;

    // SECURE P2P ONLINE SHARING (E2EE AES-256-GCM + Argon2id + Socket.IO + WebRTC):
    if (storageMode === 'online' && (entryMode === 'file' || entryMode === 'both')) {
      setIsStartingLiveShare(true);
      setUploadError('');
      setLiveShareProgress(null);

      let durationSeconds = 900; // 15 minutes default
      if (expiryOption === 'custom') {
        const val = Math.max(1, parseInt(customDurationValue, 10) || 15);
        const mult = customDurationUnit === 'h' ? 3600 : customDurationUnit === 'd' ? 86400 : 60;
        durationSeconds = Math.min(Math.max(val * mult, 60), 86400);
      } else {
        const m = String(expiryOption).match(/^(\d+)(m|h)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          durationSeconds = Math.min(Math.max(n * (m[2].toLowerCase() === 'h' ? 3600 : 60), 60), 86400);
        }
      }

      const parsedMaxRecipients =
        maxDownloads === 'unlimited' || maxDownloads === null
          ? null
          : [1, 2, 5, 10].includes(Number(maxDownloads))
          ? Number(maxDownloads)
          : 1;
      const totalSize = filesForShare.reduce((acc, f) => acc + f.size, 0);
      const displayName =
        filesForShare.length > 1
          ? `${filesForShare.length} files (${filesForShare[0].name}...)`
          : filesForShare[0].name;

      try {
        secureP2PRef.current?.stopSharing();
        const session = new P2PSenderSession({
          onStateChange: (patch) => {
            setActiveLiveSession((prev) => ({
              ...(prev || {
                fileName: displayName,
                fileSize: totalSize,
                fileCount: filesForShare.length,
                recipients: [],
                recipientCount: 0,
              }),
              ...patch,
            }));
          },
          onProgress: (prog) => {
            setLiveShareProgress(prog);
          },
          onNotification: (note) => {
            if (note?.message) setLiveShareStatusMessage(note.message);
          },
          onError: (errMsg) => {
            setUploadError(errMsg);
          },
        });
        secureP2PRef.current = session;
        await session.startSession({
          files: filesForShare,
          durationSeconds,
          maxRecipients: parsedMaxRecipients,
          oneTimeAccess: Boolean(deleteAfterDownload),
        });
        setLiveShareStatusMessage('Secure P2P session active. Share Secure ID or QR code.');
      } catch (err) {
        setActiveLiveSession(null);
        setUploadError(err.message || 'Could not start Secure P2P sharing session.');
      } finally {
        setIsStartingLiveShare(false);
      }
      return;
    }

    // File size validation for cloud uploads
    if ((entryMode === 'file' || entryMode === 'both') && filesForShare.some((f) => f.size > 250 * 1024 * 1024)) {
      setUploadError('One or more files exceed the 250MB cloud upload limit. Select "Online Sharing (Live P2P)" in Storage Policy for unlimited file size streaming.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError('');

    let effectiveExpiry = expiryOption;
    if (expiryOption === 'custom') {
      if (customMode === 'date') {
        if (!customDateTime) {
          setUploadError('Please choose a custom expiration date & time.');
          setIsUploading(false);
          return;
        }
        const parsed = new Date(customDateTime);
        if (isNaN(parsed.getTime()) || parsed <= new Date()) {
          setUploadError('Expiration date must be in the future.');
          setIsUploading(false);
          return;
        }
        effectiveExpiry = parsed.toISOString();
      } else {
        const val = Math.max(1, parseInt(customDurationValue, 10) || 1);
        effectiveExpiry = `${val}${customDurationUnit}`;
      }
    }

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 120);

    try {
      let res;
      if (entryMode === 'file' || entryMode === 'both') {
        const isUnlimitedDl = maxDownloads === 'unlimited' || !maxDownloads || maxDownloads === '';
        const formData = new FormData();
        filesForShare.forEach((file) => {
          formData.append('files', file);
        });
        if (documentName.trim()) {
          formData.append('name', documentName.trim());
        }
        formData.append('expiry', effectiveExpiry);
        formData.append('storage_mode', storageMode);
        formData.append('max_downloads', isUnlimitedDl ? '' : maxDownloads);
        formData.append('delete_after_download', deleteAfterDownload ? 'true' : 'false');
        res = await fetch(apiUrl('/documents/upload'), {
          method: 'POST',
          headers: authService.getAuthHeaders(),
          body: formData,
        });
      } else {
        const isUnlimitedDl = maxDownloads === 'unlimited' || !maxDownloads || maxDownloads === '';
        res = await fetch(apiUrl('/documents/upload'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders(),
          },
          body: JSON.stringify({
            text: textContent.trim(),
            title: textTitle.trim() || 'Secure_Note.txt',
            expiry: effectiveExpiry,
            storage_mode: storageMode,
            max_downloads: isUnlimitedDl ? null : maxDownloads,
            delete_after_download: deleteAfterDownload,
          }),
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResult({
        code: data.access_code,
        doc: data.document,
        isText: entryMode === 'text' || Boolean(data.document?.is_text),
      });

      if (entryMode === 'file') {
        setSelectedFiles([]);
        setDocumentName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setTextContent('');
        setTextTitle('');
      }

      fetchUserDocuments();
    } catch (err) {
      setUploadError(err.message || 'Error processing request');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const copyShareLink = (code) => {
    const fullUrl = `${window.location.origin}/vault?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(fullUrl);
    setCopyLinkSuccess(true);
    setTimeout(() => setCopyLinkSuccess(false), 2500);
  };

  const copyTextToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setTextCopySuccess(true);
    setTimeout(() => setTextCopySuccess(false), 2500);
  };

  // Access Document handler
  const unlockVaultAccessCode = async (trimmedCode) => {
    setIsVerifying(true);
    setAccessError('');
    setUnlockedDoc(null);
    setUnlockedLiveShareCode(null);
    handleResetP2PReceiver();
    setShowInlinePreview(false);

    try {
      const res = await fetch(apiUrl('/documents/access'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: trimmedCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid access code or access expired.');
      }

      // If the code belongs to a Live Online Share session
      if (data.isOnlineLiveShare) {
        setUnlockedLiveShareCode(data.access_code || trimmedCode.toUpperCase());
        setUnlockedDoc(null);
        return;
      }

      setUnlockedDoc({
        ...data.document,
        enteredCode: trimmedCode,
      });
    } catch (err) {
      setAccessError(err.message || 'Access error occurred.');
    } finally {
      setIsVerifying(false);
    }
  };

  const joinSecureP2PByCode = async (codeOrSecureId, secretOverride = '') => {
    setAccessError('');
    setUnlockedDoc(null);
    setUnlockedLiveShareCode(null);
    setShowInlinePreview(false);
    p2pReceiverRef.current?.disconnect();
    setP2pReceiverProgress(null);

    const receiver = new P2PReceiverSession({
      onStateChange: (patch) => {
        setP2pReceiverState((prev) => ({ ...(prev || {}), ...patch }));
      },
      onProgress: (prog) => {
        setP2pReceiverProgress(prog);
      },
      onNotification: (msg) => {
        if (msg) setAccessError('');
      },
      onError: (errMsg) => {
        setAccessError(errMsg || 'Secure P2P transfer failed.');
      },
    });
    p2pReceiverRef.current = receiver;
    setIsVerifying(true);
    try {
      const cleaned = (codeOrSecureId || '').trim();
      if (/^DQV1-/i.test(cleaned) || isSecureIdFormat(cleaned)) {
        await receiver.joinSession({ secureId: cleaned });
      } else {
        await receiver.joinSession({
          transferId: cleaned.toUpperCase(),
          unlockSecret: (secretOverride || p2pUnlockSecret).trim(),
        });
      }
    } catch (err) {
      setAccessError(err.message || 'Failed to connect to Secure P2P session.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQrScanSuccess = async (parsed) => {
    setShowQrScanner(false);
    if (!parsed?.ok || !parsed.code) return;

    setAccessCodeInput(parsed.code);
    setAccessError('');
    setUnlockedDoc(null);
    setUnlockedLiveShareCode(null);

    if (parsed.isP2P) {
      setIsSecureP2PUnlock(true);
      if (parsed.isSecureId && parsed.secureId) {
        await joinSecureP2PByCode(parsed.secureId);
        return;
      }
      if (parsed.unlockSecret) {
        setP2pUnlockSecret(parsed.unlockSecret);
        await joinSecureP2PByCode(parsed.code, parsed.unlockSecret);
      } else {
        setTimeout(() => p2pSecretInputRef.current?.focus(), 60);
      }
      return;
    }

    setIsSecureP2PUnlock(false);
    await unlockVaultAccessCode(parsed.code);
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    const trimmedCode = accessCodeInput.trim();
    if (!trimmedCode) {
      setAccessError(isP2PTransferCode ? 'Please enter a Secure ID.' : 'Please enter an access code.');
      return;
    }

    if (/^DQV1-/i.test(trimmedCode) || isSecureIdFormat(trimmedCode)) {
      await joinSecureP2PByCode(trimmedCode);
      return;
    }

    if (isSecureP2PUnlock || /^DQV-/i.test(trimmedCode)) {
      if (!p2pUnlockSecret.trim()) {
        setAccessError(
          /^DQV-/i.test(trimmedCode)
            ? 'Please enter the Secret Unlock Code for this legacy 2-part Transfer ID.'
            : 'Please enter a valid Secure ID (DQV1-...).'
        );
        return;
      }
      await joinSecureP2PByCode(trimmedCode, p2pUnlockSecret.trim());
      return;
    }

    await unlockVaultAccessCode(trimmedCode);
  };

  const handleDownloadUnlockedDoc = () => {
    if (!unlockedDoc) return;
    const downloadUrl = apiUrl(
      unlockedDoc.download_url ||
        `/api/documents/download/${encodeURIComponent(unlockedDoc.enteredCode || accessCodeInput.trim())}?action=download`
    );

    const tempLink = document.createElement('a');
    tempLink.href = downloadUrl;
    tempLink.download = unlockedDoc.original_name || 'download';
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);

    setUnlockedDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        download_count: (prev.download_count || 0) + 1,
      };
    });

    window.dispatchEvent(
      new CustomEvent('vault_document_downloaded', { detail: { id: unlockedDoc.id } })
    );
  };

  // Format Helpers
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename, mime) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime?.includes('zip')) {
      return <Archive className="w-5 h-5 text-amber-400" />;
    }
    if (['txt', 'text', 'note'].includes(ext) || mime?.includes('text/plain')) {
      return <FileText className="w-5 h-5 text-emerald-400" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || mime?.includes('image')) {
      return <FileImage className="w-5 h-5 text-rose-400" />;
    }
    if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm', 'wma'].includes(ext) || mime?.includes('audio')) {
      return <Music className="w-5 h-5 text-cyan-400" />;
    }
    if (['pdf'].includes(ext) || mime?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (['doc', 'docx', 'rtf'].includes(ext)) {
      return <FileType className="w-5 h-5 text-blue-400" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime?.includes('sheet') || mime?.includes('excel')) {
      return <FileType className="w-5 h-5 text-emerald-400" />;
    }
    if (['ppt', 'pptx'].includes(ext) || mime?.includes('presentation')) {
      return <FileType className="w-5 h-5 text-orange-400" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'md'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-amber-400" />;
    }
    return <File className="w-5 h-5 text-zinc-400" />;
  };

  // Compute live user stats for the 4 KPI cards
  const totalUserDocs = userDocs.length;
  const totalUserStorage = useMemo(() => {
    return userDocs.reduce((acc, d) => acc + (d.file_size || 0), 0);
  }, [userDocs]);
  const totalUserDownloads = useMemo(() => {
    return userDocs.reduce((acc, d) => acc + (d.download_count || 0), 0);
  }, [userDocs]);
  const totalUserViews = useMemo(() => {
    return userDocs.reduce((acc, d) => acc + (d.view_count || 0), 0);
  }, [userDocs]);

  return (
    <div className="sv-dashboard-page w-full flex-1 flex flex-col items-center">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />

      {/* Main Content Container */}
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2.5 pb-8 sm:py-8 flex-1">
        {/* Top Header & Status Utility Bar */}
        <div className="vault-topbar">
          {/* User Welcome & Identity */}
          <div className="vault-topbar-left">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-red-950 to-zinc-900 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shadow-xs font-bold text-sm shrink-0">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : <FolderLock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                  {currentUser ? (currentUser.name || currentUser.email.split('@')[0]) : 'Document Vault'}
                </h1>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-950/60 border border-[#E11D2E]/40 text-[#E11D2E] font-semibold shrink-0">
                  {currentUser ? 'Member' : 'Public'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block truncate">
                Zero-Knowledge Document Exchange · End-to-End Cryptographic Security
              </p>
            </div>
          </div>

          {/* Infrastructure Health & Controls */}
          <div className="vault-topbar-right">
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-medium bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all text-zinc-300 cursor-pointer shadow-xs"
              title="Click for TiDB Cloud & Backblaze B2 status"
            >
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-[#E11D2E]" />
                {dbStatus.isTiDBConnected ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">Dev</span>
                )}
              </div>

              <span className="text-zinc-700">|</span>

              <div className="flex items-center gap-1">
                <Cloud className="w-3 h-3 text-[#E11D2E]" />
                {storageStatus.isConnected ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Synced</span>
                  </span>
                ) : (
                  <span className="text-zinc-400 font-semibold">Active</span>
                )}
              </div>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={fetchUserDocuments}
                className="p-1.5 sm:p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer shadow-xs shrink-0"
                title="Refresh Vault Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDocs ? 'animate-spin text-[#E11D2E]' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* 4-Card KPI Stat Grid (2x2 on Mobile, 4-col on Desktop) */}
        {currentUser && (
          <div className="vault-stat-grid">
            {/* Stat 1: Total Documents */}
            <div className="vault-stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Vault Documents</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#E11D2E] shrink-0">
                  <Archive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <span className="stat-value text-lg sm:text-2xl font-bold text-white tracking-tight">{totalUserDocs}</span>
                <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">Encrypted in B2</span>
              </div>
            </div>

            {/* Stat 2: Storage Used */}
            <div className="vault-stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Storage Allocated</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                  <HardDrive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <span className="stat-value text-lg sm:text-2xl font-bold text-white tracking-tight">
                  {formatBytes(totalUserStorage)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">Private Object Store</span>
              </div>
            </div>

            {/* Stat 3: Total Downloads */}
            <div className="vault-stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Total Downloads</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <span className="stat-value text-lg sm:text-2xl font-bold text-white tracking-tight">{totalUserDownloads}</span>
                <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">Fulfillments Tracked</span>
              </div>
            </div>

            {/* Stat 4: Total Views */}
            <div className="vault-stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] sm:text-xs text-zinc-400 font-medium">Recipient Views</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <span className="stat-value text-lg sm:text-2xl font-bold text-white tracking-tight">{totalUserViews}</span>
                <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">Previews Opened</span>
              </div>
            </div>
          </div>
        )}

        {/* Segmented Navigation Bar */}
        <div className="vault-tabs-nav" role="tablist" aria-label="Vault tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upload'}
            onClick={() => setActiveTab('upload')}
            className={`vault-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            title="Send & Share Document"
          >
            <UploadCloud className="w-3.5 h-3.5 shrink-0 text-[#E11D2E]" />
            <span className="tab-label-full">Send & Share</span>
            <span className="tab-label-short">Send</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'access'}
            onClick={() => setActiveTab('access')}
            className={`vault-tab-btn ${activeTab === 'access' ? 'active' : ''}`}
            title="Unlock Code"
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span className="tab-label-full">Unlock Code</span>
            <span className="tab-label-short">Unlock</span>
          </button>

          {currentUser && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
              className={`vault-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              title="My Documents"
            >
              <Archive className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="tab-label-full">My Documents</span>
              <span className="tab-label-short">Docs</span>
              <span className="vault-tab-badge">{totalUserDocs}</span>
            </button>
          )}
        </div>

        {/* Tab 1: Send & Share (Upload File or Secret Text) */}
        {activeTab === 'upload' && (
          <div className="vault-panel vault-panel-glow-top p-5 sm:p-7 relative mb-8 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#E11D2E] shadow-inner shrink-0">
                  {entryMode === 'file' ? (
                    <UploadCloud className="w-5 h-5" />
                  ) : (
                    <AlignLeft className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>
                      {entryMode === 'file'
                        ? 'Upload & Encrypt Documents'
                        : 'Send Confidential Secret Note'}
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {entryMode === 'file'
                      ? 'Package confidential files into an encrypted Backblaze B2 archive or stream live via Online Sharing.'
                      : 'Write secret text or API tokens and protect with a hashed access key.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Guided 6-Step Progress Header */}
            {(() => {
              const stepMeta = {
                1: { short: 'Content', title: 'Choose Sharing Content', desc: 'Select whether you want to share files or a confidential text note.' },
                2: {
                  short: 'Input',
                  title: entryMode === 'file' ? 'Select Files' : 'Enter Secret Text',
                  desc:
                    entryMode === 'file'
                      ? 'Add up to 20 files via drag & drop or file picker.'
                      : 'Write or paste the confidential text you want to protect.',
                },
                3: { short: 'Name', title: 'Name Your Archive', desc: 'What would you like to name your archive? (Optional)' },
                4: { short: 'Policy', title: 'Storage Policy & Access Rules', desc: 'Choose Live P2P or Encrypted Cloud Archive and configure access limits.' },
                5: { short: 'Time', title: 'Set Time for All Downloads', desc: 'Choose how long recipients are allowed to access and download this share.' },
                6: { short: 'Generate', title: 'Generate Access Code', desc: 'Confirm to encrypt and generate your Secure ID or access code.' },
              };
              const currentMeta = stepMeta[wizardStep] || stepMeta[1];
              return (
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#141418] via-[#0F0F12] to-[#0B0B0D] border border-zinc-800/90 shadow-lg shadow-black/40 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-950/70 border border-[#E11D2E]/50 text-red-200 shadow-sm shadow-red-950/30">
                        Step {wizardStep} of 6
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">{currentMeta.title}</h3>
                    </div>
                  </div>

                  {/* Connected Numbered Stepper */}
                  <div className="relative flex items-center justify-between gap-1 pt-1">
                    <div className="absolute left-3 right-3 top-[17px] h-0.5 bg-zinc-800/90 -z-0" />
                    <div
                      className="absolute left-3 top-[17px] h-0.5 bg-gradient-to-r from-[#E11D2E] to-red-400 transition-all duration-300 -z-0"
                      style={{ width: `calc(${((wizardStep - 1) / 5) * 100}% - 12px)` }}
                    />
                    {[1, 2, 3, 4, 5, 6].map((s) => {
                      const isDone = s < wizardStep;
                      const isActive = s === wizardStep;
                      return (
                        <div key={s} className="relative z-10 flex flex-col items-center gap-1.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-200 ${
                              isDone
                                ? 'bg-[#E11D2E] border-[#E11D2E] text-white shadow-md shadow-red-950/40'
                                : isActive
                                ? 'bg-[#18181B] border-[#E11D2E] text-white ring-4 ring-[#E11D2E]/20 shadow-md shadow-red-950/40'
                                : 'bg-[#121215] border-zinc-800 text-zinc-500'
                            }`}
                          >
                            {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s}
                          </div>
                          <span
                            className={`hidden sm:block text-[10px] font-medium ${
                              isActive ? 'text-white' : isDone ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            {stepMeta[s].short}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{currentMeta.desc}</p>
                </div>
              );
            })()}

            {/* If a Secure P2P Session is currently active, render the Secure P2P Sender Dashboard */}
            {activeLiveSession ? (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#0E0E10] border border-[#27272A] space-y-5 animate-in fade-in duration-200">
                {/* Top Status & Authoritative Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E11D2E]/20 border border-[#E11D2E]/40 text-[#FF4D5E]">
                      {(activeLiveSession.status || 'WAITING_FOR_RECIPIENT').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Recipients: <strong className="text-white">{activeLiveSession.recipientCount || 0} / {activeLiveSession.maxRecipients == null ? '∞' : activeLiveSession.maxRecipients}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#121215] border border-zinc-800 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                      <span className={(activeLiveSession.remainingSeconds || 0) <= 60 ? 'text-red-400 font-bold' : 'text-white'}>
                        {formatP2PCountdown(activeLiveSession.remainingSeconds || 0)}
                      </span>
                    </div>

                    {!['EXPIRED', 'CANCELLED'].includes(activeLiveSession.status) ? (
                      <button
                        type="button"
                        onClick={() => setConfirmStopP2P(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        <span>Stop Sharing</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleEndLiveShare}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        New Share
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirmation Banner */}
                {confirmStopP2P && (
                  <div className="p-4 rounded-xl bg-red-950/70 border border-red-700 space-y-2.5">
                    <div className="text-xs font-bold text-white">Stop sharing immediately?</div>
                    <p className="text-[11px] text-red-200">
                      This will immediately terminate active transfers, close all WebRTC DataChannels, and cancel this Transfer ID. Stopping sharing cannot remotely delete files a recipient has already downloaded.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEndLiveShare}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Yes, Stop Sharing Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmStopP2P(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Unified SECURE ID & QR Code */}
                {!['EXPIRED', 'CANCELLED'].includes(activeLiveSession.status) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 flex flex-col justify-center">
                      <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 space-y-2">
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
                            {activeLiveSession.secureId || activeLiveSession.transferId}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(activeLiveSession.secureId || activeLiveSession.transferId);
                              setCopiedLiveCode(true);
                              setTimeout(() => setCopiedLiveCode(false), 2000);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                          >
                            {copiedLiveCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedLiveCode ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Share this single Secure ID or let the recipient scan the QR code to unlock and decrypt.
                        </p>
                      </div>
                    </div>

                    <BlurredQrCard
                      value={`${window.location.origin}/vault#id=${encodeURIComponent(activeLiveSession.secureId || activeLiveSession.transferId)}`}
                      size={108}
                      title="Secure QR Code"
                      subtitle="Scan to connect & unlock"
                    />
                  </div>
                )}

                {/* File & Status Banner */}
                <div className="p-3 rounded-xl bg-[#121215] border border-zinc-800 text-xs text-zinc-300 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-white">{activeLiveSession.fileName}</span>
                    <span className="text-zinc-500 ml-2">({formatFileSize(activeLiveSession.fileSize || 0)})</span>
                  </div>
                  <span className="text-zinc-400">{liveShareStatusMessage}</span>
                </div>

                {/* Pause / Resume + Live Progress */}
                {['TRANSFERRING', 'PAUSED'].includes(activeLiveSession.status) && (
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-zinc-300">
                      {liveShareProgress ? (
                        <span>
                          Streaming <strong>{liveShareProgress.fileName}</strong> · {liveShareProgress.percentage}% ({formatFileSize(liveShareProgress.bytesTransferred)} / {formatFileSize(liveShareProgress.totalBytes)}) · {formatP2PSpeed(liveShareProgress.speedBps)} · ETA {liveShareProgress.etaSeconds}s
                        </span>
                      ) : (
                        <span>Encrypted transfer {activeLiveSession.status === 'PAUSED' ? 'paused' : 'in progress'}...</span>
                      )}
                    </div>
                    {activeLiveSession.status === 'TRANSFERRING' ? (
                      <button
                        type="button"
                        onClick={() => secureP2PRef.current?.pauseTransfer()}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => secureP2PRef.current?.resumeTransfer()}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Connected Recipients Approval Queue */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Connected Recipients ({activeLiveSession.recipients?.length || 0})
                  </h3>
                  {(!activeLiveSession.recipients || activeLiveSession.recipients.length === 0) ? (
                    <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800 text-xs text-zinc-400 text-center">
                      Waiting for recipient to join at <span className="text-white font-mono">/p2p-share</span> with Transfer ID &amp; Secret Unlock Code...
                    </div>
                  ) : (
                    activeLiveSession.recipients.map((r) => (
                      <div
                        key={r.recipientId}
                        className="p-3 rounded-xl bg-[#121215] border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{r.recipientId}</div>
                          <div className="text-[11px] text-zinc-400">
                            Status: <span className="text-zinc-200">{r.status}</span> · Progress: {r.progress || 0}%
                          </div>
                        </div>
                        {!r.approved ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => secureP2PRef.current?.approveRecipient(r.recipientId)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => secureP2PRef.current?.rejectRecipient(r.recipientId)}
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
              </div>
            ) : (
              <>
                {/* Sign In Required Notice for Unauthenticated Users */}
                {!currentUser && (
                  <div className="mb-5 p-4 rounded-xl bg-red-950/30 border border-red-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-300">
                      <Lock className="w-4 h-4 text-[#E11D2E] shrink-0" />
                      <span>
                        <strong className="text-white">Account Authentication Required:</strong> You must create an account or sign in to upload documents to the vault.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="px-3 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold transition-all cursor-pointer shadow-sm text-xs"
                      >
                        Create Account
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all cursor-pointer text-xs"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                )}

            {/* Upload Form (Steps 1–7) */}
            <form onSubmit={handleUpload} className="space-y-5">
              {/* STEP 1 – Choose Sharing Content */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('file');
                        setHasSelectedEntryMode(true);
                        setUploadError('');
                      }}
                      className={`group p-5 sm:p-6 rounded-2xl text-left border transition-all duration-200 cursor-pointer space-y-3.5 hover:-translate-y-0.5 ${
                        hasSelectedEntryMode && entryMode === 'file'
                          ? 'bg-gradient-to-br from-red-950/35 via-[#151519] to-[#0E0E11] border-[#E11D2E] ring-1 ring-[#E11D2E]/40 shadow-xl shadow-red-950/25'
                          : 'bg-[#101014]/90 border-zinc-800/90 hover:border-zinc-700 hover:bg-[#141419]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900/90 border border-zinc-800 group-hover:border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shadow-inner transition-colors">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Up to 20 files
                          </span>
                          {hasSelectedEntryMode && entryMode === 'file' && (
                            <span className="w-6 h-6 rounded-full bg-[#E11D2E] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-white">Attach Files</div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Share PDFs, documents, images, audio, code, or ZIP archives with end-to-end encryption.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('text');
                        setHasSelectedEntryMode(true);
                        setUploadError('');
                      }}
                      className={`group p-5 sm:p-6 rounded-2xl text-left border transition-all duration-200 cursor-pointer space-y-3.5 hover:-translate-y-0.5 ${
                        hasSelectedEntryMode && entryMode === 'text'
                          ? 'bg-gradient-to-br from-red-950/35 via-[#151519] to-[#0E0E11] border-[#E11D2E] ring-1 ring-[#E11D2E]/40 shadow-xl shadow-red-950/25'
                          : 'bg-[#101014]/90 border-zinc-800/90 hover:border-zinc-700 hover:bg-[#141419]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900/90 border border-zinc-800 group-hover:border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shadow-inner transition-colors">
                          <AlignLeft className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Encrypted Note
                          </span>
                          {hasSelectedEntryMode && entryMode === 'text' && (
                            <span className="w-6 h-6 rounded-full bg-[#E11D2E] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-white">Secret Text</div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Encrypt confidential notes, passwords, API keys, or private snippets with zero plaintext exposure.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEntryMode('both');
                        setHasSelectedEntryMode(true);
                        setUploadError('');
                      }}
                      className={`group p-5 sm:p-6 rounded-2xl text-left border transition-all duration-200 cursor-pointer space-y-3.5 hover:-translate-y-0.5 ${
                        hasSelectedEntryMode && entryMode === 'both'
                          ? 'bg-gradient-to-br from-red-950/35 via-[#151519] to-[#0E0E11] border-[#E11D2E] ring-1 ring-[#E11D2E]/40 shadow-xl shadow-red-950/25'
                          : 'bg-[#101014]/90 border-zinc-800/90 hover:border-zinc-700 hover:bg-[#141419]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900/90 border border-zinc-800 group-hover:border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shadow-inner transition-colors">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                            Combined
                          </span>
                          {hasSelectedEntryMode && entryMode === 'both' && (
                            <span className="w-6 h-6 rounded-full bg-[#E11D2E] text-white flex items-center justify-center shadow-md shadow-red-950/40">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm sm:text-base font-bold text-white">Files + Secret Text</div>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Bundle attached files together with a confidential text note in one encrypted share.
                        </p>
                      </div>
                    </button>
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {hasSelectedEntryMode && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadError('');
                          setWizardStep(2);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-950/30 cursor-pointer"
                      >
                        <span>Continue</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 – Select Files or Enter Secret Text */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {entryMode !== 'text' && (
                    <div className="space-y-3">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`vault-dropzone ${selectedFiles.length > 0 ? 'has-files' : ''}`}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          multiple
                          className="hidden"
                        />

                        {selectedFiles.length === 0 ? (
                          <div className="space-y-2 py-3">
                            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                              <UploadCloud className="w-6 h-6 text-[#E11D2E]" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-[#E11D2E] hover:underline">
                                Choose Files
                              </span>
                              <span className="text-sm text-zinc-300"> or drag & drop here</span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              Supports PDF, Word, Excel, Images, Audio, Code, and Archives (Up to 20 files)
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-red-950/70 border border-[#E11D2E]/40 text-[#E11D2E] text-xs font-bold">
                                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono">
                                  Total: {formatBytes(selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-[#E11D2E]" />
                                  <span>Add</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleClearFiles}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 text-xs transition-all cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 text-left">
                              {selectedFiles.map((file, idx) => (
                                <div
                                  key={`${file.name}-${idx}`}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="p-1.5 rounded-lg bg-[#121215] shrink-0 border border-zinc-800">
                                      {getFileIcon(file.name, file.type)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-white font-medium truncate" title={file.name}>
                                        {file.name}
                                      </div>
                                      <div className="text-zinc-500 text-[11px] font-mono">
                                        {formatBytes(file.size)} • {file.type || (file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'File')}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(idx)}
                                    className="text-zinc-500 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                                    title="Remove file"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Collapsible Supported Formats & AI Capabilities Guide */}
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowFormatsGuide((v) => !v)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <HelpCircle className="w-3.5 h-3.5 text-[#E11D2E]" />
                            <span>Supported Formats &amp; AI Capabilities</span>
                          </span>
                          {showFormatsGuide ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </button>
                        {showFormatsGuide && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-400">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-full bg-red-950/40 border border-red-800/40 text-red-300 text-[10px]">Vision OCR</span>
                              <span className="px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-[10px]">Whisper Audio</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[10px]">ZIP Deep Scan</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[10px]">Excel Tables</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowFormatsModal(true)}
                              className="text-[11px] text-[#E11D2E] hover:underline font-medium cursor-pointer"
                            >
                              Open Full Supported Formats Guide →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {entryMode !== 'file' && (
                    <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300">
                          Confidential Content <span className="text-[#E11D2E]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const clip = await navigator.clipboard.readText();
                              if (clip) {
                                setTextContent((prev) => (prev ? prev + '\n' + clip : clip));
                                setUploadError('');
                              }
                            } catch {}
                          }}
                          className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 transition-all cursor-pointer"
                        >
                          <Clipboard className="w-3 h-3 text-[#E11D2E]" /> Paste
                        </button>
                      </div>

                      <textarea
                        rows={6}
                        value={textContent}
                        onChange={(e) => {
                          setTextContent(e.target.value);
                          setUploadError('');
                        }}
                        placeholder="Type or paste confidential notes, passwords, private keys, or code snippets here..."
                        className="w-full rounded-xl p-3 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none transition-all resize-y min-h-[140px]"
                      />

                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{textContent.length} characters</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-600">Templates:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTextTitle('API_Secrets');
                              setTextContent('API_KEY=sk_live_9942a78fbc31...\nDATABASE_URL=mysql://user:pass@gateway:4000/secure_vault');
                              setUploadError('');
                            }}
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:text-white border border-zinc-800 text-[10px] transition-all cursor-pointer"
                          >
                            API Keys
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTextTitle('Confidential_Note');
                              setTextContent('CONFIDENTIAL NOTE:\nThis message is encrypted with DocQevrilo.\nAccess code will expire per configuration.');
                              setUploadError('');
                            }}
                            className="px-2 py-0.5 rounded bg-zinc-900 hover:text-white border border-zinc-800 text-[10px] transition-all cursor-pointer"
                          >
                            Note
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError('');
                        setWizardStep(1);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if ((entryMode === 'file' || entryMode === 'both') && selectedFiles.length === 0) {
                          setUploadError('Please select at least one file before continuing.');
                          return;
                        }
                        if ((entryMode === 'text' || entryMode === 'both') && !textContent.trim()) {
                          setUploadError('Please enter your confidential text before continuing.');
                          return;
                        }
                        setUploadError('');
                        setWizardStep(3);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-950/30 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 – Name Your Archive */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#E11D2E]" />
                      <span>What would you like to name your archive?</span>
                    </label>

                    <input
                      type="text"
                      value={entryMode !== 'text' ? documentName : textTitle}
                      onChange={(e) => (entryMode !== 'text' ? setDocumentName(e.target.value) : setTextTitle(e.target.value))}
                      placeholder={
                        entryMode !== 'text'
                          ? selectedFiles.length === 1 && entryMode === 'file'
                            ? `Default: ${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}.zip`
                            : `Default: vault-${selectedFiles.length + (entryMode === 'both' ? 1 : 0)}files.zip`
                          : 'Default: Secure_Note.txt'
                      }
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                    />

                    <div className="text-xs text-zinc-400 font-mono">
                      Default name:{' '}
                      <span className="text-zinc-200">
                        {entryMode !== 'text'
                          ? selectedFiles.length === 1 && entryMode === 'file'
                            ? `${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}.zip`
                            : `vault-${selectedFiles.length + (entryMode === 'both' ? 1 : 0)}files.zip`
                          : 'Secure_Note.txt'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError('');
                        setWizardStep(2);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (entryMode === 'file') setDocumentName('');
                          else setTextTitle('');
                          setUploadError('');
                          setWizardStep(4);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadError('');
                          setWizardStep(4);
                        }}
                        className="px-6 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-950/30 cursor-pointer"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 – Storage Policy & Access Rules */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-4">
                    <StorageModeSelector
                      storageMode={storageMode}
                      onChange={(mode) => {
                        if (entryMode === 'text' && mode === 'online') {
                          setUploadError('Live P2P is only available for files. Please choose Temporary Storage or Long-Term Storage for Secret Text.');
                          return;
                        }
                        setStorageMode(mode);
                        setUploadError('');
                        if (mode === 'online') {
                          if (!['15m', '30m', '1h', '2h', '6h', '12h', '24h'].includes(expiryOption)) {
                            setExpiryOption('15m');
                          }
                          if (maxDownloads !== 'unlimited' && maxDownloads !== null && ![1, 2, 5, 10].includes(Number(maxDownloads))) {
                            setMaxDownloads(1);
                          }
                        } else if (mode === 'temporary') {
                          if (!expiryOption || expiryOption === 'never') setExpiryOption('1h');
                          setMaxDownloads('unlimited');
                          setDeleteAfterDownload(false);
                        } else if (mode === 'long_term') {
                          setExpiryOption('never');
                          setMaxDownloads('unlimited');
                          setDeleteAfterDownload(false);
                        }
                      }}
                    />

                    {/* Policy Explanation & Relevant Access Controls */}
                    {!storageMode ? (
                      <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2.5">
                        <SlidersHorizontal className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Select a storage policy above to configure recipient limits and access restrictions.</span>
                      </div>
                    ) : storageMode === 'online' ? (
                      <div className="space-y-4 p-4 rounded-xl bg-[#0E0E10] border border-[#27272A]">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <Radio className="w-4 h-4 text-[#E11D2E]" />
                            <span>Live P2P (Direct Browser-to-Browser)</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Your files stay in your browser and transfer directly to approved recipients with AES-256-GCM + Argon2id encryption. Nothing is uploaded to cloud storage.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-2">
                            Maximum Recipients
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { label: '1 Recipient', value: 1 },
                              { label: '2 Recipients', value: 2 },
                              { label: '5 Recipients', value: 5 },
                              { label: '10 Recipients', value: 10 },
                              { label: 'Unlimited', value: 'unlimited' },
                            ].map((opt) => {
                              const selected =
                                opt.value === 'unlimited'
                                  ? maxDownloads === 'unlimited' || maxDownloads === null
                                  : Number(maxDownloads) === opt.value;
                              return (
                                <button
                                  type="button"
                                  key={String(opt.value)}
                                  onClick={() => setMaxDownloads(opt.value)}
                                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                    selected
                                      ? 'bg-red-950/70 border-[#E11D2E] text-white'
                                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#27272A] cursor-pointer">
                          <div>
                            <div className="text-xs font-semibold text-white">One-Time Access (Single Completed Transfer)</div>
                            <div className="text-[11px] text-zinc-400">
                              Automatically locks new joins after the first recipient completes the download.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={deleteAfterDownload}
                            onChange={(e) => setDeleteAfterDownload(e.target.checked)}
                            className="w-4 h-4 accent-[#E11D2E] cursor-pointer"
                          />
                        </label>
                      </div>
                    ) : storageMode === 'long_term' ? (
                      <div className="p-4 rounded-xl bg-zinc-900/80 border border-amber-900/40 space-y-2">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-amber-400" />
                          <span>Long-Term Encrypted Cloud Archive</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Your encrypted archive is stored in Backblaze B2 and protected with a SHA-256 hashed access code in TiDB Cloud until you delete it.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4 rounded-xl bg-[#0E0E10] border border-[#27272A]">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#E11D2E]" />
                            <span>Temporary Encrypted Cloud Archive</span>
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Your encrypted archive is stored in Backblaze B2 and automatically deleted after the expiration timer or download limit is reached.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-2">
                            Download Permissions (Max Downloads)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {[
                              { label: '1 Download', value: 1 },
                              { label: '5 Downloads', value: 5 },
                              { label: '10 Downloads', value: 10 },
                              { label: 'Unlimited', value: 'unlimited' },
                            ].map((opt) => {
                              const selected =
                                opt.value === 'unlimited'
                                  ? maxDownloads === 'unlimited' || maxDownloads === null
                                  : Number(maxDownloads) === opt.value;
                              return (
                                <button
                                  type="button"
                                  key={String(opt.value)}
                                  onClick={() => setMaxDownloads(opt.value)}
                                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                    selected
                                      ? 'bg-red-950/70 border-[#E11D2E] text-white'
                                      : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-[#18181B] border border-[#27272A] cursor-pointer">
                          <div>
                            <div className="text-xs font-semibold text-white">Burn After First Download</div>
                            <div className="text-[11px] text-zinc-400">
                              Immediately purges the cloud archive after 1 successful download.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={deleteAfterDownload}
                            onChange={(e) => setDeleteAfterDownload(e.target.checked)}
                            className="w-4 h-4 accent-[#E11D2E] cursor-pointer"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {entryMode === 'file' &&
                    (storageMode === 'temporary' || storageMode === 'long_term') &&
                    selectedFiles.some((f) => f.size > 250 * 1024 * 1024) && (
                      <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/50 text-xs text-amber-200 flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>One or more selected files exceed the 250 MB cloud limit. Choose Live P2P instead.</span>
                      </div>
                    )}

                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError('');
                        setWizardStep(3);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!storageMode) {
                          setUploadError('Please select a storage policy before continuing.');
                          return;
                        }
                        if (
                          entryMode === 'file' &&
                          (storageMode === 'temporary' || storageMode === 'long_term') &&
                          selectedFiles.some((f) => f.size > 250 * 1024 * 1024)
                        ) {
                          setUploadError('Selected file exceeds 250 MB cloud archive limit. Please choose Live P2P.');
                          return;
                        }
                        setUploadError('');
                        setWizardStep(5);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-950/30 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 – Set Time for All Downloads */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#E11D2E]" />
                        <span>How long can recipients access and download this share?</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        This timer starts when the session is created, applies equally to all recipients, and is strictly enforced by the backend.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: '15 minutes', value: '15m' },
                        { label: '30 minutes', value: '30m' },
                        { label: '1 hour', value: '1h' },
                        { label: '2 hours', value: '2h' },
                        { label: '6 hours', value: '6h' },
                        { label: '12 hours', value: '12h' },
                        { label: '24 hours', value: '24h' },
                        ...(storageMode === 'long_term' ? [{ label: 'Never expires', value: 'never' }] : []),
                        { label: 'Custom duration', value: 'custom' },
                      ].map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => {
                            setExpiryOption(opt.value);
                            if (opt.value === 'custom' && customDurationUnit !== 'm' && customDurationUnit !== 'h') {
                              setCustomDurationValue(45);
                              setCustomDurationUnit('m');
                            }
                            setUploadError('');
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            expiryOption === opt.value
                              ? 'bg-red-950/70 border-[#E11D2E] text-white shadow-sm'
                              : 'bg-[#121215] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {expiryOption === 'custom' && (
                      <div className="p-3.5 rounded-xl bg-[#0E0E10] border border-zinc-800 space-y-2.5">
                        <div className="text-xs font-semibold text-zinc-300">
                          Custom Session Duration {storageMode === 'online' ? '(1 min – 24 hours)' : ''}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={storageMode === 'online' ? (customDurationUnit === 'h' ? 24 : 1440) : 365}
                            value={customDurationValue}
                            onChange={(e) => setCustomDurationValue(e.target.value)}
                            className="w-28 rounded-lg px-3 py-2 text-xs text-white font-mono"
                          />
                          <select
                            value={customDurationUnit}
                            onChange={(e) => setCustomDurationUnit(e.target.value)}
                            className="rounded-lg px-3 py-2 text-xs text-white bg-zinc-900 border border-zinc-700"
                          >
                            <option value="m">Minutes</option>
                            <option value="h">Hours</option>
                            {storageMode !== 'online' && <option value="d">Days</option>}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-[#0E0E10] border border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Selected expiry policy (for all recipients):</span>
                      <span className="font-mono font-bold text-white">
                        {expiryOption === 'never'
                          ? 'Permanent (No expiry)'
                          : expiryOption === 'custom'
                          ? `${customDurationValue || 1}${customDurationUnit}`
                          : expiryOption}
                      </span>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadError('');
                        setWizardStep(4);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (expiryOption === 'custom' && (!customDurationValue || Number(customDurationValue) <= 0)) {
                          setUploadError('Please enter a valid custom duration.');
                          return;
                        }
                        setUploadError('');
                        setWizardStep(6);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-red-950/30 cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 6 – Generate Access Code */}
              {wizardStep === 6 && !activeLiveSession && !uploadResult && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {(isUploading || isStartingLiveShare) ? (
                    <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
                      <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
                        <RefreshCw className="w-4 h-4 text-[#E11D2E] animate-spin" />
                        <span>
                          {isStartingLiveShare
                            ? 'Deriving E2EE key & starting Live P2P session...'
                            : 'Encrypting & generating access code...'}
                        </span>
                      </div>
                      {isUploading && (
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#E11D2E] to-red-500 transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/25 via-[#121216] to-[#0B0B0E] border border-[#E11D2E]/35 shadow-xl shadow-red-950/15 space-y-3.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                              <Shield className="w-4 h-4" />
                            </div>
                            <span>Ready to Generate Sharing Credentials</span>
                          </div>
                          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                            {storageMode === 'online' ? 'E2EE AES-256-GCM + Argon2id' : 'Backblaze B2 + SHA-256'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Content</div>
                            <div className="text-white font-semibold mt-0.5">
                              {entryMode === 'both'
                                ? `${selectedFiles.length} file(s) + ${textContent.length} chars`
                                : entryMode === 'file'
                                ? `${selectedFiles.length} file(s)`
                                : `${textContent.length} chars`}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Sharing Policy</div>
                            <div className="text-white font-semibold mt-0.5">
                              {storageMode === 'online' ? 'Live P2P' : storageMode === 'long_term' ? 'Long-Term B2' : 'Temporary B2'}
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800/80">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Expiry Window</div>
                            <div className="text-white font-mono font-semibold mt-0.5">
                              {expiryOption === 'custom' ? `${customDurationValue}${customDurationUnit}` : expiryOption}
                            </div>
                          </div>
                        </div>
                      </div>

                      {uploadError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                          <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                          <span>{uploadError}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUploadError('');
                            setWizardStep(5);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isUploading || isStartingLiveShare}
                          className="px-6 py-3 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-950/40 cursor-pointer"
                        >
                          {!currentUser ? (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>Sign In or Create Account to Share</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              <span>Generate Access Code &amp; Start Sharing</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>

            {/* Upload Success Card / Code Reveal */}
            {uploadResult && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-red-950/30 to-zinc-900 border border-[#E11D2E]/60 shadow-xl shadow-red-950/30 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <CheckCircle2 className="w-4 h-4 text-[#E11D2E]" />
                    <span>Access Code Ready to Share</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {uploadResult.doc.zipSize
                      ? formatBytes(uploadResult.doc.zipSize)
                      : formatBytes(uploadResult.doc.file_size)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-center">
                  <div className="md:col-span-2 space-y-3">
                    <div className="vault-code-display text-center text-xl sm:text-2xl">
                      {uploadResult.code}
                    </div>

                    {/* Quick Action Buttons for Code */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(uploadResult.code)}
                        className="py-2 px-3 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copySuccess ? 'Code Copied!' : 'Copy Code'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyShareLink(uploadResult.code)}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
                      >
                        {copyLinkSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#E11D2E]" />}
                        <span>{copyLinkSuccess ? 'Link Copied!' : 'Copy Direct Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccessCodeInput(uploadResult.code);
                          setActiveTab('access');
                        }}
                        className="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-800"
                      >
                        <span>Test Unlock &rarr;</span>
                      </button>
                    </div>
                  </div>

                  <BlurredQrCard
                    value={`${window.location.origin}/vault?code=${encodeURIComponent(uploadResult.code)}`}
                    size={112}
                    title="Share QR Code"
                    subtitle="Scan to unlock archive"
                  />
                </div>

                {/* Upload metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>Mode: <strong className="text-white capitalize">{uploadResult.doc.storage_mode || storageMode}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expires: <strong className="text-white">{uploadResult.doc.expires_at ? new Date(uploadResult.doc.expires_at).toLocaleDateString() : 'Permanent'}</strong></span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 cursor-pointer"
                  >
                    Share Another Document
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Unlock with Code (Access Document) */}
        {activeTab === 'access' && (
          <div className="vault-panel vault-panel-glow-top p-5 sm:p-7 relative mb-8 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Unlock Document or Note</h2>
                  <p className="text-xs text-zinc-400">
                    {isP2PTransferCode
                      ? 'Enter the Transfer ID (DQV-...) and Secret Unlock Code for E2EE peer-to-peer download.'
                      : 'Enter a vault access code or Secure P2P Transfer ID to decrypt and retrieve files.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isP2PTransferCode;
                  setIsSecureP2PUnlock(nextMode);
                  setAccessError('');
                  if (!nextMode) {
                    handleResetP2PReceiver();
                  }
                }}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isP2PTransferCode
                    ? 'bg-[#E11D2E] border-[#E11D2E] text-white shadow-lg shadow-red-950/30'
                    : 'bg-red-950/40 hover:bg-red-900/60 border-[#E11D2E]/40 text-red-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isP2PTransferCode ? 'Using Secure P2P Unlock' : 'Unlock Secure P2P Transfer'}</span>
              </button>
            </div>

            {/* Access Form */}
            <form onSubmit={handleAccessSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {isLegacyP2PCode ? 'Legacy Transfer ID' : isP2PTransferCode ? 'Enter Secure ID' : 'Access Code or Secure ID'}
                </label>
                <input
                  ref={accessCodeInputRef}
                  type="text"
                  value={accessCodeInput}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setAccessCodeInput(val);
                    if (/^DQV1?-/i.test(val)) {
                      setIsSecureP2PUnlock(true);
                    }
                    setAccessError('');
                    if (unlockedLiveShareCode) setUnlockedLiveShareCode(null);
                  }}
                  placeholder={
                    isP2PTransferCode
                      ? 'Enter Secure ID... (DQV1-...)'
                      : 'Enter vault code, 6-char live code, or DQV1-... Secure ID'
                  }
                  className="w-full rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all"
                />
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowQrScanner(true)}
                    className="py-2.5 px-3 text-xs font-semibold text-red-200 hover:text-white bg-red-950/60 hover:bg-[#E11D2E] border border-[#E11D2E]/50 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          const trimmed = text.trim();
                          setAccessCodeInput(trimmed);
                          if (/^DQV1?-/i.test(trimmed)) setIsSecureP2PUnlock(true);
                          if (unlockedLiveShareCode) setUnlockedLiveShareCode(null);
                        }
                      } catch {}
                    }}
                    className="py-2.5 px-3 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Clipboard className="w-4 h-4 text-[#E11D2E]" />
                    <span>Paste Code</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  {isP2PTransferCode
                    ? 'Paste or scan the single Secure ID (DQV1-...) — no separate unlock code needed.'
                    : 'Format: 10-character vault code, 6-character live code, or DQV1-... Secure ID'}
                </p>
              </div>

              {isLegacyP2PCode && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Secret Unlock Code
                  </label>
                  <div className="relative">
                    <input
                      ref={p2pSecretInputRef}
                      type={showP2PUnlockSecret ? 'text' : 'password'}
                      value={p2pUnlockSecret}
                      onChange={(e) => {
                        setP2pUnlockSecret(e.target.value);
                        setAccessError('');
                      }}
                      placeholder="Enter the sender's Secret Unlock Code..."
                      className="w-full rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all pr-28"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowP2PUnlockSecret((v) => !v)}
                        className="px-2 py-1 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                        title={showP2PUnlockSecret ? 'Hide secret' : 'Show secret'}
                      >
                        {showP2PUnlockSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setP2pUnlockSecret(text.trim());
                          } catch {}
                        }}
                        className="px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Used locally with Argon2id + AES-256-GCM to decrypt files in your browser. Never sent to the server.
                  </p>
                </div>
              )}

              {/* Rate limit & security note */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400">
                <Shield className="w-4 h-4 text-[#E11D2E] shrink-0" />
                <span>
                  {isP2PTransferCode
                    ? 'Zero-knowledge WebRTC E2EE: unlock code stays in your browser and requires sender approval.'
                    : 'Protected with SHA-256 hash lookup and persistent anti-brute-force rate limiting.'}
                </span>
              </div>

              {/* Error Banner */}
              {accessError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                  <span>{accessError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!accessCodeInput || (isLegacyP2PCode && !p2pUnlockSecret.trim()) || isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/30 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isP2PTransferCode ? 'Connecting to Peer...' : 'Verifying with TiDB Cloud...'}</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>{isP2PTransferCode ? 'Connect & Unlock Secure P2P' : 'Unlock Document'}</span>
                  </>
                )}
              </button>
            </form>

            <UnlockQrScannerModal
              isOpen={showQrScanner}
              onClose={() => setShowQrScanner(false)}
              onScanSuccess={handleQrScanSuccess}
              onFallbackManual={() => {
                setShowQrScanner(false);
                setTimeout(() => accessCodeInputRef.current?.focus(), 50);
              }}
            />

            {/* Inline Secure P2P Receiver Status & Downloads */}
            {p2pReceiverState && (
              <div className="mt-6 p-5 rounded-2xl bg-[#0E0E10] border border-[#27272A] space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-4 h-4 text-[#E11D2E] ${['COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(p2pReceiverState.status) ? '' : 'animate-pulse'}`} />
                    <span className="text-xs font-bold text-white font-mono">
                      {p2pReceiverState.transferId || accessCodeInput.toUpperCase()}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold">
                      {p2pReceiverState.status === 'WAITING_FOR_APPROVAL' && 'Waiting for Sender Approval'}
                      {p2pReceiverState.status === 'APPROVED' && 'Approved — Establishing WebRTC'}
                      {p2pReceiverState.status === 'DERIVING_KEY' && 'Deriving AES-256-GCM Key'}
                      {p2pReceiverState.status === 'TRANSFERRING' && 'Decrypting & Receiving'}
                      {p2pReceiverState.status === 'PAUSED' && 'Paused by Sender'}
                      {p2pReceiverState.status === 'COMPLETED' && 'Verified & Decrypted'}
                      {p2pReceiverState.status === 'EXPIRED' && 'Session Expired'}
                      {p2pReceiverState.status === 'CANCELLED' && 'Stopped by Sender'}
                      {p2pReceiverState.status === 'FAILED' && 'Transfer Failed'}
                      {!['WAITING_FOR_APPROVAL', 'APPROVED', 'DERIVING_KEY', 'TRANSFERRING', 'PAUSED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(p2pReceiverState.status) && (p2pReceiverState.status || 'Connecting')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof p2pReceiverState.remainingSeconds === 'number' && !['EXPIRED', 'CANCELLED'].includes(p2pReceiverState.status) && (
                      <span className="text-xs font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                        <span>{formatP2PCountdown(p2pReceiverState.remainingSeconds)}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleResetP2PReceiver}
                      className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      Disconnect / Clear
                    </button>
                  </div>
                </div>

                {p2pReceiverState.status === 'WAITING_FOR_APPROVAL' && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>Connected to signaling room. Waiting for the sender to approve your request...</span>
                  </div>
                )}

                {p2pReceiverProgress && (
                  <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-semibold">
                        {p2pReceiverProgress.percentage}% ({formatFileSize(p2pReceiverProgress.bytesTransferred)} / {formatFileSize(p2pReceiverProgress.totalBytes)})
                      </span>
                      <span className="font-mono text-zinc-400">
                        {p2pReceiverProgress.speedBps ? `${formatFileSize(p2pReceiverProgress.speedBps)}/s` : ''}
                        {p2pReceiverProgress.etaSeconds != null && p2pReceiverState.status === 'TRANSFERRING'
                          ? ` • ETA ${p2pReceiverProgress.etaSeconds}s`
                          : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E11D2E] transition-all duration-200"
                        style={{ width: `${Math.min(100, p2pReceiverProgress.percentage || 0)}%` }}
                      />
                    </div>
                  </div>
                )}

                {Array.isArray(p2pReceiverState.files) && p2pReceiverState.files.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Decrypted Files ({p2pReceiverState.files.filter((f) => f.completed).length}/{p2pReceiverState.files.length})</span>
                    </div>
                    {p2pReceiverState.files.map((file) => (
                      <div
                        key={file.fileId}
                        className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">{file.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{formatFileSize(file.size)}</span>
                            {file.sha256 && <span className="text-emerald-400 truncate">SHA-256: {file.sha256.slice(0, 16)}...</span>}
                          </div>
                        </div>
                        {file.completed && file.blobUrl ? (
                          <a
                            href={file.blobUrl}
                            download={file.name}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-[11px] font-mono text-zinc-400 shrink-0">Receiving...</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Live Online P2P Share Result View */}
            {unlockedLiveShareCode && (
              <div className="mt-6 p-5 rounded-2xl bg-[#0E0E10] border border-[#27272A] space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Radio className="w-4 h-4 text-[#E11D2E] animate-pulse" />
                    <span>Live P2P Online Share Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockedLiveShareCode(null);
                      setAccessCodeInput('');
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                  >
                    Clear / Enter Another Code
                  </button>
                </div>
                <OnlineLiveShare currentUser={currentUser} initialAccessCode={unlockedLiveShareCode} />
              </div>
            )}

            {/* Unlocked Document Result Card */}
            {unlockedDoc && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <FileCheck className="w-4 h-4" />
                    <span>{unlockedDoc.is_text ? 'Secret Note Decrypted' : 'Document Verified & Ready'}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 font-mono">
                    Authorized
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 mb-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                    {getFileIcon(unlockedDoc.original_name, unlockedDoc.mime_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {unlockedDoc.original_name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                      <span className="font-mono text-zinc-300">{formatBytes(unlockedDoc.file_size)}</span>
                      <span>•</span>
                      <span className="capitalize">{unlockedDoc.storage_mode || 'Online'}</span>
                      <span>•</span>
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{unlockedDoc.view_count || 1} views</span>
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>
                          {unlockedDoc.download_count || 0} / {unlockedDoc.max_downloads != null ? unlockedDoc.max_downloads : '∞'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inline Decrypted Text Reader */}
                {unlockedDoc.is_text && unlockedDoc.text_content && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <AlignLeft className="w-3.5 h-3.5 text-[#E11D2E]" />
                        <span>Decrypted Secret Content</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(unlockedDoc.text_content)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        {textCopySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#E11D2E]" />}
                        <span>{textCopySuccess ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="bg-[#0b0b0e] border border-zinc-800 rounded-xl p-3.5 max-h-60 overflow-y-auto font-mono text-xs text-zinc-200 whitespace-pre-wrap select-all shadow-inner">
                      {unlockedDoc.text_content}
                    </div>
                  </div>
                )}

                {/* Actions: Download, View & AI Study Assistant */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleDownloadUnlockedDoc}
                    className="py-2.5 px-3 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-950/40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {unlockedDoc.is_text ? '.txt' : 'File'}</span>
                  </button>
                  <a
                    href={apiUrl(
                      unlockedDoc.view_url ||
                        `/api/documents/view/${encodeURIComponent(unlockedDoc.enteredCode || accessCodeInput.trim())}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>View in Tab</span>
                  </a>
                </div>

                {/* AI Assistant Button */}
                <button
                  type="button"
                  onClick={() => setAiModalDoc(unlockedDoc)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-950/80 via-zinc-900 to-red-950/60 hover:from-red-900 hover:to-zinc-800 border border-[#E11D2E]/40 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-red-950/30 group"
                >
                  <Sparkles className="w-4 h-4 text-[#E11D2E] group-hover:rotate-12 transition-transform" />
                  <span>
                    ✨ Open DocQevrilo AI Assistant
                    {unlockedDoc?.original_name?.match(/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i)
                      ? ' (Vision OCR)'
                      : unlockedDoc?.original_name?.match(/\.(mp3|wav|m4a|ogg|flac|aac|webm)$/i)
                      ? ' (Whisper Audio)'
                      : unlockedDoc?.original_name?.endsWith('.zip')
                      ? ' (Archive Deep Scan)'
                      : ''}
                  </span>
                </button>

                {/* Preview Drawer Toggle */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowInlinePreview((prev) => !prev)}
                    className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3 h-3 text-[#E11D2E]" />
                    <span>{showInlinePreview ? 'Hide Quick Preview' : 'Show In-Page Preview'}</span>
                  </button>

                  {showInlinePreview && (
                    <div className="mt-2.5 p-1.5 bg-[#0b0b0e] border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in duration-150">
                      <iframe
                        src={apiUrl(
                          unlockedDoc.view_url ||
                            `/api/documents/view/${encodeURIComponent(unlockedDoc.enteredCode || accessCodeInput.trim())}`
                        )}
                        title="Document Preview"
                        className="w-full h-80 rounded-lg border border-zinc-800 bg-[#121215]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My Documents (Comprehensive Vault Manager) */}
        {activeTab === 'documents' && (
          <div className="animate-in fade-in duration-150">
            <MySharedDocuments
              currentUser={currentUser}
              onNavigateAuth={() => navigate('/login')}
              onDocumentsChange={(updatedDocs) => setUserDocs(updatedDocs)}
            />
          </div>
        )}
      </div>

      {/* Dual Cloud Architecture Information Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Dual-Cloud Architecture</h3>
                <p className="text-xs text-zinc-400">TiDB Cloud (Metadata & Auth) + Backblaze B2 (Encrypted Files)</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-medium">TiDB Cloud:</span>
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {dbStatus.isTiDBConnected ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected & Synced
                      </span>
                    ) : (
                      <span className="text-amber-400">Local Dev Storage Mode</span>
                    )}
                  </span>
                </div>
                {dbStatus.host && (
                  <span className="font-mono text-zinc-400 text-[11px] truncate max-w-[160px]">{dbStatus.host}</span>
                )}
              </div>

              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-medium">Backblaze B2:</span>
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {storageStatus.isConnected ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected & Private Bucket Live
                      </span>
                    ) : (
                      <span className="text-zinc-400">Local Storage Active</span>
                    )}
                  </span>
                </div>
                {storageStatus.bucket && (
                  <span className="font-mono text-zinc-400 text-[11px]">{storageStatus.bucket}</span>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Prompt Modal for Uploads */}
      {authPromptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[#18181b] border border-[#E11D2E]/60 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-center">
            <button
              onClick={() => setAuthPromptOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-[#E11D2E]/50 flex items-center justify-center mx-auto mb-4 text-[#E11D2E] shadow-xl shadow-red-950/50">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Sign In Required to Upload</h3>
            <p className="text-xs sm:text-sm text-zinc-300 mb-6 leading-relaxed">
              To protect the vault and ensure secure document ownership, uploading files requires an active account.
              Redirecting you to create an account in{' '}
              <span className="text-[#E11D2E] font-bold text-base">{redirectCountdown}s</span>...
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-red-950/30 cursor-pointer"
              >
                Create Account Now
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAuthPromptOpen(false)}
              className="mt-5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel and stay on vault
            </button>
          </div>
        </div>
      )}

      {/* DocQevrilo AI Study Assistant Modal */}
      {aiModalDoc && (
        <AiDocumentModal
          isOpen={Boolean(aiModalDoc)}
          onClose={() => setAiModalDoc(null)}
          doc={aiModalDoc}
          accessCode={aiModalDoc.enteredCode || accessCodeInput.trim() || ''}
        />
      )}

      {/* Supported Formats & AI Capabilities Guide Modal */}
      <SupportedFormatsModal
        isOpen={showFormatsModal}
        onClose={() => setShowFormatsModal(false)}
      />
    </div>
  );
}
