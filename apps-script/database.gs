/**
 * SM Planner — Database Layer
 * File: database.gs
 * 
 * Google Sheets CRUD operations.
 * All read/write to the spreadsheet goes through these functions.
 * 
 * Schema is defined in GOOGLE_SHEETS_SETUP.md and enforced by initializeDatabase().
 */

// ─── Schema Definitions ───────────────────────────────────────────────────────

const SHEET_SCHEMAS = {
  ACTIVITIES: ['activity_id', 'date', 'activity', 'organisation', 'status', 'email_sent', 'those_involved', 'report_submitted', 'last_reminder', 'time'],
  AGENDAS: ['agenda_id','planner_id','week_id','created_by','created_date','updated_date','state','ward_branch','stake_district','date','type_of_meeting','other_meeting_specify','presiding','presiding_position','conducting','conducting_position','music_director','choir_director','organist','start_time','venue_override','meeting_time_override','is_canceled','cancel_reason','prelude_music','greetings_welcome','acknowledgements','ward_branch_business','stake_district_business','naming_blessing','confirmation_bestowal','opening_hymn','opening_hymn_number','opening_prayer','opening_prayer_gender','opening_prayer_prefix','sacrament_hymn','sacrament_hymn_number','special_music','speakers','sacrament_duties','closing_hymn','closing_hymn_number','closing_prayer','closing_prayer_gender','closing_prayer_prefix','postlude_music','announcements','releases','calls','baptized_children','aaronic_ordinations','aaronic_advancements','achievements','babies','confirmations','fellowships','week_notes','archive_method','archive_date'],
  ASSIGNMENTS: ['assignment_id','planner_id','week_id','date','person','role','topic','minutes','venue','meeting_time','status','phone','email','scripture_ref','talk_link','rsvp_status','notes','created_date','updated_date'],
  AUDIT_LOG: ['log_id','timestamp','user_id','action','table_name','record_id','old_version','new_version','status'],
  BULLETINS: ['bulletin_id','planner_id','week_id','date','theme','special_music','come_follow_me','cfm_reading','cfm_theme','cfm_discussion_question','cfm_family_challenge','cfm_study_tip','cleaning_group','cleaning_date','cleaning_time','cleaning_instructions','show_cleaning','activities','birthdays','birthday_message','missionaries','scripture_of_the_week','missionary_challenge','temple_trip_date','familysearch_tip','ancestor_challenge','self_reliance_classes','ward_focus','welfare_reminders','bishopric_message','upcoming_events','qr_whatsapp','qr_familysearch','qr_gospel_library','qr_website','qr_planner_link','show_sacrament','show_activities','show_birthdays','show_missionary','show_temple','show_self_reliance','show_focus','show_welfare','show_bishopric','show_upcoming','show_qr','color_theme','pdf_layout','created_date','updated_date'],
  BULLETIN_FEEDBACK: ['feedback_id','bulletin_id','date','type','member_name','phone','email','message','status','created_date'],
  CHECKLISTS: ['checklist_id','planner_id','week_id','week_label','task','responsible','status','updated_by','updated_date'],
  HYMNS: ['number','title','type','theme','updated_date'],
  MEMBERS_LIST: ['member_id','name','gender','age','phone','email','organisation','status','birth_date','calling','priesthood_office','household_id','notes','created_date','updated_date','total_assignments','spoken_count','prayers_count','last_assigned_date','readiness_score'],
  NOTIFICATIONS: ['notification_id','to_user_id','type','title','body','meta','read','created_date'],
  PLANNERS: ['planner_id','month','year','state','conducting_officer','weeks','unit_name','created_by','created_date','updated_date','music_status','archive_method','archive_date','sacrament_administration'],
  PLANNER_APPROVAL_REQUESTS: ['request_id','planner_id','status','requested_by','created_date','decided_by','decided_date','comment'],
  REMINDERS: ['reminder_id','planner_id','week_id','assignment_id','to_person','to_user_id','channel','title','body','scheduled_for_date','status','created_by_user_id','created_date','sent_date'],
  SETTINGS_REQUESTS: ['request_id','requested_by','status','patch','reason','decided_by','decided_date','created_date'],
  TODOS: ['todo_id','title','details','due_date','priority','status','assigned_to_user_id','created_by_user_id','planner_id','week_id','created_date','updated_date','completed_date'],
  UNIT_SETTINGS: ['Key','Value'],
  USERS: ['user_id','name','preferred_name','username','email','password_hash','role','organisation','calling','phone','whatsapp','gender','address','lga','state','country','emergency_contact_name','emergency_contact_phone','signature_data_url','notes','created_date','last_login_date','must_reset_password','disabled','member_id','username_change_count','username_changed'],
};

