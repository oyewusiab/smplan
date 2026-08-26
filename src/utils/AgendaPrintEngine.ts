/**
 * Stand Agenda 2-Page Letter/A4 Print & PDF Generator
 * Exactly replicates the official LDS Sacrament Meeting Agenda & Business Sheet layout.
 * Strictly formatted to guarantee an exact 2-Page fit with zero bleeding into page 3.
 */

import { format } from 'date-fns';
import type {
  Agenda, SpeakerItem, ReleaseItem, SustainingItem, OrdinationItem,
  AdvancementItem, BabyBlessingItem, BaptismItem, ConfirmationBestowalItem, FellowshipItem
} from '../types';

export function parseSpeakersList(raw: unknown): SpeakerItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: String(item.name || ''),
          topic: String(item.topic || ''),
          scripture_ref: String(item.scripture_ref || ''),
          minutes: Number(item.minutes) || 10,
          gender: item.gender || '',
        };
      }
      const str = String(item || '');
      const parts = str.split(/[—–-]/);
      return {
        name: parts[0]?.trim() || '',
        topic: parts[1]?.trim() || '',
        scripture_ref: parts[2]?.trim() || '',
        gender: '',
      };
    });
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseSpeakersList(parsed);
    } catch {}

    return raw
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((line) => {
        const parts = line.split(/[—–-]/);
        return {
          name: parts[0]?.trim() || '',
          topic: parts[1]?.trim() || '',
          scripture_ref: parts[2]?.trim() || '',
          gender: '',
        };
      });
  }

  return [];
}

export function parseStructuredOrLines<T>(raw: unknown, mapper: (item: any) => T): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => mapper(item));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((item) => mapper(item));
    } catch {}

    return raw
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((l) => l.length > 0)
      .map((item) => mapper(item));
  }

  return [];
}

