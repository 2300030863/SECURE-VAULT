import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Sliders,
  Paperclip,
  AlignLeft,
  Clipboard,
  FileCode,
  Cloud,
  Pencil,
  Trash2,
  Eye,
  Archive,
  Plus,
  Globe,
  Flame,
  HardDrive
} from 'lucide-react';
import StorageModeSelector from '../components/sharing/StorageModeSelector';
import OnlineSharingSettings from '../components/sharing/OnlineSharingSettings';
import MySharedDocuments from '../components/sharing/MySharedDocuments';

export default function VaultDashboard({ currentUser }) {
  const navigate = useNavigate();
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

  // Upload & Storage Mode State
  const [entryMode, setEntryMode] = useState('file'); // 'file' | 'text'
  const [storageMode, setStorageMode] = useState('online'); // 'online' | 'temporary' | 'long_term'
  const [maxDownloads, setMaxDownloads] = useState(5); // 1 | 5 | 10 | 'unlimited'
  const [deleteAfterDownload, setDeleteAfterDownload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [expiryOption, setExpiryOption] = useState('24h');
  const [customMode, setCustomMode] = useState('duration'); // 'duration' | 'date'
  const [customDurationValue, setCustomDurationValue] = useState(3);
  const [customDurationUnit, setCustomDurationUnit] = useState('d'); // 'm' | 'h' | 'd' | 'w' | 'mo'
  const [customDateTime, setCustomDateTime] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [textCopySuccess, setTextCopySuccess] = useState(false);
  const [showInlinePreview, setShowInlinePreview] = useState(false);
  const fileInputRef = useRef(null);

  // Helper date generators for datetime-local picker
  const getDefaultDateTime = () => {
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const getMinDateTime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000); // at least 5 mins in future
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  // Helper to compute live preview of expiration
  const getExpiryPreview = () => {
    if (expiryOption === 'never') {
      return {
        text: 'Never expires (Document stays permanently accessible)',
        badge: 'Permanent',
        isNever: true
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
      minute: '2-digit'
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
      target
    };
  };

  // Access State
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [unlockedDoc, setUnlockedDoc] = useState(null);
  const [accessError, setAccessError] = useState('');

  // Recent Uploads State
  const [recentDocs, setRecentDocs] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  // Filter out any expired documents automatically (expired documents are permanently purged)
  const activeDocs = useMemo(() => {
    const now = new Date();
    return recentDocs.filter((doc) => !doc.expires_at || new Date(doc.expires_at) > now);
  }, [recentDocs]);

  // Edit & Delete State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editName, setEditName] = useState('');
  const [editExpiry, setEditExpiry] = useState('keep');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleStartEdit = (doc) => {
    setEditingDoc(doc);
    setEditName(doc.original_name);
    setEditExpiry('keep');
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    if (!editName.trim()) {
      setEditError('Document name cannot be empty.');
      return;
    }
    setIsSavingEdit(true);
    setEditError('');

    try {
      const payload = { name: editName.trim() };
      if (editExpiry !== 'keep') {
        payload.expiry = editExpiry;
      }
      const res = await fetch(apiUrl(`/documents/${editingDoc.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update document.');
      }
      setEditingDoc(null);
      fetchRecentUploads();
    } catch (err) {
      setEditError(err.message || 'Error updating document.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartDelete = (doc) => {
    setDeletingDoc(doc);
    setDeleteError('');
  };

  const handleExecuteDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(apiUrl(`/documents/${deletingDoc.id}`), {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document.');
      }
      setDeletingDoc(null);
      fetchRecentUploads();
    } catch (err) {
      setDeleteError(err.message || 'Error deleting document.');
    } finally {
      setIsDeleting(false);
    }
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
      // Backend may be starting
      setDbStatus({ isTiDBConnected: false, dbMode: 'offline' });
      setStorageStatus({ isConnected: false });
    }
  };

  const fetchRecentUploads = async () => {
    setIsLoadingRecent(true);
    try {
      const res = await fetch(apiUrl('/documents/recent'), {
        headers: authService.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecentDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load recent files:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Fetch initial status and recent uploads when user is authenticated, and poll every 15s to auto-clean
  useEffect(() => {
    fetchSystemStatus();
    if (currentUser) {
      fetchRecentUploads();
      const interval = setInterval(() => {
        fetchRecentUploads();
      }, 15000);
      return () => clearInterval(interval);
    } else {
      setRecentDocs([]);
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
        return combined.slice(0, 20); // max 20 files
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

    // Simulate smooth progress animation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 120);

    try {
      let res;
      if (entryMode === 'file') {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('expiry', effectiveExpiry);
        formData.append('storage_mode', storageMode);
        formData.append('max_downloads', maxDownloads === 'unlimited' ? '' : maxDownloads);
        formData.append('delete_after_download', deleteAfterDownload ? 'true' : 'false');
        res = await fetch(apiUrl('/documents/upload'), {
          method: 'POST',
          headers: authService.getAuthHeaders(),
          body: formData,
        });
      } else {
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
            max_downloads: maxDownloads === 'unlimited' ? null : maxDownloads,
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
        isText: entryMode === 'text' || !!data.document.is_text,
      });

      if (entryMode === 'file') {
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setTextContent('');
        setTextTitle('');
      }

      fetchRecentUploads();
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

    // Optimistically update download counter on the unlocked card
    setUnlockedDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        download_count: (prev.download_count || 0) + 1,
      };
    });

    // Notify other components like MySharedDocuments to refresh
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
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext) || mime?.includes('audio')) {
      return <FileType className="w-5 h-5 text-purple-400" />;
    }
    if (['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(ext) || mime?.includes('video')) {
      return <FileType className="w-5 h-5 text-pink-400" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'md'].includes(ext)) {
      return <FileCode className="w-5 h-5 text-amber-400" />;
    }
    return <File className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-[#0B0B0D] text-[#ECECF1] font-sans selection:bg-[#E11D2E] selection:text-white relative bg-grid-pattern">
      {/* Main Content Container */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Status Utility Bar */}
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#27272A]/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E11D2E] animate-pulse"></span>
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Document Sharing Vault</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#18181B] border border-[#27272A] hover:border-[#E11D2E]/50 hover:bg-[#202025] transition-all text-zinc-300 cursor-pointer shadow-sm"
            title="Click for TiDB Cloud & Backblaze B2 infrastructure status"
          >
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#E11D2E]" />
              <span className="hidden sm:inline">TiDB Cloud:</span>
              {dbStatus.isTiDBConnected ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">Dev</span>
              )}
            </div>

            <span className="text-zinc-600">|</span>

            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#E11D2E]" />
              <span className="hidden sm:inline">Backblaze B2:</span>
              {storageStatus.isConnected ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Connected
                </span>
              ) : (
                <span className="text-zinc-400 font-semibold">Active</span>
              )}
            </div>
          </button>
        </div>
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-xs text-zinc-400 mb-4">
            <Lock className="w-3.5 h-3.5 text-[#E11D2E]" />
            <span>Cryptographic Access Codes · Zero Shared Credentials</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-3">
            Your Documents. <span className="text-[#E11D2E]">Your Control.</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Attach a file or send secret text, generate a unique access code, and share it securely.
          </p>
        </div>

        {/* Dashboard Grid: Two Main Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Card 1: Upload Document */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 sm:p-7 relative flex flex-col justify-between shadow-2xl hover:border-[#3F3F46] transition-all">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-[#E11D2E]/30 flex items-center justify-center">
                    {entryMode === 'file' ? (
                      <UploadCloud className="w-5 h-5 text-[#E11D2E]" />
                    ) : (
                      <AlignLeft className="w-5 h-5 text-[#E11D2E]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {entryMode === 'file' ? 'Upload Document' : 'Send Secret Text'}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {entryMode === 'file'
                        ? 'Choose a file and create a secure code.'
                        : 'Write or paste confidential text and generate a secure code.'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121215] text-zinc-400 border border-[#27272A]">
                  Step 1
                </span>
              </div>

              {/* Sign In Required Notice for Unauthenticated Users */}
              {!currentUser && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-[#E11D2E]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Lock className="w-4 h-4 text-[#E11D2E] shrink-0" />
                    <span>
                      <strong className="text-white">Sign In Required:</strong> You must create an account or sign in to upload documents.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="px-2.5 py-1 rounded-md bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold transition-all cursor-pointer shadow-sm text-[11px]"
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="px-2 py-1 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 transition-all cursor-pointer text-[11px]"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Storage Mode Selector (Temporary, Online Sharing, Long-Term) */}
              <StorageModeSelector
                storageMode={storageMode}
                onChange={(mode) => {
                  setStorageMode(mode);
                  if (mode === 'online') {
                    if (!['30m', '1h', '24h', '7d'].includes(expiryOption)) {
                      setExpiryOption('24h');
                    }
                  } else if (mode === 'temporary') {
                    setExpiryOption('1h');
                  } else if (mode === 'long_term') {
                    setExpiryOption('never');
                  }
                }}
              />

              {/* Mode Switcher */}
              <div className="flex items-center p-1 bg-[#121215] rounded-xl border border-[#27272A] mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('file');
                    setUploadError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    entryMode === 'file'
                      ? 'bg-[#18181B] text-white border border-[#E11D2E]/50 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Paperclip className={`w-3.5 h-3.5 ${entryMode === 'file' ? 'text-[#E11D2E]' : 'text-zinc-400'}`} />
                  <span>Attach File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('text');
                    setUploadError('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    entryMode === 'text'
                      ? 'bg-[#18181B] text-white border border-[#E11D2E]/50 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <AlignLeft className={`w-3.5 h-3.5 ${entryMode === 'text' ? 'text-[#E11D2E]' : 'text-zinc-400'}`} />
                  <span>Send Text</span>
                </button>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleUpload} className="space-y-4">
                {entryMode === 'file' ? (
                  /* Drag and drop zone */
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        selectedFiles.length > 0
                          ? 'border-[#E11D2E]/60 bg-red-950/10'
                          : 'border-[#27272A] hover:border-[#3F3F46] bg-[#121215]/50 hover:bg-[#121215]'
                      }`}
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
                          <div className="w-12 h-12 mx-auto rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                            <UploadCloud className="w-6 h-6 text-zinc-400" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#E11D2E] hover:underline">
                              Choose Files
                            </span>
                            <span className="text-xs text-zinc-400"> or drag & drop</span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Select single or multiple files (PDF, Word, Excel, Images, Audio, Video, etc.)
                          </p>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-[10px] text-zinc-400">
                            <Archive className="w-3 h-3 text-amber-400" />
                            <span>Packaged into unified ZIP · Up to 20 files (1 GB total)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-[#E11D2E]/40 text-[#E11D2E] text-xs font-bold">
                                📦 {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                              </span>
                              <span className="text-xs text-zinc-400">
                                Total: {formatBytes(selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2 py-1 rounded bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-[#E11D2E]" />
                                <span>Add More</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleClearFiles}
                                className="px-2 py-1 rounded bg-[#18181B] hover:bg-red-950/40 border border-[#27272A] hover:border-red-900/50 text-zinc-400 hover:text-red-400 text-[11px] transition-all cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          {/* Selected files list */}
                          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-left">
                            {selectedFiles.map((file, idx) => (
                              <div
                                key={`${file.name}-${idx}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-[#18181B]/80 border border-[#27272A] hover:border-zinc-700 transition-all text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="p-1 rounded bg-[#121215] shrink-0">
                                    {getFileIcon(file.name, file.type)}
                                  </div>
                                  <span className="text-white font-medium truncate max-w-[200px]" title={file.name}>
                                    {file.name}
                                  </span>
                                  <span className="text-zinc-500 text-[11px] font-mono shrink-0">
                                    {formatBytes(file.size)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx)}
                                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-[#121215] transition-all shrink-0 cursor-pointer"
                                  title="Remove this file"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="pt-1 text-[11px] text-amber-400/90 flex items-center justify-center gap-1.5 bg-amber-950/20 py-1.5 px-2 rounded-lg border border-amber-900/30">
                            <Archive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>These files will be packaged into a ZIP archive and uploaded to Backblaze B2.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Text Input Area */
                  <div className="space-y-3 bg-[#121215]/60 p-3.5 rounded-xl border border-[#27272A]">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#E11D2E]" />
                          <span>Note Title / Name</span>
                          <span className="text-zinc-500 font-normal">(optional)</span>
                        </label>
                        <span className="text-[10px] text-zinc-500 font-mono">Saved as .txt</span>
                      </div>
                      <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="e.g. Database_Passwords, Secret_Memo, API_Tokens..."
                        className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#E11D2E] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                          <span>Secret Text Content</span>
                          <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-2">
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
                            className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 bg-[#18181B] px-2 py-0.5 rounded border border-[#27272A] hover:border-zinc-500 transition-all cursor-pointer"
                          >
                            <Clipboard className="w-3 h-3 text-[#E11D2E]" /> Paste
                          </button>
                          {textContent && (
                            <button
                              type="button"
                              onClick={() => setTextContent('')}
                              className="text-[10px] text-zinc-500 hover:text-red-400 cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        value={textContent}
                        onChange={(e) => {
                          setTextContent(e.target.value);
                          setUploadError('');
                        }}
                        placeholder="Type or paste your secret message, confidential notes, passwords, access keys, or code snippets here..."
                        className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#E11D2E] rounded-xl p-3 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none transition-all resize-y min-h-[120px]"
                      />

                      <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500">
                        <span>
                          {textContent.length} chars ·{' '}
                          {textContent.trim() ? textContent.trim().split(/\s+/).length : 0} words
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-600">Templates:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTextTitle('API_Secrets');
                              setTextContent('API_KEY=sk_live_9942a78fbc31...\nDATABASE_URL=mysql://user:pass@gateway:4000/secure_vault');
                              setUploadError('');
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#18181B] hover:text-white hover:border-[#E11D2E]/50 border border-[#27272A] transition-all cursor-pointer"
                          >
                            API Keys
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTextTitle('Confidential_Note');
                              setTextContent('CONFIDENTIAL NOTE:\nThis message is encrypted with SECURE VAULT.\nAccess code will expire per configuration.');
                              setUploadError('');
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#18181B] hover:text-white hover:border-[#E11D2E]/50 border border-[#27272A] transition-all cursor-pointer"
                          >
                            Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage Mode Specific Configuration */}
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
                  <div className="space-y-3 p-4 rounded-xl bg-[#121215] border border-amber-900/40 mb-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Long-Term Vault Storage
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 rounded-full font-medium">
                        Owner Protected
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Files in Long-Term Storage remain securely preserved in Backblaze B2 until explicitly deleted by you.
                    </p>
                    <div className="flex items-center justify-between bg-[#18181B] p-2.5 rounded-lg border border-[#27272A] text-xs">
                      <span className="text-zinc-400">Retention Policy:</span>
                      <span className="text-emerald-400 font-semibold">Permanent (Until Owner Deletes)</span>
                    </div>
                  </div>
                ) : (
                  /* Temporary Storage Auto-Purge Expiry Selector */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-[#121215] p-3 rounded-xl border border-[#27272A] hover:border-[#3F3F46] transition-all">
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <Clock className="w-4 h-4 text-[#E11D2E]" />
                        <span className="font-medium">Auto-Expire:</span>
                      </div>
                      <select
                        value={expiryOption}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExpiryOption(val);
                          if (val === 'custom' && !customDateTime) {
                            setCustomDateTime(getDefaultDateTime());
                          }
                        }}
                        className="bg-[#18181B] border border-[#27272A] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E11D2E] cursor-pointer"
                      >
                        <optgroup label="Popular Presets">
                          <option value="5m">5 Minutes (Quick View)</option>
                          <option value="10m">10 Minutes</option>
                          <option value="30m">30 Minutes</option>
                          <option value="1h">1 Hour (Default)</option>
                          <option value="6h">6 Hours</option>
                          <option value="12h">12 Hours</option>
                          <option value="24h">24 Hours</option>
                          <option value="3d">3 Days</option>
                        </optgroup>
                        <optgroup label="Custom">
                          <option value="custom">⚙️ Custom (Your Choice...)</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Custom Option: "Your Choice" Drawer */}
                    {expiryOption === 'custom' && (
                      <div className="p-3.5 bg-[#121215] border border-[#E11D2E]/40 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <Sliders className="w-3.5 h-3.5 text-[#E11D2E]" />
                            <span>Custom Expiry: Your Choice</span>
                          </div>
                          {/* Mode Switcher */}
                          <div className="flex items-center p-0.5 bg-[#18181B] rounded-lg border border-[#27272A] text-[11px]">
                            <button
                              type="button"
                              onClick={() => setCustomMode('duration')}
                              className={`px-2.5 py-1 rounded-md transition-all ${
                                customMode === 'duration'
                                  ? 'bg-[#E11D2E] text-white font-medium shadow-sm'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Duration
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomMode('date');
                                if (!customDateTime) setCustomDateTime(getDefaultDateTime());
                              }}
                              className={`px-2.5 py-1 rounded-md transition-all ${
                                customMode === 'date'
                                  ? 'bg-[#E11D2E] text-white font-medium shadow-sm'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Date & Time
                            </button>
                          </div>
                        </div>

                        {/* Duration Mode */}
                        {customMode === 'duration' ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                                  Duration Value
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="999"
                                  value={customDurationValue}
                                  onChange={(e) => setCustomDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#E11D2E]"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                                  Unit
                                </label>
                                <select
                                  value={customDurationUnit}
                                  onChange={(e) => setCustomDurationUnit(e.target.value)}
                                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]"
                                >
                                  <option value="m">Minute(s)</option>
                                  <option value="h">Hour(s)</option>
                                  <option value="d">Day(s)</option>
                                  <option value="w">Week(s)</option>
                                  <option value="mo">Month(s)</option>
                                </select>
                              </div>
                            </div>

                            {/* Quick selection chips */}
                            <div>
                              <div className="text-[10px] text-zinc-400 mb-1.5">Quick selections:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { label: '15m', val: 15, unit: 'm' },
                                  { label: '45m', val: 45, unit: 'm' },
                                  { label: '2h', val: 2, unit: 'h' },
                                  { label: '12h', val: 12, unit: 'h' },
                                  { label: '3d', val: 3, unit: 'd' },
                                ].map((chip) => (
                                  <button
                                    type="button"
                                    key={chip.label}
                                    onClick={() => {
                                      setCustomDurationValue(chip.val);
                                      setCustomDurationUnit(chip.unit);
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                                      customDurationValue === chip.val && customDurationUnit === chip.unit
                                        ? 'bg-red-950/80 border-[#E11D2E] text-white font-semibold'
                                        : 'bg-[#18181B] border-[#27272A] text-zinc-400 hover:text-white hover:border-zinc-600'
                                    }`}
                                  >
                                    {chip.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Date & Time Mode */
                          <div className="space-y-1.5">
                            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">
                              Choose Specific Expiration Date & Time
                            </label>
                            <div className="relative">
                              <input
                                type="datetime-local"
                                value={customDateTime}
                                min={getMinDateTime()}
                                onChange={(e) => setCustomDateTime(e.target.value)}
                                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E11D2E] [color-scheme:dark]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Expiry Summary Tag */}
                    {(() => {
                      const preview = getExpiryPreview();
                      if (!preview) return null;
                      return (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181B]/70 border border-[#27272A] text-[11px]">
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${preview.isNever ? 'text-emerald-400' : preview.isError ? 'text-amber-400' : 'text-[#E11D2E]'}`} />
                          <span className={`truncate ${preview.isNever ? 'text-emerald-400 font-medium' : preview.isError ? 'text-amber-400 font-medium' : 'text-zinc-300'}`}>
                            {preview.text}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400 font-mono">
                      <span>Uploading & Hashing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#121215] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#E11D2E] to-red-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {uploadError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  type="submit"
                  disabled={Boolean(currentUser && ((entryMode === 'file' ? selectedFiles.length === 0 : !textContent.trim()) || isUploading))}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/30 active:scale-[0.99] cursor-pointer ${
                    !currentUser
                      ? 'bg-gradient-to-r from-[#E11D2E] to-[#8A071A] hover:from-[#FF2E44] hover:to-[#E11D2E] border border-red-500/30 hover:shadow-red-900/60'
                      : 'bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed hover:shadow-red-900/50'
                  }`}
                >
                  {!currentUser ? (
                    <>
                      <Lock className="w-4 h-4 text-white" />
                      <span>Sign In or Create Account to Upload</span>
                    </>
                  ) : isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating Secure Code...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      {entryMode === 'file' ? 'Generate Access Code & Upload' : 'Generate Access Code & Send Text'}
                    </>
                  )}
                </button>
              </form>

              {/* Upload Success Card / Code Reveal */}
              {uploadResult && (
                <div className="mt-6 p-4 rounded-xl bg-red-950/20 border border-[#E11D2E]/50 border-red-glow animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                      <CheckCircle2 className="w-4 h-4 text-[#E11D2E]" />
                      {uploadResult.isText
                        ? 'Secret Text Ready to Share'
                        : uploadResult.doc.file_count > 1 || uploadResult.doc.fileCount > 1
                        ? `Unified ZIP Archive (${uploadResult.doc.file_count || uploadResult.doc.fileCount} files)`
                        : 'ZIP Document Ready to Share'}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {uploadResult.doc.zipSize
                        ? formatBytes(uploadResult.doc.zipSize)
                        : formatBytes(uploadResult.doc.file_size)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-2">Generated access code:</p>

                  <div className="flex items-center justify-between bg-[#0B0B0D] p-3 rounded-lg border border-[#27272A] gap-2 mb-3">
                    <span className="font-mono-code text-xl sm:text-2xl font-bold tracking-widest text-white selection:bg-[#E11D2E]">
                      {uploadResult.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(uploadResult.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-medium transition-all"
                    >
                      {copySuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>

                  {/* Storage Mode & Limits Detail */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-[#0B0B0D] p-2.5 rounded-lg border border-[#27272A] mb-3">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#E11D2E]" />
                      <span>Mode:</span>
                      <strong className="text-white capitalize font-medium">
                        {uploadResult.doc.storage_mode || storageMode}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
                      <span>Quota:</span>
                      <strong className="text-white font-medium">
                        {uploadResult.doc.max_downloads != null
                          ? `${uploadResult.doc.max_downloads} dl`
                          : 'Unlimited'}
                      </strong>
                    </div>
                  </div>

                  {uploadResult.doc.delete_after_download && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/40 mb-3">
                      <Flame className="w-3.5 h-3.5 shrink-0 text-[#E11D2E]" />
                      <span>Single-use Burn on Read: Archive will delete immediately after 1 download.</span>
                    </div>
                  )}

                  {/* Expiry detail */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 bg-[#0B0B0D] px-3 py-2 rounded-lg border border-[#27272A] mb-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#E11D2E]" />
                      <span>Expiration:</span>
                    </span>
                    <span className="font-medium text-white">
                      {uploadResult.doc.expires_at
                        ? new Date(uploadResult.doc.expires_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Permanent (No expiry)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccessCodeInput(uploadResult.code);
                        setUploadResult(null);
                      }}
                      className="text-xs text-[#E11D2E] hover:underline flex items-center gap-1 font-medium"
                    >
                      Test in Access Panel &rarr;
                    </button>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      SHA-256 protected in TiDB
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom note */}
            <div className="pt-4 mt-6 border-t border-[#27272A]/70 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Encrypted Backblaze B2 storage · TiDB metadata</span>
              <span className="text-zinc-400">Up to 20 files · 1GB ZIP</span>
            </div>
          </div>

          {/* Card 2: Access Document */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 sm:p-7 relative flex flex-col justify-between shadow-2xl hover:border-[#3F3F46] transition-all">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-[#E11D2E]/30 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#E11D2E]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Access Document</h2>
                    <p className="text-xs text-zinc-400">Enter a code received from the uploader.</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#121215] text-zinc-400 border border-[#27272A]">
                  Step 2
                </span>
              </div>

              {/* Access Form */}
              <form onSubmit={handleAccessSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Access Code Credential
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={accessCodeInput}
                      onChange={(e) => {
                        setAccessCodeInput(e.target.value.trim());
                        setAccessError('');
                      }}
                      placeholder="Enter access code... (e.g. A1B95@3he5)"
                      className="w-full bg-[#121215] border border-[#27272A] rounded-xl px-4 py-3 text-sm text-white font-mono-code placeholder:text-zinc-600 focus:outline-none focus:border-[#E11D2E] focus:ring-1 focus:ring-[#E11D2E] transition-all pr-20"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setAccessCodeInput(text.trim());
                        } catch {
                          // clipboard permission denied
                        }
                      }}
                      className="absolute right-2 top-2 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-white bg-[#18181B] border border-[#27272A] rounded-lg transition-all"
                    >
                      Paste
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Format: 5 mixed characters + special symbol (@, #, $, !) + 4 mixed characters
                  </p>
                </div>

                {/* Rate limit note */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121215] border border-[#27272A] text-xs text-zinc-400">
                  <Shield className="w-3.5 h-3.5 text-[#E11D2E] shrink-0" />
                  <span>Enforced rate limits & SHA-256 hash lookup against brute-force.</span>
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
                  className="w-full py-3 px-4 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/30 hover:shadow-red-900/50 active:scale-[0.99]"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying with TiDB...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Unlock Document
                    </>
                  )}
                </button>
              </form>

              {/* Unlocked Document Result Card */}
              {unlockedDoc && (
                <div className="mt-6 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      {unlockedDoc.is_text ? 'Access Granted · Secret Text Decrypted' : 'Access Granted · Verified'}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-600/30">
                      Authorized
                    </span>
                  </div>

                  <div className="p-3 bg-[#0B0B0D] rounded-lg border border-[#27272A] mb-3 flex items-center gap-3">
                    <div className="p-2 rounded bg-[#18181B] border border-[#27272A]">
                      {getFileIcon(unlockedDoc.original_name, unlockedDoc.mime_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">
                          {unlockedDoc.original_name}
                        </h4>
                        {unlockedDoc.is_text && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            Secret Note
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="text-zinc-300 font-mono">{formatBytes(unlockedDoc.file_size)}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-medium capitalize">
                          {unlockedDoc.storage_mode || 'Online'}
                        </span>
                        <span>•</span>
                        <span>
                          {unlockedDoc.expires_at
                            ? `Expires ${new Date(unlockedDoc.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Permanent access'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium" title="Downloads / Limit">
                          <Download className="w-3 h-3" />
                          <span>
                            {unlockedDoc.download_count || 0} / {unlockedDoc.max_downloads != null ? unlockedDoc.max_downloads : '∞'}
                          </span>
                        </span>
                      </div>
                      {unlockedDoc.delete_after_download && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                          <Flame className="w-3 h-3 text-[#E11D2E]" />
                          <span>Burn on Read: This document will be deleted immediately after you download it.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Decrypted Text Reader */}
                  {unlockedDoc.is_text && unlockedDoc.text_content !== null && unlockedDoc.text_content !== undefined && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <AlignLeft className="w-3.5 h-3.5 text-[#E11D2E]" />
                          Decrypted Secret Content
                        </span>
                        <button
                          type="button"
                          onClick={() => copyTextToClipboard(unlockedDoc.text_content)}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-[#18181B] border border-[#27272A] hover:border-[#E11D2E]/60 text-zinc-300 hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          {textCopySuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#E11D2E]" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-[#0B0B0D] border border-[#27272A] rounded-xl p-3.5 max-h-60 overflow-y-auto font-mono text-xs text-zinc-200 whitespace-pre-wrap select-all relative group shadow-inner">
                        {unlockedDoc.text_content}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                        <span>{unlockedDoc.text_content.length} characters</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Decrypted via SHA-256
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadUnlockedDoc}
                      className="py-2.5 px-3 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-md shadow-red-950/40"
                    >
                      <Download className="w-3.5 h-3.5" /> {unlockedDoc.is_text ? 'Download .txt' : 'Download File'}
                    </button>
                    <a
                      href={apiUrl(
                        unlockedDoc.view_url ||
                        `/api/documents/view/${encodeURIComponent(unlockedDoc.enteredCode || accessCodeInput.trim())}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer hover:border-[#E11D2E]/40"
                      title="Open and view document in a new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#E11D2E]" /> View in Browser
                    </a>
                  </div>

                  {/* Optional Quick In-Page Preview Toggle */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setShowInlinePreview((prev) => !prev)}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#121215] hover:bg-[#18181B] border border-[#27272A] text-zinc-400 hover:text-zinc-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-[#E11D2E]" />
                      {showInlinePreview ? 'Hide In-Page Preview' : 'Quick In-Page Preview'}
                    </button>

                    {showInlinePreview && (
                      <div className="mt-2.5 p-2 bg-[#0B0B0D] border border-[#27272A] rounded-xl overflow-hidden animate-in fade-in duration-200">
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

            {/* Bottom note */}
            <div className="pt-4 mt-6 border-t border-[#27272A]/70 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Code validated in TiDB Cloud</span>
              <span className="text-zinc-400">Private Stream</span>
            </div>
          </div>
        </div>

        {/* Section: Your Uploaded Documents / Shared Online Vaults */}
        <MySharedDocuments
          currentUser={currentUser}
          onNavigateAuth={() => navigate('/login')}
        />
      </div>

      {/* TiDB Configuration & Information Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-[#E11D2E]/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-[#E11D2E]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Dual-Cloud Architecture</h3>
                <p className="text-xs text-zinc-400">TiDB Cloud (Relational Metadata) + Backblaze B2 (Private File Vault)</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* TiDB Cloud Status */}
              <div className="p-3 bg-[#121215] rounded-xl border border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-medium">TiDB Cloud Database:</span>
                  <span className="text-sm font-bold text-white">
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
                  <div className="text-right">
                    <span className="text-zinc-500 block">Host:</span>
                    <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[200px] block">{dbStatus.host}</span>
                  </div>
                )}
              </div>

              {/* Backblaze B2 Status */}
              <div className="p-3 bg-[#121215] rounded-xl border border-[#27272A] flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block font-medium">Backblaze B2 Object Storage:</span>
                  <span className="text-sm font-bold text-white">
                    {storageStatus.isConnected ? (
                      <span className="text-emerald-400 flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected & Private Bucket Live
                      </span>
                    ) : (
                      <span className="text-zinc-400">Local Disk Storage Active</span>
                    )}
                  </span>
                </div>
                {storageStatus.bucket && (
                  <div className="text-right">
                    <span className="text-zinc-500 block">Bucket:</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{storageStatus.bucket}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-zinc-300 font-semibold mb-1.5">How Data Is Stored:</p>
                <div className="p-3 bg-[#0B0B0D] rounded-xl border border-[#27272A] space-y-2 text-zinc-400">
                  <div className="flex items-start gap-2">
                    <span className="text-[#E11D2E] font-bold">1.</span>
                    <span><strong className="text-white">Backblaze B2:</strong> Stores physical encrypted PDF, PPT, and files privately.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#E11D2E] font-bold">2.</span>
                    <span><strong className="text-white">TiDB Cloud:</strong> Stores user accounts, file metadata, SHA-256 access-code hashes, and expiration timestamps.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold text-xs cursor-pointer"
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
          <div className="bg-[#18181B] border border-[#E11D2E]/60 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-center">
            <button
              onClick={() => setAuthPromptOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-[#E11D2E]/50 flex items-center justify-center mx-auto mb-4 text-[#E11D2E] shadow-xl shadow-red-950/50">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Sign In Required to Upload
            </h3>
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
                className="w-full py-2.5 px-4 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
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

      {/* Edit Document Modal */}
      {editingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-[#E11D2E]/30 flex items-center justify-center text-[#E11D2E]">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Edit Document</h3>
                <p className="text-xs text-zinc-400">ID #{editingDoc.id} · Access code: {editingDoc.access_code}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Document / Note Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] focus:border-[#E11D2E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  placeholder="e.g. Project_Report.pdf or Note.txt"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Update Expiration
                </label>
                <select
                  value={editExpiry}
                  onChange={(e) => setEditExpiry(e.target.value)}
                  className="w-full bg-[#121215] border border-[#27272A] focus:border-[#E11D2E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-colors [color-scheme:dark]"
                >
                  <option value="keep">Keep Current Expiration ({editingDoc.expires_at ? new Date(editingDoc.expires_at).toLocaleDateString() : 'Never'})</option>
                  <option value="1h">Extend 1 Hour</option>
                  <option value="24h">Extend 24 Hours</option>
                  <option value="7d">Extend 7 Days</option>
                  <option value="30d">Extend 30 Days</option>
                  <option value="never">Permanent (No expiration)</option>
                </select>
              </div>

              {editError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-red-950/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {deletingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-[#18181B] border border-red-900/50 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-center">
            <button
              onClick={() => setDeletingDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272A] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-600/40 flex items-center justify-center mx-auto mb-4 text-red-400 shadow-xl shadow-red-950/50">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Delete Document?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{deletingDoc.original_name}"</strong>?
            </p>
            <div className="p-3 bg-[#0B0B0D] rounded-xl border border-[#27272A] text-left text-xs text-zinc-400 mb-6 space-y-1">
              <div>• File will be deleted permanently from <span className="text-white font-mono">Backblaze B2</span>.</div>
              <div>• Access code <span className="text-white font-mono">{deletingDoc.access_code}</span> will be revoked from TiDB Cloud.</div>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 mb-4 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D2E]" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-zinc-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Permanently</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
