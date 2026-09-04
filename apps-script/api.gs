/**
 * SM Planner — API Route Handlers
 * File: api.gs
 * 
 * Implements the business logic for all API actions.
 * Routes are dispatched from planner.gs (doGet/doPost).
 */

// ─── Auth Handlers ────────────────────────────────────────────────────────────

function handleAuthLogin(body) {
  validateRequired(body, ['username', 'password']);
  return authLogin(body.username, body.password);
}

function handleAuthLogout(body) {
  return authLogout(body.token);
}

function handleAuthChangePassword(body) {
  validateRequired(body, ['token', 'currentPassword', 'newPassword']);
  return authChangePassword(body.token, body.currentPassword, body.newPassword);
}

// ─── Planner Handlers ─────────────────────────────────────────────────────────

function handleListPlanners(params) {
  const session = requireAuth(params.token);
  let planners = dbReadAll('PLANNERS');
  
  // Draft Privacy Rule:
  // When a planner is a 'draft' it stays only with the creator/initiator; no one else can see it until it is submitted.
  planners = planners.filter(p => p.state !== 'DRAFT' || p.created_by === session.user_id);

  // Populate weeks array for each planner from AGENDAS table if empty or string
  const allAgendas = dbReadAll('AGENDAS');
  planners.forEach(p => {
    const plannerAgendas = allAgendas.filter(a => a.planner_id === p.planner_id);
    if (plannerAgendas.length > 0) {
      p.weeks = JSON.stringify(plannerAgendas);
    }
  });

  // Sort chronologically descending (latest updated or year/month first)
  planners.sort((a, b) => {
    if (b.year !== a.year) return Number(b.year) - Number(a.year);
    if (b.month !== a.month) return Number(b.month) - Number(a.month);
    return (b.updated_date || '').localeCompare(a.updated_date || '');
  });
  
  return { ok: true, data: planners };
}

function handleGetPlanner(params) {
  const session = requireAuth(params.token);
  const planner = dbFindOne('PLANNERS', 'planner_id', params.planner_id);
  if (!planner) throw new Error('Planner not found');

  // Enforce draft privacy rule on single fetch
  if (planner.state === 'DRAFT' && planner.created_by !== session.user_id) {
    throw new Error('This draft planner is private to its creator until submitted.');
  }

  // Attach full agendas from AGENDAS table
  let agendas = dbFind('AGENDAS', a => a.planner_id === params.planner_id);
  
  // If planner has sacrament_administration, enrich agendas
  let sacMap = null;
  if (planner.sacrament_administration) {
    try {
      sacMap = typeof planner.sacrament_administration === 'string' ? JSON.parse(planner.sacrament_administration) : planner.sacrament_administration;
    } catch(e) {}
  }

  if (agendas.length > 0) {
    agendas.forEach((a, idx) => {
      const rawA = a.sacrament_duties || a.sacrament;
      const hasData = rawA && rawA !== '{}' && rawA !== '{"preparing":[],"blessing":[],"passing":[]}';
      if (!hasData && sacMap && typeof sacMap === 'object') {
        const found = sacMap[a.week_id] || sacMap['week_' + (idx + 1)] || sacMap[a.date] || (Array.isArray(sacMap) ? sacMap[idx] : null);
        if (found) {
          a.sacrament_duties = typeof found === 'object' ? JSON.stringify(found) : String(found);
          a.sacrament = typeof found === 'object' ? found : (function() { try { return JSON.parse(a.sacrament_duties); } catch(e) { return {}; } })();
        }
      }
    });
    planner.weeks = JSON.stringify(agendas);
  }

  return { ok: true, data: planner };
}

function handleCreatePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_CREATE');
  validateRequired(body, ['month', 'year', 'unit_name']);
  
  const m = sanitizeNumber(body.month);
  const y = sanitizeNumber(body.year);

  // Check for duplicate
  const existing = dbFind('PLANNERS', p =>
    Number(p.month) === m && Number(p.year) === y
  );
  if (existing.length > 0) throw new Error(`A planner for ${m}/${y} already exists.`);
  
  const plannerId = generateId('PLN');
  const conducting = sanitizeString(body.conducting_officer || session.name || '');
  const unit = sanitizeString(body.unit_name);

  // Auto-calculate all Sundays in the selected month & year (4 or 5 Sundays)
  const initialAgendas = [];
  const daysInMonth = new Date(y, m, 0).getDate();
  let weekNum = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m - 1, day);
    if (d.getDay() === 0) { // 0 = Sunday
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isFirstWeek = (weekNum === 1);
      const agenda = {
        agenda_id: generateId('AGN'),
        planner_id: plannerId,
        week_id: 'week_' + weekNum,
        ward_branch: unit,
        stake_district: '',
        date: dateStr,
        type_of_meeting: isFirstWeek ? 'FAST_SUNDAY' : 'SACRAMENT',
        other_meeting_specify: '',
        presiding: 'Bishop',
        presiding_position: '',
        conducting: conducting,
        conducting_position: '',
        music_director: '',
        choir_director: '',
        organist: '',
        start_time: '10:00',
        venue_override: '',
        meeting_time_override: '',
        is_canceled: false,
        cancel_reason: '',
        prelude_music: '',
        greetings_welcome: '',
        acknowledgements: '',
        ward_branch_business: '',
        stake_district_business: '',
        naming_blessing: '',
        confirmation_bestowal: '',
        opening_hymn: '',
        opening_hymn_number: '',
        opening_prayer: '',
        opening_prayer_gender: '',
        opening_prayer_prefix: '',
        sacrament_hymn: '',
        sacrament_hymn_number: '',
        special_music: '',
        speakers: JSON.stringify(isFirstWeek ? [] : [
          { name: '', gender: 'M', topic: '', scripture_ref: '', talk_link: '' },
          { name: '', gender: 'F', topic: '', scripture_ref: '', talk_link: '' },
          { name: '', gender: 'M', topic: '', scripture_ref: '', talk_link: '' },
        ]),
        sacrament_duties: JSON.stringify({ preparing: [], blessing: [], passing: [] }),
        closing_hymn: '',
        closing_hymn_number: '',
        closing_prayer: '',
        closing_prayer_gender: '',
        closing_prayer_prefix: '',
        postlude_music: '',
        announcements: '',
        releases: '',
        calls: '',
        baptized_children: '',
        aaronic_ordinations: '',
        aaronic_advancements: '',
        achievements: '',
        babies: '',
        confirmations: '',
        fellowships: '',
        week_notes: '',
        state: 'DRAFT',
        archive_method: '',
        archive_date: '',
        created_by: session.user_id,
        created_date: now(),
        updated_date: now(),
      };

      initialAgendas.push(agenda);
      dbInsert('AGENDAS', agenda);
      weekNum++;
    }
  }

  const planner = {
    planner_id: plannerId,
    month: m,
    year: y,
    state: 'DRAFT',
    conducting_officer: conducting,
    weeks: JSON.stringify(initialAgendas),
    unit_name: unit,
    created_by: session.user_id,
    created_date: now(),
    updated_date: now(),
    music_status: 'PENDING',
    archive_method: '',
    archive_date: '',
  };
  
  dbInsert('PLANNERS', planner);
  auditLog(session.user_id, 'CREATE', 'PLANNERS', planner.planner_id, null, planner, 'OK');
  return { ok: true, data: planner };
}

function handleUpdatePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_EDIT');
  validateRequired(body, ['planner_id']);
  
  const old = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!old) throw new Error('Planner not found');

  if (old.state === 'DRAFT' && session.role !== 'ADMIN' && session.role !== 'BISHOPRIC' && old.created_by !== session.user_id) {
    throw new Error('Cannot edit another user\'s draft planner');
  }
  
  const updates = {
    conducting_officer: sanitizeString(body.conducting_officer !== undefined ? body.conducting_officer : old.conducting_officer),
    unit_name: sanitizeString(body.unit_name !== undefined ? body.unit_name : old.unit_name),
    music_status: sanitizeString(body.music_status !== undefined ? body.music_status : old.music_status),
    weeks: body.weeks ? (typeof body.weeks === 'string' ? body.weeks : JSON.stringify(body.weeks)) : old.weeks,
    updated_date: now(),
  };
  
  const result = dbUpdate('PLANNERS', 'planner_id', body.planner_id, updates);
  auditLog(session.user_id, 'UPDATE', 'PLANNERS', body.planner_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleSubmitPlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_SUBMIT');
  validateRequired(body, ['planner_id']);
  
  const planner = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!planner) throw new Error('Planner not found');
  if (planner.state !== 'DRAFT') throw new Error('Only DRAFT planners can be submitted');
  
  // Create approval request
  const request = {
    request_id: generateId('APR'),
    planner_id: body.planner_id,
    status: 'PENDING',
    requested_by: session.user_id,
    created_date: now(),
    decided_by: '',
    decided_date: '',
    comment: '',
  };
  
  dbInsert('PLANNER_APPROVAL_REQUESTS', request);
  dbUpdate('PLANNERS', 'planner_id', body.planner_id, { state: 'SUBMITTED', updated_date: now() });
  
  // Notify bishopric/admin
  notifyRoles(['ADMIN', 'BISHOPRIC'], 'APPROVAL_NEEDED',
    'Planner Submitted for Approval',
    `A planner for ${planner.month}/${planner.year} has been submitted by ${session.name} and requires your approval.`,
    { planner_id: body.planner_id, request_id: request.request_id });

  // In-App Alert for Ward Music Coordinator
  notifyRoles(['MUSIC'], 'MUSIC_INPUT_REQUEST',
    'Music Input Needed: Monthly Plan Submitted',
    `A new plan for ${planner.month}/${planner.year} has been submitted. Please input music details.`,
    { planner_id: body.planner_id, type: 'MUSIC_INPUT_REQUEST' });
  
  auditLog(session.user_id, 'SUBMIT', 'PLANNERS', body.planner_id, { state: 'DRAFT' }, { state: 'SUBMITTED' }, 'OK');
  return { ok: true, data: request };
}

function handleArchivePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_ARCHIVE');
  validateRequired(body, ['planner_id']);
  
  const old = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!old) throw new Error('Planner not found');

  const result = dbUpdate('PLANNERS', 'planner_id', body.planner_id, {
    state: 'ARCHIVED',
    archive_method: 'manual',
    archive_date: now(),
    updated_date: now(),
  });
  
  auditLog(session.user_id, 'ARCHIVE', 'PLANNERS', body.planner_id, old, result.updated, 'OK');
  return { ok: true };
}

function handleRestorePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_ARCHIVE');
  validateRequired(body, ['planner_id']);

  if (session.role !== 'ADMIN') throw new Error('Only ADMIN can restore archived planners');
  
  const old = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!old) throw new Error('Planner not found');

  const result = dbUpdate('PLANNERS', 'planner_id', body.planner_id, {
    state: 'SUBMITTED',
    archive_method: '',
    archive_date: '',
    updated_date: now(),
  });

  auditLog(session.user_id, 'RESTORE', 'PLANNERS', body.planner_id, old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleDeletePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_DELETE');
  validateRequired(body, ['planner_id']);

  if (session.role !== 'ADMIN') throw new Error('Only ADMIN (Bishop) can permanently delete planners');

  const old = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!old) throw new Error('Planner not found');

  // Cascade delete associated records across tables
  dbDelete('PLANNERS', 'planner_id', body.planner_id);

  const agendas = dbFind('AGENDAS', a => a.planner_id === body.planner_id);
  agendas.forEach(a => { try { dbDelete('AGENDAS', 'agenda_id', a.agenda_id); } catch(e) {} });

  const assignments = dbFind('ASSIGNMENTS', a => a.planner_id === body.planner_id);
  assignments.forEach(a => { try { dbDelete('ASSIGNMENTS', 'assignment_id', a.assignment_id); } catch(e) {} });

  const checklists = dbFind('CHECKLISTS', c => c.planner_id === body.planner_id);
  checklists.forEach(c => { try { dbDelete('CHECKLISTS', 'checklist_id', c.checklist_id); } catch(e) {} });

  const bulletins = dbFind('BULLETINS', b => b.planner_id === body.planner_id);
  bulletins.forEach(b => { try { dbDelete('BULLETINS', 'bulletin_id', b.bulletin_id); } catch(e) {} });

  auditLog(session.user_id, 'DELETE', 'PLANNERS', body.planner_id, old, null, 'OK');
  return { ok: true };
}

function handleRequestEditAccess(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['planner_id', 'reason']);

  const planner = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!planner) throw new Error('Planner not found');

  const request = {
    request_id: generateId('EAR'),
    planner_id: body.planner_id,
    status: 'PENDING',
    requested_by: session.user_id,
    created_date: now(),
    decided_by: '',
    decided_date: '',
    comment: sanitizeString(body.reason),
  };

  dbInsert('PLANNER_APPROVAL_REQUESTS', request);

  notifyRoles(['ADMIN', 'BISHOPRIC'], 'EDIT_ACCESS_REQUEST',
    'Edit Access Requested',
    `${session.name} has requested edit access for planner (${planner.month}/${planner.year}). Reason: ${body.reason}`,
    { planner_id: body.planner_id, request_id: request.request_id });

  auditLog(session.user_id, 'REQUEST_EDIT_ACCESS', 'PLANNER_APPROVAL_REQUESTS', request.request_id, null, request, 'OK');
  return { ok: true, data: request };
}

function handleSavePlannerWorkspace(body) {
  const session = requirePermission(body.token, 'PLANNER_EDIT');
  validateRequired(body, ['planner_id', 'agendas']);

  const planner = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!planner) throw new Error('Planner not found');

  // Update header settings if provided
  if (body.conducting_officer || body.unit_name || body.music_status) {
    dbUpdate('PLANNERS', 'planner_id', body.planner_id, {
      conducting_officer: sanitizeString(body.conducting_officer || planner.conducting_officer),
      unit_name: sanitizeString(body.unit_name || planner.unit_name),
      music_status: sanitizeString(body.music_status || planner.music_status),
      updated_date: now(),
    });
  }

  // Parse agendas array
  let agendaList = [];
  try {
    agendaList = typeof body.agendas === 'string' ? JSON.parse(body.agendas) : body.agendas;
  } catch(e) {
    throw new Error('Invalid agendas format');
  }

  const existingPlannerAgendas = dbFind('AGENDAS', a => a.planner_id === body.planner_id);
  const savedAgendas = [];
  const savedAgendaIds = new Set();

  agendaList.forEach((agData, idx) => {
    // Multi-strategy matching: 1. agenda_id (if not temp), 2. week_id, 3. date
    let existing = null;
    if (agData.agenda_id && !String(agData.agenda_id).startsWith('temp_')) {
      existing = existingPlannerAgendas.find(a => a.agenda_id === agData.agenda_id) || dbFindOne('AGENDAS', 'agenda_id', agData.agenda_id);
    }
    if (!existing && agData.week_id) {
      existing = existingPlannerAgendas.find(a => a.week_id === agData.week_id);
    }
    if (!existing && agData.date) {
      const sanitizedD = sanitizeDate(agData.date);
      existing = existingPlannerAgendas.find(a => a.date === sanitizedD);
    }

    const agendaPayload = {
      planner_id: body.planner_id,
      week_id: sanitizeString(agData.week_id || (existing ? existing.week_id : `week_${idx + 1}`)),
      ward_branch: sanitizeString(agData.ward_branch || planner.unit_name || ''),
      stake_district: sanitizeString(agData.stake_district || ''),
      date: sanitizeDate(agData.date),
      type_of_meeting: sanitizeString(agData.type_of_meeting || 'SACRAMENT'),
      other_meeting_specify: sanitizeString(agData.other_meeting_specify || ''),
      presiding: sanitizeString(agData.presiding || 'Bishop'),
      presiding_position: sanitizeString(agData.presiding_position || ''),
      conducting: sanitizeString(agData.conducting || planner.conducting_officer || ''),
      conducting_position: sanitizeString(agData.conducting_position || ''),
      music_director: sanitizeString(agData.music_director || ''),
      choir_director: sanitizeString(agData.choir_director || ''),
      organist: sanitizeString(agData.organist || ''),
      start_time: sanitizeString(agData.start_time || '10:00'),
      venue_override: sanitizeString(agData.venue_override || ''),
      meeting_time_override: sanitizeString(agData.meeting_time_override || ''),
      is_canceled: Boolean(agData.is_canceled),
      cancel_reason: sanitizeString(agData.cancel_reason || ''),
      prelude_music: sanitizeString(agData.prelude_music || ''),
      greetings_welcome: sanitizeString(agData.greetings_welcome || ''),
      acknowledgements: sanitizeString(agData.acknowledgements || ''),
      ward_branch_business: sanitizeString(agData.ward_branch_business || ''),
      stake_district_business: sanitizeString(agData.stake_district_business || ''),
      naming_blessing: sanitizeString(agData.naming_blessing || ''),
      confirmation_bestowal: sanitizeString(agData.confirmation_bestowal || ''),
      opening_hymn: sanitizeString(agData.opening_hymn || ''),
      opening_hymn_number: sanitizeString(agData.opening_hymn_number || ''),
      opening_prayer: sanitizeString(agData.opening_prayer || ''),
      opening_prayer_gender: sanitizeString(agData.opening_prayer_gender || ''),
      opening_prayer_prefix: sanitizeString(agData.opening_prayer_prefix || ''),
      sacrament_hymn: sanitizeString(agData.sacrament_hymn || ''),
      sacrament_hymn_number: sanitizeString(agData.sacrament_hymn_number || ''),
      special_music: sanitizeString(agData.special_music || ''),
      speakers: typeof agData.speakers === 'object' ? JSON.stringify(agData.speakers) : sanitizeString(agData.speakers || '[]'),
      sacrament_duties: typeof (agData.sacrament_duties || agData.sacrament) === 'object' ? JSON.stringify(agData.sacrament_duties || agData.sacrament) : sanitizeString(agData.sacrament_duties || agData.sacrament || '{}'),
      sacrament: typeof (agData.sacrament_duties || agData.sacrament) === 'object' ? (agData.sacrament_duties || agData.sacrament) : (function() {
        try { return JSON.parse(agData.sacrament_duties || agData.sacrament || '{}'); } catch(e) { return {}; }
      })(),
      closing_hymn: sanitizeString(agData.closing_hymn || ''),
      closing_hymn_number: sanitizeString(agData.closing_hymn_number || ''),
      closing_prayer: sanitizeString(agData.closing_prayer || ''),
      closing_prayer_gender: sanitizeString(agData.closing_prayer_gender || ''),
      closing_prayer_prefix: sanitizeString(agData.closing_prayer_prefix || ''),
      postlude_music: sanitizeString(agData.postlude_music || ''),
      announcements: sanitizeString(agData.announcements || ''),
      releases: sanitizeString(agData.releases || ''),
      calls: sanitizeString(agData.calls || ''),
      baptized_children: sanitizeString(agData.baptized_children || ''),
      aaronic_ordinations: sanitizeString(agData.aaronic_ordinations || ''),
      aaronic_advancements: sanitizeString(agData.aaronic_advancements || ''),
      achievements: sanitizeString(agData.achievements || ''),
      babies: sanitizeString(agData.babies || ''),
      confirmations: sanitizeString(agData.confirmations || ''),
      fellowships: sanitizeString(agData.fellowships || ''),
      week_notes: sanitizeString(agData.week_notes || ''),
      state: sanitizeString(agData.state || (existing ? existing.state : 'DRAFT')),
      archive_method: sanitizeString(agData.archive_method || (existing ? existing.archive_method : '')),
      archive_date: sanitizeString(agData.archive_date || (existing ? existing.archive_date : '')),
      updated_date: now(),
    };

    if (existing) {
      agendaPayload.agenda_id = existing.agenda_id;
      agendaPayload.created_by = existing.created_by || session.user_id;
      agendaPayload.created_date = existing.created_date || now();
      dbUpdate('AGENDAS', 'agenda_id', existing.agenda_id, agendaPayload);
      savedAgendas.push(agendaPayload);
      savedAgendaIds.add(existing.agenda_id);
    } else {
      agendaPayload.agenda_id = generateId('AGN');
      agendaPayload.created_by = session.user_id;
      agendaPayload.created_date = now();
      dbInsert('AGENDAS', agendaPayload);
      savedAgendas.push(agendaPayload);
      savedAgendaIds.add(agendaPayload.agenda_id);
    }

    // Sync Speaker & Prayer assignments
    syncAgendaAssignments(agendaPayload);
  });

  // Prune any deleted agendas for this planner if week was removed
  existingPlannerAgendas.forEach(oldAg => {
    if (!savedAgendaIds.has(oldAg.agenda_id)) {
      try { dbDelete('AGENDAS', 'agenda_id', oldAg.agenda_id); } catch(e) {}
    }
  });

  // Aggregate sacrament administration across all weeks for the dedicated PLANNERS.sacrament_administration column
  const sacramentAdminMap = {};
  savedAgendas.forEach(ag => {
    const raw = ag.sacrament_duties || ag.sacrament;
    try {
      sacramentAdminMap[ag.week_id] = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch(e) {
      sacramentAdminMap[ag.week_id] = raw;
    }
  });

  // Always update PLANNERS.weeks, PLANNERS.sacrament_administration and purge cache
  dbUpdate('PLANNERS', 'planner_id', body.planner_id, {
    weeks: JSON.stringify(savedAgendas),
    sacrament_administration: JSON.stringify(sacramentAdminMap),
    updated_date: now(),
  });

  invalidateSheetCache('AGENDAS');
  invalidateSheetCache('PLANNERS');
  invalidateSheetCache('ASSIGNMENTS');

  auditLog(session.user_id, 'SAVE_WORKSPACE', 'PLANNERS', body.planner_id, null, { weeks_count: savedAgendas.length }, 'OK');
  return { ok: true, data: { agendas: savedAgendas } };
}

// ─── Approval Handlers ────────────────────────────────────────────────────────

function handleListApprovals(params) {
  const session = requireAuth(params.token);
  const requests = dbReadAll('PLANNER_APPROVAL_REQUESTS');
  return { ok: true, data: requests };
}

function handleApprovePlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_APPROVE');
  validateRequired(body, ['request_id']);
  
  const request = dbFindOne('PLANNER_APPROVAL_REQUESTS', 'request_id', body.request_id);
  if (!request) throw new Error('Approval request not found');
  if (request.status !== 'PENDING') throw new Error('Request is not pending');
  
  dbUpdate('PLANNER_APPROVAL_REQUESTS', 'request_id', body.request_id, {
    status: 'APPROVED',
    decided_by: session.user_id,
    decided_date: now(),
    comment: sanitizeString(body.comment),
  });
  
  dbUpdate('PLANNERS', 'planner_id', request.planner_id, {
    state: 'APPROVED',
    updated_date: now(),
  });
  
  // Notify requester
  const requester = dbFindOne('USERS', 'user_id', request.requested_by);
  if (requester) {
    createNotification(requester.user_id, 'APPROVED',
      'Planner Approved',
      `Your planner has been approved by ${session.name}.${body.comment ? ' Comment: ' + body.comment : ''}`,
      { planner_id: request.planner_id });
  }
  
  auditLog(session.user_id, 'APPROVE', 'PLANNER_APPROVAL_REQUESTS', body.request_id,
    { status: 'PENDING' }, { status: 'APPROVED' }, 'OK');
  return { ok: true };
}

function handleRejectPlanner(body) {
  const session = requirePermission(body.token, 'PLANNER_APPROVE');
  validateRequired(body, ['request_id', 'comment']);
  
  const request = dbFindOne('PLANNER_APPROVAL_REQUESTS', 'request_id', body.request_id);
  if (!request) throw new Error('Request not found');
  
  dbUpdate('PLANNER_APPROVAL_REQUESTS', 'request_id', body.request_id, {
    status: 'REJECTED',
    decided_by: session.user_id,
    decided_date: now(),
    comment: sanitizeString(body.comment),
  });
  
  dbUpdate('PLANNERS', 'planner_id', request.planner_id, {
    state: 'DRAFT',
    updated_date: now(),
  });
  
  auditLog(session.user_id, 'REJECT', 'PLANNER_APPROVAL_REQUESTS', body.request_id,
    { status: 'PENDING' }, { status: 'REJECTED' }, 'OK');
  return { ok: true };
}

// ─── Agenda Handlers ─────────────────────────────────────────────────────────

function handleListAgendas(params) {
  const session = requireAuth(params.token);
  let agendas = dbReadAll('AGENDAS');
  if (params.planner_id) {
    agendas = agendas.filter(a => a.planner_id === params.planner_id);
    
    // Enrich from PLANNERS row if sacrament_administration is present
    const planner = dbFindOne('PLANNERS', 'planner_id', params.planner_id);
    if (planner && planner.sacrament_administration) {
      let sacMap = null;
      try {
        sacMap = typeof planner.sacrament_administration === 'string' ? JSON.parse(planner.sacrament_administration) : planner.sacrament_administration;
      } catch(e) {}

      if (sacMap && typeof sacMap === 'object') {
        agendas.forEach((a, idx) => {
          const rawA = a.sacrament_duties || a.sacrament;
          const hasData = rawA && rawA !== '{}' && rawA !== '{"preparing":[],"blessing":[],"passing":[]}';
          if (!hasData) {
            const foundDuties = sacMap[a.week_id] || sacMap['week_' + (idx + 1)] || sacMap[a.date] || (Array.isArray(sacMap) ? sacMap[idx] : null);
            if (foundDuties) {
              const strDuties = typeof foundDuties === 'object' ? JSON.stringify(foundDuties) : String(foundDuties);
              a.sacrament_duties = strDuties;
              a.sacrament = typeof foundDuties === 'object' ? foundDuties : (function() { try { return JSON.parse(strDuties); } catch(e) { return {}; } })();
            }
          }
        });
      }
    }
  }
  return { ok: true, data: agendas };
}

