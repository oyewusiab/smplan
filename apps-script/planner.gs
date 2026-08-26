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
    const handler = this[handlerName];
    if (typeof handler !== 'function') {
      return errorResponse('Unrecognized ' + (isPost ? 'POST' : 'GET') + ' action or payload format.', 'UNKNOWN_ACTION');
    }

    return ContentService
      .createTextOutput(JSON.stringify(handler(params)))
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