import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Lock,
  KeyRound,
  Trash2,
  Radio,
  HardDrive,
  Cpu,
  Ban,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export default function TermsOfService() {
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
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#E11D2E] font-bold block">
                Legal &amp; Usage Framework
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                DocQevrilo Terms of Service
              </h1>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mt-2">
            Welcome to DocQevrilo. These Terms of Service define your rights, obligations, and the rules governing your
            use of our zero-knowledge document vault, multimodal AI capabilities, and live peer-to-peer WebRTC transfer
            system.
          </p>

          {/* Quick Highlight Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-800/80 mt-6">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-[#E11D2E] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">100% User Ownership</span>
                <span className="text-zinc-400 text-[11px]">You retain full copyright &amp; title</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">No Master Backdoors</span>
                <span className="text-zinc-400 text-[11px]">Lost keys cannot be recovered by us</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Zero AI Training</span>
                <span className="text-zinc-400 text-[11px]">Files are never fed into models</span>
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
              <span>Acceptance of Terms</span>
            </h2>
            <p>
              By accessing, browsing, creating an account on, or transferring data via <strong>DocQevrilo</strong> (the
              &quot;Platform&quot; or &quot;Service&quot;), you acknowledge that you have read, understood, and agree to be
              bound by these Terms of Service (&quot;Terms&quot;) as well as our{' '}
              <Link to="/privacy" className="text-[#E11D2E] hover:underline font-semibold">
                Privacy Policy
              </Link>
              . If you do not agree to these Terms in their entirety, you must discontinue using the Platform
              immediately.
            </p>
            <p className="text-xs text-zinc-400">
              DocQevrilo is designed, architected, and maintained by{' '}
              <a
                href="https://kommalapatisivesh.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#E11D2E] underline inline-flex items-center gap-1 font-medium"
              >
                Siva Sankar <ExternalLink className="w-3 h-3" />
              </a>
              .
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">2</span>
              <span>Description of Service &amp; Storage Architectures</span>
            </h2>
            <p>
              DocQevrilo provides a zero-knowledge, privacy-first digital vault that allows users to upload, store,
              analyze, and transfer documents, spreadsheets, images, and audio files. Depending on user selection, data
              is handled under three distinct architectural models:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  <span>Temporary Storage</span>
                </div>
                <p className="text-xs text-zinc-400 leading-normal">
                  Files uploaded with an expiration window (30m, 1h, 2h, 4h, or custom) are automatically and
                  irreversibly purged from Backblaze B2 upon timer expiration. Retrieval is permanently impossible
                  after expiry.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Online Sharing (Live P2P)</span>
                </div>
                <p className="text-xs text-zinc-400 leading-normal">
                  Files stay resident strictly in the sender&apos;s browser memory. Direct peer-to-peer WebRTC DataChannels
                  stream data to recipients without writing any file bytes to DocQevrilo servers or cloud buckets.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span>Long-Term Storage</span>
                </div>
                <p className="text-xs text-zinc-400 leading-normal">
                  Documents are stored in encrypted cloud storage (Backblaze B2) and remain accessible until the owner
                  explicitly deletes them or deletes their vault account.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">3</span>
              <span>User Responsibility for Keys &amp; Zero-Knowledge Recovery Disclaimer</span>
            </h2>
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-xs text-zinc-300 space-y-2">
              <div className="flex items-center gap-2 text-[#E11D2E] font-bold uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4" />
                <span>Critical Cryptographic Notice</span>
              </div>
              <p>
                DocQevrilo operates on a strict <strong>Zero-Knowledge paradigm</strong>. The access codes, passwords,
                and PINs you generate protect your files through cryptographic hashing (SHA-256) and authenticated tokens.
                Our servers <strong>do not possess master recovery keys</strong>.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Sole Custody:</strong> You are solely responsible for memorizing, storing, and safely conveying
                  your 10-character access codes, login credentials, and 6-digit Security PINs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Unrecoverable Loss:</strong> If you lose or forget an access credential or delete an access code,
                  DocQevrilo support personnel and administrators cannot recover, restore, or decrypt the data on your behalf.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Shared Links:</strong> Anyone to whom you grant or send an access code has the technical ability
                  to download or view the unlocked document within permitted access count rules. You assume full risk for
                  the distribution of your generated codes.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">4</span>
              <span>Ownership &amp; Intellectual Property Rights</span>
            </h2>
            <div className="space-y-3">
              <p>
                <strong>Your Content Belongs Exclusively to You:</strong> You retain full copyright, trademark, moral, and
                intellectual property rights over all files, text, audio recordings, images, spreadsheets, and data you upload,
                stream, or analyze on DocQevrilo.
              </p>
              <p>
                <strong>No License Granted:</strong> DocQevrilo claims no ownership, marketing, or commercial rights over
                your documents. By using the platform, you grant us only the limited, temporary technical authorization
                strictly required to transmit, hash, store (if temporary or long-term storage is selected), or render the
                file upon recipient request.
              </p>
              <p>
                <strong>Platform IP:</strong> The DocQevrilo brand, interface designs, logos, custom CSS, client-side
                encryption routines, WebRTC signaling protocols, and backend source code are the intellectual property of
                DocQevrilo and Siva Sankar.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">5</span>
              <span>Acceptable Use &amp; Prohibited Conduct</span>
            </h2>
            <p>
              You agree not to misuse the Platform or assist any other party in doing so. Specifically, you agree NOT to:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs">
                  Upload or transmit malicious software, viruses, trojans, ransomware, or harmful binary payloads.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs">
                  Distribute child sexual abuse material (CSAM), non-consensual imagery, terrorist propaganda, or content
                  violating international criminal law.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs">
                  Attempt automated brute-forcing, dictionary attacks, or unauthorized credential enumeration against access codes.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs">
                  Interfere with, overload, or reverse-engineer WebRTC signaling servers, TiDB Cloud endpoints, or API gateways.
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              DocQevrilo actively employs multi-tier rate limiting and automatic security guards. Any accounts or IP
              addresses engaged in abusive automated credential stuffing will be permanently blocked.
            </p>
          </section>

          {/* Section 6 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">6</span>
              <span>Multimodal AI &amp; Ephemeral Processing Guidelines</span>
            </h2>
            <p>
              DocQevrilo provides built-in artificial intelligence features powered by Groq LPU inference (Vision OCR,
              Whisper speech transcription, and tabular data analysis). By utilizing these features, you acknowledge:
            </p>
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>In-Memory Processing:</strong> AI analysis occurs ephemerally in RAM during the active user session.
                  Transcribed audio, extracted text, and computed insights are returned directly to your browser.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Non-Training Guarantee:</strong> User content is never saved, retained, or utilized to train,
                  tune, or improve any public or proprietary machine learning models.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                <span>
                  <strong>Informational Purpose:</strong> AI-generated summaries, OCR extractions, and translations are
                  provided for productivity and reference purposes. You should independently verify mission-critical
                  financial, legal, or medical extractions.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">7</span>
              <span>File Size Limits, Quotas &amp; P2P Performance</span>
            </h2>
            <p>
              To maintain system stability and fair resource allocation across all users:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="font-semibold text-white block mb-1">Cloud Vault Upload Limits</span>
                <span className="text-zinc-400">
                  Individual file uploads intended for Temporary or Long-Term cloud storage are subject to platform file
                  size limits (up to 250MB per document or note package).
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="font-semibold text-white block mb-1">Online P2P Live Share Limits</span>
                <span className="text-zinc-400">
                  Direct browser-to-browser WebRTC transfers bypass cloud upload constraints. Transfer speed and maximum
                  size depend entirely on sender/recipient RAM and peer internet bandwidth.
                </span>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">8</span>
              <span>Disclaimer of Warranties &amp; Limitation of Liability</span>
            </h2>
            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                THE PLATFORM IS PROVIDED ON AN <strong>&quot;AS IS&quot;</strong> AND <strong>&quot;AS AVAILABLE&quot;</strong> BASIS,
                WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT
                LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p>
                IN NO EVENT SHALL DOCQEVRILO, ITS DEVELOPERS, AFFILIATES, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT,
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA,
                LOSS OF PROFITS, HARDWARE MALFUNCTION, OR INABILITY TO RETRIEVE FILES DUE TO FORGOTTEN PASSWORDS, EXPIRED
                TEMPORARY TIME LIMITS, OR COMPROMISED USER-SIDE CREDENTIALS.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">9</span>
              <span>Modifications &amp; Termination</span>
            </h2>
            <p>
              We reserve the right to modify or replace these Terms at any time to reflect architectural updates, statutory
              compliance, or new features. Substantial changes will be reflected with an updated date at the top of this
              page. Continued use of the Platform after revisions indicates acceptance of the revised terms.
            </p>
            <p>
              You may terminate this agreement at any time by ceasing all use of the Platform and deleting your vault
              account and stored documents.
            </p>
          </section>

          {/* Section 10 */}
          <section className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs text-[#E11D2E]">10</span>
              <span>Contact &amp; Legal Inquiries</span>
            </h2>
            <p>
              If you have any questions, legal notices, or feedback regarding these Terms of Service, please reach out to
              our engineering and development team:
            </p>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-white text-xs">DocQevrilo Architecture &amp; Developer Support</p>
                <p className="text-xs text-zinc-400">Lead Architect: Siva Sankar Kommalapati</p>
                <a
                  href="https://kommalapatisivesh.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#E11D2E] hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                >
                  kommalapatisivesh.me <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <Link
                to="/privacy"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                Read Privacy Policy
              </Link>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} DocQevrilo. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white font-medium hover:text-[#E11D2E] transition-colors">
              Terms of Service
            </Link>
            <a
              href="https://kommalapatisivesh.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              Developer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