function handleGetAgenda(params) {
  const session = requireAuth(params.token);
  const agenda = dbFindOne('AGENDAS', 'agenda_id', params.agenda_id);
  if (!agenda) throw new Error('Agenda not found');
  return { ok: true, data: agenda };
}

function handleCreateAgenda(body) {
  const session = requirePermission(body.token, 'AGENDA_CREATE');
  validateRequired(body, ['date']);
  
  const formattedDate = sanitizeDate(body.date);
  
  // Duplicate Guardrail: Check if an agenda for this date (and ward) already exists
  const existingList = dbFind('AGENDAS', a => a.date === formattedDate && (!body.ward_branch || a.ward_branch === body.ward_branch));
  if (existingList.length > 0) {
    const existing = existingList[0];
    if (body.upsert) {
      body.agenda_id = existing.agenda_id;
      return handleUpdateAgenda(body);
    }
    if (!body.force) {
      return {
        ok: false,
        duplicate: true,
        existing_agenda_id: existing.agenda_id,
        created_by_same_user: existing.created_by === session.user_id,
        error: `An agenda already exists for ${formattedDate} (${existing.ward_branch || 'Sacrament Meeting'}).`
      };
    }
  }

  const agenda = {
    agenda_id: generateId('AGN'),
    planner_id: sanitizeString(body.planner_id),
    week_id: sanitizeString(body.week_id),
    created_by: session.user_id,
    created_date: now(),
    updated_date: now(),
    state: sanitizeString(body.state || 'DRAFT'),
    ward_branch: sanitizeString(body.ward_branch),
    stake_district: sanitizeString(body.stake_district),
    date: formattedDate,
    type_of_meeting: sanitizeString(body.type_of_meeting || 'SACRAMENT'),
    other_meeting_specify: sanitizeString(body.other_meeting_specify),
    presiding: sanitizeString(body.presiding),
    presiding_position: sanitizeString(body.presiding_position),
    conducting: sanitizeString(body.conducting),
    conducting_position: sanitizeString(body.conducting_position),
    music_director: sanitizeString(body.music_director),
    choir_director: sanitizeString(body.choir_director),
    organist: sanitizeString(body.organist),
    start_time: sanitizeString(body.start_time || '10:00'),
    venue_override: sanitizeString(body.venue_override),
    meeting_time_override: sanitizeString(body.meeting_time_override),
    is_canceled: Boolean(body.is_canceled),
    cancel_reason: sanitizeString(body.cancel_reason),
    prelude_music: sanitizeString(body.prelude_music),
    greetings_welcome: sanitizeString(body.greetings_welcome),
    acknowledgements: sanitizeString(body.acknowledgements),
    ward_branch_business: sanitizeString(body.ward_branch_business),
    stake_district_business: sanitizeString(body.stake_district_business),
    naming_blessing: sanitizeString(body.naming_blessing),
    confirmation_bestowal: sanitizeString(body.confirmation_bestowal),
    opening_hymn: sanitizeString(body.opening_hymn),
    opening_hymn_number: sanitizeString(body.opening_hymn_number),
    opening_prayer: sanitizeString(body.opening_prayer),
    opening_prayer_gender: sanitizeString(body.opening_prayer_gender),
    opening_prayer_prefix: sanitizeString(body.opening_prayer_prefix),
    sacrament_hymn: sanitizeString(body.sacrament_hymn),
    sacrament_hymn_number: sanitizeString(body.sacrament_hymn_number),
    special_music: sanitizeString(body.special_music),
    speakers: typeof body.speakers === 'object' ? JSON.stringify(body.speakers) : sanitizeString(body.speakers),
    sacrament_duties: typeof body.sacrament_duties === 'object' ? JSON.stringify(body.sacrament_duties) : sanitizeString(body.sacrament_duties),
    closing_hymn: sanitizeString(body.closing_hymn),
    closing_hymn_number: sanitizeString(body.closing_hymn_number),
    closing_prayer: sanitizeString(body.closing_prayer),
    closing_prayer_gender: sanitizeString(body.closing_prayer_gender),
    closing_prayer_prefix: sanitizeString(body.closing_prayer_prefix),
    postlude_music: sanitizeString(body.postlude_music),
    announcements: sanitizeString(body.announcements),
    releases: sanitizeString(body.releases),
    calls: sanitizeString(body.calls),
    baptized_children: sanitizeString(body.baptized_children),
    aaronic_ordinations: sanitizeString(body.aaronic_ordinations),
    aaronic_advancements: sanitizeString(body.aaronic_advancements),
    achievements: sanitizeString(body.achievements),
    babies: sanitizeString(body.babies),
    confirmations: sanitizeString(body.confirmations),
    fellowships: sanitizeString(body.fellowships),
    week_notes: sanitizeString(body.week_notes),
    archive_method: '',
    archive_date: '',
  };
  
  dbInsert('AGENDAS', agenda);

  // Sync prayer & speaker assignments
  syncAgendaAssignments(agenda);

  auditLog(session.user_id, 'CREATE', 'AGENDAS', agenda.agenda_id, null, agenda, 'OK');
  return { ok: true, data: agenda };
}

