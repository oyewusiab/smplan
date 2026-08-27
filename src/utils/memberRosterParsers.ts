/**
 * Member Roster Parsers & Exporter Utilities
 * 
 * Features:
 * 1. Heuristic PDF Roster Text Extractor & Parser (extractTextFromPDF)
 * 2. Official LCR (Leader & Clerk Resources) / Member Tools CSV Parser (parseLcrCsv)
 * 3. Formatted CSV Exporter (exportMembersToCsv)
 * 4. Vector Printable HTML Roster Generator for PDF Export (generateRosterPrintHtml)
 */

import type { Member, MemberImportItem } from '../types';
import { getDynamicAge, normalizeBirthDate, formatBirthDateForStorage } from './memberAnalyticsEngine';

// ─── 1. PDF Text Stream Extraction ───────────────────────────────────────────

/**
 * Extracts raw ASCII & UTF-8 text from PDF raw bytes (ArrayBuffer).
 * Decodes text streams between BT ... ET markers and parenthesis/bracket strings.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let rawContent = '';

  // Decode bytes to text
  const decoder = new TextDecoder('latin1');
  rawContent = decoder.decode(bytes);

  const extractedLines: string[] = [];

  // Match PDF text objects: BT (Begin Text) ... ET (End Text)
  const btEtRegex = /BT[\s\S]*?ET/g;
  const blocks = rawContent.match(btEtRegex) || [];

  if (blocks.length > 0) {
    blocks.forEach(block => {
      // Find strings in parentheses: (Text) Tj or (Text) ' or (Text) "
      const tjMatches = block.match(/\(([^()]*)\)\s*T[jJ]/g) || [];
      tjMatches.forEach(tj => {
        const text = tj.replace(/^\(/, '').replace(/\)\s*T[jJ]$/, '').trim();
        if (text) extractedLines.push(unescapePdfString(text));
      });

      // Find text arrays: [(T) 20 (e) 10 (x) (t)] TJ
      const arrayMatches = block.match(/\[(.*?)\]\s*TJ/g) || [];
      arrayMatches.forEach(arr => {
        const innerStrings = arr.match(/\(([^()]*)\)/g) || [];
        const combined = innerStrings.map(s => s.replace(/^\(/, '').replace(/\)$/, '')).join('');
        if (combined.trim()) extractedLines.push(unescapePdfString(combined.trim()));
      });
    });
  }

  // Fallback: If BT...ET extraction was minimal, scan for general printable string tokens
  if (extractedLines.length < 5) {
    const stringLiterals = rawContent.match(/\(([a-zA-Z0-9\s,.\-+/@#():]{3,100})\)/g) || [];
    stringLiterals.forEach(lit => {
      const clean = lit.replace(/^\(/, '').replace(/\)$/, '').trim();
      if (clean && !clean.startsWith('/')) {
        extractedLines.push(clean);
      }
    });
  }

  return extractedLines.join('\n');
}

function unescapePdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Heuristically parses unstructured lines from a PDF or pasted text report into structured MemberImportItem objects.
 */
