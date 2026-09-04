import type { OtherAgendaMeetingType, Member } from '../types';
import { formatHonorificName, findMemberInList, getMemberEmail, namesMatch } from './memberTitle';

export interface DefaultAttendeeSetting {
  id: string;
  calling: string;
  name: string;
  email?: string;
  phone?: string;
  callingMatchPattern?: string;
}

export interface MeetingTypeDefaultSetting {
  title: string;
  venue: string;
  startTime: string;
  endTime: string;
  presidingRole: string;
  presidingName: string;
  conductingRole: string;
  conductingName: string;
  defaultAttendees: DefaultAttendeeSetting[];
}

export type LeadershipAgendaSettings = Record<OtherAgendaMeetingType, MeetingTypeDefaultSetting>;

const STORAGE_KEY = 'smplan_leadership_agenda_settings_v1';

export const INITIAL_DEFAULT_LEADERSHIP_SETTINGS: LeadershipAgendaSettings = {
  BISHOPRIC_MEETING: {
    title: 'Bishopric Meeting',
    venue: "Bishop's Office",
    startTime: '07:00',
    endTime: '08:30',
    presidingRole: 'Bishop',
    presidingName: '',
    conductingRole: '1st Counselor',
    conductingName: '',
    defaultAttendees: [
      { id: '1', calling: 'Bishop', name: '', callingMatchPattern: 'bishop' },
      { id: '2', calling: '1st Counselor', name: '', callingMatchPattern: '1st counselor|first counselor' },
      { id: '3', calling: '2nd Counselor', name: '', callingMatchPattern: '2nd counselor|second counselor' },
      { id: '4', calling: 'Ward Clerk', name: '', callingMatchPattern: 'ward clerk|clerk' },
      { id: '5', calling: 'Executive Secretary', name: '', callingMatchPattern: 'executive secretary|secretary' },
      { id: '6', calling: 'Assistant Ward Clerk', name: '', callingMatchPattern: 'assistant.*clerk' },
    ],
  },
  WARD_COUNCIL: {
    title: 'Ward Council Meeting',
    venue: 'High Council / Council Room',
    startTime: '07:30',
    endTime: '08:45',
    presidingRole: 'Bishop',
    presidingName: '',
    conductingRole: '1st Counselor',
    conductingName: '',
    defaultAttendees: [
      { id: '1', calling: 'Bishop', name: '', callingMatchPattern: 'bishop' },
      { id: '2', calling: '1st Counselor', name: '', callingMatchPattern: '1st counselor|first counselor' },
      { id: '3', calling: '2nd Counselor', name: '', callingMatchPattern: '2nd counselor|second counselor' },
      { id: '4', calling: 'Ward Clerk', name: '', callingMatchPattern: 'ward clerk|clerk' },
      { id: '5', calling: 'Executive Secretary', name: '', callingMatchPattern: 'executive secretary' },
      { id: '6', calling: 'Elders Quorum President', name: '', callingMatchPattern: 'elders quorum president|eq president' },
      { id: '7', calling: 'Relief Society President', name: '', callingMatchPattern: 'relief society president|rs president' },
      { id: '8', calling: 'Young Women President', name: '', callingMatchPattern: 'young women president|yw president' },
      { id: '9', calling: 'Primary President', name: '', callingMatchPattern: 'primary president' },
      { id: '10', calling: 'Sunday School President', name: '', callingMatchPattern: 'sunday school president|ss president' },
      { id: '11', calling: 'Ward Mission Leader', name: '', callingMatchPattern: 'mission leader' },
      { id: '12', calling: 'Ward Temple & Family History Leader', name: '', callingMatchPattern: 'temple.*family history' },
    ],
  },
  WARD_YOUTH_COUNCIL: {
    title: 'Ward Youth Council Meeting',
    venue: 'Bishopric Office / Youth Room',
    startTime: '08:00',
    endTime: '09:00',
    presidingRole: 'Bishop',
    presidingName: '',
    conductingRole: '1st Counselor (Bishopric)',
    conductingName: '',
    defaultAttendees: [
      { id: '1', calling: 'Bishop', name: '', callingMatchPattern: 'bishop' },
      { id: '2', calling: '1st Counselor (Bishopric)', name: '', callingMatchPattern: '1st counselor' },
      { id: '3', calling: '2nd Counselor (Bishopric)', name: '', callingMatchPattern: '2nd counselor' },
      { id: '4', calling: 'Young Women President', name: '', callingMatchPattern: 'young women president|yw president' },
      { id: '5', calling: 'Priests Quorum 1st Assistant', name: '', callingMatchPattern: 'priests.*assistant' },
      { id: '6', calling: 'Teachers Quorum President', name: '', callingMatchPattern: 'teachers quorum president' },
      { id: '7', calling: 'Deacons Quorum President', name: '', callingMatchPattern: 'deacons quorum president' },
      { id: '8', calling: 'YW 16-18 Class President', name: '', callingMatchPattern: 'yw.*class president' },
      { id: '9', calling: 'YW 14-15 Class President', name: '', callingMatchPattern: 'yw.*class president' },
      { id: '10', calling: 'YW 12-13 Class President', name: '', callingMatchPattern: 'yw.*class president' },
    ],
  },
  PRESIDENCY_MEETING: {
    title: 'Presidency Meeting',
    venue: 'Classroom / Virtual',
    startTime: '08:00',
    endTime: '09:00',
    presidingRole: 'President',
    presidingName: '',
    conductingRole: '1st Counselor',
    conductingName: '',
    defaultAttendees: [
      { id: '1', calling: 'President', name: '', callingMatchPattern: 'president' },
      { id: '2', calling: '1st Counselor', name: '', callingMatchPattern: '1st counselor|first counselor' },
      { id: '3', calling: '2nd Counselor', name: '', callingMatchPattern: '2nd counselor|second counselor' },
      { id: '4', calling: 'Secretary', name: '', callingMatchPattern: 'secretary' },
    ],
  },
  OTHER_MEETING: {
    title: 'Ward Committee Meeting',
    venue: 'Ward Chapel',
    startTime: '08:00',
    endTime: '09:00',
    presidingRole: 'Bishop',
    presidingName: '',
    conductingRole: 'Conducting Officer',
    conductingName: '',
    defaultAttendees: [
      { id: '1', calling: 'Presiding Officer', name: '', callingMatchPattern: 'bishop|president' },
      { id: '2', calling: 'Conducting Officer', name: '', callingMatchPattern: 'counselor|director' },
      { id: '3', calling: 'Secretary / Recorder', name: '', callingMatchPattern: 'secretary|clerk' },
    ],
  },
};

