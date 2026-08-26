/**
 * Member Analytics & Pastoral Intelligence Engine
 * 
 * Implements:
 * 1. Dynamic Age Calculation (getDynamicAge)
 * 2. Multi-Format Birthday Parser (normalizeBirthDate)
 * 3. 3-Phase Activity Segmenter (Done, Doing, Will Do)
 * 4. Smart Role Recommendation Engine (Overdue & Fit Confidence Algorithm for 8 roles)
 * 5. Member Assignment Readiness Score (0-100)
 * 6. Youth Milestone Tracker (Aaronic Priesthood: Passing, Preparing, Blessing)
 * 7. Pastoral Guardrails (Inactive 6M+, Newcomer Spotlight, Double-Dip Overload, Topic Staleness, Family Saturation, Org Participation)
 */

import {
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
  parseISO,
  differenceInYears,
  differenceInDays,
  differenceInMonths,
  format,
  isValid
} from 'date-fns';
import type {
  Member,
  Assignment,
  Agenda,
  Planner,
  RecommendedRoleType,
  RoleCandidate,
  YearAnalyticsData,
  MonthlyActivityStat,
  YouthMilestoneStats,
  PastoralAlertsData,
  InactiveMemberAlert,
  NewcomerAlert,
  DoubleDipAlert,
  TopicStalenessAlert,
  FamilySaturationStat,
  OrgParticipationStat
} from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Universal safe string conversion helper
 */
function s(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

// ─── 1. Dynamic Age & Birthday Normalization ─────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, may_full: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
};

/**
 * Safely extracts a string name from various raw structures (string, object with name/person/title, JSON).
 */
export function extractPersonName(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          if ('name' in parsed && parsed.name) return String(parsed.name).trim();
          if ('person' in parsed && parsed.person) return String(parsed.person).trim();
        }
      } catch {}
    }
    return trimmed;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (obj.name) return String(obj.name).trim();
    if (obj.person) return String(obj.person).trim();
    if (obj.title) return String(obj.title).trim();
  }
  return String(val).trim();
}

/**
 * Parses multi-format birth dates (DD-MMM-YYYY, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MMM, etc.)
 */
export function parseDateFlexible(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const str = dateStr.trim();
  if (!str) return null;

  // 1. Check standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const d = parseISO(str);
    if (isValid(d)) return d;
  }

  // 2. DD-MMM-YYYY (e.g. 14-Jul-1992, 14-July-1992, 14 Jul 1992)
  const ddmmyyyyRegex = /^(\d{1,2})[-/\s]+([A-Za-z]+)[-/\s]+(\d{4})$/;
  const match1 = str.match(ddmmyyyyRegex);
  if (match1) {
    const day = parseInt(match1[1], 10);
    const monthKey = match1[2].toLowerCase();
    const year = parseInt(match1[3], 10);
    if (MONTH_MAP[monthKey] !== undefined) {
      return new Date(year, MONTH_MAP[monthKey], day);
    }
  }

  // 3. DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const yr = parseInt(slashMatch[3], 10);
    if (p1 > 12) {
      return new Date(yr, p2 - 1, p1);
    }
    return new Date(yr, p1 - 1, p2);
  }

  // 4. DD-MMM (e.g. 14-Jul, 14 Jul) without year
  const noYearMatch = str.match(/^(\d{1,2})[-/\s]+([A-Za-z]+)$/);
  if (noYearMatch) {
    const day = parseInt(noYearMatch[1], 10);
    const monthKey = noYearMatch[2].toLowerCase();
    if (MONTH_MAP[monthKey] !== undefined) {
      return new Date(2000, MONTH_MAP[monthKey], day);
    }
  }

  // 5. Native Date fallback
  try {
    const fallback = new Date(str);
    if (isValid(fallback) && !isNaN(fallback.getTime())) {
      return fallback;
    }
  } catch {}

  return null;
}

/**
 * Calculates current dynamic age from birthDate or falls back to static stored age
 */
export function getDynamicAge(birthDateStr?: string | null, fallbackAge: number = 0): number {
  if (birthDateStr) {
    const bDate = parseDateFlexible(birthDateStr);
    if (bDate && isValid(bDate)) {
      const today = new Date();
      const birthYear = bDate.getFullYear();
      if (birthYear > 1900 && birthYear <= today.getFullYear()) {
        const calculated = differenceInYears(today, bDate);
        if (calculated >= 0 && calculated <= 120) {
          return calculated;
        }
      }
    }
  }
  return Number(fallbackAge) || 0;
}

