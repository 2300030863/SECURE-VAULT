import React, { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  Share2,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  CheckCircle2,
  Clock,
  Flame,
  UploadCloud,
  Database,
  Cloud,
  Users,
  Eye,
  Archive,
  FolderLock,
  Download,
  UserCheck,
  Activity,
  FileCheck,
  Server,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Compass,
  HelpCircle,
  ExternalLink,
  Layers,
  LockKeyhole,
  Check,
  Radio,
  FileCode,
  Tag,
  RefreshCw,
} from 'lucide-react';

export default function Welcome({ currentUser }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Synchronous DOM attachment via callback ref for background video
  const handleVideoRef = (element) => {
    videoRef.current = element;
    if (element) {
      element.muted = true;
      element.defaultMuted = true;
      element.volume = 0;
      element.playsInline = true;
      element.setAttribute('muted', '');
      element.setAttribute('playsinline', '');
      element.setAttribute('webkit-playsinline', 'true');
      element.setAttribute('x5-playsinline', 'true');
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    const startPlayback = () => {
      if (!video || !isMounted) return;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isMounted) setIsVideoPlaying(true);
          })
          .catch(() => {
            const unlock = () => {
              if (video && isMounted && video.paused) {
                video.play().then(() => setIsVideoPlaying(true)).catch(() => { });
              }
            };
            window.addEventListener('touchstart', unlock, { once: true, passive: true });
            window.addEventListener('touchend', unlock, { once: true, passive: true });
            window.addEventListener('click', unlock, { once: true, passive: true });
            window.addEventListener('scroll', unlock, { once: true, passive: true });
          });
      }
    };

    startPlayback();
    video.addEventListener('canplay', startPlayback);
    video.addEventListener('loadeddata', startPlayback);

    const handleVisibility = () => {
      if (!document.hidden && video && video.paused && isMounted) {
        startPlayback();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      isMounted = false;
      video.removeEventListener('canplay', startPlayback);
      video.removeEventListener('loadeddata', startPlayback);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  // FAQ data array
  const faqs = [
    {
      q: 'What is DocQevrilo?',
      a: 'DocQevrilo is a modern digital document workspace designed to centralize storing, organizing, previewing, and securely sharing documents. Rather than sending files through insecure email attachments or messy chat groups (WhatsApp, Telegram), DocQevrilo gives you organized vaults protected by individual cryptographic access codes, auto-expiration timers, and download limits.',
    },
    {
      q: 'How can I create an account?',
      a: 'Creating an account is fast and free. Click "Create Account" or "Get Started" in the navigation bar, provide your name, email, and a secure password. Once signed in, you immediately have access to your personal Document Vault to start uploading, categorizing, and sharing files.',
    },
    {
      q: 'Can I upload different types of documents?',
      a: 'Yes! DocQevrilo supports all major document formats including PDF files, Microsoft Word (.docx), Excel spreadsheets (.xlsx), text documents (.txt, .md), images (JPG, PNG, WebP), and compressed archives (.zip). Files can be uploaded up to 250 MB each with pre-upload format and size verification.',
    },
    {
      q: 'How can I reset my password?',
      a: 'If you ever forget your password, click "Forgot Password" on the Sign In page. Enter your registered email address to receive a secure One-Time PIN (OTP). Once entered, you can immediately set a new password. All passwords are encrypted on the backend using salted bcrypt hashing.',
    },
    {
      q: 'Can I share my documents with people who do not have an account?',
      a: 'Yes, absolutely. When you upload or share a document, DocQevrilo generates a unique 10-character cryptographic access code (or a direct link). Recipients do not need to register—they simply enter the access code on the Unlock tab to view or download the file according to the permissions you established.',
    },
    {
      q: 'Do recipients need an account to view or download shared files?',
      a: 'No! One of DocQevrilo’s greatest advantages is zero-friction recipient access. When you share a document, the platform generates a unique 10-character access code (e.g. A1B95@3he5) or direct link. Recipients simply visit DocQevrilo, paste the code into the Unlock tab, and view or download the file immediately in their browser without registering an account.',
    },
    {
      q: 'Are my documents publicly accessible on search engines?',
      a: 'No, never. DocQevrilo is designed with zero-knowledge access architecture. Documents are stored in private cloud storage and cannot be indexed by search engines. They can only be retrieved by you or recipients who possess the exact cryptographic access code before its expiration timer elapses.',
    },
  ];

  return (
    <div className="sv-welcome-v2 sv-page-wrapper">
      {/* --- AMBIENT BACKGROUND VIDEO --- */}
      <div className="sv-welcome-video-container" aria-hidden="true">
        <video
          ref={handleVideoRef}
          className={`sv-welcome-bg-video ${isVideoPlaying ? 'is-playing' : ''}`}
          src="/gemini_generated_video_db04c391.mp4"
          autoPlay
          loop
          muted
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5"
          x5-video-player-fullscreen="true"
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          tabIndex={-1}
          onPlaying={() => setIsVideoPlaying(true)}
          onCanPlay={() => setIsVideoPlaying(true)}
          onLoadedData={() => setIsVideoPlaying(true)}
        >
          <source src="/gemini_generated_video_db04c391.mp4" type="video/mp4" />
        </video>
        <div className="sv-welcome-video-overlay" />
      </div>

      {/* =========================================================================
          SECTION 1: HERO SECTION & WELCOME DASHBOARD PREVIEW
         ========================================================================= */}
      <section className="sv-hero-section sv-hero-v2" aria-labelledby="hero-heading">
        <div className="sv-hero-content">
          {/* Eyebrow Badge */}
          <div className="sv-eyebrow">
            <span className="sv-live-dot" />
            <span>DocQevrilo · YOUR DIGITAL DOCUMENT WORKSPACE</span>
          </div>

          {/* Brand Meaning Pill */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open_brand_meaning'))}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-[#E11D2E]/40 text-xs font-semibold text-white hover:bg-red-900/60 transition-all cursor-pointer mb-2 self-start shadow-sm"
          >
            <span>✨ Discover DocQevrilo Brand Meaning</span>
            <ArrowRight size={12} className="text-[#E11D2E]" />
          </button>

          {/* Main Welcome Headline */}
          <h1 id="hero-heading" className="sv-hero-headline">
            Welcome to <span className="highlight">DocQevrilo!</span> <br />
            <span className="sv-heading-muted">Manage Your Documents.</span> <br />
            <span>Simplify Your Digital Life.</span>
          </h1>

          {/* Value Narrative */}
          <p className="sv-hero-description">
            Your documents deserve a better place. Upload, organize, manage and share your important files through one convenient digital platform.
          </p>

          {/* Primary Action Buttons */}
          <div className="sv-hero-actions">
            <Link to={currentUser ? '/vault' : '/register'} className="sv-btn-primary">
              <UploadCloud size={18} />
              <span>{currentUser ? 'Upload Documents' : 'Get Started Free'}</span>
              <ArrowRight size={16} />
            </Link>

            <a href="#features" className="sv-btn-secondary">
              <Layers size={16} />
              <span>Explore Features</span>
            </a>

            <Link to="/vault" className="sv-btn-secondary sv-btn-vault-link">
              <KeyRound size={16} />
              <span>Open Vault</span>
            </Link>
          </div>

          {/* Cryptographic Trust Indicator */}
          <div className="sv-hero-trust sv-trust-v2">
            <ShieldCheck size={18} className="text-[#E11D2E]" />
            <span>HMAC SHA-256 verification · Zero-knowledge hash lookups · Encrypted storage</span>
          </div>
        </div>

        {/* Visual 3D Showcase (Double Panel: Live Vault Code + 3D UI Preview) */}
        <div className="sv-visual-v2" aria-hidden="true">
          <div className="sv-visual-glow-backdrop" />
          <div className="sv-visual-grid-rings" />
          <div className="sv-orbit sv-orbit-one" />
          <div className="sv-orbit sv-orbit-two" />

          {/* Central Interactive Vault Panel */}
          <div className="sv-vault-panel">
            <div className="sv-vault-topbar">
              <div className="sv-vault-brand">
                <div className="sv-brand-symbol">
                  <Shield size={18} />
                </div>
                <div>
                  <strong className="cursor-pointer sv-vault-brand-title block" onClick={() => window.dispatchEvent(new CustomEvent('open_brand_meaning'))}>
                    Doc<span style={{ color: '#E11D2E' }}>Qevrilo</span>
                  </strong>
                  <span className="sv-vault-subbrand">DIGITAL DOCUMENT WORKSPACE</span>
                </div>
              </div>
              <div className="sv-vault-menu">
                <span /><span /><span />
              </div>
            </div>

            {/* 3D Dashboard Image Preview inside Frame */}
            <div className="sv-vault-image-container">
              <img
                src="/images/welcome/hero-dashboard-preview.png"
                alt="DocQevrilo Digital Document Workspace Preview"
                className="sv-vault-preview-img"
                loading="eager"
              />
              <div className="sv-vault-img-overlay">
                <span className="sv-live-badge">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Interactive Vault Console</span>
                </span>
              </div>
            </div>

            <div className="sv-vault-status">
              <div>
                <span className="sv-status-kicker block">ENCRYPTED ARCHIVE</span>
                <h3 className="sv-status-title">Secure Workspace Ready</h3>
              </div>
              <div className="sv-status-icon">
                <Lock size={18} />
              </div>
            </div>

            <div className="sv-vault-access">
              <div className="sv-access-heading">
                <span><KeyRound size={12} /> SINGLE-USE ACCESS KEY</span>
                <span className="sv-access-private">HMAC SHA-256</span>
              </div>
              <div className="sv-code-display">
                <span>A1B95</span>
                <span>@</span>
                <span>3he5</span>
              </div>
              <div className="sv-code-footer">
                <span><Clock size={11} /> Configurable auto-destruct timer</span>
              </div>
            </div>

            <div className="sv-vault-bottom">
              <span><ShieldCheck size={14} /> Zero-Knowledge Protocol</span>
              <span>Encrypted Object Stream</span>
            </div>
          </div>

          {/* Floating Chip Top */}
          <div className="sv-floating-chip sv-chip-top">
            <div className="sv-chip-icon">
              <CheckCircle size={16} />
            </div>
            <div>
              <strong className="block text-white">Access Verified</strong>
              <small className="block text-zinc-400">Instant unlock authorized</small>
            </div>
            <div className="sv-chip-check">
              <ShieldCheck size={14} />
            </div>
          </div>

          {/* Floating Chip Bottom */}
          <div className="sv-floating-chip sv-chip-bottom">
            <div className="sv-chip-icon sv-chip-red">
              <Flame size={16} />
            </div>
            <div>
              <strong className="block text-white">Burn on Read</strong>
              <small className="block text-zinc-400">Auto-destruct configured</small>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: ABOUT DOCQEVRILO
         ========================================================================= */}
      <section className="sv-about-section" id="about">
        <div className="sv-about-grid">
          <div className="sv-about-copy">
            <div className="sv-eyebrow">
              <Sparkles size={14} />
              <span>THE DIGITAL REVOLUTION</span>
            </div>
            <h2 className="sv-section-title">About DocQevrilo</h2>
            <p className="sv-lead-paragraph">
              DocQevrilo is a modern digital document management platform designed to make storing, organizing, accessing and sharing documents easier and more convenient.
            </p>

            <p className="sv-body-paragraph">
              In today's fast-moving digital world, individuals and teams handle multiple types of critical documents every single day—including educational certificates, personal identification records, professional portfolios, contracts, financial reports, and confidential notes.
            </p>

            <p className="sv-body-paragraph">
              Managing these documents across scattered devices, chaotic email threads, and messy messaging apps like WhatsApp or Telegram creates frustration, security risks, and lost files. DocQevrilo solves this by providing a <strong>centralized digital workspace</strong> where all your files are organized in one secure place.
            </p>

            <p className="sv-body-paragraph">
              Our platform focuses on <strong>simplicity, accessibility, robust document management, and controlled sharing</strong>. Users can upload their files, access them anywhere, organize their archives, and share with authorized recipients without exposing public links.
            </p>

            <div className="sv-quote-banner">
              <span className="sv-quote-line" />
              <p className="sv-quote-text">
                DocQevrilo — One Platform. All Your Important Documents.
              </p>
            </div>

            <div className="sv-about-badges">
              <div className="sv-about-badge">
                <CheckCircle2 size={16} className="text-[#E11D2E]" />
                <span>Zero Chat Clutter</span>
              </div>
              <div className="sv-about-badge">
                <CheckCircle2 size={16} className="text-[#E11D2E]" />
                <span>Centralized Digital Workspace</span>
              </div>
              <div className="sv-about-badge">
                <CheckCircle2 size={16} className="text-[#E11D2E]" />
                <span>Controlled Access Keys</span>
              </div>
            </div>
          </div>

          <div className="sv-about-media">
            <div className="sv-3d-card-frame">
              <img
                src="/images/welcome/about-docqevrilo.png"
                alt="DocQevrilo Centralized Document Management"
                className="sv-3d-illustration"
                loading="lazy"
              />
              <div className="sv-3d-caption">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#E11D2E]" />
                  <strong>Unified Cloud Ecosystem</strong>
                </div>
                <span>Centralized storage, structured metadata & instant retrieval.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: WHY CHOOSE DOCQEVRILO? (6 REASONS / VALUE CARDS)
         ========================================================================= */}
      <section className="sv-why-section" id="why-choose">
        <div className="sv-section-heading text-center">
          <div className="sv-eyebrow justify-center">
            <Compass size={14} />
            <span>UNCOMPROMISING VALUE</span>
          </div>
          <h2 className="sv-section-title">Why Choose DocQevrilo?</h2>
          <p className="sv-section-subtitle">
            Engineered from the ground up to replace fragmented folders, insecure email attachments, and messy messaging groups with a dedicated, professional digital workspace.
          </p>
        </div>

        <div className="sv-why-grid">
          {/* Card 1 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-easy-upload.png"
                alt="Easy Document Uploads"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">01</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <UploadCloud size={20} className="text-[#E11D2E]" />
                <h3>1. Simple and User-Friendly</h3>
              </div>
              <p>
                DocQevrilo provides a clean and intuitive interface that helps users manage, upload, and organize their documents without complicated procedures or technical friction.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-organized-storage.png"
                alt="Centralized Document Management"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">02</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <Archive size={20} className="text-[#E11D2E]" />
                <h3>2. Centralized Document Management</h3>
              </div>
              <p>
                Manage all your important files from one central hub instead of searching through scattered folders, local hard drives, email threads, and messaging apps.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-doc-management.png"
                alt="Convenient Access"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">03</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <Cloud size={20} className="text-[#E11D2E]" />
                <h3>3. Convenient Access</h3>
              </div>
              <p>
                Access your documents securely through your personal account whenever you need them, anywhere in the world, with native in-browser viewing support.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-controlled-sharing.png"
                alt="Controlled Document Sharing"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">04</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <Share2 size={20} className="text-[#E11D2E]" />
                <h3>4. Controlled Document Sharing</h3>
              </div>
              <p>
                Share documents with authorized recipients using unique 10-character cryptographic access codes, auto-expiration timers, and download quotas.
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-account-protection.png"
                alt="Account Security"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">05</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <Shield size={20} className="text-[#E11D2E]" />
                <h3>5. Account Security</h3>
              </div>
              <p>
                Bcrypt password hashing, email OTP verification for password recovery, and secure JWT session controls protect your account against unauthorized access.
              </p>
            </div>
          </div>

          {/* Card 6 */}
          <div className="sv-why-card">
            <div className="sv-why-image-wrapper">
              <img
                src="/images/welcome/feature-upload-compliance.png"
                alt="Efficient Document Organization"
                className="sv-why-thumb"
                loading="lazy"
              />
              <span className="sv-why-badge">06</span>
            </div>
            <div className="sv-why-body">
              <div className="sv-why-icon-title">
                <Layers size={20} className="text-[#E11D2E]" />
                <h3>6. Efficient Document Organization</h3>
              </div>
              <p>
                Manage your files in an organized workspace with category filters, search, file type badges, and real-time fulfillment metrics to find documents effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: COMPLETE WEBSITE FEATURES (THE 6 PILLARS)
         ========================================================================= */}
      <section className="sv-pillars-section" id="features">
        <div className="sv-section-heading text-center">
          <div className="sv-eyebrow justify-center">
            <Layers size={14} />
            <span>PLATFORM CAPABILITIES</span>
          </div>
          <h2 className="sv-section-title">Complete Website Features</h2>
          <p className="sv-section-subtitle">
            Every feature is engineered to give you absolute control over your document lifecycle from secure upload to controlled delivery.
          </p>
        </div>

        <div className="sv-pillars-grid">
          {/* Pillar 1 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-upload-compliance.png"
                alt="Document Upload Capability"
                loading="lazy"
              />
              <span className="sv-pillar-num">01</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <UploadCloud size={22} className="text-[#E11D2E]" />
                <h3>Document Upload</h3>
              </div>
              <p>
                Users can upload their documents through a streamlined drag-and-drop interface. The system validates supported file formats (PDF, DOCX, XLSX, images, and text) and enforces file size limits up to 250 MB before staging for encrypted storage.
              </p>
              <div className="sv-pillar-tags">
                <span>Drag & Drop</span>
                <span>Format Validation</span>
                <span>250MB Limit</span>
              </div>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-doc-management.png"
                alt="Document Management System"
                loading="lazy"
              />
              <span className="sv-pillar-num">02</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <Archive size={22} className="text-[#E11D2E]" />
                <h3>Document Management</h3>
              </div>
              <p>
                Users can view, search, download and manage their uploaded documents in one organized catalog. Native in-browser rendering allows instant preview of PDFs, images, and text notes without third-party desktop tools.
              </p>
              <div className="sv-pillar-tags">
                <span>Instant Search</span>
                <span>Native Browser View</span>
                <span>Organized Storage</span>
              </div>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-auth-security.png"
                alt="User Authentication & Protection"
                loading="lazy"
              />
              <span className="sv-pillar-num">03</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <UserCheck size={22} className="text-[#E11D2E]" />
                <h3>User Authentication</h3>
              </div>
              <p>
                Registration, login, and forgot-password functionality help users protect their accounts. Time-sensitive OTP verification supports the password recovery process, backed by salted bcrypt hashing on the backend.
              </p>
              <div className="sv-pillar-tags">
                <span>JWT Sessions</span>
                <span>Email OTP Recovery</span>
                <span>Bcrypt Encryption</span>
              </div>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-secure-sharing.png"
                alt="Controlled Document Sharing"
                loading="lazy"
              />
              <span className="sv-pillar-num">04</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <Share2 size={22} className="text-[#E11D2E]" />
                <h3>Controlled Document Sharing</h3>
              </div>
              <p>
                Users can share selected documents with authorized people using high-entropy access codes. Custom access permissions, expiration times (1 hour to 30 days), and download caps prevent unauthorized forwarding.
              </p>
              <div className="sv-pillar-tags">
                <span>10-Char Access Codes</span>
                <span>Auto-Destruct Timers</span>
                <span>Download Limits</span>
              </div>
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-profile-mgmt.png"
                alt="Profile & Account Management"
                loading="lazy"
              />
              <span className="sv-pillar-num">05</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <LockKeyhole size={22} className="text-[#E11D2E]" />
                <h3>Profile Management</h3>
              </div>
              <p>
                Users can review their account profile, update personal settings, modify their display name, and securely change their account password directly from their personal vault dashboard.
              </p>
              <div className="sv-pillar-tags">
                <span>Account Settings</span>
                <span>Password Change</span>
                <span>Session Oversight</span>
              </div>
            </div>
          </div>

          {/* Pillar 6 */}
          <div className="sv-pillar-card">
            <div className="sv-pillar-image">
              <img
                src="/images/welcome/feature-activity-monitor.png"
                alt="Activity Monitoring & Audit"
                loading="lazy"
              />
              <span className="sv-pillar-num">06</span>
            </div>
            <div className="sv-pillar-content">
              <div className="sv-pillar-header">
                <Activity size={22} className="text-[#E11D2E]" />
                <h3>Activity Monitoring</h3>
              </div>
              <p>
                Relevant account and document activities—such as view fulfillments, download counts, and access attempts—are tracked so you have total visibility over recipient interactions transparently.
              </p>
              <div className="sv-pillar-tags">
                <span>View Counters</span>
                <span>Fulfillment Logs</span>
                <span>Audit Records</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: HOW DOCQEVRILO WORKS (4-STEP PROCESS)
         ========================================================================= */}
      <section className="sv-how-it-works-section" id="how-it-works">
        <div className="sv-section-heading text-center">
          <div className="sv-eyebrow justify-center">
            <FileCheck size={14} />
            <span>FOUR-STEP WORKFLOW</span>
          </div>
          <h2 className="sv-section-title">How DocQevrilo Works</h2>
          <p className="sv-section-subtitle">
            A simple, intuitive process to take control of your documents in minutes.
          </p>
        </div>

        <div className="sv-workflow-wrapper">
          <div className="sv-workflow-diagram-card">
            <img
              src="/images/welcome/how-it-works-steps.png"
              alt="How DocQevrilo Works - 4 Step Digitalization Workflow"
              className="sv-workflow-img"
              loading="lazy"
            />
          </div>

          <div className="sv-steps-grid">
            {/* Step 1 */}
            <div className="sv-step-box">
              <div className="sv-step-header">
                <span className="sv-step-circle">1</span>
                <span className="sv-step-line" />
              </div>
              <div className="sv-step-content">
                <h3>Create your account</h3>
                <p>
                  Register using your details and sign in to your DocQevrilo account in seconds with zero complicated setup.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="sv-step-box">
              <div className="sv-step-header">
                <span className="sv-step-circle">2</span>
                <span className="sv-step-line" />
              </div>
              <div className="sv-step-content">
                <h3>Upload your documents</h3>
                <p>
                  Select your documents and upload them through the intuitive document management interface with instant format checks.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="sv-step-box">
              <div className="sv-step-header">
                <span className="sv-step-circle">3</span>
                <span className="sv-step-line" />
              </div>
              <div className="sv-step-content">
                <h3>Manage your files</h3>
                <p>
                  View, organize, search, download and preview your documents in the browser from your centralized personal vault.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="sv-step-box">
              <div className="sv-step-header">
                <span className="sv-step-circle">4</span>
              </div>
              <div className="sv-step-content">
                <h3>Share when needed</h3>
                <p>
                  Share selected documents with authorized users using customizable cryptographic access codes and auto-destruct timers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: HOW YOU CAN WORK WITH DOCQEVRILO (THE USER WORKFLOW & EXPERIENCE)
         ========================================================================= */}
      <section className="sv-user-workflow-section" id="user-workflow">
        <div className="sv-user-workflow-grid">
          <div className="sv-user-workflow-media">
            <div className="sv-3d-card-frame">
              <img
                src="/images/welcome/user-workspace-console.png"
                alt="DocQevrilo User Document Workspace Console"
                className="sv-3d-illustration"
                loading="lazy"
              />
              <div className="sv-3d-caption">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#E11D2E]" />
                  <strong>Personal Vault Workspace Console</strong>
                </div>
                <span>Upload, organize, preview, and control access lifecycles seamlessly.</span>
              </div>
            </div>
          </div>

          <div className="sv-user-workflow-copy">
            <div className="sv-eyebrow">
              <FolderLock size={14} />
              <span>THE USER WORKSPACE EXPERIENCE</span>
            </div>
            <h2 className="sv-section-title">How You Can Work with DocQevrilo</h2>
            <p className="sv-lead-paragraph">
              Whether you are an individual managing confidential notes, a student submitting assignments, or a team sharing project assets, DocQevrilo gives you complete autonomy over your documents.
            </p>

            <ul className="sv-user-workflow-list">
              <li>
                <strong>1. Zero-Friction Staging:</strong> Drag & drop multi-file bundles up to 250 MB or compose confidential text notes directly in browser.
              </li>
              <li>
                <strong>2. Granular Sharing Policies:</strong> Configure custom auto-destruct timers (1 hour to 30 days), download quotas, and Burn-on-Read.
              </li>
              <li>
                <strong>3. Cryptographic Access:</strong> Distribute unique 10-character access codes—recipients view and download without creating an account.
              </li>
              <li>
                <strong>4. Real-Time Fulfillment:</strong> Track live view counts, monitor downloads, and revoke access codes instantly whenever needed.
              </li>
            </ul>
          </div>
        </div>

        {/* 3 Dedicated User Dashboard Modes */}
        <div className="sv-user-modes-grid">
          {/* Mode 1: Send & Share Workspace */}
          <div className="sv-user-mode-card">
            <div className="sv-mode-card-header">
              <div className="sv-mode-icon-box bg-red-950/70 border border-[#E50936]/40 text-[#E50936]">
                <UploadCloud size={20} />
              </div>
              <div>
                <span className="sv-mode-kicker">MODE 01 · STAGING & SHARING</span>
                <h3>Send & Share Workspace</h3>
              </div>
            </div>
            <p className="sv-mode-desc">
              Stage files or compose encrypted notes with customizable security policies before generating high-entropy sharing credentials.
            </p>
            <ul className="sv-mode-checklist">
              <li>
                <CheckCircle2 size={15} className="text-[#E50936] shrink-0 mt-0.5" />
                <span><strong>Multi-Format Staging:</strong> Upload PDFs, Office docs, images & ZIP archives up to 250 MB.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-[#E50936] shrink-0 mt-0.5" />
                <span><strong>Secret Notes Editor:</strong> Write confidential text with formatted preview and instant staging.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-[#E50936] shrink-0 mt-0.5" />
                <span><strong>Auto-Destruct Timers:</strong> Set expiration to 1 hour, 24 hours, 7 days, or custom duration/date.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-[#E50936] shrink-0 mt-0.5" />
                <span><strong>Burn on Read:</strong> Auto-delete sensitive files immediately after their initial download.</span>
              </li>
            </ul>
          </div>

          {/* Mode 2: Recipient Unlock Code */}
          <div className="sv-user-mode-card">
            <div className="sv-mode-card-header">
              <div className="sv-mode-icon-box bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
                <KeyRound size={20} />
              </div>
              <div>
                <span className="sv-mode-kicker">MODE 02 · ZERO-FRICTION ACCESS</span>
                <h3>Recipient Unlock Code</h3>
              </div>
            </div>
            <p className="sv-mode-desc">
              Authorized recipients access and download documents without creating an account or installing third-party apps.
            </p>
            <ul className="sv-mode-checklist">
              <li>
                <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>No Account Needed:</strong> Enter the 10-character code or open the link to view instantly.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Native Browser Preview:</strong> Stream and inspect PDFs, images, and text directly in the tab.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Cryptographic Hash Check:</strong> HMAC SHA-256 verification guarantees tamper-proof delivery.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Quota Enforcement:</strong> Enforces download caps and auto-purges files once expired.</span>
              </li>
            </ul>
          </div>

          {/* Mode 3: My Documents (Personal Vault) */}
          <div className="sv-user-mode-card">
            <div className="sv-mode-card-header">
              <div className="sv-mode-icon-box bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                <Archive size={20} />
              </div>
              <div>
                <span className="sv-mode-kicker">MODE 03 · CENTRALIZED CATALOG</span>
                <h3>My Documents Catalog</h3>
              </div>
            </div>
            <p className="sv-mode-desc">
              Complete oversight over your personal documents, active sharing codes, fulfillment logs, and storage quotas.
            </p>
            <ul className="sv-mode-checklist">
              <li>
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Centralized Archive:</strong> Browse, filter, search, and manage all your staged and stored files.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Fulfillment Analytics:</strong> Track real-time views and downloads for every generated code.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Instant Revocation:</strong> Revoke access codes or delete files at any moment with one click.</span>
              </li>
              <li>
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Multimodal Groq AI Assistant:</strong> Summarize and analyze documents, extract diagrams & OCR text from images (Groq Vision), transcribe audio recordings (Groq Whisper), and scan nested ZIP archives.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* User Dashboard Call-to-Action Banner */}
        <div className="sv-user-dashboard-banner">
          <div className="sv-user-banner-copy">
            <h3>Experience the DocQevrilo User Dashboard</h3>
            <p>Upload, organize, preview, and share your first document in seconds with zero complicated setup.</p>
          </div>
          <div className="sv-user-banner-actions">
            <Link to="/vault" className="sv-btn-primary">
              <UploadCloud size={16} />
              <span>Launch Document Vault</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/register" className="sv-btn-secondary">
              <span>Create Free Account</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: PRIVACY AND DOCUMENT PROTECTION
         ========================================================================= */}
      <section className="sv-security-section" id="security">
        <div className="sv-security-grid">
          <div className="sv-security-copy">
            <div className="sv-eyebrow">
              <ShieldCheck size={14} />
              <span>PRIVACY FIRST</span>
            </div>
            <h2 className="sv-section-title">Your Privacy and Document Protection Matter</h2>
            <p className="sv-lead-paragraph">
              At DocQevrilo, document access and account protection are the foundational pillars of our platform.
            </p>

            <p className="sv-body-paragraph">
              Our application is designed with multi-layered account authentication, granular access permissions, and strict document management controls to support responsible handling of your confidential information.
            </p>

            <div className="sv-security-checklist">
              <h4>Security Features Built-In:</h4>
              <div className="sv-check-grid">
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Account authentication & JWT session validation</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Email OTP-based password recovery</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Bcrypt password hashing on the backend</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Document access permissions & HMAC SHA-256 codes</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Input sanitization & strict file upload validation</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Protected backend API endpoints with CORS restriction</span>
                </div>
                <div className="sv-check-item">
                  <CheckCircle size={16} className="text-[#E11D2E]" />
                  <span>Real-time fulfillment tracking & cryptographic access logging</span>
                </div>
              </div>
            </div>

            <div className="sv-commitment-card">
              <h4>Our Commitment</h4>
              <p>
                We aim to provide users with a convenient document management environment where access to personal documents is controlled through appropriate authentication and authorization mechanisms. Users should only share documents with people they trust and review their sharing permissions regularly.
              </p>
            </div>
          </div>

          <div className="sv-security-media">
            <div className="sv-3d-card-frame">
              <img
                src="/images/welcome/privacy-security-shield.png"
                alt="DocQevrilo Security and Privacy Protection"
                className="sv-3d-illustration"
                loading="lazy"
              />
              <div className="sv-3d-caption">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#E11D2E]" />
                  <strong>Zero-Day & Responsible Disclosure</strong>
                </div>
                <span>Rigorous defense-in-depth architecture and continuous validation.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: MISSION & VISION
         ========================================================================= */}
      <section className="sv-mission-vision-section" id="mission">
        <div className="sv-section-heading text-center">
          <div className="sv-eyebrow justify-center">
            <Sparkles size={14} />
            <span>OUR CORE PURPOSE</span>
          </div>
          <h2 className="sv-section-title">Our Mission and Vision</h2>
          <p className="sv-section-subtitle">
            Guiding our commitment to building the next generation of digital document workspace technology.
          </p>
        </div>

        <div className="sv-mission-grid">
          {/* Mission Card */}
          <div className="sv-mission-card">
            <div className="sv-mission-icon-box">
              <Compass size={28} className="text-[#E11D2E]" />
            </div>
            <h3>Our Mission</h3>
            <p>
              Make digital document management simple, accessible and organized for everyone.
            </p>
            <div className="sv-mission-bar" />
          </div>

          {/* Vision Card */}
          <div className="sv-mission-card">
            <div className="sv-mission-icon-box">
              <Sparkles size={28} className="text-cyan-400" />
            </div>
            <h3>Our Vision</h3>
            <p>
              Build a smarter digital environment where managing and sharing important documents becomes easier.
            </p>
            <div className="sv-mission-bar sv-bar-cyan" />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION)
         ========================================================================= */}
      <section className="sv-faq-section" id="faq">
        <div className="sv-section-heading text-center">
          <div className="sv-eyebrow justify-center">
            <HelpCircle size={14} />
            <span>QUESTIONS & CLARIFICATIONS</span>
          </div>
          <h2 className="sv-section-title">Frequently Asked Questions</h2>
          <p className="sv-section-subtitle">
            Everything you need to know about DocQevrilo, account management, and document security.
          </p>
        </div>

        <div className="sv-faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`sv-faq-item ${isOpen ? 'active' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="sv-faq-question"
                  aria-expanded={isOpen}
                >
                  <span className="sv-faq-q-text">{faq.q}</span>
                  <div className="sv-faq-chevron">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="sv-faq-answer animate-in fade-in duration-200">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: READY TO START CTA
         ========================================================================= */}
      <section className="sv-final-cta">
        <div className="sv-cta-glow" />
        <div className="sv-cta-icon">
          <Shield size={28} />
        </div>
        <div className="sv-cta-copy">
          <h2>Ready to Simplify Your Document Management?</h2>
          <p>
            Join DocQevrilo today. Organize your files, protect confidential data, and share with total confidence through one convenient digital platform.
          </p>
        </div>
        <div className="sv-cta-actions">
          <Link to={currentUser ? '/vault' : '/register'} className="sv-btn-primary">
            <UploadCloud size={18} />
            <span>{currentUser ? 'Go to Vault' : 'Create Free Account'}</span>
            <ArrowRight size={15} />
          </Link>
          {!currentUser && (
            <Link to="/login" className="sv-cta-login">
              Existing user? Sign in
            </Link>
          )}
        </div>
      </section>

    </div>
  );
}

