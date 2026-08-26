/**
 * Curated Design System Themes for SM Planner Weekly Bulletin
 * Exactly matches the spec:
 * 1. Classic Navy & Gold: #1e3a8a / #b45309
 * 2. Forest & Bronze:     #064e3b / #9a3412
 * 3. Royal Plum:          #581c87 / #be185d
 * 4. Slate & Silver:      #334155 / #475569
 * 5. Vibrant Teal:        #134e5e / #b45309
 */

export interface BulletinTheme {
  key: string;
  name: string;
  primaryColor: string;    // Main brand header / title color
  secondaryColor: string;  // Accent / highlight / badge color
  bgLight: string;         // Light background tint
  borderLight: string;     // Border color
  badgeBg: string;         // Badge background
  badgeText: string;       // Badge text
  buttonBg: string;        // Active button background
  ringColor: string;       // Active focus ring
  previewGradient: string; // CSS gradient for preview swatches
}

export const BULLETIN_THEMES: Record<string, BulletinTheme> = {
  navy: {
    key: 'navy',
    name: 'Classic Navy & Gold',
    primaryColor: '#1e3a8a',
    secondaryColor: '#b45309',
    bgLight: '#eff6ff',
    borderLight: '#bfdbfe',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    buttonBg: 'bg-blue-900',
    ringColor: 'ring-blue-600',
    previewGradient: 'from-blue-900 via-blue-800 to-amber-600',
  },
  forest: {
    key: 'forest',
    name: 'Forest & Bronze',
    primaryColor: '#064e3b',
    secondaryColor: '#9a3412',
    bgLight: '#f0fdf4',
    borderLight: '#bbf7d0',
    badgeBg: '#ffedd5',
    badgeText: '#9a3412',
    buttonBg: 'bg-emerald-900',
    ringColor: 'ring-emerald-600',
    previewGradient: 'from-emerald-950 via-emerald-800 to-amber-700',
  },
  plum: {
    key: 'plum',
    name: 'Royal Plum & Rose',
    primaryColor: '#581c87',
    secondaryColor: '#be185d',
    bgLight: '#faf5ff',
    borderLight: '#e9d5ff',
    badgeBg: '#fce7f3',
    badgeText: '#9d174d',
    buttonBg: 'bg-purple-900',
    ringColor: 'ring-purple-600',
    previewGradient: 'from-purple-950 via-purple-800 to-pink-600',
  },
  slate: {
    key: 'slate',
    name: 'Slate & Silver',
    primaryColor: '#334155',
    secondaryColor: '#475569',
    bgLight: '#f8fafc',
    borderLight: '#cbd5e1',
    badgeBg: '#e2e8f0',
    badgeText: '#1e293b',
    buttonBg: 'bg-slate-800',
    ringColor: 'ring-slate-600',
    previewGradient: 'from-slate-800 via-slate-700 to-slate-500',
  },
  teal: {
    key: 'teal',
    name: 'Vibrant Teal & Amber',
    primaryColor: '#134e5e',
    secondaryColor: '#b45309',
    bgLight: '#f0fdfa',
    borderLight: '#99f6e4',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    buttonBg: 'bg-teal-900',
    ringColor: 'ring-teal-600',
    previewGradient: 'from-teal-900 via-cyan-800 to-amber-600',
  },
};

// Aliases for legacy theme codes
BULLETIN_THEMES.blue = BULLETIN_THEMES.navy;
BULLETIN_THEMES.green = BULLETIN_THEMES.forest;
BULLETIN_THEMES.purple = BULLETIN_THEMES.plum;
BULLETIN_THEMES.red = BULLETIN_THEMES.plum;
BULLETIN_THEMES.gold = BULLETIN_THEMES.teal;

export function getBulletinTheme(key?: string): BulletinTheme {
  if (!key) return BULLETIN_THEMES.navy;
  return BULLETIN_THEMES[key.toLowerCase()] || BULLETIN_THEMES.navy;
}
