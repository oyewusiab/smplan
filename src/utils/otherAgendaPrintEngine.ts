import type { OtherAgenda, OtherAgendaAssignment, OtherAgendaTopic, OtherAgendaAttendee } from '../types';

export function generateOtherAgendaHtml(agenda: OtherAgenda, unitName?: string): string {
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

  let attendeesList: OtherAgendaAttendee[] = [];
  try {
    if (typeof agenda.attendees === 'string') {
      attendeesList = JSON.parse(agenda.attendees || '[]');
    } else if (Array.isArray(agenda.attendees)) {
      attendeesList = agenda.attendees;
    }
  } catch {
    attendeesList = [];
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${agenda.title} - ${agenda.date}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.4;
      font-size: 13px;
    }
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .header-block {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    .church-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .ward-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meeting-title {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    .section-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .section-header {
      background-color: #f1f5f9;
      padding: 7px 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-content {
      padding: 10px 12px;
    }

    .table-custom {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .table-custom th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      text-transform: uppercase;
    }
    .table-custom td {
      padding: 7px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .table-custom tr:last-child td {
      border-bottom: none;
    }

    .exercises-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .exercise-row {
      display: flex;
      gap: 6px;
      font-size: 12px;
    }
    .exercise-label {
      font-weight: 700;
      color: #475569;
      min-width: 120px;
    }
    .exercise-val {
      font-weight: 600;
      color: #0f172a;
    }

    .attendees-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .attendee-pill {
      font-size: 11px;
      padding: 3px 8px;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      color: #334155;
    }
    .attendee-pill.present {
      background-color: #dcfce7;
      border-color: #86efac;
      color: #166534;
      font-weight: 600;
    }

    .footer-block {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .section-box {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header-block">
      <div class="church-title">The Church of Jesus Christ of Latter-day Saints</div>
      <div class="ward-title">Ward: ${unitName ? (unitName.toUpperCase().endsWith('WARD') || unitName.toUpperCase().endsWith('BRANCH') ? unitName.toUpperCase() : `${unitName.toUpperCase()} WARD`) : 'OBANTOKO WARD'}</div>
      <div class="meeting-title">Meeting type: ${meetingName.endsWith('Agenda') ? meetingName : `${meetingName} Agenda`}</div>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Date</span>
        <span class="meta-value">📅 ${agenda.date}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Time</span>
        <span class="meta-value">⏰ ${agenda.start_time} - ${agenda.end_time}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Venue</span>
        <span class="meta-value">📍 ${agenda.venue || "Bishop's Office / Council Room"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Presiding</span>
        <span class="meta-value">👤 ${agenda.presiding || 'Bishop'} (${agenda.presiding_role || 'Bishop'})</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Conducting</span>
        <span class="meta-value">🗣️ ${agenda.conducting || 'Conducting Officer'} (${agenda.conducting_role || 'Counselor'})</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <span class="meta-value">
          ${agenda.state === 'APPROVED' ? '✅ APPROVED' : agenda.state === 'SUBMITTED' ? '⏳ PENDING APPROVAL' : '📝 DRAFT'}
        </span>
      </div>
    </div>

    <!-- Opening Exercises -->
    <div class="section-box">
      <div class="section-header">
        <span>Opening Exercises</span>
      </div>
      <div class="section-content">
        <div class="exercises-grid">
          ${agenda.opening_hymn ? `
            <div class="exercise-row">
              <span class="exercise-label">Opening Hymn:</span>
              <span class="exercise-val">${agenda.opening_hymn}</span>
            </div>
          ` : ''}
          <div class="exercise-row">
            <span class="exercise-label">Opening Prayer:</span>
            <span class="exercise-val">${agenda.opening_prayer || 'TBD'}</span>
          </div>
          <div class="exercise-row" style="grid-column: span 2;">
            <span class="exercise-label">Spiritual Thought:</span>
            <span class="exercise-val">
              ${agenda.spiritual_thought_by || 'Assigned Member'} 
              ${agenda.spiritual_thought_topic ? `— <em>"${agenda.spiritual_thought_topic}"</em>` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Council / Leadership Roll -->
    ${attendeesList.length > 0 ? `
      <div class="section-box">
        <div class="section-header">
          <span>Attendees & Quorum Roll (${attendeesList.length})</span>
        </div>
        <div class="section-content">
          <div class="attendees-wrap">
            ${attendeesList.map(a => `
              <span class="attendee-pill ${a.present ? 'present' : ''}">
                ${a.present ? '✓ ' : ''}${a.name} ${a.calling ? `(${a.calling})` : ''}
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Discussion Topics -->
    <div class="section-box">
      <div class="section-header">
        <span>Agenda Discussion & Council Items</span>
        <span>${topicsList.length} Item(s)</span>
      </div>
      <div class="section-content" style="padding: 0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Topic / Business</th>
              <th style="width: 140px;">Discussion Leader</th>
              <th style="width: 70px; text-align: right;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${topicsList.length > 0 ? topicsList.map((t, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                <td>
                  <strong>${t.title}</strong>
                  ${t.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">${t.notes}</div>` : ''}
                </td>
                <td style="font-weight: 600; color: #334155;">${t.presenter || '—'}</td>
                <td style="text-align: right; color: #64748b; font-weight: 600;">${t.minutes ? `${t.minutes}m` : '—'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align: center; color: #94a3b8; padding: 14px;">No specific topics listed.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Action Items & Assignments -->
    <div class="section-box">
      <div class="section-header">
        <span>Action Items & Assignments</span>
        <span>${assignmentsList.length} Action(s)</span>
      </div>
      <div class="section-content" style="padding: 0;">
        <table class="table-custom">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Action Item / Task</th>
              <th style="width: 150px;">Assigned To</th>
              <th style="width: 110px;">Target Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${assignmentsList.length > 0 ? assignmentsList.map((a, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
                <td>
                  <strong>${a.task}</strong>
                  ${a.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${a.notes}</div>` : ''}
                </td>
                <td style="font-weight: 700; color: #1e3a8a;">${a.assignee}</td>
                <td style="font-weight: 600; color: #b45309;">${a.due_date || 'Next Meeting'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align: center; color: #94a3b8; padding: 14px;">No action items recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Closing Exercises & Notes -->
    <div class="section-box">
      <div class="section-header">
        <span>Closing Exercises & General Notes</span>
      </div>
      <div class="section-content">
        ${agenda.closing_remarks_by ? `
          <div class="exercise-row" style="margin-bottom: 8px;">
            <span class="exercise-label">Closing Remarks:</span>
            <span class="exercise-val">${agenda.closing_remarks_by}</span>
          </div>
        ` : ''}
        <div class="exercise-row" style="margin-bottom: 8px;">
          <span class="exercise-label">Closing Prayer:</span>
          <span class="exercise-val">${agenda.closing_prayer || 'TBD'}</span>
        </div>
        ${agenda.general_notes ? `
          <div style="margin-top: 8px; font-size: 12px; color: #475569; background: #f8fafc; padding: 8px 10px; border-radius: 4px; border-left: 3px solid #cbd5e1;">
            <strong>Special Notes:</strong> ${agenda.general_notes}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-block">
      <span>Created by: ${agenda.created_by_name || 'Clerk / Secretary'} on ${agenda.created_date ? agenda.created_date.substring(0, 10) : 'Record'}</span>
      <span>
        ${agenda.approved_by_name ? `Approved by: <strong>${agenda.approved_by_name}</strong> (${agenda.approved_date ? agenda.approved_date.substring(0, 10) : ''})` : 'Pending Bishopric Approval'}
      </span>
    </div>

  </div>
</body>
</html>
  `.trim();
}
