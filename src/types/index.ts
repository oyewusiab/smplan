/**
 * SM Planner — TypeScript Type Definitions
 * Mirrors the Google Sheets schema defined in the backend specification.
 */

// ─── Roles & Permissions ─────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'BISHOPRIC' | 'CLERK' | 'SECRETARY' | 'MUSIC';

export interface User {
  user_id: string;
  member_id?: string;
  members_id?: string;
  name: string;
  preferred_name: string;
  username: string;
  email: string;
  password_hash?: string; // never sent to frontend
  role: UserRole;
  organisation: string;
  calling: string;
  phone: string;
  whatsapp: string;
  gender: 'M' | 'F' | '';
  address: string;
  lga: string;
  state: string;
  country: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  signature_data_url: string;
  notes: string;
  created_date: string;
  last_login_date: string;
  must_reset_password: boolean;
  disabled: boolean;
}

// ─── Auth Session (frontend only, not stored in Sheets) ───────────────────────

export interface AuthSession {
  user_id: string;
  name: string;
  preferred_name: string;
  email: string;
  role: UserRole;
  organisation?: string;
  token: string; // session token returned by Apps Script
  expires_at: string;
}

// ─── Planner ──────────────────────────────────────────────────────────────────

export type PlannerState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ARCHIVED';
export type ArchiveMethod = 'manual' | 'auto';

export interface Planner {
  planner_id: string;
  month: number;
  year: number;
  state: PlannerState;
  conducting_officer: string;
  weeks: string; // JSON array of week_ids or week definitions
  unit_name: string;
  created_by: string;
  created_date: string;
  updated_date: string;
  music_status: string;
  archive_method: ArchiveMethod | '';
  archive_date: string;
  sacrament_administration?: string;
}

// ─── Agenda & Speakers ────────────────────────────────────────────────────────

export type AgendaState = 'DRAFT' | 'FINAL';
export type MeetingType = 'SACRAMENT' | 'FAST_SUNDAY' | 'STAKE_CONFERENCE' | 'COMBINED' | 'SPECIAL' | 'OTHER';

export interface SpeakerItem {
  id?: string;
  prefix?: 'Brother' | 'Sister' | 'Elder' | 'Bishop' | 'President' | string;
  name: string;
  gender?: 'M' | 'F' | '';
  topic: string;
  scripture_ref?: string;
  talk_link?: string;
  minutes?: number;
}

export interface ReleaseItem {
  id?: string;
  name: string;
  calling: string;
}

export interface SustainingItem {
  id?: string;
  name: string;
  calling: string;
}

export interface OrdinationItem {
  id?: string;
  name: string;
  office: string; // Deacon, Teacher, Priest
  ordained_by: string;
  ordained_by_office: string; // High Priest, Elder, Bishop, etc.
}

export interface AdvancementItem {
  id?: string;
  name: string;
  from_office: string;
  to_office: string;
  ordained_by: string;
  ordained_by_office: string;
}

export interface BabyBlessingItem {
  id?: string;
  baby_name: string;
  family: string;
  blessed_by: string;
  blessed_by_office: string;
}

export interface BaptismItem {
  id?: string;
  name: string;
  baptized_by?: string;
  confirmed_by?: string;
}

export interface ConfirmationItem {
  id?: string;
  name: string;
  confirmed_by: string;
  office?: string;
}

export interface ConfirmationBestowalItem {
  id?: string;
  name: string;
  confirmed_by: string;
  office: string;
}

export interface FellowshipItem {
  id?: string;
  name: string;
  note?: string;
}

export interface SacramentDuties {
  preparing: string[];
  blessing: string[];
  passing: string[];
}

