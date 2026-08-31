/**
 * Bulletin Print & PDF Generation Engine
 * File: bulletinPrintEngine.ts
 * 
 * Supports 3 Professional Church Layouts:
 * 1. Standard 1-Page A4 (High-density single-sheet program with auto-scaling)
 * 2. Standard 2-Page (Expanded order of service, CFM study guide, activities, next 5 outlook, & initiatives)
 * 3. Bi-Fold 4-Page Chapel Program Booklet (A4 Landscape 2-Sheet folded program)
 */

import { format, parseISO } from 'date-fns';
import { getBulletinTheme } from './bulletinThemes';
import type { Bulletin, SpeakerItem, WeeklyActivityItem, NextActivityItem } from '../types';

export function isSectionVisible(val: any): boolean {
  if (val === undefined || val === null) return true;
  if (val === false || val === 'FALSE' || val === 'false' || val === 0 || val === '0') return false;
  return true;
}

export function getWeekDateRange(dateStr?: string, unitName?: string) {
  const memberType = (unitName || '').toLowerCase().includes('branch') ? 'Branch' : 'Ward';
  if (!dateStr) {
    return {
      mondayStr: '',
      sundayStr: '',
      monFormatted: '',
      sunFormatted: '',
      rangeLabel: `Weekly ${memberType} Bulletin — Prepared for ${memberType} Members`,
    };
  }

  try {
    const sunday = parseISO(dateStr);
    if (isNaN(sunday.getTime())) {
      return {
        mondayStr: '',
        sundayStr: dateStr,
        monFormatted: '',
        sunFormatted: dateStr,
        rangeLabel: `${dateStr} Bulletin — Prepared for ${memberType} Members`,
      };
    }

    const dayOfWeek = sunday.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(sunday);
    monday.setDate(sunday.getDate() - diffToMonday);

    const monFormatted = format(monday, 'd MMM');
    const sunFormatted = format(sunday, 'd MMM yyyy');
    const rangeLabel = `${monFormatted} - ${sunFormatted} Bulletin — Prepared for ${memberType} Members`;

    return {
      mondayStr: format(monday, 'yyyy-MM-dd'),
      sundayStr: format(sunday, 'yyyy-MM-dd'),
      monFormatted,
      sunFormatted,
      rangeLabel,
    };
  } catch {
    return {
      mondayStr: '',
      sundayStr: dateStr || '',
      monFormatted: '',
      sunFormatted: dateStr || '',
      rangeLabel: `${dateStr || ''} Bulletin — Prepared for ${memberType} Members`,
    };
  }
}

function safeDateFormat(dateStr?: string, fmt = 'EEEE, MMMM d, yyyy'): string {
  if (!dateStr) return 'Sunday Service';
  try {
    const parsed = parseISO(dateStr);
    return isNaN(parsed.getTime()) ? dateStr : format(parsed, fmt);
  } catch {
    return dateStr;
  }
}

function parseSpeakersArray(speakersRaw?: any): SpeakerItem[] {
  if (!speakersRaw) return [];
  if (Array.isArray(speakersRaw)) return speakersRaw;
  if (typeof speakersRaw === 'string') {
    try {
      const parsed = JSON.parse(speakersRaw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return speakersRaw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split(/[—–-]/);
        return {
          name: parts[0]?.trim() || '',
          topic: parts[1]?.trim() || '',
        };
      });
  }
  return [];
}

/**
 * 1. Standard 1-Page A4 Layout (Comprehensive High-Density 1-Page Program)
 */
