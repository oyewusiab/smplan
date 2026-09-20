import { format, parseISO } from 'date-fns';
import type { Bulletin } from '../types';

export type BulletinStage = 'DRAFT' | 'LIVE' | 'QUEUED' | 'EXPIRED';

export interface BulletinWeekBounds {
  monday: Date;
  sunday: Date;
  mondayStr: string;
  sundayStr: string;
  mondayFormatted: string;
  sundayFormatted: string;
  weekRangeLabel: string;
}

export interface BulletinLifecycleInfo {
  stage: BulletinStage;
  isDraft: boolean;
  isPublished: boolean;
  isLive: boolean;
  isQueued: boolean;
  isExpired: boolean;
  badgeLabel: string;
  headerStatusLabel: string;
  buttonLabel: string;
  description: string;
  badgeClass: string;
  borderClass: string;
  mondayFormatted: string;
  sundayFormatted: string;
  weekRangeLabel: string;
}

/**
 * Safely parses the target Sunday date of a weekly bulletin (format: YYYY-MM-DD)
 * and calculates the exact Monday 00:00:00 to Sunday 23:59:59 week window.
 */
export function getBulletinWeekBounds(dateStr?: string): BulletinWeekBounds | null {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split('-');
  if (parts.length !== 3) return null;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const sunday = new Date(y, m, d, 23, 59, 59, 999);
  const monday = new Date(y, m, d, 0, 0, 0, 0);
  monday.setDate(monday.getDate() - 6);

  try {
    const mondayStr = format(monday, 'yyyy-MM-dd');
    const sundayStr = format(sunday, 'yyyy-MM-dd');
    const mondayFormatted = format(monday, 'EEE, d MMM');
    const sundayFormatted = format(sunday, 'EEE, d MMM yyyy');
    const weekRangeLabel = `${format(monday, 'd MMM')} – ${format(sunday, 'd MMM yyyy')}`;

    return {
      monday,
      sunday,
      mondayStr,
      sundayStr,
      mondayFormatted,
      sundayFormatted,
      weekRangeLabel,
    };
  } catch {
    return {
      monday,
      sunday,
      mondayStr: dateStr,
      sundayStr: dateStr,
      mondayFormatted: dateStr,
      sundayFormatted: dateStr,
      weekRangeLabel: dateStr,
    };
  }
}

/**
 * Evaluates the dynamic publication stage of a bulletin at a given reference time.
 * - DRAFT: Not yet published.
 * - LIVE: Published and currently within its Monday 00:00:00 - Sunday 23:59:59 week window.
 * - QUEUED: Published in advance, safely awaiting its Monday 00:00:00 start time.
 * - EXPIRED: Published but its Sunday 23:59:59 week end has passed.
 */