function handleUpdateAgenda(body) {
  const session = requirePermission(body.token, 'AGENDA_EDIT');
  validateRequired(body, ['agenda_id']);
  
  const old = dbFindOne('AGENDAS', 'agenda_id', body.agenda_id);
  if (!old) throw new Error('Agenda not found');
  
  const updates = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => !['token', 'action', 'upsert', 'force'].includes(k))
      .map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : sanitizeString(String(v))])
  );
  updates.updated_date = now();
  
  const result = dbUpdate('AGENDAS', 'agenda_id', body.agenda_id, updates);
  
  // Sync prayer & speaker assignments
  syncAgendaAssignments(result.updated);

  auditLog(session.user_id, 'UPDATE', 'AGENDAS', body.agenda_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function syncAgendaAssignments(agenda) {
  if (!agenda || !agenda.date) return;
  try {
    // Sync Speakers
    let spList = [];
    if (agenda.speakers) {
      if (typeof agenda.speakers === 'string') {
        try { spList = JSON.parse(agenda.speakers); } catch(e) {}
      } else if (Array.isArray(agenda.speakers)) {
        spList = agenda.speakers;
      }
    }
    if (Array.isArray(spList)) {
      spList.forEach(sp => {
        if (sp && sp.name && sp.name.trim()) {
          updateMemberAssignmentStats(sp.name, 'SPEAKER', agenda.date);
        }
      });
    }

    // Sync Prayers
    if (agenda.opening_prayer) {
      updateMemberAssignmentStats(agenda.opening_prayer, 'OPENING_PRAYER', agenda.date);
    }
    if (agenda.closing_prayer) {
      updateMemberAssignmentStats(agenda.closing_prayer, 'CLOSING_PRAYER', agenda.date);
    }
  } catch(e) {
    Logger.log('Assignment sync note: ' + e.message);
  }
}

function handleDeleteAgenda(body) {
  const session = requirePermission(body.token, 'AGENDA_EDIT');
  validateRequired(body, ['agenda_id']);
  
  const old = dbDelete('AGENDAS', 'agenda_id', body.agenda_id);
  auditLog(session.user_id, 'DELETE', 'AGENDAS', body.agenda_id, old, null, 'OK');
  return { ok: true };
}

// ─── Assignment Handlers ──────────────────────────────────────────────────────

function handleListAssignments(params) {
  const session = requireAuth(params.token);
  let assignments = dbReadAll('ASSIGNMENTS');
  if (params.planner_id) {
    const planner = dbFindOne('PLANNERS', 'planner_id', params.planner_id);
    assignments = assignments.filter(a => {
      if (a.planner_id === params.planner_id) return true;
      if (planner && a.date) {
        const parts = String(a.date).split('-');
        if (parts.length >= 2) {
          const yr = Number(parts[0]);
          const mo = Number(parts[1]);
          if (yr === Number(planner.year) && mo === Number(planner.month)) return true;
        }
      }
      return false;
    });
  }

  // Enrich with member directory contact details if phone/email are empty
  const members = dbReadAll('MEMBERS_LIST');
  const memberMap = {};
  members.forEach(m => {
    if (m && m.name) {
      memberMap[m.name.trim().toLowerCase()] = m;
    }
  });

  assignments = assignments.map(a => {
    const rawName = (a.person || '').replace(/^(Brother|Sister|Bro\.|Sis\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    const matched = memberMap[rawName] || memberMap[(a.person || '').trim().toLowerCase()];
    return {
      ...a,
      phone: a.phone || (matched ? matched.phone : ''),
      email: a.email || (matched ? matched.email : ''),
      status: a.status || 'PENDING',
      rsvp_status: a.rsvp_status || 'PENDING',
    };
  });

  return { ok: true, data: assignments };
}

function handleCreateAssignment(body) {
  const session = requirePermission(body.token, 'ASSIGNMENT_CREATE');
  validateRequired(body, ['person', 'date', 'role']);
  
  const assignment = {
    assignment_id: generateId('ASN'),
    planner_id: sanitizeString(body.planner_id),
    week_id: sanitizeString(body.week_id),
    date: sanitizeDate(body.date),
    person: sanitizeString(body.person),
    role: sanitizeString(body.role),
    topic: sanitizeString(body.topic),
    minutes: sanitizeNumber(body.minutes, 10),
    venue: sanitizeString(body.venue),
    meeting_time: sanitizeString(body.meeting_time),
    status: sanitizeString(body.status || 'PENDING'),
    phone: sanitizeString(body.phone),
    email: sanitizeEmail(body.email),
    scripture_ref: sanitizeString(body.scripture_ref),
    talk_link: sanitizeString(body.talk_link),
    rsvp_status: sanitizeString(body.rsvp_status || 'PENDING'),
    notes: sanitizeString(body.notes),
    created_date: now(),
    updated_date: now(),
  };
  
  dbInsert('ASSIGNMENTS', assignment);
  
  // Update member's assignment stats
  updateMemberAssignmentStats(assignment.person, assignment.role, assignment.date);
  
  auditLog(session.user_id, 'CREATE', 'ASSIGNMENTS', assignment.assignment_id, null, assignment, 'OK');
  return { ok: true, data: assignment };
}

function handleUpdateAssignment(body) {
  const session = requirePermission(body.token, 'ASSIGNMENT_EDIT');
  validateRequired(body, ['assignment_id']);
  
  const updates = {
    person: sanitizeString(body.person),
    date: sanitizeDate(body.date),
    role: sanitizeString(body.role),
    topic: sanitizeString(body.topic),
    minutes: sanitizeNumber(body.minutes, 10),
    venue: sanitizeString(body.venue),
    meeting_time: sanitizeString(body.meeting_time),
    status: sanitizeString(body.status || 'PENDING'),
    phone: sanitizeString(body.phone),
    email: sanitizeEmail(body.email),
    scripture_ref: sanitizeString(body.scripture_ref),
    talk_link: sanitizeString(body.talk_link),
    rsvp_status: sanitizeString(body.rsvp_status || 'PENDING'),
    notes: sanitizeString(body.notes),
    updated_date: now(),
  };
  
  const result = dbUpdate('ASSIGNMENTS', 'assignment_id', body.assignment_id, updates);
  auditLog(session.user_id, 'UPDATE', 'ASSIGNMENTS', body.assignment_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleBatchUpdateAssignments(body) {
  const session = requirePermission(body.token, 'ASSIGNMENT_EDIT');
  validateRequired(body, ['updates']);
  
  const updatesList = Array.isArray(body.updates) ? body.updates : [];
  const results = [];
  
  updatesList.forEach(item => {
    if (!item || !item.assignment_id) return;
    const patch = { ...item, updated_date: now() };
    delete patch.assignment_id;
    delete patch.created_date;
    const res = dbUpdate('ASSIGNMENTS', 'assignment_id', item.assignment_id, patch);
    if (res && res.updated) results.push(res.updated);
  });
  
  auditLog(session.user_id, 'BATCH_UPDATE', 'ASSIGNMENTS', `${results.length} items`, null, null, 'OK');
  return { ok: true, data: results, count: results.length };
}

function handleExtractPlannerAssignments(body) {
  const session = requirePermission(body.token, 'ASSIGNMENT_CREATE');
  validateRequired(body, ['planner_id']);
  
  const plannerId = sanitizeString(body.planner_id);
  const planner = dbFindOne('PLANNERS', 'planner_id', plannerId);
  if (!planner) throw new Error('Planner not found');

  const agendas = dbFind('AGENDAS', a => a.planner_id === plannerId);
  const existingAssignments = dbFind('ASSIGNMENTS', a => a.planner_id === plannerId);
  
  const members = dbReadAll('MEMBERS_LIST');
  const memberMap = {};
  members.forEach(m => {
    if (m && m.name) {
      memberMap[m.name.trim().toLowerCase()] = m;
    }
  });

  const getMemberContact = (name) => {
    if (!name) return { phone: '', email: '' };
    const raw = name.replace(/^(Brother|Sister|Bro\.|Sis\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    const m = memberMap[raw] || memberMap[name.trim().toLowerCase()];
    return {
      phone: m ? m.phone : '',
      email: m ? m.email : '',
    };
  };

  const extractedItems = [];

  agendas.forEach(ag => {
    const meetingDate = ag.date;
    const meetingTime = ag.meeting_time_override || ag.start_time || '10:00';
    const venue = ag.venue_override || ag.ward_branch || planner.unit_name || 'Main Chapel';

    // 1. Invocation (Opening Prayer)
    if (ag.opening_prayer && ag.opening_prayer.trim()) {
      const contact = getMemberContact(ag.opening_prayer);
      extractedItems.push({
        planner_id: plannerId,
        week_id: ag.week_id || '',
        date: meetingDate,
        person: ag.opening_prayer.trim(),
        role: 'OPENING_PRAYER',
        topic: 'Opening Prayer',
        minutes: 2,
        venue: venue,
        meeting_time: meetingTime,
        phone: contact.phone,
        email: contact.email,
        scripture_ref: '',
        talk_link: '',
      });
    }

    // 2. Benediction (Closing Prayer)
    if (ag.closing_prayer && ag.closing_prayer.trim()) {
      const contact = getMemberContact(ag.closing_prayer);
      extractedItems.push({
        planner_id: plannerId,
        week_id: ag.week_id || '',
        date: meetingDate,
        person: ag.closing_prayer.trim(),
        role: 'CLOSING_PRAYER',
        topic: 'Closing Prayer',
        minutes: 2,
        venue: venue,
        meeting_time: meetingTime,
        phone: contact.phone,
        email: contact.email,
        scripture_ref: '',
        talk_link: '',
      });
    }

    // 3. Speakers
    let speakersList = [];
    if (ag.speakers) {
      if (typeof ag.speakers === 'string') {
        try { speakersList = JSON.parse(ag.speakers); } catch(e) {}
      } else if (Array.isArray(ag.speakers)) {
        speakersList = ag.speakers;
      }
    }

    if (Array.isArray(speakersList)) {
      speakersList.forEach((sp, idx) => {
        if (sp && sp.name && sp.name.trim()) {
          const contact = getMemberContact(sp.name);
          const roleLabel = idx === 0 ? 'SPEAKER_1' : idx === 1 ? 'SPEAKER_2' : idx === 2 ? 'SPEAKER_3' : 'SPEAKER';
          extractedItems.push({
            planner_id: plannerId,
            week_id: ag.week_id || '',
            date: meetingDate,
            person: sp.name.trim(),
            role: roleLabel,
            topic: sp.topic || 'Sacrament Talk',
            minutes: sp.minutes || (idx === 0 ? 10 : idx === 1 ? 10 : 15),
            venue: venue,
            meeting_time: meetingTime,
            phone: contact.phone,
            email: contact.email,
            scripture_ref: sp.scripture_ref || '',
            talk_link: sp.talk_link || '',
          });
        }
      });
    }

    // 4. Sacrament Duties
    let duties = null;
    if (ag.sacrament_duties) {
      if (typeof ag.sacrament_duties === 'string') {
        try { duties = JSON.parse(ag.sacrament_duties); } catch(e) {}
      } else if (typeof ag.sacrament_duties === 'object') {
        duties = ag.sacrament_duties;
      }
    }

    if (duties) {
      ['preparing', 'blessing', 'passing'].forEach(dutyType => {
        const list = duties[dutyType];
        if (Array.isArray(list)) {
          list.forEach(name => {
            if (name && name.trim()) {
              const contact = getMemberContact(name);
              extractedItems.push({
                planner_id: plannerId,
                week_id: ag.week_id || '',
                date: meetingDate,
                person: name.trim(),
                role: `SACRAMENT_${dutyType.toUpperCase()}`,
                topic: `Sacrament ${dutyType.charAt(0).toUpperCase() + dutyType.slice(1)}`,
                minutes: 5,
                venue: venue,
                meeting_time: meetingTime,
                phone: contact.phone,
                email: contact.email,
                scripture_ref: '',
                talk_link: '',
              });
            }
          });
        }
      });
    }
  });

  // Upsert extracted assignments into database
  const createdOrUpdated = [];
  extractedItems.forEach(item => {
    const existing = existingAssignments.find(ea =>
      ea.planner_id === item.planner_id &&
      ea.date === item.date &&
      ea.person.toLowerCase() === item.person.toLowerCase() &&
      ea.role === item.role
    );

    if (existing) {
      // Keep existing ID and statuses, update missing metadata
      const updates = {
        topic: item.topic || existing.topic,
        minutes: existing.minutes || item.minutes,
        venue: item.venue || existing.venue,
        meeting_time: item.meeting_time || existing.meeting_time,
        scripture_ref: item.scripture_ref || existing.scripture_ref,
        talk_link: item.talk_link || existing.talk_link,
        phone: existing.phone || item.phone,
        email: existing.email || item.email,
        updated_date: now(),
      };
      const res = dbUpdate('ASSIGNMENTS', 'assignment_id', existing.assignment_id, updates);
      createdOrUpdated.push(res.updated || { ...existing, ...updates });
    } else {
      // Create new assignment
      const newAsn = {
        assignment_id: generateId('ASN'),
        planner_id: item.planner_id,
        week_id: item.week_id,
        date: item.date,
        person: item.person,
        role: item.role,
        topic: item.topic,
        minutes: item.minutes,
        venue: item.venue,
        meeting_time: item.meeting_time,
        status: 'PENDING',
        phone: item.phone,
        email: item.email,
        scripture_ref: item.scripture_ref,
        talk_link: item.talk_link,
        rsvp_status: 'PENDING',
        notes: '',
        created_date: now(),
        updated_date: now(),
      };
      dbInsert('ASSIGNMENTS', newAsn);
      createdOrUpdated.push(newAsn);
    }
  });

  auditLog(session.user_id, 'EXTRACT', 'ASSIGNMENTS', plannerId, null, `${createdOrUpdated.length} items extracted`, 'OK');
  return { ok: true, data: createdOrUpdated, count: createdOrUpdated.length };
}

function handleUpdateAssignmentRsvp(body) {
  validateRequired(body, ['assignment_id', 'rsvp_status']);
  const asn = dbFindOne('ASSIGNMENTS', 'assignment_id', body.assignment_id);
  if (!asn) throw new Error('Assignment not found');

  const updates = {
    rsvp_status: sanitizeString(body.rsvp_status),
    updated_date: now(),
  };

  const result = dbUpdate('ASSIGNMENTS', 'assignment_id', body.assignment_id, updates);
  auditLog(body.user_id || 'MEMBER_RSVP', 'RSVP', 'ASSIGNMENTS', body.assignment_id, asn, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleGetSecretaryInfo(params) {
  const session = requireAuth(params.token);
  
  const allUsers = dbReadAll('USERS');
  
  // 1. Find user with SECRETARY role
  let secretary = allUsers.find(u => u && u.role === 'SECRETARY' && !u.disabled);
  
  // 2. If not found, look for user with calling containing Executive Secretary or Secretary
  if (!secretary) {
    secretary = allUsers.find(u => u && u.calling && (
      u.calling.toLowerCase().includes('executive secretary') ||
      u.calling.toLowerCase().includes('secretary')
    ) && !u.disabled);
  }
  
  // 3. If still not found and session user is clerk/bishopric/secretary, check session user
  if (!secretary && session) {
    secretary = allUsers.find(u => u && u.user_id === session.user_id);
  }

  const defaultName = 'Oloyede Michael Oluwagbemiga';
  const defaultCalling = 'SECRETARY';

  return {
    ok: true,
    data: {
      name: secretary ? (secretary.name || secretary.preferred_name || defaultName) : defaultName,
      calling: secretary ? (secretary.calling || defaultCalling) : defaultCalling,
      phone: secretary ? secretary.phone : '',
      email: secretary ? secretary.email : '',
      signature_data_url: secretary ? (secretary.signature_data_url || '') : '',
      unit_name: secretary ? secretary.organisation : '',
    }
  };
}

function handleDeleteAssignment(body) {
  const session = requirePermission(body.token, 'ASSIGNMENT_EDIT');
  validateRequired(body, ['assignment_id']);
  
  const old = dbDelete('ASSIGNMENTS', 'assignment_id', body.assignment_id);
  auditLog(session.user_id, 'DELETE', 'ASSIGNMENTS', body.assignment_id, old, null, 'OK');
  return { ok: true };
}

function handleSuggestMembers(params) {
  const session = requireAuth(params.token);
  const members = suggestMembersForRole(params.role, params.date);
  return { ok: true, data: members };
}

function updateMemberAssignmentStats(personName, role, date) {
  try {
    const member = dbFindOne('MEMBERS_LIST', 'name', personName);
    if (!member) return;
    
    const updates = {
      total_assignments: (sanitizeNumber(member.total_assignments, 0)) + 1,
      last_assigned_date: date || today(),
    };
    
    if (role === 'SPEAKER' || role === 'YOUTH_SPEAKER') {
      updates.spoken_count = (sanitizeNumber(member.spoken_count, 0)) + 1;
    }
    if (role === 'OPENING_PRAYER' || role === 'CLOSING_PRAYER') {
      updates.prayers_count = (sanitizeNumber(member.prayers_count, 0)) + 1;
    }
    
    updates.readiness_score = calculateReadinessScore(
      updates.spoken_count || member.spoken_count,
      updates.last_assigned_date
    );
    
    dbUpdate('MEMBERS_LIST', 'name', personName, updates);
  } catch(e) {
    Logger.log('Error updating member stats for ' + personName + ': ' + e.message);
  }
}

// ─── Member Handlers ─────────────────────────────────────────────────────────

function handleListMembers(params) {
  const session = requirePermission(params.token, 'MEMBER_VIEW');
  const members = dbReadAll('MEMBERS_LIST');
  
  // Auto-generate 6-character uppercase alphanumeric ID for any existing member missing it
  const existingIds = new Set(members.map(m => m.members_id || m.member_id).filter(Boolean));
  
  members.forEach(m => {
    let id = m.members_id || m.member_id;
    if (!id || String(id).trim() === '') {
      id = generateMemberId(existingIds);
      existingIds.add(id);
      m.members_id = id;
      m.member_id = id;
      try {
        dbUpdate('MEMBERS_LIST', 'name', m.name, { members_id: id, member_id: id });
      } catch(e) {
        Logger.log('Note on auto-generating member ID: ' + e.message);
      }
    } else {
      m.members_id = String(id).trim();
      m.member_id = String(id).trim();
    }
  });

  return { ok: true, data: members };
}

function handleCreateMember(body) {
  const session = requirePermission(body.token, 'MEMBER_EDIT');
  validateRequired(body, ['name']);
  
  const existing = dbFindOne('MEMBERS_LIST', 'name', sanitizeString(body.name));
  if (existing) throw new Error('A member with this name already exists');
  
  const existingMembers = dbReadAll('MEMBERS_LIST');
  const existingIds = new Set(existingMembers.map(m => m.members_id || m.member_id).filter(Boolean));
  const mId = sanitizeString(body.members_id || body.member_id) || generateMemberId(existingIds);
  existingIds.add(mId);

  const member = {
    members_id: mId,
    member_id: mId,
    name: sanitizeString(body.name),
    gender: sanitizeString(body.gender),
    age: sanitizeNumber(body.age, 0),
    phone: sanitizeString(body.phone),
    email: sanitizeEmail(body.email),
    organisation: sanitizeString(body.organisation),
    status: sanitizeString(body.status || 'ACTIVE'),
    birth_date: sanitizeString(body.birth_date),
    calling: sanitizeString(body.calling),
    priesthood_office: sanitizeString(body.priesthood_office),
    household_id: sanitizeString(body.household_id),
    notes: sanitizeString(body.notes),
    created_date: now(),
    updated_date: now(),
    total_assignments: sanitizeNumber(body.total_assignments, 0),
    spoken_count: sanitizeNumber(body.spoken_count, 0),
    prayers_count: sanitizeNumber(body.prayers_count, 0),
    last_assigned_date: sanitizeString(body.last_assigned_date),
    readiness_score: sanitizeNumber(body.readiness_score, 100),
  };
  
  dbInsert('MEMBERS_LIST', member);
  auditLog(session.user_id, 'CREATE', 'MEMBERS_LIST', member.name, null, member, 'OK');
  return { ok: true, data: member };
}

function handleUpdateMember(body) {
  const session = requirePermission(body.token, 'MEMBER_EDIT');
  validateRequired(body, ['name']);
  
  const old = dbFindOne('MEMBERS_LIST', 'name', body.name);
  if (!old) throw new Error('Member not found');

  const mId = sanitizeString(body.members_id || body.member_id || old.members_id || old.member_id) || generateMemberId();

  const updates = {
    members_id: mId,
    member_id: mId,
    gender: body.gender !== undefined ? sanitizeString(body.gender) : old.gender,
    age: body.age !== undefined ? sanitizeNumber(body.age, 0) : old.age,
    phone: body.phone !== undefined ? sanitizeString(body.phone) : old.phone,
    email: body.email !== undefined ? sanitizeEmail(body.email) : old.email,
    organisation: body.organisation !== undefined ? sanitizeString(body.organisation) : old.organisation,
    status: body.status !== undefined ? sanitizeString(body.status) : old.status,
    birth_date: body.birth_date !== undefined ? sanitizeString(body.birth_date) : old.birth_date,
    calling: body.calling !== undefined ? sanitizeString(body.calling) : old.calling,
    priesthood_office: body.priesthood_office !== undefined ? sanitizeString(body.priesthood_office) : old.priesthood_office,
    household_id: body.household_id !== undefined ? sanitizeString(body.household_id) : old.household_id,
    notes: body.notes !== undefined ? sanitizeString(body.notes) : old.notes,
    updated_date: now(),
  };
  
  const result = dbUpdate('MEMBERS_LIST', 'name', body.name, updates);
  auditLog(session.user_id, 'UPDATE', 'MEMBERS_LIST', body.name, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleDeleteMember(body) {
  const session = requirePermission(body.token, 'MEMBER_EDIT');
  validateRequired(body, ['name']);
  
  const old = dbDelete('MEMBERS_LIST', 'name', body.name);
  auditLog(session.user_id, 'DELETE', 'MEMBERS_LIST', body.name, old, null, 'OK');
  return { ok: true };
}

function handleBatchDeleteMembers(body) {
  const session = requirePermission(body.token, 'MEMBER_EDIT');
  let names = [];
  if (Array.isArray(body.names)) {
    names = body.names;
  } else if (typeof body.names === 'string') {
    try { names = JSON.parse(body.names); } catch(e) { names = [body.names]; }
  }

  if (!names || names.length === 0) throw new Error('No member names provided for deletion');

  let deletedCount = 0;
  names.forEach(name => {
    try {
      dbDelete('MEMBERS_LIST', 'name', name);
      deletedCount++;
    } catch(e) {}
  });

  auditLog(session.user_id, 'BATCH_DELETE', 'MEMBERS_LIST', names.join(','), null, `${deletedCount} members deleted`, 'OK');
  return { ok: true, deletedCount: deletedCount };
}

function handleBatchImportMembers(body) {
  const session = requirePermission(body.token, 'MEMBER_EDIT');
  let list = [];
  if (Array.isArray(body.members)) {
    list = body.members;
  } else if (typeof body.members === 'string') {
    try { list = JSON.parse(body.members); } catch(e) { throw new Error('Invalid members JSON'); }
  }

  if (!list || list.length === 0) throw new Error('No members to import');

  const mode = sanitizeString(body.mode).toUpperCase() || 'MERGE';

  if (mode === 'OVERWRITE') {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('MEMBERS_LIST');
    if (sheet && sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  }

  const existingMembers = mode === 'OVERWRITE' ? [] : dbReadAll('MEMBERS_LIST');
  const existingIds = new Set(existingMembers.map(m => m.members_id || m.member_id).filter(Boolean));

  let count = 0;
  list.forEach(item => {
    if (!item || !item.name || !String(item.name).trim()) return;
    const cleanName = sanitizeString(item.name);
    const existing = mode === 'OVERWRITE' ? null : dbFindOne('MEMBERS_LIST', 'name', cleanName);

    const mId = sanitizeString(item.members_id || item.member_id || (existing && (existing.members_id || existing.member_id))) || generateMemberId(existingIds);
    existingIds.add(mId);

    const record = {
      members_id: mId,
      member_id: mId,
      name: cleanName,
      gender: sanitizeString(item.gender),
      age: sanitizeNumber(item.age, 0),
      phone: sanitizeString(item.phone),
      email: sanitizeEmail(item.email),
      organisation: sanitizeString(item.organisation),
      status: sanitizeString(item.status || 'ACTIVE'),
      birth_date: sanitizeString(item.birth_date),
      calling: sanitizeString(item.calling),
      priesthood_office: sanitizeString(item.priesthood_office),
      household_id: sanitizeString(item.household_id),
      notes: sanitizeString(item.notes),
      created_date: (existing && existing.created_date) || now(),
      updated_date: now(),
      total_assignments: sanitizeNumber(item.total_assignments, (existing && existing.total_assignments) || 0),
      spoken_count: sanitizeNumber(item.spoken_count, (existing && existing.spoken_count) || 0),
      prayers_count: sanitizeNumber(item.prayers_count, (existing && existing.prayers_count) || 0),
      last_assigned_date: sanitizeString(item.last_assigned_date || (existing && existing.last_assigned_date) || ''),
      readiness_score: sanitizeNumber(item.readiness_score, (existing && existing.readiness_score) || 100),
    };

    if (existing) {
      dbUpdate('MEMBERS_LIST', 'name', cleanName, record);
    } else {
      dbInsert('MEMBERS_LIST', record);
    }
    count++;
  });

  auditLog(session.user_id, 'BATCH_IMPORT', 'MEMBERS_LIST', mode, null, `${count} members imported (${mode})`, 'OK');
  return { ok: true, count: count, mode: mode };
}

function handleGetMembersAnalytics(params) {
  const session = requirePermission(params.token, 'MEMBER_VIEW');
  const year = sanitizeNumber(params.year, new Date().getFullYear());
  
  const members = dbReadAll('MEMBERS_LIST');
  const assignments = dbReadAll('ASSIGNMENTS');
  const planners = dbReadAll('PLANNERS');
  
  return {
    ok: true,
    data: {
      year: year,
      total_members: members.length,
      active_members: members.filter(m => String(m.status).toUpperCase() === 'ACTIVE').length,
    }
  };
}

// ─── Hymn & Music Handlers ───────────────────────────────────────────────────

const BUNDLED_HYMNS_GS = [
  { number: 1, title: 'The Morning Breaks', type: 'Opening', theme: 'Restoration, Second Coming, Light, Zion' },
  { number: 2, title: 'The Spirit of God', type: 'Opening', theme: 'Restoration, Holy Ghost, Praise, Temple, Second Coming' },
  { number: 3, title: 'Now Let Us Rejoice', type: 'Opening', theme: 'Restoration, Joy, Second Coming, Deliverance' },
  { number: 4, title: 'Truth Eternal', type: 'Closing', theme: 'Truth, Restoration, Courage, Faith' },
  { number: 5, title: 'High on the Mountain Top', type: 'Opening', theme: 'Gathering, Zion, Temple, Restoration' },
  { number: 6, title: 'Redeemer of Israel', type: 'Opening', theme: 'Jesus Christ, Deliverance, Gathering, Refuge' },
  { number: 7, title: 'Israel, Israel, God Is Calling', type: 'Opening', theme: 'Gathering, Zion, Missionary Work, Obedience' },
  { number: 8, title: 'Awake and Arise', type: 'Opening', theme: 'Zion, Restoration, Diligence, Praise' },
  { number: 19, title: 'We Thank Thee, O God, for a Prophet', type: 'Opening', theme: 'Prophets, Guidance, Gratitude, Restoration, Protection' },
  { number: 21, title: 'Come, Listen to a Prophet’s Voice', type: 'Opening', theme: 'Prophets, Restoration, Revelation, Truth' },
  { number: 26, title: 'Joseph Smith’s First Prayer', type: 'General', theme: 'Restoration, Prayer, Joseph Smith, First Vision, Revelation' },
  { number: 27, title: 'Praise to the Man', type: 'Opening', theme: 'Joseph Smith, Restoration, Martyrdom, Prophecy, Praise' },
  { number: 29, title: 'A Poor Wayfaring Man of Grief', type: 'Special', theme: 'Compassion, Service, Joseph Smith, Jesus Christ, Charity' },
  { number: 30, title: 'Come, Come, Ye Saints', type: 'Opening', theme: 'Pioneers, Courage, Faith, Hope, Comfort, Gathering' },
  { number: 58, title: 'Come, Ye Children of the Lord', type: 'Opening', theme: 'Praise, Second Coming, Joy, Worship' },
  { number: 60, title: 'Battle Hymn of the Republic', type: 'Opening', theme: 'Praise, Second Coming, Victory, Truth, Justice' },
  { number: 64, title: 'On This Day of Joy and Gladness', type: 'Opening', theme: 'Sabbath, Praise, Joy, Worship' },
  { number: 72, title: 'Praise to the Lord, the Almighty', type: 'Opening', theme: 'Praise, Creation, Gratitude, Sovereignty of God' },
  { number: 85, title: 'How Firm a Foundation', type: 'Opening', theme: 'Faith, Comfort, Scripture, Trials, Jesus Christ' },
  { number: 89, title: 'The Lord Is My Light', type: 'Opening', theme: 'Light, Guidance, Faith, Deliverance, Courage' },
  { number: 92, title: 'For the Beauty of the Earth', type: 'Opening', theme: 'Gratitude, Creation, Family, Praise, Beauty' },
  { number: 97, title: 'Lead, Kindly Light', type: 'Opening', theme: 'Guidance, Faith, Light, Humility, Peace' },
  { number: 98, title: 'I Need Thee Every Hour', type: 'Opening', theme: 'Prayer, Jesus Christ, Comfort, Peace, Temptation' },
  { number: 100, title: 'Nearer, My God, to Thee', type: 'Closing', theme: 'Prayer, Comfort, Peace, Trials, Heavenly Father' },
  { number: 108, title: 'The Lord Is My Shepherd', type: 'General', theme: 'Comfort, Guidance, Trust, Psalms, Peace' },
  { number: 112, title: 'Savior, Redeemer of My Soul', type: 'Special', theme: 'Jesus Christ, Humility, Prayer, Atonement, Forgiveness' },
  { number: 113, title: 'Our Savior’s Love', type: 'General', theme: 'Jesus Christ, Love, Peace, Atonement, Discipleship' },
  { number: 115, title: 'Come unto Him', type: 'General', theme: 'Jesus Christ, Comfort, Peace, Rest, Forgiveness' },
  { number: 116, title: 'Come, Follow Me', type: 'Opening', theme: 'Discipleship, Jesus Christ, Obedience, Eternal Life' },
  { number: 124, title: 'Be Still, My Soul', type: 'Closing', theme: 'Comfort, Peace, Faith, Grief, Hope, Heaven' },
  { number: 130, title: 'Be Thou Humble', type: 'General', theme: 'Humility, Guidance, Prayer, Revelation, Peace' },
  { number: 134, title: 'I Believe in Christ', type: 'Closing', theme: 'Testimony, Jesus Christ, Faith, Resurrection, Atonement' },
  { number: 135, title: 'My Redeemer Lives', type: 'Closing', theme: 'Resurrection, Testimony, Jesus Christ, Hope' },
  { number: 136, title: 'I Know That My Redeemer Lives', type: 'Opening', theme: 'Resurrection, Jesus Christ, Testimony, Comfort, Joy' },
  { number: 142, title: 'Sweet Hour of Prayer', type: 'General', theme: 'Prayer, Peace, Worship, Comfort, Solitude' },
  { number: 143, title: 'Let the Holy Spirit Guide', type: 'Closing', theme: 'Holy Ghost, Guidance, Peace, Protection' },
  { number: 144, title: 'Secret Prayer', type: 'Closing', theme: 'Prayer, Solitude, Peace, Humility, Revelation' },
  { number: 152, title: 'God Be with You Till We Meet Again', type: 'Closing', theme: 'Parting, Love, Blessing, Fellowship, Protection' },
  { number: 157, title: 'Thy Spirit, Lord, Has Stirred Our Souls', type: 'Closing', theme: 'Holy Ghost, Parting, Gratitude, Reverence' },
  { number: 165, title: 'Abide with Me; ’Tis Eventide', type: 'Closing', theme: 'Sabbath, Evening, Comfort, Jesus Christ, Peace' },
  { number: 169, title: 'As Now We Take the Sacrament', type: 'Sacrament', theme: 'Sacrament, Atonement, Forgiveness, Emblems, Covenants' },
  { number: 170, title: 'God, Our Father, Hear Us Pray', type: 'Sacrament', theme: 'Sacrament, Heavenly Father, Mercy, Forgiveness' },
  { number: 171, title: 'With Humble Heart', type: 'Sacrament', theme: 'Sacrament, Humility, Covenants, Reverence' },
  { number: 172, title: 'In Humility, Our Savior', type: 'Sacrament', theme: 'Sacrament, Atonement, Humility, Savior’s Grace' },
  { number: 173, title: 'While of These Emblems We Partake', type: 'Sacrament', theme: 'Sacrament, Emblems, Atonement, Forgiveness, Grace' },
  { number: 175, title: 'O God, the Eternal Father', type: 'Sacrament', theme: 'Sacrament, Heavenly Father, Jesus Christ, Atonement' },
  { number: 176, title: '’Tis Sweet to Sing the Matchless Love', type: 'Sacrament', theme: 'Sacrament, Savior’s Love, Atonement, Grace' },
  { number: 181, title: 'Jesus of Nazareth, Savior and King', type: 'Sacrament', theme: 'Sacrament, Savior, Crucifixion, Resurrection' },
  { number: 184, title: 'Upon the Cross of Calvary', type: 'Sacrament', theme: 'Sacrament, Crucifixion, Grace, Atonement' },
  { number: 185, title: 'Reverently and Meekly Now', type: 'Sacrament', theme: 'Sacrament, Reverence, Forgiveness, Repentance' },
  { number: 187, title: 'God Loved Us, So He Sent His Son', type: 'Sacrament', theme: 'Sacrament, Heavenly Father, Love, Atonement' },
  { number: 193, title: 'I Stand All Amazed', type: 'Sacrament', theme: 'Sacrament, Savior’s Grace, Crucifixion, Gethsemane, Love' },
  { number: 194, title: 'There Is a Green Hill Far Away', type: 'Sacrament', theme: 'Sacrament, Calvary, Atonement, Crucifixion' },
  { number: 195, title: 'How Great the Wisdom and the Love', type: 'Sacrament', theme: 'Sacrament, Plan of Salvation, Grace, Atonement' },
  { number: 196, title: 'Jesus, Once of Humble Birth', type: 'Sacrament', theme: 'Sacrament, Second Coming, Kingship, Resurrection' },
  { number: 199, title: 'He Is Risen!', type: 'Opening', theme: 'Easter, Resurrection, Joy, Victory over Death' },
  { number: 201, title: 'Joy to the World', type: 'Opening', theme: 'Christmas, Second Coming, Joy, Praise' },
  { number: 204, title: 'Silent Night', type: 'Closing', theme: 'Christmas, Peace, Reverence, Nativity' },
  { number: 216, title: 'We Give Thee But Thine Own', type: 'General', theme: 'Tithing, Consecration, Service, Gratitude' },
  { number: 217, title: 'Because I Have Been Given Much', type: 'Closing', theme: 'Service, Gratitude, Charity, Ministering' },
  { number: 219, title: 'Lord, I Would Follow Thee', type: 'Closing', theme: 'Discipleship, Compassion, Love, Forgiveness, Ministering' },
  { number: 223, title: 'Have I Done Any Good?', type: 'Closing', theme: 'Service, Good Works, Discipleship, Diligence' },
  { number: 227, title: 'There Is Sunshine in My Soul Today', type: 'Opening', theme: 'Joy, Peace, Light, Gratitude' },
  { number: 237, title: 'Do What Is Right', type: 'Opening', theme: 'Integrity, Courage, Righteousness, Agency' },
  { number: 239, title: 'Choose the Right', type: 'Opening', theme: 'Choices, Guidance, Agency, Holy Ghost' },
  { number: 241, title: 'Count Your Blessings', type: 'Opening', theme: 'Gratitude, Optimism, Blessings, Faith' },
  { number: 243, title: 'Let Us All Press On', type: 'Closing', theme: 'Endurance, Courage, Faith, Steadfastness' },
  { number: 249, title: 'Called to Serve', type: 'Opening', theme: 'Missionary Work, Service, Youth, Consecration' },
  { number: 270, title: 'I’ll Go Where You Want Me to Go', type: 'Closing', theme: 'Obedience, Consecration, Missionary Work, Discipleship' },
  { number: 280, title: 'Welcome, Welcome, Sabbath Morning', type: 'Opening', theme: 'Sabbath, Joy, Worship, Rest' },
  { number: 284, title: 'Sweet Is the Work', type: 'Opening', theme: 'Sabbath, Worship, Gratitude, Praise' },
  { number: 288, title: 'How Beautiful Thy Temples, Lord', type: 'General', theme: 'Temple, Covenants, Holiness, Eternal Family' },
  { number: 294, title: 'Love at Home', type: 'Closing', theme: 'Family, Love, Peace, Harmony' },
  { number: 300, title: 'Families Can Be Together Forever', type: 'Closing', theme: 'Temple, Family, Covenants, Eternal Life' },
  { number: 301, title: 'I Am a Child of God', type: 'Opening', theme: 'Identity, Heavenly Father, Guidance, Children' },
  { number: 304, title: 'Teach Me to Walk in the Light', type: 'Closing', theme: 'Guidance, Children, Light, Family, Prayer' },
  { number: 308, title: 'Love One Another', type: 'Closing', theme: 'Charity, Love, Discipleship, Commandment' },
  { number: 1001, title: 'Come, Thou Fount of Every Blessing', type: 'Opening', theme: 'Grace, Praise, Gratitude, Streams of Mercy, Atonement' },
  { number: 1002, title: 'When the Savior Comes Again', type: 'Opening', theme: 'Second Coming, Peace, Joy, Millennial Reign, Hope' },
  { number: 1003, title: 'It Is Well with My Soul', type: 'Closing', theme: 'Peace, Faith, Comfort, Atonement, Trials, Assurance' },
  { number: 1004, title: 'I Will Walk with Jesus', type: 'Closing', theme: 'Discipleship, Covenants, Children, Covenant Path, Love' },
  { number: 1005, title: 'His Eye Is on the Sparrow', type: 'Special', theme: 'Comfort, Heavenly Father’s Care, Trust, Faith, Peace' },
  { number: 1006, title: 'Think a Sacred Song', type: 'General', theme: 'Music, Holy Ghost, Peace, Thoughts, Reverence' },
  { number: 1007, title: 'As Bread Is Broken', type: 'Sacrament', theme: 'Sacrament, Atonement, Emblems, Covenants, Forgiveness' },
  { number: 1008, title: 'Bread of Life, Living Water', type: 'Sacrament', theme: 'Sacrament, Jesus Christ, Living Water, Emblems, Grace' },
  { number: 1009, title: 'Gethsemane', type: 'Sacrament', theme: 'Sacrament, Gethsemane, Savior’s Love, Atonement, Calvary' },
  { number: 1010, title: 'Amazing Grace', type: 'Opening', theme: 'Grace, Deliverance, Praise, Forgiveness, Salvation' },
  { number: 1011, title: 'Holding Hands Around the World', type: 'General', theme: 'Unity, Global Church, Love, Brotherhood, Peace' },
  { number: 1012, title: 'Anytime, Anywhere', type: 'General', theme: 'Prayer, Presence of God, Comfort, Children' },
  { number: 1013, title: 'God’s Gracious Love', type: 'Opening', theme: 'Love of God, Mercy, Grace, Heavenly Father' },
  { number: 1014, title: 'My Shepherd Will Supply My Need', type: 'General', theme: 'Comfort, Shepherd, Trust, Psalm 23, Provision' },
  { number: 1015, title: 'Oh, the Deep, Deep Love of Jesus', type: 'Sacrament', theme: 'Sacrament, Savior’s Love, Grace, Vast Ocean, Atonement' },
  { number: 1016, title: 'Behold the Wounds in Jesus’ Hands', type: 'Sacrament', theme: 'Sacrament, Resurrection, Atonement, Scars, Love' },
  { number: 1017, title: 'This Is the Christ', type: 'Special', theme: 'Testimony, Apostles, Jesus Christ, Resurrection' },
  { number: 1018, title: 'Come, Lord Jesus', type: 'Closing', theme: 'Second Coming, Longing for Peace, Preparation' },
  { number: 1019, title: 'To Make a House a Home', type: 'Closing', theme: 'Family, Home, Peace, Love, Unity' },
  { number: 1020, title: 'Our Prayer to Thee', type: 'Closing', theme: 'Prophets, Prayer, Zion, Guidance, President Nelson' },
  { number: 1021, title: 'He Is Born, the Divine Christ Child', type: 'Opening', theme: 'Christmas, Nativity, Praise, Joy' },
  { number: 1022, title: 'What Child Is This?', type: 'Special', theme: 'Christmas, Nativity, Worship, Savior' },
  { number: 1023, title: 'Star Bright', type: 'General', theme: 'Christmas, Children, Star of Bethlehem, Light' },
  { number: 1031, title: 'Were You There?', type: 'Special', theme: 'Crucifixion, Easter, Gethsemane, Reverence' },
  { number: 1032, title: 'Jesus, Lover of My Soul', type: 'General', theme: 'Refuge, Comfort, Jesus Christ, Grace, Protection' },
  { number: 1033, title: 'Guide Me, O Thou Great Jehovah', type: 'Opening', theme: 'Guidance, Bread of Heaven, Pilgrimage, Deliverance' },
  { number: 1034, title: 'Be Still, My Soul (Global Collection)', type: 'Closing', theme: 'Comfort, Peace, Faith, Trust in Trials' },
  { number: 1035, title: 'As I Keep the Sabbath Day', type: 'Opening', theme: 'Sabbath, Worship, Obedience, Holy Day, Delight' },
  { number: 1036, title: 'Praise God, from Whom All Blessings Flow', type: 'Closing', theme: 'Doxology, Praise, Trinity, Gratitude, Worship' },
  { number: 1037, title: 'All Creatures of Our God and King', type: 'Opening', theme: 'Creation, Praise, Worship, Joy, Earth' },
  { number: 1038, title: 'How Great Thou Art', type: 'Opening', theme: 'Majesty of God, Praise, Creation, Atonement, Second Coming' },
  { number: 1039, title: 'Great Is Thy Faithfulness', type: 'Opening', theme: 'Faithfulness of God, Morning Mercies, Hope, Peace' },
  { number: 1040, title: 'Holy, Holy, Holy', type: 'Opening', theme: 'Holiness of God, Worship, Trinity, Praise, Purity' },
  { number: 1041, title: 'Crown Him with Many Crowns', type: 'Opening', theme: 'Kingship, Jesus Christ, Victory, Praise, Eternal King' },
  { number: 1043, title: 'Softly and Tenderly Jesus Is Calling', type: 'General', theme: 'Invitation, Repentance, Come unto Christ, Forgiveness, Rest' },
  { number: 1044, title: 'Just as I Am, Without One Plea', type: 'General', theme: 'Repentance, Grace, Atonement, Come unto Christ' },
  { number: 1045, title: 'Take Time to Be Holy', type: 'Closing', theme: 'Holiness, Prayer, Discipleship, Holy Ghost, Peace' },
  { number: 1046, title: 'Blessed Assurance', type: 'Opening', theme: 'Assurance, Testimony, Joy, Praising My Savior' },
  { number: 1049, title: 'What a Friend We Have in Jesus', type: 'General', theme: 'Friendship with Christ, Prayer, Trials, Peace, Comfort' },
  { number: 1050, title: 'I Have Decided to Follow Jesus', type: 'Closing', theme: 'Discipleship, Commitment, No Turning Back, Covenants' },
  { number: 1052, title: 'In Christ Alone', type: 'Opening', theme: 'Hope in Christ, Solid Ground, Atonement, Resurrection, Victory' },
  { number: 1055, title: 'Be Thou My Vision', type: 'Opening', theme: 'Vision, Guidance, Heavenly Father, High King of Heaven' }
];

function generateHymnSlugGS(title) {
  if (!title) return '';
  return String(title)
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateHymnChurchUrlGS(number, title, link) {
  if (link && String(link).trim().indexOf('http') === 0) {
    return String(link).trim();
  }
  var num = Number(number);
  var isNew = num >= 1000;
  var crumb = isNew ? 'hymns-for-home-and-church' : 'hymns';
  var rawTitle = title ? String(title).replace(/^#?\d+\s*[-–—.]*\s*/, '').trim() : '';
  var slug = generateHymnSlugGS(rawTitle);
  if (slug) {
    return 'https://www.churchofjesuschrist.org/media/music/songs/' + slug + '?crumbs=' + crumb + '&order=number&lang=eng';
  }
  if (num && !isNaN(num) && num > 0) {
    return 'https://www.churchofjesuschrist.org/study/music/hymns/' + num + '?lang=eng';
  }
  return 'https://www.churchofjesuschrist.org/media/music?lang=eng';
}

function handleListHymns(params) {
  const session = requireAuth(params.token);
  let hymns = dbReadAll('HYMNS');
  
  // Auto-fallback if HYMNS table is empty
  if (hymns.length === 0) {
    hymns = BUNDLED_HYMNS_GS.map(h => ({
      ...h,
      link: h.link || generateHymnChurchUrlGS(h.number, h.title, h.link),
      updated_date: now()
    }));
  } else {
    // Ensure every hymn has an accurate link
    hymns = hymns.map(h => ({
      ...h,
      link: h.link || generateHymnChurchUrlGS(h.number, h.title, h.link)
    }));
  }

  if (params.query) {
    const q = params.query.toLowerCase();
    hymns = hymns.filter(h =>
      String(h.number).includes(q) ||
      (h.title && h.title.toLowerCase().includes(q)) ||
      (h.theme && h.theme.toLowerCase().includes(q))
    );
  }
  return { ok: true, data: hymns };
}

function handleUpdateHymn(body) {
  const session = requirePermission(body.token, 'MUSIC_EDIT');
  validateRequired(body, ['number', 'title']);
  
  const existing = dbFindOne('HYMNS', 'number', sanitizeNumber(body.number));
  
  const hymnData = {
    number: sanitizeNumber(body.number),
    title: sanitizeString(body.title),
    type: sanitizeString(body.type || 'Opening'),
    theme: sanitizeString(body.theme),
    link: body.link ? sanitizeString(body.link) : generateHymnChurchUrlGS(body.number, body.title),
    updated_date: now(),
  };
  
  if (existing) {
    dbUpdate('HYMNS', 'number', hymnData.number, hymnData);
  } else {
    dbInsert('HYMNS', hymnData);
  }
  
  auditLog(session.user_id, 'UPDATE', 'HYMNS', String(body.number), existing, hymnData, 'OK');
  return { ok: true, data: hymnData };
}

function handleSyncHymnsCatalog(body) {
  const session = requirePermission(body.token, 'MUSIC_EDIT');
  
  let count = 0;
  BUNDLED_HYMNS_GS.forEach(h => {
    const existing = dbFindOne('HYMNS', 'number', h.number);
    const rec = {
      number: h.number,
      title: h.title,
      type: h.type,
      theme: h.theme,
      link: h.link || generateHymnChurchUrlGS(h.number, h.title, h.link),
      updated_date: now()
    };
    if (existing) {
      dbUpdate('HYMNS', 'number', h.number, rec);
    } else {
      dbInsert('HYMNS', rec);
    }
    count++;
  });

  auditLog(session.user_id, 'SYNC_CATALOG', 'HYMNS', 'ALL', null, `${count} hymns synchronized with direct links`, 'OK');
  return { ok: true, count: count, message: `Successfully synchronized ${count} LDS hymns with official church links` };
}

function handleSaveMusicPlan(body) {
  const session = requirePermission(body.token, 'MUSIC_EDIT');
  validateRequired(body, ['planner_id', 'weeks']);

  const planner = dbFindOne('PLANNERS', 'planner_id', body.planner_id);
  if (!planner) throw new Error('Planner not found');

  const newStatus = sanitizeString(body.music_status || 'PENDING');
  
  let weeksList = [];
  try {
    weeksList = typeof body.weeks === 'string' ? JSON.parse(body.weeks) : body.weeks;
  } catch(e) {
    throw new Error('Invalid weeks format');
  }

  // 1. Update PLANNERS record (music_status and weeks)
  dbUpdate('PLANNERS', 'planner_id', body.planner_id, {
    music_status: newStatus,
    weeks: JSON.stringify(weeksList),
    updated_date: now(),
  });

  // 2. Sync to corresponding AGENDAS records
  const existingAgendas = dbFind('AGENDAS', a => a.planner_id === body.planner_id);
  weeksList.forEach((wk, idx) => {
    const agMatch = existingAgendas.find(a => a.week_id === wk.week_id || a.date === wk.date) || existingAgendas[idx];
    
    // Parse hymn numbers and titles
    const openParts = parseHymnNumberTitle(wk.hymns ? wk.hymns.opening : '');
    const sacParts = parseHymnNumberTitle(wk.hymns ? wk.hymns.sacrament : '');
    const closeParts = parseHymnNumberTitle(wk.hymns ? wk.hymns.closing : '');

    const agendaUpdates = {
      opening_hymn: openParts.title || (wk.hymns ? wk.hymns.opening : ''),
      opening_hymn_number: openParts.number || '',
      sacrament_hymn: sacParts.title || (wk.hymns ? wk.hymns.sacrament : ''),
      sacrament_hymn_number: sacParts.number || '',
      closing_hymn: closeParts.title || (wk.hymns ? wk.hymns.closing : ''),
      closing_hymn_number: closeParts.number || '',
      special_music: sanitizeString(wk.hymns ? wk.hymns.special : ''),
      music_director: sanitizeString(wk.music ? wk.music.director : ''),
      organist: sanitizeString(wk.music ? wk.music.accompanist : ''),
      updated_date: now(),
    };

    if (agMatch) {
      dbUpdate('AGENDAS', 'agenda_id', agMatch.agenda_id, agendaUpdates);
    }
  });

  // 3. If marked COMPLETE, auto-dismiss any pending MUSIC_INPUT_REQUEST notification for this planner
  if (newStatus === 'COMPLETE') {
    try {
      const notifs = dbFind('NOTIFICATIONS', n => {
        if (n.read) return false;
        if (n.type === 'MUSIC_INPUT_REQUEST') {
          if (n.meta && n.meta.includes(body.planner_id)) return true;
        }
        return false;
      });
      notifs.forEach(n => {
        dbUpdate('NOTIFICATIONS', 'notification_id', n.notification_id, { read: true });
      });
    } catch(e) {
      Logger.log('Notification dismissal note: ' + e.message);
    }
  }

  auditLog(session.user_id, 'SAVE_MUSIC_PLAN', 'PLANNERS', body.planner_id, { status: planner.music_status }, { status: newStatus }, 'OK');
  return { ok: true, music_status: newStatus, message: 'Music plan saved successfully' };
}

function parseHymnNumberTitle(rawStr) {
  if (!rawStr) return { number: '', title: '' };
  const str = String(rawStr).trim();
  const match = str.match(/^#?(\d+)\s*[-.:]?\s*(.*)$/);
  if (match) {
    return { number: match[1].trim(), title: match[2].trim() };
  }
  return { number: '', title: str };
}

function handleGetMusicRotation(params) {
  const session = requireAuth(params.token);
  const agendas = dbReadAll('AGENDAS');
  
  // Find recently sung sacrament hymns
  const sacAgendas = agendas
    .filter(a => a.sacrament_hymn || a.sacrament_hymn_number)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let lastSacrament = '193 - I Stand All Amazed';
  if (sacAgendas.length > 0) {
    const top = sacAgendas[0];
    lastSacrament = top.sacrament_hymn_number
      ? `${top.sacrament_hymn_number} - ${top.sacrament_hymn}`
      : top.sacrament_hymn;
  }

  const sacramentHymnPool = [
    '#169 - As Now We Take the Sacrament',
    '#172 - In Humility, Our Savior',
    '#175 - O God, the Eternal Father',
    '#181 - Jesus of Nazareth, Savior and King',
    '#184 - Upon the Cross of Calvary',
    '#187 - God Loved Us, So He Sent His Son',
    '#193 - I Stand All Amazed',
    '#195 - How Great the Wisdom and the Love',
    '#1007 - As Bread Is Broken',
    '#1008 - Bread of Life, Living Water',
    '#1009 - Gethsemane'
  ];

  const filteredPool = sacramentHymnPool.filter(h => !lastSacrament.includes(h.replace(/^[#\d\s-]+/, '')));
  const suggestedNext = filteredPool.length > 0 ? filteredPool[0] : sacramentHymnPool[0];

  return {
    ok: true,
    data: {
      lastSacramentHymn: lastSacrament,
      suggestedNext: suggestedNext
    }
  };
}

function handleGetMusicAvailability(params) {
  const session = requireAuth(params.token);
  const raw = settingsGet('MUSIC_AVAILABILITY');
  let records = [];
  try {
    if (raw) records = JSON.parse(raw);
  } catch(e) {
    records = [];
  }
  return { ok: true, data: records };
}

function handleSaveMusicAvailability(body) {
  const session = requirePermission(body.token, 'MUSIC_EDIT');
  validateRequired(body, ['records']);
  
  const recordsStr = typeof body.records === 'string' ? body.records : JSON.stringify(body.records);
  settingsSet('MUSIC_AVAILABILITY', recordsStr);
  
  auditLog(session.user_id, 'UPDATE_AVAILABILITY', 'UNIT_SETTINGS', 'MUSIC_AVAILABILITY', null, null, 'OK');
  return { ok: true };
}


// ─── Activity Handlers ────────────────────────────────────────────────────────

function normalizeActivityRecord(act) {
  if (!act) return null;
  var id = act.activity_id || act.id || '';
  var dateVal = act.date || act.Date || act.DATE || '';
  var actTitle = act.activity || act.Activity || act.title || '';
  var org = act.organisation || act.organization || act.Organisation || act.Organization || 'Ward';
  var timeVal = act.time || act.Time || '';

  // Handle column misalignment if date was mapped to ID (e.g. "act_msp...")
  if (typeof dateVal === 'string' && dateVal.indexOf('act_') === 0) {
    id = dateVal;
    dateVal = act.activity || act.Date || '';
    actTitle = act.organisation || act.activity || 'Church Activity';
    org = act.status || act.organisation || 'Ward';
  }

  if (dateVal instanceof Date) {
    try {
      dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
    } catch(e) {
      dateVal = dateVal.toISOString().split('T')[0];
    }
  } else if (typeof dateVal === 'string') {
    dateVal = sanitizeDate(dateVal);
  }

  return {
    activity_id: id,
    date: dateVal,
    activity: actTitle,
    organisation: org,
    time: timeVal,
    status: act.status || 'PLANNED',
    those_involved: act.those_involved || '',
    email_sent: !!act.email_sent,
    report_submitted: !!act.report_submitted,
    last_reminder: act.last_reminder || ''
  };
}

function handleListActivities(params) {
  const session = requireAuth(params.token);
  const rawActivities = dbReadAll('ACTIVITIES');
  const activities = rawActivities.map(normalizeActivityRecord).filter(function(a) { return !!a; });
  return { ok: true, data: activities };
}

function handleCreateActivity(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['activity', 'date']);
  
  const activity = {
    activity_id: generateId('ACT'),
    date: sanitizeDate(body.date),
    activity: sanitizeString(body.activity),
    organisation: sanitizeString(body.organisation),
    status: sanitizeString(body.status || 'PLANNED'),
    email_sent: false,
    those_involved: sanitizeString(body.those_involved),
    report_submitted: false,
    last_reminder: '',
    time: sanitizeString(body.time),
  };
  
  dbInsert('ACTIVITIES', activity);
  auditLog(session.user_id, 'CREATE', 'ACTIVITIES', activity.activity_id, null, activity, 'OK');
  return { ok: true, data: activity };
}

function handleUpdateActivity(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['activity_id']);
  
  const updates = {
    date: sanitizeDate(body.date),
    activity: sanitizeString(body.activity),
    organisation: sanitizeString(body.organisation),
    status: sanitizeString(body.status),
    those_involved: sanitizeString(body.those_involved),
    time: sanitizeString(body.time),
  };
  
  const result = dbUpdate('ACTIVITIES', 'activity_id', body.activity_id, updates);
  auditLog(session.user_id, 'UPDATE', 'ACTIVITIES', body.activity_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleDeleteActivity(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['activity_id']);
  
  const old = dbDelete('ACTIVITIES', 'activity_id', body.activity_id);
  auditLog(session.user_id, 'DELETE', 'ACTIVITIES', body.activity_id, old, null, 'OK');
  return { ok: true };
}

// ─── Checklist Handlers ───────────────────────────────────────────────────────

function handleListChecklists(params) {
  const session = requireAuth(params.token);
  let items = dbReadAll('CHECKLISTS');
  if (params.planner_id) {
    items = items.filter(c => c.planner_id === params.planner_id);
  }
  if (params.week_id) {
    items = items.filter(c => c.week_id === params.week_id);
  }
  return { ok: true, data: items };
}

function handleCreateChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['task']);
  
  const item = {
    checklist_id: generateId('CHK'),
    planner_id: sanitizeString(body.planner_id),
    week_id: sanitizeString(body.week_id),
    week_label: sanitizeString(body.week_label),
    task: sanitizeString(body.task),
    responsible: sanitizeString(body.responsible),
    status: sanitizeString(body.status || 'PENDING'),
    updated_by: session.name || session.user_id,
    updated_date: now(),
  };
  
  dbInsert('CHECKLISTS', item);
  auditLog(session.user_id, 'CREATE', 'CHECKLISTS', item.checklist_id, null, item, 'OK');
  return { ok: true, data: item };
}

function handleUpdateChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['checklist_id']);
  
  const updates = {
    status: sanitizeString(body.status),
    responsible: sanitizeString(body.responsible !== undefined ? body.responsible : ''),
    task: sanitizeString(body.task !== undefined ? body.task : ''),
    updated_by: session.name || session.user_id,
    updated_date: now(),
  };
  
  const result = dbUpdate('CHECKLISTS', 'checklist_id', body.checklist_id, updates);
  auditLog(session.user_id, 'UPDATE', 'CHECKLISTS', body.checklist_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleDeleteChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['checklist_id']);
  
  const old = dbDelete('CHECKLISTS', 'checklist_id', body.checklist_id);
  auditLog(session.user_id, 'DELETE', 'CHECKLISTS', body.checklist_id, old, null, 'OK');
  return { ok: true };
}

function handleSeedChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['planner_id', 'week_id']);
  
  const plannerId = sanitizeString(body.planner_id);
  const weekId = sanitizeString(body.week_id);
  const weekLabel = sanitizeString(body.week_label || 'Sunday Preparation');
  
  // Standard 8 Sacrament Readiness Tasks
  const standardTasks = [
    'Microphones tested',
    'Sacrament bread ready',
    'Water cups ready',
    'Sacrament table prepared & covered',
    'Hymn numbers displayed on board',
    'Podium prepared (water, program, scriptures)',
    'Speakers confirmed present on stand',
    'Presiding authority confirmed & greeted',
  ];

  // Check existing tasks for this week to avoid unnecessary duplicate seeding
  const existing = dbFind('CHECKLISTS', c => c.planner_id === plannerId && c.week_id === weekId);
  const existingTaskNames = new Set(existing.map(e => (e.task || '').trim().toLowerCase()));

  const createdItems = [];
  standardTasks.forEach(taskName => {
    if (!existingTaskNames.has(taskName.toLowerCase())) {
      const item = {
        checklist_id: generateId('CHK'),
        planner_id: plannerId,
        week_id: weekId,
        week_label: weekLabel,
        task: taskName,
        responsible: '',
        status: 'PENDING',
        updated_by: session.name || session.user_id,
        updated_date: now(),
      };
      dbInsert('CHECKLISTS', item);
      createdItems.push(item);
    }
  });

  auditLog(session.user_id, 'SEED_CHECKLIST', 'CHECKLISTS', `${createdItems.length} tasks seeded`, null, { count: createdItems.length }, 'OK');
  return { ok: true, data: createdItems, count: createdItems.length };
}

function handleResetChecklistWeek(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['planner_id', 'week_id']);
  
  const items = dbFind('CHECKLISTS', c => c.planner_id === body.planner_id && c.week_id === body.week_id);
  const updatedItems = [];
  
  items.forEach(item => {
    const res = dbUpdate('CHECKLISTS', 'checklist_id', item.checklist_id, {
      status: 'PENDING',
      updated_by: session.name || session.user_id,
      updated_date: now(),
    });
    if (res && res.updated) updatedItems.push(res.updated);
  });

  auditLog(session.user_id, 'RESET_WEEK', 'CHECKLISTS', `${updatedItems.length} items reset`, null, null, 'OK');
  return { ok: true, data: updatedItems, count: updatedItems.length };
}

function handleBulkUpdateChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['items']);
  
  const itemsList = Array.isArray(body.items) ? body.items : [];
  const results = [];
  
  itemsList.forEach(item => {
    if (!item || !item.checklist_id) return;
    const patch = {
      status: sanitizeString(item.status),
      responsible: sanitizeString(item.responsible !== undefined ? item.responsible : ''),
      updated_by: session.name || session.user_id,
      updated_date: now(),
    };
    const res = dbUpdate('CHECKLISTS', 'checklist_id', item.checklist_id, patch);
    if (res && res.updated) results.push(res.updated);
  });
  
  auditLog(session.user_id, 'BULK_UPDATE', 'CHECKLISTS', `${results.length} items`, null, null, 'OK');
  return { ok: true, data: results, count: results.length };
}

function handleBulkAssignChecklist(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['planner_id', 'week_id', 'responsible']);
  
  const items = dbFind('CHECKLISTS', c =>
    c.planner_id === body.planner_id &&
    c.week_id === body.week_id &&
    (c.status === 'PENDING' || c.status === 'false' || !c.responsible)
  );
  
  const assigned = [];
  items.forEach(item => {
    const res = dbUpdate('CHECKLISTS', 'checklist_id', item.checklist_id, {
      responsible: sanitizeString(body.responsible),
      updated_by: session.name || session.user_id,
      updated_date: now(),
    });
    if (res && res.updated) assigned.push(res.updated);
  });

  auditLog(session.user_id, 'BULK_ASSIGN', 'CHECKLISTS', `${assigned.length} items assigned`, null, { responsible: body.responsible }, 'OK');
  return { ok: true, data: assigned, count: assigned.length };
}

function handleSendChecklistReminders(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['planner_id', 'week_id']);
  
  const items = dbFind('CHECKLISTS', c => c.planner_id === body.planner_id && c.week_id === body.week_id);
  const assigned = items.filter(i => i.responsible && i.responsible.trim().length > 0);
  
  // Create in-app notifications for bishopric/admin
  notifyRoles(['ADMIN', 'BISHOPRIC'], 'CHECKLIST_REMINDER_SENT',
    'Saturday Checklist Reminders Prepared',
    `${assigned.length} Sunday preparation assignments have been checked for ${body.week_id}.`,
    { planner_id: body.planner_id, week_id: body.week_id, count: assigned.length });

  return { ok: true, count: assigned.length };
}

// ─── Todo Handlers ────────────────────────────────────────────────────────────

function handleListTodos(params) {
  const session = requireAuth(params.token);
  let todos = dbReadAll('TODOS');
  if (params.category && params.category !== 'ALL') {
    todos = todos.filter(t => t.category === params.category);
  }
  return { ok: true, data: todos };
}

function handleCreateTodo(body) {
  const session = requirePermission(body.token, 'TODO_CREATE');
  validateRequired(body, ['title']);
  
  const todo = {
    todo_id: generateId('TODO'),
    title: sanitizeString(body.title),
    details: sanitizeString(body.details),
    category: sanitizeString(body.category || 'GENERAL'),
    due_date: sanitizeDate(body.due_date),
    priority: sanitizeString(body.priority || 'MEDIUM'),
    status: sanitizeString(body.status || 'OPEN'),
    assigned_to_user_id: sanitizeString(body.assigned_to_user_id),
    assigned_to_name: sanitizeString(body.assigned_to_name),
    created_by_user_id: session.user_id,
    created_by_name: session.name || session.username,
    planner_id: sanitizeString(body.planner_id),
    week_id: sanitizeString(body.week_id),
    created_date: now(),
    updated_date: now(),
    completed_date: '',
  };
  
  dbInsert('TODOS', todo);
  auditLog(session.user_id, 'CREATE', 'TODOS', todo.todo_id, null, todo, 'OK');
  return { ok: true, data: todo };
}

function handleUpdateTodo(body) {
  const session = requirePermission(body.token, 'TODO_EDIT');
  validateRequired(body, ['todo_id']);
  
  const updates = {
    title: sanitizeString(body.title),
    details: sanitizeString(body.details),
    category: sanitizeString(body.category || 'GENERAL'),
    due_date: sanitizeDate(body.due_date),
    priority: sanitizeString(body.priority),
    status: sanitizeString(body.status),
    assigned_to_user_id: sanitizeString(body.assigned_to_user_id),
    assigned_to_name: sanitizeString(body.assigned_to_name),
    updated_date: now(),
    completed_date: body.status === 'DONE' ? now() : '',
  };
  
  const result = dbUpdate('TODOS', 'todo_id', body.todo_id, updates);
  auditLog(session.user_id, 'UPDATE', 'TODOS', body.todo_id, result.old, result.updated, 'OK');
  return { ok: true, data: result.updated };
}

function handleDeleteTodo(body) {
  const session = requirePermission(body.token, 'TODO_EDIT');
  validateRequired(body, ['todo_id']);
  
  const old = dbDelete('TODOS', 'todo_id', body.todo_id);
  auditLog(session.user_id, 'DELETE', 'TODOS', body.todo_id, old, null, 'OK');
  return { ok: true };
}

// ─── Notification Handlers ────────────────────────────────────────────────────

function handleListNotifications(params) {
  const session = requireAuth(params.token);
  const notifications = dbFind('NOTIFICATIONS', n => n.to_user_id === (params.user_id || session.user_id));
  return { ok: true, data: notifications };
}

function handleMarkNotificationRead(body) {
  const session = requireAuth(body.token);
  dbUpdate('NOTIFICATIONS', 'notification_id', body.notification_id, { read: true });
  return { ok: true };
}

function handleMarkAllNotificationsRead(body) {
  const session = requireAuth(body.token);
  const notifications = dbFind('NOTIFICATIONS', n => n.to_user_id === session.user_id && !n.read);
  notifications.forEach(n => {
    try { dbUpdate('NOTIFICATIONS', 'notification_id', n.notification_id, { read: true }); } catch(e) {}
  });
  return { ok: true };
}

// ─── Reminder Handlers ────────────────────────────────────────────────────────

function handleListReminders(params) {
  const session = requireAuth(params.token);
  let reminders = dbReadAll('REMINDERS');
  if (params.planner_id) reminders = reminders.filter(r => r.planner_id === params.planner_id);
  return { ok: true, data: reminders };
}

function handleCreateReminder(body) {
  const session = requirePermission(body.token, 'REMINDER_CREATE');
  validateRequired(body, ['to_person', 'title', 'scheduled_for_date']);
  
  const reminder = {
    reminder_id: generateId('REM'),
    planner_id: sanitizeString(body.planner_id),
    week_id: sanitizeString(body.week_id),
    assignment_id: sanitizeString(body.assignment_id),
    to_person: sanitizeString(body.to_person),
    to_user_id: sanitizeString(body.to_user_id),
    channel: sanitizeString(body.channel || 'INTERNAL'),
    title: sanitizeString(body.title),
    body: sanitizeString(body.body),
    scheduled_for_date: sanitizeDate(body.scheduled_for_date),
    status: 'SCHEDULED',
    created_by_user_id: session.user_id,
    created_date: now(),
    sent_date: '',
  };
  
  dbInsert('REMINDERS', reminder);
  auditLog(session.user_id, 'CREATE', 'REMINDERS', reminder.reminder_id, null, reminder, 'OK');
  return { ok: true, data: reminder };
}

function handleCancelReminder(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['reminder_id']);
  
  dbUpdate('REMINDERS', 'reminder_id', body.reminder_id, { status: 'CANCELLED' });
  auditLog(session.user_id, 'UPDATE', 'REMINDERS', body.reminder_id, { status: 'SCHEDULED' }, { status: 'CANCELLED' }, 'OK');
  return { ok: true };
}

/**
 * Sends email reminders to everyone with an assignment on Page 1 (Order of Service) of the Agenda.
 * Only available for Bishop and Counsellors (ADMIN / BISHOPRIC).
 * Consolidates multiple assignments per person and includes 15-minute Bishopric briefing notice.
 */
function handleSendAgendaReminders(body) {
  const session = requireAuth(body.token);
  if (session.role !== 'ADMIN' && session.role !== 'BISHOPRIC') {
    throw new Error('Only Bishops and Counsellors can send agenda email reminders.');
  }

  const agenda = body.agenda || {};
  const customRecipients = Array.isArray(body.recipients) ? body.recipients : null;
  const dateStr = agenda.date || '';
  const wardName = sanitizeString(agenda.ward_branch || 'Ward');
  const startTimeStr = sanitizeString(agenda.start_time || '9:00 AM');

  // Compute 15 minutes before start time for bishopric briefing
  let briefingTimeStr = '15 minutes before the service';
  try {
    const timeMatch = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      let minutes = parseInt(timeMatch[2], 10);
      const ampm = (timeMatch[3] || '').toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      let totalMinutes = hours * 60 + minutes - 15;
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      let bHours = Math.floor(totalMinutes / 60);
      let bMinutes = totalMinutes % 60;
      const bAmpm = bHours >= 12 ? 'PM' : 'AM';
      let bDisplayHours = bHours % 12;
      if (bDisplayHours === 0) bDisplayHours = 12;
      const bDisplayMins = bMinutes < 10 ? '0' + bMinutes : bMinutes;
      briefingTimeStr = `${bDisplayHours}:${bDisplayMins} ${bAmpm}`;
    }
  } catch (e) {}

  // Load members and users database for email lookup
  const members = dbReadAll('MEMBERS_LIST');
  const users = dbReadAll('USERS');

  function findMemberEmail(name) {
    if (!name) return '';
    const clean = String(name).replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!clean) return '';
    
    // Check in MEMBERS_LIST
    const m = members.find(mem => {
      const memClean = String(mem.name || '').replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      return memClean === clean || memClean.includes(clean) || clean.includes(memClean);
    });
    if (m && m.email) return m.email;

    // Check in USERS
    const u = users.find(usr => {
      const uClean = String(usr.name || usr.preferred_name || '').replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
      return uClean === clean || uClean.includes(clean) || clean.includes(uClean);
    });
    if (u && u.email) return u.email;

    return '';
  }

  // If custom recipients list is provided by frontend modal, use it
  let recipientMap = {};

  if (customRecipients && customRecipients.length > 0) {
    customRecipients.forEach(r => {
      if (r.name && r.name.trim()) {
        const key = r.name.trim();
        recipientMap[key] = {
          name: r.name.trim(),
          email: sanitizeEmail(r.email || findMemberEmail(r.name)),
          assignments: Array.isArray(r.assignments) ? r.assignments : [String(r.assignments || 'Sacrament Meeting Assignment')]
        };
      }
    });
  } else {
    // Collect from Page 1 (Order of Service)
    function addAssignment(personName, assignmentText) {
      if (!personName || typeof personName !== 'string') return;
      const cleanName = personName.trim();
      if (!cleanName || cleanName.length < 2) return;
      if (/^(tbd|none|n\/a|unassigned|brother|sister)$/i.test(cleanName)) return;

      if (!recipientMap[cleanName]) {
        recipientMap[cleanName] = {
          name: cleanName,
          email: findMemberEmail(cleanName),
          assignments: []
        };
      }
      if (!recipientMap[cleanName].assignments.includes(assignmentText)) {
        recipientMap[cleanName].assignments.push(assignmentText);
      }
    }

    // 1. Presiding & Conducting
    if (agenda.presiding) addAssignment(agenda.presiding, `Presiding Officer (${agenda.presiding_position || 'Presiding'})`);
    if (agenda.conducting) addAssignment(agenda.conducting, `Conducting Officer (${agenda.conducting_position || 'Conducting'})`);

    // Format meeting hymns for music leaders
    var hymnsInfo = [];
    if (agenda.opening_hymn) {
      hymnsInfo.push('Opening Hymn: ' + (agenda.opening_hymn_number ? '#' + agenda.opening_hymn_number + ' ' : '') + agenda.opening_hymn);
    }
    if (agenda.sacrament_hymn) {
      hymnsInfo.push('Sacrament Hymn: ' + (agenda.sacrament_hymn_number ? '#' + agenda.sacrament_hymn_number + ' ' : '') + agenda.sacrament_hymn);
    }
    if (agenda.closing_hymn) {
      hymnsInfo.push('Closing Hymn: ' + (agenda.closing_hymn_number ? '#' + agenda.closing_hymn_number + ' ' : '') + agenda.closing_hymn);
    }
    if (agenda.prelude_music) {
      hymnsInfo.push('Prelude: ' + agenda.prelude_music);
    }
    if (agenda.postlude_music) {
      hymnsInfo.push('Postlude: ' + agenda.postlude_music);
    }

    // 2. Music Leaders (Includes Meeting Music / Hymns)
    if (agenda.music_director) {
      var mdDesc = 'Music Director (Chorister)';
      if (hymnsInfo.length > 0) {
        mdDesc += ' — Program Music: ' + hymnsInfo.join(' · ');
      }
      addAssignment(agenda.music_director, mdDesc);
    }

    if (agenda.organist) {
      var orgDesc = 'Organist / Pianist';
      if (hymnsInfo.length > 0) {
        orgDesc += ' — Program Music: ' + hymnsInfo.join(' · ');
      }
      addAssignment(agenda.organist, orgDesc);
    }

    // 3. Choir Director (Includes Special Music if selected)
    if (agenda.choir_director) {
      var cdDesc = 'Choir Director';
      if (agenda.special_music && agenda.special_music.trim()) {
        cdDesc += ' — Special Music Presentation: "' + agenda.special_music.trim() + '"';
      }
      addAssignment(agenda.choir_director, cdDesc);
    }

    // 4. Prayers
    if (agenda.opening_prayer) addAssignment(agenda.opening_prayer, 'Opening Prayer (Invocation)');
    if (agenda.closing_prayer) addAssignment(agenda.closing_prayer, 'Closing Prayer (Benediction)');

    // 5. Special Music Individual item (if assigned separately)
    if (agenda.special_music && agenda.special_music.length > 3 && !/^(choir|congregation)$/i.test(agenda.special_music.trim())) {
      if (!agenda.choir_director || agenda.choir_director.indexOf(agenda.special_music) === -1) {
        addAssignment(agenda.special_music, 'Special Musical Item: "' + agenda.special_music + '"');
      }
    }

    // 5. Speakers
    let speakersArr = [];
    if (Array.isArray(body.speakers)) {
      speakersArr = body.speakers;
    } else if (agenda.speakers) {
      try {
        speakersArr = typeof agenda.speakers === 'string' ? JSON.parse(agenda.speakers) : agenda.speakers;
      } catch (e) {}
    }

    if (Array.isArray(speakersArr)) {
      speakersArr.forEach((sp, idx) => {
        if (sp.name && sp.name.trim()) {
          let desc = `Speaker / Talk #${idx + 1}`;
          if (sp.topic) desc += ` — Topic: "${sp.topic}"`;
          if (sp.scripture_ref) desc += ` (Ref: ${sp.scripture_ref})`;
          if (sp.minutes) desc += ` [${sp.minutes} Minutes]`;
          addAssignment(sp.name, desc);
        }
      });
    }
  }

  const recipientsList = Object.values(recipientMap);
  const sentList = [];
  const failedList = [];
  const missingEmailList = [];

  recipientsList.forEach(recipient => {
    if (!recipient.email) {
      missingEmailList.push(recipient);
      return;
    }

    try {
      const subject = `Sacrament Meeting Assignment Reminder — ${wardName} (${dateStr})`;
      
      const assignmentListHtml = recipient.assignments.map(a => `<li style="margin-bottom: 6px; font-size: 14px; color: #1e293b;"><strong>${a}</strong></li>`).join('');
      const assignmentListText = recipient.assignments.map(a => `• ${a}`).join('\n');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; margin: 0 0 4px 0; font-size: 20px;">Sacrament Meeting Assignment Reminder</h2>
            <p style="color: #64748b; margin: 0; font-size: 13px; font-weight: bold;">${wardName} · Sunday, ${dateStr}</p>
          </div>

          <p style="font-size: 15px; color: #334155; margin-bottom: 16px;">
            Dear <strong>${recipient.name}</strong>,
          </p>

          <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 16px;">
            This is a friendly reminder of your scheduled assignment(s) for the upcoming Sacrament Meeting on <strong>${dateStr}</strong> at <strong>${startTimeStr}</strong>.
          </p>

          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Assigned Service:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${assignmentListHtml}
            </ul>
          </div>

          <!-- BISHOPRIC BRIEFING NOTICE -->
          <div style="background-color: #eff6ff; border: 1.5px dashed #3b82f6; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #1e40af;">
              ⏰ Meeting with the Bishopric Before Service:
            </p>
            <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.4;">
              Please plan to meet with the Bishopric <strong>15 minutes before the start of the service</strong> (at <strong>${briefingTimeStr}</strong>) on the stand / in the Bishop's office for brief coordination and prayer.
            </p>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
            Thank you for your willingness to serve and for your preparation to invite the Spirit into our worship service. If you have any questions or unexpected scheduling conflicts, please contact the Bishopric as soon as possible.
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 12px;">
            <p style="margin: 0;">Sent with reverence by the Bishopric · ${wardName}</p>
          </div>
        </div>
      `;

      const plainText = `Sacrament Meeting Assignment Reminder — ${wardName}\n\n` +
        `Dear ${recipient.name},\n\n` +
        `This is a friendly reminder of your scheduled assignment(s) for the upcoming Sacrament Meeting on ${dateStr} at ${startTimeStr}.\n\n` +
        `Your Assigned Service:\n${assignmentListText}\n\n` +
        `IMPORTANT: Please plan to meet with the Bishopric 15 minutes before the start of the service (at ${briefingTimeStr}) on the stand / in the Bishop's office for coordination and prayer.\n\n` +
        `Thank you for your devotion and service!\n\n` +
        `With regards,\n` +
        `The Bishopric · ${wardName}`;

      sendEmail(recipient.email, subject, plainText, { html: htmlBody, name: 'SM Planner' });

      // Save to REMINDERS table
      const reminderRec = {
        reminder_id: generateId('REM'),
        planner_id: sanitizeString(agenda.planner_id || ''),
        week_id: sanitizeString(agenda.week_id || ''),
        to_person: recipient.name,
        channel: 'EMAIL',
        title: subject,
        body: recipient.assignments.join('; '),
        scheduled_for_date: sanitizeDate(agenda.date),
        status: 'SENT',
        created_by_user_id: session.user_id,
        created_date: now(),
        sent_date: now(),
      };
      dbInsert('REMINDERS', reminderRec);

      sentList.push(recipient);
    } catch (err) {
      Logger.log('Failed to send reminder email to ' + recipient.email + ': ' + err.message);
      failedList.push({ ...recipient, error: err.message });
    }
  });

  auditLog(session.user_id, 'SEND_AGENDA_REMINDERS', 'AGENDAS', agenda.agenda_id || agenda.date, null, {
    sent: sentList.length,
    failed: failedList.length,
    missing_emails: missingEmailList.length
  }, 'OK');

  return {
    ok: true,
    sent_count: sentList.length,
    failed_count: failedList.length,
    missing_email_count: missingEmailList.length,
    sent: sentList,
    failed: failedList,
    missing_emails: missingEmailList,
    briefing_time: briefingTimeStr
  };
}

// ─── Bulletin Handlers ────────────────────────────────────────────────────────

function handleListBulletins(params) {
  const session = requireAuth(params.token);
  let bulletins = dbReadAll('BULLETINS');
  if (params.planner_id) bulletins = bulletins.filter(b => b.planner_id === params.planner_id);
  
  // Sort chronologically descending
  bulletins.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { ok: true, data: bulletins };
}

function handleGetBulletin(params) {
  const session = requireAuth(params.token);
  const bulletin = dbFindOne('BULLETINS', 'bulletin_id', params.bulletin_id);
  if (!bulletin) throw new Error('Bulletin not found');
  return { ok: true, data: bulletin };
}

/**
 * Public Endpoint: Returns the currently active published ward bulletin for congregation members.
 * Accessible without authentication token.
 */
function handleGetLiveBulletin(params) {
  let bulletins = dbReadAll('BULLETINS');
  let published = bulletins.filter(b => b.status === 'PUBLISHED' || b.status === 'published');
  
  if (published.length === 0) {
    if (bulletins.length > 0) {
      bulletins.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return { ok: true, data: bulletins[0] };
    }
    return { ok: false, error: 'No bulletin is currently published.' };
  }

  // Sort by target Sunday date descending, then updated_date descending
  published.sort((a, b) => {
    const dComp = (b.date || '').localeCompare(a.date || '');
    if (dComp !== 0) return dComp;
    return (b.updated_date || '').localeCompare(a.updated_date || '');
  });

  return { ok: true, data: published[0] };
}

function handleSaveBulletin(body) {
  const session = requireAuth(body.token);
  validateRequired(body, ['date']);
  
  const bulletinData = Object.fromEntries(
    Object.entries(body)
      .filter(([k]) => !['token', 'action'].includes(k))
  );
  bulletinData.updated_date = now();
  bulletinData.date = sanitizeDate(bulletinData.date);
  
  // Boolean sanitization for 12 section switches
  const boolFields = [
    'show_sacrament', 'show_activities', 'show_birthdays', 'show_missionary',
    'show_temple', 'show_self_reliance', 'show_focus', 'show_welfare',
    'show_bishopric', 'show_upcoming', 'show_qr', 'show_cleaning'
  ];
  boolFields.forEach(bf => {
    if (bulletinData[bf] !== undefined) {
      bulletinData[bf] = sanitizeBoolean(bulletinData[bf]);
    }
  });

  let existing = null;
  if (body.bulletin_id) {
    existing = dbFindOne('BULLETINS', 'bulletin_id', body.bulletin_id);
  }
  if (!existing && bulletinData.date && !body.force_new) {
    existing = dbFindOne('BULLETINS', 'date', bulletinData.date);
  }

  bulletinData.status = sanitizeString(body.status || (existing ? existing.status : 'DRAFT'));

  if (existing) {
    const result = dbUpdate('BULLETINS', 'bulletin_id', existing.bulletin_id, bulletinData);
    auditLog(session.user_id, 'UPDATE', 'BULLETINS', existing.bulletin_id, result.old, result.updated, 'OK');
    return { ok: true, data: result.updated, message: bulletinData.status === 'PUBLISHED' ? 'Weekly Bulletin published and saved!' : 'Weekly Bulletin draft saved!' };
  } else {
    bulletinData.bulletin_id = body.bulletin_id || generateId('BUL');
    bulletinData.created_date = now();
    dbInsert('BULLETINS', bulletinData);
    auditLog(session.user_id, 'CREATE', 'BULLETINS', bulletinData.bulletin_id, null, bulletinData, 'OK');
    return { ok: true, data: bulletinData, message: bulletinData.status === 'PUBLISHED' ? 'Weekly Bulletin created and published!' : 'Weekly Bulletin draft created and saved!' };
  }
}

function handleDeleteBulletin(body) {
  const session = requirePermission(body.token, 'PLANNER_EDIT');
  validateRequired(body, ['bulletin_id']);
  
  const old = dbDelete('BULLETINS', 'bulletin_id', body.bulletin_id);
  auditLog(session.user_id, 'DELETE', 'BULLETINS', body.bulletin_id, old, null, 'OK');
  return { ok: true };
}

/**
 * Auto-Drafting Engine: Extracts Sacrament Agenda, Birthdays for Mon-Sun,
 * Weekly Activities (structured table), and Next 5 Activities for a given Sunday date.
 */
function handleGetBulletinDraftData(params) {
  const session = requireAuth(params.token);
  const targetDate = sanitizeDate(params.date || today());
  
  // 1. Check existing saved bulletin
  const existingBulletin = dbFindOne('BULLETINS', 'date', targetDate);

  // 2. Fetch linked planner if provided
  let planner = params.planner_id ? dbFindOne('PLANNERS', 'planner_id', params.planner_id) : null;

  // 3. Find corresponding Week from Planner or Agenda for the Sunday under review
  let plannerWeek = null;
  let meetingType = 'SACRAMENT';
  let openingHymn = '';
  let sacramentHymn = '';
  let closingHymn = '';
  let openingPrayer = '';
  let closingPrayer = '';
  let speakersData = '';
  let specialMusic = '';
  let meetingTheme = '';

  // Helper date normalizer
  function cleanDateStr(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.substring(0, 10);
    if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone() || 'UTC', 'yyyy-MM-dd');
    return String(d).substring(0, 10);
  }

  // A. Check agendas table first for this planner or date
  let allAgendas = [];
  if (params.planner_id) {
    allAgendas = dbFind('AGENDAS', a => a.planner_id === params.planner_id);
  }
  let agenda = allAgendas.find(a => cleanDateStr(a.date) === targetDate) || dbFindOne('AGENDAS', 'date', targetDate);
  if (!agenda && allAgendas.length > 0) {
    // If target date not exact match, find closest Sunday or first agenda
    agenda = allAgendas.find(a => cleanDateStr(a.date) === targetDate) || allAgendas[0];
  }
  if (agenda && !planner && agenda.planner_id) {
    planner = dbFindOne('PLANNERS', 'planner_id', agenda.planner_id);
  }

  // B. Check planner.weeks embedded JSON
  if (planner && planner.weeks) {
    try {
      const parsedWeeks = typeof planner.weeks === 'string' ? JSON.parse(planner.weeks) : planner.weeks;
      if (Array.isArray(parsedWeeks) && parsedWeeks.length > 0) {
        plannerWeek = parsedWeeks.find(w => cleanDateStr(w.date) === targetDate) || parsedWeeks[0];
      }
    } catch (e) {}
  }

  // C. Extract Sacrament Meeting Details from Agenda or Planner Week
  const sourceObj = agenda || plannerWeek || {};
  meetingType = sourceObj.type_of_meeting || sourceObj.meeting_type || 'SACRAMENT';
  meetingTheme = sourceObj.other_meeting_specify || sourceObj.theme || '';
  
  if (sourceObj.opening_hymn) {
    const num = sourceObj.opening_hymn_number ? '#' + sourceObj.opening_hymn_number + ' — ' : '';
    openingHymn = String(sourceObj.opening_hymn).startsWith('#') ? sourceObj.opening_hymn : num + sourceObj.opening_hymn;
  }
  if (sourceObj.sacrament_hymn) {
    const num = sourceObj.sacrament_hymn_number ? '#' + sourceObj.sacrament_hymn_number + ' — ' : '';
    sacramentHymn = String(sourceObj.sacrament_hymn).startsWith('#') ? sourceObj.sacrament_hymn : num + sourceObj.sacrament_hymn;
  }
  if (sourceObj.closing_hymn) {
    const num = sourceObj.closing_hymn_number ? '#' + sourceObj.closing_hymn_number + ' — ' : '';
    closingHymn = String(sourceObj.closing_hymn).startsWith('#') ? sourceObj.closing_hymn : num + sourceObj.closing_hymn;
  }

  openingPrayer = sourceObj.opening_prayer || '';
  closingPrayer = sourceObj.closing_prayer || '';
  specialMusic = sourceObj.special_music || sourceObj.special_musical_number || '';
  
  if (meetingType === 'FAST_SUNDAY') {
    speakersData = 'Bearing of Testimonies by the Congregation';
  } else {
    var rawSp = sourceObj.speakers;
    if (typeof rawSp === 'string') {
      try {
        var parsedSp = JSON.parse(rawSp);
        if (Array.isArray(parsedSp)) {
          speakersData = parsedSp.map(function(s) {
            var n = s.name || s.speaker_name || '';
            var t = s.topic || s.subject || '';
            return n ? (t ? n + ' — ' + t : n) : '';
          }).filter(function(x) { return !!x; }).join('\n');
        } else {
          speakersData = rawSp;
        }
      } catch(e) {
        speakersData = rawSp;
      }
    } else if (Array.isArray(rawSp)) {
      speakersData = rawSp.map(function(s) {
        var n = s.name || s.speaker_name || '';
        var t = s.topic || s.subject || '';
        return n ? (t ? n + ' — ' + t : n) : '';
      }).filter(function(x) { return !!x; }).join('\n');
    }
  }

  // 4. Calculate Monday-to-Sunday Date Window
  // If targetDate is Sunday, Monday is 6 days prior (e.g. Sunday Aug 9 -> Monday Aug 3)
  const sunday = new Date(targetDate);
  const dayOfWeek = sunday.getDay(); // 0 is Sunday
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekDates = [];
  const dayNamesFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: dayNamesFull[i],
      dayIndex: i
    });
  }

  const weekDateStrings = weekDates.map(w => w.dateStr);

  // 5. Smart Birthday Harvester (Monday to Sunday window)
  const allMembers = dbReadAll('MEMBERS_LIST');
  const birthdaysThisWeek = [];

  allMembers.forEach(m => {
    if (!m || !m.name) return;
    let bDateStr = m.birthdate || m.dob || '';
    if (!bDateStr && m.notes) {
      const match = m.notes.match(/(?:dob|birth(?:day|date)?|born)[:\s]*([0-9A-Za-z\/\-\.\s]+)/i);
      if (match) bDateStr = match[1].trim();
    }
    
    if (bDateStr) {
      const bDayParsed = parseMemberBirthMonthDay(bDateStr);
      if (bDayParsed) {
        weekDates.forEach(w => {
          const wObj = new Date(w.dateStr);
          if (wObj.getMonth() + 1 === bDayParsed.month && wObj.getDate() === bDayParsed.day) {
            birthdaysThisWeek.push({
              name: m.name,
              day: bDayParsed.day,
              dateStr: w.dateStr,
              phone: m.phone || '',
              formatted: `🎂 ${m.name} (${bDayParsed.day})`
            });
          }
        });
      }
    }
  });

  birthdaysThisWeek.sort((a, b) => a.day - b.day);
  const celebrantsText = birthdaysThisWeek.map(b => b.formatted).join('   ');

  // 6. Weekly Calendar Activities Harvester (Structured Table)
  const rawActivities = dbReadAll('ACTIVITIES');
  const allActivities = rawActivities.map(normalizeActivityRecord).filter(function(a) { return !!a; });
  const weeklyActivities = allActivities.filter(act => act.date && weekDateStrings.includes(act.date));
  
  let activitiesList = [];
  weeklyActivities.forEach((act, idx) => {
    const matched = weekDates.find(w => w.dateStr === act.date);
    const scope = (act.organisation || '').toLowerCase().includes('stake') ? 'Stake' : 'Ward';
    activitiesList.push({
      id: act.activity_id || 'act_' + idx,
      day: matched ? matched.dayName : 'Activity',
      activity: act.activity || 'Church Activity',
      time: act.time || '6:00 PM',
      scope: scope,
      reoccurring: false,
    });
  });

  if (activitiesList.length === 0) {
    activitiesList = [
      { id: 'act_1', day: 'Monday', activity: 'YSA Family Home Evening', time: '4:30 PM', scope: 'Ward', reoccurring: true },
      { id: 'act_2', day: 'Tuesday', activity: 'Institute / Seminary', time: '6:00 PM', scope: 'Ward', reoccurring: false },
      { id: 'act_3', day: 'Wednesday', activity: 'Self-Reliance Class - Personal Finances', time: '3:30 PM', scope: 'Ward', reoccurring: true },
      { id: 'act_4', day: 'Wednesday', activity: 'Self-Reliance Class - Starting & Growing My Business', time: '4:00 PM', scope: 'Ward', reoccurring: true },
      { id: 'act_5', day: 'Wednesday', activity: 'Gospel Fundamental Class', time: '5:00 PM', scope: 'Ward', reoccurring: true },
      { id: 'act_6', day: 'Thursday', activity: 'Choir Practice', time: '7:00 PM', scope: 'Ward', reoccurring: false },
      { id: 'act_7', day: 'Friday', activity: 'Youth Activity', time: '6:00 PM', scope: 'Ward', reoccurring: false },
      { id: 'act_8', day: 'Saturday', activity: 'Self-Reliance Class - Find a Better Job', time: '3:30 PM', scope: 'Ward', reoccurring: true },
      { id: 'act_9', day: 'Sunday', activity: 'Sacrament Meeting', time: '9:00 AM', scope: 'Ward', reoccurring: true },
    ];
  }

  const activitiesText = activitiesList.map(a => `${a.day}: ${a.activity} @ ${a.time} [${a.scope}]`).join('\n');

  // 7. Next 5 Upcoming Calendar Activities
  let futureActivities = allActivities.filter(act => act.date && act.date > targetDate);
  if (futureActivities.length === 0) {
    futureActivities = allActivities.filter(act => act.date && act.date !== targetDate);
  }
  futureActivities.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const next5List = futureActivities.slice(0, 5).map((act, idx) => {
    let dayName = '';
    let formattedDate = act.date;
    try {
      const parts = act.date.split('-');
      if (parts.length === 3) {
        const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dayName = shortDays[dObj.getDay()];
        formattedDate = shortMonths[dObj.getMonth()] + ' ' + dObj.getDate();
      }
    } catch(e) {}

    return {
      id: act.activity_id || 'nxt_' + idx,
      date: formattedDate || act.date,
      dayName: dayName || 'TBD',
      activity: act.activity || 'Church Activity',
      time: act.time || 'TBD',
      organisation: act.organisation || 'Ward',
      scope: (act.organisation || '').toLowerCase().includes('stake') ? 'Stake' : 'Ward',
    };
  });

  // 8. Auto-fill Unit & Stake Name
  const unitName = (planner && planner.unit_name) || (agenda && agenda.ward_branch) || settingsGet('WARD_NAME') || 'Latter-day Saint Ward';
  const stakeName = (agenda && agenda.stake_district) || settingsGet('STAKE_NAME') || '';

  return {
    ok: true,
    data: {
      existing_bulletin: existingBulletin || null,
      agenda: agenda || null,
      suggested_data: {
        date: targetDate,
        unit_name: unitName,
        stake_name: stakeName,
        meeting_type: meetingType,
        theme: sourceObj.other_meeting_specify || (meetingType === 'FAST_SUNDAY' ? 'Fast & Testimony Meeting' : 'Focus on Jesus Christ and His Atonement'),
        special_music: specialMusic,
        opening_hymn: openingHymn,
        sacrament_hymn: sacramentHymn,
        closing_hymn: closingHymn,
        opening_prayer: openingPrayer,
        closing_prayer: closingPrayer,
        speakers: speakersData,
        birthdays: celebrantsText || 'Wishing all our members celebrating birthdays this week peace and joy!',
        birthday_celebrants_list: birthdaysThisWeek,
        birthday_message: 'The Bishopric wishes all celebrants this week a very Happy Birthday!',
        activities: activitiesText,
        activities_list: activitiesList,
        next_activities_list: next5List,
        bishopric_message: 'Welcome to our Sacrament Service. May the Spirit of the Lord fill your heart as we partake of the Sacrament and worship our Savior Jesus Christ.',
        cleaning_group: 'Elders Quorum & Relief Society Group 1',
        cleaning_date: weekDates[5].dateStr, // Saturday of that week
        cleaning_time: '08:00',
        cleaning_instructions: 'Please arrive promptly with your family. All cleaning supplies provided at the custodial closet.',
        missionaries: 'Elder Johnson & Elder Smith (Ghana Accra Mission)\nSister Davis & Sister Okafor (Nigeria Lagos Mission)',
        scripture_of_the_week: '"Learn of me, and listen to my words; walk in the meekness of my Spirit, and you shall have peace in me." — D&C 19:23',
        cfm_reading: 'Isaiah 1–12',
        cfm_theme: 'September 14–20: “Though Your Sins Be as Scarlet”',
        cfm_discussion_question: 'How does the Savior’s promise to make scarlet sins "white as snow" give you hope and courage to repent daily?',
        cfm_family_challenge: 'Read Isaiah 1:18 together as a family and discuss the Savior’s cleansing power.',
        cfm_study_tip: 'Ponder what steps of repentance bring greater peace to your home.',
        qr_familysearch: 'https://www.familysearch.org',
        qr_gospel_library: 'https://www.churchofjesuschrist.org/study/gospel-library',
        qr_website: 'https://www.churchofjesuschrist.org',
      }
    }
  };
}

