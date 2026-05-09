const SHEET_NAME = 'Enquiries';

const HEADERS = [
  'submittedAt',
  'fullName',
  'email',
  'phone',
  'company',
  'city',
  'projectType',
  'interest',
  'quantity',
  'timeline',
  'budget',
  'message',
  'sourcePage',
  'pageUrl',
];

function doPost(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  sheet.appendRow(HEADERS.map((key) => payload[key] || ''));

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, sheet: SHEET_NAME }))
    .setMimeType(ContentService.MimeType.JSON);
}
