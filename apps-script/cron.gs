/**
 * SM Planner — Scheduled Jobs (Time-Driven Triggers)
 * File: cron.gs
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Extensions > Apps Script
 * 2. Click the clock icon (Triggers) in the left sidebar
 * 3. Click "Add Trigger"
 * 4. Configure:
 *    Function: runDailyTasks
 *    Deployment: Head
 *    Event source: Time-driven
 *    Type: Day timer
 *    Time: 6am - 7am (or your preferred time)
 * 5. Save trigger
 * 
 * This single trigger handles all daily automated tasks.
 * No external cron service is needed.
 */

/**
 * Master daily scheduler.
 * Called once per day by the time-driven trigger.
 */
function runDailyTasks() {
  Logger.log('=== SM Planner Daily Tasks Started: ' + new Date().toISOString() + ' ===');
  
  const results = {
    reminders: null,
    archiving: null,
    purge: null,
    readiness: null,
    errors: [],
  };
  
  // 1. Process due reminders
  try {
    results.reminders = processReminders();
    Logger.log('Reminders processed: ' + JSON.stringify(results.reminders));
  } catch(e) {
    results.errors.push('Reminders: ' + e.message);
    Logger.log('ERROR in processReminders: ' + e.message);
  }
  
  // 2. Auto-archive expired planners
  try {
    results.archiving = autoArchivePlanners();
    Logger.log('Archiving: ' + JSON.stringify(results.archiving));
  } catch(e) {
    results.errors.push('Archiving: ' + e.message);
    Logger.log('ERROR in autoArchivePlanners: ' + e.message);
  }
  
  // 3. Purge old archived planners
  try {
    results.purge = purgeOldRecords();
    Logger.log('Purge: ' + JSON.stringify(results.purge));
  } catch(e) {
    results.errors.push('Purge: ' + e.message);
    Logger.log('ERROR in purgeOldRecords: ' + e.message);
  }
  
  // 4. Update member readiness scores
  try {
    updateAllReadinessScores();
    results.readiness = 'updated';
    Logger.log('Readiness scores updated');
  } catch(e) {
    results.errors.push('Readiness: ' + e.message);
    Logger.log('ERROR in updateAllReadinessScores: ' + e.message);
  }
  
  // 5. Saturday Evening Checklist Reminders Trigger
  try {
    results.checklistReminders = checkSaturdayChecklistReminders();
    Logger.log('Checklist reminders: ' + JSON.stringify(results.checklistReminders));
  } catch(e) {
    results.errors.push('ChecklistReminders: ' + e.message);
    Logger.log('ERROR in checkSaturdayChecklistReminders: ' + e.message);
  }

  // 6. Daily Ward Bulletin Member Notifications
  try {
    results.bulletinNotifications = dispatchDailyBulletinNotifications();
    Logger.log('Bulletin notifications: ' + JSON.stringify(results.bulletinNotifications));
  } catch(e) {
    results.errors.push('BulletinNotifications: ' + e.message);
    Logger.log('ERROR in dispatchDailyBulletinNotifications: ' + e.message);
  }
  
  auditLog('SYSTEM', 'DAILY_TASKS', 'SYSTEM', 'daily_run', null, results, results.errors.length > 0 ? 'PARTIAL' : 'OK');
  
  Logger.log('=== Daily Tasks Complete. Errors: ' + results.errors.length + ' ===');
  return results;
}

/**
 * Auto-archive planners that have passed their month.
 * 
 * A planner is auto-archived when:
 *   current_date >= first day of (planner_month + 1)
 * 
 * Sets:
 *   state = ARCHIVED
 *   archive_method = auto
 *   archive_date = current timestamp
 */
function autoArchivePlanners() {
  const today = new Date();
  const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const planners = dbFind('PLANNERS', p =>
    p.state !== 'ARCHIVED' && p.month && p.year
  );
  
  let archived = 0;
  
  planners.forEach(planner => {
    // The planner's month has passed if the first day of the NEXT month is <= today
    const plannerNextMonthStart = new Date(Number(planner.year), Number(planner.month), 1);
    
    if (plannerNextMonthStart <= firstOfCurrentMonth) {
      try {
        dbUpdate('PLANNERS', 'planner_id', planner.planner_id, {
          state: 'ARCHIVED',
          archive_method: 'auto',
          archive_date: now(),
        });
        
        auditLog('SYSTEM', 'ARCHIVE', 'PLANNERS', planner.planner_id,
          { state: planner.state }, { state: 'ARCHIVED', archive_method: 'auto' }, 'OK');
        
        archived++;
      } catch(e) {
        Logger.log(`Auto-archive failed for planner ${planner.planner_id}: ${e.message}`);
      }
    }
  });
  
  Logger.log(`Auto-archived ${archived} planners`);
  return { archived };
}