export function generateStandAgendaHtml(agenda: Agenda): string {
  const formattedDate = agenda.date ? format(new Date(agenda.date), 'dd-MMM-yyyy') : '';
  const meetingType = agenda.type_of_meeting || 'SACRAMENT';
  const isFastSunday = meetingType === 'FAST_SUNDAY';

  const speakers = parseSpeakersList(agenda.speakers);

  // Parse Announcements (slots 1 to 6)
  const rawAnn = parseStructuredOrLines<string>(agenda.announcements, (item) => String(item || ''));
  const announcements = ['', '', '', '', '', ''];
  rawAnn.forEach((item, i) => {
    if (i < 6) announcements[i] = item;
  });

  // Business: Releases (6 rows)
  const rawRel = parseStructuredOrLines<ReleaseItem>(agenda.releases, (item) => {
    if (typeof item === 'object' && item !== null) {
      return { name: String(item.name || ''), calling: String(item.calling || '') };
    }
    const str = String(item || '');
    const parts = str.split(/released as/i);
    return { name: parts[0]?.trim() || str, calling: parts[1]?.trim() || '' };
  });
  const releases: ReleaseItem[] = Array.from({ length: 6 }, (_, i) => rawRel[i] || { name: '', calling: '' });

  // Business: Calls (6 rows)
  const rawCalls = parseStructuredOrLines<SustainingItem>(agenda.calls, (item) => {
    if (typeof item === 'object' && item !== null) {
      return { name: String(item.name || ''), calling: String(item.calling || '') };
    }
    const str = String(item || '');
    const parts = str.split(/called as/i);
    return { name: parts[0]?.trim() || str, calling: parts[1]?.trim() || '' };
  });
  const calls: SustainingItem[] = Array.from({ length: 6 }, (_, i) => rawCalls[i] || { name: '', calling: '' });

  // Baptisms of record (4 slots)
  const rawBap = parseStructuredOrLines<BaptismItem>(agenda.baptized_children, (item) => {
    if (typeof item === 'object' && item !== null) return { name: String(item.name || '') };
    return { name: String(item || '') };
  });
  const baptizedChildren: BaptismItem[] = Array.from({ length: 4 }, (_, i) => rawBap[i] || { name: '' });

  // Aaronic Priesthood Ordinations (4 rows)
  const rawOrd = parseStructuredOrLines<OrdinationItem>(agenda.aaronic_ordinations, (item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        name: String(item.name || ''),
        office: String(item.office || ''),
        ordained_by: String(item.ordained_by || ''),
        ordained_by_office: String(item.ordained_by_office || '')
      };
    }
    return { name: String(item || ''), office: '', ordained_by: '', ordained_by_office: '' };
  });
  const ordinations: OrdinationItem[] = Array.from({ length: 4 }, (_, i) => rawOrd[i] || { name: '', office: '', ordained_by: '', ordained_by_office: '' });

  // Aaronic Priesthood Advancements (4 rows)
  const rawAdv = parseStructuredOrLines<AdvancementItem>(agenda.aaronic_advancements, (item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        name: String(item.name || ''),
        from_office: String(item.from_office || ''),
        to_office: String(item.to_office || ''),
        ordained_by: String(item.ordained_by || ''),
        ordained_by_office: String(item.ordained_by_office || '')
      };
    }
    return { name: String(item || ''), from_office: '', to_office: '', ordained_by: '', ordained_by_office: '' };
  });
  const advancements: AdvancementItem[] = Array.from({ length: 4 }, (_, i) => rawAdv[i] || { name: '', from_office: '', to_office: '', ordained_by: '', ordained_by_office: '' });

  // Advancements & Achievements (4 slots)
  const rawAch = parseStructuredOrLines<string>(agenda.achievements, (item) => String(item || ''));
  const achievements: string[] = Array.from({ length: 4 }, (_, i) => rawAch[i] || '');

  // Baby Blessings (4 rows)
  const rawBabies = parseStructuredOrLines<BabyBlessingItem>(agenda.babies || agenda.naming_blessing, (item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        baby_name: String(item.baby_name || ''),
        family: String(item.family || ''),
        blessed_by: String(item.blessed_by || ''),
        blessed_by_office: String(item.blessed_by_office || '')
      };
    }
    return { baby_name: String(item || ''), family: '', blessed_by: '', blessed_by_office: '' };
  });
  const babies: BabyBlessingItem[] = Array.from({ length: 4 }, (_, i) => rawBabies[i] || { baby_name: '', family: '', blessed_by: '', blessed_by_office: '' });

  // Confirmation & Bestowal (6 rows)
  const rawConf = parseStructuredOrLines<ConfirmationBestowalItem>(agenda.confirmations || agenda.confirmation_bestowal, (item) => {
    if (typeof item === 'object' && item !== null) {
      return {
        name: String(item.name || ''),
        confirmed_by: String(item.confirmed_by || ''),
        office: String(item.office || '')
      };
    }
    return { name: String(item || ''), confirmed_by: '', office: '' };
  });
  const confirmations: ConfirmationBestowalItem[] = Array.from({ length: 6 }, (_, i) => rawConf[i] || { name: '', confirmed_by: '', office: '' });

  // Receive into fellowship (8 slots)
  const rawFel = parseStructuredOrLines<FellowshipItem>(agenda.fellowships, (item) => {
    if (typeof item === 'object' && item !== null) return { name: String(item.name || '') };
    return { name: String(item || '') };
  });
  const fellowships: FellowshipItem[] = Array.from({ length: 8 }, (_, i) => rawFel[i] || { name: '' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sacrament Meeting Agenda — ${agenda.date || ''}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 8mm 10mm 6mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      line-height: 1.25;
      font-size: 8.5pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-container {
      width: 100%;
      height: 264mm;
      max-height: 264mm;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1.5px solid #000000;
      padding: 7px 10px 6px 10px;
    }

    .page-container:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* TYPOGRAPHY & HEADINGS */
    .doc-title {
      text-align: center;
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .table-bordered {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .table-bordered th,
    .table-bordered td {
      border: 1px solid #000000;
      padding: 2px 4px;
      font-size: 8pt;
      vertical-align: middle;
    }

    .checkbox-box {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 1px solid #000;
      margin-right: 3px;
      vertical-align: middle;
      text-align: center;
      line-height: 9px;
      font-size: 8pt;
      font-weight: bold;
    }

    /* SERVICE ROWS */
    .service-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: 8pt;
    }
    .sr-label {
      font-weight: 700;
      white-space: nowrap;
      margin-right: 4px;
    }
    .sr-line {
      flex: 1;
      border-bottom: 1px solid #000000;
      min-height: 12px;
      padding: 0 4px;
      font-weight: 600;
      margin-right: 6px;
      color: #0f172a;
    }
    .sr-time {
      display: flex;
      width: 60px;
      gap: 3px;
      shrink: 0;
    }
    .sr-time-box {
      width: 28px;
      height: 13px;
      border-bottom: 1px solid #000000;
      text-align: center;
      font-size: 7.5pt;
    }

    .time-header-bar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 2px;
    }
    .time-header-inner {
      width: 60px;
      display: flex;
      gap: 3px;
      text-align: center;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .time-header-inner > div {
      width: 28px;
      border-bottom: 1px solid #000;
    }

    .banner-bar {
      border-top: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      text-align: center;
      font-weight: 800;
      font-size: 8.5pt;
      text-transform: uppercase;
      padding: 2.5px 0;
      margin: 4px 0 3px 0;
    }

    .italic-note {
      font-size: 7pt;
      font-style: italic;
      color: #334155;
      margin-bottom: 2px;
    }

    .f-and-t-watermark-box {
      border: 1px dashed #000000;
      border-radius: 4px;
      height: 185px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4px 0;
      background: #ffffff;
    }
    .f-and-t-watermark {
      font-size: 28pt;
      font-weight: 800;
      color: #cbd5e1;
      letter-spacing: 4px;
      text-transform: uppercase;
      transform: rotate(-12deg);
    }

    /* BACK PAGE TABLES */
    .bg-black-header {
      background: #000000;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
      padding: 2px;
      font-size: 8pt;
      letter-spacing: 0.5px;
    }

    .sub-head-gray {
      background: #f1f5f9;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      text-align: center;
    }

    @media print {
      body { padding: 0; }
      .page-container {
        border: 1.5px solid #000 !important;
      }
    }
  </style>
</head>
<body>

  <!-- ========================================================================================= -->
  <!-- PAGE 1: SACRAMENT MEETING AGENDA                                                          -->
  <!-- ========================================================================================= -->
  <div class="page-container">
    <div>
      <div class="doc-title">SACRAMENT MEETING AGENDA</div>

      <!-- HEADER TOP 3-CELL BOX -->
      <table class="table-bordered" style="margin-bottom: 3px;">
        <tr>
          <td style="width: 38%;"><strong>Ward / Branch:</strong> ${agenda.ward_branch || ''}</td>
          <td style="width: 38%;"><strong>Stake / District:</strong> ${agenda.stake_district || ''}</td>
          <td style="width: 24%; text-align: right;"><strong>Date:</strong> ${formattedDate}</td>
        </tr>
      </table>

      <!-- TYPE CHECKBOXES -->
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <td style="padding: 3px 6px;">
            <span style="font-weight: 700; margin-right: 6px;">Type:</span>
            <span class="checkbox-box">${meetingType === 'SACRAMENT' ? '✓' : ''}</span> Sacrament Meeting &nbsp;&nbsp;
            <span class="checkbox-box">${meetingType === 'FAST_SUNDAY' ? '✓' : ''}</span> Fast & Testimony (F & T) &nbsp;&nbsp;
            <span class="checkbox-box">${meetingType === 'STAKE_CONFERENCE' ? '✓' : ''}</span> Stake/District Meeting &nbsp;&nbsp;
            <span class="checkbox-box">${meetingType === 'COMBINED' || meetingType === 'SPECIAL' ? '✓' : ''}</span> Ward/Branch Conference &nbsp;&nbsp;
            <span class="checkbox-box">${meetingType === 'OTHER' ? '✓' : ''}</span> Other (Specify): ${agenda.other_meeting_specify || '___________'}
          </td>
        </tr>
      </table>

      <!-- LEADERSHIP & MUSIC -->
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <td style="width: 58%; padding: 0; vertical-align: top;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #000;">
                <th style="width: 60%; font-size: 7.5pt; text-align: left; padding: 2px 4px;">Name</th>
                <th style="width: 40%; font-size: 7.5pt; text-align: left; padding: 2px 4px; border-left: 1px solid #000;">Position</th>
              </tr>
              <tr style="border-bottom: 1px solid #000;">
                <td style="padding: 2px 4px; font-size: 8pt;"><strong>Presiding:</strong> ${agenda.presiding || ''}</td>
                <td style="padding: 2px 4px; font-size: 8pt; border-left: 1px solid #000;">${agenda.presiding_position || ''}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; font-size: 8pt;"><strong>Conducting:</strong> ${agenda.conducting || ''}</td>
                <td style="padding: 2px 4px; font-size: 8pt; border-left: 1px solid #000;">${agenda.conducting_position || ''}</td>
              </tr>
            </table>
          </td>
          <td style="width: 42%; padding: 0; vertical-align: top; border-left: 1px solid #000;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #000;">
                <td style="padding: 2px 4px; font-size: 8pt;"><strong>Music Director:</strong> ${agenda.music_director || ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #000;">
                <td style="padding: 2px 4px; font-size: 8pt;"><strong>Choir Director:</strong> ${agenda.choir_director || ''}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; font-size: 8pt;"><strong>Organist:</strong> ${agenda.organist || ''}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- TIME HEADER BAR -->
      <div class="time-header-bar">
        <div class="time-header-inner">
          <div>each</div>
          <div>cum</div>
        </div>
      </div>

      <!-- ORDER OF SERVICE ROWS -->
      <div class="service-row">
        <span class="sr-label">Prelude Music (by choir or organ):</span>
        <div class="sr-line">${agenda.prelude_music || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Start time:</span>
        <div class="sr-line" style="flex: 0 0 100px;">${agenda.start_time || '9:00 AM'}</div>
        <div class="sr-line"></div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row" style="align-items: flex-start;">
        <span class="sr-label">Greetings, Welcome & Acknowledgements:</span>
        <div class="sr-line" style="font-size: 7.5pt; font-weight: normal; min-height: 24px;">
          ${agenda.greetings_welcome || 'We warmly welcome everyone, stake officers, friends of the church and those worshipping with us for the first time.'}
        </div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Announcements</span>
        <span style="font-size: 7.5pt; font-style: italic; color: #475569; margin-right: 4px;">(see reverse side)</span>
        <div class="sr-line"></div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Opening Hymn:</span>
        <div class="sr-line">${agenda.opening_hymn || ''}</div>
        <span class="sr-label">Hymn Number:</span>
        <div class="sr-line" style="flex: 0 0 55px; text-align: center;">${agenda.opening_hymn_number || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Opening Prayer:</span>
        <div class="sr-line">${agenda.opening_prayer || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Ward/Branch Business</span>
        <span style="font-size: 7.5pt; font-style: italic; color: #475569; margin-right: 4px;">(see reverse side)</span>
        <div class="sr-line">${agenda.ward_branch_business || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Stake/District Business (by):</span>
        <div class="sr-line">${agenda.stake_district_business || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Naming & Blessing of Children</span>
        <span style="font-size: 7.5pt; font-style: italic; color: #475569; margin-right: 4px;">(F & T only) (see reverse side)</span>
        <div class="sr-line">${agenda.naming_blessing || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Confirmation & Bestowal of the Holy Ghost</span>
        <span style="font-size: 7.5pt; font-style: italic; color: #475569; margin-right: 4px;">(see reverse side)</span>
        <div class="sr-line">${agenda.confirmation_bestowal || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Sacrament Hymn:</span>
        <div class="sr-line">${agenda.sacrament_hymn || ''}</div>
        <span class="sr-label">Hymn Number:</span>
        <div class="sr-line" style="flex: 0 0 55px; text-align: center;">${agenda.sacrament_hymn_number || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <!-- ADMINISTRATION AND PASSING OF THE SACRAMENT -->
      <div class="banner-bar">
        ADMINISTRATION AND PASSING OF THE SACRAMENT
      </div>

      <div class="service-row" style="margin-top: 2px;">
        <span class="sr-label">Special Music (if any, by choir - F & T only):</span>
        <div class="sr-line">${isFastSunday ? (agenda.special_music || '') : ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>
      <div class="italic-note">
        (Express gratitude to the priesthood brethren for administering and to the congregation for reverence maintained; also, to the choir)
      </div>

      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin: 3px 0 2px 0;">
        SPEAKERS, TESTIMONIES, HYMN, SPECIAL MUSIC (AS APPROPRIATE)
      </div>

      <!-- IF FAST & TESTIMONY -->
      ${isFastSunday ? `
        <div class="f-and-t-watermark-box">
          <div class="f-and-t-watermark">FAST AND TESTIMONY</div>
        </div>
      ` : `
        <!-- REGULAR SPEAKERS PROGRAM -->
        <div class="service-row">
          <span class="sr-label">Testimony/Talk (by):</span>
          <div class="sr-line">${speakers[0]?.name || ''}</div>
          <div class="sr-time"><div class="sr-time-box">${speakers[0]?.minutes ? speakers[0].minutes + 'm' : ''}</div><div class="sr-time-box"></div></div>
        </div>
        <div class="service-row" style="padding-left: 15px;">
          <span style="font-size: 7.5pt; color: #334155; margin-right: 4px;">Subject & references:</span>
          <div class="sr-line" style="font-size: 7.5pt; font-weight: normal;">
            ${speakers[0]?.topic || ''}${speakers[0]?.scripture_ref ? ` — Ref: ${speakers[0].scripture_ref}` : ''}
          </div>
          <div class="sr-time"></div>
        </div>

        <div class="service-row">
          <span class="sr-label">Testimony/Talk (by):</span>
          <div class="sr-line">${speakers[1]?.name || ''}</div>
          <div class="sr-time"><div class="sr-time-box">${speakers[1]?.minutes ? speakers[1].minutes + 'm' : ''}</div><div class="sr-time-box"></div></div>
        </div>
        <div class="service-row" style="padding-left: 15px;">
          <span style="font-size: 7.5pt; color: #334155; margin-right: 4px;">Subject & references:</span>
          <div class="sr-line" style="font-size: 7.5pt; font-weight: normal;">
            ${speakers[1]?.topic || ''}${speakers[1]?.scripture_ref ? ` — Ref: ${speakers[1].scripture_ref}` : ''}
          </div>
          <div class="sr-time"></div>
        </div>

        <div class="service-row">
          <span class="sr-label">Testimony/Talk (by):</span>
          <div class="sr-line">${speakers[2]?.name || ''}</div>
          <div class="sr-time"><div class="sr-time-box">${speakers[2]?.minutes ? speakers[2].minutes + 'm' : ''}</div><div class="sr-time-box"></div></div>
        </div>
        <div class="service-row" style="padding-left: 15px;">
          <span style="font-size: 7.5pt; color: #334155; margin-right: 4px;">Subject & references:</span>
          <div class="sr-line" style="font-size: 7.5pt; font-weight: normal;">
            ${speakers[2]?.topic || ''}${speakers[2]?.scripture_ref ? ` — Ref: ${speakers[2].scripture_ref}` : ''}
          </div>
          <div class="sr-time"></div>
        </div>

        <div class="service-row">
          <span class="sr-label">Special Music:</span>
          <div class="sr-line">${!isFastSunday ? (agenda.special_music || '') : ''}</div>
          <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
        </div>
        <div class="italic-note">
          (Non F & T meetings only; by choir or occasional by congregation-sung standing)<br>
          (Express gratitude to all those who have participated in the service thus far & to those who yet will; announce the rest of the program)
        </div>

        <div class="service-row">
          <span class="sr-label">Testimony/Talk (by):</span>
          <div class="sr-line">${speakers[3]?.name || ''}</div>
          <div class="sr-time"><div class="sr-time-box">${speakers[3]?.minutes ? speakers[3].minutes + 'm' : ''}</div><div class="sr-time-box"></div></div>
        </div>
        <div class="service-row" style="padding-left: 15px;">
          <span style="font-size: 7.5pt; color: #334155; margin-right: 4px;">Subject & references:</span>
          <div class="sr-line" style="font-size: 7.5pt; font-weight: normal;">
            ${speakers[3]?.topic || ''}${speakers[3]?.scripture_ref ? ` — Ref: ${speakers[3].scripture_ref}` : ''}
          </div>
          <div class="sr-time"></div>
        </div>
      `}

      <div class="italic-note" style="margin-top: 4px;">
        Note: To ensure ending on time closing Hymn should commence not later than <strong>8mins</strong> before the closing time of sacrament meeting
      </div>

      <div class="service-row">
        <span class="sr-label">Closing Hymn:</span>
        <div class="sr-line">${agenda.closing_hymn || ''}</div>
        <span class="sr-label">Hymn No:</span>
        <div class="sr-line" style="flex: 0 0 55px; text-align: center;">${agenda.closing_hymn_number || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Closing Prayer (by):</span>
        <div class="sr-line">${agenda.closing_prayer || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>

      <div class="service-row">
        <span class="sr-label">Postlude Music (by organ only; not by choir):</span>
        <div class="sr-line">${agenda.postlude_music || ''}</div>
        <div class="sr-time"><div class="sr-time-box"></div><div class="sr-time-box"></div></div>
      </div>
    </div>
  </div>

  <!-- ========================================================================================= -->
  <!-- PAGE 2: SACRAMENT MEETING BUSINESS SHEET                                                  -->
  <!-- ========================================================================================= -->
  <div class="page-container">
    <div>
      <!-- TOP ANNOTATION -->
      <div style="display: flex; justify-content: space-between; font-size: 7pt; font-style: italic; color: #475569; margin-bottom: 3px;">
        <span>Use additional sheet if necessary</span>
        <span>Sacrament Meeting business sheet</span>
      </div>

      <!-- 1. ANNOUNCEMENTS (2 COLUMNS x 3 ROWS) -->
      <div style="font-weight: 800; font-size: 8pt; text-transform: uppercase; margin-bottom: 2px;">
        ANNOUNCEMENTS
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <td style="width: 50%;"><strong>1.</strong> ${announcements[0]}</td>
          <td style="width: 50%;"><strong>4.</strong> ${announcements[3]}</td>
        </tr>
        <tr>
          <td><strong>2.</strong> ${announcements[1]}</td>
          <td><strong>5.</strong> ${announcements[4]}</td>
        </tr>
        <tr>
          <td><strong>3.</strong> ${announcements[2]}</td>
          <td><strong>6.</strong> ${announcements[5]}</td>
        </tr>
      </table>

      <!-- 2. BUSINESS: RELEASES & CALLS -->
      <div class="bg-black-header">BUSINESS</div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <th colspan="3" class="sub-head-gray" style="width: 50%;">RELEASES</th>
          <th colspan="3" class="sub-head-gray" style="width: 50%; border-left: 1.5px solid #000;">CALLS</th>
        </tr>
        <tr style="font-size: 7pt; text-align: left;">
          <th style="width: 20px; text-align: center;">#</th>
          <th style="width: 33%;">First Middle SURNAME</th>
          <th style="width: 15%;">AS</th>
          <th style="width: 20px; text-align: center; border-left: 1.5px solid #000;">#</th>
          <th style="width: 33%;">First Middle SURNAME</th>
          <th style="width: 15%;">AS</th>
        </tr>
        ${Array.from({ length: 6 }).map((_, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt;">${i + 1}</td>
            <td>${releases[i]?.name || ''}</td>
            <td>${releases[i]?.calling || ''}</td>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt; border-left: 1.5px solid #000;">${i + 1}</td>
            <td>${calls[i]?.name || ''}</td>
            <td>${calls[i]?.calling || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- 3. RECOGNITION OF NEWLY BAPTIZED CHILDREN OF RECORD -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        RECOGNITION OF NEWLY BAPTIZED CHILDREN OF RECORD
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <td style="width: 50%;"><strong>1.</strong> ${baptizedChildren[0]?.name || ''}</td>
          <td style="width: 50%;"><strong>3.</strong> ${baptizedChildren[2]?.name || ''}</td>
        </tr>
        <tr>
          <td><strong>2.</strong> ${baptizedChildren[1]?.name || ''}</td>
          <td><strong>4.</strong> ${baptizedChildren[3]?.name || ''}</td>
        </tr>
      </table>

      <!-- 4. AARONIC PRIESTHOOD ORDINATIONS -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        AARONIC PRIESTHOOD ORDINATIONS
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <th colspan="3" class="sub-head-gray" style="width: 50%;">Name of person to be ordained</th>
          <th colspan="2" class="sub-head-gray" style="width: 50%; border-left: 1.5px solid #000;">Ordained by</th>
        </tr>
        <tr style="font-size: 7pt;">
          <th style="width: 20px; text-align: center;">No</th>
          <th>First Middle SURNAME</th>
          <th style="width: 65px;">Office</th>
          <th style="border-left: 1.5px solid #000;">First Middle SURNAME</th>
          <th style="width: 65px;">Office</th>
        </tr>
        ${ordinations.map((o, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt;">${i + 1}</td>
            <td>${o.name || ''}</td>
            <td>${o.office || ''}</td>
            <td style="border-left: 1.5px solid #000;">${o.ordained_by || ''}</td>
            <td>${o.ordained_by_office || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- 5. AARONIC PRIESTHOOD ADVANCEMENTS -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        AARONIC PRIESTHOOD ADVANCEMENTS
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <th colspan="4" class="sub-head-gray" style="width: 50%;">Name of person to be ordained</th>
          <th colspan="2" class="sub-head-gray" style="width: 50%; border-left: 1.5px solid #000;">Ordained by</th>
        </tr>
        <tr style="font-size: 7pt;">
          <th style="width: 20px; text-align: center;">No</th>
          <th>First Middle SURNAME</th>
          <th style="width: 45px;">From</th>
          <th style="width: 45px;">To</th>
          <th style="border-left: 1.5px solid #000;">First Middle SURNAME</th>
          <th style="width: 65px;">Office</th>
        </tr>
        ${advancements.map((a, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt;">${i + 1}</td>
            <td>${a.name || ''}</td>
            <td>${a.from_office || ''}</td>
            <td>${a.to_office || ''}</td>
            <td style="border-left: 1.5px solid #000;">${a.ordained_by || ''}</td>
            <td>${a.ordained_by_office || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- 6. RECOGNITION OF ADVANCEMENTS & ACHIEVEMENTS -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        RECOGNITION OF ADVANCEMENTS & ACHIEVEMENTS
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr>
          <td style="width: 50%;"><strong>1.</strong> ${achievements[0]}</td>
          <td style="width: 50%;"><strong>3.</strong> ${achievements[2]}</td>
        </tr>
        <tr>
          <td><strong>2.</strong> ${achievements[1]}</td>
          <td><strong>4.</strong> ${achievements[3]}</td>
        </tr>
      </table>

      <!-- 7. NAMING & BLESSING OF NEWLY-BORN BABIES -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        NAMING & BLESSING OF NEWLY-BORN BABIES
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr style="font-size: 7pt;">
          <th style="width: 20px; text-align: center;">No</th>
          <th style="width: 25%;">Family</th>
          <th style="width: 35%;">Baby Name (SURNAME, First Middle)</th>
          <th style="width: 25%;">Blessed by</th>
          <th style="width: 15%;">Office</th>
        </tr>
        ${babies.map((b, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt;">${i + 1}</td>
            <td>${b.family || ''}</td>
            <td>${b.baby_name || ''}</td>
            <td>${b.blessed_by || ''}</td>
            <td>${b.blessed_by_office || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- 8. CONFIRMATION & BESTOWAL OF GIFT OF HOLY GHOST -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        CONFIRMATION & BESTOWAL OF GIFT OF HOLY GHOST
      </div>
      <table class="table-bordered" style="margin-bottom: 4px;">
        <tr style="font-size: 7pt;">
          <th style="width: 20px; text-align: center;">No</th>
          <th style="width: 48%;">Name to be Confirmed</th>
          <th style="width: 37%;">Confirmed by</th>
          <th style="width: 15%;">Office</th>
        </tr>
        ${confirmations.map((c, i) => `
          <tr>
            <td style="text-align: center; font-weight: bold; font-size: 7.5pt;">${i + 1}</td>
            <td>${c.name || ''}</td>
            <td>${c.confirmed_by || ''}</td>
            <td>${c.office || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- 9. RECEIVE INTO FELLOWSHIP -->
      <div style="font-weight: 800; font-size: 7.5pt; text-transform: uppercase; margin-bottom: 1px;">
        RECEIVE INTO FELLOWSHIP
      </div>
      <table class="table-bordered">
        <tr>
          <td style="width: 50%;"><strong>1.</strong> ${fellowships[0]?.name || ''}</td>
          <td style="width: 50%;"><strong>5.</strong> ${fellowships[4]?.name || ''}</td>
        </tr>
        <tr>
          <td><strong>2.</strong> ${fellowships[1]?.name || ''}</td>
          <td><strong>6.</strong> ${fellowships[5]?.name || ''}</td>
        </tr>
        <tr>
          <td><strong>3.</strong> ${fellowships[2]?.name || ''}</td>
          <td><strong>7.</strong> ${fellowships[6]?.name || ''}</td>
        </tr>
        <tr>
          <td><strong>4.</strong> ${fellowships[3]?.name || ''}</td>
          <td><strong>8.</strong> ${fellowships[7]?.name || ''}</td>
        </tr>
      </table>
    </div>
  </div>

</body>
</html>`;
}
