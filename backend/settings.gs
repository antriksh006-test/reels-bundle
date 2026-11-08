/**
 * settings.gs - Site Settings, Pages, Navigation, and Admin Overview
 */

/**
 * Returns site settings as a key-value object
 */
function getSiteSettings() {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = data[i][1];
    if (key) {
      settings[key] = val;
    }
  }
  return settings;
}

/**
 * Updates a single site setting
 */
function updateSiteSetting(key, value) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  // Not found, append
  sheet.appendRow([key, value]);
}

/**
 * Updates multiple site settings
 */
function updateAllSiteSettings(settingsObj) {
  if (!settingsObj || typeof settingsObj !== 'object') {
    throw new Error('Invalid settings object');
  }
  Object.keys(settingsObj).forEach(key => {
    updateSiteSetting(key, settingsObj[key]);
  });
  return { success: true, message: 'Settings saved successfully' };
}

/**
 * Returns static pages
 */
function getAllPages(includeDrafts) {
  try {
    const sheet = getSheetByName(CONFIG.SHEET_NAMES.PAGES);
    const rows = sheetToObjects(sheet);
    if (includeDrafts) return rows;
    return rows.filter(p => String(p.status).toLowerCase() === 'published');
  } catch (e) {
    return [];
  }
}

/**
 * Returns navigation links
 */
function getNavigation() {
  try {
    const sheet = getSheetByName(CONFIG.SHEET_NAMES.NAVIGATION);
    const rows = sheetToObjects(sheet);
    return rows
      .filter(n => String(n.status).toLowerCase() === 'active')
      .sort((a, b) => (Number(a.display_order) || 99) - (Number(b.display_order) || 99));
  } catch (e) {
    return [];
  }
}

/**
 * Computes analytics and overview summary for the Admin Dashboard
 */
function getAdminOverview() {
  const promptSheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const prompts = sheetToObjects(promptSheet);
  
  let totalPrompts = prompts.length;
  let publishedPrompts = 0;
  let draftPrompts = 0;
  let totalViews = 0;
  let totalCopies = 0;
  
  prompts.forEach(p => {
    const isPub = String(p.status).toLowerCase() === 'published';
    if (isPub) publishedPrompts++;
    else draftPrompts++;
    
    totalViews += Number(p.views) || 0;
    totalCopies += Number(p.copy_count) || 0;
  });
  
  const catSheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const categories = sheetToObjects(catSheet);
  
  // Sort recently updated prompts
  const recent = [...prompts]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 5);

  return {
    success: true,
    metrics: {
      total_prompts: totalPrompts,
      published_prompts: publishedPrompts,
      draft_prompts: draftPrompts,
      total_categories: categories.length,
      total_views: totalViews,
      total_copies: totalCopies
    },
    recent_prompts: recent
  };
}

