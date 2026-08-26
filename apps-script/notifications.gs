/**
 * SM Planner — Notifications & Audit Logging
 * File: notifications.gs
 */

// ─── Audit Logging ────────────────────────────────────────────────────────────

/**
 * Write an audit log entry to the AUDIT_LOG sheet.
 * This function should never throw — audit failures must not break the main operation.
 */
function auditLog(userId, action, tableName, recordId, oldVersion, newVersion, status, notes) {
  try {
    const entry = {
      log_id: generateId('LOG'),
      timestamp: now(),
      user_id: userId || 'SYSTEM',
      action: action || 'UNKNOWN',
      table_name: tableName || '',
      record_id: recordId || '',
      old_version: oldVersion ? JSON.stringify(oldVersion) : '',
      new_version: newVersion ? JSON.stringify(newVersion) : '',
      status: status || 'OK',
    };
    
    if (notes) entry.new_version = entry.new_version + (entry.new_version ? ' | ' : '') + notes;
    
    dbInsert('AUDIT_LOG', entry);
  } catch(e) {
    Logger.log('AUDIT LOG WRITE FAILED: ' + e.message);
    // Do not re-throw — audit failures must not break the main flow
  }
}

// ─── Notification Creation ────────────────────────────────────────────────────

/**
 * Create an internal notification for a user.
 */
function createNotification(toUserId, type, title, body, meta) {
  const notification = {
    notification_id: generateId('NOTIF'),
    to_user_id: toUserId,
    type: type || 'INFO',
    title: title,
    body: body,
    meta: meta ? JSON.stringify(meta) : '',
    read: false,
    created_date: now(),
  };
  
  dbInsert('NOTIFICATIONS', notification);
  return notification;
}

/**
 * Notify all users with specified roles.
 */
function notifyRoles(roles, type, title, body, meta) {
  const users = dbFind('USERS', u => roles.includes(u.role) && !u.disabled);
  users.forEach(u => createNotification(u.user_id, type, title, body, meta));
}

// ─── Reminder Processing ──────────────────────────────────────────────────────

/**
 * Process all scheduled reminders that are due.
 * Called by the daily time-driven trigger: runDailyTasks()
 */
function processReminders() {
  const todayStr = today();
  
  const dueReminders = dbFind('REMINDERS', r =>
    r.status === 'SCHEDULED' && r.scheduled_for_date && r.scheduled_for_date <= todayStr
  );
  
  Logger.log(`Processing ${dueReminders.length} due reminders`);
  
  dueReminders.forEach(reminder => {
    try {
      let sent = false;
      
      if (reminder.channel === 'EMAIL') {
        // Find user email
        const user = reminder.to_user_id
          ? dbFindOne('USERS', 'user_id', reminder.to_user_id)
          : null;
        
        const email = user ? user.email : null;
        
        if (email) {
          sent = sendEmail(email, reminder.title, reminder.body);
        } else {
          Logger.log(`No email for reminder ${reminder.reminder_id} to ${reminder.to_person}`);
        }
      } else if (reminder.channel === 'INTERNAL') {
        // Create internal notification
        if (reminder.to_user_id) {
          createNotification(reminder.to_user_id, 'REMINDER', reminder.title, reminder.body, {
            reminder_id: reminder.reminder_id,
            planner_id: reminder.planner_id,
            assignment_id: reminder.assignment_id,
          });
          sent = true;
        }
      }
      
      // Update reminder status
      dbUpdate('REMINDERS', 'reminder_id', reminder.reminder_id, {
        status: sent ? 'SENT' : 'FAILED',
        sent_date: sent ? now() : '',
      });
      
      auditLog('SYSTEM', 'REMINDER_SENT', 'REMINDERS', reminder.reminder_id,
        { status: 'SCHEDULED' }, { status: sent ? 'SENT' : 'FAILED' }, sent ? 'OK' : 'FAIL');
      
    } catch(e) {
      Logger.log(`Reminder processing error for ${reminder.reminder_id}: ${e.message}`);
      try {
        dbUpdate('REMINDERS', 'reminder_id', reminder.reminder_id, { status: 'FAILED' });
      } catch(e2) { /* non-critical */ }
    }
  });
  
  return { processed: dueReminders.length };
}
