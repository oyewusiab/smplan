import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Heart, Gift, MessageSquare, Share2, Copy, Check,
  Volume2, VolumeX, Cake, PartyPopper, Star, Shield, ArrowRight,
  BookOpen, ChevronRight, Award, Smile, Send, Calendar, Clock, MapPin
} from 'lucide-react';
import {
  decodeCelebrantToken,
  cleanPhoneNumberForWhatsApp,
  formatBirthdayLabel,
  type CelebrantShareData
} from '../utils/bulletinBirthdayEngine';
import { formatHonorificName } from '../utils/memberTitle';
import type { CelebrantCardNote } from '../types';
import toast from 'react-hot-toast';

// ─── Age & Demographic Categorization ──────────────────────────────────────────
type AgeCategory = 'PRIMARY' | 'YOUTH' | 'ADULT';

function determineAgeCategory(age?: number, org?: string): AgeCategory {
  if (typeof age === 'number' && !isNaN(age)) {
    if (age <= 11) return 'PRIMARY';
    if (age <= 17) return 'YOUTH';
    return 'ADULT';
  }
  const o = (org || '').toLowerCase();
  if (o.includes('primary') || o.includes('nursery') || o.includes('sunbeam')) return 'PRIMARY';
  if (o.includes('young men') || o.includes('young women') || o.includes('ym') || o.includes('yw') || o.includes('seminary') || o.includes('aaronic')) return 'YOUTH';
  return 'ADULT';
}

