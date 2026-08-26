/**
 * Multi-Channel Print & Vector PDF Generator for SM Planner Weekly Bulletin
 * Supports:
 * 1. Standard 1-Page A4 (Compact vector layout)
 * 2. Standard 2-Page A4 (Expanded spacious layout)
 * 3. Bi-Fold 4-Page Chapel Program Booklet (2 Landscape pages for physical fold)
 */

import { format, parseISO } from 'date-fns';
import type { Bulletin } from '../types';
import { getBulletinTheme } from './bulletinThemes';

function safeDateFormat(dateStr?: string, fmt = 'EEEE, MMMM d, yyyy'): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? dateStr : format(d, fmt);
  } catch {
    return dateStr;
  }
}

function parseSpeakersArray(speakersRaw?: string): Array<{ name: string; topic?: string }> {
  if (!speakersRaw) return [];
  if (typeof speakersRaw === 'object' && Array.isArray(speakersRaw)) return speakersRaw;
  try {
    const parsed = JSON.parse(speakersRaw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return speakersRaw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => {
      const parts = l.split(/[—–-]/);
      return { name: parts[0]?.trim() || '', topic: parts[1]?.trim() || '' };
    });
}

/**
 * 1. Standard 1-Page A4 Layout
 */
export function generateStandard1PageA4Html(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ward Bulletin — ${d.date || 'Sacrament Meeting'}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
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
      padding: 10pt 14pt;
      border-radius: 4pt;
      text-align: center;
      margin-bottom: 8pt;
    }
    .header-ward { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 2pt; }
    .header h1 { margin: 0; font-size: 14pt; font-weight: 700; letter-spacing: 0.5px; }
    .header .date-row { font-size: 8.5pt; opacity: 0.95; margin-top: 3pt; }
    .header .theme-row { font-size: 9pt; font-style: italic; color: #fef08a; margin-top: 3pt; }

    .grid-container {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 10pt;
      align-items: start;
    }
    .column { display: flex; flex-direction: column; gap: 7pt; }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 4pt;
      padding: 7pt 9pt;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${theme.primaryColor};
      border-bottom: 1.5px solid ${theme.primaryColor};
      padding-bottom: 2.5pt;
      margin-bottom: 5pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 3pt; }
    .row .label { color: #64748b; font-weight: 500; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }

    .scripture-box {
      background: ${theme.bgLight};
      border-left: 3px solid ${theme.secondaryColor};
      padding: 5pt 7pt;
      border-radius: 2pt;
      font-style: italic;
      font-size: 8pt;
      color: #334155;
      margin-bottom: 6pt;
    }

    .badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 1pt 4pt;
      border-radius: 3pt;
      background: ${theme.badgeBg};
      color: ${theme.badgeText};
      text-transform: uppercase;
    }

    .celebrant-pill {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 2pt 5pt;
      border-radius: 3pt;
      margin: 1pt 2pt 1pt 0;
    }

    .activity-line {
      display: flex;
      gap: 4pt;
      font-size: 8pt;
      margin-bottom: 2.5pt;
      border-bottom: 1px dashed #f1f5f9;
      padding-bottom: 2pt;
    }
    .activity-day { font-weight: 700; color: ${theme.primaryColor}; width: 28pt; flex-shrink: 0; }
    .activity-text { flex-grow: 1; }

    .qr-container {
      display: flex;
      align-items: center;
      gap: 8pt;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 5pt 7pt;
      border-radius: 4pt;
    }
    .qr-code { width: 44pt; height: 44pt; flex-shrink: 0; }
    .qr-text { font-size: 7.5pt; color: #475569; }

    .footer {
      margin-top: 8pt;
      border-top: 1px solid #e2e8f0;
      padding-top: 4pt;
      font-size: 7pt;
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

  ${d.scripture_of_the_week && d.show_focus ? `
  <div class="scripture-box">
    <strong>Scripture Focus:</strong> ${d.scripture_of_the_week}
  </div>
  ` : ''}

  <div class="grid-container">
    <!-- Left Column: Sacrament Order & CFM -->
    <div class="column">
      ${d.show_sacrament ? `
      <div class="card">
        <div class="card-title">
          Sacrament Meeting Outline
          ${d.meeting_type === 'FAST_SUNDAY' ? `<span class="badge" style="background: #e0f2fe; color: #0369a1;">Fast & Testimony</span>` : ''}
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">Administration of Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 4pt 6pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 4pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin-top: 4pt; border-top: 1px dotted #e2e8f0; padding-top: 4pt;">
          <div style="font-weight: 700; font-size: 8pt; color: #475569; margin-bottom: 2pt;">Speakers:</div>
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
      <div class="card" style="background: #fffdf5; border-color: #fde68a;">
        <div class="card-title" style="color: #92400e; border-color: #f59e0b;">
          Come, Follow Me Study Guide
          ${d.cfm_reading ? `<span class="badge" style="background: #fef3c7; color: #b45309;">${d.cfm_reading}</span>` : ''}
        </div>
        ${d.cfm_theme ? `<div style="font-weight: 700; font-size: 8.5pt; color: #78350f; margin-bottom: 2.5pt;">${d.cfm_theme}</div>` : ''}
        ${d.cfm_introduction ? `<div style="font-size: 7.5pt; color: #78350f; font-style: italic; margin-bottom: 3pt; line-height: 1.35;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7.5pt; color: #92400e; margin-bottom: 3pt; white-space: pre-line; line-height: 1.35;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 8pt; color: #92400e; margin-bottom: 2.5pt; background: #fef9c3; padding: 3pt 5pt; border-radius: 3pt; border-left: 2px solid #ca8a04;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 7pt; color: #b45309; margin-top: 2pt;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1; text-decoration: underline;">${d.cfm_url}</a></div>` : ''}
      </div>
      ` : ''}

      ${d.show_bishopric && d.bishopric_message ? `
      <div class="card">
        <div class="card-title">Bishopric Message</div>
        <p style="margin: 0; font-size: 8pt; line-height: 1.4; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}
    </div>

    <!-- Right Column: Activities, Birthdays, Cleaning & QR -->
    <div class="column">
      ${d.show_birthdays && d.birthdays ? `
      <!-- Birthday Celebrants Special Frame & Design Pack -->
      <div class="card" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #fbbf24; box-shadow: 0 1px 3px rgba(245, 158, 11, 0.15);">
        <div class="card-title" style="color: #92400e; border-color: #d97706; display: flex; align-items: center; justify-content: space-between;">
          <span>🎂 Birthday Celebrants (This Week)</span>
          <span style="font-size: 7pt; background: #fbbf24; color: #78350f; padding: 1pt 4pt; border-radius: 3pt; font-weight: 700;">CELEBRATION</span>
        </div>
        <div style="margin-bottom: 4pt; display: flex; flex-wrap: wrap; gap: 3pt;">
          ${(d.birthdays || '').split(/[\n,]|   /).filter(Boolean).map(b => `<span class="celebrant-pill" style="background: #ffffff; border: 1px solid #fde68a; color: #92400e; font-weight: 700;">${b.trim()}</span>`).join('')}
        </div>
        ${d.birthday_message ? `<div style="font-size: 7.5pt; color: #92400e; font-style: italic; background: rgba(255,255,255,0.7); padding: 3pt 5pt; border-radius: 3pt;">${d.birthday_message}</div>` : ''}
      </div>
      ` : ''}

      ${d.show_activities && d.activities ? `
      <div class="card">
        <div class="card-title">Weekly Schedule (Mon–Sun)</div>
        ${(d.activities || '').split('\n').filter(Boolean).map(line => {
          const colonIdx = line.indexOf(':');
          const dayPart = colonIdx > -1 ? line.substring(0, colonIdx) : '•';
          const textPart = colonIdx > -1 ? line.substring(colonIdx + 1) : line;
          return `
            <div class="activity-line">
              <span class="activity-day">${dayPart}</span>
              <span class="activity-text">${textPart}</span>
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      ${d.show_cleaning && d.cleaning_group ? `
      <div class="card" style="background: #f8fafc;">
        <div class="card-title">Meetinghouse Cleaning Notice</div>
        <div class="row"><span class="label">Assigned Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date & Time</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<div style="font-size: 7.5pt; color: #64748b; margin-top: 3pt; font-style: italic;">${d.cleaning_instructions}</div>` : ''}
      </div>
      ` : ''}

      ${d.show_missionary && d.missionaries ? `
      <div class="card">
        <div class="card-title">Missionary Corner</div>
        <div style="font-size: 8pt; color: #334155; white-space: pre-line;">${d.missionaries}</div>
      </div>
      ` : ''}

      ${d.show_qr ? `
      <div class="card">
        <div class="card-title">Digital Ward Links & FamilySearch</div>
        <div class="qr-container">
          <img class="qr-code" src="https://quickchart.io/qr?text=${encodeURIComponent(d.qr_familysearch || d.qr_gospel_library || 'https://www.familysearch.org')}&size=150&margin=1" alt="QR" />
          <div class="qr-text">
            <strong>Scan on your phone:</strong><br />
            Access FamilySearch, digital hymns & gospel study resources.
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
 * 2. Standard 2-Page Detailed Layout
 */
export function generateStandard2PageHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Ward Bulletin (2-Page) — ${d.date}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break { page-break-after: always; break-after: page; }
    .page { padding: 0 0 10pt; min-height: 98%; display: flex; flex-direction: column; justify-content: space-between; }
    .header {
      background: ${theme.primaryColor};
      color: #ffffff;
      padding: 16pt;
      border-radius: 6pt;
      text-align: center;
      margin-bottom: 14pt;
    }
    .header-ward { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
    .header h1 { margin: 4pt 0 0; font-size: 18pt; font-weight: 700; }
    .header .date-row { font-size: 10pt; opacity: 0.95; margin-top: 4pt; }
    .header .theme-row { font-size: 11pt; font-style: italic; color: #fef08a; margin-top: 6pt; }

    .card {
      border: 1px solid #e2e8f0;
      border-radius: 6pt;
      padding: 10pt 14pt;
      background: #ffffff;
      margin-bottom: 12pt;
    }
    .card-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${theme.primaryColor};
      border-bottom: 2px solid ${theme.primaryColor};
      padding-bottom: 4pt;
      margin-bottom: 8pt;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 5pt; font-size: 9.5pt; }
    .row .label { color: #64748b; font-weight: 500; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }

    .scripture-banner {
      background: ${theme.bgLight};
      border-left: 4px solid ${theme.secondaryColor};
      padding: 8pt 12pt;
      border-radius: 4pt;
      font-style: italic;
      font-size: 9.5pt;
      margin-bottom: 14pt;
      color: #334155;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6pt;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Sacrament Program & CFM Study -->
  <div class="page page-break">
    <div>
      <div class="header">
        <div class="header-ward">${d.unit_name || 'Latter-day Saint Ward'} • ${d.stake_name || ''}</div>
      ${d.scripture_of_the_week ? `<div class="scripture-banner"><strong>Scripture of the Week:</strong> ${d.scripture_of_the_week}</div>` : ''}

      <div class="card">
        <div class="card-title">
          Order of Service
          ${d.meeting_type === 'FAST_SUNDAY' ? `<span style="font-size: 8pt; background: #e0f2fe; color: #0369a1; padding: 2pt 6pt; border-radius: 4pt; font-weight: 700; float: right;">Fast & Testimony Meeting</span>` : ''}
        </div>
        ${d.presiding ? `<div class="row"><span class="label">Presiding</span><span class="value">${d.presiding}</span></div>` : ''}
        ${d.conducting ? `<div class="row"><span class="label">Conducting</span><span class="value">${d.conducting}</span></div>` : ''}
        ${d.music_director ? `<div class="row"><span class="label">Music Director</span><span class="value">${d.music_director}</span></div>` : ''}
        ${d.organist ? `<div class="row"><span class="label">Organist / Pianist</span><span class="value">${d.organist}</span></div>` : ''}
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">Administration of the Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 6pt 10pt; border-radius: 4pt; border-left: 3px solid #16a34a; margin: 8pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by the Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 8pt 0; border-top: 1px dotted #e2e8f0; padding-top: 8pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 4pt;">Speakers:</div>
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
      <div class="card" style="background: #fffdf5; border-color: #fde68a;">
        <div class="card-title" style="color: #92400e; border-color: #f59e0b;">Come, Follow Me Study Guide — ${d.cfm_reading || ''}</div>
        ${d.cfm_theme ? `<p style="font-weight: 700; color: #78350f; margin: 0 0 4pt; font-size: 10pt;">${d.cfm_theme}</p>` : ''}
        ${d.cfm_introduction ? `<p style="font-style: italic; color: #78350f; margin: 0 0 6pt; font-size: 9pt; line-height: 1.4;">${d.cfm_introduction}</p>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 9pt; color: #92400e; margin: 0 0 6pt; white-space: pre-line; line-height: 1.4;"><strong>Ideas for Learning:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="color: #92400e; margin: 0 0 6pt; background: #fef9c3; padding: 6pt 8pt; border-radius: 4pt; border-left: 3px solid #ca8a04;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<p style="font-size: 8pt; color: #b45309; margin: 4pt 0 0;"><strong>Lesson Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1; text-decoration: underline;">${d.cfm_url}</a></p>` : ''}
      </div>
      ` : ''}
    </div>

    <div class="footer">Page 1 of 2 • ${d.unit_name || 'Ward Bulletin'}</div>
  </div>

  <!-- PAGE 2: Bishopric Message, Activities, Birthdays & Contacts -->
  <div class="page">
    <div>
      ${d.show_bishopric && d.bishopric_message ? `
      <div class="card">
        <div class="card-title">Bishopric Message</div>
        <p style="margin: 0; line-height: 1.5; color: #334155; white-space: pre-line;">${d.bishopric_message}</p>
      </div>
      ` : ''}

      ${d.show_birthdays && d.birthdays ? `
      <!-- Birthday Celebrants Special Frame & Design Pack -->
      <div class="card" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #fbbf24; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.15);">
        <div class="card-title" style="color: #92400e; border-color: #d97706; display: flex; justify-content: space-between; align-items: center;">
          <span>🎂 Birthday Celebrants (This Week)</span>
          <span style="font-size: 8pt; background: #fbbf24; color: #78350f; padding: 2pt 6pt; border-radius: 4pt; font-weight: 700;">CELEBRATION</span>
        </div>
        <div style="margin-bottom: 6pt; display: flex; flex-wrap: wrap; gap: 4pt;">
          ${(d.birthdays || '').split(/[\n,]|   /).filter(Boolean).map(b => `<span style="background: #ffffff; border: 1px solid #fde68a; color: #92400e; font-weight: 700; padding: 3pt 6pt; border-radius: 4pt; font-size: 9pt;">${b.trim()}</span>`).join('')}
        </div>
        ${d.birthday_message ? `<div style="font-style: italic; color: #92400e; background: rgba(255,255,255,0.7); padding: 4pt 8pt; border-radius: 4pt; font-size: 9pt;">${d.birthday_message}</div>` : ''}
      </div>
      ` : ''}

      ${d.show_activities && d.activities ? `
      <div class="card">
        <div class="card-title">Weekly Ward & Stake Schedule (Mon–Sun)</div>
        <div style="white-space: pre-line; line-height: 1.6;">${d.activities}</div>
      </div>
      ` : ''}

      ${d.show_cleaning && d.cleaning_group ? `
      <div class="card">
        <div class="card-title">Meetinghouse Cleaning Schedule</div>
        <div class="row"><span class="label">Assigned Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date & Time</span><span class="value">${safeDateFormat(d.cleaning_date)} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ${d.cleaning_instructions ? `<p style="font-size: 8.5pt; color: #64748b; margin-top: 4pt; font-style: italic;">${d.cleaning_instructions}</p>` : ''}
      </div>
      ` : ''}

      ${d.show_missionary && d.missionaries ? `
      <div class="card">
        <div class="card-title">Full-Time Missionaries</div>
        <div style="white-space: pre-line; color: #334155;">${d.missionaries}</div>
      </div>
      ` : ''}
    </div>

    <div class="footer">Page 2 of 2 • ${d.unit_name || 'Ward Bulletin'}</div>
  </div>
</body>
</html>`;
}

/**
 * 3. Bi-Fold 4-Page Chapel Program Booklet (2 Landscape Pages)
 */
export function generateBiFoldBookletHtml(d: Bulletin): string {
  const theme = getBulletinTheme(d.color_theme);
  const formattedDate = safeDateFormat(d.date);
  const speakers = parseSpeakersArray(d.speakers);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bi-Fold Ward Program Booklet — ${d.date}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-sheet {
      width: 100%;
      height: 98vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16mm;
      page-break-after: always;
      break-after: page;
      padding: 4mm;
    }
    .booklet-page {
      border: 1px dashed #cbd5e1;
      border-radius: 4pt;
      padding: 14pt;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }
    .page-number {
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4pt;
    }
    .card-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: ${theme.primaryColor};
      border-bottom: 1.5px solid ${theme.primaryColor};
      padding-bottom: 2pt;
      margin-bottom: 6pt;
    }
    .row { display: flex; justify-content: space-between; margin-bottom: 3pt; }
    .row .label { color: #64748b; }
    .row .value { font-weight: 600; text-align: right; color: #0f172a; }
  </style>
</head>
<body>
  <!-- SHEET 1: Outside Spread (Left: Page 4 Back Cover | Right: Page 1 Front Cover) -->
  <div class="page-sheet">
    <!-- PAGE 4 (BACK COVER): Activities, Cleaning & Birthdays -->
    <div class="booklet-page">
      <div>
        <div class="card-title">Weekly Schedule (Mon–Sun)</div>
        <div style="white-space: pre-line; font-size: 8pt; margin-bottom: 10pt;">${d.activities}</div>

        ${d.cleaning_group ? `
        <div class="card-title">Building Cleaning</div>
        <div class="row"><span class="label">Group</span><span class="value">${d.cleaning_group}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${safeDateFormat(d.cleaning_date, 'MMM d')} @ ${d.cleaning_time || '8:00 AM'}</span></div>
        ` : ''}

        ${d.birthdays ? `
        <!-- Birthday Celebrants Special Frame -->
        <div style="margin-top: 8pt; background: #fffdf5; border: 1.5px solid #fbbf24; border-radius: 4pt; padding: 6pt 8pt;">
          <div style="font-weight: 700; font-size: 8.5pt; color: #92400e; margin-bottom: 3pt;">🎂 Celebrants This Week</div>
          <div style="font-size: 8pt; color: #78350f; font-weight: 600;">${d.birthdays}</div>
          ${d.birthday_message ? `<div style="font-size: 7.5pt; color: #a16207; font-style: italic; margin-top: 3pt;">${d.birthday_message}</div>` : ''}
        </div>
        ` : ''}
      </div>
      <div class="page-number">Page 4 • Back Cover</div>
    </div>

    <!-- PAGE 1 (FRONT COVER): Ward Name, Title, Date, Scripture -->
    <div class="booklet-page" style="text-align: center; justify-content: center; background: ${theme.bgLight};">
      <div style="margin: auto 0;">
        <div style="font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; color: ${theme.primaryColor}; font-weight: 700;">
          The Church of Jesus Christ of Latter-day Saints
        </div>
        <div style="font-size: 11pt; color: #475569; margin-top: 4pt;">${d.unit_name || 'Ward Meetinghouse'}${d.stake_name ? ` • ${d.stake_name}` : ''}</div>
        
        <div style="margin: 20pt 0; padding: 12pt; border-top: 2px solid ${theme.secondaryColor}; border-bottom: 2px solid ${theme.secondaryColor};">
          <h1 style="font-size: 16pt; color: ${theme.primaryColor}; margin: 0;">SACRAMENT MEETING</h1>
          <div style="font-size: 10pt; font-weight: 600; color: #0f172a; margin-top: 4pt;">${formattedDate}</div>
        </div>

        ${d.theme ? `<div style="font-size: 10pt; font-style: italic; color: #334155; margin-bottom: 12pt;">"${d.theme}"</div>` : ''}

        ${d.scripture_of_the_week ? `
        <div style="font-size: 8pt; color: #475569; font-style: italic; max-width: 200pt; margin: 0 auto;">
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
          Order of Worship
          ${d.meeting_type === 'FAST_SUNDAY' ? `<span style="font-size: 7.5pt; background: #e0f2fe; color: #0369a1; padding: 1pt 4pt; border-radius: 3pt; font-weight: 700; float: right;">Fast & Testimony</span>` : ''}
        </div>
        ${d.opening_hymn ? `<div class="row"><span class="label">Opening Hymn</span><span class="value">${d.opening_hymn}</span></div>` : ''}
        ${d.opening_prayer ? `<div class="row"><span class="label">Invocation (Opening Prayer)</span><span class="value">${d.opening_prayer}</span></div>` : ''}
        <div class="row"><span class="label">Ward & Stake Business</span><span class="value">As Announced</span></div>
        ${d.sacrament_hymn ? `<div class="row"><span class="label">Sacrament Hymn</span><span class="value">${d.sacrament_hymn}</span></div>` : ''}
        <div class="row"><span class="label">The Sacrament</span><span class="value">Aaronic Priesthood</span></div>
        
        ${d.meeting_type === 'FAST_SUNDAY' ? `
        <div class="row" style="background: #f0fdf4; padding: 4pt 6pt; border-radius: 3pt; border-left: 2.5px solid #16a34a; margin: 4pt 0;">
          <span class="label" style="color: #15803d; font-weight: 700;">Testimonies</span>
          <span class="value" style="color: #166534;">Bearing of Testimonies by Congregation</span>
        </div>
        ` : speakers.length > 0 ? `
        <div style="margin: 6pt 0; border-top: 1px dotted #e2e8f0; padding-top: 4pt;">
          <div style="font-weight: 700; color: #475569; margin-bottom: 2pt;">Speakers:</div>
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
        <div style="font-weight: 700; font-size: 8.5pt; color: #78350f; margin-bottom: 2pt;">${d.cfm_reading}${d.cfm_theme ? ` — ${d.cfm_theme}` : ''}</div>
        ${d.cfm_introduction ? `<div style="font-size: 7.5pt; color: #78350f; font-style: italic; margin-bottom: 3pt; line-height: 1.3;">${d.cfm_introduction}</div>` : ''}
        ${d.cfm_ideas_for_learning ? `<div style="font-size: 7.5pt; color: #92400e; margin-bottom: 3pt; white-space: pre-line; line-height: 1.3;"><strong>Ideas:</strong><br/>${d.cfm_ideas_for_learning}</div>` : ''}
        ${d.cfm_reflection || d.cfm_discussion_question ? `<div style="font-size: 7.5pt; color: #92400e; margin-bottom: 4pt; background: #fef9c3; padding: 2pt 4pt; border-radius: 2pt;"><strong>Reflection:</strong> ${d.cfm_reflection || d.cfm_discussion_question}</div>` : ''}
        ${d.cfm_url ? `<div style="font-size: 7pt; color: #b45309; margin-bottom: 6pt;"><strong>Link:</strong> <a href="${d.cfm_url}" style="color: #0369a1;">${d.cfm_url}</a></div>` : ''}
        ` : ''}

        ${d.bishopric_message ? `
        <div class="card-title" style="margin-top: 6pt;">Bishopric Message</div>
        <div style="font-size: 8pt; line-height: 1.4; color: #334155; white-space: pre-line;">${d.bishopric_message}</div>
        ` : ''}
      </div>
      <div class="page-number">Page 3 • Study & Message</div>
    </div>
  </div>
</body>
</html>`;
}
