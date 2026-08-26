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
