/**
 * SM Planner - Web App entrypoints and action routing.
 */

function doGet(e) {
  return dispatchRequest(e, false);
}

function doPost(e) {
  return dispatchRequest(e, true);
}

function dispatchRequest(e, isPost) {
  try {
    const params = isPost ? parseBody(e) : (e && e.parameter ? e.parameter : {});
    const action = sanitizeString(params.action).toUpperCase();
    if (!action) return errorResponse('Missing action', 'INVALID_REQUEST');

    const handlerName = actionToHandlerName(action);
    let handler = null;
    if (typeof globalThis !== 'undefined' && typeof globalThis[handlerName] === 'function') {
      handler = globalThis[handlerName];
    } else if (typeof this !== 'undefined' && typeof this[handlerName] === 'function') {
      handler = this[handlerName];
    }
    
    if (!handler) {
      try {
        const fn = eval(handlerName);
        if (typeof fn === 'function') handler = fn;
      } catch (evalErr) {}
    }

    if (typeof handler !== 'function') {
      return errorResponse('Unrecognized ' + (isPost ? 'POST' : 'GET') + ' action: ' + action + ' (looked for ' + handlerName + ')', 'UNKNOWN_ACTION');
    }

    const result = handler(params);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('Request failed: ' + (err && err.stack ? err.stack : err));
    return errorResponse(err && err.message ? err.message : 'Request failed', 'REQUEST_ERROR');
  }
}

function actionToHandlerName(action) {
  return 'handle' + action.split('_').map(function(part) {
    return part.charAt(0) + part.slice(1).toLowerCase();
  }).join('');
}