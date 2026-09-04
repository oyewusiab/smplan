import type { OtherAgenda, OtherAgendaAssignment, OtherAgendaTopic, OtherAgendaAttendee } from '../types';
import { formatHonorificName } from './memberTitle';
import { formatTime12h } from './formatters';

export interface OtherAgendaPrintOptions {
  includeProposedRoll?: boolean; // Default false
  requestSignature?: boolean;    // Default true when roll is enabled
}

export function generateOtherAgendaHtml(
  agenda: OtherAgenda,
  unitName?: string,
  options: OtherAgendaPrintOptions = {}
): string {
  const { includeProposedRoll = false, requestSignature = true } = options;

  const meetingTypeNames: Record<string, string> = {
    BISHOPRIC_MEETING: 'Bishopric Meeting',
    WARD_COUNCIL: 'Ward Council Meeting',
    WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
    PRESIDENCY_MEETING: 'Presidency Meeting',
    OTHER_MEETING: agenda.meeting_type_other || 'Ward Meeting',
  };

  const rawMeetingName = meetingTypeNames[agenda.meeting_type] || agenda.title || 'Ward Meeting';
  const meetingTitle = rawMeetingName.toLowerCase().endsWith('agenda')
    ? rawMeetingName
    : `${rawMeetingName} Agenda`;

  const wardDisplay = unitName
    ? (unitName.toUpperCase().endsWith('WARD') || unitName.toUpperCase().endsWith('BRANCH')
        ? unitName.toUpperCase()
        : `${unitName.toUpperCase()} WARD`)
    : 'OBANTOKO WARD';

  // Parse topics
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

  // Parse assignments
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

  // Parse attendees
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

  const cleanDate = agenda.date || '';
  const cleanStartTime = formatTime12h(agenda.start_time);
  const cleanEndTime = formatTime12h(agenda.end_time);
  const timeDisplay = cleanStartTime && cleanEndTime ? `${cleanStartTime} - ${cleanEndTime}` : cleanStartTime || '07:00 AM';

  const presidingDisplay = formatHonorificName(agenda.presiding, agenda.presiding_role) || 'Bishop';
  const presidingRoleClean = agenda.presiding_role ? String(agenda.presiding_role).trim() : '';
  const presidingFull = (presidingRoleClean && !presidingDisplay.toLowerCase().includes(presidingRoleClean.toLowerCase()))
    ? `${presidingDisplay} (${presidingRoleClean})`
    : presidingDisplay;

  const conductingDisplay = formatHonorificName(agenda.conducting, agenda.conducting_role) || 'Conducting Officer';
  const conductingRoleClean = agenda.conducting_role ? String(agenda.conducting_role).trim() : '';
  const conductingFull = (conductingRoleClean && !conductingDisplay.toLowerCase().includes(conductingRoleClean.toLowerCase()))
    ? `${conductingDisplay} (${conductingRoleClean})`
    : conductingDisplay;

  const statusDisplay = agenda.state === 'APPROVED' ? 'APPROVED' : agenda.state === 'SUBMITTED' ? 'PENDING APPROVAL' : 'DRAFT';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${wardDisplay} - ${meetingTitle} - ${cleanDate}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.35;
      font-size: 11.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      margin-top: 24px;
      padding-top: 10px;
    }

    /* Header */
    .church-header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
    }
    .ward-name {
      font-size: 18px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .agenda-heading {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Metadata Table Grid */
    .meta-box {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 12px;
      background-color: #f8fafc;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .meta-table td {
      padding: 5px 9px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .meta-lbl {
      font-weight: 800;
      font-size: 9.5px;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: #f1f5f9;
      width: 13%;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      width: 20%;
    }

    /* Section Boxes */
    .section-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 11px;
      overflow: hidden;
      background-color: #ffffff;
      break-inside: avoid;
    }
    .section-title {
      background-color: #1e3a8a;
      color: #ffffff;
      padding: 4.5px 9px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-body {
      padding: 7px 9px;
    }

    /* Grid for Opening / Closing */
    .exercises-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .exercises-table td {
      padding: 3.5px 0;
      vertical-align: top;
    }
    .ex-label {
      font-weight: 700;
      color: #475569;
      width: 135px;
    }
    .ex-val {
      font-weight: 600;
      color: #0f172a;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-align: left;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .data-table td {
      padding: 5.5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .data-table tbody tr:nth-child(even) {
      background-color: #fbfcfe;
    }

    /* Signatures & Footer */
    .sign-block {
      margin-top: 10px;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 10px;
      color: #475569;
    }
    .sign-line {
      margin-top: 18px;
      border-top: 1px dashed #94a3b8;
      width: 180px;
      padding-top: 2px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
    }

    /* Roll specific */
    .roll-header {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .signature-cell {
      height: 24px;
      vertical-align: bottom;
      border-bottom: 1px dotted #94a3b8 !important;
    }

    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
      .section-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    
    <!-- ==================== PAGE 1: ORDER OF SERVICE & AGENDA ==================== -->
    <div class="church-header">
      <div class="ward-name">${wardDisplay}</div>
      <div class="agenda-heading">${meetingTitle}</div>
    </div>

    <!-- Executive Metadata Table Grid -->
    <table class="meta-table meta-box">
      <tr>
        <td class="meta-lbl">Date</td>
        <td class="meta-val">${cleanDate}</td>
        <td class="meta-lbl">Time</td>
        <td class="meta-val">${timeDisplay}</td>
        <td class="meta-lbl">Venue</td>
        <td class="meta-val">${agenda.venue || "Bishop's Office"}</td>
      </tr>
      <tr>
        <td class="meta-lbl">Presiding</td>
        <td class="meta-val">${presidingFull}</td>
        <td class="meta-lbl">Conducting</td>
        <td class="meta-val">${conductingFull}</td>
        <td class="meta-lbl">Status</td>
        <td class="meta-val">${statusDisplay}</td>
      </tr>
    </table>

    <!-- 1. Opening Exercises & Spiritual Thought -->
    <div class="section-card">
      <div class="section-title">
        <span>1. Opening Exercises & Spiritual Thought</span>
      </div>
      <div class="section-body">
        <table class="exercises-table">
          ${agenda.opening_hymn ? `
            <tr>
              <td class="ex-label">Opening Hymn:</td>
              <td class="ex-val">${agenda.opening_hymn}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="ex-label">Opening Prayer:</td>
            <td class="ex-val">${agenda.opening_prayer ? formatHonorificName(agenda.opening_prayer) : 'To be assigned'}</td>
          </tr>
          <tr>
            <td class="ex-label">Spiritual Thought By:</td>
            <td class="ex-val">
              ${agenda.spiritual_thought_by ? formatHonorificName(agenda.spiritual_thought_by) : 'Assigned Leader'}
              ${agenda.spiritual_thought_topic ? ` — <em>"${agenda.spiritual_thought_topic}"</em>` : ''}
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 2. Agenda Discussion & Council Items -->
    <div class="section-card">
      <div class="section-title">
        <span>2. Agenda Discussion & Council Items</span>
        <span style="font-size: 9.5px; opacity: 0.9;">${topicsList.length} Item(s)</span>
      </div>
      <div style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th>Topic / Business Item</th>
              <th style="width: 170px;">Discussion Leader</th>
              <th style="width: 55px; text-align: right;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${topicsList.length > 0 ? topicsList.map((t, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
                <td>
                  <strong style="color: #0f172a;">${t.title}</strong>
                  ${t.notes ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${t.notes}</div>` : ''}
                </td>
                <td style="font-weight: 700; color: #1e3a8a;">${t.presenter ? formatHonorificName(t.presenter) : '—'}</td>
                <td style="text-align: right; color: #475569; font-weight: 700;">${t.minutes ? `${t.minutes}m` : '—'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">No specific discussion topics recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. Action Items & Assignments -->
    <div class="section-card">
      <div class="section-title">
        <span>3. Action Items & Follow-up Assignments</span>
        <span style="font-size: 9.5px; opacity: 0.9;">${assignmentsList.length} Assignment(s)</span>
      </div>
      <div style="padding: 0;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th>Action Item / Task</th>
              <th style="width: 170px;">Assigned To</th>
              <th style="width: 110px;">Target Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${assignmentsList.length > 0 ? assignmentsList.map((a, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
                <td>
                  <strong style="color: #0f172a;">${a.task}</strong>
                  ${a.notes ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${a.notes}</div>` : ''}
                </td>
                <td style="font-weight: 700; color: #1e3a8a;">${formatHonorificName(a.assignee)}</td>
                <td style="font-weight: 700; color: #b45309;">${a.due_date || 'Next Meeting'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">No pending action items recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. Closing Exercises & General Notes -->
    <div class="section-card">
      <div class="section-title">
        <span>4. Closing Exercises & Special Notes</span>
      </div>
      <div class="section-body">
        <table class="exercises-table">
          ${agenda.closing_remarks_by ? `
            <tr>
              <td class="ex-label">Closing Remarks:</td>
              <td class="ex-val">${formatHonorificName(agenda.closing_remarks_by)}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="ex-label">Closing Prayer:</td>
            <td class="ex-val">${agenda.closing_prayer ? formatHonorificName(agenda.closing_prayer) : 'To be assigned'}</td>
          </tr>
        </table>

        ${agenda.general_notes ? `
          <div style="margin-top: 8px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 10.5px; color: #334155;">
            <strong>Special Notes:</strong> ${agenda.general_notes}
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Sign-off Block -->
    <div class="sign-block">
      <div>
        <div>Prepared by: <strong>${formatHonorificName(agenda.created_by_name) || 'Clerk / Secretary'}</strong></div>
        <div style="font-size: 9px; color: #64748b; margin-top: 1px;">Date Created: ${agenda.created_date ? agenda.created_date.substring(0, 10) : cleanDate}</div>
      </div>
      <div>
        ${agenda.approved_by_name ? `
          <div style="text-align: right;">
            <div>Approved by: <strong>${formatHonorificName(agenda.approved_by_name)}</strong></div>
            <div style="font-size: 9px; color: #166534; font-weight: 700; margin-top: 1px;">Status: APPROVED (${agenda.approved_date ? agenda.approved_date.substring(0, 10) : cleanDate})</div>
          </div>
        ` : `
          <div style="text-align: right;">
            <div class="sign-line">Presiding Officer Signature</div>
          </div>
        `}
      </div>
    </div>

    <!-- ==================== PAGE 2: PROPOSED ATTENDEES & QUORUM ROLL (OPTIONAL) ==================== -->
    ${includeProposedRoll ? `
      <div class="page-break">
        <div class="roll-header">
          <div class="ward-name">${wardDisplay} — Proposed Attendees & Quorum Roll</div>
          <div class="agenda-heading" style="font-size: 13px; font-weight: 700; color: #475569;">
            ${meetingTitle} · Date: ${cleanDate}
          </div>
        </div>

        <div class="section-card" style="margin-top: 14px;">
          <div class="section-title">
            <span>Proposed Attendees & Quorum Roll (${attendeesList.length} Leaders)</span>
            <span style="font-size: 9.5px; opacity: 0.9;">
              ${requestSignature ? 'Signature Requested' : 'Proposed Roll'}
            </span>
          </div>
          <div style="padding: 0;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 32px; text-align: center;">S/N</th>
                  <th style="width: 200px;">Leader Name</th>
                  <th style="width: 170px;">Calling / Role</th>
                  <th style="width: 110px;">Phone Number</th>
                  ${requestSignature ? '<th style="width: 160px; text-align: center;">Signature</th>' : '<th style="width: 100px; text-align: center;">Roll / Check</th>'}
                </tr>
              </thead>
              <tbody>
                ${attendeesList.length > 0 ? attendeesList.map((att, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
                    <td style="font-weight: 700; color: #0f172a;">${formatHonorificName(att.name, att.calling)}</td>
                    <td style="color: #334155; font-weight: 600;">${att.calling || 'Leader'}</td>
                    <td style="color: #475569;">${att.phone || '—'}</td>
                    ${requestSignature ? '<td class="signature-cell"></td>' : '<td style="text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold;">[&nbsp;&nbsp;&nbsp;&nbsp;]</td>'}
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">
                      No attendees listed for this meeting.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        ${requestSignature ? `
          <div style="margin-top: 12px; font-size: 10px; color: #64748b; font-style: italic; text-align: center;">
            * Please sign beside your name to acknowledge attendance and receipt of agenda assignments.
          </div>
        ` : ''}

        <div class="sign-block" style="margin-top: 30px;">
          <div>
            <div>Meeting Clerk / Recorder: ___________________________</div>
          </div>
          <div>
            <div>Conducting Officer Verification: ___________________________</div>
          </div>
        </div>
      </div>
    ` : ''}

  </div>
</body>
</html>
  `.trim();
}