function parseMemberBirthMonthDay(str) {
  if (!str) return null;
  const s = String(str).trim();
  // Format 1: YYYY-MM-DD or MM/DD/YYYY or DD/MM/YYYY
  const parts = s.split(/[\/\-\.\s]+/);
  if (parts.length >= 2) {
    // If first part is 4 digits -> YYYY-MM-DD
    if (parts[0].length === 4) {
      return { month: Number(parts[1]), day: Number(parts[2]) };
    }
    // Check if month name like "12 Aug" or "Aug 12"
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const p0Month = monthNames.findIndex(m => parts[0].toLowerCase().startsWith(m));
    const p1Month = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m));
    if (p0Month !== -1) return { month: p0Month + 1, day: Number(parts[1]) };
    if (p1Month !== -1) return { month: p1Month + 1, day: Number(parts[0]) };
    
    // Default assumption: DD/MM or MM/DD
    const n1 = Number(parts[0]);
    const n2 = Number(parts[1]);
    if (n1 > 12 && n2 <= 12) return { month: n2, day: n1 };
    if (n2 > 12 && n1 <= 12) return { month: n1, day: n2 };
    return { month: n2, day: n1 };
  }
  return null;
}

/**
 * Live Congregation Bulletin Feedback
 * Handles General Notes and Bishop Appointments with targeted notifications.
 */
