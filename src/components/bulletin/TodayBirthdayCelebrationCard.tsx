import React from 'react';
import { Sparkles, MessageSquare, Mail, Smartphone, Heart, Gift, PartyPopper } from 'lucide-react';
import type { BulletinCelebrant } from '../../types';
import type { BirthdayChannel } from './BirthdayWishModal';
import { formatCelebrantDisplayName } from '../../utils/bulletinBirthdayEngine';
import { formatHonorificName } from '../../utils/memberTitle';

interface TodayBirthdayCelebrationCardProps {
  celebrants: BulletinCelebrant[];
  bulletinDate?: string;
  unitName?: string;
  onOpenWishModal: (celebrant: BulletinCelebrant, channel: BirthdayChannel) => void;
}

// Collection of warm, encouraging micro-wishes tailored for Latter-day Saint ward members
const PERSONAL_WISHES = [
  "Wishing you heaven's richest blessings, continuous peace, and abundant joy on your special day!",
  "May your day be filled with warm smiles, gratitude, and wonderful memories with loved ones!",
  "Thank you for being such a wonderful light in our ward family! Have a joyous and blessed birthday!",
  "May the Lord shower you with peace, good health, and happiness in this new year of your life!",
  "Celebrating you today! Wishing you joy in your heart and heaven's guidance always!"
];

export function TodayBirthdayCelebrationCard({
  celebrants,
  bulletinDate,
  unitName = 'Ward',
  onOpenWishModal,
}: TodayBirthdayCelebrationCardProps) {
  if (!celebrants || celebrants.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-400/15 to-rose-400/10 border-2 border-amber-400/80 shadow-md p-4 sm:p-5 transition-all">
      {/* Decorative Scoped Floating Particle Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <span className="absolute top-2 left-3 text-lg animate-bounce text-amber-500 opacity-80" style={{ animationDuration: '2.5s' }}>🎉</span>
        <span className="absolute top-3 right-4 text-base animate-pulse text-rose-500 opacity-75" style={{ animationDuration: '2s' }}>🎈</span>
        <span className="absolute bottom-2 left-10 text-sm animate-ping text-yellow-500 opacity-60" style={{ animationDuration: '3s' }}>✨</span>
        <span className="absolute bottom-3 right-8 text-base animate-bounce text-amber-600 opacity-70" style={{ animationDuration: '2.2s' }}>🎂</span>
        <span className="absolute top-1/2 left-2 text-xs text-rose-400 opacity-60 animate-pulse">⭐</span>
        <span className="absolute top-1/3 right-3 text-sm text-yellow-500 opacity-65 animate-bounce" style={{ animationDuration: '2.8s' }}>🎁</span>
        {/* Soft Shimmer Highlight Bar */}
        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-12 pointer-events-none" />
      </div>

      <div className="relative z-10 space-y-3.5">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-white shadow-xs text-sm animate-pulse">
              🎂
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Celebrating Today!
                </span>
                <span className="text-xs font-bold text-amber-900 hidden sm:inline">
                  Special Ward Birthday Spotlight
                </span>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-0.5 rounded-full">
            {celebrants.length === 1 ? '1 Celebrant Today' : `${celebrants.length} Celebrants Today`}
          </span>
        </div>

        {/* Celebrant(s) Showcase Cards */}
        <div className={`grid gap-3 ${celebrants.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {celebrants.map((celebrant, idx) => {
            const cleanName = (celebrant.name || 'Member').replace(/\s*\([^)]+\)$/, '').trim();
            const displayName = formatHonorificName(cleanName);
            const wishText = PERSONAL_WISHES[idx % PERSONAL_WISHES.length];
            const hasPhone = Boolean(celebrant.phone);
            const hasEmail = Boolean(celebrant.email);

            return (
              <div
                key={idx}
                className="bg-white/90 backdrop-blur-xs rounded-xl border border-amber-300/80 p-3 sm:p-3.5 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition-all group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-lg shadow-xs group-hover:scale-110 transition-transform">
                        🎉
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {displayName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800">
                          <span>🎈 Today’s Birthday</span>
                          {celebrant.birth_date && (
                            <span className="text-amber-700 font-bold">({celebrant.birth_date})</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs animate-bounce" style={{ animationDuration: '2s' }}>
                      ✨
                    </span>
                  </div>

                  {/* Personal Micro-Wish */}
                  <p className="text-[11px] sm:text-xs text-slate-700 italic bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 leading-relaxed">
                    "{wishText}"
                  </p>
                </div>

                {/* Direct Wishing Buttons */}
                <div className="pt-2.5 mt-1 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                  {/* WhatsApp Quick Action */}
                  <button
                    type="button"
                    onClick={() => onOpenWishModal(celebrant, 'WHATSAPP')}
                    title={`Send WhatsApp birthday greeting to ${cleanName}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
                    <span>WhatsApp Wish</span>
                  </button>

                  {/* SMS Quick Action */}
                  <button
                    type="button"
                    onClick={() => onOpenWishModal(celebrant, 'SMS')}
                    title={`Send SMS birthday wish to ${cleanName}`}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">SMS</span>
                  </button>

                  {/* Email Quick Action */}
                  <button
                    type="button"
                    onClick={() => onOpenWishModal(celebrant, 'EMAIL')}
                    title={`Send Email birthday wish to ${cleanName}`}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    <span className="hidden sm:inline">Email</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Celebratory Footer Notice */}
        <p className="text-[11px] text-center font-medium text-amber-900/80">
          🎁 Take a moment to brighten their special day with a warm message from you and your family!
        </p>
      </div>
    </div>
  );
}
