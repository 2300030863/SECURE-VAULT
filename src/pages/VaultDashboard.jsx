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
} from 'lucide-react';
import StorageModeSelector from '../components/sharing/StorageModeSelector';
import TemporaryStorageSettings from '../components/sharing/TemporaryStorageSettings';
import OnlineSharingSettings from '../components/sharing/OnlineSharingSettings';
import MySharedDocuments from '../components/sharing/MySharedDocuments';
import AiDocumentModal from '../components/ai/AiDocumentModal';
import SupportedFormatsModal from '../components/SupportedFormatsModal';
import OnlineLiveShare from '../components/sharing/OnlineLiveShare';
import { WebRtcShareSession, formatFileSize } from '../services/webRtcShareService';

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
  const [entryMode, setEntryMode] = useState('file'); // 'file' | 'text'
  const [storageMode, setStorageMode] = useState('online'); // 'online' | 'temporary' | 'long_term'
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
  const [showSettingsAccordion, setShowSettingsAccordion] = useState(false);
  const fileInputRef = useRef(null);

  // Live Online Sharing Session State
  const [activeLiveSession, setActiveLiveSession] = useState(null); // { sessionId, accessCode, ownerToken, fileName, fileSize, expiresAt }
  const [isStartingLiveShare, setIsStartingLiveShare] = useState(false);
  const [liveShareStatus, setLiveShareStatus] = useState('idle'); // 'idle' | 'ready' | 'connecting' | 'transferring' | 'complete' | 'error'
  const [liveShareStatusMessage, setLiveShareStatusMessage] = useState('');
  const [liveShareProgress, setLiveShareProgress] = useState(null); // { percent, speedFormatted, bytesTransferred, totalBytes }
  const [copiedLiveCode, setCopiedLiveCode] = useState(false);
  const [copiedLiveLink, setCopiedLiveLink] = useState(false);
  const liveHeartbeatRef = useRef(null);
  const liveWebRtcRef = useRef(null);

  // Clean up WebRTC and Heartbeat on unmount
  useEffect(() => {
    return () => {
      if (liveHeartbeatRef.current) clearInterval(liveHeartbeatRef.current);
      if (liveWebRtcRef.current) liveWebRtcRef.current.close();
    };
  }, []);

  // Browser Unload / Page Hide Beacon to instantly end online share session
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (activeLiveSession?.sessionId && activeLiveSession?.ownerToken) {
        const payload = JSON.stringify({
          sessionId: activeLiveSession.sessionId,
          ownerToken: activeLiveSession.ownerToken,
        });
        try {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(apiUrl('/online-share/end'), blob);
        } catch (_) {}
        try {
          fetch(apiUrl('/online-share/end'), {
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
    };
  }, [activeLiveSession]);

  const initOwnerLiveShare = (sessionData) => {
    setActiveLiveSession(sessionData);
    setLiveShareStatus('ready');
    setLiveShareStatusMessage('Waiting for recipient to connect with access code...');

    if (liveHeartbeatRef.current) clearInterval(liveHeartbeatRef.current);
    liveHeartbeatRef.current = setInterval(async () => {
      try {
        await fetch(apiUrl('/online-share/heartbeat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionData.sessionId,
            ownerToken: sessionData.ownerToken,
          }),
        });
      } catch (_) {}
    }, 8000);

    if (liveWebRtcRef.current) liveWebRtcRef.current.close();
    const rtcSession = new WebRtcShareSession({
      role: 'owner',
      sessionId: sessionData.sessionId,
      token: sessionData.ownerToken,
      file: sessionData.file,
      onStatusChange: ({ status, message }) => {
        setLiveShareStatusMessage(message);
        if (status === 'recipient-connected') setLiveShareStatus('connecting');
        else if (status === 'channel-open') setLiveShareStatus('transferring');
      },
      onProgress: (progress) => {
        setLiveShareStatus('transferring');
        setLiveShareProgress(progress);
      },
      onComplete: () => {
        setLiveShareStatus('complete');
        setLiveShareStatusMessage(
          deleteAfterDownload
            ? 'Transfer complete! Auto-ending session in 4 seconds (Burn on Finish)...'
            : 'File transfer completed successfully!'
        );
        if (deleteAfterDownload) {
          setTimeout(() => handleEndLiveShare(), 4000);
        }
      },
      onError: (errMessage) => {
        setUploadError(errMessage);
        setLiveShareStatus('error');
      },
    });

    liveWebRtcRef.current = rtcSession;
    rtcSession.start();
  };

  const handleEndLiveShare = async () => {
    if (liveHeartbeatRef.current) {
      clearInterval(liveHeartbeatRef.current);
      liveHeartbeatRef.current = null;
    }
    if (liveWebRtcRef.current) {
      liveWebRtcRef.current.close();
      liveWebRtcRef.current = null;
    }
    if (activeLiveSession?.sessionId && activeLiveSession?.ownerToken) {
      try {
        await fetch(apiUrl('/online-share/end'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeLiveSession.sessionId,
            ownerToken: activeLiveSession.ownerToken,
          }),
        });
      } catch (_) {}
    }
    setActiveLiveSession(null);
    setLiveShareStatus('idle');
    setLiveShareProgress(null);
    setLiveShareStatusMessage('');
  };

  // Access State
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedDoc, setUnlockedDoc] = useState(null);
  const [unlockedLiveShareCode, setUnlockedLiveShareCode] = useState(null);
  const [accessError, setAccessError] = useState('');

  // Auto-fill code from URL query param if present (?code=ABC or ?tab=online-share)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'live-share' || tabFromUrl === 'online-share' || tabFromUrl === 'live' || tabFromUrl === 'online') {
      setActiveTab('upload');
      setEntryMode('file');
      setStorageMode('online');
    }
    const codeFromUrl = searchParams.get('code') || searchParams.get('c');
    if (codeFromUrl && codeFromUrl.trim()) {
      setAccessCodeInput(codeFromUrl.trim());
      setActiveTab('access');
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
    e.preventDefault();
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    if (entryMode === 'file' && selectedFiles.length === 0) {
      setUploadError('Please select at least one file to upload.');
      return;
    }
    if (entryMode === 'text' && !textContent.trim()) {
      setUploadError('Please enter text content to secure.');
      return;
    }

    // ONLINE SHARING (Live WebRTC P2P Workflow):
    if (storageMode === 'online' && entryMode === 'file') {
      setIsStartingLiveShare(true);
      setUploadError('');

      let durationMinutes = 120;
      if (expiryOption === '30m') durationMinutes = 30;
      else if (expiryOption === '1h') durationMinutes = 60;
      else if (expiryOption === '2h') durationMinutes = 120;
      else if (expiryOption === '4h') durationMinutes = 240;

      const maxDl = maxDownloads === 'unlimited' ? 'unlimited' : Number(maxDownloads) || 5;

      try {
        const res = await fetch(apiUrl('/online-share/create'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders(),
          },
          body: JSON.stringify({
            fileName: selectedFiles[0].name,
            fileSize: selectedFiles[0].size,
            mimeType: selectedFiles[0].type || 'application/octet-stream',
            durationMinutes,
            maxDownloads: maxDl,
            deleteAfterDownload: Boolean(deleteAfterDownload),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create online sharing session.');
        }

        initOwnerLiveShare({
          sessionId: data.sessionId,
          accessCode: data.accessCode,
          ownerToken: data.ownerToken,
          file: selectedFiles[0],
          fileName: selectedFiles[0].name,
          fileSize: selectedFiles[0].size,
          expiresAt: data.expiresAt,
        });
      } catch (err) {
        setUploadError(err.message || 'Could not start online sharing session.');
      } finally {
        setIsStartingLiveShare(false);
      }
      return;
    }

    // File size validation for cloud uploads
    if (entryMode === 'file' && selectedFiles.some((f) => f.size > 250 * 1024 * 1024)) {
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
      if (entryMode === 'file') {
        const isUnlimitedDl = maxDownloads === 'unlimited' || !maxDownloads || maxDownloads === '';
        const formData = new FormData();
        selectedFiles.forEach((file) => {
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
  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (!accessCodeInput.trim()) {
      setAccessError('Please enter an access code.');
      return;
    }

    setIsVerifying(true);
    setAccessError('');
    setUnlockedDoc(null);
    setUnlockedLiveShareCode(null);
    setShowInlinePreview(false);

    try {
      const res = await fetch(apiUrl('/documents/access'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCodeInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid access code or access expired.');
      }

      // If the code belongs to a Live Online Share session
      if (data.isOnlineLiveShare) {
        setUnlockedLiveShareCode(data.access_code || accessCodeInput.trim().toUpperCase());
        setUnlockedDoc(null);
        return;
      }

      setUnlockedDoc({
        ...data.document,
        enteredCode: accessCodeInput.trim(),
      });
    } catch (err) {
      setAccessError(err.message || 'Access error occurred.');
    } finally {
      setIsVerifying(false);
    }
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

            {/* Sub-Mode Switcher Under Send & Share (Only Attach Files & Secret Text) */}
            <div className="flex items-center p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 mb-6 max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setEntryMode('file');
                  setUploadError('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  entryMode === 'file'
                    ? 'bg-zinc-900 text-white border border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Paperclip className={`w-3.5 h-3.5 ${entryMode === 'file' ? 'text-[#E11D2E]' : 'text-zinc-500'}`} />
                <span className="truncate">Attach Files</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryMode('text');
                  setUploadError('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  entryMode === 'text'
                    ? 'bg-zinc-900 text-white border border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <AlignLeft className={`w-3.5 h-3.5 ${entryMode === 'text' ? 'text-[#E11D2E]' : 'text-zinc-500'}`} />
                <span className="truncate">Secret Text</span>
              </button>
            </div>

            {/* If an Online Live Sharing Session is currently active, render the Live P2P Dashboard */}
            {activeLiveSession ? (
              <div className="p-6 rounded-2xl bg-[#0E0E10] border border-[#27272A] space-y-6 animate-in fade-in duration-200">
                {/* Access Code Box */}
                <div className="text-center space-y-3 pb-5 border-b border-[#27272A]">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center justify-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#E11D2E] animate-pulse" />
                    <span>Live Online Sharing Active · Share Access Code with Recipient</span>
                  </span>

                  <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-[0.25em] py-3 px-6 rounded-xl bg-[#18181B] border border-red-900/50 text-[#E11D2E] max-w-sm mx-auto shadow-inner shadow-red-950/40">
                    {activeLiveSession.accessCode}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeLiveSession.accessCode);
                        setCopiedLiveCode(true);
                        setTimeout(() => setCopiedLiveCode(false), 2000);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {copiedLiveCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLiveCode ? 'Copied Code!' : 'Copy Code'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/vault?code=${activeLiveSession.accessCode}`;
                        navigator.clipboard.writeText(shareUrl);
                        setCopiedLiveLink(true);
                        setTimeout(() => setCopiedLiveLink(false), 2000);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#18181B] border border-[#27272A] hover:border-zinc-500 text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {copiedLiveLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      <span>{copiedLiveLink ? 'Copied Link!' : 'Copy Direct Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Live Status and Transfer Info */}
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

                    <span className="text-[11px] text-zinc-400">
                      Heartbeat: <span className="text-emerald-400 font-mono">10s Active</span>
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300">
                    <p className="font-semibold text-white truncate">{activeLiveSession.fileName}</p>
                    <p className="text-zinc-500 mt-0.5">
                      Size: {formatFileSize(activeLiveSession.fileSize)} · Direct WebRTC memory stream
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#121215] border border-[#27272A] text-xs text-zinc-400 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>{liveShareStatusMessage || 'Waiting for recipient to connect with access code...'}</span>
                  </div>

                  {/* Progress Bar */}
                  {liveShareProgress && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-white">Streaming to recipient</span>
                        <span className="text-[#E11D2E] font-mono">{liveShareProgress.percent}%</span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-[#E11D2E] transition-all duration-150"
                          style={{ width: `${liveShareProgress.percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                        <span>{formatFileSize(liveShareProgress.bytesTransferred)} of {formatFileSize(liveShareProgress.totalBytes)}</span>
                        <span>{liveShareProgress.speedFormatted}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Browser Transparency Warning */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Keep this browser tab open.</strong> DocQevrilo never stores your file on disk or cloud servers. The file streams directly from your browser memory. Closing this tab or turning offline will immediately terminate the sharing session.
                  </span>
                </div>

                {/* End Sharing Button */}
                <button
                  type="button"
                  onClick={handleEndLiveShare}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>End Sharing Session & Disconnect</span>
                </button>
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

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="space-y-4">
              {entryMode === 'file' ? (
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
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/40 border border-red-800/40 text-red-300 text-[10px] font-medium">
                            👁️ Vision OCR
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-[10px] font-medium">
                            🎙️ Whisper Audio
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[10px] font-medium">
                            📦 ZIP Deep Scan
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[10px] font-medium">
                            📊 Excel Tables
                          </span>
                        </div>
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFormatsModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] text-[#E11D2E] hover:text-[#FF2E44] hover:underline font-medium transition-all cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Supported Formats & AI Capabilities Guide</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-red-950/70 border border-[#E11D2E]/40 text-[#E11D2E] text-xs font-bold">
                              📦 {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
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

                        {/* Selected files list */}
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-left">
                          {selectedFiles.map((file, idx) => (
                            <div
                              key={`${file.name}-${idx}`}
                              className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="p-1.5 rounded-lg bg-[#121215] shrink-0 border border-zinc-800">
                                  {getFileIcon(file.name, file.type)}
                                </div>
                                <span className="text-white font-medium truncate max-w-[220px]" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-zinc-500 text-[11px] font-mono shrink-0">
                                  {formatBytes(file.size)}
                                </span>
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

                  {/* Optional Custom Archive Name */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#E11D2E]" />
                        <span>Custom Archive Name</span>
                        <span className="text-zinc-500 font-normal text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded">Optional</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {documentName.trim()
                          ? `${documentName.trim().replace(/\.zip$/i, '')}.zip`
                          : selectedFiles.length === 1
                          ? `${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}.zip`
                          : selectedFiles.length > 1
                          ? `vault-${selectedFiles.length}files.zip`
                          : 'Default: Original File Name'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder={
                        selectedFiles.length === 1
                          ? `e.g. ${selectedFiles[0].name.replace(/\.[^/.]+$/, '')} (leave blank to keep original)`
                          : 'e.g. Project_Contract, Secret_Archive (leave blank for default)'
                      }
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                /* Secret Text Mode */
                <div className="space-y-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                      Note Title / Filename (optional)
                    </label>
                    <input
                      type="text"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="e.g. API_Keys, Secret_Passwords, Confidential_Memo..."
                      className="w-full rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
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
                      rows={5}
                      value={textContent}
                      onChange={(e) => {
                        setTextContent(e.target.value);
                        setUploadError('');
                      }}
                      placeholder="Type or paste confidential notes, passwords, private keys, or code snippets here..."
                      className="w-full rounded-xl p-3 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none transition-all resize-y min-h-[120px]"
                    />

                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-500">
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
                </div>
              )}

              {/* Storage Architecture & Expiry Rules Accordion */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSettingsAccordion((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#E11D2E] shrink-0 group-hover:border-[#E11D2E]/40 transition-colors">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block">
                        Storage Policy & Access Rules
                      </span>
                      <span className="text-[11px] text-zinc-400 block truncate">
                        {storageMode === 'temporary'
                          ? `Temporary Auto-Purge (${expiryOption})`
                          : storageMode === 'online'
                          ? `Live Online P2P · ${expiryOption} window · ${maxDownloads === 'unlimited' ? 'Unlimited' : `${maxDownloads} recipients`} · Zero Cloud`
                          : 'Long-Term Storage · Permanent retention'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {storageMode === 'temporary' ? 'Temp Auto-Purge' : storageMode === 'online' ? 'Live P2P' : 'Long-Term'}
                    </span>
                    {showSettingsAccordion ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {showSettingsAccordion && (
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 space-y-4 animate-in fade-in duration-150">
                    <StorageModeSelector
                      storageMode={storageMode}
                      onChange={(mode) => {
                        setStorageMode(mode);
                        if (mode === 'online') {
                          if (!['30m', '1h', '2h', '4h'].includes(expiryOption)) {
                            setExpiryOption('2h');
                          }
                          if (maxDownloads === 'unlimited' || !maxDownloads) {
                            setMaxDownloads(5);
                          }
                        } else if (mode === 'temporary') {
                          setExpiryOption('1h');
                          setMaxDownloads('unlimited');
                          setDeleteAfterDownload(false);
                        } else if (mode === 'long_term') {
                          setExpiryOption('never');
                          setMaxDownloads('unlimited');
                          setDeleteAfterDownload(false);
                        }
                      }}
                    />

                    {storageMode === 'online' ? (
                      <OnlineSharingSettings
                        expiry={expiryOption}
                        setExpiry={setExpiryOption}
                        maxDownloads={maxDownloads}
                        setMaxDownloads={setMaxDownloads}
                        deleteAfterDownload={deleteAfterDownload}
                        setDeleteAfterDownload={setDeleteAfterDownload}
                      />
                    ) : storageMode === 'long_term' ? (
                      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-amber-900/40 space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <HardDrive className="w-4 h-4 text-amber-400" /> Long-Term Storage
                          </span>
                          <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
                            Permanent Retention
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          Files remain securely preserved in Backblaze B2 until explicitly deleted by you.
                        </p>
                      </div>
                    ) : (
                      <TemporaryStorageSettings
                        expiry={expiryOption}
                        setExpiry={setExpiryOption}
                        maxDownloads={maxDownloads}
                        setMaxDownloads={setMaxDownloads}
                        deleteAfterDownload={deleteAfterDownload}
                        setDeleteAfterDownload={setDeleteAfterDownload}
                        customMode={customMode}
                        setCustomMode={setCustomMode}
                        customDurationValue={customDurationValue}
                        setCustomDurationValue={setCustomDurationValue}
                        customDurationUnit={customDurationUnit}
                        setCustomDurationUnit={setCustomDurationUnit}
                        customDateTime={customDateTime}
                        setCustomDateTime={setCustomDateTime}
                        getDefaultDateTime={getDefaultDateTime}
                        getMinDateTime={getMinDateTime}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400 font-mono">
                    <span>Uploading & Hashing with TiDB...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E11D2E] to-red-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Cloud Limit Warning when file > 250MB */}
              {entryMode === 'file' &&
                storageMode !== 'online' &&
                selectedFiles.some((f) => f.size > 250 * 1024 * 1024) && (
                  <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/50 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold text-amber-300">File Exceeds 250MB Cloud Storage Limit</div>
                        <p className="text-[11px] text-amber-200/80 leading-relaxed">
                          Permanent and Temporary B2 cloud storage cap files at 250MB. Select <strong>Online Sharing (Live P2P)</strong> in Storage Policy above for unlimited file size via direct P2P streaming.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStorageMode('online')}
                      className="shrink-0 px-3.5 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#c91827] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Select Online Sharing
                    </button>
                  </div>
                )}

              {/* Online Sharing (Live P2P) Banner when storageMode === 'online' */}
              {storageMode === 'online' && entryMode === 'file' && (
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-[#E11D2E]/40 text-xs text-zinc-300 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#E11D2E] animate-pulse shrink-0" />
                    <span className="font-bold text-white">Live P2P Online Sharing</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-950/80 border border-[#E11D2E]/60 text-red-300">
                      No 250MB Limit · Unlimited File Size
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Files of any size (e.g. 3.8 GB, 10 GB+) stream directly from your browser memory to the recipient over encrypted WebRTC DataChannel. Zero cloud storage, zero disk writes, completely private.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={Boolean(
                  currentUser &&
                    ((entryMode === 'file' ? selectedFiles.length === 0 : !textContent.trim()) ||
                      isUploading ||
                      isStartingLiveShare ||
                      (entryMode === 'file' &&
                        storageMode !== 'online' &&
                        selectedFiles.some((f) => f.size > 250 * 1024 * 1024)))
                )}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.99] cursor-pointer ${
                  !currentUser
                    ? 'bg-gradient-to-r from-[#E11D2E] to-[#8A071A] hover:from-[#FF2E44] hover:to-[#E11D2E] border border-red-500/30'
                    : 'bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed shadow-red-950/40'
                }`}
              >
                {!currentUser ? (
                  <>
                    <Lock className="w-4 h-4 text-white" />
                    <span>Sign In or Create Account to Upload</span>
                  </>
                ) : isStartingLiveShare ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Starting Live Session...</span>
                  </>
                ) : isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Encrypting & Generating Code...</span>
                  </>
                ) : storageMode === 'online' && entryMode === 'file' ? (
                  <>
                    <Radio className="w-4 h-4 text-white animate-pulse" />
                    <span>Generate Access Code & Start Live Share (No Limit)</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{entryMode === 'file' ? 'Generate Access Code & Upload' : 'Generate Access Code & Send Note'}</span>
                  </>
                )}
              </button>
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

                <div className="vault-code-display text-center mb-3 text-xl sm:text-2xl">
                  {uploadResult.code}
                </div>

                {/* Quick Action Buttons for Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
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
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Unlock Document or Note</h2>
                  <p className="text-xs text-zinc-400">Enter a secure access code to decrypt and retrieve files.</p>
                </div>
              </div>
            </div>

            {/* Access Form */}
            <form onSubmit={handleAccessSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Access Code Credential
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={accessCodeInput}
                    onChange={(e) => {
                      setAccessCodeInput(e.target.value.trim());
                      setAccessError('');
                      if (unlockedLiveShareCode) setUnlockedLiveShareCode(null);
                    }}
                    placeholder="Enter access code... (e.g. 6-char live code or 10-char vault code)"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none transition-all pr-20"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setAccessCodeInput(text.trim());
                          if (unlockedLiveShareCode) setUnlockedLiveShareCode(null);
                        }
                      } catch {}
                    }}
                    className="absolute right-2 top-2 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                  >
                    Paste
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Format: 6-character live code or 10-character vault code with secure hash verification in TiDB Cloud
                </p>
              </div>

              {/* Rate limit & security note */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400">
                <Shield className="w-4 h-4 text-[#E11D2E] shrink-0" />
                <span>Protected with SHA-256 hash lookup and persistent anti-brute-force rate limiting.</span>
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
                disabled={!accessCodeInput || isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/30 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with TiDB Cloud...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Document</span>
                  </>
                )}
              </button>
            </form>

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