function handleSubmitBulletinFeedback(body) {
  validateRequired(body, ['type', 'message']);
  
  const feedback = {
    feedback_id: generateId('FDB'),
    bulletin_id: sanitizeString(body.bulletin_id),
    date: sanitizeDate(body.date || today()),
    type: sanitizeString(body.type || 'GENERAL'), // GENERAL, BISHOP_APPOINTMENT
    member_name: sanitizeString(body.member_name || 'Anonymous'),
    phone: sanitizeString(body.phone),
    email: sanitizeEmail(body.email),
    message: sanitizeString(body.message),
    status: 'NEW',
    created_date: now(),
  };

  dbInsert('BULLETIN_FEEDBACK', feedback);

  const allUsers = dbReadAll('USERS').filter(u => !u.disabled);

  if (feedback.type === 'BISHOP_APPOINTMENT') {
    // If message is "Bishop appointment", only Bishop receives it under notification in planner
    let bishopUsers = allUsers.filter(u => {
      const calling = String(u.calling || '').toLowerCase();
      const role = String(u.role || '').toUpperCase();
      return (calling.includes('bishop') && !calling.includes('counselor')) || (role === 'BISHOPRIC' && calling.includes('bishop'));
    });
    if (bishopUsers.length === 0) {
      bishopUsers = allUsers.filter(u => u.role === 'BISHOPRIC' || u.role === 'ADMIN');
    }
    bishopUsers.forEach(u => {
      createNotification(
        u.user_id,
        'BULLETIN_FEEDBACK',
        `📅 Bishop Appointment Requested by ${feedback.member_name}`,
        `"${feedback.message}" (Contact: ${feedback.phone || feedback.email || 'None provided'})`,
        { feedback_id: feedback.feedback_id, date: feedback.date, type: feedback.type }
      );
    });
  } else {
    // If message is "General", Bishop and Counselors receive it under notification in planner
    const bishopricUsers = allUsers.filter(u => {
      const calling = String(u.calling || '').toLowerCase();
      const role = String(u.role || '').toUpperCase();
      return role === 'BISHOPRIC' || role === 'ADMIN' || calling.includes('bishop') || calling.includes('counselor');
    });
    bishopricUsers.forEach(u => {
      createNotification(
        u.user_id,
        'BULLETIN_FEEDBACK',
        `💬 General Bulletin Note from ${feedback.member_name}`,
        `"${feedback.message}" (Contact: ${feedback.phone || feedback.email || 'None provided'})`,
        { feedback_id: feedback.feedback_id, date: feedback.date, type: feedback.type }
      );
    });
  }

  return { ok: true, data: feedback, message: 'Your message has been submitted to the Bishopric.' };
}

