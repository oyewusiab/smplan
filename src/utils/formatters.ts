import { format, parseISO, isValid } from 'date-fns';

/**
 * Format any time string into 12-hour "hh:mm a" format (e.g. "10:00 AM", "01:30 PM").
 */
export function formatTime12h(timeStr?: string): string {
  if (!timeStr || !timeStr.trim()) return '10:00 AM';
  const trimmed = timeStr.trim();

  // If already contains AM or PM
  if (/am|pm/i.test(trimmed)) {
    // Normalize format
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = match[3].toUpperCase();
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }
    return trimmed;
  }

  // If format is "HH:MM" or "HH:MM:SS" (24-hour e.g. "10:00", "13:30", "09:00", "0:00")
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${strHours}:${minutes} ${ampm}`;
  }

  return trimmed;
}

/**
 * Format any date string into standard "dd-MMM-yyyy" format (e.g. "16-Aug-2026").
 */
export function formatDateDisplay(dateStr?: string, fallback = '—'): string {
  if (!dateStr || !dateStr.trim()) return fallback;
  try {
    const parsed = parseISO(dateStr);
    if (isValid(parsed)) return format(parsed, 'dd-MMM-yyyy');
    const d = new Date(dateStr);
    if (isValid(d)) return format(d, 'dd-MMM-yyyy');
  } catch { /* fallback */ }
  return dateStr;
}

/**
 * Check if a date string is in the past relative to today's date.
 */
export function isPastDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let normalized = dateStr;
    const parsed = parseISO(dateStr);
    if (isValid(parsed)) {
      normalized = format(parsed, 'yyyy-MM-dd');
    } else {
      const d = new Date(dateStr);
      if (isValid(d)) {
        normalized = format(d, 'yyyy-MM-dd');
      }
    }
    return normalized < todayStr;
  } catch {
    return false;
  }
}
