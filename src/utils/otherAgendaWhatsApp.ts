import type { OtherAgenda, OtherAgendaAssignment, OtherAgendaTopic } from '../types';
import { formatHonorificName } from './memberTitle';
import { formatTime12h } from './formatters';

export function formatOtherAgendaWhatsApp(agenda: OtherAgenda): string {
  const meetingTypeNames: Record<string, string> = {
    BISHOPRIC_MEETING: 'Bishopric Meeting',
    WARD_COUNCIL: 'Ward Council Meeting',
    WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
    PRESIDENCY_MEETING: 'Presidency Meeting',
    OTHER_MEETING: agenda.meeting_type_other || 'Ward Meeting',
  };

  const meetingName = meetingTypeNames[agenda.meeting_type] || agenda.title || 'Ward Meeting';

  let topicsList: OtherAgendaTopic[] = [];
  try {
    if (typeof agenda.topics === 'string') {
      topicsList = JSON.parse(agenda.topics || '[]');
    } else if (Array.isArray(agenda.topics)) {
      topicsList = agenda.topics;
    }
  } catch {
    topicsList = [];
  }

  let assignmentsList: OtherAgendaAssignment[] = [];
  try {
    if (typeof agenda.assignments === 'string') {
      assignmentsList = JSON.parse(agenda.assignments || '[]');
    } else if (Array.isArray(agenda.assignments)) {
      assignmentsList = agenda.assignments;
    }
  } catch {
    assignmentsList = [];
  }

  let text = `🏛️ *THE CHURCH OF JESUS CHRIST OF LATTER-DAY SAINTS*\n`;
  text += `🏛️ *Ward:* ${agenda.venue ? (agenda.venue.includes('Ward') ? agenda.venue : 'OBANTOKO WARD') : 'OBANTOKO WARD'}\n`;
  text += `📋 *Meeting type:* ${meetingName.endsWith('Agenda') ? meetingName : `${meetingName} Agenda`}\n\n`;

  text += `📅 *Date:* ${agenda.date}\n`;
  text += `⏰ *Time:* ${formatTime12h(agenda.start_time)} - ${formatTime12h(agenda.end_time)}\n`;
  text += `📍 *Venue:* ${agenda.venue || "Bishop's Office / Council Room"}\n`;
  text += `👤 *Presiding:* ${formatHonorificName(agenda.presiding, agenda.presiding_role) || 'Bishop'} (${agenda.presiding_role || 'Bishop'})\n`;
  text += `🗣️ *Conducting:* ${formatHonorificName(agenda.conducting, agenda.conducting_role) || 'Conducting Officer'} (${agenda.conducting_role || 'Counselor'})\n\n`;

  text += `*─── OPENING EXERCISES ───*\n`;
  if (agenda.opening_hymn) text += `🎵 *Opening Hymn:* ${agenda.opening_hymn}\n`;
  if (agenda.opening_prayer) text += `🙏 *Opening Prayer:* ${formatHonorificName(agenda.opening_prayer)}\n`;
  if (agenda.spiritual_thought_by) {
    text += `💡 *Spiritual Thought:* ${formatHonorificName(agenda.spiritual_thought_by)}${agenda.spiritual_thought_topic ? ` — "${agenda.spiritual_thought_topic}"` : ''}\n`;
  }
  text += `\n`;

  if (topicsList.length > 0) {
    text += `*─── AGENDA DISCUSSION TOPICS ───*\n`;
    topicsList.forEach((t, idx) => {
      text += `${idx + 1}. *${t.title}*`;
      if (t.presenter) text += ` _(Lead: ${formatHonorificName(t.presenter)})_`;
      if (t.minutes) text += ` [${t.minutes}m]`;
      text += `\n`;
      if (t.notes) text += `   • ${t.notes}\n`;
    });
    text += `\n`;
  }

  if (assignmentsList.length > 0) {
    text += `*─── ACTION ITEMS & ASSIGNMENTS ───*\n`;
    assignmentsList.forEach((a, idx) => {
      text += `✅ *Task ${idx + 1}:* ${a.task}\n`;
      text += `   👤 *Assigned To:* ${formatHonorificName(a.assignee)}\n`;
      if (a.due_date) text += `   🎯 *Due Date:* ${a.due_date}\n`;
      if (a.notes) text += `   📝 *Notes:* ${a.notes}\n`;
    });
    text += `\n`;
  }

  text += `*─── CLOSING ───*\n`;
  if (agenda.closing_remarks_by) text += `💬 *Closing Remarks:* ${formatHonorificName(agenda.closing_remarks_by)}\n`;
  if (agenda.closing_prayer) text += `🙏 *Closing Prayer:* ${formatHonorificName(agenda.closing_prayer)}\n`;
  if (agenda.general_notes) text += `📝 *Notes:* ${agenda.general_notes}\n`;

  if (agenda.state === 'APPROVED') {
    text += `\n✨ _Approved by ${formatHonorificName(agenda.approved_by_name) || 'Bishopric'}_\n`;
  }

  return text;
}

