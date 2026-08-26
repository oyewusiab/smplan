/**
 * SM Planner — Configuration
 * File: config.gs
 * 
 * Central configuration for the Apps Script backend.
 * 
 * IMPORTANT: Never hard-code secrets here.
 * Use PropertiesService for sensitive values.
 * 
 * Setup: run setupProperties() once from the Apps Script editor while this
 * project is bound to the spreadsheet, or provide a spreadsheet ID to it.
 */

// ─── Get Script Properties ────────────────────────────────────────────────────

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

// ─── Spreadsheet ──────────────────────────────────────────────────────────────

function getSpreadsheet() {
  const id = getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID not set in Script Properties. Run setupProperties() first.');
  return SpreadsheetApp.openById(id);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found. Run initializeDatabase() to create it.`);
  return sheet;
}

// ─── App Constants ────────────────────────────────────────────────────────────

const APP_CONFIG = {
  APP_NAME: 'SM Planner',
  VERSION: '1.0.0',
  SESSION_TTL_HOURS: 8,
  PASSWORD_MIN_LENGTH: 8,

  // Session token prefix (not a secret — just a prefix for identification)
  TOKEN_PREFIX: 'SMP_',

  // Tables / Sheet names
  SHEETS: {
    ACTIVITIES: 'ACTIVITIES',
    AGENDAS: 'AGENDAS',
    ASSIGNMENTS: 'ASSIGNMENTS',
    AUDIT_LOG: 'AUDIT_LOG',
    BULLETINS: 'BULLETINS',
    CHECKLISTS: 'CHECKLISTS',
    HYMNS: 'HYMNS',
    MEMBERS_LIST: 'MEMBERS_LIST',
    NOTIFICATIONS: 'NOTIFICATIONS',
    PLANNERS: 'PLANNERS',
    PLANNER_APPROVAL_REQUESTS: 'PLANNER_APPROVAL_REQUESTS',
    REMINDERS: 'REMINDERS',
    SETTINGS_REQUESTS: 'SETTINGS_REQUESTS',
    TODOS: 'TODOS',
    UNIT_SETTINGS: 'UNIT_SETTINGS',
    USERS: 'USERS',
  },

  // Role hierarchy
  ROLES: {
    ADMIN: 'ADMIN',
    BISHOPRIC: 'BISHOPRIC',
    CLERK: 'CLERK',
    SECRETARY: 'SECRETARY',
    MUSIC: 'MUSIC',
  },
};

// ─── Initial Setup ────────────────────────────────────────────────────────────

/**
 * Run this function ONCE to set up Script Properties. For a spreadsheet-bound
 * project, the active spreadsheet ID is detected automatically.
 */
function setupProperties(spreadsheetId) {
  const scriptProps = PropertiesService.getScriptProperties();
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const resolvedSpreadsheetId = spreadsheetId ||
    (activeSpreadsheet ? activeSpreadsheet.getId() : '');

  if (!resolvedSpreadsheetId) {
    throw new Error('Provide the Google Sheet ID: setupProperties("your-sheet-id")');
  }

  if (!scriptProps.getProperty('SESSION_SALT')) {
    scriptProps.setProperty('SESSION_SALT', Utilities.getUuid() + Utilities.getUuid());
  }
  scriptProps.setProperty('SPREADSHEET_ID', resolvedSpreadsheetId);
  scriptProps.setProperty('APP_NAME', scriptProps.getProperty('APP_NAME') || 'SM Planner');

  Logger.log('Properties configured for spreadsheet: ' + resolvedSpreadsheetId);
}