export function parseRosterTextLines(rawText: string, existingMembers: Member[] = []): MemberImportItem[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const items: MemberImportItem[] = [];

  const existingNamesSet = new Set(existingMembers.map(m => m.name.toLowerCase().trim()));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip headers and irrelevant lines
    if (
      line.toLowerCase().includes('page') ||
      line.toLowerCase().includes('confidential') ||
      line.toLowerCase().includes('church of jesus christ') ||
      line.toLowerCase().includes('ward directory') ||
      line.toLowerCase().includes('name\tage\tgender') ||
      line.length < 3
    ) {
      continue;
    }

    // Attempt to extract line tokens (tab, comma, or multi-space delimited)
    let parts = line.split(/\t+| {2,}|,/);
    if (parts.length < 2) {
      // Try space split if line looks like "Bro. Emmanuel O. 34 M 08033333333 Elders Quorum"
      parts = line.split(/\s+/);
    }

    // Name heuristic
    let name = '';
    let gender: 'M' | 'F' | '' = '';
    let age = 0;
    let phone = '';
    let email = '';
    let organisation = '';
    let birthDate = '';
    let calling = '';
    let status = 'ACTIVE';

    // Look for email in line
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) email = emailMatch[0];

    // Look for phone in line
    const phoneMatch = line.match(/(?:\+?\d{1,4}[ -]?)?\(?\d{3}\)?[ -]?\d{3,4}[ -]?\d{3,4}/);
    if (phoneMatch) phone = phoneMatch[0].trim();

    // Look for birth date (DD-MMM-YYYY, YYYY-MM-DD, DD-MMM)
    const bdayMatch = line.match(/\b(?:\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[A-Za-z]*[-/\s]+\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[A-Za-z]*)\b/i);
    if (bdayMatch) birthDate = bdayMatch[0];

    // Look for Gender M / F
    const genderMatch = line.match(/\b(Male|Female|M|F)\b/i);
    if (genderMatch) {
      const gStr = genderMatch[1].toUpperCase();
      gender = gStr.startsWith('F') ? 'F' : 'M';
    }

    // Look for Age
    const ageMatch = line.match(/\b(\d{1,3})\s*(?:yrs|years|yr|yo)?\b/i);
    if (ageMatch && !phone.includes(ageMatch[1])) {
      const parsedAge = parseInt(ageMatch[1], 10);
      if (parsedAge > 0 && parsedAge < 115) age = parsedAge;
    }

    // Organisation detection
    const orgs = ['Elders Quorum', 'Relief Society', 'Young Men', 'Young Women', 'Primary', 'Sunday School', 'Bishopric'];
    for (const org of orgs) {
      if (line.toLowerCase().includes(org.toLowerCase())) {
        organisation = org;
        break;
      }
    }

    // Extract Name: Take non-numeric beginning tokens
    const cleanedLine = line
      .replace(email, '')
      .replace(phone, '')
      .replace(birthDate, '')
      .replace(/\b(Male|Female|Active|Less-Active|Moved|Visitor)\b/gi, '')
      .replace(organisation, '')
      .trim();

    const nameTokens = cleanedLine.split(/[,;\t]/)[0]?.trim() || '';
    if (nameTokens.length >= 3 && !/^\d+$/.test(nameTokens)) {
      name = nameTokens
        .replace(/\s{2,}/g, ' ')
        .replace(/[^\w\s.'-]/g, '')
        .trim();
    }

    if (!name && parts.length >= 1) {
      name = parts[0].trim();
    }

    if (name && name.length >= 2 && !name.toLowerCase().includes('roster')) {
      const dynamicAge = getDynamicAge(birthDate, age);
      const isDuplicate = existingNamesSet.has(name.toLowerCase().trim());
      const validationIssues: string[] = [];

      if (!name) validationIssues.push('Missing Name');
      if (email && !email.includes('@')) validationIssues.push('Invalid Email');

      items.push({
        name,
        gender,
        age: dynamicAge,
        phone,
        email,
        organisation: organisation || (gender === 'F' ? 'Relief Society' : 'Elders Quorum'),
        status,
        birth_date: birthDate ? formatBirthDateForStorage(birthDate) : '',
        calling,
        notes: 'Imported from Roster PDF/Text',
        total_assignments: 0,
        spoken_count: 0,
        prayers_count: 0,
        last_assigned_date: '',
        readiness_score: 100,
        isValid: validationIssues.length === 0,
        validationIssues,
        isDuplicate
      });
    }
  }

  return items;
}

// ─── 2. Official Church LCR / Member Tools CSV Parser ─────────────────────────

