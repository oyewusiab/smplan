/**
 * API Service Layer
 * 
 * All frontend ↔ Google Apps Script communication goes through this file.
 * 
 * Architecture:
 *   Frontend → apiGet/apiPost → Apps Script doGet/doPost → Google Sheets
 * 
 * The Apps Script Web App must be deployed with:
 *   Execute as: Me (the Apps Script owner)
 *   Who has access: Anyone  (or Anyone within your organization)
 * 
 * SECURITY NOTE:
 *   - The session token is passed in every authenticated request.
 *   - The Apps Script backend validates the token before processing.
 *   - RBAC enforcement happens on the backend (Apps Script), not just the frontend.
 *   - Never put secrets in this file.
 */

import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../store/authStore';

// ─── Core HTTP Helpers ────────────────────────────────────────────────────────

function handleSessionExpiry(errorMsg: string) {
  if (errorMsg && (errorMsg.includes('Unauthorized') || errorMsg.includes('expired session'))) {
    useAuthStore.getState().clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

async function get<T = unknown>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('HTTP 404: Cloud Database API endpoint not found. Please verify your system server configuration.');
    }
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.ok === false) {
    handleSessionExpiry(json.error || '');
    throw new Error(json.error || 'Backend error');
  }
  return json as T;
}

async function post<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    // CORS text/plain payload
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('HTTP 404: Cloud Database API endpoint not found. Please verify your system server configuration.');
    }
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.ok === false) {
    handleSessionExpiry(json.error || '');
    throw new Error(json.error || 'Backend error');
  }
  return json as T;
}

// Helper to attach token to every request
function withToken(token: string, params: Record<string, string>) {
  return { ...params, token };
}
function withTokenBody(token: string, body: Record<string, unknown>) {
  return { ...body, token };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    post({ action: 'AUTH_LOGIN', username, password }),

  logout: (token: string) =>
    post(withTokenBody(token, { action: 'AUTH_LOGOUT' })),

  ping: (token: string) =>
    get(withToken(token, { action: 'SYNC_PING' })),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    post(withTokenBody(token, { action: 'AUTH_CHANGE_PASSWORD', currentPassword, newPassword })),
};

// ─── Planners ────────────────────────────────────────────────────────────────

export const plannersApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_PLANNERS' })),

  get: (token: string, planner_id: string) =>
    get(withToken(token, { action: 'GET_PLANNER', planner_id })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_PLANNER', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_PLANNER', ...data })),

  submit: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'SUBMIT_PLANNER', planner_id })),

  archive: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'ARCHIVE_PLANNER', planner_id })),

  restore: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'RESTORE_PLANNER', planner_id })),

  delete: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_PLANNER', planner_id })),

  requestEditAccess: (token: string, planner_id: string, reason: string) =>
    post(withTokenBody(token, { action: 'REQUEST_EDIT_ACCESS', planner_id, reason })),

  saveWorkspace: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'SAVE_PLANNER_WORKSPACE', ...data })),
};

// ─── Agendas ─────────────────────────────────────────────────────────────────

export const agendasApi = {
  list: (token: string, planner_id?: string) =>
    get(withToken(token, { action: 'LIST_AGENDAS', ...(planner_id ? { planner_id } : {}) })),

  get: (token: string, agenda_id: string) =>
    get(withToken(token, { action: 'GET_AGENDA', agenda_id })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_AGENDA', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_AGENDA', ...data })),

  delete: (token: string, agenda_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_AGENDA', agenda_id })),
};

// ─── Assignments ─────────────────────────────────────────────────────────────

export const assignmentsApi = {
  list: (token: string, planner_id?: string) =>
    get(withToken(token, { action: 'LIST_ASSIGNMENTS', ...(planner_id ? { planner_id } : {}) })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_ASSIGNMENT', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_ASSIGNMENT', ...data })),

  batchUpdate: (token: string, updates: Array<Record<string, unknown>>) =>
    post(withTokenBody(token, { action: 'BATCH_UPDATE_ASSIGNMENTS', updates })),

  extractFromPlanner: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'EXTRACT_PLANNER_ASSIGNMENTS', planner_id })),

  updateRsvp: (token: string, assignment_id: string, rsvp_status: string) =>
    post(withTokenBody(token, { action: 'UPDATE_ASSIGNMENT_RSVP', assignment_id, rsvp_status })),

  getSecretaryInfo: (token: string) =>
    get(withToken(token, { action: 'GET_SECRETARY_INFO' })),

  delete: (token: string, assignment_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_ASSIGNMENT', assignment_id })),

  suggest: (token: string, role: string, date: string) =>
    get(withToken(token, { action: 'SUGGEST_MEMBERS', role, date })),
};