export interface Agenda {
  agenda_id: string;
  planner_id: string;
  week_id: string;
  created_by: string;
  created_date: string;
  updated_date: string;
  state: AgendaState;
  ward_branch: string;
  stake_district: string;
  date: string;
  type_of_meeting: MeetingType;
  other_meeting_specify: string;
  presiding: string;
  presiding_position?: string;
  conducting: string;
  conducting_position?: string;
  music_director: string;
  choir_director: string;
  organist: string;
  start_time: string;
  venue_override?: string;
  meeting_time_override?: string;
  is_canceled?: boolean | string;
  cancel_reason?: string;
  prelude_music: string;
  greetings_welcome: string;
  acknowledgements: string;
  ward_branch_business: string;
  stake_district_business: string;
  naming_blessing: string;
  confirmation_bestowal: string;
  opening_hymn: string;
  opening_hymn_number: string;
  opening_prayer: string;
  opening_prayer_gender?: 'M' | 'F' | '';
  opening_prayer_prefix?: string;
  sacrament_hymn: string;
  sacrament_hymn_number: string;
  special_music: string;
  speakers: string; // JSON string of SpeakerItem[] or raw text
  sacrament_duties?: string; // JSON string of SacramentDuties
  closing_hymn: string;
  closing_hymn_number: string;
  closing_prayer: string;
  closing_prayer_gender?: 'M' | 'F' | '';
  closing_prayer_prefix?: string;
  postlude_music: string;
  announcements: string;
  releases: string;
  calls: string;
  baptized_children: string;
  aaronic_ordinations: string;
  aaronic_advancements: string;
  achievements: string;
  babies: string;
  confirmations: string;
  fellowships: string;
  week_notes?: string;
  archive_method: string;
  archive_date: string;
}

// ─── Other Ward Leadership Agendas ───────────────────────────────────────────

export type OtherAgendaMeetingType = 'BISHOPRIC_MEETING' | 'WARD_COUNCIL' | 'WARD_YOUTH_COUNCIL' | 'PRESIDENCY_MEETING' | 'OTHER_MEETING';
export type OtherAgendaState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ARCHIVED';

export interface OtherAgendaTopic {
  id: string;
  title: string;
  presenter: string;
  minutes?: number | string;
  notes?: string;
  category?: string;
}

export interface OtherAgendaAssignment {
  id: string;
  task: string;
  assignee: string;
  assignee_email?: string;
  assignee_phone?: string;
  due_date: string;
  status: 'PENDING' | 'COMPLETED';
  notes?: string;
  email_sent?: boolean;
}

export interface OtherAgendaAttendee {
  name: string;
  calling?: string;
  role?: string;
  email?: string;
  phone?: string;
  present?: boolean;
}

export interface OtherAgenda {
  other_agenda_id: string;
  meeting_type: OtherAgendaMeetingType;
  meeting_type_other?: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  presiding: string;
  presiding_role: string;
  conducting: string;
  conducting_role: string;
  opening_hymn?: string;
  opening_prayer?: string;
  spiritual_thought_by?: string;
  spiritual_thought_topic?: string;
  closing_remarks_by?: string;
  closing_prayer?: string;
  attendees: string | OtherAgendaAttendee[];
  topics: string | OtherAgendaTopic[];
  assignments: string | OtherAgendaAssignment[];
  general_notes?: string;
  state: OtherAgendaState;
  created_by: string;
  created_by_name?: string;
  created_date: string;
  approved_by?: string;
  approved_by_name?: string;
  approved_date?: string;
  email_sent_count?: number;
  updated_date?: string;
}

export type AssignmentStatus = 'PENDING' | 'SENT' | 'REMINDED';
export type AssignmentRsvpStatus = 'CONFIRMED' | 'SUBSTITUTE_REQUESTED' | 'PENDING' | '';

export interface Assignment {
  assignment_id: string;
  planner_id: string;
  week_id: string;
  date: string;
  person: string;
  role: string;
  topic: string;
  minutes: number;
  venue: string;
  meeting_time: string;
  status: AssignmentStatus;
  phone?: string;
  email?: string;
  scripture_ref?: string;
  talk_link?: string;
  rsvp_status?: AssignmentRsvpStatus;
  notes?: string;
  created_date: string;
  updated_date?: string;
}