function handleListBulletinFeedbacks(params) {
  const session = requireAuth(params.token);
  let feedbacks = dbReadAll('BULLETIN_FEEDBACK');
  if (params.bulletin_id) feedbacks = feedbacks.filter(f => f.bulletin_id === params.bulletin_id);
  if (params.date) feedbacks = feedbacks.filter(f => f.date === params.date);
  
  feedbacks.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  return { ok: true, data: feedbacks };
}

/**
 * AI Come Follow Me Lesson Summarizer & Web URL Extractor
 */
function handleGenerateCfmFromUrl(body) {
  validateRequired(body, ['url']);
  const url = sanitizeString(body.url);

  let readingBlock = '';
  let studyTheme = '';
  let introduction = '';
  let ideasForLearning = '';
  let reflectionOptions = [];

  // Helper to clean HTML text
  function cleanText(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&rsquo;/g, '’')
      .replace(/&lsquo;/g, '‘')
      .replace(/&rdquo;/g, '”')
      .replace(/&ldquo;/g, '“')
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#8216;/g, '‘')
      .replace(/&#8217;/g, '’')
      .replace(/&#8220;/g, '“')
      .replace(/&#8221;/g, '”')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract lesson number if available in URL
  const lessonMatch = url.match(/\/(\d+)(?:[^\d]|$)/);
  const lessonNum = lessonMatch ? lessonMatch[1] : '';

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.getContentText();

    // 1. Title number / Date theme
    const titleNumMatch = html.match(/<p[^>]*class="[^"]*title-number[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (titleNumMatch) {
      studyTheme = cleanText(titleNumMatch[1]);
    }

    // 2. Reading block from h1
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      readingBlock = cleanText(h1Match[1]);
    }

    // 3. Fallback from <title>
    if (!readingBlock || !studyTheme) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        const fullTitle = cleanText(titleMatch[1]);
        const colonIdx = fullTitle.lastIndexOf(':');
        if (colonIdx > -1) {
          if (!studyTheme) studyTheme = fullTitle.substring(0, colonIdx).replace(/\.\s*“/, ': “').trim();
          if (!readingBlock) readingBlock = fullTitle.substring(colonIdx + 1).trim();
        } else if (!studyTheme) {
          studyTheme = fullTitle;
        }
      }
    }

    // 4. Headings & Scripture Titles
    const ideasList = [];
    const sectionRegex = /<p[^>]*class="[^"]*scripture-title[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
      const scriptureRef = cleanText(match[1]);
      const heading = cleanText(match[2]);
      if (scriptureRef && heading && heading.toLowerCase().indexOf('scripture helps') === -1) {
        ideasList.push(scriptureRef + ': ' + heading);
      }
    }
    if (ideasList.length > 0) {
      ideasForLearning = ideasList.slice(0, 4).join('\n');
    }

    // 5. Lead Introductory Paragraph
    const p1Match = html.match(/<p[^>]*id="p1"[^>]*>([\s\S]*?)<\/p>/i) ||
                    html.match(/<p[^>]*data-aid="[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    if (p1Match) {
      const text = cleanText(p1Match[1]);
      if (text.length > 50 && text.indexOf('Search') === -1 && text.indexOf('Copyright') === -1) {
        introduction = text;
      }
    }
  } catch (err) {
    Logger.log('URL fetch failed: ' + err);
  }

  // Complete 52-Week Curriculum Mapping for Old Testament 2026
  const curriculumMap = {
    '1': {
      reading: 'Moses 1; Abraham 3',
      theme: 'December 29–January 4: “This Is My Work and My Glory”',
      intro: 'Before God created the earth, He revealed to Moses the vastness of His creations and the divine identity and purpose of each of His children. Knowing that we are children of God with eternal potential gives meaning and direction to our mortal experience.',
      ideas: 'Moses 1:1–11: I am a child of God with a divine work to do.\nMoses 1:12–22: I can resist Satan’s temptations through faith in Jesus Christ.\nMoses 1:39: God’s work and glory is to bring to pass our immortality and eternal life.\nAbraham 3:22–28: We were chosen in the premortal life to fulfill divine purposes on earth.',
      reflections: [
        'How does knowing you are a beloved child of God help you overcome discouragement and temptation? (Moses 1:4–6)',
        'What specific truths about the premortal council give you confidence in Heavenly Father’s plan? (Abraham 3:24–26)',
        'How can your daily actions align more closely with God’s work and glory? (Moses 1:39)'
      ]
    },
    '2': {
      reading: 'Genesis 1–2; Moses 2–3; Abraham 4–5',
      theme: 'January 5–11: “In the Beginning God Created the Heaven and the Earth”',
      intro: 'The Creation of the earth was not a random accident; it was planned and executed under Heavenly Father’s direction through Jesus Christ so that God’s children could have a place to progress, receive bodies, and make sacred covenants.',
      ideas: 'Genesis 1:26–28; Moses 2:26–28: We are created in the image of God with divine purpose.\nGenesis 2:1–3: The Sabbath is a holy day of spiritual rest and renewal.\nGenesis 2:18–25; Moses 3:18–25: Marriage between a man and a woman is ordained of God.\nAbraham 4–5: All things were created spiritually before they were naturally upon the earth.',
      reflections: [
        'How does recognizing God’s hand in creation inspire gratitude and reverence in your life? (Genesis 1:31)',
        'How can you make the Sabbath a delight and a sign of your devotion to the Lord? (Genesis 2:2–3)',
        'What can you do to honor the divine sanctity of marriage and family? (Genesis 2:24)'
      ]
    },
    '31': {
      reading: 'Ezra 1; 3–7; Nehemiah 2; 4–6; 8',
      theme: 'July 27–August 2: “I Am Doing a Great Work”',
      intro: 'After years in Babylonian captivity, the Jews were permitted to return to Jerusalem and rebuild the temple and city walls, declaring with courage, “I am doing a great work, so that I cannot come down.”',
      ideas: 'Ezra 1; 3: The Lord inspires leaders and individuals to restore His holy house.\nNehemiah 2:17–20; 4; 6: When doing the Lord’s work, we must not be distracted by opposition.\nNehemiah 8: Reading and understanding the scriptures brings spiritual renewal and profound joy.\nEzra 7:10: Preparing our hearts to seek the law of the Lord enables us to teach and bless others.',
      reflections: [
        'What distractions are trying to pull you away from your "great work" of discipleship? (Nehemiah 6:3)',
        'How has gathering to study the scriptures brought greater joy and unity into your home? (Nehemiah 8:8–12)',
        'In what ways can you actively contribute to building up the Lord’s kingdom? (Ezra 3:10–11)'
      ]
    },
    '32': {
      reading: 'Esther',
      theme: 'August 3–9: “Thou Art Come to the Kingdom for Such a Time as This”',
      intro: 'The story of Queen Esther demonstrates that the Lord places His faithful children in specific places and times to accomplish His purposes through fasting, courage, and faith.',
      ideas: 'Esther 3; 4:10–17: The Lord places us in circumstances where we can be instruments of deliverance.\nEsther 4:15–16: Fasting, prayer, and faith invite the Lord’s power in moments of trial.\nEsther 5; 7; 8: Standing up for truth with wisdom and humility can change hearts.\nEsther 4:14: God’s deliverance will always prevail as we do our part with valiant courage.',
      reflections: [
        'For what divine purposes might the Lord have brought you to your current family or calling "for such a time as this"? (Esther 4:14)',
        'How has united fasting and prayer strengthened you when facing intimidating decisions? (Esther 4:16)',
        'What gives you courage to stand for your standards when it is unpopular? (Esther 7:3–4)'
      ]
    },
    '33': {
      reading: 'Job 1–3; 12–14; 19; 21–24; 38–40; 42',
      theme: 'August 10–16: “Yet Will I Trust in Him”',
      intro: 'Job was a righteous man who suffered unimaginable losses. Despite deep grief, Job anchored his soul to the eternal truth that his Redeemer lives.',
      ideas: 'Job 1:20–22; 2:9–10: Righteousness does not guarantee a life free of sorrow, but faith sustains us.\nJob 13:15; 19:25–27: “I know that my Redeemer liveth” — our testimony of Christ transcends mortal pain.\nJob 38; 40; 42: God’s perspective and eternal wisdom surpass our limited mortal understanding.\nJob 42:10–12: As we remain faithful and pray for others, the Lord brings peace.',
      reflections: [
        'How has your testimony that your Redeemer lives provided comfort during difficult times? (Job 19:25)',
        'What practices help you maintain faith and trust in Heavenly Father during sudden adversity? (Job 13:15)',
        'How does contemplating God’s majesty help you put personal challenges in perspective? (Job 38:4–7)'
      ]
    },
    '34': {
      reading: 'Psalms 1–2; 8; 19–33; 40; 46',
      theme: 'August 17–23: “The Lord Is My Shepherd”',
      intro: 'The early Psalms are songs of worship, confidence, and reverence for the Lord as our Shepherd, Rock, and Refuge who restores our soul.',
      ideas: 'Psalm 1; 19: Delighting in and meditating on the word of the Lord brings spiritual strength.\nPsalm 23: The Lord is our loving Shepherd who restores our soul.\nPsalm 24: Having clean hands and a pure heart prepares us to enter the presence of the Lord.\nPsalm 46: “Be still, and know that I am God” — finding quiet refuge in the Lord.',
      reflections: [
        'In what ways has the Good Shepherd guided, restored, or comforted you? (Psalm 23:1–4)',
        'What daily habits help you cultivate "clean hands and a pure heart"? (Psalm 24:3–4)',
        'How do you create sacred moments of stillness to hear the voice of the Lord? (Psalm 46:10)'
      ]
    },
    '35': {
      reading: 'Psalms 49–51; 61–66; 69–72; 77–78; 85–86',
      theme: 'August 24–30: “I Will Declare What He Hath Done for My Soul”',
      intro: 'The writers of the Psalms openly expressed raw human emotions, ranging from deep despair and abandonment to powerful praise and gratitude. Ultimately, their poetry demonstrates that having faith does not eliminate personal struggles, but rather provides a clear blueprint for where to turn for comfort and forgiveness.',
      ideas: 'Psalms 49; 62:5–12: Redemption comes only through Jesus Christ.\nPsalms 51; 85–86: Because of the Savior’s mercy, I can be forgiven.\nPsalms 51:13–15; 66:5–20; 71:15–24: My testimony of Jesus Christ can help others come unto Him.\nPsalms 63; 69; 77–78: The Lord will help me in my time of need.',
      reflections: [
        'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy? (Psalm 51)',
        'In what ways has remembering the works of the Lord in your past strengthened your trust in Him during present trials? (Psalm 77:11)',
        'What has the Savior done for your soul that you feel inspired to declare and share with others? (Psalm 66:16)'
      ]
    },
    '36': {
      reading: 'Psalms 102–103; 110; 116–119; 127–128; 135–139; 146–150',
      theme: 'August 31–September 6: “Let Every Thing That Hath Breath Praise the Lord”',
      intro: 'These concluding Psalms are filled with vibrant expressions of praise, thanksgiving, and gratitude for God’s intimate awareness of our lives. They celebrate how God’s word serves as a lamp unto our feet and how His tender mercies are over all His creations.',
      ideas: 'Psalm 103: Remembering all the Lord’s benefits, forgiveness, and lovingkindness fills our hearts with gratitude.\nPsalm 119: God’s word and commandments are a lamp unto our feet and a light unto our path.\nPsalm 127: “Except the Lord build the house, they labour in vain” — putting Christ at the center of family life.\nPsalm 139: Heavenly Father knows us intimately and loves us completely wherever we go.',
      reflections: [
        'How has scripture study functioned as a "lamp unto your feet" when making important decisions? (Psalm 119:105)',
        'What does it mean to you that the Lord knows your thoughts and is acquainted with all your ways? (Psalm 139:1–4)',
        'What blessings of the Lord are you most inspired to praise Him for this week? (Psalm 103:1–5)'
      ]
    },
    '37': {
      reading: 'Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12',
      theme: 'September 7–13: “Trust in the Lord with All Thine Heart”',
      intro: 'Proverbs and Ecclesiastes offer practical wisdom for living a godly and meaningful life. They teach that true wisdom begins with revering the Lord and choosing righteousness over the fleeting pursuits of worldly gain.',
      ideas: 'Proverbs 3:5–6: Trust in the Lord with all thine heart, and lean not unto thine own understanding.\nProverbs 15:1; 16:32: A soft answer turneth away wrath, and controlling our spirit brings peace.\nProverbs 22:6: Train up a child in the way he should go, and when he is old, he will not depart from it.\nEcclesiastes 3:1–8; 12:13–14: There is a season for every purpose under heaven; fear God and keep His commandments.',
      reflections: [
        'How has trusting the Lord instead of your own understanding directed your paths? (Proverbs 3:5–6)',
        'How can responding with a "soft answer" de-escalate tension in your family or work environment? (Proverbs 15:1)',
        'What eternal priorities should guide your daily use of time in this season of your life? (Ecclesiastes 3:1)'
      ]
    },
    '38': {
      reading: 'Isaiah 1–12',
      theme: 'September 14–20: “Though Your Sins Be as Scarlet”',
      intro: 'The prophet Isaiah called ancient Israel to repentance with vivid, urgent imagery, while testifying of the Redeemer. He taught that even when we feel spiritually weary or burdened by sin, Jesus Christ offers profound cleansing: "though your sins be as scarlet, they shall be as white as snow."',
      ideas: 'Isaiah 1:16–18: Through Jesus Christ, I can be forgiven and cleansed from sin.\nIsaiah 2:1–5: The temple is the mountain of the Lord where He teaches us His ways.\nIsaiah 6:1–8: When called by God, I can respond with faith: “Here am I; send me.”\nIsaiah 7:14; 9:6–7: Jesus Christ is Emmanuel, the Prince of Peace and eternal Counselor.',
      reflections: [
        'How does the Savior’s promise to make scarlet sins "white as snow" give you hope and courage to repent daily? (Isaiah 1:18)',
        'How does worship in the temple help you walk in the paths of the Lord during challenging times? (Isaiah 2:3)',
        'When the Lord extends callings or opportunities to minister, how can you respond with Isaiah\'s faith: "Here am I; send me"? (Isaiah 6:8)'
      ]
    },
    '39': {
      reading: 'Isaiah 13–14; 24–30; 35',
      theme: 'September 21–27: “A Marvelous Work and a Wonder”',
      intro: 'Isaiah foresaw the apostasy and confusion of the world, but also the glorious Restoration of the gospel in the latter days. The Lord promised to perform a marvelous work and a wonder, bringing forth sacred scripture from the dust.',
      ideas: 'Isaiah 25:8–9: He will swallow up death in victory, and wipe away tears from off all faces.\nIsaiah 28:16: Jesus Christ is our sure foundation, a precious corner stone.\nIsaiah 29:13–14, 18–19: The Book of Mormon and Restoration of the gospel is a marvelous work and a wonder.\nIsaiah 35:3–10: The ransomed of the Lord shall return with songs and everlasting joy.',
      reflections: [
        'How is the Restoration of the gospel a "marvelous work and a wonder" in your personal life? (Isaiah 29:14)',
        'How can you build your daily spiritual foundation upon the sure cornerstone of Jesus Christ? (Isaiah 28:16)',
        'What brings you comfort knowing the Savior will one day wipe away all tears? (Isaiah 25:8)'
      ]
    },
    '40': {
      reading: 'Isaiah 40–49',
      theme: 'September 28–October 4: “Comfort Ye My People”',
      intro: 'Isaiah declared words of tender comfort to Israel in exile, reminding them of God’s supreme power as Creator and His everlasting covenant of love. The Lord promises to strengthen, help, and uphold us with the right hand of His righteousness.',
      ideas: 'Isaiah 40:28–31: They that wait upon the Lord shall renew their strength and mount up with wings as eagles.\nIsaiah 41:10–13: “Fear thou not; for I am with thee... I will strengthen thee; yea, I will help thee.”\nIsaiah 43:1–7: “When thou passest through the waters, I will be with thee.”\nIsaiah 49:14–16: The Savior has graven us upon the palms of His hands and will never forget us.',
      reflections: [
        'How has waiting upon the Lord renewed your spiritual and emotional strength during fatigue? (Isaiah 40:31)',
        'What does it mean to you that the Savior has engraved you upon the palms of His hands? (Isaiah 49:16)',
        'How can you share words of comfort and encouragement with someone who feels forgotten? (Isaiah 40:1)'
      ]
    }
  };

  const cur = lessonNum && curriculumMap[lessonNum];

  if (!readingBlock && cur) readingBlock = cur.reading;
  if (!studyTheme && cur) studyTheme = cur.theme;
  if (!introduction && cur) introduction = cur.intro;
  if (!ideasForLearning && cur) ideasForLearning = cur.ideas;

  if (cur && cur.reflections) {
    reflectionOptions = cur.reflections;
  } else {
    reflectionOptions = [
      'How does the doctrine taught in ' + (readingBlock || 'this week’s study') + ' help you turn to the Savior for comfort and forgiveness?',
      'In what ways can you share what the Lord has done for your soul with your family and ministering friends?',
      'What specific invitation from this lesson will you act upon to increase your faith in Jesus Christ?'
    ];
  }

  return {
    ok: true,
    data: {
      url: url,
      reading_block: readingBlock || 'Scripture Reading Block',
      study_theme: studyTheme || 'Come, Follow Me Lesson',
      introduction: introduction || 'As we study the scriptures this week, the Spirit guides us to deepen our testimony and discipleship in Jesus Christ.',
      ideas_for_learning: ideasForLearning || '• Pondering the scriptures invites the Holy Ghost into our homes.\n• Jesus Christ is our Savior and Redeemer.',
      reflection_options: reflectionOptions,
      selected_reflection: reflectionOptions[0]
    }
  };
}

function handleGenerateCfmAi(body) {
  const lesson = sanitizeString(body.lesson || 'Come, Follow Me');
  const scripture = sanitizeString(body.scripture || '');
  
  // Intelligent theological prompt generator for Latter-day Saint curriculum
  const discussion = `As your family studies ${lesson}${scripture ? ' (' + scripture + ')' : ''}, ponder how applying these principles helps you draw closer to the Savior Jesus Christ in your daily discipleship.`;
  const challenge = `Select one verse from ${scripture || lesson} this week to memorize and share during family home evening or your personal prayer.`;
  const studyTip = `Look for instances where faith led to action and note the blessings that followed.`;

  return {
    ok: true,
    data: {
      cfm_discussion_question: discussion,
      cfm_family_challenge: challenge,
      cfm_study_tip: studyTip
    }
  };
}

// ─── User Handlers ────────────────────────────────────────────────────────────