/**
 * Normalized clean birthday label (e.g. '14-Jul')
 */
export function normalizeBirthDate(birthDateStr?: string | null): string {
  if (!birthDateStr) return '—';
  const d = parseDateFlexible(birthDateStr);
  if (!d) return String(birthDateStr);
  return format(d, 'dd-MMM');
}

/**
 * Standardize birth date for database persistence (YYYY-MM-DD if year present, else MM-DD)
 */
export function formatBirthDateForStorage(birthDateStr?: string | null): string {
  if (!birthDateStr) return '';
  const d = parseDateFlexible(birthDateStr);
  if (!d) return String(birthDateStr).trim();
  if (d.getFullYear() > 1900 && d.getFullYear() <= new Date().getFullYear()) {
    return format(d, 'yyyy-MM-dd');
  }
  return format(d, 'MM-dd');
}

// ─── 2. Member Assignment Readiness Score ────────────────────────────────────

export function calculateReadinessScore(
  member: Member,
  referenceDate: Date = new Date()
): number {
  const statusUpper = s(member.status).toUpperCase().replace('-', '_');
  if (statusUpper !== 'ACTIVE') return 0;

  let readiness = 40; // Base active points

  // Months since last assignment
  let monthsSinceLast = 12;
  if (member.last_assigned_date) {
    const lastDate = parseDateFlexible(member.last_assigned_date);
    if (lastDate) {
      monthsSinceLast = differenceInMonths(referenceDate, lastDate);
    }
  }

  if (monthsSinceLast >= 3) {
    readiness += 30;
  } else if (monthsSinceLast >= 1) {
    readiness += 15;
  }

  // Talks frequency
  const spokenCount = Number(member.spoken_count || 0);
  if (spokenCount < 2) {
    readiness += 20;
  } else if (spokenCount < 4) {
    readiness += 10;
  }

  // Established member (> 3 months created)
  let isNewcomer = false;
  if (statusUpper.includes('NEW')) {
    isNewcomer = true;
  } else if (member.created_date) {
    const createdDate = parseDateFlexible(member.created_date);
    if (createdDate && differenceInMonths(referenceDate, createdDate) < 3) {
      isNewcomer = true;
    }
  }

  if (!isNewcomer) {
    readiness += 10;
  }

  return Math.min(100, Math.max(0, readiness));
}

// ─── 3. Role Recommendation Overdue & Fit Confidence Engine ──────────────────

export const ROLE_DEFINITIONS: { key: RecommendedRoleType; label: string; orgHint?: string; defaultIntervalDays: number }[] = [
  { key: 'SPEAKER', label: 'Sacrament Speaker', defaultIntervalDays: 120 },
  { key: 'INVOCATION', label: 'Invocation Prayer', defaultIntervalDays: 60 },
  { key: 'BENEDICTION', label: 'Benediction Prayer', defaultIntervalDays: 60 },
  { key: 'MUSIC_DIRECTOR', label: 'Music Director', defaultIntervalDays: 30 },
  { key: 'ORGANIST', label: 'Organist / Accompanist', defaultIntervalDays: 30 },
  { key: 'SACRAMENT_PREPARING', label: 'Sacrament: Preparing (Teachers/Priests)', orgHint: 'Young Men', defaultIntervalDays: 21 },
  { key: 'SACRAMENT_BLESSING', label: 'Sacrament: Blessing (Priests)', orgHint: 'Young Men', defaultIntervalDays: 21 },
  { key: 'SACRAMENT_PASSING', label: 'Sacrament: Passing (Deacons/Aaronic)', orgHint: 'Young Men', defaultIntervalDays: 14 },
];

