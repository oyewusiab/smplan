/**
 * Calendar Activity Harvester & Next 5 Activities Engine
 * File: bulletinActivityHarvester.ts
 */

import { format, parseISO, startOfWeek, addDays, isAfter } from 'date-fns';
import type { Activity, WeeklyActivityItem, NextActivityItem } from '../types';

export const DEFAULT_WEEKLY_ACTIVITIES: WeeklyActivityItem[] = [
  { id: 'act_1', day: 'Monday', activity: 'YSA Family Home Evening', time: '4:30 PM', scope: 'Ward', reoccurring: true },
  { id: 'act_2', day: 'Tuesday', activity: 'Institute / Seminary', time: '6:00 PM', scope: 'Ward', reoccurring: false },
  { id: 'act_3', day: 'Wednesday', activity: 'Self-Reliance Class - Personal Finances', time: '3:30 PM', scope: 'Ward', reoccurring: true },
  { id: 'act_4', day: 'Wednesday', activity: 'Self-Reliance Class - Starting My Business', time: '4:00 PM', scope: 'Ward', reoccurring: true },
  { id: 'act_5', day: 'Wednesday', activity: 'Gospel Fundamental Class', time: '5:00 PM', scope: 'Ward', reoccurring: true },
  { id: 'act_6', day: 'Thursday', activity: 'Choir Practice', time: '7:00 PM', scope: 'Ward', reoccurring: false },
  { id: 'act_7', day: 'Friday', activity: 'Youth Activity', time: '6:00 PM', scope: 'Ward', reoccurring: false },
  { id: 'act_8', day: 'Saturday', activity: 'Self-Reliance Class - Find a Better Job', time: '3:30 PM', scope: 'Ward', reoccurring: true },
  { id: 'act_9', day: 'Sunday', activity: 'Sacrament Meeting', time: '9:00 AM', scope: 'Ward', reoccurring: true },
];

/**
 * Normalizes an activity object from the backend sheet (Column A: activity_id, B: Date, C: activity, D: organisation)
 */
export function normalizeActivity(raw: any): Activity {
  if (!raw) {
    return {
      activity_id: '',
      date: '',
      activity: '',
      organisation: 'Ward',
      time: '',
    };
  }

  let actId = raw.activity_id || raw.id || '';
  let dateVal = raw.date || raw.Date || raw.DATE || '';
  let actTitle = raw.activity || raw.Activity || raw.title || raw.name || '';
  let org = raw.organisation || raw.organization || raw.Organisation || raw.Organization || 'Ward';
  let timeVal = raw.time || raw.Time || 'TBD';

  // Handle column misalignment if date contains ID string (e.g. "act_msp...")
  if (typeof dateVal === 'string' && dateVal.startsWith('act_')) {
    actId = dateVal;
    dateVal = raw.activity || raw.Date || '';
    actTitle = raw.organisation || raw.activity || 'Church Activity';
    org = raw.status || raw.organisation || 'Ward';
  }

  // Clean date string
  if (dateVal && typeof dateVal === 'string') {
    dateVal = dateVal.trim();
    if (dateVal.includes('T')) {
      dateVal = dateVal.split('T')[0];
    }
  }

  return {
    activity_id: actId,
    date: dateVal,
    activity: actTitle,
    organisation: org,
    time: timeVal,
    status: raw.status || 'PLANNED',
    those_involved: raw.those_involved || '',
    email_sent: !!raw.email_sent,
    report_submitted: !!raw.report_submitted,
    last_reminder: raw.last_reminder || '',
  };
}

/**
 * Harvests weekly activities for Monday-to-Sunday window ending on Sunday
 */
export function harvestWeeklyActivities(
  rawActivities: Activity[],
  sundayDateStr: string
): { items: WeeklyActivityItem[]; formattedText: string } {
  const activities = (rawActivities || []).map(normalizeActivity);

  if (!sundayDateStr) {
    return {
      items: DEFAULT_WEEKLY_ACTIVITIES,
      formattedText: formatActivitiesToText(DEFAULT_WEEKLY_ACTIVITIES),
    };
  }

  let sunday: Date;
  try {
    sunday = parseISO(sundayDateStr);
  } catch {
    sunday = new Date(sundayDateStr);
  }

  if (isNaN(sunday.getTime())) {
    return {
      items: DEFAULT_WEEKLY_ACTIVITIES,
      formattedText: formatActivitiesToText(DEFAULT_WEEKLY_ACTIVITIES),
    };
  }

  // Week starts on Monday (1) and ends on Sunday (0)
  const monday = startOfWeek(sunday, { weekStartsOn: 1 });
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekDates: { dateStr: string; dayName: string; dayIndex: number }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    weekDates.push({
      dateStr: format(d, 'yyyy-MM-dd'),
      dayName: dayNames[i],
      dayIndex: i,
    });
  }

  const harvestedItems: WeeklyActivityItem[] = [];

  // Match activities in calendar for this week
  activities.forEach((act, idx) => {
    if (!act || !act.date) return;
    const matchWeek = weekDates.find((w) => w.dateStr === act.date);
    if (matchWeek) {
      const scope = (act.organisation || '').toLowerCase().includes('stake') ? 'Stake' : 'Ward';
      harvestedItems.push({
        id: act.activity_id || `act_${idx}`,
        day: matchWeek.dayName,
        activity: act.activity || 'Church Activity',
        time: act.time || '6:00 PM',
        scope: scope,
        reoccurring: false,
      });
    }
  });

  let finalItems: WeeklyActivityItem[] = [];

  if (harvestedItems.length > 0) {
    // Sort harvested items chronologically (Mon -> Sun)
    harvestedItems.sort((a, b) => {
      const idxA = dayNames.indexOf(a.day);
      const idxB = dayNames.indexOf(b.day);
      return idxA - idxB;
    });

    // Merge with key standing recurring meetings if missing
    const hasSunday = harvestedItems.some((h) => h.day === 'Sunday');
    finalItems = [...harvestedItems];
    if (!hasSunday) {
      finalItems.push({
        id: 'act_sun',
        day: 'Sunday',
        activity: 'Sacrament Meeting',
        time: '9:00 AM',
        scope: 'Ward',
        reoccurring: true,
      });
    }
  } else {
    finalItems = [...DEFAULT_WEEKLY_ACTIVITIES];
  }

  const formattedText = formatActivitiesToText(finalItems);
  return { items: finalItems, formattedText };
}

