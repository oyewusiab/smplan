/**
 * SM Planner — Permissions & RBAC Matrix
 * 
 * Stewardship Philosophy:
 * - ADMIN (Bishop): Supreme full-system access & approval authority.
 * - BISHOPRIC (1st & 2nd Counsellors): Planners, Agendas, Bulletins, Assignments, Calendar, Checklists, Pastoral Analytics & Member View/Export (cannot delete/edit members). Hidden from Settings & Archive.
 * - CLERK (Ward / Assistant Clerk): Members Directory (Full CRUD, Import, Batch Delete, Export), Settings Page (View & Submit Change Requests to Queue), Archive (View & Restore), Planners/Agendas (View submitted & Print stand copies only), Assignments & Bulletin (Generate/Print). Hidden from Music.
 * - SECRETARY (Executive Secretary): Assignments Hub (Duty slips, personalized invites, auto-populated 3-up slips with signature), Checklists, Planners/Agendas (View submitted & Print stand copies only), Bulletin & Calendar. Hidden from Members, Settings, Music, Archive, Approvals.
 * - MUSIC (Ward Music Coordinator): Music Workspace (Hymn library, rotation, conductor/pianist scheduling, mark music complete), Notifications (MUSIC_INPUT_REQUEST alerts). Hidden from all other pages.
 */

import type { UserRole } from '../types';

export type PermissionKey =
  // Planners
  | 'PLANNER_CREATE'
  | 'PLANNER_EDIT'
  | 'PLANNER_SUBMIT'
  | 'PLANNER_APPROVE'
  | 'PLANNER_DELETE'
  | 'PLANNER_VIEW'
  | 'PLANNER_PRINT'
  // Agendas
  | 'AGENDA_CREATE'
  | 'AGENDA_EDIT'
  | 'AGENDA_VIEW'
  | 'AGENDA_PRINT'
  // Assignments
  | 'ASSIGNMENTS_MANAGE'
  | 'ASSIGNMENTS_DISPATCH'
  | 'ASSIGNMENTS_PRINT'
  // Bulletin
  | 'BULLETIN_CREATE'
  | 'BULLETIN_EDIT'
  | 'BULLETIN_VIEW'
  | 'BULLETIN_EXPORT'
  // Members
  | 'MEMBER_VIEW'
  | 'MEMBER_CREATE'
  | 'MEMBER_EDIT'
  | 'MEMBER_DELETE'
  | 'MEMBER_IMPORT'
  | 'MEMBER_EXPORT'
  | 'MEMBER_ANALYTICS'
  // Music
  | 'MUSIC_WORKSPACE'
  | 'MUSIC_EDIT'
  | 'MUSIC_MARK_COMPLETE'
  // Checklists & Todos
  | 'CHECKLIST_MANAGE'
  | 'TODO_MANAGE'
  // Calendar
  | 'CALENDAR_MANAGE'
  // Communications
  | 'NOTIFICATIONS_VIEW'
  | 'REMINDERS_MANAGE'
  // Approvals & Settings
  | 'APPROVALS_DECIDE'
  | 'SETTINGS_LIVE_EDIT'
  | 'SETTINGS_QUEUE_REQUEST'
  | 'SETTINGS_VIEW'
  // User Management & Audit
  | 'USER_MANAGE'
  | 'AUDIT_VIEW'
  // Archive
  | 'ARCHIVE_VIEW'
  | 'ARCHIVE_RESTORE'
  | 'ARCHIVE_PURGE';

