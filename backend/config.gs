/**
 * config.gs - Core Configuration & Response Helpers for PromptForge Google Apps Script Backend
 */

const CONFIG = {
  SHEET_NAMES: {
    PROMPTS: 'PROMPTS',
    CATEGORIES: 'CATEGORIES',
    TAGS: 'TAGS',
    SITE_SETTINGS: 'SITE_SETTINGS',
    PAGES: 'PAGES',
    NAVIGATION: 'NAVIGATION'
  },
  DEFAULT_ADMIN_PASSWORD: 'admin_password_change_me',
  TOKEN_EXPIRY_HOURS: 168 // 7 days
};

/**
 * Creates a CORS-enabled JSON output response
 */
function createJsonResponse(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Creates an XML output response (for sitemap.xml)
 */
function createXmlResponse(xmlContent) {
  const output = ContentService.createTextOutput(xmlContent);
  output.setMimeType(ContentService.MimeType.XML);
  return output;
}

/**
 * Gets or initializes the active Google Spreadsheet
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SPREADSHEET_ID');
  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {
      console.warn('Failed to open spreadsheet by ID, falling back to active sheet:', e);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Helper to get a sheet by tab name
 */
function getSheetByName(sheetName) {
  const ss = getSpreadsheet();
  if (!ss) throw new Error('Spreadsheet not found or not linked.');
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Worksheet "' + sheetName + '" not found. Please run setupSpreadsheet().');
  return sheet;
}

/**
 * Helper to map sheet rows into an array of objects based on header row
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // skip empty rows
    if (!row[0] && !row[1]) continue;
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    rows.push(item);
  }
  return rows;
}

