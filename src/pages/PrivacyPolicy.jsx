import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  EyeOff,
  Radio,
  Clock,
  HardDrive,
  Trash2,
  KeyRound,
  FileCheck,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col items-center bg-[#0B0B0D] text-[#ECECF1] relative min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E11D2E]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Back Link & Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-[#E11D2E] group-hover:-translate-x-1 transition-transform" />
            <span>Back to DocQevrilo Home</span>
          </Link>
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800">
            Last Updated: November 2026
          </span>
        </div>

        {/* Hero Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-zinc-800 relative overflow-hidden shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#E11D2E]/40 flex items-center justify-center text-[#E11D2E] shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#E11D2E] font-bold block">
                Security &amp; Legal Protocol
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                DocQevrilo Privacy Policy
              </h1>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mt-2">
            Privacy is not an optional toggle or secondary feature — it is our core engineering foundation.
            This document outlines how DocQevrilo handles your documents, accounts, and cryptographic access codes with
            strict zero-knowledge architecture.
          </p>

          {/* Quick Highlight Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-800/80 mt-6">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <EyeOff className="w-4 h-4 text-[#E11D2E] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Zero Content Visibility</span>
                <span className="text-zinc-400 text-[11px]">We never read or index your files</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Direct P2P Memory Stream</span>
                <span className="text-zinc-400 text-[11px]">Zero cloud storage for Live Share</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Auto-Purge Guarantee</span>
                <span className="text-zinc-400 text-[11px]">Expired files deleted permanently</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm leading-relaxed text-zinc-300">
          {/* Section 1 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">1</span>
              <span>Information We Handle and Collect</span>
            </h2>
            <p>
              DocQevrilo collects only the minimal data strictly necessary to authenticate your account and securely route files between authorized parties:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-300">
              <li>
                <strong className="text-white">Account Information:</strong> When you register an account, we store your email address, full name, occupation, and salted bcrypt cryptographic hashes of your password and 4-digit Security PIN. We never store plain-text passwords or PINs.
              </li>
              <li>
                <strong className="text-white">Cryptographic Access Code Hashes:</strong> When you generate an access code to share a document, the original code is provided to you. DocQevrilo only stores a one-way <strong>SHA-256 hash</strong> of the code in TiDB Cloud.
              </li>
              <li>
                <strong className="text-white">File Metadata:</strong> We store non-sensitive administrative metadata: original file name, byte size, MIME type, upload timestamp, expiry date, view count, and completed download count.
              </li>
              <li>
                <strong className="text-white">Security &amp; Audit Logs:</strong> Timestamped records of authentication attempts, OTP dispatches, and rate limit counters to protect accounts against automated brute-force attacks.
              </li>
            </ul>
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-[#E11D2E]/30 text-xs text-red-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
              <span>
                <strong>What We Never Collect:</strong> DocQevrilo does not track third-party advertising cookies, does not sell telemetry or contact lists, and never inspects or sells private document contents.
              </span>
            </div>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">2</span>
              <span>Storage Architectures and Data Retention Policies</span>
            </h2>
            <p>
              DocQevrilo provides three distinct storage and sharing policies that govern how and where your data exists:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Temporary Storage</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Files are encrypted and stored in Backblaze B2. When your chosen expiry window (e.g. 30m, 1h, 2h, 4h, or custom date) passes, the file object is immediately and irreversibly purged from cloud storage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-[#E11D2E]/40 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Radio className="w-4 h-4 text-[#E11D2E] animate-pulse" />
                  <span>Online Sharing (Live P2P)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  <strong>Zero cloud storage. Zero server disk writes.</strong> Files stream directly between the sender and recipient's active browser memory via encrypted WebRTC DataChannels. The session terminates immediately when you go offline.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>Long-Term Storage</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Files remain encrypted in Backblaze B2 until explicitly deleted by you. Accessible at any time via your authenticated dashboard and 2FA credentials.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">3</span>
              <span>Multimodal AI Processing Security</span>
            </h2>
            <p>
              DocQevrilo offers AI-powered document capabilities (Groq Vision OCR, Whisper audio transcription, and Excel tabular extraction) designed strictly around ephemeral processing:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-300">
              <li>
                <strong className="text-white">Zero Model Training:</strong> Your documents, audio files, spreadsheets, and secret notes are never used to train, retrain, or fine-tune public or proprietary AI models.
              </li>
              <li>
                <strong className="text-white">In-Memory Analysis:</strong> AI document processing occurs entirely in ephemeral RAM memory buffers during your active request. Once the response or study summary is generated, working buffers are cleared.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">4</span>
              <span>Third-Party Infrastructure and Security Providers</span>
            </h2>
            <p>
              To maintain high uptime and secure delivery, DocQevrilo partners with trusted, enterprise-grade cloud infrastructure:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="font-bold text-white block">TiDB Cloud (PingCAP)</span>
                <span className="text-zinc-400 block text-[11px]">
                  Encrypted distributed SQL database hosting user accounts, hashed credentials, and non-sensitive audit metadata with TLS 1.3 encryption in transit.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="font-bold text-white block">Backblaze B2</span>
                <span className="text-zinc-400 block text-[11px]">
                  Private S3-compliant object store housing encrypted document archives with private bucket access and short-lived signed URLs.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="font-bold text-white block">Transactional Email Delivery</span>
                <span className="text-zinc-400 block text-[11px]">
                  Used strictly to deliver one-time authorization OTPs, account activation codes, and security alerts. Never used for marketing or tracking.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="font-bold text-white block">WebRTC STUN / TURN</span>
                <span className="text-zinc-400 block text-[11px]">
                  Standard NAT traversal signaling to establish direct peer-to-peer browser connections for Online Live Sharing.
                </span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">5</span>
              <span>Your Rights and Data Control</span>
            </h2>
            <p>
              As a DocQevrilo user, you maintain absolute sovereignty over your uploaded content:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-300">
              <li>
                <strong className="text-white">Immediate Purge:</strong> You can delete any of your documents at any moment from your vault dashboard. Deletion purges the file from storage and database records instantly.
              </li>
              <li>
                <strong className="text-white">Access Code Revocation:</strong> You can regenerate or delete access codes to revoke access from existing recipients immediately.
              </li>
              <li>
                <strong className="text-white">Account Deletion:</strong> You have the right to request full account erasure, which will purge your profile, associated files, and personal records permanently.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">6</span>
              <span>Contact and Security Inquiries</span>
            </h2>
            <p>
              If you have any questions, security vulnerability reports, or privacy inquiries regarding DocQevrilo, please reach out to our platform team:
            </p>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block">DocQevrilo Cryptographic Security Team</span>
                <span className="text-zinc-400">Developer &amp; Maintainer: Kommalapati Sivesh</span>
              </div>
              <a
                href="https://kommalapatisivesh.me"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#FF2E44] text-white font-semibold transition-all shadow-sm"
              >
                <span>kommalapatisivesh.me</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>

        {/* Footer Navigation Link to Terms */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Looking for our contractual rules and acceptable use policy?</span>
          <Link to="/terms" className="text-[#E11D2E] hover:underline font-semibold flex items-center gap-1">
            <span>Read Terms of Service</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