// ─── Initialize Database ──────────────────────────────────────────────────────

/**
 * Creates missing sheets and adds correct headers.
 * SAFE: Preserves existing data. Does not delete existing sheets.
 * Run this once after setting up the spreadsheet.
 */
function initializeDatabase() {
  const ss = getSpreadsheet();
  const results = [];

  Object.entries(SHEET_SCHEMAS).forEach(([sheetName, headers]) => {
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      results.push(`CREATED: ${sheetName}`);
    } else {
      // Validate existing headers
      const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const missing = headers.filter(h => !existingHeaders.includes(h));
      
      if (missing.length > 0) {
        // Add missing columns at the end (preserve existing data)
        missing.forEach(h => {
          const col = sheet.getLastColumn() + 1;
          sheet.getRange(1, col).setValue(h).setFontWeight('bold');
        });
        results.push(`UPDATED: ${sheetName} — added columns: ${missing.join(', ')}`);
      } else {
        results.push(`OK: ${sheetName}`);
      }
    }
  });

  Logger.log('Database initialization results:\n' + results.join('\n'));
  return results;
}

/**
 * Validates the spreadsheet schema without modifying anything.
 */
function validateDatabase() {
  const ss = getSpreadsheet();
  const results = { ok: true, issues: [] };

  Object.entries(SHEET_SCHEMAS).forEach(([sheetName, expectedHeaders]) => {
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      results.ok = false;
      results.issues.push(`MISSING SHEET: ${sheetName}`);
      return;
    }

    const existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const missing = expectedHeaders.filter(h => !existingHeaders.includes(h));
    
    if (missing.length > 0) {
      results.ok = false;
      results.issues.push(`${sheetName}: missing columns — ${missing.join(', ')}`);
    }
  });

  Logger.log('Validation result: ' + (results.ok ? 'OK' : 'ISSUES FOUND'));
  Logger.log(results.issues.join('\n'));
  return results;
}

// ─── Core CRUD & High-Performance Cache Layer ────────────────────────────────

// Request-scoped memoization cache
var _MEM_CACHE = {};

/**
 * Purges the in-memory and ScriptCache for a specific sheet.
 */
function invalidateSheetCache(sheetName) {
  _MEM_CACHE[sheetName] = null;
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('CACHE_SHEET_' + sheetName);
  } catch (e) {
    // Cache service unavailable or error
  }
}

/**
 * Read all rows from a sheet as an array of objects with multi-tier caching.
 */
