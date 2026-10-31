import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  KeyRound,
  Share2,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  HardDrive,
  Clock,
  Flame,
  UploadCloud,
  Database,
  Cloud
} from 'lucide-react';

export default function Welcome() {
  const videoRef = useRef(null);

  // Synchronous DOM attachment via callback ref to guarantee muted autoplay before first paint
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
        playPromise.catch(() => {
          // If mobile browser policy deferred playback, start on first finger touch or scroll
          const unlock = () => {
            if (video && isMounted && video.paused) {
              video.play().catch(() => {});
            }
          };

          window.addEventListener('touchstart', unlock, { once: true, passive: true });
          window.addEventListener('touchend', unlock, { once: true, passive: true });
          window.addEventListener('click', unlock, { once: true, passive: true });
          window.addEventListener('scroll', unlock, { once: true, passive: true });
        });
      }
    };

    // Attempt playback immediately
    startPlayback();

    // Listen for buffering events
    video.addEventListener('canplay', startPlayback);
    video.addEventListener('loadeddata', startPlayback);

    // Replay cleanly if user switches back to this tab/app on phone
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

  return (
    <div className="sv-welcome-v2 sv-page-wrapper">
      {/* --- AMBIENT BACKGROUND VIDEO (MUTED, AUTOPLAY, ZERO-ERROR, MOBILE-PERFECT) --- */}
      <div className="sv-welcome-video-container" aria-hidden="true">
        <video
          ref={handleVideoRef}
          className="sv-welcome-bg-video"
          src="/gemini_generated_video_38e6201d.mp4"
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
        />
        <div className="sv-welcome-video-overlay" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="sv-hero-section sv-hero-v2" aria-labelledby="hero-heading">
        <div className="sv-hero-content">
          <div className="sv-eyebrow">
            <span className="sv-live-dot" />
            <span>DocQevrilo Platform · Secure sharing, made simple</span>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open_brand_meaning'))}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-[#E11D2E]/40 text-xs font-semibold text-white hover:bg-red-900/60 transition-all cursor-pointer mb-2 self-start shadow-sm"
          >
            <span>✨ Discover DocQevrilo Brand Meaning</span>
            <ArrowRight size={12} className="text-[#E11D2E]" />
          </button>

          <h1 id="hero-heading" className="sv-hero-headline">
            Documents. <br />
            <span className="sv-heading-muted">Security.</span> <br />
            <span className="highlight">Simplicity.</span>
          </h1>

          <p className="sv-hero-description">
            DocQevrilo gives teachers, students, and teams a smarter way to share documents securely using unique access codes, without needing WhatsApp or Telegram groups.
          </p>

          <div className="sv-hero-actions">
            <Link to="/register" className="sv-btn-primary">
              <span>Get Started</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="sv-btn-secondary">
              Sign In
            </Link>
            <Link to="/vault" className="sv-btn-secondary sv-btn-vault-link">
              <span>Open Document Vault</span>
            </Link>
          </div>

          <div className="sv-hero-trust sv-trust-v2">
            <ShieldCheck size={18} />
            <span>HMAC SHA-256 verification · Zero-knowledge hash lookups</span>
          </div>

          {/* Mini Stats Grid */}
          <div className="sv-hero-mini-stats">
            <div>
              <div className="sv-stat-icon"><Shield size={18} /></div>
              <div>
                <strong>Zero-Knowledge</strong>
                <span>SHA-256 Hashing</span>
              </div>
            </div>
            <div>
              <div className="sv-stat-icon"><KeyRound size={18} /></div>
              <div>
                <strong>Instant Access</strong>
                <span>High-Entropy Codes</span>
              </div>
            </div>
            <div>
              <div className="sv-stat-icon"><Lock size={18} /></div>
              <div>
                <strong>Auto-Destruct</strong>
                <span>Burn on Read Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Illustration v2 */}
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
                  <strong className="cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open_brand_meaning'))}>
                    Doc<span style={{ color: '#E11D2E' }}>Qevrilo</span>
                  </strong>
                  <span>ONE CODE. SIMPLE SHARING.</span>
                </div>
              </div>
              <div className="sv-vault-menu">
                <span /><span /><span />
              </div>
            </div>

            <div className="sv-vault-status">
              <div>
                <span className="sv-status-kicker">ENCRYPTED ARCHIVE</span>
                <h3>Active Vault #04</h3>
              </div>
              <div className="sv-status-icon">
                <Lock size={18} />
              </div>
            </div>

            <div className="sv-storage-meter">
              <div className="sv-storage-label">
                <span><HardDrive size={13} /> Encrypted Storage</span>
                <span>67% ALLOCATED</span>
              </div>
              <div className="sv-storage-track">
                <span />
              </div>
              <p>Backed by TiDB Cloud & Backblaze B2 Object Storage</p>
            </div>

            <div className="sv-vault-file">
              <div className="sv-file-type sv-file-pdf">
                <FileText size={18} />
              </div>
              <div className="sv-file-copy">
                <strong>Confidential_Agreement.pdf</strong>
                <span>194 KB · Native Browser View Ready</span>
              </div>
              <div className="sv-file-check">
                <CheckCircle size={16} />
              </div>
            </div>

            <div className="sv-vault-access">
              <div className="sv-access-heading">
                <span><KeyRound size={12} /> SECURE ACCESS CODE</span>
                <span className="sv-access-private">SINGLE-USE KEY</span>
              </div>
              <div className="sv-code-display">
                <span>A1B95</span>
                <span>@</span>
                <span>3he5</span>
              </div>
              <div className="sv-code-footer">
                <span><Clock size={11} /> Auto-expires in 24h</span>
              </div>
            </div>

            <div className="sv-vault-bottom">
              <span><ShieldCheck size={14} /> HMAC SHA-256 Signed</span>
              <span>Private Stream</span>
            </div>
          </div>

          {/* Floating Chip Top */}
          <div className="sv-floating-chip sv-chip-top">
            <div className="sv-chip-icon">
              <CheckCircle size={16} />
            </div>
            <div>
              <strong>Access Verified</strong>
              <small>Instant unlock authorized</small>
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
              <strong>Burn on Read</strong>
              <small>Auto-destruct configured</small>
            </div>
          </div>
        </div>
      </section>

      {/* --- VALUE / WORKFLOW STRIP --- */}
      <div className="sv-value-strip">
        <div className="sv-value-item">
          <span><UploadCloud size={20} /></span>
          <div>
            <strong>1. Upload Files or Notes</strong>
            <small>Single files, archives, or decrypted text notes</small>
          </div>
        </div>
        <span className="sv-value-arrow"><ArrowRight size={18} /></span>

        <div className="sv-value-item">
          <span><KeyRound size={20} /></span>
          <div>
            <strong>2. Generate Access Key</strong>
            <small>High-entropy cryptographic code issued</small>
          </div>
        </div>
        <span className="sv-value-arrow"><ArrowRight size={18} /></span>

        <div className="sv-value-item">
          <span><Share2 size={20} /></span>
          <div>
            <strong>3. Stream in Browser</strong>
            <small>Instant native view or direct download</small>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <section className="sv-features-v2" aria-labelledby="features-heading">
        <div className="sv-section-heading">
          <div className="sv-eyebrow">
            <span>CORE ARCHITECTURE</span>
          </div>
          <h2 id="features-heading">Engineered for uncompromising privacy.</h2>
          <p>
            A modern, zero-friction protocol for sharing sensitive documents without public links,
            trackers, or recipient registration requirements.
          </p>
        </div>

        <div className="sv-features-grid-v2">
          {/* Card 1 */}
          <div className="sv-feature-card-v2">
            <div className="sv-feature-card-top">
              <div className="sv-feature-icon-wrapper">
                <Shield size={24} />
              </div>
              <span className="sv-feature-number">01</span>
            </div>
            <span className="sv-feature-tag">ZERO-KNOWLEDGE</span>
            <h3 className="sv-feature-title">Private by Design</h3>
            <p className="sv-feature-desc">
              Your files remain confidential and strictly protected. Access is guarded by rigorous
              HMAC SHA-256 hash lookups rather than exposed public index URLs.
            </p>
            <div className="sv-feature-bottom-line" />
          </div>

          {/* Card 2 */}
          <div className="sv-feature-card-v2">
            <div className="sv-feature-card-top">
              <div className="sv-feature-icon-wrapper">
                <KeyRound size={24} />
              </div>
              <span className="sv-feature-number">02</span>
            </div>
            <span className="sv-feature-tag">HIGH ENTROPY</span>
            <h3 className="sv-feature-title">Dynamic Access Codes</h3>
            <p className="sv-feature-desc">
              Each uploaded vault generates a custom 10-character cryptographic access code. Only
              recipients possessing the exact code can unlock and stream the document.
            </p>
            <div className="sv-feature-bottom-line" />
          </div>

          {/* Card 3 */}
          <div className="sv-feature-card-v2">
            <div className="sv-feature-card-top">
              <div className="sv-feature-icon-wrapper">
                <Share2 size={24} />
              </div>
              <span className="sv-feature-number">03</span>
            </div>
            <span className="sv-feature-tag">NATIVE STREAMING</span>
            <h3 className="sv-feature-title">View in Browser</h3>
            <p className="sv-feature-desc">
              Preview PDFs, images, notes, or multi-file archives directly in your browser without
              mandatory downloads or manual decompression utilities.
            </p>
            <div className="sv-feature-bottom-line" />
          </div>
        </div>
      </section>

      {/* --- ARCHITECTURE SECTION --- */}
      <section className="sv-architecture-section">
        <div className="sv-architecture-copy">
          <div className="sv-eyebrow">
            <span>INFRASTRUCTURE</span>
          </div>
          <h2>Distributed Cloud Security</h2>
          <p>
            Decoupled metadata and physical storage. TiDB Cloud handles atomic rate limiting, download quotas,
            and cryptographic hash validation, while Backblaze B2 ensures encrypted, private object storage and high-speed streaming.
          </p>
          <Link to="/vault" className="sv-inline-link">
            <span>Launch DocQevrilo Console</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="sv-architecture-diagram">
          <div className="sv-architecture-node sv-architecture-source">
            <div className="sv-architecture-icon sv-architecture-icon-red">
              <KeyRound size={20} />
            </div>
            <div>
              <strong>Client Verification Request</strong>
              <span>User enters unique 10-char access code</span>
            </div>
            <span className="sv-architecture-label">GATEWAY</span>
          </div>

          <div className="sv-architecture-connector">
            <span />
            <ArrowRight size={14} />
            <span />
          </div>

          <div className="sv-architecture-destinations">
            <div className="sv-architecture-node">
              <div className="sv-architecture-icon">
                <Database size={20} />
              </div>
              <div>
                <strong>TiDB Cloud Cluster</strong>
                <span>Atomic rate limiting, quota enforcement & SHA-256 hash matching</span>
              </div>
              <span className="sv-architecture-label">METADATA</span>
            </div>

            <div className="sv-architecture-node">
              <div className="sv-architecture-icon">
                <Cloud size={20} />
              </div>
              <div>
                <strong>Backblaze B2 Object Storage</strong>
                <span>Direct encrypted file pipeline to browser stream</span>
              </div>
              <span className="sv-architecture-label">STORAGE</span>
            </div>
          </div>

          <div className="sv-architecture-note">
            <ShieldCheck size={14} />
            <span>Zero plaintext passwords or keys stored on disk</span>
          </div>
        </div>
      </section>

      {/* --- FINAL CALL TO ACTION --- */}
      <section className="sv-final-cta">
        <div className="sv-cta-glow" />
        <div className="sv-cta-icon">
          <Shield size={28} />
        </div>
        <div className="sv-cta-copy">
          <h2>Ready to secure your documents?</h2>
          <p>
            Start uploading encrypted vaults, setting auto-destruct rules, and sharing with private access codes in seconds.
          </p>
        </div>
        <div className="sv-cta-actions">
          <Link to="/register" className="sv-btn-primary">
            <span>Get Started Now</span>
            <ArrowRight size={15} />
          </Link>
          <Link to="/login" className="sv-cta-login">
            Existing user? Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