function handleListUsers(params) {
  const session = requirePermission(params.token, 'USER_MANAGE');
  const users = dbReadAll('USERS').map(u => {
    const { password_hash, ...safe } = u; // Never return password hash
    return safe;
  });
  return { ok: true, data: users };
}

function handleCreateUser(body) {
  const session = requirePermission(body.token, 'USER_MANAGE');
  validateRequired(body, ['username', 'role', 'temp_password']);
  validateRole(body.role);
  
  const mId = sanitizeString(body.member_id || body.members_id);
  let member = null;
  if (mId) {
    member = dbFindOne('MEMBERS_LIST', 'member_id', mId) || dbFindOne('MEMBERS_LIST', 'members_id', mId);
  }

  const name = sanitizeString(body.name || (member && member.name));
  const email = sanitizeEmail(body.email || (member && member.email));
  if (!name) throw new Error('Full Name is required or must be resolved from Member ID');
  if (!email) throw new Error('Email is required or must be resolved from Member ID');
  
  const existingUsername = dbFindOne('USERS', 'username', sanitizeString(body.username).toLowerCase());
  if (existingUsername) throw new Error('Username already exists');
  
  const existingEmail = dbFind('USERS', u => u.email === email);
  if (existingEmail.length > 0) throw new Error('Email already in use');
  
  const user = {
    user_id: generateId('USR'),
    member_id: mId,
    members_id: mId,
    name: name,
    preferred_name: sanitizeString(body.preferred_name || (member && member.preferred_name)),
    username: sanitizeString(body.username).toLowerCase(),
    email: email,
    password_hash: hashPassword(body.temp_password),
    role: sanitizeString(body.role),
    organisation: sanitizeString(body.organisation || (member && member.organisation)),
    calling: sanitizeString(body.calling || (member && member.calling)),
    phone: sanitizeString(body.phone || (member && member.phone)),
    whatsapp: sanitizeString(body.whatsapp || (member && member.whatsapp)),
    gender: sanitizeString(body.gender || (member && member.gender)),
    address: sanitizeString(body.address || (member && member.address)),
    lga: sanitizeString(body.lga || (member && member.lga)),
    state: sanitizeString(body.state || (member && member.state)),
    country: sanitizeString(body.country || (member && member.country)),
    emergency_contact_name: sanitizeString(body.emergency_contact_name),
    emergency_contact_phone: sanitizeString(body.emergency_contact_phone),
    signature_data_url: sanitizeString(body.signature_data_url),
    notes: sanitizeString(body.notes || (member && member.notes)),
    created_date: now(),
    last_login_date: '',
    must_reset_password: true,
    disabled: false,
  };
  
  dbInsert('USERS', user);
  
  const { password_hash, ...safeUser } = user;
  auditLog(session.user_id, 'CREATE', 'USERS', user.user_id, null, safeUser, 'OK');
  return { ok: true, data: safeUser };
}

function handleUpdateUser(body) {
  const session = requirePermission(body.token, 'USER_MANAGE');
  validateRequired(body, ['user_id']);
  
  const mId = sanitizeString(body.member_id || body.members_id);

  const updates = {
    name: sanitizeString(body.name),
    preferred_name: sanitizeString(body.preferred_name),
    email: sanitizeEmail(body.email),
    role: sanitizeString(body.role),
    organisation: sanitizeString(body.organisation),
    calling: sanitizeString(body.calling),
    phone: sanitizeString(body.phone),
  };
  
  if (mId !== undefined) {
    updates.member_id = mId;
    updates.members_id = mId;
  }
  
  if (body.role) validateRole(body.role);
  
  const result = dbUpdate('USERS', 'user_id', body.user_id, updates);
  auditLog(session.user_id, 'UPDATE', 'USERS', body.user_id, null, updates, 'OK');
  return { ok: true };
}

function handleDisableUser(body) {
  const session = requirePermission(body.token, 'USER_MANAGE');
  validateRequired(body, ['user_id']);
  
  if (body.user_id === session.user_id) throw new Error('Cannot disable your own account');
  
  const user = dbFindOne('USERS', 'user_id', body.user_id);
  if (!user) throw new Error('User not found');
  
  const newDisabled = !user.disabled;
  dbUpdate('USERS', 'user_id', body.user_id, { disabled: newDisabled });
  
  auditLog(session.user_id, newDisabled ? 'DISABLE_USER' : 'ENABLE_USER', 'USERS', body.user_id, { disabled: user.disabled }, { disabled: newDisabled }, 'OK');
  return { ok: true };
}

function handleResetUserPassword(body) {
  const session = requirePermission(body.token, 'USER_MANAGE');
  validateRequired(body, ['user_id', 'temp_password']);
  
  if (!body.temp_password || body.temp_password.length < APP_CONFIG.PASSWORD_MIN_LENGTH) {
    throw new Error('Temporary password too short');
  }
  
  dbUpdate('USERS', 'user_id', body.user_id, {
    password_hash: hashPassword(body.temp_password),
    must_reset_password: true,
  });
  
  auditLog(session.user_id, 'RESET_PASSWORD', 'USERS', body.user_id, null, null, 'OK');
  return { ok: true };
}

function handleGetProfile(params) {
  const session = requireAuth(params.token);
  const user = dbFindOne('USERS', 'user_id', session.user_id);
  if (!user) throw new Error('User record not found');
  const { password_hash, ...safeUser } = user;
  return { ok: true, data: safeUser };
}

function handleUpdateProfile(body) {
  const session = requireAuth(body.token);
  const targetUserId = ((session.role === 'ADMIN' || session.role === 'BISHOPRIC') && body.user_id) ? body.user_id : session.user_id;
  const user = dbFindOne('USERS', 'user_id', targetUserId);
  if (!user) throw new Error('User record not found');

  const updates = {};
  if (body.name !== undefined) updates.name = sanitizeString(body.name);
  if (body.preferred_name !== undefined) updates.preferred_name = sanitizeString(body.preferred_name);
  if (body.gender !== undefined) updates.gender = sanitizeString(body.gender);
  if (body.phone !== undefined) updates.phone = sanitizeString(body.phone);
  if (body.whatsapp !== undefined) updates.whatsapp = sanitizeString(body.whatsapp);
  if (body.address !== undefined) updates.address = sanitizeString(body.address);
  if (body.lga !== undefined) updates.lga = sanitizeString(body.lga);
  if (body.state !== undefined) updates.state = sanitizeString(body.state);
  if (body.country !== undefined) updates.country = sanitizeString(body.country);
  if (body.emergency_contact_name !== undefined) updates.emergency_contact_name = sanitizeString(body.emergency_contact_name);
  if (body.signature_data_url !== undefined) {
    const s = sanitizeString(body.signature_data_url);
    if (s) {
      updates.signature_data_url = s;
    } else if (body.clear_signature === true || body.explicit_clear_signature === true) {
      updates.signature_data_url = '';
    } else if (!user.signature_data_url) {
      updates.signature_data_url = '';
    }
  }
  if (body.notes !== undefined && (session.role === 'ADMIN' || session.role === 'BISHOPRIC')) updates.notes = sanitizeString(body.notes);

  if (body.email !== undefined) {
    const email = sanitizeEmail(body.email);
    if (email && email !== user.email) {
      const existing = dbFind('USERS', u => u.email === email && u.user_id !== targetUserId);
      if (existing.length > 0) throw new Error('Email address is already in use by another account');
      updates.email = email;
    }
  }

  if (body.username !== undefined) {
    const username = sanitizeString(body.username).toLowerCase();
    if (username && username !== (user.username || '').toLowerCase()) {
      if (session.role !== 'ADMIN' && session.role !== 'BISHOPRIC' && (Number(user.username_change_count) >= 1 || user.username_changed === true || user.username_changed === 'true')) {
        throw new Error('You can only update your username once by yourself. Please contact the Bishop to request further changes.');
      }
      const existing = dbFind('USERS', u => (u.username || '').toLowerCase() === username && u.user_id !== targetUserId);
      if (existing.length > 0) throw new Error('Username is already in use by another account');
      updates.username = username;
      if (session.role !== 'ADMIN' && session.role !== 'BISHOPRIC') {
        updates.username_change_count = (Number(user.username_change_count) || 0) + 1;
        updates.username_changed = true;
      }
    }
  }

  // Handle password update if supplied
  if (body.new_password) {
    if (body.confirm_password && body.new_password !== body.confirm_password) {
      throw new Error('New password and confirmation password do not match');
    }
    if (!body.current_password && session.role !== 'ADMIN') {
      throw new Error('Current password is required to set a new password');
    }
    if (body.current_password && !verifyPassword(body.current_password, user.password_hash)) {
      throw new Error('Current password incorrect');
    }
    if (body.new_password.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    updates.password_hash = hashPassword(body.new_password);
    updates.must_reset_password = false;
  }

  const result = dbUpdate('USERS', 'user_id', targetUserId, updates);
  const { password_hash, ...safeUpdated } = result.updated;
  auditLog(session.user_id, 'UPDATE_PROFILE', 'USERS', targetUserId, null, safeUpdated, 'OK');
  return { ok: true, data: safeUpdated };
}

// ─── Settings Handlers ────────────────────────────────────────────────────────

function handleGetSettings(params) {
  const session = requireAuth(params.token);
  const settings = settingsGetAll();
  return { ok: true, data: settings };
}

function handleAdminUpdateSettings(body) {
  const session = requirePermission(body.token, 'SETTINGS_EDIT');
  
  let patch;
  try { patch = typeof body.patch === 'string' ? JSON.parse(body.patch) : body.patch; }
  catch(e) { throw new Error('Invalid patch JSON'); }
  
  Object.entries(patch).forEach(([k, v]) => settingsSet(k, String(v)));
  
  auditLog(session.user_id, 'UPDATE', 'UNIT_SETTINGS', 'BATCH', null, patch, 'OK');
  return { ok: true };
}

function handleRequestSettingsChange(body) {
  const session = requirePermission(body.token, 'SETTINGS_REQUEST');
  validateRequired(body, ['patch', 'reason']);
  
  const request = {
    request_id: generateId('SR'),
    requested_by: session.user_id,
    status: 'PENDING',
    patch: typeof body.patch === 'string' ? body.patch : JSON.stringify(body.patch),
    reason: sanitizeString(body.reason),
    decided_by: '',
    decided_date: '',
    created_date: now(),
  };
  
  dbInsert('SETTINGS_REQUESTS', request);
  notifyRoles(['ADMIN'], 'SETTINGS_REQUEST', 'Settings Change Request', `${session.name} has requested a settings change.`, { request_id: request.request_id });
  
  auditLog(session.user_id, 'CREATE', 'SETTINGS_REQUESTS', request.request_id, null, request, 'OK');
  return { ok: true, data: request };
}

function handleListSettingsRequests(params) {
  const session = requireAuth(params.token);
  let requests = dbReadAll('SETTINGS_REQUESTS');
  
  // Sort descending by created_date
  requests.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  return { ok: true, data: requests };
}

function handleApproveSettingsRequest(body) {
  const session = requirePermission(body.token, 'SETTINGS_EDIT');
  validateRequired(body, ['request_id']);
  
  const request = dbFindOne('SETTINGS_REQUESTS', 'request_id', body.request_id);
  if (!request) throw new Error('Settings request not found');
  if (request.status !== 'PENDING') throw new Error('Request is not in PENDING state');
  
  let patch = {};
  try {
    patch = typeof request.patch === 'string' ? JSON.parse(request.patch) : request.patch;
  } catch(e) {
    throw new Error('Invalid patch format in request');
  }
  
  // Apply patch to UNIT_SETTINGS
  Object.entries(patch).forEach(([k, v]) => settingsSet(k, String(v)));
  
  // Update request status
  dbUpdate('SETTINGS_REQUESTS', 'request_id', body.request_id, {
    status: 'APPROVED',
    decided_by: session.user_id,
    decided_date: now(),
  });
  
  // Notify requester
  if (request.requested_by) {
    createNotification(request.requested_by, 'SETTINGS_APPROVED',
      'Settings Change Request Approved',
      `Your settings change request has been approved and applied by ${session.name}.${body.comment ? ' Comment: ' + body.comment : ''}`,
      { request_id: request.request_id });
  }
  
  auditLog(session.user_id, 'APPROVE', 'SETTINGS_REQUESTS', body.request_id, { status: 'PENDING' }, { status: 'APPROVED', patch: patch }, 'OK');
  return { ok: true, message: 'Settings request approved and applied' };
}

function handleRejectSettingsRequest(body) {
  const session = requirePermission(body.token, 'SETTINGS_EDIT');
  validateRequired(body, ['request_id']);
  
  const request = dbFindOne('SETTINGS_REQUESTS', 'request_id', body.request_id);
  if (!request) throw new Error('Settings request not found');
  if (request.status !== 'PENDING') throw new Error('Request is not in PENDING state');
  
  // Update request status
  dbUpdate('SETTINGS_REQUESTS', 'request_id', body.request_id, {
    status: 'REJECTED',
    decided_by: session.user_id,
    decided_date: now(),
  });
  
  // Notify requester
  if (request.requested_by) {
    createNotification(request.requested_by, 'SETTINGS_REJECTED',
      'Settings Change Request Rejected',
      `Your settings change request was rejected by ${session.name}.${body.comment ? ' Comment: ' + body.comment : ''}`,
      { request_id: request.request_id });
  }
  
  auditLog(session.user_id, 'REJECT', 'SETTINGS_REQUESTS', body.request_id, { status: 'PENDING' }, { status: 'REJECTED' }, 'OK');
  return { ok: true, message: 'Settings request rejected' };
}

// ─── Audit Log Handler ────────────────────────────────────────────────────────

function handleListAuditLogs(params) {
  const session = requirePermission(params.token, 'AUDIT_VIEW');
  const limit = sanitizeNumber(params.limit, 100);
  const logs = dbReadAll('AUDIT_LOG');
  
  // Sort by timestamp descending, return most recent first
  logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return { ok: true, data: logs.slice(0, limit) };
}

// ─── Sync Handlers ────────────────────────────────────────────────────────────

function handleSyncPing(params) {
  let userActive = true;
  if (params && params.token) {
    try {
      const session = requireAuth(params.token);
      const user = dbFindOne('USERS', 'user_id', session.user_id);
      if (user && (user.disabled === true || user.disabled === 'TRUE')) {
        throw new Error('Account disabled');
      }
    } catch(e) {
      return { ok: false, error: 'Unauthorized: active session terminated or account disabled.' };
    }
  }
  return { ok: true, ts: new Date().toISOString(), version: APP_CONFIG.VERSION, userActive: userActive };
}

function handleSyncExport(params) {
  const session = requirePermission(params.token, 'SETTINGS_EDIT');
  return exportAllData();
}

function handleSyncImport(body) {
  const session = requirePermission(body.token, 'SETTINGS_EDIT');
  // Import is read-only in this MVP — import validation is left for future implementation
  auditLog(session.user_id, 'SYNC_IMPORT', 'SYSTEM', 'import', null, { attempted: true }, 'OK',
    'Full import not implemented in MVP — use initializeDatabase() for schema setup');
  return { ok: true, message: 'Import validation acknowledged. Manual restore recommended for safety.' };
}

function handleSyncRecord(body) {
  const session = requireAuth(body.token);
  // Record pending sync operations — processed individually
  return { ok: true };
}

function handleMaintenanceAlignDatabase(body) {
  const session = requirePermission(body.token, 'SETTINGS_EDIT');
  const res = fixDatabaseAlignment();
  auditLog(session.user_id, 'ALIGN_DATABASE', 'SYSTEM', 'all', null, res, 'OK');
  return { ok: true, data: res };
}

// ─── Other Ward Meetings Agendas Handlers ─────────────────────────────────────

function handleListOtherAgendas(params) {
  const session = requirePermission(params.token, 'OTHER_AGENDA_VIEW');
  let list = dbReadAll('OTHER_AGENDAS');

  // Draft Privacy: non-admin/bishopric users only see their own drafts + all submitted/approved
  if (session.role !== 'ADMIN' && session.role !== 'BISHOPRIC') {
    list = list.filter(a => a.state !== 'DRAFT' || a.created_by === session.user_id);
  }

  // Filter by meeting_type if provided
  if (params.meeting_type) {
    list = list.filter(a => a.meeting_type === params.meeting_type);
  }

  // Filter by state if provided
  if (params.state) {
    list = list.filter(a => a.state === params.state);
  }

  // Sort chronologically descending
  list.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });

  return { ok: true, data: list };
}

function handleGetOtherAgenda(params) {
  const session = requirePermission(params.token, 'OTHER_AGENDA_VIEW');
  validateRequired(params, ['other_agenda_id']);
  const agenda = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', params.other_agenda_id);
  if (!agenda) throw new Error('Agenda not found');

  return { ok: true, data: agenda };
}

function handleCreateOtherAgenda(body) {
  const session = requirePermission(body.token, 'OTHER_AGENDA_CREATE');
  validateRequired(body, ['meeting_type', 'date', 'title']);

  const agendaId = generateId('OTH');
  const isDirectApprove = body.state === 'APPROVED' && (session.role === 'ADMIN' || session.role === 'BISHOPRIC');
  const state = isDirectApprove ? 'APPROVED' : (body.state || 'DRAFT');

  const record = {
    other_agenda_id: agendaId,
    meeting_type: sanitizeString(body.meeting_type),
    meeting_type_other: sanitizeString(body.meeting_type_other || ''),
    title: sanitizeString(body.title),
    date: sanitizeString(body.date),
    start_time: sanitizeString(body.start_time || '7:00 AM'),
    end_time: sanitizeString(body.end_time || '8:00 AM'),
    venue: sanitizeString(body.venue || "Bishop's Office / Council Room"),
    presiding: sanitizeString(body.presiding || ''),
    presiding_role: sanitizeString(body.presiding_role || 'Bishop'),
    conducting: sanitizeString(body.conducting || ''),
    conducting_role: sanitizeString(body.conducting_role || '1st Counselor'),
    opening_hymn: sanitizeString(body.opening_hymn || ''),
    opening_prayer: sanitizeString(body.opening_prayer || ''),
    spiritual_thought_by: sanitizeString(body.spiritual_thought_by || ''),
    spiritual_thought_topic: sanitizeString(body.spiritual_thought_topic || ''),
    closing_remarks_by: sanitizeString(body.closing_remarks_by || ''),
    closing_prayer: sanitizeString(body.closing_prayer || ''),
    attendees: typeof body.attendees === 'string' ? body.attendees : JSON.stringify(body.attendees || []),
    topics: typeof body.topics === 'string' ? body.topics : JSON.stringify(body.topics || []),
    assignments: typeof body.assignments === 'string' ? body.assignments : JSON.stringify(body.assignments || []),
    general_notes: sanitizeString(body.general_notes || ''),
    state: state,
    created_by: session.user_id,
    created_by_name: session.name,
    created_date: new Date().toISOString(),
    approved_by: isDirectApprove ? session.user_id : '',
    approved_by_name: isDirectApprove ? session.name : '',
    approved_date: isDirectApprove ? new Date().toISOString() : '',
    email_sent_count: 0,
    updated_date: new Date().toISOString(),
  };

  dbInsert('OTHER_AGENDAS', record);
  auditLog(session.user_id, 'CREATE', 'OTHER_AGENDAS', agendaId, null, record, 'OK');

  let emailSummary = null;
  if (state === 'APPROVED') {
    emailSummary = sendOtherAgendaNotifications(record);
    if (emailSummary && emailSummary.sentCount > 0) {
      dbUpdate('OTHER_AGENDAS', 'other_agenda_id', agendaId, {
        email_sent_count: emailSummary.sentCount,
        updated_date: new Date().toISOString(),
      });
    }
  }

  return { ok: true, data: record, emailSummary: emailSummary };
}

function handleUpdateOtherAgenda(body) {
  const session = requirePermission(body.token, 'OTHER_AGENDA_EDIT');
  validateRequired(body, ['other_agenda_id']);

  const existing = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id);
  if (!existing) throw new Error('Agenda not found');

  const patch = {
    updated_date: new Date().toISOString(),
  };

  if (body.meeting_type !== undefined) patch.meeting_type = sanitizeString(body.meeting_type);
  if (body.meeting_type_other !== undefined) patch.meeting_type_other = sanitizeString(body.meeting_type_other);
  if (body.title !== undefined) patch.title = sanitizeString(body.title);
  if (body.date !== undefined) patch.date = sanitizeString(body.date);
  if (body.start_time !== undefined) patch.start_time = sanitizeString(body.start_time);
  if (body.end_time !== undefined) patch.end_time = sanitizeString(body.end_time);
  if (body.venue !== undefined) patch.venue = sanitizeString(body.venue);
  if (body.presiding !== undefined) patch.presiding = sanitizeString(body.presiding);
  if (body.presiding_role !== undefined) patch.presiding_role = sanitizeString(body.presiding_role);
  if (body.conducting !== undefined) patch.conducting = sanitizeString(body.conducting);
  if (body.conducting_role !== undefined) patch.conducting_role = sanitizeString(body.conducting_role);
  if (body.opening_hymn !== undefined) patch.opening_hymn = sanitizeString(body.opening_hymn);
  if (body.opening_prayer !== undefined) patch.opening_prayer = sanitizeString(body.opening_prayer);
  if (body.spiritual_thought_by !== undefined) patch.spiritual_thought_by = sanitizeString(body.spiritual_thought_by);
  if (body.spiritual_thought_topic !== undefined) patch.spiritual_thought_topic = sanitizeString(body.spiritual_thought_topic);
  if (body.closing_remarks_by !== undefined) patch.closing_remarks_by = sanitizeString(body.closing_remarks_by);
  if (body.closing_prayer !== undefined) patch.closing_prayer = sanitizeString(body.closing_prayer);
  if (body.attendees !== undefined) patch.attendees = typeof body.attendees === 'string' ? body.attendees : JSON.stringify(body.attendees);
  if (body.topics !== undefined) patch.topics = typeof body.topics === 'string' ? body.topics : JSON.stringify(body.topics);
  if (body.assignments !== undefined) patch.assignments = typeof body.assignments === 'string' ? body.assignments : JSON.stringify(body.assignments);
  if (body.general_notes !== undefined) patch.general_notes = sanitizeString(body.general_notes);
  if (body.state !== undefined) patch.state = sanitizeString(body.state);

  const updateResult = dbUpdate('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id, patch);
  const updatedAgenda = (updateResult && updateResult.updated) ? updateResult.updated : (updateResult || Object.assign({}, existing, patch));
  auditLog(session.user_id, 'UPDATE', 'OTHER_AGENDAS', body.other_agenda_id, existing, updatedAgenda, 'OK');

  let emailSummary = null;
  if (patch.state === 'APPROVED') {
    emailSummary = sendOtherAgendaNotifications(updatedAgenda);
    if (emailSummary && emailSummary.sentCount > 0) {
      dbUpdate('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id, {
        email_sent_count: (existing.email_sent_count || 0) + emailSummary.sentCount,
        updated_date: new Date().toISOString(),
      });
    }
  }

  return { ok: true, data: updatedAgenda, emailSummary: emailSummary };
}

function handleApproveOtherAgenda(body) {
  const session = requirePermission(body.token, 'OTHER_AGENDA_APPROVE');
  validateRequired(body, ['other_agenda_id']);

  const existing = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id);
  if (!existing) throw new Error('Agenda not found');

  // Hierarchical Approval Validation:
  // - Counselors cannot approve agendas created by themselves or by the Bishop.
  // - Counselors can only approve agendas created by Clerks or Secretaries.
  // - The Bishop (or Admin) can approve agendas created by counselors, clerks, secretaries, or directly self-approve.
  const creatorUser = dbFindOne('USERS', 'user_id', existing.created_by);
  const currentUser = dbFindOne('USERS', 'user_id', session.user_id);

  const isCurrentBishop = (session.role === 'ADMIN') ||
    (currentUser && currentUser.calling && /bishop/i.test(currentUser.calling)) ||
    (session.name && /bishop/i.test(session.name)) ||
    (!currentUser || !currentUser.calling || !/counselor/i.test(currentUser.calling));

  if (!isCurrentBishop) {
    // Current user is a Counselor
    if (existing.created_by === session.user_id) {
      throw new Error('Counselors cannot approve agendas created by themselves. The Bishop must approve.');
    }
    if ((creatorUser && creatorUser.calling && /bishop/i.test(creatorUser.calling)) ||
        (existing.created_by_name && /bishop/i.test(existing.created_by_name))) {
      throw new Error('Counselors cannot approve agendas created by the Bishop.');
    }
    if ((creatorUser && creatorUser.calling && /counselor/i.test(creatorUser.calling)) ||
        (existing.created_by_name && /counselor/i.test(existing.created_by_name))) {
      throw new Error('Agendas created by Bishopric counselors must be approved by the Bishop.');
    }
  }

  const patch = {
    state: 'APPROVED',
    approved_by: session.user_id,
    approved_by_name: session.name,
    approved_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  };

  const updateResult = dbUpdate('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id, patch);
  const updatedAgenda = (updateResult && updateResult.updated) ? updateResult.updated : (updateResult || Object.assign({}, existing, patch));

  // Send automated email notifications to all members with assignments / roles
  const emailSummary = sendOtherAgendaNotifications(updatedAgenda);
  if (emailSummary && emailSummary.sentCount > 0) {
    dbUpdate('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id, {
      email_sent_count: (existing.email_sent_count || 0) + emailSummary.sentCount,
      updated_date: new Date().toISOString(),
    });
  }

  // Notify the creator if different from approver
  if (existing.created_by && existing.created_by !== session.user_id) {
    createNotification(
      existing.created_by,
      'AGENDA_APPROVED',
      'Meeting Agenda Approved',
      `Your agenda for "${existing.title}" on ${existing.date} has been approved by ${session.name}. Automated notification emails have been dispatched.`,
      { other_agenda_id: body.other_agenda_id }
    );
  }

  auditLog(session.user_id, 'APPROVE', 'OTHER_AGENDAS', body.other_agenda_id, existing, updatedAgenda, 'OK');
  return { ok: true, data: updatedAgenda, emailSummary: emailSummary };
}