function isRoleMatch(assignmentRole: string, targetRole: RecommendedRoleType): boolean {
  const r = s(assignmentRole).toUpperCase();
  switch (targetRole) {
    case 'SPEAKER':
      return r.includes('SPEAKER') || r.includes('TALK');
    case 'INVOCATION':
      return r.includes('INVOCATION') || r.includes('OPENING_PRAYER') || r.includes('OPENING PRAYER');
    case 'BENEDICTION':
      return r.includes('BENEDICTION') || r.includes('CLOSING_PRAYER') || r.includes('CLOSING PRAYER');
    case 'MUSIC_DIRECTOR':
      return r.includes('MUSIC') || r.includes('DIRECTOR') || r.includes('CONDUCTOR');
    case 'ORGANIST':
      return r.includes('ORGANIST') || r.includes('PIANIST') || r.includes('ACCOMPANIST');
    case 'SACRAMENT_PREPARING':
      return r.includes('SACRAMENT_PREPAR') || r.includes('PREPAR');
    case 'SACRAMENT_BLESSING':
      return r.includes('SACRAMENT_BLESS') || r.includes('BLESS');
    case 'SACRAMENT_PASSING':
      return r.includes('SACRAMENT_PASS') || r.includes('PASS');
    default:
      return false;
  }
}

export function predictCandidatesForRole(
  roleKey: RecommendedRoleType,
  members: Member[],
  assignments: Assignment[],
  referenceDate: Date = new Date(),
  limit: number = 5
): RoleCandidate[] {
  const roleDef = ROLE_DEFINITIONS.find(d => d.key === roleKey) || {
    key: roleKey,
    label: roleKey,
    defaultIntervalDays: 60
  };

  const activeMembers = members.filter(m => {
    const status = s(m.status).toUpperCase();
    if (status !== 'ACTIVE' && !status.includes('NEW')) return false;

    // Optional org filter for Aaronic Priesthood duties
    if (roleDef.orgHint === 'Young Men') {
      const age = getDynamicAge(m.birth_date, m.age);
      const isMale = s(m.gender).toUpperCase().startsWith('M');
      const isYM = s(m.organisation).toLowerCase().includes('young men') || (age >= 11 && age <= 19 && isMale);
      if (!isYM && !isMale) return false;
    }
    return true;
  });

  const candidates: RoleCandidate[] = [];

  for (const m of activeMembers) {
    const memberNameClean = extractPersonName(m.name).toLowerCase();
    if (!memberNameClean) continue;

    // Gather all past assignments for this person & role
    const matchedAssignments = assignments
      .filter(a => extractPersonName(a.person).toLowerCase() === memberNameClean && isRoleMatch(a.role, roleKey))
      .sort((a, b) => s(a.date).localeCompare(s(b.date)));

    const pastCount = matchedAssignments.length;
    let lastAssignedDate = '';
    let daysSinceLast = 365;

    if (pastCount > 0) {
      lastAssignedDate = matchedAssignments[pastCount - 1].date;
      const lastD = parseDateFlexible(lastAssignedDate);
      if (lastD) {
        daysSinceLast = Math.max(0, differenceInDays(referenceDate, lastD));
      }
    } else if (m.last_assigned_date && roleKey === 'SPEAKER') {
      lastAssignedDate = m.last_assigned_date;
      const lastD = parseDateFlexible(lastAssignedDate);
      if (lastD) {
        daysSinceLast = Math.max(0, differenceInDays(referenceDate, lastD));
      }
    }

    let averageInterval = roleDef.defaultIntervalDays;
    if (pastCount >= 2) {
      let intervalSum = 0;
      for (let i = 1; i < matchedAssignments.length; i++) {
        const dPrev = parseDateFlexible(matchedAssignments[i - 1].date);
        const dCurr = parseDateFlexible(matchedAssignments[i].date);
        if (dPrev && dCurr) {
          intervalSum += Math.abs(differenceInDays(dCurr, dPrev));
        }
      }
      const intervalsCount = pastCount - 1;
      if (intervalsCount > 0 && intervalSum > 0) {
        averageInterval = Math.round(intervalSum / intervalsCount);
      }
    }

    const overdueDays = daysSinceLast - averageInterval;

    let confidence: 'High' | 'Medium' | 'Low' = 'Low';
    if (pastCount >= 3) {
      confidence = 'High';
    } else if (pastCount >= 1) {
      confidence = 'Medium';
    }

    const readinessScore = calculateReadinessScore(m, referenceDate);

    let reason = '';
    if (pastCount === 0) {
      reason = 'Never assigned to this role (Great opportunity)';
    } else if (overdueDays > 0) {
      reason = `${overdueDays} days past normal interval (${averageInterval}d)`;
    } else {
      reason = `Last served ${daysSinceLast} days ago`;
    }

    candidates.push({
      member: m,
      role: roleKey,
      pastCount,
      lastAssignedDate,
      daysSinceLast,
      averageInterval,
      overdueDays,
      confidence,
      readinessScore,
      reason
    });
  }

  candidates.sort((a, b) => {
    if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
    if (b.readinessScore !== a.readinessScore) return b.readinessScore - a.readinessScore;
    return a.pastCount - b.pastCount;
  });

  return candidates.slice(0, limit);
}