/**
 * Auto-populates names and emails into attendees from members directory using calling patterns
 */
export function autoPopulateAttendeesFromMembers(
  attendees: DefaultAttendeeSetting[],
  members: Member[]
): DefaultAttendeeSetting[] {
  return attendees.map((att) => {
    // If name is already set by user, keep it and update email if missing
    if (att.name && att.name.trim()) {
      const found = findMemberInList(att.name, members);
      return {
        ...att,
        email: att.email || found?.email || getMemberEmail(att.name, members) || '',
        phone: att.phone || found?.phone || '',
      };
    }

    // Attempt auto-match by callingMatchPattern or calling title
    let match: Member | undefined;
    if (att.callingMatchPattern) {
      const reg = new RegExp(att.callingMatchPattern, 'i');
      match = members.find((m) => m.calling && reg.test(m.calling));
    }
    if (!match && att.calling) {
      const cleanCalling = att.calling.toLowerCase();
      match = members.find((m) => m.calling && m.calling.toLowerCase().includes(cleanCalling));
    }

    if (match) {
      return {
        ...att,
        name: formatHonorificName(match.name, match, match.gender),
        email: match.email || '',
        phone: match.phone || '',
      };
    }

    return att;
  });
}

/**
 * Loads leadership settings from local storage, merging with defaults
 */
export function loadLeadershipSettings(members: Member[] = []): LeadershipAgendaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with initial defaults in case new fields were added
      const merged: LeadershipAgendaSettings = {
        ...INITIAL_DEFAULT_LEADERSHIP_SETTINGS,
        ...parsed,
      };

      // Ensure every meeting type has complete attendees structure
      (Object.keys(INITIAL_DEFAULT_LEADERSHIP_SETTINGS) as OtherAgendaMeetingType[]).forEach((type) => {
        if (!merged[type]) {
          merged[type] = INITIAL_DEFAULT_LEADERSHIP_SETTINGS[type];
        } else if (!merged[type].defaultAttendees || merged[type].defaultAttendees.length === 0) {
          merged[type].defaultAttendees = INITIAL_DEFAULT_LEADERSHIP_SETTINGS[type].defaultAttendees;
        }
      });

      return merged;
    }
  } catch (e) {
    console.warn('Failed to parse leadership agenda settings from localStorage:', e);
  }

  // If no saved settings, build defaults and auto-populate from ward members directory
  const defaults = JSON.parse(JSON.stringify(INITIAL_DEFAULT_LEADERSHIP_SETTINGS)) as LeadershipAgendaSettings;
  if (members.length > 0) {
    (Object.keys(defaults) as OtherAgendaMeetingType[]).forEach((type) => {
      defaults[type].defaultAttendees = autoPopulateAttendeesFromMembers(
        defaults[type].defaultAttendees,
        members
      );
      // Auto-set presiding and conducting names if available in attendance
      const presidingAtt = defaults[type].defaultAttendees.find((a) =>
        a.calling.toLowerCase().includes(defaults[type].presidingRole.toLowerCase())
      );
      if (presidingAtt && presidingAtt.name) {
        defaults[type].presidingName = presidingAtt.name;
      }
      const conductingAtt = defaults[type].defaultAttendees.find((a) =>
        a.calling.toLowerCase().includes(defaults[type].conductingRole.toLowerCase())
      );
      if (conductingAtt && conductingAtt.name) {
        defaults[type].conductingName = conductingAtt.name;
      }
    });
  }

  return defaults;
}

/**
 * Saves leadership settings to local storage
 */
export function saveLeadershipSettings(settings: LeadershipAgendaSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save leadership agenda settings to localStorage:', e);
  }
}

/**
 * Resets settings back to original defaults populated with current ward members
 */
export function resetLeadershipSettings(members: Member[] = []): LeadershipAgendaSettings {
  const defaults = JSON.parse(JSON.stringify(INITIAL_DEFAULT_LEADERSHIP_SETTINGS)) as LeadershipAgendaSettings;
  if (members.length > 0) {
    (Object.keys(defaults) as OtherAgendaMeetingType[]).forEach((type) => {
      defaults[type].defaultAttendees = autoPopulateAttendeesFromMembers(
        defaults[type].defaultAttendees,
        members
      );
      const presidingAtt = defaults[type].defaultAttendees.find((a) =>
        a.calling.toLowerCase().includes(defaults[type].presidingRole.toLowerCase())
      );
      if (presidingAtt && presidingAtt.name) {
        defaults[type].presidingName = presidingAtt.name;
      }
      const conductingAtt = defaults[type].defaultAttendees.find((a) =>
        a.calling.toLowerCase().includes(defaults[type].conductingRole.toLowerCase())
      );
      if (conductingAtt && conductingAtt.name) {
        defaults[type].conductingName = conductingAtt.name;
      }
    });
  }
  saveLeadershipSettings(defaults);
  return defaults;
}
