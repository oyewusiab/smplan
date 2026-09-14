import React, { useState } from 'react';
import { Smartphone, Monitor, ExternalLink, Globe } from 'lucide-react';
import { PublicBulletinLandingPage } from '../../pages/PublicBulletinLandingPage';
import type { Bulletin } from '../../types';

interface BulletinWebViewProps {
  bulletin: Bulletin;
  onShareWhatsApp?: () => void;
  onOpenFeedbackModal?: () => void;
}

export function BulletinWebView({ bulletin }: BulletinWebViewProps) {
  const [viewMode, setViewMode] = useState<'MOBILE' | 'DESKTOP'>('MOBILE');

  if (!bulletin) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        No bulletin selected. Please select or create a bulletin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Preview Control Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">Live Mobile Web View (/visitbulletin)</h3>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% Live Match
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Interactive replica of what members experience at{' '}
              <span className="font-semibold text-blue-700">smplans.online/visitbulletin</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('MOBILE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'MOBILE'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DESKTOP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'DESKTOP'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          </div>

          {/* Open live URL in new window */}
          <a
            href="/visitbulletin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all shadow-2xs"
            title="Open /visitbulletin in separate browser tab"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Open URL</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Frame Container */}
      {viewMode === 'MOBILE' ? (
        <div className="flex justify-center py-2 px-1">
          {/* Realistic Mobile Device Frame */}
          <div className="w-full max-w-[440px] rounded-[44px] border-[10px] border-slate-900 shadow-2xl bg-slate-900 overflow-hidden ring-1 ring-slate-800">
            {/* Speaker / Dynamic Island Top Notch */}
            <div className="h-6 bg-slate-900 flex items-center justify-center pt-1.5">
              <div className="w-24 h-3.5 bg-slate-800 rounded-full flex items-center justify-end px-2">
                <div className="w-2 h-2 rounded-full bg-slate-900/90" />
              </div>
            </div>

            {/* Scrollable Screen Content */}
            <div className="bg-slate-50 overflow-y-auto max-h-[820px] rounded-b-[34px]">
              <PublicBulletinLandingPage previewBulletin={bulletin} isPreview={true} />
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="h-4 bg-slate-900 flex items-center justify-center pb-1">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <PublicBulletinLandingPage previewBulletin={bulletin} isPreview={true} />
        </div>
      )}
    </div>
  );
}
