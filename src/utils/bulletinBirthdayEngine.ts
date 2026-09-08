/**
 * Smart Birthday Engine for Weekly Ward Bulletin
 * Parses member records, detects birthdays falling within the Monday-to-Sunday window,
 * and formats celebratory notices.
 */

import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import type { Member, BulletinCelebrant } from '../types';

export function parseMemberBirthMonthDay(str?: string | null): { month: number; day: number } | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  // Format: YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY or "12 Aug" or "Aug 12"
  const parts = s.split(/[\/\-\.\s]+/);
  if (parts.length >= 2) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { month: m, day: d };
      }
    }

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const p0Month = monthNames.findIndex((m) => parts[0].toLowerCase().startsWith(m));
    const p1Month = monthNames.findIndex((m) => parts[1].toLowerCase().startsWith(m));
    
    if (p0Month !== -1) {
      const d = Number(parts[1]);
      if (!isNaN(d) && d >= 1 && d <= 31) return { month: p0Month + 1, day: d };
    }
    if (p1Month !== -1) {
      const d = Number(parts[0]);
      if (!isNaN(d) && d >= 1 && d <= 31) return { month: p1Month + 1, day: d };
    }

    const n1 = Number(parts[0]);
    const n2 = Number(parts[1]);
    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > 12 && n2 <= 12) return { month: n2, day: n1 };
      if (n2 > 12 && n1 <= 12) return { month: n1, day: n2 };
      return { month: n2, day: n1 };
    }
  }
  return null;
}

export function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

export function formatBirthdayLabel(month: number, day: number): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const mName = monthNames[month - 1] || '';
  return `${mName} ${day}`;
}

export function normalizeBirthdaysString(birthdaysStr?: string, targetDateStr?: string): string {
  if (!birthdaysStr) return '';
  let str = String(birthdaysStr).trim();
  if (!str) return '';

  let month = 9;
  if (targetDateStr) {
    try {
      const parts = targetDateStr.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) month = m;
      }
    } catch {}
  }

  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const mName = monthNames[month - 1] || 'Sept.';

  // Convert (8) or (11) to (Sept. 8) or (Sept. 11)
  str = str.replace(/\((\d{1,2})\)/g, `(${mName} $1)`);

  return str;
}

export function getBirthdaysForWeek(
  members: Member[],
  sundayDateStr: string
): { celebrants: BulletinCelebrant[]; formattedString: string } {
  if (!sundayDateStr) return { celebrants: [], formattedString: '' };

  let sunday: Date;
  try {
    sunday = parseISO(sundayDateStr);
  } catch {
    sunday = new Date(sundayDateStr);
  }

  if (isNaN(sunday.getTime())) return { celebrants: [], formattedString: '' };

  // Monday = startOfWeek(sunday, { weekStartsOn: 1 })
  const monday = startOfWeek(sunday, { weekStartsOn: 1 });
  const weekDays: { month: number; day: number; dateStr: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    weekDays.push({
      month: d.getMonth() + 1,
      day: d.getDate(),
      dateStr: format(d, 'yyyy-MM-dd'),
    });
  }

  const celebrants: BulletinCelebrant[] = [];

  members.forEach((m) => {
    if (!m || !m.name) return;

    let bDateStr = (m as any).birthdate || (m as any).dob || '';
    if (!bDateStr && m.notes) {
      const match = m.notes.match(/(?:dob|birth(?:day|date)?|born)[:\s]*([0-9A-Za-z\/\-\.\s]+)/i);
      if (match) bDateStr = match[1].trim();
    }

    if (bDateStr) {
      const parsed = parseMemberBirthMonthDay(bDateStr);
      if (parsed) {
        const matchDay = weekDays.find((w) => w.month === parsed.month && w.day === parsed.day);
        if (matchDay) {
          const rawName = m.name.trim();
          const dayLabel = formatBirthdayLabel(parsed.month, parsed.day);
          celebrants.push({
            name: rawName,
            day: parsed.day,
            dateStr: matchDay.dateStr,
            phone: m.phone || '',
            formatted: `🎂 ${rawName} (${dayLabel})`,
          });
        }
      }
    }
  });

  celebrants.sort((a, b) => a.day - b.day);
  const formattedString = celebrants.map((c) => c.formatted).join('   ');

  return { celebrants, formattedString };
}

/**
 * Generate Direct WhatsApp Birthday Greeting link
 */
export function buildWhatsAppBirthdayGreetingUrl(phone: string, celebrantName: string, unitName?: string, customMessage?: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const greeting = customMessage
    ? `${customMessage} Happy Birthday ${celebrantName}! 🎂🎉`
    : `Happy Birthday ${celebrantName}! 🎂🎉 The Bishopric and members of ${unitName || 'our Ward'} wish you the Lord's richest blessings, joy, and peace in this new year of your life!`;
  
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(greeting)}`;
}
