const fs = require('fs');
const path = require('path');

const initialData = JSON.parse(fs.readFileSync('data/initial-data.json', 'utf8'));

// Filter out old dummy prompts
const realPrompts = initialData.prompts.filter(p => p.id !== 'p_001' && !p.title.includes('ChatGPT SEO Blog Writer'));
const realCategories = initialData.categories || [];
const realTags = initialData.tags || [];

console.log(`Building Apps Script with ${realPrompts.length} prompts, ${realCategories.length} categories, ${realTags.length} tags...`);

const scriptContent = `/**
 * ============================================================================
 * PROMPTFORGE - ALL-IN-ONE GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 * Target Google Spreadsheet:
 * ID: 1Dmv91cfORgxl5mnWCJOPHEm8qQisMt8WMj8S35We5yY
 * URL: https://docs.google.com/spreadsheets/d/1Dmv91cfORgxl5mnWCJOPHEm8qQisMt8WMj8S35We5yY/edit
 *
 * HOW TO CONNECT IN 3 SIMPLE STEPS:
 * 1. Open your Apps Script editor (https://script.google.com/ or Sheet > Extensions > Apps Script).
 * 2. Select everything in Code.gs, DELETE IT, and PASTE THIS ENTIRE FILE. Click Save (Ctrl+S).
 * 3. In the toolbar at the top:
 *    a) Select function: "setupSpreadsheet" from the dropdown.
 *    b) Click "Run".
 *       - If Google prompts "Authorization Required", click "Review permissions".
 *       - Select your Google account (antriksh0109@gmail.com).
 *       - Click "Advanced" -> "Go to Untitled project (unsafe)" -> "Allow".
 *       - setupSpreadsheet will automatically create all 6 tabs and seed your 21 prompts!
 *    c) Click "Deploy" (blue button, top right) -> "New deployment".
 *       - Click the gear icon next to "Select type" -> choose "Web app".
 *       - Description: PromptForge Production API
 *       - Execute as: "Me" (antriksh0109@gmail.com)
 *       - Who has access: "Anyone"
 *       - Click "Deploy".
 *    d) Copy the "Web app URL" (ends in /exec).
 *    e) Paste it into your Admin Dashboard (http://localhost:3000/admin/) or js/config.js.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. GLOBAL CONFIGURATION & HEADERS
// ----------------------------------------------------------------------------
const DEFAULT_SPREADSHEET_ID = '1Dmv91cfORgxl5mnWCJOPHEm8qQisMt8WMj8S35We5yY';

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

const PROMPT_HEADERS = [
  'id', 'title', 'slug', 'short_description', 'full_description',
  'prompt_content', 'category', 'subcategory', 'tags', 'featured_image',
  'author', 'seo_title', 'seo_description', 'canonical_url', 'status',
  'featured', 'created_at', 'updated_at', 'views', 'copy_count'
];

const CATEGORY_HEADERS = [
  'id', 'category_name', 'slug', 'description', 'parent_category',
  'category_image', 'seo_title', 'seo_description', 'status', 'display_order'
];

const TAG_HEADERS = ['id', 'tag_name', 'slug', 'description', 'status'];

// ----------------------------------------------------------------------------
// 2. HTTP REQUEST ROUTER (GET & POST)
// ----------------------------------------------------------------------------
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = params.action || 'ping';

  try {
    switch (action) {
      case 'ping':
        return createJsonResponse({ status: 'ok', service: 'PromptForge API', timestamp: new Date().toISOString() });

      case 'sitemap':
        return createXmlResponse(generateSitemapXml());

      case 'getPublicData':
        return createJsonResponse({
          success: true,
          settings: getSiteSettings(),
          navigation: getNavigation(),
          categories: getAllCategories(false),
          tags: getAllTags(),
          prompts: getAllPrompts(false)
        });

      case 'getPrompts':
        return createJsonResponse({
          success: true,
          prompts: getAllPrompts(false)
        });

      case 'getPrompt':
        const slug = params.slug;
        const prompt = getPromptBySlug(slug);
        if (!prompt) {
          return createJsonResponse({ success: false, error: 'Prompt not found' }, 404);
        }
        return createJsonResponse({ success: true, prompt: prompt });

      case 'getCategories':
        return createJsonResponse({
          success: true,
          categories: getAllCategories(false)
        });

      case 'getSettings':
        return createJsonResponse({
          success: true,
          settings: getSiteSettings(),
          navigation: getNavigation()
        });

      case 'getAdminData':
        requireAuth(params.token);
        return createJsonResponse({
          success: true,
          overview: getAdminOverview(),
          prompts: getAllPrompts(true),
          categories: getAllCategories(true),
          tags: getAllTags(),
          settings: getSiteSettings()
        });

      default:
        return createJsonResponse({ success: false, error: 'Unknown GET action: ' + action }, 400);
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.message }, 500);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e && e.parameter && e.parameter.action);
    const token = body.token || (e && e.parameter && e.parameter.token);

    switch (action) {
      case 'login':
        return createJsonResponse(handleAdminLogin(body.password));

      case 'verifyToken':
        return createJsonResponse({
          success: verifyAdminToken(token),
          valid: verifyAdminToken(token)
        });

      case 'changePassword':
        return createJsonResponse(changeAdminPassword(body.old_password, body.new_password, token));

      // Protected Admin CRUD Endpoints
      case 'savePrompt':
        requireAuth(token);
        return createJsonResponse(savePrompt(body.data || {}));

      case 'deletePrompt':
        requireAuth(token);
        return createJsonResponse(deletePrompt(body.id));

      case 'saveCategory':
        requireAuth(token);
        return createJsonResponse(saveCategory(body.data || {}));

      case 'deleteCategory':
        requireAuth(token);
        return createJsonResponse(deleteCategory(body.id));

      case 'updateSettings':
        requireAuth(token);
        return createJsonResponse(updateAllSiteSettings(body.settings || {}));

      case 'batchImportPrompts':
        requireAuth(token);
        const importResults = [];
        const items = body.prompts || [];
        for (let i = 0; i < items.length; i++) {
          try {
            const res = savePrompt(items[i]);
            importResults.push({ index: i, success: true, prompt: res.prompt });
          } catch (err) {
            importResults.push({ index: i, success: false, error: err.message });
          }
        }
        return createJsonResponse({ success: true, count: importResults.length, results: importResults });

      // Public metric tracking (Views, Copies)
      case 'trackView':
        return createJsonResponse(incrementPromptMetric(body.id, 'views'));

      case 'trackCopy':
        return createJsonResponse(incrementPromptMetric(body.id, 'copy_count'));

      default:
        return createJsonResponse({ success: false, error: 'Unknown POST action: ' + action }, 400);
    }
  } catch (err) {
    return createJsonResponse({ success: false, error: err.message }, 500);
  }
}

// ----------------------------------------------------------------------------
// 3. RESPONSE HELPERS
// ----------------------------------------------------------------------------
function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function createXmlResponse(xmlContent) {
  return ContentService.createTextOutput(xmlContent)
    .setMimeType(ContentService.MimeType.XML);
}

// ----------------------------------------------------------------------------
// 4. SPREADSHEET ACCESS & DATA HELPERS
// ----------------------------------------------------------------------------
function getSpreadsheet() {
  // 1. Try active spreadsheet first (when running bound inside Google Sheet)
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 2. Try DEFAULT_SPREADSHEET_ID
  if (typeof DEFAULT_SPREADSHEET_ID !== 'undefined' && DEFAULT_SPREADSHEET_ID && DEFAULT_SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE') {
    try {
      return SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
    } catch (e) {
      console.warn('Could not open default spreadsheet ID:', e);
    }
  }

  // 3. Try Script Properties
  try {
    const props = PropertiesService.getScriptProperties();
    const sheetId = props.getProperty('SPREADSHEET_ID');
    if (sheetId) {
      return SpreadsheetApp.openById(sheetId);
    }
  } catch (e) {}

  return null;
}

function getSheetByName(sheetName) {
  const ss = getSpreadsheet();
  if (!ss) throw new Error('Spreadsheet not linked. Set DEFAULT_SPREADSHEET_ID or run from your Google Sheet (Extensions > Apps Script).');
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Worksheet "' + sheetName + '" not found. Please run setupSpreadsheet().');
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1);

  return rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 };
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      if (header === 'featured') {
        val = (val === true || String(val).toLowerCase() === 'true');
      } else if (header === 'views' || header === 'copy_count' || header === 'display_order') {
        val = Number(val) || 0;
      }
      obj[header] = val;
    });
    return obj;
  });
}

// ----------------------------------------------------------------------------
// 5. AUTHENTICATION & SECURITY (SHA-256 & TOKENS)
// ----------------------------------------------------------------------------
function hashString(str) {
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    str,
    Utilities.Charset.UTF_8
  );
  let txtHash = '';
  for (let i = 0; i < rawHash.length; i++) {
    let hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    let byteHex = hashVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

function getAdminPasswordHash() {
  const props = PropertiesService.getScriptProperties();
  let hash = props.getProperty('ADMIN_PASSWORD_HASH');
  if (!hash) {
    hash = hashString(CONFIG.DEFAULT_ADMIN_PASSWORD);
    props.setProperty('ADMIN_PASSWORD_HASH', hash);
  }
  return hash;
}

function getJwtSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + '-' + Utilities.getUuid();
    props.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

function generateAdminToken() {
  const expiry = new Date().getTime() + (CONFIG.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const payload = 'admin:' + expiry;
  const signature = hashString(payload + ':' + getJwtSecret());
  return Utilities.base64Encode(payload + ':' + signature);
}

function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return false;

    const role = parts[0];
    const expiry = Number(parts[1]);
    const receivedSig = parts[2];

    if (role !== 'admin') return false;
    if (new Date().getTime() > expiry) return false;

    const expectedSig = hashString('admin:' + expiry + ':' + getJwtSecret());
    return receivedSig === expectedSig;
  } catch (e) {
    return false;
  }
}

function requireAuth(token) {
  if (!verifyAdminToken(token)) {
    throw new Error('Unauthorized: Invalid or expired session token.');
  }
}

function handleAdminLogin(password) {
  if (!password) {
    return { success: false, error: 'Password required' };
  }
  const inputHash = hashString(password);
  const correctHash = getAdminPasswordHash();

  if (inputHash === correctHash) {
    return {
      success: true,
      token: generateAdminToken(),
      message: 'Authentication successful'
    };
  }
  return { success: false, error: 'Invalid password' };
}

function changeAdminPassword(oldPassword, newPassword, token) {
  requireAuth(token);
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }
  const oldHash = hashString(oldPassword);
  if (oldHash !== getAdminPasswordHash()) {
    return { success: false, error: 'Current password incorrect.' };
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD_HASH', hashString(newPassword));
  return {
    success: true,
    token: generateAdminToken(),
    message: 'Password changed successfully.'
  };
}

// ----------------------------------------------------------------------------
// 6. PROMPT CRUD OPERATIONS
// ----------------------------------------------------------------------------
function getAllPrompts(includeDrafts) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const prompts = sheetToObjects(sheet);
  if (includeDrafts) return prompts;
  return prompts.filter(p => String(p.status).toLowerCase() === 'published');
}

function getPromptBySlug(slug) {
  if (!slug) return null;
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const prompts = sheetToObjects(sheet);
  return prompts.find(p => p.slug === slug && String(p.status).toLowerCase() === 'published') || null;
}

function savePrompt(data) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

  let promptId = data.id;
  const isNew = !promptId;

  if (isNew) {
    promptId = 'p_' + Utilities.getUuid().substring(0, 8);
  }

  const title = data.title || 'Untitled Prompt';
  let slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(title);
  slug = ensureUniqueSlug(sheet, slug, promptId, headers);

  const now = new Date().toISOString();
  const promptRecord = {
    id: promptId,
    title: title,
    slug: slug,
    short_description: data.short_description || '',
    full_description: data.full_description || '',
    prompt_content: data.prompt_content || '',
    category: data.category || 'General',
    subcategory: data.subcategory || '',
    tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
    featured_image: data.featured_image || '',
    author: data.author || 'PromptForge Editor',
    seo_title: data.seo_title || (title + ' | PromptForge'),
    seo_description: data.seo_description || data.short_description || '',
    canonical_url: data.canonical_url || ('/prompt/' + slug + '/'),
    status: data.status || 'published',
    featured: (data.featured === true || String(data.featured).toLowerCase() === 'true'),
    created_at: isNew ? now : (data.created_at || now),
    updated_at: now,
    views: Number(data.views) || 0,
    copy_count: Number(data.copy_count) || 0
  };

  const rowValues = headers.map(header => promptRecord[header] !== undefined ? promptRecord[header] : '');

  if (isNew) {
    sheet.appendRow(rowValues);
  } else {
    const dataRange = sheet.getDataRange().getValues();
    const idCol = headers.indexOf('id');
    let targetRow = -1;
    for (let i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idCol]) === String(promptId)) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) {
      sheet.appendRow(rowValues);
    } else {
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
    }
  }

  return { success: true, prompt: promptRecord, isNew: isNew };
}

function deletePrompt(id) {
  if (!id) return { success: false, error: 'ID is required' };
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Prompt deleted' };
    }
  }
  return { success: false, error: 'Prompt not found' };
}

function incrementPromptMetric(id, metricType) {
  if (!id || (metricType !== 'views' && metricType !== 'copy_count')) {
    return { success: false, error: 'Invalid parameters' };
  }
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('id');
  const metricCol = headers.indexOf(metricType);

  if (idCol === -1 || metricCol === -1) return { success: false, error: 'Column not found' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      const currentVal = Number(data[i][metricCol]) || 0;
      sheet.getRange(i + 1, metricCol + 1).setValue(currentVal + 1);
      return { success: true, newCount: currentVal + 1 };
    }
  }
  return { success: false, error: 'Prompt not found' };
}

function sanitizeSlug(text) {
  return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function ensureUniqueSlug(sheet, baseSlug, currentId, headers) {
  const data = sheet.getDataRange().getValues();
  const idCol = headers.indexOf('id');
  const slugCol = headers.indexOf('slug');

  const existingSlugs = new Set();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) !== String(currentId)) {
      existingSlugs.add(String(data[i][slugCol]));
    }
  }

  let finalSlug = baseSlug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) {
    finalSlug = baseSlug + '-' + counter;
    counter++;
  }
  return finalSlug;
}

// ----------------------------------------------------------------------------
// 7. CATEGORY CRUD & SITE SETTINGS
// ----------------------------------------------------------------------------
function getAllCategories(includeDrafts) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const cats = sheetToObjects(sheet);
  const filtered = includeDrafts ? cats : cats.filter(c => String(c.status).toLowerCase() === 'published');
  return filtered.sort((a, b) => (Number(a.display_order) || 99) - (Number(b.display_order) || 99));
}

function saveCategory(data) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

  let catId = data.id;
  const isNew = !catId;
  if (isNew) catId = 'cat_' + Utilities.getUuid().substring(0, 8);

  const name = data.category_name || 'New Category';
  const slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(name);

  const catRecord = {
    id: catId,
    category_name: name,
    slug: slug,
    description: data.description || '',
    parent_category: data.parent_category || '',
    category_image: data.category_image || '',
    seo_title: data.seo_title || (name + ' Prompts | PromptForge'),
    seo_description: data.seo_description || data.description || '',
    status: data.status || 'published',
    display_order: Number(data.display_order) || 10
  };

  const rowValues = headers.map(h => catRecord[h] !== undefined ? catRecord[h] : '');

  if (isNew) {
    sheet.appendRow(rowValues);
  } else {
    const dataRange = sheet.getDataRange().getValues();
    const idCol = headers.indexOf('id');
    let targetRow = -1;
    for (let i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][idCol]) === String(catId)) {
        targetRow = i + 1;
        break;
      }
    }
    if (targetRow === -1) sheet.appendRow(rowValues);
    else sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  }

  return { success: true, category: catRecord };
}

function deleteCategory(id) {
  if (!id) return { success: false, error: 'ID is required' };
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Category deleted' };
    }
  }
  return { success: false, error: 'Category not found' };
}

function getAllTags() {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.TAGS);
  return sheetToObjects(sheet);
}

function getSiteSettings() {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = data[i][1];
    if (key) settings[key] = val;
  }
  return settings;
}

function updateSiteSetting(key, value) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true };
    }
  }
  sheet.appendRow([key, value]);
  return { success: true };
}

function updateAllSiteSettings(settingsObj) {
  Object.keys(settingsObj).forEach(k => updateSiteSetting(k, settingsObj[k]));
  return { success: true, settings: getSiteSettings() };
}

function getAllPages(includeDrafts) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PAGES);
  const pages = sheetToObjects(sheet);
  if (includeDrafts) return pages;
  return pages.filter(p => String(p.status).toLowerCase() === 'published');
}

function getNavigation() {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.NAVIGATION);
  const nav = sheetToObjects(sheet);
  return nav.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

function getAdminOverview() {
  const prompts = getAllPrompts(true);
  const published = prompts.filter(p => String(p.status).toLowerCase() === 'published');
  const drafts = prompts.filter(p => String(p.status).toLowerCase() === 'draft');
  const totalViews = prompts.reduce((sum, p) => sum + (Number(p.views) || 0), 0);
  const totalCopies = prompts.reduce((sum, p) => sum + (Number(p.copy_count) || 0), 0);

  return {
    totalPrompts: prompts.length,
    publishedPrompts: published.length,
    draftPrompts: drafts.length,
    totalViews: totalViews,
    totalCopies: totalCopies,
    categoriesCount: getAllCategories(true).length,
    tagsCount: getAllTags().length
  };
}

// ----------------------------------------------------------------------------
// 8. SITEMAP XML GENERATOR
// ----------------------------------------------------------------------------
function generateSitemapXml() {
  const settings = getSiteSettings();
  const baseUrl = settings.site_url || 'https://promptforge.dev';
  const prompts = getAllPrompts(false);
  const categories = getAllCategories(false);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n';

  xml += '  <url><loc>' + baseUrl + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\\n';
  xml += '  <url><loc>' + baseUrl + '/categories.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\\n';
  xml += '  <url><loc>' + baseUrl + '/prompts.html</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\\n';

  categories.forEach(c => {
    xml += '  <url><loc>' + baseUrl + '/category/' + c.slug + '/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\\n';
  });

  prompts.forEach(p => {
    const lastmod = p.updated_at ? p.updated_at.split('T')[0] : new Date().toISOString().split('T')[0];
    xml += '  <url><loc>' + baseUrl + '/prompt/' + p.slug + '/</loc><lastmod>' + lastmod + '</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\\n';
  });

  xml += '</urlset>';
  return xml;
}

// ----------------------------------------------------------------------------
// 9. ONE-CLICK DATABASE INITIALIZATION BOOTSTRAPPER
// Run setupSpreadsheet() ONCE inside Google Apps Script to auto-create all tabs & seed real data!
// ----------------------------------------------------------------------------
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet not linked. Make sure DEFAULT_SPREADSHEET_ID is set or run from Extensions > Apps Script.');
  }

  Logger.log('Bootstrapping PromptForge Google Spreadsheet Database: ' + ss.getName() + ' (' + ss.getId() + ')');

  // 1. PROMPTS Tab (Seed User Prompts)
  let pSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  if (!pSheet) pSheet = ss.insertSheet(CONFIG.SHEET_NAMES.PROMPTS);
  pSheet.clear();
  pSheet.appendRow(PROMPT_HEADERS);
  formatHeaderRow(pSheet, PROMPT_HEADERS.length);

  const realPromptsData = ${JSON.stringify(realPrompts.map(p => [
    p.id,
    p.title || '',
    p.slug || '',
    p.short_description || '',
    p.full_description || '',
    p.prompt_content || '',
    p.category || 'AI Photo',
    p.subcategory || '',
    Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    p.featured_image || '',
    p.author || 'PromptForge Editor',
    p.seo_title || (p.title + ' | PromptForge'),
    p.seo_description || p.short_description || '',
    p.canonical_url || ('/prompt/' + p.slug + '/'),
    p.status || 'published',
    (p.featured === true || String(p.featured).toLowerCase() === 'true'),
    p.created_at || new Date().toISOString(),
    p.updated_at || new Date().toISOString(),
    Number(p.views) || 0,
    Number(p.copy_count) || 0
  ]))};

  realPromptsData.forEach(row => pSheet.appendRow(row));

  // 2. CATEGORIES Tab (Seed 44 User Categories)
  let cSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  if (!cSheet) cSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CATEGORIES);
  cSheet.clear();
  cSheet.appendRow(CATEGORY_HEADERS);
  formatHeaderRow(cSheet, CATEGORY_HEADERS.length);

  const realCategoriesData = ${JSON.stringify(realCategories.map(c => [
    c.id,
    c.category_name,
    c.slug,
    c.description || ('Curated ' + c.category_name + ' prompts.'),
    c.parent_category || '',
    c.category_image || '',
    c.seo_title || (c.category_name + ' Prompts | PromptForge'),
    c.seo_description || c.description || '',
    c.status || 'published',
    Number(c.display_order) || 10
  ]))};

  realCategoriesData.forEach(c => cSheet.appendRow(c));

  // 3. TAGS Tab (Seed 56 User Tags)
  let tSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TAGS);
  if (!tSheet) tSheet = ss.insertSheet(CONFIG.SHEET_NAMES.TAGS);
  tSheet.clear();
  tSheet.appendRow(TAG_HEADERS);
  formatHeaderRow(tSheet, TAG_HEADERS.length);

  const realTagsData = ${JSON.stringify(realTags.map(t => [
    t.id,
    t.tag_name,
    t.slug,
    t.description || '',
    t.status || 'active'
  ]))};

  realTagsData.forEach(t => tSheet.appendRow(t));

  // 4. SITE_SETTINGS Tab
  let sSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  if (!sSheet) sSheet = ss.insertSheet(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  sSheet.clear();
  sSheet.appendRow(['setting_key', 'setting_value']);
  formatHeaderRow(sSheet, 2);
  [
    ['site_name', 'PromptForge'],
    ['site_tagline', 'AI Photo Editing Prompts | Gemini & ChatGPT'],
    ['site_description', 'Copy, paste, and generate stunning AI images in seconds with curated Gemini, ChatGPT, and Midjourney photo editing prompts.'],
    ['site_url', 'https://promptforge.dev'],
    ['contact_email', 'hello@promptforge.dev'],
    ['default_category', 'AI Photo Editing'],
    ['prompts_per_page', '12'],
    ['enable_copy_tracking', 'true'],
    ['enable_views_tracking', 'true']
  ].forEach(s => sSheet.appendRow(s));

  // 5. PAGES Tab
  let pgSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAGES);
  if (!pgSheet) pgSheet = ss.insertSheet(CONFIG.SHEET_NAMES.PAGES);
  pgSheet.clear();
  pgSheet.appendRow(['id', 'title', 'slug', 'content', 'seo_title', 'seo_description', 'status']);
  formatHeaderRow(pgSheet, 7);
  [
    ['page_01', 'About Us', 'about', 'PromptForge is the premier open-source library for high-fidelity AI photo editing prompts.', 'About PromptForge', 'About the PromptForge AI Prompt platform.', 'published'],
    ['page_02', 'Contact', 'contact', 'Get in touch with the PromptForge editorial and curation team.', 'Contact Us | PromptForge', 'Contact the PromptForge support team.', 'published'],
    ['page_03', 'Privacy Policy', 'privacy', 'Privacy Policy for PromptForge users.', 'Privacy Policy | PromptForge', 'Read our privacy policy.', 'published'],
    ['page_04', 'Terms of Service', 'terms', 'Terms and conditions governing the use of PromptForge prompts.', 'Terms of Service | PromptForge', 'Read our terms of service.', 'published']
  ].forEach(pg => pgSheet.appendRow(pg));

  // 6. NAVIGATION Tab
  let nSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.NAVIGATION);
  if (!nSheet) nSheet = ss.insertSheet(CONFIG.SHEET_NAMES.NAVIGATION);
  nSheet.clear();
  nSheet.appendRow(['id', 'label', 'url', 'sort_order', 'is_visible']);
  formatHeaderRow(nSheet, 5);
  [
    ['nav_01', 'Home', '/', 1, true],
    ['nav_02', 'Categories', '/categories.html', 2, true],
    ['nav_03', 'All Prompts', '/prompts.html', 3, true],
    ['nav_04', 'About', '/about.html', 4, true],
    ['nav_05', 'Contact', '/contact.html', 5, true]
  ].forEach(n => nSheet.appendRow(n));

  // Remove default empty Sheet1 if other tabs exist
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }

  Logger.log('PromptForge database bootstrap complete! All 6 tabs created with ' + realPromptsData.length + ' prompts, ' + realCategoriesData.length + ' categories, and ' + realTagsData.length + ' tags.');
  return 'SUCCESS: PromptForge database initialized successfully! Seeded ' + realPromptsData.length + ' prompts and ' + realCategoriesData.length + ' categories.';
}

function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setBackground('#0D1429'); // Deep navy matching theme
  headerRange.setFontColor('#F5F6FC');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setHorizontalAlignment('left');
  sheet.setFrozenRows(1);
}
`;

fs.writeFileSync('backend/Code.gs', scriptContent, 'utf8');
fs.writeFileSync('backend/Single_Apps_Script_All_In_One.js', scriptContent, 'utf8');

console.log('Successfully written backend/Code.gs and backend/Single_Apps_Script_All_In_One.js!');