// ─── Bulletin ─────────────────────────────────────────────────────────────────

export type BulletinThemeKey = 'navy' | 'forest' | 'plum' | 'slate' | 'teal' | 'blue' | 'green' | 'purple' | 'red' | 'gold';
export type BulletinLayoutMode = 'standard_1p' | 'standard_2p' | 'bifold_booklet';

export interface BulletinCelebrant {
  name: string;
  day: number;
  dateStr?: string;
  phone?: string;
  formatted?: string;
}

export interface WeeklyActivityItem {
  id?: string;
  day: string; // e.g. "Monday", "Tuesday"
  activity: string; // e.g. "YSA Family Home Evening"
  time: string; // e.g. "4:30 PM"
  scope: 'Ward' | 'Stake' | 'Branch' | 'Multi-Stake' | string;
  reoccurring: boolean;
}

export interface NextActivityItem {
  id?: string;
  date: string;
  dayName?: string;
  activity: string;
  time?: string;
  organisation?: string;
  scope?: string;
}

export interface BulletinFeedback {
  feedback_id: string;
  bulletin_id: string;
  date: string;
  type: 'PRAYER_REQUEST' | 'SICKNESS_ALERT' | 'BISHOP_APPOINTMENT' | 'GENERAL';
  member_name: string;
  phone?: string;
  email?: string;
  message: string;
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';
  created_date: string;
}

export interface Bulletin {
  bulletin_id: string;
  planner_id: string;
  week_id: string;
  date: string;
  theme: string;
  meeting_type?: MeetingType | string;
  unit_name?: string;
  stake_name?: string;
  presiding?: string;
  conducting?: string;
  music_director?: string;
  organist?: string;
  opening_hymn?: string;
  opening_hymn_number?: string;
  opening_prayer?: string;
  sacrament_hymn?: string;
  sacrament_hymn_number?: string;
  speakers?: string; // JSON SpeakerItem[] or newline string
  special_music: string;
  closing_hymn?: string;
  closing_hymn_number?: string;
  closing_prayer?: string;
  announcements?: string;
  come_follow_me: string;
  cfm_url?: string;
  cfm_reading: string;
  cfm_theme: string;
  cfm_introduction?: string;
  cfm_ideas_for_learning?: string;
  cfm_reflection_options?: string[];
  cfm_reflection?: string;
  cfm_discussion_question: string;
  cfm_family_challenge: string;
  cfm_study_tip: string;
  cleaning_group: string;
  cleaning_date: string;
  cleaning_time: string;
  cleaning_instructions: string;
  show_cleaning: boolean;
  activities: string;
  activities_list?: WeeklyActivityItem[];
  next_activities_list?: NextActivityItem[];
  birthdays: string;
  birthday_message: string;
  birthday_celebrants_list?: BulletinCelebrant[];
  missionaries: string;
  scripture_of_the_week: string;
  missionary_challenge: string;
  temple_trip_date: string;
  familysearch_tip: string;
  ancestor_challenge: string;
  self_reliance_classes: string;
  ward_focus: string;
  welfare_reminders: string;
  bishopric_message: string;
  upcoming_events: string;
  qr_whatsapp: string;
  qr_familysearch: string;
  qr_gospel_library: string;
  qr_website: string;
  qr_planner_link: string;
  show_sacrament: boolean;
  show_activities: boolean;
  show_birthdays: boolean;
  show_missionary: boolean;
  show_temple: boolean;
  show_self_reliance: boolean;
  show_focus: boolean;
  show_welfare: boolean;
  show_bishopric: boolean;
  show_upcoming: boolean;
  show_qr: boolean;
  color_theme: string;
  pdf_layout: string;
  created_date: string;
  updated_date: string;
}

// ─── Member ───────────────────────────────────────────────────────────────────