// ─── Bulletins ────────────────────────────────────────────────────────────────

export const bulletinsApi = {
  list: (token: string, planner_id?: string) =>
    get(withToken(token, { action: 'LIST_BULLETINS', ...(planner_id ? { planner_id } : {}) })),

  get: (token: string, bulletin_id: string) =>
    get(withToken(token, { action: 'GET_BULLETIN', bulletin_id })),

  getDraftData: (token: string, date: string, planner_id?: string) =>
    get(withToken(token, { action: 'GET_BULLETIN_DRAFT_DATA', date, ...(planner_id ? { planner_id } : {}) })),

  save: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'SAVE_BULLETIN', ...data })),

  delete: (token: string, bulletin_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_BULLETIN', bulletin_id })),

  submitFeedback: (data: Record<string, unknown>) =>
    post({ action: 'SUBMIT_BULLETIN_FEEDBACK', ...data }),

  listFeedbacks: (token: string, bulletin_id?: string, date?: string) =>
    get(withToken(token, { action: 'LIST_BULLETIN_FEEDBACKS', ...(bulletin_id ? { bulletin_id } : {}), ...(date ? { date } : {}) })),

  generateCfmAi: (token: string, lesson: string, scripture?: string) =>
    post(withTokenBody(token, { action: 'GENERATE_CFM_AI', lesson, scripture })),

  generateCfmFromUrl: (token: string, url: string) =>
    post(withTokenBody(token, { action: 'GENERATE_CFM_FROM_URL', url })),
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const membersApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_MEMBERS' })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_MEMBER', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_MEMBER', ...data })),

  delete: (token: string, name: string) =>
    post(withTokenBody(token, { action: 'DELETE_MEMBER', name })),

  batchImport: (token: string, members: unknown[], mode: 'MERGE' | 'OVERWRITE') =>
    post(withTokenBody(token, { action: 'BATCH_IMPORT_MEMBERS', members: JSON.stringify(members), mode })),

  batchDelete: (token: string, names: string[]) =>
    post(withTokenBody(token, { action: 'BATCH_DELETE_MEMBERS', names: JSON.stringify(names) })),

  getAnalytics: (token: string, year?: number) =>
    get(withToken(token, { action: 'GET_MEMBERS_ANALYTICS', ...(year ? { year } : {}) })),
};

// ─── Hymns & Music ────────────────────────────────────────────────────────────