export function parseLcrCsv(csvContent: string, existingMembers: Member[] = []): MemberImportItem[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header line
  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map(h => h.trim().toLowerCase());

  // Detect column indexes with flexible alias matching
  const findIndex = (aliases: string[]) =>
    headers.findIndex(h => aliases.some(alias => h.includes(alias.toLowerCase())));

  const nameIdx = findIndex(['preferred name', 'member name', 'full name', 'individual name', 'name']);
  const surnameIdx = findIndex(['last name', 'surname', 'family name']);
  const givenNameIdx = findIndex(['first name', 'given name']);
  const ageIdx = findIndex(['current age', 'age']);
  const genderIdx = findIndex(['gender', 'sex']);
  const bdayIdx = findIndex(['birth date', 'birthdate', 'dob', 'birthday', 'date of birth']);
  const orgIdx = findIndex(['priesthood/auxiliary', 'organisation', 'organization', 'auxiliary', 'quorum/class', 'quorum']);
  const callingIdx = findIndex(['position', 'callings', 'calling', 'current calling']);
  const officeIdx = findIndex(['priesthood office', 'priesthood', 'office']);
  const phoneIdx = findIndex(['individual phone', 'mobile phone', 'cell phone', 'telephone', 'phone', 'household phone']);
  const emailIdx = findIndex(['individual email', 'member email', 'email']);
  const householdIdx = findIndex(['household name', 'head of household', 'household id', 'family']);
  const statusIdx = findIndex(['member status', 'activity status', 'status']);
  const notesIdx = findIndex(['notes', 'comments']);

  const existingNamesSet = new Set(existingMembers.map(m => m.name.toLowerCase().trim()));
  const items: MemberImportItem[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = parseCsvRow(lines[r]);
    if (row.length === 0 || row.every(c => !c.trim())) continue;

    let name = nameIdx >= 0 ? row[nameIdx]?.trim() || '' : '';
    if (!name && (givenNameIdx >= 0 || surnameIdx >= 0)) {
      const first = givenNameIdx >= 0 ? row[givenNameIdx]?.trim() || '' : '';
      const last = surnameIdx >= 0 ? row[surnameIdx]?.trim() || '' : '';
      name = `${first} ${last}`.trim();
    }

    // Format "Last, First" into "First Last"
    if (name.includes(',')) {
      const parts = name.split(',');
      name = `${parts[1]?.trim()} ${parts[0]?.trim()}`.trim();
    }

    if (!name) continue;

    const rawAge = ageIdx >= 0 ? parseInt(row[ageIdx] || '0', 10) : 0;
    const rawGender = genderIdx >= 0 ? row[genderIdx]?.trim().toUpperCase() || '' : '';
    const gender: 'M' | 'F' | '' = rawGender.startsWith('F') || rawGender === 'FEMALE' ? 'F' : rawGender.startsWith('M') || rawGender === 'MALE' ? 'M' : '';
    const rawBday = bdayIdx >= 0 ? row[bdayIdx]?.trim() || '' : '';
    const rawOrg = orgIdx >= 0 ? row[orgIdx]?.trim() || '' : '';
    const calling = callingIdx >= 0 ? row[callingIdx]?.trim() || '' : '';
    const priesthoodOffice = officeIdx >= 0 ? row[officeIdx]?.trim() || '' : '';
    const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() || '' : '';
    const email = emailIdx >= 0 ? row[emailIdx]?.trim() || '' : '';
    const householdId = householdIdx >= 0 ? row[householdIdx]?.trim() || '' : '';
    const rawStatus = statusIdx >= 0 ? row[statusIdx]?.trim() || 'ACTIVE' : 'ACTIVE';
    const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || '' : '';

    // Normalize Organisation
    let organisation = rawOrg;
    if (!organisation) {
      if (rawGender === 'F') organisation = 'Relief Society';
      else if (priesthoodOffice || rawGender === 'M') organisation = 'Elders Quorum';
    }

    const calculatedAge = getDynamicAge(rawBday, isNaN(rawAge) ? 0 : rawAge);
    const isDuplicate = existingNamesSet.has(name.toLowerCase().trim());
    const validationIssues: string[] = [];

    if (!name) validationIssues.push('Name missing');
    if (email && !email.includes('@')) validationIssues.push('Invalid email format');

    items.push({
      name,
      gender,
      age: calculatedAge,
      phone,
      email,
      organisation,
      status: rawStatus.toUpperCase().includes('LESS') ? 'LESS_ACTIVE' : rawStatus.toUpperCase().includes('MOVE') ? 'NEW MOVE-IN' : 'ACTIVE',
      birth_date: rawBday ? formatBirthDateForStorage(rawBday) : '',
      calling,
      priesthood_office: priesthoodOffice,
      household_id: householdId,
      notes: notes || 'Imported via LCR CSV',
      total_assignments: 0,
      spoken_count: 0,
      prayers_count: 0,
      last_assigned_date: '',
      readiness_score: 100,
      isValid: validationIssues.length === 0,
      validationIssues,
      isDuplicate
    });
  }

  return items;
}