export type MemberStatus = 'ACTIVE' | 'LESS_ACTIVE' | 'VISITOR' | 'MOVED' | 'Active' | 'Less-Active' | 'New Move-in';

export interface Member {
  member_id?: string;
  members_id?: string;
  name: string;
  gender: 'M' | 'F' | '' | string;
  age: number;
  phone: string;
  email: string;
  organisation: string;
  status: MemberStatus | string;
  birth_date?: string; // YYYY-MM-DD or DD-MMM-YYYY or MM-DD
  birthdate?: string; // Alias for birth_date column from sheet
  confirmation_date?: string; // YYYY-MM-DD or DD-MMM-YYYY (convert / confirmation date)
  confirmationdate?: string; // Alias for confirmation_date column from sheet
  calling?: string;
  priesthood_office?: string;
  household_id?: string;
  notes: string;
  created_date?: string;
  updated_date?: string;
  total_assignments: number;
  spoken_count: number;
  prayers_count: number;
  last_assigned_date: string;
  readiness_score: number;
}

export type RecommendedRoleType =
  | 'SPEAKER'
  | 'INVOCATION'
  | 'BENEDICTION'
  | 'MUSIC_DIRECTOR'
  | 'ORGANIST'
  | 'SACRAMENT_PREPARING'
  | 'SACRAMENT_BLESSING'
  | 'SACRAMENT_PASSING';

export interface RoleCandidate {
  member: Member;
  role: RecommendedRoleType;
  pastCount: number;
  lastAssignedDate: string;
  daysSinceLast: number;
  averageInterval: number;
  overdueDays: number;
  confidence: 'High' | 'Medium' | 'Low';
  readinessScore: number;
  reason: string;
}

export interface YouthMilestoneStats {
  passing: { activeBoys: number; totalDuties: number; progressPct: number; candidates: { name: string; age: number; count: number }[] };
  preparing: { activeBoys: number; totalDuties: number; progressPct: number; candidates: { name: string; age: number; count: number }[] };
  blessing: { activeBoys: number; totalDuties: number; progressPct: number; candidates: { name: string; age: number; count: number }[] };
}

export interface InactiveMemberAlert {
  member: Member;
  monthsSinceLast: number;
  neverAssigned: boolean;
}

export interface NewcomerAlert {
  member: Member;
  monthsJoined: number;
  confirmationDate?: string;
  bracket: '0-6m' | '7-12m';
  rolesCount: number;
}

export interface DoubleDipAlert {
  member: Member;
  monthLabel: string;
  monthKey: string;
  roles: { role: string; date: string; org?: string; planner_id?: string }[];
  distinctOrgsCount: number;
  totalRolesCount: number;
}

export interface TopicStalenessAlert {
  topic: string;
  occurrences: number;
  lastUsedDate: string;
  dates: string[];
}

export interface FamilySaturationStat {
  surname: string;
  count: number;
  percentage: number;
  members: string[];
}

export interface OrgParticipationStat {
  organisation: string;
  totalMembers: number;
  activeMembers: number;
  idleMembers: number;
  participationRate: number;
}

export interface BishopricAlertsData {
  inactiveMembers: InactiveMemberAlert[];
  newcomers: NewcomerAlert[];
  doubleDips: DoubleDipAlert[];
  topicStaleness: TopicStalenessAlert[];
  familySaturation: FamilySaturationStat[];
  orgParticipation: OrgParticipationStat[];
}

export type PastoralAlertsData = BishopricAlertsData;

export interface MonthlyActivityStat {
  monthIndex: number; // 0-11
  monthName: string; // Jan, Feb...
  done: number;
  doing: number;
  willDo: number;
  total: number;
}

export interface YearAnalyticsData {
  year: number;
  totalRoles: number;
  doneCount: number;
  doingCount: number;
  willDoCount: number;
  progressPct: number;
  monthlyStats: MonthlyActivityStat[];
  rolePredictions: Record<RecommendedRoleType, RoleCandidate[]>;
  youthMilestones: YouthMilestoneStats;
  bishopricAlerts: BishopricAlertsData;
  pastoralAlerts: BishopricAlertsData;
}