function dbReadAll(sheetName) {
  // 1. Check in-memory request cache (0ms)
  if (_MEM_CACHE[sheetName]) {
    return _MEM_CACHE[sheetName];
  }

  // 2. Check Apps Script ScriptCache (~15ms vs ~1500ms spreadsheet read)
  try {
    const cache = CacheService.getScriptCache();
    const cachedStr = cache.get('CACHE_SHEET_' + sheetName);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed)) {
        _MEM_CACHE[sheetName] = parsed;
        return parsed;
      }
    }
  } catch (e) {
    // Fallback to direct sheet read
  }

  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    _MEM_CACHE[sheetName] = [];
    return [];
  }
  
  const headers = data[0];
  const tz = getAppTimeZone();
  const rows = data.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        // Standardize Date and Time instances from Google Sheets
        if (val instanceof Date && !isNaN(val.getTime())) {
          const yr = val.getFullYear();
          if (yr < 1920) {
            // Epoch 1899 represents pure Time in Google Sheets (e.g. 10:00)
            val = Utilities.formatDate(val, tz, 'HH:mm');
          } else {
            // Standard Date cell
            val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
          }
        } else if (typeof val === 'string') {
          // If a time column contains an 1899 ISO string, extract clean HH:mm
          if ((h === 'start_time' || h === 'meeting_time' || h === 'time') && val.includes('1899-12-30')) {
            const td = new Date(val);
            if (!isNaN(td.getTime())) {
              val = Utilities.formatDate(td, tz, 'HH:mm');
            }
          }
          // If a date column contains a full ISO timestamp like "2026-09-05T23:00:00.000Z", normalize with timezone
          else if ((h === 'date' || h === 'birth_date' || h === 'confirmation_date') && val.includes('T')) {
            const dd = new Date(val);
            if (!isNaN(dd.getTime())) {
              val = Utilities.formatDate(dd, tz, 'yyyy-MM-dd');
            }
          }
        }
        // Deserialize booleans stored as strings
        if (val === 'TRUE' || val === true) val = true;
        else if (val === 'FALSE' || val === false) val = false;
        // Parse JSON fields stored as strings
        try {
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            val = JSON.parse(val);
          }
        } catch(e) { /* keep as string */ }
        obj[h] = val;
      });
      if (sheetName === 'MEMBERS_LIST' || sheetName === 'USERS') {
        const mid = obj.members_id || obj.member_id || '';
        obj.members_id = mid;
        obj.member_id = mid;
      }
      if (sheetName === 'MEMBERS_LIST') {
        // Normalize birthdate / birth_date column aliases
        const bdate = obj.birthdate || obj.birth_date || obj['Birth Date'] || obj['Birthdate'] || '';
        obj.birthdate = bdate;
        obj.birth_date = bdate;

        // Dynamically calculate age from birthdate if available
        if (bdate) {
          try {
            let bDateObj = null;
            if (bdate instanceof Date) {
              bDateObj = bdate;
            } else if (typeof bdate === 'string' && bdate.trim()) {
              const str = bdate.trim();
              const parsed = new Date(str);
              if (!isNaN(parsed.getTime())) {
                bDateObj = parsed;
              }
            }
            if (bDateObj && !isNaN(bDateObj.getTime())) {
              const today = new Date();
              let age = today.getFullYear() - bDateObj.getFullYear();
              const m = today.getMonth() - bDateObj.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < bDateObj.getDate())) {
                age--;
              }
              if (age >= 0 && age <= 120) {
                obj.age = age;
              }
            }
          } catch(e) { /* keep existing age */ }
        }
        // Normalize confirmation_date / confirmationdate column aliases
        const cdate = obj.confirmation_date || obj.confirmationdate || obj['Confirmation Date'] || obj['ConfirmationDate'] || '';
        obj.confirmation_date = cdate;
        obj.confirmationdate = cdate;
      }
      return obj;
    });

  _MEM_CACHE[sheetName] = rows;

  // Cache in ScriptCache for 300 seconds (5 minutes) if payload size < 95KB
  try {
    const serialized = JSON.stringify(rows);
    if (serialized.length < 95000) {
      const cache = CacheService.getScriptCache();
      cache.put('CACHE_SHEET_' + sheetName, serialized, 300);
    }
  } catch (e) {
    // Ignore cache put error
  }

  return rows;
}

/**
 * Find rows matching a filter function.
 */
function dbFind(sheetName, filterFn) {
  return dbReadAll(sheetName).filter(filterFn);
}

/**
 * Find one row by a field value.
 */
function dbFindOne(sheetName, field, value) {
  return dbReadAll(sheetName).find(row => row[field] === value) || null;
}

/**
 * Insert a new row.
 */