// ─── Spiritual Blessings & Scriptures by Category ──────────────────────────────
const CATEGORY_CONTENT = {
  PRIMARY: {
    banner: "🎈 HAPPY BIRTHDAY, PRECIOUS CHILD OF GOD! 🌟",
    subtitle: "Heavenly Father loves you so much, and your ward family is celebrating you today!",
    scriptureQuote: "And he took their little children, one by one, and blessed them, and prayed unto the Father for them.",
    scriptureRef: "3 Nephi 17:21",
    songLyrics: "“I am a child of God, and He has sent me here, Has given me an earthly home with parents kind and dear.”",
    badgeLabel: "Primary Star ⭐",
    themeBg: "from-sky-400 via-pink-400 to-amber-300",
    balloonGifts: [
      { id: 1, color: '#EF4444', emoji: '🌟', title: 'A Shining Light', text: 'You bring sunshine and bright smiles to Primary and your family every single day!' },
      { id: 2, color: '#3B82F6', emoji: '🛡️', title: 'Always Loved', text: 'Angels watch over you and Heavenly Father always hears your sweet prayers.' },
      { id: 3, color: '#10B981', emoji: '🌱', title: 'Growing Strong', text: 'Like Jesus, you are growing in wisdom, kindness, and love for everyone around you.' },
      { id: 4, color: '#F59E0B', emoji: '💖', title: 'Big Loving Heart', text: 'Your gentle spirit and helpful hands make our ward a happier family!' },
      { id: 5, color: '#8B5CF6', emoji: '🎁', title: 'Special Talents', text: 'God has blessed you with wonderful gifts that will bless many people as you grow!' },
    ],
    wheelBlessings: [
      "Joyful Play & Laughter",
      "Angel Protection",
      "Bright Wisdom in School",
      "Peaceful Heart",
      "Loving Friends",
      "Heavenly Father's Smile",
      "Kindness in Your Hands",
      "Happy Songs of Faith"
    ],
  },
  YOUTH: {
    banner: "⚡ HAPPY BIRTHDAY TO A RISING DISCIPLE OF CHRIST! 🌟",
    subtitle: "You are part of a noble generation with a divine destiny. We celebrate your life and faith today!",
    scriptureQuote: "Let no man despise thy youth; but be thou an example of the believers, in word, in conversation, in charity, in spirit, in faith, in purity.",
    scriptureRef: "1 Timothy 4:12",
    songLyrics: "“Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.”",
    badgeLabel: "Youth Champion ⚔️",
    themeBg: "from-amber-500 via-rose-500 to-indigo-600",
    balloonGifts: [
      { id: 1, color: '#EF4444', emoji: '⚔️', title: 'Courage of Captain Moroni', text: 'Stand tall in your testimony. Your faith is an anchor and an inspiration to your peers.' },
      { id: 2, color: '#3B82F6', emoji: '💡', title: 'The Light of Christ', text: 'Your example lights the way for your friends and family. Never underestimate your divine influence.' },
      { id: 3, color: '#10B981', emoji: '📜', title: 'Divine Purpose', text: 'The Lord has great things for you to accomplish. He is preparing you step by step.' },
      { id: 4, color: '#F59E0B', emoji: '🕊️', title: 'Peace & Assurance', text: 'Whenever life feels demanding, remember that the Savior walks beside you always.' },
      { id: 5, color: '#8B5CF6', emoji: '✨', title: 'Eternal Potential', text: 'You possess royal heritage as a son or daughter of God. Greater is He that is in you!' },
    ],
    wheelBlessings: [
      "Unshakable Testimony",
      "Academic & Career Guidance",
      "True & Loyal Friends",
      "Strength to Stand as a Witness",
      "Confidence in Christ",
      "Heavenly Peace",
      "Leadership Gifts",
      "Joy in Temple & Family History"
    ],
  },
  ADULT: {
    banner: "👑 HAPPY BIRTHDAY TO A CHERISHED DISCIPLE IN ZION! ✨",
    subtitle: "Honoring your faithful discipleship, dedicated service, and the wonderful blessing you are to our ward family.",
    scriptureQuote: "Remember the worth of souls is great in the sight of God... And men are, that they might have joy.",
    scriptureRef: "D&C 18:10 • 2 Nephi 2:25",
    songLyrics: "“Because I have been given much, I too must give; Because of thy great bounty, Lord, each day I live.”",
    badgeLabel: "Cherished Pillar 🏛️",
    themeBg: "from-amber-600 via-amber-700 to-indigo-900",
    balloonGifts: [
      { id: 1, color: '#EF4444', emoji: '🕊️', title: 'Peace That Surpasseth Understanding', text: 'May the peace of the Lord fill your heart, your home, and all your righteous desires.' },
      { id: 2, color: '#3B82F6', emoji: '🛡️', title: 'The Shield of Faith', text: 'Thank you for your steady example of covenants kept and steadfast dedication to the Master.' },
      { id: 3, color: '#10B981', emoji: '🌿', title: 'Abundant Health & Energy', text: 'We pray the Lord renews your strength like the eagle, granting you vitality and long life.' },
      { id: 4, color: '#F59E0B', emoji: '🏠', title: 'Eternal Family Joy', text: 'May blessings of unity, love, and eternal fellowship rest upon you and your household.' },
      { id: 5, color: '#8B5CF6', emoji: '⭐', title: 'Celestial Favor', text: 'Your quiet acts of service, prayers, and discipleship are written in the records of heaven.' },
    ],
    wheelBlessings: [
      "Health & Vitality",
      "Home of Peace & Sanctuary",
      "Wisdom in Daily Decisions",
      "Heavenly Consolation & Joy",
      "Strengthened Covenants",
      "Fruit of the Spirit",
      "Generational Family Blessings",
      "The Master's Well Done"
    ],
  },
};

// ─── Web Audio API Celebratory Fanfare Synthesizer ────────────────────────────
function playCelebrationFanfare() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 261.63, time: 0.0, dur: 0.15 }, // C4
      { freq: 329.63, time: 0.15, dur: 0.15 }, // E4
      { freq: 392.00, time: 0.30, dur: 0.18 }, // G4
      { freq: 523.25, time: 0.48, dur: 0.40 }, // C5
      { freq: 659.25, time: 0.90, dur: 0.25 }, // E5
      { freq: 783.99, time: 1.15, dur: 0.55 }, // G5
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + n.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur + 0.05);
    });
  } catch (err) {
    // Audio synthesis fallback silently ignored on restricted browsers
  }
}

// ─── Default Sample Notes for the Wall of Love ─────────────────────────────────
const INITIAL_WARD_NOTES: CelebrantCardNote[] = [
  {
    id: 'note-1',
    author: 'Bishopric',
    relationship: 'Ward Leadership',
    message: 'We thank Heavenly Father for your life and example in our ward family! Have a joyful and blessed birthday!',
    emoji: '🙏',
    timestamp: 'Today',
  },
  {
    id: 'note-2',
    author: 'Ward Family & Friends',
    relationship: 'Congregation',
    message: 'Wishing you good health, continuous laughter, peace, and abundant blessings throughout this new year!',
    emoji: '🎉',
    timestamp: 'Today',
  },
];