export interface MemberImportItem extends Partial<Member> {
  isValid: boolean;
  validationIssues?: string[];
  isDuplicate?: boolean;
}


// ─── Hymn ─────────────────────────────────────────────────────────────────────

export interface Hymn {
  number: number;
  title: string;
  type: string;
  theme: string;
  updated_date: string;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export type ActivityStatus = 'PLANNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Activity {
  date: string;
  activity: string;
  organisation: string;
  status: ActivityStatus;
  email_sent: boolean;
  those_involved: string;
  report_submitted: boolean;
  last_reminder: string;
  time: string;
  activity_id: string;
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export type ChecklistStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | boolean;

export interface ChecklistItem {
  checklist_id: string;
  planner_id: string;
  week_id: string;
  week_label: string;
  task: string;
  responsible: string;
  status: ChecklistStatus;
  updated_by: string;
  updated_date: string;
  category?: string;
  phone?: string;
  notes?: string;
}

export interface ChecklistWeekAggregate {
  week_id: string;
  week_label: string;
  date: string;
  totalTasks: number;
  doneTasks: number;
  progressPct: number;
  status: 'Ready ✓' | 'In Progress' | 'Pending' | 'Not Started';
  conducting?: string;
  venue?: string;
  time?: string;
}

// ─── Todo ─────────────────────────────────────────────────────────────────────

export type TodoCategory =
  | 'SUNDAY_PREP'
  | 'BUILDING_MAINTENANCE'
  | 'YOUTH_INTERVIEWS'
  | 'WELFARE'
  | 'MUSIC'
  | 'ADMIN'
  | 'GENERAL';

export type TodoPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TodoStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Todo {
  todo_id: string;
  title: string;
  details: string;
  category?: TodoCategory | string;
  due_date: string;
  priority: TodoPriority;
  status: TodoStatus;
  assigned_to_user_id: string;
  assigned_to_name?: string;
  created_by_user_id: string;
  created_by_name?: string;
  planner_id: string;
  week_id: string;
  created_date: string;
  updated_date: string;
  completed_date: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  notification_id: string;
  to_user_id: string;
  type: string;
  title: string;
  body: string;
  meta: string; // JSON
  read: boolean;
  created_date: string;
}

// ─── Reminder ─────────────────────────────────────────────────────────────────

export type ReminderChannel = 'INTERNAL' | 'EMAIL';
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface Reminder {
  reminder_id: string;
  planner_id: string;
  week_id: string;
  assignment_id: string;
  to_person: string;
  to_user_id: string;
  channel: ReminderChannel;
  title: string;
  body: string;
  scheduled_for_date: string;
  status: ReminderStatus;
  created_by_user_id: string;
  created_date: string;
  sent_date: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  log_id: string;
  timestamp: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_version: string;
  new_version: string;
  status: string;
}

// ─── Approval Request ────────────────────────────────────────────────────────

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PlannerApprovalRequest {
  request_id: string;
  planner_id: string;
  status: ApprovalStatus;
  requested_by: string;
  created_date: string;
  decided_by: string;
  decided_date: string;
  comment: string;
}

// ─── Settings Request ─────────────────────────────────────────────────────────

export interface SettingsRequest {
  request_id: string;
  requested_by: string;
  status: ApprovalStatus;
  patch: string; // JSON
  reason: string;
  decided_by: string;
  decided_date: string;
  created_date: string;
}

// ─── Unit Settings ────────────────────────────────────────────────────────────

export interface UnitSetting {
  Key: string;
  Value: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  pageSize?: number;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export type SyncStatus = 'saved' | 'saving' | 'pending' | 'failed';

export interface SyncRecord {
  id: string;
  table: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  timestamp: string;
  status: SyncStatus;
  retries: number;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
  badge?: number;
}