export function generateStandard1PageA4Html(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const speakers = parseSpeakersArray(d.speakers);
  const weekRange = getWeekDateRange(d.date, d.unit_name);
  const unitTitle = (d.unit_name || 'OBANTOKO WARD').toUpperCase();

  const next5List: NextActivityItem[] = (d.next_activities_list && d.next_activities_list.length > 0)
    ? d.next_activities_list
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ward Bulletin — ${d.date || 'Sacrament Meeting'}</title>
  <style>
    @page { size: A4 portrait; margin: 6mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.3;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      text-align: center;
      margin-bottom: 6pt;
      padding-bottom: 4pt;
      border-bottom: 2px solid ${theme.primaryColor};
    }
    .header-unit-title {
      font-family: "Times New Roman", Georgia, serif;
      font-size: 16pt;
      font-weight: 800;
      color: ${theme.primaryColor};
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 1pt;
      line-height: 1.1;
    }
    .header-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 8.5pt;
      font-weight: 800;
      color: ${theme.secondaryColor};
      letter-spacing: 1.8px;
      text-transform: uppercase;
      margin-bottom: 1.5pt;
    }
    .header-date-range {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 8pt;
      font-style: italic;
      color: #475569;
    }
    .header-theme-quote {
      font-size: 7.5pt;
      font-style: italic;
      color: ${theme.primaryColor};
      margin-top: 1.5pt;
    }

    .grid-container {
      display: grid;
      grid-template-columns: 1.08fr 0.92fr;
      gap: 7pt;
      align-items: start;
    }
    .column { display: flex; flex-direction: column; gap: 6pt; }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 4pt;
      padding: 5.5pt 7.5pt;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${theme.primaryColor};
      border-bottom: 1.5px solid ${theme.primaryColor};
      padding-bottom: 2pt;
      margin-bottom: 4pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 2.5pt; }
    .row .label { color: #64748b; font-weight: 500; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }

    .badge {
      display: inline-block;
      font-size: 6.5pt;
      font-weight: 700;
      padding: 1pt 4pt;
      border-radius: 3pt;
      background: ${theme.badgeBg};
      color: ${theme.badgeText};
      text-transform: uppercase;
    }

    .celebrant-pill {
      display: inline-block;
      background: #ffffff;
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 1.5pt 4pt;
      border-radius: 3pt;
      margin: 1pt 2pt 1pt 0;
    }

    .activity-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      margin-bottom: 2pt;
      border-bottom: 1px dashed #f1f5f9;
      padding-bottom: 1.5pt;
    }
    .activity-day { font-weight: 700; color: ${theme.primaryColor}; width: 45pt; flex-shrink: 0; }
    .activity-desc { flex-grow: 1; color: #334155; font-weight: 500; }
    .activity-meta { font-size: 7pt; color: #64748b; font-weight: 600; flex-shrink: 0; }

    .qr-dual-container {
      display: flex;
      gap: 6pt;
      background: ${theme.bgLight};
      border: 1px solid ${theme.borderLight};
      padding: 4pt 6pt;
      border-radius: 4pt;
      align-items: center;
    }
    .qr-box { display: flex; align-items: center; gap: 4pt; flex: 1; }
    .qr-code { width: 34pt; height: 34pt; flex-shrink: 0; }
    .qr-text { font-size: 6.5pt; color: #475569; line-height: 1.2; }

    .footer {
      margin-top: 6pt;
      border-top: 1px solid #cbd5e1;
      padding-top: 3pt;
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
      font-style: italic;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <!-- Header with Theme Colors -->
  <div class="header">
    <div class="header-unit-title">${unitTitle}</div>
    <div class="header-subtitle">WEEKLY WARD BULLETIN</div>
    <div class="header-date-range">${weekRange.rangeLabel}</div>
    ${d.theme ? `<div class="header-theme-quote">"${d.theme}"</div>` : ''}
  </div>

  <div class="grid-container">
    <!-- Left Column: Sacrament Outline, CFM Study Guide, Bishopric Message & Initiatives -->
    <div class="column">
      ${isSectionVisible(d.show_sacrament) ? `
      <!-- 1. Streamlined Sacrament Meeting Outline -->
      <div class="card">
        <div class="card-title">
          <span>Sacrament Meeting Outline</span>
          <span class="badge">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn:</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation:</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn:</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 2.5pt 4pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 2.5pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies:</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin-top: 2.5pt; border-top: 1px dotted #e2e8f0; padding-top: 2.5pt;">
          <div style="font-weight: 700; font-size: 7.5pt; color: #475569; margin-bottom: 1.5pt;">Talks:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker:' : `Speaker ${idx + 1}:`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : d.speakers ? `
        <div class="row">
          <span class="label">Talks:</span>
          <span class="value" style="white-space: pre-line;">${d.speakers}</span>
        </div>
        ` : ''}

        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn:</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction:</span><span class="value">${d.closing_prayer}</span></div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_focus) && (d.cfm_reading || d.cfm_theme || d.scripture_of_the_week) ? `
      <!-- 5. CFM & Scripture Focus -->
      <div class="card" style="background: ${theme.bgLight}; border-color: ${theme.borderLight};">
        <div class="card-title" style="color: ${theme.primaryColor}; border-color: ${theme.secondaryColor};">
          <span>Come, Follow Me Study Guide</span>
          ${d.cfm_reading ? `<span class="badge">${d.cfm_reading}</span>` : ''}
        </div>
        ${d.cfm_theme ? `<div style="font-weight: 700; font-size: 8pt; color: ${theme.primaryColor}; margin-bottom: 2pt;">${d.cfm_theme}</div>` : ''}
        ${d.cfm_introduction ? `<div style="font-size: 7pt; color: #334155; font-style: italic; margin-bottom: 2.5pt; line-height: 1.3;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7pt; color: #334155; margin-bottom: 2.5pt; white-space: pre-line; line-height: 1.3;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 7.5pt; color: #92400e; margin-bottom: 2pt; background: #fef9c3; padding: 2.5pt 4pt; border-radius: 3pt; border-left: 2px solid #ca8a04;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 6.5pt; color: ${theme.secondaryColor}; margin-top: 1.5pt;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: ${theme.primaryColor}; text-decoration: underline;">${d.cfm_url}</a></div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_bishopric) && d.bishopric_message ? `
      <!-- 6. Message from the Bishopric -->
      <div class="card">
        <div class="card-title">Message from the Bishopric</div>
        <p style="margin: 0; font-size: 7.5pt; line-height: 1.35; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}

      ${isSectionVisible(d.show_temple) && (d.temple_trip_date || d.familysearch_tip || d.ancestor_challenge) ? `
      <!-- 8. Temple & FamilySearch -->
      <div class="card" style="background: #fdf4ff; border-color: #f5d0fe;">
        <div class="card-title" style="color: #86198f; border-color: #c026d3;">Temple & FamilySearch</div>
        ${d.temple_trip_date ? `<div class="row"><span class="label">Next Temple Trip:</span><span class="value">${safeDateFormat(d.temple_trip_date, 'MMM d, yyyy')}</span></div>` : ''}
        ${d.familysearch_tip ? `<div style="font-size: 7pt; color: #701a75; margin-top: 1.5pt;"><strong>Indexing Tip:</strong> ${d.familysearch_tip}</div>` : ''}
        ${d.ancestor_challenge ? `<div style="font-size: 7pt; color: #86198f; font-style: italic; margin-top: 1.5pt;"><strong>Challenge:</strong> ${d.ancestor_challenge}</div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_self_reliance) && d.self_reliance_classes ? `
      <!-- 9. Self-Reliance -->
      <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
        <div class="card-title" style="color: #166534; border-color: #22c55e;">Self-Reliance Services</div>
        <div style="font-size: 7pt; color: #14532d; white-space: pre-line;">${d.self_reliance_classes}</div>
      </div>
      ` : ''}

      ${isSectionVisible(d.show_welfare) && d.welfare_reminders ? `
      <!-- 10. Welfare Notices -->
      <div class="card" style="background: #fefce8; border-color: #fef08a;">
        <div class="card-title" style="color: #854d0e; border-color: #eab308;">Welfare & Fast Offering</div>
        <div style="font-size: 7pt; color: #713f12; white-space: pre-line;">${d.welfare_reminders}</div>
      </div>
      ` : ''}
    </div>

    <!-- Right Column: Birthdays, Activities, Next 5, Cleaning, Missionaries, QR -->
    <div class="column">
      ${isSectionVisible(d.show_birthdays) && d.birthdays ? `
      <!-- 2. Birthday Celebrants Frame -->
      <div class="card" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #fbbf24; box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1);">
        <div class="card-title" style="color: #92400e; border-color: #d97706; display: flex; align-items: center; justify-content: space-between;">
          <span>🎂 Birthday Celebrants (This Week)</span>
          <span style="font-size: 6.5pt; background: #fbbf24; color: #78350f; padding: 1pt 3pt; border-radius: 2pt; font-weight: 700;">CELEBRATION</span>
        </div>
        <div style="margin-bottom: 3pt; display: flex; flex-wrap: wrap; gap: 2pt;">
          ${(d.birthdays || '').split(/[\n,]|   /).filter(Boolean).map(b => `<span class="celebrant-pill">${b.trim()}</span>`).join('')}
        </div>
        ${d.birthday_message ? `<div style="font-size: 7pt; color: #92400e; font-style: italic; background: rgba(255,255,255,0.75); padding: 2pt 4pt; border-radius: 2pt;">${d.birthday_message}</div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_activities) && (d.activities || (d.activities_list && d.activities_list.length > 0)) ? `
      <!-- 3. Weekly Activities Schedule (Monday - Sunday) -->
      <div class="card">
        <div class="card-title">Weekly Activities (Mon–Sun)</div>
        ${(d.activities_list && d.activities_list.length > 0
          ? d.activities_list.map((item) => `
            <div class="activity-line">
              <span class="activity-day">${item.day}</span>
              <span class="activity-desc">${item.activity}</span>
              <span class="activity-meta">${item.time} [${item.scope || 'Ward'}]</span>
            </div>
          `).join('')
          : (d.activities || '').split('\n').filter(Boolean).map((line) => {
            const colonIdx = line.indexOf(':');
            const dayPart = colonIdx > -1 ? line.substring(0, colonIdx) : '•';
            const textPart = colonIdx > -1 ? line.substring(colonIdx + 1) : line;
            return `
              <div class="activity-line">
                <span class="activity-day">${dayPart}</span>
                <span class="activity-desc">${textPart}</span>
              </div>
            `;
          }).join('')
        )}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_upcoming) && next5List.length > 0 ? `
      <!-- 11. Next 5 Activities (Outlook) -->
      <div class="card" style="background: #f8fafc; border-color: #cbd5e1;">
        <div class="card-title" style="color: #334155; border-color: #94a3b8;">
          <span>Next 5 Activities (Calendar Outlook)</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 2pt;">
          ${next5List.map((act) => `
            <div class="activity-line" style="border-bottom: 1px dotted #e2e8f0;">
              <span style="font-weight: 700; color: #475569; width: 45pt; font-size: 7pt;">${act.date}</span>
              <span class="activity-desc" style="font-size: 7pt;">${act.activity}</span>
              <span style="font-size: 6.5pt; font-weight: 700; background: #e2e8f0; color: #334155; padding: 0.5pt 3pt; border-radius: 2pt;">${act.scope || 'Ward'}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${isSectionVisible(d.show_cleaning) && d.cleaning_group ? `
      <!-- 4. Cleaning Roster -->
      <div class="card" style="background: #f8fafc;">
        <div class="card-title">Building Cleaning Assignment</div>
        <div class="row"><span class="label">Assigned Group:</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date & Time:</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<div style="font-size: 6.5pt; color: #64748b; margin-top: 2pt; font-style: italic;">${d.cleaning_instructions}</div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_missionary) && d.missionaries ? `
      <!-- 7. Missionary Corner -->
      <div class="card">
        <div class="card-title">Full-Time Missionaries</div>
        <div style="font-size: 7.5pt; color: #334155; white-space: pre-line;">${d.missionaries}</div>
      </div>
      ` : ''}

      ${isSectionVisible(d.show_qr) ? `
      <!-- 12. Dual Digital QR Codes -->
      <div class="card" style="padding: 4pt 6pt;">
        <div class="qr-dual-container">
          <div class="qr-box">
            <img class="qr-code" src="https://quickchart.io/qr?text=${encodeURIComponent(d.qr_familysearch || 'https://www.familysearch.org')}&size=120&margin=1" alt="FS" />
            <div class="qr-text">
              <strong>FamilySearch:</strong><br/>
              Scan for Family Tree & Ancestors.
            </div>
          </div>
          <div class="qr-box">
            <img class="qr-code" src="https://quickchart.io/qr?text=${encodeURIComponent(d.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library')}&size=120&margin=1" alt="GL" />
            <div class="qr-text">
              <strong>Gospel Library:</strong><br/>
              Scan for hymns, manuals & study.
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>

  <!-- Standard Footer per User Specification -->
  <div class="footer">
    This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
  </div>
</body>
</html>`;
}

/**
 * 2. Standard 2-Page Detailed Layout (Complete Spread with All Sections)
 */
export function generateStandard2PageHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const speakers = parseSpeakersArray(d.speakers);
  const weekRange = getWeekDateRange(d.date, d.unit_name);
  const unitTitle = (d.unit_name || 'OBANTOKO WARD').toUpperCase();

  const next5List: NextActivityItem[] = (d.next_activities_list && d.next_activities_list.length > 0)
    ? d.next_activities_list
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ward Bulletin (2-Page) — ${d.date}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break { page-break-after: always; break-after: page; }
    .page { min-height: 96%; display: flex; flex-direction: column; justify-content: space-between; }
    .header {
      text-align: center;
      margin-bottom: 12pt;
      padding-bottom: 6pt;
      border-bottom: 2.5px solid ${theme.primaryColor};
    }
    .header-unit-title {
      font-family: "Times New Roman", Georgia, serif;
      font-size: 20pt;
      font-weight: 800;
      color: ${theme.primaryColor};
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 2pt;
    }
    .header-subtitle {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 10pt;
      font-weight: 800;
      color: ${theme.secondaryColor};
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 2pt;
    }
    .header-date-range {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 9.5pt;
      font-style: italic;
      color: #475569;
    }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 6pt;
      padding: 9pt 12pt;
      background: #ffffff;
      margin-bottom: 10pt;
    }
    .card-title {
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${theme.primaryColor};
      border-bottom: 2px solid ${theme.primaryColor};
      padding-bottom: 3pt;
      margin-bottom: 6pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 4pt; font-size: 9pt; }
    .row .label { color: #64748b; font-weight: 500; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }

    .celebrant-badge {
      background: #ffffff;
      border: 1.5px solid #fde68a;
      color: #92400e;
      font-weight: 700;
      padding: 3pt 6pt;
      border-radius: 4pt;
      font-size: 8.5pt;
    }

    .activity-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3pt 0;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 8.5pt;
    }

    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 4pt;
      font-size: 7.5pt;
      color: #64748b;
      text-align: center;
      font-style: italic;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Sacrament Program & Complete Come Follow Me Study Guide -->
  <div class="page page-break">
    <div>
      <div class="header">
        <div class="header-unit-title">${unitTitle}</div>
        <div class="header-subtitle">WEEKLY WARD BULLETIN</div>
        <div class="header-date-range">${weekRange.rangeLabel}</div>
        ${d.theme ? `<div style="font-size: 9.5pt; font-style: italic; color: ${theme.primaryColor}; margin-top: 3pt;">"${d.theme}"</div>` : ''}
      </div>

      ${isSectionVisible(d.show_sacrament) ? `
      <div class="card">
        <div class="card-title">
          <span>Sacrament Meeting Outline</span>
          <span style="font-size: 8pt; background: ${theme.badgeBg}; color: ${theme.badgeText}; padding: 2pt 6pt; border-radius: 4pt; font-weight: 700;">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn:</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation:</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn:</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 6pt 10pt; border-radius: 4pt; border-left: 3px solid #16a34a; margin: 6pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies:</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by the Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 6pt 0; border-top: 1px dotted #e2e8f0; padding-top: 6pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 3pt; font-size: 8.5pt;">Talks:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker:' : `Speaker ${idx + 1}:`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : d.speakers ? `
        <div class="row">
          <span class="label">Talks:</span>
          <span class="value" style="white-space: pre-line;">${d.speakers}</span>
        </div>
        ` : ''}

        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn:</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction:</span><span class="value">${d.closing_prayer}</span></div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_focus) && (d.cfm_reading || d.cfm_theme || d.scripture_of_the_week) ? `
      <!-- Complete 6-Field CFM Study Guide -->
      <div class="card" style="background: ${theme.bgLight}; border-color: ${theme.borderLight};">
        <div class="card-title" style="color: ${theme.primaryColor}; border-color: ${theme.secondaryColor};">
          <span>Come, Follow Me Study Guide</span>
          ${d.cfm_reading ? `<span style="background: ${theme.badgeBg}; color: ${theme.badgeText}; padding: 2pt 6pt; border-radius: 4pt; font-size: 8pt; font-weight: 700;">${d.cfm_reading}</span>` : ''}
        </div>
        ${d.cfm_theme ? `<p style="font-weight: 700; color: ${theme.primaryColor}; margin: 0 0 3pt; font-size: 9.5pt;">${d.cfm_theme}</p>` : ''}
        ${d.cfm_introduction ? `<p style="font-style: italic; color: #334155; margin: 0 0 5pt; font-size: 8.5pt; line-height: 1.35;">${d.cfm_introduction}</p>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 8.5pt; color: #334155; margin: 0 0 5pt; white-space: pre-line; line-height: 1.35;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="color: #92400e; margin: 0 0 5pt; background: #fef9c3; padding: 5pt 8pt; border-radius: 4pt; border-left: 3px solid #ca8a04; font-size: 8.5pt;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<p style="font-size: 8pt; color: ${theme.secondaryColor}; margin: 3pt 0 0;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: ${theme.primaryColor}; text-decoration: underline;">${d.cfm_url}</a></p>` : ''}
      </div>
      ` : ''}
    </div>

    <div class="footer">
      This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
    </div>
  </div>

  <!-- PAGE 2: Community, Birthdays, Weekly Activities, Next 5, Initiatives & Missionaries -->
  <div class="page">
    <div>
      ${isSectionVisible(d.show_birthdays) && d.birthdays ? `
      <!-- Birthday Celebrants Special Frame -->
      <div class="card" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #fbbf24; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
        <div class="card-title" style="color: #92400e; border-color: #d97706; display: flex; justify-content: space-between; align-items: center;">
          <span>🎂 Birthday Celebrants (This Week)</span>
          <span style="font-size: 7.5pt; background: #fbbf24; color: #78350f; padding: 2pt 5pt; border-radius: 3pt; font-weight: 700;">CELEBRATION</span>
        </div>
        <div style="margin-bottom: 5pt; display: flex; flex-wrap: wrap; gap: 3pt;">
          ${(d.birthdays || '').split(/[\n,]|   /).filter(Boolean).map(b => `<span class="celebrant-badge">${b.trim()}</span>`).join('')}
        </div>
        ${d.birthday_message ? `<div style="font-style: italic; color: #92400e; background: rgba(255,255,255,0.8); padding: 3pt 6pt; border-radius: 3pt; font-size: 8.5pt;">${d.birthday_message}</div>` : ''}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_activities) && (d.activities || (d.activities_list && d.activities_list.length > 0)) ? `
      <!-- Weekly Activities Structured Schedule -->
      <div class="card">
        <div class="card-title">Weekly Schedule (Monday – Sunday)</div>
        ${(d.activities_list && d.activities_list.length > 0
          ? d.activities_list.map((item) => `
            <div class="activity-row">
              <span style="font-weight: 700; color: ${theme.primaryColor}; width: 65pt;">${item.day}</span>
              <span style="flex-grow: 1; color: #1e293b; font-weight: 500;">${item.activity}</span>
              <span style="color: #64748b; font-weight: 600; font-size: 8pt;">${item.time} [${item.scope || 'Ward'}]</span>
            </div>
          `).join('')
          : `<div style="white-space: pre-line; line-height: 1.5;">${d.activities}</div>`
        )}
      </div>
      ` : ''}

      ${isSectionVisible(d.show_upcoming) && next5List.length > 0 ? `
      <!-- Next 5 Activities Outlook -->
      <div class="card" style="background: #f8fafc; border-color: #cbd5e1;">
        <div class="card-title" style="color: #334155; border-color: #94a3b8;">
          <span>Next 5 Activities (Calendar Outlook)</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 3pt;">
          ${next5List.map((act) => `
            <div class="activity-row">
              <span style="font-weight: 700; color: #475569; width: 65pt;">${act.date} (${act.dayName || 'TBD'})</span>
              <span style="flex-grow: 1; color: #1e293b;">${act.activity}</span>
              <span style="font-size: 7.5pt; font-weight: 700; background: #e2e8f0; color: #334155; padding: 1pt 4pt; border-radius: 3pt;">${act.scope || 'Ward'}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${isSectionVisible(d.show_bishopric) && d.bishopric_message ? `
      <div class="card">
        <div class="card-title">Message from the Bishopric</div>
        <p style="margin: 0; line-height: 1.45; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8pt;">
        ${isSectionVisible(d.show_cleaning) && d.cleaning_group ? `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">Building Cleaning</div>
          <div class="row"><span class="label">Group:</span><span class="value">${d.cleaning_group}</span></div>
          <div class="row"><span class="label">Date:</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
          ${d.cleaning_instructions ? `<p style="font-size: 7.5pt; color: #64748b; margin: 3pt 0 0; font-style: italic;">${d.cleaning_instructions}</p>` : ''}
        </div>
        ` : '<div></div>'}

        ${isSectionVisible(d.show_missionary) && d.missionaries ? `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">Full-Time Missionaries</div>
          <div style="white-space: pre-line; font-size: 8pt; color: #334155;">${d.missionaries}</div>
        </div>
        ` : '<div></div>'}
      </div>
    </div>

    <div class="footer">
      This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. Bi-Fold 4-Page Chapel Program Booklet (2 Landscape Spread Sheets)
 */
export function generateBiFoldBookletHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const speakers = parseSpeakersArray(d.speakers);
  const weekRange = getWeekDateRange(d.date, d.unit_name);
  const unitTitle = (d.unit_name || 'OBANTOKO WARD').toUpperCase();

  const next5List: NextActivityItem[] = (d.next_activities_list && d.next_activities_list.length > 0)
    ? d.next_activities_list
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bi-Fold Ward Program Booklet — ${d.date}</title>
  <style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.3;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-sheet {
      width: 100%;
      height: 97vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14mm;
      page-break-after: always;
      break-after: page;
      padding: 2mm;
    }
    .booklet-page {
      border: 1px dashed #cbd5e1;
      border-radius: 4pt;
      padding: 12pt;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }
    .page-number {
      text-align: center;
      font-size: 7pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 3pt;
    }
    .card-title {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: ${theme.primaryColor};
      border-bottom: 1.5px solid ${theme.primaryColor};
      padding-bottom: 2pt;
      margin-bottom: 4pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 2.5pt; font-size: 7.5pt; }
    .row .label { color: #64748b; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }
  </style>
</head>
<body>
  <!-- SHEET 1: Outside Spread (Left: Page 4 Back Cover | Right: Page 1 Front Cover) -->
  <div class="page-sheet">
    <!-- PAGE 4 (BACK COVER): Activities, Next 5, Cleaning & QR -->
    <div class="booklet-page">
      <div>
        ${isSectionVisible(d.show_activities) && (d.activities || (d.activities_list && d.activities_list.length > 0)) ? `
        <div class="card-title">Weekly Schedule (Mon–Sun)</div>
        ${(d.activities_list && d.activities_list.length > 0
          ? d.activities_list.slice(0, 7).map((item) => `
            <div class="row" style="border-bottom: 1px dashed #f1f5f9; padding-bottom: 1.5pt;">
              <span style="font-weight: 700; color: ${theme.primaryColor};">${item.day}</span>
              <span style="color: #334155;">${item.activity} (${item.time})</span>
            </div>
          `).join('')
          : `<div style="white-space: pre-line; font-size: 7.5pt; margin-bottom: 6pt;">${d.activities}</div>`
        )}
        ` : ''}

        ${isSectionVisible(d.show_upcoming) && next5List.length > 0 ? `
        <div class="card-title" style="margin-top: 6pt;">Next 5 Activities (Calendar Outlook)</div>
        ${next5List.slice(0, 4).map((act) => `
          <div class="row" style="border-bottom: 1px dotted #e2e8f0;">
            <span style="font-weight: 700; color: #475569;">${act.date}</span>
            <span>${act.activity}</span>
          </div>
        `).join('')}
        ` : ''}

        ${isSectionVisible(d.show_cleaning) && d.cleaning_group ? `
        <div class="card-title" style="margin-top: 6pt;">Building Cleaning</div>
        <div class="row"><span class="label">Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<div style="font-size: 6.5pt; color: #64748b; font-style: italic;">${d.cleaning_instructions}</div>` : ''}
        ` : ''}

        ${isSectionVisible(d.show_birthdays) && d.birthdays ? `
        <!-- Birthday Celebrants Special Frame -->
        <div style="margin-top: 6pt; background: #fffdf5; border: 1.5px solid #fbbf24; border-radius: 3pt; padding: 4pt 6pt;">
          <div style="font-weight: 700; font-size: 7.5pt; color: #92400e; margin-bottom: 2pt;">🎂 Celebrants This Week</div>
          <div style="font-size: 7.5pt; color: #78350f; font-weight: 600;">${d.birthdays}</div>
          ${d.birthday_message ? `<div style="font-size: 6.5pt; color: #a16207; font-style: italic; margin-top: 2pt;">${d.birthday_message}</div>` : ''}
        </div>
        ` : ''}
      </div>
      <div>
        <div style="font-size: 6.5pt; color: #64748b; text-align: center; font-style: italic; margin-bottom: 4pt;">
          This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
        </div>
        <div class="page-number">Page 4 • Back Cover</div>
      </div>
    </div>

    <!-- PAGE 1 (FRONT COVER): Ward Name, Title, Date, Scripture -->
    <div class="booklet-page" style="text-align: center; justify-content: center; background: ${theme.bgLight};">
      <div style="margin: auto 0;">
        <div style="font-size: 16pt; font-family: 'Times New Roman', serif; font-weight: 800; color: ${theme.primaryColor}; letter-spacing: 1px; text-transform: uppercase;">
          ${unitTitle}
        </div>
        <div style="font-size: 9pt; font-weight: 800; color: ${theme.secondaryColor}; letter-spacing: 2px; text-transform: uppercase; margin-top: 2pt;">
          WEEKLY WARD BULLETIN
        </div>
        <div style="font-size: 8.5pt; font-style: italic; color: #475569; font-family: Georgia, serif; margin-top: 2pt;">
          ${weekRange.rangeLabel}
        </div>
        
        <div style="margin: 16pt 0; padding: 10pt; border-top: 2px solid ${theme.secondaryColor}; border-bottom: 2px solid ${theme.secondaryColor};">
          <h1 style="font-size: 14pt; color: ${theme.primaryColor}; margin: 0; font-weight: 800;">SACRAMENT MEETING</h1>
        </div>

        ${d.theme ? `<div style="font-size: 9pt; font-style: italic; color: #334155; margin-bottom: 10pt;">"${d.theme}"</div>` : ''}

        ${isSectionVisible(d.show_focus) && d.scripture_of_the_week ? `
        <div style="font-size: 7.5pt; color: #475569; font-style: italic; max-width: 180pt; margin: 0 auto;">
          ${d.scripture_of_the_week}
        </div>
        ` : ''}
      </div>
      <div class="page-number">Page 1 • Front Cover</div>
    </div>
  </div>

  <!-- SHEET 2: Inside Spread (Left: Page 2 Sacrament Outline | Right: Page 3 CFM & Message) -->
  <div class="page-sheet">
    <!-- PAGE 2: Sacrament Meeting Program -->
    <div class="booklet-page">
      <div>
        ${isSectionVisible(d.show_sacrament) ? `
        <div class="card-title">
          <span>Order of Worship</span>
          <span style="font-size: 7pt; background: ${theme.badgeBg}; color: ${theme.badgeText}; padding: 1pt 4pt; border-radius: 2pt; font-weight: 700;">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn:</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation:</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn:</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 3pt 5pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 3pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies:</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 4pt 0; border-top: 1px dotted #e2e8f0; padding-top: 3pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 2pt; font-size: 7.5pt;">Talks:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker:' : `Speaker ${idx + 1}:`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : d.speakers ? `
        <div class="row">
          <span class="label">Talks:</span>
          <span class="value" style="white-space: pre-line;">${d.speakers}</span>
        </div>
        ` : ''}

        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn:</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction:</span><span class="value">${d.closing_prayer}</span></div>` : ''}
        ` : ''}
      </div>
      <div class="page-number">Page 2 • Sacrament Program</div>
    </div>

    <!-- PAGE 3: Come Follow Me & Bishopric Message -->
    <div class="booklet-page">
      <div>
        ${isSectionVisible(d.show_focus) && (d.cfm_reading || d.cfm_theme) ? `
        <div class="card-title">Come, Follow Me Study Guide</div>
        <div style="font-weight: 700; font-size: 8pt; color: ${theme.primaryColor}; margin-bottom: 2pt;">${d.cfm_reading}${d.cfm_theme ? ` — ${d.cfm_theme}` : ''}</div>
        ${d.cfm_introduction ? `<div style="font-size: 7pt; color: #334155; font-style: italic; margin-bottom: 2.5pt; line-height: 1.25;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7pt; color: #334155; margin-bottom: 2.5pt; white-space: pre-line; line-height: 1.25;"><strong>Ideas:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 7pt; color: #92400e; margin-bottom: 3pt; background: #fef9c3; padding: 2pt 4pt; border-radius: 2pt;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 6.5pt; color: ${theme.secondaryColor}; margin-bottom: 4pt;"><strong>Link:</strong> <a href="${d.cfm_url}" style="color: ${theme.primaryColor};">${d.cfm_url}</a></div>` : ''}
        ` : ''}

        ${isSectionVisible(d.show_bishopric) && d.bishopric_message ? `
        <div class="card-title" style="margin-top: 4pt;">Message from the Bishopric</div>
        <div style="font-size: 7.5pt; line-height: 1.3; color: #334155; white-space: pre-line;">${d.bishopric_message}</div>
        ` : ''}
      </div>
      <div class="page-number">Page 3 • Study & Message</div>
    </div>
  </div>
</body>
</html>`;
}
