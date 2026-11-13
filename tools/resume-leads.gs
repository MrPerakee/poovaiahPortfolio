/**
 * Résumé requests → Google Sheet (+ optional email alert)
 * Paste into: your Google Sheet → Extensions → Apps Script. Then Deploy → New deployment → Web app
 * (Execute as: Me · Who has access: Anyone). Copy the Web app URL into Cloudflare as SHEET_WEBHOOK.
 */
const SHEET_NAME = 'Resume requests';
const NOTIFY_EMAIL = '';   // put your email here to get an alert for every request, or leave '' for none

const HEADERS = ['Time (IST)', 'Name', 'Email', 'Company / role', 'Why they want it', 'Résumé',
                 'Country', 'City', 'Page', 'Came from', 'Device'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const when = Utilities.formatDate(new Date(d.time || Date.now()), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');
  sh.appendRow([when, d.name, d.email, d.company, d.reason, d.resume, d.country, d.city, d.page, d.referrer, d.device]);

  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, 'Résumé downloaded — ' + d.name,
      d.name + ' <' + d.email + '>\n' + (d.company || '') + '\n\n' + (d.reason || '') +
      '\n\nFrom: ' + [d.city, d.country].filter(String).join(', ') + ' · ' + d.device);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor (▶ Run → testSetup) to create the tab and approve permissions. */
function testSetup() {
  doPost({ postData: { contents: JSON.stringify({ time: new Date().toISOString(), name: 'Test entry', email: 'test@example.com',
    company: 'Setup check', reason: 'Delete this row', resume: 'classic', country: 'IN', city: '', page: '/', referrer: '', device: 'Desktop' }) } });
}