function dbInsert(sheetName, record) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const row = headers.map(h => {
    const val = record[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  
  sheet.appendRow(row);
  invalidateSheetCache(sheetName);
  return record;
}

/**
 * Update a row by primary key field+value.
 */
function dbUpdate(sheetName, pkField, pkValue, updates) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const pkCol = headers.indexOf(pkField);
  
  if (pkCol === -1) throw new Error(`Field "${pkField}" not found in ${sheetName}`);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][pkCol]) === String(pkValue)) {
      // Update matching cells
      const oldRecord = {};
      headers.forEach((h, j) => { oldRecord[h] = data[i][j]; });
      
      Object.entries(updates).forEach(([key, value]) => {
        const col = headers.indexOf(key);
        if (col !== -1) {
          let val = value;
          if (val === null || val === undefined) val = '';
          if (typeof val === 'object') val = JSON.stringify(val);
          sheet.getRange(i + 1, col + 1).setValue(val);
        }
      });
      
      invalidateSheetCache(sheetName);
      return { old: oldRecord, updated: { ...oldRecord, ...updates } };
    }
  }
  
  throw new Error(`Record with ${pkField}="${pkValue}" not found in ${sheetName}`);
}

/**
 * Delete a row by primary key.
 */
function dbDelete(sheetName, pkField, pkValue) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const pkCol = headers.indexOf(pkField);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][pkCol]) === String(pkValue)) {
      const deletedRecord = {};
      headers.forEach((h, j) => { deletedRecord[h] = data[i][j]; });
      sheet.deleteRow(i + 1);
      invalidateSheetCache(sheetName);
      return deletedRecord;
    }
  }
  
  throw new Error(`Record with ${pkField}="${pkValue}" not found in ${sheetName}`);
}

/**
 * Upsert (insert if not found, update if found).
 */
function dbUpsert(sheetName, pkField, record) {
  const existing = dbFindOne(sheetName, pkField, record[pkField]);
  if (existing) {
    return dbUpdate(sheetName, pkField, record[pkField], record);
  } else {
    return dbInsert(sheetName, record);
  }
}

// ─── Key-Value Settings ───────────────────────────────────────────────────────

function settingsGet(key) {
  const record = dbFindOne('UNIT_SETTINGS', 'Key', key);
  return record ? record.Value : null;
}

function settingsSet(key, value) {
  const existing = dbFindOne('UNIT_SETTINGS', 'Key', key);
  if (existing) {
    dbUpdate('UNIT_SETTINGS', 'Key', key, { Value: value });
  } else {
    dbInsert('UNIT_SETTINGS', { Key: key, Value: value });
  }
}

function settingsGetAll() {
  return dbReadAll('UNIT_SETTINGS');
}

// ─── ID Generation ────────────────────────────────────────────────────────────

function generateId(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return (prefix || 'ID') + '_' + ts + '_' + rand;
}

/**
 * Generates a unique 6-character uppercase alphanumeric ID for members (e.g. "K7N2P4").
 * Excludes easily confusable characters (0, O, 1, I) for readability and sacred records accuracy.
 */
function generateMemberId(existingIds) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = '';
  let tries = 0;
  do {
    id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tries++;
  } while (existingIds && existingIds.has(id) && tries < 100);
  return id;
}

// ─── Full Export ──────────────────────────────────────────────────────────────

/**
 * Export all 16 sheets as a JSON backup.
 * Implements: GET /api/sync/export
 */
function exportAllData() {
  const data = {};
  
  Object.keys(SHEET_SCHEMAS).forEach(sheetName => {
    try {
      data[sheetName] = dbReadAll(sheetName);
    } catch(e) {
      data[sheetName] = [];
      Logger.log(`Export warning: ${sheetName} — ${e.message}`);
    }
  });
  
    return {
    ok: true,
    db_version: 1,
    ts: new Date().toISOString(),
    data: data,
  };
}

// ─── Database Self-Healing & Schema Realignment ──────────────────────────────

/**
 * Repairs historical date shifts, time formatting, and misaligned rows.
 * Safe & idempotent: Only repairs rows with known offset patterns.
 */
