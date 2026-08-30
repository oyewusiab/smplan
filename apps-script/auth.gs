/**
 * SM Planner — Authentication & RBAC
 * File: auth.gs
 * 
 * Custom authentication using Google Apps Script + Google Sheets (USERS table).
 * 
 * SECURITY ARCHITECTURE:
 * - Passwords are hashed server-side using SHA-256 + salt (via Utilities.computeDigest).
 * - Session tokens are random strings stored in ScriptCache (not in the spreadsheet).
 * - The frontend receives a session token — never a password hash.
 * - All sensitive operations verify the token before proceeding.
 * - RBAC is enforced here, not just in the frontend.
 * 
 * LIMITATION:
 * Google Apps Script ScriptCache has a maximum duration of 6 hours.
 * Sessions expire and users must re-authenticate. This is acceptable for an MVP.
 * For longer sessions, implement a token table in Google Sheets (with expiry cleanup).
 * 
 * NOTE on Google OAuth:
 * This system does NOT use Google OAuth or Firebase Auth.
 * It implements its own username/password system stored in the USERS sheet.
 * This is appropriate for a closed internal ward application.
 */

// ─── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a password using SHA-256 with the application salt.
 * The salt is stored in Script Properties — never exposed to the frontend.
 */
function hashPassword(plaintext) {
  const salt = getProperty('SESSION_SALT') || 'DEFAULT_SALT_CHANGE_ME';
  const input = salt + plaintext + salt;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Verify a plaintext password against a stored hash.
 */
function verifyPassword(plaintext, storedHash) {
  if (!plaintext || storedHash === null || storedHash === undefined) return false;

  // Existing sheets may contain temporary plaintext passwords. Accept one for
  // migration, then authLogin replaces it with the salted hash.
  if (storedHash === plaintext) return true;
  return hashPassword(plaintext) === String(storedHash);
}

function isPasswordHash(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Generate a session token and store it in ScriptCache.
 * Returns the token string.
 */
function createSession(userId, role, name, preferredName, email) {
  const token = APP_CONFIG.TOKEN_PREFIX + Utilities.getUuid().replace(/-/g, '');
  const ttlSeconds = APP_CONFIG.SESSION_TTL_HOURS * 3600;
  
  const sessionData = JSON.stringify({
    user_id: userId,
    role: role,
    name: name,
    preferred_name: preferredName,
    email: email,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });
  
  const cache = CacheService.getScriptCache();
  cache.put('SESSION_' + token, sessionData, ttlSeconds);
  
  return {
    token: token,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

/**
 * Validate a session token. Returns the session data or null.
 */
function validateSession(token) {
  if (!token || !String(token).startsWith(APP_CONFIG.TOKEN_PREFIX)) return null;
  
  const cache = CacheService.getScriptCache();
  const raw = cache.get('SESSION_' + token);
  if (!raw) return null;
  
  try {
    const session = JSON.parse(raw);
    if (new Date(session.expires_at) < new Date()) {
      cache.remove('SESSION_' + token);
      return null;
    }
    return session;
  } catch(e) {
    return null;
  }
}

/**
 * Invalidate a session token (logout).
 */
function invalidateSession(token) {
  if (!token) return;
  const cache = CacheService.getScriptCache();
  cache.remove('SESSION_' + token);
}

// ─── Authentication ────────────────────────────────────────────────────────────

/**
 * Authenticate a user with username/email + password.
 * Returns a session object or throws an error.
 */
function authLogin(username, password) {
  if (!username || !password) throw new Error('Username and password are required');
  
  // Find user by username or email
  const user = dbFind('USERS', function(u) {
    return (u.username === username || u.email === username) && !u.disabled;
  })[0];
  
  if (!user) {
    auditLog(null, 'LOGIN', 'USERS', null, null, null, 'FAIL', 'User not found: ' + username);
    throw new Error('Invalid credentials');
  }
  
  if (user.disabled) {
    auditLog(user.user_id, 'LOGIN', 'USERS', user.user_id, null, null, 'FAIL', 'Account disabled');
    throw new Error('Account is disabled. Contact your administrator.');
  }
  
  if (!verifyPassword(password, user.password_hash)) {
    auditLog(user.user_id, 'LOGIN', 'USERS', user.user_id, null, null, 'FAIL', 'Wrong password');
    throw new Error('Invalid credentials');
  }

  if (!isPasswordHash(user.password_hash)) {
    dbUpdate('USERS', 'user_id', user.user_id, { password_hash: hashPassword(password) });
  }
  
  // Update last login
  try {
    dbUpdate('USERS', 'user_id', user.user_id, {
      last_login_date: new Date().toISOString(),
    });
  } catch(e) { /* non-critical */ }
  
  // Create session
  const sessionInfo = createSession(user.user_id, user.role, user.name, user.preferred_name, user.email);
  
  auditLog(user.user_id, 'LOGIN', 'USERS', user.user_id, null, null, 'OK', 'Login successful');
  
  return {
    ok: true,
    session: {
      user_id: user.user_id,
      name: user.name,
      preferred_name: user.preferred_name,
      email: user.email,
      role: user.role,
      token: sessionInfo.token,
      expires_at: sessionInfo.expires_at,
      must_reset_password: user.must_reset_password === true || user.must_reset_password === 'TRUE',
    },
  };
}

/**
 * Logout — invalidate the session token.
 */
function authLogout(token) {
  const session = validateSession(token);
  if (session) {
    auditLog(session.user_id, 'LOGOUT', 'USERS', session.user_id, null, null, 'OK');
    invalidateSession(token);
  }
  return { ok: true };
}

/**
 * Change password (requires current password verification).
 */
function authChangePassword(token, currentPassword, newPassword) {
  const session = requireAuth(token);
  
  if (!newPassword || newPassword.length < APP_CONFIG.PASSWORD_MIN_LENGTH) {
    throw new Error('Password must be at least ' + APP_CONFIG.PASSWORD_MIN_LENGTH + ' characters');
  }
  
  const user = dbFindOne('USERS', 'user_id', session.user_id);
  if (!user) throw new Error('User not found');
  
  if (!verifyPassword(currentPassword, user.password_hash)) {
    auditLog(session.user_id, 'CHANGE_PASSWORD', 'USERS', session.user_id, null, null, 'FAIL', 'Wrong current password');
    throw new Error('Current password is incorrect');
  }
  
  dbUpdate('USERS', 'user_id', session.user_id, {
    password_hash: hashPassword(newPassword),
    must_reset_password: false,
  });
  
  auditLog(session.user_id, 'CHANGE_PASSWORD', 'USERS', session.user_id, null, null, 'OK');
  return { ok: true };
}

// ─── Authorization ────────────────────────────────────────────────────────────

/**
 * Require a valid session. Returns the session or throws.
 */
function requireAuth(token) {
  const session = validateSession(token);
  if (!session) {
    throw new Error('Unauthorized: invalid or expired session. Please log in again.');
  }
  return session;
}

/**
 * Require a valid session with specific role(s).
 */
function requireRole(token, allowedRoles) {
  const session = requireAuth(token);
  
  if (session.role === APP_CONFIG.ROLES.ADMIN) return session; // ADMIN has full access
  
  if (!allowedRoles.includes(session.role)) {
    auditLog(session.user_id, 'UNAUTHORIZED', 'AUTH', null, null, null, 'FAIL',
      'Role ' + session.role + ' attempted action requiring: ' + allowedRoles.join(', '));
    throw new Error('Insufficient permissions. Required role: ' + allowedRoles.join(' or '));
  }
  
  return session;
}

// ─── RBAC Permission Matrix ───────────────────────────────────────────────────

const PERMISSIONS = {
  // Planners (Admin & Bishopric create/edit/submit; Clerk & Secretary view/print)
  PLANNER_CREATE:  ['ADMIN', 'BISHOPRIC'],
  PLANNER_EDIT:    ['ADMIN', 'BISHOPRIC'],
  PLANNER_SUBMIT:  ['ADMIN', 'BISHOPRIC'],
  PLANNER_APPROVE: ['ADMIN', 'BISHOPRIC'],
  PLANNER_ARCHIVE: ['ADMIN'],
  PLANNER_DELETE:  ['ADMIN'],
  PLANNER_VIEW:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Members (Admin & Clerk full authority; Bishopric view/export/analytics only)
  MEMBER_VIEW:     ['ADMIN', 'BISHOPRIC', 'CLERK'],
  MEMBER_EDIT:     ['ADMIN', 'CLERK'],
  MEMBER_DELETE:   ['ADMIN', 'CLERK'],

  // Assignments (Admin, Bishopric, Clerk, Secretary)
  ASSIGNMENT_CREATE: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  ASSIGNMENT_EDIT:   ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Agendas (Admin & Bishopric create/edit; Clerk & Secretary view/print stand copy)
  AGENDA_CREATE:   ['ADMIN', 'BISHOPRIC'],
  AGENDA_EDIT:     ['ADMIN', 'BISHOPRIC'],
  AGENDA_VIEW:     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Other Agendas (Clerk & Secretary can create & submit; Bishopric approves)
  OTHER_AGENDA_CREATE:  ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  OTHER_AGENDA_EDIT:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  OTHER_AGENDA_SUBMIT:  ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  OTHER_AGENDA_APPROVE: ['ADMIN', 'BISHOPRIC'],
  OTHER_AGENDA_VIEW:    ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  OTHER_AGENDA_DELETE:  ['ADMIN', 'BISHOPRIC'],

  // Music (Admin & Music Coordinator dedicated workspace)
  MUSIC_EDIT:      ['ADMIN', 'MUSIC'],

  // Users (Admin supreme access + Bishopric unit oversight)
  USER_MANAGE:     ['ADMIN', 'BISHOPRIC'],

  // Settings & Change Requests (Admin live edit; Clerk queue request)
  SETTINGS_EDIT:    ['ADMIN'],
  SETTINGS_REQUEST: ['ADMIN', 'CLERK'],

  // Audit
  AUDIT_VIEW:      ['ADMIN', 'CLERK'],

  // Todos & Checklists
  TODO_CREATE:     ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  TODO_EDIT:       ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
  CHECKLIST_EDIT:  ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],

  // Reminders
  REMINDER_CREATE: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'],
};

function can(session, permission) {
  if (!session) return false;
  if (session.role === APP_CONFIG.ROLES.ADMIN) return true;
  const allowed = PERMISSIONS[permission] || [];
  return allowed.includes(session.role);
}

function requirePermission(token, permission) {
  const session = requireAuth(token);
  if (!can(session, permission)) {
    auditLog(session.user_id, 'UNAUTHORIZED', 'AUTH', null, null, null, 'FAIL',
      `Permission denied: ${permission} for role ${session.role}`);
    throw new Error(`Insufficient permissions for: ${permission}`);
  }
  return session;
}