export function formatAssignmentWhatsApp(agenda: OtherAgenda, assignment: OtherAgendaAssignment): string {
  return formatParticipantWhatsApp(agenda, assignment.assignee, [], [assignment]);
}

export function formatParticipantWhatsApp(
  agenda: OtherAgenda,
  participantName: string,
  roles: string[] = [],
  assignments: OtherAgendaAssignment[] = []
): string {
  const meetingTypeNames: Record<string, string> = {
    BISHOPRIC_MEETING: 'Bishopric Meeting',
    WARD_COUNCIL: 'Ward Council Meeting',
    WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
    PRESIDENCY_MEETING: 'Presidency Meeting',
    OTHER_MEETING: agenda.meeting_type_other || 'Ward Meeting',
  };

  const meetingName = meetingTypeNames[agenda.meeting_type] || agenda.title || 'Ward Meeting';
  const honorificParticipant = formatHonorificName(participantName);

  let text = `🏛️ *THE CHURCH OF JESUS CHRIST OF LATTER-DAY SAINTS*\n`;
  text += `🏛️ *Ward:* ${agenda.venue ? (agenda.venue.includes('Ward') ? agenda.venue : 'OBANTOKO WARD') : 'OBANTOKO WARD'}\n`;
  text += `📋 *Meeting type:* ${meetingName.endsWith('Agenda') ? meetingName : `${meetingName} Agenda`}\n\n`;
  text += `Dear *${honorificParticipant}*,\n\n`;
  text += `Here are your assigned responsibilities and action items for the upcoming *${meetingName}*:\n\n`;

  text += `📅 *Date:* ${agenda.date}\n`;
  text += `⏰ *Time:* ${agenda.start_time} - ${agenda.end_time}\n`;
  text += `📍 *Venue:* ${agenda.venue || "Bishop's Office / Council Room"}\n`;
  text += `👤 *Presiding:* ${formatHonorificName(agenda.presiding, agenda.presiding_role) || 'Bishop'}\n\n`;

  if (roles.length > 0) {
    text += `*─── YOUR MEETING DUTIES ───*\n`;
    roles.forEach(r => {
      text += `✨ *${r}*\n`;
    });
    text += `\n`;
  }

  if (assignments.length > 0) {
    text += `*─── ACTION ITEMS ASSIGNED TO YOU ───*\n`;
    assignments.forEach((a, idx) => {
      text += `✅ *Task ${idx + 1}:* ${a.task}\n`;
      if (a.due_date) text += `   🎯 *Target Due Date:* ${a.due_date}\n`;
      if (a.notes) text += `   📝 *Notes:* ${a.notes}\n`;
    });
    text += `\n`;
  }

  text += `Thank you for your faithful service and dedication to the Lord's work! 🙏`;

  return text;
}

export function openWhatsApp(text: string, phone?: string) {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const encoded = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
