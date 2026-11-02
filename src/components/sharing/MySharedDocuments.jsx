import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Archive,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Clock,
  Download,
  Eye,
  Globe,
  HardDrive,
  Timer,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Lock,
  ExternalLink,
  X,
  Sliders,
  EyeOff,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  FileCode,
  FileImage,
  FileType,
  File,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { apiUrl } from '../../config/api';
import VaultCodeSecurityModal from './VaultCodeSecurityModal';
import AiDocumentModal from '../ai/AiDocumentModal';

export default function MySharedDocuments({ currentUser, onNavigateAuth, onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [previewDocId, setPreviewDocId] = useState(null);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'online' | 'temporary' | 'long_term' | 'expired'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'downloads' | 'size'

  // Edit / Limit Adjustment State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editStorageMode, setEditStorageMode] = useState('online');
  const [editMaxDownloads, setEditMaxDownloads] = useState('unlimited');
  const [editDeleteAfterDownload, setEditDeleteAfterDownload] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // 2FA Access Code Protection State
  const [revealedCodes, setRevealedCodes] = useState({});
  const [securityModalDoc, setSecurityModalDoc] = useState(null);
  const [securityModalAction, setSecurityModalAction] = useState('reveal');

  // AI Document Assistant State
  const [aiModalDoc, setAiModalDoc] = useState(null);

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditStorageMode(doc.storage_mode || 'online');
    setEditMaxDownloads(doc.max_downloads != null ? doc.max_downloads : 'unlimited');
    setEditDeleteAfterDownload(Boolean(doc.delete_after_download));
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    setIsSavingEdit(true);
    setEditError('');

    try {
      const isUnlimited = editMaxDownloads === 'unlimited' || editMaxDownloads === '' || editMaxDownloads === null;
      const res = await fetch(apiUrl(`/documents/${editingDoc.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          storage_mode: editStorageMode,
          max_downloads: isUnlimited ? null : Number(editMaxDownloads),
          delete_after_download: editDeleteAfterDownload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update document settings.');
      }

      setEditingDoc(null);
      fetchDocuments();
    } catch (err) {
      setEditError(err.message || 'Error updating document.');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
      return <Archive className="w-4 h-4 text-amber-400" />;
    }
    if (['txt', 'text', 'note'].includes(ext) || mime?.includes('text/plain')) {
      return <FileText className="w-4 h-4 text-emerald-400" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext) || mime?.includes('image')) {
      return <FileImage className="w-4 h-4 text-rose-400" />;
    }
    if (['pdf'].includes(ext) || mime?.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (['doc', 'docx', 'rtf'].includes(ext)) {
      return <FileType className="w-4 h-4 text-blue-400" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime?.includes('sheet') || mime?.includes('excel')) {
      return <FileType className="w-4 h-4 text-emerald-400" />;
    }
    if (['ppt', 'pptx'].includes(ext) || mime?.includes('presentation')) {
      return <FileType className="w-4 h-4 text-orange-400" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'py', 'md'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-amber-400" />;
    }
    return <File className="w-4 h-4 text-zinc-400" />;
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const fetchDocuments = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/documents/mine'), {
        headers: authService.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        setDocuments(docs);
        if (onDocumentsChange) {
          onDocumentsChange(docs);
        }
      }
    } catch (err) {
      console.error('Failed to load shared documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDocViewUrl = (doc) => {
    let rawUrl =
      doc.view_url ||
      (doc.access_code
        ? `/api/documents/view/${encodeURIComponent(doc.access_code)}`
        : `/api/documents/owner/${doc.id}/view`);

    if (!doc.access_code && !rawUrl.includes('ticket=') && !rawUrl.includes('token=')) {
      const token = authService.getToken ? authService.getToken() : (sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token'));
      if (token) {
        rawUrl += (rawUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
    }
    return apiUrl(rawUrl);
  };

  const getDocDownloadUrl = (doc) => {
    let rawUrl =
      doc.download_url ||
      (doc.access_code
        ? `/api/documents/download/${encodeURIComponent(doc.access_code)}?action=download`
        : `/api/documents/owner/${doc.id}/download`);

    if (!doc.access_code && !rawUrl.includes('ticket=') && !rawUrl.includes('token=')) {
      const token = authService.getToken ? authService.getToken() : (sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token'));
      if (token) {
        rawUrl += (rawUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`;
      }
    }
    return apiUrl(rawUrl);
  };

  const handleDownloadCard = async (doc) => {
    try {
      const dlUrl = getDocDownloadUrl(doc);

      const tempLink = document.createElement('a');
      tempLink.href = dlUrl;
      tempLink.download = doc.original_name || 'archive.zip';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, download_count: (d.download_count || 0) + 1 }
            : d
        )
      );

      setTimeout(() => {
        fetchDocuments();
      }, 1500);
    } catch (err) {
      console.error('Card download error:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 15000);

    const onDownloadEvent = () => {
      fetchDocuments();
    };
    window.addEventListener('vault_document_downloaded', onDownloadEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('vault_document_downloaded', onDownloadEvent);
    };
  }, [currentUser]);

  const confirmDelete = async () => {
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
      fetchDocuments();
    } catch (err) {
      setDeleteError(err.message || 'Error deleting document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return { text: 'Permanent', isExpired: false };
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', isExpired: true };
    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return { text: `${mins}m left`, isExpired: false };
    if (hours < 48) return { text: `${hours}h left`, isExpired: false };
    return { text: `${days}d left`, isExpired: false };
  };

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch =
          searchQuery.trim() === '' ||
          doc.original_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.access_code?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const timeRemaining = getTimeRemaining(doc.expires_at);

        if (filterMode === 'active') {
          return !timeRemaining.isExpired;
        }
        if (filterMode === 'expired') {
          return timeRemaining.isExpired;
        }
        if (filterMode === 'online') {
          return doc.storage_mode === 'online';
        }
        if (filterMode === 'temporary') {
          return doc.storage_mode === 'temporary';
        }
        if (filterMode === 'long_term') {
          return doc.storage_mode === 'long_term';
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at || b.id) - new Date(a.created_at || a.id);
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at || a.id) - new Date(b.created_at || b.id);
        }
        if (sortBy === 'downloads') {
          return (b.download_count || 0) - (a.download_count || 0);
        }
        if (sortBy === 'size') {
          return (b.file_size || 0) - (a.file_size || 0);
        }
        return 0;
      });
  }, [documents, searchQuery, filterMode, sortBy]);

  const activeCount = useMemo(() => {
    return documents.filter((d) => !getTimeRemaining(d.expires_at).isExpired).length;
  }, [documents]);

  const expiredCount = useMemo(() => {
    return documents.filter((d) => getTimeRemaining(d.expires_at).isExpired).length;
  }, [documents]);

  if (!currentUser) {
    return (
      <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 text-center max-w-xl mx-auto shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-[#E11D2E]/40 flex items-center justify-center mx-auto mb-3 text-[#E11D2E]">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Private Vault Registry</h3>
        <p className="text-xs sm:text-sm text-zinc-400 mb-5 leading-relaxed max-w-md mx-auto">
          Your uploaded documents and unique access codes are secured in TiDB Cloud and Backblaze B2. Sign in to view and manage your files.
        </p>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-5 py-2.5 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-red-950/30"
        >
          Sign In or Register
        </button>
      </div>
    );
  }

  return (
    <div className="vault-panel vault-panel-glow-top p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#E11D2E]" />
              <span>Document Vault Archives</span>
            </h3>
            <span className="text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              {documents.length} {documents.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your encrypted files in Backblaze B2, track downloads, and inspect SHA-256 access keys.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDocuments}
          className="self-start sm:self-center px-3 py-1.5 text-zinc-300 hover:text-white rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium shadow-xs"
          title="Refresh vault archives and sync stats"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E11D2E]' : 'text-zinc-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search, Filter Chips & Sort Controls */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name or access code..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#E11D2E] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-950/70 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#E11D2E]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer [color-scheme:dark]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="downloads">Most Downloads</option>
              <option value="size">Largest Size</option>
            </select>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`vault-filter-chip ${filterMode === 'all' ? 'active' : ''}`}
          >
            All ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('active')}
            className={`vault-filter-chip ${filterMode === 'active' ? 'active' : ''}`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('online')}
            className={`vault-filter-chip ${filterMode === 'online' ? 'active' : ''}`}
          >
            Online Sharing
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('temporary')}
            className={`vault-filter-chip ${filterMode === 'temporary' ? 'active' : ''}`}
          >
            Temporary
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('long_term')}
            className={`vault-filter-chip ${filterMode === 'long_term' ? 'active' : ''}`}
          >
            Long-Term
          </button>
          {expiredCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('expired')}
              className={`vault-filter-chip ${filterMode === 'expired' ? 'active' : ''}`}
            >
              Expired ({expiredCount})
            </button>
          )}
        </div>
      </div>

      {/* Documents Grid / Empty State */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 px-4 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl">
          <Archive className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-zinc-300">
            {searchQuery || filterMode !== 'all' ? 'No matching documents found' : 'No documents in vault yet'}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery || filterMode !== 'all'
              ? 'Try changing your search term or filter chips above.'
              : 'Upload a file or send a secret note in the Send & Share tab to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {filteredDocuments.map((doc) => {
            const timeRemaining = getTimeRemaining(doc.expires_at);
            const isLimitReached =
              doc.max_downloads != null && (doc.download_count || 0) >= doc.max_downloads;
            const isDeleteTriggered =
              doc.delete_after_download && (doc.download_count || 0) >= 1;

            return (
              <div
                key={doc.id}
                className="bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/90 rounded-xl p-4 flex flex-col justify-between transition-all duration-150 shadow-md group relative self-start"
              >
                <div>
                  {/* Top Bar: Badges & Actions */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        #{doc.id}
                      </span>
                      {doc.storage_mode === 'online' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-[#E11D2E]/30 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5 text-[#E11D2E]" /> Online
                        </span>
                      ) : doc.storage_mode === 'temporary' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Temp
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                          Long-Term
                        </span>
                      )}

                      {/* Status Tag */}
                      {timeRemaining.isExpired ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/40">
                          Expired
                        </span>
                      ) : isLimitReached ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/40">
                          Limit Met
                        </span>
                      ) : isDeleteTriggered ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800/40">
                          Purging
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Card Top Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(doc)}
                        className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Configure download limit & storage mode"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDoc(doc)}
                        className="p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Delete archive permanently from B2 and TiDB"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                      {getFileIcon(doc.original_name, doc.mime_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs sm:text-sm font-semibold text-white truncate"
                        title={doc.original_name}
                      >
                        {doc.original_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                        {Boolean(doc.file_count && doc.file_count > 1) && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-400 border border-amber-800/30 text-[10px] font-bold">
                            📦 {doc.file_count} files
                          </span>
                        )}
                        <span>{formatBytes(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Limits, Engagement, and Expiry Progress */}
                  <div className="space-y-2 p-2.5 rounded-lg bg-[#0e0e12] border border-zinc-800/80 mb-3 text-xs">
                    {/* Engagement Metrics */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>Views:</span>
                        </span>
                        <span className="font-mono text-cyan-300 font-bold text-xs bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-800/40">
                          {doc.view_count || 0}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Download className="w-3 h-3 text-[#E11D2E] shrink-0" />
                          <span>Downloads:</span>
                        </span>
                        <span className="font-mono text-white font-bold text-xs bg-red-950/40 px-1.5 py-0.2 rounded border border-red-900/40">
                          {doc.download_count || 0}
                          <span className="text-zinc-500 font-normal">/{doc.max_downloads != null ? doc.max_downloads : '∞'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Expiration Countdown */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Expiry:</span>
                      </span>
                      <span className={`font-medium ${timeRemaining.isExpired ? 'text-red-400 font-bold' : 'text-zinc-200'}`}>
                        {timeRemaining.text}
                      </span>
                    </div>

                    {/* Burn on read */}
                    {Boolean(doc.delete_after_download) && (
                      <div className="flex items-center gap-1 text-[10px] text-red-400/90 font-medium pt-1 border-t border-zinc-800/60">
                        <Flame className="w-3 h-3 shrink-0 text-red-500 animate-pulse" />
                        <span>Self-destructs after 1st download</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Access Code Box */}
                <div className="pt-2 border-t border-zinc-800/80">
                  <div className="text-[11px] text-zinc-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-zinc-300 font-medium">
                      <Lock className="w-3 h-3 text-[#E11D2E]" />
                      <span>Access Code</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {revealedCodes[doc.id] ? (
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">
                          2FA Protected
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityModalDoc(doc);
                          setSecurityModalAction('regenerate');
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Regenerate access code"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-400 hover:text-[#E11D2E]" />
                      </button>
                    </div>
                  </div>

                  {revealedCodes[doc.id] ? (
                    <div className="flex items-center justify-between bg-[#0b0b0e] px-2.5 py-1.5 rounded-lg border border-emerald-600/30 gap-2">
                      <code className="font-mono text-xs text-white font-bold tracking-wider truncate">
                        {revealedCodes[doc.id]}
                      </code>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyCode(revealedCodes[doc.id])}
                          className="px-2 py-1 rounded bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          title="Copy access code"
                        >
                          {copiedCode === revealedCodes[doc.id] ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRevealedCodes((prev) => {
                              const next = { ...prev };
                              delete next[doc.id];
                              return next;
                            });
                          }}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
                          title="Hide access code"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#0b0b0e] px-2.5 py-1.5 rounded-lg border border-zinc-800 gap-2">
                      <span className="font-mono text-zinc-500 text-xs tracking-widest select-none">
                        ••••••••••
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSecurityModalDoc(doc);
                          setSecurityModalAction('reveal');
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#E11D2E]/50 text-zinc-200 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="Enter password + PIN or OTP to reveal code"
                      >
                        <Lock className="w-3 h-3 text-[#E11D2E]" />
                        <span>Show Code</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons: View & Download */}
                <div className="pt-2 mt-2 border-t border-zinc-800/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = previewDocId === doc.id ? null : doc.id;
                      setPreviewDocId(nextState);
                      if (nextState) {
                        setDocuments((prev) =>
                          prev.map((d) =>
                            d.id === doc.id
                              ? { ...d, view_count: (d.view_count || 0) + 1 }
                              : d
                          )
                        );
                        setTimeout(fetchDocuments, 1500);
                      }
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm ${
                      previewDocId === doc.id
                        ? 'bg-[#E11D2E]/20 border-[#E11D2E] text-white'
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-[#E11D2E]/50 text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>{previewDocId === doc.id ? 'Close' : 'View'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadCard(doc)}
                    disabled={isLimitReached || isDeleteTriggered || timeRemaining.isExpired}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-red-950/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>

                {/* DocQevrilo AI Assistant Button */}
                <button
                  type="button"
                  onClick={() => setAiModalDoc(doc)}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-gradient-to-r from-red-950/70 via-zinc-900 to-red-950/50 hover:from-red-900 hover:to-zinc-800 border border-[#E11D2E]/40 hover:border-[#E11D2E] text-zinc-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                  title="Summarize document, ask AI questions, and generate quizzes"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E11D2E] group-hover:rotate-12 transition-transform" />
                  <span>✨ Ask AI & Summarize</span>
                </button>

                {/* Inline Preview Drawer */}
                {previewDocId === doc.id && (
                  <div className="mt-2.5 p-2 bg-[#0b0b0e] border border-zinc-800 rounded-xl overflow-hidden animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1 text-zinc-300 font-medium truncate">
                        <Eye className="w-3 h-3 text-[#E11D2E]" />
                        <span>Preview Archive</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={getDocViewUrl(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-zinc-400 hover:text-white hover:underline text-[10px]"
                        >
                          <ExternalLink className="w-3 h-3 text-[#E11D2E]" />
                          <span>New Tab</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setPreviewDocId(null)}
                          className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <iframe
                      src={getDocViewUrl(doc)}
                      title={`Preview ${doc.original_name}`}
                      className="w-full h-80 rounded-lg border border-zinc-800 bg-[#121215]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#E11D2E]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete Document Archive?</h4>
                <p className="text-xs text-zinc-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#121215] p-3 rounded-xl border border-zinc-800">
              Deleting <strong className="text-white">{deletingDoc.original_name}</strong> will remove
              the encrypted ZIP file from Backblaze B2 and purge all access credentials from TiDB Cloud.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950/40"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting from B2 & TiDB...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Permanent Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Storage & Download Limits Modal Dialog */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Adjust Storage & Downloads</h4>
                  <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">
                    #{editingDoc.id} · {editingDoc.original_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Storage Mode Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-300">
                Storage Architecture
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'temporary', label: 'Temporary', desc: 'Auto-Purge' },
                  { id: 'online', label: 'Online', desc: 'Controlled' },
                  { id: 'long_term', label: 'Long-Term', desc: 'Archived' },
                ].map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => {
                      setEditStorageMode(mode.id);
                      if (mode.id === 'temporary' || mode.id === 'long_term') {
                        if (editMaxDownloads === 5) setEditMaxDownloads('unlimited');
                      }
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editStorageMode === mode.id
                        ? 'bg-red-950/70 border-[#E11D2E] text-white font-bold shadow-sm'
                        : 'bg-[#121215] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">{mode.label}</div>
                    <div className="text-[10px] text-zinc-500">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Download Limit Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
                  <span>Maximum Downloads</span>
                </label>
                <span className="text-[10px] text-zinc-400">Current: {editingDoc.download_count || 0} downloaded</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Unlimited (∞)', value: 'unlimited' },
                  { label: '1 Download', value: 1 },
                  { label: '5 Downloads', value: 5 },
                  { label: '10 Downloads', value: 10 },
                ].map((opt) => {
                  const isSelected =
                    opt.value === 'unlimited'
                      ? editMaxDownloads === 'unlimited' || editMaxDownloads === null || editMaxDownloads === ''
                      : Number(editMaxDownloads) === opt.value;

                  return (
                    <button
                      type="button"
                      key={String(opt.value)}
                      onClick={() => setEditMaxDownloads(opt.value)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-950/70 border-[#E11D2E] text-white shadow-sm'
                          : 'bg-[#121215] border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Burn-on-read toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#121215] border border-zinc-800">
              <div className="flex items-start gap-2.5">
                <Flame className={`w-4 h-4 mt-0.5 ${editDeleteAfterDownload ? 'text-red-400' : 'text-zinc-500'}`} />
                <div>
                  <div className="text-xs font-semibold text-white">Delete After First Download</div>
                  <div className="text-[10px] text-zinc-400">Purges file from Backblaze B2 once downloaded.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditDeleteAfterDownload(!editDeleteAfterDownload)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
                  editDeleteAfterDownload
                    ? 'bg-[#E11D2E] border-[#E11D2E]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-0.5 ${
                    editDeleteAfterDownload ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
                {editError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-950/40"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Security Modal for Access Code Reveal / Regenerate */}
      <VaultCodeSecurityModal
        isOpen={Boolean(securityModalDoc)}
        onClose={() => setSecurityModalDoc(null)}
        doc={securityModalDoc}
        action={securityModalAction}
        currentUser={currentUser}
        onSuccess={(accessCode) => {
          if (securityModalDoc) {
            setRevealedCodes((prev) => ({
              ...prev,
              [securityModalDoc.id]: accessCode,
            }));
            setDocuments((prev) =>
              prev.map((d) => (d.id === securityModalDoc.id ? { ...d, access_code: accessCode } : d))
            );
          }
        }}
      />

      {/* DocQevrilo AI Assistant Modal */}
      {aiModalDoc && (
        <AiDocumentModal
          isOpen={Boolean(aiModalDoc)}
          onClose={() => setAiModalDoc(null)}
          doc={aiModalDoc}
          accessCode={aiModalDoc.access_code || revealedCodes[aiModalDoc.id] || ''}
        />
      )}
    </div>
  );
}