export function CelebrantCelebrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 1. Decode Celebrant Information from URL parameters or token
  const celebrantData: CelebrantShareData = useMemo(() => {
    const token = searchParams.get('c') || searchParams.get('token');
    if (token) {
      const decoded = decodeCelebrantToken(token);
      if (decoded) return decoded;
    }

    // Direct Query Parameter Fallback
    const nameParam = searchParams.get('name') || searchParams.get('n') || 'Beloved Celebrant';
    const bDate = searchParams.get('bdate') || searchParams.get('b') || '';
    const dateStr = searchParams.get('date') || searchParams.get('d') || '';
    const unitName = searchParams.get('unit') || searchParams.get('ward') || 'Ward';
    const ageParam = parseInt(searchParams.get('age') || '', 10);
    const org = searchParams.get('org') || '';
    const phone = searchParams.get('phone') || '';

    return {
      name: nameParam,
      birthDate: bDate,
      dateStr: dateStr || new Date().toISOString().split('T')[0],
      unitName,
      age: isNaN(ageParam) ? undefined : ageParam,
      organisation: org,
      phone,
    };
  }, [searchParams]);

  const cleanName = (celebrantData.name || 'Celebrant').replace(/\s*\([^)]+\)$/, '').trim();
  const displayName = formatHonorificName(cleanName);
  const ageCategory = determineAgeCategory(celebrantData.age, celebrantData.organisation);
  const content = CATEGORY_CONTENT[ageCategory];

  // 2. Temporal Status Calculation
  const temporalStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const target = celebrantData.dateStr;
    if (!target) return { isToday: true, isPast: false };

    if (target === today) return { isToday: true, isPast: false };

    // Check if target is in the past
    const isPastDate = target < today;
    return { isToday: false, isPast: isPastDate };
  }, [celebrantData.dateStr]);

  // 3. Interactive Games States
  // Game 1: Birthday Cake Candles
  const [litCandles, setLitCandles] = useState<boolean[]>([false, false, false]);
  const [candlesBlownOut, setCandlesBlownOut] = useState(false);

  // Game 2: Balloon Popper
  const [poppedBalloons, setPoppedBalloons] = useState<number[]>([]);
  const [activeBalloonGift, setActiveBalloonGift] = useState<(typeof content.balloonGifts)[0] | null>(null);

  // Game 3: Wheel of Celestial Gifts
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedBlessing, setSelectedBlessing] = useState<string | null>(null);

  // Game 4: Virtual Ward Card / Wall of Love
  const storageKey = `celebrant_notes_${cleanName.replace(/\s+/g, '_')}_${celebrantData.dateStr || 'general'}`;
  const [notes, setNotes] = useState<CelebrantCardNote[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WARD_NOTES;
  });

  const [authorName, setAuthorName] = useState('');
  const [authorRelationship, setAuthorRelationship] = useState('Ward Member');
  const [noteMessage, setNoteMessage] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('❤️');

  // Sound and sharing state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cheerCount, setCheerCount] = useState(24);

  // Confetti Canvas System
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const animRunningRef = useRef(true);

  // Initialize Canvas Confetti
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial ambient falling particles
    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#FBBF24'];
    particlesRef.current = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 1.8 + 0.8,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
      alpha: Math.random() * 0.6 + 0.35,
    }));

    animRunningRef.current = true;
    let animId: number;

    const render = () => {
      if (!animRunningRef.current) return;
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.decay) {
          p.alpha -= p.decay;
          p.vy += 0.08;
          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      animRunningRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Trigger burst of celebration confetti
  const triggerConfettiExplosion = (x?: number, y?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const posX = x !== undefined ? x : canvas.width / 2;
    const posY = y !== undefined ? y : canvas.height / 3;

    const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#FBBF24', '#FFFFFF'];
    const burstCount = 60;
    const newParticles: any[] = [];

    for (let i = 0; i < burstCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 3;
      newParticles.push({
        x: posX,
        y: posY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: Math.random() * 9 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        alpha: 1,
        decay: Math.random() * 0.015 + 0.012,
      });
    }

    particlesRef.current.push(...newParticles);
    if (soundEnabled) playCelebrationFanfare();
  };

  // Toggle audio fanfare
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playCelebrationFanfare();
      toast.success('Celebration sound enabled! 🎶');
    }
  };

  // Light candle handler
  const handleTapCandle = (idx: number) => {
    if (candlesBlownOut) return;
    const updated = [...litCandles];
    updated[idx] = !updated[idx];
    setLitCandles(updated);

    if (updated.every(Boolean)) {
      toast.success('All candles are lit! Now make a wish and blow them out! 🎂✨');
      triggerConfettiExplosion();
    }
  };

  // Blow out candles
  const handleBlowOutCandles = () => {
    setCandlesBlownOut(true);
    setLitCandles([false, false, false]);
    triggerConfettiExplosion();
    setCheerCount((prev) => prev + 5);
    toast.success('🎉 Hurray! May your righteous wishes and prayers be answered!');
  };

  // Pop balloon handler
  const handlePopBalloon = (balloon: (typeof content.balloonGifts)[0], e: React.MouseEvent) => {
    if (poppedBalloons.includes(balloon.id)) {
      setActiveBalloonGift(balloon);
      return;
    }
    setPoppedBalloons((prev) => [...prev, balloon.id]);
    setActiveBalloonGift(balloon);
    triggerConfettiExplosion(e.clientX, e.clientY);
    setCheerCount((prev) => prev + 1);
  };

  // Spin the Wheel of Celestial Gifts
  const handleSpinWheel = () => {
    if (wheelSpinning) return;
    setWheelSpinning(true);
    setSelectedBlessing(null);

    // Spin 4 to 6 full rotations plus random segment
    const extraRotations = (Math.floor(Math.random() * 4) + 4) * 360;
    const segmentDegree = 360 / content.wheelBlessings.length;
    const randomIndex = Math.floor(Math.random() * content.wheelBlessings.length);
    const targetDegree = extraRotations + randomIndex * segmentDegree;

    setWheelRotation((prev) => prev + targetDegree);

    setTimeout(() => {
      setWheelSpinning(false);
      setSelectedBlessing(content.wheelBlessings[randomIndex]);
      triggerConfettiExplosion();
      toast.success(`You received: "${content.wheelBlessings[randomIndex]}"! 🌟`);
    }, 3200);
  };

  // Sign Wall of Love handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !noteMessage.trim()) {
      toast.error('Please enter your name and a warm message!');
      return;
    }

    const newNote: CelebrantCardNote = {
      id: `note-${Date.now()}`,
      author: authorName.trim(),
      relationship: authorRelationship.trim() || 'Ward Member',
      message: noteMessage.trim(),
      emoji: selectedEmoji,
      timestamp: 'Just now',
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    setAuthorName('');
    setNoteMessage('');
    triggerConfettiExplosion();
    toast.success('Your warm birthday message has been pinned to the Wall of Love! 💌');
  };

  // Copy shareable link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Celebration link copied! Share with ward members & friends!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎉 Join us in celebrating our dear ${displayName} on their birthday today!\n\n` +
      `Check out their personalized celebration page, leave a loving message, and pop some blessing balloons:\n` +
      `${window.location.href}\n\n` +
      `Prepared with love by the ${celebrantData.unitName || 'Ward'} family. ❤️`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Direct WhatsApp greeting to the celebrant
  const handleDirectCelebrantWhatsApp = () => {
    if (!celebrantData.phone) {
      toast.error('Phone number not available for this celebrant.');
      return;
    }
    const cleanPhone = cleanPhoneNumberForWhatsApp(celebrantData.phone);
    const text = encodeURIComponent(
      `Happy Birthday, ${displayName}! 🎂🎉\n\n` +
      `Wishing you Heavenly Father's richest blessings, joy, good health, and peace on your special day!\n\n` +
      `We celebrate you today in our ${celebrantData.unitName || 'Ward'} family!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 relative selection:bg-amber-400 selection:text-amber-950 font-sans">
      {/* Background Ambient Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-10 w-full h-full"
      />

      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Link
            to="/visitbulletin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ward Bulletin</span>
          </Link>
          <span className="text-xs text-slate-400 hidden md:inline">
            • {celebrantData.unitName || 'Ward'} Celebration Portal
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Celebration Fanfare' : 'Enable Celebration Fanfare'}
            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Music On' : 'Music Off'}</span>
          </button>

          {/* Share Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* Main Celebration Content Container */}
      <main className="relative z-20 max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        
        {/* Temporal Banner Status Notice */}
        {temporalStatus.isPast && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 text-center space-y-1">
            <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400">
              💝 Sweet Keepsake & Memories
            </span>
            <p className="text-sm text-slate-300">
              We celebrated {displayName}'s birthday on {celebrantData.birthDate || celebrantData.dateStr}. Heavenly Father's blessings and the warm messages on this wall remain forever!
            </p>
          </div>
        )}

        {/* HERO CELEBRATION SPOTLIGHT */}
        <section
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-10 border-2 border-amber-400/80 shadow-2xl text-center space-y-6 bg-gradient-to-b ${content.themeBg}`}
          style={{
            boxShadow: '0 20px 50px -10px rgba(245, 158, 11, 0.35)',
          }}
        >
          {/* Top Floating Pennant Garland & Sparkles */}
          <div className="absolute top-2 left-4 text-2xl animate-bounce">🎈</div>
          <div className="absolute top-2 right-4 text-2xl animate-bounce" style={{ animationDuration: '2.5s' }}>🎈</div>

          {/* Celebrant Crown Avatar Showcase */}
          <div className="inline-block relative">
            <div
              onClick={() => triggerConfettiExplosion()}
              title="Tap for celebration confetti!"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 p-1 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-slate-900 rounded-3xl flex items-center justify-center text-5xl shadow-inner">
                {ageCategory === 'PRIMARY' ? '👶' : ageCategory === 'YOUTH' ? '⚡' : '🥳'}
              </div>
            </div>
            <span className="absolute -top-4 -right-2 text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
              👑
            </span>
          </div>

          {/* Headline & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-amber-300 border border-amber-400/50 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>{content.badgeLabel}</span>
              {celebrantData.birthDate && <span>• {celebrantData.birthDate}</span>}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {displayName}
            </h1>

            <p className="text-sm sm:text-base text-amber-100 max-w-xl mx-auto font-medium drop-shadow-sm">
              {content.subtitle}
            </p>
          </div>

          {/* Christ-Centered Scripture Reflection */}
          <div className="rounded-2xl bg-slate-950/75 backdrop-blur-md border border-amber-300/40 p-4 sm:p-5 text-left max-w-2xl mx-auto space-y-2 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Heavenly Father's Word for You</span>
            </div>
            <p className="text-sm sm:text-base text-slate-100 italic leading-relaxed">
              "{content.scriptureQuote}"
            </p>
            <div className="text-right text-xs font-extrabold text-amber-300">
              — {content.scriptureRef}
            </div>
          </div>

          {/* Interactive Confetti & Cheer Button */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                triggerConfettiExplosion();
                setCheerCount((c) => c + 1);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-950 hover:bg-slate-900 text-amber-300 font-black text-sm shadow-xl border-2 border-amber-400 active:scale-90 transition-all cursor-pointer"
            >
              <PartyPopper className="w-4 h-4 text-rose-500 animate-bounce" />
              <span>Tap to Shower Confetti! 🎊</span>
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-xs font-extrabold">
                {cheerCount}
              </span>
            </button>

            {celebrantData.phone && (
              <button
                type="button"
                onClick={handleDirectCelebrantWhatsApp}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl active:scale-95 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message on WhatsApp</span>
              </button>
            )}
          </div>
        </section>

        {/* ─── GAME 1: INTERACTIVE BIRTHDAY CAKE & CANDLE LIGHTING ────────────── */}
        <section className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl text-center">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
              <Cake className="w-6 h-6 text-amber-400" />
              <span>Light the Birthday Candles 🎂</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Tap each candle to light the flame with a prayer of gratitude in your heart!
            </p>
          </div>

          {/* The Birthday Cake Visual */}
          <div className="relative py-6 max-w-xs mx-auto">
            {/* Candles Row */}
            <div className="flex justify-center gap-6 mb-2">
              {litCandles.map((isLit, i) => (
                <div
                  key={i}
                  onClick={() => handleTapCandle(i)}
                  className="cursor-pointer group flex flex-col items-center"
                >
                  {/* Candle Flame */}
                  <div
                    className={`w-4 h-6 rounded-full transition-all duration-300 ${
                      isLit
                        ? 'bg-gradient-to-t from-amber-500 via-yellow-300 to-white shadow-[0_0_15px_#f59e0b] scale-110 animate-pulse'
                        : 'bg-slate-600 scale-75 opacity-40'
                    }`}
                  />
                  {/* Candle Stick */}
                  <div className="w-3.5 h-12 bg-gradient-to-b from-rose-400 to-rose-600 rounded-t-sm shadow-md border-t border-rose-300" />
                </div>
              ))}
            </div>

            {/* Cake Base */}
            <div className="w-48 sm:w-56 h-20 mx-auto bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 rounded-2xl shadow-xl border-4 border-amber-400 flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-4 bg-white/70 rounded-b-xl" />
              <div className="text-xs font-black text-amber-950 tracking-wider">
                {displayName.toUpperCase()}
              </div>
              <div className="text-[10px] font-bold text-amber-800">
                FAITH • HOPE • CHARITY
              </div>
            </div>
            {/* Cake Plate */}
            <div className="w-60 sm:w-68 h-3 mx-auto bg-slate-600 rounded-full shadow-lg -mt-1" />
          </div>

          {/* Candle Action Button */}
          {litCandles.every(Boolean) && !candlesBlownOut ? (
            <button
              type="button"
              onClick={handleBlowOutCandles}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer animate-bounce"
            >
              <span>💨 Make a Righteous Wish & Blow Out Candles!</span>
            </button>
          ) : candlesBlownOut ? (
            <div className="text-emerald-400 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Candles blown! May the Lord grant you righteous peace this year!</span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Tap all 3 candles to light them up!
            </p>
          )}
        </section>

        {/* ─── GAME 2: POP THE BLESSING BALLOONS ───────────────────────────────── */}
        <section className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
              <span>🎈 Pop the Blessing Balloons 💥</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Each balloon holds a celestial blessing and scripture promise. Tap to pop them!
            </p>
          </div>

          {/* Balloons Row */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 py-2">
            {content.balloonGifts.map((balloon) => {
              const isPopped = poppedBalloons.includes(balloon.id);
              return (
                <div
                  key={balloon.id}
                  onClick={(e) => handlePopBalloon(balloon, e)}
                  className="cursor-pointer group flex flex-col items-center select-none"
                >
                  <div
                    className={`w-14 h-18 sm:w-16 sm:h-20 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all duration-300 ${
                      isPopped
                        ? 'opacity-40 scale-75 bg-slate-700 grayscale'
                        : 'group-hover:scale-110 active:scale-90 animate-bounce'
                    }`}
                    style={{
                      backgroundColor: isPopped ? undefined : balloon.color,
                      animationDuration: `${3 + (balloon.id % 3) * 0.5}s`,
                    }}
                  >
                    <span>{isPopped ? '💥' : balloon.emoji}</span>
                  </div>
                  {/* Balloon String */}
                  <div className="w-0.5 h-6 bg-slate-500 mt-0.5" />
                  <span className="text-[10px] font-bold text-slate-400 mt-1 max-w-[80px] text-center truncate">
                    {balloon.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Revealed Blessing Showcase Card */}
          {activeBalloonGift && (
            <div className="rounded-2xl bg-slate-900 border border-amber-400/50 p-4 sm:p-5 text-center max-w-lg mx-auto space-y-2 shadow-xl animate-fade-in">
              <span className="text-2xl">{activeBalloonGift.emoji}</span>
              <h3 className="text-base font-black text-amber-300">
                {activeBalloonGift.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                "{activeBalloonGift.text}"
              </p>
            </div>
          )}
        </section>

        {/* ─── GAME 3: WHEEL OF HEAVENLY GIFTS ─────────────────────────────────── */}
        <section className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl text-center">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
              <Star className="w-6 h-6 text-amber-400" />
              <span>Wheel of Celestial Gifts 🎡</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Spin to receive an inspiring promise for your journey this coming year!
            </p>
          </div>

          {/* Circular Wheel Visual */}
          <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
            {/* Pointer Pin at Top */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 drop-shadow-md" />

            {/* Rotating Wheel Disc */}
            <div
              className="w-full h-full rounded-full border-4 border-amber-400 shadow-2xl relative overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transitionDuration: wheelSpinning ? '3.2s' : '0s',
                background: 'conic-gradient(#ef4444 0deg 45deg, #f59e0b 45deg 90deg, #10b981 90deg 135deg, #3b82f6 135deg 180deg, #ec4899 180deg 225deg, #8b5cf6 225deg 270deg, #f97316 270deg 315deg, #eab308 315deg 360deg)',
              }}
            >
              {/* Inner Decorative Center Hub */}
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center text-xs font-black text-amber-300 shadow-inner z-10">
                FAITH
              </div>
            </div>
          </div>

          {/* Spin Trigger Button */}
          <div>
            <button
              type="button"
              disabled={wheelSpinning}
              onClick={handleSpinWheel}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm shadow-xl active:scale-95 transition-all cursor-pointer ${
                wheelSpinning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 hover:scale-105'
              }`}
            >
              <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
              <span>{wheelSpinning ? 'Seeking Inspiration...' : '🎡 Spin the Wheel of Gifts!'}</span>
            </button>
          </div>

          {/* Selected Blessing Banner */}
          {selectedBlessing && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/50 p-4 max-w-md mx-auto space-y-1 animate-fade-in">
              <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400">
                Your Promised Celestial Gift
              </span>
              <p className="text-base sm:text-lg font-black text-white">
                🌟 {selectedBlessing}
              </p>
            </div>
          )}
        </section>

        {/* ─── WALL OF LOVE / VIRTUAL WARD BIRTHDAY CARD ──────────────────────── */}
        <section className="rounded-3xl bg-slate-800/80 border border-slate-700/80 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              <span>The Wall of Love (Sign the Birthday Card) 💌</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Leave a warm prayer, birthday blessing, or message of love for {displayName}!
            </p>
          </div>

          {/* Add Message Form */}
          <form onSubmit={handleAddNote} className="rounded-2xl bg-slate-900/90 border border-slate-700 p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Your Name (e.g. Sister Ngozi, Brother David)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <select
                value={authorRelationship}
                onChange={(e) => setAuthorRelationship(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="Ward Member">Ward Member</option>
                <option value="Bishopric / Leader">Bishopric / Ward Leader</option>
                <option value="Friend">Friend</option>
                <option value="Family Member">Family Member</option>
                <option value="Primary Teacher">Primary Teacher</option>
                <option value="Youth Leader">Youth Leader</option>
                <option value="Ministering Brother/Sister">Ministering Brother/Sister</option>
              </select>
            </div>

            <textarea
              required
              rows={2}
              placeholder={`Write a warm wish, prayer, or memory for ${displayName}...`}
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Pick Sticker:</span>
                {['❤️', '🙏', '🎂', '🎉', '🌟', '💐'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setSelectedEmoji(em)}
                    className={`text-base p-1.5 rounded-lg transition-transform ${
                      selectedEmoji === em ? 'bg-amber-500/20 scale-125 border border-amber-400' : 'hover:scale-110'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Pin on Wall</span>
              </button>
            </div>
          </form>

          {/* Pinned Messages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-4 space-y-2 relative shadow-md hover:border-amber-400/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{note.emoji}</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-200">
                        {note.author}
                      </h4>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {note.relationship}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">{note.timestamp}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed pl-1">
                  "{note.message}"
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── FOOTER & CHURCH CREDITS ───────────────────────────────────────── */}
        <footer className="text-center space-y-3 pt-6 pb-12 border-t border-slate-800 text-xs text-slate-500">
          <p>
            Prepared with Christlike love by the members and leadership of the{' '}
            <span className="text-amber-400 font-bold">{celebrantData.unitName || 'Ward'}</span>.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/visitbulletin" className="text-amber-400 hover:underline">
              View Weekly Bulletin
            </Link>
            <span>•</span>
            <button type="button" onClick={handleShareWhatsApp} className="text-emerald-400 hover:underline cursor-pointer">
              Share Celebration Link
            </button>
          </div>
          <p className="text-[11px] text-slate-600">
            For local member fellowship and celebration. Not an official publication of The Church of Jesus Christ of Latter-day Saints.
          </p>
        </footer>

      </main>
    </div>
  );
}
export default CelebrantCelebrationPage;