// ─── 4. Consolidated Year Activity Ledger (Done, Doing, Will Do) ─────────────

export function aggregateYearLedger(
  year: number,
  assignments: Assignment[],
  agendas: Agenda[],
  planners: Planner[],
  referenceDate: Date = new Date()
): {
  doneAssignments: Assignment[];
  doingAssignments: Assignment[];
  willDoAssignments: Assignment[];
  allYearAssignments: Assignment[];
} {
  const currentWeekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(referenceDate, { weekStartsOn: 0 });

  const consolidatedMap = new Map<string, Assignment>();

  // 1. Process explicit ASSIGNMENTS
  assignments.forEach(asn => {
    if (!asn.date) return;
    const d = parseDateFlexible(asn.date);
    if (d && d.getFullYear() === year) {
      const personName = extractPersonName(asn.person);
      const key = `${asn.date}_${personName.toLowerCase()}_${asn.role}`;
      consolidatedMap.set(key, asn);
    }
  });

  // 2. Cross-reference AGENDAS for missing items
  agendas.forEach(ag => {
    if (!ag.date) return;
    const d = parseDateFlexible(ag.date);
    if (!d || d.getFullYear() !== year) return;

    // Speakers
    if (ag.speakers) {
      try {
        const spList = typeof ag.speakers === 'string' ? JSON.parse(ag.speakers) : ag.speakers;
        if (Array.isArray(spList)) {
          spList.forEach((sp, idx) => {
            const spName = extractPersonName(sp && typeof sp === 'object' ? sp.name : sp);
            if (spName) {
              const role = idx === 0 ? 'SPEAKER_1' : idx === 1 ? 'SPEAKER_2' : 'SPEAKER';
              const key = `${ag.date}_${spName.toLowerCase()}_${role}`;
              if (!consolidatedMap.has(key)) {
                consolidatedMap.set(key, {
                  assignment_id: `ag_sp_${ag.agenda_id}_${idx}`,
                  planner_id: ag.planner_id || '',
                  week_id: ag.week_id || '',
                  date: ag.date,
                  person: spName,
                  role: role,
                  topic: (sp && typeof sp === 'object' ? sp.topic : '') || '',
                  minutes: Number(sp && typeof sp === 'object' ? sp.minutes : 10) || 10,
                  venue: ag.ward_branch || 'Sacrament Hall',
                  meeting_time: ag.start_time || '10:00 AM',
                  status: 'PENDING',
                  created_date: ag.created_date || ''
                });
              }
            }
          });
        }
      } catch {}
    }

    // Opening Prayer
    const openPrayerName = extractPersonName(ag.opening_prayer);
    if (openPrayerName) {
      const key = `${ag.date}_${openPrayerName.toLowerCase()}_INVOCATION`;
      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, {
          assignment_id: `ag_op_${ag.agenda_id}`,
          planner_id: ag.planner_id || '',
          week_id: ag.week_id || '',
          date: ag.date,
          person: openPrayerName,
          role: 'INVOCATION',
          topic: 'Opening Prayer',
          minutes: 3,
          venue: ag.ward_branch || '',
          meeting_time: ag.start_time || '',
          status: 'PENDING',
          created_date: ag.created_date || ''
        });
      }
    }

    // Closing Prayer
    const closePrayerName = extractPersonName(ag.closing_prayer);
    if (closePrayerName) {
      const key = `${ag.date}_${closePrayerName.toLowerCase()}_BENEDICTION`;
      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, {
          assignment_id: `ag_cp_${ag.agenda_id}`,
          planner_id: ag.planner_id || '',
          week_id: ag.week_id || '',
          date: ag.date,
          person: closePrayerName,
          role: 'BENEDICTION',
          topic: 'Closing Prayer',
          minutes: 3,
          venue: ag.ward_branch || '',
          meeting_time: ag.start_time || '',
          status: 'PENDING',
          created_date: ag.created_date || ''
        });
      }
    }
  });

  const allYearAssignments = Array.from(consolidatedMap.values());
  const doneAssignments: Assignment[] = [];
  const doingAssignments: Assignment[] = [];
  const willDoAssignments: Assignment[] = [];

  allYearAssignments.forEach(asn => {
    const d = parseDateFlexible(asn.date);
    if (!d) return;

    if (isBefore(d, currentWeekStart)) {
      doneAssignments.push(asn);
    } else if (isAfter(d, currentWeekEnd)) {
      willDoAssignments.push(asn);
    } else {
      doingAssignments.push(asn);
    }
  });

  return {
    doneAssignments,
    doingAssignments,
    willDoAssignments,
    allYearAssignments
  };
}

