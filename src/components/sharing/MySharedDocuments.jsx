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
} from 'lucide-react';
import { authService } from '../../services/authService';
import { apiUrl } from '../../config/api';

export default function MySharedDocuments({ currentUser, onNavigateAuth }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [previewDocId, setPreviewDocId] = useState(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load shared documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCard = async (doc) => {
    try {
      const dlUrl = apiUrl(
        doc.download_url ||
        (doc.access_code
          ? `/api/documents/download/${encodeURIComponent(doc.access_code)}?action=download`
          : `/api/documents/owner/${doc.id}/download`)
      );

      const tempLink = document.createElement('a');
      tempLink.href = dlUrl;
      tempLink.download = doc.original_name || 'archive.zip';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      // Optimistically update the card's download count immediately
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, download_count: (d.download_count || 0) + 1 }
            : d
        )
      );

      // Re-fetch to sync from database
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

  if (!currentUser) {
    return (
      <div className="bg-[#18181B]/70 border border-[#27272A] rounded-2xl p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-[#E11D2E]/30 flex items-center justify-center mx-auto mb-3 text-[#E11D2E]">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Private Vault Registry</h3>
        <p className="text-xs sm:text-sm text-zinc-400 mb-5 leading-relaxed max-w-md mx-auto">
          Your uploaded documents and unique access codes are private to your account. Sign in to
          manage your shared online vaults.
        </p>
        <button
          type="button"
          onClick={onNavigateAuth}
          className="px-4 py-2 rounded-xl bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-red-950/30"
        >
          Sign In or Register
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 sm:p-7 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Your Shared Online Vaults</h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-950/60 text-[#E11D2E] border border-[#E11D2E]/30">
              {documents.length} {documents.length === 1 ? 'vault' : 'vaults'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitored archives in private Backblaze B2 with real-time download and expiry enforcement.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDocuments}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#27272A] transition-all cursor-pointer"
          title="Refresh vault list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Documents Grid / Empty State */}
      {documents.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#121215] border border-dashed border-[#27272A] rounded-xl">
          <Archive className="w-10 h-10 text-zinc-600 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-zinc-300">No active online archives</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Select files in Step 1 and upload with Online Sharing to generate a secure access code.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const timeRemaining = getTimeRemaining(doc.expires_at);
            const isLimitReached =
              doc.max_downloads != null && (doc.download_count || 0) >= doc.max_downloads;
            const isDeleteTriggered =
              doc.delete_after_download && (doc.download_count || 0) >= 1;

            return (
              <div
                key={doc.id}
                className="bg-[#121215] border border-[#27272A] hover:border-[#E11D2E]/40 rounded-xl p-4 flex flex-col justify-between transition-all shadow-md group relative"
              >
                <div>
                  {/* Top Bar: Badges & Delete */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        #{doc.id}
                      </span>
                      {doc.storage_mode === 'online' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-[#E11D2E]/30 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5 text-[#E11D2E]" /> Online
                        </span>
                      ) : doc.storage_mode === 'temporary' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
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

                    {/* Delete Trigger */}
                    <button
                      type="button"
                      onClick={() => setDeletingDoc(doc)}
                      className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Delete archive from B2 and TiDB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* File Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-[#18181B] border border-[#27272A] shrink-0">
                      <Archive className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-sm font-semibold text-white truncate"
                        title={doc.original_name}
                      >
                        {doc.original_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-400 border border-amber-800/30 text-[10px] font-bold">
                          📦 {doc.file_count || 1} {doc.file_count === 1 ? 'file' : 'files'}
                        </span>
                        <span>· {formatBytes(doc.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Limits and Expiry Progress */}
                  <div className="space-y-2 p-2.5 rounded-lg bg-[#0E0E12] border border-[#27272A] mb-3 text-xs">
                    {/* Downloads Limit Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3 text-[#E11D2E]" /> Downloads:
                        </span>
                        <span className="font-mono text-white font-medium">
                          {doc.download_count || 0} /{' '}
                          {doc.max_downloads != null ? doc.max_downloads : '∞'}
                        </span>
                      </div>
                      {doc.max_downloads != null && (
                        <div className="w-full h-1 bg-[#18181B] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isLimitReached
                                ? 'bg-amber-500'
                                : 'bg-gradient-to-r from-[#E11D2E] to-red-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                ((doc.download_count || 0) / doc.max_downloads) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expiration Countdown & Burn on read note */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#E11D2E]" /> Expiry:
                      </span>
                      <span
                        className={`font-medium ${
                          timeRemaining.isExpired ? 'text-red-400 font-bold' : 'text-zinc-200'
                        }`}
                      >
                        {timeRemaining.text}
                      </span>
                    </div>

                    {doc.delete_after_download && (
                      <div className="flex items-center gap-1 text-[10px] text-red-400/90 font-medium pt-0.5">
                        <Flame className="w-3 h-3 shrink-0" />
                        <span>Self-destructs after 1st download</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Access Code Box */}
                {doc.access_code ? (
                  <div className="pt-2.5 border-t border-[#27272A]/80">
                    <div className="text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
                      <span>Access Code</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Ready to share</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#0B0B0D] px-2.5 py-1.5 rounded-lg border border-[#27272A] gap-2">
                      <code className="font-mono-code text-xs text-white font-bold tracking-wider truncate">
                        {doc.access_code}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyCode(doc.access_code)}
                        className="px-2 py-1 rounded bg-[#E11D2E] hover:bg-[#FF2E44] text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm shrink-0"
                        title="Copy access code"
                      >
                        {copiedCode === doc.access_code ? (
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
                    </div>
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-[#27272A]/80 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Access Code</span>
                    <span className="text-zinc-400 font-mono text-[10px]">HMAC Hash Protected</span>
                  </div>
                )}

                {/* Direct Card Action Buttons: View in Browser & Download */}
                <div className="pt-2.5 mt-2.5 border-t border-[#27272A]/80 flex items-center gap-1.5">
                  <a
                    href={apiUrl(
                      doc.view_url ||
                      (doc.access_code
                        ? `/api/documents/view/${encodeURIComponent(doc.access_code)}`
                        : `/api/documents/owner/${doc.id}/view`)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#E11D2E]/50 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all text-center cursor-pointer shadow-sm"
                    title="Open in new browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E11D2E]" />
                    <span>View</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDownloadCard(doc)}
                    disabled={isLimitReached || isDeleteTriggered || timeRemaining.isExpired}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm shadow-red-950/30"
                    title="Download document archive"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDocId(previewDocId === doc.id ? null : doc.id)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      previewDocId === doc.id
                        ? 'bg-[#E11D2E]/20 border-[#E11D2E] text-white'
                        : 'bg-[#18181B] hover:bg-[#27272A] border-[#27272A] text-zinc-400 hover:text-white'
                    }`}
                    title={previewDocId === doc.id ? 'Close Quick Preview' : 'Toggle Quick Preview'}
                  >
                    <Eye className="w-3.5 h-3.5 text-zinc-300" />
                  </button>
                </div>

                {/* Inline Preview Drawer */}
                {previewDocId === doc.id && (
                  <div className="mt-2.5 p-1.5 bg-[#0B0B0D] border border-[#27272A] rounded-xl overflow-hidden animate-in fade-in duration-150">
                    <iframe
                      src={apiUrl(
                        doc.view_url ||
                        (doc.access_code
                          ? `/api/documents/view/${encodeURIComponent(doc.access_code)}`
                          : `/api/documents/owner/${doc.id}/view`)
                      )}
                      title={`Preview ${doc.original_name}`}
                      className="w-full h-48 rounded-lg border border-zinc-800 bg-[#121215]"
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
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#E11D2E]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete Document Archive?</h4>
                <p className="text-xs text-zinc-400">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#121215] p-3 rounded-xl border border-[#27272A]">
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
                className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-semibold text-zinc-300 transition-all cursor-pointer"
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
    </div>
  );
}