/**
 * Purge old archived records.
 * 
 * Retention policy:
 * - Manually archived planners: purge after 30 days
 * - Auto-archived planners: purge after 365 days
 * 
 * SAFEGUARD: Only purges ARCHIVED planners. Never touches DRAFT, SUBMITTED, or APPROVED.
 * SAFEGUARD: Logs every deletion to AUDIT_LOG before deleting.
 */
function purgeOldRecords() {
  const todayDate = new Date();
  const planners = dbFind('PLANNERS', p => p.state === 'ARCHIVED' && p.archive_date);
  
  let purged = 0;
  
  planners.forEach(planner => {
    const archiveDate = new Date(planner.archive_date);
    const daysSinceArchive = Math.floor((todayDate - archiveDate) / (1000 * 60 * 60 * 24));
    
    const retentionDays = planner.archive_method === 'manual' ? 30 : 365;
    
    if (daysSinceArchive >= retentionDays) {
      try {
        // Log before delete (safety record)
        auditLog('SYSTEM', 'PURGE', 'PLANNERS', planner.planner_id,
          planner, null, 'OK',
          `Purged after ${daysSinceArchive} days (retention: ${retentionDays} days, method: ${planner.archive_method})`);
        
        // Delete associated records first
        const agendas = dbFind('AGENDAS', a => a.planner_id === planner.planner_id);
        agendas.forEach(a => {
          try { dbDelete('AGENDAS', 'agenda_id', a.agenda_id); } catch(e) {}
        });
        
        const assignments = dbFind('ASSIGNMENTS', a => a.planner_id === planner.planner_id);
        assignments.forEach(a => {
          try { dbDelete('ASSIGNMENTS', 'assignment_id', a.assignment_id); } catch(e) {}
        });
        
        // Delete the planner itself
        dbDelete('PLANNERS', 'planner_id', planner.planner_id);
        purged++;
        
      } catch(e) {
        Logger.log(`Purge failed for planner ${planner.planner_id}: ${e.message}`);
      }
    }
  });
  
  Logger.log(`Purged ${purged} planners`);
  return { purged };
}

/**
 * Saturday Evening Checklist Reminders.
 * Checks for Sunday sacrament preparation assignments and alerts leadership / queues logs.
 */
function checkSaturdayChecklistReminders() {
  const today = new Date();
  // Check if today is Saturday (getDay() === 6) or test run
  const isSaturday = today.getDay() === 6;
  
  const allChecklists = dbReadAll('CHECKLISTS');
  const pendingAssigned = allChecklists.filter(c => 
    c.responsible && 
    c.responsible.trim().length > 0 && 
    (c.status === 'PENDING' || c.status === 'false')
  );

  if (isSaturday && pendingAssigned.length > 0) {
    notifyRoles(['ADMIN', 'BISHOPRIC'], 'SATURDAY_CHECKLIST_REMINDER',
      'Sunday Prep Reminder',
      `There are ${pendingAssigned.length} Sunday morning preparation tasks assigned for tomorrow.`,
      { count: pendingAssigned.length });
  }

  return { checked: allChecklists.length, pendingAssigned: pendingAssigned.length, isSaturday: isSaturday };
}

/**
 * Set up all time-driven triggers programmatically.
 * Run this function once from the Apps Script editor to install triggers.
 * 
 * You can also set triggers manually via the Triggers UI.
 */
function setupTriggers() {
  // Remove existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runDailyTasks') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create daily trigger at 6 AM
  ScriptApp.newTrigger('runDailyTasks')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  
  Logger.log('Trigger created: runDailyTasks runs daily at 6 AM');
  Logger.log('To verify: Check the Triggers panel in Apps Script editor');
}

/**
 * Dispatch daily ward bulletin notifications to subscribed members based on category preferences:
 * - Birthdays
 * - Daily Scripture Studies
 * - Daily Come Follow Me
 * - Next Sunday Class Lessons
 * - Activities for that day
 */