function fixDatabaseAlignment() {
  const ss = getSpreadsheet();
  const tz = getAppTimeZone();
  const results = [];

  // Helper to adjust a shifted Saturday (day 6) to Sunday (day 0)
  function fixDateToSunday(dateStr) {
    if (!dateStr) return dateStr;
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const dt = new Date(Date.UTC(y, m, d));
    // If it's Saturday (UTC day 6), advance to Sunday (UTC day 0)
    if (dt.getUTCDay() === 6) {
      dt.setUTCDate(dt.getUTCDate() + 1);
      return Utilities.formatDate(dt, 'UTC', 'yyyy-MM-dd');
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // Helper to fix 1899 times to clean HH:mm
  function fixTimeStr(timeStr) {
    if (!timeStr) return '10:00';
    if (String(timeStr).includes('1899-12-30')) {
      const dt = new Date(timeStr);
      if (!isNaN(dt.getTime())) return Utilities.formatDate(dt, tz, 'HH:mm');
    }
    return String(timeStr);
  }

  // 1. Repair AGENDAS Sheet
  try {
    const agSheet = ss.getSheetByName('AGENDAS');
    if (agSheet && agSheet.getLastRow() > 1) {
      const data = agSheet.getDataRange().getValues();
      const headers = data[0];
      const dateCol = headers.indexOf('date');
      const timeCol = headers.indexOf('start_time');
      let changed = 0;

      for (let i = 1; i < data.length; i++) {
        if (dateCol !== -1 && data[i][dateCol]) {
          const orig = data[i][dateCol];
          let normalized = '';
          if (orig instanceof Date) {
            normalized = Utilities.formatDate(orig, tz, 'yyyy-MM-dd');
          } else {
            normalized = String(orig);
          }
          const fixed = fixDateToSunday(normalized);
          if (fixed !== String(orig)) {
            agSheet.getRange(i + 1, dateCol + 1).setValue(fixed);
            changed++;
          }
        }
        if (timeCol !== -1 && data[i][timeCol]) {
          const origTime = String(data[i][timeCol]);
          if (origTime.includes('1899-12-30') || data[i][timeCol] instanceof Date) {
            const fixedTime = fixTimeStr(data[i][timeCol]);
            agSheet.getRange(i + 1, timeCol + 1).setValue(fixedTime);
            changed++;
          }
        }
      }
      results.push(`AGENDAS: Repaired ${changed} date/time values`);
    }
  } catch(e) {
    results.push(`AGENDAS repair warning: ${e.message}`);
  }

  // 2. Repair PLANNERS Sheet (Embedded JSON weeks)
  try {
    const plSheet = ss.getSheetByName('PLANNERS');
    if (plSheet && plSheet.getLastRow() > 1) {
      const data = plSheet.getDataRange().getValues();
      const headers = data[0];
      const weeksCol = headers.indexOf('weeks');
      let plChanged = 0;

      for (let i = 1; i < data.length; i++) {
        if (weeksCol !== -1 && data[i][weeksCol]) {
          try {
            const rawWeeks = data[i][weeksCol];
            const parsed = typeof rawWeeks === 'string' ? JSON.parse(rawWeeks) : rawWeeks;
            if (Array.isArray(parsed)) {
              let weekModified = false;
              parsed.forEach(ag => {
                if (ag.date) {
                  const fixed = fixDateToSunday(ag.date);
                  if (fixed !== ag.date) {
                    ag.date = fixed;
                    weekModified = true;
                  }
                }
                if (ag.start_time && String(ag.start_time).includes('1899-12-30')) {
                  ag.start_time = fixTimeStr(ag.start_time);
                  weekModified = true;
                }
                // Harmonize sacrament and sacrament_duties
                const dutiesVal = ag.sacrament_duties || ag.sacrament;
                if (dutiesVal) {
                  const serialized = typeof dutiesVal === 'object' ? JSON.stringify(dutiesVal) : String(dutiesVal);
                  if (ag.sacrament_duties !== serialized) {
                    ag.sacrament_duties = serialized;
                    weekModified = true;
                  }
                }
              });
              if (weekModified) {
                plSheet.getRange(i + 1, weeksCol + 1).setValue(JSON.stringify(parsed));
                plChanged++;
              }
            }
          } catch(e) {}
        }
      }
      results.push(`PLANNERS: Repaired ${plChanged} planners' embedded week dates`);
    }
  } catch(e) {
    results.push(`PLANNERS repair warning: ${e.message}`);
  }

  // 3. Invalidate all caches
  Object.keys(SHEET_SCHEMAS).forEach(s => invalidateSheetCache(s));
  Logger.log('Self-healing alignment completed:\n' + results.join('\n'));
  return { ok: true, results };
}