function handleSendOtherAgendaEmails(body) {
  const session = requirePermission(body.token, 'OTHER_AGENDA_APPROVE');
  validateRequired(body, ['other_agenda_id']);

  const existing = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id);
  if (!existing) throw new Error('Agenda not found');

  const customRecipients = Array.isArray(body.recipients) ? body.recipients : null;
  const emailSummary = sendOtherAgendaNotifications(existing, customRecipients);
  if (emailSummary && emailSummary.sentCount > 0) {
    dbUpdate('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id, {
      email_sent_count: (existing.email_sent_count || 0) + emailSummary.sentCount,
      updated_date: new Date().toISOString(),
    });
  }

  auditLog(session.user_id, 'SEND_EMAILS', 'OTHER_AGENDAS', body.other_agenda_id, null, { emailSummary }, 'OK');

  return { ok: true, emailSummary: emailSummary };
}

function handleDeleteOtherAgenda(body) {
  const session = requirePermission(body.token, 'OTHER_AGENDA_DELETE');
  validateRequired(body, ['other_agenda_id']);

  const existing = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id);
  if (!existing) throw new Error('Agenda not found');

  dbDelete('OTHER_AGENDAS', 'other_agenda_id', body.other_agenda_id);
  auditLog(session.user_id, 'DELETE', 'OTHER_AGENDAS', body.other_agenda_id, existing, null, 'OK');

  return { ok: true };
}

/**
 * Sends automated HTML notification emails to attendees and assignees for an approved Other Agenda.
 */
function sendOtherAgendaNotifications(agendaInput, customRecipients) {
  let agenda = agendaInput;
  if (!agenda) return { sentCount: 0, details: [] };
  if (agenda.updated && typeof agenda.updated === 'object') {
    agenda = agenda.updated;
  }
  if (typeof agenda === 'string') {
    agenda = dbFindOne('OTHER_AGENDAS', 'other_agenda_id', agenda) || {};
  }

  // Ensure fresh sheet data by invalidating cached members and users
  invalidateSheetCache('MEMBERS_LIST');
  invalidateSheetCache('USERS');

  const allMembers = dbReadAll('MEMBERS_LIST');
  const allUsers = dbReadAll('USERS');

  const normalize = (s) => {
    if (!s) return '';
    return String(s)
      .toLowerCase()
      .replace(/^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper to extract email regardless of column name casing or spaces (e.g. email, Email, EMAIL, Email Address, E-mail)
  const extractEmailFromObj = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    for (const key in obj) {
      if (key.trim().toLowerCase().includes('email')) {
        const val = String(obj[key] || '').trim();
        if (val.includes('@')) return val;
      }
    }
    return '';
  };

  const emailLookup = {};

  // Index members
  allMembers.forEach(m => {
    const rawEmail = extractEmailFromObj(m);
    if (rawEmail) {
      if (m.name) {
        emailLookup[String(m.name).trim().toLowerCase()] = rawEmail;
        const norm = normalize(m.name);
        if (norm) emailLookup[norm] = rawEmail;
      }
    }
  });

  // Index users (ward leadership accounts)
  allUsers.forEach(u => {
    const rawEmail = extractEmailFromObj(u);
    if (rawEmail) {
      if (u.name) {
        emailLookup[String(u.name).trim().toLowerCase()] = rawEmail;
        const norm = normalize(u.name);
        if (norm) emailLookup[norm] = rawEmail;
      }
      if (u.preferred_name) {
        emailLookup[String(u.preferred_name).trim().toLowerCase()] = rawEmail;
        const normP = normalize(u.preferred_name);
        if (normP) emailLookup[normP] = rawEmail;
      }
      if (u.username) {
        emailLookup[String(u.username).trim().toLowerCase()] = rawEmail;
      }
    }
  });

  const getEmailForName = (name) => {
    if (!name) return '';
    const exact = String(name).trim().toLowerCase();
    if (emailLookup[exact]) return emailLookup[exact];

    const norm = normalize(name);
    if (norm && emailLookup[norm]) return emailLookup[norm];

    // Substring matching
    const keys = Object.keys(emailLookup);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (norm.length > 3 && (k.includes(norm) || norm.includes(k))) {
        return emailLookup[k];
      }
    }
    return '';
  };

  let assignmentsList = [];
  try {
    if (typeof agenda.assignments === 'string') {
      assignmentsList = JSON.parse(agenda.assignments || '[]');
    } else if (Array.isArray(agenda.assignments)) {
      assignmentsList = agenda.assignments;
    }
  } catch (e) {
    assignmentsList = [];
  }

  let topicsList = [];
  try {
    if (typeof agenda.topics === 'string') {
      topicsList = JSON.parse(agenda.topics || '[]');
    } else if (Array.isArray(agenda.topics)) {
      topicsList = agenda.topics;
    }
  } catch (e) {
    topicsList = [];
  }

  const stripAllHonorifics = (rawName) => {
    if (!rawName || !String(rawName).trim()) return { baseName: '', detectedTitle: '' };
    let clean = String(rawName).trim();
    let highestTitle = '';
    const prefixRegex = /^(brother|sister|elder|bishop|president|patriarch|bro\.|bro|sis\.|sis|eld\.|eld|bp\.|bp|pres\.|pres)\s+/i;
    let match;
    while ((match = clean.match(prefixRegex))) {
      const p = match[1].toLowerCase();
      if (p.startsWith('bp') || p.startsWith('bishop')) highestTitle = 'Bishop';
      else if (p.startsWith('pres') && highestTitle !== 'Bishop') highestTitle = 'President';
      else if (p.startsWith('patr') && !['Bishop', 'President'].includes(highestTitle)) highestTitle = 'Patriarch';
      else if (p.startsWith('eld') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle)) highestTitle = 'Elder';
      else if (p.startsWith('sis') && !['Bishop', 'President', 'Patriarch'].includes(highestTitle)) highestTitle = 'Sister';
      else if (p.startsWith('bro') && !highestTitle) highestTitle = 'Brother';
      clean = clean.substring(match[0].length).trim();
    }
    return { baseName: clean, detectedTitle: highestTitle };
  };

  const getMemberRecordForName = (name) => {
    if (!name) return null;
    const { baseName } = stripAllHonorifics(name);
    const cleanBase = normalize(baseName);
    const cleanRaw = normalize(name);

    return allMembers.find(m => {
      const mName = normalize(m.name);
      const mId = normalize(m.members_id || m.member_id);
      if (mId && (cleanRaw.includes(mId) || cleanBase.includes(mId))) return true;
      if (mName === cleanBase || mName === cleanRaw) return true;
      if (mName.includes(',')) {
        const parts = mName.split(',').map(p => p.trim());
        if (parts.length === 2 && `${parts[1]} ${parts[0]}` === cleanBase) return true;
      }
      return false;
    }) || allUsers.find(u => {
      const uName = normalize(u.name);
      const uPref = normalize(u.preferred_name);
      const uId = normalize(u.members_id || u.member_id || u.user_id);
      if (uId && (cleanRaw.includes(uId) || cleanBase.includes(uId))) return true;
      return uName === cleanBase || uName === cleanRaw || uPref === cleanBase || uPref === cleanRaw;
    });
  };

  const formatHonorificName = (rawName, memberRecord, genderFallback) => {
    if (!rawName || !String(rawName).trim()) return '';
    const { baseName, detectedTitle } = stripAllHonorifics(rawName);
    if (!baseName) return '';

    let calling = '';
    let gender = genderFallback || '';
    let role = '';
    let priesthoodOffice = '';

    if (typeof memberRecord === 'string') {
      calling = memberRecord;
    } else if (memberRecord && typeof memberRecord === 'object') {
      calling = memberRecord.calling || '';
      if (!gender && memberRecord.gender) gender = memberRecord.gender;
      if (memberRecord.role) role = memberRecord.role;
      if (memberRecord.priesthood_office) priesthoodOffice = memberRecord.priesthood_office;
    }

    // Calling/Role Priority 1: Bishop (always Bishop, never Brother Bishop)
    if (detectedTitle === 'Bishop' || role === 'ADMIN' || /bishop/i.test(calling) || /bishop/i.test(priesthoodOffice)) {
      return 'Bishop ' + baseName;
    }
    // Calling/Role Priority 2: President
    if (detectedTitle === 'President' || /stake president|district president|branch president|mission president|temple president|area president/i.test(calling) || /stake presidency|district presidency|branch presidency/i.test(calling)) {
      return 'President ' + baseName;
    }
    // Priesthood Office: Patriarch
    if (detectedTitle === 'Patriarch' || /patriarch/i.test(calling) || /patriarch/i.test(priesthoodOffice)) {
      return 'Patriarch ' + baseName;
    }
    // Calling / Office: Elder
    if (detectedTitle === 'Elder' || /full[- ]time missionary|missionary/i.test(calling)) {
      return 'Elder ' + baseName;
    }
    // Gender / Auxiliary: Sister
    const gUpper = String(gender).toUpperCase();
    if (detectedTitle === 'Sister' || gUpper === 'F' || gUpper === 'FEMALE' || /relief society|young women|primary/i.test(calling)) {
      return 'Sister ' + baseName;
    }
    // Default to Brother
    return 'Brother ' + baseName;
  };

  const recipients = {}; // email -> { name, roles: [], assignments: [], isAttendee: boolean }

  if (Array.isArray(customRecipients) && customRecipients.length > 0) {
    customRecipients.forEach(r => {
      const rawEmail = r.email ? String(r.email).trim() : '';
      if (rawEmail && rawEmail.includes('@')) {
        const hName = r.name ? String(r.name).trim() : 'Leader';
        if (!recipients[rawEmail]) {
          recipients[rawEmail] = {
            name: hName,
            roles: Array.isArray(r.roles) ? r.roles : (r.role ? [String(r.role)] : (Array.isArray(r.assignments) ? r.assignments : [])),
            assignments: Array.isArray(r.assignmentsList) ? r.assignmentsList : [],
            isAttendee: Boolean(r.isAttendee)
          };
        } else {
          if (Array.isArray(r.roles)) {
            r.roles.forEach(rl => { if (!recipients[rawEmail].roles.includes(rl)) recipients[rawEmail].roles.push(rl); });
          }
          if (Array.isArray(r.assignmentsList)) {
            r.assignmentsList.forEach(asg => recipients[rawEmail].assignments.push(asg));
          }
        }
      }
    });
  } else {
    // 1. Presiding & Conducting Officers
    if (agenda.presiding) {
      const em = getEmailForName(agenda.presiding);
      if (em) {
        const rec = getMemberRecordForName(agenda.presiding);
        const hName = formatHonorificName(agenda.presiding, agenda.presiding_role || rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push(`Presiding Officer (${agenda.presiding_role || 'Presiding'})`);
      }
    }
    if (agenda.conducting) {
      const em = getEmailForName(agenda.conducting);
      if (em) {
        const rec = getMemberRecordForName(agenda.conducting);
        const hName = formatHonorificName(agenda.conducting, agenda.conducting_role || rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push(`Conducting Officer (${agenda.conducting_role || 'Conducting'})`);
      }
    }

    // 2. Check Opening Prayer
    if (agenda.opening_prayer) {
      const em = getEmailForName(agenda.opening_prayer);
      if (em) {
        const rec = getMemberRecordForName(agenda.opening_prayer);
        const hName = formatHonorificName(agenda.opening_prayer, rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push('Opening Prayer');
      }
    }

    // 3. Check Spiritual Thought
    if (agenda.spiritual_thought_by) {
      const em = getEmailForName(agenda.spiritual_thought_by);
      if (em) {
        const rec = getMemberRecordForName(agenda.spiritual_thought_by);
        const hName = formatHonorificName(agenda.spiritual_thought_by, rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push(`Spiritual Thought${agenda.spiritual_thought_topic ? ` (${agenda.spiritual_thought_topic})` : ''}`);
      }
    }

    // 4. Check Closing Remarks
    if (agenda.closing_remarks_by) {
      const em = getEmailForName(agenda.closing_remarks_by);
      if (em) {
        const rec = getMemberRecordForName(agenda.closing_remarks_by);
        const hName = formatHonorificName(agenda.closing_remarks_by, rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push('Closing Remarks');
      }
    }

    // 5. Check Closing Prayer
    if (agenda.closing_prayer) {
      const em = getEmailForName(agenda.closing_prayer);
      if (em) {
        const rec = getMemberRecordForName(agenda.closing_prayer);
        const hName = formatHonorificName(agenda.closing_prayer, rec);
        if (!recipients[em]) recipients[em] = { name: hName, roles: [], assignments: [] };
        recipients[em].roles.push('Closing Prayer');
      }
    }

    // 6. Check Action Items / Assignments
    assignmentsList.forEach(item => {
      const assigneeName = item.assignee || '';
      let email = (item.assignee_email || '').trim();
      if (!email && assigneeName) {
        email = getEmailForName(assigneeName);
      }

      if (email && email.includes('@')) {
        const rec = getMemberRecordForName(assigneeName);
        const hName = formatHonorificName(assigneeName, rec);
        if (!recipients[email]) {
          recipients[email] = { name: hName || 'Ward Leader', roles: [], assignments: [] };
        }
        recipients[email].assignments.push({
          task: item.task || 'Assigned Item',
          dueDate: item.due_date || 'Next Meeting',
          notes: item.notes || '',
        });
      }
    });

    // 7. Check Attendees & Leadership Roll (so all listed attendees receive a full copy of the agenda)
    let attendeesList = [];
    try {
      if (typeof agenda.attendees === 'string') {
        attendeesList = JSON.parse(agenda.attendees || '[]');
      } else if (Array.isArray(agenda.attendees)) {
        attendeesList = agenda.attendees;
      }
    } catch (e) {
      attendeesList = [];
    }

    attendeesList.forEach(att => {
      if (att.name && att.name.trim()) {
        const attName = att.name.trim();
        let email = (att.email || '').trim();
        if (!email) {
          email = getEmailForName(attName);
        }

        if (email && email.includes('@')) {
          const rec = getMemberRecordForName(attName);
          const hName = formatHonorificName(attName, att.calling || rec);
          if (!recipients[email]) {
            recipients[email] = { name: hName, roles: [], assignments: [], isAttendee: true };
          } else {
            recipients[email].isAttendee = true;
          }
        }
      }
    });
  }

  const meetingTypeLabels = {
    BISHOPRIC_MEETING: 'Bishopric Meeting',
    WARD_COUNCIL: 'Ward Council Meeting',
    WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
    PRESIDENCY_MEETING: 'Presidency Meeting',
    OTHER_MEETING: agenda.meeting_type_other || 'Ward Leadership Meeting',
  };

  const readableType = meetingTypeLabels[agenda.meeting_type] || agenda.title || 'Ward Meeting';
  const meetingTypeHeading = readableType.endsWith('Agenda') ? readableType : `${readableType} Agenda`;
  let sentCount = 0;
  const sentDetails = [];

  Object.entries(recipients).forEach(([email, data]) => {
    const subject = `[${meetingTypeHeading}] ${agenda.date}`;
    
    let rolesHtml = '';
    if (data.roles.length > 0) {
      rolesHtml = `
        <div style="margin-bottom: 16px; padding: 14px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px;">
          <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 14px;">Your Meeting Assignment(s):</h4>
          <ul style="margin: 0; padding-left: 20px; color: #14532d; font-size: 13px;">
            ${data.roles.map(r => `<li><strong>${r}</strong></li>`).join('')}
          </ul>
        </div>
      `;
    }

    let assignmentsHtml = '';
    if (data.assignments.length > 0) {
      assignmentsHtml = `
        <div style="margin-bottom: 16px; padding: 14px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Action Item(s) Assigned to You:</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #dbeafe; color: #1e3a8a; text-align: left;">
                <th style="padding: 6px 10px; border: 1px solid #bfdbfe;">Task / Assignment</th>
                <th style="padding: 6px 10px; border: 1px solid #bfdbfe; width: 120px;">Target Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.assignments.map(a => `
                <tr style="background-color: #ffffff;">
                  <td style="padding: 8px 10px; border: 1px solid #bfdbfe; color: #1e293b;">
                    <strong>${a.task}</strong>
                    ${a.notes ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${a.notes}</div>` : ''}
                  </td>
                  <td style="padding: 8px 10px; border: 1px solid #bfdbfe; color: #1e40af; font-weight: bold;">
                    ${a.dueDate}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    let topicsHtml = '';
    if (topicsList.length > 0) {
      topicsHtml = `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Agenda Discussion Topics:</h4>
          <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px;">
            ${topicsList.map(t => `
              <li style="margin-bottom: 6px;">
                <strong>${t.title || 'Discussion Item'}</strong> 
                ${t.presenter ? `<span style="color: #64748b;">(Lead: ${formatHonorificName(t.presenter)})</span>` : ''}
                ${t.minutes ? `<span style="color: #94a3b8; font-size: 11px;">— ${t.minutes} mins</span>` : ''}
                ${t.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${t.notes}</div>` : ''}
              </li>
            `).join('')}
          </ol>
        </div>
      `;
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          
          <div style="background-color: #1e3a8a; padding: 22px; text-align: center; color: #ffffff;">
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #93c5fd; margin-bottom: 6px;">
              The Church of Jesus Christ of Latter-day Saints
            </div>
            <div style="font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
              Ward: OBANTOKO WARD
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #ffffff;">
              Meeting type: ${meetingTypeHeading}
            </div>
          </div>

          <div style="padding: 24px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${data.name}</strong>,</p>
            <p style="font-size: 14px; color: #475569;">
              This is to provide you with the official meeting agenda and assignments for the upcoming <strong>${readableType}</strong>:
            </p>

            <table style="width: 100%; margin: 16px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; width: 120px; color: #64748b;">📅 Date:</td>
                <td style="padding: 8px 12px; color: #0f172a; font-weight: bold;">${agenda.date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">⏰ Time:</td>
                <td style="padding: 8px 12px; color: #0f172a;">${agenda.start_time} - ${agenda.end_time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">📍 Venue:</td>
                <td style="padding: 8px 12px; color: #0f172a;">${agenda.venue || "Bishop's Office / Council Room"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">👤 Presiding:</td>
                <td style="padding: 8px 12px; color: #0f172a;">${formatHonorificName(agenda.presiding, agenda.presiding_role) || 'Bishop'} (${agenda.presiding_role || 'Bishop'})</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #64748b;">🗣️ Conducting:</td>
                <td style="padding: 8px 12px; color: #0f172a;">${formatHonorificName(agenda.conducting, agenda.conducting_role) || 'Conducting Officer'} (${agenda.conducting_role || 'Counselor'})</td>
              </tr>
            </table>

            ${rolesHtml}
            ${assignmentsHtml}
            ${topicsHtml}

            ${agenda.general_notes ? `
              <div style="margin-top: 16px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                <h5 style="margin: 0 0 4px 0; color: #475569; font-size: 12px; text-transform: uppercase;">Special Notes:</h5>
                <p style="margin: 0; font-size: 13px; color: #334155;">${agenda.general_notes}</p>
              </div>
            ` : ''}

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">
              <p style="margin: 0 0 4px 0;">Approved by <strong>${formatHonorificName(agenda.approved_by_name) || 'Bishopric'}</strong> on ${agenda.approved_date ? agenda.approved_date.substring(0, 10) : 'Record'}.</p>
              <p style="margin: 0; font-size: 11px;">Thank you for your dedicated service and commitment to the Lord's work.</p>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    const plainText = `
${meetingTypeHeading}
Ward: OBANTOKO WARD
Date: ${agenda.date}
Time: ${agenda.start_time} - ${agenda.end_time}
Venue: ${agenda.venue}
Presiding: ${formatHonorificName(agenda.presiding, agenda.presiding_role)}
Conducting: ${formatHonorificName(agenda.conducting, agenda.conducting_role)}

Dear ${data.name},
Please review your assignments and meeting details for the upcoming ${readableType}.
Approved by ${formatHonorificName(agenda.approved_by_name) || 'Bishopric'}.
    `.trim();

    const success = sendEmail(email, subject, plainText, { html: htmlBody });
    if (success) {
      sentCount++;
      sentDetails.push({ email: email, name: data.name });
    }
  });

  return { sentCount: sentCount, details: sentDetails };
}

/**
 * One-Click Authorization & Email Permissions Test for Google Apps Script.
 * Select this function from the function dropdown in Apps Script and click "Run":
 * 1. Google will prompt: "Authorization required" -> Click "Review Permissions" -> Choose account -> "Advanced" -> "Go to SM Planner (unsafe)" -> "Allow".
 * 2. It will send a test email to your account and output status in the Apps Script Execution Log.
 */
function testEmailPermissions() {
  const activeUserEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  Logger.log('Active user email: ' + activeUserEmail);
  
  if (!activeUserEmail) {
    Logger.log('Could not automatically determine user email. Please check that you are running from the Apps Script editor.');
    return { ok: false, message: 'Email address not found' };
  }

  const subject = 'SM Planner — Email Service Authorization Test';
  const body = 'Hello!\n\nIf you received this message, Google Apps Script MailApp / GmailApp permissions are successfully authorized and ready to send meeting reminders and leadership agendas.';
  const html = '<div style="font-family: Arial, sans-serif; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
    '<h3 style="color: #1e3a8a; margin-top: 0;">SM Planner — Email Authorization Successful</h3>' +
    '<p style="color: #334155;">Google Apps Script email service is fully authorized and functional.</p>' +
    '<p style="font-size: 12px; color: #64748b;">Timestamp: ' + new Date().toISOString() + '</p>' +
    '</div>';

  try {
    MailApp.sendEmail({
      to: activeUserEmail,
      subject: subject,
      body: body,
      htmlBody: html,
      name: 'SM Planner'
    });
    Logger.log('SUCCESS: Email sent via MailApp to ' + activeUserEmail);
    return { ok: true, sentTo: activeUserEmail, method: 'MailApp' };
  } catch (e) {
    Logger.log('MailApp error: ' + e.message + ', trying GmailApp...');
    try {
      GmailApp.sendEmail(activeUserEmail, subject, body, { htmlBody: html, name: 'SM Planner' });
      Logger.log('SUCCESS: Email sent via GmailApp fallback to ' + activeUserEmail);
      return { ok: true, sentTo: activeUserEmail, method: 'GmailApp' };
    } catch (e2) {
      Logger.log('ERROR: Both MailApp and GmailApp failed: ' + e2.message);
      return { ok: false, error: e2.message };
    }
  }
}

/**
 * Diagnostic & Authorization Helper for Google Apps Script.
 * Select this function in the Apps Script editor and click "Run" to:
 * 1. Trigger Google's one-time OAuth email authorization prompt ("Review permissions" -> "Allow").
 * 2. Send a test meeting agenda email to the current logged-in Google account.
 */
function testSendOtherAgendaEmail() {
  const activeUserEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  Logger.log('Target test recipient email: ' + activeUserEmail);

  if (!activeUserEmail) {
    Logger.log('Could not determine active user email. Sending to default test address.');
  }

  const testAgenda = {
    title: 'Ward Leadership Test Agenda',
    meeting_type: 'WARD_COUNCIL',
    date: Utilities.formatDate(new Date(), getAppTimeZone(), 'yyyy-MM-dd'),
    start_time: '07:30',
    end_time: '08:30',
    venue: "Bishop's Office",
    presiding: 'Bishop',
    conducting: '1st Counselor',
    opening_prayer: 'Test Member',
    spiritual_thought_by: 'Test Leader',
    spiritual_thought_topic: 'Ministering with Love',
    closing_remarks_by: 'Bishop',
    closing_prayer: 'Test Member',
    general_notes: 'This is a test email sent from SM Planner Apps Script to verify email permissions and delivery.',
    topics: [
      { title: 'Welcome and Come, Follow Me Spiritual Foundation', presenter: 'Bishop', minutes: 10, notes: 'Introductory discussion' }
    ],
    assignments: [
      { task: 'Action item delivery test', assignee: 'Test Member', assignee_email: activeUserEmail, due_date: 'Next Sunday', notes: 'Verification test' }
    ]
  };

  const result = sendOtherAgendaNotifications(testAgenda);
  Logger.log('=== TEST RESULT ===');
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