function parseCsvRow(rowStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"') {
      if (inQuotes && rowStr[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── 3. CSV Exporter ─────────────────────────────────────────────────────────

export function exportMembersToCsv(members: Member[], filename = 'ward_members_directory.csv'): void {
  const headers = [
    'Member ID',
    'Name',
    'Gender',
    'Age',
    'Birth Date',
    'Phone',
    'Email',
    'Organisation',
    'Calling',
    'Priesthood Office',
    'Household ID',
    'Status',
    'Total Assignments',
    'Talks Spoken',
    'Prayers',
    'Last Assigned Date',
    'Readiness Score',
    'Notes'
  ];

  const rows = members.map(m => [
    escapeCsvCell(m.members_id || m.member_id || ''),
    escapeCsvCell(m.name),
    escapeCsvCell(m.gender || ''),
    escapeCsvCell(getDynamicAge(m.birth_date, m.age).toString()),
    escapeCsvCell(normalizeBirthDate(m.birth_date)),
    escapeCsvCell(m.phone || ''),
    escapeCsvCell(m.email || ''),
    escapeCsvCell(m.organisation || ''),
    escapeCsvCell(m.calling || ''),
    escapeCsvCell(m.priesthood_office || ''),
    escapeCsvCell(m.household_id || ''),
    escapeCsvCell(m.status || 'ACTIVE'),
    escapeCsvCell(String(m.total_assignments || 0)),
    escapeCsvCell(String(m.spoken_count || 0)),
    escapeCsvCell(String(m.prayers_count || 0)),
    escapeCsvCell(m.last_assigned_date || ''),
    escapeCsvCell(String(Math.round(m.readiness_score || 0))),
    escapeCsvCell(m.notes || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

// ─── 4. Vector Printable HTML Generator for PDF Export ───────────────────────

export function generateRosterPrintHtml(members: Member[], unitName = 'Ward Directory'): string {
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${unitName} — Official Member Directory</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 9pt;
      line-height: 1.3;
    }
    .header {
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      color: #1e3a8a;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 8pt;
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 12px;
      margin-bottom: 12px;
      font-size: 8pt;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: #1e3a8a;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 8pt;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 7pt;
      font-weight: 600;
    }
    .badge-org { background: #e0f2fe; color: #0369a1; }
    .badge-calling { background: #fef3c7; color: #92400e; }
    .badge-status { background: #dcfce7; color: #15803d; }
    .footer {
      margin-top: 16px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 7pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${unitName}</h1>
      <p>Official Membership Directory & Bishopric Overview</p>
    </div>
    <div style="text-align: right;">
      <p>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <p>Total Records: <strong>${members.length}</strong></p>
    </div>
  </div>

  <div class="stats-bar">
    <div><strong>Total Members:</strong> ${members.length}</div>
    <div><strong>Active:</strong> ${members.filter(m => (m.status || '').toUpperCase() === 'ACTIVE').length}</div>
    <div><strong>Elders Quorum:</strong> ${members.filter(m => (m.organisation || '').includes('Elders')).length}</div>
    <div><strong>Relief Society:</strong> ${members.filter(m => (m.organisation || '').includes('Relief')).length}</div>
    <div><strong>Youth:</strong> ${members.filter(m => (m.organisation || '').includes('Young')).length}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 3%;">#</th>
        <th style="width: 25%;">Name & Calling</th>
        <th style="width: 8%;">Member ID</th>
        <th style="width: 5%;">Age</th>
        <th style="width: 5%;">Sex</th>
        <th style="width: 13%;">Phone</th>
        <th style="width: 16%;">Organisation</th>
        <th style="width: 9%;">Birthday</th>
        <th style="width: 8%;">Status</th>
        <th style="width: 8%;">Assignments</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map((m, idx) => `
        <tr>
          <td style="color: #94a3b8; font-size: 7pt;">${idx + 1}</td>
          <td>
            <strong>${m.name}</strong>
            ${m.calling ? `<br/><span class="badge badge-calling">${m.calling}</span>` : ''}
            ${m.priesthood_office ? `<span style="font-size: 7pt; color: #64748b; margin-left: 4px;">(${m.priesthood_office})</span>` : ''}
          </td>
          <td style="font-family: monospace; font-size: 7.5pt; font-weight: 600; color: #475569;">
            ${m.members_id || m.member_id ? '#' + (m.members_id || m.member_id) : '—'}
          </td>
          <td>${getDynamicAge(m.birthdate || m.birth_date, m.age) || '—'}</td>
          <td>${m.gender || '—'}</td>
          <td>${m.phone || '—'}</td>
          <td><span class="badge badge-org">${m.organisation || '—'}</span></td>
          <td>${normalizeBirthDate(m.birthdate || m.birth_date)}</td>
          <td><span class="badge badge-status">${m.status || 'Active'}</span></td>
          <td>
            <span style="font-size: 7.5pt;">${m.spoken_count || 0} talks · ${m.prayers_count || 0} prayers</span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div>Confidential — For Internal Church Leadership Use Only</div>
    <div>SM Planner Bishopric Management System</div>
  </div>
</body>
</html>`;
}