export const ROLE_PERMISSIONS: Record<PermissionKey, UserRole[]> = {
  // Planners: Admin & Bishopric can create/edit drafts; Clerk & Secretary can view/print submitted
  PLANNER_CREATE:  ['ADMIN', 'BISHOPRIC'],
  PLANNER_EDIT:    ['ADMIN', 'BISHOPRIC'],
  PLANNER_SUBMIT:  ['ADMIN', 'BISHOPRIC'],
  PLANNER_APPROVE: ['ADMIN', 'BISHOPRIC'],
  PLANNER_DELETE:  ['ADMIN'],
  PLANNER_VIEW:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  PLANNER_PRINT:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Agendas: Admin & Bishopric can create/edit; Clerk & Secretary can view/print
  AGENDA_CREATE:   ['ADMIN', 'BISHOPRIC'],
  AGENDA_EDIT:     ['ADMIN', 'BISHOPRIC'],
  AGENDA_VIEW:     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  AGENDA_PRINT:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Assignments: Admin, Bishopric, Clerk, Secretary can manage/print
  ASSIGNMENTS_MANAGE:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  ASSIGNMENTS_DISPATCH: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  ASSIGNMENTS_PRINT:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Bulletin
  BULLETIN_CREATE: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  BULLETIN_EDIT:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  BULLETIN_VIEW:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  BULLETIN_EXPORT: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Members: Clerk & Admin have full CRUD/Import/Delete. Bishopric has View/Export/Analytics only.
  MEMBER_VIEW:      ['ADMIN', 'BISHOPRIC', 'CLERK'],
  MEMBER_CREATE:    ['ADMIN', 'CLERK'],
  MEMBER_EDIT:      ['ADMIN', 'CLERK'],
  MEMBER_DELETE:    ['ADMIN', 'CLERK'],
  MEMBER_IMPORT:    ['ADMIN', 'CLERK'],
  MEMBER_EXPORT:    ['ADMIN', 'BISHOPRIC', 'CLERK'],
  MEMBER_ANALYTICS: ['ADMIN', 'BISHOPRIC', 'CLERK'],

  // Music: Admin & Music Coordinator only
  MUSIC_WORKSPACE:     ['ADMIN', 'MUSIC'],
  MUSIC_EDIT:          ['ADMIN', 'MUSIC'],
  MUSIC_MARK_COMPLETE: ['ADMIN', 'MUSIC'],

  // Checklists & Todos
  CHECKLIST_MANAGE: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  TODO_MANAGE:      ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Calendar
  CALENDAR_MANAGE: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Communications
  NOTIFICATIONS_VIEW: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY', 'MUSIC'],
  REMINDERS_MANAGE:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Approvals & Settings
  APPROVALS_DECIDE:       ['ADMIN', 'BISHOPRIC'],
  SETTINGS_LIVE_EDIT:     ['ADMIN'],
  SETTINGS_QUEUE_REQUEST: ['ADMIN', 'CLERK'],
  SETTINGS_VIEW:          ['ADMIN', 'CLERK'],

  // Users & Audit
  USER_MANAGE: ['ADMIN'],
  AUDIT_VIEW:  ['ADMIN', 'CLERK'],

  // Archive
  ARCHIVE_VIEW:    ['ADMIN', 'CLERK'],
  ARCHIVE_RESTORE: ['ADMIN', 'CLERK'],
  ARCHIVE_PURGE:   ['ADMIN'],
};

/**
 * Route access matrix matching the Specification Table
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/dashboard':     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY', 'MUSIC'],
  '/calendar':      ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/planners':      ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/agendas':       ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/bulletins':     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/assignments':   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/members':       ['ADMIN', 'BISHOPRIC', 'CLERK'],
  '/music':         ['ADMIN', 'MUSIC'],
  '/hymns':         ['ADMIN', 'MUSIC'],
  '/checklists':    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/todos':         ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/notifications': ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY', 'MUSIC'],
  '/reminders':     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  '/approvals':     ['ADMIN', 'BISHOPRIC'],
  '/users':         ['ADMIN'],
  '/audit':         ['ADMIN', 'CLERK'],
  '/archive':       ['ADMIN', 'CLERK'],
  '/settings':      ['ADMIN', 'CLERK'],
};

/**
 * Check if a given role has a specific permission
 */
export function can(role: UserRole | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true; // Supreme access
  const allowed = ROLE_PERMISSIONS[permission] || [];
  return allowed.includes(role);
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: UserRole | undefined | null, path: string): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true; // Supreme access

  // Normalize path (e.g., /planners/pln_123 -> /planners)
  const basePath = '/' + path.split('/').filter(Boolean)[0];
  const allowed = ROUTE_ACCESS[basePath] || ROUTE_ACCESS[path];
  if (!allowed) return true; // default open if not listed
  return allowed.includes(role);
}