export function getBulletinLifecycle(
  bulletin?: { date?: string; status?: string } | null,
  refDate: Date = new Date()
): BulletinLifecycleInfo {
  const isPublished = (bulletin?.status || '').toUpperCase() === 'PUBLISHED';
  const bounds = getBulletinWeekBounds(bulletin?.date);

  const fallbackBounds: BulletinWeekBounds = bounds || {
    monday: new Date(),
    sunday: new Date(),
    mondayStr: bulletin?.date || '',
    sundayStr: bulletin?.date || '',
    mondayFormatted: bulletin?.date || '',
    sundayFormatted: bulletin?.date || '',
    weekRangeLabel: bulletin?.date || '',
  };

  if (!isPublished) {
    const isFutureDraft = bounds ? refDate < bounds.monday : false;
    return {
      stage: 'DRAFT',
      isDraft: true,
      isPublished: false,
      isLive: false,
      isQueued: false,
      isExpired: false,
      badgeLabel: 'DRAFT',
      headerStatusLabel: 'DRAFT (Work in progress)',
      buttonLabel: isFutureDraft ? 'Publish to Queue' : 'Publish Bulletin',
      description: 'Draft not yet published to congregation members.',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      borderClass: 'border-amber-300',
      mondayFormatted: fallbackBounds.mondayFormatted,
      sundayFormatted: fallbackBounds.sundayFormatted,
      weekRangeLabel: fallbackBounds.weekRangeLabel,
    };
  }

  if (!bounds) {
    return {
      stage: 'LIVE',
      isDraft: false,
      isPublished: true,
      isLive: true,
      isQueued: false,
      isExpired: false,
      badgeLabel: 'PUBLISHED',
      headerStatusLabel: 'PUBLISHED (Live)',
      buttonLabel: 'Republish Live',
      description: 'Published weekly bulletin.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-300',
      mondayFormatted: fallbackBounds.mondayFormatted,
      sundayFormatted: fallbackBounds.sundayFormatted,
      weekRangeLabel: fallbackBounds.weekRangeLabel,
    };
  }

  // 1. Expired: Past Sunday 11:59:59 PM
  if (refDate > bounds.sunday) {
    return {
      stage: 'EXPIRED',
      isDraft: false,
      isPublished: true,
      isLive: false,
      isQueued: false,
      isExpired: true,
      badgeLabel: 'EXPIRED',
      headerStatusLabel: 'PUBLISHED (Expired past Sunday)',
      buttonLabel: 'Republish',
      description: `Expired on Sunday at 11:59 PM. Archived in bulletin directory.`,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      borderClass: 'border-slate-300',
      mondayFormatted: bounds.mondayFormatted,
      sundayFormatted: bounds.sundayFormatted,
      weekRangeLabel: bounds.weekRangeLabel,
    };
  }

  // 2. Queued: Future week (before Monday 00:00:00)
  if (refDate < bounds.monday) {
    return {
      stage: 'QUEUED',
      isDraft: false,
      isPublished: true,
      isLive: false,
      isQueued: true,
      isExpired: false,
      badgeLabel: 'QUEUED',
      headerStatusLabel: `QUEUED (Goes live ${bounds.mondayFormatted})`,
      buttonLabel: 'Update Queued Bulletin',
      description: `Published on queue. Automatically becomes live for members on ${bounds.mondayFormatted} at 12:00 AM after the current bulletin expires.`,
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      borderClass: 'border-indigo-300',
      mondayFormatted: bounds.mondayFormatted,
      sundayFormatted: bounds.sundayFormatted,
      weekRangeLabel: bounds.weekRangeLabel,
    };
  }

  // 3. Live: Currently within Monday 00:00:00 - Sunday 23:59:59
  return {
    stage: 'LIVE',
    isDraft: false,
    isPublished: true,
    isLive: true,
    isQueued: false,
    isExpired: false,
    badgeLabel: 'LIVE',
    headerStatusLabel: 'PUBLISHED (Live for members)',
    buttonLabel: 'Republish Live',
    description: 'Currently active and visible to members visiting smplans.online/visitbulletin.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderClass: 'border-emerald-300',
    mondayFormatted: bounds.mondayFormatted,
    sundayFormatted: bounds.sundayFormatted,
    weekRangeLabel: bounds.weekRangeLabel,
  };
}

/**
 * Finds the single bulletin that is currently active and live for members at refDate.
 */
export function findActiveLiveBulletin(bulletins: Bulletin[], refDate: Date = new Date()): Bulletin | null {
  if (!Array.isArray(bulletins) || bulletins.length === 0) return null;

  const published = bulletins.filter(
    (b) => (b.status || '').toUpperCase() === 'PUBLISHED'
  );

  const active = published.filter((b) => {
    const bounds = getBulletinWeekBounds(b.date);
    if (!bounds) return false;
    return refDate >= bounds.monday && refDate <= bounds.sunday;
  });

  if (active.length === 0) return null;

  // If multiple exist for the current week, pick the newest updated
  active.sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
  return active[0];
}

/**
 * Returns all future bulletins that are published and waiting on queue.
 * Sorted chronologically ascending (earliest upcoming first).
 */
export function findQueuedBulletins(bulletins: Bulletin[], refDate: Date = new Date()): Bulletin[] {
  if (!Array.isArray(bulletins) || bulletins.length === 0) return [];

  const published = bulletins.filter(
    (b) => (b.status || '').toUpperCase() === 'PUBLISHED'
  );

  const queued = published.filter((b) => {
    const bounds = getBulletinWeekBounds(b.date);
    if (!bounds) return false;
    return refDate < bounds.monday;
  });

  queued.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return queued;
}