// ─── 5. Youth Milestone Tracker (Aaronic Priesthood Ages 12-18) ───────────────

export function calculateYouthMilestones(
  members: Member[],
  assignments: Assignment[]
): YouthMilestoneStats {
  const ymMembers = members.filter(m => {
    const isMale = s(m.gender).toUpperCase().startsWith('M');
    const age = getDynamicAge(m.birth_date, m.age);
    const isYM = s(m.organisation).toLowerCase().includes('young men');
    return isMale && (isYM || (age >= 11 && age <= 19));
  });

  const getDutyStats = (targetRole: RecommendedRoleType) => {
    const candidatesMap = new Map<string, { name: string; age: number; count: number }>();

    ymMembers.forEach(m => {
      const cleanName = extractPersonName(m.name);
      if (cleanName) {
        candidatesMap.set(cleanName.toLowerCase(), {
          name: cleanName,
          age: getDynamicAge(m.birth_date, m.age),
          count: 0
        });
      }
    });

    let totalDuties = 0;
    assignments.forEach(a => {
      if (isRoleMatch(a.role, targetRole)) {
        totalDuties++;
        const pKey = extractPersonName(a.person).toLowerCase();
        if (candidatesMap.has(pKey)) {
          const item = candidatesMap.get(pKey)!;
          item.count += 1;
        }
      }
    });

    const candidateList = Array.from(candidatesMap.values()).sort((a, b) => b.count - a.count);
    const activeCount = candidateList.filter(c => c.count > 0).length;
    const progressPct = ymMembers.length > 0 ? Math.round((activeCount / ymMembers.length) * 100) : 0;

    return {
      activeBoys: activeCount,
      totalDuties,
      progressPct,
      candidates: candidateList
    };
  };

  return {
    passing: getDutyStats('SACRAMENT_PASSING'),
    preparing: getDutyStats('SACRAMENT_PREPARING'),
    blessing: getDutyStats('SACRAMENT_BLESSING')
  };
}

// ─── 6. Pastoral Guardrails & Inactivity Alerts ──────────────────────────────

