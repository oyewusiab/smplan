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

// ─── High-Performance Client-Side Caching Layer ──────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// Dynamic cache policy rules based on action name
function getCachePolicy(action: string): { ttlMs: number; storage: 'localStorage' | 'sessionStorage' | 'memory' | 'none' } {
  switch (action) {
    case 'LIST_HYMNS':
      return { ttlMs: 24 * 60 * 60 * 1000, storage: 'localStorage' }; // 24 hours static cache
    case 'LIST_MEMBERS':
    case 'GET_MEMBERS_ANALYTICS':
    case 'GET_UNIT_SETTINGS':
      return { ttlMs: 5 * 60 * 1000, storage: 'sessionStorage' }; // 5 minutes SWR
    case 'LIST_PLANNERS':
    case 'GET_PLANNER':
    case 'LIST_AGENDAS':
    case 'LIST_OTHER_AGENDAS':
    case 'GET_OTHER_AGENDA':
    case 'LIST_ASSIGNMENTS':
    case 'LIST_BULLETINS':
    case 'LIST_ACTIVITIES':
    case 'LIST_CHECKLISTS':
    case 'LIST_TODOS':
    case 'LIST_NOTIFICATIONS':
      return { ttlMs: 45 * 1000, storage: 'memory' }; // 45 seconds SWR
    default:
      return { ttlMs: 0, storage: 'none' };
  }
}

function getCacheKey(params: Record<string, string>): string {
  const sorted = Object.entries(params)
    .filter(([k]) => k !== 'token') // Token independent key
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `SM_CACHE_${sorted}`;
}

export function invalidateClientCache(actionPrefix?: string) {
  if (!actionPrefix) {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('SM_CACHE_')) sessionStorage.removeItem(k);
      });
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('SM_CACHE_')) localStorage.removeItem(k);
      });
    } catch { /* ignore */ }
    return;
  }

  // Selective invalidation
  for (const [key] of memoryCache.entries()) {
    if (key.includes(actionPrefix)) memoryCache.delete(key);
  }
  try {
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith('SM_CACHE_') && k.includes(actionPrefix)) sessionStorage.removeItem(k);
    });
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('SM_CACHE_') && k.includes(actionPrefix)) localStorage.removeItem(k);
    });
  } catch { /* ignore */ }
}

// Invalidate on mutations automatically
function autoInvalidateOnMutation(action: string) {
  if (action.includes('PLANNER') || action.includes('AGENDA')) {
    invalidateClientCache('LIST_PLANNERS');
    invalidateClientCache('GET_PLANNER');
    invalidateClientCache('LIST_AGENDAS');
    invalidateClientCache('LIST_OTHER_AGENDAS');
    invalidateClientCache('GET_OTHER_AGENDA');
    invalidateClientCache('LIST_ASSIGNMENTS');
    invalidateClientCache('GET_MEMBERS_ANALYTICS');
  } else if (action.includes('MEMBER')) {
    invalidateClientCache('LIST_MEMBERS');
    invalidateClientCache('GET_MEMBERS_ANALYTICS');
  } else if (action.includes('BULLETIN')) {
    invalidateClientCache('LIST_BULLETINS');
    invalidateClientCache('GET_BULLETIN');
  } else if (action.includes('ACTIVITY')) {
    invalidateClientCache('LIST_ACTIVITIES');
  } else if (action.includes('CHECKLIST')) {
    invalidateClientCache('LIST_CHECKLISTS');
  } else if (action.includes('TODO')) {
    invalidateClientCache('LIST_TODOS');
  } else if (action.includes('HYMN')) {
    invalidateClientCache('LIST_HYMNS');
  } else if (action.includes('SETTING')) {
    invalidateClientCache('GET_UNIT_SETTINGS');
  }
}

// ─── Core HTTP Helpers ────────────────────────────────────────────────────────

