/**
 * Bulletin Print & PDF Generation Engine
 * File: bulletinPrintEngine.ts
 * 
 * Supports 3 Professional Church Layouts:
 * 1. Standard 1-Page A4 (High-density single-sheet program with auto-scaling)
 * 2. Standard 2-Page (Expanded order of service, CFM study guide, activities, next 5 outlook, & cleaning)
 * 3. Bi-Fold 4-Page Chapel Program Booklet (A4 Landscape 2-Sheet folded program)
 */

import { format, parseISO } from 'date-fns';
import { getBulletinTheme } from './bulletinThemes';
import type { Bulletin, SpeakerItem, WeeklyActivityItem, NextActivityItem } from '../types';

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
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);

  // Normalizing next 5 activities
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
      background: ${theme.primaryColor};
      color: #ffffff;
      padding: 8pt 12pt;
      border-radius: 4pt;
      text-align: center;
      margin-bottom: 6pt;
    }
    .header-ward { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; margin-bottom: 1.5pt; font-weight: 600; }
    .header h1 { margin: 0; font-size: 13pt; font-weight: 800; letter-spacing: 0.5px; }
    .header .date-row { font-size: 8.5pt; opacity: 0.95; margin-top: 2pt; }
    .header .theme-row { font-size: 8.5pt; font-style: italic; color: #fef08a; margin-top: 2pt; font-weight: 500; }

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
      padding: 6pt 8pt;
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
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 4pt 6pt;
      border-radius: 4pt;
      align-items: center;
    }
    .qr-box { display: flex; align-items: center; gap: 4pt; flex: 1; }
    .qr-code { width: 34pt; height: 34pt; flex-shrink: 0; }
    .qr-text { font-size: 6.5pt; color: #475569; line-height: 1.2; }

    .footer {
      margin-top: 6pt;
      border-top: 1px solid #e2e8f0;
      padding-top: 3pt;
      font-size: 6.5pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-ward">${d.unit_name || 'Latter-day Saint Ward'}${d.stake_name ? ` • ${d.stake_name}` : ''}</div>
    <h1>SACRAMENT MEETING BULLETIN</h1>
    <div class="date-row">${formattedDate}</div>
    ${d.theme ? `<div class="theme-row">"${d.theme}"</div>` : ''}
  </div>

  <div class="grid-container">
    <!-- Left Column: Sacrament Order & Come Follow Me -->
    <div class="column">
      ${d.show_sacrament ? `
      <div class="card">
        <div class="card-title">
          <span>Sacrament Meeting Outline</span>
          <span class="badge" style="background: #e0f2fe; color: #0369a1;">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">Administration of Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 3pt 5pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 3pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin-top: 3pt; border-top: 1px dotted #e2e8f0; padding-top: 3pt;">
          <div style="font-weight: 700; font-size: 7.5pt; color: #475569; margin-bottom: 2pt;">Speakers:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker' : `Speaker ${idx + 1}`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${d.special_music ? `<div class="row"><span class="label">Special Musical Item</span><span class="value">${d.special_music}</span></div>` : ''}
        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction (Closing Prayer)</span><span class="value">${d.closing_prayer}</span></div>` : ''}
      </div>
      ` : ''}

      ${d.show_focus && (d.cfm_reading || d.cfm_theme) ? `
      <!-- Complete 6-Field CFM Study Guide -->
      <div class="card" style="background: #fffdf5; border-color: #fde68a;">
        <div class="card-title" style="color: #92400e; border-color: #f59e0b;">
          <span>Come, Follow Me Study Guide</span>
          ${d.cfm_reading ? `<span class="badge" style="background: #fef3c7; color: #b45309;">${d.cfm_reading}</span>` : ''}
        </div>
        ${d.cfm_theme ? `<div style="font-weight: 700; font-size: 8pt; color: #78350f; margin-bottom: 2pt;">${d.cfm_theme}</div>` : ''}
        ${d.cfm_introduction ? `<div style="font-size: 7pt; color: #78350f; font-style: italic; margin-bottom: 2.5pt; line-height: 1.3;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7pt; color: #92400e; margin-bottom: 2.5pt; white-space: pre-line; line-height: 1.3;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 7.5pt; color: #92400e; margin-bottom: 2pt; background: #fef9c3; padding: 2.5pt 4pt; border-radius: 3pt; border-left: 2px solid #ca8a04;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 6.5pt; color: #b45309; margin-top: 1.5pt;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1; text-decoration: underline;">${d.cfm_url}</a></div>` : ''}
      </div>
      ` : ''}

      ${d.show_bishopric && d.bishopric_message ? `
      <div class="card">
        <div class="card-title">Message from the Bishopric</div>
        <p style="margin: 0; font-size: 7.5pt; line-height: 1.35; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}
    </div>

    <!-- Right Column: Birthdays, Activities, Next 5, Cleaning, Missionaries, QR -->
    <div class="column">
      ${d.show_birthdays && d.birthdays ? `
      <!-- Birthday Celebrants Special Frame & Design Pack -->
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

      ${d.show_activities && (d.activities || (d.activities_list && d.activities_list.length > 0)) ? `
      <!-- Weekly Activities Schedule (Monday - Sunday) -->
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

      ${next5List.length > 0 ? `
      <!-- Next 5 Activities (Auto-Generated Outlook) -->
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

      ${d.show_cleaning && d.cleaning_group ? `
      <div class="card" style="background: #f8fafc;">
        <div class="card-title">Building Cleaning Assignment</div>
        <div class="row"><span class="label">Assigned Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date & Time</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<div style="font-size: 6.5pt; color: #64748b; margin-top: 2pt; font-style: italic;">${d.cleaning_instructions}</div>` : ''}
      </div>
      ` : ''}

      ${d.show_missionary && d.missionaries ? `
      <div class="card">
        <div class="card-title">Full-Time Missionaries</div>
        <div style="font-size: 7.5pt; color: #334155; white-space: pre-line;">${d.missionaries}</div>
      </div>
      ` : ''}

      ${d.show_qr ? `
      <!-- Dual Digital QR Codes: FamilySearch + Gospel Library -->
      <div class="card" style="padding: 4pt 6pt;">
        <div class="qr-dual-container">
          <div class="qr-box">
            <img class="qr-code" src="https://quickchart.io/qr?text=${encodeURIComponent(d.qr_familysearch || 'https://www.familysearch.org')}&size=120&margin=1" alt="FS" />
            <div class="qr-text">
              <strong>FamilySearch:</strong><br/>
              Scan for Family Tree & Ancestor records.
            </div>
          </div>
          <div class="qr-box">
            <img class="qr-code" src="https://quickchart.io/qr?text=${encodeURIComponent(d.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library')}&size=120&margin=1" alt="GL" />
            <div class="qr-text">
              <strong>Gospel Library:</strong><br/>
              Scan for digital hymns, manuals & study.
            </div>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    ${d.unit_name || 'Latter-day Saint Ward'} • Published for Sunday Worship • Visitors & Friends Always Welcome
  </div>
</body>
</html>`;
}

/**
 * 2. Standard 2-Page Detailed Layout (Complete Spread with All Sections)
 */
export function generateStandard2PageHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);
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
      background: ${theme.primaryColor};
      color: #ffffff;
      padding: 14pt;
      border-radius: 6pt;
      text-align: center;
      margin-bottom: 12pt;
    }
    .header-ward { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; font-weight: 600; }
    .header h1 { margin: 3pt 0 0; font-size: 16pt; font-weight: 800; }
    .header .date-row { font-size: 9.5pt; opacity: 0.95; margin-top: 3pt; }
    .header .theme-row { font-size: 10pt; font-style: italic; color: #fef08a; margin-top: 4pt; }

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
      border-top: 1px solid #e2e8f0;
      padding-top: 5pt;
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Sacrament Program & Complete Come Follow Me Study Guide -->
  <div class="page page-break">
    <div>
      <div class="header">
        <div class="header-ward">${d.unit_name || 'Latter-day Saint Ward'}${d.stake_name ? ` • ${d.stake_name}` : ''}</div>
        <h1>SACRAMENT MEETING PROGRAM</h1>
        <div class="date-row">${formattedDate}</div>
        ${d.theme ? `<div class="theme-row">"${d.theme}"</div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">
          <span>Order of Service</span>
          <span style="font-size: 8pt; background: #e0f2fe; color: #0369a1; padding: 2pt 6pt; border-radius: 4pt; font-weight: 700;">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony Meeting' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">Administration of the Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 6pt 10pt; border-radius: 4pt; border-left: 3px solid #16a34a; margin: 6pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by the Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 6pt 0; border-top: 1px dotted #e2e8f0; padding-top: 6pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 3pt; font-size: 8.5pt;">Speakers:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker' : `Speaker ${idx + 1}`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${d.special_music ? `<div class="row"><span class="label">Special Music</span><span class="value">${d.special_music}</span></div>` : ''}
        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction (Closing Prayer)</span><span class="value">${d.closing_prayer}</span></div>` : ''}
      </div>

      ${d.show_focus && (d.cfm_reading || d.cfm_theme) ? `
      <!-- Complete 6-Field CFM Study Guide -->
      <div class="card" style="background: #fffdf5; border-color: #fde68a;">
        <div class="card-title" style="color: #92400e; border-color: #f59e0b;">
          <span>Come, Follow Me Study Guide</span>
          ${d.cfm_reading ? `<span style="background: #fef3c7; color: #b45309; padding: 2pt 6pt; border-radius: 4pt; font-size: 8pt; font-weight: 700;">${d.cfm_reading}</span>` : ''}
        </div>
        ${d.cfm_theme ? `<p style="font-weight: 700; color: #78350f; margin: 0 0 3pt; font-size: 9.5pt;">${d.cfm_theme}</p>` : ''}
        ${d.cfm_introduction ? `<p style="font-style: italic; color: #78350f; margin: 0 0 5pt; font-size: 8.5pt; line-height: 1.35;">${d.cfm_introduction}</p>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 8.5pt; color: #92400e; margin: 0 0 5pt; white-space: pre-line; line-height: 1.35;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="color: #92400e; margin: 0 0 5pt; background: #fef9c3; padding: 5pt 8pt; border-radius: 4pt; border-left: 3px solid #ca8a04; font-size: 8.5pt;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<p style="font-size: 8pt; color: #b45309; margin: 3pt 0 0;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1; text-decoration: underline;">${d.cfm_url}</a></p>` : ''}
      </div>
      ` : ''}
    </div>

    <div class="footer">Page 1 of 2 • ${d.unit_name || 'Ward Bulletin'} • Sacrament Worship</div>
  </div>

  <!-- PAGE 2: Community, Birthdays, Weekly Activities, Next 5, Cleaning & Missionaries -->
  <div class="page">
    <div>
      ${d.show_birthdays && d.birthdays ? `
      <!-- Birthday Celebrants Special Frame & Design Pack -->
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

      ${d.show_activities && (d.activities || (d.activities_list && d.activities_list.length > 0)) ? `
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

      ${next5List.length > 0 ? `
      <!-- Next 5 Activities (Auto-Generated Outlook) -->
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

      ${d.show_bishopric && d.bishopric_message ? `
      <div class="card">
        <div class="card-title">Message from the Bishopric</div>
        <p style="margin: 0; line-height: 1.45; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8pt;">
        ${d.show_cleaning && d.cleaning_group ? `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">Building Cleaning</div>
          <div class="row"><span class="label">Group:</span><span class="value">${d.cleaning_group}</span></div>
          <div class="row"><span class="label">Date:</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
          ${d.cleaning_instructions ? `<p style="font-size: 7.5pt; color: #64748b; margin: 3pt 0 0; font-style: italic;">${d.cleaning_instructions}</p>` : ''}
        </div>
        ` : '<div></div>'}

        ${d.show_missionary && d.missionaries ? `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-title">Full-Time Missionaries</div>
          <div style="white-space: pre-line; font-size: 8pt; color: #334155;">${d.missionaries}</div>
        </div>
        ` : '<div></div>'}
      </div>
    </div>

    <div class="footer">Page 2 of 2 • ${d.unit_name || 'Ward Bulletin'} • Digital & Print Edition</div>
  </div>
</body>
</html>`;
}

/**
 * 3. Bi-Fold 4-Page Chapel Program Booklet (2 Landscape Spread Sheets)
 */
export function generateBiFoldBookletHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);
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

        ${next5List.length > 0 ? `
        <div class="card-title" style="margin-top: 6pt;">Next 5 Activities (Calendar Outlook)</div>
        ${next5List.slice(0, 4).map((act) => `
          <div class="row" style="border-bottom: 1px dotted #e2e8f0;">
            <span style="font-weight: 700; color: #475569;">${act.date}</span>
            <span>${act.activity}</span>
          </div>
        `).join('')}
        ` : ''}

        ${d.cleaning_group ? `
        <div class="card-title" style="margin-top: 6pt;">Building Cleaning</div>
        <div class="row"><span class="label">Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<div style="font-size: 6.5pt; color: #64748b; font-style: italic;">${d.cleaning_instructions}</div>` : ''}
        ` : ''}

        ${d.birthdays ? `
        <!-- Birthday Celebrants Special Frame -->
        <div style="margin-top: 6pt; background: #fffdf5; border: 1.5px solid #fbbf24; border-radius: 3pt; padding: 4pt 6pt;">
          <div style="font-weight: 700; font-size: 7.5pt; color: #92400e; margin-bottom: 2pt;">🎂 Celebrants This Week</div>
          <div style="font-size: 7.5pt; color: #78350f; font-weight: 600;">${d.birthdays}</div>
          ${d.birthday_message ? `<div style="font-size: 6.5pt; color: #a16207; font-style: italic; margin-top: 2pt;">${d.birthday_message}</div>` : ''}
        </div>
        ` : ''}
      </div>
      <div class="page-number">Page 4 • Back Cover</div>
    </div>

    <!-- PAGE 1 (FRONT COVER): Ward Name, Title, Date, Scripture -->
    <div class="booklet-page" style="text-align: center; justify-content: center; background: ${theme.bgLight};">
      <div style="margin: auto 0;">
        <div style="font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: ${theme.primaryColor}; font-weight: 700;">
          The Church of Jesus Christ of Latter-day Saints
        </div>
        <div style="font-size: 10pt; color: #475569; margin-top: 3pt; font-weight: 600;">${d.unit_name || 'Ward Meetinghouse'}${d.stake_name ? ` • ${d.stake_name}` : ''}</div>
        
        <div style="margin: 16pt 0; padding: 10pt; border-top: 2px solid ${theme.secondaryColor}; border-bottom: 2px solid ${theme.secondaryColor};">
          <h1 style="font-size: 15pt; color: ${theme.primaryColor}; margin: 0; font-weight: 800;">SACRAMENT MEETING</h1>
          <div style="font-size: 9.5pt; font-weight: 600; color: #0f172a; margin-top: 3pt;">${formattedDate}</div>
        </div>

        ${d.theme ? `<div style="font-size: 9.5pt; font-style: italic; color: #334155; margin-bottom: 10pt;">"${d.theme}"</div>` : ''}

        ${d.scripture_of_the_week ? `
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
        <div class="card-title">
          <span>Order of Worship</span>
          <span style="font-size: 7pt; background: #e0f2fe; color: #0369a1; padding: 1pt 4pt; border-radius: 2pt; font-weight: 700;">
            ${d.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
          </span>
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">The Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 3pt 5pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 3pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 4pt 0; border-top: 1px dotted #e2e8f0; padding-top: 3pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 2pt; font-size: 7.5pt;">Speakers:</div>
          ${speakers.map((sp, idx) => `
            <div class="row">
              <span class="label">${idx === 0 ? 'Youth Speaker' : `Speaker ${idx + 1}`}</span>
              <span class="value">${sp.name}${sp.topic ? ` — "${sp.topic}"` : ''}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${d.special_music ? `<div class="row"><span class="label">Special Music</span><span class="value">${d.special_music}</span></div>` : ''}
        ${d.closing_hymn ? `<div class="row"><span class="label">Closing Hymn</span><span class="value">${d.closing_hymn}</span></div>` : ''}
        ${d.closing_prayer ? `<div class="row"><span class="label">Benediction (Closing Prayer)</span><span class="value">${d.closing_prayer}</span></div>` : ''}
      </div>
      <div class="page-number">Page 2 • Sacrament Program</div>
    </div>

    <!-- PAGE 3: Come Follow Me & Bishopric Message -->
    <div class="booklet-page">
      <div>
        ${d.cfm_reading ? `
        <div class="card-title">Come, Follow Me Study Guide</div>
        <div style="font-weight: 700; font-size: 8pt; color: #78350f; margin-bottom: 2pt;">${d.cfm_reading}${d.cfm_theme ? ` — ${d.cfm_theme}` : ''}</div>
        ${d.cfm_introduction ? `<div style="font-size: 7pt; color: #78350f; font-style: italic; margin-bottom: 2.5pt; line-height: 1.25;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7pt; color: #92400e; margin-bottom: 2.5pt; white-space: pre-line; line-height: 1.25;"><strong>Ideas:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 7pt; color: #92400e; margin-bottom: 3pt; background: #fef9c3; padding: 2pt 4pt; border-radius: 2pt;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 6.5pt; color: #b45309; margin-bottom: 4pt;"><strong>Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1;">${d.cfm_url}</a></div>` : ''}
        ` : ''}

        ${d.bishopric_message ? `
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
