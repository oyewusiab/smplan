/**
 * SM Planner — Utilities
 * File: utils.gs
 */

// ─── Response Helpers ─────────────────────────────────────────────────────────

function successResponse(data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data, message: message || 'OK' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message || 'An error occurred', code: code || 'ERROR' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Input Sanitization & Timezone Safety ────────────────────────────────────

function getAppTimeZone() {
  try {
    const ss = getSpreadsheet();
    return ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Africa/Lagos';
  } catch(e) {
    return 'Africa/Lagos';
  }
}

function sanitizeString(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}

function sanitizeEmail(email) {
  const s = sanitizeString(email).toLowerCase();
  if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return '';
  return s;
}

function sanitizeDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return Utilities.formatDate(dateStr, getAppTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(dateStr).trim();
  // Extract direct YYYY-MM-DD pattern to preserve exact calendar date without UTC offset shifting
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, getAppTimeZone(), 'yyyy-MM-dd');
}

function sanitizeNumber(val, defaultVal) {
  const n = Number(val);
  return isNaN(n) ? (defaultVal || 0) : n;
}

function sanitizeBoolean(val) {
  if (val === true || val === 'true' || val === 'TRUE' || val === 1) return true;
  if (val === false || val === 'false' || val === 'FALSE' || val === 0) return false;
  return false;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRequired(obj, fields) {
  const missing = fields.filter(f => !obj[f] || String(obj[f]).trim() === '');
  if (missing.length > 0) throw new Error('Missing required fields: ' + missing.join(', '));
}

function validateRole(role) {
  const validRoles = Object.values(APP_CONFIG.ROLES);
  if (!validRoles.includes(role)) throw new Error('Invalid role: ' + role);
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

function today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function now() {
  return new Date().toISOString();
}

function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2 || new Date());
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// ─── Readiness Score ─────────────────────────────────────────────────────────

/**
 * Calculate member readiness score (0 to 100).
 * 
 * Formula:
 * if (status === "ACTIVE") {
 *   readiness += 40; // Base active points
 *   if (monthsSinceLast >= 3) readiness += 30; // Not assigned in 3+ months
 *   if (speakers < 2) readiness += 20; // Less than 2 talks this year
 *   if (!isNewcomer) readiness += 10; // Established member (> 3 months)
 * }
 */
function calculateReadinessScore(spokenCount, lastAssignedDate, status, createdDate) {
  const statusUpper = sanitizeString(status || 'ACTIVE').toUpperCase().replace('-', '_');
  if (statusUpper !== 'ACTIVE') return 0;

  let readiness = 40; // Base active points

  const daysSince = lastAssignedDate ? daysBetween(lastAssignedDate, new Date()) : 365;
  const monthsSince = Math.floor(daysSince / 30);

  if (monthsSince >= 3) {
    readiness += 30;
  } else if (monthsSince >= 1) {
    readiness += 15;
  }

  const spoken = sanitizeNumber(spokenCount, 0);
  if (spoken < 2) {
    readiness += 20;
  } else if (spoken < 4) {
    readiness += 10;
  }

  const daysCreated = createdDate ? daysBetween(createdDate, new Date()) : 365;
  if (daysCreated >= 90) {
    readiness += 10;
  }

  return Math.min(100, Math.max(0, readiness));
}

/**
 * Recalculate readiness scores for all active members.
 * Called after assignments are updated.
 */
function updateAllReadinessScores() {
  const members = dbReadAll('MEMBERS_LIST');
  
  members.forEach(member => {
    const score = calculateReadinessScore(member.spoken_count, member.last_assigned_date, member.status, member.created_date);
    try {
      dbUpdate('MEMBERS_LIST', 'name', member.name, { readiness_score: score });
    } catch(e) {
      Logger.log('Error updating readiness for ' + member.name + ': ' + e.message);
    }
  });
}

/**
 * Get suggested members for a role, ordered by readiness score.
 * Filters to ACTIVE members only.
 */
function suggestMembersForRole(role, date, count) {
  const limit = count || 5;
  let members = dbFind('MEMBERS_LIST', m => m.status === 'ACTIVE');
  
  // Apply gender filter for some roles if needed (configurable)
  // For now, return top N by readiness score
  members.sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0));
  
  return members.slice(0, limit);
}

// ─── Parse Request Body ───────────────────────────────────────────────────────

/**
 * Parse the POST body from a doPost event.
 * Apps Script POST body is in e.postData.contents as a JSON string.
 */
function parseBody(e) {
  try {
    if (e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
    return {};
  } catch(err) {
    Logger.log('Failed to parse request body: ' + err.message);
    return {};
  }
}

/**
 * Get a parameter from a GET request or POST body.
 */
function getParam(e, key, isPost) {
  if (isPost) {
    const body = parseBody(e);
    return body[key];
  }
  return e.parameter ? e.parameter[key] : null;
}

// ─── Email Utilities ──────────────────────────────────────────────────────────

/**
 * Send an email via Apps Script (built-in Gmail/MailApp integration).
 * Apps Script can send up to 100 emails/day on standard accounts.
 */
function sendEmail(to, subject, body, options) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    Logger.log('sendEmail skipped: Invalid recipient address "' + to + '"');
    return false;
  }

  const senderName = (options && options.name) ? options.name : 'SM Planner';
  const cleanTo = to.trim();
  const mailOptions = {
    to: cleanTo,
    subject: subject || 'SM Planner Notification',
    body: body || '',
    name: senderName,
  };
  if (options && options.html) {
    mailOptions.htmlBody = options.html;
  }

  try {
    MailApp.sendEmail(mailOptions);
    Logger.log('MailApp sent email successfully to: ' + cleanTo);
    return true;
  } catch (mailErr) {
    Logger.log('MailApp sendEmail failed (' + mailErr.message + '), attempting GmailApp fallback...');
    try {
      const gmailOptions = { name: senderName };
      if (options && options.html) {
        gmailOptions.htmlBody = options.html;
      }
      GmailApp.sendEmail(cleanTo, subject, body, gmailOptions);
      Logger.log('GmailApp fallback sent email successfully to: ' + cleanTo);
      return true;
    } catch (gmailErr) {
      Logger.log('All email dispatch methods failed for ' + cleanTo + ': ' + gmailErr.message);
      return false;
    }
  }
}