export function calculatePastoralAlerts(
  members: Member[],
  assignments: Assignment[],
  referenceDate: Date = new Date()
): PastoralAlertsData {
  const inactiveMembers: InactiveMemberAlert[] = [];
  const newcomers: NewcomerAlert[] = [];
  const monthMap = new Map<string, Map<string, { role: string; date: string; org?: string; planner_id?: string }[]>>();
  const surnameMap = new Map<string, { count: number; members: Set<string> }>();
  const topicMap = new Map<string, { count: number; dates: string[]; lastUsed: string }>();

  // 1. Inactive & Newcomers
  members.forEach(m => {
    const statusUpper = s(m.status).toUpperCase();
    if (statusUpper === 'ACTIVE' || statusUpper.includes('NEW')) {
      let monthsSince = 12;
      let neverAssigned = true;

      if (m.last_assigned_date) {
        neverAssigned = false;
        const ld = parseDateFlexible(m.last_assigned_date);
        if (ld) monthsSince = differenceInMonths(referenceDate, ld);
      } else if (Number(m.total_assignments || 0) > 0 || Number(m.spoken_count || 0) > 0) {
        neverAssigned = false;
        monthsSince = 8;
      }

      if (neverAssigned || monthsSince >= 6) {
        inactiveMembers.push({
          member: m,
          monthsSinceLast: monthsSince,
          neverAssigned
        });
      }

      let isNew = statusUpper.includes('NEW');
      let monthsJoined = 1;
      if (m.created_date) {
        const cd = parseDateFlexible(m.created_date);
        if (cd) {
          monthsJoined = Math.max(1, differenceInMonths(referenceDate, cd));
          if (monthsJoined <= 3) isNew = true;
        }
      }

      if (isNew && Number(m.total_assignments || 0) === 0 && Number(m.spoken_count || 0) === 0) {
        newcomers.push({
          member: m,
          monthsJoined,
          rolesCount: 0
        });
      }
    }
  });

  // 2. Double-Dip, Surname Saturation, Topic Staleness
  let totalWardRoles = 0;
  const recent60DaysCutoff = new Date(referenceDate.getTime() - 60 * 24 * 60 * 60 * 1000);

  assignments.forEach(a => {
    const personClean = extractPersonName(a.person);
    if (!personClean || !a.date) return;
    totalWardRoles++;

    const d = parseDateFlexible(a.date);
    const monthKey = d ? format(d, 'yyyy-MM') : 'unknown';
    const monthLabel = d ? format(d, 'MMMM yyyy') : 'Current Month';

    // Monthly double-dip grouping
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, new Map());
    }
    const pMap = monthMap.get(monthKey)!;
    if (!pMap.has(personClean.toLowerCase())) {
      pMap.set(personClean.toLowerCase(), []);
    }
    pMap.get(personClean.toLowerCase())!.push({
      role: s(a.role) || 'Duty',
      date: a.date,
      org: a.venue || '',
      planner_id: a.planner_id
    });

    // Surname saturation
    const parts = personClean.replace(/^(Brother|Sister|Bishop|Elder|President|Bro\.|Sis\.)\s+/i, '').split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Unknown';
    if (surname.length > 2) {
      const sKey = surname.toUpperCase();
      if (!surnameMap.has(sKey)) {
        surnameMap.set(sKey, { count: 0, members: new Set() });
      }
      const sEntry = surnameMap.get(sKey)!;
      sEntry.count++;
      sEntry.members.add(personClean);
    }

    // Topic staleness for speakers
    if (a.topic && s(a.topic).trim().length > 3 && isRoleMatch(a.role, 'SPEAKER')) {
      const cleanTopic = s(a.topic).trim().toLowerCase();
      if (d && isAfter(d, recent60DaysCutoff)) {
        if (!topicMap.has(cleanTopic)) {
          topicMap.set(cleanTopic, { count: 0, dates: [], lastUsed: a.date });
        }
        const tEntry = topicMap.get(cleanTopic)!;
        tEntry.count++;
        tEntry.dates.push(a.date);
        if (a.date > tEntry.lastUsed) tEntry.lastUsed = a.date;
      }
    }
  });

  // Extract Double Dips
  const doubleDips: DoubleDipAlert[] = [];
  monthMap.forEach((pMap, monthKey) => {
    pMap.forEach((rolesList, pLower) => {
      if (rolesList.length >= 3) {
        const mem = members.find(m => extractPersonName(m.name).toLowerCase() === pLower) || {
          name: rolesList[0].role,
          gender: '',
          age: 0,
          phone: '',
          email: '',
          organisation: '',
          status: 'ACTIVE',
          notes: '',
          total_assignments: 0,
          spoken_count: 0,
          prayers_count: 0,
          last_assigned_date: '',
          readiness_score: 0
        };
        const monthLabel = rolesList[0].date ? format(parseDateFlexible(rolesList[0].date) || new Date(), 'MMMM yyyy') : monthKey;
        doubleDips.push({
          member: mem,
          monthLabel,
          monthKey,
          roles: rolesList,
          distinctOrgsCount: new Set(rolesList.map(r => r.org)).size,
          totalRolesCount: rolesList.length
        });
      }
    });
  });

  // Extract Topic Staleness (repeated 3+ times in 60 days)
  const topicStaleness: TopicStalenessAlert[] = [];
  topicMap.forEach((val, tKey) => {
    if (val.count >= 3) {
      const displayTopic = tKey.replace(/\b\w/g, l => l.toUpperCase());
      topicStaleness.push({
        topic: displayTopic,
        occurrences: val.count,
        lastUsedDate: val.lastUsed,
        dates: val.dates
      });
    }
  });

  // Extract Surname Saturation (sorted by count)
  const familySaturation: FamilySaturationStat[] = [];
  surnameMap.forEach((val, sKey) => {
    if (val.count >= 4 && totalWardRoles > 0) {
      const pct = Math.round((val.count / totalWardRoles) * 100);
      familySaturation.push({
        surname: sKey.charAt(0).toUpperCase() + sKey.slice(1).toLowerCase(),
        count: val.count,
        percentage: pct,
        members: Array.from(val.members)
      });
    }
  });
  familySaturation.sort((a, b) => b.count - a.count);

  // Organisation Participation Balance
  const orgMap = new Map<string, { total: number; active: number; idle: number }>();
  const STANDARD_ORGS = ['Elders Quorum', 'Relief Society', 'Young Men', 'Young Women', 'Primary', 'Sunday School', 'Bishopric'];

  STANDARD_ORGS.forEach(o => orgMap.set(o, { total: 0, active: 0, idle: 0 }));

  members.forEach(m => {
    const org = s(m.organisation) || 'Other';
    if (!orgMap.has(org)) orgMap.set(org, { total: 0, active: 0, idle: 0 });
    const entry = orgMap.get(org)!;
    entry.total++;
    const hasAssignments = Number(m.total_assignments || 0) > 0 || Number(m.spoken_count || 0) > 0 || Number(m.prayers_count || 0) > 0;
    if (hasAssignments) {
      entry.active++;
    } else {
      entry.idle++;
    }
  });

  const orgParticipation: OrgParticipationStat[] = [];
  orgMap.forEach((v, orgName) => {
    if (v.total > 0) {
      orgParticipation.push({
        organisation: orgName,
        totalMembers: v.total,
        activeMembers: v.active,
        idleMembers: v.idle,
        participationRate: Math.round((v.active / v.total) * 100)
      });
    }
  });

  return {
    inactiveMembers: inactiveMembers.slice(0, 15),
    newcomers: newcomers.slice(0, 10),
    doubleDips: doubleDips.slice(0, 10),
    topicStaleness: topicStaleness.slice(0, 10),
    familySaturation: familySaturation.slice(0, 8),
    orgParticipation
  };
}

