import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, Radio, Sparkles } from 'lucide-react';
import OnlineLiveShare from '../components/sharing/OnlineLiveShare';

export default function OnlineShare({ currentUser = null }) {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      {/* Top Navigation Breadcrumb */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <Link
          to="/vault"
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Document Vault</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-[#E11D2E]" />
          <span>Live P2P Protocol</span>
        </div>
      </div>

      {/* Main Component */}
      <OnlineLiveShare currentUser={currentUser} initialAccessCode={initialCode} />
    </div>
  );
}

