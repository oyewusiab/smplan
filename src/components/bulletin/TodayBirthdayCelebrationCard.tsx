import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, MessageSquare, Mail, Smartphone, Heart, Gift, PartyPopper, Copy, Share2, ExternalLink } from 'lucide-react';
import type { BulletinCelebrant } from '../../types';
import type { BirthdayChannel } from './BirthdayWishModal';
import { formatHonorificName } from '../../utils/memberTitle';
import { inferGenderFromName } from '../../utils/genderInference';
import { generateCelebrantShareUrl } from '../../utils/bulletinBirthdayEngine';
import toast from 'react-hot-toast';

interface TodayBirthdayCelebrationCardProps {
  celebrants: BulletinCelebrant[];
  bulletinDate?: string;
  unitName?: string;
  onOpenWishModal: (celebrant: BulletinCelebrant, channel: BirthdayChannel) => void;
}

// Warm, uplifting wishes tailored for ward members
const PERSONAL_WISHES = [
  "Wishing you heaven's richest blessings, continuous peace, and abundant joy on your special day!",
  "May your day be filled with warm smiles, gratitude, and wonderful memories with loved ones!",
  "Thank you for being such a wonderful light in our ward family! Have a joyous and blessed birthday!",
  "May the Lord shower you with peace, good health, and happiness in this new year of your life!",
  "Celebrating you today! Wishing you joy in your heart and heaven's guidance always!"
];

// Festive confetti particle structure
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle' | 'ribbon' | 'star';
  alpha: number;
  decay?: number;
}

const FESTIVE_COLORS = [
  '#F59E0B', // Amber Gold
  '#EF4444', // Vibrant Red
  '#10B981', // Emerald Green
  '#3B82F6', // Royal Blue
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#FBBF24', // Sun Yellow
];