// ─── 7. Master Analytics Compiler ────────────────────────────────────────────

export function compileYearAnalytics(
  year: number,
  members: Member[],
  assignments: Assignment[],
  agendas: Agenda[],
  planners: Planner[],
  referenceDate: Date = new Date()
): YearAnalyticsData {
  const safeMembers = Array.isArray(members) ? members : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeAgendas = Array.isArray(agendas) ? agendas : [];
  const safePlanners = Array.isArray(planners) ? planners : [];

  const { doneAssignments, doingAssignments, willDoAssignments, allYearAssignments } =
    aggregateYearLedger(year, safeAssignments, safeAgendas, safePlanners, referenceDate);

  const totalRoles = allYearAssignments.length;
  const doneCount = doneAssignments.length;
  const doingCount = doingAssignments.length;
  const willDoCount = willDoAssignments.length;
  const progressPct = totalRoles > 0 ? Math.round((doneCount / totalRoles) * 100) : 0;

  // Monthly timeline breakdown
  const monthlyStats: MonthlyActivityStat[] = MONTH_NAMES.map((name, idx) => {
    let done = 0;
    let doing = 0;
    let willDo = 0;

    allYearAssignments.forEach(a => {
      const d = parseDateFlexible(a.date);
      if (d && d.getMonth() === idx) {
        if (doneAssignments.includes(a)) done++;
        else if (doingAssignments.includes(a)) doing++;
        else willDo++;
      }
    });

    return {
      monthIndex: idx,
      monthName: name,
      done,
      doing,
      willDo,
      total: done + doing + willDo
    };
  });

  // Predictions for all 8 roles
  const rolePredictions = {} as Record<RecommendedRoleType, RoleCandidate[]>;
  ROLE_DEFINITIONS.forEach(def => {
    rolePredictions[def.key] = predictCandidatesForRole(def.key, safeMembers, safeAssignments, referenceDate, 5);
  });

  // Youth Aaronic Progress
  const youthMilestones = calculateYouthMilestones(safeMembers, allYearAssignments);

  // Pastoral Alerts
  const pastoralAlerts = calculatePastoralAlerts(safeMembers, allYearAssignments, referenceDate);

  return {
    year,
    totalRoles,
    doneCount,
    doingCount,
    willDoCount,
    progressPct,
    monthlyStats,
    rolePredictions,
    youthMilestones,
    pastoralAlerts
  };
}
