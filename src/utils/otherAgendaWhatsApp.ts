import type { OtherAgenda, OtherAgendaAssignment, OtherAgendaTopic } from '../types';

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

  let text = `📋 *${meetingName.toUpperCase()} — AGENDA*\n`;
  text += `🏛️ *The Church of Jesus Christ of Latter-day Saints*\n\n`;

  text += `📅 *Date:* ${agenda.date}\n`;
  text += `⏰ *Time:* ${agenda.start_time} - ${agenda.end_time}\n`;
  text += `📍 *Venue:* ${agenda.venue || "Bishop's Office / Council Room"}\n`;
  text += `👤 *Presiding:* ${agenda.presiding || 'Bishop'} (${agenda.presiding_role || 'Bishop'})\n`;
  text += `🗣️ *Conducting:* ${agenda.conducting || 'Conducting Officer'} (${agenda.conducting_role || 'Counselor'})\n\n`;

  text += `*─── OPENING EXERCISES ───*\n`;
  if (agenda.opening_hymn) text += `🎵 *Opening Hymn:* ${agenda.opening_hymn}\n`;
  if (agenda.opening_prayer) text += `🙏 *Opening Prayer:* ${agenda.opening_prayer}\n`;
  if (agenda.spiritual_thought_by) {
    text += `💡 *Spiritual Thought:* ${agenda.spiritual_thought_by}${agenda.spiritual_thought_topic ? ` — "${agenda.spiritual_thought_topic}"` : ''}\n`;
  }
  text += `\n`;

  if (topicsList.length > 0) {
    text += `*─── AGENDA DISCUSSION TOPICS ───*\n`;
    topicsList.forEach((t, idx) => {
      text += `${idx + 1}. *${t.title}*`;
      if (t.presenter) text += ` _(Lead: ${t.presenter})_`;
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
      text += `   👤 *Assigned To:* ${a.assignee}\n`;
      if (a.due_date) text += `   🎯 *Due Date:* ${a.due_date}\n`;
      if (a.notes) text += `   📝 *Notes:* ${a.notes}\n`;
    });
    text += `\n`;
  }

  text += `*─── CLOSING ───*\n`;
  if (agenda.closing_remarks_by) text += `💬 *Closing Remarks:* ${agenda.closing_remarks_by}\n`;
  if (agenda.closing_prayer) text += `🙏 *Closing Prayer:* ${agenda.closing_prayer}\n`;
  if (agenda.general_notes) text += `📝 *Notes:* ${agenda.general_notes}\n`;

  if (agenda.state === 'APPROVED') {
    text += `\n✨ _Approved by ${agenda.approved_by_name || 'Bishopric'}_`;
  }

  return text;
}

export function formatAssignmentWhatsApp(agenda: OtherAgenda, assignment: OtherAgendaAssignment): string {
  const meetingTypeNames: Record<string, string> = {
    BISHOPRIC_MEETING: 'Bishopric Meeting',
    WARD_COUNCIL: 'Ward Council Meeting',
    WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
    PRESIDENCY_MEETING: 'Presidency Meeting',
    OTHER_MEETING: agenda.meeting_type_other || 'Ward Meeting',
  };

  const meetingName = meetingTypeNames[agenda.meeting_type] || agenda.title || 'Ward Meeting';

  let text = `🕊️ *MEETING ASSIGNMENT NOTICE*\n`;
  text += `Dear *${assignment.assignee}*,\n\n`;
  text += `You have been assigned the following action item from the *${meetingName}*:\n\n`;
  text += `📋 *Assignment:* ${assignment.task}\n`;
  if (assignment.due_date) text += `🎯 *Target Due Date:* ${assignment.due_date}\n`;
  if (assignment.notes) text += `📝 *Details/Notes:* ${assignment.notes}\n\n`;
  text += `📅 *Meeting Date:* ${agenda.date}\n`;
  text += `👤 *Presiding:* ${agenda.presiding}\n\n`;
  text += `Thank you for your service and dedication to the Lord's work! 🙏`;

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