/**
 * Converts structured activities array into text summary
 */
export function formatActivitiesToText(items: WeeklyActivityItem[]): string {
  return items
    .map((item) => {
      const timeStr = item.time ? ` @ ${item.time}` : '';
      const scopeStr = item.scope ? ` [${item.scope}]` : '';
      return `${item.day}: ${item.activity}${timeStr}${scopeStr}`;
    })
    .join('\n');
}

/**
 * Harvester for Next 5 Activities (Auto-generated from calendar)
 */
export function getNext5Activities(
  rawActivities: Activity[],
  sundayDateStr: string
): NextActivityItem[] {
  const activities = (rawActivities || []).map(normalizeActivity).filter((a) => a.date && !a.date.startsWith('act_'));

  if (!activities || activities.length === 0) {
    return [
      { id: 'nxt_1', date: 'Next Sat', dayName: 'Sat', activity: 'Stake Youth Conference', time: '10:00 AM', scope: 'Stake' },
      { id: 'nxt_2', date: 'Next Sun', dayName: 'Sun', activity: 'Ward Conference & Combined Priesthood', time: '9:00 AM', scope: 'Ward' },
      { id: 'nxt_3', date: 'Upcoming', dayName: 'Sat', activity: 'Temple Excursion & Baptisms', time: '8:00 AM', scope: 'Ward' },
      { id: 'nxt_4', date: 'Upcoming', dayName: 'Fri', activity: 'Relief Society Ministering Social', time: '6:30 PM', scope: 'Ward' },
      { id: 'nxt_5', date: 'Upcoming', dayName: 'Sat', activity: 'Elders Quorum Sports Activity', time: '7:00 AM', scope: 'Ward' },
    ];
  }

  let refDate: Date;
  try {
    refDate = sundayDateStr ? parseISO(sundayDateStr) : new Date();
  } catch {
    refDate = new Date();
  }

  // Filter activities occurring after this Sunday date (or all future if any)
  let upcoming = activities.filter((act) => {
    if (!act.date) return false;
    try {
      const actDate = parseISO(act.date);
      return isAfter(actDate, refDate);
    } catch {
      return false;
    }
  });

  if (upcoming.length === 0) {
    upcoming = activities.filter((act) => act.date !== sundayDateStr);
  }

  // Sort ascending by date
  upcoming.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const top5 = upcoming.slice(0, 5).map((act, idx) => {
    let dayName = '';
    let formattedDate = act.date;
    try {
      const d = parseISO(act.date);
      dayName = format(d, 'EEE');
      formattedDate = format(d, 'MMM d');
    } catch {}

    const scope = (act.organisation || '').toLowerCase().includes('stake') ? 'Stake' : 'Ward';

    return {
      id: act.activity_id || `next_${idx}`,
      date: formattedDate || act.date,
      dayName: dayName || 'TBD',
      activity: act.activity || 'Church Activity',
      time: act.time || 'TBD',
      organisation: act.organisation,
      scope,
    };
  });

  if (top5.length === 0) {
    return [
      { id: 'nxt_1', date: 'Next Sat', dayName: 'Sat', activity: 'Stake Leadership Meeting', time: '4:00 PM', scope: 'Stake' },
      { id: 'nxt_2', date: 'Next Sun', dayName: 'Sun', activity: 'Fast & Testimony Sunday', time: '9:00 AM', scope: 'Ward' },
      { id: 'nxt_3', date: 'Next Sat', dayName: 'Sat', activity: 'Temple Trip & Family History', time: '8:00 AM', scope: 'Ward' },
      { id: 'nxt_4', date: 'Next Fri', dayName: 'Fri', activity: 'Primary Activity Day', time: '5:00 PM', scope: 'Ward' },
      { id: 'nxt_5', date: 'Next Sat', dayName: 'Sat', activity: 'Meetinghouse Deep Cleaning', time: '8:00 AM', scope: 'Ward' },
    ];
  }

  return top5;
}
