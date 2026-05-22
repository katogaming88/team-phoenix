// Shared config
var BOT_BASE_URL = 'https://team-phoenix-qx42.onrender.com';
var WEBHOOK_SECRET = 'teamPhoenixPPCBot';

// -------------------------------------------------------
// Web App entry point (used by the /resend Discord command)
// Deploy this script as a Web App to enable /resend
// -------------------------------------------------------
function doGet(e) {
  var secret = (e.parameter && e.parameter.secret) || '';
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var n = Math.min(parseInt(e.parameter.n) || 1, 20);
  sendLastNMplusSubmissions(n);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sent: n }))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------
// M+ Exclusion Form
// Attach this trigger to your M+ Exclusion Google Form
// -------------------------------------------------------
function onMplusFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var data = {};

  for (var i = 0; i < responses.length; i++) {
    var item = responses[i];
    data[item.getItem().getTitle()] = item.getResponse();
  }

  Logger.log('M+ form fields: ' + Object.keys(data).join(', '));

  var characterName = data['Character Name'] || '';
  var mplusLink = data['M+ Droptimizer/QE Report link'] || '';

  var raidLink = '';
  for (var key in data) {
    if (
      (key.indexOf('Raid') !== -1 || key.indexOf('Droptimizer') !== -1) &&
      key !== 'M+ Droptimizer/QE Report link'
    ) {
      raidLink = data[key] || '';
      break;
    }
  }

  var notes = data['Optional Notes'] || '';
  var submittedAt = new Date().toISOString();

  var payload = JSON.stringify({
    characterName: characterName,
    mplusLink: mplusLink,
    raidLink: raidLink,
    notes: notes,
    submittedAt: submittedAt
  });

  sendToBot('/mplus', payload);
}

// Re-send the last N M+ submissions
function sendLastNMplusSubmissions(n) {
  n = n || 2;
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var start = Math.max(0, responses.length - n);

  for (var i = start; i < responses.length; i++) {
    onMplusFormSubmit({ response: responses[i] });
    if (i < responses.length - 1) {
      Utilities.sleep(2000);
    }
  }
}

// -------------------------------------------------------
// Roster Application Form
// Attach this trigger to your Roster Google Form
// -------------------------------------------------------
function onRosterFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var data = {};

  for (var i = 0; i < responses.length; i++) {
    var item = responses[i];
    data[item.getItem().getTitle()] = item.getResponse();
  }

  Logger.log('Roster form fields: ' + Object.keys(data).join(', '));

  var characterName = data['Character Name'] || '';
  var classSpec = data['Class / Spec'] || '';
  var notes = data['Notes'] || data['Optional Notes'] || '';
  var submittedAt = new Date().toISOString();

  var payload = JSON.stringify({
    characterName: characterName,
    classSpec: classSpec,
    notes: notes,
    submittedAt: submittedAt
  });

  sendToBot('/roster', payload);
}

// Re-send the last N roster submissions (for testing)
function sendLastNRosterSubmissions() {
  var N = 2;
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var start = Math.max(0, responses.length - N);

  for (var i = start; i < responses.length; i++) {
    onRosterFormSubmit({ response: responses[i] });
    if (i < responses.length - 1) {
      Utilities.sleep(2000);
    }
  }
}

// -------------------------------------------------------
// Shared helper
// -------------------------------------------------------
function sendToBot(path, payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: payload,
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(BOT_BASE_URL + path, options);

  if (response.getResponseCode() === 200) {
    Logger.log('Success: posted to ' + path);
  } else {
    Logger.log('Error on ' + path + ': ' + response.getResponseCode() + ' - ' + response.getContentText());
  }
}
