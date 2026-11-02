import React, { useState, useEffect } from 'react';
import {
  Shield,
  Coffee,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Flame,
  Zap,
  HelpCircle,
  Activity,
  Terminal,
  Server,
  Layers,
} from 'lucide-react';

export default function StatusCodeProtocolModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_status_protocols', handleOpen);
    return () => window.removeEventListener('open_status_protocols', handleOpen);
  }, []);

  if (!isOpen) return null;

  const statusCodes = [
    {
      code: '200',
      title: 'Everything Working / System Operational',
      badge: 'Operational',
      badgeClass: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      desc: 'Standard operational baseline. All cryptographic object stores, JWT verification clusters, and backend microservices are executing with optimal latency and zero anomalies.',
      isBaseline: true,
    },
    {
      code: '418',
      title: "I'm a Teapot · Privacy Is Not Optional",
      badge: 'Core Philosophy',
      badgeClass: 'bg-red-950/80 text-red-300 border-[#E11D2E]/50 shadow-[0_0_12px_rgba(229,9,42,0.3)]',
      icon: Coffee,
      iconColor: 'text-[#E11D2E]',
      desc: "Inspired by RFC 2324 / 7168 ('Hyper Text Coffee Pot Control Protocol'). In DocQevrilo, zero-knowledge privacy isn't an optional toggle or secondary feature — it is an immutable foundation. Like an entity refusing to brew coffee because it is a teapot, DocQevrilo refuses to compromise user privacy.",
      isFeatured: true,
    },
    {
      code: '401',
      title: 'Authentication Required',
      badge: 'Access Control',
      badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
      icon: Lock,
      iconColor: 'text-amber-400',
      desc: 'A protected vault workspace endpoint was requested without a valid cryptographic JWT or session token. Sign in with valid credentials to obtain access.',
    },
    {
      code: '403',
      title: 'Access Forbidden',
      badge: 'Firewall Defense',
      badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
      icon: Shield,
      iconColor: 'text-rose-400',
      desc: 'Access denied by authorization policies or blocked by the DocQevrilo DeepShield WAF due to suspicious query patterns, unauthorized role, or rate limit jail.',
    },
    {
      code: '404',
      title: 'Page Not Found',
      badge: 'Routing / Expiry',
      badgeClass: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
      icon: HelpCircle,
      iconColor: 'text-zinc-400',
      desc: 'The requested vault route, file handle, or single-use retrieval key does not exist, has completed its burn-on-read cycle, or was cleaned by the auto-purge schedule.',
    },
    {
      code: '408',
      title: 'Request Timeout',
      badge: 'Network Protocol',
      badgeClass: 'bg-orange-950/60 text-orange-300 border-orange-500/30',
      icon: Clock,
      iconColor: 'text-orange-400',
      desc: 'The connection timed out before the client finished streaming the request body or staged multipart file upload. Retry over a stable connection.',
    },
    {
      code: '429',
      title: 'Too Many Requests',
      badge: 'Rate Protection',
      badgeClass: 'bg-yellow-950/60 text-yellow-300 border-yellow-500/30',
      icon: Zap,
      iconColor: 'text-yellow-400',
      desc: 'Rate limit ceiling reached. DocQevrilo adaptive throttles activate to defend against brute-force password guessing and volumetric automated scanning.',
    },
    {
      code: '500',
      title: 'Internal Server Error',
      badge: 'Runtime Exception',
      badgeClass: 'bg-red-950/60 text-red-400 border-red-500/30',
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      desc: 'An unexpected exception occurred during backend pipeline processing. Incidents are logged with unique tracking IDs for root-cause triage.',
    },
    {
      code: '503',
      title: 'Service Unavailable',
      badge: 'Maintenance',
      badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
      icon: Server,
      iconColor: 'text-blue-400',
      desc: 'Storage cluster replication, database migration, or maintenance underway. High-availability fallbacks automatically resume upon completion.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div
        className="bg-[#121216] border border-[#27272A] hover:border-[#E11D2E]/50 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-1 bg-gradient-to-r from-transparent via-[#E11D2E] to-transparent rounded-full shadow-[0_0_20px_#E11D2E]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close status codes modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-[#E11D2E]/40 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/50 text-[#E11D2E]">
            <Terminal className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="status-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Status Codes &amp; Protocols
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-950/70 text-red-300 border border-[#E11D2E]/40">
                HTTP Reference
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-zinc-300 mt-1">
              DocQevrilo Security Telemetry &amp; System Protocol Architecture
            </p>
          </div>
        </div>

        {/* Philosophy Highlight Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-zinc-900/60 border border-[#E11D2E]/40 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E11D2E]/20 border border-[#E11D2E]/50 flex items-center justify-center text-[#E11D2E] shrink-0">
              <Coffee size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-[#E11D2E]">HTTP 418</span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Privacy Is Not Optional
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Baseline operational state is <strong>200 · System Operational</strong>. Status code 418 represents our developer philosophy: zero-knowledge architecture without privacy compromises.
              </p>
            </div>
          </div>
        </div>

        {/* Status Codes List */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-2">
            <Activity size={14} className="text-[#E11D2E]" />
            <span>Standard Status Codes &amp; Security Definitions</span>
          </h3>

          <div className="space-y-2.5">
            {statusCodes.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.code}
                  className={`p-3.5 rounded-xl border transition-all ${
                    item.isFeatured
                      ? 'bg-gradient-to-r from-red-950/30 to-zinc-900/70 border-[#E11D2E]/50 shadow-[0_4px_20px_-4px_rgba(229,9,42,0.2)]'
                      : item.isBaseline
                      ? 'bg-gradient-to-r from-emerald-950/20 to-zinc-900/60 border-emerald-500/30'
                      : 'bg-[#18181C]/70 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${item.iconColor}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-white px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {item.code}
                          </span>
                          <strong className="text-sm text-white font-semibold">
                            {item.title}
                          </strong>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 hidden sm:inline-block ${item.badgeClass}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice Footer */}
        <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-500 flex items-center justify-between flex-wrap gap-2">
          <span>* Error codes are only displayed dynamically when actual matching system conditions occur.</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
          >
            Dismiss Reference
          </button>
        </div>
      </div>
    </div>
  );
}