function handleSessionExpiry(errorMsg: string) {
  if (errorMsg && (errorMsg.includes('Unauthorized') || errorMsg.includes('expired session'))) {
    useAuthStore.getState().clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

async function get<T = unknown>(params: Record<string, string>, options?: { forceRefresh?: boolean }): Promise<T> {
  const action = params.action || '';
  const policy = getCachePolicy(action);
  const cacheKey = getCacheKey(params);
  const now = Date.now();

  // If not forcing refresh, check cache
  if (!options?.forceRefresh && policy.storage !== 'none') {
    // 1. Check in-memory cache (0ms)
    const mem = memoryCache.get(cacheKey);
    if (mem && (now - mem.timestamp < mem.ttlMs)) {
      return mem.data as T;
    }

    // 2. Check persistent storage (localStorage / sessionStorage)
    if (policy.storage === 'localStorage' || policy.storage === 'sessionStorage') {
      try {
        const storage = policy.storage === 'localStorage' ? localStorage : sessionStorage;
        const raw = storage.getItem(cacheKey);
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (now - entry.timestamp < entry.ttlMs) {
            memoryCache.set(cacheKey, entry);
            return entry.data;
          }
        }
      } catch { /* storage fallback */ }
    }
  }

  // Network fetch
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

  // Store in cache if policy permits
  if (policy.storage !== 'none' && json) {
    const entry: CacheEntry<unknown> = {
      data: json,
      timestamp: now,
      ttlMs: policy.ttlMs,
    };
    memoryCache.set(cacheKey, entry);
    if (policy.storage === 'localStorage' || policy.storage === 'sessionStorage') {
      try {
        const storage = policy.storage === 'localStorage' ? localStorage : sessionStorage;
        storage.setItem(cacheKey, JSON.stringify(entry));
      } catch { /* storage full */ }
    }
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

  // Invalidate relevant caches on successful mutation
  const action = String(body.action || '');
  autoInvalidateOnMutation(action);

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
  list: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_PLANNERS' }), options),

  get: (token: string, planner_id: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_PLANNER', planner_id }), options),

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
  list: (token: string, planner_id?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_AGENDAS', ...(planner_id ? { planner_id } : {}) }), options),

  get: (token: string, agenda_id: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_AGENDA', agenda_id }), options),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_AGENDA', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_AGENDA', ...data })),

  delete: (token: string, agenda_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_AGENDA', agenda_id })),
};

// ─── Other Agendas (Bishopric, Ward Council, Youth Council, Other Meetings) ──

export const otherAgendasApi = {
  list: (token: string, filter?: { meeting_type?: string; state?: string }, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_OTHER_AGENDAS', ...(filter?.meeting_type ? { meeting_type: filter.meeting_type } : {}), ...(filter?.state ? { state: filter.state } : {}) }), options),

  get: (token: string, other_agenda_id: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_OTHER_AGENDA', other_agenda_id }), options),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_OTHER_AGENDA', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_OTHER_AGENDA', ...data })),

  approve: (token: string, other_agenda_id: string) =>
    post(withTokenBody(token, { action: 'APPROVE_OTHER_AGENDA', other_agenda_id })),

  sendEmails: (token: string, other_agenda_id: string) =>
    post(withTokenBody(token, { action: 'SEND_OTHER_AGENDA_EMAILS', other_agenda_id })),

  delete: (token: string, other_agenda_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_OTHER_AGENDA', other_agenda_id })),
};

// ─── Assignments ─────────────────────────────────────────────────────────────

export const assignmentsApi = {
  list: (token: string, planner_id?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_ASSIGNMENTS', ...(planner_id ? { planner_id } : {}) }), options),

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

  getSecretaryInfo: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_SECRETARY_INFO' }), options),

  delete: (token: string, assignment_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_ASSIGNMENT', assignment_id })),

  suggest: (token: string, role: string, date: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'SUGGEST_MEMBERS', role, date }), options),
};

// ─── Bulletins ────────────────────────────────────────────────────────────────

export const bulletinsApi = {
  list: (token: string, planner_id?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_BULLETINS', ...(planner_id ? { planner_id } : {}) }), options),

  get: (token: string, bulletin_id: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_BULLETIN', bulletin_id }), options),

  getDraftData: (token: string, date: string, planner_id?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_BULLETIN_DRAFT_DATA', date, ...(planner_id ? { planner_id } : {}) }), options),

  save: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'SAVE_BULLETIN', ...data })),

  delete: (token: string, bulletin_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_BULLETIN', bulletin_id })),

  submitFeedback: (data: Record<string, unknown>) =>
    post({ action: 'SUBMIT_BULLETIN_FEEDBACK', ...data }),

  listFeedbacks: (token: string, bulletin_id?: string, date?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_BULLETIN_FEEDBACKS', ...(bulletin_id ? { bulletin_id } : {}), ...(date ? { date } : {}) }), options),

  generateCfmAi: (token: string, lesson: string, scripture?: string) =>
    post(withTokenBody(token, { action: 'GENERATE_CFM_AI', lesson, scripture })),

  generateCfmFromUrl: (token: string, url: string) =>
    post(withTokenBody(token, { action: 'GENERATE_CFM_FROM_URL', url })),
};

// ─── Members ─────────────────────────────────────────────────────────────────

export const membersApi = {
  list: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_MEMBERS' }), options),

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

  getAnalytics: (token: string, year?: number, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_MEMBERS_ANALYTICS', ...(year ? { year: String(year) } : {}) }), options),
};

// ─── Hymns & Music ────────────────────────────────────────────────────────────

export const hymnsApi = {
  list: (token: string, query?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_HYMNS', ...(query ? { query } : {}) }), options),

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

  getRotation: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_MUSIC_ROTATION' }), options),

  getAvailability: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'GET_MUSIC_AVAILABILITY' }), options),

  saveAvailability: (token: string, records: unknown[]) =>
    post(withTokenBody(token, { action: 'SAVE_MUSIC_AVAILABILITY', records: JSON.stringify(records) })),
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const activitiesApi = {
  list: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_ACTIVITIES' }), options),

  create: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'CREATE_ACTIVITY', ...data })),

  update: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'UPDATE_ACTIVITY', ...data })),

  delete: (token: string, activity_id: string) =>
    post(withTokenBody(token, { action: 'DELETE_ACTIVITY', activity_id })),
};

// ─── Checklists ───────────────────────────────────────────────────────────────

export const checklistsApi = {
  list: (token: string, planner_id?: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_CHECKLISTS', ...(planner_id ? { planner_id } : {}) }), options),

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
  list: (token: string, options?: { forceRefresh?: boolean }) =>
    get(withToken(token, { action: 'LIST_TODOS' }), options),

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

  alignDatabase: (token: string) =>
    post(withTokenBody(token, { action: 'MAINTENANCE_ALIGN_DATABASE' })),

  import: (token: string, data: Record<string, unknown>) =>
    post(withTokenBody(token, { action: 'SYNC_IMPORT', data: JSON.stringify(data) })),

  record: (token: string, records: unknown[]) =>
    post(withTokenBody(token, { action: 'SYNC_RECORD', records: JSON.stringify(records) })),
};