export const hymnsApi = {
  list: (token: string, query?: string) =>
    get(withToken(token, { action: 'LIST_HYMNS', ...(query ? { query } : {}) })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_HYMN', ...data })),

  syncCatalog: (token: string) =>
    post(withTokenBody(token, { action: 'SYNC_HYMNS_CATALOG' })),
};

export const musicApi = {
  savePlan: (token: string, data: { planner_id: string; music_status?: string; weeks: unknown[] } | (Record<string, unknown>)) =>
    post(withTokenBody(token, { action: 'SAVE_MUSIC_PLAN', ...data })),

  completePlan: (token: string, planner_id: string) =>
    post(withTokenBody(token, { action: 'COMPLETE_MUSIC_PLAN', planner_id })),

  getRotation: (token: string) =>
    get(withToken(token, { action: 'GET_MUSIC_ROTATION' })),

  getAvailability: (token: string) =>
    get(withToken(token, { action: 'GET_MUSIC_AVAILABILITY' })),

  saveAvailability: (token: string, records: unknown[]) =>
    post(withTokenBody(token, { action: 'SAVE_MUSIC_AVAILABILITY', records: JSON.stringify(records) })),
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const activitiesApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_ACTIVITIES' })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_ACTIVITY', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_ACTIVITY', ...data })),

  delete: (token: string, activity_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_ACTIVITY', activity_id })),
};

// ─── Checklists ───────────────────────────────────────────────────────────────

export const checklistsApi = {
  list: (token: string, planner_id?: string) =>
    get(withToken(token, { action: 'LIST_CHECKLISTS', ...(planner_id ? { planner_id } : {}) })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_CHECKLIST', ...data })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_CHECKLIST', ...data })),

  delete: (token: string, checklist_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_CHECKLIST', checklist_id })),

  seed: (token: string, data: { planner_id: string; week_id: string; week_label?: string; date?: string }) =>
    post(withTokenBody(token, { action: 'SEED_CHECKLIST', ...data })),

  resetWeek: (token: string, data: { planner_id: string; week_id: string }) =>
    post(withTokenBody(token, { action: 'RESET_CHECKLIST_WEEK', ...data })),

  bulkUpdate: (token: string, data: { items: Record<string, unknown>[] }) =>
    post(withTokenBody(token, { action: 'BULK_UPDATE_CHECKLIST', ...data })),

  bulkAssign: (token: string, data: { planner_id: string; week_id: string; responsible: string }) =>
    post(withTokenBody(token, { action: 'BULK_ASSIGN_CHECKLIST', ...data })),

  sendReminders: (token: string, data: { planner_id: string; week_id: string; date?: string; items?: unknown[] }) =>
    post(withTokenBody(token, { action: 'SEND_CHECKLIST_REMINDERS', ...data })),
};

// ─── Todos ────────────────────────────────────────────────────────────────────

export const todosApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_TODOS' })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_TODO', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_TODO', ...data })),

  delete: (token: string, todo_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_TODO', todo_id })),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (token: string, user_id: string) =>
    get(withToken(token, { action: 'LIST_NOTIFICATIONS', user_id })),

  markRead: (token: string, notification_id: string) =>
    post(withTokenBody(token, { action: 'MARK_NOTIFICATION_READ', notification_id })),

  markAllRead: (token: string) =>
    post(withTokenBody(token, { action: 'MARK_ALL_NOTIFICATIONS_READ' })),
};

// ─── Reminders ────────────────────────────────────────────────────────────────

export const remindersApi = {
  list: (token: string, planner_id?: string) =>
    get(withToken(token, { action: 'LIST_REMINDERS', ...(planner_id ? { planner_id } : {}) })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_REMINDER', ...data })),

  cancel: (token: string, reminder_id: string) =>
    post(withTokenBody(token, { action: 'CANCEL_REMINDER', reminder_id })),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_USERS' })),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_USER', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_USER', ...data })),

  getProfile: (token: string) =>
    get(withToken(token, { action: 'GET_PROFILE' })),

  updateProfile: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_PROFILE', ...data })),

  disable: (token: string, user_id: string) =>
    post(withTokenBody(token, { action: 'DISABLE_USER', user_id })),

  resetPassword: (token: string, user_id: string, temp_password: string) =>
    post(withTokenBody(token, { action: 'RESET_USER_PASSWORD', user_id, temp_password })),
};

// ─── Approvals ────────────────────────────────────────────────────────────────

export const approvalsApi = {
  list: (token: string) =>
    get(withToken(token, { action: 'LIST_APPROVALS' })),

  approve: (token: string, request_id: string, comment: string) =>
    post(withTokenBody(token, { action: 'APPROVE_PLANNER', request_id, comment })),

  reject: (token: string, request_id: string, comment: string) =>
    post(withTokenBody(token, { action: 'REJECT_PLANNER', request_id, comment })),
};

// ─── Settings & Settings Approval Requests ───────────────────────────────────

export const settingsApi = {
  get: (token: string) =>
    get(withToken(token, { action: 'GET_SETTINGS' })),

  requestChange: (token: string, patch: Record<string, unknown>, reason: string) =>
    post(withTokenBody(token, { action: 'REQUEST_SETTINGS_CHANGE', patch: JSON.stringify(patch), reason })),

  adminUpdate: (token: string, patch: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'ADMIN_UPDATE_SETTINGS', patch: JSON.stringify(patch) })),

  listRequests: (token: string) =>
    get(withToken(token, { action: 'LIST_SETTINGS_REQUESTS' })),

  approveRequest: (token: string, request_id: string, comment?: string) =>
    post(withTokenBody(token, { action: 'APPROVE_SETTINGS_REQUEST', request_id, comment: comment || '' })),

  rejectRequest: (token: string, request_id: string, comment?: string) =>
    post(withTokenBody(token, { action: 'REJECT_SETTINGS_REQUEST', request_id, comment: comment || '' })),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditApi = {
  list: (token: string, limit = 100) =>
    get(withToken(token, { action: 'LIST_AUDIT_LOGS', limit: String(limit) })),
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export const syncApi = {
  ping: () => get({ action: 'SYNC_PING' }),

  export: (token: string) =>
    get(withToken(token, { action: 'SYNC_EXPORT' })),

  import: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'SYNC_IMPORT', data: JSON.stringify(data) })),

  record: (token: string, records: unknown[]) =>
    post(withTokenBody(token, { action: 'SYNC_RECORD', records: JSON.stringify(records) })),
};