export function TodayBirthdayCelebrationCard({
  celebrants,
  bulletinDate,
  unitName = 'Ward',
  onOpenWishModal,
}: TodayBirthdayCelebrationCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cheerCount, setCheerCount] = useState(12);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const nextEmojiId = useRef(0);

  // Particles state stored in refs to avoid React re-renders in 60fps RAF loop
  const particlesRef = useRef<Particle[]>([]);
  const isRunningRef = useRef(true);

  // Initialize and run scoped internal canvas confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = container.offsetWidth);
    let height = (canvas.height = container.offsetHeight);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = canvas.width = container.offsetWidth;
      height = canvas.height = container.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Seed continuous gentle ambient particles
    const count = 32;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 1.5 + 0.8,
      size: Math.random() * 6 + 4,
      color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
      shape: (['rect', 'circle', 'ribbon', 'star'] as const)[Math.floor(Math.random() * 4)],
      alpha: Math.random() * 0.6 + 0.35,
    }));

    isRunningRef.current = true;
    let animId: number;

    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    const loop = () => {
      if (!isRunningRef.current) return;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.decay) {
          p.alpha -= p.decay;
          p.vy += 0.06; // slight gravity on burst particles
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          // Ambient particle wrapping
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          drawStar(0, 0, 5, p.size * 0.7, p.size * 0.35);
        } else {
          // Ribbon
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * 1.4, p.size * 0.3);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Trigger playful explosion of confetti inside the card on cheer click
  const triggerConfettiBurst = (e?: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const originX = e ? e.clientX - rect.left : rect.width / 2;
    const originY = e ? e.clientY - rect.top : rect.height / 2;

    const burstCount = 45;
    const newParticles: Particle[] = [];

    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2.5;
      newParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 8 + 5,
        color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape: (['rect', 'circle', 'ribbon', 'star'] as const)[Math.floor(Math.random() * 4)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.012,
      });
    }

    particlesRef.current.push(...newParticles);

    // Increment cheerful reaction counter
    setCheerCount((prev) => prev + 1);

    // Spawn cheerful floating badge
    const id = nextEmojiId.current++;
    const emojiList = ['🎉 +1', '🎂 Joy!', '✨ Blessings!', '🎈 Yay!', '💖 Cheers!'];
    const chosenEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    setFloatingEmojis((prev) => [
      ...prev,
      { id, x: originX, y: originY, text: chosenEmoji }
    ]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1200);
  };

  if (!celebrants || celebrants.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-100/90 via-yellow-50/95 to-amber-50 shadow-lg p-4 sm:p-6 transition-all select-none"
      style={{
        boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.25), 0 8px 10px -6px rgba(245, 158, 11, 0.2)',
      }}
    >
      {/* Dynamic Scoped Canvas Confetti Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 w-full h-full"
      />

      {/* Floating Animated Reaction Badges */}
      {floatingEmojis.map((emoji) => (
        <div
          key={emoji.id}
          className="pointer-events-none absolute z-40 text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-md animate-fade-up"
          style={{
            left: emoji.x - 20,
            top: emoji.y - 25,
            animation: 'celebrationFloat 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {emoji.text}
        </div>
      ))}

      {/* Festive Top Party Bunting / Triangular Garland Banner */}
      <div className="absolute top-0 left-0 right-0 flex justify-between overflow-hidden px-1 pointer-events-none z-10 opacity-90">
        {[
          '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6',
          '#F97316', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899',
          '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'
        ].map((color, i) => (
          <div
            key={i}
            className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px]"
            style={{
              borderTopColor: color,
              transform: `rotate(${Math.sin(i * 1.2) * 8}deg)`,
              animation: `pennantSway ${2.5 + (i % 3) * 0.4}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Floating Decorative Balloons on Left & Right Sides */}
      <div className="absolute -left-2 top-8 pointer-events-none z-10 hidden sm:block animate-bounce" style={{ animationDuration: '3.5s' }}>
        <div className="text-3xl filter drop-shadow-md">🎈</div>
      </div>
      <div className="absolute -right-2 top-10 pointer-events-none z-10 hidden sm:block animate-bounce" style={{ animationDuration: '4s' }}>
        <div className="text-3xl filter drop-shadow-md">🎈</div>
      </div>

      <div className="relative z-20 space-y-4 pt-2">
        {/* Animated Celebration Headline Ribbon */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-2.5 border-b border-amber-300/70">
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-md">
              <span className="text-lg animate-pulse">🎂</span>
              <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  🎉 CELEBRATING TODAY!
                </span>
                <span className="text-xs font-black text-amber-950 tracking-tight">
                  Special Ward Birthday Spotlight
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Confetti Popping Button */}
            <button
              type="button"
              onClick={triggerConfettiBurst}
              title="Click to shower with celebratory confetti!"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-amber-950 font-black text-xs shadow-xs border border-amber-500 active:scale-90 transition-all cursor-pointer group"
            >
              <PartyPopper className="w-3.5 h-3.5 text-rose-600 group-hover:rotate-12 transition-transform" />
              <span>Shower Confetti! 🎊</span>
              <span className="bg-amber-900/10 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold text-amber-900">
                {cheerCount}
              </span>
            </button>

            <span className="text-[11px] font-extrabold text-amber-900 bg-amber-200/80 border border-amber-400/80 px-2.5 py-1 rounded-full">
              {celebrants.length === 1 ? '1 Celebrant Today' : `${celebrants.length} Celebrants Today`}
            </span>
          </div>
        </div>

        {/* Celebrant(s) Showcase Stage */}
        <div className={`grid gap-4 ${celebrants.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {celebrants.map((celebrant, idx) => {
            const cleanName = (celebrant.name || 'Member').replace(/\s*\([^)]+\)$/, '').trim();
            const effectiveGender = celebrant.gender || inferGenderFromName(cleanName) || undefined;
            const effectiveOrg = celebrant.organisation || (effectiveGender === 'F' ? 'Relief Society' : undefined);
            const displayName = formatHonorificName(
              cleanName,
              {
                gender: effectiveGender,
                calling: effectiveOrg,
                organisation: effectiveOrg,
                member_id: celebrant.member_id,
              },
              effectiveGender
            );
            const wishText = PERSONAL_WISHES[idx % PERSONAL_WISHES.length];

            return (
              <div
                key={idx}
                className="relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-400/90 p-4 sm:p-5 shadow-md hover:shadow-xl hover:border-amber-500 transition-all flex flex-col justify-between group"
              >
                {/* Subtle Background Glow Shimmer */}
                <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-amber-300/30 blur-xl pointer-events-none group-hover:bg-amber-300/50 transition-all" />

                <div className="space-y-3">
                  {/* Top Header: Crown, Celebrant Avatar & Festive Title */}
                  <div className="flex items-center gap-3.5">
                    {/* Interactive Animated Avatar */}
                    <div
                      onClick={triggerConfettiBurst}
                      title="Tap for confetti celebration!"
                      className="relative cursor-pointer group-hover:scale-105 transition-transform"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
                        <div className="w-full h-full bg-amber-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                          🥳
                        </div>
                      </div>
                      {/* Floating Crown / Party Hat Badge */}
                      <span className="absolute -top-2.5 -right-2 text-base animate-bounce" style={{ animationDuration: '2s' }}>
                        👑
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-2xs">
                          HAPPY BIRTHDAY!
                        </span>
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <span>🎈 Today's Star</span>
                          {celebrant.birth_date && (
                            <span className="font-extrabold text-amber-900">({celebrant.birth_date})</span>
                          )}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug mt-0.5 truncate">
                        {displayName}
                      </h3>
                    </div>

                    <div className="text-xl animate-spin" style={{ animationDuration: '8s' }}>
                      ⭐
                    </div>
                  </div>

                  {/* Ward Blessing Card / Personalized Micro-Wish */}
                  <div className="relative rounded-xl bg-gradient-to-br from-amber-50 via-yellow-50/70 to-amber-100/50 border border-amber-300/70 p-3 shadow-2xs">
                    <span className="absolute top-1 left-2 text-amber-400 text-lg font-serif leading-none select-none">“</span>
                    <p className="text-xs sm:text-sm text-slate-800 italic font-medium leading-relaxed pl-3 pr-2">
                      {wishText}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-black text-amber-800 uppercase tracking-wider">
                      <span>— From Your {unitName} Family</span>
                      <span>❤️</span>
                    </div>
                  </div>
                </div>

                {/* Catchy Personal Temporal Celebration Page Links & Action Buttons */}
                {(() => {
                  const celebrationUrl = generateCelebrantShareUrl(
                    { ...celebrant, gender: effectiveGender, organisation: effectiveOrg },
                    unitName,
                    bulletinDate
                  );
                  return (
                    <div className="pt-3 mt-2 border-t border-amber-200 space-y-2">
                      {/* Big Gold Personal Celebration Page Link */}
                      <a
                        href={celebrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <PartyPopper className="w-4 h-4 text-rose-700" />
                        <span>🌟 Open Personal Celebration Page</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                      </a>

                      {/* Copy Link & Share on WhatsApp Row */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(celebrationUrl);
                            toast.success(`Copied celebration link for ${displayName}! 🔗`);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100/90 hover:bg-amber-200/90 border border-amber-300 text-amber-950 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-800" />
                          <span>Copy Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const text = encodeURIComponent(
                              `🎉 Join us in celebrating our dear ${displayName} on their birthday today!\n\n` +
                              `Check out their personalized celebration page, pop some balloons, and sign their card:\n` +
                              `${celebrationUrl}\n\n` +
                              `With love from your ${unitName} family! ❤️`
                            );
                            window.open(`https://wa.me/?text=${text}`, '_blank');
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-950 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Share Page</span>
                        </button>
                      </div>

                      {/* Direct Wishing Buttons (WhatsApp, SMS, Email) */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => onOpenWishModal(celebrant, 'WHATSAPP')}
                          title={`Send WhatsApp birthday wish to ${cleanName}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-100" />
                          <span>WhatsApp Wish</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenWishModal(celebrant, 'SMS')}
                          title={`Send SMS birthday wish to ${cleanName}`}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">SMS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenWishModal(celebrant, 'EMAIL')}
                          title={`Send Email birthday wish to ${cleanName}`}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-purple-600" />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Catchy Celebratory Footer Prompt */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-center font-bold text-amber-950 bg-amber-200/60 rounded-xl py-1.5 px-3 border border-amber-300">
          <span>🎁</span>
          <span>
            Take a moment to make their day brighter! Tap above to send your warm birthday greeting!
          </span>
          <span>🎉</span>
        </div>
      </div>

      {/* Scoped CSS Keyframe Styles */}
      <style>{`
        @keyframes pennantSway {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes celebrationFloat {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          20% { opacity: 1; transform: translateY(-10px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