function dispatchDailyBulletinNotifications() {
  const todayStr = today();
  const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday

  const bulletins = dbReadAll('BULLETINS');
  const published = bulletins.filter(b => b.status === 'PUBLISHED');
  const activeBulletin = published.length > 0 ? published[0] : null;

  let notificationsQueue = [];

  // 1. Birthdays
  if (activeBulletin && activeBulletin.birthday_celebrants_list) {
    let celebrants = [];
    try {
      celebrants = typeof activeBulletin.birthday_celebrants_list === 'string'
        ? JSON.parse(activeBulletin.birthday_celebrants_list)
        : activeBulletin.birthday_celebrants_list;
    } catch(e) {}
    
    const todayMonthDay = todayStr.slice(5); // MM-DD
    const todayCelebrants = celebrants.filter(c => c.birthday && c.birthday.slice(5) === todayMonthDay);
    if (todayCelebrants.length > 0) {
      const names = todayCelebrants.map(c => c.name).join(', ');
      notificationsQueue.push({
        category: 'birthdays',
        title: '🎂 Ward Birthday Today!',
        body: `Wishing a very Happy Birthday to ${names}!`,
        url: '/visitbulletin',
      });
    }
  }

  // 2. Activities for that day
  if (activeBulletin && activeBulletin.activities_list) {
    let activities = [];
    try {
      activities = typeof activeBulletin.activities_list === 'string'
        ? JSON.parse(activeBulletin.activities_list)
        : activeBulletin.activities_list;
    } catch(e) {}

    const todayActivities = activities.filter(a => a.date === todayStr);
    if (todayActivities.length > 0) {
      const act = todayActivities[0];
      notificationsQueue.push({
        category: 'activities',
        title: '📅 Ward Activity Today',
        body: `${act.title || 'Ward Activity'} at ${act.time || 'scheduled time'}${act.location ? ' in ' + act.location : ''}.`,
        url: '/visitbulletin',
      });
    }
  }

  // 3. Sunday Class Lessons (Saturday morning & Sunday morning)
  if (todayDayOfWeek === 6 || todayDayOfWeek === 0) {
    notificationsQueue.push({
      category: 'sundayClasses',
      title: '⛪ Sunday Classes Preparation',
      body: 'Review your lesson for Sunday School, Relief Society, and Elders Quorum in the Ward Bulletin.',
      url: '/visitbulletin',
    });
  }

  // 4. Daily Scripture Studies
  const scriptureVerses = [
    '“Trust in the Lord with all thine heart; and lean not unto thine own understanding.” (Proverbs 3:5)',
    '“I can do all things through Christ which strengtheneth me.” (Philippians 4:13)',
    '“Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee.” (Joshua 1:9)',
    '“Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you.” (John 14:27)',
    '“Look unto me in every thought; doubt not, fear not.” (D&C 6:36)',
    '“I will go and do the things which the Lord hath commanded.” (1 Nephi 3:7)',
    '“And we talk of Christ, we rejoice in Christ, we preach of Christ.” (2 Nephi 25:26)',
  ];
  const dailyVerse = scriptureVerses[new Date().getDate() % scriptureVerses.length];
  notificationsQueue.push({
    category: 'dailyScriptures',
    title: '📖 Daily Scripture Study',
    body: dailyVerse,
    url: '/visitbulletin',
  });

  // 5. Daily Come, Follow Me
  if (activeBulletin && activeBulletin.theme) {
    notificationsQueue.push({
      category: 'dailyComeFollowMe',
      title: '🕊️ Come, Follow Me Thought',
      body: `This week: “${activeBulletin.theme}” — Take time for spiritual study today.`,
      url: '/visitbulletin',
    });
  }

  Logger.log(`Daily bulletin notification queue prepared: ${notificationsQueue.length} items`);

  let dispatchedCount = 0;
  for (const item of notificationsQueue) {
    const res = sendOneSignalPush(item.title, item.body, item.category, item.url);
    if (res && res.success) dispatchedCount++;
  }

  Logger.log(`Daily bulletin notifications dispatched via OneSignal: ${dispatchedCount}/${notificationsQueue.length}`);
  return { queued: notificationsQueue.length, dispatched: dispatchedCount };
}

/**
 * Send a notification via OneSignal REST API to all devices subscribed to that category
 */
function sendOneSignalPush(title, message, category, url) {
  const appId = getProperty('ONESIGNAL_APP_ID') || '10734c27-8114-4094-b21a-d803104ed3ff';
  const apiKey = getProperty('ONESIGNAL_REST_API_KEY');

  if (!apiKey) {
    Logger.log('[OneSignal] Note: ONESIGNAL_REST_API_KEY not configured in Script Properties yet. Skipping automated push dispatch.');
    return { success: false, reason: 'REST API Key missing' };
  }

  const targetUrl = 'https://smplans.online' + (url || '/visitbulletin');

  // Filter for users with notifications enabled and this category not explicitly disabled
  const filters = [
    { field: 'tag', key: 'notifications_enabled', relation: '=', value: 'true' },
    { field: 'tag', key: category, relation: '!=', value: 'false' }
  ];

  const payload = {
    app_id: appId,
    headings: { en: title },
    contents: { en: message },
    url: targetUrl,
    web_url: targetUrl,
    filters: filters,
  };

  const authHeader = apiKey.trim().startsWith('os_v2_')
    ? ('Key ' + apiKey.trim())
    : ('Basic ' + apiKey.trim());

  try {
    const response = UrlFetchApp.fetch('https://onesignal.com/api/v1/notifications', {
      method: 'post',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'Authorization': authHeader,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const code = response.getResponseCode();
    const respText = response.getContentText();
    Logger.log(`[OneSignal] Sent "${title}" (${category}): HTTP ${code} - ${respText}`);
    return { success: code >= 200 && code < 300, response: respText };
  } catch (err) {
    Logger.log(`[OneSignal] Error sending push "${title}": ` + err.message);
    return { success: false, error: err.message };
  }
}
